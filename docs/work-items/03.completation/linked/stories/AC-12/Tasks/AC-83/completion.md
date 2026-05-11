# AC-83 - Task Completion

## Summary

- **Task:** AC-83
- **Related Story:** AC-12
- **Title:** BE-02 - Role User Assignment APIs
- **Scope:** Backend (`accounting-sso`)
- **Status:** Completed - implementation artifacts generated; taskClose and review-state transition still pending
- **Completed:** 2026-05-11

## Description

- Implemented the role-user assignment API surface inside the existing `Roles` slice in `projects/accounting-sso`.
- Extended `IRoleService` with assign, remove, assigned-user list, and candidate-search methods, plus task-specific DTOs for batch assignment, removal, search filtering, and user summaries.
- Added thin MediatR commands and queries for assignment, removal, assigned-user listing, and candidate search without moving business logic out of `RoleService`.
- Updated `RoleService` to normalize distinct positive user IDs, reject inactive roles, reject missing or inactive users on assignment, ignore duplicate assignments, ignore missing removals, and return paginated assigned-user and candidate-search results.
- Extended `RoleEndpoints` with `/api/v1/sso/roles/{roleId}/users` routes for list, search, assign, and remove while preserving `AdminPolicyAccess`, per-route `PermissionKey` guards, keyed validation, and not-found translation.
- Added focused integration coverage for both service and endpoint behavior, including inactive-role rejection, short-query validation, exclusion of already assigned and inactive users, and persistence of assignment and removal changes.
- No schema migration, seed update, or additional registration change was required for this slice.

## Acceptance Criteria

- **AOC-01:** `GET /api/v1/sso/roles/{roleId}/users` returns a paginated list of `RoleUserSummaryDto` items.
  - ✅ Implemented via `GetRoleUsersAsync`, `GetRoleUsersQuery`, and `GET /api/v1/sso/roles/{roleId}/users`.
- **AOC-02:** `GET /api/v1/sso/roles/{roleId}/users/search?q={query}` requires at least 3 characters and excludes already assigned users.
  - ✅ Search validates query length, filters out inactive users, and excludes existing assignments before paging results.
- **AOC-03:** `POST /api/v1/sso/roles/{roleId}/users` assigns users, rejects inactive roles, and ignores duplicate assignments.
  - ✅ Assignment returns `204`, throws `ERROR_ROLE_INACTIVE` for inactive roles, and adds only missing `UserRoles` rows.
- **AOC-04:** `DELETE /api/v1/sso/roles/{roleId}/users` removes existing assignments and handles missing assignments gracefully.
  - ✅ Removal returns `204`, deletes only matching `UserRoles` rows, and treats unassigned user IDs as no-op cleanup.
- **AOC-05:** Assignment to an inactive role is rejected with keyed validation.
  - ✅ `GlobalResponseKey.ERROR_ROLE_INACTIVE` is enforced by the service and translated by the endpoints.
- **AOC-06:** All endpoints require `AdminPolicyAccess` and appropriate permission guards.
  - ✅ The role group keeps `AdminPolicyAccess`; list uses `View`, while search, assign, and remove use `Edit`.
- **AOC-07:** Thin-handler pattern remains enforced.
  - ✅ All four handlers remain one-line delegations to `IRoleService`.

## Implementation Notes

### Domain

| File | Change |
| --- | --- |
| `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Common/Errors/GlobalResponseKey.cs` | Added assignment-specific validation keys plus assignment/removal information keys. |
| `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Contracts/IRoleService.cs` | Added assign, remove, assigned-user list, and candidate-search service methods. |
| `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/AssignUsersToRoleRequest.cs` | Added batch assignment payload for `UserIds`. |
| `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RemoveUsersFromRoleRequest.cs` | Added batch removal payload for `UserIds`. |
| `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RoleUserSearchRequest.cs` | Added search filter contract for live-search query text. |
| `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RoleUserSummaryDto.cs` | Added assigned-user and candidate-search projection DTO. |

### Application

| File | Change |
| --- | --- |
| `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Commands/AssignUsersToRoleCommand.cs` | Added thin command handler for assignment. |
| `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Commands/RemoveUsersFromRoleCommand.cs` | Added thin command handler for removal. |
| `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Queries/GetRoleUsersQuery.cs` | Added thin query handler for assigned-user pagination. |
| `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Queries/SearchUsersForAssignmentQuery.cs` | Added thin query handler for candidate search. |

### Infrastructure and Presentation

| File | Change |
| --- | --- |
| `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Roles/RoleService.cs` | Added the role-user membership implementation, keyed validation, paging, search filtering, and structured logging. |
| `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/RoleEndpoints.cs` | Added the `/users` subgroup with list, search, assign, and remove endpoints under the existing role API surface. |

### Tests

| File | Change |
| --- | --- |
| `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/ERP.Sso.Api.Tests.Integration.csproj` | Updated the integration test project to include the new endpoint coverage file. |
| `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Roles/RoleEndpointIntegrationTests.cs` | Added end-to-end API coverage for list, assign, remove, and search flows. |
| `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Roles/RoleServiceTests.cs` | Extended the service integration suite with assignment, removal, list, and candidate-search scenarios. |

### Workspace Artifacts

| File | Change |
| --- | --- |
| `docs/work-items/02.implementation/stories/AC-12/tasks/AC-83-implementation-plan.md` | Existing implementation plan used as the source-of-truth for scope and traceability. |
| `docs/work-items/03.completation/linked/stories/AC-12/Tasks/AC-83/completion.md` | New completion artifact for task close phase 1. |

## Tests

- Automated tests:
  - `dotnet test test/ERP.Sso.Api.Tests.Integration/ERP.Sso.Api.Tests.Integration.csproj --filter "FullyQualifiedName~RoleServiceTests|FullyQualifiedName~RoleEndpointIntegrationTests"`
  - Result: passed locally on 2026-05-11 (`21` succeeded, `0` failed, `0` skipped).
- Manual verification steps:
  1. Execute `GET /api/v1/sso/roles/{roleId}/users?index=0&size=10` and verify assigned users are paged and ordered.
  2. Execute `GET /api/v1/sso/roles/{roleId}/users/search?q=ab` and verify the endpoint rejects the short query.
  3. Execute `GET /api/v1/sso/roles/{roleId}/users/search?q=ali&index=0&size=10` and verify already assigned and inactive users are excluded.
  4. Execute `POST /api/v1/sso/roles/{roleId}/users` with valid user IDs and verify `204` plus persisted `UserRoles` rows.
  5. Execute `DELETE /api/v1/sso/roles/{roleId}/users` with an assigned and an unassigned user ID and verify `204` plus idempotent cleanup behavior.

## Traceability

- Jira Task: [AC-83](https://nexttoptech.atlassian.net/browse/AC-83)
- Jira Story: [AC-12](https://nexttoptech.atlassian.net/browse/AC-12)
- GitLab Issue (Workspace): [accounting-workspace/-/work_items/16](https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/work_items/16)
- GitLab MR (Workspace): [accounting-workspace/-/merge_requests/32](https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/32)
- GitLab Issue (Project): [accounting-sso/-/work_items/6](https://gitlab.com/next-top-tech/accounting/accounting-sso/-/work_items/6)
- GitLab MR (Project): [accounting-sso/-/merge_requests/9](https://gitlab.com/next-top-tech/accounting/accounting-sso/-/merge_requests/9)
- Source branch: `features/ac-83-be-02-role-user-assignment-apis`
- Target branch: `develop`
- Implementation plan: `docs/work-items/02.implementation/stories/AC-12/tasks/AC-83-implementation-plan.md`

## Source Files

- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Common/Errors/GlobalResponseKey.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Contracts/IRoleService.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/AssignUsersToRoleRequest.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RemoveUsersFromRoleRequest.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RoleUserSearchRequest.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RoleUserSummaryDto.cs`
- `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Commands/AssignUsersToRoleCommand.cs`
- `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Commands/RemoveUsersFromRoleCommand.cs`
- `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Queries/GetRoleUsersQuery.cs`
- `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Queries/SearchUsersForAssignmentQuery.cs`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Roles/RoleService.cs`
- `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/RoleEndpoints.cs`
- `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/ERP.Sso.Api.Tests.Integration.csproj`
- `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Roles/RoleEndpointIntegrationTests.cs`
- `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Roles/RoleServiceTests.cs`
- `docs/work-items/02.implementation/stories/AC-12/tasks/AC-83-implementation-plan.md`
- `docs/work-items/03.completation/linked/stories/AC-12/Tasks/AC-83/completion.md`

## Sign-off

- Developer:
- Reviewer: