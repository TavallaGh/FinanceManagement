---
description: Finalize a task by documenting execution details, references, API collection updates, and story-level rollup artifacts.
---

# User Input

```text
$ARGUMENTS
```

## Purpose

Close the documentation loop for a completed task in a GitFlow-aligned structure.

## Required Behavior

1. Parse `$ARGUMENTS` as Jira task key or Jira URL.
2. Load credentials from `.secrets/credentials.local`.
3. Fetch Jira task details and detect whether task is linked to a story.
4. Collect execution references:
   - branch name and target branch
   - related GitLab issue URL
   - workspace GitLab MR URL
   - project GitLab MR URL
   - commit list (if available)
   - current Jira status and timestamps
5. Write/update task documentation file using path policy:
   - Story task: `docs/work-items/implementation/stories/<STORY-KEY>/tasks/<TASK-KEY>.md`
   - Standalone task: `docs/work-items/implementation/standalone/<type>/<TASK-KEY>.md`
6. Include mandatory fields in task doc:
   - Start datetime
   - End datetime
   - Jira metadata and links
   - GitLab issue metadata and both MR links (workspace + project)
   - branch strategy details
   - checklist of delivered changes
   - rollback and risk notes
7. If the task has API changes:
   - update or create Postman collection at `docs/work-items/implementation/**/postman/*.postman_collection.json`
   - document endpoints added/changed/removed in task doc
8. If all tasks for a story are completed, update/create story rollup:
   - `docs/work-items/implementation/stories/<STORY-KEY>/story-summary.md`
9. If module docs exist in that execution folder, update:
   - `module/README.md`
   - `module/CHANGELOG.md`
10. Add Jira comment summarizing generated documentation paths.
11. Create a git commit for the completed change batch.
12. Commit message must include `wip` prefix or suffix unless user explicitly requests final clean commit.

Suggested commit message patterns:

- `wip: <TASK-KEY> - <short summary>`
- `<TASK-KEY>: <short summary> [wip]`

## Safety Rules

- Never print raw credentials/tokens.
- Stop if required Jira/GitLab data is inaccessible.
- Keep MR state unchanged unless explicitly requested.

## Output Summary

Return:

- Jira task URL
- Task documentation file path
- Story summary path (if updated)
- Postman collection path (if updated)
- Module README/CHANGELOG paths (if updated)
