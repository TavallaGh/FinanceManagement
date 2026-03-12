# Implementation Documentation Structure

This folder stores traceable delivery records for completed tasks and stories.

## Folder Layout

```text
docs/work-items/implementation/
  stories/
    <STORY-KEY>/
      tasks/
        <TASK-KEY>.md
      story-summary.md
      postman/
        <STORY-KEY>.postman_collection.json
      module/
        README.md
        CHANGELOG.md
  standalone/
    bugs/
      <TASK-KEY>.md
    technicals/
      <TASK-KEY>.md
    hotfix/
      <TASK-KEY>.md
    features/
      <TASK-KEY>.md
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

- `docs/work-items/implementation/templates/task-record.template.md`
- `docs/work-items/implementation/templates/story-summary.template.md`
- `docs/work-items/implementation/templates/module-readme.template.md`
- `docs/work-items/implementation/templates/module-changelog.template.md`
