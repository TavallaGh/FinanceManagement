$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

function New-TextNode([string]$t){ return [ordered]@{ type='text'; text=$t } }
function New-Paragraph([string]$t){ return [ordered]@{ type='paragraph'; content=@((New-TextNode $t)) } }
function New-Heading([int]$level,[string]$t){ return [ordered]@{ type='heading'; attrs=[ordered]@{ level=$level }; content=@((New-TextNode $t)) } }

if (-not $env:JIRA_EMAIL) { throw 'JIRA_EMAIL missing' }
if (-not $env:JIRA_API_TOKEN) { throw 'JIRA_API_TOKEN missing' }
$base = 'https://nexttoptech.atlassian.net'

$auth=[Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($env:JIRA_EMAIL):$($env:JIRA_API_TOKEN)"))
$headers=@{ Authorization="Basic $auth"; Accept='application/json' }

$story='AC-13'

# 1) Update story description with revised AoC (user-only scope)
$storyIssueDesc = Invoke-RestMethod -Method Get -Uri "$base/rest/api/3/issue/$story?fields=description" -Headers $headers
$storyIssueSubs = Invoke-RestMethod -Method Get -Uri "$base/rest/api/3/issue/$story?fields=subtasks" -Headers $headers
$desc = $storyIssueDesc.fields.description
if ($null -eq $desc -or $null -eq $desc.content) { $desc=[ordered]@{ type='doc'; version=1; content=@() } }

$revised = @(
'User list supports live filtering by username and active status.',
'Create user requires username, linked party/person, user type, active status, and secure initial password.',
'Edit user excludes password changes; password is changed only via reset action.',
'Deactivate user blocks login immediately; delete preserves historical logs.',
'Direct user permissions for forms/resources are manageable without role management.',
'Effective user access source is visible and must remain direct-only for this story scope.',
'Endpoints and Handlers remain routing/facade only; business logic stays in Domain/Services.',
'Backend access control is mandatory (deny-by-default, policy checks, object-scope checks).',
'No hard-coded user-facing text; bilingual and RTL/LTR compatibility are required.',
'Security audit logs are required for create/update/deactivate/delete/reset-password/permission-change operations.'
)

$desc.content += (New-Heading 2 'Acceptance Criteria (AoC) - Revised User-only Scope')
foreach($l in $revised){ $desc.content += (New-Paragraph (' ' + $l)) }

$payload=[ordered]@{ fields=[ordered]@{ description=$desc } }
$json=$payload | ConvertTo-Json -Depth 100
Invoke-RestMethod -Method Put -Uri "$base/rest/api/3/issue/$story" -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $json | Out-Null

# 2) create sub-tasks (idempotent by summary)
$existingSubtasks = @{}
if ($storyIssueSubs.fields.subtasks) {
  foreach($s in $storyIssueSubs.fields.subtasks){ $existingSubtasks[$s.fields.summary] = $s.key }
}

$issueTypes = Invoke-RestMethod -Method Get -Uri "$base/rest/api/3/issuetype" -Headers $headers
$subType = $issueTypes | Where-Object { $_.subtask -eq $true -and $_.name -match 'Sub-task|Subtask' } | Select-Object -First 1
if ($null -eq $subType) { $subType = $issueTypes | Where-Object { $_.subtask -eq $true } | Select-Object -First 1 }
if ($null -eq $subType) { throw 'No sub-task issue type found' }

$items = @(
  @{ key='BE-01'; title='Domain Design + Data Model (User Scope)'; desc='Design user-focused domain and persistence model for lifecycle operations and direct permissions only.'; aoc=@('Domain boundaries and invariants documented for User aggregate.','Data model covers users, linked party/person, status, and direct-permission mapping.','No role-management behavior is implemented in this story.') },
  @{ key='BE-02'; title='User Lifecycle APIs'; desc='Implement create/edit/deactivate/delete/reset-password APIs with validations and consistent error contracts.'; aoc=@('All user lifecycle endpoints implemented and validated.','Password change allowed only via reset endpoint/command.','Clear error responses for duplicate username, missing linked party, save failures.') },
  @{ key='BE-03'; title='Direct Permission Management APIs'; desc='Implement direct user permission add/edit/remove and effective-access read endpoint for user scope.'; aoc=@('Direct permission CRUD endpoints available for user scope.','Effective access endpoint returns source details as direct for this story scope.','No role-based permission assignment included.') },
  @{ key='BE-04'; title='Security, Audit, and Tests'; desc='Apply access-control checks, security audit logs, and backend tests for critical user flows.'; aoc=@('Deny-by-default and policy/object-scope checks enforced.','Security audit logs emitted for sensitive user operations.','Unit/integration tests pass for lifecycle and direct-permission flows.') },
  @{ key='FE-01'; title='User List + Filters UI'; desc='Build user list with live filtering and stable refresh after user changes.'; aoc=@('List supports live filter by username and active status.','UI refreshes consistently after create/edit/deactivate/delete.','Localization and RTL/LTR behavior preserved.') },
  @{ key='FE-02'; title='Create/Edit + State Actions UI'; desc='Build create/edit user forms and actions for deactivate/delete/reset-password.'; aoc=@('Create/edit validations match backend contracts.','Reset-password action available and clear in UI.','Deactivate/delete flows include confirmations and error handling.') },
  @{ key='FE-03'; title='Direct Permission UI'; desc='Build UI for direct permission management on user scope (no role assignment UI in this story).'; aoc=@('Direct permission add/edit/remove is fully usable.','Operations/resource selection is available in modal/panel.','Role-assignment controls are excluded from this story UI scope.') },
  @{ key='FE-04'; title='Effective Access View + UI Tests'; desc='Display effective user access and add tests for core user management flows.'; aoc=@('Effective access view shows direct source clearly.','Critical user flows covered by UI/component tests.','No role-management behavior included in tests for this story.') }
)

$created = New-Object System.Collections.Generic.List[string]
$skipped = New-Object System.Collections.Generic.List[string]

foreach($it in $items){
  $summary = "$($it.key) - $($it.title)"
  if($existingSubtasks.ContainsKey($summary)){
    $skipped.Add("$summary => $($existingSubtasks[$summary])")
    continue
  }

  $dc = @()
  $dc += (New-Heading 3 'Description')
  $dc += (New-Paragraph $it.desc)
  $dc += (New-Heading 3 'AoC')
  foreach($a in $it.aoc){ $dc += (New-Paragraph (' ' + $a)) }
  $adf = [ordered]@{ type='doc'; version=1; content=$dc }

  $body = [ordered]@{
    fields = [ordered]@{
      project = [ordered]@{ key='AC' }
      parent = [ordered]@{ key=$story }
      summary = $summary
      issuetype = [ordered]@{ id=$subType.id }
      description = $adf
    }
  }

  $bj = $body | ConvertTo-Json -Depth 100
  $res = Invoke-RestMethod -Method Post -Uri "$base/rest/api/3/issue" -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $bj
  $created.Add("$summary => $($res.key)")
}

Write-Output ('STORY_UPDATED: ' + $story)
Write-Output ('SUBTASK_TYPE: ' + $subType.name + ' (' + $subType.id + ')')
Write-Output ('CREATED_COUNT: ' + $created.Count)
foreach($c in $created){ Write-Output ('CREATED: ' + $c) }
Write-Output ('SKIPPED_COUNT: ' + $skipped.Count)
foreach($s in $skipped){ Write-Output ('SKIPPED: ' + $s) }
