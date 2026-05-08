---
title: "AC-82 - BE-01 - Role CRUD Application + Presentation - Task Close"
jira: AC-82
parent: AC-12
phase: Close
created: 2026-05-07
closed: 2026-05-07
status: complete
scope: BACKEND
---

## Task Close Record

**Jira:** [AC-82](https://nexttoptech.atlassian.net/browse/AC-82)  
**Parent Story:** [AC-12](https://nexttoptech.atlassian.net/browse/AC-12)  
**Implementation Plan:** [AC-82-implementation-plan.md](./AC-82-implementation-plan.md)  
**Canonical Task Spec:** [AC-82.md](../../../../01.solution/linked/stories/AC-12/tasks/AC-82.md)

---

## 1. Execution Summary

| Field | Value |
| --- | --- |
| Start datetime | 2026-05-05 11:48:39 +03:30 |
| End datetime | 2026-05-07 15:07:18 +03:30 |
| Executed by | GitHub Copilot |
| Jira status at task-close generation | In Progress |
| Source branch | `features/ac-82-be-01-role-crud-application-presentation` |
| Target branch | `develop` |
| GitLab issue (product / accounting-sso) | `https://gitlab.com/next-top-tech/accounting/accounting-sso/-/work_items/6` |
| GitLab MR (product / accounting-sso) | `https://gitlab.com/next-top-tech/accounting/accounting-sso/-/merge_requests/8` - Draft / opened |
| GitLab issue (workspace) | `https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/work_items/16` |
| GitLab MR (workspace) | `https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/27` - Draft / opened |
| Primary implementation commit | `8ef677c` - `crud added` |

---

## 2. Delivered Changes

### 2.1 Domain Contract and DTO Cleanup

- Added `IRoleService` as the contract-first role CRUD surface under `src/01.Domain/ERP.Sso.Domain/Roles/Contracts/`.
- Added `CreateRoleRequest`, `UpdateRoleRequest`, and `RoleSummaryDto`; expanded `RoleSearchRequest` to support text, name, system-code, and active-state filtering.
- Removed the legacy `RoleDto` and `UpsertRoleRequest` payload shapes.
- Refactored `Role` to remove the custom `Key` field and replace `Status` with `IsActive`, while preserving Identity-backed `Name` and `NormalizedName` behavior.
- Added role-specific `GlobalResponseKey` entries for required-field, duplicate, not-found, validation-failure, and active-assignment delete guard cases.

### 2.2 Application and Endpoint Slice

- Added six thin MediatR entry points under `src/02.Application/ERP.Sso.Application/Roles/`:
  - `CreateRoleCommand`
  - `UpdateRoleCommand`
  - `DeactivateRoleCommand`
  - `DeleteRoleCommand`
  - `GetRoleByIdQuery`
  - `SearchRolesQuery`
- Added `RoleEndpoints.cs` under `src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/` and mapped the `/api/v1/sso/roles` group with the full CRUD surface:
  - `GET /api/v1/sso/roles`
  - `GET /api/v1/sso/roles/{roleId}`
  - `POST /api/v1/sso/roles`
  - `PUT /api/v1/sso/roles/{roleId}`
  - `POST /api/v1/sso/roles/{roleId}/deactivate`
  - `DELETE /api/v1/sso/roles/{roleId}`
- Registered `app.MapRoleEndpoints()` in `Program.cs` and `IRoleService -> RoleService` in `Injections.cs`.

### 2.3 Infrastructure and Persistence

- Added `RoleService` under `src/03.Infra/ERP.Sso.Infra.Sql/Roles/` with:
  - paginated search for non-deprecated roles
  - get-by-id lookup
  - create and update validation for required fields, date ranges, duplicate role names, and duplicate `SystemCode`
  - deactivate behavior via `IsActive = false`
  - soft-delete behavior via `Deprecated = true`
  - delete guard that blocks removal while active user assignments exist
  - audit-log writes for create, update, deactivate, and delete actions
- Updated `RoleConfiguration` to remove `Key` mapping, require `SystemCode`, map `IsActive`, and enforce a unique `SystemCode` index.
- Added migration `20260507103400_ac82_role_cleanup` and updated `ErpIdsDbContextModelSnapshot`.
- Updated `AuthorizationDataSeeder` to resolve seed roles by `Name` instead of `Key` and to seed `IsActive` rather than `Status`.

### 2.4 Cross-Slice Compatibility Updates

- Updated `PermissionServiceIntegrationTests` role fixtures to stop using `Key`, switch to `IsActive`, and use distinct `SystemCode` values.
- Updated `UserRoleAssignmentDto` and the user endpoint imports needed by the new role flow.
- Created a story-level Postman collection for AC-12 at `docs/work-items/02.implementation/stories/AC-12/postman/AC-12.postman_collection.json` covering the role CRUD routes.

### 2.5 Files Touched in `projects/accounting-sso`

- `src/01.Domain/ERP.Sso.Domain/Common/Errors/GlobalResponseKey.cs`
- `src/01.Domain/ERP.Sso.Domain/Roles/Contracts/IRoleService.cs`
- `src/01.Domain/ERP.Sso.Domain/Roles/Dtos/CreateRoleRequest.cs`
- `src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RoleSearchRequest.cs`
- `src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RoleSummaryDto.cs`
- `src/01.Domain/ERP.Sso.Domain/Roles/Dtos/UpdateRoleRequest.cs`
- `src/01.Domain/ERP.Sso.Domain/Roles/Dtos/UserRoleAssignmentDto.cs`
- `src/01.Domain/ERP.Sso.Domain/Roles/Entities/Role.cs`
- `src/02.Application/ERP.Sso.Application/Roles/Commands/CreateRoleCommand.cs`
- `src/02.Application/ERP.Sso.Application/Roles/Commands/DeactivateRoleCommand.cs`
- `src/02.Application/ERP.Sso.Application/Roles/Commands/DeleteRoleCommand.cs`
- `src/02.Application/ERP.Sso.Application/Roles/Commands/UpdateRoleCommand.cs`
- `src/02.Application/ERP.Sso.Application/Roles/Queries/GetRoleByIdQuery.cs`
- `src/02.Application/ERP.Sso.Application/Roles/Queries/SearchRolesQuery.cs`
- `src/03.Infra/ERP.Sso.Infra.Sql/Configurations/Roles/RoleConfiguration.cs`
- `src/03.Infra/ERP.Sso.Infra.Sql/Injections.cs`
- `src/03.Infra/ERP.Sso.Infra.Sql/Migrations/ERP.IDS/20260507103400_ac82_role_cleanup.cs`
- `src/03.Infra/ERP.Sso.Infra.Sql/Migrations/ERP.IDS/20260507103400_ac82_role_cleanup.Designer.cs`
- `src/03.Infra/ERP.Sso.Infra.Sql/Migrations/ERP/IDS/ErpIdsDbContextModelSnapshot.cs`
- `src/03.Infra/ERP.Sso.Infra.Sql/Permissions/AuthorizationDataSeeder.cs`
- `src/03.Infra/ERP.Sso.Infra.Sql/Roles/RoleService.cs`
- `src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/RoleEndpoints.cs`
- `src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/UserEndpoints.cs`
- `src/04.Presentation/IDP/Erp.Sso.Ids/Program.cs`
- `test/ERP.Sso.Api.Tests.Integration/Permissions/PermissionServiceIntegrationTests.cs`
- `test/ERP.Sso.Api.Tests.Integration/Roles/RoleServiceTests.cs`

---

## 3. Acceptance Criteria Sign-off

| AoC | Description | Status |
| --- | --- | --- |
| AOC-01 | `GET /api/v1/sso/roles` supports paging plus query / name / system-code / active filters | Implemented in `RoleService.SearchRolesAsync` and exposed by `RoleEndpoints`; focused filter coverage verified in `RoleServiceTests` |
| AOC-02 | `GET /api/v1/sso/roles/{roleId}` returns a single bilingual role DTO or keyed not-found | Implemented; get-by-id service behavior verified in `RoleServiceTests` |
| AOC-03 | `POST /api/v1/sso/roles` creates a role and rejects duplicate `SystemCode` | Implemented; duplicate `SystemCode` validation verified in `RoleServiceTests` |
| AOC-04 | `PUT /api/v1/sso/roles/{roleId}` updates mutable fields and re-validates uniqueness | Implemented; update persistence verified in `RoleServiceTests` |
| AOC-05 | `POST /api/v1/sso/roles/{roleId}/deactivate` sets the role inactive | Implemented; deactivate behavior verified in `RoleServiceTests` |
| AOC-06 | `DELETE /api/v1/sso/roles/{roleId}` soft-deletes and blocks when active assignments exist | Implemented; both delete paths verified in `RoleServiceTests` |
| AOC-07 | Group and per-route authorization requirements are enforced | Implemented in `RoleEndpoints` with `AdminPolicyAccess` plus per-operation `PermissionKey.Build(...)` guards |
| AOC-08 | Response DTOs retain bilingual fields and avoid hardcoded user-facing strings | Implemented in entity/DTO shape and keyed response flow |
| AOC-09 | Thin-handler pattern is preserved across the role slice | Implemented across all role commands and queries |

---

## 4. Definition of Done Sign-off

| DoD | Description | Status |
| --- | --- | --- |
| DOD-01 | All AoC items pass with integration-test evidence | Partial: focused role-service test slice passes (`7/7`); endpoint-level integration coverage is not present in the repo yet |
| DOD-02 | `RoleEndpoints` registered and visible in Swagger | Implemented in `Program.cs`; Swagger visibility not re-verified during task-close |
| DOD-03 | Thin-handler pattern enforced | Done |
| DOD-04 | `IRoleService` in Domain and `RoleService` in Infra | Done |
| DOD-05 | DI registration present and application starts without errors | Partial: DI registration is present; a rebuild-based test run was blocked by a file lock from the running `Erp.Ids` process |
| DOD-06 | Keyed constants back error messaging and no hardcoded strings were introduced | Done |

---

## 5. Validation Notes

- Focused executable validation passed:

```text
dotnet test test/ERP.Sso.Api.Tests.Integration/ERP.Sso.Api.Tests.Integration.csproj --no-build --filter RoleServiceTests
```

- Result: `7` tests passed, `0` failed, `0` skipped.
- A rebuild-based rerun of the same test slice hit environment file locks from the running `Erp.Ids` process and Visual Studio; this did not expose any AC-82-specific product failure before the lock contention stopped the build.
- The test project still reports pre-existing package and analyzer warnings, including `NU1904` on `Microsoft.AspNetCore.DataProtection` and multiple nullable-reference / CA1062 warnings outside the AC-82 scope.

---

## 6. API Collection

| Field | Value |
| --- | --- |
| Collection path | `docs/work-items/02.implementation/stories/AC-12/postman/AC-12.postman_collection.json` |
| Added endpoints | `GET /api/v1/sso/roles`, `GET /api/v1/sso/roles/{roleId}`, `POST /api/v1/sso/roles`, `PUT /api/v1/sso/roles/{roleId}`, `POST /api/v1/sso/roles/{roleId}/deactivate`, `DELETE /api/v1/sso/roles/{roleId}` |
| Updated endpoints | None |
| Removed endpoints | None |
| Endpoint mapper files | `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/RoleEndpoints.cs`, `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Program.cs` |
| Group prefix uses `MapGroup("/api/v1/...")` | Yes |
| Child routes remain relative | Yes |
| Explicit `Produces` plus `WithDescription` present on each route | Yes |
| Explicit `RequireAuthorization(...)` present on each route | Yes |
| Endpoint handlers remain thin | Yes |

---

## 7. Operational State

- Jira remote links already contain both required GitLab issue and MR references for `accounting-sso` and `accounting-workspace`.
- Both linked MRs are still `Draft` and both linked issues remain open. State was intentionally left unchanged during `taskclose`.
- Jira remains `In Progress` at task-close generation time. Promote to `In Review` together with both MR titles when reviewer handoff begins.
- `scripts/task-exec.ps1` currently routes backend product work to `accounting-project`, which does not match AC-82's actual product repo (`accounting-sso`). Product-side traceability for this task-close step was therefore confirmed directly from Jira remote links and GitLab project-path API lookups instead of the helper script.
- Story summary was not updated because AC-83, AC-84, and AC-85 are still outstanding for AC-12.

---

## 8. Risks and Rollback

| Risk | Notes |
| --- | --- |
| Role migration changes persisted schema | `20260507103400_ac82_role_cleanup` renames `Status` to `IsActive`, removes `Key` mapping, and changes uniqueness enforcement to `SystemCode`; apply to lower environments before promotion |
| Seeder now resolves roles by `Name` only | Seeded role names must remain stable because `AuthorizationDataSeeder` no longer falls back to `Key` |
| Review handoff still pending | Both product and workspace MRs remain `Draft`; review transition and MR readying must happen together |

**Rollback:** Revert commit `8ef677c`, revert the AC-82 migration with a follow-up EF migration, restore the `Key` / `Status`-based role shape, and remove the new role CRUD endpoint and service registrations.

---

## 9. Successor Tasks

| Task | Key | Status |
| --- | --- | --- |
| BE-02 - Role User Assignment APIs | AC-83 | Pending |
| BE-03 - Role Permission Management APIs | AC-84 | Pending |
| BE-04 - Role Audit, Security, and Integration Tests | AC-85 | Pending |

---

## 10. Suggested Commit Message

```text
wip: AC-82 - task close artifacts [wip]
```
