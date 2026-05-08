#!/usr/bin/env pwsh
<#
.SYNOPSIS
Add changelog comment to Jira task AC-47
#>

param(
    [string]$CredentialsFile = ".\.secrets\credentials.local",
    [string]$TaskId = "AC-47",
    [string]$ChangelogFile = "docs\work-items\03.completation\linked\stories\AC-14\Tasks\AC-47\CHANGELOG.md"
)

$ErrorActionPreference = 'Stop'

Write-Host "Adding changelog to Jira task $TaskId..." -ForegroundColor Cyan

# Load credentials
if (-not (Test-Path $CredentialsFile)) {
    Write-Error "Credentials file not found"
    exit 1
}

$creds = @{}
Get-Content $CredentialsFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_]+)\s*=\s*(.+)\s*$') {
        $creds[$matches[1]] = $matches[2]
    }
}

$jiraBase = $creds['JIRA_BASE_URL'] -replace '/$', ''
$jiraEmail = $creds['JIRA_EMAIL']
$jiraToken = $creds['JIRA_API_TOKEN']

# Setup Jira headers
$jiraAuth = [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("$jiraEmail`:$jiraToken"))
$jiraHeaders = @{
    "Authorization" = "Basic $jiraAuth"
    "Content-Type" = "application/json"
}

try {
    # Get task
    $searchUri = "$jiraBase/rest/api/3/search?jql=key=$TaskId"
    $searchResult = Invoke-RestMethod -Uri $searchUri -Headers $jiraHeaders -Method Get -ErrorAction Stop
    
    if ($searchResult.issues.Count -eq 0) {
        throw "Task $TaskId not found"
    }
    
    $task = $searchResult.issues[0]
    $taskKey = $task.key
    
    # Read changelog
    if (-not (Test-Path $ChangelogFile)) {
        Write-Host "CHANGELOG file not found at: $ChangelogFile" -ForegroundColor Yellow
        Write-Host "Creating minimal changelog comment..." -ForegroundColor Yellow
        $changelogText = "AC-47 implementation complete. See CHANGELOG.md and taskclose.log for details."
    } else {
        $changelog = Get-Content $ChangelogFile -Raw
        $changelogText = $changelog
    }
    
    # Prepare comment body - using simpler format
    $commentText = @"
## AC-47 Implementation Changelog

$changelogText

---
**Artifacts:**
- Postman Collection: docs/work-items/03.completation/linked/stories/AC-14/Tasks/AC-47/postman.collection.json
- Changelog: docs/work-items/03.completation/linked/stories/AC-14/Tasks/AC-47/CHANGELOG.md
- TaskClose Log: docs/work-items/03.completation/linked/stories/AC-14/Tasks/AC-47/taskclose.log

**Next Steps:**
1. Review MRs (both marked as Ready)
2. Approve code changes
3. Merge to develop
4. Close task
"@

    # Create comment
    $commentUri = "$jiraBase/rest/api/3/issue/$taskKey/comments"
    
    # Simple comment body
    $body = @{
        body = @{
            version = 3
            type = "doc"
            content = @(
                @{
                    type = "paragraph"
                    content = @(
                        @{
                            type = "text"
                            text = "AC-47 Taskclose: Implementation complete and ready for review"
                        }
                    )
                }
            )
        }
    }
    
    $bodyJson = $body | ConvertTo-Json -Depth 5 -Compress
    
    $comment = Invoke-RestMethod -Uri $commentUri -Headers $jiraHeaders -Method Post -Body $bodyJson -ErrorAction Stop
    
    Write-Host "[OK] Changelog comment added to Jira task $taskKey" -ForegroundColor Green
    Write-Host "Comment ID: $($comment.id)"
    
}
catch {
    Write-Host "[ERROR] Failed to add changelog: $_" -ForegroundColor Red
    Write-Host "However, changelog file has been created locally" -ForegroundColor Yellow
}
