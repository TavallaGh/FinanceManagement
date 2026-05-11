# AC-48 QA Implementation Plan

**Task:** AC-48 — QA-01 — Security + Localization Validation  
**Parent Story:** AC-14  
**Jira URL:** [AC-48](https://nexttoptech.atlassian.net/browse/AC-48)  
**Plan Date:** 2026-05-11  
**Plan Status:** Approved

---

## 1. Overview & Readiness Gate

### Task Summary
Execute structured validation across the security behaviors and localization correctness of AC-14 delivery (Login UI + Forgot-Password backend + Forgot-Password UI). This task produces:
- Test evidence documents
- Sign-off checklist (AOC-01 through AOC-07)
- Defect findings (if any)

### Pre-Execution Dependencies
- ✅ AC-46 (Forgot-Password Backend) — **COMPLETE as of 2026-05-07**
- ⏳ AC-47 (Razor UI: Login + Forgot-Password) — **IN PROGRESS** (target merge: 2026-05-14)
- Both AC-46 and AC-47 must pass CI pipeline tests before AC-48 execution begins
- Development environment instance of `Erp.Sso.Ids` must be running and accessible for visual sign-off

### Scope Guardrails
- ✅ In Scope: OTP bypass guard, enumeration guard, password policy, audit coverage, RTL/LTR visual sign-off
- ❌ Out of Scope: load/performance testing, penetration testing beyond enumeration, WCAG accessibility, SMS/email notification delivery, token replay testing

---

## 2. Repository Routing Matrix

### Workspace Repository (`accounting-workspace`)

| Artifact | Location | Purpose |
|---|---|---|
| **QA Implementation Plan** | `docs/work-items/02.implementation/stories/AC-14/tasks/AC-48-implementation-plan.md` | This document (sign-off reference) |
| **Test Execution Log** | `docs/work-items/02.implementation/stories/AC-14/tasks/AC-48-test-results.md` | Record of all test runs, findings, timestamps |
| **Sign-Off Checklist** | `docs/work-items/02.implementation/stories/AC-14/tasks/AC-48-signoff.md` | Final AOC approval marks (PASS/FAIL/WAIVED for each AOC) |
| **RTL Visual Sign-Off** | `docs/work-items/02.implementation/stories/AC-14/tasks/AC-48-rtl-visual-checklist.md` | Screen-by-screen RTL/LTR visual verification results (Farsi + English) |

### Project Repository (`Accounting-Project` / `Accounting-Sso`)

| Artifact | Location | Purpose |
|---|---|---|
| **Backend Integration Tests** | `Accounting-Sso/Erp.Sso.Tests/Integration/ForgotPassword/` | Environment-aware OTP, enumeration, policy, audit tests (new) |
| **Frontend Integration Tests** | `Accounting-Frontend/src/__tests__/integration/login/` | Language toggle, RTL layout assertions, key parity check (new) |
| **Existing BE-01 Tests** | `Accounting-Sso/Erp.Sso.Tests/Unit/Account/` | Verify: enumeration neutrality, dev bypass (dev), dev bypass rejection (non-dev), password policy, audit writes |
| **Existing FE-01 Tests** | `Accounting-Frontend/src/__tests__/integration/auth/` | Verify: login flow, forgot-password flow, language toggle |

---

## 3. Test Organization Blueprint

### 3.1 Backend Test Structure

**Project:** `Erp.Sso.Tests` (xUnit + Moq)  
**New Test Class File:** `Integration/ForgotPassword/ForgotPasswordSecurityTests.cs`

#### Test Classes & Responsibilities

| Class | File | Test Methods | Responsibility |
|---|---|---|---|
| `ForgotPasswordEnvironmentGuardTests` | `.../EnvironmentGuardTests.cs` | `VerifyOtp_WithBypass12346_InDevelopment_Returns200`; `VerifyOtp_WithBypass12346_InProduction_Returns400`; `VerifyOtp_WithBypass12346_InStaging_Returns400` | Validate OTP bypass behavior is environment-gated correctly |
| `ForgotPasswordEnumerationTests` | `.../EnumerationTests.cs` | `Identify_WithExistingUser_ReturnsSameResponseAsNonExistentUser`; `Identify_ExistingVsNonExisting_BothReturn200_WithIdenticalStructure` | Validate no username enumeration via response timing or structure |
| `ForgotPasswordPolicyTests` | `.../PolicyTests.cs` | `SetPassword_WithPasswordUnder8Chars_Returns400`; `SetPassword_WithPasswordMismatch_Returns400`; `SetPassword_WithValidPassword_Returns200` | Validate password policy enforced at reset endpoint |
| `ForgotPasswordAuditTests` | `.../AuditTests.cs` | `RequestOtp_WritesPasswordResetInitiatedAudit`; `SetPassword_WritesPasswordResetCompletedAudit`; `CompleteFlow_ProducesExactlyTwoAuditEntries` | Validate audit entries written at correct points |
| `LocalizationKeyParityTests` | `.../LocalizationKeyParityTests.cs` | `LoginResources_FA_ContainsAllKeysFrom_EN`; `ForgotPasswordResources_FA_ContainsAllKeysFrom_EN`; `NoOrphanedKeysInEither` | Validate resource file key parity between FA and EN |

#### Test Data Fixtures

- **User Fixture:** `ExistingUser { Id = 1, Username = "test.user@company.com" }` and `NonExistentUser { Username = "ghost@company.com" }`
- **OTP Fixture:** `ValidOtp = "12346"` (dev only), `InvalidOtp = "00000"` (all environments)
- **Password Fixtures:**
  - Valid: `"SecurePass123!"` (8+ chars, mixed case)
  - Short: `"abc"` (< 8 chars)
  - Mismatch: `{ password: "Valid123!", confirmPassword: "Valid1234!" }`

#### Environment Configuration for Tests

- **Development Environment Test:** `ASPNETCORE_ENVIRONMENT=Development`
- **Production Environment Test:** `ASPNETCORE_ENVIRONMENT=Production`
- **Staging Environment Test:** `ASPNETCORE_ENVIRONMENT=Staging`
- Test isolation: Each environment-guard test creates a separate app factory with the target environment variable

### 3.2 Frontend Test Structure

**Project:** `Accounting-Frontend` (Jest + Vitest + Playwright for visual)  
**New Test Files:**
- `src/__tests__/integration/login/localization.test.ts`
- `src/__tests__/integration/login/rtl-layout.visual.test.ts`
- `src/__tests__/integration/login/key-parity.test.ts`

#### Test Classes & Responsibilities

| Test File | Test Cases | Responsibility |
|---|---|---|
| `localization.test.ts` | `toggleLanguage_FA_ToEN_UpdatesUIText`; `toggleLanguage_EN_ToFA_UpdatesUIText`; `languageToggle_Persists_AcrossComponentRenders` | Validate language toggle works in both directions |
| `rtl-layout.visual.test.ts` | `loginScreen_FA_NoOverflow`; `loginScreen_FA_NoIconMisalignment`; `identifyScreen_FA_CardAligned`; `verifyOtpScreen_FA_ButtonLayout`; `setPasswordScreen_FA_FieldLayout` | Visual snapshot + computed style assertions for RTL in Farsi |
| `key-parity.test.ts` | `allLoginKeys_PresentInFaAndEn`; `allForgotPasswordKeys_PresentInFaAndEn`; `noOrphanedKeys` | Programmatic validation of resource key sets |

#### Visual Sign-Off Approach (Manual + Automated)

- **Automated Assertion Layer:** Jest snapshot tests + computed style checks (RTL alignment, overflow detection)
- **Manual Visual Verification:** QA engineer opens browser dev tools with RTL layout inspected for each screen:
  - 4 screens × 2 languages = 8 visual checks
  - Sign-off recorded in `AC-48-rtl-visual-checklist.md` with timestamp + reviewer name

---

## 4. Acceptance Criteria Mapping to Test Cases

| AOC | Test Class / File | Test Method | Executable By | Pass/Fail Indicator |
|---|---|---|---|---|
| **AOC-01:** Dev bypass confirmed environment-guarded | `ForgotPasswordEnvironmentGuardTests` | `VerifyOtp_WithBypass12346_InDevelopment_Returns200` + `VerifyOtp_WithBypass12346_InProduction_Returns400` | CI/CD (xUnit) | HTTP 200 in Dev, HTTP 400 in Prod/Staging |
| **AOC-02:** Enumeration guard confirmed | `ForgotPasswordEnumerationTests` | `Identify_WithExistingUser_ReturnsSameResponseAsNonExistentUser` | CI/CD (xUnit) | Response bytes identical or structure assertion passes |
| **AOC-03:** Password policy confirmed | `ForgotPasswordPolicyTests` | `SetPassword_WithPasswordUnder8Chars_Returns400` + `SetPassword_WithPasswordMismatch_Returns400` | CI/CD (xUnit) | HTTP 400 with policy error for both cases |
| **AOC-04:** Audit entries confirmed | `ForgotPasswordAuditTests` | `RequestOtp_WritesPasswordResetInitiatedAudit` + `SetPassword_WritesPasswordResetCompletedAudit` | CI/CD (xUnit) | Audit records retrieved from DB with correct `AuditAction` enum values |
| **AOC-05:** RTL layout sign-off (Farsi) | `rtl-layout.visual.test.ts` + Manual checklist | `loginScreen_FA_NoOverflow` + visual browser check | Manual + CI/CD (Jest) | Jest assertions pass + manual sign-off marked PASS in checklist |
| **AOC-06:** LTR layout sign-off (English) | `rtl-layout.visual.test.ts` + Manual checklist | `loginScreen_EN_Aligned` (LTR implicit in default CSS) | Manual + CI/CD (Jest) | Manual sign-off marked PASS in checklist |
| **AOC-07:** Localization completeness confirmed | `LocalizationKeyParityTests` + `key-parity.test.ts` | `LoginResources_FA_ContainsAllKeysFrom_EN` | CI/CD (xUnit + Jest) | No missing keys reported; test passes |
| **AOC-08:** All findings raised as defects | Test Execution Log | Manual review after all tests | QA Engineer | Zero P1 defects open; all P2/P3 logged in Jira |

---

## 5. BDD Scenario to Test Case Mapping

| BDD Scenario | Test File | Test Method | Responsible Repository |
|---|---|---|---|
| **Scenario 1:** Dev bypass environment guard | `ForgotPasswordEnvironmentGuardTests.cs` | `VerifyOtp_WithBypass12346_InProduction_Returns400` | `Accounting-Sso` |
| **Scenario 2:** Enumeration guard | `ForgotPasswordEnumerationTests.cs` | `Identify_WithExistingUser_ReturnsSameResponseAsNonExistentUser` | `Accounting-Sso` |
| **Scenario 3:** Password policy | `ForgotPasswordPolicyTests.cs` | `SetPassword_WithPasswordUnder8Chars_Returns400` | `Accounting-Sso` |
| **Scenario 4:** Audit coverage | `ForgotPasswordAuditTests.cs` | `CompleteFlow_ProducesExactlyTwoAuditEntries` | `Accounting-Sso` |
| **Scenario 5:** RTL Farsi visual sign-off | `rtl-layout.visual.test.ts` + Manual | `loginScreen_FA_NoOverflow` + browser visual | `Accounting-Frontend` |
| **Scenario 6:** Localization key parity | `key-parity.test.ts` | `allLoginKeys_PresentInFaAndEn` | `Accounting-Frontend` |

---

## 6. Implementation Steps (Sequential Execution)

### Phase A: Test Infrastructure Setup (Estimated: 4 hours)

1. **Backend Test Project Setup**
   - Create folder structure: `Erp.Sso.Tests/Integration/ForgotPassword/`
   - Add xUnit fixtures for environment variable injection (IWebApplicationFactory)
   - Add Moq setup for `IUserManager`, `IAuditLogService`, `IForgotPasswordTokenService`
   - Verify test database is isolated from dev instance

2. **Frontend Test Project Setup**
   - Create folder structure: `src/__tests__/integration/login/`
   - Add Jest configuration for integration tests (if separate from unit config)
   - Add Vitest snapshot serializers for RTL DOM assertions
   - Verify test fixtures for FA/EN locale switching

3. **CI/CD Integration**
   - Update `.gitlab-ci.yml` (or equivalent) to run new test suites before AC-48 sign-off
   - Ensure environment variables for test environments are set in CI runner

### Phase B: Implement Backend Security Tests (Estimated: 6 hours)

1. **OTP Environment Guard Tests**
   - Implement `ForgotPasswordEnvironmentGuardTests` class
   - Create test factory that starts app in `Development` vs `Production`
   - Assert `VerifyOtp` with `"12346"` returns 200 in Dev, 400 in Prod

2. **Enumeration Guard Tests**
   - Implement `ForgotPasswordEnumerationTests` class
   - Call `Identify` endpoint with existing user
   - Call `Identify` endpoint with non-existing user
   - Compare HTTP status, response body, and response timing
   - Assert they are identical (or at least response structure is identical)

3. **Password Policy Tests**
   - Implement `ForgotPasswordPolicyTests` class
   - Call `SetPassword` with password < 8 chars → expect 400
   - Call `SetPassword` with mismatched passwords → expect 400
   - Call `SetPassword` with valid password → expect 200

4. **Audit Entry Tests**
   - Implement `ForgotPasswordAuditTests` class
   - Mock `IAuditLogService` to capture calls
   - Execute full flow: `Identify` → `RequestOtp` → `VerifyOtp` → `SetPassword`
   - Assert `PasswordResetInitiated` audit entry was written after `RequestOtp`
   - Assert `PasswordResetCompleted` audit entry was written after `SetPassword`

5. **Localization Key Parity Tests (Backend)**
   - Implement `LocalizationKeyParityTests` class
   - Load `LoginResources.resx` (EN) and `LoginResources.fa-IR.resx` (FA)
   - Load `ForgotPasswordResources.resx` (EN) and `ForgotPasswordResources.fa-IR.resx` (FA)
   - Extract key sets from each
   - Assert EN keys ⊆ FA keys and FA keys ⊆ EN keys

### Phase C: Implement Frontend Localization Tests (Estimated: 4 hours)

1. **Language Toggle Tests**
   - Implement `localization.test.ts`
   - Mount Login component with initial locale = EN
   - Click language toggle button
   - Assert component re-renders with FA strings
   - Assert language persists across component unmount/remount (localStorage check)

2. **RTL Layout Visual Tests**
   - Implement `rtl-layout.visual.test.ts`
   - Render each screen (Login, Identify, VerifyOtp, SetPassword) in FA locale
   - Assert `dir="rtl"` attribute on root container
   - Assert card `textAlign: right` in computed styles
   - Take Jest snapshots for regression detection

3. **Key Parity Tests (Frontend)**
   - Implement `key-parity.test.ts`
   - Import resource files (or fetch from compiled assets)
   - Extract keys programmatically
   - Assert all keys present in both FA and EN

### Phase D: Manual Visual Sign-Off (Estimated: 3 hours)

1. **RTL Visual Checklist Execution**
   - Open Development environment in browser
   - Switch locale to Farsi (FA)
   - Visit each screen:
     - Login screen
     - Forgot Password → Identify screen
     - Forgot Password → VerifyOtp screen
     - Forgot Password → SetPassword screen
   - For each screen, verify:
     - ✅ Card layout aligned right (RTL)
     - ✅ No text overflow
     - ✅ Icons aligned correctly (not flipped where they should not be)
     - ✅ Form fields arranged RTL
     - ✅ Error messages appear in RTL layout
   - Record findings in `AC-48-rtl-visual-checklist.md`

2. **LTR Visual Checklist Execution**
   - Repeat for English (EN) locale
   - Verify same screens have correct LTR layout (left-aligned, standard text direction)
   - Record findings in same checklist file

### Phase E: Test Execution & CI Validation (Estimated: 2 hours)

1. **Run All Tests Locally**
   - `dotnet test Erp.Sso.Tests/Erp.Sso.Tests.csproj --filter "FullyQualifiedName~ForgotPassword|Localization"`
   - `npm test -- --testPathPattern="login" --testNamePattern="localization|rtl|parity"`
   - Document results in `AC-48-test-results.md`

2. **Run Tests in CI Pipeline**
   - Push feature branch to GitLab
   - Monitor CI pipeline for all new tests
   - Ensure no red X marks on any test
   - Capture CI pipeline output and screenshot

3. **Defect Logging**
   - If any test fails:
     - Create P1 defect Jira subtask under AC-14 (if security-critical)
     - Create P2 defect Jira subtask under AC-14 (if cosmetic or non-critical)
     - Link to AC-48 in Jira
     - Do NOT proceed to sign-off until all P1 defects resolved

### Phase F: Sign-Off Documentation (Estimated: 1 hour)

1. **Complete Sign-Off Checklist**
   - Open `AC-48-signoff.md`
   - Mark AOC-01 through AOC-07: PASS (if all tests pass) or FAIL (with reason)
   - Record timestamp and QA engineer name
   - Obtain TL sign-off on checklist

2. **Finalize Test Results Log**
   - Attach CI pipeline output to `AC-48-test-results.md`
   - Record any defects raised
   - Record manual visual sign-off details

---

## 7. Test Execution Dependencies & Prerequisites

### Pre-Execution Checklist

| Dependency | Status | Owner | Deadline |
|---|---|---|---|
| AC-46 Backend merged to `develop` and passing CI | ✅ COMPLETE | Backend Team | 2026-05-07 |
| AC-47 UI merged to `develop` and passing CI | ⏳ IN PROGRESS | Frontend Team | 2026-05-14 |
| Development instance of `Erp.Sso.Ids` running and stable | ⏳ REQUIRED | DevOps | 2026-05-14 |
| Test database seeded with test users | ✅ AUTOMATION | Test Infra | Pre-test |
| CI/CD pipeline configured to run new test suites | ⏳ REQUIRED | DevOps | 2026-05-12 |
| Redis instance available (for ForgotPasswordTokenService in tests) | ✅ AUTOMATION | Test Infra | Pre-test |

### Environment Variables for Testing

```env
# For Backend Tests (set in test initialization)
ASPNETCORE_ENVIRONMENT=Development     # OTP bypass test
ASPNETCORE_ENVIRONMENT=Production      # OTP rejection test
ASPNETCORE_ENVIRONMENT=Staging         # OTP rejection test

# For Frontend Tests
VITE_I18N_LOCALE=fa-IR                 # RTL layout tests
VITE_I18N_LOCALE=en-US                 # LTR layout tests
```

---

## 8. Security & Privacy Control Review

### 8.1 Abuse Cases & Mitigations

| Abuse Case | Mitigation | Test Coverage |
|---|---|---|
| **Username Enumeration:** Attacker discovers valid usernames by timing differences or response changes | Identical responses for existing/non-existing users; same HTTP status and body structure | `ForgotPasswordEnumerationTests` |
| **Dev OTP Bypass in Production:** `12346` accepted in production environment | `ASPNETCORE_ENVIRONMENT` gating; rejection test in non-dev envs | `ForgotPasswordEnvironmentGuardTests` |
| **Weak Password Reset:** Password policy not enforced; user sets `"a"` as new password | 8-character minimum enforced at API level; confirmed match required | `ForgotPasswordPolicyTests` |
| **Missing Audit Trail:** Password reset actions not logged; compliance audit fails | `PasswordResetInitiated` and `PasswordResetCompleted` audit entries written for each flow | `ForgotPasswordAuditTests` |
| **RTL Injection:** Malicious RTL override in Farsi mode exposes PII or changes UI intent | RTL layout fixed in CSS; no user-controlled directionality; visual sign-off confirms no override | Manual visual sign-off + `rtl-layout.visual.test.ts` |
| **Localization Bypass:** Missing FA key defaults to EN, exposing untranslated English in Farsi mode | Key parity test ensures every EN key has FA equivalent | `LocalizationKeyParityTests` + `key-parity.test.ts` |

### 8.2 Privacy & Compliance Checks

| Control | Implementation | Test Evidence |
|---|---|---|
| **Audit Logging** | Every password reset action logged with user ID, action type, timestamp | `ForgotPasswordAuditTests` passes; audit table checked |
| **Password Policy** | Minimum 8 characters, no plaintext storage (ASP.NET Identity hash) | `ForgotPasswordPolicyTests` passes |
| **Localization** | No hardcoded user-facing strings in code; all strings in resource files | `LocalizationKeyParityTests` and `key-parity.test.ts` pass |
| **No Enumeration** | Responses identical for user/non-user to prevent account discovery | `ForgotPasswordEnumerationTests` passes |
| **Environment Isolation** | Dev bypass (`12346`) rejected in non-dev environments | `ForgotPasswordEnvironmentGuardTests` passes |

---

## 9. Defect Escalation Process

### Defect Classification

| Priority | Definition | Action |
|---|---|---|
| **P1 (Critical)** | Security bypass, data exposure, or production risk | Raise immediately; block AC-48 sign-off until resolved |
| **P2 (High)** | Functional gap, missing feature, or visual misalignment | Raise immediately; can be deferred to follow-up sprint if accepted by TL/PO |
| **P3 (Medium)** | Minor UI issue, non-critical localization gap, or documentation gap | Log in story comments; can be ignored for this story |

### Defect Logging Template

**Title:** `[AC-48-QA-FINDING] <Issue Name> — <Category>`  
**Category:** OTP Environment Guard | Enumeration | Password Policy | Audit Logging | RTL Layout | Localization | Other  
**Environment:** Development | Production | Staging  
**Steps to Reproduce:** [Detailed steps]  
**Expected Result:** [What should happen]  
**Actual Result:** [What actually happened]  
**Severity:** P1 | P2 | P3  
**Evidence:** [Screenshots, logs, test output]  

---

## 10. Sign-Off Criteria & Approval Gates

### Final Sign-Off Requirements

- ✅ **All 7 AOCs Marked PASS** (AOC-01 through AOC-07 in `AC-48-signoff.md`)
- ✅ **CI Pipeline All Green** (No red X on any test)
- ✅ **Zero P1 Defects Open** (All critical findings resolved or waived by TL/PO)
- ✅ **RTL/LTR Manual Sign-Off Complete** (All 8 screen combinations checked; documented in `AC-48-rtl-visual-checklist.md`)
- ✅ **Story Demo Completed** (TL demos AC-14 end-to-end in Development with language toggle; no visible defects)

### Approval Authority

| Sign-Off Type | Authority | Timeline |
|---|---|---|
| QA Sign-Off (AOCs & Findings) | QA Engineer | Upon test completion (2026-05-16 estimated) |
| TL Review & Acceptance | Technical Lead | Within 1 business day of QA sign-off |
| PO Review (optional) | Product Owner | Within 1 business day of TL sign-off |

### Jira Status Transition

- Story AC-14 transitions from `In Review` → `PO Review` when all AC-48 findings are resolved
- Story AC-14 transitions from `PO Review` → `Done` after PO sign-off

---

## 11. Artifact Delivery & Traceability

### Workspace Repository Artifacts

| Artifact | Path | Owner | Deadline |
|---|---|---|---|
| Implementation Plan (this document) | `docs/work-items/02.implementation/stories/AC-14/tasks/AC-48-implementation-plan.md` | QA Engineer | 2026-05-11 (today) |
| Test Results Log | `docs/work-items/02.implementation/stories/AC-14/tasks/AC-48-test-results.md` | QA Engineer | 2026-05-16 |
| Sign-Off Checklist | `docs/work-items/02.implementation/stories/AC-14/tasks/AC-48-signoff.md` | QA Engineer | 2026-05-16 |
| RTL Visual Sign-Off | `docs/work-items/02.implementation/stories/AC-14/tasks/AC-48-rtl-visual-checklist.md` | QA Engineer | 2026-05-16 |

### Project Repository Test Code Artifacts

| Artifact | Path | Owner | Deadline |
|---|---|---|---|
| Backend Security Tests | `Accounting-Sso/Erp.Sso.Tests/Integration/ForgotPassword/*.cs` | QA Engineer | 2026-05-14 |
| Frontend Localization Tests | `Accounting-Frontend/src/__tests__/integration/login/*.test.ts` | QA Engineer | 2026-05-14 |

### Jira Traceability Links

- AC-48 will be linked to all defects raised during testing (Jira Web Link: `is tested by AC-48`)
- All test results and sign-off artifacts will be attached to AC-48 as Jira comments or document links

---

## 12. Execution Timeline & Resource Allocation

### Estimated Effort Breakdown

| Phase | Duration | Resource | Notes |
|---|---|---|---|
| A: Test Infrastructure Setup | 4 hours | QA Engineer | Parallel with AC-47 completion |
| B: Backend Security Tests | 6 hours | QA Engineer | Requires AC-46 running |
| C: Frontend Localization Tests | 4 hours | QA Engineer | Requires AC-47 running |
| D: Manual Visual Sign-Off | 3 hours | QA Engineer | Browser-based; real-time verification |
| E: Test Execution & CI Validation | 2 hours | QA Engineer | CI pipeline integration |
| F: Sign-Off Documentation | 1 hour | QA Engineer | Final checklist & approval |
| **Total** | **20 hours** | **1 QA Engineer** | Estimated 2026-05-11 to 2026-05-16 |

### Critical Path

```
AC-46 COMPLETE (2026-05-07)
    ↓
AC-47 MERGE TO DEVELOP (target: 2026-05-14)
    ↓
AC-48 TEST INFRASTRUCTURE (Phase A: 2026-05-12)
    ↓
AC-48 BACKEND TESTS (Phase B: 2026-05-13 to 2026-05-14)
    ↓
AC-48 FRONTEND TESTS (Phase C: 2026-05-14 to 2026-05-15)
    ↓
AC-48 CI VALIDATION (Phase E: 2026-05-15)
    ↓
AC-48 MANUAL VISUAL SIGN-OFF (Phase D: 2026-05-15 to 2026-05-16)
    ↓
AC-48 SIGN-OFF DOCUMENTATION (Phase F: 2026-05-16)
    ↓
TL/PO REVIEW & AC-14 STORY CLOSURE (2026-05-16 to 2026-05-17)
```

---

## 13. Known Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **AC-47 Delayed Past 2026-05-14** | Medium | Blocks AC-48 test execution; timeline slips | Begin Phase A infrastructure setup immediately; defer Phase C until AC-47 merge |
| **RTL Layout Regression Detected Late** | Low | Requires re-work of AC-47; time pressure | Manual visual sign-off done early (Phase D); snapshot tests catch regressions |
| **Enumeration Guard Not Fully Implemented** | Low | AOC-02 fails; requires backend re-work | Early test execution in Phase B validates this within 48 hours |
| **Redis or Test DB Unavailable** | Low | Cannot run audit or OTP tests | Ensure CI environment has both; test in isolation before AC-48 execution |
| **Missing Localization Keys** | Medium | AOC-07 fails; requires re-work of AC-47 | Key parity test included in Phase C; early feedback to frontend team |

---

## 14. Success Criteria & Verification Checkpoints

### Week 1 Checkpoint (2026-05-12)
- [ ] Phase A infrastructure setup complete
- [ ] Test class scaffolds created
- [ ] CI pipeline configured to run new tests

### Week 2 Checkpoint (2026-05-14)
- [ ] Phase B backend tests green (OTP, enumeration, policy, audit)
- [ ] Phase C frontend tests running (at minimum, key parity and language toggle)
- [ ] AC-47 merged to develop

### Week 2 Final Checkpoint (2026-05-16)
- [ ] All tests passing in CI
- [ ] Manual visual sign-off complete (8 screen combinations)
- [ ] Sign-off checklist complete (AOC-01 through AOC-07: PASS)
- [ ] Zero P1 defects open
- [ ] TL sign-off obtained

---

## 15. Approval & Next Steps

### Approval Authority

- **QA Engineer Review:** [Name] — Date: ____  
- **Technical Lead Sign-Off:** [Name] — Date: ____  
- **Product Owner Sign-Off (optional):** [Name] — Date: ____  

### Next Steps After AC-48 Sign-Off

1. Transition story AC-14 to `PO Review` in Jira
2. Transition story AC-14 to `Done` after PO sign-off
3. Merge story branch to `test` (via cherry-pick to story branch)
4. Create MR from story branch to `test` (no squash; preserve cherry-picked history)
5. DevOps deploys `test` instance
6. Monitor `test` for stability; escalate any production issues to P1

---

---

# SECTION VII: ACCEPTANCE OF COMPLETION (AOC) SIGN-OFF

## AOC Checklist

| AOC | Requirement | Test/Evidence | Status | Notes |
|---|---|---|---|---|
| **AOC-01** | Dev bypass confirmed environment-guarded — automated test passes confirming OTP `12346` is accepted in `Development` and rejected in `Production`/`Staging` | `ForgotPasswordEnvironmentGuardTests.VerifyOtp_WithBypass12346_InDevelopment_Returns200` ✅ + `ForgotPasswordEnvironmentGuardTests.VerifyOtp_WithBypass12346_InProduction_Returns400` ✅ | ☐ PASS ☐ FAIL ☐ WAIVED | |
| **AOC-02** | Enumeration guard confirmed — automated test passes confirming `POST /Account/ForgotPassword/Identify` returns identical HTTP status and response body for existing and non-existing usernames | `ForgotPasswordEnumerationTests.Identify_WithExistingUser_ReturnsSameResponseAsNonExistentUser` ✅ | ☐ PASS ☐ FAIL ☐ WAIVED | |
| **AOC-03** | Password policy confirmed — automated test passes confirming `SetPassword` rejects passwords < 8 characters and rejects mismatched confirm-password | `ForgotPasswordPolicyTests.SetPassword_WithPasswordUnder8Chars_Returns400` ✅ + `ForgotPasswordPolicyTests.SetPassword_WithPasswordMismatch_Returns400` ✅ | ☐ PASS ☐ FAIL ☐ WAIVED | |
| **AOC-04** | Audit entries confirmed — integration test confirms a `PasswordResetInitiated` audit record is written after `RequestOtp` and a `PasswordResetCompleted` record is written after `SetPassword` | `ForgotPasswordAuditTests.RequestOtp_WritesPasswordResetInitiatedAudit` ✅ + `ForgotPasswordAuditTests.SetPassword_WritesPasswordResetCompletedAudit` ✅ | ☐ PASS ☐ FAIL ☐ WAIVED | |
| **AOC-05** | RTL layout sign-off in Farsi — visual verification checklist completed for all 4 screens (login, Identify, VerifyOtp, SetPassword) in Farsi mode; no overflow, no misalignment, no icon displacement found | Manual visual sign-off recorded in Section VII.C + Jest snapshot tests pass | ☐ PASS ☐ FAIL ☐ WAIVED | See Section VII.C for details |
| **AOC-06** | LTR layout sign-off in English — same checklist completed in English mode | Manual visual sign-off recorded in Section VII.C | ☐ PASS ☐ FAIL ☐ WAIVED | See Section VII.C for details |
| **AOC-07** | Localization completeness confirmed — automated test confirms no missing string keys in FA or EN resource files (every key present in EN also present in FA and vice versa) | `LocalizationKeyParityTests.LoginResources_FA_ContainsAllKeysFrom_EN` ✅ + `key-parity.test.ts` ✅ | ☐ PASS ☐ FAIL ☐ WAIVED | |
| **AOC-08** | All findings raised as defects in the story's Jira comments; no P1 defect is open at story close | See Section VII.D for all defects logged | ☐ PASS ☐ FAIL ☐ WAIVED | Count: ___ P1 defects (must be 0), ___ P2 defects, ___ P3 defects |

---

## Definition of Done (DoD) Validation

| DoD | Requirement | Evidence | Status |
|---|---|---|---|
| **DOD-01** | Sign-off checklist for AOC-01 through AOC-07 completed and attached to story or story Jira comments | Section VII.A completed and submitted to AC-14 Jira task | ☐ YES ☐ NO |
| **DOD-02** | All automated tests (BE-01 + FE-01 + QA-01-specific) pass in CI | CI pipeline screenshot/log attached to Section VII.D | ☐ YES ☐ NO |
| **DOD-03** | No P1 defect is open at story close | Defect count: _____ P1 (must be 0) | ☐ YES ☐ NO |
| **DOD-04** | RTL visual sign-off completed in Farsi mode for all 4 screens | Signed off in Section VII.C | ☐ YES ☐ NO |
| **DOD-05** | LTR visual sign-off completed in English mode for all 4 screens | Signed off in Section VII.C | ☐ YES ☐ NO |
| **DOD-06** | Localization key parity confirmed by automated test | Test output attached to Section VII.D | ☐ YES ☐ NO |
| **DOD-07** | Environment-switch test for dev bypass guard passes | Test output attached to Section VII.D | ☐ YES ☐ NO |

---

## Story Demo Verification

- [ ] Story AC-14 demonstrated end-to-end in Development environment
- [ ] Language toggle exercised in both directions (EN → FA → EN)
- [ ] All 4 screens visited and UI renders without visible defects
- [ ] Demo observer: ________________  
- [ ] Demo date/time: ________________  
- [ ] Demo outcome: ☐ PASS ☐ FAIL with issues noted below

**Demo Issues (if any):**
```
[Describe any visible issues found during demo]
```

---

# SECTION VII.C: RTL/LTR VISUAL SIGN-OFF CHECKLIST

## Visual Verification Instructions

This checklist captures manual visual verification of 8 screen combinations (4 screens × 2 languages).

**How to Execute:**
1. Open Development environment in browser: `https://[dev-host]/Account/Login`
2. Open browser DevTools (F12)
3. Set initial locale to **English (EN)** — verify LTR layout is correct
4. Switch locale to **Farsi (FA)** — reload and verify RTL layout is correct
5. For each screen, verify the items in the checklist below
6. Take screenshots if any issue is found
7. Mark each item as ✅ PASS or ❌ FAIL; add notes if FAIL

---

### Screen 1: Login Screen

#### 1.1 Login Screen — English (LTR)

| Verification Item | Check | Notes |
|---|---|---|
| **Layout Alignment** | ☐ PASS ☐ FAIL | Card content is left-aligned (LTR default); no right-margin issues |
| **Text Direction** | ☐ PASS ☐ FAIL | All text flows left-to-right; no RTL marker applied |
| **Form Fields** | ☐ PASS ☐ FAIL | Username/password fields arranged vertically; labels on left; input boxes extend right |
| **Button Placement** | ☐ PASS ☐ FAIL | "Sign In" button is left-aligned with form fields; no overflow |
| **Error Messages** | ☐ PASS ☐ FAIL | Error messages (if any) appear below fields in LTR format |
| **Icons** | ☐ PASS ☐ FAIL | User/lock icons on left side of input fields; not flipped horizontally |
| **Language Toggle** | ☐ PASS ☐ FAIL | Language toggle button (top-right) clickable; switches to Farsi |
| **Forgot Password Link** | ☐ PASS ☐ FAIL | "Forgot your password?" link visible; clickable; navigates to Identify screen |

**Summary:** ☐ ALL PASS ☐ ISSUES FOUND  
**Issues:** [Describe below]  
**Screenshot:** [Attach if issues found]  
**QA Sign-Off:** ________________________  **Date:** ________

---

#### 1.2 Login Screen — Farsi (RTL)

| Verification Item | Check | Notes |
|---|---|---|
| **Layout Alignment** | ☐ PASS ☐ FAIL | Card content is right-aligned (RTL); no left-margin issues or overflow |
| **Text Direction** | ☐ PASS ☐ FAIL | All text flows right-to-left; `dir="rtl"` attribute present on root or container |
| **Form Fields** | ☐ PASS ☐ FAIL | Username/password fields arranged vertically; labels on right; input boxes on left |
| **Button Placement** | ☐ PASS ☐ FAIL | "Sign In" button (Farsi: "ورود") is right-aligned with form; no overflow |
| **Error Messages** | ☐ PASS ☐ FAIL | Error messages (if any) appear below fields in RTL format; text right-aligned |
| **Icons** | ☐ PASS ☐ FAIL | User/lock icons on right side of input fields; mirror-flipped if appropriate; readable |
| **Language Toggle** | ☐ PASS ☐ FAIL | Language toggle button (top-left now, due to RTL) switches back to English |
| **Forgot Password Link** | ☐ PASS ☐ FAIL | "بُرگشت رمز" (Forgot Password) link visible; right-aligned; clickable |
| **Card Glassmorphism** | ☐ PASS ☐ FAIL | Gradient background, semi-transparent card, icons display correctly in RTL |
| **No Text Overflow** | ☐ PASS ☐ FAIL | No Persian text truncated; no horizontal scroll bar appears |

**Summary:** ☐ ALL PASS ☐ ISSUES FOUND  
**Issues:** [Describe below]  
**Screenshot:** [Attach if issues found]  
**QA Sign-Off:** ________________________  **Date:** ________

---

### Screen 2: Forgot Password — Identify Screen

#### 2.1 Identify Screen — English (LTR)

| Verification Item | Check | Notes |
|---|---|---|
| **Layout Alignment** | ☐ PASS ☐ FAIL | Card left-aligned; username input field extends right |
| **Text Direction** | ☐ PASS ☐ FAIL | All text LTR; "Enter your username" label on left |
| **Form Field** | ☐ PASS ☐ FAIL | Username input box has adequate width; placeholder text visible |
| **Button Placement** | ☐ PASS ☐ FAIL | "Next" button left-aligned with form; no overflow |
| **Error Messages** | ☐ PASS ☐ FAIL | Error messages (if any) appear below input in LTR; readable |
| **Back Link** | ☐ PASS ☐ FAIL | "Back to Login" link present and clickable |

**Summary:** ☐ ALL PASS ☐ ISSUES FOUND  
**QA Sign-Off:** ________________________  **Date:** ________

---

#### 2.2 Identify Screen — Farsi (RTL)

| Verification Item | Check | Notes |
|---|---|---|
| **Layout Alignment** | ☐ PASS ☐ FAIL | Card right-aligned; no overflow on left side |
| **Text Direction** | ☐ PASS ☐ FAIL | All text RTL; "نام کاربری خود را وارد کنید" (Enter username) right-aligned |
| **Form Field** | ☐ PASS ☐ FAIL | Username input extends left (from right side); placeholder visible in RTL |
| **Button Placement** | ☐ PASS ☐ FAIL | "بعدی" (Next) button right-aligned with form |
| **Error Messages** | ☐ PASS ☐ FAIL | Errors appear below input in RTL; Persian text readable |
| **Back Link** | ☐ PASS ☐ FAIL | "بازگشت به ورود" (Back to Login) link right-aligned; clickable |
| **No Text Overflow** | ☐ PASS ☐ FAIL | Persian username label not truncated |

**Summary:** ☐ ALL PASS ☐ ISSUES FOUND  
**QA Sign-Off:** ________________________  **Date:** ________

---

### Screen 3: Forgot Password — Verify OTP Screen

#### 3.1 VerifyOtp Screen — English (LTR)

| Verification Item | Check | Notes |
|---|---|---|
| **Layout Alignment** | ☐ PASS ☐ FAIL | Card left-aligned; OTP input field extends right |
| **Text Direction** | ☐ PASS ☐ FAIL | All text LTR; "Enter OTP sent to your email" label on left |
| **OTP Input** | ☐ PASS ☐ FAIL | OTP input box (typically 6 digits) renders correctly; no overlap |
| **Button Placement** | ☐ PASS ☐ FAIL | "Verify" button left-aligned with form |
| **Resend Link** | ☐ PASS ☐ FAIL | "Resend OTP" link visible and clickable |
| **Back Link** | ☐ PASS ☐ FAIL | "Back" link navigates to Identify screen |

**Summary:** ☐ ALL PASS ☐ ISSUES FOUND  
**QA Sign-Off:** ________________________  **Date:** ________

---

#### 3.2 VerifyOtp Screen — Farsi (RTL)

| Verification Item | Check | Notes |
|---|---|---|
| **Layout Alignment** | ☐ PASS ☐ FAIL | Card right-aligned; no overflow |
| **Text Direction** | ☐ PASS ☐ FAIL | All text RTL; "کد تایید را وارد کنید" (Enter OTP) right-aligned |
| **OTP Input** | ☐ PASS ☐ FAIL | OTP input renders correctly in RTL; no misalignment of digit boxes |
| **Button Placement** | ☐ PASS ☐ FAIL | "تایید" (Verify) button right-aligned |
| **Resend Link** | ☐ PASS ☐ FAIL | "ارسال مجدد کد" (Resend OTP) link right-aligned; clickable |
| **Back Link** | ☐ PASS ☐ FAIL | "بازگشت" (Back) link right-aligned |

**Summary:** ☐ ALL PASS ☐ ISSUES FOUND  
**QA Sign-Off:** ________________________  **Date:** ________

---

### Screen 4: Forgot Password — Set Password Screen

#### 4.1 SetPassword Screen — English (LTR)

| Verification Item | Check | Notes |
|---|---|---|
| **Layout Alignment** | ☐ PASS ☐ FAIL | Card left-aligned; input fields extend right |
| **Text Direction** | ☐ PASS ☐ FAIL | All text LTR; labels on left |
| **Password Fields** | ☐ PASS ☐ FAIL | "New Password" and "Confirm Password" fields side-by-side or stacked; no overlap |
| **Password Policy Hint** | ☐ PASS ☐ FAIL | "Minimum 8 characters" hint text visible and readable |
| **Show/Hide Password Icon** | ☐ PASS ☐ FAIL | Eye icon toggles password visibility; positioned on right side of input |
| **Button Placement** | ☐ PASS ☐ FAIL | "Reset Password" button left-aligned with form; no overflow |
| **Error Messages** | ☐ PASS ☐ FAIL | Policy errors (e.g., "Password too short") appear below fields in LTR |

**Summary:** ☐ ALL PASS ☐ ISSUES FOUND  
**QA Sign-Off:** ________________________  **Date:** ________

---

#### 4.2 SetPassword Screen — Farsi (RTL)

| Verification Item | Check | Notes |
|---|---|---|
| **Layout Alignment** | ☐ PASS ☐ FAIL | Card right-aligned; inputs extend left; no overflow |
| **Text Direction** | ☐ PASS ☐ FAIL | All text RTL; "رمز جدید" (New Password) label right-aligned |
| **Password Fields** | ☐ PASS ☐ FAIL | Both password fields render correctly in RTL; proper spacing |
| **Password Policy Hint** | ☐ PASS ☐ FAIL | "حداقل 8 کاراکتر" (Minimum 8 characters) hint visible in RTL |
| **Show/Hide Password Icon** | ☐ PASS ☐ FAIL | Eye icon on left side of input (RTL); toggles visibility; readable |
| **Button Placement** | ☐ PASS ☐ FAIL | "تنظیم مجدد رمز" (Reset Password) button right-aligned |
| **Error Messages** | ☐ PASS ☐ FAIL | Policy errors appear below fields in RTL; Persian text readable |
| **No Text Overflow** | ☐ PASS ☐ FAIL | Persian label text not truncated; full text visible |

**Summary:** ☐ ALL PASS ☐ ISSUES FOUND  
**QA Sign-Off:** ________________________  **Date:** ________

---

## Visual Sign-Off Summary

| Screen | LTR (EN) | RTL (FA) | Overall |
|---|---|---|---|
| Login | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL |
| Identify | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL |
| VerifyOtp | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL |
| SetPassword | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL | ☐ PASS ☐ FAIL |

**Total Checks:** 32  
**Passed:** _____  
**Failed:** _____  
**Overall Result:** ☐ ALL PASS ☐ ISSUES FOUND

---

# SECTION VII.D: TEST RESULTS & EXECUTION LOG

## Executive Summary

| Metric | Value |
|---|---|
| **Total Tests Planned** | 24 |
| **Total Tests Run** | ___ |
| **Tests Passed** | ___ |
| **Tests Failed** | ___ |
| **Success Rate** | ___% |
| **Critical (P1) Defects** | ___ (must be 0) |
| **High (P2) Defects** | ___ |
| **Medium (P3) Defects** | ___ |
| **Overall Test Status** | ☐ GREEN ☐ RED |

---

## Backend Test Execution

### OTP Environment Guard Tests

**Test Class:** `ForgotPasswordEnvironmentGuardTests`  
**Execution Date:** ________________

| Test Method | Environment | Input | Expected | Actual | Status |
|---|---|---|---|---|---|
| `VerifyOtp_WithBypass12346_InDevelopment_Returns200` | Development | OTP: `12346` | HTTP 200 | _______ | ☐ PASS ☐ FAIL |
| `VerifyOtp_WithBypass12346_InProduction_Returns400` | Production | OTP: `12346` | HTTP 400 | _______ | ☐ PASS ☐ FAIL |
| `VerifyOtp_WithBypass12346_InStaging_Returns400` | Staging | OTP: `12346` | HTTP 400 | _______ | ☐ PASS ☐ FAIL |

**Phase Status:** ☐ GREEN ☐ RED

**Test Output:**
```
[Paste test runner output here]
```

---

### Enumeration Guard Tests

**Test Class:** `ForgotPasswordEnumerationTests`

| Test Method | Scenario | Expected | Actual | Status |
|---|---|---|---|---|
| `Identify_WithExistingUser_ReturnsSameResponseAsNonExistentUser` | POST `/Identify` with existing & non-existing usernames | Identical HTTP 200 + body | _______ | ☐ PASS ☐ FAIL |

**Phase Status:** ☐ GREEN ☐ RED

---

### Password Policy Tests

**Test Class:** `ForgotPasswordPolicyTests`

| Test Method | Input | Expected | Actual | Status |
|---|---|---|---|---|
| `SetPassword_WithPasswordUnder8Chars_Returns400` | Password: `"abc"` | HTTP 400 | _______ | ☐ PASS ☐ FAIL |
| `SetPassword_WithPasswordMismatch_Returns400` | Mismatch | HTTP 400 | _______ | ☐ PASS ☐ FAIL |
| `SetPassword_WithValidPassword_Returns200` | Valid | HTTP 200 | _______ | ☐ PASS ☐ FAIL |

**Phase Status:** ☐ GREEN ☐ RED

---

### Audit Logging Tests

**Test Class:** `ForgotPasswordAuditTests`

| Test Method | Scenario | Expected | Actual | Status |
|---|---|---|---|---|
| `RequestOtp_WritesPasswordResetInitiatedAudit` | Call RequestOtp | `PasswordResetInitiated (7)` | _______ | ☐ PASS ☐ FAIL |
| `SetPassword_WritesPasswordResetCompletedAudit` | Call SetPassword | `PasswordResetCompleted (8)` | _______ | ☐ PASS ☐ FAIL |
| `CompleteFlow_ProducesExactlyTwoAuditEntries` | Full flow | Two audit records | _______ | ☐ PASS ☐ FAIL |

**Phase Status:** ☐ GREEN ☐ RED

---

### Localization Key Parity Tests (Backend)

**Test Class:** `LocalizationKeyParityTests`

| Test Method | Resource Files | Expected | Actual | Status |
|---|---|---|---|---|
| `LoginResources_FA_ContainsAllKeysFrom_EN` | Login resources | FA keys ⊇ EN keys | _______ | ☐ PASS ☐ FAIL |
| `ForgotPasswordResources_FA_ContainsAllKeysFrom_EN` | ForgotPassword resources | FA keys ⊇ EN keys | _______ | ☐ PASS ☐ FAIL |
| `NoOrphanedKeys` | All resource files | Keys in both | _______ | ☐ PASS ☐ FAIL |

**Phase Status:** ☐ GREEN ☐ RED

---

## Frontend Test Execution

### Language Toggle Tests

**Test File:** `localization.test.ts`

| Test Case | Scenario | Expected | Actual | Status |
|---|---|---|---|---|
| `toggleLanguage_FA_ToEN_UpdatesUIText` | Set FA, click toggle | EN text | _______ | ☐ PASS ☐ FAIL |
| `toggleLanguage_EN_ToFA_UpdatesUIText` | Set EN, click toggle | FA text | _______ | ☐ PASS ☐ FAIL |
| `languageToggle_Persists_AcrossComponentRenders` | Toggle, unmount/remount | Persists in localStorage | _______ | ☐ PASS ☐ FAIL |

**Phase Status:** ☐ GREEN ☐ RED

---

### RTL Layout Visual Tests

**Test File:** `rtl-layout.visual.test.ts`

| Test Case | Screen | Language | Expected | Status |
|---|---|---|---|---|
| `loginScreen_FA_NoOverflow` | Login | Farsi | No scroll; `direction: rtl` | ☐ PASS ☐ FAIL |
| `identifyScreen_FA_CardAligned` | Identify | Farsi | Right-aligned | ☐ PASS ☐ FAIL |
| `verifyOtpScreen_FA_ButtonLayout` | VerifyOtp | Farsi | Right-aligned | ☐ PASS ☐ FAIL |
| `setPasswordScreen_FA_FieldLayout` | SetPassword | Farsi | RTL layout | ☐ PASS ☐ FAIL |
| `loginScreen_EN_LTRDefault` | Login | English | LTR layout | ☐ PASS ☐ FAIL |

**Phase Status:** ☐ GREEN ☐ RED

---

### Localization Key Parity Tests (Frontend)

**Test File:** `key-parity.test.ts`

| Test Case | Resource Set | Expected | Actual | Status |
|---|---|---|---|---|
| `allLoginKeys_PresentInFaAndEn` | Login | Parity | _______ | ☐ PASS ☐ FAIL |
| `allForgotPasswordKeys_PresentInFaAndEn` | ForgotPassword | Parity | _______ | ☐ PASS ☐ FAIL |
| `noOrphanedKeys` | All | Parity | _______ | ☐ PASS ☐ FAIL |

**Phase Status:** ☐ GREEN ☐ RED

---

## CI Pipeline Execution

| Metric | Value |
|---|---|
| **Pipeline ID** | ___________ |
| **Commit SHA** | ___________ |
| **Start Time (UTC)** | ___________ |
| **End Time (UTC)** | ___________ |
| **Total Duration** | ___________ |

| Job | Status | Duration |
|---|---|---|
| Build Backend | ☐ PASS ☐ FAIL | ___ |
| Backend Tests (AC-48) | ☐ PASS ☐ FAIL | ___ |
| Build Frontend | ☐ PASS ☐ FAIL | ___ |
| Frontend Tests (AC-48) | ☐ PASS ☐ FAIL | ___ |

**Overall Pipeline Status:** ☐ GREEN ☐ RED

---

## Defects Found During Testing

| Defect ID | Title | Priority | Status | Resolution |
|---|---|---|---|---|
| | | P1/P2/P3 | ☐ New ☐ Resolved | |
| | | P1/P2/P3 | ☐ New ☐ Resolved | |

**Total Defects:** ___  
- **P1 (Critical):** ___ (must be 0)
- **P2 (High):** ___
- **P3 (Medium):** ___

**Unresolved P1 Defects:** ___ (Blockers: describe below)

```
[List any blocking P1 defects here]
```

---

## Test Execution Summary

| Phase | Tests Planned | Tests Run | Passed | Failed | Status |
|---|---|---|---|---|---|
| B.1: OTP Environment | 3 | ___ | ___ | ___ | ☐ GREEN ☐ RED |
| B.2: Enumeration | 1 | ___ | ___ | ___ | ☐ GREEN ☐ RED |
| B.3: Password Policy | 3 | ___ | ___ | ___ | ☐ GREEN ☐ RED |
| B.4: Audit Logging | 3 | ___ | ___ | ___ | ☐ GREEN ☐ RED |
| B.5: Key Parity (Backend) | 3 | ___ | ___ | ___ | ☐ GREEN ☐ RED |
| C.1: Language Toggle | 3 | ___ | ___ | ___ | ☐ GREEN ☐ RED |
| C.2: RTL Layout | 5 | ___ | ___ | ___ | ☐ GREEN ☐ RED |
| C.3: Key Parity (Frontend) | 3 | ___ | ___ | ___ | ☐ GREEN ☐ RED |
| **TOTAL** | **24** | **___** | **___** | **___** | ☐ GREEN ☐ RED |

**Success Rate:** ___% (must be ≥ 95%)

---

# SECTION VIII: FINAL APPROVAL GATES

## Approval Checklist

### QA Sign-Off

- [ ] **All AOCs passed or waived:** ☐ YES ☐ NO
- [ ] **All DoDs verified:** ☐ YES ☐ NO
- [ ] **Story demo passed:** ☐ YES ☐ NO
- [ ] **No P1 defects open:** ☐ YES ☐ NO
- [ ] **All visual sign-offs complete:** ☐ YES ☐ NO
- [ ] **Ready for TL/PO review:** ☐ YES ☐ NO

**QA Engineer Signature:** ______________________  
**Date:** ________________  **Time:** ________________

---

### Technical Lead Review & Acceptance

- [ ] **QA sign-off reviewed and accepted:** ☐ YES ☐ NO
- [ ] **All findings understood and prioritized:** ☐ YES ☐ NO
- [ ] **Story ready for PO review:** ☐ YES ☐ NO

**Technical Lead Signature:** ______________________  
**Date:** ________________  **Time:** ________________

---

### Product Owner Review (Optional)

- [ ] **Story acceptance criteria met:** ☐ YES ☐ NO
- [ ] **Story approved for Done:** ☐ YES ☐ NO

**Product Owner Signature:** ______________________  
**Date:** ________________  **Time:** ________________

---

## Next Steps After Sign-Off

1. ✅ AC-48 transitions to `Done` in Jira
2. ✅ AC-14 story transitions to `PO Review` → `Done`
3. ✅ Story branch cherry-picked to `test` (TL responsibility)
4. ✅ MR created from story branch to `test` with all AC-48 evidence linked
5. ✅ DevOps deploys `test` instance
6. ✅ Monitor `test` for stability

---

**Document Version:** 2.0 (Consolidated)  
**Last Updated:** 2026-05-11  
**Status:** Ready for Execution
