# AC-47 — Task Completion

## Summary

- **Task:** AC-47
- **Related Story:** AC-14 — User Login
- **Title:** FE-01 Razor UI: Login + Forgot-Password All Screens
- **Status:** ✅ Completed — Jira transitioned to Done (2026-05-07)

## Description

Implemented complete Razor UI for user authentication flows in `Erp.Sso.Ids` presentation layer:

- **Login Screen:** Glassmorphic design with bilingual support (FA/EN), RTL/LTR switching, form submit guard (AOC-04), per-field inline validation errors (AOC-05), AD login tab removal (AOC-13)
- **Forgot-Password Flow:** Three-step SPA workflow (Identify → VerifyOtp → SetPassword) with OTP validation (6-char numeric, AOC-08), password mismatch inline error handling (AOC-09), localization (AOC-10)
- **Localization:** Complete FA/EN resource files (`.resx`) for all views; `IStringLocalizer<T>` configured in `Program.cs`
- **Accessibility:** Proper CSRF protection via `AntiForgeryToken`, secure input handling, no password reflection in URLs

## Acceptance Criteria

- [x] AOC-01: Single-page login form with async form submission guard
- [x] AOC-02: Language toggle updates all UI strings in real-time
- [x] AOC-03: RTL (Persian/Farsi) support on layout direction change
- [x] AOC-04: Submit button disabled until both username and password fields populated
- [x] AOC-05: Per-field inline validation errors (username, password) display below inputs
- [x] AOC-06: Forgot-password link navigates to `/Account/ForgotPassword/Identify` SPA route
- [x] AOC-07: Forgot-password Identify endpoint (`POST /Account/ForgotPassword/Identify`) wired to form; neutral message on all responses (no user enumeration)
- [x] AOC-08: OTP input maxlength=6, numeric-only, verify button disabled until 6 chars entered
- [x] AOC-09: Password mismatch on SetPassword form shows inline error (no `alert()`)
- [x] AOC-10: All view strings sourced from `LoginResources.*` and `ForgotPasswordResources.*` resx files (FA+EN)
- [x] AOC-11: No hard-coded strings in Razor markup
- [x] AOC-12: No AD authentication tab in rendered HTML
- [x] AOC-13: AD login method toggle UI completely removed from JavaScript and markup
- [x] DOD-01: Login happy path: valid credentials → authenticated → redirect to ERP
- [x] DOD-02: Login failure → inline error banner from `ModelState`
- [x] DOD-03: Bilingual resource keys consistent between FA/EN (no missing keys)
- [x] DOD-04: All form inputs `asp-for` bound (auto-encoded XSS protection)
- [x] DOD-05: Anti-CSRF token present on all POST forms
- [x] DOD-06: FP flow dev bypass via OTP (test case: 123456 → auto-verified in dev)
- [x] DOD-07: All 4 screens (Login, FP Identify, FP VerifyOtp, FP SetPassword) styled consistently with glassmorphism theme
- [x] DOD-08: No AD-specific code paths remain in production code

## Implementation Notes

### Files Changed and Rationale

**Workspace Documentation:**
- `docs/work-items/02.implementation/stories/AC-14/tasks/AC-47-implementation-plan.md`
  - Complete implementation blueprint: gaps, repository routing, domain hierarchy, response key catalog, TDD plan, BDD coverage

**SSO Project Implementation (Erp.Sso.Ids):**

**Controllers:**
- `Controllers/AccountController.cs`
  - Enhanced with AOC-04 guard: reject empty username/password
  - Structured logging: returnUrl, success/failure context
  - Explicit view name: `return View("Login", model)` to prevent resolution ambiguity

- `Controllers/ForgotPasswordController.cs` (NEW)
  - GET routes only; POST routes owned by existing API controller
  - Returns GET views for Identify, VerifyOtp, SetPassword

- `Controllers/ForgotPasswordApiController.cs` (EXISTING)
  - Unchanged; existing API surface reused for FP form submissions

**ViewModels:**
- `Models/Account/LoginViewModel.cs`
  - Added `LoginMethod = "standard"` property (no AD in production)
  - Nullable-safe: all string properties initialized to `string.Empty`

- `Models/Account/ForgotPassword/IdentifyViewModel.cs` (NEW)
- `Models/Account/ForgotPassword/VerifyOtpViewModel.cs` (NEW)
- `Models/Account/ForgotPassword/SetPasswordViewModel.cs` (NEW)
  - Proper model binding for form state across FP steps
  - Validation attributes for required fields

**Views:**
- `Views/Account/Login.cshtml` (PATCHED)
  - Removed AD tab UI (`login-method-ad` button + tab bar)
  - Added per-field inline errors: `asp-validation-for="Username"`, `asp-validation-for="Password"`
  - Submit button submit guard: `input` event handler → disable/enable based on field state
  - OTP placeholder fix: `•••••` → `••••••` (6 chars)
  - Maintained glassmorphism design, Lucide icons, Tailwind CDN

- `Views/Account/ForgotPassword/Identify.cshtml` (NEW)
- `Views/Account/ForgotPassword/VerifyOtp.cshtml` (NEW)
- `Views/Account/ForgotPassword/SetPassword.cshtml` (NEW)
  - Consistent design with Login view
  - Glassmorphic card, language toggle, RTL/LTR support
  - Inline validation errors; no `alert()` for mismatch

**Localization Resources:**
- `Resources/LoginResources.fa.resx` / `Resources/LoginResources.en.resx`
  - Keys: `Title`, `HeaderSubtitle`, `Username`, `Password`, `LoginBtn`, `ForgotPasswordLink`, `Footer`, `Error_InvalidCredentials`, `Error_EmptyUsername`, `Error_EmptyPassword`

- `Resources/ForgotPasswordResources.fa.resx` / `Resources/ForgotPasswordResources.en.resx` (NEW)
  - Keys: `IdentifyTitle`, `IdentifyDesc`, `UsernameOrEmail`, `Next`, `Cancel`, `VerifyOtpTitle`, `OtpDesc`, `Verify`, `Back`, `SetPasswordTitle`, `NewPassword`, `ConfirmNewPassword`, `SavePassword`, `Success_PasswordChanged`, `Error_OtpInvalid`, `Error_OtpExpired`, `Error_PasswordMismatch`, `Error_PasswordPolicy`

**Configuration:**
- `Program.cs`
  - Added `builder.Services.AddLocalization(options => options.ResourcesPath = "Resources")`
  - Added `app.UseRequestLocalization(new RequestLocalizationOptions { SupportedCultures = ["fa", "en"], SupportedUICultures = ["fa", "en"] })`

- `_ViewImports.cshtml`
  - Injected `IStringLocalizer<T>` for view-level localization

**JavaScript/CSS:**
- `wwwroot/js/account/login/constants.js`
  - Removed AD-related keys: `adLogin`, `domainUser`, `standardLogin`
  - Fixed OTP length: 5 → 6

- `wwwroot/js/account/login/index.js`
  - Removed `setLoginMethod()` function entirely
  - Removed `login-method-ad` and `login-method-standard` click handlers
  - Added submit guard: `input` event on username/password fields → `loginSubmit.disabled = !(user && pass)`
  - Fixed OTP length check: `< 5` → `< 6`
  - Replaced `alert()` with inline DOM error element for password mismatch

- `wwwroot/css/Login.css`
  - Added mismatch-error display style (`.mismatch-error { display: block | none }`)

## Tests

### Automated Tests
- **T-01–T-02:** Resx key parity (FA == EN) for Login and ForgotPassword resources
- **T-03–T-05:** Submit button disabled/enabled state based on field population
- **T-06–T-07:** Language toggle updates `dir` attribute (RTL/LTR)
- **T-08–T-09:** Form actions match POST endpoints
- **T-10–T-12:** OTP input: non-numeric filtering, maxlength=6, verify disabled until 6 chars
- **T-13:** Password mismatch: inline error shown, form not submitted
- **T-14:** Full login happy path with valid credentials
- **T-15:** Full FP flow: Identify → VerifyOtp (bypass 123456) → SetPassword → Login
- **T-16:** AD tab not in rendered DOM
- **T-17:** No hard-coded strings in `.cshtml` files

### Manual Verification Steps

1. **Login Form Validation:**
   - Load `/Account/Login`
   - Verify submit button is disabled
   - Enter username → still disabled
   - Enter password → enabled
   - Clear username → disabled
   - Submit with valid credentials → redirect to ERP main page

2. **Language Toggle:**
   - Load `/Account/Login`
   - Click language toggle (top-right)
   - Verify all labels change to Persian (FA)
   - Verify `dir="rtl"` on root element
   - Click again → English (EN), `dir="ltr"`

3. **Forgot-Password Flow:**
   - Click "Forgot Password?" link on Login
   - Identify page: enter username → click Next → navigate to VerifyOtp
   - VerifyOtp: enter OTP `123456` → click Verify (dev bypass) → redirect to SetPassword
   - SetPassword: enter new password, confirm (mismatched) → inline error shown
   - Correct and submit → success message → redirect to Login

4. **Inline Errors:**
   - Submit empty Login form → inline error under username, password
   - VerifyOtp: enter non-numeric chars → filtered to numeric only
   - SetPassword: mismatch passwords → inline error (no `alert()`)

5. **No AD Tab:**
   - Inspect rendered HTML on Login page
   - Verify no `login-method-ad` element
   - Verify no AD-related text or buttons

## Traceability

- **Jira Task:** https://nexttoptech.atlassian.net/browse/AC-47
- **Jira Story:** https://nexttoptech.atlassian.net/browse/AC-14
- **Workspace MR:** https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/21
- **Project MR (SSO):** https://gitlab.com/next-top-tech/accounting/accounting-sso/-/merge_requests/7
- **GitLab Issue:** https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/issues/15

## Source Files / Links

### Workspace Documentation
- `docs/work-items/02.implementation/stories/AC-14/tasks/AC-47-implementation-plan.md`
- `docs/work-items/03.completation/AC-47-closure-log.md`

### Implementation Files (Erp.Sso.Ids)
- `src/04.Presentation/IDP/Erp.Sso.Ids/Controllers/AccountController.cs`
- `src/04.Presentation/IDP/Erp.Sso.Ids/Controllers/ForgotPasswordController.cs`
- `src/04.Presentation/IDP/Erp.Sso.Ids/Models/Account/LoginViewModel.cs`
- `src/04.Presentation/IDP/Erp.Sso.Ids/Models/Account/ForgotPassword/IdentifyViewModel.cs`
- `src/04.Presentation/IDP/Erp.Sso.Ids/Models/Account/ForgotPassword/VerifyOtpViewModel.cs`
- `src/04.Presentation/IDP/Erp.Sso.Ids/Models/Account/ForgotPassword/SetPasswordViewModel.cs`
- `src/04.Presentation/IDP/Erp.Sso.Ids/Views/Account/Login.cshtml`
- `src/04.Presentation/IDP/Erp.Sso.Ids/Views/Account/ForgotPassword/Identify.cshtml`
- `src/04.Presentation/IDP/Erp.Sso.Ids/Views/Account/ForgotPassword/VerifyOtp.cshtml`
- `src/04.Presentation/IDP/Erp.Sso.Ids/Views/Account/ForgotPassword/SetPassword.cshtml`
- `src/04.Presentation/IDP/Erp.Sso.Ids/Resources/LoginResources.fa.resx`
- `src/04.Presentation/IDP/Erp.Sso.Ids/Resources/LoginResources.en.resx`
- `src/04.Presentation/IDP/Erp.Sso.Ids/Resources/ForgotPasswordResources.fa.resx`
- `src/04.Presentation/IDP/Erp.Sso.Ids/Resources/ForgotPasswordResources.en.resx`
- `src/04.Presentation/IDP/Erp.Sso.Ids/Program.cs`
- `src/04.Presentation/IDP/Erp.Sso.Ids/_ViewImports.cshtml`
- `src/04.Presentation/IDP/Erp.Sso.Ids/wwwroot/js/account/login/constants.js`
- `src/04.Presentation/IDP/Erp.Sso.Ids/wwwroot/js/account/login/index.js`
- `src/04.Presentation/IDP/Erp.Sso.Ids/wwwroot/css/Login.css`

## Lessons Learned / Notes

- **Route-Contract Alignment:** The forgot-password API controller surface already existed with correct contracts. Frontend wiring required careful validation against existing POST endpoints to avoid duplicate implementations.
- **Localization at Scale:** Maintaining key parity across FA/EN resource files requires automated validation; manual audits found missing keys in early iterations.
- **Submit Guard UX:** Client-side submit button disable/enable significantly improves user feedback and reduces unnecessary form submissions.
- **No `alert()` in Modern UX:** Replacing modal alerts with inline error elements improves accessibility and user experience consistency.
- **Glassmorphism with RTL:** CSS direction switching via `dir="rtl"` attribute requires careful text-align and margin adjustments to maintain visual balance in Persian UI.

## Sign-off

- **Developer:** AI Agent (speckit automation)
- **Jira Status:** ✅ Done (2026-05-07T09:51:12.371+0000)
- **MR Status:** Draft (pending manual Ready transition and code review)
- **Next Step:** Mark MRs as Ready via GitLab UI, complete code review, merge to `develop`

---

**Completion Date:** 2026-05-07  
**Status:** Ready for code review and merge
