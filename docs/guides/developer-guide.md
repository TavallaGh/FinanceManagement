# Developer Guide (Draft)

## Objective

This guide explains how developers implement tasks in alignment with Jira/GitLab operational flow.

## Daily Flow

1. Start from Jira task.
2. Run operational prompt (`/speckit.taskstoissues`).
3. Implement on task branch.
4. Keep both task MRs (workspace + project) in expected state (draft/ready based on workflow gate).
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

## Domain Modeling Rules (Mandatory)

- The shared `NT.DDD.Domain` package is the default base for all domain entities.
- Select entity inheritance based on required audit behavior:
  - `CreationAuditedEntity<...>` for create-only audit.
  - `ModificationAuditedEntity<...>` for update-only audit.
  - `AuditedEntity<...>` for create + update audit.
  - `FullAuditedEntity<...>` for create + update + delete audit.
- Use UTC audit member names from `NT.DDD.Domain` only:
  - `CreatedOnUtc`, `UpdatedOnUtc`, `DeletedOnUtc`.
- `CreatedAt`, `UpdatedAt`, `DeletedAt`, `deletedAt`, and similar alternatives are not allowed for auditing contracts.
- The `UserManagement` module in the Accounting API handles Accounting-scoped user concerns. SSO Service owns authentication, tokens, roles, and permissions.
- Full details and examples: `docs/architecture/ddd-domain-conventions.md`.
