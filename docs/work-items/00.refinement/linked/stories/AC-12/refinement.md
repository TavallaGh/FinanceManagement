# Story REFIENMENT Standard: AC-12

## 1. Story Identity

- Jira Story: [`https://nexttoptech.atlassian.net/browse/AC-12`](https://nexttoptech.atlassian.net/browse/AC-12)
- Story Key: AC-12
- Epic: Not set in Jira at extraction time
- Reporter/Owner: Tavalla Ghorbanian
- REFIENMENT Date: 2026-05-05
- REFIENMENT Status: open-questions-resolved
- Target Repository: `accounting-sso` (SSO backend — Identity & Access Management service)
- Fix Version: V 0.1 (MVP)

---

## 2. Purpose of REFIENMENT

- Goal: Agent پروژه را بفهمد.
- This document is for deep understanding before solution/implementation.
- This phase does NOT create tasks.
- Scope note: The "Repo SSO" qualifier means this refinement focuses on the backend deliverables within the `accounting-sso` service. Frontend Role Management screens (in `accounting-frontend`) are in scope for a separate refinement or sub-scope, but are referenced here as integration touchpoints.

---

## 3. Source Inputs Reviewed

- Jira description: Media attachments only (no inline text) — story content is in the attached documents below.
- Jira comments: None at extraction time.
- Jira attachments:
  - `02_Roles_Dev.docx` — Developer specification for Role Management form
  - `02_Roles_Help.docx` — User-facing help guide for Role Management form
- Related local docs:
  - `docs/mvp/02_Roles_Dev.md` — local markdown version of the developer specification
  - `docs/mvp/02_Roles_Help.md` — local markdown version of the help guide
- SSO codebase analysis:
  - `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Entities/Role.cs`
  - `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Entities/UserRoles.cs`
  - `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Permissions/Entities/Permission.cs`
  - `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Permissions/Entities/RolePermission.cs`
  - `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Permissions/Entities/UserPermission.cs`
  - `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Permissions/Entities/ScopeDetails.cs`
  - `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Permissions/`
  - `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/PermissionEndpoints.cs`

---

## 4. Problem Narrative (Why)

### 4.1 Current Problem

- What is wrong today:
  - The `accounting-sso` service has the Role domain entity (`Role`, `UserRoles`, `RolePermission`) in place, but there is **no Application layer for Roles** — no CQRS commands or queries exist to create, edit, search, or manage roles through the API.
  - There are **no Presentation layer endpoints** for roles (no REST API routes for role CRUD or role-user/role-permission management).
  - The three-level permission model (L1: form access, L2: allowed operations, L3: data scope) is partially modeled in domain entities (`Permission`, `ScopeDetails`, `RolePermission`) but there is no end-to-end API flow to assign permissions to a role via the tree structure.
  - Role assignment to users exists at the entity level (`UserRoles`) but cannot be performed through the API.
  - Without role management APIs, user onboarding through roles is not possible — roles exist in seed data or migrations only with no administrative control plane.

- Where it happens:
  - `accounting-sso` Application layer (missing Roles use-case handlers)
  - `accounting-sso` Presentation layer (missing Role API endpoints)
  - Downstream: Frontend has no API surface to call for role administration

- Who is impacted:
  - System administrators (cannot manage roles or permission trees via UI)
  - Information security officers (no administrative control over role-based access)
  - HR/Finance managers (cannot assign roles to new users through the system)
  - Developers/QA (integration testing of role-based access control is blocked)

### 4.2 Business Impact

- Operational impact:
  - Role assignments can only be done by direct database manipulation — manual, risky, not auditable.
  - System cannot be handed to end users for go-live readiness without a role management UI.
  - Onboarding new users requires developer intervention.
- Risk impact:
  - Privilege escalation risk — no controlled role-assignment workflow means direct DB access is the only method, bypassing audit.
  - Permission drift — without a managed permission assignment surface, roles may accumulate incorrect permissions.
- Compliance/security impact:
  - Without audited role and permission assignment operations, the system violates basic access control traceability requirements.
  - RBAC cannot be enforced consistently without an administrative API for role lifecycle management.

### 4.3 Target Outcome

- A complete, API-driven Role Management capability within the `accounting-sso` service that allows:
  - Full role lifecycle (create, edit, deactivate, soft-delete) via authenticated APIs.
  - User-to-role assignment and revocation (with live search support data).
  - Three-level permission tree management per role (L1 form access, L2 operation allowlist, L3 data scope).
  - Immediate permission invalidation propagation when a role's permissions change.
  - Fully auditable role and permission operations.
  - Bilingual (FA/EN) metadata on role entities.
  - Integration-ready permission tree query API to support the frontend tree-modal UI.

---

## 5. Extracted Story Contract

### 5.1 Description (Extracted)

- Extracted/normalized description:
  - The system must provide full role lifecycle management for organizational roles (e.g., Accountant, Financial Manager, Warehouse Manager, System Admin).
  - The system must support a centralized, unified three-level access control model applied per role.
  - Roles must be assignable to multiple users, and the assignment/revocation must be API-driven with live-search support data.
  - The three-level access model is: Level 1 (form/report visibility), Level 2 (allowed operations per form: create, edit, delete, print, confirm, export, share, custom), Level 3 (data scope: which data subsets are visible per form).
  - After any permission change on a role, the change must take effect immediately for all users holding that role.

### 5.2 AoC (Acceptance of Completion / Acceptance Criteria)

- AoC-01: Role list API supports filtering by role name/title, system code, and active status, with paginated results.
- AoC-02: Role creation API accepts: title (FA + EN), system code (unique), active status, start date, end date — and validates required fields.
- AoC-03: Role edit API allows updating all role fields; system code uniqueness is enforced.
- AoC-04: Role deactivation blocks immediate effective access for all users holding the role (is_active = false).
- AoC-05: Role deletion is soft-delete only; roles assigned to users cannot be hard-deleted; historical trace is preserved.
- AoC-06: User-assignment API: add/remove users from a role with live-search support query (list users by username/name).
- AoC-07: Permission assignment API: assign Level 1 (form access), Level 2 (operations), and Level 3 (data scopes) permissions to a role in a single tree-oriented payload.
- AoC-08: Permission tree query API: return the full permission tree (all forms/modules with their L2 operations and L3 scopes) with the current role's granted permissions flagged — supports building the frontend tree-modal.
- AoC-09: Apply-all / remove-all permission operations: grant or revoke all permissions on a node and all its children atomically.
- AoC-10: After a role permission save, invalidation of cached permissions is triggered immediately for all affected users.
- AoC-11: All role and permission assignment operations are audit-logged (who, when, before state, after state).
- AoC-12: Error responses are standard: duplicate system code, assigned-role delete attempt, permission save failure.
- AoC-13: All string metadata (title, description, label) supports bilingual values (FA + EN); no hardcoded user-facing strings.
- AoC-14: All endpoints require authentication; role management endpoints require admin/superuser policy.

### 5.3 DoD (Definition of Done)

- DoD-01: All story AoC items are validated with test evidence (integration tests or equivalent).
- DoD-02: Role and permission assignment audit events are verified across API flows.
- DoD-03: Permission invalidation propagation is verified (users receive updated effective permissions after role change).
- DoD-04: Bilingual metadata (FA/EN labels) is verified on role entity responses.
- DoD-05: No hardcoded strings in API responses; error messages are keyed.
- DoD-06: Story is approved and ready to move to Solution phase.

---

## 6. Scope Decomposition (Smallest Story Parts)

- Capability slice 1: Role CRUD (Application + Presentation)
  - detail: Create, Read, Edit, Deactivate, Soft-Delete role operations. Application layer CQRS handlers (commands: CreateRole, UpdateRole, DeactivateRole, DeleteRole; queries: GetRoleById, SearchRoles). Presentation: REST endpoints under `/api/v1/sso/roles`. Domain entity `Role` already exists. Validators, error handling, bilingual field support. SystemCode uniqueness enforcement.

- Capability slice 2: Role–User Assignment Management
  - detail: Commands to assign/revoke users to/from a role. Query to list users of a role and to search users for assignment (live-search input support). The `UserRoles` entity exists at domain level; application and presentation layers are absent. Validation: prevent assignment of an inactive role.

- Capability slice 3: Role Permission Tree Assignment
  - detail: Command to set (replace or merge) a role's permission assignments. Payload structure maps the tree: each entry references a Permission by ID/key, specifying L2 operation flags and L3 scope detail IDs. Validate that referenced permission IDs exist. Apply-all / remove-all batch variants. `RolePermission` entity exists; application and presentation layers are absent.

- Capability slice 4: Permission Tree Query API for Role Context
  - detail: Query endpoint that returns the full permission tree (all forms and modules, their L2 operations, their L3 data scopes) alongside the current granted state for a specific role. This is the data source for the frontend tree-modal. Builds on existing `Permission`, `ScopeDetails`, and `RolePermission` data. Must be performant (single query or well-cached).

- Capability slice 5: Permission Invalidation on Role Change
  - detail: After any role permission save, trigger invalidation of any cached effective-permission state for all users holding that role. Mechanism depends on current caching strategy in the SSO service (in-memory, distributed cache, or event-based). Must be atomic with the permission save.

- Capability slice 6: Audit Trail for Role Operations
  - detail: Audit events for: role created, role edited, role deactivated, role deleted, user assigned to role, user removed from role, role permissions updated. `RolePermission` already inherits `AuditedEntity`. Ensure all other operations emit audit records through the same audit subsystem used in User Management.

---

## 7. Out of Scope

- Explicitly excluded in this story:
  - Frontend (UI) implementation of the Role Management form and tree-modal — this is scoped to `accounting-frontend` and is a separate delivery (referenced as integration consumer of the APIs built here).
  - Direct user permission management (L2/L3 assigned directly to a user, not via a role) — already delivered or in scope for AC-13.
  - Role cloning / copy-role functionality — listed as future enhancement in MVP docs.
  - System roles (non-deletable, pre-seeded defaults) — listed as future enhancement.
  - Advanced data scope SQL conditions — future enhancement.
  - Access matrix reporting (which user has access to which form) — future enhancement.
  - Password or user credential management — out of role management scope.
  - Any changes to the `Permission` or `ScopeDetails` catalog itself (that is a separate administrative function, not role assignment).

---

## 8. Dependency and Constraints

- Functional dependencies:
  - `Permission` and `ScopeDetails` catalog must be seeded/populated with all forms, operations, and data scopes before the tree API can return meaningful data.
  - `User` records must exist for user-to-role assignment.
- Technical dependencies:
  - Domain entities (`Role`, `UserRoles`, `RolePermission`, `Permission`, `ScopeDetails`) are already in place — no domain model changes expected, only Application and Presentation layers.
  - EF Core configurations for `Role` and `UserRoles` exist in Infra; `RolePermission` configuration location must be verified.
  - The permission invalidation mechanism depends on the current caching implementation in the SSO service (to be confirmed in Solution phase).
  - `NT.IDP.BaseIdentity` base classes (`BaseRole<int>`, `BaseUserRole<int>`) constrain the identity model extension approach.
  - MediatR + CQRS pattern is already established in the service (visible in existing Permissions application layer).
  - Authentication and admin policy guard (`AppConst.AdminPolicyAccess`) is already defined — role endpoints must reuse it.
- Constraints:
  - Soft-delete must preserve assignable history (no cascade physical delete).
  - Application layer handlers must stay thin; domain/business rules belong in domain or domain services.
  - All endpoints follow the established minimal-API style (`MapGroup` / `MapGet` / `MapPost` pattern as seen in `PermissionEndpoints.cs` and `UserEndpoints.cs`).
  - No hardcoded user-facing string literals in response bodies.
  - Fix Version must be `V 0.1 (MVP)`.

---

## 9. Open Questions

- OQ-01: Is `RolePermission` EF configuration present in Infra? (Not found in the `Configurations/Roles` or `Configurations/Permissions` listing during codebase scan — needs verification before Solution phase.)
  - Decision owner: Backend Tech Lead
  - **Resolution (2026-05-05): RESOLVED — `RolePermissionConfiguration` exists at `ERP.Sso.Infra.Sql.Configurations.Permissions` (`src/03.Infra/ERP.Sso.Infra.Sql/Configurations/Permissions/RolePermissionConfiguration.cs`). Configuration is complete with composite key, FK relationships, cascade behavior, and index.**

- OQ-02: What is the current permission caching strategy? Is there an existing cache invalidation pattern for user effective permissions that role permission save can hook into?
  - Decision owner: Backend Tech Lead
  - **Resolution (2026-05-05): RESOLVED — Permissions (both direct and role-derived) are stored directly in the client token (JWT claims). There is no separate server-side permission cache. Invalidation is implicit: on next token issuance after a role permission change, the new effective permissions are included. No additional cache invalidation hook is needed for the role permission save.**

- OQ-03: Should role deactivation automatically propagate to deny access immediately at the API gateway / token-validation level, or only at the permission-check level? This affects where the deactivation effect is enforced.
  - Decision owner: Tech Lead + Product Owner
  - **Resolution (2026-05-05): DEFERRED — Decision will be made in a later phase. No blocking impact on current Solution phase scope.**

- OQ-04: Should the permission tree query endpoint be paginated or always return the full tree? (Tree could be large in complex deployments.)
  - Decision owner: Tech Lead
  - **Resolution (2026-05-05): RESOLVED — The permission tree search endpoint requires a minimum 3-character query and does not return the full permission list. It is search-driven (paginated search, not a full-tree dump). This aligns with the existing `SearchPermissionsAsync` implementation which enforces `query.Length < 3` validation.**

- OQ-05: Is there a seeded permission catalog already in the database (migrations or data seeds)? If not, the tree API will return an empty tree and must be addressed before integration testing is possible.
  - Decision owner: Backend Tech Lead
  - **Resolution (2026-05-05): RESOLVED — `AuthorizationDataSeeder` exists in the Infra layer (`src/03.Infra/ERP.Sso.Infra.Sql/Permissions/AuthorizationDataSeeder.cs`). It seeds permissions and roles (including SuperAdmin wildcard). Integration testing can proceed against a seeded database.**

- OQ-06: Does the `NT.IDP.BaseIdentity.BaseRole<int>` base class include a `Name` or `NormalizedName` field (ASP.NET Identity convention)? How does this align with the bilingual `LabelEn`/`LabelFa` design? This mapping must be clarified to avoid identity framework conflicts.
  - Decision owner: Backend Tech Lead
  - **Resolution (2026-05-05): RESOLVED — Yes, `BaseRole<int>` does include `Name` and `NormalizedName` (ASP.NET Identity convention). These coexist with the bilingual `LabelEn`/`LabelFa` fields. The `Role` entity already uses both patterns (as seen in `AuthorizationDataSeeder` which sets both `Name`/`NormalizedName` and `LabelEn`/`LabelFa`).**

---

## 9. Probable Task Landscape (No Task Creation Here)

- Estimated task clusters:
  - Backend (SSO): 5–6 (Role CRUD handlers + endpoints, Role–User assignment, Role–Permission tree assignment, Permission tree query, Permission invalidation, Audit coverage)
  - Frontend (accounting-frontend): 3–4 (Role list page, Create/Edit form, Tree-modal for permissions, Role-User assignment panel) — out of SSO scope, referenced for planning
  - QA/Validation: 1–2
  - Docs/Release: 1

- Relative effort:
  - Low / Medium / High: **High**
  - Rationale: While domain entities are in place, the full Application + Presentation layers for a complex three-level hierarchical permission model with immediate invalidation semantics is non-trivial. Permission tree query and invalidation are the highest-complexity slices.

---

## 10. Risks and Unknowns

- Risk-01: `RolePermission` EF configuration may be absent, causing migration errors when saving role permissions.
  - Mitigation: Verify configuration presence in Solution phase before generating any migration; add configuration if missing.

- Risk-02: Permission tree query performance may degrade if the permission catalog is large and the query is not optimized.
  - Mitigation: Agree on query strategy (eager-load with projection vs. raw SQL) and add query performance test with realistic permission catalog size.

- Risk-03: Permission cache invalidation may not cover all scenarios if users hold roles that were not tracked in a session cache.
  - Mitigation: Freeze the invalidation contract during Solution phase; include an integration test that validates permission changes take effect on the next authenticated request.

- Risk-04: The `BaseRole<int>` ASP.NET Identity base class may enforce constraints (e.g., unique `Name`, `NormalizedName`) that conflict with the custom `Key`/`SystemCode` unique index design.
  - Mitigation: Clarify Identity base class fields and resolve mapping conflicts before implementation (see OQ-06).

- Risk-05: Frontend tree-modal API contract may require additional shape adjustments (node IDs, parent-child relationships) that are not yet finalized.
  - Mitigation: Define and freeze the permission tree response DTO contract before starting frontend implementation to avoid rework.

---

## 11. REFIENMENT Conclusion

- Readiness recommendation:
  - Ready for Solution: **Conditional YES**
  - Conditions: OQ-01 (RolePermission config), OQ-02 (cache invalidation pattern), OQ-03 (deactivation propagation scope), and OQ-06 (BaseRole identity field mapping) must be resolved or have an agreed answer before Solution phase can finalize implementation design.

---

## 12. Approval Gate

- Tech Lead Review:
  - Name: Hamid
  - Decision: Approved
  - Notes: TBD

- Product Owner Review:
  - Name: Tavalla
  - Decision: Approved
  - Notes: TBD

- Final REFIENMENT Decision:
  - Pending approval
