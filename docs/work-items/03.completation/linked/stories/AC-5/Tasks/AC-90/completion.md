# AC-90 — Task Completion

## Summary

- **Task:** AC-90
- **Related Story:** AC-5 — MVP Infrastructures
- **Title:** Implement Force Logout on Roles and Permissions Changes
- **Scope:** BACK / INFRA (`accounting-sso`)
- **Status:** Completed — implementation and validation artifacts recorded; Jira/MR review-state transition pending via taskclose
- **Completed:** 2026-05-19
- **Generated At:** 2026-05-20T00:00:00.0000000+03:30

---

## Description

Extended the SSO service so that any mutation to role memberships, role permissions, or direct user permissions automatically revokes the active sessions of affected users within the same request lifecycle. Four trigger points are wired: `SetRolePermissionsAsync`, `AssignUsersToRoleAsync`, `RemoveUsersFromRoleAsync`, and `GrantDirectPermissionAsync`. Each trigger calls `ForceLogoutAsync` added to the `IUserService` domain contract.

Force logout combines two revocation mechanisms: Duende `ISessionManagementService.RemoveSessionsAsync` (server-side sessions, backchannel logout, and token revocation) and ASP.NET Identity `UserManager.UpdateSecurityStampAsync` (security stamp rotation to invalidate in-flight cookies). Exceptions from `ForceLogoutAsync` propagate to the caller — there is no swallowing at any call site. A failed force logout surfaces as a request error, giving callers clear signal that session revocation did not complete.

An unplanned deviation added `.AddServerSideSessions()` to `VaultConfigurations.cs` in the BFF presentation layer to ensure the required `ISessionManagementService` DI registration was present.

---

## Acceptance Criteria

| AoC | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AOC-01 | When role permissions are updated via `SetRolePermissionsAsync` (including `Clear: true`), all active persisted grants and security stamps for users assigned to that role are revoked within the same request lifecycle. | ✅ IMPLEMENTED | `RolePermissionService.SetRolePermissionsAsync` resolves all `UserRoles` members post-save and calls `userService.ForceLogoutAsync`; integration tests `SetRolePermissionsAsync_PermissionsChanged_ForceLogoutCalledForRoleMembers` and `SetRolePermissionsAsync_Clear_ForceLogoutCalledForRoleMembers` pass. |
| AOC-02 | When users are assigned to a role via `AssignUsersToRoleAsync`, the existing sessions of those newly assigned users are revoked immediately after the assignment is saved. | ✅ IMPLEMENTED | `RoleUserService.AssignUsersToRoleAsync` passes newly assigned user IDs to `userService.ForceLogoutAsync` post-save; integration test `AssignUsersToRoleAsync_ForceLogoutCalledForNewlyAssignedUsers` passes. |
| AOC-03 | When users are removed from a role via `RemoveUsersFromRoleAsync`, the existing sessions of those removed users are revoked immediately after the removal is saved. | ✅ IMPLEMENTED | `RoleUserService.RemoveUsersFromRoleAsync` passes removed user IDs to `userService.ForceLogoutAsync` post-save; integration test `RemoveUsersFromRoleAsync_ForceLogoutCalledForRemovedUsers` passes. |
| AOC-04 | Session revocation covers both Duende server-side sessions/backchannel logout/token revocation via `ISessionManagementService.RemoveSessionsAsync` and ASP.NET Identity security stamp rotation via `UserManager.UpdateSecurityStampAsync`. | ✅ IMPLEMENTED | `UserServices.ForceLogoutAsync` calls both `sessionManagementService.RemoveSessionsAsync` (with `RemoveServerSideSession: true`, `SendBackchannelLogoutNotification: true`, `RevokeTokens: true`) and `userManager.UpdateSecurityStampAsync`; unit tests `ForceLogoutAsync_WithUsers_CallsRemoveSessionsPerUser` and `ForceLogoutAsync_WithUsers_CallsUpdateSecurityStampPerUser` pass. |
| AOC-05 | Force logout failure surfaces as an exception to the caller — there is no silent swallowing at any call site. | ✅ IMPLEMENTED | All call sites invoke `ForceLogoutAsync` as a direct `await` with no try-catch; `SetRolePermissionsAsync_ForceLogoutFails_ExceptionPropagates` integration test verifies the exception propagates; `ForceLogoutAsync_SessionManagementThrows_ExceptionPropagated` unit test confirms `UserServices` itself propagates. |
| AOC-06 | `IUserService.ForceLogoutAsync` accepts `IReadOnlyCollection<int>` and performs persisted grant revocation and security stamp rotation for each user. | ✅ IMPLEMENTED | Method signature `Task ForceLogoutAsync(IReadOnlyCollection<int> userIds, CancellationToken)` added to `IUserService`; empty-list guard verified by `ForceLogoutAsync_EmptyList_IsNoOp` unit test. |
| AOC-07 | When direct permissions are granted to a user via `GrantDirectPermissionAsync`, the user's active sessions are revoked immediately after the permission change is saved. | ✅ IMPLEMENTED | `PermissionService.GrantDirectPermissionAsync` calls `userService.ForceLogoutAsync([userId])` post-save; integration test `GrantDirectPermissionAsync_ForceLogoutCalledForUser` passes. |

---

## Definition of Done

| DoD | Description | Status |
|-----|-------------|--------|
| DOD-01 | `ForceLogoutAsync(IReadOnlyCollection<int> userIds, CancellationToken)` method added to `IUserService` domain contract. | ✅ Done |
| DOD-02 | `UserServices` infra class implements `ForceLogoutAsync`; `ISessionManagementService` added to its constructor. | ✅ Done |
| DOD-03 | `RolePermissionService.SetRolePermissionsAsync` invokes `IUserService.ForceLogoutAsync` for all users of the affected role after the permission change is saved (direct await — exceptions propagate). | ✅ Done |
| DOD-04 | `RoleUserService.AssignUsersToRoleAsync` invokes `IUserService.ForceLogoutAsync` for the newly assigned users after the assignment is saved. | ✅ Done |
| DOD-05 | `RoleUserService.RemoveUsersFromRoleAsync` invokes `IUserService.ForceLogoutAsync` for the removed users after the removal is saved. | ✅ Done |
| DOD-06 | `PermissionService.GrantDirectPermissionAsync` invokes `IUserService.ForceLogoutAsync` for the affected user after the permission grant is saved. | ✅ Done |
| DOD-07 | Unit tests cover `UserServices.ForceLogoutAsync` for: success path, empty-list no-op, and exception propagation. | ✅ Done — 4 unit tests pass |
| DOD-08 | Integration tests verify that each trigger point (`SetRolePermissions`, `AssignUsers`, `RemoveUsers`, `GrantDirectPermission`) results in a `ForceLogoutAsync` call and that failures propagate. | ✅ Done — 7 integration tests pass |
| DOD-09 | `SharedTestServices` updated: `CreateUserServices` gains optional `ISessionManagementService?`; `CreateRolePermissionServiceWithUserService`, `CreateRoleUserServiceWithUserService`, `CreatePermissionServiceWithUserService` overloads added; `CreatePermissionService` wired with no-op mock `IUserService`. | ✅ Done |
| DOD-10 | Solution builds with no compilation errors after changes. | ✅ Done — see Tests section |
| DOD-11 | Code review completed and approved. | ⏳ Pending — taskclose (In Review) phase |

---

## Implementation Notes

### Files Changed

| File | Repository | Change |
|---|---|---|
| `src/01.Domain/ERP.Sso.Domain/Common/Errors/GlobalResponseKey.cs` | accounting-sso | `INFORMATION_SESSION_FORCE_LOGOUT_COMPLETED` enum entry retained; `ERROR_SESSION_FORCE_LOGOUT_FAILED` removed (no longer needed — exceptions propagate instead of being swallowed). |
| `src/01.Domain/ERP.Sso.Domain/Users/Contracts/IUserService.cs` | accounting-sso | Added `Task ForceLogoutAsync(IReadOnlyCollection<int> userIds, CancellationToken cancellationToken = default)` to the domain contract. |
| `src/03.Infra/ERP.Sso.Infra.Sql/Users/UserServices.cs` | accounting-sso | Implemented `ForceLogoutAsync`; added `ISessionManagementService` to the primary constructor. Calls `RemoveSessionsAsync` and `UpdateSecurityStampAsync` per user. |
| `src/03.Infra/ERP.Sso.Infra.Sql/Roles/RolePermissionService.cs` | accounting-sso | Injected `IUserService`; `SetRolePermissionsAsync` resolves all `UserRoles` members after save and calls `ForceLogoutAsync` as a direct `await` (no try-catch). |
| `src/03.Infra/ERP.Sso.Infra.Sql/Roles/RoleUserService.cs` | accounting-sso | Injected `IUserService`; `AssignUsersToRoleAsync` and `RemoveUsersFromRoleAsync` call `ForceLogoutAsync` for affected users after save as direct `await` calls (no try-catch). |
| `src/03.Infra/ERP.Sso.Infra.Sql/Permissions/PermissionService.cs` | accounting-sso | Injected `IUserService`; `GrantDirectPermissionAsync` calls `ForceLogoutAsync([userId])` after save as a direct `await`. |
| `src/04.Presentation/Gateway.BFF/ERP.Sso.BFF.Yarp/Extensions/VaultConfigurations.cs` | accounting-sso | **Unplanned deviation** — Added `.AddServerSideSessions()` to the Duende IdentityServer builder to register `ISessionManagementService` in the DI container (required for the new `UserServices` constructor dependency). |
| `test/ERP.Sso.Api.Tests.Integration/Users/UserServicesForceLogoutTests.cs` | accounting-sso | **New file** — Unit tests for `UserServices.ForceLogoutAsync` (empty-list guard, per-user `RemoveSessionsAsync`, per-user `UpdateSecurityStampAsync`, exception propagation). |
| `test/ERP.Sso.Api.Tests.Integration/Users/ForceLogoutIntegrationTests.cs` | accounting-sso | **New file** — Integration tests for all four force logout trigger points and exception propagation on failure. |
| `test/ERP.Sso.Api.Tests.Integration/Users/UserServicesTests.cs` | accounting-sso | Updated `StubUserService` to implement the new `ForceLogoutAsync` method added to `IUserService`. |
| `test/ERP.Sso.Api.Tests.Integration/Roles/RolePermissionServiceTests.cs` | accounting-sso | Wired mock `IUserService` into `RolePermissionService` test setup via updated `SharedTestServices`. |
| `test/ERP.Sso.Api.Tests.Integration/Roles/RoleUserServiceTests.cs` | accounting-sso | Wired mock `IUserService` into `RoleUserService` test setup via updated `SharedTestServices`. |
| `test/ERP.Sso.Api.Tests.Integration/Roles/RolePermissionEndpointTests.cs` | accounting-sso | Updated `StubUserService` stub to implement the new `ForceLogoutAsync` interface method. |
| `test/ERP.Sso.Api.Tests.Integration/Roles/RoleEndpointSecurityTests.cs` | accounting-sso | Updated `StubUserService` stub to implement the new `ForceLogoutAsync` interface method. |
| `test/ERP.Sso.Api.Tests.Integration/Supports/SharedTestServices.cs` | accounting-sso | `CreateUserServices` gains optional `ISessionManagementService?` parameter; `CreateRolePermissionServiceWithUserService`, `CreateRoleUserServiceWithUserService`, and `CreatePermissionServiceWithUserService` overloads added; `CreatePermissionService` updated to wire no-op mock `IUserService`. |

### Key Design Decisions

1. **`IUserService` extension over new interface** — `ForceLogoutAsync` was added directly to `IUserService` rather than introducing a dedicated `IForceLogoutService`. This avoids unnecessary interface proliferation since force logout is scoped to user-identity operations and re-uses the existing DI binding.
2. **Direct `await` at all call sites — no exception swallowing** — `UserServices.ForceLogoutAsync` propagates exceptions to the caller, and all call sites (`RolePermissionService`, `RoleUserService`, `PermissionService`) invoke it as a plain `await` with no try-catch. A force logout failure surfaces as a request error, ensuring the caller is notified rather than silently swallowing a security-critical failure.
3. **Dual revocation** — Both `ISessionManagementService.RemoveSessionsAsync` (Duende: server-side session, backchannel logout, token revocation) and `UserManager.UpdateSecurityStampAsync` (cookie invalidation) are applied per user to ensure no stale credential path remains.
4. **Unplanned `.AddServerSideSessions()` in VaultConfigurations** — The Duende DI pipeline required this call to register `ISessionManagementService`; without it, the container resolved no implementation at runtime despite the method existing in the SDK.

---

## Tests

- **Automated tests (ForceLogout filter):**
  ```
  dotnet test ERP.Sso.slnx --filter "ForceLogout|UserServicesForceLogout"
  ```
  **Result: Passed — 11 succeeded, 0 failed, 0 skipped**

  | # | Test Name | Suite |
  |---|-----------|-------|
  | 1 | GIVEN an empty user list WHEN ForceLogoutAsync is called THEN no session management calls are made | UserServicesForceLogoutTests |
  | 2 | GIVEN a list of user IDs WHEN ForceLogoutAsync is called THEN RemoveSessionsAsync is called once per user with correct SubjectId | UserServicesForceLogoutTests |
  | 3 | GIVEN a list of user IDs WHEN ForceLogoutAsync is called THEN UpdateSecurityStampAsync is called once per user | UserServicesForceLogoutTests |
  | 4 | GIVEN a session management service that throws WHEN ForceLogoutAsync is called THEN the exception propagates | UserServicesForceLogoutTests |
  | 5 | GIVEN role members WHEN SetRolePermissionsAsync changes permissions THEN ForceLogoutAsync is called for all role members | ForceLogoutIntegrationTests |
  | 6 | GIVEN role members WHEN SetRolePermissionsAsync clears permissions THEN ForceLogoutAsync is called for all role members | ForceLogoutIntegrationTests |
  | 7 | GIVEN users being assigned to a role WHEN AssignUsersToRoleAsync is called THEN ForceLogoutAsync is called for newly assigned users | ForceLogoutIntegrationTests |
  | 8 | GIVEN users being removed from a role WHEN RemoveUsersFromRoleAsync is called THEN ForceLogoutAsync is called for removed users | ForceLogoutIntegrationTests |
  | 9 | GIVEN a ForceLogout failure WHEN SetRolePermissionsAsync is called THEN the exception propagates | ForceLogoutIntegrationTests |
  | 10 | GIVEN a role with no members WHEN SetRolePermissionsAsync is called THEN ForceLogoutAsync is called with an empty list | ForceLogoutIntegrationTests |
  | 11 | GIVEN a user WHEN GrantDirectPermissionAsync is called THEN ForceLogoutAsync is called for that user | ForceLogoutIntegrationTests |

- **Build validation:** Solution build succeeded — commit `8c8b512` compiles cleanly with zero errors. All updated `StubUserService` implementations satisfy the extended `IUserService` contract.

- **Manual verification steps:**
  1. Run `dotnet test ERP.Sso.slnx --no-build --filter "ForceLogout|UserServicesForceLogout"` and confirm 10/10 pass.
  2. Build the full solution (`dotnet build ERP.Sso.slnx`) and confirm zero compilation errors.
  3. Verify `ISessionManagementService` is resolved at runtime by running the IDP host and confirming no DI resolution failure on startup.

---

## Traceability

- **Jira Task:** https://nexttoptech.atlassian.net/browse/AC-90
- **Parent Story:** https://nexttoptech.atlassian.net/browse/AC-5
- **Workspace GitLab Issue:** https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/work_items/24
- **Workspace MR:** https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/49
- **Project (SSO) GitLab Issue:** https://gitlab.com/next-top-tech/accounting/accounting-sso/-/work_items/9
- **Project (SSO) MR:** https://gitlab.com/next-top-tech/accounting/accounting-sso/-/merge_requests/14
- **Source Branch:** `technicals/implement-force-logout-on-roles-and-permissions-changes`
- **Target Branch:** `develop`
- **Implementation Commit:** `8c8b512` (2026-05-19)
- **Postman Collection:** N/A — no new HTTP endpoints introduced; this is a server-side session management enhancement.

---

## Outstanding Items

- Task close phase (`scripts/taskclose.ps1`) is still required to transition Jira AC-90 to `In Review`, mark both MRs as Ready, post the Jira completion comment, and add web links.
- Reviewer approval and PO sign-off remain outside this phase-1 completion artifact.
- DOD-10 (code review) is pending reviewer gate via taskclose.
