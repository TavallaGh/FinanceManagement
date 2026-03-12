# Frontend Documentation

This folder is generated from:
- Prototype source: `projects/Accounting-Prototype`
- MVP definitions: `docs/mvp/*.md`

## Structure

- `system-design/`: Frontend architecture, runtime flow, and UI shell design.
	- Includes `blazor-frontend-structure.md` for module/page/model/service conventions.
- `mvp/`: MVP split for frontend implementation (now vs later) based on MVP markdown files.
- `design-tokens/`: Extracted visual tokens from current prototype (color scale).
- `design-tokens/prototype-style-system.md`: Full extracted style system (typography, spacing, radius, shadows, status colors, RTL/LTR rules).
- `components/`: Extracted component inventory and prioritized component scope.
- `recheck-report.md`: Post-generation validation report against prototype sources.

## Current Blazor Implementation Reference

For the implemented frontend folder structure used in `Accounting-Project`, use:

- `projects/Accounting-Project/docs/blazor-frontend-structure.md`
- `projects/Accounting-Project/docs/solution-layers-needs.md`

Implementation root:

- `projects/Accounting-Project/src/Accounting.Blazor`

Use this implementation reference when validating frontend layers and folder checks against architecture rules.

## Added Sample In Project

- `projects/Accounting-Prototype/src/pages/LoginPageSample.jsx`
- `projects/Accounting-Prototype/src/README.md`

These files provide a migration-friendly `src` sample without changing current runtime behavior.

## Source Of Truth

- UI bootstrap and module loading: `projects/Accounting-Prototype/index.html`
- Application shell, auth flow, routing, permissions: `projects/Accounting-Prototype/app.js`
- Screen components: `projects/Accounting-Prototype/components/*.js`
- GL screens: `projects/Accounting-Prototype/financial/generalledger/*.js`
- MVP page specs: `docs/mvp/*_Dev.md`, `docs/mvp/*_Help.md`
