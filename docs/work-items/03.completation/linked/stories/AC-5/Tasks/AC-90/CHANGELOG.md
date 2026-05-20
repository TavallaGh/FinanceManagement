# AC-90 Implementation Changelog

**Task:** Implement Force Logout on Roles and Permissions Changes
**Status:** Completed
**Date:** 2026-05-19

---

## What Was Delivered

Force logout integration ensures that whenever role memberships, role permissions, or direct user permissions are mutated, the active sessions of all affected users are revoked within the same request lifecycle. This closes the security gap where users could retain valid tokens and cookie sessions even after their access rights changed.

### 1. Force Logout Domain Contract (`IUserService`)

- **Design/Approach:** Extended the existing `IUserService` domain contract with a new `ForceLogoutAsync` method rather than introducing a dedicated interface, keeping the DI surface minimal and the implementation consolidated.
- **Features:**
  - `Task ForceLogoutAsync(IReadOnlyCollection<int> userIds, CancellationToken)` added to `IUserService`
  - Empty-list guard: returns immediately with no side effects when `userIds` is empty
  - `INFORMATION_SESSION_FORCE_LOGOUT_COMPLETED` enum entry added to `GlobalResponseKey`
  - `ERROR_SESSION_FORCE_LOGOUT_FAILED` **not added** — exceptions propagate to callers directly

### 2. Force Logout Implementation (`UserServices`)

- **Design/Approach:** `ISessionManagementService` (from Duende IdentityServer SDK) injected via primary constructor. Combines two complementary revocation mechanisms to prevent stale-credential attacks.
- **Features:**
  - Calls `ISessionManagementService.RemoveSessionsAsync` per user with `RemoveServerSideSession: true`, `SendBackchannelLogoutNotification: true`, `RevokeTokens: true`
  - Calls `UserManager.UpdateSecurityStampAsync` per user to invalidate existing cookie sessions
  - Logs `ForceLogout started/completed` with user count at `Information` level
  - Exceptions propagate to the caller (swallowing is the caller's responsibility via fire-and-forget guard)

### 3. Role Permission Trigger (`RolePermissionService`)

- **Design/Approach:** `ForceLogoutAsync` is called as a direct `await` with no exception swallowing — a force logout failure surfaces as a request error.
- **Features:**
  - `IUserService` injected into `RolePermissionService` primary constructor
  - `SetRolePermissionsAsync` resolves all `UserRoles` members post-save and triggers `ForceLogoutAsync`
  - Applies to both the permission-update path and the `Clear: true` path

### 4. Role User Triggers (`RoleUserService`)

- **Design/Approach:** Same direct-await pattern at both assignment and removal trigger points.
- **Features:**
  - `IUserService` injected into `RoleUserService` primary constructor
  - `AssignUsersToRoleAsync` calls `ForceLogoutAsync` for newly assigned users after save
  - `RemoveUsersFromRoleAsync` calls `ForceLogoutAsync` for removed users after save

### 5. Direct Permission Trigger (`PermissionService`)

- **Design/Approach:** Same direct-await pattern; revokes the specific user’s sessions when their direct permission grant changes.
- **Features:**
  - `IUserService` injected into `PermissionService` primary constructor
  - `GrantDirectPermissionAsync` calls `ForceLogoutAsync([userId])` after save

### 6. DI Registration Correction (Unplanned — `VaultConfigurations`)

- **Design/Approach:** Discovered that `ISessionManagementService` was not registered in the BFF composition root despite existing in the Duende SDK.
- **Features:**
  - `.AddServerSideSessions()` added to the Duende IdentityServer builder in `VaultConfigurations.cs`
  - Ensures `ISessionManagementService` is available via DI at runtime in the BFF Gateway

---

## Files Changed

### Domain Layer
- **`GlobalResponseKey.cs`** *(EXTENDED)*
  - Added `INFORMATION_SESSION_FORCE_LOGOUT_COMPLETED` enum entry
  - `ERROR_SESSION_FORCE_LOGOUT_FAILED` was considered but not added — exceptions propagate instead of being swallowed
- **`IUserService.cs`** *(EXTENDED)*
  - Added `ForceLogoutAsync(IReadOnlyCollection<int> userIds, CancellationToken)` method signature

### Infrastructure Layer
- **`UserServices.cs`** *(EXTENDED)*
  - Implemented `ForceLogoutAsync`; `ISessionManagementService` added to constructor
- **`RolePermissionService.cs`** *(PATCHED)*
  - Injected `IUserService`; `SetRolePermissionsAsync` wired to trigger force logout post-save (direct `await`, no try-catch)
- **`RoleUserService.cs`** *(PATCHED)*
  - Injected `IUserService`; `AssignUsersToRoleAsync` and `RemoveUsersFromRoleAsync` wired to trigger force logout post-save (direct `await`, no try-catch)
- **`PermissionService.cs`** *(PATCHED)*
  - Injected `IUserService`; `GrantDirectPermissionAsync` calls `ForceLogoutAsync([userId])` post-save (direct `await`, no try-catch)

### Presentation Layer
- **`VaultConfigurations.cs`** *(PATCHED)*
  - Added `.AddServerSideSessions()` to register `ISessionManagementService` in DI

### Test Layer
- **`UserServicesForceLogoutTests.cs`** *(NEW)*
  - 4 unit tests covering empty-list guard, `RemoveSessionsAsync` per user, `UpdateSecurityStampAsync` per user, and exception propagation
- **`ForceLogoutIntegrationTests.cs`** *(NEW)*
  - 7 integration tests covering all four trigger points, exception propagation on failure, and empty-list behaviour
- **`SharedTestServices.cs`** *(EXTENDED)*
  - `CreateUserServices` gains optional `ISessionManagementService?` parameter; new `CreateRolePermissionServiceWithUserService`, `CreateRoleUserServiceWithUserService`, and `CreatePermissionServiceWithUserService` factory overloads added; `CreatePermissionService` wired with no-op mock `IUserService`
- **`UserServicesTests.cs`** *(PATCHED)*
  - `StubUserService` updated to implement `ForceLogoutAsync`
- **`RolePermissionServiceTests.cs`** *(PATCHED)*
  - `IUserService` mock wired into `RolePermissionService` test setup
- **`RoleUserServiceTests.cs`** *(PATCHED)*
  - `IUserService` mock wired into `RoleUserService` test setup
- **`RolePermissionEndpointTests.cs`** *(PATCHED)*
  - `StubUserService` stub updated for new interface method
- **`RoleEndpointSecurityTests.cs`** *(PATCHED)*
  - `StubUserService` stub updated for new interface method
