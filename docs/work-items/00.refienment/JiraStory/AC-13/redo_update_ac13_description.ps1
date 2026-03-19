$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$credPath = '.\.secrets\credentials.local'
if (-not (Test-Path $credPath)) { throw 'Missing .secrets/credentials.local' }
Get-Content $credPath | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
    $p = $line -split '=',2
    [Environment]::SetEnvironmentVariable($p[0].Trim(), $p[1].Trim())
  }
}
if (-not $env:JIRA_EMAIL) { throw 'JIRA_EMAIL missing' }
if (-not $env:JIRA_API_TOKEN) { throw 'JIRA_API_TOKEN missing' }
if (-not $env:JIRA_BASE_URL) { $env:JIRA_BASE_URL = 'https://nexttoptech.atlassian.net' }

$src = '.\docs\work-items\AC-13\AC-13-attachments-plain-text.txt'
if (-not (Test-Path $src)) { throw 'Source text missing' }
$raw = Get-Content -Path $src -Raw -Encoding UTF8
$raw = [regex]::Replace($raw,'[\x00-\x08\x0B\x0C\x0E-\x1F]','')
$lines = @()
foreach ($l in ($raw -replace "`r",'').Split("`n")) {
  $t = $l.Trim()
  if ($t) { $lines += $t }
}
if ($lines.Count -eq 0) { throw 'No text content' }

$adfContent = @()
foreach ($t in $lines) {
  if ($t.StartsWith('---') -and $t.EndsWith('---')) {
    $h = $t.Trim('-').Trim()
    $adfContent += [ordered]@{ type='heading'; attrs=[ordered]@{ level=3 }; content=@([ordered]@{ type='text'; text=$h }) }
  }
  else {
    $adfContent += [ordered]@{ type='paragraph'; content=@([ordered]@{ type='text'; text=$t }) }
  }
}

$payload = [ordered]@{ fields = [ordered]@{ description = [ordered]@{ type='doc'; version=1; content=$adfContent } } }
$json = $payload | ConvertTo-Json -Depth 100

$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($env:JIRA_EMAIL):$($env:JIRA_API_TOKEN)"))
$headers = @{ Authorization = "Basic $auth"; Accept = 'application/json' }
$issue = 'AC-13'
$putUrl = "$($env:JIRA_BASE_URL)/rest/api/3/issue/$issue"
Invoke-RestMethod -Method Put -Uri $putUrl -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $json | Out-Null

$verify = Invoke-RestMethod -Method Get -Uri "$($env:JIRA_BASE_URL)/rest/api/3/issue/$issue?fields=description" -Headers $headers
$blocks = $verify.fields.description.content.Count
Write-Output "UPDATED: $issue"
Write-Output "DESCRIPTION_BLOCKS: $blocks"
