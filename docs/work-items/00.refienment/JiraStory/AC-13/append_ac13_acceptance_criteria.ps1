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
if (-not $env:JIRA_BASE_URL) { $env:JIRA_BASE_URL = 'https://nexttoptech.atlassian.net' }
if (-not $env:JIRA_EMAIL) { throw 'JIRA_EMAIL missing' }
if (-not $env:JIRA_API_TOKEN) { throw 'JIRA_API_TOKEN missing' }

$issue = 'AC-13'
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($env:JIRA_EMAIL):$($env:JIRA_API_TOKEN)"))
$headers = @{ Authorization = "Basic $auth"; Accept = 'application/json' }

$r = Invoke-RestMethod -Method Get -Uri "$($env:JIRA_BASE_URL)/rest/api/3/issue/$issue?fields=description" -Headers $headers
$desc = $r.fields.description
if ($null -eq $desc -or $null -eq $desc.content) {
  $desc = [ordered]@{ type='doc'; version=1; content=@() }
}

$acLines = @(
'User list must support live filtering by username, roles, and active status.',
'Create user must require: username, linked party/person, user type, active status, and initial password per security policy.',
'Edit user must allow all fields except password; password changes only via reset action.',
'Password reset must follow project security policy (secure temporary value/configurable) and be auditable.',
'Deactivate user must block login immediately; delete user must preserve historical logs.',
'Multiple roles can be assigned/removed with search and without data inconsistency.',
'Direct permissions on forms/resources with selected operations must be manageable independently from roles.',
'Effective permission source must be visible for each form (role-derived vs direct).',
'Final effective permissions must be computed from the union of role and direct permissions.',
'Endpoints and Handlers must remain routing/facade only; business logic must be in Domain/Services.',
'Backend access control is mandatory: deny-by-default, policy-based checks, and object-scope checks.',
'No hard-coded user-facing text; bilingual behavior and RTL/LTR compatibility are required.',
'Key validation/error scenarios must be handled with clear messages (duplicate username, missing linked party, permission save failure).',
'After each update to user/role/permission, list and permission details must refresh consistently.',
'Security audit logging is mandatory for create/update/reset-password/permission-change operations.'
)

$newNodes = @()
$newNodes += [ordered]@{ type='heading'; attrs=[ordered]@{ level=2 }; content=@([ordered]@{ type='text'; text='Acceptance Criteria (AoC)' }) }
foreach ($line in $acLines) {
  $newNodes += [ordered]@{ type='paragraph'; content=@([ordered]@{ type='text'; text=(' ' + $line) }) }
}

$desc.content += $newNodes
$payload = [ordered]@{ fields = [ordered]@{ description = $desc } }
$json = $payload | ConvertTo-Json -Depth 120

Invoke-RestMethod -Method Put -Uri "$($env:JIRA_BASE_URL)/rest/api/3/issue/$issue" -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $json | Out-Null
$v = Invoke-RestMethod -Method Get -Uri "$($env:JIRA_BASE_URL)/rest/api/3/issue/$issue?fields=description" -Headers $headers
Write-Output "UPDATED: $issue"
Write-Output ("DESCRIPTION_BLOCKS: " + $v.fields.description.content.Count)
Write-Output 'AC_SECTION_ADDED: YES'
