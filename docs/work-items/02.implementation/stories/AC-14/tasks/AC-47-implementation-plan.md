# Implementation Plan: AC-47 — FE-01 Razor UI: Login + Forgot-Password All Screens

| Field | Value |
|---|---|
| Jira Task | [AC-47](https://nexttoptech.atlassian.net/browse/AC-47) |
| Parent Story | [AC-14 — User Login](https://nexttoptech.atlassian.net/browse/AC-14) |
| Task File | `docs/work-items/01.solution/linked/stories/AC-14/tasks/AC-47.md` |
| Stack | Frontend / IDP — `Erp.Sso.Ids` |
| Repo | `projects/accounting-sso` |
| Branch | `features/ac-47-razor-ui-login-forgot-password-all-screens` |
| Plan Status | Approved |
| Plan Date | 2026-04-30 |
| Author | AI Agent (speckit.start-task) |

---

## 1. Scope & Assumptions

### In Scope
- `Erp.Sso.Ids` project only (`src/04.Presentation/IDP/Erp.Sso.Ids/`)
- Login screen (replace existing `Login.cshtml` scaffold)
- Forgot-password SPA flow: Identify → VerifyOtp → SetPassword
- Razor `.resx` localization for FA and EN on all 4 screens
- RTL/LTR direction switching (client-side via language toggle)
- Submit guard on login button and OTP verify button
- Per-field inline error display
- Wire `ForgotPassword/*` views to the existing forgot-password API route contract

### Out of Scope
- AD login tab — excluded per AOC-13
- SMS / Email notification dispatch — no `ISmsService`, no `IEmailService`
- Password strength meter
- "Remember Me" UI
- Any backend changes in `AccountController` beyond what is already staged
- Any other project (frontend, API, domain)

### Dependency
- **AC-14-BE-01 must be complete** before FP backend wiring can be tested.
- The repo already contains the forgot-password API controller surface under `ForgotPasswordApiController`; confirm the frontend binds to the current route contract before implementation starts.

---

## 2. Current State: What Is Already Implemented

The following generated artifacts already exist in the SSO repo and should be treated as the baseline:

### 2.1 `AccountController.cs` — Done ✅
| Change | Detail |
|---|---|
| GET `/Account/Login` | Adds `LogInformation` with `returnUrl` |
| POST `/Account/Login` guard | Rejects empty `Username`/`Password` with `ModelState.AddModelError` |
| Login success logging | `LogInformation` on successful sign-in |
| Login failure logging | `LogWarning` on failed sign-in |
| Logout logging | `LogInformation` on `SignOutAsync` |
| ErrorMessage null-safe | Returns `"Error: Unknown, Descriptions: No error context available."` when `message == null` |
| View name explicit | `return View("Login", model)` — prevents view resolution ambiguity |

### 2.2 `LoginViewModel.cs` — Done ✅
| Change | Detail |
|---|---|
| `Username`, `Password`, `ReturnUrl` | `= string.Empty` (nullable-safe) |
| `VisibleExternalProviders` | `= []` (no null reference) |
| `LoginMethod` | New property `= "standard"` (supports AD/standard toggle) |

### 2.3 `Login.cshtml` — Done ✅ (structure, needs gaps filled)
| Feature | Done |
|---|---|
| Glassmorphism card + gradient blobs | ✅ |
| Tailwind CDN + Vazirmatn font | ✅ |
| Lucide icon set (`shield-check`, `user`, `lock`, `globe`) | ✅ |
| Multi-view SPA layout (login / forgot-identify / forgot-choice / email-sent / otp / reset) | ✅ |
| Language toggle button (top-right) | ✅ |
| RTL/LTR `dir` attribute on root `#app` | ✅ |
| Login form — AntiForgeryToken, ReturnUrl, hidden inputs | ✅ |
| Username field with user icon | ✅ |
| Password field with lock icon | ✅ |
| Forgot-password link button | ✅ |
| Loading overlay spinner | ✅ |
| Server-side `ModelState` error banner | ✅ |

### 2.4 `wwwroot/js/account/login/constants.js` — Done ✅
- Full FA / EN translation dictionaries covering all view strings
- `LOGIN_VIEWS` array
- `INITIAL_LOGIN_STATE` object

### 2.5 `wwwroot/js/account/login/index.js` — Done ✅
- State machine for view switching (`setView()`)
- Language toggle updating all DOM labels, placeholders, direction
- Login method toggle (standard / AD)
- Forgot-identify form submit → advances to forgot-choice
- OTP input numeric-only enforcement, `disabled` on verify until 5 chars
- Reset form password-match check (client-side alert)
- Login form submit → shows loading overlay
- `lucide.createIcons()` called on init and lang toggle

### 2.6 `wwwroot/css/Login.css` — Done ✅
- `.view` / `.view.active` show/hide system
- CSS animations: `fade-in`, `slide-in-from-right`, `zoom-in`
- `.dir-ltr` helper for inputs
- `#loading-overlay.hidden` display override

### 2.7 Forgot-password views, view models, and resources — Done ✅
- `Views/Account/ForgotPassword/Identify.cshtml`
- `Views/Account/ForgotPassword/VerifyOtp.cshtml`
- `Views/Account/ForgotPassword/SetPassword.cshtml`
- `Models/Account/ForgotPassword/IdentifyViewModel.cs`
- `Models/Account/ForgotPassword/VerifyOtpViewModel.cs`
- `Models/Account/ForgotPassword/SetPasswordViewModel.cs`
- `Resources/LoginResources.fa.resx` / `Resources/LoginResources.en.resx`
- `Resources/ForgotPasswordResources.fa.resx` / `Resources/ForgotPasswordResources.en.resx`
- `Controllers/ForgotPasswordController.cs` and `Controllers/ForgotPasswordApiController.cs`

---

## 3. Gap Analysis — What Needs to Be Completed

The following items are **not yet done** and are required to satisfy AOC/DOD:

| Gap | AOC/DOD | Priority |
|---|---|---|
| Submit button `disabled` binding (JS) for login form | AOC-04 | P1 |
| Per-field inline errors (`asp-validation-for`) | AOC-05 | P1 |
| AD login tab removal | AOC-13, DOD-08 | P1 |
| OTP `maxlength` fix: `5` → `6` | AOC-08 | P1 |
| OTP length in `constants.js` / `index.js` fix | AOC-08 | P1 |
| Normalize forgot-password route bindings against the existing `ForgotPasswordApiController` route contract | AOC-07/AOC-08/AOC-09 | P1 |
| Complete FA/EN resource key coverage for all 4 screens and bind them in the views | AOC-10, DOD-03, DOD-07 | P1 |
| Configure `IStringLocalizer<T>` in `Program.cs` | AOC-10 | P1 |
| Password-mismatch inline error (replace `alert()`) | AOC-09 | P2 |
| OTP invalid inline error (from backend response) | AOC-08 | P2 (after route alignment) |

---

## 4. Repository Routing Matrix

All changes are in one repository: `projects/accounting-sso`

| Layer | Path | Changes Required |
|---|---|---|
| 04.Presentation/IDP | `Erp.Sso.Ids/Views/Account/Login.cshtml` | Fix AOC-04/05/08/13 gaps |
| 04.Presentation/IDP | `Erp.Sso.Ids/Views/Account/ForgotPassword/` | Existing generated views: `Identify.cshtml`, `VerifyOtp.cshtml`, `SetPassword.cshtml` |
| 04.Presentation/IDP | `Erp.Sso.Ids/Controllers/ForgotPasswordController.cs` | GET actions already exist; keep view routing aligned |
| 04.Presentation/IDP | `Erp.Sso.Ids/Controllers/ForgotPasswordApiController.cs` | Existing POST API surface; confirm route normalization before wiring |
| 04.Presentation/IDP | `Erp.Sso.Ids/Models/Account/ForgotPassword/` | `IdentifyViewModel`, `VerifyOtpViewModel`, `SetPasswordViewModel` |
| 04.Presentation/IDP | `Erp.Sso.Ids/Resources/` | Existing generated localization resources: `LoginResources.*` and `ForgotPasswordResources.*` |
| 04.Presentation/IDP | `Erp.Sso.Ids/Program.cs` | Add `AddLocalization()` + `UseRequestLocalization()` |
| wwwroot/js | `wwwroot/js/account/login/constants.js` | Fix OTP length (5→6) |
| wwwroot/js | `wwwroot/js/account/login/index.js` | Fix submit guard, OTP length, remove AD tab logic, inline mismatch error |
| wwwroot/css | `wwwroot/css/Login.css` | Add mismatch-error display style (if needed) |
| Workspace docs | `docs/work-items/02.implementation/stories/AC-14/tasks/AC-47-implementation-plan.md` | This plan file |

> **Note:** The AD-tab JS logic in `index.js` (`setLoginMethod()`, AD button event) must be removed entirely — not just hidden.

---

## 5. Domain Hierarchy Map (04.Presentation/IDP)

```
Erp.Sso.Ids/
├── Controllers/
│   ├── AccountController.cs          ← already done (staged)
│   └── ForgotPasswordController.cs   ← GET views only; POST routes handled by the existing API controller
├── Models/
│   └── Account/
│       ├── LoginViewModel.cs         ← already done (staged)
│       └── ForgotPassword/
│           ├── IdentifyViewModel.cs
│           ├── VerifyOtpViewModel.cs
│           └── SetPasswordViewModel.cs
├── Views/
│   └── Account/
│       ├── Login.cshtml              ← patch (gaps only)
│       └── ForgotPassword/
│           ├── Identify.cshtml
│           ├── VerifyOtp.cshtml
│           └── SetPassword.cshtml
├── Resources/
│   ├── LoginResources.fa.resx
│   ├── LoginResources.en.resx
│   ├── ForgotPasswordResources.fa.resx
│   └── ForgotPasswordResources.en.resx
└── wwwroot/
    ├── css/Login.css                 ← minor patch
    └── js/account/login/
        ├── constants.js              ← fix OTP length
        └── index.js                 ← fix submit guard, remove AD, inline errors
```

---

## 6. Implementation Blueprint (No Code — Files / Contracts Only)

### 6.1 `Login.cshtml` — Patches Required

| Element | Fix |
|---|---|
| Remove AD tab (`login-method-ad` button + `login-method-standard` tab bar) | Remove the entire tab-bar `div.flex.p-1.bg-slate-200` from `view-login` |
| Submit button disabled binding | Add `id="login-submit"` disabled by default; enable only when both `#username-input` and `#password-input` are non-empty (via `input` event) |
| Per-field username error | Add `<span asp-validation-for="Username">` below username input, styled red |
| Per-field password error | Add `<span asp-validation-for="Password">` below password input, styled red |
| OTP `maxlength` | Change `maxlength="5"` → `maxlength="6"` |
| OTP `placeholder` | Change `•••••` → `••••••` |

### 6.2 `wwwroot/js/account/login/index.js` — Patches Required

| Element | Fix |
|---|---|
| Remove `setLoginMethod()` function | Entire function body and invocation |
| Remove AD button event listener | `login-method-ad` click handler |
| Remove `login-method-standard` click handler | Not needed after tab removal |
| Remove `login-method-input` update from `updateLanguageUi` | AD-related |
| Remove `ad-login-text`, `standard-login-text` DOM updates | Not needed |
| Submit guard | `input` event on `#username-input` and `#password-input` → `loginSubmit.disabled = !(user && pass)` |
| OTP length guard | Change `< 5` check to `< 6` |
| Password mismatch | Replace `alert(getText('passwordsDoNotMatch'))` with inline DOM error element below confirm-password input |

### 6.3 `wwwroot/js/account/login/constants.js` — Patches Required

| Element | Fix |
|---|---|
| Remove `adLogin`, `domainUser`, `standardLogin` keys from both FA/EN | Unused after AD tab removal |
| Add `passwordMismatch` inline-error key (if `alert` is replaced) | Already exists as `passwordsDoNotMatch` — can reuse |

### 6.4 ForgotPassword Views (new)

**Option A — Separate Razor Views (recommended baseline):**

`ForgotPassword/Identify.cshtml`
- `@model IdentifyViewModel`
- Form `asp-controller="ForgotPassword" asp-action="Identify" method="post"`
- `AntiForgeryToken`
- Username/email input with `asp-for="Username"` + `asp-validation-for="Username"`
- Submit button + Cancel link to `/Account/Login`
- Glassmorphism card, lang toggle (same design system as Login)
- RTL/LTR via `dir` attribute on root element

`ForgotPassword/VerifyOtp.cshtml`
- `@model VerifyOtpViewModel`
- Form `asp-controller="ForgotPassword" asp-action="VerifyOtp" method="post"`
- OTP input: `maxlength="6"`, `inputmode="numeric"`, `pattern="[0-9]{6}"`
- Hidden `Username` from prior step (via model or TempData)
- `asp-validation-for="Otp"` inline error
- Back button → `/Account/ForgotPassword/Identify`

`ForgotPassword/SetPassword.cshtml`
- `@model SetPasswordViewModel`
- Form `asp-controller="ForgotPassword" asp-action="SetPassword" method="post"`
- New password + confirm inputs (both `asp-for`)
- Client-side mismatch check before submit
- `asp-validation-for="NewPassword"` inline error
- On success: redirect to `/Account/Login` with success banner

**Option B — Keep SPA approach (current Login.cshtml multi-view):**
- Wire `forgot-identify-form.action` → `POST /Account/ForgotPassword/Identify` via AJAX fetch
- Wire `otp-form.action` → `POST /Account/ForgotPassword/VerifyOtp` via AJAX fetch
- Wire `reset-form.action` → `POST /Account/ForgotPassword/SetPassword` via AJAX fetch
- Handle 400/500 JSON responses and display inline error
- **Chosen approach must be documented in the MR description.**

> Recommendation: **Option A** — keeps Razor conventions, plays well with ModelState, reduces JS complexity for CSRF handling.

### 6.5 `ForgotPasswordController.cs` (GET routes only)

- `[HttpGet("/Account/ForgotPassword/Identify")]` → `View(new IdentifyViewModel())`
- `[HttpGet("/Account/ForgotPassword/VerifyOtp")]` → `View(new VerifyOtpViewModel())`
- `[HttpGet("/Account/ForgotPassword/SetPassword")]` → `View(new SetPasswordViewModel())`
- POST routes are owned by the existing forgot-password API controller surface; keep GET views decoupled from POST contract changes.

### 6.6 ViewModels

`IdentifyViewModel`
- `Username: string = string.Empty` — required, not null

`VerifyOtpViewModel`
- `Username: string = string.Empty` — passed from prior step
- `Otp: string = string.Empty` — 6-char numeric

`SetPasswordViewModel`
- `Username: string = string.Empty`
- `Token: string = string.Empty` — reset token from VerifyOtp
- `NewPassword: string = string.Empty` — required
- `ConfirmPassword: string = string.Empty` — required; must match `NewPassword`

### 6.7 Razor Localization Resource Files

All in `Erp.Sso.Ids/Resources/`

`LoginResources.fa.resx` and `LoginResources.en.resx` keys:
```
Title, HeaderSubtitle, Username, Password, LoginBtn,
ForgotPasswordLink, Footer,
Error_InvalidCredentials, Error_EmptyUsername, Error_EmptyPassword
```

`ForgotPasswordResources.fa.resx` and `ForgotPasswordResources.en.resx` keys:
```
IdentifyTitle, IdentifyDesc, UsernameOrEmail, Next, Cancel,
VerifyOtpTitle, OtpDesc, Verify, Back,
SetPasswordTitle, NewPassword, ConfirmNewPassword, SavePassword,
Success_PasswordChanged,
Error_OtpInvalid, Error_OtpExpired, Error_PasswordMismatch, Error_PasswordPolicy
```

### 6.8 `Program.cs` Localization Config

- `builder.Services.AddLocalization(options => options.ResourcesPath = "Resources")`
- `app.UseRequestLocalization(new RequestLocalizationOptions { SupportedCultures = ["fa", "en"], SupportedUICultures = ["fa", "en"] })`
- Views using `IStringLocalizer<LoginViewModel>` or page-level localizer injection

---

## 7. Response Key Catalog

All frontend-facing response keys follow the `GlobalResponseKey` naming contract.

| Key | Type | Context |
|---|---|---|
| `ERROR_Login_InvalidCredentials` | Error | POST /Account/Login — bad username/password |
| `ERROR_Login_LockedAccount` | Error | POST /Account/Login — account locked |
| `ERROR_Login_EmptyUsername` | Error | POST /Account/Login — empty username guard |
| `ERROR_Login_EmptyPassword` | Error | POST /Account/Login — empty password guard |
| `ERROR_Login_ServerError` | Error | POST /Account/Login — unexpected server error |
| `ERROR_ForgotPassword_OtpInvalid` | Error | POST /ForgotPassword/VerifyOtp — wrong OTP |
| `ERROR_ForgotPassword_OtpExpired` | Error | POST /ForgotPassword/VerifyOtp — expired OTP |
| `ERROR_ForgotPassword_PasswordMismatch` | Error | Client-side SetPassword confirm mismatch |
| `ERROR_ForgotPassword_PasswordPolicy` | Error | POST /ForgotPassword/SetPassword — policy violation |
| `INFORMATION_ForgotPassword_IdentifySent` | Information | POST /ForgotPassword/Identify — neutral confirm (always shown) |
| `INFORMATION_ForgotPassword_PasswordChanged` | Information | POST /ForgotPassword/SetPassword — success |

---

## 8. Security & Privacy Controls

| Control | Implementation |
|---|---|
| Anti-CSRF | `@Html.AntiForgeryToken()` on all POST forms; `[ValidateAntiForgeryToken]` on all POST actions |
| Empty input guard (server-side) | Already staged in `AccountController.cs` — apply same to FP controller |
| OTP enumeration guard | POST Identify always returns neutral message regardless of username existence (existing API contract — verify) |
| Dev-only OTP bypass | Verify `ASPNETCORE_ENVIRONMENT == Development` guard in the backend — UI does not control this |
| Password not reflected in URL | All FP forms use `method="post"` |
| Token in hidden field | SetPassword form passes reset token in hidden `input` — token must not be logged |
| OTP numeric filter | `pattern="[0-9]{6}"` + JS numeric-only enforcement |
| XSS | All razor outputs via `asp-for`, `@Model.X` (auto-encoded) — no raw `@Html.Raw` |
| No AD tab in production | AD tab removed; no AD auth path exposed |

---

## 9. Observability: Logging Strategy

All method-level logging follows structured log pattern: `logger.LogXxx("Message. Key: {Key}", value)`

| Location | Method | Level | Message |
|---|---|---|---|
| `AccountController` GET Login | Already staged | Info | `"Rendering login page. ReturnUrl: {ReturnUrl}"` |
| `AccountController` POST Login (empty) | Already staged | Warning | `"Login attempt with empty username or password."` |
| `AccountController` POST Login (success) | Already staged | Info | `"Login succeeded for user {Username}"` |
| `AccountController` POST Login (fail) | Already staged | Warning | `"Login failed for user {Username}"` |
| `AccountController` Logout | Already staged | Info | `"Logout requested. LogoutId: {LogoutId}"` |
| `ForgotPasswordController` GET Identify | New | Debug | `"Rendering ForgotPassword/Identify page."` |
| `ForgotPasswordController` POST Identify | Existing API controller | — | — |
| `ForgotPasswordController` POST VerifyOtp | Existing API controller | — | — |
| `ForgotPasswordController` POST SetPassword | Existing API controller | — | — |

---

## 10. TDD Plan

Test-first execution order:

| Step | Test | Type | Target |
|---|---|---|---|
| T-01 | Resx keys FA == Resx keys EN (no missing keys) | Unit | `LoginResources.fa.resx` vs `LoginResources.en.resx` |
| T-02 | Resx keys FA == Resx keys EN for ForgotPassword | Unit | `ForgotPasswordResources.fa.resx` vs `ForgotPasswordResources.en.resx` |
| T-03 | Submit button disabled when username empty | JS unit / Playwright | `Login.cshtml` submit guard |
| T-04 | Submit button disabled when password empty | JS unit / Playwright | `Login.cshtml` submit guard |
| T-05 | Submit button enabled when both fields filled | JS unit / Playwright | `Login.cshtml` submit guard |
| T-06 | Language toggle: `dir` → `rtl` on FA | Playwright | `Login.cshtml` lang toggle |
| T-07 | Language toggle: `dir` → `ltr` on EN | Playwright | `Login.cshtml` lang toggle |
| T-08 | Login form action matches `POST /Account/Login` | Contract | `Login.cshtml` form `asp-action` |
| T-09 | Identify form action matches `POST /Account/ForgotPassword/Identify` | Contract | `Identify.cshtml` form `asp-action` |
| T-10 | VerifyOtp input: non-numeric characters filtered | Playwright | `VerifyOtp.cshtml` input |
| T-11 | VerifyOtp input: maxlength=6 enforced | Playwright | `VerifyOtp.cshtml` |
| T-12 | OTP verify disabled until 6 chars | Playwright | `VerifyOtp.cshtml` |
| T-13 | Password mismatch: inline error shown, form not submitted | Playwright | `SetPassword.cshtml` |
| T-14 | Full login flow: enter valid creds → redirect to ERP | Integration | `AccountController` |
| T-15 | Full FP flow: Identify → VerifyOtp (bypass 12346) → SetPassword → Login | Integration | Full FP flow |
| T-16 | No AD tab in rendered DOM | Playwright | `Login.cshtml` rendered output |
| T-17 | No hard-coded strings in .cshtml files | Static analysis / grep | All view files |

---

## 11. BDD Coverage Map

| Scenario | AOC Ref | Test ID |
|---|---|---|
| Login happy path | AOC-05, DOD-01, DOD-02 | T-14 |
| Submit guard — empty fields | AOC-04 | T-03, T-04, T-05 |
| Language toggle FA → RTL | AOC-02, AOC-03 | T-06, T-07 |
| Forgot-password full dev bypass flow | AOC-07/08/09, DOD-06 | T-15 |
| OTP invalid → inline error | AOC-08 | T-10, T-11, T-12 |
| Password mismatch → inline error | AOC-09 | T-13 |
| No AD tab | AOC-13, DOD-08 | T-16 |
| No hard-coded strings | AOC-10, DOD-07 | T-17 |

---

## 12. Rollout Strategy

- No feature flags required — the login page is the only entry point; it replaces the scaffold entirely.
- Deployment is `Development`-first; no staging deploy until DOD-09 (integration tests pass).
- Dev-bypass OTP (`12346`) is environment-guarded in the backend — UI has no awareness of it.
- Rollback: revert the single `Login.cshtml` file to the pre-staged version; no DB changes.

---

## 13. Open Questions Before Implementation Starts

| # | Question | Owner | Blocker |
|---|---|---|---|
| Q1 | Should the frontend bind to the existing `/api/v1/account/forgot/*` contract as-is? | TL + BE owner | Yes, connect to API |
| Q2 | Should the generated AD toggle state be removed from the `LoginViewModel` and login JS in the same pass as the UI cleanup? | TL | Minor |

---

## 14. TL Approval Checklist

- [x] Gap list in §3 is complete and accurate
- [x] Repository routing matrix (§4) correct
- [x] FP views approach selected: **Option A** — separate Razor FP views (Q2 resolved)
- [x] Localization approach confirmed: `IStringLocalizer<T>` with per-page resource class (Q3 resolved)
- [x] AD tab confirmed for removal
- [x] Response key catalog (§7) approved
- [x] TDD plan (§10) test coverage acceptable
- [x] Forgot-password dependency status confirmed — frontend wiring will connect to the existing API contract as-is (Q1 resolved)
- [x] Plan ready to pass to `/speckit.implement`

**TL Approved: 2026-04-30**

---

*Plan generated by: speckit.start-task | AC-47 | 2026-04-30*
