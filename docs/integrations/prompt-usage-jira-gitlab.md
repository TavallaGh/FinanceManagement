# Prompt Usage: Jira to GitLab

Use the prompt `.prompts/02-implementation-phase-prompts/00.speckit.taskstoissues.prompt.md` from Copilot Chat to run the Jira → GitLab workflow.

Use `.prompts/02-implementation-phase-prompts/01.speckit.start-task.prompt.md` to run task-start in documentation-first mode before implementation coding.
Use `.prompts/02-implementation-phase-prompts/04.speckit.taskclose.prompt.md` to finalize task documentation after implementation.

Use `.prompts/00-general-prompts/speckit.codereview.prompt.md` to start reviewer-led code review after the task is declared done.

## What this prompt does

- Reads a Jira task key or Jira link as input
- Updates Jira task status during execution (minimum: move to `In Progress`, then next workflow states as needed)
- Creates or reuses GitLab issue and merge request via token-authenticated API calls
- Reuse-first behavior is mandatory: existing GitLab issue/MR must be reused, and duplicates must not be created
- For each Jira task/subtask, creates/reuses two task MRs:
  - Workspace MR for process/work-item artifacts
  - Project MR for product code changes
- Adds bi-directional links between Jira and GitLab
- Creates/reuses source branch and aligns target branch with Git workflow v1.2
- Checks out and syncs the local source branch


## Task Start Gate (Before Coding)

- Run `/speckit.start-task` whenever a task markdown file is attached for task start.
- In task-start phase, code generation is not allowed.
- Output is markdown-only and depends on task type:
  - Domain Design task output path: `docs/work-items/00.refienment/JiraStory/<PARENT-STORY-KEY>/domain-design/`
  - Non-domain task output path: implementation work-items task folder (task implementation plan markdown)
- Domain Design markdown artifacts must include:
  - `Table`
  - `Property Descriptions` for every property and why it exists
  - `Source Traceability` and source references for each field
- TL approval of generated documentation is a hard gate.
- `/speckit.implement` can start only after TL approval is explicit.

## Jira Kanban behavior (AC board)

- Story lifecycle starts in `Backlog`; selected stories move to board columns.
- `To Do` is the pre-start queue with WIP limit `16` tasks.
- Task start transitions to `In Progress`; story enters `In Progress` when first child task starts.
- Newly created GitLab MRs must start in `Draft` state (both workspace + project task MRs).
- Default MR strategy: enable `Delete source branch` and `Squash commits`.
- Apply default strategy to task MRs to `develop` and direct delivery MRs to `test`, `stage`, or `main`.
- Exception: do not force squash for cherry-pick assembled promotion branches (for example `story/*`) or direct merges between mainline branches.
- Completed implementation transitions to `In Review`.
- On transition to `In Review`, linked GitLab MR must be `Ready` (auto-convert from `Draft`/`WIP` when possible).
- On transition to `In Review`, both linked task MRs (workspace + project) must be `Ready` (auto-convert from `Draft`/`WIP` when possible).
- After technical merge/review transitions to `PO Review`.
- Final product acceptance transitions to `Done`.

## Required Jira metadata (MVP)

All stories and tasks in this phase must include:

- `AoC`
- `DoD`
- `Test Cases`
- `Fix Version` = `V 0.1 (MVP)`
- `Epic`
- Scope labels (at least one of `frontend`, `backend`, `blocked`)

If required metadata is missing, execution must stop with remediation details.

## Operational default

- This workspace uses operational mode for task prompts.
- For each task prompt, the agent must perform Jira + GitLab actions, not only provide guidance.
- Dry-run behavior is allowed only if explicitly requested.

## Prerequisites

- A valid `.secrets/credentials.local` file
- Required values:
  - `JIRA_BASE_URL`
  - `JIRA_EMAIL`
  - `JIRA_API_TOKEN`
  - `JIRA_PROJECT_KEY`
  - `GITLAB_BASE_URL`
  - `GITLAB_TOKEN`

- Preconfigured defaults in this workspace (no token values):
  - Jira project key: `AC`
  - Jira board: `https://nexttoptech.atlassian.net/jira/software/projects/AC/boards/675`
  - GitLab workspace project ID: `79777158`
  - GitLab accounting-project ID: `79777164`
  - GitLab accounting-prototype ID: `79777183`

## Optional setup via bash

Generate template/local files quickly:

```bash
./.specify/scripts/bash/generate-secrets-template.sh
./.specify/scripts/bash/generate-secrets-template.sh --with-local
```

Then load variables:

```bash
source .specify/scripts/bash/load-secrets.sh
```

## How to run

In Copilot Chat, run one of these:

```text
/speckit.taskstoissues AC-2
```

```text
/speckit.taskstoissues https://nexttoptech.atlassian.net/browse/AC-2
```

Task start documentation gate:

```text
/speckit.start-task AC-27
```

```text
/speckit.start-task docs/work-items/01.solution/linked/stories/AC-13/tasks/AC-27.md
```

Task completion documentation:

```text
/speckit.taskclose AC-2
```

Code review start (Claude reviewer):

```text
/speckit.codereview AC-2
```

```text
/speckit.codereview https://nexttoptech.atlassian.net/browse/AC-2
```

## Reviewer-Gated Flow (Claude)

- Trigger: when team declares task implementation done.
- Reviewer role: `Claude` runs review-only flow.
- Source of truth for target MR: Jira task Web Links (`merge_requests/...`).
- Credentials: loaded from `.secrets/credentials.local` (same operational credentials).
- Findings handling:
  - Show findings to user first, one by one.
  - Post only approved findings to GitLab MR comments.
  - Keep showing next findings even if previous findings are rejected.
- Comment placement:
  - Inline MR discussions when file/line can be resolved.
  - Fallback to MR overview discussion when inline position is unavailable.

## Expected output

- Jira task URL
- Jira status after transition
- GitLab issue URL
- Workspace GitLab merge request URL
- Project GitLab merge request URL
- Created source branch name
- Target branch name

## Jira ↔ GitLab linking requirements

- Every story and standalone task must have an equivalent GitLab issue.
- If an equivalent GitLab issue already exists, reuse it; do not create a duplicate.
- Every MR must be linked to its related GitLab issue.
- If workspace/project task MR already exists, reuse it; do not create a duplicate.
- Every Jira task/subtask must include two task MR Web Links: workspace MR + project MR.
- Story task Jira item must include both MR-to-`develop` Web Links (workspace + project).
- Standalone task Jira item must include both MR Web Links to relevant target branch (workspace + project).
- Story Jira item must include story MR-to-`test` Web Link and linked GitLab issue Web Link.
- Every release must have a corresponding GitLab milestone.

## Workflow alignment (v1.2)

- Branch hierarchy: `main ← stage ← test ← develop ← task branches`
- Task branches (`features/*`, `bugs/*`, `technicals/*`) merge to `develop` (squash)
- No direct MR from `develop` to `test`; use `story/*` assembled by cherry-pick
- No direct MR from `test` to `stage`; use `sprint/*`
- `hotfix/*` branches from `main` and merges directly to `main`
- Default MR options are `Squash commits` + `Delete source branch`; exceptions apply for cherry-pick promotion branches and direct mainline-to-mainline merges.

## Completion Documentation Structure

- Story task record: `docs/work-items/implementation/stories/<STORY-KEY>/tasks/<TASK-KEY>.md`
- Story summary: `docs/work-items/implementation/stories/<STORY-KEY>/story-summary.md`
- Standalone task record: `docs/work-items/implementation/standalone/<type>/<TASK-KEY>.md`
- API collections: `docs/work-items/implementation/**/postman/*.postman_collection.json`
- Module docs (when available): `docs/work-items/implementation/**/module/README.md`, `docs/work-items/implementation/**/module/CHANGELOG.md`

Required task record details include start/end datetime, Jira metadata, branch/MR references, and audit-friendly links.

## Commit Convention During Task Execution

- After each logical change, create a commit.
- Use `wip` in early/incremental commit messages.
- Preferred formats:
  - `wip: AC-123 - <summary>`
  - `AC-123: <summary> [wip]`
- Before story/sprint promotion, clean history according to team policy (squash/reword as needed).
