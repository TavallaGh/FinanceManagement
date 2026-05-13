# Accounting Workspace Constitution

## Core Principles

### 1) Jira-First Execution
- Work starts from a Jira task key or Jira issue link.
- For each task-oriented prompt execution, Jira status must be actively updated by the agent.
- Transition selection prefers id `21` when available; otherwise use the transition that moves to `In Progress`.
- Task lifecycle updates should continue beyond start state when workflow context requires it (for example: QA handoff, completion markers).

Jira Kanban status policy (AC board):

- `Backlog`: all stories are created in backlog first; only stories selected for execution are moved to board columns.
- `To Do`: work item is queued but not started. This column has WIP limit `16` tasks.
- `In Progress`: task enters on start; story enters when first child task starts.
- `In Review`: after task/story implementation is complete and awaiting merge/code review.
- `PO Review`: after technical merge/review, product owner reviews integrated story outcome.
- `Done`: final accepted state after PO confirmation.

Lifecycle constraints:

- When all tasks of a story are complete, story-level MR (assembled by cherry-pick) must be taken out of draft and moved to review.
- `PO Review` must evaluate story-level integrated behavior, not isolated task-by-task acceptance.
- Default MR options are `Squash commits` and `Delete source branch` for task and direct delivery merges.
- Exceptions to forced squash: cherry-pick assembled promotion branches and direct merges between mainline branches.

### 2) Branch Hierarchy and Naming
- Branch hierarchy is fixed: `main ← stage ← test ← develop ← task branches`.
- Task branches under `develop` are `features/*`, `bugs/*`, `technicals/*`.
- Promotion to `test` uses dedicated `story/*` branches assembled by cherry-pick from `develop`.
- Promotion to `stage` uses dedicated `sprint/*` branches.
- Hotfixes use `hotfix/*` and branch directly from `main`.

### 3) GitFlow-Aligned Target Branches
- Each branch syncs only with its direct child.
- Sync commands:
	- `main` → `stage` and active hotfixes via `git rebase --rebase-merges origin/main`
	- `stage` → `test` and stage-specific `bugs/*|technicals/*` via `git rebase --rebase-merges origin/stage`
	- `test` → `develop` and test-specific `bugs/*|technicals/*` via plain `git rebase origin/test`
	- `develop` → active task branches via plain `git rebase origin/develop`
- No direct MR from `develop` to `test`.
- No direct MR from `test` to `stage`.

### 4) Bi-Directional Traceability Is Mandatory
- Jira link must be present in GitLab issue and MR descriptions.
- GitLab issue and MR links must be added to Jira as Web Links via `/remotelink`.
- GitLab issue and MR should reference each other in descriptions.
- Each task prompt must produce a concise execution summary with Jira status, issue/MR links, source branch, and target branch.

Artifact linking rules:

- Every story and every standalone task (not under a story) must have an equivalent GitLab issue.
- Every MR must be linked to its GitLab issue.
- For story tasks: add task MR link to `develop` as Jira Web Link.
- For standalone tasks: add MR link to the relevant target branch as Jira Web Link.
- For stories: add story MR link to `test` and linked GitLab issue URL as Jira Web Links.

### 5) Secrets and Safety by Default
- Secrets are loaded from local `.secrets/credentials.local` via loader scripts.
- Never print raw tokens or credentials in logs/output.
- Never create or update resources outside configured Jira/GitLab project scope.
- If Jira task is inaccessible, stop and return exact API error context.
- GitLab operations must use token-authenticated API requests from loaded environment variables.

MVP issue metadata policy:

- All stories and tasks are in MVP scope and must use Fix Version: `V 0.1 (MVP)`.
- Every story/task must include: `AoC`, `DoD`, `Test Cases`, `Fix Version`, `Epic`, and relevant labels.
- Labels must include domain tags such as `frontend`, `backend`, `blocked` (plus additional scope labels as needed).
- For each release, create and maintain a corresponding GitLab milestone.

## Environment and Tooling Constraints

- Workspace is Windows-first, with PowerShell as primary automation shell.
- `.specify/scripts/powershell/load-secrets.ps1` and `.specify/scripts/bash/load-secrets.sh` are the supported secret loaders.
- Jira API usage should prefer supported endpoints (for example `/rest/api/3/search/jql` for search).
- GitLab API usage is based on `/api/v4` with token authentication.
- Agent execution mode is operational (not advisory) for task prompts: update Jira and perform required GitLab operations unless explicitly told to run dry-run mode.

## Workflow Artifacts

- Canonical process docs:
	- `docs/workflows/git-workflow-flows.md`
	- `docs/workflows/specify-codex-flow.md`
	- `docs/workflows/specify-memory-flow.md`
	- `docs/workflows/specify-branching-template.md`
	- `docs/integrations/jira-gitlab-secrets-integration.md`
- Prompt contract:
	- `.prompts/02-implementation-phase-prompts/00.speckit.taskstoissues.prompt.md`

## Governance

- This constitution is the authoritative memory baseline for prompt-driven Jira→GitLab execution in this workspace.
- Any workflow rule change (naming, target branches, linking, transition behavior, safety limits) must update:
	- this constitution,
	- related docs under `docs/`,
	- and prompt instructions under `.prompts/` when applicable.
- Priority order for conflicts:
	1. Explicit user instruction in active task
	2. This constitution
	3. Ancillary documentation

**Version**: 1.2.0 | **Ratified**: 2026-02-25 | **Last Amended**: 2026-03-05
