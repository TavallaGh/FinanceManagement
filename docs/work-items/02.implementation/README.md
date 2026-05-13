# Implementation Documentation Structure

This folder stores traceable delivery records for completed tasks and stories.

## Folder Layout

```text
docs/work-items/02.implementation/
  stories/
    <STORY-KEY>/
      tasks/
        <TASK-KEY>-implementation-plan.md
        <TASK-KEY>-taskclose.md
      story-summary.md
      postman/
        <STORY-KEY>.postman_collection.json
      module/
        README.md
        CHANGELOG.md
  standalone/
    bugs/
      <TASK-KEY>-implementation-plan.md
    technicals/
      <TASK-KEY>-implementation-plan.md
    hotfix/
      <TASK-KEY>-implementation-plan.md
    features/
      <TASK-KEY>-implementation-plan.md
    postman/
      <TASK-KEY>.postman_collection.json
```

## Mandatory Task Record Fields

- Start datetime
- End datetime
- Jira task metadata + link
- Jira story link (if any)
- Branch info (`source -> target`)
- GitLab issue + MR references
- Commit references
- Scope summary / delivered changes
- Risks, rollback notes, review notes

## Templates

Use templates under:

- `docs/work-items/02.implementation/templates/task-record.template.md`
- `docs/work-items/02.implementation/templates/story-summary.template.md`
- `docs/work-items/02.implementation/templates/module-readme.template.md`
- `docs/work-items/02.implementation/templates/module-changelog.template.md`
