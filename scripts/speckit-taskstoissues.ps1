[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Jira,

    [string]$Status = 'In Progress',

    [ValidateSet('auto', 'workspace', 'project', 'prototype', 'front')]
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

$invokeParams = @{
    JiraKey         = $Jira
    StatusTarget    = $Status
    Repo            = $Repo
    CredentialsFile = $CredentialsFile
}

if (-not [string]::IsNullOrWhiteSpace($SourceBranch)) { $invokeParams['SourceBranch'] = $SourceBranch }
if (-not [string]::IsNullOrWhiteSpace($TargetBranch)) { $invokeParams['TargetBranch'] = $TargetBranch }
if ($DryRun) { $invokeParams['DryRun'] = $true }
if ($StrictMetadata) { $invokeParams['StrictMetadata'] = $true }

& $taskExecPath @invokeParams
