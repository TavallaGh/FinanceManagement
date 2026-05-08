# AC-82 — Task Completion

## Summary

- **Task:** AC-82
- **Related Story:** AC-12
- **Title:** BE-01 - Role CRUD Application + Presentation
- **Status:** Completed — implementation artifacts generated; Jira/MR review-state transition still pending

## Description

- Implemented the full role CRUD application and presentation slice for `projects/accounting-sso`.
- Added a contract-first role service surface with dedicated create, update, search, detail, deactivate, and soft-delete DTOs and handlers.
- Refactored the role model to remove the legacy `Key` field and replace `Status` with `IsActive` while preserving Identity-backed `Name` behavior.
- Added `RoleService` with validation, duplicate checks for `Name` and `SystemCode`, audit-log emission, inactive-role handling, and active-assignment delete protection.
- Added minimal API endpoints under `/api/v1/sso/roles` with group authorization and per-operation permission guards.
- Added the `ac82_role_cleanup` migration and updated seed/configuration code to align with the new role shape.
- Added focused integration coverage for the CRUD service behavior and created the AC-12 story Postman collection for the new API surface.

## Acceptance Criteria

- AC-01: `GET /api/v1/sso/roles` returns a paginated role list with filtering by query, name, system code, and active state.
- AC-02: `GET /api/v1/sso/roles/{roleId}` returns a single bilingual role DTO or keyed not-found.
- AC-03: `POST /api/v1/sso/roles` creates a role, validates required fields, and rejects duplicate `SystemCode` values.
- AC-04: `PUT /api/v1/sso/roles/{roleId}` updates role fields and revalidates uniqueness constraints.
- AC-05: `POST /api/v1/sso/roles/{roleId}/deactivate` marks the role inactive via `IsActive = false`.
- AC-06: `DELETE /api/v1/sso/roles/{roleId}` performs a soft delete and blocks deletion when active assignments exist.
- AC-07: All role endpoints require `AdminPolicyAccess` and the correct per-operation `PermissionKey` guard.
- AC-08: Role response DTOs preserve bilingual labels and descriptions with keyed response behavior.
- AC-09: The role slice preserves the thin-handler pattern with business logic concentrated in `RoleService`.

## Implementation Notes

- Files changed and rationale:
  - `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Contracts/IRoleService.cs`
    - Added the role CRUD contract used by the application layer.
  - `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/CreateRoleRequest.cs`
  - `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/UpdateRoleRequest.cs`
  - `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RoleSummaryDto.cs`
  - `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RoleSearchRequest.cs`
    - Added the new request/response DTO set and search filter shape for the role API.
  - `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Entities/Role.cs`
    - Removed `Key` and replaced `Status` with `IsActive`.
  - `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Common/Errors/GlobalResponseKey.cs`
    - Added role-specific validation, duplicate, not-found, and delete-guard response keys.
  - `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Commands/CreateRoleCommand.cs`
  - `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Commands/UpdateRoleCommand.cs`
  - `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Commands/DeactivateRoleCommand.cs`
  - `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Commands/DeleteRoleCommand.cs`
  - `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Queries/GetRoleByIdQuery.cs`
  - `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Queries/SearchRolesQuery.cs`
    - Added the thin MediatR command/query layer for role CRUD.
  - `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Roles/RoleService.cs`
    - Added the role CRUD implementation with validation, audit logging, duplicate enforcement, and delete guard behavior.
  - `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Configurations/Roles/RoleConfiguration.cs`
  - `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Injections.cs`
  - `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Permissions/AuthorizationDataSeeder.cs`
    - Registered the service, updated role persistence mapping, and aligned seed lookup logic with the new role model.
  - `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Migrations/ERP.IDS/20260507103400_ac82_role_cleanup.cs`
  - `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Migrations/ERP.IDS/20260507103400_ac82_role_cleanup.Designer.cs`
  - `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Migrations/ERP/IDS/ErpIdsDbContextModelSnapshot.cs`
    - Added the schema migration and updated the EF snapshot.
  - `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/RoleEndpoints.cs`
  - `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Program.cs`
    - Added and registered the `/api/v1/sso/roles` endpoint group.
  - `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Roles/RoleServiceTests.cs`
  - `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Permissions/PermissionServiceIntegrationTests.cs`
    - Added focused role CRUD test coverage and updated permission tests for the new role shape.
  - `docs/work-items/02.implementation/stories/AC-12/postman/AC-12.postman_collection.json`
    - Added the story-level Postman collection for the new role CRUD API routes.

## Tests

- Automated tests:
  - `dotnet test test/ERP.Sso.Api.Tests.Integration/ERP.Sso.Api.Tests.Integration.csproj --filter "RoleServiceTests"`
  - Result: passed (`7` succeeded, `0` failed, `0` skipped).
- Manual verification steps:
  1. Execute `GET /api/v1/sso/roles` and verify paging plus active/query filtering works against non-deprecated roles.
  2. Execute `POST /api/v1/sso/roles` with a duplicate `SystemCode` and verify a keyed validation error is returned.
  3. Execute `POST /api/v1/sso/roles/{roleId}/deactivate` and verify the role persists with `IsActive = false`.
  4. Execute `DELETE /api/v1/sso/roles/{roleId}` for a role with active user assignments and verify the keyed delete-guard error is returned.

## Traceability

- Jira Task: [AC-82](https://nexttoptech.atlassian.net/browse/AC-82)
- Jira Story: [AC-12](https://nexttoptech.atlassian.net/browse/AC-12)
- Workspace MR: [accounting-workspace!27](https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/27)
- Project MR: [accounting-sso!8](https://gitlab.com/next-top-tech/accounting/accounting-sso/-/merge_requests/8)

## Source Files

- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Common/Errors/GlobalResponseKey.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Contracts/IRoleService.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/CreateRoleRequest.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/UpdateRoleRequest.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RoleSummaryDto.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RoleSearchRequest.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Entities/Role.cs`
- `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Commands/CreateRoleCommand.cs`
- `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Commands/UpdateRoleCommand.cs`
- `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Commands/DeactivateRoleCommand.cs`
- `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Commands/DeleteRoleCommand.cs`
- `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Queries/GetRoleByIdQuery.cs`
- `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Queries/SearchRolesQuery.cs`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Configurations/Roles/RoleConfiguration.cs`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Injections.cs`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Migrations/ERP.IDS/20260507103400_ac82_role_cleanup.cs`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Permissions/AuthorizationDataSeeder.cs`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Roles/RoleService.cs`
- `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/RoleEndpoints.cs`
- `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Program.cs`
- `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Permissions/PermissionServiceIntegrationTests.cs`
- `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Roles/RoleServiceTests.cs`
- `docs/work-items/02.implementation/stories/AC-12/postman/AC-12.postman_collection.json`
- `docs/work-items/02.implementation/stories/AC-12/tasks/AC-82-taskclose.md`

## Sign-off

- Developer:
- Reviewer:
