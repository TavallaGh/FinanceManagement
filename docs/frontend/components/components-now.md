# Components Needed Now (MVP Frontend)

This list is aligned to MVP docs `01` to `13` and current implemented prototype routes.

## P0 Foundation

- App Shell (`app.js` + tree menu + header + workspace)
- Login and recovery flow (`components/LoginPage.js`)
- Permission and role-aware menu filtering
- Page documentation entry points (user/dev docs button and modal)

## P1 Security And Access

- Roles management (`components/Roles.js`) -> from `docs/mvp/02_Roles_Dev.md`
- User management (`components/UserManagement.js`) -> from `docs/mvp/03_UserManagement_Dev.md`

## P1 Core Master Data

- Organization info (`components/OrganizationInfo.js`) -> `05_OrganizationInfo_Dev.md`
- Details types (`financial/generalledger/Details.js`) -> `06_Details_Dev.md`
- Fiscal periods (`financial/generalledger/FiscalPeriods.js`) -> `07_FiscalPeriods_Dev.md`
- Ledgers (`financial/generalledger/Ledgers.js`) -> `08_Ledgers_Dev.md`
- Branches (`components/Branches.js`) -> `09_Branches_Dev.md`
- Auto numbering (`financial/generalledger/AutoNumbering.js`) -> `10_AutoNumbering_Dev.md`
- Parties (`components/Parties.js`) -> `11_Parties_Dev.md`
- Cost centers (`components/CostCenters.js`) -> `12_CostCenters_Dev.md`
- Projects (`components/Projects.js`) -> `13_Projects_Dev.md`

## P2 Near-Term GL

- Chart of accounts (`financial/generalledger/ChartofAccounts.js`) route key: `acc_structure`
- Voucher list and entry (`financial/generalledger/Vouchers.js`) route key: `doc_list`
- Doc type management (`financial/generalledger/DocTypes.js`) when operationally required

## Definition Of "Now"

- “Now” = required to run a usable MVP onboarding-to-operations workflow:
  - Login -> access control -> setup master data -> setup GL structure -> start voucher flow.
