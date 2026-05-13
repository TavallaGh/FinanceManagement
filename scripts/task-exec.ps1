#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$JiraKey,

    [string]$StatusTarget = 'In Progress',
    [ValidateSet('auto', 'workspace', 'project', 'prototype', 'front', 'SSO', 'Notification')]
    [string]$Repo = 'auto',
    [string]$CredentialsFile = '.secrets/credentials.local',
    [string]$SourceBranch,
    [string]$TargetBranch,
    [switch]$DryRun,
    [switch]$StrictMetadata
)

$ErrorActionPreference = 'Stop'

function Resolve-JiraIssueKey {
    param([string]$InputKey)

    if ([string]::IsNullOrWhiteSpace($InputKey)) {
        throw 'Jira key is required.'
    }

    $trimmed = $InputKey.Trim()

    if ($trimmed -match '(?i)/browse/([A-Z][A-Z0-9]+-\d+)') {
        return $matches[1].ToUpperInvariant()
    }

    if ($trimmed -match '^[A-Z][A-Z0-9]+-\d+$') {
        return $trimmed.ToUpperInvariant()
    }

    throw "Unsupported Jira identifier format: $InputKey"
}

function Get-WebExceptionBody {
    param($Exception)

    try {
        if ($Exception -and $Exception.Response) {
            $stream = $Exception.Response.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                $body = $reader.ReadToEnd()
                if (-not [string]::IsNullOrWhiteSpace($body)) {
                    return $body
                }
            }
        }
    } catch {}

    return $null
}

function Invoke-JiraApi {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('Get', 'Post', 'Put')]
        [string]$Method,

        [Parameter(Mandatory = $true)]
        [string]$BaseUrl,

        [Parameter(Mandatory = $true)]
        [hashtable]$Headers,

        [Parameter(Mandatory = $true)]
        [string]$Path,

        [string]$Query,
        [string]$Body,
        [int]$MaxRetries = 4
    )

    $safeBase = $BaseUrl.TrimEnd('/')
    $uri = if ([string]::IsNullOrWhiteSpace($Query)) {
        ('{0}{1}' -f $safeBase, $Path)
    } else {
        ('{0}{1}?{2}' -f $safeBase, $Path, $Query)
    }
    $attempt = 0

    while ($true) {
        $attempt++
        try {
            if ([string]::IsNullOrWhiteSpace($Body)) {
                return Invoke-RestMethod -Method $Method -Headers $Headers -Uri $uri
            }
            return Invoke-RestMethod -Method $Method -Headers $Headers -Uri $uri -Body $Body
        } catch {
            $statusCode = $null
            if ($_.Exception -and $_.Exception.Response) {
                try { $statusCode = [int]$_.Exception.Response.StatusCode } catch {}
            }

            $isTransient = ($statusCode -in @(404, 429, 500, 502, 503, 504))
            if ($isTransient -and $attempt -lt $MaxRetries) {
                Start-Sleep -Seconds ([Math]::Pow(2, $attempt - 1))
                continue
            }

            $body = Get-WebExceptionBody -Exception $_.Exception
            if ($statusCode) {
                if ($body) {
                    throw "Jira API call failed ($statusCode) for $uri. Response: $body"
                }
                throw "Jira API call failed ($statusCode) for $uri."
            }

            throw
        }
    }
}

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
    if ($RepoMode -eq 'front') { return Get-RequiredEnv 'GITLAB_FRONT_PROJECT_ID' }
    if ($RepoMode -eq 'SSO') { return Get-RequiredEnv 'GITLAB_PROJECT_SSO_PROJECT_ID' }
    if ($RepoMode -eq 'Notification') { return Get-RequiredEnv 'GITLAB_NOTIFICATION_PROJECT_ID' }

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

    Invoke-JiraApi -Method Post -BaseUrl $BaseUrl -Headers $Headers -Path "/rest/api/3/issue/$([System.Uri]::EscapeDataString($IssueKey))/remotelink" -Body $payload | Out-Null
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

function Convert-ToBranchSlug {
    param([string]$Text)

    if ([string]::IsNullOrWhiteSpace($Text)) { return 'task' }

    $slug = $Text.ToLowerInvariant()
    $slug = $slug -replace '[^a-z0-9]+', '-'
    $slug = $slug -replace '^-+', ''
    $slug = $slug -replace '-+$', ''
    $slug = $slug -replace '-{2,}', '-'

    if ([string]::IsNullOrWhiteSpace($slug)) { return 'task' }
    return $slug
}

function Resolve-BranchPlan {
    param(
        [string]$IssueTypeName,
        [string]$Summary,
        [string]$TaskKey,
        [string]$ProvidedSource,
        [string]$ProvidedTarget
    )

    $source = $ProvidedSource
    $target = $ProvidedTarget

    if ([string]::IsNullOrWhiteSpace($source)) {
        $kind = 'features'
        $defaultTarget = 'develop'
        $issueType = if ([string]::IsNullOrWhiteSpace($IssueTypeName)) { '' } else { $IssueTypeName }

        if ($issueType -match '(?i)bug') {
            $kind = 'bugs'
            $defaultTarget = 'develop'
        } elseif ($issueType -match '(?i)technical|spike|chore') {
            $kind = 'technicals'
            $defaultTarget = 'develop'
        } elseif ($issueType -match '(?i)hotfix') {
            $kind = 'hotfix'
            $defaultTarget = 'main'
        }

        $slug = Convert-ToBranchSlug -Text $Summary
        $source = "$kind/$($TaskKey.ToLowerInvariant())-$slug"

        if ([string]::IsNullOrWhiteSpace($target)) {
            $target = $defaultTarget
        }
    }

    if ([string]::IsNullOrWhiteSpace($target)) {
        if ($source -match '^(?i)story/') {
            $target = 'test'
        } elseif ($source -match '^(?i)sprint/') {
            $target = 'stage'
        } elseif ($source -match '^(?i)hotfix/') {
            $target = 'main'
        } else {
            $target = 'develop'
        }
    }

    return [PSCustomObject]@{
        Source = $source
        Target = $target
    }
}

function Test-GitLabBranchExists {
    param(
        [string]$BaseUrl,
        [hashtable]$Headers,
        [string]$ProjectId,
        [string]$Branch
    )

    if ([string]::IsNullOrWhiteSpace($Branch)) { return $false }
    $encodedBranch = [System.Uri]::EscapeDataString($Branch)
    try {
        Invoke-RestMethod -Method Get -Headers $Headers -Uri "$BaseUrl/api/v4/projects/$ProjectId/repository/branches/$encodedBranch" | Out-Null
        return $true
    } catch {
        $statusCode = $null
        if ($_.Exception -and $_.Exception.Response) {
            try { $statusCode = [int]$_.Exception.Response.StatusCode } catch {}
        }
        if ($statusCode -eq 404) { return $false }
        throw
    }
}

function Ensure-GitLabBranchExists {
    param(
        [string]$BaseUrl,
        [hashtable]$Headers,
        [string]$ProjectId,
        [string]$Branch,
        [string]$Ref,
        [switch]$NoWrite
    )

    if (Test-GitLabBranchExists -BaseUrl $BaseUrl -Headers $Headers -ProjectId $ProjectId -Branch $Branch) {
        return
    }

    if ($NoWrite) { return }

    $body = @{
        branch = $Branch
        ref = $Ref
    }

    Invoke-RestMethod -Method Post -Headers $Headers -Uri "$BaseUrl/api/v4/projects/$ProjectId/repository/branches" -Body $body | Out-Null
}

function Ensure-LocalBranchCheckedOut {
    param(
        [string]$RepoRoot,
        [string]$SourceBranch,
        [string]$TargetBranch,
        [switch]$NoWrite
    )

    if ($NoWrite) { return }

    try {
        Push-Location $RepoRoot

        git rev-parse --is-inside-work-tree 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { return }

        git fetch origin $TargetBranch 2>$null | Out-Null
        git fetch origin $SourceBranch 2>$null | Out-Null

        git show-ref --verify "refs/heads/$SourceBranch" 2>$null | Out-Null
        $localSourceExists = ($LASTEXITCODE -eq 0)

        git show-ref --verify "refs/remotes/origin/$SourceBranch" 2>$null | Out-Null
        $remoteSourceExists = ($LASTEXITCODE -eq 0)

        git show-ref --verify "refs/remotes/origin/$TargetBranch" 2>$null | Out-Null
        $remoteTargetExists = ($LASTEXITCODE -eq 0)

        git show-ref --verify "refs/heads/$TargetBranch" 2>$null | Out-Null
        $localTargetExists = ($LASTEXITCODE -eq 0)

        if ($localSourceExists) {
            git checkout $SourceBranch | Out-Null
        } elseif ($remoteSourceExists) {
            git checkout -b $SourceBranch "origin/$SourceBranch" | Out-Null
        } elseif ($remoteTargetExists) {
            git checkout -b $SourceBranch "origin/$TargetBranch" | Out-Null
        } elseif ($localTargetExists) {
            git checkout -b $SourceBranch $TargetBranch | Out-Null
        } else {
            git checkout -b $SourceBranch | Out-Null
        }

        if ($remoteTargetExists) {
            git rebase "origin/$TargetBranch" | Out-Null
        }
    } catch {
        Write-Warning "Local checkout/rebase skipped: $($_.Exception.Message)"
    } finally {
        Pop-Location
    }
}

$repoRoot = Resolve-RepoRoot
$fullCredPath = Join-Path $repoRoot $CredentialsFile
Load-EnvFile -Path $fullCredPath

$JiraKey = Resolve-JiraIssueKey -InputKey $JiraKey

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

$fields = @('summary', 'issuetype', 'status', 'labels', 'fixVersions', 'parent', $epicField)
if (-not [string]::IsNullOrWhiteSpace($aocField)) { $fields += $aocField }
if (-not [string]::IsNullOrWhiteSpace($dodField)) { $fields += $dodField }
if (-not [string]::IsNullOrWhiteSpace($testCasesField)) { $fields += $testCasesField }

$fieldsQuery = [string]::Join(',', $fields)
$issue = Invoke-JiraApi -Method Get -BaseUrl $jiraBase -Headers $jiraHeaders -Path "/rest/api/3/issue/$([System.Uri]::EscapeDataString($JiraKey))" -Query "fields=$fieldsQuery"

$summary = $issue.fields.summary
$issueTypeName = $issue.fields.issuetype.name
$labels = @($issue.fields.labels)
$fixVersions = @($issue.fields.fixVersions | ForEach-Object { $_.name })
$isSubtask = $false
$parentKey = $null
$parentSummary = $null

$hasIssueType = $issue.fields.issuetype -ne $null
if ($hasIssueType) {
    if ($issue.fields.issuetype.PSObject.Properties.Name -contains 'subtask') {
        $isSubtask = [bool]$issue.fields.issuetype.subtask
    } else {
        $isSubtask = ($issue.fields.issuetype.name -match '(?i)sub[- ]?task')
    }
}

if ($issue.fields.parent) {
    $parentKey = $issue.fields.parent.key
    if ($issue.fields.parent.fields -and $issue.fields.parent.fields.summary) {
        $parentSummary = $issue.fields.parent.fields.summary
    }
}

if ($isSubtask -and -not [string]::IsNullOrWhiteSpace($parentKey) -and [string]::IsNullOrWhiteSpace($parentSummary)) {
    $parentIssue = Invoke-JiraApi -Method Get -BaseUrl $jiraBase -Headers $jiraHeaders -Path "/rest/api/3/issue/$([System.Uri]::EscapeDataString($parentKey))" -Query 'fields=summary'
    if ($parentIssue -and $parentIssue.fields -and $parentIssue.fields.summary) {
        $parentSummary = $parentIssue.fields.summary
    }
}

if (-not ($fixVersions -contains 'V 0.1 (MVP)')) {
    throw "Jira issue $JiraKey must include Fix Version 'V 0.1 (MVP)'"
}

if (-not ($labels | Where-Object { $_ -in @('frontend', 'backend', 'blocked', 'Core') })) {
    throw "Jira issue $JiraKey must include one of labels: frontend, backend, blocked, Core"
}

if ($StrictMetadata) {
    if ([string]::IsNullOrWhiteSpace($aocField) -or [string]::IsNullOrWhiteSpace($dodField) -or [string]::IsNullOrWhiteSpace($testCasesField)) {
        throw 'Strict metadata enabled, but one or more field IDs are missing: JIRA_FIELD_AOC, JIRA_FIELD_DOD, JIRA_FIELD_TEST_CASES'
    }
    if (-not $issue.fields.$aocField) { throw "Missing AoC value in field $aocField" }
    if (-not $issue.fields.$dodField) { throw "Missing DoD value in field $dodField" }
    if (-not $issue.fields.$testCasesField) { throw "Missing Test Cases value in field $testCasesField" }
}

$transitions = Invoke-JiraApi -Method Get -BaseUrl $jiraBase -Headers $jiraHeaders -Path "/rest/api/3/issue/$([System.Uri]::EscapeDataString($JiraKey))/transitions"
$transition = $transitions.transitions | Where-Object { $_.id -eq '21' } | Select-Object -First 1
if (-not $transition) {
    $transition = $transitions.transitions | Where-Object { $_.to.name -ieq $StatusTarget } | Select-Object -First 1
}
if (-not $transition) {
    throw "No transition found for target '$StatusTarget'"
}

if (-not $DryRun) {
    $transitionBody = @{ transition = @{ id = $transition.id } } | ConvertTo-Json -Depth 4
    Invoke-JiraApi -Method Post -BaseUrl $jiraBase -Headers $jiraHeaders -Path "/rest/api/3/issue/$([System.Uri]::EscapeDataString($JiraKey))/transitions" -Body $transitionBody | Out-Null
}

$branchPlan = Resolve-BranchPlan -IssueTypeName $issueTypeName -Summary $summary -TaskKey $JiraKey -ProvidedSource $SourceBranch -ProvidedTarget $TargetBranch
$SourceBranch = $branchPlan.Source
$TargetBranch = $branchPlan.Target

$mvpMilestoneTitle = 'V 0.1 (MVP)'

$issueLookupToken = if ($isSubtask -and -not [string]::IsNullOrWhiteSpace($parentKey)) { $parentKey } else { $JiraKey }
$issueTitle = if ($isSubtask -and -not [string]::IsNullOrWhiteSpace($parentKey)) {
    if ([string]::IsNullOrWhiteSpace($parentSummary)) {
        "[$parentKey] - Parent Story"
    } else {
        "[$parentKey] - $parentSummary"
    }
} else {
    "[$JiraKey] - $summary"
}

$issueDescription = if ($isSubtask -and -not [string]::IsNullOrWhiteSpace($parentKey)) {
    @(
        "Parent Jira: $jiraBase/browse/$parentKey",
        "Task Jira: $jiraBase/browse/$JiraKey"
    ) -join "`n"
} else {
    "Jira: $jiraBase/browse/$JiraKey"
}

$mrBaseTitle = "[$JiraKey] - $summary"
$mrDescription = if ($isSubtask -and -not [string]::IsNullOrWhiteSpace($parentKey)) {
    @(
        "Parent Jira: $jiraBase/browse/$parentKey",
        "Task Jira: $jiraBase/browse/$JiraKey"
    ) -join "`n"
} else {
    "Related Jira: $jiraBase/browse/$JiraKey"
}

# ── WORKSPACE REPO (always mandatory) ───────────────────────────────────────
$workspaceProjectId = Get-RequiredEnv 'GITLAB_WORKSPACE_PROJECT_ID'
$encodedWsProjectId = [System.Web.HttpUtility]::UrlEncode($workspaceProjectId)

Ensure-GitLabBranchExists -BaseUrl $gitlabBase -Headers $gitlabHeaders -ProjectId $encodedWsProjectId -Branch $SourceBranch -Ref $TargetBranch -NoWrite:$DryRun

$wsMilestones = Invoke-RestMethod -Method Get -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedWsProjectId/milestones?search=$([System.Uri]::EscapeDataString($mvpMilestoneTitle))"
$wsMilestone = $wsMilestones | Where-Object { $_.title -eq $mvpMilestoneTitle } | Select-Object -First 1
if (-not $wsMilestone -and -not $DryRun) {
    $wsMilestoneBody = @{ title = $mvpMilestoneTitle }
    $wsMilestone = Invoke-RestMethod -Method Post -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedWsProjectId/milestones" -Body $wsMilestoneBody
}

$wsExistingIssues = Invoke-RestMethod -Method Get -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedWsProjectId/issues?search=$([System.Uri]::EscapeDataString($issueLookupToken))&state=opened"
$wsGitlabIssue = $wsExistingIssues | Where-Object { $_.title -eq $issueTitle } | Select-Object -First 1
if (-not $wsGitlabIssue) {
    $wsGitlabIssue = $wsExistingIssues | Where-Object { $_.title -match [Regex]::Escape($issueLookupToken) } | Select-Object -First 1
}
if (-not $wsGitlabIssue -and -not $DryRun) {
    $wsIssueBody = @{
        title = $issueTitle
        description = $issueDescription
        labels = [string]::Join(',', $labels)
    }
    if ($wsMilestone) { $wsIssueBody['milestone_id'] = $wsMilestone.id }
    $wsGitlabIssue = Invoke-RestMethod -Method Post -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedWsProjectId/issues" -Body $wsIssueBody
}

$wsGitlabMr = $null
$wsMrs = Invoke-RestMethod -Method Get -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedWsProjectId/merge_requests?state=opened&source_branch=$([System.Uri]::EscapeDataString($SourceBranch))&target_branch=$([System.Uri]::EscapeDataString($TargetBranch))"
$wsGitlabMr = $wsMrs | Select-Object -First 1
if (-not $wsGitlabMr -and -not $DryRun) {
    $wsIsInProgress = $StatusTarget -ieq 'In Progress'
    $wsDraftTitle = Get-DraftMrTitle -Title $mrBaseTitle
    $wsMrBody = @{
        source_branch = $SourceBranch
        target_branch = $TargetBranch
        title = $wsDraftTitle
        description = $mrDescription
        remove_source_branch = [bool]$wsIsInProgress
        squash = [bool]$wsIsInProgress
    }
    if ($wsGitlabIssue) { $wsMrBody['description'] = "$mrDescription`nRelated GitLab Issue: $($wsGitlabIssue.web_url)" }
    $wsGitlabMr = Invoke-RestMethod -Method Post -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedWsProjectId/merge_requests" -Body $wsMrBody
}
if ($wsGitlabMr -and $StatusTarget -ieq 'In Review') {
    $wsGitlabMr = Ensure-GitLabMrReady -BaseUrl $gitlabBase -Headers $gitlabHeaders -ProjectId $encodedWsProjectId -Mr $wsGitlabMr -NoWrite:$DryRun
}

# ── SECOND REPO (when Repo is specified and not workspace/auto) ───────────────
$secondProjectId = $null
$secondGitlabIssue = $null
$secondGitlabMr = $null

if ($Repo -notin @('auto', 'workspace')) {
    $secondProjectId = Get-RepoProjectId -RepoMode $Repo -Labels $labels
    $encodedSecondProjectId = [System.Web.HttpUtility]::UrlEncode($secondProjectId)

    Ensure-GitLabBranchExists -BaseUrl $gitlabBase -Headers $gitlabHeaders -ProjectId $encodedSecondProjectId -Branch $SourceBranch -Ref $TargetBranch -NoWrite:$DryRun

    $secMilestones = Invoke-RestMethod -Method Get -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedSecondProjectId/milestones?search=$([System.Uri]::EscapeDataString($mvpMilestoneTitle))"
    $secMilestone = $secMilestones | Where-Object { $_.title -eq $mvpMilestoneTitle } | Select-Object -First 1
    if (-not $secMilestone -and -not $DryRun) {
        $secMilestoneBody = @{ title = $mvpMilestoneTitle }
        $secMilestone = Invoke-RestMethod -Method Post -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedSecondProjectId/milestones" -Body $secMilestoneBody
    }

    $secExistingIssues = Invoke-RestMethod -Method Get -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedSecondProjectId/issues?search=$([System.Uri]::EscapeDataString($issueLookupToken))&state=opened"
    $secondGitlabIssue = $secExistingIssues | Where-Object { $_.title -eq $issueTitle } | Select-Object -First 1
    if (-not $secondGitlabIssue) {
        $secondGitlabIssue = $secExistingIssues | Where-Object { $_.title -match [Regex]::Escape($issueLookupToken) } | Select-Object -First 1
    }
    if (-not $secondGitlabIssue -and -not $DryRun) {
        $secIssueBody = @{
            title = $issueTitle
            description = $issueDescription
            labels = [string]::Join(',', $labels)
        }
        if ($secMilestone) { $secIssueBody['milestone_id'] = $secMilestone.id }
        $secondGitlabIssue = Invoke-RestMethod -Method Post -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedSecondProjectId/issues" -Body $secIssueBody
    }

    $secMrs = Invoke-RestMethod -Method Get -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedSecondProjectId/merge_requests?state=opened&source_branch=$([System.Uri]::EscapeDataString($SourceBranch))&target_branch=$([System.Uri]::EscapeDataString($TargetBranch))"
    $secondGitlabMr = $secMrs | Select-Object -First 1
    if (-not $secondGitlabMr -and -not $DryRun) {
        $secIsInProgress = $StatusTarget -ieq 'In Progress'
        $secDraftTitle = Get-DraftMrTitle -Title $mrBaseTitle
        $secMrBody = @{
            source_branch = $SourceBranch
            target_branch = $TargetBranch
            title = $secDraftTitle
            description = $mrDescription
            remove_source_branch = [bool]$secIsInProgress
            squash = [bool]$secIsInProgress
        }
        if ($secondGitlabIssue) { $secMrBody['description'] = "$mrDescription`nRelated GitLab Issue: $($secondGitlabIssue.web_url)" }
        $secondGitlabMr = Invoke-RestMethod -Method Post -Headers $gitlabHeaders -Uri "$gitlabBase/api/v4/projects/$encodedSecondProjectId/merge_requests" -Body $secMrBody
    }
    if ($secondGitlabMr -and $StatusTarget -ieq 'In Review') {
        $secondGitlabMr = Ensure-GitLabMrReady -BaseUrl $gitlabBase -Headers $gitlabHeaders -ProjectId $encodedSecondProjectId -Mr $secondGitlabMr -NoWrite:$DryRun
    }
}

# ── JIRA REMOTE LINKS ────────────────────────────────────────────────────────
if ($wsGitlabIssue) {
    Add-JiraRemoteLink -BaseUrl $jiraBase -Headers $jiraHeaders -IssueKey $JiraKey -Url $wsGitlabIssue.web_url -Title "GitLab Workspace Issue $($wsGitlabIssue.iid)" -NoWrite:$DryRun
}
if ($wsGitlabMr) {
    Add-JiraRemoteLink -BaseUrl $jiraBase -Headers $jiraHeaders -IssueKey $JiraKey -Url $wsGitlabMr.web_url -Title "GitLab Workspace MR $($wsGitlabMr.iid)" -NoWrite:$DryRun
}
if ($secondGitlabIssue) {
    Add-JiraRemoteLink -BaseUrl $jiraBase -Headers $jiraHeaders -IssueKey $JiraKey -Url $secondGitlabIssue.web_url -Title "GitLab Project Issue $($secondGitlabIssue.iid)" -NoWrite:$DryRun
}
if ($secondGitlabMr) {
    Add-JiraRemoteLink -BaseUrl $jiraBase -Headers $jiraHeaders -IssueKey $JiraKey -Url $secondGitlabMr.web_url -Title "GitLab Project MR $($secondGitlabMr.iid)" -NoWrite:$DryRun
}

Ensure-LocalBranchCheckedOut -RepoRoot $repoRoot -SourceBranch $SourceBranch -TargetBranch $TargetBranch -NoWrite:$DryRun

$logDir = Join-Path $repoRoot 'logs/task-exec'
if (-not (Test-Path $logDir -PathType Container)) {
    New-Item -Path $logDir -ItemType Directory -Force | Out-Null
}
$logFile = Join-Path $logDir ("$($JiraKey)-$((Get-Date).ToString('yyyyMMdd-HHmmss')).json")

$result = [PSCustomObject]@{
    jiraKey              = $JiraKey
    jiraUrl              = "$jiraBase/browse/$JiraKey"
    jiraProjectKey       = $jiraProjectKey
    transitionApplied    = if ($DryRun) { "dry-run:$($transition.to.name)" } else { $transition.to.name }
    workspaceProjectId   = $workspaceProjectId
    workspaceIssueUrl    = if ($wsGitlabIssue) { $wsGitlabIssue.web_url } else { $null }
    workspaceMrUrl       = if ($wsGitlabMr) { $wsGitlabMr.web_url } else { $null }
    projectRepo          = $Repo
    projectProjectId     = $secondProjectId
    projectIssueUrl      = if ($secondGitlabIssue) { $secondGitlabIssue.web_url } else { $null }
    projectMrUrl         = if ($secondGitlabMr) { $secondGitlabMr.web_url } else { $null }
    sourceBranch         = $SourceBranch
    targetBranch         = $TargetBranch
    dryRun               = [bool]$DryRun
    timestamp            = (Get-Date).ToString('o')
}

$result | ConvertTo-Json -Depth 8 | Out-File -FilePath $logFile -Encoding utf8
$result | ConvertTo-Json -Depth 8
