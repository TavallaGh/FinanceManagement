# Story Summary: AC-13

## Story Identity

- Jira Story: https://nexttoptech.atlassian.net/browse/AC-13
- Fix Version: V 0.1 (MVP)
- Epic: AC MVP
- Labels: user-management, direct-permission, security

## Story Timeline

- Start datetime: 2026-03-13 00:00:00 UTC
- End datetime: <TBD>
- Current status: In Progress

## Task Coverage

| Task Key | Type | Branch | MR | Status |
|---|---|---|---|---|
| AC-27 | BE | <TBD> | <TBD> | To Do |
| AC-28 | BE | <TBD> | <TBD> | Done |
| AC-29 | BE | features/ac-29-be-03-direct-permission-management-apis | workspace: https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/15 ; project: https://gitlab.com/next-top-tech/accounting/accounting-sso/-/merge_requests/4 | Done |
| AC-30 | BE | features/be-04-security-audit-and-tests | workspace: https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/16 ; project: https://gitlab.com/next-top-tech/accounting/accounting-sso/-/merge_requests/5 | In Progress — close doc: [AC-30.md](tasks/AC-30.md) |
| AC-31 | FE | <TBD> | <TBD> | To Do |
| AC-32 | FE | <TBD> | <TBD> | To Do |
| AC-33 | FE | <TBD> | <TBD> | To Do |
| AC-34 | FE | <TBD> | <TBD> | To Do |

## Story-Level Git References

- Story promotion branch: <TBD>
- Story MR to `test`: <TBD>
- Related sprint branch (if prepared): <TBD>

## Functional Summary

- User lifecycle management is decomposed into BE/FE execution tasks.
- Direct-permission management is decomposed into BE/FE execution tasks.
- Role management is intentionally excluded from this story scope.

## API Rollup (if any)

- Postman collection: docs/work-items/02.implementation/stories/AC-13/postman/AC-13.postman_collection.json
- Endpoints impacted:
	- projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/UserEndpoints.cs
		- GET /api/v1/sso/users
		- POST /api/v1/sso/users
		- PUT /api/v1/sso/users/{userId:int}
		- POST /api/v1/sso/users/{userId:int}/deactivate
		- DELETE /api/v1/sso/users/{userId:int}
		- POST /api/v1/sso/users/{userId:int}/reset-password
		- GET /api/v1/sso/users/{userId:int}/permissions
		- POST /api/v1/sso/users/permissions
		- GET /api/v1/sso/users/me/permissions
	- projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/PermissionEndpoints.cs
		- GET /api/v1/sso/permissions

## Validation

- Technical review outcome: <TBD>
- PO review outcome: <TBD>

## Open Risks / Follow-ups

- Role management deferred to next story; integration boundary must remain clean.
