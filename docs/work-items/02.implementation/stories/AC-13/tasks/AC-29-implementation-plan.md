---
title: "AC-29 - BE-03 - Direct Permission Management APIs - Task Record"
jira: AC-29
parent: AC-13
phase: Implementation
created: 2026-04-22
updated: 2026-04-28
---

# Task Record: AC-29

## Identity

- Jira Task: https://nexttoptech.atlassian.net/browse/AC-29
- Jira Story: https://nexttoptech.atlassian.net/browse/AC-13
- Type: features
- Fix Version: V 0.1 (MVP)
- Labels: Backend

## Timeline

- Start datetime: 2026-04-22 10:51:18 +03:30
- End datetime: 2026-04-28 00:00:00 UTC
- Jira Status at completion snapshot: In Progress

## GitFlow Context

- Source branch: features/ac-29-be-03-direct-permission-management-apis
- Target branch: develop
- Promotion path: develop -> story/* (to test) -> sprint/* (to stage) -> main

## GitLab References

- Workspace GitLab Issue: https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/work_items/9
- Workspace GitLab MR: https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/15
- Project GitLab Issue: https://gitlab.com/next-top-tech/accounting/accounting-sso/-/work_items/1
- Project GitLab MR: https://gitlab.com/next-top-tech/accounting/accounting-sso/-/merge_requests/4
- MR state snapshot: opened

## Delivered Changes

- Implemented direct permission management APIs for selected user and current user permission views.
- Implemented replace-style direct grant behavior for user direct permission sets.
- Migrated permission key naming from enum names to enum values for persistence and token claims.
- Implemented wildcard authorization semantics:
  - `2:*:1` section wildcard by action
  - `2:10002:*` resource full-action wildcard
  - `2:**` layer-wide wildcard
- Enforced wildcard governance:
  - wildcard-like direct user grants are blocked (`PermissionActions.All` is not assignable directly)
  - wildcard claims suppress redundant granular claims at the same scope
  - Admin seeding uses super-admin wildcard (`2:**`) for role-based broad access

## Commit References

- c22825e WIP

## API Changes

- Collection path: docs/work-items/02.implementation/stories/AC-13/postman/AC-13.postman_collection.json
- Added endpoints:
  - GET /api/v1/sso/users/{userId}/permissions
  - GET /api/v1/sso/users/me/permissions
  - POST /api/v1/sso/users/permissions
- Updated endpoints:
  - GET /api/v1/sso/permissions
- Removed endpoints:
  - none
- Endpoint mapper files:
  - projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/UserEndpoints.cs
  - projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/PermissionEndpoints.cs
- Endpoint contract compliance:
  - Group prefix used with MapGroup("/api/v1/..."): yes
  - Child routes under group are relative (no leading slash): yes
  - Each endpoint has explicit Produces and WithDescription: yes
  - Each endpoint has explicit RequireAuthorization(...): yes
  - Endpoint handlers remain thin (no business/data access logic): yes

## Validation & Review Notes

- Integration validation run:
  - dotnet test test/ERP.Sso.Api.Tests.Integration/ERP.Sso.Api.Tests.Integration.csproj --filter "PermissionAuthorizationPolicyTests|PermissionServiceIntegrationTests"
  - dotnet test test/ERP.Sso.Api.Tests.Integration/ERP.Sso.Api.Tests.Integration.csproj --filter "PermissionServiceIntegrationTests"
- Latest test snapshot:
  - PermissionAuthorizationPolicyTests: passed
  - PermissionServiceIntegrationTests: passed
- Technical review notes:
  - wildcard matching and token-claim minimization validated by automated tests
  - role-seeded super-admin wildcard propagation validated
- PO review notes:
  - pending

## Risks / Rollback

- Risks:
  - Existing historical permission keys from older naming formats may remain in persisted data if not backfilled.
  - Consumer systems expecting verbose permission strings must use numeric/wildcard format.
- Rollback strategy:
  - Revert branch commits related to permission key/wildcard logic.
  - Re-seed authorization data if needed.
  - Re-run integration tests for permissions and authorization to confirm restored behavior.

## Traceability Artifacts

- Implementation task record: docs/work-items/02.implementation/stories/AC-13/tasks/AC-29-implementation-plan.md
- Story summary: docs/work-items/02.implementation/stories/AC-13/story-summary.md
- API collection: docs/work-items/02.implementation/stories/AC-13/postman/AC-13.postman_collection.json

## Known Gaps

- Dedicated revoke endpoint is still not implemented as a standalone mutation endpoint.
