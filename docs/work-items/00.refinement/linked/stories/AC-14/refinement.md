# Story REFIENMENT Standard: AC-14

## 1. Story Identity

- Jira Story: [`https://nexttoptech.atlassian.net/browse/AC-14`](https://nexttoptech.atlassian.net/browse/AC-14)
- Story Key: AC-14
- Epic: AC-8 — IDP & Access Control
- Reporter/Owner: Tavalla Ghorbanian
- REFIENMENT Date: 2026-04-29
- REFIENMENT Status: open-questions-answered

---

## 2. Purpose of REFIENMENT

- Goal: Agent پروژه را بفهمد.
- This document provides deep understanding of the User Login story before solution/implementation.
- This phase does NOT create Jira tasks.
- The story covers the authentication entry point of the ERP system plus the full self-service password recovery flow.

---

## 3. Source Inputs Reviewed

- Jira description: Media-only description (attachments referenced as primary source — no inline text body in Jira).
- Jira comments: No comments at extraction time (total: 0).
- Jira attachments:
  - `04_UserLogin_Dev.docx` (attachment ID 38397) — developer specification
  - `04_UserLogin_Help.docx` (attachment ID 38396) — end-user help guide
- Related local docs:
  - `docs/mvp/04_UserLogin_Dev.md` — full developer spec (extracted from docx)
  - `docs/mvp/04_UserLogin_Help.md` — end-user help guide (extracted from docx)

---

## 4. Problem Narrative (Why)

### 4.1 Current Problem

- What is wrong today:
  - The ERP system has no implemented authentication entry point. Users cannot securely identify themselves to access the system.
  - There is no self-service password recovery mechanism, meaning any forgotten password requires direct admin intervention, creating operational friction and a support bottleneck.
  - No dual-login mode exists to accommodate both standard credential users and Active Directory (organizational email) users in a unified interface.
  - The system has no bilingual authentication experience, which is required for a bilingual (Farsi/English) workforce.
- Where it happens:
  - The authentication gateway — the first screen any user encounters before accessing any ERP functionality.
  - Password reset workflows that currently depend entirely on admin action.
  - AD/LDAP integration at the identity provider layer.
- Who is impacted:
  - All system users — regular employees (username + password), AD/organizational email users, and any user who loses access to their password.
  - System administrators who currently must manually handle all password resets.
  - Information security officers who need auditable authentication events.

### 4.2 Business Impact

- Operational impact:
  - Without a login screen, no productive use of the ERP is possible — this is a critical blocking dependency for all other modules.
  - Every forgotten password currently consumes admin time with no audit trace.
  - Mixed workforce (standard + AD users) cannot be served from a single entry point.
- Risk impact:
  - Without secure session initiation, the entire ERP surface is exposed.
  - Without brute-force protection (lockout after repeated failures), credential stuffing attacks are viable.
  - Without OTP/email-token password recovery, account takeover risk is elevated.
- Compliance/security impact:
  - Audit requirements mandate a traceable login event and password change event.
  - Password reset tokens must be single-use and time-limited to prevent replay attacks.
  - Password policy (minimum 8 characters) must be enforced at reset to meet baseline security standards.

### 4.3 Target Outcome

- A production-ready authentication entry point that:
  - Supports standard (username + password) and Active Directory (organizational email + password) login modes in a unified, tab-switchable interface.
  - Provides a fully independent self-service password recovery flow via SMS OTP or email link.
  - Enforces brute-force protection (warning after 5 failed attempts; optional 1-minute lockout).
  - Delivers a bilingual (Farsi + English), RTL/LTR-compatible UI with a language toggle.
  - Provides precise, field-level error feedback in both languages.
  - Produces auditable authentication events (login success/failure, password reset).
  - Uses secure one-time tokens for password reset with appropriate expiry.

---

## 5. Extracted Story Contract

### 5.1 Description (Extracted)

- Extracted/normalized description:
  - The system must provide a login screen that is the single entry point to the ERP, accepting standard credentials (username + password) and Active Directory credentials (organizational email + password) with tab-based mode switching.
  - The system must provide a multi-step self-service password recovery flow: identify user → choose recovery method (SMS or email) → verify identity (OTP or email link) → set new password.
  - The entire authentication surface must be bilingual (Farsi/English) with RTL/LTR layout switching, and all error messages must appear field-adjacent in the active language.
  - The system must persist the last successful login timestamp on the user record and issue secure, single-use, time-limited password reset tokens.

### 5.2 AoC (Acceptance of Completion / Acceptance Criteria)

- AoC-01: Login form disables the submit button until both the identifier field and password field are non-empty.
- AoC-02: Tab switching between "Standard Login" and "Active Directory" changes the first field's label and placeholder text accordingly (username vs. organizational email).
- AoC-03: On successful authentication, the user is immediately redirected to the ERP main/dashboard page.
- AoC-04: After 5 consecutive failed login attempts, a warning message is displayed to the user (optional: a 1-minute temporary account lockout is applied server-side).
- AoC-05: All error messages (invalid credentials, locked account, empty fields, server error) are displayed inline, directly below the relevant field, in red, in the currently active UI language.
- AoC-06: The forgot-password flow starts by collecting the user's username or email, then presents two recovery-method cards (SMS and email) with hover-highlight interaction.
- AoC-07: The OTP entry field accepts numeric input only and has a hard maximum of 6 digits; an invalid or expired code produces a clear error message.
- AoC-08: After submitting an email recovery request, the system displays an "Email Sent" confirmation screen without revealing whether the address exists.
- AoC-09: The new-password form enforces a minimum of 8 characters; a mismatch between the new-password and confirmation fields produces an explicit error message before submission.
- AoC-10: After a successful password reset, the user sees a success message and is automatically redirected to the login page.
- AoC-11: The UI is fully bilingual (Farsi + English); a language-toggle button is always visible in the top-right corner and switches all labels, placeholders, and messages.
- AoC-12: The layout correctly applies RTL direction for Farsi and LTR direction for English without layout breakage.
- AoC-13: Visual design matches the specified style: gradient glass-morphism background, central semi-transparent card, standard icons (user, lock, email, phone).
- AoC-14: Password reset tokens are single-use and time-limited; reusing or replaying an expired token is rejected.
- AoC-15: Key authentication and password-change events are recorded in the audit log (login success, login failure, password reset initiated, password reset completed).

### 5.3 DoD (Definition of Done)

- DoD-01: All AoC items are validated with test evidence (unit, integration, and UI verification).
- DoD-02: Security behaviors are verified: brute-force protection, single-use tokens, password minimum, audit log coverage.
- DoD-03: Localization and directionality are verified: all user-facing strings are in the localization resource (no hard-coded text), RTL and LTR layouts are both correct.
- DoD-04: The DB schema for `gen.password_reset_tokens` is migrated and reviewed.
- DoD-05: Story is approved and ready to move to Solution phase with complete scope boundaries defined.

---

## 6. Scope Decomposition (Smallest Story Parts)

- Capability slice 1: Standard login
  - detail: Username + password credential validation, session initiation, redirect to main page on success, inline error feedback (invalid credentials, empty fields), last-login timestamp update.

- Capability slice 2: Active Directory login
  - detail: Organizational email + password credential flow via AD/LDAP integration at the IDP layer, tab switching between standard and AD modes with dynamic field label/placeholder updates.

- Capability slice 3: Brute-force protection
  - detail: Server-side tracking of consecutive failed attempts per user identifier; warning notification to user after 5 failures; optional temporary lockout (1 minute) with clear user messaging.

- Capability slice 4: Password recovery — identification and method selection
  - detail: User enters username or email to start recovery; system validates existence without revealing account presence (email path); two recovery-method cards displayed (SMS with masked phone number, Email); card selection routes to appropriate sub-flow.

- Capability slice 5: SMS OTP verification and password reset
  - detail: 6-digit numeric OTP field with max-length enforcement; server-side OTP validation (correct/incorrect/expired); cooldown guard before resend; new password + confirm form with policy enforcement (min 8 chars, match check); single-use token invalidation after use; success redirect to login.

- Capability slice 6: Email link recovery
  - detail: System generates a time-limited, single-use email reset link; sends to registered address; "Email Sent" confirmation screen (email address not disclosed); link redirects to new-password form; same policy enforcement as SMS path; token invalidation after use.

- Capability slice 7: Bilingual UI and RTL/LTR layout
  - detail: All user-facing strings extracted to localization resources (no hard-coded text); language toggle button (top-right) switches entire UI language including labels, placeholders, messages; RTL layout applied for Farsi, LTR for English; layout verified stable under both directions.

- Capability slice 8: Audit logging for authentication events
  - detail: Mandatory audit log entries for: login success (with user ID, timestamp, IP), login failure (with attempt count), password reset initiated, password reset completed. Schema must capture before/after state where applicable.

---

## 7. Out of Scope

- Explicitly excluded in this story:
  - "Remember Me" / persistent session feature (listed as a future enhancement).
  - Password Strength meter during reset (listed as a future enhancement).
  - Rate limiting for the recovery flow beyond the existing AoC warning/lockout (advanced rate limiting is a future enhancement).
  - Bulk credential import or admin-initiated batch password resets.
  - Multi-factor authentication (MFA) for login beyond the recovery OTP step.
  - Social login or third-party OAuth providers.
  - Detailed security analytics dashboard for failed-login log analysis (future enhancement).
  - Full user lifecycle management (covered by AC-13 — User Management).
  - Role and permission management (covered by AC-13).
  - Active Directory (AD/LDAP) login mode — deferred as a future enhancement; out of MVP scope. The AD tab shall not be included in MVP delivery.
  - SMS gateway provider selection, API credentials, and OTP delivery infrastructure — out of scope of this story; handled by a dedicated infrastructure/DevOps concern.
  - Password reset token TTL policy definition — out of scope of this story; token expiry is a runtime-configurable security policy value read from application configuration.

---

## 8. Dependency and Constraints

- Functional dependencies:
  - `dbo.User` table in the SSO repository (as defined and created by AC-13) must be available with fields: `username`, `party_id`, `password_hash`, `is_active`, `last_login`. AC-14 must not re-create or alter this table; it consumes it as-is.
  - ~~Active Directory / LDAP integration~~ — **removed; AD login is out of MVP scope.**
  - SMS OTP delivery requires an injectable SMS service interface; the concrete gateway provider and credentials are resolved externally (out of scope of this story).
  - Email gateway (SMTP / transactional email service) must be available for password reset email delivery.
  - `gen.password_reset_tokens` table must be created as part of this story's DB migration.
- Technical dependencies:
  - IDP service (accounting-sso / Duende IdentityServer or equivalent) must be capable of issuing sessions upon successful credential validation.
  - Audit logging subsystem must be available and configurable to capture authentication events.
  - Localization infrastructure (bilingual resource files, RTL/LTR layout support) must be in place in the frontend.
- Constraints:
  - Password reset tokens must be single-use and time-limited; expiry duration is a runtime configuration value (not defined by this story — out of scope of AC-14).
  - Password policy minimum of 8 characters is non-negotiable per the developer spec.
  - No user-facing text may be hard-coded; all strings must route through the localization resource system.
  - The login page is a public-facing, pre-auth screen — it must not expose any authenticated state or internal system details in error messages (avoid username enumeration via recovery flow).
  - Brute-force lockout duration and threshold are MVP-configurable but cannot be zero.

---

## 9. Probable Task Landscape (No Task Creation Here)

- Estimated task clusters:
  - Backend / IDP: 4–5 (credential validation endpoint, AD login integration, brute-force guard, password reset token lifecycle, audit log events)
  - Frontend: 4–5 (login page with tab switching, forgot-password flow screens × 4 states, OTP input, new-password form, bilingual/RTL-LTR layout)
  - QA / Validation: 1–2 (security behavior tests, localization verification, brute-force and token replay tests)
  - DB / Migration: 1 (password_reset_tokens table migration)
  - Docs / Release: 1

- Relative effort:
  - High
  - Rationale: Multi-view frontend flow (6 screen states), dual-mode authentication, AD integration, secure token lifecycle, bilingual + RTL/LTR layout, and mandatory audit logging combine into a high-complexity delivery.

---

## 10. Risks and Unknowns

- Risk-01: ~~Active Directory integration scope is unclear.~~ **RESOLVED (2026-04-29):** AD login is confirmed out of MVP scope. The AD tab is deferred as a future enhancement and must not be included in MVP delivery. No AD configuration is required for AC-14.

- Risk-02: ~~SMS gateway availability and OTP delivery reliability are not confirmed.~~ **RESOLVED (2026-04-29):** SMS gateway provider and credentials are out of scope of this story. AC-14 implements the OTP flow against an injectable SMS service interface; the concrete provider is wired externally.

- Risk-03: ~~Password reset token expiry duration is not specified.~~ **RESOLVED (2026-04-29):** Token TTL definition is out of scope of this story. Implementation must read TTL from application configuration; no hard-coded expiry value.

- Risk-04: ~~The `gen.users` schema is unconfirmed.~~ **RESOLVED (2026-04-29):** AC-14 will use the `dbo.User` table from the SSO repository as established by AC-13. Schema contract is owned by AC-13; AC-14 is a consumer only.

- Risk-05: Username enumeration risk in the "Forgot Password" flow — if the system reveals whether a username/email exists, it may be exploited for account discovery.
  - mitigation: The email-sent confirmation screen must always display the same message regardless of whether the address is registered (already implicit in AoC-08 and AoC-05 generic messaging). Enforce this in backend response design.

- Risk-06: Localization regressions in RTL/LTR layout under the 6-screen password recovery flow.
  - mitigation: Add explicit RTL and LTR layout verification to the acceptance checklist and require sign-off in both languages before story closure.

---

## 11. Open Questions

- OQ-01: What is the intended token TTL for (a) the SMS OTP code and (b) the email reset link? (Decision owner: Product Owner / Security lead)
  - **Answer (2026-04-29):** Out of scope of this story. Token TTL is a security policy configuration value; AC-14 must read it from application configuration. No hard-coded TTL.

- OQ-02: Is Active Directory integration in scope for MVP, or is it a future enhancement? (Decision owner: Product Owner + Infrastructure)
  - **Answer (2026-04-29):** Out of scope of MVP. AD login is deferred as a future enhancement. The AD tab must not be included in the MVP login screen.

- OQ-03: Which SMS gateway provider is used, and are API credentials available? Is there a fallback if SMS delivery fails? (Decision owner: Infrastructure / DevOps)
  - **Answer (2026-04-29):** Out of scope of this story. AC-14 implements the OTP flow against an injectable SMS service interface; provider selection and credentials are an infrastructure concern outside this story.

- OQ-04: What is the exact `gen.users` schema? Does this story need to create/extend it? (Decision owner: Tech Lead)
  - **Answer (2026-04-29):** AC-14 will use `dbo.User` from the SSO repository as defined and created by AC-13. This story does not create or alter the user table; it is a consumer only.

- OQ-05: Should the 1-minute brute-force lockout be a hard requirement or remain optional for MVP? (Decision owner: Product Owner)
  - **Answer (2026-04-29):** Remains optional for MVP. The warning after 5 failed attempts is mandatory; the 1-minute temporary lockout is optional and may be toggled via configuration.

- OQ-06: Are there specific WCAG/accessibility requirements for the login page? (Decision owner: Product Owner)
  - **Answer (2026-04-29):** No specific WCAG requirements for MVP.

---

## 12. REFIENMENT Conclusion

- Readiness recommendation:
  - Ready for Solution: YES — all blocking open questions have been answered (2026-04-29).
  - Resolved conditions:
    - OQ-01 (token TTL): Out of scope of this story — use runtime configuration.
    - OQ-02 (AD scope): Out of MVP scope — AD tab excluded from MVP delivery.
    - OQ-03 (SMS gateway): Out of scope of this story — injectable SMS interface; provider resolved externally.
    - OQ-04 (`dbo.User` schema): Use `dbo.User` from SSO repo per AC-13; AC-14 is a consumer only.
    - OQ-05 (brute-force lockout): Optional for MVP; warning after 5 failures is mandatory.
    - OQ-06 (WCAG): No specific accessibility requirements for MVP.
  - No remaining blocking conditions. Story may proceed to Solution phase.

---

## 13. Approval Gate

- Tech Lead Review:
  - Name: TBD
  - Decision: Pending
  - Notes: TBD

- Product Owner Review:
  - Name: TBD
  - Decision: Pending
  - Notes: TBD

- Final REFIENMENT Decision:
  - Pending approval
