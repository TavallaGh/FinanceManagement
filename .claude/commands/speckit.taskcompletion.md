---
title: "speckit.taskcompletion.claude"
description: "(Claude) Create or update completion markdown for a story or task. Places the task completion file inside the parent story folder under `docs/work-items/03.completation/linked/stories/<STORY>/tasks/<TASK>/completion.md`. Use task template when input is a task id; otherwise use story template."
tags:
  - claude
  - task
  - completion
inputs:
  - name: reference_id
    description: "Jira reference id (e.g., AC-28 or AC-28-01)."
    required: true
  - name: parent_story
    description: "If `reference_id` is a task and parent story cannot be inferred, provide parent story id (e.g., AC-13)."
    required: false
  - name: details
    description: "Detailed changes, tests, AoC, notes — freeform text or structured JSON"
    required: false
---

Instruction to the agent when invoked:

1. Detect if `reference_id` is a task id (contains a second hyphen part or matches task pattern). If so, determine `PARENT_STORY` (from input or infer by pattern). If missing, ask user: "What's the parent story for {reference_id}?"

2. Generate the completion markdown using the Task template below and populate fields from `details`. Save content to:
   `docs/work-items/03.completation/linked/stories/{PARENT_STORY}/tasks/{TASK_ID}/completion.md`

3. If `reference_id` is a story id, generate story-level completion and save to:
   `docs/work-items/03.completation/linked/stories/{STORY_ID}/completion.md`

Task template (use when reference is task id):

```
# {TASK_ID} — Task Completion

## Summary

- **Task:** {TASK_ID}
- **Related Story:** {STORY_ID}
- **Title:** {TITLE}
- **Status:** Completed — ready for review

## Description

- {SUMMARY}

## Acceptance Criteria

- {LIST_AOC}

## Implementation Notes

- Files changed and rationale:
  - {CHANGES}

## Tests

- Automated tests: {TESTS}
- Manual verification steps:
  1. ...

## Traceability

- Jira: https://nexttoptech.atlassian.net/browse/{STORY_ID}
- Workspace MR: {WORKSPACE_MR}
- Project MR: {PROJECT_MR}

## Source Files

- {CHANGES}

## Sign-off

- Developer:
- Reviewer:
```

Story template (use when reference is story id):

```
# {STORY_ID} — Completion Report

## Summary

- **Story:** {STORY_ID}
- **Title:** {TITLE}
- **Status:** Completed — ready for review

## What Was Delivered

- {SUMMARY}

## Acceptance Criteria (AoC)

- {LIST_AOC}

## Verification Steps

- Automated tests and manual verification steps

## Traceability

- Jira: https://nexttoptech.atlassian.net/browse/{STORY_ID}
- Workspace MR: {WORKSPACE_MR}
- Project MR: {PROJECT_MR}

## Source Files / Links

- {CHANGES}

## Lessons Learned / Notes

- ...

## Sign-off

- Developer:
- Reviewer:
- PO:
```

Additional rules:
- If `reference_id` originates from a task-level reference (e.g., user supplied task id), ensure final saved path is under the parent story folder.
- If MRs are provided in `details`, add them to `Traceability` and include Jira link(s).
