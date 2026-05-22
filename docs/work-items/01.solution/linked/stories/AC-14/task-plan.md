# Story Task Plan: AC-14

## 1. Story Context

- Jira Story: [`https://nexttoptech.atlassian.net/browse/AC-14`](https://nexttoptech.atlassian.net/browse/AC-14)
- Refinement Source: [docs/work-items/00.refinement/linked/stories/AC-14/refinement.md](../../00.refinement/linked/stories/AC-14/refinement.md)
- Solution Source: [docs/work-items/01.solution/linked/stories/AC-14/solution.md](solution.md)
- Plan Owner: TBD
- Plan Date: 2026-04-29
- Plan Status: draft

---

## 2. Why This Story Exists

- Problem to solve:
  - The SSO/IDP project has a login backend but no UI, and no self-service password recovery at all. Users are blocked from authenticating through any front-facing screen, and password recovery requires admin intervention.
- Expected outcome:
  - A razor-based login UI + 3-state forgot-password flow, backed by a lightweight OTP reset backend (dev bypass: `12346`). No notification system, no custom token table.

---

## 3. Baseline — Already Done in SSO Repo (from AC-13)

> These are **not tasks**. They are completed work that AC-14 builds on.

- `User` entity with `LastLoginUtc`, `SetLockout()`, `UpdateLastLoginUtc()` behaviors — ready to use.
- `AuditLogService` + `IAuditLogService.WriteAsync()` — ready to receive password reset events.
- **`AccountController` login flow fully implemented** — GET/POST `/Account/Login`, Logout, `SignInManager<User>` wired. No changes needed.
- `Login.cshtml` basic scaffold — will be superseded by razor login component.
- Duende IdentityServer fully configured — no changes needed.
- `UserManager<User>` with `GeneratePasswordResetTokenAsync` / `ResetPasswordAsync` — built-in data-protector token, no DB table needed.
- DB migration infrastructure (`ErpIdsDbContext`, EF migrations) — ready; no new migration for this story.

---

## 4. Aggregated Task Landscape

> Note: tasks here are aggregated delivery tasks, not micro technical steps.
> Task keys are placeholders — assigned by Jira on import.

| Proposed Task | Task Name | Stack | Goal | Problem This Task Solves | Priority |
|---|---|---|---|---|---|
| [AC-46](https://nexttoptech.atlassian.net/browse/AC-46) | BE-01 — Forgot-Password Backend + OTP Validation | Backend / IDP | Implement forgot-password controller: `Identify`, `RequestOtp`, `VerifyOtp`, `SetPassword` endpoints using ASP.NET Identity built-in tokens; dev-mode OTP bypass (`12346`); extend `AuditAction` enum with self-service reset events | No self-service password reset backend exists; admin must intervene for every forgotten password | P1 |
| [AC-47](https://nexttoptech.atlassian.net/browse/AC-47) | FE-01 — Razor UI: Login + Forgot-Password All Screens | Frontend / IDP (razor) | Build all razor components for login (glassmorphism, bilingual FA/EN, RTL/LTR, field errors, submit guard) and forgot-password 3-state flow (`Identify`, `VerifyOtp`, `SetPassword`) | No UI exists; users cannot authenticate or self-serve password reset | P1 |
| [AC-48](https://nexttoptech.atlassian.net/browse/AC-48) | QA-01 — Security + Localization Validation | QA | Validate OTP dev bypass behaviour, enumeration guard, password policy enforcement, audit entry coverage, RTL/LTR layout sign-off in both languages | No tests exist for the login/reset surface | P2 |
| [AC-97](https://nexttoptech.atlassian.net/browse/AC-97) | NOTIF-01 — NT.Notification.SDK Integration for Email/SMS | Infrastructure + Backend / SSO + IDP | Install NT.Notification.SDK in `Accounting-Infrastructure`; implement real OTP generation and email/SMS delivery queues; refactor AC-46 backend to use real notifications instead of `12346` dev bypass; design extensible notification architecture for future features (account lockout alerts, login notifications, session warnings, activity summaries) | Password reset in MVP uses hardcoded dev bypass OTP (`12346`); no real SMS/email delivery; no self-service password recovery in Production/QA environments; no infrastructure for future authentication notifications | P1 |

---

## 5. Task Dependencies

```
AC-46 (forgot-password backend with dev OTP bypass)
    ├─► AC-47 (razor UI wires to backend endpoints)
    │   └─► AC-48 (validates both)
    │
    └─► AC-97 (real SMS/email SDK integration)
        │   [Refactors AC-46 backend to use real OTP]
        │   [Removes 12346 dev bypass stub]
        └─► (QA re-validation after AC-97 integration)
```

**Critical path:** AC-46 → [AC-47 + AC-97] → AC-48 (re-validate with real notifications).

**Sequence Note**: AC-46 can be developed and tested with the `12346` dev bypass. AC-97 runs in parallel or immediately after AC-46 to replace the bypass with real OTP/SMS/Email. AC-47 (UI) can proceed independently. AC-48 must run after both AC-46 backend improvements (AC-97 integration) and AC-47 frontend are complete to validate the entire flow end-to-end with real notifications.

---

## 6. Scope Guardrails

- **Login backend**: already implemented — no changes. `AccountController` is not touched by any AC-14 task.
- **AD login tab**: excluded from all tasks — not built, not stubbed.
- **Notification system (SMS/email)**: implemented in AC-97. Initial AC-14 scope (AC-46, AC-47, AC-48) uses dev bypass OTP (`12346`). AC-97 replaces the bypass with real SMS/email delivery via NT.Notification.SDK integration in the infrastructure layer.
- **Password reset token table**: no custom entity, no migration — use ASP.NET Identity built-in `UserManager` token only.
- **Dev OTP bypass**: 
  - **AC-46, AC-47, AC-48**: OTP `12346` accepted only when `ASPNETCORE_ENVIRONMENT == Development`. Must be environment-guarded — cannot reach production.
  - **AC-97**: removes the `12346` bypass entirely and replaces it with real OTP generation and delivery.
- **`dbo.Users` table**: read-only consumer via `UserManager<User>` — no schema changes.
- **UI technology**: all new UI is razor in `Erp.Sso.Ids` — no new Razor views.
- **`speckit.Task` creates Jira subtasks**: no Jira tasks are created from this plan file directly.

---

## 7. Jira Mapping Rule

- All tasks derived from this story must be created as Jira subtasks under parent story AC-14.
- Import to Jira happens only after solution review approval and TL/PO sign-off.
- Task keys above (AC-14-BE-01, etc.) are internal planning identifiers — Jira will assign real keys on import.

---

## 8. Approval Gate

- Tech Lead: pending
- Product Owner: pending
- Jira import ready: yes
