# AC-30 — Task Completion

## Summary

- **Task:** AC-30
- **Related Story:** AC-13
- **Title:** BE-04 - Security, Audit, and Tests
- **Status:** Completed — ready for review

## Description

- Implemented the audit log domain (entity, contract, DTO, enum) and infrastructure service (`AuditLogService`) in `accounting-sso`.
- Registered `IAuditLogService` in DI and added `DbSet<AuditLog>` to `ErpIdsDbContext`.
- Added EF configuration (`AuditLogConfiguration`) and migration (`add_audit_log`).
- Injected `IAuditLogService` into `UserServices` and emitted structured audit events for all sensitive user lifecycle operations (create, update, deactivate, delete, reset-password).
- Injected `IAuditLogService` into `PermissionService` and emitted audit event on `GrantDirectPermission`.
- Verified and closed the `confirm=true` query-parameter gate on the `DELETE /api/v1/sso/users/{id}` handler in `UserEndpoints.cs`.
- Added `ERROR_AUDIT_WRITE_FAILED` to `GlobalResponseKey`.
- Produced full integration test coverage: security enforcement (allow/deny paths), audit event emission per lifecycle operation, and audit event on permission grant.

## Acceptance Criteria

- AC-01: Deny-by-default and policy/object-scope checks enforced on all user-domain endpoints.
- AC-02: Security audit logs emitted for sensitive user operations (lifecycle + permission grants).
- AC-03: Unit/integration tests pass for lifecycle and direct-permission flows.

## Implementation Notes

- Files changed and rationale:
  - `src/01.Domain/ERP.Sso.Domain/AuditLogs/Enums/AuditAction.cs`
    - New enum: `Created`, `Updated`, `Deactivated`, `Deleted`, `PasswordReset`, `PermissionGranted`.
  - `src/01.Domain/ERP.Sso.Domain/AuditLogs/Dtos/AuditLogEntry.cs`
    - New immutable DTO for audit event emission: `TargetUserId`, `TargetUserName`, `Action`, `ActorSubject`, `OccurredOnUtc`, `Details`.
  - `src/01.Domain/ERP.Sso.Domain/AuditLogs/Entities/AuditLog.cs`
    - New persisted audit record entity (EF-mapped table).
  - `src/01.Domain/ERP.Sso.Domain/AuditLogs/Contracts/IAuditLogService.cs`
    - New service contract exposing `WriteAsync(AuditLogEntry entry)`.
  - `src/01.Domain/ERP.Sso.Domain/Common/Errors/GlobalResponseKey.cs`
    - Extended with `ERROR_AUDIT_WRITE_FAILED`.
  - `src/03.Infra/ERP.Sso.Infra.Sql/AuditLogs/AuditLogService.cs`
    - New infra service implementing `IAuditLogService`; writes via EF with silent failure logging.
  - `src/03.Infra/ERP.Sso.Infra.Sql/Configurations/AuditLogs/AuditLogConfiguration.cs`
    - New EF entity configuration for `AuditLog`.
  - `src/03.Infra/ERP.Sso.Infra.Sql/Infrastructures/Contexts/ErpIdsDbContext.cs`
    - Extended with `DbSet<AuditLog>`.
  - `src/03.Infra/ERP.Sso.Infra.Sql/Migrations/ERP.IDS/<timestamp>_add_audit_log`
    - New additive EF migration (new table, no data transforms).
  - `src/03.Infra/ERP.Sso.Infra.Sql/Users/UserServices.cs`
    - Injected `IAuditLogService`; emits audit events for create, update, deactivate, delete, reset-password.
  - `src/03.Infra/ERP.Sso.Infra.Sql/Permissions/PermissionService.cs`
    - Injected `IAuditLogService`; emits audit event on `GrantDirectPermission`.
  - `src/03.Infra/ERP.Sso.Infra.Sql/Injections.cs`
    - Registered `IAuditLogService` → `AuditLogService` in DI.
  - `src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/UserEndpoints.cs`
    - Applied and verified `confirm=true` guard on `DELETE /api/v1/sso/users/{id}` handler.

## Tests

- Automated tests:
  - `dotnet test test/ERP.Sso.Api.Tests.Integration/ERP.Sso.Api.Tests.Integration.csproj --filter "UserSecurityEnforcementTests"`
  - `dotnet test test/ERP.Sso.Api.Tests.Integration/ERP.Sso.Api.Tests.Integration.csproj --filter "UserAuditEmissionTests"`
  - `dotnet test test/ERP.Sso.Api.Tests.Integration/ERP.Sso.Api.Tests.Integration.csproj --filter "PermissionAuditEmissionTests"`
- Manual verification steps:
  1. Authenticate as non-admin user and attempt a user lifecycle operation — verify 403 is returned (deny-by-default).
  2. Authenticate as admin and perform `POST /api/v1/sso/users` — verify an `AuditLog` row appears in the database with `Action = Created`.
  3. Call `DELETE /api/v1/sso/users/{id}` without `?confirm=true` — verify the request is rejected with a validation error.
  4. Call `POST /api/v1/sso/users/permissions` (grant direct permission) — verify `AuditLog` row with `Action = PermissionGranted`.

## Traceability

- Jira Task: https://nexttoptech.atlassian.net/browse/AC-30
- Jira Story: https://nexttoptech.atlassian.net/browse/AC-13
- Workspace MR: https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/16
- Project MR: https://gitlab.com/next-top-tech/accounting/accounting-sso/-/merge_requests/5

## Source Files

- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/AuditLogs/Enums/AuditAction.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/AuditLogs/Dtos/AuditLogEntry.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/AuditLogs/Entities/AuditLog.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/AuditLogs/Contracts/IAuditLogService.cs`
- `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Common/Errors/GlobalResponseKey.cs`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/AuditLogs/AuditLogService.cs`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Configurations/AuditLogs/AuditLogConfiguration.cs`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Infrastructures/Contexts/ErpIdsDbContext.cs`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Migrations/ERP.IDS/<timestamp>_add_audit_log`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Users/UserServices.cs`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Permissions/PermissionService.cs`
- `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Injections.cs`
- `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/UserEndpoints.cs`
- `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Security/UserSecurityEnforcementTests.cs`
- `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/AuditLogs/UserAuditEmissionTests.cs`
- `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/AuditLogs/PermissionAuditEmissionTests.cs`
- `projects/accounting-sso/test/ERP.Sso.Api.Tests.Integration/Supports/SharedTestServices.cs`

## Sign-off

- Developer:
- Reviewer:
