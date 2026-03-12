# Component Inventory (Extracted)

Based on:
- `projects/Accounting-Prototype/index.html` module loading
- `projects/Accounting-Prototype/app.js` active route rendering
- File inventory under `components/` and `financial/generalledger/`

## 1. Core Shell And Shared

- `app.js` (root shell, auth, permissions, route dispatch)
- `components/UIComponents.js` (shared UI primitives)
- `components/PageDocumentation.js` (modal docs viewer)

## 2. Auth And General

- `components/LoginPage.js`
- `components/UserProfile.js`
- `components/GeneralWorkspace.js`
- `components/KpiDashboard.js`
- `components/ComponentShowcase.js`

## 3. Security And Admin

- `components/UserManagement.js`
- `components/Roles.js`

## 4. Master Data

- `components/OrganizationInfo.js`
- `components/CurrencySettings.js`
- `components/Parties.js`
- `components/CostCenters.js`
- `components/Projects.js`
- `components/Branches.js`
- `components/OrgChart.js`

## 5. General Ledger

- `financial/generalledger/Ledgers.js`
- `financial/generalledger/Details.js`
- `financial/generalledger/FiscalPeriods.js`
- `financial/generalledger/DocTypes.js`
- `financial/generalledger/AutoNumbering.js`
- `financial/generalledger/ChartofAccounts.js`
- `financial/generalledger/Vouchers.js`
- `financial/generalledger/VoucherPrint.js`

## 6. Support Data Modules

- `app-data.js`
- `financial/generalledger/gl-data.js`
- `supabaseConfig.js`

## 7. Not Yet Routed In Main App

- `financial/generalledger/VoucherPrint.js` is present but not directly mounted by `activeId` conditions in `app.js`.
- `tools/*` sections exist as data/space prototypes but are not primary route targets in current shell.
