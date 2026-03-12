$ErrorActionPreference='Stop'
. .specify/scripts/powershell/load-secrets.ps1 | Out-Null

$jiraKey = 'AC-2'
$jiraBase = $env:JIRA_BASE_URL.TrimEnd('/')
$jiraEmail = $env:JIRA_EMAIL
$jiraToken = $env:JIRA_API_TOKEN

$gitlabBase = $env:GITLAB_BASE_URL.TrimEnd('/')
$gitlabToken = $env:GITLAB_TOKEN
$projectId = $env:GITLAB_PROJECT_PROJECT_ID
if ([string]::IsNullOrWhiteSpace($projectId)) { throw 'Missing GITLAB_PROJECT_PROJECT_ID' }

$repoPath = 'projects/Accounting-Project'
$sourceBranch = 'technicals/ac-2-backend-infrastructure'
$preferredTarget = 'develop'
$fallbackTarget = 'main'

$auth = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("$jiraEmail`:$jiraToken"))
$jh = @{ Authorization = "Basic $auth"; Accept='application/json'; 'Content-Type'='application/json' }
$gh = @{ 'PRIVATE-TOKEN' = $gitlabToken; 'Content-Type'='application/x-www-form-urlencoded' }

# Jira issue read
$issue = Invoke-RestMethod -Method Get -Headers $jh -Uri "$jiraBase/rest/api/3/issue/${jiraKey}?fields=summary,status"
$summary = $issue.fields.summary
$currentStatus = $issue.fields.status.name

# Move to In Progress if needed
if ($currentStatus -ne 'In Progress') {
  $trs = Invoke-RestMethod -Method Get -Headers $jh -Uri "$jiraBase/rest/api/3/issue/${jiraKey}/transitions"
  $t = $trs.transitions | Where-Object { $_.id -eq '21' } | Select-Object -First 1
  if (-not $t) { $t = $trs.transitions | Where-Object { $_.to.name -ieq 'In Progress' } | Select-Object -First 1 }
  if ($t) {
    $tb = @{ transition = @{ id = $t.id } } | ConvertTo-Json -Depth 6
    Invoke-RestMethod -Method Post -Headers $jh -Uri "$jiraBase/rest/api/3/issue/${jiraKey}/transitions" -Body $tb | Out-Null
    $currentStatus = 'In Progress'
  }
}

# Ensure target branch exists in project repo
$remoteTarget = git -C $repoPath ls-remote --heads origin $preferredTarget
if (-not $remoteTarget) {
  git -C $repoPath fetch origin --prune | Out-Null
  git -C $repoPath branch -f $preferredTarget "origin/$fallbackTarget" | Out-Null
  git -C $repoPath push -u origin $preferredTarget | Out-Null
}
$targetBranch = $preferredTarget

# Ensure source branch exists on remote
$remoteSource = git -C $repoPath ls-remote --heads origin $sourceBranch
if (-not $remoteSource) {
  git -C $repoPath fetch origin --prune | Out-Null
  git -C $repoPath branch -f $sourceBranch "origin/$targetBranch" | Out-Null
  git -C $repoPath push -u origin $sourceBranch | Out-Null
}

# Ensure MVP milestone exists
$mvpTitle = 'V 0.1 (MVP)'
$ms = Invoke-RestMethod -Method Get -Headers $gh -Uri "$gitlabBase/api/v4/projects/$projectId/milestones?search=$([System.Uri]::EscapeDataString($mvpTitle))"
$mvp = $ms | Where-Object { $_.title -eq $mvpTitle } | Select-Object -First 1
if (-not $mvp) {
  $mvp = Invoke-RestMethod -Method Post -Headers $gh -Uri "$gitlabBase/api/v4/projects/$projectId/milestones" -Body @{ title = $mvpTitle }
}

# Create/reuse GitLab issue
$issueTitle = "[$jiraKey] - $summary"
$glIssues = Invoke-RestMethod -Method Get -Headers $gh -Uri "$gitlabBase/api/v4/projects/$projectId/issues?search=$jiraKey&state=all"
$glIssue = $glIssues | Where-Object { $_.title -match '\[AC-2\]' -or $_.title -match 'AC-2' } | Select-Object -First 1
if (-not $glIssue) {
  $desc = @"
Jira Task: $jiraBase/browse/$jiraKey

Scope:
- Backend-oriented project infrastructure setup
- Repository: Accounting-Project
- Branch flow: $sourceBranch -> $targetBranch
- MR state: Draft (until explicit approval)
- Fix Version context: V 0.1 (MVP)
"@
  $glIssue = Invoke-RestMethod -Method Post -Headers $gh -Uri "$gitlabBase/api/v4/projects/$projectId/issues" -Body @{ title = $issueTitle; description = $desc; milestone_id = $mvp.id }
}

# Create/reuse Draft MR
$mrs = Invoke-RestMethod -Method Get -Headers $gh -Uri "$gitlabBase/api/v4/projects/$projectId/merge_requests?state=all&source_branch=$([System.Uri]::EscapeDataString($sourceBranch))&target_branch=$([System.Uri]::EscapeDataString($targetBranch))"
$mr = $mrs | Select-Object -First 1
$mrDesc = @"
Related Jira: $jiraBase/browse/$jiraKey
Related GitLab Issue: $($glIssue.web_url)

Implementation focus:
- Backend infrastructure setup in Accounting-Project
- Draft mode preserved
- Flow follows task branch to develop
"@
if (-not $mr) {
  $mr = Invoke-RestMethod -Method Post -Headers $gh -Uri "$gitlabBase/api/v4/projects/$projectId/merge_requests" -Body @{ source_branch = $sourceBranch; target_branch = $targetBranch; title = "Draft: [$jiraKey] - $summary"; description = $mrDesc; remove_source_branch = $false }
} else {
  $newTitle = $mr.title
  if ($newTitle -notlike 'Draft:*') { $newTitle = "Draft: $newTitle" }
  $mr = Invoke-RestMethod -Method Put -Headers $gh -Uri "$gitlabBase/api/v4/projects/$projectId/merge_requests/$($mr.iid)" -Body @{ title = $newTitle; description = $mrDesc }
}

# Add Jira remotelinks (best effort)
$existingLinks = Invoke-RestMethod -Method Get -Headers $jh -Uri "$jiraBase/rest/api/3/issue/${jiraKey}/remotelink"
$urls = @($existingLinks | ForEach-Object { $_.object.url })
$need = @(
  @{ url = $glIssue.web_url; title = 'GitLab Issue for AC-2' },
  @{ url = $mr.web_url; title = 'GitLab Draft MR for AC-2' }
)
foreach ($l in $need) {
  if ($urls -notcontains $l.url) {
    try {
      $payload = @{ object = @{ url = $l.url; title = $l.title } } | ConvertTo-Json -Depth 6
      Invoke-RestMethod -Method Post -Headers $jh -Uri "$jiraBase/rest/api/3/issue/${jiraKey}/remotelink" -Body $payload | Out-Null
    } catch {}
  }
}

# Jira comment
$adf = @{
  body = @{
    type='doc'; version=1; content=@(
      @{ type='paragraph'; content=@(@{type='text'; text='AC-2 workflow execution initialized for backend infrastructure setup.'}) },
      @{ type='bulletList'; content=@(
        @{ type='listItem'; content=@(@{ type='paragraph'; content=@(@{type='text'; text=("Branch: " + $sourceBranch + " -> " + $targetBranch)}) }) },
        @{ type='listItem'; content=@(@{ type='paragraph'; content=@(@{type='text'; text=("GitLab Issue: " + $glIssue.web_url)}) }) },
        @{ type='listItem'; content=@(@{ type='paragraph'; content=@(@{type='text'; text=("Draft MR: " + $mr.web_url)}) }) },
        @{ type='listItem'; content=@(@{ type='paragraph'; content=@(@{type='text'; text='State kept as Draft per workflow.'}) }) }
      ) }
    )
  }
} | ConvertTo-Json -Depth 30
Invoke-RestMethod -Method Post -Headers $jh -Uri "$jiraBase/rest/api/3/issue/${jiraKey}/comment" -Body $adf | Out-Null

[PSCustomObject]@{
  jira = "$jiraBase/browse/$jiraKey"
  jiraStatus = ((Invoke-RestMethod -Method Get -Headers $jh -Uri "$jiraBase/rest/api/3/issue/${jiraKey}?fields=status").fields.status.name)
  repo = 'Accounting-Project'
  sourceBranch = $sourceBranch
  targetBranch = $targetBranch
  gitlabIssue = $glIssue.web_url
  gitlabMr = $mr.web_url
  mrTitle = $mr.title
} | ConvertTo-Json -Depth 8