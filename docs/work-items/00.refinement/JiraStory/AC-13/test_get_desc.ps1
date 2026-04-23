$ErrorActionPreference = 'Stop'
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($env:JIRA_EMAIL):$($env:JIRA_API_TOKEN)"))
$h = @{ Authorization = "Basic $auth"; Accept = 'application/json' }
$u = 'https://nexttoptech.atlassian.net/rest/api/3/issue/AC-13?fields=description'
$r = Invoke-RestMethod -Method Get -Uri $u -Headers $h
Write-Output ('OK blocks=' + $r.fields.description.content.Count)
