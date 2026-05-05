[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Summary,

    [string]$ParentKey,
    [string]$TaskFile,
    [string]$Description,
    [string]$IssueKey,
    [string]$CredentialsFile = '.secrets/credentials.local',
    [string[]]$Labels = @('backend'),
    [string]$FixVersion = 'V 0.1 (MVP)',
    [string]$IssueType = 'Subtask',
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot 'create-jira-subtask.ps1'
if (-not (Test-Path -Path $scriptPath -PathType Leaf)) {
    throw "Missing reusable subtask script: $scriptPath"
}

$invokeParams = @{
    Summary         = $Summary
    CredentialsFile = $CredentialsFile
    Labels          = $Labels
    FixVersion      = $FixVersion
    IssueType       = $IssueType
}

if (-not [string]::IsNullOrWhiteSpace($ParentKey)) { $invokeParams['ParentKey'] = $ParentKey }
if (-not [string]::IsNullOrWhiteSpace($TaskFile)) { $invokeParams['TaskFile'] = $TaskFile }
if (-not [string]::IsNullOrWhiteSpace($Description)) { $invokeParams['Description'] = $Description }
if (-not [string]::IsNullOrWhiteSpace($IssueKey)) { $invokeParams['IssueKey'] = $IssueKey }
if ($DryRun) { $invokeParams['DryRun'] = $true }

& $scriptPath @invokeParams
