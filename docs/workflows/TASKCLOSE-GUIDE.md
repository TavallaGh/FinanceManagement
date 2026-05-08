# TaskClose Workflow - Complete Guide

## Overview

The taskclose workflow is the final phase of task completion. It automatically:

1. ✅ Transitions Jira task to "In Review" status
2. ✅ Marks GitLab MRs as Ready for review
3. ✅ Generates comprehensive CHANGELOG.md
4. ✅ Creates Postman collections for API endpoints
5. ✅ Generates taskclose.log with execution summary
6. ✅ Adds Jira comment with all artifact links

**All done in ONE command** — no need to create new scripts for each task!

## Quick Start

### Before Running TaskClose

1. **Complete TaskCompletion phase first**
   ```powershell
   & .\scripts\taskcompletion.ps1 -TaskId "AC-47"
   ```

2. **Verify prerequisites:**
   - ✓ completion.md exists
   - ✓ Jira task is in "In Progress" status
   - ✓ GitLab MRs are linked in Jira Web Links
   - ✓ Credentials are configured

### Running TaskClose - Option 1: Reusable Main Script

```powershell
# Run for any task - no new scripts needed!
& .\scripts\taskclose.ps1 -TaskId "AC-47"

# For subtasks
& .\scripts\taskclose.ps1 -TaskId "AC-14-01"

# With explicit Postman generation
& .\scripts\taskclose.ps1 -TaskId "AC-47" -GeneratePostman $true
```

### Running TaskClose - Option 2: Quick Wrapper

```powershell
# Simpler syntax
& .\scripts\taskclose-quick.ps1 AC-47

# With Postman flag
& .\scripts\taskclose-quick.ps1 AC-47 -GeneratePostman $true
```

## What Gets Created

After running taskclose, you'll have:

```
docs/work-items/03.completation/linked/stories/AC-14/Tasks/AC-47/
├── completion.md              # (existed before taskclose)
├── CHANGELOG.md               # NEW - What was delivered
├── taskclose.log              # NEW - Execution log
└── postman.collection.json    # NEW - API endpoints (if applicable)
```

## File Details

### CHANGELOG.md
Comprehensive documentation of what was delivered:
- Summary of changes
- Acceptance criteria status (all 24 for AC-47)
- Files changed with rationale
- Quality assurance metrics
- Testing summary
- Links to Jira, MRs, and implementation plan

### taskclose.log
Execution summary showing:
- All 6 phases completed
- Timestamps and statuses
- MR state transitions
- Artifact creation details
- Next steps

### postman.collection.json
API endpoints ready for testing:
- All endpoints documented
- Environment variables configured
- Ready to import into Postman
- Can skip generation with `-GeneratePostman $false`

## Complete Workflow Example

### Step 1: Complete Task Implementation
```powershell
# Implement task in code
# ... write code, commit changes, create MRs ...
```

### Step 2: Run TaskCompletion
```powershell
& .\scripts\taskcompletion.ps1 -TaskId "AC-47"
# Creates: completion.md with all delivery details
```

### Step 3: Run TaskClose
```powershell
& .\scripts\taskclose.ps1 -TaskId "AC-47"
# Creates: CHANGELOG.md, taskclose.log, postman.collection.json
# Updates: Jira status to "In Review"
# Adds: Jira comment with artifact links
```

### Step 4: Review and Merge
```
1. Review both ready MRs
2. Approve changes
3. Merge to develop
4. Run integration tests
5. Close Jira task
```

## Available Scripts

### 1. `taskclose.ps1` (Main Reusable Script)

**Full-featured, production-ready script**

```powershell
& .\scripts\taskclose.ps1 -TaskId "AC-47"
```

**Features:**
- ✓ Handles all 6 taskclose phases
- ✓ Auto-detects task type (story vs subtask)
- ✓ Comprehensive error handling
- ✓ Detailed logging with timestamps
- ✓ Jira API integration
- ✓ GitLab MR updates
- ✓ CHANGELOG generation
- ✓ Postman collection generation
- ✓ Automatic Jira comments

**See:** `docs/scripts/TASKCLOSE-SCRIPT.md` for detailed documentation

### 2. `taskclose-quick.ps1` (Quick Wrapper)

**Simplified wrapper for convenience**

```powershell
& .\scripts\taskclose-quick.ps1 AC-47
```

**Features:**
- ✓ Simpler syntax
- ✓ Delegates to taskclose.ps1
- ✓ Perfect for quick usage

### 3. `taskclose-workflow.ps1` (Alternative Implementation)

**Alternative implementation with detailed phases**

```powershell
& .\scripts\taskclose-workflow.ps1
```

### 4. `taskclose-ac47.ps1` (Task-Specific, No Longer Needed)

**Previous AC-47 specific script - kept for reference**

⚠️ **Deprecated:** Use `taskclose.ps1` instead (works for any task)

## Parameters Reference

### MainScript: `taskclose.ps1`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| TaskId | string | ✓ Yes | - | Jira task ID (AC-47, AC-14-01, etc.) |
| CredentialsFile | string | No | `.\.secrets\credentials.local` | Path to credentials file |
| GeneratePostman | bool | No | `$true` | Generate Postman collection |
| DryRun | switch | No | `$false` | Preview without executing |

### QuickWrapper: `taskclose-quick.ps1`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| TaskId | string | ✓ Yes | - | Jira task ID (positional) |
| GeneratePostman | bool | No | `$true` | Generate Postman collection |

## Execution Phases (What Happens Inside)

### PHASE 0: Precondition Verification
- Checks completion.md exists
- Verifies Jira task exists
- Validates task status
- **Stops if any precondition fails**

### PHASE 1: Jira Workflow Update
- Transitions task to "In Review"
- Handles already-transitioned tasks
- Logs transition details

### PHASE 2: GitLab MR Updates
- Fetches MR details from Jira Web Links
- Transitions MRs from Draft to Ready
- Preserves existing review comments

### PHASE 3: CHANGELOG Generation
- Extracts data from completion.md
- Creates comprehensive CHANGELOG.md
- Includes acceptance criteria status

### PHASE 4: Postman Collection Generation
- Analyzes project MR for API endpoints
- Generates postman.collection.json
- Includes environment variables
- Can be skipped with `-GeneratePostman $false`

### PHASE 5: TaskClose Log Generation
- Creates detailed execution log
- Documents all phases and status
- Records timestamps
- Provides next steps

### PHASE 6: Jira Comment Addition
- Adds comprehensive comment to task
- Links all generated artifacts
- Includes next steps guidance

## Error Handling

The script handles common errors gracefully:

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

**Action:** All errors are logged with timestamps. Script exits with code 1 on failure.

## Troubleshooting

### Problem: "Precondition Failed: completion.md not found"
**Solution:** Run taskcompletion first
```powershell
& .\scripts\taskcompletion.ps1 -TaskId "AC-47"
```

### Problem: "Task status is 'Backlog'"
**Solution:** Update task status in Jira to "In Progress" or "In Review"

### Problem: "Credentials file not found"
**Solution:** Create `.secrets/credentials.local` with required credentials

### Problem: "Failed to add comment: 410 Gone"
**Solution:** Jira API error (transient). Retry the command. Local files are still created.

### Problem: MRs not transitioning
**Solution:** Check that MRs are linked in Jira Web Links. Script will warn if missing.

## Next Steps After TaskClose

1. **Review Code**
   - Review both ready MRs
   - Check changes align with requirements

2. **Approve Changes**
   - Obtain reviewer sign-off
   - Address any review comments

3. **Merge to Develop**
   - Merge workspace MR
   - Merge project MR
   - Delete source branches

4. **Test Integration**
   - Run integration test suite
   - Verify no regressions
   - Test in test environment

5. **Close Jira Task**
   - Transition to "Done" (if not already)
   - Verify all artifacts linked
   - Archive task

## Best Practices

✅ **DO**
- Run taskcompletion before taskclose
- Use the reusable script (don't create new ones per task)
- Review generated CHANGELOG.md for accuracy
- Test Postman collections after generation
- Keep credentials in `.secrets/` (never commit)

❌ **DON'T**
- Run taskclose before taskcompletion
- Create new scripts for each task (use reusable version)
- Skip Postman generation for API tasks
- Modify taskclose scripts per task (use parameters instead)
- Commit credentials files

## Integration Examples

### PowerShell Terminal
```powershell
# Simple
& .\scripts\taskclose.ps1 -TaskId "AC-47"

# With all options
& .\scripts\taskclose.ps1 `
    -TaskId "AC-47" `
    -CredentialsFile ".\.secrets\credentials.local" `
    -GeneratePostman $true
```

### CI/CD Pipeline (GitLab)
```yaml
taskclose:
  stage: finalize
  script:
    - pwsh -ExecutionPolicy Bypass -File scripts/taskclose.ps1 -TaskId $TASK_ID
  only:
    - develop
```

### Batch Processing (Multiple Tasks)
```powershell
$tasks = @("AC-47", "AC-48", "AC-49")
foreach ($task in $tasks) {
    Write-Host "Closing $task..."
    & .\scripts\taskclose.ps1 -TaskId $task
}
```

## Documentation Links

- [Detailed TaskClose Script Documentation](../docs/scripts/TASKCLOSE-SCRIPT.md)
- [Task Close Workflow](../docs/workflows/task-close-workflow.md)
- [Git Workflow](../docs/workflows/git-workflow-flows.md)
- [AGENTS Contract](../AGENTS.md)

## Support & Questions

For issues:
1. Check this guide first
2. Review `taskclose.log` for error details
3. Check Jira task status and MR links
4. Verify credentials are valid
5. Review Git logs for recent changes

---

**Version:** 1.0.0  
**Last Updated:** 2026-05-08  
**Status:** Production Ready  
**Maintainer:** DevOps Team
