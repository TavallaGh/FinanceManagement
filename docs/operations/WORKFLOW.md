# WORKFLOW (Canonical Summary)

This is the short canonical flow for daily execution.

## Branch Hierarchy

`main <- stage <- test <- develop <- task branches`

- Task branches under `develop`: `features/*`, `bugs/*`, `technicals/*`
- Story promotion branch: `story/*` (to `test`)
- Sprint promotion branch: `sprint/*` (to `stage`)
- Hotfix branch: `hotfix/*` from `main`, MR to `main`

## Synchronization Rule

Each branch syncs only with its direct child:

- `main` sync chain: `git rebase --rebase-merges origin/main`
- `stage` sync chain: `git rebase --rebase-merges origin/stage`
- `test` downwards: `git rebase origin/test`
- `develop` to tasks: `git rebase origin/develop`

## Jira Board Flow (AC)

1. `Backlog`
2. `To Do` (WIP limit 16 tasks)
3. `In Progress`
4. `In Review`
5. `PO Review`
6. `Done`

Rules:

- Story enters `In Progress` when first child task starts.
- When creating a GitLab MR, it must start in `Draft` state.
- For every Jira task/subtask, create two task MRs: one in `workspace` repo (docs/work-items/process artifacts) and one in `project` repo (code changes).
- Default MR strategy: enable `Delete source branch` and `Squash commits`.
- Apply default strategy to task MRs to `develop` and direct delivery MRs to `test`, `stage`, or `main`.
- Exception: do not force squash when MR source branch is cherry-pick assembled from another mainline branch (for example `story/*`) or when merging directly between mainline branches.
- When moving a task to `In Review`, its GitLab MR must be in `Ready` state (not `Draft`/`WIP`).
- When moving a task to `In Review`, both task MRs (workspace + project) must be in `Ready` state (not `Draft`/`WIP`).
- PO evaluates integrated story behavior, not isolated per-task acceptance.

## MVP Governance

- All stories/tasks use Fix Version: `V 0.1 (MVP)`.
- Required Jira fields: `AoC`, `DoD`, `Test Cases`, `Epic`, `Fix Version`, labels.
- Labels include at least one domain label: `frontend`, `backend`, `blocked`.

## Traceability

- Every story and standalone task has a GitLab issue counterpart.
- Every task has two MRs: workspace MR + project MR.
- Every MR is linked to its GitLab issue.
- Jira Web Links include related GitLab issue URLs and both MR URLs (workspace + project).
- Releases require GitLab milestones.

## Task Completion Documentation (Mandatory)

After each task is completed, a task completion prompt must create/update execution docs under:

- `docs/work-items/implementation/stories/<JIRA-STORY-KEY>/tasks/<JIRA-TASK-KEY>.md` for story tasks
- `docs/work-items/implementation/standalone/<type>/<JIRA-TASK-KEY>.md` for standalone tasks (`bugs`, `technicals`, `hotfix`, `features`)

When all tasks of a story are complete, create/update:

- `docs/work-items/implementation/stories/<JIRA-STORY-KEY>/story-summary.md`

Required fields in task records:

- Start datetime and end datetime
- Jira task info (key, URL, status, labels, fix version)
- Git branch info (source/target)
- Workspace GitLab issue + MR info (URL, iid, state)
- Project GitLab issue + MR info (URL, iid, state)
- Reference notes (commits, review remarks, blockers)

API tasks must also update Postman collection structure under story/standalone folder.

Module-level docs should be updated when available:

- `README.md` (module scope)
- `CHANGELOG.md` (module scope)

Developer and user guides are maintained under `docs/guides/`.

## Code Review Gate (Claude Reviewer)

- After implementer declares task `Done` (implementation done), run reviewer flow:
	- `.claude/commands/speckit.codereview.md`
- Reviewer source of truth is Jira task link and its GitLab MR Web Link.
- Reviewer source of truth is Jira task link and Jira Web Links for both task MRs; project MR is the primary code-review target.
- Reviewer must assess general quality with .NET-oriented checks.
- Findings are approval-gated:
	- show to user first,
	- post only user-approved findings to GitLab MR,
	- continue with remaining findings regardless of prior rejection.
- Reviewer role is separated from implementer role (review-only in this flow).

## Runtime

- Use `scripts/task-exec.ps1` or `scripts/task-exec.sh` for deterministic execution.

## Commit Discipline (Mandatory)

- After each logical change set, create a commit immediately.
- Use `wip` marker in early/incremental commits.
- Preferred commit message formats:
	- Prefix: `wip: <area> - <short summary>`
	- Suffix: `<area>: <short summary> [wip]`
- Before final merge/review completion, squash or follow-up with clean non-`wip` commit messages per team policy.
