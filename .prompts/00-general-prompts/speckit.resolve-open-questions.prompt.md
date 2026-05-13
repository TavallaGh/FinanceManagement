---
description: Resolve refinement open questions from structured Q/A input and synchronize dependent sections (risks, readiness, and checklist gates).
---

# /speckit.resolve-open-questions

## User Input

```text
$ARGUMENTS
```

You MUST consider the user input before proceeding (if not empty).

### Reusable Script Policy (Mandatory)

- Use reusable scripts in scripts/.
- Do NOT create ad-hoc/new scripts for this command.
- Reuse scripts/task-exec.ps1 or scripts/task-exec.sh for Jira/GitLab operational flow when applicable.
- Reuse scripts/create-jira-subtask.ps1 for Jira task/subtask create-update operations when applicable.
- Credentials must be loaded from .secrets/credentials.local.

## Purpose

Apply explicit answers to the Open Questions section in a story refinement document and propagate those decisions to all dependent refinement artifacts.

This prompt is general and works for any story key.

## Expected Input Format

Input must include a story key or Jira URL on the first line (example: AC-12), then one or more answer lines.

Use either format per line: Q1: [answer] or OQ-01: [answer].

Example:

```text
AC-12
Q1: AD login is out of MVP scope.
Q2: OTP TTL comes from runtime config.
Q4: Use dbo.User from AC-13; no schema changes in AC-12.
```

## Execution Steps

1. Parse and normalize input. Extract STORY_KEY from the first line. Parse answer lines and normalize IDs so Q1 equals OQ-01, Q2 equals OQ-02, and so on. If no valid answers are provided, stop with a remediation message.

1. Load refinement standards before editing. Read docs/work-items/00.refinement/README.md, docs/work-items/00.refinement/templates/refienment-story-standard.template.md, and docs/work-items/00.refinement/templates/refienment-linked-story.template.md.

1. Resolve target files for STORY_KEY. Use the first existing refinement file from these candidates: docs/work-items/00.refinement/linked/stories/{STORY_KEY}/refinement.md, docs/work-items/00.refinement/linked/stories/{STORY_KEY}/refienment.md, docs/work-items/00.refinement/JiraStory/{STORY_KEY}/refinement.md, docs/work-items/00.refinement/JiraStory/{STORY_KEY}/refienment.md. Use the first existing checklist file from these candidates: docs/work-items/00.refinement/linked/stories/{STORY_KEY}/checklists/requirements-checklist.md, docs/work-items/00.refinement/JiraStory/{STORY_KEY}/checklists/requirements-checklist.md. If the refinement file is missing, stop and ask the user to run /speckit.refine {STORY_KEY} first.

1. Update Open Questions in the refinement file. Locate the section heading matching 11. Open Questions or Open Questions. For each provided answer, find the matching OQ item and upsert this line under it: Answer (YYYY-MM-DD): [final answer]. Replace older answer lines instead of duplicating conflicting answers. Preserve question text and decision owner.

1. Synchronize Risks and Unknowns. Locate section 10. Risks and Unknowns. For risks tied to answered OQs, update status to resolved when appropriate, remove contradictions, and keep mitigation text consistent with new decisions.

1. Synchronize REFIENMENT Conclusion readiness. Locate section 12. REFIENMENT Conclusion. Recompute readiness from unresolved blocking OQs. If all blocking OQs are answered, set Ready for Solution to YES and refresh resolved conditions. If blocking OQs remain, set Ready for Solution to NO and list unresolved blocking OQ IDs as conditions.

1. Synchronize requirements checklist. If a checklist exists, update Open Questions Resolved so answered OQs are marked [x] and unanswered OQs remain unchecked. Update Notes so the blocking statement reflects current unresolved blocking OQs. If the section is missing, create it from refinement Open Questions.

1. Validate consistency. Ensure each provided answer appears in Open Questions, no contradiction remains across Open Questions, Risks, and Conclusion, and checklist status matches refinement answers. Preserve section order and heading structure.

1. Output summary. Return story key processed, refinement path updated, checklist path updated (or missing), answered OQ IDs, remaining unresolved blocking OQ IDs, and final Ready for Solution value.

## Hard Rules

- Do not create Jira tasks or implementation tasks in this command.
- Do not change unrelated sections or files.
- Do not leave duplicate conflicting answers for the same OQ.
- If a referenced question ID does not exist, add a clearly labeled placeholder OQ entry under Open Questions before applying its answer.
