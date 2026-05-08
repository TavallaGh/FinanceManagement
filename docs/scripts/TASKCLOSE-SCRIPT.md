# TaskClose Reusable Script Documentation

## Overview

The `taskclose.ps1` script is a **production-ready, reusable script** that automates all task closure duties in a single command. It replaces the need to create new scripts for each task.

## Location

```
scripts/taskclose.ps1          # Main reusable script
scripts/taskclose-quick.ps1    # Quick wrapper (optional)
```

## Features

✅ Single command for all taskclose duties  
✅ Auto-detect task type (story vs task)  
✅ Transition Jira status to "In Review"  
✅ Generate CHANGELOG.md automatically  
✅ Create taskclose.log with execution summary  
✅ Generate Postman collections for APIs  
✅ Add Jira comment with artifact links  
✅ Error handling and validation  
✅ Comprehensive logging  

## Prerequisites

1. **Completion.md must exist** at the task's completion path
2. **Jira task** must be in "In Progress", "In Review", or "Done" status
3. **Credentials** must be configured in `.secrets/credentials.local`
4. **GitLab MRs** must be linked in Jira Web Links (optional: script will warn if missing)

## Usage

### Basic Usage

```powershell
# Close a task
& .\scripts\taskclose.ps1 -TaskId "AC-47"

# Close a task with explicit Postman generation
& .\scripts\taskclose.ps1 -TaskId "AC-47" -GeneratePostman $true

# Quick wrapper
& .\scripts\taskclose-quick.ps1 AC-47
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `-TaskId` | string | Yes | - | Jira task ID (e.g., `AC-47`, `AC-14-01`) |
| `-CredentialsFile` | string | No | `.\.secrets\credentials.local` | Path to credentials file |
| `-GeneratePostman` | bool | No | `$true` | Generate Postman collection |
| `-DryRun` | switch | No | `$false` | Preview changes without executing |

### Examples

```powershell
# Close a story task
& .\scripts\taskclose.ps1 -TaskId "AC-47"

# Close a subtask with explicit Postman
& .\scripts\taskclose.ps1 -TaskId "AC-14-01" -GeneratePostman $true

# Use quick wrapper
& .\scripts\taskclose-quick.ps1 AC-47

# With custom credentials file
& .\scripts\taskclose.ps1 -TaskId "AC-47" -CredentialsFile "C:\creds\custom.local"
```

## Output Files

The script creates these artifacts in the task's completion directory:

```
docs/work-items/03.completation/linked/stories/AC-14/Tasks/AC-47/
├── completion.md              # (pre-existing, not created by taskclose)
├── CHANGELOG.md               # NEW - Comprehensive changelog
├── taskclose.log              # NEW - Execution log
└── postman.collection.json    # NEW - API collection (if APIs added)
```

## Execution Phases

### PHASE 0: Precondition Verification
- ✓ Checks completion.md exists
- ✓ Verifies Jira task exists
- ✓ Validates task status (In Progress, In Review, or Done)
- ✓ Stops immediately if preconditions fail

### PHASE 1: Jira Workflow Update
- ✓ Transitions task to "In Review" status
- ✓ Handles cases where task is already in target status
- ✓ Logs transition details

### PHASE 2: GitLab MR Updates
- ✓ Fetches MR details from Jira Web Links
- ✓ Transitions MRs from Draft to Ready
- ✓ Warns if MRs not linked in Jira
- ✓ Preserves existing review comments

### PHASE 3: CHANGELOG Generation
- ✓ Extracts data from completion.md
- ✓ Creates comprehensive CHANGELOG.md
- ✓ Includes acceptance criteria status
- ✓ Documents implementation details

### PHASE 4: Postman Collection Generation
- ✓ Analyzes project MR for API endpoints
- ✓ Generates Postman collection.json
- ✓ Includes environment variables
- ✓ Can be skipped with `-GeneratePostman $false`

### PHASE 5: TaskClose Log Generation
- ✓ Creates detailed execution log
- ✓ Documents all phases and their status
- ✓ Records timestamps and transitions
- ✓ Provides next steps summary

### PHASE 6: Jira Comment Addition
- ✓ Adds comprehensive comment to task
- ✓ Links all generated artifacts
- ✓ Provides next steps guidance
- ✓ Includes status summary

## Error Handling

The script includes comprehensive error handling:

```powershell
# Precondition failures
"Precondition Failed: completion.md not found"
"Task status is 'Backlog', expected 'In Progress'"
"Credentials file not found"

# API failures
"Failed to update MR: 410 Gone"
"Failed to add comment: Authentication failed"

# File system failures
"Completion file not found at path"
"Cannot write to completion path"
```

All errors are logged with timestamps and trigger an exit code of 1.

## Logging

All operations are logged with:
- **Timestamp** (YYYY-MM-DD HH:MM:SS format)
- **Level** (INFO, OK, WARN, ERROR)
- **Message** with context

Example:
```
[2026-05-08 15:00:00] [OK] Credentials loaded
[2026-05-08 15:00:01] [OK] Jira issue retrieved: FE-01 Razor UI: Login + Forgot-Password
[2026-05-08 15:00:02] [OK] CHANGELOG.md generated
```

## Return Values / Output

Upon successful completion, the script outputs:
- ✓ Jira task URL
- ✓ Artifact locations
- ✓ MR status (if available)
- ✓ Execution summary
- ✓ Next steps

Example:
```
=== TASKCLOSE WORKFLOW COMPLETE ===
Task AC-47 is ready for review

Artifacts:
- Changelog: docs/work-items/03.completation/linked/stories/AC-14/Tasks/AC-47/CHANGELOG.md
- TaskClose Log: docs/work-items/03.completation/linked/stories/AC-14/Tasks/AC-47/taskclose.log
- Postman: docs/work-items/03.completation/linked/stories/AC-14/Tasks/AC-47/postman.collection.json

Next Steps:
1. Review both ready MRs
2. Approve changes
3. Merge to develop
4. Run integration tests
```

## Configuration

The script uses `.secrets/credentials.local` for:
- Jira API credentials
- GitLab access tokens
- Project IDs and URLs

Required credentials:
```
JIRA_BASE_URL=https://nexttoptech.atlassian.net
JIRA_EMAIL=user@domain.com
JIRA_API_TOKEN=<token>
GITLAB_TOKEN=<token>
GITLAB_BASE_URL=https://gitlab.com
GITLAB_WORKSPACE_PROJECT_ID=<id>
GITLAB_PROJECT_SSO_PROJECT_ID=<id>
```

## Troubleshooting

### Issue: "Precondition Failed: completion.md does not exist"

**Cause:** TaskCompletion phase must run first  
**Solution:** 
```powershell
# Run taskcompletion first
& .\scripts\taskcompletion.ps1 -TaskId "AC-47"

# Then run taskclose
& .\scripts\taskclose.ps1 -TaskId "AC-47"
```

### Issue: "Task status is X, expected 'In Progress'"

**Cause:** Task is in wrong status  
**Solution:** Check Jira task status and update if needed before running taskclose

### Issue: "Failed to add comment: 410 Gone"

**Cause:** Jira API endpoint issue (usually transient)  
**Solution:** Retry the command. Changelog and logs are still created locally.

### Issue: "Credentials file not found"

**Cause:** `.secrets/credentials.local` is missing or in wrong location  
**Solution:** Create credentials file with required Jira and GitLab credentials

## Best Practices

1. **Run taskcompletion first**
   ```powershell
   & .\scripts\taskcompletion.ps1 -TaskId "AC-47"
   & .\scripts\taskclose.ps1 -TaskId "AC-47"
   ```

2. **Use consistent task ID format**
   - Stories: `AC-47`
   - Subtasks: `AC-14-01`

3. **Verify preconditions before running**
   - Jira task exists and is in correct status
   - completion.md file exists
   - credentials are valid

4. **Review generated artifacts**
   - Check CHANGELOG.md for accuracy
   - Verify Postman collection endpoints
   - Review taskclose.log for any warnings

5. **Test Postman collection**
   - Import into Postman
   - Verify environment variables
   - Test API endpoints

## Integration with CI/CD

The script can be integrated into CI/CD pipelines:

```yaml
# GitLab CI example
taskclose:
  stage: finalize
  script:
    - pwsh -ExecutionPolicy Bypass -File scripts/taskclose.ps1 -TaskId $CI_COMMIT_MESSAGE
  only:
    - develop
```

## Security Considerations

⚠️ **Important Security Notes:**

1. **Never commit credentials** - `.secrets/credentials.local` should be in `.gitignore`
2. **Tokens are not logged** - All sensitive data is masked in logs
3. **HTTPS only** - All API calls use HTTPS
4. **No hardcoded secrets** - All secrets loaded from credentials file
5. **Validate input** - Task ID format is validated before API calls

## Advanced Usage

### Custom Credentials Location

```powershell
& .\scripts\taskclose.ps1 -TaskId "AC-47" `
    -CredentialsFile "C:\secure\creds.local"
```

### Postman Generation Control

```powershell
# Force Postman generation
& .\scripts\taskclose.ps1 -TaskId "AC-47" -GeneratePostman $true

# Skip Postman generation
& .\scripts\taskclose.ps1 -TaskId "AC-47" -GeneratePostman $false
```

### Dry Run Mode (Future Enhancement)

```powershell
# Preview changes without executing
& .\scripts\taskclose.ps1 -TaskId "AC-47" -DryRun
```

## Support

For issues or questions:

1. Check this documentation first
2. Review the taskclose.log for error details
3. Check Jira task status and links
4. Verify credentials are valid
5. Review Git logs for recent changes

## Related Documentation

- [Task Completion Workflow](../docs/workflows/task-close-workflow.md)
- [AGENTS Contract](../AGENTS.md)
- [Git Workflow](../docs/workflows/git-workflow-flows.md)

## Version History

### v1.0.0 (2026-05-08)
- Initial release
- Support for story and task closures
- Jira status transitions
- Changelog generation
- Postman collection generation
- Comprehensive logging and error handling

---

**Last Updated:** 2026-05-08  
**Author:** DevOps Team  
**Status:** Production Ready
