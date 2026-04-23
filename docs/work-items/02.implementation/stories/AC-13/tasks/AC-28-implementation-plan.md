---
title: "AC-28 — BE-02 - User Lifecycle APIs — Implementation Plan"
jira: AC-28
parent: AC-13
phase: Implementation
created: 2026-04-19
---

# AC-28 — BE-02 - User Lifecycle APIs (Implementation Plan)

Source: https://nexttoptech.atlassian.net/browse/AC-28

## 1. Task Summary

- Jira key: AC-28
- Parent story: AC-13 - User Management
- Task summary: BE-02 - User Lifecycle APIs
- Canonical task spec: [Solution Task Spec](../../../../01.solution/linked/stories/AC-13/tasks/AC-28.md)

## 2. Readiness Checks

- AoC present: Yes (AOC-01..AOC-03)
- DoD present: Yes (DOD-01..DOD-03)
- Test Cases / TDD / BDD present: Yes (solution task spec)
- Fix Version: V 0.1 (MVP)
- TL gate required before coding: Yes

## 3. Repository Target Matrix

- Workspace/process repository (docs/traceability artifacts):
  - `docs/work-items/**`
- Product code repository (API and tests):
  - `projects/accounting-sso`
  - Primary implementation area:
    - `projects/accounting-sso/src/**`


## 4. Production Scope

Implement and harden user lifecycle APIs with validation, authorization, auditability, and stable error contracts.

Target endpoint set:
- `GET /api/v1/sso/users` - list/search users
- `POST /api/v1/sso/users` - create user
- `PUT /api/v1/sso/users/{id}` - update user
- `POST /api/v1/sso/users/{id}/deactivate` - deactivate user (soft-delete semantics)
- `DELETE /api/v1/sso/users/{id}` - hard delete (restricted and auditable)
- `POST /api/v1/sso/users/{id}/reset-password` - password reset flow

Mandatory validations and behaviors:
- Unique username enforcement
- Linked party existence and validity
- Permission and role checks for admin operations
- Unified error contract: `{ code, message, details? }`
- Deactivation must immediately block authentication for the target account

## 5. Implementation Steps (Execution-Ready)

1. Contract alignment and route strategy
- Confirm canonical route prefix (`/api/v1/sso/users`) and backward compatibility policy.
- Finalize request/response models and error envelopes.

2. Domain and application service hardening
- Extend user service interfaces and handlers for lifecycle actions.
- Enforce domain invariants in service/domain layers (not controllers).

3. Controller/endpoint implementation
- Replace placeholder controller behavior with production behavior.
- Implement validation, authorization, and consistent status codes per endpoint.

4. Security controls for reset-password and delete flows
- Add anti-enumeration controls and audit events.
- Restrict hard-delete operation with explicit authorization + audit trail.

5. Persistence and integration guarantees
- Verify state transitions and storage updates for deactivate/delete/reset.
- Ensure consistency between API layer and identity/user services.

6. Delivery and traceability
- Workspace and project task MRs on branch:
  - `features/ac-28-be-02-user-lifecycle-apis`
- Keep MRs Draft during implementation; move to Ready at Jira `In Review`.

## 6. TDD Plan (Must Run Before Final Code)

Requirement-to-test-first mapping:

1. User create/update validations
- Write failing unit tests for duplicate username, invalid linked party, and invalid payload.
- Implement minimal validation logic to pass tests.

2. Deactivate and delete behavior
- Write failing unit/integration tests for state transitions, auth blocking, and restricted delete rules.
- Implement lifecycle service and endpoint behavior to satisfy tests.

3. Reset-password flow
- Write failing tests for token issuance/reset initiation, permission checks, and response shape.
- Implement secure reset flow behavior and pass all tests.

4. Error contract consistency
- Write failing contract tests for structured error responses.
- Implement consistent API error handling across all lifecycle endpoints.

## 7. BDD Acceptance Scenarios

1. Create user success
- Given a valid admin user and valid create payload
- When the admin calls `POST /api/v1/sso/users`
- Then the API creates the user and returns success payload and status

2. Duplicate username rejection
- Given an existing username in the system
- When admin submits create payload with the same username
- Then the API returns validation error contract with deterministic code

3. Deactivate blocks access
- Given an active user
- When admin deactivates the user
- Then user authentication is blocked and deactivated state is persisted

4. Reset-password authorization and flow
- Given an authorized admin
- When admin starts reset-password for a valid user
- Then reset flow is started securely and non-sensitive response is returned

## 8. Non-Functional and Security Requirements

- No placeholder logic in production endpoints/services.
- Audit logging for deactivate, delete, and reset-password actions.
- No credential/token leakage in API responses or logs.
- Deterministic error codes for client-side handling.

## 9. Risks and Rollback

- Risk: Hard-delete misuse or accidental destructive operations.
  - Mitigation: Restrict permissions, require explicit confirmation semantics, and enforce audit logging.
- Risk: Reset-password endpoint abuse.
  - Mitigation: anti-enumeration behavior, rate limiting integration point, and security review gate.

Rollback strategy:
- Keep changes isolated to lifecycle modules and endpoint contracts.
- Revert feature branch commits if regression is detected before merge.

## 10. TL Approval Checklist (Hard Gate)

1. Confirm endpoint contracts and status codes are approved.
2. Confirm TDD matrix fully covers AoC/DoD/Test Cases.
3. Confirm BDD scenarios are executable and acceptance-ready.
4. Confirm security controls for reset-password and hard-delete are approved.
5. Confirm repository targets and branch strategy are approved.

## 11. Next Actions After TL Approval

- Run `/speckit.implement` with this plan as the execution source.
- Generate real code and tests in `projects/Accounting-Project` according to this plan.
- Update Jira `AC-28` and traceability links (Jira <-> GitLab issue <-> workspace/project MRs).
