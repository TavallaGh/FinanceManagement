# Implementation Plan: AC-95 — BE: Implement AuditLog Service

## 1. Task Identity

| Field | Value |
|---|---|
| Jira Task | [AC-95](https://nexttoptech.atlassian.net/browse/AC-95) |
| Parent Story | [AC-5 — MVP Infrastructures](https://nexttoptech.atlassian.net/browse/AC-5) |
| Fix Version | V 0.1 (MVP) |
| Labels | Backend |
| Status at Plan Date | In Progress |
| Repository Target | `accounting-sso` |
| Plan Created | 2026-05-14 |

---

## 2. Scope and Assumptions

### In Scope
- Define `IAuditLogService` contract in the Domain layer (`01.Domain`)
- Implement `AuditLogService` in the Infra/Sql layer (`03.Infra`)
- Implement factory-based audit creation flows for `Created`, `Updated`, and `Deleted` CRUD actions
- Introduce `AuditContext` DTO to carry actor, request metadata, and correlation into the service
- Integrate `IAuditLogService` into `UserServices`, `RoleService`, and `PermissionService`
- Add audit integration into `RoleUserService` (assign/remove) and `RolePermissionService` (set permissions)
- Update `SharedTestServices` test helper to support `IAuditLogService` injection
- Add unit tests for `AuditLogService` factory resolution, payload serialization, metadata handling
- Add integration tests for persistence flow for each CRUD action and each target type
- Update existing service integration tests to assert audit persistence

### Out of Scope
- Introducing new `AuditAction` values beyond the existing CRUD actions (Created, Updated, Deleted)
- External audit streaming or event-sourcing integrations
- Frontend or API contract changes
- Introducing new entity types to `AuditTargetType`
- Refactoring unrelated business logic in any service

### Assumptions
- `AuditLog` domain entity (from AC-94) is already implemented and available with its full EF Core configuration
- `ErpIdsDbContext.AuditLogs` DbSet is already wired and migration is applied
- `IHttpContextAccessor` is available for injection across infrastructure services
- Services must write audit records as a fire-and-forget `try/catch` guard — audit write failure must NOT bubble into the primary operation response; it must be swallowed, logged with `ERROR_AUDIT_WRITE_FAILED`, and the primary flow must complete successfully

---

## 3. Repository Routing Matrix

| Artifact Category | Repository | Path |
|---|---|---|
| Domain contract `IAuditLogService` | `accounting-sso` | `src/01.Domain/ERP.Sso.Domain/AuditLogs/Contracts/` |
| Domain marker `IAuditLogSnapshot` | `accounting-sso` | `src/01.Domain/ERP.Sso.Domain/AuditLogs/Contracts/` |
| Domain DTO `AuditContext<TPayload>` | `accounting-sso` | `src/01.Domain/ERP.Sso.Domain/AuditLogs/Dtos/` |
| Domain snapshot `UserAuditSnapshot` | `accounting-sso` | `src/01.Domain/ERP.Sso.Domain/Users/Dtos/` |
| Domain snapshot `RoleAuditSnapshot` | `accounting-sso` | `src/01.Domain/ERP.Sso.Domain/Roles/Dtos/` |
| Domain snapshot `RolePermissionSnapshot` | `accounting-sso` | `src/01.Domain/ERP.Sso.Domain/Roles/Dtos/` |
| Domain snapshot `RoleUserSnapshot` | `accounting-sso` | `src/01.Domain/ERP.Sso.Domain/Roles/Dtos/` |
| Domain snapshot `PermissionSnapshot` | `accounting-sso` | `src/01.Domain/ERP.Sso.Domain/Permissions/Dtos/` |
| Infra `AuditLogService` (impl) | `accounting-sso` | `src/03.Infra/ERP.Sso.Infra.Sql/AuditLogs/` |
| Infra `AuditLogFactory` (factory) | `accounting-sso` | `src/03.Infra/ERP.Sso.Infra.Sql/AuditLogs/` |
| Infra `ResolvedAuditContext` (internal) | `accounting-sso` | `src/03.Infra/ERP.Sso.Infra.Sql/AuditLogs/` |
| DI registration | `accounting-sso` | `src/03.Infra/ERP.Sso.Infra.Sql/Injections.cs` |
| Consumer updates (UserServices) | `accounting-sso` | `src/03.Infra/ERP.Sso.Infra.Sql/Users/UserServices.cs` |
| Consumer updates (RoleService) | `accounting-sso` | `src/03.Infra/ERP.Sso.Infra.Sql/Roles/RoleService.cs` |
| Consumer updates (RoleUserService) | `accounting-sso` | `src/03.Infra/ERP.Sso.Infra.Sql/Roles/RoleUserService.cs` |
| Consumer updates (RolePermissionService) | `accounting-sso` | `src/03.Infra/ERP.Sso.Infra.Sql/Roles/RolePermissionService.cs` |
| Consumer updates (PermissionService) | `accounting-sso` | `src/03.Infra/ERP.Sso.Infra.Sql/Permissions/PermissionService.cs` |
| Unit tests | `accounting-sso` | `test/ERP.Sso.Domain.Test/AuditLogs/` |
| Integration tests — AuditLog Service | `accounting-sso` | `test/ERP.Sso.Api.Tests.Integration/AuditLogs/` |
| Integration tests — service consumers | `accounting-sso` | `test/ERP.Sso.Api.Tests.Integration/Users/` and `.../Roles/` and `.../Permissions/` |
| Workspace implementation plan | `accounting-workspace` | `docs/work-items/02.implementation/stories/AC-5/tasks/AC-95-implementation-plan.md` |

---

## 4. Domain Hierarchy Map (AuditLogs domain)

```
src/
  01.Domain/
    ERP.Sso.Domain/
      AuditLogs/                          ← entity-centric folder name (= entity name)
        Contracts/
          IAuditLogService.cs             ← IMPLEMENTED (generic TPayload signature)
          IAuditLogSnapshot.cs            ← IMPLEMENTED (NEW — marker interface for payload types)
        Dtos/
          AuditContext.cs                 ← IMPLEMENTED (generic AuditContext<TPayload> record)
        Entities/
          AuditLog.cs                     (existing)
          AuditLog.Behaviors.cs           (existing)
        Enums/
          AuditAction.cs                  (existing)
          AuditActorType.cs               (existing)
          AuditTargetType.cs              (existing)
      Users/
        Dtos/
          UserAuditSnapshot.cs            ← IMPLEMENTED (NEW — implements IAuditLogSnapshot)
      Roles/
        Dtos/
          RoleAuditSnapshot.cs            ← IMPLEMENTED (NEW — implements IAuditLogSnapshot)
          RolePermissionSnapshot.cs       ← IMPLEMENTED (NEW — implements IAuditLogSnapshot)
          RoleUserSnapshot.cs             ← IMPLEMENTED (NEW — implements IAuditLogSnapshot)
      Permissions/
        Dtos/
          PermissionSnapshot.cs           ← IMPLEMENTED (NEW — implements IAuditLogSnapshot)
  02.Application/
    ERP.Sso.Application/
      (No changes required — audit emission is in infra services, not MediatR handlers)
  03.Infra/
    ERP.Sso.Infra.Sql/
      AuditLogs/                          ← entity-centric folder name (= entity name)
        AuditLogFactory.cs                ← IMPLEMENTED (takes ResolvedAuditContext, not AuditContext)
        AuditLogService.cs                ← IMPLEMENTED (implements IAuditLogService; resolves actor/metadata internally)
        ResolvedAuditContext.cs           ← IMPLEMENTED (NEW — internal serialized context record)
      Configurations/
        AuditLogs/
          AuditLogConfiguration.cs        (existing, no changes required)
  04.Presentation/
    (No changes required for this task)
```

---

## 5. New Files and Contracts Blueprint

### 5.0 `IAuditLogSnapshot` Marker Interface — Domain Layer (NEW)

**File:** `src/01.Domain/ERP.Sso.Domain/AuditLogs/Contracts/IAuditLogSnapshot.cs`

Purpose: Marker interface that all audit payload types must implement. Enforces type safety at the generic constraint level — callers cannot pass arbitrary objects as audit payloads.

```csharp
public interface IAuditLogSnapshot { }
```

All domain snapshot records implement this interface:
- `UserAuditSnapshot` (in `Users/Dtos/`)
- `RoleAuditSnapshot` (in `Roles/Dtos/`)
- `RolePermissionSnapshot` (in `Roles/Dtos/`)
- `RoleUserSnapshot` (in `Roles/Dtos/`)
- `PermissionSnapshot` (in `Permissions/Dtos/`)

---

### 5.1 `AuditContext<TPayload>` DTO — Domain Layer (REVISED: now generic)

**File:** `src/01.Domain/ERP.Sso.Domain/AuditLogs/Dtos/AuditContext.cs`

**Design change from plan:** `AuditContext` is now a generic record `AuditContext<TPayload>` where `TPayload : class, IAuditLogSnapshot`. Actor identity, IP address, user agent, and correlation ID are **NOT** carried in `AuditContext` — they are resolved internally by `AuditLogService` from `IHttpContextAccessor`.

```csharp
public sealed record AuditContext<TPayload>(
    AuditTargetType TargetType,
    DateTimeOffset OccurredOnUtc,
    int? ActorUserId = null,
    TPayload? PreviousPayload = default,
    TPayload? CurrentPayload = default,
    string? Details = null) where TPayload : class, IAuditLogSnapshot;
```

Removed properties (resolved by service, not callers):
- `ActorType` — determined automatically from `IHttpContextAccessor.GetCurrentUserId()`
- `ActorUserName` — resolved from `HttpContext.User.Identity.Name`
- `IpAddress`, `UserAgent`, `CorrelationId` — resolved from `HttpContext`

---

### 5.2 `IAuditLogService` Contract — Domain Layer (REVISED: generic signature)

**File:** `src/01.Domain/ERP.Sso.Domain/AuditLogs/Contracts/IAuditLogService.cs`

**Design change from plan:** Methods are now generic with typed `TPayload` and include an optional `actorType` override parameter.

```csharp
public interface IAuditLogService
{
    Task LogCreatedAsync<TPayload>(AuditContext<TPayload> context, AuditActorType? actorType = null, CancellationToken cancellationToken = default) where TPayload : class, IAuditLogSnapshot;
    Task LogUpdatedAsync<TPayload>(AuditContext<TPayload> context, AuditActorType? actorType = null, CancellationToken cancellationToken = default) where TPayload : class, IAuditLogSnapshot;
    Task LogDeletedAsync<TPayload>(AuditContext<TPayload> context, AuditActorType? actorType = null, CancellationToken cancellationToken = default) where TPayload : class, IAuditLogSnapshot;
}
```

Key constraint: `actorType` is optional; if not provided, service resolves from `IHttpContextAccessor` automatically (User if `GetCurrentUserId() > 0`, otherwise System).

---

### 5.3 `ResolvedAuditContext` — Infra Layer (NEW — not in original plan)

**File:** `src/03.Infra/ERP.Sso.Infra.Sql/AuditLogs/ResolvedAuditContext.cs`

Purpose: Internal record that separates the serialized (string) representation of payloads from the typed `AuditContext<TPayload>`. `AuditLogService` serializes the typed payloads and produces a `ResolvedAuditContext` to pass to `AuditLogFactory`. This keeps the factory free from generics and serialization logic.

```csharp
public sealed record ResolvedAuditContext(
    AuditTargetType TargetType,
    DateTimeOffset OccurredOnUtc,
    AuditActorType? ActorType = null,
    int? ActorUserId = null,
    string? ActorUserName = null,
    string? PreviousPayload = null,
    string? CurrentPayload = null,
    string? Details = null,
    string? IpAddress = null,
    string? UserAgent = null,
    string? CorrelationId = null);
```

---

### 5.4 `AuditLogFactory` — Infra Layer (REVISED: takes ResolvedAuditContext)

**File:** `src/03.Infra/ERP.Sso.Infra.Sql/AuditLogs/AuditLogFactory.cs`

**Design change from plan:** Factory now takes `ResolvedAuditContext` (pre-serialized strings) instead of the typed `AuditContext`. Serialization is done upstream in `AuditLogService.Resolve()`. The factory remains a pure construction helper with no I/O.

Methods:
- `AuditLog CreateForCreated(ResolvedAuditContext ctx)` — sets `PreviousPayload = null`, uses `ctx.CurrentPayload`
- `AuditLog CreateForUpdated(ResolvedAuditContext ctx)` — uses both `PreviousPayload` and `CurrentPayload`
- `AuditLog CreateForDeleted(ResolvedAuditContext ctx)` — uses `ctx.PreviousPayload`, sets `CurrentPayload = null`

---

### 5.5 `AuditLogService` — Infra Layer (REVISED: centralizes metadata resolution)

**File:** `src/03.Infra/ERP.Sso.Infra.Sql/AuditLogs/AuditLogService.cs`

**Design change from plan:** `AuditLogService` injects `IHttpContextAccessor` directly and centralizes ALL actor/metadata resolution. Consumer services do **NOT** need to inject `IHttpContextAccessor` solely for audit purposes.

Constructor dependencies:
- `ErpIdsDbContext context`
- `AuditLogFactory factory`
- `ILogger<AuditLogService> logger`
- `IHttpContextAccessor httpContextAccessor`

Private `Resolve<TPayload>(AuditContext<TPayload> ctx, AuditActorType? actorType)` method:
1. Calls `httpContextAccessor.GetCurrentUserId()` to determine actor
2. Resolves `ActorType` = provided `actorType` ?? (`userId > 0` ? `User` : `System`)
3. Resolves `ActorUserId` = `ctx.ActorUserId` ?? (`userId > 0` ? `userId` : null)
4. Resolves `ActorUserName`, `IpAddress`, `UserAgent`, `CorrelationId` from `HttpContext`
5. Serializes `PreviousPayload` and `CurrentPayload` via `JsonSerializer.Serialize`
6. Returns `ResolvedAuditContext` passed to the factory

Private `SerializePayload<TPayload>()` helper: returns `null` for null payload, otherwise `JsonSerializer.Serialize(payload)`.

---

### 5.6 Domain Snapshot Types — Domain Layer (NEW — not in original plan)

These typed snapshot records capture the entity state at a point in time and implement `IAuditLogSnapshot`. They live in each domain's `Dtos/` folder.

| Type | File | Fields |
|---|---|---|
| `UserAuditSnapshot` | `Users/Dtos/UserAuditSnapshot.cs` | Id, UserName, Email, EmailConfirmed, PhoneNumber, PhoneNumberConfirmed, TwoFactorEnabled, LockoutEnd, LockoutEnabled, AccessFailedCount, UserType, IsActive, LastLoginUtc, ForceChangePassword, ExternalSubjectId, ExternalIssuer + static `From(User)` |
| `RoleAuditSnapshot` | `Roles/Dtos/RoleAuditSnapshot.cs` | Id, Name, LabelEn, LabelFa, DescriptionEn, DescriptionFa, SystemCode, StartDate, EndDate, IsActive, Deprecated, CreatedAt, UpdatedAt + static `From(Role)` |
| `RolePermissionSnapshot` | `Roles/Dtos/RolePermissionSnapshot.cs` | RoleId, PermissionKeys (string[]) |
| `RoleUserSnapshot` | `Roles/Dtos/RoleUserSnapshot.cs` | RoleId, UserIds (int[]) |
| `PermissionSnapshot` | `Permissions/Dtos/PermissionSnapshot.cs` | UserId, PermissionKeys (string[]) |

**Security note:** `UserAuditSnapshot` deliberately excludes `PasswordHash`, `SecurityStamp`, and any token fields. No sensitive fields are serialized into audit payloads.

---

## 6. Consumer Integration Blueprint

Each of the following services injects `IAuditLogService` and calls the appropriate method after a successful primary persistence operation. Audit calls go AFTER the primary `SaveChanges` / Identity manager call succeeds and BEFORE the method returns. **Actor identity, IP address, and correlation ID are resolved by `AuditLogService` internally — callers do not need to assemble these.**

### 6.1 `UserServices` — Audit Calls (IMPLEMENTED)

Payload type: `AuditContext<UserAuditSnapshot>` — uses `UserAuditSnapshot.From(user)` static factory.

| Method | Audit Call | Action | Payloads |
|---|---|---|---|
| `CreateUserAsync` | `LogCreatedAsync` | `Created` | `CurrentPayload = UserAuditSnapshot.From(entity)` |
| `UpdateUserAsync` | `LogUpdatedAsync` | `Updated` | `PreviousPayload = snapshot before update`, `CurrentPayload = UserAuditSnapshot.From(user)` |
| `DeactivateUserAsync` | `LogUpdatedAsync` | `Updated` | `PreviousPayload = snapshot before deactivate`, `CurrentPayload = UserAuditSnapshot.From(user)` |
| `DeleteUserAsync` | `LogDeletedAsync` | `Deleted` | `PreviousPayload = snapshot before delete` |
| `ResetPasswordAsync` | `LogUpdatedAsync` | `Updated` | `PreviousPayload = snapshot before reset`, `CurrentPayload = UserAuditSnapshot.From(user)` |

> Note: `IHttpContextAccessor` is **NOT** injected by `UserServices` for audit purposes — actor resolution is done by `AuditLogService`. Password fields are never in `UserAuditSnapshot`.

### 6.2 `RoleService` — Audit Calls (IMPLEMENTED)

Payload type: `AuditContext<RoleAuditSnapshot>` — uses `RoleAuditSnapshot.From(role)`.

| Method | Audit Call | Action | Payloads |
|---|---|---|---|
| `CreateRoleAsync` | `LogCreatedAsync` | `Created` | `CurrentPayload = RoleAuditSnapshot.From(role)` |
| `UpdateRoleAsync` | `LogUpdatedAsync` | `Updated` | `PreviousPayload = snapshot before`, `CurrentPayload = RoleAuditSnapshot.From(role)` |
| `DeactivateRoleAsync` | `LogUpdatedAsync` | `Updated` | `PreviousPayload = snapshot before`, `CurrentPayload = RoleAuditSnapshot.From(role)` |
| `DeleteRoleAsync` | `LogDeletedAsync` | `Deleted` | `PreviousPayload = RoleAuditSnapshot.From(role)` |

### 6.3 `RoleUserService` — Audit Calls (IMPLEMENTED)

Payload type: `AuditContext<RoleUserSnapshot>`.

| Method | Audit Call | Action | Payloads |
|---|---|---|---|
| `AssignUsersToRoleAsync` | `LogUpdatedAsync` | `Updated` | `CurrentPayload = RoleUserSnapshot(roleId, assignedUserIds[])` |
| `RemoveUsersFromRoleAsync` | `LogUpdatedAsync` | `Updated` | `PreviousPayload = RoleUserSnapshot(roleId, removedUserIds[])` |

> Note: `RoleUserService` does NOT inject `IHttpContextAccessor` — actor resolution is delegated to `AuditLogService`.

### 6.4 `RolePermissionService` — Audit Calls (IMPLEMENTED)

Payload type: `AuditContext<RolePermissionSnapshot>`.

| Method | Audit Call | Action | Payloads |
|---|---|---|---|
| `SetRolePermissionsAsync` | `LogUpdatedAsync` | `Updated` | `CurrentPayload = RolePermissionSnapshot(roleId, permissionKeys[])` |

### 6.5 `PermissionService` — Audit Calls (IMPLEMENTED)

Payload type: `AuditContext<PermissionSnapshot>`.

| Method | Audit Call | Action | Payloads |
|---|---|---|---|
| `GrantDirectPermissionAsync` | `LogCreatedAsync` | `Created` | `CurrentPayload = PermissionSnapshot(userId, permissionKeys[])` |

---

## 7. Actor Resolution Pattern (REVISED — centralized in AuditLogService)

**Design change from plan:** Actor resolution is **NOT** the responsibility of consumer services. `AuditLogService` handles all actor resolution internally in its private `Resolve<TPayload>()` method.

`AuditLogService` resolves actor identity as follows:
```
// Centralized in AuditLogService.Resolve() — not in consumer services
var userId = httpContextAccessor.GetCurrentUserId();
ActorType = actorType ?? (userId > 0 ? AuditActorType.User : AuditActorType.System)
ActorUserId = ctx.ActorUserId ?? (userId > 0 ? userId : null)
ActorUserName = httpContextAccessor.HttpContext?.User?.Identity?.Name
```

Consumer services can optionally override `ActorType` by passing the `actorType` parameter to the service method. No `IHttpContextAccessor` injection is required in consumer services solely for audit.

**Removed from plan:** Consumer services (`UserServices`, `RoleService`, `RoleUserService`) do **NOT** need `IHttpContextAccessor` injected for audit purposes. The original plan incorrectly required this injection in each service.

---

- `UserServices` currently does NOT inject `IHttpContextAccessor` — ~~it must be added to its primary constructor~~ **NOT required for audit; AuditLogService handles this**
- `RolePermissionService` already injects `IHttpContextAccessor` (for other purposes)
- `RoleService` does NOT inject it — **NOT required for audit purposes**
- `RoleUserService` does NOT inject it — **NOT required for audit purposes**

---

## 8. Request Metadata Resolution Pattern (REVISED — centralized in AuditLogService)

**Design change from plan:** `IpAddress`, `UserAgent`, and `CorrelationId` are resolved by `AuditLogService.Resolve()` — **not** by consumer services and **not** via a per-service helper.

`AuditLogService` resolves these via injected `IHttpContextAccessor`:
```
// Centralized in AuditLogService.Resolve() — not in consumer services
IpAddress = httpContextAccessor.GetIpAddress()
UserAgent = httpContextAccessor.GetUserAgent()
CorrelationId = httpContextAccessor.GetCorrelationId()
```

The original plan's requirement to add a `ResolveRequestMetadata()` private method in each consumer service is **superseded** by the centralized approach in `AuditLogService`.

---

## 9. Payload Serialization Pattern (REVISED — centralized in AuditLogService)

**Design change from plan:** Serialization is **NOT** done in consumer services. `AuditLogService` serializes the typed `TPayload` in `SerializePayload<TPayload>()` before passing a `ResolvedAuditContext` to the factory.

Consumer services pass typed snapshot objects (`UserAuditSnapshot`, `RoleAuditSnapshot`, etc.) directly into `AuditContext<TPayload>`. `AuditLogService` calls `JsonSerializer.Serialize(payload)` internally.

Rules still apply:
- Payloads must never contain: passwords, tokens, raw secrets, hashes
- `UserAuditSnapshot` explicitly excludes `PasswordHash` and `SecurityStamp`
- Snapshot for `PreviousPayload` (delete/update) must be taken before the destructive operation

---

## 10. DI Registration

**File:** `src/03.Infra/ERP.Sso.Infra.Sql/Injections.cs`

Add to `AddIdentityServerModuleAsync`:
```
// (pseudocode - not source code)
context.Services.AddScoped<AuditLogFactory>();
context.Services.AddScoped<IAuditLogService, AuditLogService>();
```

---

## 11. Data Model / Migration Impact

**No new migration required.** `AuditLog` entity and `AuditLogs` table already exist and were provisioned by AC-94 migrations. This task adds only service-level logic; no schema changes are needed.

---

## 12. Security and Privacy Controls

| Control | Rule |
|---|---|
| Password fields in payloads | FORBIDDEN — never serialize password hash, SecurityStamp, password text into audit payload |
| PII in audit logs | `ActorUserName` and `ActorUserId` are structured fields; audit payload for User must use `UserSummaryDto` which excludes sensitive fields |
| Audit service error exposure | Audit write failures must NOT leak exception details to API response; must be caught and logged internally only |
| Audit record tampering | Audit records are immutable (no update/delete service methods provided); `AuditLog` entity has private setters |
| InjectionI risk in payloads | `JsonSerializer.Serialize` is safe; no dynamic SQL or raw string concatenation in payloads |

Abuse-case checks:
- **Audit bypass:** Consumer services must call `IAuditLogService` in a finally-adjacent pattern — after successful primary write, before return; no path skips the call
- **Audit flooding:** Service boundaries are one-call-per-CRUD-operation; no bulk write loop exposed
- **Actor spoofing:** Actor identity comes from `IHttpContextAccessor` (server-side claims); not from request body

---

## 13. Observability Requirements

### Structured Log Events (mandatory per method boundary)

| Method | Level | Message Template | Structured Fields |
|---|---|---|---|
| `LogCreatedAsync` entry | Info | `"Audit log created started. ActorType: {ActorType}, TargetType: {TargetType}, ActorUserId: {ActorUserId}"` | `ActorType`, `TargetType`, `ActorUserId` |
| `LogCreatedAsync` success | Info | `"Audit log created completed. AuditLogId: {AuditLogId}"` | `AuditLogId` |
| `LogCreatedAsync` failure | Warning | `"Audit write failed. ResponseKey: {ResponseKey}"` | `ResponseKey` |
| `LogUpdatedAsync` entry | Info | same pattern | same |
| `LogUpdatedAsync` success | Info | same pattern | same |
| `LogUpdatedAsync` failure | Warning | same pattern | same |
| `LogDeletedAsync` entry | Info | same pattern | same |
| `LogDeletedAsync` success | Info | same pattern | same |
| `LogDeletedAsync` failure | Warning | same pattern | same |

Consumer services must also log:
- After successful primary write: `"[Entity] [action] completed. EntityId: {EntityId}, AuditEmitted: true"` (or `false` if audit call is swallowed)

---

## 14. GlobalResponseKey Catalog

The following response keys apply to this task. Existing keys confirmed present in `GlobalResponseKey.cs`:

| Key | Pattern | Purpose |
|---|---|---|
| `ERROR_AUDIT_WRITE_FAILED` | `ERROR_<Entity>_<StateOrReason>` | Audit persistence failure (non-fatal) |

No new response keys are required for this task. All informational keys for User/Role/Permission CRUD operations already exist.

---

## 15. TDD Plan

### Execution Order (test-first, mandatory)

1. **Unit: `AuditLogFactory` tests** — verify correct `AuditLog` entity shape for Created/Updated/Deleted (uses `ResolvedAuditContext`)
2. **Unit: `AuditLogService` tests** — verify logging calls, swallowed exceptions, non-rethrowing behavior (mock `DbContext`)
3. **Integration: `AuditLogService` persistence tests** — extend existing `AuditLogPersistenceTests.cs`
4. **Integration: `UserServices` audit integration tests** — `UserServicesTests.cs` + new audit assertion file
5. **Integration: `RoleService` audit integration tests**
6. **Integration: `RoleUserService` audit integration tests**
7. **Integration: `PermissionService` audit integration tests** (if applicable write methods exist)

### Test Case Mapping

| TC-ID | Test Class | Test Method Pattern | Expected Assertion |
|---|---|---|---|
| TC-01 | `AuditLogs/AuditLogServiceIntegrationTests.cs` | `CreateUser_Flow_PersistsExactlyOneCreatedAuditRecord` | 1 AuditLog, `Action=Created`, `TargetType=User`, `CurrentPayload` set, `ActorType=User`, IpAddress, CorrelationId |
| TC-02 | `AuditLogs/AuditLogServiceIntegrationTests.cs` | `UpdateUser_Flow_PersistsExactlyOneUpdatedAuditRecord` | 1 AuditLog, `Action=Updated`, both payloads set |
| TC-03 | `AuditLogs/AuditLogServiceIntegrationTests.cs` | `DeleteUser_Flow_PersistsExactlyOneDeletedAuditRecord` | 1 AuditLog, `Action=Deleted`, `PreviousPayload` set |
| TC-04 | `AuditLogs/AuditLogServiceIntegrationTests.cs` | `CreateRole_Flow_PersistsExactlyOneCreatedAuditRecord_WithRoleTargetType` | `TargetType=Role` |
| TC-05 | `AuditLogs/AuditLogServiceIntegrationTests.cs` | `UpdateRole_Flow_PersistsExactlyOneUpdatedAuditRecord` | both payloads set |
| TC-06 | `AuditLogs/AuditLogServiceIntegrationTests.cs` | `DeleteRole_Flow_PersistsExactlyOneDeletedAuditRecord` | `PreviousPayload` set |
| TC-07 | `AuditLogs/AuditLogServiceIntegrationTests.cs` | `CreatePermission_Flow_PersistsExactlyOneCreatedAuditRecord` | `TargetType=Permission` |
| TC-08 | `AuditLogs/AuditLogServiceIntegrationTests.cs` | `UpdatePermission_Flow_PersistsExactlyOneUpdatedAuditRecord` | both payloads |
| TC-09 | `AuditLogs/AuditLogServiceIntegrationTests.cs` | `DeletePermission_Flow_PersistsExactlyOneDeletedAuditRecord` | `PreviousPayload` set |
| TC-10 | `Users/UserServicesTests.cs` | `CreateUser_UsesNewAuditService_NotManualAuditCreation` | No manual `AuditLog.Create` calls in UserServices |
| TC-11 | `AuditLogs/AuditLogServiceIntegrationTests.cs` | `ActorFields_ArePassedCorrectly_ForAuthenticatedUserOperation` | ActorUserId, ActorUserName populated |
| TC-12 | `AuditLogs/AuditLogServiceIntegrationTests.cs` | `ActorFields_AreNullable_ForSystemOrServiceDrivenOperations` | ActorUserId null, ActorType = System |
| TC-13 | `AuditLogs/AuditLogServiceIntegrationTests.cs` | `RequestMetadata_IpAddressAndUserAgent_ArePersistedCorrectly` | IpAddress, UserAgent match injected test values |
| TC-14 | `AuditLogs/AuditLogServiceIntegrationTests.cs` | `CorrelationId_IsPersistedCorrectly` | CorrelationId matches test value |
| TC-15 | `AuditLogs/AuditLogFactoryTests.cs` (Integration test project) | `CreateForCreated_Does_Not_Persist_PreviousPayload` | `PreviousPayload == null` |
| TC-16 | `AuditLogs/AuditLogFactoryTests.cs` (Integration test project) | `CreateForUpdated_Persists_Both_PreviousAndCurrentPayload` | both non-null |
| TC-17 | `AuditLogs/AuditLogFactoryTests.cs` (Integration test project) | `CreateForDeleted_Does_Not_Persist_CurrentPayload` | `CurrentPayload == null` |
| TC-18 | existing test files | update existing User/Role/Permission tests to assert audit | `context.AuditLogs.Count() == 1` post-operation |
| TC-19 | solution build + `dotnet test` | build + test success | no regressions |

---

## 16. BDD Scenarios

### Scenario 1 — User Create Audit
```
Given: A valid CreateUserRequest is submitted
When: UserServices.CreateUserAsync completes successfully
Then: Exactly one AuditLog is persisted with
  - Action = Created
  - TargetType = User
  - ActorType = User
  - ActorUserId set from HttpContext sub claim
  - CurrentPayload = JSON-serialized UserSummaryDto
  - PreviousPayload = null
  - IpAddress, UserAgent, CorrelationId populated from HttpContext
```

### Scenario 2 — User Update Audit
```
Given: An existing user is updated via UpdateUserAsync
When: The update completes successfully
Then: Exactly one AuditLog is persisted with
  - Action = Updated
  - TargetType = User
  - PreviousPayload = JSON snapshot of user before change
  - CurrentPayload = JSON-serialized updated UserSummaryDto
```

### Scenario 3 — User Delete Audit
```
Given: An existing user is deleted via DeleteUserAsync
When: The delete completes successfully
Then: Exactly one AuditLog is persisted with
  - Action = Deleted
  - TargetType = User
  - PreviousPayload = JSON snapshot of user before delete
  - CurrentPayload = null
```

### Scenario 4 — Audit Write Failure is Swallowed
```
Given: The audit persistence layer throws an unexpected exception (simulated in test)
When: A consuming service method (e.g., CreateUserAsync) triggers audit logging
Then:
  - Primary operation response is NOT affected (user is still created)
  - Exception is caught by AuditLogService
  - Warning log with ERROR_AUDIT_WRITE_FAILED is emitted
  - No exception is thrown from the consuming service
```

### Scenario 5 — System Actor Audit
```
Given: An operation is triggered without an authenticated HttpContext user (system/service flow)
When: AuditLogService.LogCreatedAsync is called with ActorType = System, ActorUserId = null
Then:
  - AuditLog is persisted with ActorType = System
  - ActorUserId and ActorUserName are null
  - No mapping or validation failure occurs
```

### Scenario 6 — Role Audit Created
```
Given: A valid CreateRoleRequest is submitted
When: RoleService.CreateRoleAsync completes
Then: Exactly one AuditLog is persisted with
  - Action = Created
  - TargetType = Role
  - CurrentPayload = JSON-serialized RoleSummaryDto
```

### Scenario 7 — Factory Payload Guard: Created Action
```
Given: AuditLogFactory.CreateForCreated is called
When: PreviousPayload is provided in the AuditContext
Then: The produced AuditLog entity has PreviousPayload = null (factory enforces this)
```

---

## 17. Rollout and Rollback Strategy

| Phase | Action |
|---|---|
| Rollout | Deploy as part of MVP Infra story delivery; no feature flag required — audit emission is internal and non-user-facing |
| Rollback | If audit service causes a primary operation regression (should not occur due to swallow pattern), roll back to previous version; no schema rollback needed |
| Feature flag | Not required; `IAuditLogService` is DI-injected and can be replaced with a no-op stub for emergency rollback without code change if needed |
| Migration | No migration required for this task |

---

## 18. AoC / DoD Traceability Matrix

| AoC / DoD Item | Implementation / Verification Target |
|---|---|
| AOC-01: AuditLogService implemented | `AuditLogService.cs` created in `03.Infra` |
| AOC-02: Factory-based flow implemented | `AuditLogFactory.cs` created |
| AOC-03: Created action | `LogCreatedAsync` + `CreateForCreated` |
| AOC-04: Updated action | `LogUpdatedAsync` + `CreateForUpdated` |
| AOC-05: Deleted action | `LogDeletedAsync` + `CreateForDeleted` |
| AOC-06: Payload serialization | `System.Text.Json.JsonSerializer.Serialize` in consumer services; factory ensures PreviousPayload/CurrentPayload rules |
| AOC-07: Actor metadata | `IHttpContextAccessor` resolution in all consumers; `AuditContext.ActorUserId/ActorUserName/ActorType` |
| AOC-08: Request metadata | `IpAddress`, `UserAgent` from HttpContext in consumers |
| AOC-09: CorrelationId | `HttpContext.TraceIdentifier` passed as `CorrelationId` |
| AOC-10: All relevant services integrated | UserServices, RoleService, RoleUserService, RolePermissionService, PermissionService (write methods) |
| AOC-11: Existing tests updated | AuditLog assertions added to existing `UserServicesTests`, `RoleServiceTests`, etc. |
| AOC-12: New tests added | `AuditLogFactoryTests.cs`, `AuditLogServiceIntegrationTests.cs` |
| AOC-13: Solution builds | `dotnet build` runs clean after all changes |
| DOD-07: Code review completed | Enforced by MR reviewer gate (Claude review) |
| DOD-08: No audit compilation warnings | Verified by `dotnet build` output |

---

## 19. Implementation Dependencies

| Dependency | Status |
|---|---|
| `AuditLog` domain entity (AC-94) | ✅ Complete — entity, enums, EF config, migrations all exist |
| `ErpIdsDbContext.AuditLogs` DbSet | ✅ Complete |
| `IHttpContextAccessor` DI availability | ✅ Present (already used in `RolePermissionService`) |
| `GlobalResponseKey.ERROR_AUDIT_WRITE_FAILED` | ✅ Present in `GlobalResponseKey.cs` |
| `HttpContextExtensions.GetCurrentUserId()` | ✅ Present in domain helpers |

---

## 20. Handoff Checklist for `/speckit.implement`

### Implemented (code changes done)
- [x] Create `src/01.Domain/ERP.Sso.Domain/AuditLogs/Contracts/IAuditLogSnapshot.cs` — NEW marker interface
- [x] Create `src/01.Domain/ERP.Sso.Domain/AuditLogs/Dtos/AuditContext.cs` — generic `AuditContext<TPayload>`
- [x] Create `src/01.Domain/ERP.Sso.Domain/AuditLogs/Contracts/IAuditLogService.cs` — generic signature with optional `actorType`
- [x] Create `src/01.Domain/ERP.Sso.Domain/Users/Dtos/UserAuditSnapshot.cs`
- [x] Create `src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RoleAuditSnapshot.cs`
- [x] Create `src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RolePermissionSnapshot.cs`
- [x] Create `src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RoleUserSnapshot.cs`
- [x] Create `src/01.Domain/ERP.Sso.Domain/Permissions/Dtos/PermissionSnapshot.cs`
- [x] Create `src/03.Infra/ERP.Sso.Infra.Sql/AuditLogs/ResolvedAuditContext.cs` — NEW internal record
- [x] Create `src/03.Infra/ERP.Sso.Infra.Sql/AuditLogs/AuditLogFactory.cs` — takes `ResolvedAuditContext`
- [x] Create `src/03.Infra/ERP.Sso.Infra.Sql/AuditLogs/AuditLogService.cs` — centralizes actor/metadata/serialization
- [x] Update `Injections.cs` — register `AuditLogFactory` and `IAuditLogService`
- [x] Update `UserServices.cs` — inject `IAuditLogService`; add audit calls to all 5 methods
- [x] Update `RoleService.cs` — inject `IAuditLogService`; add audit calls to 4 methods
- [x] Update `RoleUserService.cs` — inject `IAuditLogService`; add audit calls to assign/remove methods
- [x] Update `RolePermissionService.cs` — inject `IAuditLogService`; add audit call to `SetRolePermissionsAsync`
- [x] Update `PermissionService.cs` — inject `IAuditLogService`; add audit call to `GrantDirectPermissionAsync`
- [x] Create `test/ERP.Sso.Api.Tests.Integration/AuditLogs/AuditLogFactoryTests.cs`
- [x] Create `test/ERP.Sso.Api.Tests.Integration/AuditLogs/AuditLogServiceIntegrationTests.cs`
- [x] `test/ERP.Sso.Api.Tests.Integration/AuditLogs/AuditLogPersistenceTests.cs` (extended)

### Remaining
- [ ] Update `SharedTestServices.cs` to support `IAuditLogService` in test hosts where needed
- [ ] Update existing integration test files to add audit persistence assertions (TC-18: Users/, Roles/, Permissions/)
- [ ] Run `dotnet build` — confirm clean
- [ ] Run `dotnet test` — confirm all tests pass (TC-19)
