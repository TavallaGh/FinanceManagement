# AC-95 Implementation Changelog

**Task:** BE: Implement AuditLog Service
**Story:** AC-5 — MVP Infrastructures
**Status:** Completed
**Date:** 2026-05-15

---

## What Was Delivered

AC-95 delivers the full AuditLog service layer for the SSO system, enabling structured, fire-and-forget audit emission for every CRUD operation on Users, Roles, Role-User memberships, Role-Permission assignments, and direct Permission grants.

The implementation uses a typed-payload pattern (`AuditContext<TPayload>` + `IAuditLogSnapshot`) that keeps audit call sites clean and type-safe, while centralizing actor resolution, request metadata, and JSON serialization inside the service itself. Consumers only supply the typed snapshot objects; the service does the rest.

---

### 1. Domain Contracts and Typed Snapshot System

A new marker interface (`IAuditLogSnapshot`) enforces at compile time that only safe, purpose-built snapshot records can be used as audit payloads. The `AuditContext<TPayload>` generic record replaces any plan for a plain `AuditContext` DTO — callers now pass typed objects, not pre-serialized strings.

Five domain snapshot records were introduced alongside their owning domains:

- **`UserAuditSnapshot`** — Captures all non-sensitive User fields (excludes password hash, security stamp)
- **`RoleAuditSnapshot`** — Full role metadata including lifecycle dates and deprecation flag
- **`RolePermissionSnapshot`** — Role ID + permission key array for permission-set change audits
- **`RoleUserSnapshot`** — Role ID + user ID array for membership change audits
- **`PermissionSnapshot`** — User ID + permission key array for direct grant audits

**Design choice:** Snapshot records are defined in each domain's `Dtos/` folder (not in the AuditLogs domain) to keep domain ownership clear and avoid coupling domain entities to the audit infrastructure.

---

### 2. AuditLogService — Centralized Infrastructure Service

A new `AuditLogService` in the Infra layer implements `IAuditLogService` and centralizes four responsibilities that would otherwise be duplicated across every consuming service:

- **Actor resolution** — Reads `IHttpContextAccessor.GetCurrentUserId()`; automatically determines `ActorType` (User vs. System); consumer services do not need `IHttpContextAccessor` for audit purposes
- **Request metadata** — Extracts `IpAddress`, `UserAgent`, and `CorrelationId` from `HttpContext` internally
- **Payload serialization** — Serializes typed `TPayload` snapshots to JSON using `System.Text.Json`
- **Write-failure isolation** — All three log methods (`LogCreatedAsync`, `LogUpdatedAsync`, `LogDeletedAsync`) wrap `SaveChangesAsync` in `try/catch`; failures are logged at `Warning` with `ERROR_AUDIT_WRITE_FAILED` and swallowed; the primary operation is never blocked

An `actorType` override parameter on each method allows callers to force a specific actor classification when needed (e.g., `AuditActorType.User` in tests).

---

### 3. AuditLogFactory + ResolvedAuditContext (Infra Layer)

`AuditLogFactory` constructs the `AuditLog` entity from a `ResolvedAuditContext` — an internal record that carries fully serialized (string) payloads and resolved metadata. This two-step approach (typed context → resolved context → factory → entity) keeps:

- `AuditLogFactory` free from generics and serialization logic (pure construction, no I/O)
- `AuditLogService` as the single owner of the generic/serialization boundary
- `AuditLog.Create(...)` (the domain factory) invoked only through `AuditLogFactory`, not directly by consumers

Payload enforcement per action:
- `CreateForCreated` → forces `PreviousPayload = null`
- `CreateForUpdated` → passes both payloads through
- `CreateForDeleted` → forces `CurrentPayload = null`

---

### 4. Consumer Service Integration (5 Services, 12 Methods)

`IAuditLogService` is injected into all five write-path services. Audit calls are placed after each successful primary persistence operation, before the method returns.

| Service | Methods Audited |
|---|---|
| `UserServices` | `CreateUserAsync`, `UpdateUserAsync`, `DeactivateUserAsync`, `DeleteUserAsync`, `ResetPasswordAsync` |
| `RoleService` | `CreateRoleAsync`, `UpdateRoleAsync`, `DeactivateRoleAsync`, `DeleteRoleAsync` |
| `RoleUserService` | `AssignUsersToRoleAsync`, `RemoveUsersFromRoleAsync` |
| `RolePermissionService` | `SetRolePermissionsAsync` |
| `PermissionService` | `GrantDirectPermissionAsync` |

`DeactivateUserAsync` and `ResetPasswordAsync` capture both `PreviousPayload` and `CurrentPayload` via `UserAuditSnapshot` — a safer approach than the original plan's null-payload design, since `UserAuditSnapshot` excludes sensitive fields by construction.

---

### 5. DI Registration

`AuditLogFactory` (scoped) and `IAuditLogService → AuditLogService` (scoped) registered in `Injections.cs` (`AddIdentityServerModuleAsync`).

---

### 6. Test Coverage (18 new tests)

| Test File | Count | Scope |
|---|---|---|
| `AuditLogFactoryTests.cs` | 5 | Factory payload enforcement: payload nulling rules, actor-field nullability, metadata mapping |
| `AuditLogServiceIntegrationTests.cs` | 13 | Service integration: all TC-IDs (01–14), swallowed-exception scenario, end-to-end user-create flow |

`SharedTestServices` updated with `CreateAuditLogService()` helper and updated `CreateUserServices(IAuditLogService?)` overload.

---

## Files Changed

### Domain — AuditLogs Contracts & DTO
- **`IAuditLogSnapshot.cs`** *(NEW)* — Marker interface constraining all audit payload types
- **`AuditContext.cs`** *(NEW)* — Generic `AuditContext<TPayload>` record; replaces the planned plain DTO
- **`IAuditLogService.cs`** *(NEW)* — Service contract with generic typed methods and optional actor override

### Domain — Snapshot Records
- **`UserAuditSnapshot.cs`** *(NEW)* — Safe user state snapshot (no passwords/tokens)
- **`RoleAuditSnapshot.cs`** *(NEW)* — Role metadata snapshot
- **`RolePermissionSnapshot.cs`** *(NEW)* — Permission key array snapshot for role
- **`RoleUserSnapshot.cs`** *(NEW)* — User ID array snapshot for role
- **`PermissionSnapshot.cs`** *(NEW)* — Permission key array snapshot for direct grants

### Infra — AuditLog Service Implementation
- **`ResolvedAuditContext.cs`** *(NEW)* — Internal serialized-payload record bridging service → factory
- **`AuditLogFactory.cs`** *(NEW)* — Pure entity constructor; enforces per-action payload rules
- **`AuditLogService.cs`** *(NEW)* — Full `IAuditLogService` implementation; centralizes actor/metadata/serialization
- **`Injections.cs`** *(PATCHED)* — Added DI registrations for `AuditLogFactory` and `AuditLogService`

### Infra — Consumer Services
- **`UserServices.cs`** *(PATCHED)* — Injected `IAuditLogService`; 5 audit call sites added
- **`RoleService.cs`** *(PATCHED)* — Injected `IAuditLogService`; 4 audit call sites added
- **`RoleUserService.cs`** *(PATCHED)* — Injected `IAuditLogService`; 2 audit call sites added
- **`RolePermissionService.cs`** *(PATCHED)* — Injected `IAuditLogService`; 1 audit call site added
- **`PermissionService.cs`** *(PATCHED)* — Injected `IAuditLogService`; 1 audit call site added

### Tests
- **`AuditLogFactoryTests.cs`** *(NEW)* — 5 factory enforcement tests (TC-15, TC-16, TC-17 + extras)
- **`AuditLogServiceIntegrationTests.cs`** *(NEW)* — 13 service integration tests (TC-01 through TC-14 + swallow)
- **`SharedTestServices.cs`** *(PATCHED)* — `CreateAuditLogService()` helper and `CreateUserServices(IAuditLogService?)` overload
