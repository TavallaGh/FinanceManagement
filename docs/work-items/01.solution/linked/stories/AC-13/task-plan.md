# Story Task Plan: AC-13

## 1. Story Context

- Jira Story: [`https://nexttoptech.atlassian.net/browse/AC-13`](https://nexttoptech.atlassian.net/browse/AC-13)
- REFIENMENT Source: docs/work-items/00.refienment/linked/stories/AC-13/REFIENMENT.md
- Plan Owner: TBD
- Plan Status: draft

## 2. Why This Story Exists

- Problem to solve:
  - User management lifecycle, permission explainability, and secure access enforcement are currently fragmented and operationally risky.
- Expected outcome:
  - A complete, secure, and auditable user management capability with bilingual and RTL/LTR-ready behavior.

## 3. Aggregated Task Landscape

> Note: tasks here are aggregated delivery tasks, not micro technical steps.

| Proposed Task Key | Task Name | Stack | Goal Of Task | Problem This Task Solves | Priority |
| ----------------- | --------- | ----- | ------------ | ------------------------ | -------- |
| AC-27 | BE - Domain Design + Data Model (User Scope) | Backend | Establish user domain model and persistence contract (excluding party/company domain) | Missing stable data foundation for lifecycle and permission features in current story scope | P1 |
| AC-28 | BE-02 - User Lifecycle APIs | Backend API | Deliver create/edit/deactivate/delete/reset endpoints | User lifecycle operations are inconsistent and incomplete | P1 |
| AC-29 | BE-03 - Direct Permission Management APIs | Backend API | Provide APIs to manage direct permissions and source attribution | Effective access and exception handling are unclear in current model | P1 |
| AC-30 | BE-04 - Security, Audit, and Tests | Backend + QA | Enforce security policies and audit coverage with tests | Security and traceability controls are at risk without explicit hardening | P1 |
| AC-31 | FE-01 - User List + Filters UI | Frontend | Build searchable and filterable user listing experience | Admin operations are slow without structured list and filters | P2 |
| AC-32 | FE-02 - Create/Edit + State Actions UI | Frontend | Implement user lifecycle forms and state actions | Admins cannot safely manage user lifecycle in one coherent UI flow | P1 |
| AC-33 | FE-03 - Direct Permission UI | Frontend | Enable direct permission management in UI | Exception access handling is not manageable without dedicated UX | P2 |
| AC-34 | FE-04 - Effective Access View + UI Tests | Frontend + QA | Show permission sources and validate behavior with UI tests | Access visibility and confidence are low without explainable views and tests | P1 |
| AC-35 | User Story Preparation | Solution/Docs | Consolidate story-level readiness and packaging for review/import | Delivery cannot move smoothly without aligned story packaging and traceability | P2 |

## 4. Jira Mapping Rule

- All tasks derived from this story must be created as Jira subtasks under parent story AC-13.
- Import to Jira happens only after solution review approval.
- Party/company domain coverage and linkage implementation are excluded from AC-13 and reserved for future stories.

## 5. Approval Gate

- Tech Lead: pending
- Product Owner: pending
- Jira import ready: no
