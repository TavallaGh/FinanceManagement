# Story Solution: AC-14

## Story Link

- Jira Story: [`https://nexttoptech.atlassian.net/browse/AC-14`](https://nexttoptech.atlassian.net/browse/AC-14)
- Refinement doc: [docs/work-items/00.refinement/linked/stories/AC-14/refinement.md](../../00.refinement/linked/stories/AC-14/refinement.md)
- Solution Date: 2026-04-29
- Solution Status: draft

---

## Solution Summary

- Target behavior: Deliver the razor UI for login + self-service password recovery, and the forgot-password backend, on top of the existing SSO/IDP infrastructure from AC-13. The login backend is already fully implemented; this story adds the missing UI and forgot-password flow only.
- Non-functional requirements:
  - Bilingual (Farsi/English) UI with RTL/LTR layout switching — zero hard-coded user-facing strings.
  - No username enumeration via any user-facing response.
  - Password policy minimum 8 characters enforced at reset.
  - No notification system integration in this story (SMS/email dispatch is a future story).
  - No custom password reset token table — use ASP.NET Identity's built-in data-protector token mechanism.
  - Dev-mode OTP bypass: when `ASPNETCORE_ENVIRONMENT=Development`, the accepted OTP is always `12346`.

---

## SSO Repo — What Already Exists (from AC-13)

> These items are **complete and usable as-is** for AC-14. No re-implementation needed.

### Domain Layer (`ERP.Sso.Domain`)

| Artifact | File | Relevant to AC-14 |
|---|---|---|
| `User` entity | `Users/Entities/User.cs` | `LastLoginUtc`, `IsActive`, `ForceChangePassword`, `ExternalSubjectId`, `UserType` |
| `User.Behaviors` | `Users/Entities/User.Behaviors.cs` | `UpdateLastLoginUtc()`, `SetLockout(enabled, lockoutEnd)`, `Activate()`, `Deactivate()` — all needed for login hardening |
| `UserType` enum | `Users/Enums/UserType.cs` | `None`, `SystemAdmin`, `SystemUser` |
| `IUserService` contract | `Users/Contracts/IUserService.cs` | `ResetPasswordAsync(int userId, ResetPasswordRequest)` — admin-initiated reset, reusable internally |
| `AuditLog` entity | `AuditLogs/Entities/AuditLog.cs` | `TargetUserId`, `TargetUserName`, `Action`, `OccurredOnUtc`, `ActorSubject`, `Details` |
| `IAuditLogService` | `AuditLogs/Contracts/IAuditLogService.cs` | `WriteAsync(AuditLogEntry)` — ready to receive login events |
| `AuditAction` enum | `AuditLogs/Enums/AuditAction.cs` | Existing: `Created`, `Updated`, `Deactivated`, `Deleted`, `PasswordReset`, `PermissionGranted` |
| `AuthorizationModuleOptions` | `Options/AuthorizationModuleOptions.cs` | Seeder and migration-on-startup toggle already wired |

### Infrastructure Layer (`ERP.Sso.Infra.Sql`)

| Artifact | Notes |
|---|---|
| `AuditLogService` | Fully implemented `WriteAsync`, error-safe (logs and swallows on failure) |
| `UserServices` | Full CRUD, search, `ResetPasswordAsync` — no AC-14-specific gaps here |
| DB migration infrastructure | `ErpIdsDbContext`, EF migrations present under `Migrations/ERP/IDS` |

### Presentation Layer (IDP — `Erp.Sso.Ids`)

| Artifact | Status | AC-14 gap |
|---|---|---|
| `AccountController` | **Complete** | GET/POST Login, Logout — login backend flow fully implemented |
| `LoginViewModel` | Present | Used by existing Razor login — will be superseded by razor component |
| `Login.cshtml` | Basic scaffold | To be replaced by razor login component |
| Duende IdentityServer | Fully configured | No changes needed |
| `SignInManager<User>` | Wired | Already uses ASP.NET Identity, which tracks `AccessFailedCount` |
| Program.cs middleware pipeline | Fully configured | No changes needed |
| razor UI (login + forgot-password) | **Missing** | No razor components exist for login or forgot-password |
| Forgot-password backend | **Missing** | No controller or service for self-service OTP-based password reset |

---

## Identified Gaps — What AC-14 Must Build

### Gap 1 — Forgot-Password Backend (Application + IDP)

**Current state:**
- No forgot-password controller or self-service OTP reset flow exists.
- `IUserService.ResetPasswordAsync` is admin-initiated — not a self-service flow.
- No notification system (SMS/email) — out of scope of this story.

**Decisions:**
- No custom `PasswordResetToken` table. Use ASP.NET Identity's built-in `UserManager.GeneratePasswordResetTokenAsync` / `ResetPasswordAsync` (data protector, no new DB table).
- OTP delivery is **not implemented** in this story. The backend simply exposes an OTP validation endpoint.
- **Dev-mode bypass:** when `ASPNETCORE_ENVIRONMENT == Development`, the system accepts `12346` as a valid OTP regardless of the generated token. This allows end-to-end UI testing without a notification provider.
- No email-link path for MVP — OTP path only.

**Required work:**
- `ForgotPasswordController` (or Minimal API endpoints) with:
  - `POST /Account/ForgotPassword/Identify` — validates user existence; returns identical response regardless of whether user exists (no enumeration).
  - `POST /Account/ForgotPassword/RequestOtp` — generates ASP.NET Identity password reset token and stores it server-side for the session; in development returns/logs the OTP, in production no dispatch (notification future story).
  - `POST /Account/ForgotPassword/VerifyOtp` — validates submitted OTP; in development accepts `12346`; on success advances the flow state.
  - `POST /Account/ForgotPassword/SetPassword` — validates token, enforces password policy (min 8 chars, confirm match), calls `UserManager.ResetPasswordAsync`, writes `AuditAction.PasswordResetCompleted` audit entry.
- `AuditAction` enum extended with `PasswordResetInitiated = 7` and `PasswordResetCompleted = 8` (if not already present — existing value `PasswordReset = 5` covers admin reset; self-service needs distinct values).
- All responses on identify/send paths are identical regardless of account existence.

---

### Gap 2 — razor UI: Login + Forgot-Password (All Screens)

**Current state:**
- `Login.cshtml` is a plain English-only Razor scaffold. No razor components exist.
- No forgot-password screens at all.
- Technology decision: **all new UI for this story is razor**, replacing or wrapping the existing Razor view within the SSO repo (`Erp.Sso.Ids`).

**Required work — Login component:**
- Glassmorphism card layout: gradient background, semi-transparent card, icon set (user, lock).
- Language toggle button (top-right, always visible) — switches entire UI between Farsi (RTL) and English (LTR).
- All strings in localization resource files — zero hard-coded text.
- Per-field inline error messages (red, below field, in active language).
- Submit button disabled until both fields are non-empty.
- "Forgot Password?" link → navigates to forgot-password flow.
- No AD tab.

**Required work — Forgot-password razor flow (3 screen states):**

| State | Component | Purpose |
|---|---|---|
| FP-1 | `ForgotPassword/Identify` | Username/email input; neutral response regardless of account existence |
| FP-2 | `ForgotPassword/VerifyOtp` | 6-digit numeric OTP field (max-length enforced); invalid OTP error; dev bypass: `12346` always accepted |
| FP-3 | `ForgotPassword/SetPassword` | New password + confirm fields; min-8-char policy; match check; success → redirect to login |

> Method-selection screen (SMS vs Email) is removed — notification system is out of scope. Single OTP path only.

All components must be bilingual (FA/EN) + RTL/LTR. Layout uses the same design language as the login component.

---

## Technical Decisions

- **Decision 1:** AD login is excluded from MVP. The AD tab is not built. Clean scope cut per refinement OQ-02 answer.
- **Decision 2:** Login backend is **already implemented** (`AccountController` POST `/Account/Login` with `SignInManager`). AC-14 does not re-implement or change the login backend.
- **Decision 3:** No custom `PasswordResetToken` table. ASP.NET Identity's built-in data-protector token (via `UserManager.GeneratePasswordResetTokenAsync` / `ResetPasswordAsync`) is used. No new DB migration needed for tokens.
- **Decision 4:** Notification system (SMS/email dispatch) is **out of scope** of this story. No `ISmsService` or `IEmailService` interface is created here. OTP flow runs without delivery; the dev bypass covers development testing.
- **Decision 5:** Dev-mode OTP bypass — `ASPNETCORE_ENVIRONMENT == Development` → OTP `12346` is always accepted. No production stub or placeholder for notification; that is a future story.
- **Decision 6:** All new UI is **razor** in the SSO repo (`Erp.Sso.Ids`). The existing `Login.cshtml` Razor view is superseded by the razor login component. One single UI task covers all screens (login + forgot-password).
- **Decision 7:** `User` identity backing store is `dbo.Users` as defined by AC-13. AC-14 is a consumer only — no schema changes to the user table.
- **Decision 8:** All localization strings go into razor resource files within `Erp.Sso.Ids` — separate from the main Accounting frontend localization.

---

## Work Breakdown (Task Clusters — No Jira Tasks Created Here)

> Task creation happens via `speckit.Task`. This section describes the landscape only.

| Cluster | Scope | Layer | Blocked By |
|---|---|---|---|
| BE-01 | `ForgotPasswordController` + OTP validation + dev bypass (`12346`) + `AuditAction` enum extension + `SetPassword` endpoint | Backend / IDP | Gap 1 |
| FE-01 | All razor UI: Login component + Forgot-password 3-state flow (`Identify`, `VerifyOtp`, `SetPassword`) — bilingual FA/EN, RTL/LTR, glassmorphism | Frontend / IDP (razor) | Gap 2 — depends on BE-01 |
| QA-01 | Security validation: OTP dev bypass, enumeration guard, password policy, audit coverage + localization sign-off in both languages | QA | Depends on BE-01 + FE-01 |

**Dependency order:** BE-01 → FE-01 → QA-01.

**Estimated relative effort:** Medium (login backend already done; 3 tasks only).

---

## Done Criteria for Implementation

- Forgot-password backend is implemented: `Identify` → `VerifyOtp` → `SetPassword` with no enumeration leak.
- Dev-mode OTP bypass: OTP `12346` accepted in `Development` environment; rejected in all other environments.
- ASP.NET Identity built-in token used for password reset — no custom token table, no DB migration for tokens.
- `AuditAction` enum extended with `PasswordResetInitiated` and `PasswordResetCompleted`; audit entries written on initiation and completion.
- No notification dispatch in this story — no SMS, no email, no service interface created.
- razor login component: glassmorphism layout, bilingual FA/EN, RTL/LTR correct, per-field errors, submit guard, forgot-password link. No hard-coded user-facing strings.
- razor forgot-password flow: 3 states (`Identify`, `VerifyOtp`, `SetPassword`) — bilingual FA/EN, RTL/LTR, password policy enforced, success redirect to login.
- All AoC items from Refinement that are in scope (excluding AoC-08 email path, AoC-13 method-selection cards) are covered.
- TL and PO approve solution and task plan before Jira import.
