# Work Items Documentation

This tree organizes delivery artifacts by phase so teams can navigate Refienment through completion in one place.

## Tree View

```text
docs/work-items/
  Refienment/
    independent/
      <Refienment-KEY>.md
    linked/
      stories/<STORY-KEY>/REFIENMENT.md
      tasks/<TASK-KEY>/REFIENMENT.md
    templates/
      REFIENMENT-standalone.template.md
      REFIENMENT-linked-story.template.md
      REFIENMENT-linked-task.template.md
  solution/
    independent/
      <SOLUTION-KEY>.md
    linked/
      stories/<STORY-KEY>/solution.md
      tasks/<TASK-KEY>/solution.md
    templates/
      solution-standalone.template.md
      solution-linked-story.template.md
      solution-linked-task.template.md
  implementation/
    stories/<STORY-KEY>/tasks/<TASK-KEY>-implementation-plan.md
    stories/<STORY-KEY>/tasks/<TASK-KEY>-taskclose.md
    stories/<STORY-KEY>/story-summary.md
    stories/<STORY-KEY>/postman/<STORY-KEY>.postman_collection.json
    standalone/<type>/<TASK-KEY>-implementation-plan.md
    templates/
      task-record.template.md
      story-summary.template.md
      module-readme.template.md
      module-changelog.template.md
  completion/
    linked/
      stories/<STORY-KEY>/completion.md
      tasks/<TASK-KEY>/completion.md
    standalone/
      <TYPE>/<TASK-KEY>-completion.md
    templates/
      completion-story-closeout.template.md
      completion-linked-task.template.md
      completion-standalone.template.md
```

## Usage Rules

- `independent/` is for Refienment or solution work not tied to Jira story/task yet.
- `linked/` is for artifacts attached to an existing story/task.
- `implementation/` is the execution evidence area for engineering work items.
- `completion/` captures implementation-done sign-off and handoff details.

## Phase Input Policy

- Refienment phase must ingest product documentation and requirement briefs as primary input.
- Solution phase must ingest solution meeting notes and spike outputs as primary input.
- Implementation phase must ingest approved task/story execution context and produce delivery evidence.
- Completion phase must ingest final implementation outcome and produce closeout/sign-off artifacts.

## Jira Task Operational Policy

When a Jira task is provided for execution:

1. Resolve and validate the Jira task from key or URL.
2. Extract required metadata and linked artifacts (story, workspace issue/MR, project issue/MR, branch, status).
3. Execute operational workflow end to end (Jira transition + GitLab actions) according to workspace policy.
4. Write documentation to phase-correct locations under `docs/work-items/`.
5. Use AI-friendly English structure for generated work-item records.
6. Use Jira/GitLab endpoints from `.secrets/credentials.template` and runtime `.secrets/credentials.local` values.

Recommended output paths for Jira-triggered execution:

- Refienment linked task: `docs/work-items/REFIENMENT/linked/tasks/<TASK-KEY>/REFIENMENT.md`
- Solution linked task: `docs/work-items/solution/linked/tasks/<TASK-KEY>/solution.md`
- Implementation record: `docs/work-items/implementation/standalone/<type>/<TASK-KEY>-implementation-plan.md` or story task path
- Task close record: `docs/work-items/implementation/stories/<STORY-KEY>/tasks/<TASK-KEY>-taskclose.md`
- Completion record: `docs/work-items/completion/linked/tasks/<TASK-KEY>/completion.md`
