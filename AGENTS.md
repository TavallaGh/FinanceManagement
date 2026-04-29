# AGENTS Contract (Operational)

This workspace runs agents in **operational mode** for task-oriented prompts.

## Scope

- Applies to task prompts and Jira/GitLab automation.
- Canonical behavior source:
   - `docs/workflows/git-workflow-flows.md`
   - `docs/workflows/specify-codex-flow.md`
  - `.specify/memory/constitution.md`
  - `.codex/prompts/speckit.taskstoissues.md`
   - `.claude/commands/speckit.codereview.md`

## Mandatory Runtime Rules

1. Load credentials from `.secrets/credentials.local`.
2. Fail fast on missing or placeholder credentials.
3. Update Jira status according to AC board flow:
   - `Backlog` → `To Do` → `In Progress` → `In Review` → `PO Review` → `Done`
   - `To Do` WIP limit is `16` tasks.
4. Enforce MVP metadata for story/task:
   - `AoC`, `DoD`, `Test Cases`, `Epic`, `Fix Version`, labels
   - Fix Version must be `V 0.1 (MVP)`.
5. Enforce traceability:
   - if GitLab issue already exists for the Jira task context, reuse it and do not create a duplicate issue
   - if task MR already exists (workspace or project), reuse it and do not create a duplicate MR
   - for subtasks: create GitLab issue from the Jira task first, then create MR from that task
   - for subtasks: derive GitLab issue from the Jira parent task key/title, and include both parent/task Jira links in the GitLab issue description
   - for subtasks: derive GitLab MR title from subtask key/summary, and include both parent/task Jira links in the MR description
   - for every Jira task/subtask in GitFlow: create TWO task MRs, one in workspace repository and one in project repository
   - workspace MR scope: workspace/process/task-log artifacts (for example implementation logs under `docs/work-items/**`)
   - project MR scope: product code changes
   - GitLab issue for each story and standalone task
   - MR linked to GitLab issue
   - Jira Web Links for issue/MR as defined in workflow docs, including both workspace MR and project MR URLs
   - when creating an MR, it must start as `Draft`
   - default MR strategy: enable `Delete source branch` and `Squash commits` for task and delivery MRs (including merges to `develop`, and direct delivery merges to `test|stage|main`)
   - exception: do not force squash for cherry-pick assembled promotion branches (for example `story/*`) or direct merges between mainline branches
   - when Jira task transitions to `In Review`, related MR must be `Ready` (not `Draft`)
6. Enforce Git flow guardrails:
   - no direct MR `develop -> test`
   - no direct MR `test -> stage`
   - story promotion via `story/*`, stage promotion via `sprint/*`
7. Enforce reviewer gate after implementation done:
   - reviewer agent is `Claude` (review-only role)
   - review target MR must be resolved from Jira Web Links
   - findings must be shown to user first and posted to MR only after per-finding approval

## Security Rules

- Never print raw tokens.
- Never operate outside configured Jira/GitLab scope.
- Stop on API authorization failures and return remediation hints.

## Execution Entry Points

- PowerShell: `scripts/task-exec.ps1`
- Bash: `scripts/task-exec.sh`

## Required Inputs Still Needed (Org-Specific IDs)

Provide these values in `.secrets/credentials.local` for full deterministic behavior:

- Jira transition IDs for all statuses (`To Do`, `In Progress`, `In Review`, `PO Review`, `Done`)
- Jira custom field IDs for `AoC`, `DoD`, `Test Cases`, `Epic`
