---
title: "AC-30 — BE-04 - Security, Audit, and Tests — Implementation Plan"
jira: AC-30
parent: AC-13
phase: Implementation
created: 2026-04-28
status: pending-tl-approval
---

# AC-30 — BE-04 - Security, Audit, and Tests (Implementation Plan)

Source: https://nexttoptech.atlassian.net/browse/AC-30
Parent: https://nexttoptech.atlassian.net/browse/AC-13

---

## 1. Task Summary

- Jira key: AC-30
- Parent story: AC-13 - User Management
- Task summary: BE-04 - Security, Audit, and Tests
- Stack: Backend + QA
- Canonical task spec: [Solution Task Spec](../../../../01.solution/linked/stories/AC-13/tasks/AC-30.md)
- Dependencies: AC-28 (BE-02 User Lifecycle APIs), AC-29 (BE-03 Direct Permission Management APIs)

## 2. Readiness Checks

- AoC present: Yes (AOC-01..AOC-03)
- DoD present: Yes (DOD-01..DOD-03)
- TDD/BDD present: Yes (unit, integration, security path tests)
- Fix Version: V 0.1 (MVP)
- Labels: Backend
- TL gate required before coding: **Yes — awaiting TL approval below**

## 3. Scope & Assumptions

**In scope:**
- Implement dedicated **audit log** domain entity, contract, infra service, and EF configuration + migration.
- Emit structured audit events from `UserServices` for all sensitive user lifecycle operations.
- Emit structured audit events from `PermissionService` for permission grant operations.
- Verify and document that deny-by-default authorization is active on all user-domain endpoints.
- Verify and close the `confirm=true` query-parameter gate on the hard-delete endpoint handler.
- Add missing `GlobalResponseKey` entries for audit failures.
- Produce full test coverage for security enforcement (allow/deny paths) and audit event emission.

**Out of scope:**
- Frontend changes, Party/company domain, role management.
- External SIEM integration or log-forwarding pipeline.
- New business features outside AC-13.

**Assumptions:**
- `ILogger<T>` already handles operational logging. Audit log is persisted to the same SQL database via EF (separate table).
- Actor identity is resolved from `IHttpContextAccessor` injected into infra services where audit calls occur.
- The `confirm=true` gate is implemented at handler level (endpoint delegate), not in the domain service.

## 4. Repository Routing Matrix

| Artifact | Repository | Exact Path |
|---|---|---|
| Audit Log domain entity | accounting-sso | `src/01.Domain/ERP.Sso.Domain/AuditLogs/Entities/AuditLog.cs` |
| Audit Log contract | accounting-sso | `src/01.Domain/ERP.Sso.Domain/AuditLogs/Contracts/IAuditLogService.cs` |
| Audit Log dto | accounting-sso | `src/01.Domain/ERP.Sso.Domain/AuditLogs/Dtos/AuditLogEntry.cs` |
| Audit Log EF config | accounting-sso | `src/03.Infra/ERP.Sso.Infra.Sql/Configurations/AuditLogs/AuditLogConfiguration.cs` |
| Audit Log infra service | accounting-sso | `src/03.Infra/ERP.Sso.Infra.Sql/AuditLogs/AuditLogService.cs` |
| DbContext registration | accounting-sso | `src/03.Infra/ERP.Sso.Infra.Sql/Infrastructures/Contexts/ErpIdsDbContext.cs` (add `DbSet<AuditLog>`) |
| EF Migration | accounting-sso | `src/03.Infra/ERP.Sso.Infra.Sql/Migrations/ERP.IDS/` (new migration: `add_audit_log`) |
| DI registration | accounting-sso | `src/03.Infra/ERP.Sso.Infra.Sql/Injections.cs` |
| UserServices (audit injection) | accounting-sso | `src/03.Infra/ERP.Sso.Infra.Sql/Users/UserServices.cs` |
| PermissionService (audit injection) | accounting-sso | `src/03.Infra/ERP.Sso.Infra.Sql/Permissions/PermissionService.cs` |
| UserEndpoints (confirm gate) | accounting-sso | `src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/UserEndpoints.cs` |
| GlobalResponseKey additions | accounting-sso | `src/01.Domain/ERP.Sso.Domain/Common/Errors/GlobalResponseKey.cs` |
| Security enforcement tests | accounting-sso | `test/ERP.Sso.Api.Tests.Integration/Security/UserSecurityEnforcementTests.cs` |
| Audit emission unit tests | accounting-sso | `test/ERP.Sso.Api.Tests.Integration/AuditLogs/UserAuditEmissionTests.cs` |
| Permission audit unit tests | accounting-sso | `test/ERP.Sso.Api.Tests.Integration/AuditLogs/PermissionAuditEmissionTests.cs` |
| Implementation plan (workspace) | accounting-workspace | `docs/work-items/02.implementation/stories/AC-13/tasks/AC-30-implementation-plan.md` |

## 5. Domain Hierarchy Map (accounting-sso)

Per project DDD layer conventions:

```
src/
  01.Domain/ERP.Sso.Domain/
    AuditLogs/
      Contracts/
        IAuditLogService.cs       ← new
      Dtos/
        AuditLogEntry.cs          ← new (value object dto for emitting an event)
      Entities/
        AuditLog.cs               ← new (persisted audit record)
      Enums/
        AuditAction.cs            ← new (enum: Created, Updated, Deactivated, Deleted, PasswordReset, PermissionGranted)
    Common/
      Errors/
        GlobalResponseKey.cs      ← extend (add ERROR_AUDIT_WRITE_FAILED)

  02.Application/                 ← no changes needed; commands already thin

  03.Infra/ERP.Sso.Infra.Sql/
    AuditLogs/
      AuditLogService.cs          ← new
    Configurations/
      AuditLogs/
        AuditLogConfiguration.cs  ← new
    Infrastructures/Contexts/
      ErpIdsDbContext.cs          ← extend (add DbSet<AuditLog>)
    Migrations/ERP.IDS/
      <timestamp>_add_audit_log   ← new migration
    Users/
      UserServices.cs             ← inject IAuditLogService, emit audit events
    Permissions/
      PermissionService.cs        ← inject IAuditLogService, emit audit on GrantDirectPermission
    Injections.cs                 ← register IAuditLogService

  04.Presentation/IDP/Erp.Sso.Ids/
    Endpoints/
      UserEndpoints.cs            ← add confirm=true gate on DeleteUser handler

test/
  ERP.Sso.Api.Tests.Integration/
    AuditLogs/
      UserAuditEmissionTests.cs   ← new
      PermissionAuditEmissionTests.cs ← new
    Security/
      UserSecurityEnforcementTests.cs ← new
    Supports/
      SharedTestServices.cs       ← extend (add CreateAuditLogService helper)
```

## 6. Implementation Blueprint (Files/Classes/Interfaces to Create/Update)

### 6.1 `AuditAction` enum — NEW
- **File**: `src/01.Domain/ERP.Sso.Domain/AuditLogs/Enums/AuditAction.cs`
- **Values**: `Created`, `Updated`, `Deactivated`, `Deleted`, `PasswordReset`, `PermissionGranted`
- **Purpose**: Strongly-typed event discriminator for audit records.

### 6.2 `AuditLogEntry` dto — NEW
- **File**: `src/01.Domain/ERP.Sso.Domain/AuditLogs/Dtos/AuditLogEntry.cs`
- **Properties**: `int TargetUserId`, `string TargetUserName`, `AuditAction Action`, `string? ActorSubject`, `DateTimeOffset OccurredOnUtc`, `string? Details`
- **Purpose**: Immutable value object passed to `IAuditLogService.WriteAsync`.

### 6.3 `AuditLog` entity — NEW
- **File**: `src/01.Domain/ERP.Sso.Domain/AuditLogs/Entities/AuditLog.cs`
- **Properties**:
  - `int Id` (PK, identity)
  - `int TargetUserId` (FK → Users.Id, no cascade delete — audit must survive user deletion)
  - `string TargetUserName` (snapshot, not FK-referenced)
  - `AuditAction Action` (stored as int)
  - `string? ActorSubject` (subject claim from JWT, nullable for background ops)
  - `DateTimeOffset OccurredOnUtc`
  - `string? Details` (JSON blob for structured detail, max 2000 chars)
- **Invariants**: No business logic. This is a pure persistence model.
- **Note**: Do NOT add deletion cascades. Audit records are immutable.

### 6.4 `IAuditLogService` contract — NEW
- **File**: `src/01.Domain/ERP.Sso.Domain/AuditLogs/Contracts/IAuditLogService.cs`
- **Methods**:
  - `Task WriteAsync(AuditLogEntry entry, CancellationToken cancellationToken = default)`
- **Purpose**: Domain contract that `UserServices` / `PermissionService` depend on.

### 6.5 `AuditLogConfiguration` EF config — NEW
- **File**: `src/03.Infra/ERP.Sso.Infra.Sql/Configurations/AuditLogs/AuditLogConfiguration.cs`
- Implements `IEntityTypeConfiguration<AuditLog>`.
- Table name: `AuditLogs`
- `TargetUserName`: max length 256, not null.
- `ActorSubject`: max length 512, nullable.
- `Details`: max length 2000, nullable.
- `Action`: stored as int.
- `TargetUserId`: FK `RESTRICT` (not cascade delete).
- Index: `(Action, OccurredOnUtc)` for audit query performance.

### 6.6 `AuditLogService` infra service — NEW
- **File**: `src/03.Infra/ERP.Sso.Infra.Sql/AuditLogs/AuditLogService.cs`
- Implements `IAuditLogService`.
- Constructor: `ErpIdsDbContext context, ILogger<AuditLogService> logger`
- `WriteAsync`: creates `AuditLog` from `AuditLogEntry`, adds to context, calls `SaveChangesAsync`.
- On EF exception: logs warning using `LogWarning` with `GlobalResponseKey.ERROR_AUDIT_WRITE_FAILED` key, does **not** throw (audit failure must not break primary operation).

### 6.7 `ErpIdsDbContext` — EXTEND
- **File**: `src/03.Infra/ERP.Sso.Infra.Sql/Infrastructures/Contexts/ErpIdsDbContext.cs`
- Add: `public DbSet<AuditLog> AuditLogs => Set<AuditLog>();`

### 6.8 `Injections.cs` — EXTEND
- **File**: `src/03.Infra/ERP.Sso.Infra.Sql/Injections.cs`
- Add: `services.AddScoped<IAuditLogService, AuditLogService>();`

### 6.9 EF Migration — NEW
- Name: `add_audit_log`
- Creates `AuditLogs` table per configuration above.
- Command: `dotnet ef migrations add add_audit_log --project src/03.Infra/ERP.Sso.Infra.Sql --startup-project src/04.Presentation/IDP/Erp.Sso.Ids --context ErpIdsDbContext --output-dir Migrations/ERP.IDS`

### 6.10 `UserServices` — EXTEND (inject + emit audit events)
- **File**: `src/03.Infra/ERP.Sso.Infra.Sql/Users/UserServices.cs`
- Inject `IAuditLogService auditLogService` via constructor.
- Emit audit event **after** successful operation in each sensitive method:
  - `CreateUserAsync` → `AuditAction.Created`, `INFORMATION_USER_CREATED`
  - `UpdateUserAsync` → `AuditAction.Updated`, `INFORMATION_USER_UPDATED`
  - `DeactivateUserAsync` → `AuditAction.Deactivated`, `INFORMATION_USER_DEACTIVATED`
  - `DeleteUserAsync` → `AuditAction.Deleted`, `INFORMATION_USER_DELETED`
  - `ResetPasswordAsync` → `AuditAction.PasswordReset`, `INFORMATION_USER_PASSWORD_RESET_INITIATED`
- Actor subject resolution: accept `string? actorSubject` parameter in each method signature, or resolve from `IHttpContextAccessor` injected into the service. **Preferred approach: inject `IHttpContextAccessor` and extract actor subject claim at service level** (keeps contract clean without threading actor through every call site).
- Audit entry `Details` field: provide a compact JSON string with operation-specific metadata (e.g., for `Updated`: includes which fields changed; for `PermissionGranted`: includes permission key).

### 6.11 `PermissionService` — EXTEND (inject + emit audit events)
- **File**: `src/03.Infra/ERP.Sso.Infra.Sql/Permissions/PermissionService.cs`
- Inject `IAuditLogService auditLogService` and `IHttpContextAccessor httpContextAccessor`.
- Emit on `GrantDirectPermission` success → `AuditAction.PermissionGranted`, `INFORMATION_USER_PERMISSION_GRANTED` (add to `GlobalResponseKey`).

### 6.12 `GlobalResponseKey` — EXTEND
- **File**: `src/01.Domain/ERP.Sso.Domain/Common/Errors/GlobalResponseKey.cs`
- Add under `#region Error`:
  - `ERROR_AUDIT_WRITE_FAILED`
- Add under `#region Information`:
  - `INFORMATION_USER_PERMISSION_GRANTED`

### 6.13 `UserEndpoints.DeleteUser` handler — CLOSE CONFIRM GATE
- **File**: `src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/UserEndpoints.cs`
- In the `DeleteUser` handler delegate:
  - Add `[FromQuery] bool confirm = false` parameter.
  - If `confirm != true`, return `Results.BadRequest(new APIResponse { Code = GlobalResponseKey.ERROR_USER_CONFIRMATION_REQUIRED.ToString(), Message = "Deletion requires confirm=true query parameter." })` — do NOT proceed to `DeleteUserAsync`.
- This closes the documented security contract on the hard-delete endpoint.

## 7. Security / Privacy Controls

- **Deny-by-default**: All user-domain endpoints already have `RequireAuthorization(PermissionKey.Build(...))`. `PermissionAuthorizationHandler` rejects any request without a matching permission claim. No change required; verified by existing `PermissionAuthorizationPolicyTests`.
- **Object-scope**: N/A for MVP — current permission model is flat (no resource-instance scoping per tenant). Document as known gap, not a blocker for AC-30.
- **Audit immutability**: `AuditLog` records must never be updated or deleted. No `DeleteAsync` method on `IAuditLogService`. EF config does not cascade delete.
- **Actor identity in audit**: Actor subject extracted from JWT `sub` claim via `IHttpContextAccessor`. If no authenticated actor (background seeding), `ActorSubject` is `null` — this is valid.
- **Sensitive data in audit Details**: Do NOT log passwords, password hashes, or raw tokens in `Details` field.
- **Hard-delete gate**: `confirm=true` validation added to `DeleteUser` handler prevents accidental permanent deletion.

## 8. Observability (Logging Strategy)

Existing `ILogger` usage in `UserServices` already follows structured logging conventions. For AC-30, add:

- `AuditLogService.WriteAsync`: `LogInformation("Audit event written. Action={Action}, TargetUserId={TargetUserId}", entry.Action, entry.TargetUserId)`
- `AuditLogService.WriteAsync` on failure: `LogWarning("Audit write failed. Action={Action}, TargetUserId={TargetUserId}. Error: {Error}", entry.Action, entry.TargetUserId, ex.Message)`
- No additional logging in `UserServices` beyond what already exists — audit service handles audit-specific logs.

## 9. Global Response Key Catalog (new keys for AC-30)

| Key | Pattern | Usage |
|---|---|---|
| `ERROR_AUDIT_WRITE_FAILED` | `ERROR_<Entity>_<StateOrReason>` | Audit persistence failure (logged, not thrown) |
| `INFORMATION_USER_PERMISSION_GRANTED` | `INFOMATION_<Entity>_<StateOrEvent>` | Permission grant audit event |

## 10. Data Model / Migration Impact

| Change | Type | Notes |
|---|---|---|
| New `AuditLogs` table | CREATE | PK int identity, FK to Users RESTRICT |
| No changes to existing tables | — | User/Permission/Role tables unchanged |

Migration must NOT modify existing tables. This is an additive migration only.

## 11. TDD Plan (Test-First Execution Order)

Execute tests in this order. Write failing tests first, then implement to pass.

### Phase 1 — Unit: Domain & Authorization (existing baseline, verify pass)
- `PermissionAuthorizationPolicyTests` — already exists, run to confirm baseline.
- `PermissioningUserBehaviorTests` — already exists, run to confirm baseline.

### Phase 2 — Unit: Audit Emission (new)
**File**: `test/ERP.Sso.Api.Tests.Integration/AuditLogs/UserAuditEmissionTests.cs`

| Test | Given | When | Then |
|---|---|---|---|
| `CreateUser_Audit` | Valid create request | `CreateUserAsync` succeeds | `AuditLog` record exists with `Action=Created`, correct `TargetUserId` |
| `UpdateUser_Audit` | Existing user, valid update | `UpdateUserAsync` succeeds | `AuditLog` record exists with `Action=Updated` |
| `DeactivateUser_Audit` | Active user | `DeactivateUserAsync` succeeds | `AuditLog` record exists with `Action=Deactivated` |
| `DeleteUser_Audit` | Existing user | `DeleteUserAsync` succeeds | `AuditLog` record exists with `Action=Deleted` |
| `ResetPassword_Audit` | Existing user | `ResetPasswordAsync` succeeds | `AuditLog` record exists with `Action=PasswordReset` |
| `AuditWrite_Fails_DoesNotThrow` | EF throws on `SaveChangesAsync` | `WriteAsync` called | No exception propagated to caller |

**File**: `test/ERP.Sso.Api.Tests.Integration/AuditLogs/PermissionAuditEmissionTests.cs`

| Test | Given | When | Then |
|---|---|---|---|
| `GrantPermission_Audit` | Valid user + permission | `GrantDirectPermission` succeeds | `AuditLog` record exists with `Action=PermissionGranted` |

### Phase 3 — Integration: Security Enforcement (new)
**File**: `test/ERP.Sso.Api.Tests.Integration/Security/UserSecurityEnforcementTests.cs`

Test class uses `PermissionAuthorizationHandler` directly (same pattern as existing `PermissionAuthorizationPolicyTests`).

| Test | Given | When | Then |
|---|---|---|---|
| `CreateUser_NoPermission_Fails` | User without `Users.Create` claim | Authorization evaluated | `HasFailed = true` |
| `UpdateUser_NoPermission_Fails` | User without `Users.Edit` claim | Authorization evaluated | `HasFailed = true` |
| `DeleteUser_NoPermission_Fails` | User without `Users.Delete` claim | Authorization evaluated | `HasFailed = true` |
| `DeactivateUser_NoPermission_Fails` | User without `Users.StatusChange` claim | Authorization evaluated | `HasFailed = true` |
| `ResetPassword_NoPermission_Fails` | User without `Users.Edit` claim | Authorization evaluated | `HasFailed = true` |
| `ViewUsers_WithPermission_Succeeds` | User with `Users.View` claim | Authorization evaluated | `HasSucceeded = true` |
| `DeleteUser_NoConfirm_Fails` | Valid authn, no `confirm=true` | `DeleteUser` handler invoked | Returns 400 with `ERROR_USER_CONFIRMATION_REQUIRED` |
| `DeleteUser_WithConfirm_Proceeds` | Valid authn + `confirm=true` | `DeleteUser` handler invoked | Returns 204 |
| `AdminWildcard_GrantsAllUserActions` | User with `2:**` wildcard claim | Authorization for any Users endpoint | `HasSucceeded = true` |

### Phase 4 — Existing Test Regression
- Re-run full test suite: `dotnet test test/ERP.Sso.Api.Tests.Integration/...`
- All previously passing tests must remain green after `AuditLogService` injection is added to `UserServices`.

## 12. BDD Scenarios → Test Mapping

| Scenario | Mapped Test |
|---|---|
| Given user without required policy — When calls protected endpoint — Then denied | `UserSecurityEnforcementTests.*_NoPermission_Fails` |
| Given admin resets another user password — When operation completes — Then audit record stored with identifiers + timestamp | `UserAuditEmissionTests.ResetPassword_Audit` |

## 13. Rollout / Rollback Strategy

- **Rollout**: Migration is additive (`AuditLogs` table added). Safe to deploy on running database.
- **Rollback**: Revert migration via `dotnet ef database update <previous-migration>`. No data loss to existing tables.
- **Feature flag**: Not required — this is hardening/compliance, not feature-flaggable.
- **Backward compatibility**: No existing API contracts change (except `DeleteUser` now requires `confirm=true`, which was already documented in the endpoint description).

## 14. Acceptance Verification

| AoC | Implementation Item | Verification |
|---|---|---|
| AOC-01: Deny-by-default and policy/object-scope across endpoints | `RequireAuthorization` on all user endpoints (verified already) + `UserSecurityEnforcementTests` | All `*_NoPermission_Fails` tests pass |
| AOC-02: Audit events for create/edit/reset/permission changes | `IAuditLogService` + `UserServices` + `PermissionService` emit events | `UserAuditEmissionTests` + `PermissionAuditEmissionTests` pass |
| AOC-03: Automated backend tests cover main and negative security paths | Phase 2 + Phase 3 test files | All new tests pass |

| DoD | Verification |
|---|---|
| DOD-01: Security controls active across targeted APIs | `UserSecurityEnforcementTests` passes (all 9 cases) |
| DOD-02: Mandatory audit events for all sensitive ops | `UserAuditEmissionTests` + `PermissionAuditEmissionTests` pass (6+1 cases) |
| DOD-03: Security and audit test suite passes with traceable evidence | CI test run output attached to MR |

## 15. GitFlow Context

- Branch: `features/be-04-security-audit-and-tests`
- Target: `develop`
- Workspace MR: https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/16
- Project MR (SSO): https://gitlab.com/next-top-tech/accounting/accounting-sso/-/merge_requests/5

---

## 16. TL Approval Gate

> **Approval Required** — implementation must NOT start until TL confirms below.

**Approval checklist:**
- [ ] Repository routing matrix accepted
- [ ] `AuditLog` entity design accepted (immutable, FK RESTRICT, no cascade)
- [ ] `IAuditLogService` contract accepted (fire-and-log, non-throwing on failure)
- [ ] Actor identity resolution strategy accepted (`IHttpContextAccessor` in infra services)
- [ ] `DeleteUser` confirm-gate approach accepted (handler-level, not service-level)
- [ ] Test plan and Phase ordering accepted
- [ ] No out-of-scope changes introduced

**Tech Lead Decision:** Approved

**Product Owner Decision:** Approved
