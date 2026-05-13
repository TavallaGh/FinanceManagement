[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Jira,  # Accepts "AC-91", "AC-91 Notification", or "AC-91 Repo Notification"

    [string]$Status = 'In Progress',

    [ValidateSet('auto', 'workspace', 'project', 'prototype', 'front', 'SSO', 'Notification')]
    [string]$Repo = 'auto',

    [string]$SourceBranch,
    [string]$TargetBranch,
    [string]$CredentialsFile = '.secrets/credentials.local',
    [switch]$DryRun,
    [switch]$StrictMetadata
)

$ErrorActionPreference = 'Stop'

$taskExecPath = Join-Path $PSScriptRoot 'task-exec.ps1'
if (-not (Test-Path -Path $taskExecPath -PathType Leaf)) {
    throw "Missing reusable executor script: $taskExecPath"
}

# Parse Jira key and optional repo hint from combined input.
# Supports: "AC-91", "AC-91 Notification", "AC-91 Repo Notification"
$validRepoNames = @('workspace', 'project', 'prototype', 'front', 'SSO', 'Notification')
$jiraParts = $Jira.Trim() -split '\s+', 2
$resolvedJiraKey = $jiraParts[0]

if ($jiraParts.Length -gt 1 -and $Repo -eq 'auto') {
    # Strip optional "Repo " prefix (e.g. "Repo Notification" → "Notification")
    $repoHint = $jiraParts[1].Trim() -replace '^(?i)repo\s+', ''
    $matchedRepo = $validRepoNames | Where-Object { $_ -ieq $repoHint } | Select-Object -First 1
    if ($matchedRepo) {
        $Repo = $matchedRepo
    }
}

$invokeParams = @{
    JiraKey         = $resolvedJiraKey
    StatusTarget    = $Status
    Repo            = $Repo
    CredentialsFile = $CredentialsFile
}

if (-not [string]::IsNullOrWhiteSpace($SourceBranch)) { $invokeParams['SourceBranch'] = $SourceBranch }
if (-not [string]::IsNullOrWhiteSpace($TargetBranch)) { $invokeParams['TargetBranch'] = $TargetBranch }
if ($DryRun) { $invokeParams['DryRun'] = $true }
if ($StrictMetadata) { $invokeParams['StrictMetadata'] = $true }

& $taskExecPath @invokeParams
