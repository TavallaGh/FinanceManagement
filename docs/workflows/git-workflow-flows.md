# Git Workflow Documentation — Next Top Tech

Version: 1.2  
Last Updated: Nov 18, 2025

## Introduction

This document defines the Git workflow structure and processes for the Next Top Tech development team. The goals are:

- Maintain a hierarchical, transparent, and controllable Git history.
- Ensure each layer syncs only with its direct child.
- Keep every work unit (`task → story → sprint → release`) traceable.
- Preserve flexibility to exclude incomplete features before production release.

## Branch Structure & Sync Flow

```text
main
 ├── hotfix/...                ← Hotfix branches (branched from main)
 └── stage
      ├── bugs/...             ← Stage-specific bug fixes
      ├── technicals/...       ← Stage-specific technical tasks
      └── test
           ├── bugs/...        ← Test-specific bug fixes
           ├── technicals/...  ← Test-specific technical tasks
           └── develop
                ├── features/...
                ├── bugs/...
                └── technicals/...
```

Notes:

- `hotfix/` branches always start from `main`.
- `bugs/` and `technicals/` may start from `stage` or `test`, based on where the issue was discovered.

## Golden Rule of Synchronization

Each branch syncs only with its direct child.

| After Updating Branch | Branches to Sync | Sync Command |
|---|---|---|
| `main` | `stage` and active `hotfixes` | `git rebase --rebase-merges origin/main` |
| `stage` | `test` + stage-specific `bugs/technicals` | `git rebase --rebase-merges origin/stage` |
| `test` | `develop` + test-specific `bugs/technicals` | `git rebase origin/test` |
| `develop` | active task branches | `git rebase origin/develop` |

Key clarification:

- When syncing `test` with `develop` or test-specific task branches, use plain `git rebase` (not `--rebase-merges`) because history at this level is linear.

## Merge Request Strategy

Default MR options:

- Enable `Squash commits`.
- Enable `Delete source branch`.

Default strategy applies to:

- Task MRs to `develop` (both workspace and project task MRs).
- Direct delivery MRs to `test`, `stage`, or `main`.

Exceptions (no forced squash):

- Cherry-pick assembled promotion branches (for example `story/*`).
- Direct merges between mainline branches when explicitly required by release/sync policy.

## Git History Hierarchy in `main`

```text
● ← Release v1.5.0 - 2025-10-30
│\
│ ● ← Sprint 24
│ |\
│ │ ● ← [JIRA-120] - Fix payment bug
│ │ |\
│ │ │ ● [JIRA-120-1] - Backend fix
│ │ │ ● [JIRA-120-2] - Frontend update
│ │
│ ● ← [JIRA-888] - Stage-only config fix
│
● ← [JIRA-999] - Hotfix: Critical auth bypass
│
● ← Release v1.4.0 - 2025-10-16
```

Hotfixes are merged directly into `main` and appear as independent patch-level releases.

## Roles & Responsibilities

| Role | Responsibilities |
|---|---|
| Technical Lead (TL) | Create story/sprint branches, cherry-pick commits for MRs to `test`, use `rebase -i --rebase-merges` to prepare sprints, coordinate synchronization across layers |
| Chapter Lead (CL) | Approve MRs to `stage` and `main`, make final release decisions, approve temporary reverts/re-applies |
| QC Team | Provide advisory QA reviews upon request from TL/CL (no direct merge rights) |
| DevOps | Deploy `stage` automatically after every merge; deploy `main` only after CL approval |

## Key Workflows

### 1) Developing a Task (in `develop`)

- Each task is developed in an isolated branch (`features/...`, `bugs/...`, `technicals/...`).
- For each Jira task/subtask, open two task MRs:
  - Workspace MR for process/work-item artifacts (for example `docs/work-items/**`).
  - Project MR for product code changes.
- MR to `develop` uses squash and enables source-branch deletion.
- Sync command: `git rebase origin/develop`.

### 2) Completing a Story / Bug / Technical Task (to `test`)

- No direct MR from `develop` to `test`.
- TL creates story branch from `test`.
- TL cherry-picks relevant commits from `develop`.
- MR from story branch to `test` is created as draft, with no squash.
- After merge, DevOps deploys `test`; QA validates.
- If QA fails, create a new bug ticket (no revert at this stage).

### 3) Preparing a Sprint (to `stage`)

- No direct MR from `test` to `stage`.
- TL rebases interactively on `test` to prioritize approved stories.
- TL creates `sprint/*`, trims to approved scope, then opens MR to `stage`.

### 4) Releasing to `main` & Handling Temporary Reverts

- MR is created from sprint branch to `main`.
- To temporarily exclude features before release, revert specific merge commits:
  - `git revert -m 1 <merge-commit-hash>`
- Reverts can be re-applied in future releases by dropping revert commits or re-cherry-picking original changes.

### 5) Hotfix Workflow

- Branch from `main`: `git checkout -b hotfix/JIRA-XYZ-short-title main`
- MR directly to `main` with default MR options unless an exception applies.
- After merge, sync cascades downward: `stage ← main`, `test ← stage`, `develop ← test`.

## Rebase Guide

| Command | Use Case |
|---|---|
| `git rebase <branch>` | Sync `develop` with `test`; sync task branches with `develop` |
| `git rebase --rebase-merges <branch>` | Sync `test` with `stage`; sync `stage` with `main` |
| `git rebase -i --rebase-merges <branch>` | Prepare sprints (reorder/omit stories) |

## When to Use Cherry-Pick

Use cherry-pick only for assembling scattered commits of one story from `develop` into a clean MR branch targeting `test`.

- Allowed example:
  - `git checkout -b story/JIRA-120`
  - `git cherry-pick abc123 def456`
- Not for hotfixes, stage-specific fixes, or general syncing.

## Golden Principles Summary

- No direct MRs between main layers; always use the defined intermediate branches (`story/*`, `sprint/*`).
- Cherry-pick is only for story assembly from `develop`.
- Use `rebase -i --rebase-merges` for sprint preparation and content control.
- Temporary reverts are allowed and can be re-applied later.
- `main` history must stay readable, hierarchical, and auditable.

## Jira Kanban State Policy (AC Board)

This workflow is bound to the Jira board lifecycle below:

1. `Backlog`
  - All stories start in backlog.
  - Stories planned for execution are moved from backlog to board columns.
2. `To Do`
  - Initial queued state for non-started tasks.
  - WIP limit: maximum `16` tasks.
3. `In Progress`
  - Task enters when work starts.
  - Story enters as soon as the first child task starts.
  - Task MRs to `develop` (workspace + project) move from draft to ready once implementation is complete.
  - When all story tasks are complete, story MR (cherry-picked branch to `test`) also moves from draft to ready.
4. `In Review`
  - Task/story waits for technical review and merge.
5. `PO Review`
  - Product review occurs at integrated story level (not isolated task-level review).
6. `Done`
  - Final acceptance after PO confirmation.

## Mandatory Jira/GitLab Metadata and Links

For all stories and tasks in MVP:

- Fix Version must be `V 0.1 (MVP)`.
- Required Jira fields: `AoC`, `DoD`, `Test Cases`, `Fix Version`, `Epic`, and relevant labels.
- Recommended labels include at least one of: `frontend`, `backend`, `blocked`.

Traceability requirements:

- For Jira subtasks: create the GitLab issue from the Jira task first, then create the MR from that task.
- For Jira subtasks: derive the GitLab issue from parent Jira key/title and include both parent/subtask Jira links in the GitLab issue description.
- For Jira subtasks: derive the GitLab MR title from subtask key/summary and include both parent/subtask Jira links in MR description.
- For every Jira task/subtask: create two task MRs, one in workspace repo and one in project repo.
- Workspace MR scope is workspace/process/task-log artifacts; project MR scope is product code.
- Every story and every standalone task must have an equivalent GitLab issue.
- Every MR must be linked to its related GitLab issue.
- Story task Jira items must include Web Links to both task MRs targeting `develop` (workspace + project).
- Standalone task Jira items must include Web Links to both task MRs targeting the relevant branch (workspace + project).
- Story Jira items must include Web Links to story MR targeting `test` and to related GitLab issue.
- Every release must have a matching GitLab milestone.
