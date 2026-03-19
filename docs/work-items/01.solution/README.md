# Solution Documentation

Use this phase to design executable, story-aligned tasks from approved REFIENMENT output.

## Primary Goal

- Convert REFIENMENT clarity into implementable task packages.
- Generate task documents in AI Agentic standard format.

## Solution Phase Rules

- Tasks in this phase are aggregated delivery tasks (not ultra-micro technical steps).
- Every created task must contain complete:
  - Description
  - AoC (Acceptance of Completion)
  - Goal Of Task
  - What Problem This Task Should Solve
- Tasks are created and processed in this phase.
- After review/approval, tasks are imported to Jira.
- If tasks belong to one parent story, they must be created as Jira subtasks under that parent story.
- Each task must keep its detailed documentation in its own markdown file.

## Standard Output Model (Recommended)

Based on current best practice for traceability and AI execution:

1. Keep one story-level aggregated plan file.
2. Keep one markdown file per task for execution details.

This gives both:

- Management view (single plan overview)
- Execution clarity (per-task detail and ownership)

## Paths

- Independent solution: `docs/work-items/01.solution/independent/<SOLUTION-KEY>.md`
- Story-linked solution: `docs/work-items/01.solution/linked/stories/<STORY-KEY>/solution.md`
- Task-linked solution: `docs/work-items/01.solution/linked/tasks/<TASK-KEY>/solution.md`
- Story task plan (aggregated): `docs/work-items/01.solution/linked/stories/<STORY-KEY>/task-plan.md`
- Story task details (per task): `docs/work-items/01.solution/linked/stories/<STORY-KEY>/tasks/<TASK-KEY>.md`

## Templates

- `docs/work-items/01.solution/templates/solution-standalone.template.md`
- `docs/work-items/01.solution/templates/solution-linked-story.template.md`
- `docs/work-items/01.solution/templates/solution-linked-task.template.md`
- `docs/work-items/01.solution/templates/solution-story-task-plan.template.md`
- `docs/work-items/01.solution/templates/solution-agentic-task.template.md`

## Prompt Guide

- Bilingual SpecKit prompt catalog (FA/EN): `SPECKIT-PROMPTS-FA-EN.md`
