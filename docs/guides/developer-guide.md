# Developer Guide (Draft)

## Objective

This guide explains how developers implement tasks in alignment with Jira/GitLab operational flow.

## Daily Flow

1. Start from Jira task.
2. Run operational prompt (`/speckit.taskstoissues`).
3. Implement on task branch.
4. Keep MR in expected state (draft/ready based on workflow gate).
5. Run completion prompt (`/speckit.taskclose`) to generate delivery records.

## GitFlow Rules

- `features|bugs|technicals/*` -> `develop`
- `story/*` -> `test`
- `sprint/*` -> `stage`
- `hotfix/*` -> `main`

## Documentation Rules

- Task records and story summaries must be created under `docs/work-items/implementation/`.
- API tasks must update Postman collection artifacts.
- Module README/CHANGELOG should be updated when module docs exist.
