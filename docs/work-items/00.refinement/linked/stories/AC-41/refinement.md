# Story REFIENMENT Standard: AC-41

## 1. Story Identity

- Jira Story: [`https://nexttoptech.atlassian.net/browse/AC-41`](https://nexttoptech.atlassian.net/browse/AC-41)
- Story Key: AC-41
- Epic/Parent: AC-8 — IDP & Access Control
- Reporter/Owner: Mohaddeseh Farsijani
- Assignee: Mohaddeseh Farsijani
- Fix Version: V 0.1 (MVP)
- Label: Core
- REFIENMENT Date: 2026-04-29
- REFIENMENT Status: draft

---

## 2. Purpose of REFIENMENT

- Goal: ensure deep project understanding before solution and implementation planning.
- This document is for deep understanding before solution/implementation.
- This phase does NOT create tasks.
- AC-41 is a foundational cross-cutting story: its outputs (token system, theme engine, and shared UI components) are consumed by every ERP feature going forward. Getting the boundaries, conventions, and completeness right here reduces downstream rework substantially.

---

## 3. Source Inputs Reviewed

- Jira description: Full structured description body (Jira ADF), no inline summary text — all content in the body (extracted).
- Jira comments: No comments at extraction time (total: 0).
- Jira attachments: None.
- Related local docs:
  - `docs/frontend/design/design-system.md` — token catalog, reuse rules, component architecture rules
  - `docs/frontend/design/ui-components.md` — current shared component inventory and Storybook registry
  - `docs/frontend/design/component-addition-playbook.md` — execution contract for adding new shared components

---

## 4. Problem Narrative (Why)

### 4.1 Current Problem

- What is wrong today:
  - The ERP frontend has a partial token foundation (colors, spacing, typography, radius, elevation, z-index files) but no enforced token consumption contract — components and surfaces may hardcode visual values instead of resolving through the token layer.
  - Only 6 shared components currently exist in the shared UI library (checkbox, checkbox-group, date-picker, icon, tag, tag-group). The broader set of foundational UI primitives required for ERP feature development — such as buttons, inputs, tables, cards, lists, sidebars, and tree structures — is still missing, forcing feature teams to build local one-off implementations or duplicate styling logic. Storybook coverage is partial. Existing shared components such as the date picker are already part of the current inventory, but Storybook does not yet cover the broader shared component surface this story aims to establish.
  - A partial light/dark token override foundation exists, but runtime switching, persistence, no-flicker initialization, and full shared-component adoption are not yet complete. No runtime theme switching, no theme persistence, no prevention of flicker on initial load, and Angular Material bridge coverage exists partially but is not yet formalized and validated across the full shared UI surface.
  - RTL/LTR-safe patterns and bilingual-ready shared components are not yet guaranteed across the UI library.
  - Storybook documentation does not cover the full current inventory and has no coverage path for new components unless a shared playbook is followed.
- Where it happens:
  - `libs/shared/ui/src/lib/components/` — shared component library (incomplete)
  - `public/styles/tokens/` — token files (exist but not enforced or standardized end-to-end)
  - `apps/erp-web/src/app/dev-tools/story-book/` — Storybook (partial coverage)
  - Any ERP feature that needs a button, input, table, or card today has no canonical shared source to consume.
- Who is impacted:
  - All frontend developers across all ERP features — they cannot build feature UIs from a shared foundation.
  - Designers — they cannot rely on the token system being honored in implementation.
  - QA/reviewers — inconsistent styling makes visual verification unpredictable.
  - Future maintainers — every hardcoded value creates drift and rework on theme/branding changes.

### 4.2 Business Impact

- Operational impact:
  - Without this story, every subsequent feature team must build its own local versions of buttons, inputs, tables, etc., which multiplies work and produces divergent visual results.
  - Theme changes (e.g., branding, accessibility contrast adjustments) become surgical hunts through feature code rather than single-point token changes.
- Risk impact:
  - Inconsistency between features increases the cost of design review, QA, and user acceptance.
  - A missing theme system that is bolted on later forces large-scale refactoring of already-delivered components.
- Compliance/security impact:
  - RTL/LTR correctness is a mandatory localization requirement. Building shared components without baking in directionality from the start creates hidden accessibility and usability regressions.

### 4.3 Target Outcome

- A production-ready shared UI foundation that:
  - Establishes a clear, documented, two-layer (primitive + semantic) token system as the single source of truth for all visual values.
  - Provides a complete runtime light/dark theme engine with persistence, no-flicker initialization, and Angular Material variable alignment.
  - Delivers 11 new shared UI components (`Input`, `Textarea`, `Button`, `Table`, `Scroll Container`, `List+Pagination`, `Card`, `Grid System`, `Simple List`, `Sidebar`, `Tree View`) that are token-driven, theme-aware, RTL/LTR-safe, and business-agnostic.
  - Updates Storybook with full coverage for all newly delivered and changed shared components.
  - Updates design-system documentation and shared UI catalog to reflect the new inventory and rules.
  - Removes hardcoded visual values from delivered shared components and relevant shared UI surfaces.

---

## 5. Extracted Story Contract

### 5.1 Description (Extracted)

- Extracted/normalized description:
  - Design, refine, and implement a unified UI Design System for the ERP frontend — covering a token-driven foundation, a complete global light/dark theming mechanism, and the first full set of reusable shared UI building blocks.
  - The implementation must build on the existing token files and current project structure, standardizing and extending them into the primary styling system for all shared UI development.
  - All delivered shared components must live in `libs/shared/ui/src/lib/components/`, follow Angular standalone component patterns, use `ChangeDetectionStrategy.OnPush`, remain business-agnostic, and be RTL/LTR-safe.
  - Storybook (`apps/erp-web/src/app/dev-tools/story-book/`) must be updated for every new or changed shared UI component.
  - Design documentation (`docs/frontend/design/`) must be updated within the same task scope.

### 5.2 AoC (Acceptance of Completion / Acceptance Criteria)

**Tokens**
- AoC-01: The token system is reviewed and refined; primitive and semantic token responsibilities are clearly defined and documented.
- AoC-02: Token usage rules are documented and aligned with implementation (in `docs/frontend/design/design-system.md`).
- AoC-03: All delivered shared components consume the approved token strategy consistently — no unnecessary hardcoded visual styling remains in delivered shared components.

**Theming**
- AoC-04: The user can switch between light and dark mode at runtime via the theme toggle.
- AoC-05: The selected theme persists across page reloads (localStorage or equivalent).
- AoC-06: Initial app load does not visibly flash the wrong theme before the correct theme is applied.
- AoC-07: All delivered shared components adapt correctly to both light and dark themes through the token system.
- AoC-08: Angular Material-backed shared UI surfaces respond correctly to the theme system via the Material variable bridge.

**Components — presence**
- AoC-09: `Input` and `Textarea` are implemented in the shared UI library with: label, helper text, validation message, focus state, error state, and disabled state support.
- AoC-10: `Button` is implemented in the shared UI library with: primary, secondary, outline, and icon variants; hover, active, disabled, and loading states.
- AoC-11: `Card` is implemented in the shared UI library with: flexible content regions, header/body/footer composition, token-based elevation and spacing.
- AoC-12: `Grid System` is implemented in the shared UI library with: responsive layout support and spacing driven by shared tokens.
- AoC-13: `Table` is implemented in the shared UI library with: header/body structure, row hover state, selected row state, and empty state.
- AoC-14: `Simple List` is implemented in the shared UI library with: reusable item structure and content projection support.
- AoC-15: `List with Pagination` is implemented as part of a combined list/pagination solution that is stateless, data-driven, configurable (page size, page index), and includes previous/next controls.
- AoC-16: `Sidebar` is implemented in the shared UI library with: reusable navigation container, collapse/expand behavior, theme-aware and direction-aware styling.
- AoC-17: `Tree View` is implemented in the shared UI library with: hierarchical rendering and expand/collapse behavior.
- AoC-18: `Scroll Container` is implemented in the shared UI library with: reusable scroll wrapper, consistent scroll styling, and optionally a maintainable custom scrollbar treatment.

**States and behavior**
- AoC-19: All delivered components support the interaction states defined in this story (disabled, hover, focus, active, loading where applicable, selected, empty).
- AoC-20: Interactive states are visually consistent and token-driven across all delivered components.
- AoC-21: Directionality is correct in both RTL and LTR contexts for all delivered components.
- AoC-22: All delivered components remain reusable and business-agnostic (no ERP domain logic inside shared components).

**Consistency**
- AoC-23: Spacing, typography, elevation, border, and color usage are consistent across delivered shared components according to the token rules.
- AoC-24: Duplicated styling logic is minimized; shared components align with project design-system rules.

**Documentation**
- AoC-25: Every delivered or changed shared UI component has Storybook coverage with usage examples and public API documentation.
- AoC-26: Design-system documentation (`docs/frontend/design/design-system.md`) is updated to reflect any token or styling guidance changes.
- AoC-27: Shared UI catalog (`docs/frontend/design/ui-components.md`) is updated to reflect the new component inventory and capabilities.

### 5.3 DoD (Definition of Done)

- DoD-01: Token audit and refinement is completed; primitive and semantic token usage is standardized and documented.
- DoD-02: Light/dark theme switching is fully functional; theme persists after reload; no visible theme flicker on initial load.
- DoD-03: All 11 listed shared components are implemented, token-driven, reusable, configurable, and theme-aware.
- DoD-04: Storybook coverage exists for all delivered components with usage examples and API docs.
- DoD-05: Design-system and shared UI catalog documentation are updated.
- DoD-06: All AoC items are validated; implementation is reviewed and consistent with project architecture and standards.
- DoD-07: No hardcoded visual values remain in delivered shared components.

---

## 6. Scope Decomposition (Smallest Story Parts)

- Capability slice 1: Token audit and standardization
  - detail: Audit existing token files (`_colors.scss`, `_spacing.scss`, `_typography.scss`, `_radius.scss`, `_elevation.scss`, `_z-index.scss`). Define clear primitive vs. semantic token separation. Document token usage rules (which layer a component consumes, naming conventions). Validate existing token files conform to the two-layer model. Remove or deprecate any inconsistent tokens.

- Capability slice 2: Global style alignment
  - detail: Ensure global styles (`styles.scss`, `_reset.scss`, or equivalent) are aligned with the token system. Remove any global hardcoded values that should be tokens. Define base typography, scroll behavior, and box-sizing through tokens where applicable.

- Capability slice 3: Light/dark theme engine
  - detail: Define light theme values at `:root` level. Define dark theme overrides via a root-level theme selector (e.g., `[data-theme="dark"]`). Map all semantic tokens correctly between light and dark. Apply theme globally through the document root. Build runtime theme switching mechanism (service + toggle).

- Capability slice 4: Theme persistence and flicker prevention
  - detail: Persist selected theme to localStorage. Read theme from localStorage before Angular bootstraps to prevent FOCT (flash of incorrect theme) — requires an inline script or early CSS class injection in `index.html`. Optionally honor `prefers-color-scheme` as default when no preference is stored. Align Angular Material palette variables with the shared semantic token system (Material bridge).

- Capability slice 5: Input and Textarea components
  - detail: Standalone Angular components with label, helper text, validation message, focus/error/disabled states. RTL/LTR-safe. Token-driven. Business-agnostic. Storybook page with all states and API docs.

- Capability slice 6: Button component
  - detail: Standalone Angular component with primary, secondary, outline, and icon variants. Hover, active, disabled, and loading states. Token-driven. Storybook page.

- Capability slice 7: Card component
  - detail: Standalone Angular component with header/body/footer composition using content projection. Token-based elevation and spacing. Theme-aware. Storybook page.

- Capability slice 8: Grid System
  - detail: Responsive layout utility component/directive driven by shared spacing tokens. Supports column configuration. RTL/LTR-safe. Storybook examples.

- Capability slice 9: Table component
  - detail: Standalone Angular component with header/body structure. Row hover, selected row, and empty states. Token-driven. Storybook page.

- Capability slice 10: Simple List component
  - detail: Reusable item structure with content projection. Configurable. Theme-aware. Token-driven. Storybook page.

- Capability slice 11: List with Pagination component
  - detail: Stateless, data-driven list container with integrated pagination controls. Configurable page size and page index. Previous/next navigation. Token-driven. Storybook page.

- Capability slice 12: Sidebar component
  - detail: Reusable navigation container. Collapse/expand behavior. Theme-aware and direction-aware (RTL/LTR). Token-driven. Storybook page.

- Capability slice 13: Tree View component
  - detail: Hierarchical data rendering with expand/collapse. Recursive or slot-based structure. Reusable and configurable. Token-driven. Storybook page.

- Capability slice 14: Scroll Container component
  - detail: Reusable scroll wrapper with consistent scroll styling. Optional maintainable custom scrollbar treatment. Token-driven. Storybook page.

- Capability slice 15: Storybook and documentation updates
  - detail: Storybook pages for all 11 new components under `apps/erp-web/src/app/dev-tools/story-book/pages/<component-name>/`. Routes added to `story-book.routes.ts` and sidebar in `story-book-shell.component.ts`. Translation keys added to `en.json` and `fa.json`. Design-system doc and shared UI catalog updated.

- Capability slice 16: Shared UI refactoring
  - detail: Audit and refactor applicable existing shared UI surfaces (non-business-specific) to align with the approved token system. Remove hardcoded values from delivered shared components. Reduce duplicated styling logic in shared UI layers within scope.

---

## 7. Out of Scope

- Explicitly excluded in this story:
  - Feature-specific business components (any component with ERP domain logic or data-binding to domain services).
  - Refactoring of feature-layer UI beyond what is classified as shared UI.
  - Implementation of new ERP feature screens that consume these components (those are separate feature stories).
  - Modal/Dialog component (not listed in story scope, may be a separate story).
  - Notification/Toast component (not listed in story scope).
  - Dropdown/Select component (not listed, though Input/Textarea covers text fields).
  - Delivered shared components must meet component-level accessibility expectations, but a full application-wide audit is not part of this story.
  - Deep refactoring of existing feature-area UI — only shared UI layers within this story's scope.
  - Animation/transition system beyond what is naturally token-driven.
  - Any upgrade or migration of Angular, Angular Material, or Tailwind version.

---

## 8. Dependency and Constraints

- Functional dependencies:
  - The existing token files (`public/styles/tokens/`) must be accessible and writable — this story extends and formalizes them.
  - The shared UI library entry point (`libs/shared/ui/src/lib/components/index.ts` and `libs/shared/ui/src/index.ts`) must be available for new component exports.
  - The Storybook surface (`apps/erp-web/src/app/dev-tools/story-book/`) must be functional and its route/shell structure must support new page registration.
  - Translation files (`en.json`, `fa.json` in both `apps/erp-web` and `public` paths) must be updated for any UI text in Storybook pages.
- Technical dependencies:
  - Angular Material is already integrated — the theme bridge must align `--mat-*` or `--mdc-*` variables with the semantic token layer without breaking existing Material usage.
  - `ChangeDetectionStrategy.OnPush` is mandatory for all new shared components.
  - Angular standalone component pattern is mandatory — no NgModule-based component declarations.
  - All components must use logical CSS properties (`margin-inline-start`, `padding-inline-end`) for RTL/LTR safety.
- Constraints:
  - Shared components must not contain business logic, domain-specific services, or feature-scoped state.
  - No hardcoded color, spacing, radius, shadow, or z-index values in delivered shared component styles.
  - Storybook documentation is non-optional — a shared component is not "done" without its Storybook page.
  - Design-system and shared UI catalog documentation must be updated in the same implementation task as the component delivery — not as a follow-up.
  - The `component-addition-playbook.md` defines the canonical workflow — implementation must follow it.

---

## 9. Probable Task Landscape (No Task Creation Here)

- Estimated task clusters:
  - Frontend / Token & Theme: 2–3 (token audit + standardization, theme engine + persistence + flicker prevention, global styles alignment)
  - Frontend / Core Components: 5–6 (natural groupings: Input+Textarea, Button+Card, Table+Grid, List+Pagination+ScrollContainer, Sidebar+TreeView+SimpleList)
  - Frontend / Storybook & Docs: 1–2 (Storybook for all delivered components, design doc + catalog update)
  - Frontend / Refactoring: 1 (shared UI alignment to token system)
  - QA / Validation: 1–2 (token/theme validation, component state verification, RTL/LTR layout verification)

- Relative effort:
  - High
  - Rationale: This story spans 3 distinct layers (tokens, theme system, shared components), delivers 11 brand-new components across frontend, requires Storybook for each, enforces Angular architectural patterns, and mandates documentation updates — all in a single story scope. It is the broadest single frontend story in the MVP.

---

## 10. Risks and Unknowns

- Risk-01: Story size is large — 11 components plus token + theme work significantly increases the probability of partial delivery or uneven quality.
  - mitigation: Plan mandatory subtasks (as listed in Jira description) as the minimum atomic delivery units; do not close the story until all 21 mandatory subtask items are completed. Track progress against the mandatory subtask list explicitly.

- Risk-02: Token boundary ambiguity — it is unclear from the current token files exactly where primitive ends and semantic begins for all categories.
  - mitigation: Resolve this in the token audit subtask first (before any component work begins); document decisions in `design-system.md` before implementation proceeds.

- Risk-03: Angular Material bridge complexity — aligning `--mdc-*` / `--mat-*` CSS variables with the project semantic token layer may conflict with Material's own theming API.
  - mitigation: Spike the Material bridge alignment approach before committing to the full theme implementation; define the bridge strategy in a documented decision record.

- Risk-04: Flicker prevention (FOCT) requires an inline script in `index.html` that runs before Angular bootstraps — this may conflict with strict CSP (Content Security Policy) headers if they are configured.
  - mitigation: Confirm CSP configuration before designing the flicker-prevention approach; if inline scripts are blocked, consider alternative (class-based early injection via server-side or build-time token).

- Risk-05: RTL/LTR correctness regressions as 11 components are built — without a systematic validation step, RTL is often treated as an afterthought.
  - mitigation: Add explicit RTL layout verification as an acceptance criterion for each component's Storybook page; require both directions to be demonstrated in Storybook examples before acceptance.

- Risk-06: Storybook coverage skipped under delivery pressure — documentation tends to slip when the component count is high.
  - mitigation: Enforce the `component-addition-playbook.md` contract: Storybook is required in the same implementation task, not a follow-up item.

---

## 11. Open Questions

- OQ-01: Is there an approved design mockup or Figma source for the token color palette (light + dark) that this story must align to? Or are the current token files the authoritative visual reference? (Decision owner: Designer / Product Owner)
  - Answer: Until a designer-approved Figma palette is provided, the current token files are the authoritative visual reference.
- OQ-02: For theme flicker prevention — is there a current CSP configuration that would block an inline `<script>` in `index.html`? (Decision owner: Tech Lead / Infrastructure)
  - Answer: Yes. Even if the theme is read from cookies, an inline script in `index.html` is still blocked when the active CSP `script-src` does not allow inline execution through `unsafe-inline`, a nonce, or a hash.
  - Decision note: To prevent theme flicker while keeping CSP strict, prefer either a nonce-based inline script or server-side theme application based on the stored cookie.
- OQ-03: Should the Grid System be implemented as a component (`<erp-grid>`), a directive, or a utility CSS class set? (Decision owner: Tech Lead / Assignee)
  - Answer: Implement the Grid System as a utility CSS class set, with lightweight layout wrappers only where they materially improve ergonomics.
- OQ-04: For the `List with Pagination` — is server-side pagination expected (page-change emits an event for data reload) or client-side only (slices a local data array)? (Decision owner: Product Owner / Tech Lead)
  - Answer: The shared UI component remains stateless and only emits page-change events. The parent/container decides whether pagination is handled by backend fetching or client-side slicing.
- OQ-05: Does the `Sidebar` component need to support nested navigation (multi-level menu items), or is a flat navigation list sufficient for MVP? (Decision owner: Product Owner)
  - Answer: Basic nested navigation support is required because the sidebar data structure is hierarchical.
  - Decision note: For MVP, support limited depth (up to 2 levels) with simple expand/collapse behavior, not a fully recursive multi-level navigation system.
- OQ-06: Should the `Tree View` component use a recursive component approach or a flat data model with computed indentation? (Decision owner: Tech Lead / Assignee)
  - Answer: Prefer a recursive component approach because it matches hierarchical UI behavior more naturally and keeps the design extensible.
- OQ-07: Are there any Angular Material component surfaces outside the shared library that must also be covered by the theme bridge (e.g., existing dialogs, date picker Material surfaces)? (Decision owner: Tech Lead)
  - Answer: Yes. Existing Angular Material-backed shared surfaces, especially date-picker-related surfaces, should be covered by the theme bridge.
  - Scope note: Do not expand into feature-specific Material usage outside shared UI unless it is already affected by the global token bridge.

---

## 12. REFIENMENT Conclusion

- Readiness recommendation:
  - Ready for Solution: YES
  - Conditions: The previously listed open questions have working decisions recorded in this refinement. Implementation should follow these decisions unless Product or Tech Lead explicitly revises them during Solution or delivery.

---

## 13. Approval Gate

- Tech Lead Review:
  - Name: Hamid
  - Decision: Approved
  - Notes: TBD

- Product Owner :
  - Name: Tavalla
  - Decision: Approved
  - Notes: TBD

- Final REFIENMENT Decision:
  - approved
