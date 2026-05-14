# AC-94 Entity Property Dictionary

## Task Identity

- Jira Task: [AC-94](https://nexttoptech.atlassian.net/browse/AC-94)
- Parent Story: [AC-5](https://nexttoptech.atlassian.net/browse/AC-5)
- Entity: `AuditLog`
- Status: approved

## Table

| Property | Domain Type | Required | Persistence Expectation | Reason |
|---|---|---|---|---|
| `Id` | `int` | Yes | PK identity | Stable row identity |
| `ActorUserId` | `int?` | No | Nullable scalar column | Supports user, system, and service actors |
| `ActorUserName` | `string?` | No | Nullable string snapshot | Human-readable actor context |
| `ActorType` | `AuditActorType` | Yes | Enum stored as int | Required actor classification |
| `Action` | `AuditAction` | Yes | Enum stored as int | Reusable audit action |
| `TargetType` | `AuditTargetType` | Yes | Enum stored as int | Target entity classification |
| `OccurredOnUtc` | `DateTimeOffset` | Yes | Non-null UTC column | Ordered audit time |
| `PreviousPayload` | `string?` | No | Nullable JSON text | Before-state snapshot |
| `CurrentPayload` | `string?` | No | Nullable JSON text | After-state snapshot |
| `Details` | `string?` | No | Nullable text | Supplemental context |
| `IpAddress` | `string?` | No | Nullable string | Request metadata |
| `UserAgent` | `string?` | No | Nullable string | Request metadata |
| `CorrelationId` | `string?` | No | Nullable string | Cross-log trace linkage |

## Property Descriptions

### `Id`

Unique record identity for the audit row. It is not business data but is required for persistence, indexing, and migration stability.

### `ActorUserId`

Optional user identifier for actor-backed events. It must stay nullable so non-user actors can be represented truthfully.

### `ActorUserName`

Optional actor display or login name snapshot. It exists for operator readability and should not be treated as an authoritative join key.

### `ActorType`

Required actor classification enum. This is the field that explains whether actor user fields are expected to be populated.

### `Action`

Required audit action enum. This must stay generic and reusable across domains.

### `TargetType`

Required enum describing the kind of entity the audit row refers to. It generalizes the current user-only target model.

### `OccurredOnUtc`

Required timestamp using the workspace UTC naming convention. This is the canonical event time and must not be renamed to `OccurredAt` or similar.

### `PreviousPayload`

Optional serialized snapshot of the old state. It is most relevant for updates and deletes.

### `CurrentPayload`

Optional serialized snapshot of the new state. It is most relevant for creates and updates.

### `Details`

Optional free-form or structured supplemental context. It remains useful for compact explanations that do not justify payload snapshots.

### `IpAddress`

Optional request IP address. It must stay nullable because background, scheduled, or service events may not have one.

### `UserAgent`

Optional request user agent. It must stay nullable for the same reason as `IpAddress`.

### `CorrelationId`

Optional request or workflow correlation identifier. It is important for joining persisted audit history with application logs and traces.

## Source Traceability

| Property | Jira Requirement Linkage | Current Legacy Anchor | Notes |
|---|---|---|---|
| `ActorUserId` | Delivers bullet 1, bullet 5; AOC-04; TC-05..TC-07 | Replaces `TargetUserId` and `ActorSubject` assumptions | Recommended as nullable scalar, no hard FK |
| `ActorUserName` | Delivers bullet 1, bullet 5; TC-05..TC-07 | Replaces `TargetUserName` snapshot usage | Nullable for non-user actors |
| `ActorType` | Delivers bullet 2; AOC-02; DOD-02; TC-08 | No current equivalent | New enum classification field |
| `Action` | Delivers bullet 3; AOC-03; DOD-02; TC-08 | Current `AuditAction` is still workflow-coupled in consumers | Normalize values for reuse |
| `TargetType` | Delivers bullet 4; AOC-03; DOD-01; TC-08 | No current equivalent | New enum classification field |
| `OccurredOnUtc` | Existing audit timestamp plus Goal | Current `OccurredOnUtc` already exists | Preserve current UTC naming |
| `PreviousPayload` | Delivers bullet 1; TC-02 | No current equivalent | New change-state capture |
| `CurrentPayload` | Delivers bullet 1; TC-02 | No current equivalent | New change-state capture |
| `Details` | Delivers bullet 1; existing audit detail usage | Current `Details` | Keep but reposition as supplemental context |
| `IpAddress` | Delivers bullet 6; AOC-05; TC-02 | No current equivalent | Request metadata |
| `UserAgent` | Delivers bullet 6; AOC-05; TC-02 | No current equivalent | Request metadata |
| `CorrelationId` | Delivers bullet 7; AOC-05; TC-02 | No current equivalent | Request tracing support |
| Removed legacy fields | Problem statement; AOC-06; DOD-05; TC-09 | `TargetUserId`, `TargetUserName`, `ActorSubject` | Must be removed fully from entity, config, migrations, and code references |