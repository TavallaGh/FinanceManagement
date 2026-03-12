# MVP Scope Mapping (From `docs/mvp`)

This file maps MVP documents to frontend modules.

## Module Index

- `01-General.md`: App shell, global nav, header, localization, help access.
- `02_Roles_Dev.md`: Roles management and 3-level permissions.
- `03_UserManagement_Dev.md`: User lifecycle, role assignment, direct permissions.
- `04_UserLogin_Dev.md`: Login and password recovery states.
- `05_OrganizationInfo_Dev.md`: Organization master profile.
- `06_Details_Dev.md`: Detail type definitions.
- `07_FiscalPeriods_Dev.md`: Fiscal year and periods.
- `08_Ledgers_Dev.md`: Ledger management.
- `09_Branches_Dev.md`: Branch management.
- `10_AutoNumbering_Dev.md`: Auto numbering rules.
- `11_Parties_Dev.md`: Person/company master entities.
- `12_CostCenters_Dev.md`: Cost center master.
- `13_Projects_Dev.md`: Project master.

## Observed Frontend Coverage In Prototype

Covered by current screen components:
- 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13

Partially covered or adjacent to MVP extension:
- Chart of accounts (`acc_structure` route) not explicitly listed in 01-13 MVP docs but present in app.
- Voucher flow (`doc_list`) present in app and should be staged after core setup pages.
