---
description: Generate C# domain entities from one or more domain docs while enforcing DDD.Domain and security rules.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Command Purpose

Generate or update domain entity classes from one or more domain documentation files.

This command is mandatory-rule-driven and MUST enforce:

- `docs/architecture/ddd-domain-conventions.md`
- `docs/architecture/security-implementation-review-rules.md`

## Required Input Contract

Input can be natural language, but must provide at least:

1. One or more domain docs (`--docs` equivalent)
2. Output root for generated entities (`--out` equivalent)

Recommended format:

```text
/speckit.generate-entities --docs "docs/work-items/domain/accounting.md,docs/work-items/domain/idp.md" --out "src" --namespace "NextTopTech.Accounting" --user-key "int"
```

If required values are missing, ask only minimal follow-up questions.

## Execution Rules

1. Load and apply mandatory rules from:
   - `docs/architecture/ddd-domain-conventions.md`
   - `docs/architecture/security-implementation-review-rules.md`
2. Parse all provided domain docs and build a per-domain entity model list.
3. Support multi-domain generation in a single command run.
4. For each entity, determine audit behavior and map it to the required base type:
   - `Entity<TPrimaryKey>`
   - `CreationAuditedEntity<TPrimaryKey, TUserKey>`
   - `ModificationAuditedEntity<TPrimaryKey, TUserKey>`
   - `AuditedEntity<TPrimaryKey, TUserKey>`
   - `FullAuditedEntity<TPrimaryKey, TUserKey>`
5. For IDP entities that cannot inherit from `AuditedEntity*` due to identity base constraints, enforce compatible audit member names:
   - `CreatedOnUtc`, `UpdatedOnUtc`, `DeletedOnUtc`
   - `CreatorUserId`, `LastModifierUserId`, `DeleterUserId`
6. Enforce forbidden naming rejection:
   - Reject `CreatedAt`, `UpdatedAt`, `DeletedAt`, `deletedAt`, and variants for auditing contracts.
7. Generate one file per entity under:
   - `<out>/<Domain>/Domain/Entities/<EntityName>.cs`
8. Use deterministic namespaces:
   - `<namespace>.<Domain>.Domain.Entities`
9. Do not generate security anti-patterns:
   - no hard-coded secrets/tokens/keys
   - no insecure crypto usage
   - no sensitive logging
10. Preserve existing handwritten logic where possible; for existing files, do minimal safe updates.

## Entity Extraction Heuristics

When docs are unstructured, infer entities from sections/tables that indicate:

- Entity name
- Primary key type
- Audit requirement (none/create/update/full)
- IDP/identity inheritance constraints
- Property list (name, type, nullability)

If ambiguity remains for a critical field (for example audit mode), ask a focused clarification question before generating.

## Output Requirements

After generation, return:

1. Generated file list (domain-grouped)
2. Audit/base-class mapping table
3. Validation report with explicit checks:
   - no forbidden audit names
   - correct base inheritance per entity
   - IDP-compatible audit shape where required
4. Any unresolved ambiguities

## Completion Criteria

This command is complete only when:

- All requested domain docs are processed
- Entities are generated for all domains
- DDD naming/inheritance constraints pass
- Security-rule constraints pass for generated code
