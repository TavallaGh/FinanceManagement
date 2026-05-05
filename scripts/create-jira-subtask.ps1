[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Summary,

    [string]$Description = "",

    [string]$TaskFile = "",

    [string]$ParentKey = "",

    [string]$IssueKey = "",

    [string]$CredentialsFile = ".secrets/credentials.local",

    [string[]]$Labels = @("backend"),

    [string]$FixVersion = "V 0.1 (MVP)",

    [string]$IssueType = "Subtask",

    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
    try {
        $root = git rev-parse --show-toplevel 2>$null
        if ($LASTEXITCODE -eq 0 -and $root) { return $root.Trim() }
    } catch {}
    return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Load-EnvFile {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -Path $Path -PathType Leaf)) {
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
    return ($v -like 'replace-with*' -or $v -like 'your-*' -or $v -like '*example.com*')
}

function Get-RequiredEnv {
    param([Parameter(Mandatory = $true)][string]$Name)
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
        Authorization  = "Basic $auth"
        "Content-Type" = "application/json"
        Accept         = "application/json"
    }
}

function New-AdfParagraph {
    param([string]$Text)
    return @{ type = 'paragraph'; content = @(@{ type = 'text'; text = $Text }) }
}

function New-AdfHeading {
    param(
        [string]$Text,
        [int]$Level = 3
    )
    return @{ type = 'heading'; attrs = @{ level = $Level }; content = @(@{ type = 'text'; text = $Text }) }
}

function New-AdfBulletList {
    param([string[]]$Items)

    if (-not $Items -or $Items.Count -eq 0) { return $null }

    return @{
        type    = 'bulletList'
        content = @($Items | ForEach-Object {
            @{
                type    = 'listItem'
                content = @(@{ type = 'paragraph'; content = @(@{ type = 'text'; text = $_ }) })
            }
        })
    }
}

function Convert-MarkdownToAdfSimple {
    param([Parameter(Mandatory = $true)][string]$Text)

    $content = New-Object System.Collections.Generic.List[object]
    $bulletBuffer = New-Object System.Collections.Generic.List[string]

    $flushBullets = {
        if ($bulletBuffer.Count -gt 0) {
            $bullet = New-AdfBulletList -Items @($bulletBuffer)
            if ($null -ne $bullet) { $content.Add($bullet) }
            $bulletBuffer.Clear()
        }
    }

    $lines = ($Text -replace "`r", "").Split("`n")
    foreach ($line in $lines) {
        $trim = $line.Trim()

        if ([string]::IsNullOrWhiteSpace($trim)) {
            & $flushBullets
            continue
        }

        if ($trim -match '^(#{1,6})\s+(.+)$') {
            & $flushBullets
            $level = $matches[1].Length
            $heading = New-AdfHeading -Text $matches[2].Trim() -Level ([Math]::Min($level, 6))
            $content.Add($heading)
            continue
        }

        if ($trim -match '^[-*]\s+(.+)$' -or $trim -match '^\d+\.\s+(.+)$') {
            $bulletBuffer.Add($matches[1].Trim())
            continue
        }

        & $flushBullets
        $content.Add((New-AdfParagraph -Text $trim))
    }

    & $flushBullets

    if ($content.Count -eq 0) {
        $content.Add((New-AdfParagraph -Text 'No description provided.'))
    }

    return @{
        version = 1
        type    = 'doc'
        content = @($content)
    }
}

function Get-DescriptionSource {
    param(
        [string]$TaskFile,
        [string]$Description
    )

    if (-not [string]::IsNullOrWhiteSpace($TaskFile)) {
        $resolved = $TaskFile
        if (-not (Test-Path -Path $resolved -PathType Leaf)) {
            $repoRoot = Get-RepoRoot
            $candidate = Join-Path $repoRoot $TaskFile
            if (Test-Path -Path $candidate -PathType Leaf) {
                $resolved = $candidate
            } else {
                throw "TaskFile not found: $TaskFile"
            }
        }
        return (Get-Content -Path $resolved -Raw -Encoding UTF8)
    }

    if (-not [string]::IsNullOrWhiteSpace($Description)) {
        return $Description
    }

    return "No description provided."
}

$repoRoot = Get-RepoRoot
$fullCredPath = Join-Path $repoRoot $CredentialsFile
Load-EnvFile -Path $fullCredPath

$jiraBase = (Get-RequiredEnv -Name 'JIRA_BASE_URL').TrimEnd('/')
$projectKey = Get-RequiredEnv -Name 'JIRA_PROJECT_KEY'
$headers = New-JiraHeaders

if ([string]::IsNullOrWhiteSpace($IssueKey) -and [string]::IsNullOrWhiteSpace($ParentKey)) {
    throw 'ParentKey is required when creating a new subtask.'
}

$descriptionText = Get-DescriptionSource -TaskFile $TaskFile -Description $Description
$descriptionAdf = Convert-MarkdownToAdfSimple -Text $descriptionText

if ($IssueKey) {
    $updateBody = @{
        fields = @{
            summary     = $Summary
            description = $descriptionAdf
        }
    } | ConvertTo-Json -Depth 20 -Compress

    if ($DryRun) {
        Write-Output "DRY-RUN update: $IssueKey"
        exit 0
    }

    Invoke-RestMethod -Uri "$jiraBase/rest/api/3/issue/$IssueKey" -Method Put -Headers $headers -Body $updateBody | Out-Null
    Write-Output "Updated: $IssueKey"
    exit 0
}

$createBody = @{
    fields = @{
        project     = @{ key = $projectKey }
        parent      = @{ key = $ParentKey }
        summary     = $Summary
        issuetype   = @{ name = $IssueType }
        description = $descriptionAdf
        fixVersions = @(@{ name = $FixVersion })
        labels      = @($Labels)
    }
} | ConvertTo-Json -Depth 20 -Compress

if ($DryRun) {
    Write-Output "DRY-RUN create under parent: $ParentKey"
    exit 0
}

$response = Invoke-RestMethod -Uri "$jiraBase/rest/api/3/issue" -Method Post -Headers $headers -Body $createBody
Write-Output $response.key
