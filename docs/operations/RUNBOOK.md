# RUNBOOK (Daily Operations)

## 1) Prepare Environment

PowerShell:

```powershell
. .specify/scripts/powershell/load-secrets.ps1 -MaskOutput
```

Bash:

```bash
source .specify/scripts/bash/load-secrets.sh
```

## 2) Start or Continue Task Execution

PowerShell:

```powershell
./scripts/task-exec.ps1 -JiraKey AC-123 -StatusTarget "In Progress" -Repo auto
```

Bash:

```bash
./scripts/task-exec.sh --jira AC-123 --status "In Progress" --repo auto
```

## 3) Optional: Create/Reuse MR in Same Run

PowerShell:

```powershell
./scripts/task-exec.ps1 -JiraKey AC-123 -SourceBranch "features/ac-123-foo" -TargetBranch "develop"
```

Bash:

```bash
./scripts/task-exec.sh --jira AC-123 --source "features/ac-123-foo" --target "develop"
```

## 4) Dry-Run Mode (No Write Operations)

PowerShell:

```powershell
./scripts/task-exec.ps1 -JiraKey AC-123 -DryRun
```

Bash:

```bash
./scripts/task-exec.sh --jira AC-123 --dry-run
```

## 5) Transition Guidance by Workflow Stage

- Task start: move task to `In Progress`.
- Task implementation completed: move to `In Review`.
- After technical merge: move to `PO Review`.
- After product acceptance: move to `Done`.

Story behavior:

- Story moves to `In Progress` when first child task starts.
- Story moves to `In Review` when all story tasks are complete and story MR (to `test`) is ready.

## 6) Rollback / Revert Path

For release exclusion prior to `main` merge:

```bash
git revert -m 1 <merge-commit-hash>
```

Re-apply in future release by dropping revert commit or re-cherry-picking original change.

## 7) Logs and Audit Trail

- Executors write JSON logs under `logs/task-exec/`.
- Keep logs for traceability: task key, status transition, issue/MR IDs, repo ID, timestamps.

## 8) Failure Policy

- Missing/placeholder credentials: stop immediately.
- Jira/GitLab API auth failure: stop and rotate/recheck token.
- Missing mandatory Jira metadata (`AoC`, `DoD`, `Test Cases`, `Epic`, `Fix Version`): stop and remediate fields.

## 9) Task Completion Documentation

After implementation and before moving final status forward, run the completion documentation prompt:

```text
/speckit.taskclose AC-123
```

Expected outputs:

- Task execution document with timestamps and references.
- Story folder update (or standalone folder update) by GitFlow type.
- Story summary update when all related tasks are complete.
- Postman collection update for API tasks.
- Module README/CHANGELOG updates when module docs exist.

Default path model:

- Story tasks: `docs/work-items/implementation/stories/<STORY-KEY>/tasks/<TASK-KEY>.md`
- Story summary: `docs/work-items/implementation/stories/<STORY-KEY>/story-summary.md`
- Standalone tasks: `docs/work-items/implementation/standalone/<type>/<TASK-KEY>.md`
- Postman collections: `docs/work-items/implementation/**/postman/*.postman_collection.json`
- Module docs: `docs/work-items/implementation/**/module/README.md`, `docs/work-items/implementation/**/module/CHANGELOG.md`

## 10) Commit After Every Change

After each implemented change batch, commit immediately.

Examples:

```bash
git add -A
git commit -m "wip: AC-123 - setup api scaffold"
```

```bash
git add -A
git commit -m "AC-123: update execution docs [wip]"
```

Guideline:

- Keep commits small and traceable to task progress.
- Replace/squash `wip` commits into clean final history before story/sprint promotion according to release policy.

## 11) Start Reviewer Flow After Task Done (Claude)

When implementation is declared done by the team, start review flow:

```text
/speckit.codereview AC-123
```

or with Jira URL:

```text
/speckit.codereview https://nexttoptech.atlassian.net/browse/AC-123
```

Operational behavior:

- Load credentials from `.secrets/credentials.local`.
- Resolve Jira issue and read linked GitLab MR URL from Jira Web Links.
- Run general + .NET-focused review checks.
- Present findings to user one by one for approval.
- Post only approved findings as MR comments (inline preferred).
- Continue review on remaining findings even when some findings are rejected.
