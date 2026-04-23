# AC-28-01 — Task Completion

## Summary

- **Task:** AC-28-01
- **Related Story:** AC-28
- **Status:** Completed — ready for review

## Description

- Implemented backend "User Lifecycle" service and API handlers for user management in `projects/accounting-sso`.

- Responsibilities covered:
	- creation, update, search/list with pagination, deactivate (soft-block), soft-delete, and password reset initiation.

## Acceptance Criteria

- AOC-01: `POST /api/v1/sso/users` creates a new user when payload is valid.
	- Verification: create request with username/password returns user summary and persisted user record.

- AOC-02: Duplicate usernames are rejected deterministically.
	- Verification: attempting to create or update a user to an existing username returns error code `ERROR_USER_DUPLICATE_USERNAME`.

- AOC-03: Deactivation blocks authentication immediately and persists status change.
	- Verification: after deactivate call, `Status` is `false`, `LockoutEnd` is set to distant future and authentication attempts fail.

- AOC-04: Reset-password rotates `SecurityStamp` and sets `ForceChangePassword=true`.
	- Verification: `ResetPasswordAsync` returns `PasswordResetResultDto` and user record has updated `SecurityStamp` and `ForceChangePassword`.

## Implementation Notes

- Key implementation file: `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Users/UserServices.cs`.

- Notable behaviours implemented in code:
	- Validation: username and password presence enforced; empty username/password triggers `GlobalAppException` with specific `GlobalResponseKey` values (e.g., `ERROR_USER_USERNAME_REQUIRED`, `ERROR_USER_PASSWORD_REQUIRED`).
	- Duplicate username check on create and update using `UserManager.FindByNameAsync` — throws `ERROR_USER_DUPLICATE_USERNAME` when violated.
	- Password set is performed via `UserManager.AddPasswordAsync` after identity create.
	- Deactivate flow sets `Status=false`, `LockoutEnabled=true`, and `LockoutEnd` to `UtcNow.AddYears(100)` to immediately block authentication.
	- Delete flow marks `IsDeleted=true` and sets `DeletedOnUtc` (soft-delete semantics).
	- Reset-password flow rotates `SecurityStamp`, sets `ForceChangePassword=true`, and returns `PasswordResetResultDto`.
	- Mapping to `UserSummaryDto` returns the documented fields used by clients: `Id, UserName, Email, Status, UserType, ForceChangePassword, LastLoginUtc, LockoutEnd, ExternalIssuer, ExternalSubjectId`.

- Database/config changes:
	- Entity configuration is under `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Configurations/Users/UserConfiguration.cs` (ensure migrations run if schema changed).

## Tests

- Automated tests:
	- See `projects/accounting-sso/test/ERP.Sso.Authorization.Tests/Users/UserServices.cs` (unit/integration tests for user services).
	- Tests cover: create success, duplicate username rejection, update validations, deactivate/delete flows, and permission checks.

- Manual test steps:
	1. Run integration test suite: `dotnet test projects/accounting-sso/test/ERP.Sso.Authorization.Tests`.
	2. Start local API and exercise endpoints using `curl` or Postman against `localhost`.
	3. Verify database records in `ErpIdsDbContext` for expected state changes.

Examples (local API):

```powershell
# create user
curl -X POST http://localhost:5000/api/v1/sso/users -H "Content-Type: application/json" -d '{"userName":"testuser","password":"P@ssw0rd"}'

# deactivate
curl -X POST http://localhost:5000/api/v1/sso/users/123/deactivate

# reset password
curl -X POST http://localhost:5000/api/v1/sso/users/123/reset-password -H "Content-Type: application/json" -d '{"notifyUser":false}'
```

## Traceability

- Jira: https://nexttoptech.atlassian.net/browse/AC-28
- Workspace MR: (add MR URL)
- Project MR: (add MR URL)
- Implementation files:
	- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Users/UserServices.cs`
	- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Users/Dtos/*`
	- `projects/accounting-sso/src/02.Application/ERP.Sso.Application/Users/Commands/*`
	- Tests: `projects/accounting-sso/test/ERP.Sso.Authorization.Tests/Users/UserServices.cs`

## Source Files

- Files changed and short descriptions.

## Sign-off

- Developer: 
- Reviewer: 
