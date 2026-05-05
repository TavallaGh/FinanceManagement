# Story Solution: AC-12

## Story Link

- Jira Story: [`https://nexttoptech.atlassian.net/browse/AC-12`](https://nexttoptech.atlassian.net/browse/AC-12)
- Refinement doc: `docs/work-items/00.refinement/linked/stories/AC-12/refinement.md`
- Target Repository: `accounting-sso` (SSO backend — Identity & Access Management service)

---

## Solution Summary

- **Target behavior:** Deliver a complete API-driven Role Management capability for the `accounting-sso` service. This includes: full role lifecycle (create, edit, deactivate, soft-delete), role-to-user assignment and revocation, role permission tree assignment via a tree-oriented payload, and a role-context permission tree query API. All operations are audited and bilingual-ready.

- **Non-functional requirements:**
  - **Security:** All role management endpoints require authentication and `AdminPolicyAccess` guard. Per-operation permission keys follow `PermissionKey.Build(PermissionLayer.Accounting, PermissionResourceCodeTypes.Roles, ...)` pattern.
  - **Audit:** All role lifecycle and assignment operations emit `AuditLogEntry` records via the existing `IAuditLogService`, matching the established pattern in `UserServices.cs`.
  - **Localization:** All entity string metadata uses bilingual fields (`LabelEn`/`LabelFa`, `DescriptionEn`/`DescriptionFa`). No hardcoded user-facing strings in API responses — error messages are keyed via `GlobalResponseKey`.
  - **Architecture separation:** Thin handlers (Application layer) delegate to a single `IRoleService` contract. Business invariants live in domain or domain services. No data-access logic in handlers or endpoints.
  - **Permission invalidation:** Token-claim mechanism (OQ-02 resolved). Role permission changes take effect at next JWT issuance. No additional cache invalidation plumbing is needed.

---

## Work Breakdown

- **Planned tasks:**
  - AC-82: BE-01 — Role CRUD Application + Presentation
  - AC-83: BE-02 — Role–User Assignment APIs
  - AC-84: BE-03 — Role Permission Management APIs
  - AC-85: BE-04 — Audit, Security, and Integration Tests

- **Dependencies:**
  - AC-82 (Role CRUD) must be completed before AC-83 and AC-84, as both depend on the role service contract and endpoint group being established.
  - AC-83 and AC-84 can proceed in parallel once AC-82 is complete.
  - AC-85 (audit/security/tests) depends on AC-82, AC-83, and AC-84 all being complete — it validates the full story AoC surface.

---

## Technical Decisions

- **Decision 1 — No domain model changes required.**
  All domain entities (`Role`, `UserRoles`, `RolePermission`, `Permission`, `ScopeDetails`) and EF Core configurations (including `RolePermissionConfiguration` confirmed in OQ-01) already exist. Only the Application and Presentation layers need to be built.

- **Decision 2 — Token-natural permission invalidation (no additional invalidation mechanism).**
  Resolved in OQ-02: permissions (direct and role-derived) are encoded in JWT claims by `PermissionClaimsProfileService`. After a role's permissions change, the updated effective permissions are reflected in the next token issued. No cache invalidation hook is needed for role permission save.

- **Decision 3 — Handler pattern: thin handler → single `IRoleService` call.**
  Following the established pattern in `GrantDirectPermissionCommandHandler` and `CreateUserCommandHandler`: each handler injects the service contract and delegates to exactly one service method. No business or data-access logic in handlers.

- **Decision 4 — Endpoint authorization via `PermissionKey.Build` per operation.**
  Each role endpoint uses `PermissionKey.Build(PermissionLayer.Accounting, PermissionResourceCodeTypes.Roles, <action>)` as the authorization policy, matching the `UserEndpoints.cs` pattern. The admin guard `AppConst.AdminPolicyAccess` is applied to the role endpoint group.

- **Decision 5 — Role permission tree query is search-driven (3-char minimum).**
  Resolved in OQ-04: the role-context permission tree query follows the `SearchPermissionsAsync` pattern with a 3-character minimum, extended to overlay a role's current granted state on each tree node. No full-tree dump endpoint is provided.

- **Decision 6 — Role deactivation is permission-check level only (gateway propagation deferred).**
  Resolved in OQ-03 (deferred): setting `Status = false` blocks effective role-based permission coverage at the `HasPermissionAsync` evaluation level. Token-level revocation at the API gateway is out of scope for this story.

- **Decision 7 — Soft-delete contract: `Deprecated = true`.**
  Role deletion sets `Deprecated = true`. Roles with active `UserRoles` assignments cannot be soft-deleted — the API must validate and return a keyed error. Physical delete is never performed.

- **Decision 8 — `RoleService` placed in `ERP.Sso.Infra.Sql/Roles/`.**
  Follows the `UserServices.cs` placement convention (`src/03.Infra/ERP.Sso.Infra.Sql/Users/`). The corresponding contract `IRoleService` lives in `src/01.Domain/ERP.Sso.Domain/Roles/Contracts/`.

- **Decision 9 — `PermissionResourceCodeTypes.Roles` seeding is already present.**
  Confirmed in OQ-05: `AuthorizationDataSeeder` already seeds `PermissionResourceCodeTypes.Roles` permission keys. No new seeding work is required for the base permission catalog.

---

## Done Criteria for Implementation

- All four subtasks (TBD-01 through TBD-04) completed and passing integration tests.
- All story AoC items (AoC-01 through AoC-14) validated with test evidence.
- All role and permission assignment operations emit audit records matching the `AuditLogService` pattern.
- Bilingual labels verified on all role entity API responses.
- No hardcoded strings in API responses; all error messages are keyed.
- TL and PO approve solution package before Jira subtask import.
