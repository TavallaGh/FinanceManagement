# DDD.Domain Conventions (Mandatory)

Project: Accounting v0  
Status: Mandatory for all generated and handwritten domain code

## Purpose

This document standardizes how domain entities are modeled in this workspace based on the shared `NT.DDD.Domain` package.

All domains must use these conventions.

## Core Rules

1. The shared `NT.DDD.Domain` package is the default domain base for all modules.
2. Domain entities must inherit from the correct base type in `NT.DDD.Domain` based on audit requirements.
3. Audit date-time fields must use UTC contract names from the package:
   - `CreatedOnUtc`
   - `UpdatedOnUtc`
   - `DeletedOnUtc`
4. Do not introduce alternative timestamp names in domain models for auditing behavior:
   - `CreatedAt`, `UpdatedAt`, `DeletedAt`, `deletedAt`, and similar names are forbidden for auditing contracts.
5. Prefer package-provided user key and navigation naming:
   - `CreatorUserId`
   - `LastModifierUserId`
   - `DeleterUserId`

## Inheritance Matrix

Choose the minimum base class that satisfies required behavior.

| Needed Behavior | Base Class |
| --- | --- |
| No audit fields | `Entity<TPrimaryKey>` |
| Create tracking only | `CreationAuditedEntity<TPrimaryKey, TUserKey>` |
| Update tracking only | `ModificationAuditedEntity<TPrimaryKey, TUserKey>` |
| Create + update tracking | `AuditedEntity<TPrimaryKey, TUserKey>` |
| Create + update + soft delete tracking | `FullAuditedEntity<TPrimaryKey, TUserKey>` |

Note: if you need user navigation properties (for example `CreatorUser`), use the 3-generic forms with `TUser`:

- `CreationAuditedEntity<TPrimaryKey, TUser, TUserKey>`
- `ModificationAuditedEntity<TPrimaryKey, TUser, TUserKey>`
- `AuditedEntity<TPrimaryKey, TUser, TUserKey>`
- `FullAuditedEntity<TPrimaryKey, TUser, TUserKey>`

## UserManagement Module Domain Rule

The `UserManagement` module in the Accounting API handles Accounting-scoped user concerns only (company/fiscal context, local user references). It does **not** own authentication or token management — those are owned by the SSO Service.

For `UserManagement` module entities that need to integrate with identity-framework-derived types:

1. Apply the same audit naming and UTC conventions from `NT.DDD.Domain`.
2. When direct inheritance is not possible (single inheritance limitation), implement compatible auditing contract shape using the same member names:
   - `CreatedOnUtc`
   - `UpdatedOnUtc`
   - `DeletedOnUtc`
   - `CreatorUserId`
   - `LastModifierUserId`
   - `DeleterUserId`
3. If a custom user type is needed for domain audit relations, align it with `IAuditedUser<TUserKey>` semantics.

## Quick Examples

### Regular Domain Entity (Create + Update)

```csharp
public class Ledger : AuditedEntity<Guid, int>
{
    public string Name { get; private set; } = string.Empty;
}
```

### Full Audited Entity

```csharp
public class Voucher : FullAuditedEntity<long, int>
{
    public decimal Amount { get; private set; }
}
```

### UserManagement-Compatible Entity Shape

```csharp
public class UserContext
{
    public DateTimeOffset CreatedOnUtc { get; set; }
    public DateTimeOffset? UpdatedOnUtc { get; set; }
    public DateTimeOffset? DeletedOnUtc { get; set; }

    public int CreatorUserId { get; set; }
    public int? LastModifierUserId { get; set; }
    public int? DeleterUserId { get; set; }
}
```

## Enforcement

- Code generation prompts and AI agents must follow this spec.
- Code review must reject domain models that violate these naming/inheritance rules.
