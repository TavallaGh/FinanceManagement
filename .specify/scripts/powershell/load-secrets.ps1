#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [string]$SecretsFile = '.secrets/credentials.local',
    [switch]$MaskOutput
)

$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
    try {
        $root = git rev-parse --show-toplevel 2>$null
        if ($LASTEXITCODE -eq 0 -and $root) { return $root }
    } catch {
    }

    return (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
}

$repoRoot = Resolve-RepoRoot
$fullPath = Join-Path $repoRoot $SecretsFile

if (-not (Test-Path $fullPath -PathType Leaf)) {
    Write-Error "Secrets file not found: $fullPath"
    Write-Host "Create it from template: Copy-Item .secrets/credentials.template .secrets/credentials.local"
    exit 1
}

$loaded = @()

Get-Content -Path $fullPath -Encoding UTF8 | ForEach-Object {
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
    $loaded += $key
}

if ($loaded.Count -eq 0) {
    Write-Warning "No environment variables were loaded from $fullPath"
    exit 0
}

Write-Host "Loaded $($loaded.Count) secrets into current process environment."

if ($MaskOutput) {
    foreach ($name in $loaded) {
        $raw = [Environment]::GetEnvironmentVariable($name, 'Process')
        if ([string]::IsNullOrEmpty($raw)) {
            Write-Host "$name="
        } else {
            $visible = if ($raw.Length -le 4) { '****' } else { $raw.Substring(0, 2) + '***' + $raw.Substring($raw.Length - 2, 2) }
            Write-Host "$name=$visible"
        }
    }
}
