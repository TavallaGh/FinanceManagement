# AC-84 - Task Completion

## Summary

- **Task:** AC-84
- **Related Story:** AC-12
- **Title:** BE-03 - Role Permission Management APIs
- **Scope:** Backend (`accounting-sso`)
- **Status:** Completed - implementation artifacts generated; taskClose and review-state transition still pending
- **Completed:** 2026-05-11

## Description

- Implemented role-permission assignment and query capabilities in the existing `Roles` slice for `projects/accounting-sso`.
- Created a dedicated `IRolePermissionService` contract with `SetRolePermissionsAsync` and `GetRolePermissionTreeAsync` to support replace/clear assignment and granted-state tree queries.
- Added role-permission DTOs for tree-oriented request and response modeling: `SetRolePermissionsRequest`, `RolePermissionNodeRequest`, `RolePermissionTreeNodeDto`, and `RolePermissionActionDto`.
- Added thin MediatR command and query handlers (`SetRolePermissionsCommand`, `SearchRolePermissionTreeQuery`) that delegate directly to `IRolePermissionService`.
- Implemented `RolePermissionService` to enforce active-role validation for permission writes, perform full-replace persistence, support `Clear = true`, validate unknown permission keys, expand apply-all to concrete action rows, and return granted overlays.
- Extended `RoleEndpoints` with `GET` and `POST` routes under `/api/v1/sso/roles/{roleId:int}/permissions`, preserving `AdminPolicyAccess`, per-route permission guards, and keyed error translation.
- Added focused integration coverage for service and endpoint behavior, including unknown-key rejection, short-query validation, clear-all semantics, granted overlay projection, apply-all expansion, inactive-role rejection, and next-read effective-permission updates.
- No schema migration was added in this task.

## Acceptance Criteria

- **AOC-01:** `GET /api/v1/sso/roles/{roleId}/permissions?q={query}` enforces 3-character minimum and returns paginated tree nodes with per-action `Granted` flags.
  - ✅ Implemented via `GetRolePermissionTreeAsync`, `SearchRolePermissionTreeQuery`, and role `/permissions` GET endpoint.
- **AOC-02:** `POST /api/v1/sso/roles/{roleId}/permissions` replaces the full permission set for valid payloads and rejects unknown permission keys.
  - ✅ Implemented in `SetRolePermissionsAsync` with keyed `ERROR_PERMISSION_INVALID_KEY` validation and endpoint `200` success path.
- **AOC-03:** `Clear = true` atomically removes all role permission rows and returns an empty snapshot.
  - ✅ Implemented and covered by service and endpoint integration tests.
- **AOC-04:** Apply-all persists concrete action-level rows only (no wildcard direct-assignment row).
  - ✅ Implemented by action expansion logic and validated by integration tests.
- **AOC-05:** Updated role permissions affect effective permissions on next read/token issuance flow.
  - ✅ Verified in integration coverage through post-update permission-tree reads for a role-bound user.
- **AOC-06:** Endpoints enforce `AdminPolicyAccess` and operation-specific permission guards.
  - ✅ Preserved in endpoint route mapping (`View` for GET, `Edit` for POST).
- **AOC-07:** Thin-handler pattern is maintained.
  - ✅ Both new handlers contain a single delegation call to `IRolePermissionService`.

## Implementation Notes

### Domain

| File | Change |
| --- | --- |
| `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Contracts/IRolePermissionService.cs` | New dedicated contract for role permission set/clear and tree query. |
| `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/SetRolePermissionsRequest.cs` | Added role permission update root payload with `Clear` and tree nodes. |
| `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RolePermissionNodeRequest.cs` | Added per-resource input node contract with `ApplyAll` and action list. |
| `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RolePermissionTreeNodeDto.cs` | Added response node projection for role permission tree. |
| `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RolePermissionActionDto.cs` | Added per-action projection including `Granted` flag. |
| `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Common/Errors/GlobalResponseKey.cs` | Added role-permission validation and information keys. |

### Application

| File | Change |
| --- | --- |
| `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Commands/SetRolePermissionsCommand.cs` | Added thin command handler delegating to `IRoleService.SetRolePermissionsAsync`. |
| `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Queries/SearchRolePermissionTreeQuery.cs` | Added thin query handler delegating to `IRoleService.GetRolePermissionTreeAsync`. |

### Infrastructure and Presentation

| File | Change |
| --- | --- |
| `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Roles/RolePermissionService.cs` | New dedicated service implementing role-permission replace/clear/query behavior, key validation, apply-all expansion, granted overlays, and structured logging. |
| `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/RoleEndpoints.cs` | Added `/permissions` GET/POST routes for role permission tree query and set/clear operations. |

### Tests

| File | Change |
| --- | --- |
| `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Roles/RolePermissionServiceTests.cs` | Added integration coverage for unknown key rejection, clear-all behavior, short-query guard, granted overlay, apply-all expansion, and effective-permission update behavior. |
| `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Roles/RolePermissionEndpointTests.cs` | Added endpoint integration coverage for keyed validation, clear-all success, granted overlay responses, and inactive-role rejection. |

### Workspace Artifacts

| File | Change |
| --- | --- |
| `docs/work-items/02.implementation/stories/AC-12/tasks/AC-84-implementation-plan.md` | Existing implementation plan used as source-of-truth for approved scope and traceability. |
| `docs/work-items/03.completation/linked/stories/AC-12/Tasks/AC-84/completion.md` | New completion artifact for task close phase 1. |

## Tests

- Automated tests:
  - `dotnet test test/ERP.Sso.Api.Tests.Integration/ERP.Sso.Api.Tests.Integration.csproj --filter "FullyQualifiedName~RolePermissionServiceTests|FullyQualifiedName~RolePermissionEndpointTests"`
  - Result: passed locally on 2026-05-11 (`11` succeeded, `0` failed, `0` skipped).
- Manual verification steps:
  1. Execute `GET /api/v1/sso/roles/{roleId}/permissions?q=ab` and verify keyed `ERROR_ROLE_PERMISSION_QUERY_TOO_SHORT` validation.
  2. Execute `POST /api/v1/sso/roles/{roleId}/permissions` with unknown keys and verify keyed `ERROR_PERMISSION_INVALID_KEY` with no partial writes.
  3. Execute `POST /api/v1/sso/roles/{roleId}/permissions` with `{ "clear": true }` and verify all role permission rows are removed.
  4. Execute `POST /api/v1/sso/roles/{roleId}/permissions` with apply-all semantics and verify concrete action rows are persisted without wildcard rows.
  5. Execute `GET /api/v1/sso/roles/{roleId}/permissions?q=Use` and verify `Granted` overlay matches current role assignments.

## Traceability

- Jira Task: [AC-84](https://nexttoptech.atlassian.net/browse/AC-84)
- Jira Story: [AC-12](https://nexttoptech.atlassian.net/browse/AC-12)
- GitLab Issue (Project): [accounting-sso/-/work_items/6](https://gitlab.com/next-top-tech/accounting/accounting-sso/-/work_items/6)
- GitLab MR (Workspace): [accounting-workspace/-/merge_requests/34](https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/34)
- GitLab MR (Project): [accounting-sso/-/merge_requests/10](https://gitlab.com/next-top-tech/accounting/accounting-sso/-/merge_requests/10)
- Source branch: `features/ac-84-be-03-role-permission-management-apis`
- Target branch: `develop`
- Implementation plan: `docs/work-items/02.implementation/stories/AC-12/tasks/AC-84-implementation-plan.md`

## Source Files

- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Common/Errors/GlobalResponseKey.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Contracts/IRoleService.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/SetRolePermissionsRequest.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RolePermissionNodeRequest.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RolePermissionTreeNodeDto.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RolePermissionActionDto.cs`
- `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Commands/SetRolePermissionsCommand.cs`
- `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Queries/SearchRolePermissionTreeQuery.cs`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Roles/RoleService.cs`
- `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/RoleEndpoints.cs`
- `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Roles/RolePermissionServiceTests.cs`
- `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Roles/RolePermissionEndpointTests.cs`
- `docs/work-items/02.implementation/stories/AC-12/tasks/AC-84-implementation-plan.md`
- `docs/work-items/03.completation/linked/stories/AC-12/Tasks/AC-84/completion.md`

## Sign-off

- Developer:
- Reviewer:
