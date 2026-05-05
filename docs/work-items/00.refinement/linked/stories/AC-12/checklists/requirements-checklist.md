# Refinement Requirements Checklist: AC-12

**Purpose**: Validate refinement completeness and quality before proceeding to Solution phase
**Created**: 2026-05-05
**Story**: [Link to refinement.md](../refinement.md)

---

## Completeness

- [x] All AoC items are numbered and unambiguous
- [x] All DoD items are defined and verifiable
- [x] Problem narrative covers current state, business impact, and target outcome
- [x] Scope decomposition breaks story into smallest capability slices
- [x] Out-of-scope items are explicitly listed

## Clarity

- [x] No AoC item is ambiguous or open to multiple interpretations
- [x] Each capability slice has a clear description
- [x] Dependencies and constraints are identified
- [x] All open questions are listed with expected decision owner

## Boundary Coverage

- [x] Security/audit requirements are covered in AoC (AoC-11, AoC-14) and DoD (DoD-02)
- [x] Localization/bilingual requirements noted (AoC-13, DoD-04)
- [x] Integration touchpoints are identified (Frontend tree-modal API contract, cache invalidation, BaseRole identity base class)
- [x] Out-of-scope items explicitly prevent scope creep (frontend UI, direct user permissions, role cloning, system roles)

## Approval Readiness

- [x] Refinement artifact is complete (no placeholder sections)
- [ ] Tech Lead has reviewed
- [ ] Product Owner has reviewed
- [ ] Jira AoC, DoD, and Fix Version fields are populated

---

## Open Questions Status

The following open questions from the refinement must be resolved before `/speckit.solution` can proceed:

| ID    | Question                                                         | Owner              | Status   | Resolution Summary |
|-------|------------------------------------------------------------------|--------------------|----------|--------------------|
| OQ-01 | Is `RolePermission` EF configuration present in Infra?          | Backend Tech Lead  | Resolved | `RolePermissionConfiguration` exists at `ERP.Sso.Infra.Sql.Configurations.Permissions` |
| OQ-02 | Current permission caching strategy and invalidation pattern?   | Backend Tech Lead  | Resolved | Permissions stored directly in JWT token (no server cache); invalidation is implicit at next token issuance |
| OQ-03 | Scope of role deactivation effect (gateway vs. permission-check)?| Tech Lead + PO    | Deferred | Decision deferred to a later phase; not blocking Solution phase |
| OQ-04 | Permission tree query: paginated or always-full?                 | Tech Lead          | Resolved | Search-driven with 3-character minimum; does not return full tree |
| OQ-05 | Is a seeded permission catalog already present in the database?  | Backend Tech Lead  | Resolved | `AuthorizationDataSeeder` exists in Infra layer and seeds permissions + roles |
| OQ-06 | `BaseRole<int>` ASP.NET Identity field mapping vs. bilingual design? | Backend Tech Lead | Resolved | `BaseRole<int>` includes `Name`/`NormalizedName`; coexists with `LabelEn`/`LabelFa` bilingual fields |

---

## Notes

All blocking open questions are resolved. OQ-03 is deferred but does not block the Solution phase.
`/speckit.solution` can proceed for AC-12.
