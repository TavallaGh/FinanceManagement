# Story Task Plan: AC-41

## 1. Story Context

- Jira Story: [`https://nexttoptech.atlassian.net/browse/AC-41`](https://nexttoptech.atlassian.net/browse/AC-41)
- REFINEMENT Source: `docs/work-items/00.refinement/linked/stories/AC-41/refinement.md`
- Plan Owner: TBD
- Plan Status: draft

## 2. Why This Story Exists

- Problem to solve:
  - The ERP frontend has a partial token foundation with no enforced consumption contract, only 6 shared components, no runtime theme switching, no theme persistence, and no RTL/LTR guarantees across the shared library. Feature teams building on this foundation must create their own local versions of buttons, inputs, tables, and navigation structures — multiplying work, diverging visuals, and creating rework risk on any theme change.
- Expected outcome:
  - A production-ready shared UI foundation: a standardized two-layer token system, a complete runtime light/dark theme engine with persistence and CSP-safe no-flicker initialization, and 11 new business-agnostic shared UI components — all token-driven, theme-aware, RTL/LTR-safe, with Storybook coverage and updated design documentation. Every subsequent ERP feature can now build on this shared foundation without creating local one-off implementations.

## 3. Aggregated Task Landscape

> Note: tasks here are aggregated delivery tasks, not micro technical steps.

| Proposed Task Key | Task Name | Stack | Goal Of Task | Problem This Task Solves | Priority |
| ----------------- | --------- | ----- | ------------ | ------------------------ | -------- |
| [AC-64](https://nexttoptech.atlassian.net/browse/AC-64) | FE - Token Audit & Standardization | Frontend / Styles | Define and document the two-layer (primitive + semantic) token model; audit and align existing token files | Token consumption is uncontrolled — components may hardcode values or reference primitive tokens directly, making theme and branding changes fragile | P1 |
| [AC-65](https://nexttoptech.atlassian.net/browse/AC-65) | FE - Light/Dark Theme Engine | Frontend / Styles | Complete and standardize runtime theme switching via [data-theme] on <html>; align semantic token mappings for light and dark themes; add/complete Angular theme service where needed | No runtime theme switching exists; shared components cannot adapt to user preference | P1 |
| [AC-66](https://nexttoptech.atlassian.net/browse/AC-66) | FE - Theme Persistence & No-Flicker Initialization | Frontend / Styles | Persist theme selection to storage; apply theme before Angular bootstraps using a CSP-compatible no-flicker strategy | Selected theme resets on page reload; initial load flashes wrong theme | P1 |
| [AC-67](https://nexttoptech.atlassian.net/browse/AC-67) | FE - Input & Textarea Components | Frontend / UI | Implement `UiInputComponent` and `UiTextareaComponent` with label, helper text, validation message, focus/error/disabled states; Storybook pages | Feature teams have no canonical form field primitives — every feature builds its own | P1 |
| [AC-68](https://nexttoptech.atlassian.net/browse/AC-68) | FE - Button Component | Frontend / UI | Implement `UiButtonComponent` with primary, secondary, outline, and icon variants; hover, active, disabled, loading states; Storybook page | No shared button — every feature uses local ad-hoc buttons with inconsistent styling and states | P1 |
| [AC-69](https://nexttoptech.atlassian.net/browse/AC-69) | FE - Card Component | Frontend / UI | Implement `UiCardComponent` with header/body/footer content projection; token-based elevation and spacing; Storybook page | Feature UIs have no shared container abstraction — layouts use inconsistent wrapping with hardcoded shadows and spacing | P2 |
| [AC-70](https://nexttoptech.atlassian.net/browse/AC-70) | FE - Grid System | Frontend / Styles | Deliver a shared responsive layout primitive driven by shared spacing tokens and logical properties; RTL/LTR-safe; Storybook examples | Feature teams have no shared layout primitive — each feature rolls its own grid/flexbox with hardcoded gaps | P2 |
| [AC-71](https://nexttoptech.atlassian.net/browse/AC-71) | FE - Table Component | Frontend / UI | Implement `UiTableComponent` with header/body structure, row hover, selected row, and empty states; Storybook page | Data tables in features are implemented ad-hoc — no shared contract for structure, states, or styling | P1 |
| [AC-72](https://nexttoptech.atlassian.net/browse/AC-72) | FE - Simple List Component | Frontend / UI | Implement `UiSimpleListComponent` with reusable item structure and content projection; Storybook page | Feature lists are inconsistent with no shared item wrapper or projection contract | P2 |
| [AC-73](https://nexttoptech.atlassian.net/browse/AC-73) | FE - List with Pagination Component | Frontend / UI | Implement stateless data-driven `UiListWithPaginationComponent` with configurable page size/index and previous/next controls; Storybook page | Paginated data lists are implemented independently per feature — no shared contract or consistent UX | P1 |
| [AC-74](https://nexttoptech.atlassian.net/browse/AC-74) | FE - Sidebar Component | Frontend / UI | Implement `UiSidebarComponent` with collapse/expand behavior; theme-aware and direction-aware (RTL/LTR) styling; Storybook page | No shared navigation container — app shell must implement its own sidebar with all states from scratch | P1 |
| [AC-75](https://nexttoptech.atlassian.net/browse/AC-75) | FE - Tree View Component | Frontend / UI | Implement `UiTreeViewComponent` with hierarchical rendering and expand/collapse behavior; Storybook page | Hierarchical data (e.g., chart of accounts, org structures) has no shared visualization primitive | P2 |
| [AC-76](https://nexttoptech.atlassian.net/browse/AC-76) | FE - Scroll Container Component | Frontend / UI | Implement `UiScrollContainerComponent` with consistent scroll styling and optional maintainable custom scrollbar treatment; Storybook page | Scrollable regions across features have inconsistent scroll styling and no shared wrapper | P2 |
| [AC-77](https://nexttoptech.atlassian.net/browse/AC-77) | FE - Storybook Coverage & Design Docs Update | Frontend / Docs | Consolidate Storybook sidebar/shell for all 11 new components; update `design-system.md` and `ui-components.md` | Design docs and shared UI catalog are outdated; Storybook sidebar does not reflect full component inventory | P1 |
| [AC-78](https://nexttoptech.atlassian.net/browse/AC-78) | FE - Shared UI Token Alignment Refactor | Frontend / UI | Audit existing shared components for hardcoded values; refactor them to use the approved token strategy consistently; no behavioral change | Existing shared components (checkbox, date-picker, etc.) may contain hardcoded values that violate the new token contract | P2 |

## 4. Jira Mapping Rule

- All tasks derived from this story must be created as Jira subtasks under parent story AC-41.
- Import to Jira happens only after solution review approval.
- Task keys AC-64 through AC-78 are Jira subtask keys assigned on 2026-04-30.
- Execution order: AC-64 → AC-65 → AC-66 → (AC-67 through AC-76 in parallel) → AC-77 → AC-78 can overlap with component tasks.

## 5. Approval Gate

- Tech Lead: pending
- Product Owner: pending
- Jira import ready: no
