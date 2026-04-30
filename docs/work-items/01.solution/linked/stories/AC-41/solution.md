# Story Solution: AC-41

## Story Link

- Jira Story: [`https://nexttoptech.atlassian.net/browse/AC-41`](https://nexttoptech.atlassian.net/browse/AC-41)
- REFINEMENT doc: `docs/work-items/00.refinement/linked/stories/AC-41/refinement.md`

## Solution Summary

- Target behavior:
  Deliver a production-ready shared UI foundation for the ERP frontend — comprising a standardized two-layer token system, a complete runtime light/dark theme engine with persistence and no-flicker initialization, and 11 new business-agnostic shared UI components (Input, Textarea, Button, Card, Grid System, Table, Simple List, List with Pagination, Sidebar, Tree View, Scroll Container) — all token-driven, theme-aware, RTL/LTR-safe, with Storybook coverage and updated design documentation.

- Non-functional requirements:
  - All new shared components use `ChangeDetectionStrategy.OnPush` and Angular standalone component pattern — no NgModule declarations.
  - No hardcoded color, spacing, radius, elevation, or z-index values in delivered shared component styles; all values resolved through CSS custom property tokens.
  - All components use logical CSS properties (`margin-inline-start`, `padding-inline-end`, etc.) for RTL/LTR safety.
  - Theme switching must be CSP-safe — inline script-based flicker prevention is NOT used because the project CSP `script-src` does not allow `unsafe-inline`; instead a nonce-based or cookie/class-based server-aided approach is used.
  - Angular Material bridge must align `--mdc-*` / `--mat-*` variables with semantic tokens without breaking existing Material usage.
  - Storybook is mandatory for every new or changed shared component — not a follow-up item.
  - Design-system and shared UI catalog documentation are updated in the same task as component delivery.
  - Shared components must be entirely business-agnostic — no domain logic, domain services, or feature-scoped state.

## Work Breakdown

- Planned tasks (15 subtasks):
  - [AC-64](https://nexttoptech.atlassian.net/browse/AC-64): Token Audit & Standardization
  - [AC-65](https://nexttoptech.atlassian.net/browse/AC-65): Light/Dark Theme Engine
  - [AC-66](https://nexttoptech.atlassian.net/browse/AC-66): Theme Persistence & Flicker Prevention (CSP-safe)
  - [AC-67](https://nexttoptech.atlassian.net/browse/AC-67): Input & Textarea Components
  - [AC-68](https://nexttoptech.atlassian.net/browse/AC-68): Button Component
  - [AC-69](https://nexttoptech.atlassian.net/browse/AC-69): Card Component
  - [AC-70](https://nexttoptech.atlassian.net/browse/AC-70): Grid System (CSS Utility Classes)
  - [AC-71](https://nexttoptech.atlassian.net/browse/AC-71): Table Component
  - [AC-72](https://nexttoptech.atlassian.net/browse/AC-72): Simple List Component
  - [AC-73](https://nexttoptech.atlassian.net/browse/AC-73): List with Pagination Component
  - [AC-74](https://nexttoptech.atlassian.net/browse/AC-74): Sidebar Component
  - [AC-75](https://nexttoptech.atlassian.net/browse/AC-75): Tree View Component
  - [AC-76](https://nexttoptech.atlassian.net/browse/AC-76): Scroll Container Component
  - [AC-77](https://nexttoptech.atlassian.net/browse/AC-77): Storybook Coverage & Design Docs Update
  - [AC-78](https://nexttoptech.atlassian.net/browse/AC-78): Shared UI Token Alignment Refactor

- Dependencies:
  - AC-64 (Token Audit) must complete before any component task begins — it defines the token contract all components consume.
  - AC-65 (Theme Engine) must complete before AC-66 (Persistence) — persistence and flicker prevention build on the engine.
  - AC-67 through AC-76 (all component tasks) depend on AC-64 being approved; they can proceed in parallel after AC-64.
  - AC-77 (Storybook & Docs) accumulates coverage from each component task; final consolidation after all component tasks close.
  - AC-78 (Refactor) can run in parallel with component tasks but must not alter token variable names before AC-64 finalizes the naming convention.

## Technical Decisions

- Decision 1: **Grid System as CSS utility classes only** — not an Angular component or directive. A lightweight CSS layout class set with optional wrapper elements where ergonomics require it. Rationale: avoids unnecessary component overhead for a pure layout concern; aligns with the OQ-03 answer in refinement.
- Decision 2: **CSP-safe flicker prevention** — inline `<script>` in `index.html` is NOT used because the active CSP `script-src` blocks `unsafe-inline`. Instead, the theme class is applied via a cookie read on the server side or a nonce-based inline script if the server provides a nonce per request. The safe fallback is a class applied by the theme service during the early Angular initialization lifecycle (APP_INITIALIZER) accepting a single-frame flash as acceptable tradeoff. Rationale: OQ-02 answer confirmed CSP restriction.
- Decision 3: **Two-layer token model enforced** — `_colors.scss`, `_spacing.scss`, `_typography.scss`, `_radius.scss`, `_elevation.scss`, `_z-index.scss` are treated as primitive tokens. A new `_semantic.scss` (or per-category semantic files) defines named semantic aliases (`--color-surface`, `--color-on-surface`, `--color-border`, etc.) that components consume. Components never reference primitive tokens directly.
- Decision 4: **Angular Material bridge** — `--mat-*` / `--mdc-*` variables are overridden by mapping semantic tokens in the theme files (`[data-theme="light"]` and `[data-theme="dark"]`). No Angular Material palette file re-generation is needed; variables are patched at CSS level.
- Decision 5: **Per-component Storybook task scope** — each component task includes its own Storybook page and translation keys. TBD-14 handles cross-component coverage consolidation, sidebar/shell registration, and final design doc updates.
- Decision 6: **Input and Textarea in one task (TBD-04)** — they share the same design contract (label, helper text, validation message, states) and are both form field primitives. Splitting them into separate tasks adds overhead without meaningful isolation benefit. One task; one Storybook page per component.
- Decision 7: **Existing 6 shared components (checkbox, checkbox-group, date-picker, icon, tag, tag-group) are NOT re-implemented** — they are already delivered. TBD-15 audits and aligns them to the new token system only if they contain hardcoded values.

## Done Criteria for Implementation

- All 15 subtasks completed with passing validations and review sign-off.
- AC-64 (Token Audit) completed and design-system.md updated before any component task is accepted.
- AC-65 + AC-66 (Theme Engine + Persistence) completed; light/dark switching works with persistence; no theme flicker on initial load (within CSP constraint).
- All 11 new shared components implemented, exported from `libs/shared/ui/src/lib/components/index.ts`, and accessible from `libs/shared/ui/src/index.ts`.
- Storybook routes registered in `story-book.routes.ts` and sidebar for all 11 new components.
- `docs/frontend/design/design-system.md` and `docs/frontend/design/ui-components.md` updated.
- Zero hardcoded visual values remain in delivered shared components.
- RTL layout verified in Storybook for all delivered components.
- Story AoC items AoC-01 through AoC-27 all satisfied.
- TL and PO approve solution package before Jira import via `/speckit.tasks`.
