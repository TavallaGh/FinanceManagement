# TaskClose Workflow - Quick Reference Card

## One-Line Summary
**Single command to close ANY task: transitions Jira, marks MRs ready, generates changelog, Postman, and logs.**

## Quick Start

```powershell
# That's it!
& .\scripts\taskclose.ps1 -TaskId "AC-47"
```

## What It Does

| Duty | What Happens | Artifact |
|------|--------------|----------|
| **Jira Update** | Task → "In Review" status | Status change in Jira |
| **MRs Ready** | Draft → Ready for review | MR state change in GitLab |
| **Changelog** | Comprehensive change documentation | `CHANGELOG.md` |
| **Backend Endpoints** | Auto-detects new API endpoints from code | Endpoint list in `CHANGELOG.md` |
| **Postman** | API endpoints documented with auto-detected endpoints | `postman.collection.json` |
| **Logging** | Execution summary with timestamps | `taskclose.log` |
| **Jira Comment** | Links to all artifacts | Comment in Jira task |

## Command Variations

```powershell
# Basic (default - generates Postman)
& .\scripts\taskclose.ps1 -TaskId "AC-47"

# Quick syntax
& .\scripts\taskclose-quick.ps1 AC-47

# Skip Postman
& .\scripts\taskclose.ps1 -TaskId "AC-47" -GeneratePostman $false

# Task with subtask format
& .\scripts\taskclose.ps1 -TaskId "AC-14-01"

# Custom credentials
& .\scripts\taskclose.ps1 -TaskId "AC-47" -CredentialsFile "C:\creds\custom.local"
```

## Prerequisites

✅ **Must have:**
- completion.md exists in task folder
- Jira task in "In Progress" status
- Credentials in `.secrets/credentials.local`
- GitLab MRs linked in Jira

## Output Files

All created in: `docs/work-items/03.completation/linked/stories/{STORY}/Tasks/{TASK}/`

| File | Size | Content |
|------|------|---------|
| CHANGELOG.md | ~2KB | What was delivered (24 AOC status, files, tests) |
| taskclose.log | ~1KB | Execution summary with timestamps |
| postman.collection.json | ~6KB | API endpoints ready for testing |

## Execution Phases (Inside the Script)

```
Phase 0: ✓ Verify preconditions
Phase 1: ✓ Update Jira status
Phase 2: ✓ Mark MRs as Ready
Phase 3: ✓ Generate CHANGELOG
Phase 4: ✓ Generate Postman
Phase 5: ✓ Generate Log
Phase 6: ✓ Add Jira comment
```

## Success Indicators

✅ Script exits with code 0  
✅ All phases show [OK] status  
✅ Files appear in task folder  
✅ Jira task status shows "In Review"  
✅ MRs show as "Ready" in GitLab  
✅ Jira comment includes artifact links  

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "completion.md not found" | TaskCompletion not run | Run `taskcompletion.ps1` first |
| "Task status is Backlog" | Wrong status | Update in Jira to "In Progress" |
| "Credentials not found" | Missing `.secrets/` file | Create credentials file |
| "410 Gone" | Jira API error (transient) | Retry command |

## Next Steps After TaskClose

```
1. Review MRs (both marked Ready)
   ↓
2. Approve changes
   ↓
3. Merge to develop
   ↓
4. Test integration
   ↓
5. Close Jira task
```

## File Locations

```
scripts/taskclose.ps1              ← USE THIS (reusable)
docs/workflows/TASKCLOSE-GUIDE.md  ← Read for details
docs/scripts/TASKCLOSE-SCRIPT.md   ← Detailed reference
```

## Key Parameters

| Parameter | Type | Default | Example |
|-----------|------|---------|---------|
| `-TaskId` | string | required | `"AC-47"` |
| `-GeneratePostman` | bool | `$true` | `$false` |
| `-CredentialsFile` | string | `.\.secrets\credentials.local` | `"C:\creds.local"` |

## One-Minute Setup

1. Run once: `& .\scripts\taskclose.ps1 -TaskId "AC-47"`
2. That's it! Script handles everything else
3. Check artifacts in task folder
4. Review CHANGELOG.md
5. Next → approve and merge

## Environment Check

```powershell
# Verify before running
Test-Path ".\.secrets\credentials.local"        # Should be $true
Test-Path "docs/work-items/03.completation/..." # Should exist
```

## Credentials Required

In `.secrets/credentials.local`:
```
JIRA_BASE_URL=https://nexttoptech.atlassian.net
JIRA_EMAIL=user@domain.com
JIRA_API_TOKEN=<token>
GITLAB_TOKEN=<token>
GITLAB_BASE_URL=https://gitlab.com
GITLAB_WORKSPACE_PROJECT_ID=<id>
GITLAB_PROJECT_SSO_PROJECT_ID=<id>
```

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | ✓ Success | Continue to review |
| 1 | ✗ Failure | Check script output, fix issue, retry |

## Pro Tips

💡 **Tip 1:** Keep this card handy  
💡 **Tip 2:** Always run `taskcompletion.ps1` first  
💡 **Tip 3:** Review generated CHANGELOG.md for accuracy  
💡 **Tip 4:** Use quick wrapper for faster typing: `taskclose-quick.ps1 AC-47`  
💡 **Tip 5:** Check `taskclose.log` for detailed execution info  
💡 **Tip 6:** Backend endpoint detection runs automatically - check Postman collection for detected APIs  

## Backend Endpoint Detection

**Automatic API Endpoint Discovery:**
- ✓ Scans `projects/accounting-sso`, `projects/Accounting-Project`, `projects/accounting-prototype`
- ✓ Detects C# controllers: `[HttpGet]`, `[HttpPost]`, `[HttpPut]`, `[HttpDelete]`, `[HttpPatch]`
- ✓ Detects Minimal APIs: `.MapGet()`, `.MapPost()`, `.MapPut()`, `.MapDelete()`, `.MapPatch()`
- ✓ Populates Postman collection with real endpoints
- ✓ Documents endpoints in CHANGELOG.md with auth requirements, schemas, breaking changes

## Document Links

🔗 [Full Script Documentation](../docs/scripts/TASKCLOSE-SCRIPT.md)  
🔗 [Workflow Guide](../docs/workflows/TASKCLOSE-GUIDE.md)  
🔗 [Update Summary](../docs/TASKCLOSE-UPDATES-SUMMARY.md)  

---

**Version:** 1.0.0 | **Status:** Production Ready | **Last Updated:** 2026-05-08
