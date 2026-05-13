# Task Close Workflow

This document describes the **two-phase task close workflow** required to properly close and review a completed task in the accounting system.

## Workflow Overview

The task close process consists of **two sequential phases**:

```
Phase 1: TaskCompletion (03)  →  Phase 2: TaskClose (04)
   Documentation              →     Workflow Transition
```

### Important: Execution Order is Mandatory

**ALWAYS execute in this order:**
1. **First:** Run `speckit.taskcompletion` (03) to generate completion documentation
2. **Then:** Run `speckit.taskclose` (04) to update Jira/GitLab and finalize

Running taskClose before TaskCompletion will **fail with a precondition error**.

---

## Phase 1: TaskCompletion (03) — Documentation

### Purpose
Generate comprehensive documentation of delivered work, test results, and traceability links.

### Inputs
```powershell
# Example: Task-level completion
& scripts/task-exec.ps1 "AC-12-01" # Task within story AC-12

# Example: Story-level completion
& scripts/task-exec.ps1 "AC-12"    # Entire story
```

### What It Does
1. Detects whether input is a task (AC-12-01) or story (AC-12)
2. Generates completion markdown file
3. Includes:
   - Delivered functionality summary
   - Acceptance Criteria (AoC)
   - Implementation details and file changes
   - Test results (automated + manual verification steps)
   - Traceability links (Jira, Workspace MR, Project MR)
4. Saves to:
   - Task: `docs/work-items/03.completation/linked/stories/<STORY>/Tasks/<TASK>/completion.md`
   - Story: `docs/work-items/03.completation/linked/stories/<STORY>/completion.md`

### Output Files
```
docs/work-items/03.completation/linked/stories/
  └── AC-12/
      ├── completion.md                          # Story-level completion (if story input)
      └── Tasks/
          └── AC-12-01/
              └── completion.md                  # Task completion document
```

### Sign-off Fields
After generation, the file includes placeholder sign-off areas for:
- Developer
- Reviewer
- PO (product owner) — only for story-level completions

---

## Phase 2: TaskClose (04) — Workflow Transition

### Purpose
Transition task to "In Review" state, update GitLab MRs to ready status, generate Postman collections for API changes, and create task close logs.

### Prerequisites (Verification Only — No Invocation)

**CRITICAL: TaskClose does NOT call or invoke taskCompletion. It only checks if the file exists.**

TaskClose verifies these conditions BEFORE executing:
- ✓ TaskCompletion file exists at the expected path: `docs/work-items/03.completation/linked/stories/<STORY>/Tasks/<TASK>/completion.md`
- ✓ Jira task is in "In Progress" status
- ✓ Both Workspace and Project MRs are linked in Jira Web Links

If file does NOT exist:
1. TaskClose **stops immediately** — does NOT attempt to run taskCompletion
2. Reports error: "Precondition Failed: completion.md does not exist at [path]"
3. Instructs user: "Please run taskCompletion (04) first, then retry taskClose (03)"
4. Exits without making any changes to Jira or GitLab

If ANY other precondition fails, taskClose **stops and reports the blocker**.

### Inputs
```powershell
# With auto-detection for Postman
& scripts/task-exec.ps1 "AC-12-01"

# Explicit Postman generation
& scripts/task-exec.ps1 "AC-12-01" -GeneratePostman $true

# Explicit Postman skip
& scripts/task-exec.ps1 "AC-12-01" -GeneratePostman $false
```

### Execution Phases (In Order)

#### Phase 0: Precondition Verification (FIRST — No Invocation)
1. Check if completion.md file exists at:
   `docs/work-items/03.completation/linked/stories/<STORY>/Tasks/<TASK>/completion.md`
2. If NOT found:
   - Stop immediately
   - Report error: "Precondition Failed: completion.md does not exist"
   - Instruct user to run taskCompletion (04) first
   - Exit without changes to Jira or GitLab
3. If found: proceed to Phase 1

#### Phase 1: Jira Workflow Update
1. Fetch Jira task details
2. Verify task is in "In Progress" status
3. **Transition task to "In Review"**
4. Add Jira comment with link to task close log:
   ```
   Task ready for review. See task close log at:
   docs/work-items/03.completation/linked/stories/<STORY>/Tasks/<TASK>/taskclose.log
   ```

#### Phase 2: GitLab MR State Update
1. Fetch both MRs from Jira Web Links:
   - Workspace MR (process/documentation changes)
   - Project MR (product code changes)
2. **Change MR state from "Draft" to "Ready for Review"**
3. Verify MR settings:
   - ✓ Delete source branch enabled
   - ✓ Squash commits enabled
4. Add MR note: `Transitioned to In Review by taskClose on [timestamp]`

#### Phase 3: Postman Collection Generation (Conditional)
1. Auto-detect if task has new/modified API endpoints:
   - Scan project MR diff for REST endpoint changes
   - Look for GET, POST, PUT, DELETE, PATCH patterns
2. If endpoints found (or `generate_postman=true`):
   - Extract endpoint definitions from code
   - Generate Postman collection JSON
   - Save to: `docs/work-items/03.completation/linked/stories/<STORY>/Tasks/<TASK>/postman.collection.json`
   - Include environment variables for both environments

#### Phase 4: Task Close Log Generation
1. Create execution log file at:
   `docs/work-items/03.completation/linked/stories/<STORY>/Tasks/<TASK>/taskclose.log`
2. Log contains:
   - Execution timestamps (start, end, duration)
   - Jira transition details (In Progress → In Review)
   - MR state changes (Draft → Ready)
   - Postman collection path (if generated)
   - Success/failure status

#### Phase 5: Git Commit
1. Create git commit for all task close artifacts
2. Commit message: `wip: <TASK-KEY> - Task closed and ready for review`
3. Includes:
   - `completion.md` (if not already committed)
   - `taskclose.log`
   - `postman.collection.json` (if generated)

### Output Files
```
docs/work-items/03.completation/linked/stories/
  └── AC-12/
      ├── completion.md
      └── Tasks/
          └── AC-12-01/
              ├── completion.md              # From Phase 1
              ├── taskclose.log              # NEW — Phase 4
              └── postman.collection.json    # NEW — Phase 3 (if API changes)
```

### Result
After taskClose completes:
- ✓ Jira task is in "In Review" state
- ✓ Both MRs are marked "Ready for Review"
- ✓ Postman collection generated (if applicable)
- ✓ Task close log documents the entire transition
- ✓ All artifacts committed to git

---

## Complete Workflow Example

### Scenario: Complete Task AC-12-01

```bash
# Step 1: Document completion (Phase 1)
& scripts/task-exec.ps1 -Command "taskcompletion" -Reference "AC-12-01"

# Output:
# ✓ Generated: docs/work-items/03.completation/linked/stories/AC-12/Tasks/AC-12-01/completion.md
# Next: Run taskClose to transition Jira and GitLab states

# Step 2: Close and transition to review (Phase 2)
& scripts/task-exec.ps1 -Command "taskclose" -Reference "AC-12-01"

# Phase 0: Precondition Check
# ✓ Verified: completion.md exists
# Proceeding to Phase 1...

# Output:
# ✓ Phase 0: Precondition verified (completion.md found)
# ✓ Phase 1: Jira AC-12-01 transitioned to "In Review"
# ✓ Phase 2: Workspace MR set to "Ready for Review"
# ✓ Phase 2: Project MR set to "Ready for Review"
# ✓ Phase 3: Postman collection generated (API endpoints found)
# ✓ Phase 4: Task close log created at docs/work-items/03.completation/linked/stories/AC-12/Tasks/AC-12-01/taskclose.log
# ✓ Phase 5: Git commit created: wip: AC-12-01 - Task closed and ready for review
```

### Scenario: TaskClose Without Completion (Error)

```bash
# Attempt to run taskClose without running taskCompletion first
& scripts/task-exec.ps1 -Command "taskclose" -Reference "AC-12-01"

# Phase 0: Precondition Check
# ✗ FAILED: completion.md not found at docs/work-items/03.completation/linked/stories/AC-12/Tasks/AC-12-01/completion.md

# Output:
# ERROR: Precondition Failed
# TaskClose does NOT invoke taskCompletion.
# Please run taskCompletion (03) first:
#   & scripts/task-exec.ps1 -Command "taskcompletion" -Reference "AC-12-01"
# 
# Then retry taskClose (04):
#   & scripts/task-exec.ps1 -Command "taskclose" -Reference "AC-12-01"
#
# Exit code: 1
```

---

## Safety Rules

### Critical: No Invocation of taskCompletion
- ✓ TaskClose does NOT call or invoke taskCompletion
- ✓ TaskClose ONLY verifies that completion.md exists
- ✓ If completion.md is missing, taskClose stops and exits immediately
- ✓ User MUST manually run taskCompletion (04) before retrying taskClose (03)

### taskClose Safety Checks
- ✓ Verifies completion.md exists before proceeding (Phase 0)
- ✓ Stops if Jira task is not in "In Progress" status
- ✓ Stops if either MR is missing from Jira Web Links
- ✓ Rolls back Jira transition if MR updates fail
- ✓ Preserves existing MR review comments

### No Credential Printing
- ✓ Credentials are loaded from `.secrets/credentials.local`
- ✓ Credentials are NEVER printed in logs or output

---

## Troubleshooting

### "Precondition Failed: completion.md not found"
**Cause:** TaskCompletion (04) was not run before taskClose
**Solution:** Run taskCompletion first, then retry taskClose

### "Precondition Failed: Jira task not in 'In Progress' status"
**Cause:** Task was already transitioned out of "In Progress"
**Solution:** Check Jira task current status; if already in "In Review", taskClose is not needed

### "Precondition Failed: Workspace MR not found"
**Cause:** Workspace MR URL is not linked in Jira Web Links
**Solution:** Add Workspace MR link to Jira task before running taskClose

### MR Transition Failed
**Cause:** GitLab API authentication failed or MR is not in Draft state
**Solution:** Verify credentials in `.secrets/credentials.local` and check MR current state

---

## Related Documentation

- `.prompts/02-implementation-phase-prompts/03.speckit.taskcompletion.prompt.md` — TaskCompletion prompt
- `.prompts/02-implementation-phase-prompts/04.speckit.taskclose.prompt.md` — TaskClose prompt
- `docs/workflows/git-workflow-flows.md` — Git flow guardrails
- `AGENTS.md` — Jira workflow status definitions and MR requirements
