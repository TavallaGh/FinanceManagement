---
title: "AC-85 - BE-04 - Audit, Security, and Integration Tests - Implementation Plan"
jira: AC-85
parent: AC-12
phase: Implementation
created: 2026-05-15
repo: accounting-sso
classification: Non-domain
---

## AC-85 - BE-04 — Audit, Security, and Integration Tests (Implementation Plan)

Source: [Jira issue](https://nexttoptech.atlassian.net/browse/AC-85)

---

## 1. Task Summary

- **Jira key**: AC-85
- **Parent story**: AC-12 — Role Management
- **Task summary**: BE-04 — Audit, Security, and Integration Tests
- **Canonical task spec**: [Solution Task Spec](../../../../01.solution/linked/stories/AC-12/tasks/AC-85.md)
- **Classification**: Non-domain implementation plan
- **Target repository**: `projects/accounting-sso`
- **Intended task branch**: `features/ac-85-be-04-audit-security-integration-tests`
- **Dependency**: AC-82, AC-83, AC-84 must all be complete before implementation of this task

---

## 2. Readiness Checks

| Check | Status |
|---|---|
| AoC present (AOC-01 through AOC-07) | ✅ |
| DoD present (DOD-01 through DOD-06) | ✅ |
| Test Cases / TDD / BDD present | ✅ |
| Goal Of Task present | ✅ |
| Problem-To-Solve present | ✅ |
| Fix Version target | `V 0.1 (MVP)` |
| Repository target explicit | ✅ `projects/accounting-sso` |
| Dependency readiness | Conditional — AC-82 ✅, AC-83 and AC-84 implementation plans exist but must be verified complete |
| TL approval gate required before coding | ✅ |
| Approval status at generation time | **✅ TL Approved (2026-05-15)** |

---

## 3. Scope and Assumptions

### 3.1 In Scope

- Write audit record verification integration tests for all 7 role operation types:
  - Role created, role updated, role deactivated, role soft-deleted
  - User assigned to role, user removed from role
  - Role permissions updated
- Write security enforcement tests (authorization handler level) for all Roles permission keys.
- Write HTTP-level 401/403 endpoint security tests for all 12 role endpoints.
- Write permission invalidation integration test: after `POST /api/v1/sso/roles/{roleId}/permissions`, `PermissionClaimsProfileService` returns updated permission claims for a user holding that role.
- Write `AuthorizationDataSeeder` seed verification test confirming `PermissionResourceCodeTypes.Roles` keys are seeded and the permission tree search returns Roles nodes.
- Map all AC-12 story AoC items (AoC-01 through AoC-14) to test evidence.

### 3.2 Pre-flight Verification Results

The following are confirmed already implemented by AC-82/AC-83/AC-84:

| Requirement | Status | Source |
|---|---|---|
| Audit on role created | ✅ Already wired | `RoleService.CreateRoleAsync` → `auditLogService.LogCreatedAsync(AuditTargetType.Role, RoleAuditSnapshot)` |
| Audit on role updated | ✅ Already wired | `RoleService.UpdateRoleAsync` → `auditLogService.LogUpdatedAsync(...)` |
| Audit on role deactivated | ✅ Already wired | `RoleService.DeactivateRoleAsync` → `auditLogService.LogUpdatedAsync(...)` |
| Audit on role soft-deleted | ✅ Already wired | `RoleService.DeleteRoleAsync` → `auditLogService.LogDeletedAsync(...)` |
| Audit on user assigned to role | ✅ Already wired | `RoleUserService.AssignUsersToRoleAsync` → `auditLogService.LogUpdatedAsync(RoleUserSnapshot)` |
| Audit on user removed from role | ✅ Already wired | `RoleUserService.RemoveUsersFromRoleAsync` → `auditLogService.LogUpdatedAsync(RoleUserSnapshot)` |
| Audit on role permissions updated | ✅ Already wired | `RolePermissionService.SetRolePermissionsAsync` → `auditLogService.LogUpdatedAsync(RolePermissionSnapshot)` |
| Per-operation `PermissionKey.Build` on all 12 endpoints | ✅ Already wired | `RoleEndpoints.cs` — all routes use `RequireAuthorization(PermissionKey.Build(...))` |
| `AdminPolicyAccess` on role endpoint group | ✅ Not required | Per-operation `PermissionKey.Build(...)` guards are sufficient; group-level admin policy is not applied to role endpoints by design |
| `AuthorizationDataSeeder` seeds `PermissionResourceCodeTypes.Roles` | ✅ Confirmed | `AuthorizationDataSeeder.EnsurePermissionsAsync` calls `BuildPermissionSeeds(PermissionResourceCodeTypes.Roles, ...)` |

### 3.3 Explicit Out-of-Scope

- Role CRUD handlers and endpoint implementation (AC-82 scope)
- Role–user assignment handler and endpoint implementation (AC-83 scope)
- Role permission assignment handler and endpoint implementation (AC-84 scope)
- Frontend security (separate story)
- Gateway-level role deactivation propagation (deferred per OQ-03)
- Performance/load testing

---

## 4. Repository Routing Matrix

| Artifact Category | Target Repository | Path within Repository |
|---|---|---|
| Audit coverage tests | `projects/accounting-sso` (product repo) | `test/ERP.Sso.Api.Tests.Integration/AuditLogs/RoleAuditCoverageTests.cs` |
| Security enforcement tests | `projects/accounting-sso` (product repo) | `test/ERP.Sso.Api.Tests.Integration/Security/RoleSecurityEnforcementTests.cs` |
| HTTP endpoint security tests | `projects/accounting-sso` (product repo) | `test/ERP.Sso.Api.Tests.Integration/Roles/RoleEndpointSecurityTests.cs` |
| Permission invalidation test | `projects/accounting-sso` (product repo) | `test/ERP.Sso.Api.Tests.Integration/Roles/RolePermissionInvalidationTests.cs` |
| Seed verification test | `projects/accounting-sso` (product repo) | `test/ERP.Sso.Api.Tests.Integration/Permissions/RolesSeedVerificationTests.cs` |
| Task implementation record | workspace repo | `docs/work-items/02.implementation/stories/AC-12/tasks/AC-85-taskclose.md` |

> **Workspace repo MR scope**: Task close record and any workspace documentation only.
> **Product repo MR scope**: All source and test file changes above.

---

## 5. Domain Hierarchy Map (accounting-sso)

```
src/
  01.Domain/ERP.Sso.Domain/
    AuditLogs/          ← AuditContext, AuditTargetType (no changes required)
    Roles/              ← Snapshots and contracts (no changes required)
  03.Infra/ERP.Sso.Infra.Sql/
    AuditLogs/          ← AuditLogService (no changes required, audit already wired)
    Permissions/        ← AuthorizationDataSeeder, PermissionClaimsProfileService
    Roles/              ← RoleService, RoleUserService, RolePermissionService (no changes required)
  04.Presentation/IDP/Erp.Sso.Ids/
    Endpoints/          ← RoleEndpoints.cs (no changes required)
test/
  ERP.Sso.Api.Tests.Integration/
    AuditLogs/          ← RoleAuditCoverageTests.cs (new)
    Security/           ← RoleSecurityEnforcementTests.cs (new)
    Roles/              ← RoleEndpointSecurityTests.cs (new), RolePermissionInvalidationTests.cs (new)
    Permissions/        ← RolesSeedVerificationTests.cs (new)
    Supports/           ← SharedTestServices.cs (extend with RoleService factory method)
```

---

## 6. Entity-Centric Folder Naming Map

| Entity / Concept | Folder Name | Location |
|---|---|---|
| Role | `Roles` | `src/01.Domain/.../Roles`, `src/03.Infra/.../Roles`, `test/.../Roles` |
| AuditLog | `AuditLogs` | `src/01.Domain/.../AuditLogs`, `src/03.Infra/.../AuditLogs`, `test/.../AuditLogs` |
| Permission | `Permissions` | `src/01.Domain/.../Permissions`, `src/03.Infra/.../Permissions`, `test/.../Permissions` |
| Security | `Security` | `test/.../Security` |

All existing folder names are preserved. No new entity folders are introduced.

---

## 7. Implementation Steps

### Step 1 — Test: `SharedTestServices.cs` — Add Role Service Factory Helpers

**File**: `test/ERP.Sso.Api.Tests.Integration/Supports/SharedTestServices.cs`

**Change**: Add factory methods for:
- `CreateRoleService(ErpIdsDbContext context, IAuditLogService? auditLogService = null)` — constructs `RoleService` with in-memory `RoleManager<Role>` and `AuditLogService`.
- `CreateRoleUserService(ErpIdsDbContext context, IAuditLogService? auditLogService = null)` — constructs `RoleUserService`.
- `CreateRolePermissionService(ErpIdsDbContext context, int actorUserId = 1, IAuditLogService? auditLogService = null)` — constructs `RolePermissionService` with `IHttpContextAccessor` seeded with actor claim.

**Note**: Check whether `RoleServiceTests.cs` and `RoleUserServiceTests.cs` already have inline `CreateService` helpers that may be extracted to `SharedTestServices` instead of duplicating.

**Dependency**: Must exist before audit coverage tests (Step 2).

---

### Step 2 — Test: `AuditLogs/RoleAuditCoverageTests.cs` — Audit Record Verification

**File**: `test/ERP.Sso.Api.Tests.Integration/AuditLogs/RoleAuditCoverageTests.cs`

**Pattern**: Each test:
1. Seeds minimal required entities into in-memory `ErpIdsDbContext`.
2. Calls the service operation through the real `RoleService` / `RoleUserService` / `RolePermissionService` with a real `AuditLogService`.
3. Asserts `context.AuditLogs` contains exactly one record with the expected `Action` and `TargetType`.

**Test cases to implement** (7 tests covering AOC-01):

| Test Name | Operation | Expected AuditLog.Action | Expected AuditLog.TargetType |
|---|---|---|---|
| `CreateRoleAsync_WritesCreatedAuditLog` | `RoleService.CreateRoleAsync` | `AuditAction.Created` | `AuditTargetType.Role` |
| `UpdateRoleAsync_WritesUpdatedAuditLog` | `RoleService.UpdateRoleAsync` | `AuditAction.Updated` | `AuditTargetType.Role` |
| `DeactivateRoleAsync_WritesUpdatedAuditLog` | `RoleService.DeactivateRoleAsync` | `AuditAction.Updated` | `AuditTargetType.Role` |
| `DeleteRoleAsync_WritesDeletedAuditLog` | `RoleService.DeleteRoleAsync` | `AuditAction.Deleted` | `AuditTargetType.Role` |
| `AssignUsersToRoleAsync_WritesUpdatedAuditLog` | `RoleUserService.AssignUsersToRoleAsync` | `AuditAction.Updated` | `AuditTargetType.Role` |
| `RemoveUsersFromRoleAsync_WritesUpdatedAuditLog` | `RoleUserService.RemoveUsersFromRoleAsync` | `AuditAction.Updated` | `AuditTargetType.Role` |
| `SetRolePermissionsAsync_WritesUpdatedAuditLog` | `RolePermissionService.SetRolePermissionsAsync` | `AuditAction.Updated` | `AuditTargetType.Role` |

**Additional assertions per test** (where applicable):
- `RoleAuditSnapshot` in `CurrentPayload` matches expected role fields (Created test).
- `PreviousPayload` is non-null on update operations; `CurrentPayload` is non-null on updates; `PreviousPayload`-only for Delete.
- `RoleUserSnapshot.RoleId` and `UserIds` arrays match expected membership state (assign/remove tests).
- `RolePermissionSnapshot.PermissionKeys` matches the set applied (permissions test).

**Dependency**: Step 1 factory helpers; no endpoint host required for these tests.

---

### Step 3 — Test: `Security/RoleSecurityEnforcementTests.cs` — Handler-Level Authorization Tests

**File**: `test/ERP.Sso.Api.Tests.Integration/Security/RoleSecurityEnforcementTests.cs`

**Pattern**: Mirrors `UserSecurityEnforcementTests.cs`. Uses `PermissionAuthorizationHandler` with `AuthorizationHandlerContext` built from a `ClaimsPrincipal`.

**Permission keys to cover (all Roles operations)**:
- `Roles.View` = `"2:10002:2"` (PermissionLayer.Accounting=2, PermissionResourceCodeTypes.Roles=10002, PermissionActions.View=2)
- `Roles.Create` = `"2:10002:1"`
- `Roles.Edit` = `"2:10002:3"`
- `Roles.Delete` = `"2:10002:4"`
- `Roles.StatusChange` = `"2:10002:5"` *(confirm the numeric value from `PermissionActions` enum)*

**Test cases per permission key** (8 tests minimum — success and forbidden for each):
- `GIVEN authenticated user with Roles.View claim WHEN handler evaluates THEN requirement succeeds`
- `GIVEN authenticated user with Roles.Create claim WHEN handler evaluates THEN requirement succeeds`
- `GIVEN authenticated user with Roles.Edit claim WHEN handler evaluates THEN requirement succeeds`
- `GIVEN authenticated user with Roles.Delete claim WHEN handler evaluates THEN requirement succeeds`
- `GIVEN authenticated user missing Roles.View claim WHEN handler evaluates THEN forbidden exception thrown`
- `GIVEN authenticated user missing Roles.Create claim WHEN handler evaluates THEN forbidden exception thrown`
- `GIVEN unauthenticated user WHEN handler evaluates any Roles requirement THEN forbidden exception thrown`

**Dependency**: No service/host setup required — pure handler tests. Can be written concurrently with Step 2.

---

### Step 4 — Test: `Roles/RoleEndpointSecurityTests.cs` — HTTP 401/403 Endpoint Security

**File**: `test/ERP.Sso.Api.Tests.Integration/Roles/RoleEndpointSecurityTests.cs`

**Pattern**: Uses a `WebApplication` test host (similar to `RolePermissionEndpointTestHost`) with two client configurations:
- `NoAuthClient` — no authentication header (expect `401`).
- `NoPermissionClient` — authenticated with valid `AdminAccess` claim but **no** `Roles.*` permission claims (expect `403`).

> **Note**: `NoPermissionClient` must carry a valid JWT but be missing the specific `PermissionKey.Build(Roles, <action>)` claim to test 403 on the per-operation guard.

**All 12 endpoints to test** (AOC-02 and AOC-03):

| Endpoint | Method | Path | Required Permission |
|---|---|---|---|
| Search roles | GET | `/api/v1/sso/roles` | `Roles.View` |
| Get role by ID | GET | `/api/v1/sso/roles/{roleId}` | `Roles.View` |
| Create role | POST | `/api/v1/sso/roles` | `Roles.Create` |
| Update role | PUT | `/api/v1/sso/roles/{roleId}` | `Roles.Edit` |
| Deactivate role | POST | `/api/v1/sso/roles/{roleId}/deactivate` | `Roles.StatusChange` |
| Delete role | DELETE | `/api/v1/sso/roles/{roleId}` | `Roles.Delete` |
| Get role users | GET | `/api/v1/sso/roles/{roleId}/users` | `Roles.View` |
| Search users for assignment | GET | `/api/v1/sso/roles/{roleId}/users/search` | `Roles.Edit` |
| Assign users to role | POST | `/api/v1/sso/roles/{roleId}/users` | `Roles.Edit` |
| Remove users from role | DELETE | `/api/v1/sso/roles/{roleId}/users` | `Roles.Edit` |
| Get role permissions | GET | `/api/v1/sso/roles/{roleId}/permissions` | `Roles.View` |
| Set role permissions | POST | `/api/v1/sso/roles/{roleId}/permissions` | `Roles.Edit` |

**Test structure** (24 test cases minimum — 12 endpoints × 2 scenarios):
- Each `NoAuthClient` call asserts `HttpStatusCode.Unauthorized` (401).
- Each `NoPermissionClient` call asserts `HttpStatusCode.Forbidden` (403).

**Dependency**: None — no source changes required before these tests.

---

### Step 5 — Test: `Roles/RolePermissionInvalidationTests.cs` — Token Claims After Permission Change

**File**: `test/ERP.Sso.Api.Tests.Integration/Roles/RolePermissionInvalidationTests.cs`

**Test**: AOC-05 — After `POST /api/v1/sso/roles/{roleId}/permissions`, the next token issued for a user holding that role contains the updated permission claims.

**Implementation approach** (service-level, not full HTTP):
1. Seed: permission catalog entries for `Roles.View` and `Roles.Create`; a role; a user assigned to that role.
2. Pre-change: call `PermissionClaimsProfileService.GetPermissionsForUserAsync(userId)` → assert `Roles.View` key is present, `Roles.Create` is absent.
3. Mutate: call `RolePermissionService.SetRolePermissionsAsync(roleId, request)` adding `Roles.Create` to the role.
4. Post-change: call `PermissionClaimsProfileService.GetPermissionsForUserAsync(userId)` again → assert both `Roles.View` and `Roles.Create` keys are present in the returned claims.

**Key assertion**: The claims update is immediate at next service call (no cache), confirming the token-natural invalidation pattern (OQ-02 resolved in `solution.md`).

**Dependency**: Requires `PermissionClaimsProfileService` service setup (no HTTP host needed).

---

### Step 6 — Test: `Permissions/RolesSeedVerificationTests.cs` — AuthorizationDataSeeder Verification

**File**: `test/ERP.Sso.Api.Tests.Integration/Permissions/RolesSeedVerificationTests.cs`

**Test**: AOC-06 — `AuthorizationDataSeeder` includes `PermissionResourceCodeTypes.Roles` keys, confirmed by a permission tree search that returns Roles nodes.

**Test case**:
1. Create in-memory context; instantiate `AuthorizationDataSeeder`.
2. Call `SeedAsync()`.
3. Query `context.Permissions` filtering by `Key.Contains(":10002:")` (Roles resource code segment).
4. Assert at least one `Permission` record exists for each concrete `PermissionActions` value (View, Create, Edit, Delete, StatusChange) with the Roles resource code.
5. Optionally call `PermissionService.SearchPermissionsAsync("Rol", ...)` and assert the Roles resource node appears in the result tree.

**Dependency**: No service/host setup beyond `AuthorizationDataSeeder` and `PermissionService` instantiation.

---

## 8. Code-Level Implementation Blueprint

> **No source code changes required.** All audit wiring, endpoint guards, and seed data are already in place. AC-85 is exclusively a test-delivery task.

### 8.1 New Test Files — Overview

| File | Class | Test Count | Covers |
|---|---|---|---|
| `Supports/SharedTestServices.cs` | `SharedTestServices` (extension) | — | Factory helpers for RoleService, RoleUserService, RolePermissionService |
| `AuditLogs/RoleAuditCoverageTests.cs` | `RoleAuditCoverageTests` | 7 | AOC-01, DOD-02 |
| `Security/RoleSecurityEnforcementTests.cs` | `RoleSecurityEnforcementTests` | 7+ | AOC-02, AOC-03, DOD-03 |
| `Roles/RoleEndpointSecurityTests.cs` | `RoleEndpointSecurityTests` | 24 | AOC-02, AOC-03, DOD-03 |
| `Roles/RolePermissionInvalidationTests.cs` | `RolePermissionInvalidationTests` | 1 | AOC-05, DOD-04 |
| `Permissions/RolesSeedVerificationTests.cs` | `RolesSeedVerificationTests` | 1–2 | AOC-06, DOD-05 |

> **Note**: `SharedTestServices.cs` is an extension of an existing file, not a new file.

---

### 8.2 `SharedTestServices` Additions

**New methods to add**:

```
// Factory for RoleService (for audit/CRUD tests)
public static RoleService CreateRoleService(
    ErpIdsDbContext context,
    IAuditLogService? auditLogService = null)

// Factory for RoleUserService (for audit/assignment tests)
public static RoleUserService CreateRoleUserService(
    ErpIdsDbContext context,
    IAuditLogService? auditLogService = null)

// Factory for RolePermissionService (for audit/permission tests)
public static RolePermissionService CreateRolePermissionService(
    ErpIdsDbContext context,
    int actorUserId = 1,
    IAuditLogService? auditLogService = null)
```

Each factory:
- Accepts an `IAuditLogService?` override; defaults to `CreateAuditLogService(context)`.
- Constructs minimal real infrastructure (e.g., `RoleManager<Role>` for `RoleService`).
- Matches the pattern established by `CreateUserServices(...)` and `CreatePermissionService(...)`.

---

### 8.3 `RoleEndpointSecurityTests` Test Host

The test host for security tests requires two authenticated clients:

**Host A — `NoAuthClient`**: Raw `HttpClient` with no authorization header. Returns 401.

**Host B — `NoPermissionClient`**: Test auth handler that issues a `ClaimsPrincipal` with a valid authenticated identity but **no** `permission` claims for Roles (so per-operation `PermissionKey.Build(Roles, ...)` fails with 403).

This dual-client pattern confirms that:
- Without any auth → 401 (unauthenticated)
- Authenticated but without specific Roles permission → 403 (forbidden)

**Host structure**: Follow the pattern of `RolePermissionEndpointTestHost` (inner sealed class with `WebApplication`, `Client`, `SeedAsync`, `DisposeAsync`). Extend to support two client instances.

---

## 9. Data Model / Migration Impact

None. No new entities, tables, or EF Core migrations are required for AC-85.

---

## 10. Security and Privacy Controls

| Control | Status | Location |
|---|---|---|
| `AdminPolicyAccess` guard on role endpoint group | ✅ Not required by design | `RoleEndpoints.cs` — per-operation guards are sufficient |
| Per-operation `PermissionKey.Build(Roles, <action>)` | ✅ All 12 endpoints | `RoleEndpoints.cs` |
| Audit emit for all 7 role operations | ✅ All services | `RoleService`, `RoleUserService`, `RolePermissionService` |
| No hardcoded user-facing strings in role API responses | ✅ | All role error paths use `GlobalResponseKey.*` |
| Token-claim invalidation on permission change | ✅ Natural (next issuance) | `PermissionClaimsProfileService` |

**Abuse-case checks**:
- Without `AdminPolicyAccess` on the group, a user with a `Roles.View` permission claim but no admin role could previously reach role list endpoints. Step 1 closes this by requiring both admin policy AND specific permission key.
- Privilege escalation: verified that role permission assignment cannot grant permissions higher than what `AuthorizationDataSeeder` has seeded.

---

## 11. Observability Requirements

All new test files: no application-level logging changes required. Tests use `NullLogger` for all services.

Application-level (already in place per AC-82/83/84):
- Method-level `LogInformation` at start and completion of every service method.
- `LogWarning` for validation failures with `ResponseKey` in the structured log.
- `LogError` for unexpected exceptions in endpoint handlers.

No new logging instrumentation is needed for AC-85.

---

## 12. GlobalResponseKey Model

No new `GlobalResponseKey` values are needed. All required keys are already defined from AC-82/83/84:

| Key | Purpose |
|---|---|
| `ERROR_ROLE_SYSTEMCODE_DUPLICATE` | Duplicate SystemCode on create/update |
| `ERROR_ROLE_NAME_DUPLICATE` | Duplicate name on create/update |
| `ERROR_ROLE_NAME_REQUIRED` | Name validation |
| `ERROR_ROLE_LABEL_EN_REQUIRED` | English label validation |
| `ERROR_ROLE_VALIDATIONFAILED` | Identity create/update failures |
| `ERROR_ROLE_INACTIVE` | Operation on inactive role |
| `ERROR_ROLE_HAS_ACTIVE_ASSIGNMENTS` | Soft-delete blocked by active assignments |
| `ERROR_ROLE_ASSIGNMENT_USER_NOT_FOUND` | Assign/remove: user does not exist |
| `ERROR_ROLE_ASSIGNMENT_USER_INACTIVE` | Assign: user is inactive |
| `ERROR_PERMISSION_INVALID_KEY` | Unknown permission key in set request |
| `ERROR_ROLE_PERMISSION_QUERY_TOO_SHORT` | Permission tree query < 3 chars |
| `ERROR_ROLE_PERMISSION_PAYLOAD_REQUIRED` | Null payload on SetRolePermissions |
| `INFORMATION_ROLE_PERMISSIONS_UPDATED` | Log key on successful permission save |
| `INFORMATION_ROLE_PERMISSIONS_CLEARED` | Log key on clear operation |
| `ERROR_AUDIT_WRITE_FAILED` | Audit write failure (non-fatal) |

**AOC-07 verification**: Test assertions must confirm that error responses contain `GlobalResponseKey` string values (not free-text messages) for all error paths in role endpoints.

---

## 13. TDD Plan — Test-First Execution Order

> Run tests first (fail), then implement the corresponding source change, then confirm green.

| Order | Test to Write First | Expected Initial State | Source Change | Expected Final State |
|---|---|---|---|---|
| 1 | `RoleAuditCoverageTests` — all 7 audit record verification tests | ✅ Should pass immediately (audit already wired) | None — confirms existing wiring | All 7 pass |
| 2 | `RoleEndpointSecurityTests` — 401 tests for all 12 endpoints (NoAuth) | ✅ Should pass (RequireAuthorization already on each endpoint) | None — confirms existing per-route auth | 12 pass |
| 3 | `RoleEndpointSecurityTests` — 403 tests for all 12 endpoints (NoPermission) | ✅ Should pass (per-operation PermissionKey guards enforce 403) | None | 12 pass |
| 4 | `RoleSecurityEnforcementTests` — handler-level Roles permission tests | ✅ Should pass (handler is existing infrastructure) | None | 7+ pass |
| 5 | `RolesSeedVerificationTests` — Roles seed present | ✅ Should pass (already seeded) | None | 1–2 pass |
| 6 | `RolePermissionInvalidationTests` — token claims after permission change | Depends on `PermissionClaimsProfileService` wiring | Potential fix if claims loading is not joined correctly | 1 pass |

---

## 14. BDD Scenarios — Given/When/Then

### Scenario 1 — Audit: Role Created (AOC-01 / DOD-02)
- **Given** an admin actor and a valid `CreateRoleRequest`
- **When** `RoleService.CreateRoleAsync` is called
- **Then** exactly one `AuditLog` record with `Action = Created`, `TargetType = Role`, non-null `CurrentPayload` exists in the database

### Scenario 2 — Audit: User Assigned to Role (AOC-01 / DOD-02)
- **Given** an active role and one or more active users
- **When** `RoleUserService.AssignUsersToRoleAsync` is called
- **Then** one `AuditLog` record with `Action = Updated`, `TargetType = Role`, `CurrentPayload` containing the new user ID set exists

### Scenario 3 — Audit: Role Permissions Updated (AOC-01 / DOD-02)
- **Given** an active role and a valid `SetRolePermissionsRequest`
- **When** `RolePermissionService.SetRolePermissionsAsync` is called
- **Then** one `AuditLog` record with `Action = Updated`, `TargetType = Role`, `CurrentPayload` containing the requested permission keys exists

### Scenario 4 — Security: Unauthenticated Request (AOC-02 / DOD-03)
- **Given** no authentication token
- **When** any of the 12 role API endpoints is called
- **Then** `401 Unauthorized` is returned

### Scenario 5 — Security: Missing Permission (AOC-03 / DOD-03)
- **Given** a user with admin role but without the required `Roles.<action>` permission claim
- **When** a role API endpoint requiring that specific permission is called
- **Then** `403 Forbidden` is returned

### Scenario 6 — Permission Invalidation (AOC-05 / DOD-04)
- **Given** a user holding role "Accountant" which currently has `Roles.View` permission
- **When** `POST /api/v1/sso/roles/{accountantId}/permissions` adds `Roles.Create`
- **Then** `PermissionClaimsProfileService.GetPermissionsForUserAsync(userId)` returns both `Roles.View` and `Roles.Create` keys in the next call

### Scenario 7 — Seed: Roles Permissions Present (AOC-06 / DOD-05)
- **Given** `AuthorizationDataSeeder.SeedAsync` has been called
- **When** querying `context.Permissions` for keys matching the Roles resource code
- **Then** at least one permission record per concrete `PermissionActions` exists for `PermissionResourceCodeTypes.Roles`

### Scenario 8 — No Hardcoded Strings (AOC-07)
- **Given** any role endpoint error path (duplicate SystemCode, inactive role, missing permission, etc.)
- **When** the endpoint returns a 4xx response
- **Then** the response body contains a `GlobalResponseKey` string (e.g., `ERROR_ROLE_SYSTEMCODE_DUPLICATE`) and not a raw exception message

---

## 15. Story AoC Coverage Map (AC-12 AoC-01 through AoC-14)

| AC-12 AoC Item | Covered By | In AC-85 Test File |
|---|---|---|
| AoC-01: Search roles | `RoleServiceTests.cs` (existing) | N/A — already covered |
| AoC-02: Get role by ID | `RoleServiceTests.cs` (existing) | N/A — already covered |
| AoC-03: Create role | `RoleServiceTests.cs` (existing) | N/A — already covered |
| AoC-04: Update role | `RoleServiceTests.cs` (existing) | N/A — already covered |
| AoC-05: Deactivate role | `RoleServiceTests.cs` (existing) | N/A — already covered |
| AoC-06: Soft-delete role (blocked with active assignments) | `RoleServiceTests.cs` (existing) | N/A — already covered |
| AoC-07: Assign users to role | `RoleUserServiceTests.cs` (existing) | N/A — already covered |
| AoC-08: Remove users from role | `RoleUserServiceTests.cs` (existing) | N/A — already covered |
| AoC-09: Search users for assignment | `RoleUserServiceTests.cs` (existing) | N/A — already covered |
| AoC-10: Set role permissions | `RolePermissionServiceTests.cs` (existing) | N/A — already covered |
| AoC-11: Clear role permissions | `RolePermissionServiceTests.cs` (existing) | N/A — already covered |
| AoC-12: Query role permission tree | `RolePermissionEndpointTests.cs` (existing) | N/A — already covered |
| AoC-13: Audit coverage for all 7 operations | `RoleAuditCoverageTests.cs` (AC-85 new) | ✅ All 7 tests |
| AoC-14: Security enforcement (401/403) | `RoleEndpointSecurityTests.cs` (AC-85 new) | ✅ 24 tests |

> **Note**: The refinement doc (AoC-01 through AoC-14) must be reviewed to confirm the numbering above aligns with the `docs/work-items/00.refinement/linked/stories/AC-12/refinement.md` source. The task spec references capability slices 1–6 and AoC-10, AoC-11, AoC-14 specifically as AC-85 scope.

---

## 16. Rollout, Rollback, and Feature-Flag Strategy

- **Rollout**: Standard task branch `features/ac-85-be-04-audit-security-integration-tests` → MR to `develop`.
- **Rollback**: Revert the one-line `AdminPolicyAccess` group guard change if it introduces unexpected 403 responses for existing admin users. All test files are additive-only and carry no rollback risk.
- **Feature flags**: None required. Security guard is unconditional and aligns with established pattern across all other endpoint groups.

---

## 17. Dependency Order Enforcement

```
AC-82 ✅ (Role CRUD)
  ↓
AC-83 ✅ (Role-User Assignment APIs)
  ↓
AC-84 ✅ (Role Permission Management APIs)
  ↓
AC-85 ← THIS TASK
  Step 1: SharedTestServices.cs factory extensions
  Step 2: RoleAuditCoverageTests.cs (confirm audit wiring)
  Step 3: RoleSecurityEnforcementTests.cs (handler-level)
  Step 4: RoleEndpointSecurityTests.cs (HTTP 401/403)
  Step 5: RolesSeedVerificationTests.cs (seed confirmation)
  Step 6: RolePermissionInvalidationTests.cs (token claims)
```

Steps 3–5 can proceed in parallel. Step 6 requires Step 1 to be complete.

---

## 18. Completion Output

- **Task identity**: AC-85 — BE-04 — Audit, Security, and Integration Tests
- **Parent story**: AC-12 — Role Management
- **Source file**: `docs/work-items/01.solution/linked/stories/AC-12/tasks/AC-85.md`
- **Classification**: Non-domain implementation task
- **Target repository**: `projects/accounting-sso`
- **Task branch**: `features/ac-85-be-04-audit-security-integration-tests`

### Readiness Summary

| Item | Status |
|---|---|
| AoC validated | ✅ |
| DoD validated | ✅ |
| TDD / BDD coverage mapped | ✅ |
| Repository targets explicit | ✅ |
| Entity folder naming confirmed | ✅ |
| Response key catalog confirmed | ✅ (no new keys) |
| Logging / error-handling coverage | ✅ (already in place) |
| Security controls identified | ✅ (AdminPolicyAccess gap found and scoped) |
| Migration impact | None |
| Rollback strategy defined | ✅ |

### Handoff to `/speckit.implement`

After TL approval of this plan:
- Run `/speckit.implement` with this plan path: `docs/work-items/02.implementation/stories/AC-12/tasks/AC-85-implementation-plan.md`
- Implement in the order defined in Section 13 (TDD Plan).
- Start with `RoleAuditCoverageTests.cs` to confirm audit wiring before touching source code.
- Apply `AdminPolicyAccess` guard before running `RoleEndpointSecurityTests`.
- Confirm `dotnet test --filter "Role"` green before closing the task.

---

## 19. TL Approval Checklist

> **Required before implementation begins.** Return this checklist with approval status.

- [x] Section 3.1 (scope) aligns with AC-85 task spec
- [x] Section 3.2 (pre-flight audit verification) results are correct and complete
- [x] `SharedTestServices` factory pattern (Step 1) is acceptable — no alternative factory location required
- [x] 7 audit record verification tests (Step 2) cover all required operation types
- [x] 24 HTTP 401/403 security tests (Step 4) cover all 12 role endpoints
- [x] `RolePermissionInvalidationTests` approach (service-level, not HTTP) is acceptable for AOC-05
- [x] Seed verification test (Step 7) is sufficient for AOC-06
- [x] No new `GlobalResponseKey` values are required
- [x] Story AoC coverage map (Section 15) correctly identifies gaps vs. existing coverage
- [x] TL approval: **[x] APPROVED** — 2026-05-15
