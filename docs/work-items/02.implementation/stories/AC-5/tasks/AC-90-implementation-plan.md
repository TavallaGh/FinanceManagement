# Implementation Plan: AC-90 — Implement Force Logout on Roles and Permissions Changes

## ✅ Readiness Gate: APPROVED — TL Approval Confirmed 2026-05-19

> AoC, DoD, and Test Cases approved as proposed. Jira AC-90 fields to be updated post-implementation.

## ✅ Implementation Complete — Commit `8c8b512` (2026-05-19)

> Branch: `technicals/implement-force-logout-on-roles-and-permissions-changes`
> All planned DoD items delivered. See Section 18 for as-built deviations from the original plan.

---

## 1. Task Identity

| Field | Value |
|---|---|
| Jira Task | [AC-90](https://nexttoptech.atlassian.net/browse/AC-90) |
| Parent Story | [AC-5 — MVP Infrastructures](https://nexttoptech.atlassian.net/browse/AC-5) |
| Fix Version | V 0.1 (MVP) |
| Labels | Backend |
| Branch Type | `technicals` (no Epic assigned — per policy treated as technicals) |
| Source Branch | `technicals/implement-force-logout-on-roles-and-permissions-changes` |
| Target Branch | `develop` |
| Workspace GitLab Issue | https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/work_items/24 |
| Workspace GitLab MR | https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/49 |
| SSO GitLab Issue | https://gitlab.com/next-top-tech/accounting/accounting-sso/-/work_items/9 |
| SSO GitLab MR | https://gitlab.com/next-top-tech/accounting/accounting-sso/-/merge_requests/14 |
| Plan Created | 2026-05-19 |
| Repository Target | `accounting-sso` |

---

## 2. Proposed AoC (⚠️ TL APPROVAL REQUIRED)

> These are derived from the task description and codebase analysis. They must be reviewed and updated in Jira before implementation starts.

| # | Acceptance Criterion |
|---|---|
| AOC-01 | When role permissions are updated via `SetRolePermissionsAsync` (including `Clear: true`), all active persisted grants and security stamps for users assigned to that role are revoked within the same request lifecycle. |
| AOC-02 | When users are assigned to a role via `AssignUsersToRoleAsync`, the existing sessions of those newly assigned users are revoked immediately after the assignment is saved. |
| AOC-03 | When users are removed from a role via `RemoveUsersFromRoleAsync`, the existing sessions of those removed users are revoked immediately after the removal is saved. |
| AOC-04 | Session revocation covers both: (a) Duende server-side sessions, backchannel logout notifications, and token revocation via `ISessionManagementService.RemoveSessionsAsync` with `RemoveServerSideSession: true`, `SendBackchannelLogoutNotification: true`, `RevokeTokens: true` and (b) ASP.NET Identity security stamp rotation (`UserManager.UpdateSecurityStampAsync`). |
| AOC-05 | Force logout failure (exception from Duende or UserManager) propagates to the caller — there is no silent swallowing at any call site. A failed force logout surfaces as a request error. |
| AOC-06 | `IUserService.ForceLogoutAsync` accepts a collection of internal user IDs (`IReadOnlyCollection<int>`) and performs persisted grant revocation + security stamp rotation for each user. |
| AOC-07 | When direct permissions are granted to a user via `GrantDirectPermissionAsync`, the user's active sessions are revoked immediately after the permission change is saved. |

---

## 3. Proposed DoD (⚠️ TL APPROVAL REQUIRED)

| # | Definition of Done |
|---|---|
| DOD-01 | `ForceLogoutAsync(IReadOnlyCollection<int> userIds, CancellationToken)` method is added to `IUserService` domain contract. |
| DOD-02 | `UserServices` infra class implements `ForceLogoutAsync`; `ISessionManagementService` is added to its constructor. |
| DOD-03 | `RolePermissionService.SetRolePermissionsAsync` invokes `IUserService.ForceLogoutAsync` for all users of the affected role after the permission change is saved (direct `await` — exceptions propagate). |
| DOD-04 | `RoleUserService.AssignUsersToRoleAsync` invokes `IUserService.ForceLogoutAsync` for the newly assigned users after the assignment is saved. |
| DOD-05 | `RoleUserService.RemoveUsersFromRoleAsync` invokes `IUserService.ForceLogoutAsync` for the removed users after the removal is saved. |
| DOD-06 | `PermissionService.GrantDirectPermissionAsync` invokes `IUserService.ForceLogoutAsync` for the affected user after the permission grant is saved. |
| DOD-07 | Unit tests cover `UserServices.ForceLogoutAsync` for: success path, empty-list no-op, and exception propagation. |
| DOD-08 | Integration tests verify that each trigger point (`SetRolePermissions`, `AssignUsers`, `RemoveUsers`, `GrantDirectPermission`) results in a `ForceLogoutAsync` call and that failures propagate. |
| DOD-09 | `SharedTestServices` updated: `CreateUserServices` gains optional `ISessionManagementService?`; `CreateRolePermissionServiceWithUserService`, `CreateRoleUserServiceWithUserService`, `CreatePermissionServiceWithUserService` overloads added; `CreatePermissionService` wired with no-op mock `IUserService`. |
| DOD-10 | Solution builds with no compilation errors after changes. |
| DOD-11 | Code review completed and approved. |

---

## 4. Proposed Test Cases (⚠️ TL APPROVAL REQUIRED)

| # | Test Case | Expected Result |
|---|---|---|
| TC-01 | `SetRolePermissionsAsync` with permission changes → force logout called for all role members | Sessions revoked for all `UserRoles` members of the role |
| TC-02 | `SetRolePermissionsAsync` with `Clear: true` → force logout called for all role members | Sessions revoked even on full-clear |
| TC-03 | `AssignUsersToRoleAsync` → force logout called for newly assigned users | Sessions revoked only for the newly assigned users |
| TC-04 | `RemoveUsersFromRoleAsync` → force logout called for removed users | Sessions revoked only for the removed users |
| TC-05 | `UserServices.ForceLogoutAsync` when `ISessionManagementService` throws → exception propagates to caller; caller receives the exception | Exception propagates from all call sites |
| TC-06 | `UserServices.ForceLogoutAsync` with empty user list → no call to session management service | Early return, no error |
| TC-07 | `UserServices.ForceLogoutAsync` with N users → `RemoveSessionsAsync` called N times with correct subjectId strings | Each user's grants revoked independently |
| TC-08 | `GrantDirectPermissionAsync` → force logout called for the affected user after the permission grant is saved | Session revoked for the specific user |

---

## 5. Scope and Assumptions

### In Scope
- Add `ForceLogoutAsync` method to existing `IUserService` domain contract
- Implement `ForceLogoutAsync` in existing `UserServices` injecting Duende's `IPersistedGrantService` and ASP.NET `UserManager<User>`
- Update `RolePermissionService.SetRolePermissionsAsync` to trigger force logout post-save via `IUserService`
- Update `RoleUserService.AssignUsersToRoleAsync` to trigger force logout post-save via `IUserService`
- Update `RoleUserService.RemoveUsersFromRoleAsync` to trigger force logout post-save via `IUserService`
- Update `PermissionService.GrantDirectPermissionAsync` to trigger force logout post-save via `IUserService`
- No new DI registration (re-uses existing `IUserService` → `UserServices` registration)
- Unit tests in `ERP.Sso.Api.Tests.Integration/Users/` (placed alongside integration tests — see Section 18)
- Integration tests in `ERP.Sso.Api.Tests.Integration/Users/`
- `SharedTestServices` helper update (existing `CreateUserServices` already available)

### Out of Scope
- No new domain interfaces or `Sessions/` folder (extending `IUserService` directly)
- No new database entities or migrations (uses existing Duende `PersistedGrantDbContext`)
- No new DI registrations (re-uses existing `IUserService` → `UserServices` binding)
- No frontend or API contract changes
- No changes to `PermissionProfileService` (IProfileService)
- No changes to login/logout UI flow
- No changes to existing `AuditLogService`
- No changes to `RoleService`
- No notification mechanism (no email/push on forced logout)

### Assumptions
- `ISessionManagementService` from `Duende.IdentityServer.Services` is available via DI (already registered by `NT.IDP.BaseIdentityServer`)
- `UserManager<User>` is already injected into `UserServices` and available for re-use
- Subject ID in Duende IdentityServer is the user's integer ID as a string (`userId.ToString()`)
- `RolePermissionService` and `RoleUserService` will inject `IUserService` (not currently injected — requires adding to their constructors)
- `RoleUserService` can resolve user IDs for a role from `UserRoles` table at trigger points
- Exceptions from `ForceLogoutAsync` propagate to the caller — no silent swallowing at any call site

---

## 6. Repository Routing Matrix

| Artifact | Repository | Path |
|---|---|---|
| Update `IUserService` contract | `accounting-sso` | `src/01.Domain/ERP.Sso.Domain/Users/Contracts/IUserService.cs` |
| Update `UserServices` implementation | `accounting-sso` | `src/03.Infra/ERP.Sso.Infra.Sql/Users/UserServices.cs` |
| Update `RolePermissionService` | `accounting-sso` | `src/03.Infra/ERP.Sso.Infra.Sql/Roles/RolePermissionService.cs` |
| Update `RoleUserService` | `accounting-sso` | `src/03.Infra/ERP.Sso.Infra.Sql/Roles/RoleUserService.cs` |
| Update `PermissionService` | `accounting-sso` | `src/03.Infra/ERP.Sso.Infra.Sql/Permissions/PermissionService.cs` |
| Unit tests | `accounting-sso` | `test/ERP.Sso.Api.Tests.Integration/Users/UserServicesForceLogoutTests.cs` |
| Integration tests | `accounting-sso` | `test/ERP.Sso.Api.Tests.Integration/Users/ForceLogoutIntegrationTests.cs` |
| `SharedTestServices` update | `accounting-sso` | `test/ERP.Sso.Api.Tests.Integration/Supports/SharedTestServices.cs` |
| Workspace implementation plan | `accounting-workspace` | `docs/work-items/02.implementation/stories/AC-5/tasks/AC-90-implementation-plan.md` |

---

## 7. Domain Hierarchy Map (Users domain — extended)

```
src/
  01.Domain/
    ERP.Sso.Domain/
      Users/
        Contracts/
          IUserService.cs                     ← UPDATED — add ForceLogoutAsync method
  02.Application/
    ERP.Sso.Application/
      (No changes — force logout is infrastructure-level, not application command/query)
  03.Infra/
    ERP.Sso.Infra.Sql/
      Users/
        UserServices.cs                       ← UPDATED — implement ForceLogoutAsync
                                                (ISessionManagementService added to constructor)
      Roles/
        RolePermissionService.cs              ← UPDATED — inject IUserService, call ForceLogoutAsync
        RoleUserService.cs                    ← UPDATED — inject IUserService, call ForceLogoutAsync
      Permissions/
        PermissionService.cs                  ← UPDATED — inject IUserService, call ForceLogoutAsync
      Injections.cs                           ← NO CHANGE (IUserService already registered)
  04.Presentation/
    Gateway.BFF/
      ERP.Sso.BFF.Yarp/Extensions/
        VaultConfigurations.cs                ← UPDATED (unplanned — see Section 18)
test/
  ERP.Sso.Api.Tests.Integration/
    Users/                                    ← existing folder
      UserServicesForceLogoutTests.cs         ← NEW (placed here instead of Domain.Test — see Section 18)
      ForceLogoutIntegrationTests.cs          ← NEW
      UserServicesTests.cs                    ← UPDATED (StubUserService stub fix)
    Roles/
      RolePermissionServiceTests.cs           ← UPDATED (mock IUserService wired in)
      RoleUserServiceTests.cs                 ← UPDATED (mock IUserService wired in)
      RolePermissionEndpointTests.cs          ← UPDATED (StubUserService stub fix)
      RoleEndpointSecurityTests.cs            ← UPDATED (StubUserService stub fix)
    Supports/
      SharedTestServices.cs                   ← UPDATED — CreateUserServices gains
                                                 ISessionManagementService? parameter;
                                                 CreateRolePermissionServiceWithUserService,
                                                 CreateRoleUserServiceWithUserService, and
                                                 CreatePermissionServiceWithUserService added;
                                                 CreatePermissionService wired with no-op mock
```

---

## 8. Blueprint: Files, Contracts, and Interfaces

### 8.1 `IUserService` — Domain Layer (UPDATE)

**File:** `src/01.Domain/ERP.Sso.Domain/Users/Contracts/IUserService.cs`

**Change:** Add one method to the existing interface:

```
Task ForceLogoutAsync(IReadOnlyCollection<int> userIds, CancellationToken cancellationToken = default);
```

**Behavior contract:**
- If `userIds` is empty, returns immediately with no action.
- For each user ID, resolves subject ID as `userId.ToString()`.
- Calls `IPersistedGrantService.RemoveAllGrantsAsync(subjectId)`.
- Calls `UserManager.UpdateSecurityStampAsync(user)` for each user.
- Any exception propagates to the caller — no swallowing at the `UserServices` level.

---

### 8.2 `UserServices` — Infra Layer (UPDATE)

**File:** `src/03.Infra/ERP.Sso.Infra.Sql/Users/UserServices.cs`

**Change:** Add `ISessionManagementService sessionManagementService` to the primary constructor (alongside existing `ErpIdsDbContext`, `UserManager<User>`, `ILogger`, `IAuditLogService` dependencies). `UserManager<User>` is already present.

**Implementation of `ForceLogoutAsync`:**
- Guard: if `userIds` is null or empty, return immediately.
- Load users in a single query: `context.Users.Where(u => userIds.Contains(u.Id)).ToListAsync()`.
- For each user:
  - Call `sessionManagementService.RemoveSessionsAsync(new RemoveSessionsContext { SubjectId = user.Id.ToString(), RemoveServerSideSession = true, SendBackchannelLogoutNotification = true, RevokeTokens = true, RevokeConsents = false })`.
  - Call `userManager.UpdateSecurityStampAsync(user)`.
- Log `Information` at start: `"Force logout started for {UserCount} user(s)."`.
- Log `Information` at end: `"INFORMATION_SESSION_FORCE_LOGOUT_COMPLETED UserCount: {UserCount}"`.

---

### 8.3 `RolePermissionService` — Integration Point (UPDATE)

**File:** `src/03.Infra/ERP.Sso.Infra.Sql/Roles/RolePermissionService.cs`

**Change:** Add `IUserService userService` to primary constructor.

**Trigger point in `SetRolePermissionsAsync`:**
- After `context.SaveChangesAsync()` completes successfully (both clear and set paths).
- Resolve all current user IDs for the role from `context.UserRoles.Where(ur => ur.RoleId == roleId).Select(ur => ur.UserId).ToArrayAsync()`.
- Call directly: `await userService.ForceLogoutAsync(memberIds, cancellationToken);` — no try-catch, exceptions propagate.

---

### 8.4 `RoleUserService` — Integration Point (UPDATE)

**File:** `src/03.Infra/ERP.Sso.Infra.Sql/Roles/RoleUserService.cs`

**Change:** Add `IUserService userService` to primary constructor.

**Trigger points:**

`AssignUsersToRoleAsync`:
- After `context.SaveChangesAsync()` for new assignments.
- Call directly: `await userService.ForceLogoutAsync(newAssignments, cancellationToken);` — no try-catch.

`RemoveUsersFromRoleAsync`:
- After `context.SaveChangesAsync()` for the removals.
- Call directly: `await userService.ForceLogoutAsync(removedUserIds, cancellationToken);` — no try-catch.

---

### 8.5 `PermissionService` — Integration Point (UPDATE)

**File:** `src/03.Infra/ERP.Sso.Infra.Sql/Permissions/PermissionService.cs`

**Change:** Add `using ERP.Sso.Domain.Users.Contracts;` and `IUserService userService` to primary constructor.

**Trigger point in `GrantDirectPermissionAsync`:**
- After `context.SaveChangesAsync()` and before audit logging.
- Call directly: `await userService.ForceLogoutAsync([userId], cancellationToken);` — no try-catch.

---

### 8.6 `Injections.cs` — DI Registration (NO CHANGE)

`IUserService → UserServices` is already registered. Only the `UserServices` constructor gains a new `IPersistedGrantService` parameter, which is already registered by `NT.IDP.BaseIdentityServer`. No additional DI entries required.

---

### 8.7 `SharedTestServices` — Test Helper (UPDATE)

**File:** `test/ERP.Sso.Api.Tests.Integration/Supports/SharedTestServices.cs`

Update the existing `CreateUserServices` factory overload to accept an optional `ISessionManagementService? sessionManagementService = null` parameter:
- Default to a no-op `Mock<ISessionManagementService>().Object` substitute when not provided.
- Add `CreateRolePermissionServiceWithUserService` and `CreateRoleUserServiceWithUserService` overloads that inject a real or mock `IUserService` instance.
- The default `CreateRolePermissionService`, `CreateRoleUserService`, and `CreatePermissionService` overloads use `new Mock<IUserService>().Object` for the injected `IUserService`.
- `CreatePermissionServiceWithUserService` overload added for tests that verify `ForceLogoutAsync` call behaviour.

---

## 9. Response Key Catalog

| Key | Pattern | Usage |
|---|---|---|
| `INFORMATION_SESSION_FORCE_LOGOUT_COMPLETED` | `INFOMATION_<Entity>_<StateOrEvent>` | Logged at `Information` when force logout completes successfully for N users |

> Note: The `INFOMATION_` prefix intentional per codebase naming pattern (`GlobalResponseKey` enum spelling).
> `ERROR_SESSION_FORCE_LOGOUT_FAILED` was originally proposed but **not added** — exceptions propagate instead of being swallowed, so a dedicated error response key is unnecessary.

---

## 10. Security and Privacy Controls

| Control | Detail |
|---|---|
| No secrets in logs | Log only `UserCount`, `RoleId` — never user tokens or grant IDs |
| Revocation completeness | Both `ISessionManagementService.RemoveSessionsAsync` (server-side sessions, backchannel logout, token revocation) AND security stamp rotation are applied to prevent stale cookie attacks |
| Exception propagation | Force logout failure propagates as a request error — callers receive clear signal that session revocation did not complete |
| Scope guard | `IUserService.ForceLogoutAsync` must only be called from within role/permission mutation operations |
| No user enumeration | `RemoveSessionsAsync` accepts subject IDs; no user identity data is exposed in logs |

**Abuse case checks:**
- AC-1: Bulk role permission change revoking thousands of sessions simultaneously — implementation must be non-blocking (async, no sync-over-async) and tolerate partial failures per user without aborting the full loop.
- AC-2: Force logout of an already-logged-out user — `RemoveSessionsAsync` on a user with no active sessions must be a no-op (Duende handles this gracefully).

---

## 11. Observability Requirements

| Requirement | Detail |
|---|---|
| `UserServices.ForceLogoutAsync` | Log `Information` at start: `"ForceLogout started. UserCount: {UserCount}"` |
| `UserServices.ForceLogoutAsync` | Log `Information` at completion: `"ForceLogout completed. UserCount: {UserCount}"` |
| `RolePermissionService.SetRolePermissionsAsync` | After force logout call succeeds: existing log statement covers completion |
| `RoleUserService.AssignUsersToRoleAsync` | After force logout call succeeds: existing log statement covers completion |
| `RoleUserService.RemoveUsersFromRoleAsync` | After force logout call succeeds: existing log statement covers completion |
| `PermissionService.GrantDirectPermissionAsync` | After force logout call succeeds: existing log statement covers completion |

---

## 12. Data Model and Migration Impact

**No new entities or migrations required.**

- Session revocation uses Duende's `ISessionManagementService` (server-side session store, backchannel logout, persisted grants — all managed by the Duende middleware).
- Security stamp rotation uses the existing `AspNetUsers.SecurityStamp` column (managed by ASP.NET Identity).
- No EF Core migrations needed for this task.

---

## 13. TDD Plan

### Execution Order (test-first)

**Phase 1 — Unit tests (write tests first, then implement `ForceLogoutAsync` in `UserServices`)**

| Order | Test | File | Purpose |
|---|---|---|---|
| 1 | `ForceLogoutAsync_EmptyList_IsNoOp` | `UserServicesForceLogoutTests.cs` | Confirm no calls to session management service on empty input |
| 2 | `ForceLogoutAsync_WithUsers_CallsRemoveSessionsPerUser` | `UserServicesForceLogoutTests.cs` | Confirm `RemoveSessionsAsync` called per user with correct SubjectId string |
| 3 | `ForceLogoutAsync_WithUsers_CallsUpdateSecurityStampPerUser` | `UserServicesForceLogoutTests.cs` | Confirm `UpdateSecurityStampAsync` called per user |
| 4 | `ForceLogoutAsync_SessionManagementThrows_ExceptionPropagated` | `UserServicesForceLogoutTests.cs` | Confirm exception is NOT swallowed by `UserServices` itself (swallowing is caller's job) |

**Phase 2 — Integration tests (write tests, then update service integrations)**

| Order | Test | File | Purpose |
|---|---|---|---|
| 5 | `SetRolePermissionsAsync_PermissionsChanged_ForceLogoutCalledForRoleMembers` | `Users/ForceLogoutIntegrationTests.cs` | AOC-01 / TC-01 |
| 6 | `SetRolePermissionsAsync_Clear_ForceLogoutCalledForRoleMembers` | `Users/ForceLogoutIntegrationTests.cs` | AOC-01 / TC-02 |
| 7 | `AssignUsersToRoleAsync_ForceLogoutCalledForNewlyAssignedUsers` | `Users/ForceLogoutIntegrationTests.cs` | AOC-02 / TC-03 |
| 8 | `RemoveUsersFromRoleAsync_ForceLogoutCalledForRemovedUsers` | `Users/ForceLogoutIntegrationTests.cs` | AOC-03 / TC-04 |
| 9 | `SetRolePermissionsAsync_ForceLogoutFails_ExceptionPropagates` | `Users/ForceLogoutIntegrationTests.cs` | AOC-05 / TC-05 |
| 10 | `SetRolePermissionsAsync_NoRoleMembers_ForceLogoutCalledWithEmptyList` | `Users/ForceLogoutIntegrationTests.cs` | TC-06 |
| 11 | `GrantDirectPermissionAsync_ForceLogoutCalledForUser` | `Users/ForceLogoutIntegrationTests.cs` | AOC-07 / TC-08 |

---

## 14. BDD Scenarios

### Feature: Force Logout on Role Permission Changes

```
Scenario: Role permissions updated — members logged out
  Given a role with 2 active members (User A and User B)
  And both users have valid active sessions
  When an admin calls SetRolePermissionsAsync for that role
  Then ISessionManagementService.RemoveSessionsAsync is called for User A's subjectId
  And ISessionManagementService.RemoveSessionsAsync is called for User B's subjectId
  And UserManager.UpdateSecurityStampAsync is called for User A
  And UserManager.UpdateSecurityStampAsync is called for User B
  And the primary SetRolePermissions operation returns success
```

```
Scenario: Role permissions cleared — members logged out
  Given a role with 1 active member (User C)
  When an admin calls SetRolePermissionsAsync with Clear: true
  Then User C's sessions are removed via ISessionManagementService
  And User C's security stamp is rotated
```

```
Scenario: Users assigned to role — sessions revoked
  Given a role R
  And User D is not assigned to role R
  When an admin assigns User D to role R
  Then User D's sessions are removed via ISessionManagementService
  And User D's security stamp is rotated
```

```
Scenario: Users removed from role — sessions revoked
  Given User E is assigned to role R
  When an admin removes User E from role R
  Then User E's sessions are removed via ISessionManagementService
  And User E's security stamp is rotated
```

```
Scenario: Force logout fails — exception propagates to caller
  Given a role R with 1 member (User F)
  And ISessionManagementService is configured to throw an exception
  When SetRolePermissionsAsync is called for role R
  Then the exception propagates to the caller
  And the caller receives an InvalidOperationException
```

```
Scenario: Direct permissions granted — user sessions revoked
  Given User G exists with active sessions
  When an admin calls GrantDirectPermissionAsync for User G
  Then ISessionManagementService.RemoveSessionsAsync is called for User G's subjectId
  And UserManager.UpdateSecurityStampAsync is called for User G
```

---

## 15. Rollout and Rollback Strategy

| Item | Detail |
|---|---|
| Feature flag | Not required — this is additive safety behavior; no flag needed |
| Rollback | Revert `IUserService` method addition and remove `IUserService` injection from `RolePermissionService` and `RoleUserService`; no migration to rollback |
| Risk | Low — force logout uses direct await; a failure surfaces as a request error (no silent data inconsistency) |
| Deployment order | No special ordering; service is stateless and self-contained |

---

## 16. Implementation Step Order

> For `/speckit.implement` execution sequence:

1. Add `ForceLogoutAsync` method to `IUserService.cs` in `01.Domain/Users/Contracts/`
2. Write `UserServicesForceLogoutTests.cs` unit tests (Phase 1, Orders 1–4)
3. Implement `ForceLogoutAsync` in `UserServices.cs` — add `ISessionManagementService` constructor parameter
4. Update `SharedTestServices.CreateUserServices` to accept optional `IPersistedGrantService` parameter
5. Write integration tests in `Users/ForceLogoutIntegrationTests.cs` (Phase 2, Orders 5–10) — using mock `IUserService`
6. Update `RolePermissionService.cs` — inject `IUserService` and call `ForceLogoutAsync`
7. Update `RoleUserService.cs` — inject `IUserService` and call `ForceLogoutAsync`
8. Update `PermissionService.cs` — inject `IUserService` and call `ForceLogoutAsync` in `GrantDirectPermissionAsync`
9. Run full test suite and confirm all pass
10. Build solution (`dotnet build Erp.Ids.csproj`) and confirm no errors

---

## 17. TL Approval Checklist

- [ ] Proposed **AoC** (Section 2) is approved as-written or revised
- [ ] Proposed **DoD** (Section 3) is approved as-written or revised
- [ ] Proposed **Test Cases** (Section 4) are approved as-written or revised
- [ ] Branch type `technicals` is accepted (no Epic assigned to AC-90)
- [x] Fire-and-forget guard pattern discussed — **decision: direct await (exception propagation) adopted instead**
- [x] Adding `ForceLogoutAsync` to `IUserService` (vs. a separate interface) is the correct design decision
- [ ] `ISessionManagementService` + `UserManager.UpdateSecurityStampAsync` is the correct revocation mechanism
- [ ] No database migration is confirmed as acceptable
- [ ] Implementation step order (Section 16) is approved

**→ Once all items are checked, instruct the implementer to run `/speckit.implement` with the path:**
`docs/work-items/02.implementation/stories/AC-5/tasks/AC-90-implementation-plan.md`

---

## 18. As-Built Deviations from Original Plan

| # | Original Plan | As-Built | Reason |
|---|---|---|---|
| DEV-01 | Fire-and-forget guard (try-catch, log, swallow) at all call sites | Direct `await` — exceptions propagate to caller | Silently swallowing a security-critical failure was rejected; callers should know when session revocation fails |
| DEV-02 | `ERROR_SESSION_FORCE_LOGOUT_FAILED` added to `GlobalResponseKey` | Not added | No catch block at call sites means the key is unused; only `INFORMATION_SESSION_FORCE_LOGOUT_COMPLETED` was retained |
| DEV-03 | `PermissionService` listed in Out of Scope | `PermissionService.GrantDirectPermissionAsync` added as a 4th trigger point | Consistency: direct-permission grants change a user's effective access, same as role-based changes |
| DEV-04 | 10 integration tests planned (Orders 5–10 + 4 unit tests) | 11 integration tests delivered | `GrantDirectPermissionAsync_ForceLogoutCalledForUser` added for DEV-03 |
| DEV-05 | `SharedTestServices` gains `CreateRolePermissionServiceWithUserService` and `CreateRoleUserServiceWithUserService` | Also gains `CreatePermissionServiceWithUserService`; `CreatePermissionService` updated to inject no-op mock `IUserService` | Required by `PermissionService` constructor change (DEV-03) |
| DEV-06 | Test `SetRolePermissionsAsync_ForceLogoutFails_PrimaryOperationSucceeds` (AOC-05) | Renamed to `SetRolePermissionsAsync_ForceLogoutFails_ExceptionPropagates`; asserts exception propagates | Reflects the inverted AOC-05 behaviour (DEV-01) |
| DEV-07 | `VaultConfigurations.cs` — `.AddServerSideSessions()` (Unplanned) | Delivered as unplanned deviation | `ISessionManagementService` was not registered in the DI container; required for `UserServices` new constructor dependency |
