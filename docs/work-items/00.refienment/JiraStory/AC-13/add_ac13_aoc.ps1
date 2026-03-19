$ErrorActionPreference = 'Stop'
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($env:JIRA_EMAIL):$($env:JIRA_API_TOKEN)"))
$h = @{ Authorization = "Basic $auth"; Accept = 'application/json' }
$issue = 'AC-13'
$base = 'https://nexttoptech.atlassian.net'

$r = Invoke-RestMethod -Method Get -Uri "$base/rest/api/3/issue/$issue?fields=description" -Headers $h
$desc = $r.fields.description
if ($null -eq $desc -or $null -eq $desc.content) {
  $desc = [ordered]@{ type='doc'; version=1; content=@() }
}

$ac = @(
  'User list must support live filtering by username, roles, and active status.',
  'Create user must require username, linked party/person, user type, active status, and initial password per security policy.',
  'Edit user must allow all fields except password; password changes only via reset action.',
  'Password reset must follow project security policy and be auditable.',
  'Deactivate user must block login immediately; delete user must preserve historical logs.',
  'Multiple roles can be assigned/removed with search and consistency checks.',
  'Direct form/resource permissions must be manageable independently from roles.',
  'Effective permission source must be visible per form (role-derived vs direct).',
  'Final effective permissions must be computed from role + direct permission union.',
  'Endpoints and Handlers remain routing/facade only; business logic stays in Domain/Services.',
  'Backend access control is mandatory: deny-by-default, policy checks, and object-scope checks.',
  'No hard-coded user-facing text; bilingual behavior and RTL/LTR compatibility are required.',
  'Key validation errors must be handled clearly (duplicate username, missing linked party, permission save failure).',
  'After each user/role/permission update, list and permission details must refresh consistently.',
  'Security audit logging is mandatory for create/update/reset-password/permission-change operations.'
)

$nodes = @()
$nodes += [ordered]@{ type='heading'; attrs=[ordered]@{ level=2 }; content=@([ordered]@{ type='text'; text='Acceptance Criteria (AoC)' }) }
foreach ($l in $ac) {
  $nodes += [ordered]@{ type='paragraph'; content=@([ordered]@{ type='text'; text=('• ' + $l) }) }
}

$desc.content += $nodes
$payload = [ordered]@{ fields = [ordered]@{ description = $desc } }
$json = $payload | ConvertTo-Json -Depth 100
Invoke-RestMethod -Method Put -Uri "$base/rest/api/3/issue/$issue" -Headers $h -ContentType 'application/json; charset=utf-8' -Body $json | Out-Null

$v = Invoke-RestMethod -Method Get -Uri "$base/rest/api/3/issue/$issue?fields=description" -Headers $h
Write-Output ('UPDATED ' + $issue)
Write-Output ('DESCRIPTION_BLOCKS ' + $v.fields.description.content.Count)
