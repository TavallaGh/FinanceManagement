#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$JiraKey,

    [string]$StatusTarget = 'In Progress',
    [ValidateSet('auto', 'workspace', 'project', 'prototype')]
    [string]$Repo = 'auto',
    [string]$CredentialsFile = '.secrets/credentials.local',
    [string]$SourceBranch,
    [string]$TargetBranch,
    [switch]$DryRun,
    [switch]$StrictMetadata
)

$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
    try {
        $root = git rev-parse --show-toplevel 2>$null
        if ($LASTEXITCODE -eq 0 -and $root) { return $root.Trim() }
    } catch {}
    return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Load-EnvFile {
    param([string]$Path)
    if (-not (Test-Path $Path -PathType Leaf)) {
        throw "Credentials file not found: $Path"
    }

    Get-Content -Path $Path -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if (-not $line) { return }
        if ($line.StartsWith('#')) { return }
        if ($line -notmatch '^[A-Za-z_][A-Za-z0-9_]*=') { return }

        $parts = $line.Split('=', 2)
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()

        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [Environment]::SetEnvironmentVariable($key, $value, 'Process')
    }
}

function Is-PlaceholderValue {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $true }
    $v = $Value.ToLowerInvariant()
    return (
        $v -like 'replace-with*' -or
        $v -like 'your-*' -or
        $v -like '*example.com*'
    )
}

function Get-RequiredEnv {
    param([string]$Name)
    $value = [Environment]::GetEnvironmentVariable($Name, 'Process')
    if (Is-PlaceholderValue $value) {
        throw "Missing or placeholder value for $Name"
    }
    return $value
}

function New-JiraHeaders {
    $email = Get-RequiredEnv -Name 'JIRA_EMAIL'
    $token = Get-RequiredEnv -Name 'JIRA_API_TOKEN'
    $auth = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("$email`:$token"))
    return @{
        Authorization = "Basic $auth"
        Accept = 'application/json'
        'Content-Type' = 'application/json'
    }
}

function Get-RepoProjectId {
    param(
        [string]$RepoMode,
        [string[]]$Labels
    )

    if ($RepoMode -eq 'workspace') { return Get-RequiredEnv 'GITLAB_WORKSPACE_PROJECT_ID' }
    if ($RepoMode -eq 'project') { return Get-RequiredEnv 'GITLAB_PROJECT_PROJECT_ID' }
    if ($RepoMode -eq 'prototype') { return Get-RequiredEnv 'GITLAB_PROTOTYPE_PROJECT_ID' }

    $labelsLower = @($Labels | ForEach-Object { $_.ToLowerInvariant() })
    if ($labelsLower -contains 'process' -or $labelsLower -contains 'docs' -or $labelsLower -contains 'workflow' -or $labelsLower -contains 'automation' -or $labelsLower -contains 'meta') {
        return Get-RequiredEnv 'GITLAB_WORKSPACE_PROJECT_ID'
    }
    return Get-RequiredEnv 'GITLAB_PROJECT_PROJECT_ID'
}

function Add-JiraRemoteLink {
    param(
        [string]$BaseUrl,
        [hashtable]$Headers,
        [string]$IssueKey,
        [string]$Url,
        [string]$Title,
        [switch]$NoWrite
    )

    $payload = @{
        object = @{
            url = $Url
            title = $Title
        }
    } | ConvertTo-Json -Depth 6

    if ($NoWrite) { return }

    Invoke-RestMethod -Method Post -Headers $Headers -Uri "$BaseUrl/rest/api/3/issue/$IssueKey/remotelink" -Body $payload | Out-Null
}

function Get-ReadyMrTitle {
    param([string]$Title)

    if ([string]::IsNullOrWhiteSpace($Title)) { return $Title }

    $cleaned = $Title
    $cleaned = $cleaned -replace '^(?i)\s*draft\s*:\s*', ''
    $cleaned = $cleaned -replace '^(?i)\s*wip\s*:\s*', ''

    if ([string]::IsNullOrWhiteSpace($cleaned)) { return $Title }
    return $cleaned
}

function Get-DraftMrTitle {
    param([string]$Title)

    if ([string]::IsNullOrWhiteSpace($Title)) { return $Title }

    $cleaned = $Title
    $cleaned = $cleaned -replace '^(?i)\s*draft\s*:\s*', ''
    $cleaned = $cleaned -replace '^(?i)\s*wip\s*:\s*', ''
    return "Draft: $cleaned"
}

function Ensure-GitLabMrReady {
    param(
        [string]$BaseUrl,
        [hashtable]$Headers,
        [string]$ProjectId,
        $Mr,
        [switch]$NoWrite
    )

    if (-not $Mr) { return $Mr }

    $hasDraftProperty = $Mr.PSObject.Properties.Name -contains 'draft'
    $hasWipProperty = $Mr.PSObject.Properties.Name -contains 'work_in_progress'
    $isDraft = $false

    if ($hasDraftProperty -and $Mr.draft) { $isDraft = $true }
    if ($hasWipProperty -and $Mr.work_in_progress) { $isDraft = $true }
    if (-not [string]::IsNullOrWhiteSpace($Mr.title) -and $Mr.title -match '^(?i)\s*(draft|wip)\s*:') { $isDraft = $true }

    if (-not $isDraft) { return $Mr }

    $readyTitle = Get-ReadyMrTitle -Title $Mr.title
    if ($NoWrite) {
        $Mr.title = $readyTitle
        return $Mr
    }

    $body = @{ title = $readyTitle } | ConvertTo-Json -Depth 4
    return Invoke-RestMethod -Method Put -Headers $Headers -Uri "$BaseUrl/api/v4/projects/$ProjectId/merge_requests/$($Mr.iid)" -Body $body
}

$repoRoot = Resolve-RepoRoot
$fullCredPath = Join-Path $repoRoot $CredentialsFile
Load-EnvFile -Path $fullCredPath

$jiraBase = Get-RequiredEnv 'JIRA_BASE_URL'
$jiraProjectKey = Get-RequiredEnv 'JIRA_PROJECT_KEY'
$gitlabBase = Get-RequiredEnv 'GITLAB_BASE_URL'
$gitlabToken = Get-RequiredEnv 'GITLAB_TOKEN'
$jiraHeaders = New-JiraHeaders
$gitlabHeaders = @{ 'PRIVATE-TOKEN' = $gitlabToken }

$aocField = [Environment]::GetEnvironmentVariable('JIRA_FIELD_AOC', 'Process')
$dodField = [Environment]::GetEnvironmentVariable('JIRA_FIELD_DOD', 'Process')
$testCasesField = [Environment]::GetEnvironmentVariable('JIRA_FIELD_TEST_CASES', 'Process')
$epicField = [Environment]::GetEnvironmentVariable('JIRA_FIELD_EPIC', 'Process')
if ([string]::IsNullOrWhiteSpace($epicField)) { $epicField = 'customfield_10014' }

$fields = @('summary', 'issuetype', 'status', 'labels', 'fixVersions', $epicField)
if (-not [string]::IsNullOrWhiteSpace($aocField)) { $fields += $aocField }
if (-not [string]::IsNullOrWhiteSpace($dodField)) { $fields += $dodField }
if (-not [string]::IsNullOrWhiteSpace($testCasesField)) { $fields += $testCasesField }

$fieldsQuery = [string]::Join(',', $fields)
$issue = Invoke-RestMethod -Method Get -Headers $jiraHeaders -Uri "$jiraBase/rest/api/3/issue/$JiraKey?fields=$fieldsQuery"

$summary = $issue.fields.summary
$labels = @($issue.fields.labels)
$fixVersions = @($issue.fields.fixVersions | ForEach-Object { $_.name })

if (-not ($fixVersions -contains 'V 0.1 (MVP)')) {
    throw "Jira issue $JiraKey must include Fix Version 'V 0.1 (MVP)'"
}

if (-not ($labels | Where-Object { $_ -in @('frontend', 'backend', 'blocked') })) {
    throw "Jira issue $JiraKey must include one of labels: frontend, backend, blocked"
}

if ($StrictMetadata) {
    if ([string]::IsNullOrWhiteSpace($aocField) -or [string]::IsNullOrWhiteSpace($dodField) -or [string]::IsNullOrWhiteSpace($testCasesField)) {
        throw 'Strict metadata enabled, but one or more field IDs are missing: JIRA_FIELD_AOC, JIRA_FIELD_DOD, JIRA_FIELD_TEST_CASES'
    }
    if (-not $issue.fields.$aocField) { throw "Missing AoC value in field $aocField" }
    if (-not $issue.fields.$dodField) { throw "Missing DoD value in field $dodField" }
    if (-not $issue.fields.$testCasesField) { throw "Missing Test Cases value in field $testCasesField" }
}

$transitions = Invoke-RestMethod -Method Get -Headers $jiraHeaders -Uri "$jiraBase/rest/api/3/issue/$JiraKey/transitions"
$transition = $transitions.transitions | Where-Object { $_.id -eq '21' } | Select-Object -First 1
if (-not $transition) {
    $transition = $transitions.transitions | Where-Object { $_.to.name -ieq $StatusTarget } | Select-Object -First 1
}
if (-not $transition) {
    throw "No transition found for target '$StatusTarget'"
}

if (-not $DryRun) {
    $transitionBody = @{ transition = @{ id = $transition.id } } | ConvertTo-Json -Depth 4
    Invoke-RestMethod -Method Post -Headers $jiraHeaders -Uri "$jiraBase/rest/api/3/issue/$JiraKey/transitions" -Body $transitionBody | Out-Null
}

$projectId = Get-RepoProjectId -RepoMode $Repo -Labels $labels
$encodedProjectId = [System.Web.HttpUtility]::UrlEncode($projectId)

$mvpMilestoneTitle = 'V 0.1 (MVP)'
$milestones = Invoke-RestMethod -Method Get -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedProjectId/milestones?search=$([System.Uri]::EscapeDataString($mvpMilestoneTitle))"
$milestone = $milestones | Where-Object { $_.title -eq $mvpMilestoneTitle } | Select-Object -First 1

if (-not $milestone -and -not $DryRun) {
    $milestoneBody = @{ title = $mvpMilestoneTitle }
    $milestone = Invoke-RestMethod -Method Post -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedProjectId/milestones" -Body $milestoneBody
}

$issueTitle = "[$JiraKey] - $summary"
$existingIssues = Invoke-RestMethod -Method Get -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedProjectId/issues?search=$([System.Uri]::EscapeDataString($JiraKey))&state=opened"
$gitlabIssue = $existingIssues | Where-Object { $_.title -like "*[$JiraKey]*" -or $_.title -like "*$JiraKey*" } | Select-Object -First 1

if (-not $gitlabIssue -and -not $DryRun) {
    $issueBody = @{
        title = $issueTitle
        description = "Jira: $jiraBase/browse/$JiraKey"
        labels = [string]::Join(',', $labels)
    }
    if ($milestone) { $issueBody['milestone_id'] = $milestone.id }
    $gitlabIssue = Invoke-RestMethod -Method Post -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedProjectId/issues" -Body $issueBody
}

$gitlabMr = $null
if (-not [string]::IsNullOrWhiteSpace($SourceBranch) -and -not [string]::IsNullOrWhiteSpace($TargetBranch)) {
    $mrs = Invoke-RestMethod -Method Get -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedProjectId/merge_requests?state=opened&source_branch=$([System.Uri]::EscapeDataString($SourceBranch))&target_branch=$([System.Uri]::EscapeDataString($TargetBranch))"
    $gitlabMr = $mrs | Select-Object -First 1

    if (-not $gitlabMr -and -not $DryRun) {
        $isInProgressTransition = $StatusTarget -ieq 'In Progress'
        $draftTitle = Get-DraftMrTitle -Title $issueTitle
        $mrBody = @{
            source_branch = $SourceBranch
            target_branch = $TargetBranch
            title = $draftTitle
            description = "Related Jira: $jiraBase/browse/$JiraKey"
            remove_source_branch = [bool]$isInProgressTransition
            squash = [bool]$isInProgressTransition
        }
        if ($gitlabIssue) {
            $mrBody['description'] = "Related Jira: $jiraBase/browse/$JiraKey`nRelated GitLab Issue: $($gitlabIssue.web_url)"
        }
        $gitlabMr = Invoke-RestMethod -Method Post -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedProjectId/merge_requests" -Body $mrBody
    }

    if ($gitlabMr -and $StatusTarget -ieq 'In Review') {
        $gitlabMr = Ensure-GitLabMrReady -BaseUrl $gitlabBase -Headers $gitlabHeaders -ProjectId $encodedProjectId -Mr $gitlabMr -NoWrite:$DryRun
    }
}

if ($gitlabIssue) {
    Add-JiraRemoteLink -BaseUrl $jiraBase -Headers $jiraHeaders -IssueKey $JiraKey -Url $gitlabIssue.web_url -Title "GitLab Issue $($gitlabIssue.iid)" -NoWrite:$DryRun
}
if ($gitlabMr) {
    Add-JiraRemoteLink -BaseUrl $jiraBase -Headers $jiraHeaders -IssueKey $JiraKey -Url $gitlabMr.web_url -Title "GitLab MR $($gitlabMr.iid)" -NoWrite:$DryRun
}

$logDir = Join-Path $repoRoot 'logs/task-exec'
if (-not (Test-Path $logDir -PathType Container)) {
    New-Item -Path $logDir -ItemType Directory -Force | Out-Null
}
$logFile = Join-Path $logDir ("$($JiraKey)-$((Get-Date).ToString('yyyyMMdd-HHmmss')).json")

$result = [PSCustomObject]@{
    jiraKey = $JiraKey
    jiraUrl = "$jiraBase/browse/$JiraKey"
    jiraProjectKey = $jiraProjectKey
    transitionApplied = if ($DryRun) { "dry-run:$($transition.to.name)" } else { $transition.to.name }
    gitlabProjectId = $projectId
    gitlabIssueUrl = if ($gitlabIssue) { $gitlabIssue.web_url } else { $null }
    gitlabMrUrl = if ($gitlabMr) { $gitlabMr.web_url } else { $null }
    sourceBranch = $SourceBranch
    targetBranch = $TargetBranch
    dryRun = [bool]$DryRun
    timestamp = (Get-Date).ToString('o')
}

$result | ConvertTo-Json -Depth 8 | Out-File -FilePath $logFile -Encoding utf8
$result | ConvertTo-Json -Depth 8
