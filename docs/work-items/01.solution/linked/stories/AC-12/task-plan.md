# Story Task Plan: AC-12

## 1. Story Context

- Jira Story: [`https://nexttoptech.atlassian.net/browse/AC-12`](https://nexttoptech.atlassian.net/browse/AC-12)
- Refinement Source: `docs/work-items/00.refinement/linked/stories/AC-12/refinement.md`
- Solution doc: `docs/work-items/01.solution/linked/stories/AC-12/solution.md`
- Plan Owner: TBD
- Plan Status: draft

---

## 2. Why This Story Exists

- **Problem to solve:**
  The `accounting-sso` service has all Role domain entities in place (`Role`, `UserRoles`, `RolePermission`) but has zero Application or Presentation layer coverage for roles. Role lifecycle management, user-to-role assignment, and role permission assignment can only be performed via direct database access — bypassing all audit, validation, and authorization controls.

- **Expected outcome:**
  A complete, API-driven Role Management capability: role CRUD, role-user assignment, role permission tree assignment, and a role-context permission tree query API — all audited, secured, and bilingual-ready.

---

## 3. Aggregated Task Landscape

> Tasks are aggregated delivery tasks, not micro technical steps.

| Proposed Task Key | Task Name | Stack | Goal Of Task | Problem This Task Solves | Priority |
| ----------------- | --------- | ----- | ------------ | ------------------------ | -------- |
| [AC-82](https://nexttoptech.atlassian.net/browse/AC-82) | BE-01 — Role CRUD Application + Presentation | Backend (Application + Presentation) | Deliver role lifecycle (create, edit, deactivate, soft-delete, search, get-by-id) via CQRS handlers and REST endpoints under `/api/v1/sso/roles` | No Application layer handlers or Presentation endpoints exist for role management; role lifecycle requires direct DB access | P1 |
| [AC-83](https://nexttoptech.atlassian.net/browse/AC-83) | BE-02 — Role–User Assignment APIs | Backend (Application + Presentation) | API-driven role-user assignment and revocation with live-search user query support under `/api/v1/sso/roles/{roleId}/users` | `UserRoles` entity exists at domain level but has no application or presentation layer; role assignment is inaccessible via API | P1 |
| [AC-84](https://nexttoptech.atlassian.net/browse/AC-84) | BE-03 — Role Permission Management APIs | Backend (Application + Presentation) | Assign/replace a role's full permission set via tree-oriented payload (apply-all/remove-all); query a role's current permission tree with granted-state flags via search-driven endpoint | No API surface exists for role permission assignment or role-context permission tree query; `RolePermission` is only accessible via seed data | P1 |
| [AC-85](https://nexttoptech.atlassian.net/browse/AC-85) | BE-04 — Audit, Security, and Integration Tests | Backend + QA | Ensure all role operations emit `AuditLogEntry` records; enforce `AdminPolicyAccess` and per-operation `PermissionKey` guards on all role endpoints; validate all story AoC items with integration test evidence | Security and traceability controls are unverified; story cannot close without complete audit coverage and test evidence across all AoC items | P1 |

---

## 4. Jira Mapping Rule

- All tasks derived from this story must be created as Jira subtasks under parent story `AC-12`.
- Import to Jira happens only after solution review approval.
- Frontend Role Management screens (`accounting-frontend`) are explicitly excluded from this story's scope and will be addressed in a separate story.

---

## 5. Approval Gate

- Tech Lead: pending
- Product Owner: pending
- Jira import ready: no
