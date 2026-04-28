# AC-29 — Task Completion

## Summary

- **Task:** AC-29
- **Related Story:** AC-13
- **Title:** BE-03 - Direct Permission Management APIs
- **Status:** Completed — ready for review

## Description

- Implemented direct permission management APIs and authorization behavior updates for `projects/accounting-sso`.
- Migrated permission-key representation to numeric enum values in persistence, API policy keys, and token claims.
- Added wildcard support and governance:
  - `2:*:1` action wildcard across resources in layer
  - `2:10002:*` all actions in one resource
  - `2:**` full layer access
- Enforced non-assignable direct wildcard for people/users (`PermissionActions.All` blocked for direct-user grants).
- Added role-seeded SuperAdmin-style wildcard propagation into effective permissions and token claims.

## Acceptance Criteria

- AC-01: Effective permissions are returned for selected user and current user as union of direct + role grants.
- AC-02: Direct permission grant mutation replaces prior direct set with requested set.
- AC-03: Wildcard permissions are supported in permission checks and token claims.
- AC-04: Direct wildcard grant intent is rejected for person-level direct assignment.
- AC-05: Redundant granular claims are removed when wildcard grant exists for same scope.

## Implementation Notes

- Files changed and rationale:
  - `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Permissions/PermissionService.cs`
    - Added numeric key normalization paths and wildcard-aware checks.
    - Added direct-assignment validation to reject `PermissionActions.All`.
  - `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Permissions/PermissionClaimsProfileService.cs`
    - Added wildcard-aware claim compaction and duplicate suppression.
  - `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Permissions/AuthorizationDataSeeder.cs`
    - Added/used super-admin wildcard seed and normalized role permission key set.
  - `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Permissions/Helpers/PermissionHierarchy.cs`
  - `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Commons/Helpers/PermissionHierarchy.cs`
    - Unified canonical parsing and wildcard coverage semantics.
  - `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Commons/PermissionAuthorizationHandler.cs`
  - `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Commons/Extensions/TokenExtensions.cs`
  - `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Commons/Extensions/PermissionKey.cs`
    - Policy/claim checks now evaluate wildcard coverage and numeric keys.

## Tests

- Automated tests:
  - `dotnet test test/ERP.Sso.Api.Tests.Integration/ERP.Sso.Api.Tests.Integration.csproj --filter "PermissionAuthorizationPolicyTests|PermissionServiceIntegrationTests"`
  - `dotnet test test/ERP.Sso.Api.Tests.Integration/ERP.Sso.Api.Tests.Integration.csproj --filter "PermissionServiceIntegrationTests"`
  - Result: passed.
- Manual verification steps:
  1. Authenticate with a role containing `2:**` and verify token contains wildcard claim and broad authorization succeeds.
  2. Attempt direct grant request with `PermissionActions.All` and verify validation failure.
  3. Grant `2:10001:*` through role and verify granular `2:10001:{action}` claims are not redundantly emitted.

## Traceability

- Jira Task: https://nexttoptech.atlassian.net/browse/AC-29
- Jira Story: https://nexttoptech.atlassian.net/browse/AC-13
- Workspace MR: https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/15
- Project MR: https://gitlab.com/next-top-tech/accounting/accounting-sso/-/merge_requests/4

## Source Files

- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Permissions/Helpers/PermissionHierarchy.cs`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Commons/Helpers/PermissionHierarchy.cs`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Permissions/PermissionService.cs`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Permissions/PermissionClaimsProfileService.cs`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Permissions/AuthorizationDataSeeder.cs`
- `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Commons/PermissionAuthorizationHandler.cs`
- `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Commons/Extensions/TokenExtensions.cs`
- `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Commons/Extensions/PermissionKey.cs`
- `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Authorization/PermissionAuthorizationPolicyTests.cs`
- `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Permissions/PermissionServiceIntegrationTests.cs`

## Sign-off

- Developer:
- Reviewer:
