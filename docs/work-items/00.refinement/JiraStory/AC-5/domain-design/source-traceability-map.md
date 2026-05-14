# AC-94 Source Traceability Map

## Task Identity

- Jira Task: [AC-94](https://nexttoptech.atlassian.net/browse/AC-94)
- Parent Story: [AC-5](https://nexttoptech.atlassian.net/browse/AC-5)
- Artifact Set: Domain Design
- Status: approved

## Table

| Requirement / Source | Domain Element or Removal Target | Current Code Anchor | Verification Target |
|---|---|---|---|
| Goal: scalable, extensible, entity-agnostic audit model | `AuditLog` redesign | `src/01.Domain/ERP.Sso.Domain/AuditLogs/Entities/AuditLog.cs` | Build plus entity review |
| Problem: legacy `TargetUserId`, `TargetUserName`, `ActorSubject` coupling | Remove deprecated fields and dependencies | `AuditLog.cs`, `AuditLog.Behaviors.cs`, migrations, consumers | Repo search for zero remaining references |
| Delivers: actor classification | `AuditActorType`, `ActorUserId`, `ActorUserName` | Current model has no actor classification enum | Enum persistence tests |
| Delivers: generic audit actions | `AuditAction` normalization | `src/01.Domain/ERP.Sso.Domain/AuditLogs/Enums/AuditAction.cs` | Enum materialization tests |
| Delivers: generic target classification | `AuditTargetType`, `TargetType` | No current target-classification field | Schema and persistence tests |
| Delivers: request metadata | `IpAddress`, `UserAgent` | No current columns | Migration and persistence tests |
| Delivers: request tracing | `CorrelationId` | No current column | Migration and persistence tests |
| Delivers: remove old service implementation | Remove `AuditLogService`, `IAuditLogService`, `AuditLogEntry`, and direct consumers of the old shape | `src/03.Infra/ERP.Sso.Infra.Sql/AuditLogs/AuditLogService.cs` and related callers | Repo search plus compile validation |
| AOC-08 / DOD-04 | Migration update | `src/03.Infra/ERP.Sso.Infra.Sql/Migrations/ERP.IDS/` | Clean apply and upgrade validation |
| DOD-07 | Build-clean repo after refactor | Solution-wide audit consumers | `dotnet build` |
| TC-09 | No remaining deprecated field references | All source files | Search for `TargetUserId|TargetUserName|ActorSubject` |
| TC-10 | No remaining old service references | All source and test files | Search for `AuditLogService|IAuditLogService|AuditLogEntry` |

## Property Descriptions

### Actor Classification Properties

`ActorUserId`, `ActorUserName`, and `ActorType` exist because the Jira contract explicitly requires support for user, system, and service actors. They replace the old assumption that every event has a user subject.

### Target Classification Property

`TargetType` exists because the task must become entity-agnostic across users, roles, permissions, and future audited domain types. The Jira contract does not name a generic target identifier, so this remains a TL review checkpoint.

### Payload Properties

`PreviousPayload` and `CurrentPayload` exist to carry before/after state without embedding entity-specific columns into the audit table.

### Request Metadata Properties

`IpAddress`, `UserAgent`, and `CorrelationId` exist to connect persisted audit data to runtime diagnostics, abuse analysis, and request tracing.

### Removed Legacy Properties and Services

`TargetUserId`, `TargetUserName`, `ActorSubject`, `AuditLogEntry`, `IAuditLogService`, and `AuditLogService` are part of the deprecated legacy audit structure. The task contract requires their removal or removal of their remaining usages.

## Source Traceability

| Source Item | Mapped Artifact | Impacted Files |
|---|---|---|
| Jira Description and Delivers bullets | `domain-model-summary.md` | `AuditLog.cs`, `AuditAction.cs`, `AuditLogConfiguration.cs` |
| AoC-01..AOC-07 | `domain-model-summary.md`, `entity-property-dictionary.md` | Domain entity, enums, config, consumers, tests |
| DoD-01..DOD-08 | `domain-db-diagram.md`, `source-traceability-map.md` | Migrations, build, tests, repo searches |
| TC-01..TC-12 | All domain-design artifacts | Domain, infra, migrations, test projects |
| Current entity anchor | This traceability map | `src/01.Domain/ERP.Sso.Domain/AuditLogs/Entities/AuditLog.cs` |
| Current service consumers | This traceability map | `Users/UserServices.cs`, `Roles/RoleService.cs`, `Permissions/PermissionService.cs`, `ForgotPassword/ForgotPasswordTokenService.cs` |
| Current tests coupled to old model | This traceability map | `test/ERP.Sso.Api.Tests.Integration/AuditLogs/*.cs`, `Supports/SharedTestServices.cs` |

## TL Approval Checklist

- Confirm the proposed `AuditLog` property set is accepted as the canonical AC-94 domain target.
- Confirm no replacement audit emission contract or service should be introduced in AC-94.
- Confirm migration strategy should drop the old user-targeted FK/index rather than preserve compatibility columns.
- Confirm the absence of a generic target identifier field is intentional for this task or request an update before implementation.