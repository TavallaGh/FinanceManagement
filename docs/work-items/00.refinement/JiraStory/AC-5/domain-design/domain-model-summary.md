# AC-94 Domain Model Summary

## Task Identity

- Jira Task: [AC-94](https://nexttoptech.atlassian.net/browse/AC-94)
- Parent Story: [AC-5](https://nexttoptech.atlassian.net/browse/AC-5)
- Source Task Spec: [../../../01.solution/linked/stories/AC-5/tasks/AC-94.md](../../../01.solution/linked/stories/AC-5/tasks/AC-94.md)
- Repository Target: `projects/accounting-sso`
- Status: approved

## Table

| Element | Kind | Planned Location | Planned Shape | Reason |
|---|---|---|---|---|
| `AuditLog` | Entity | `src/01.Domain/ERP.Sso.Domain/AuditLogs/Entities/` | Replace user-targeted fields with generic actor, target, payload, request metadata, and correlation fields | Supports entity-agnostic audit persistence |
| `AuditActorType` | Enum | `src/01.Domain/ERP.Sso.Domain/AuditLogs/Enums/` | `User`, `System`, `Service` | Distinguishes how the audit event was produced |
| `AuditAction` | Enum | `src/01.Domain/ERP.Sso.Domain/AuditLogs/Enums/` | Generic reusable actions, normalized away from workflow-specific coupling | Keeps event semantics stable across entities |
| `AuditTargetType` | Enum | `src/01.Domain/ERP.Sso.Domain/AuditLogs/Enums/` | `User`, `Role`, `Permission` initially, extensible later | Allows one audit table to classify different target domains |
| `AuditLogConfiguration` | EF mapping | `src/03.Infra/ERP.Sso.Infra.Sql/Configurations/AuditLogs/` | Maps the new entity shape and removes legacy FK/index assumptions | Keeps schema aligned with the refactored domain model |
| Legacy `AuditLogEntry`, `IAuditLogService`, `AuditLogService` | Deprecated support types | Domain/Infra audit folders | Remove in this task; do not redesign here | Replacement emission service is explicitly out of scope |

## Property Descriptions

### `AuditLog.Id`

Primary key for persisted audit records. Needed so migrations and downstream queries have a stable identity column.

### `AuditLog.ActorUserId`

Nullable identifier for the acting user when the actor is a real user. It is nullable because system and service actors must be representable without fake user rows.

### `AuditLog.ActorUserName`

Nullable snapshot of the acting user name. This preserves human-readable context for user-generated events and remains null for system and service actors.

### `AuditLog.ActorType`

Required enum indicating whether the event came from a `User`, `System`, or `Service`. This removes the old assumption that every actor is a user subject.

### `AuditLog.Action`

Required enum describing the generic action that occurred. The task contract calls for reusable action values rather than workflow-specific coupling.

### `AuditLog.TargetType`

Required enum describing the type of entity being audited, such as `User`, `Role`, or `Permission`. This is the minimum target classification explicitly requested in Jira.

### `AuditLog.OccurredOnUtc`

Required UTC timestamp for when the audited event happened. This preserves time-ordering and aligns with the workspace UTC naming convention.

### `AuditLog.PreviousPayload`

Nullable serialized payload representing the pre-change state when the event captures a delta. It exists to support audit comparisons without forcing the schema to know every target entity shape.

### `AuditLog.CurrentPayload`

Nullable serialized payload representing the post-change state when the event captures a delta. It is paired with `PreviousPayload` for before/after audit visibility.

### `AuditLog.Details`

Nullable free-form or structured detail field for additional contextual information that does not belong in the core audit shape.

### `AuditLog.IpAddress`

Nullable request metadata capturing the client IP address when an HTTP-triggered request exists. This supports operational diagnostics and abuse analysis.

### `AuditLog.UserAgent`

Nullable request metadata capturing the request user agent when available. This supports diagnostics and client classification.

### `AuditLog.CorrelationId`

Nullable request correlation identifier so one logical request or workflow can be traced across logs and persisted audit records.

### Removed Properties

`TargetUserId`, `TargetUserName`, and `ActorSubject` are removed because they hard-code a user-targeted audit model and block generic cross-entity audit capture.

## Source Traceability

| Element / Property | Jira Source | Current Code Anchor | Design Decision |
|---|---|---|---|
| `AuditLog` redesign | Goal, Description, AOC-01, DOD-01 | `src/01.Domain/ERP.Sso.Domain/AuditLogs/Entities/AuditLog.cs` | Replace the legacy user-shaped entity with a generic domain record |
| `ActorUserId`, `ActorUserName`, `ActorType` | Delivers bullets 1, 2, 5; AOC-02, AOC-04; TC-05..TC-07 | `src/01.Domain/ERP.Sso.Domain/AuditLogs/Dtos/AuditLogEntry.cs`, `src/03.Infra/ERP.Sso.Infra.Sql/AuditLogs/AuditLogService.cs` | Actor data becomes nullable and classified instead of assuming a user subject |
| `Action` normalization | Delivers bullet 3; AOC-03; DOD-02; TC-08 | `src/01.Domain/ERP.Sso.Domain/AuditLogs/Enums/AuditAction.cs` | Keep reusable audit actions and remove coupling to the legacy emission model |
| `TargetType` | Delivers bullet 4; AOC-03; DOD-01; TC-08 | Current model has no generic target type | Add explicit target classification without preserving target-user-only fields |
| `PreviousPayload`, `CurrentPayload` | Delivers bullet 1; DOD-01; TC-02 | Current model has only `Details` | Move from narrow string details to before/after payload capture |
| `IpAddress`, `UserAgent`, `CorrelationId` | Delivers bullets 6, 7; AOC-05; TC-02 | Current model has no request metadata | Add request diagnostics without changing workflow logic in this task |
| Removal of `TargetUserId`, `TargetUserName`, `ActorSubject` | Problem statement; AOC-06; DOD-05; TC-09 | `AuditLog.cs`, `AuditLog.Behaviors.cs`, migrations snapshot | Remove deprecated columns, FK, and index assumptions |
| Removal of legacy service implementation | Delivers bullets 10, 11; AOC-07; DOD-06; TC-10 | `src/03.Infra/ERP.Sso.Infra.Sql/AuditLogs/AuditLogService.cs` plus current consumers | Remove the old emission path without introducing its replacement here |

## TL Review Items

- Confirm that `TargetType` without a separate generic target identifier is acceptable for AC-94. The Jira contract names `TargetType` but does not name `TargetId`.
- Confirm that `ActorUserId` should be a nullable scalar without a hard FK so historical audit data survives user deletion and non-user actors remain valid.
- Confirm payload storage format (`nvarchar(max)` JSON text is the recommended default for SQL Server in this task).