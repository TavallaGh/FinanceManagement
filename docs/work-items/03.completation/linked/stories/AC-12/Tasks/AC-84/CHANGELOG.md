# AC-84 Implementation Changelog

**Task:** AC-84  
**Story:** AC-12  
**Date:** 2026-05-11  
**Status:** Ready for Review

## What Was Delivered

- Added role-permission management APIs in the Roles slice for setting and querying role permission trees.
- Introduced service contracts and DTOs for tree-based permission replacement, clear-all semantics, and granted overlays.
- Added thin MediatR handlers that delegate directly to IRoleService for command/query behavior.
- Extended role endpoints with GET and POST routes under /api/v1/sso/roles/{roleId:int}/permissions.
- Implemented integration coverage for validation, replacement behavior, clear-all flow, granted overlay projection, and next-read permission impact.

## Files Changed

| File | Rationale |
| --- | --- |
| projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Contracts/IRoleService.cs | Added role-permission query and replace contracts used by handlers and service implementation. |
| projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/SetRolePermissionsRequest.cs | Added request root payload for clear and tree node input. |
| projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RolePermissionNodeRequest.cs | Added per-node input model with apply-all and actions. |
| projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RolePermissionTreeNodeDto.cs | Added tree-node output projection with action list and granted flags. |
| projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Roles/Dtos/RolePermissionActionDto.cs | Added per-action DTO including granted state. |
| projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Common/Errors/GlobalResponseKey.cs | Added keyed validation/info constants for role-permission flows. |
| projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Commands/SetRolePermissionsCommand.cs | Added thin command and handler delegating to IRoleService. |
| projects/accounting-sso/src/02.Application/ERP.Sso.Application/Roles/Queries/SearchRolePermissionTreeQuery.cs | Added thin query and handler delegating to IRoleService. |
| projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Roles/RoleService.cs | Implemented replace/clear behavior, key validation, apply-all expansion, and granted overlays. |
| projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/RoleEndpoints.cs | Added GET/POST role-permission routes with required authorization guards. |
| projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Roles/RolePermissionServiceTests.cs | Added service-level integration tests for key behaviors and edge cases. |
| projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Roles/RolePermissionEndpointTests.cs | Added endpoint integration tests for validation, clear-all, and inactive-role checks. |

## Acceptance Criteria Status

- AOC-01: Met
- AOC-02: Met
- AOC-03: Met
- AOC-04: Met
- AOC-05: Met
- AOC-06: Met
- AOC-07: Met

## API Endpoints

| Method | Path | Auth | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | /api/v1/sso/roles/{roleId}/permissions | AdminPolicyAccess + Roles.View | Query: q, index, size | APIResponse<PaginationResponse<RolePermissionTreeNodeDto>> | q must be at least 3 chars; includes granted overlay per action. |
| POST | /api/v1/sso/roles/{roleId}/permissions | AdminPolicyAccess + Roles.Edit | SetRolePermissionsRequest | APIResponse<IReadOnlyCollection<RolePermissionTreeNodeDto>> | Full replace semantics; clear-all supported via clear=true. |

### Request Body Schema (POST)

{
  "clear": false,
  "permissions": [
    {
      "layer": "Accounting",
      "resourceCode": "Roles",
      "applyAll": false,
      "actions": ["View", "Edit"]
    }
  ]
}

### Response Schema Notes

- Each node returns resource metadata plus action entries containing action and granted values.
- Write operations return the resulting role permission tree snapshot after replacement or clear.

### Rate Limits and Breaking Changes

- No task-specific rate limit changes were introduced.
- No breaking API version or route changes were introduced.

## Quality Metrics

- Code quality: Thin-handler pattern preserved.
- Security: Authorization and per-operation permission checks enforced.
- Data integrity: Replace and clear operations are deterministic and validated.

## Testing Summary

- Automated: dotnet test filter for RolePermissionServiceTests and RolePermissionEndpointTests.
- Result: 11 passed, 0 failed, 0 skipped.
- Manual verification covered query length validation, unknown key rejection, clear-all behavior, apply-all expansion, and granted overlays.

## Dependencies Added

- None.

## Rollout Plan

1. Review both ready MRs.
2. Complete reviewer validation in In Review.
3. Merge to develop after approvals.
4. Validate permission flows in target environment.

## Known Limitations and Future Work

- Advanced role-permission pagination/use-case refinements can be tracked in follow-up tasks.
- Additional endpoint-specific usage samples can be added to shared API docs if needed.

## Links

- Jira Task: https://nexttoptech.atlassian.net/browse/AC-84
- Jira Story: https://nexttoptech.atlassian.net/browse/AC-12
- Workspace MR: https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/34
- Project MR: https://gitlab.com/next-top-tech/accounting/accounting-sso/-/merge_requests/10
- GitLab Issue (Project): https://gitlab.com/next-top-tech/accounting/accounting-sso/-/work_items/6
- Implementation Plan: docs/work-items/02.implementation/stories/AC-12/tasks/AC-84-implementation-plan.md
- Postman Collection: docs/work-items/03.completation/linked/stories/AC-12/Tasks/AC-84/postman.collection.json

## Sign-off

- Developer: Ready for review
- Reviewer: Pending
- Status: In Review

---

Generated by taskclose workflow on 2026-05-11 14:46:54
