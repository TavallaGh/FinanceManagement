---
title: "AC-64 - FE - Token Audit & Standardization - Implementation Plan"
jira: AC-64
parent: AC-41
phase: Implementation
created: 2026-04-30
status: approved
target_repo: accounting-frontend
source_branch: features/ac-64-fe-token-audit-standardization
target_branch: develop
---

# AC-64 - FE - Token Audit & Standardization (Implementation Plan)

Source: https://nexttoptech.atlassian.net/browse/AC-64
Parent: https://nexttoptech.atlassian.net/browse/AC-41

---

## 1. Task Summary

- Jira key: AC-64
- Parent story: AC-41 - Shared UI Foundation
- Task summary: FE - Token Audit & Standardization
- Stack: Frontend / Styles / Docs
- Canonical task spec: [Solution Task Spec](../../../../01.solution/linked/stories/AC-41/tasks/AC-64.md)
- Primary product repository: `projects/Accounting-Frontend`
- Workspace repository artifact path: `docs/work-items/02.implementation/stories/AC-41/tasks/AC-64-implementation-plan.md`
- GitLab execution context already prepared:
  - Frontend issue: `accounting-frontend/-/work_items/3`
  - Frontend MR: `accounting-frontend/-/merge_requests/3`
  - Source branch: `features/ac-64-fe-token-audit-standardization`
  - Target branch: `develop`
- Dependency posture:
  - AC-64 is the prerequisite token contract for AC-65 through AC-78.
  - No component implementation task is accepted until AC-64 naming and semantic-consumption rules are approved.

## 2. Readiness Checks

- Goal Of Task present: Yes
- Problem-To-Solve present: Yes
- AoC present: Yes (AOC-01 through AOC-06)
- DoD present: Yes (DOD-01 through DOD-05)
- Test Cases present: Yes, represented by the task's TDD coverage and BDD scenarios
- Fix Version target: `V 0.1 (MVP)`
- Labels / scope: Frontend
- Jira and GitLab operational traceability already started: Yes
- Task classification: Non-Domain
- TL gate required before coding: **Yes - implementation remains blocked until explicit TL approval**

## 3. Scope & Assumptions

**In scope:**
- Audit all six primitive token files under `projects/Accounting-Frontend/public/styles/tokens/`:
  - `_colors.scss`
  - `_spacing.scss`
  - `_typography.scss`
  - `_radius.scss`
  - `_elevation.scss`
  - `_z-index.scss`
- Create and wire a semantic token layer for shared component consumption.
- Update the token entrypoint so semantic tokens are loaded with the existing token stack.
- Produce a violation audit for the six existing shared components:
  - `checkbox`
  - `checkbox-group`
  - `date-picker`
  - `icon`
  - `tag`
  - `tag-group`
- Update design-system guidance in both repositories of record:
  - Product repo doc: `projects/Accounting-Frontend/docs/design/design-system.md`
  - Workspace mirror doc: `docs/frontend/design/design-system.md`

**Out of scope:**
- Refactoring component SCSS/HTML/TS to consume semantic tokens (that follows in AC-78).
- Runtime light/dark theme behavior (AC-65 and AC-66).
- New shared UI component delivery (AC-67 through AC-76).
- Feature-specific UI or business-domain styling.

**Assumptions:**
- `projects/Accounting-Frontend/public/styles/utils/_variables.scss` is the active token aggregation entrypoint and must import the new semantic layer.
- The existing frontend build pipeline consumes global styles through the current `public/styles` structure; no additional bundler configuration is required.
- Storybook examples are rendered through the in-app dev-tools shell under `apps/erp-web/src/app/dev-tools/story-book/`, so validation evidence is manual smoke plus application build success.
- The workspace `docs/frontend` tree mirrors `projects/Accounting-Frontend/docs`; token-rule documentation must stay synchronized in both locations.

## 4. Repository Routing Matrix

| Artifact | Repository | Exact Path |
|---|---|---|
| Primitive colors audit and cleanup | accounting-frontend | `public/styles/tokens/_colors.scss` |
| Primitive spacing audit and cleanup | accounting-frontend | `public/styles/tokens/_spacing.scss` |
| Primitive typography audit and cleanup | accounting-frontend | `public/styles/tokens/_typography.scss` |
| Primitive radius audit and cleanup | accounting-frontend | `public/styles/tokens/_radius.scss` |
| Primitive elevation audit and cleanup | accounting-frontend | `public/styles/tokens/_elevation.scss` |
| Primitive z-index audit and cleanup | accounting-frontend | `public/styles/tokens/_z-index.scss` |
| Semantic token layer | accounting-frontend | `public/styles/tokens/_semantic.scss` |
| Token import entrypoint update | accounting-frontend | `public/styles/utils/_variables.scss` |
| Shared token usage guidance | accounting-frontend | `docs/design/design-system.md` |
| Existing component violation audit input to AC-78 | accounting-frontend | `docs/design/token-violation-audit.md` |
| Checkbox audit target | accounting-frontend | `libs/shared/ui/src/lib/components/checkbox/` |
| Checkbox group audit target | accounting-frontend | `libs/shared/ui/src/lib/components/checkbox-group/` |
| Date picker audit target | accounting-frontend | `libs/shared/ui/src/lib/components/date-picker/` |
| Icon audit target | accounting-frontend | `libs/shared/ui/src/lib/components/icon/` |
| Tag audit target | accounting-frontend | `libs/shared/ui/src/lib/components/tag/` |
| Tag group audit target | accounting-frontend | `libs/shared/ui/src/lib/components/tag-group/` |
| Storybook smoke targets | accounting-frontend | `apps/erp-web/src/app/dev-tools/story-book/pages/{checkbox,icon,tag,date-time-picker}/` |
| Workspace implementation plan | accounting-workspace | `docs/work-items/02.implementation/stories/AC-41/tasks/AC-64-implementation-plan.md` |
| Workspace design-system mirror update | accounting-workspace | `docs/frontend/design/design-system.md` |

## 5. Domain Hierarchy Map

AC-64 touches frontend presentation assets only. The mandatory four-layer map is recorded below so implementation does not drift into non-applicable layers.

```text
projects/Accounting-Frontend/
  01.Domain/
    no changes for AC-64

  02.Application/
    no changes for AC-64

  03.Infra/
    no changes for AC-64

  04.Presentation/ (effective frontend presentation surface)
    public/styles/
      tokens/
        _colors.scss         <- update
        _spacing.scss        <- update
        _typography.scss     <- update
        _radius.scss         <- update
        _elevation.scss      <- update
        _z-index.scss        <- update
        _semantic.scss       <- new
      utils/
        _variables.scss      <- update import order
    libs/shared/ui/
      src/lib/components/
        checkbox/            <- audit only
        checkbox-group/      <- audit only
        date-picker/         <- audit only
        icon/                <- audit only
        tag/                 <- audit only
        tag-group/           <- audit only
    apps/erp-web/
      src/app/dev-tools/story-book/
        pages/checkbox/      <- smoke validation
        pages/icon/          <- smoke validation
        pages/tag/           <- smoke validation
        pages/date-time-picker/ <- smoke validation
    docs/design/
      design-system.md       <- update
      token-violation-audit.md <- new
```

## 6. Entity-Centric Folder Naming Map

This task has no business entities. The exact folder-name contract is therefore based on token categories and the shared UI components being audited.

| Concern | Exact Folder / File Name | Rule |
|---|---|---|
| Primitive color scale | `tokens/_colors.scss` | Keep only raw palette scale names in --color-{palette}-{scale} format. Extract the existing semantic block (--bg-*, --fg-*, --surface-*, --border-* plus their [data-theme='dark'] overrides) to _semantic.scss. |
| Primitive spacing scale | `tokens/_spacing.scss` | Keep primitive names in `--spacing-{scale}` format only |
| Primitive typography scale | `tokens/_typography.scss` | Keep primitive names in --font-family-*, --font-size-*, --font-weight-*, --line-height-*, --letter-spacing-* formats. Remove the duplicate: --font-size-xs and --font-size-sm are both 0.75rem; consolidate per documented intent. |
| Primitive radius scale | `tokens/_radius.scss` | Keep primitive names in `--radius-{size}` format only |
| Primitive elevation scale | `tokens/_elevation.scss` | --shadow-* variables are the true raw primitives and remain here. --elevation-0 through --elevation-6, which alias --shadow-*, are semantic aliases and must be extracted to _semantic.scss. |
| Primitive z-index scale | `tokens/_z-index.scss` | Keep primitive names in `--z-{layer}` format only |
| Semantic aliases | `tokens/_semantic.scss` | Consolidates all extracted semantic tokens: color intent aliases (existing --bg-*, --fg-*, --surface-*, --border-*), spacing aliases (existing --gap-*, --padding-*, --margin-*), elevation aliases (existing --elevation-*), and z-index aliases (existing --z-*). Must include both :root and [data-theme='dark'] blocks where applicable. Semantic names must not be changed from their existing values to preserve component compatibility. |
| Existing shared component audits | `checkbox`, `checkbox-group`, `date-picker`, `icon`, `tag`, `tag-group` | Report violations by exact component folder name |

## 7. Implementation Steps & Dependencies

1. Baseline the token entrypoint and existing token files.
   - Confirm current import order in `public/styles/utils/_variables.scss`.
   - Snapshot duplicate, dead, and inconsistently named variables in the six primitive token files.

2. Build the primitive-vs-semantic inventory.
   - For each token variable, classify as primitive or semantic-in-disguise.
   - Mark any token that already behaves semantically but lives in a primitive file for relocation into `_semantic.scss`.

3. Normalize primitive token naming.
   - Align each primitive token to its category-scale pattern.
   - Remove duplicates and keep a single surviving source for every raw visual value.
   - Preserve existing values where possible to avoid visual regressions in AC-64 itself.

4. Introduce the semantic layer.
   - Create `public/styles/tokens/_semantic.scss`.
   - Define semantic aliases for color, spacing, typography, radius, elevation, and z-index.
   - Point semantic variables to primitive variables only; components must never consume primitives directly after AC-64 approval.

5. Wire the semantic layer into the global token pipeline.
   - Update `public/styles/utils/_variables.scss` to import `_semantic.scss` after all primitive token files.
   - Keep import order deterministic so semantic aliases resolve after primitive definitions.

6. Audit existing shared components for violations.
   - Inspect the six existing shared component folders.
   - Record each hardcoded visual value, each direct primitive-token reference, and each missing semantic alias requirement.
   - Write findings into `projects/Accounting-Frontend/docs/design/token-violation-audit.md` as handoff input for AC-78.

7. Update design-system rules.
   - Revise `projects/Accounting-Frontend/docs/design/design-system.md` to enforce the two-layer token model explicitly.
   - Mirror the same rule changes into `docs/frontend/design/design-system.md` in this workspace.

8. Run build and smoke validation.
   - Compile the frontend application.
   - Smoke-check Storybook/dev-tool pages for the already delivered shared components.
   - Confirm no visual regression is introduced by token renames or import-order changes.

9. Prepare review evidence.
   - Update the implementation plan if any file targets changed during execution.
   - Keep TL approval blocked until the plan and later implementation evidence are reviewed.

## 8. Code-Level Implementation Blueprint

### 8.1 Primitive token files — UPDATE

**Files:**

- `public/styles/tokens/_colors.scss`
- `public/styles/tokens/_spacing.scss`
- `public/styles/tokens/_typography.scss`
- `public/styles/tokens/_radius.scss`
- `public/styles/tokens/_elevation.scss`
- `public/styles/tokens/_z-index.scss`

**Required outcome per file:**

| File | What stays | What moves to `_semantic.scss` | What is removed |
|---|---|---|---|
| `_colors.scss` | All `--color-{palette}-{scale}` variables in `:root`. The `[data-theme='dark']` block retaining only primitive palette overrides (`--color-primary-*`, `--color-neutral-*`). | Semantic block at the end of `:root`: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--fg-primary`, `--fg-secondary`, `--fg-tertiary`, `--border-primary`, `--border-secondary`, `--surface-primary`, `--surface-secondary`, `--surface-hover`, `--surface-active`. Same names in `[data-theme='dark']` override block. | Nothing beyond the extracted semantic block. |
| `_spacing.scss` | All `--spacing-{scale}` variables. | `--gap-xs`, `--gap-sm`, `--gap-md`, `--gap-lg`, `--gap-xl`, `--padding-xs`, `--padding-sm`, `--padding-md`, `--padding-lg`, `--padding-xl`, `--margin-xs`, `--margin-sm`, `--margin-md`, `--margin-lg`, `--margin-xl`. | Nothing beyond the extracted semantic aliases. |
| `_typography.scss` | All `--font-family-*`, `--font-size-*`, `--font-weight-*`, `--line-height-*`, `--letter-spacing-*` after duplicate resolution. | Nothing — typography has no semantic aliases to extract. | Duplicate: `--font-size-xs` and `--font-size-sm` are both `0.75rem`. Retain `--font-size-xs: 0.75rem`. Remove `--font-size-sm` only after confirming no component references it; otherwise keep with a `/* duplicate — remove in AC-78 */` comment. |
| `_radius.scss` | All `--radius-{size}` variables. No semantic mixing found. | Nothing. | Nothing expected. |
| `_elevation.scss` | `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`, `--shadow-2xl`, `--shadow-inner`, `--shadow-none` (true raw primitives). | `--elevation-0` through `--elevation-6` (semantic aliases referencing `--shadow-*`). | Nothing beyond the extracted semantic aliases. |
| `_z-index.scss` | None — the file contains only intent-named semantic variables. | All current variables: `--z-base`, `--z-dropdown`, `--z-sticky`, `--z-fixed`, `--z-header`, `--z-overlay`, `--z-modal`, `--z-popover`, `--z-toast`, `--z-tooltip`, `--z-max`. | The entire `:root` block (replaced by a comment pointing to `_semantic.scss`). |

---

### 8.2 Semantic token layer — NEW

**File:** `public/styles/tokens/_semantic.scss`

**Structure:** One `:root` block; a `[data-theme='dark']` override block for color semantic tokens.

#### Color aliases

Extracted from `_colors.scss`. Names unchanged.

```scss
:root {
  --bg-primary: #ffffff;
  --bg-secondary: var(--color-neutral-50);
  --bg-tertiary: var(--color-neutral-100);

  --fg-primary: var(--color-neutral-900);
  --fg-secondary: var(--color-neutral-700);
  --fg-tertiary: var(--color-neutral-500);

  --border-primary: var(--color-neutral-200);
  --border-secondary: var(--color-neutral-300);

  --surface-primary: #ffffff;
  --surface-secondary: var(--color-neutral-50);
  --surface-hover: var(--color-neutral-100);
  --surface-active: var(--color-neutral-200);
}

[data-theme='dark'] {
  --bg-primary: #0f0f0f;
  --bg-secondary: var(--color-neutral-100);
  --bg-tertiary: var(--color-neutral-200);

  --fg-primary: var(--color-neutral-900);
  --fg-secondary: var(--color-neutral-700);
  --fg-tertiary: var(--color-neutral-500);

  --border-primary: var(--color-neutral-300);
  --border-secondary: var(--color-neutral-400);

  --surface-primary: #1a1a1a;
  --surface-secondary: var(--color-neutral-100);
  --surface-hover: var(--color-neutral-200);
  --surface-active: var(--color-neutral-300);
}
```

#### Spacing aliases

Extracted from `_spacing.scss`. Names unchanged.

```scss
:root {
  --gap-xs: var(--spacing-1);
  --gap-sm: var(--spacing-2);
  --gap-md: var(--spacing-4);
  --gap-lg: var(--spacing-6);
  --gap-xl: var(--spacing-8);

  --padding-xs: var(--spacing-2);
  --padding-sm: var(--spacing-3);
  --padding-md: var(--spacing-4);
  --padding-lg: var(--spacing-6);
  --padding-xl: var(--spacing-8);

  --margin-xs: var(--spacing-2);
  --margin-sm: var(--spacing-3);
  --margin-md: var(--spacing-4);
  --margin-lg: var(--spacing-6);
  --margin-xl: var(--spacing-8);
}
```

#### Elevation aliases

Extracted from `_elevation.scss`. Names unchanged.

```scss
:root {
  --elevation-0: var(--shadow-none);
  --elevation-1: var(--shadow-xs);
  --elevation-2: var(--shadow-sm);
  --elevation-3: var(--shadow-md);
  --elevation-4: var(--shadow-lg);
  --elevation-5: var(--shadow-xl);
  --elevation-6: var(--shadow-2xl);
}
```

#### Z-index aliases

Relocated from `_z-index.scss`. Names unchanged.

```scss
:root {
  --z-base: 0;
  --z-dropdown: 50;
  --z-sticky: 100;
  --z-fixed: 200;
  --z-header: 300;
  --z-overlay: 400;
  --z-modal: 500;
  --z-popover: 600;
  --z-toast: 700;
  --z-tooltip: 800;
  --z-max: 9999;
}
```

**Rules:**

- Every semantic alias resolves to an existing primitive variable or retains its original hardcoded value. No new names are introduced in AC-64.
- Status-variant semantic aliases needed by `tag` (e.g. `--color-success-bg`, `--color-success-fg`, `--color-danger-bg`, `--color-danger-fg`, `--color-warning-bg`, `--color-warning-fg`, `--color-info-bg`, `--color-info-fg`, `--color-contrast-bg`, `--color-contrast-fg`) are optional in AC-64. If deferred, they must be listed in `token-violation-audit.md` as AC-78 prerequisites. The decision must be documented.

---

### 8.3 Token entrypoint — UPDATE

**File:** `public/styles/utils/_variables.scss`

Add `@import './tokens/semantic';` after the six existing primitive token imports, using the same syntax already present in the file (no underscore prefix, no extension):

```scss
@import './tokens/colors';
@import './tokens/spacing';
@import './tokens/typography';
@import './tokens/radius';
@import './tokens/elevation';
@import './tokens/z-index';
@import './tokens/semantic';   /* ← new */
```

> The `:root` block already present in `_variables.scss` that defines `--input-height-*`, `--button-height-*`, `--transition-*`, `--breakpoint-*`, and `--container-*` is out of scope for AC-64. Do not move or modify these variables.

---

### 8.4 Violation audit report — NEW

**File:** `docs/design/token-violation-audit.md`

**Required sections:**

1. Summary table by component
2. Hardcoded value findings
3. Direct primitive-token consumption findings
4. Missing semantic alias needs
5. Recommended AC-78 follow-up actions

**Pre-identified findings** (confirmed during plan authoring; must be verified at execution time):

| Component | Finding Type | Detail |
|---|---|---|
| `checkbox` | Direct primitive | `--color-primary-500` consumed directly for focus ring |
| `checkbox` | Hardcoded value | `sm` variant label size `0.6875rem`; icon dimensions `0.625rem`, `0.375rem`, `0.5rem`, `0.3125rem`, `0.75rem`, `0.4375rem` are hardcoded |
| `checkbox` | Semantic-in-primitive | `--gap-sm`, `--fg-primary`, `--border-secondary`, `--surface-primary` currently resolve from `_spacing.scss` / `_colors.scss`; resolved automatically by AC-64 extraction — no component change required |
| `checkbox-group` | Semantic-in-primitive | `--gap-md` currently resolves from `_spacing.scss`; resolved automatically by AC-64 extraction |
| `date-picker` | Direct primitive | `--color-primary-300`, `--color-primary-500` consumed directly for hover/active border states |
| `date-picker` | Semantic-in-primitive | `--border-primary`, `--surface-primary` currently resolve from `_colors.scss`; resolved automatically by AC-64 extraction |
| `icon` | None | Component uses only `currentColor` and relative sizing; no token violations |
| `tag` | Direct primitive | `--color-primary-100`, `--color-primary-700`, `--color-green-100`, `--color-green-700`, `--color-blue-100`, `--color-blue-700`, `--color-amber-100`, `--color-amber-700`, `--color-red-100`, `--color-red-700` all consumed directly for variant colors |
| `tag` | Missing semantic | No `--color-success-bg` / `--color-success-fg` or equivalent status-variant semantic aliases exist yet |
| `tag-group` | Semantic-in-primitive | `--gap-sm` currently resolves from `_spacing.scss`; resolved automatically by AC-64 extraction |

---

### 8.5 Design-system rule update — UPDATE

**Files:**

- `projects/Accounting-Frontend/docs/design/design-system.md`
- `docs/frontend/design/design-system.md`

**Required changes:**

1. **Add** a "Token Architecture" section that defines the two-layer model:
   - **Primitive layer** (`_colors.scss`, `_spacing.scss`, `_typography.scss`, `_radius.scss`, `_elevation.scss`): raw scale values only. Never consumed directly by component code.
   - **Semantic layer** (`_semantic.scss`): intent-based aliases mapping primitives to visual purpose. The only layer components may consume.

2. **Remove** the following sentence from the Colors section (contradicts the two-layer rule):

   > "When a reusable component needs a specific visual treatment, prefer consuming the shared palette tokens from `public/styles/tokens/_colors.scss` directly instead of introducing component-specific alias layers that are only used once."

   **Replace with:**

   > "Reusable components must consume semantic tokens from `public/styles/tokens/_semantic.scss` only. Direct consumption of primitive palette tokens (`--color-*` scales) in component SCSS is prohibited."

3. **Add** a rule stating that component-level internal CSS custom properties (e.g. `--ui-checkbox-gap`) may reference semantic tokens as their resolved values.

4. **Document** naming conventions for both layers:

   | Layer | Naming pattern | Examples |
   |---|---|---|
   | Primitive | `--color-{palette}-{scale}`, `--spacing-{scale}`, `--font-size-{size}`, `--radius-{size}`, `--shadow-{size}` | `--color-neutral-300`, `--spacing-4`, `--shadow-md` |
   | Semantic | Intent-based; no palette or scale reference in the name | `--fg-primary`, `--gap-sm`, `--elevation-2`, `--z-modal` |

5. **Add** a reference to `docs/design/token-violation-audit.md` as the authoritative list of pending violations awaiting AC-78 remediation.

## 9. Security / Privacy Controls and Abuse-Case Checks

Even though AC-64 is style- and docs-focused, the mandatory security gate still applies.

- No secrets, tokens, or credentials may be written into token files, docs, or violation reports.
- Do not log or document user-specific data while inspecting Storybook or component examples.
- Fail closed on Sass/Angular build errors: no fallback import path that silently skips the semantic layer.
- Prevent token-name ambiguity abuse:
  - a component must not be able to bypass semantic rules by consuming a primitive alias with a semantic-sounding name.
  - semantic aliases must remain centralized in `_semantic.scss` only.
- Do not introduce remote asset dependencies or externally hosted fonts as part of token cleanup.
- Review output for this task must explicitly state `No security findings` or enumerate findings with severity under the project negative-scoring model.

## 10. Observability and Error-Handling Strategy

AC-64 does not introduce API handlers or runtime domain services. Observability therefore focuses on deterministic build-time and review-time evidence.

- Build-time boundary:
  - Sass import or variable-resolution failures are surfaced by `nx build erp-web` and must block completion.
- Documentation boundary:
  - Any mismatch between `projects/Accounting-Frontend/docs/design/design-system.md` and `docs/frontend/design/design-system.md` is treated as a release-blocking documentation drift defect.
- Audit boundary:
  - `docs/design/token-violation-audit.md` is the authoritative record of direct primitive usage and hardcoded-value findings for AC-78.
- Runtime logging:
  - No new production runtime logging is planned for AC-64.
  - If an implementation helper script becomes necessary later, it must emit only file-level progress and never print secret-bearing environment values.

## 11. GlobalResponseKey Model and Catalog

This task does not create frontend service responses or user-facing runtime error contracts.

- Global response-key model requirement: acknowledged.
- New `GlobalResponseKey` additions for AC-64: none.
- Constraint for follow-up tasks: if later token-loading or theme bootstrap logic returns user-facing errors, names must follow:
  - `ERROR_<Entity>_<StateOrReason>`
  - `INFOMATION_<Entity>_<StateOrEvent>`

## 12. Data Model / Migration Impact

| Change | Type | Notes |
|---|---|---|
| Primitive token cleanup | UPDATE | CSS custom-property names and organization only |
| New semantic token layer | CREATE | Additive stylesheet file, no database impact |
| Component violation report | CREATE | Documentation artifact only |
| Design-system rule update | UPDATE | Documentation only |

No database, API contract, or backend migration impact is expected.

## 13. TDD Plan (Execution Order)

AC-64 has no TypeScript business logic, so test-first execution is driven by failing style/build checks and documented audit evidence.

### Phase 1 - Failing baseline audit
- Produce an initial inventory of tokens and component violations before any rename.
- Capture at least one known direct primitive-consumption or hardcoded-value finding per affected component, or explicitly record `none found`.

### Phase 2 - Token pipeline changes
- Update one token category at a time.
- After each category update, run a narrow build validation if possible; otherwise continue category batching and run full app build before proceeding to docs.

### Phase 3 - Build validation
- Command: `npm run build`
- Expected result: Angular/Nx build succeeds with semantic token layer included.

### Phase 4 - Smoke validation
- Command: `npm run start` or equivalent local dev serve for manual validation.
- Evidence targets:
  - checkbox story-book page
  - icon story-book page
  - tag story-book page
  - date-time-picker story-book page
- Expected result: existing pages render with no obvious visual regression after token changes.

### Phase 5 - Documentation validation
- Confirm the product doc and workspace mirror contain the same token-governance rules.
- Confirm `token-violation-audit.md` exists and references all six audited shared components.

## 14. BDD Scenarios and Evidence

| Scenario | Expected Evidence |
|---|---|
| Given primitive tokens are normalized, when a developer needs a raw palette value, then they find it only in the category primitive token files | Updated token files show only raw scale variables |
| Given the semantic layer exists, when a shared component needs a surface/background/text token, then it can resolve it through `_semantic.scss` without naming a raw scale | `_semantic.scss` defines intent-based aliases for all required categories |
| Given the six existing shared components are audited, when AC-78 starts, then it has a concrete violation backlog instead of rediscovering styling debt | `docs/design/token-violation-audit.md` lists all audited components and findings |
| Given design-system rules are updated, when a future component task begins, then the developer sees an explicit ban on direct primitive token consumption | Both design-system docs document the two-layer token rule |
| Given token changes are complete, when the frontend app and story-book pages are checked, then existing shared UI renders without obvious visual regression | Successful build plus manual smoke-check notes/screenshots |

## 15. Rollout, Rollback, and Feature-Flag Strategy

- Rollout:
  - Deliver token cleanup and semantic layer in one atomic task branch.
  - Merge only after build and smoke evidence are attached.
- Rollback:
  - Revert the AC-64 changeset if semantic alias wiring breaks existing pages.
  - Restore prior token file names and import order from Git history if regression is detected.
- Feature flag:
  - Not applicable. Token-governance changes are foundational and must be consistent globally.

## 16. Acceptance Verification Matrix

| AoC / DoD | Implementation Item | Verification |
|---|---|---|
| AOC-01 / DOD-01 | Audit all six token files and classify every variable | Token inventory embedded in implementation notes and cleaned token files |
| AOC-02 / DOD-02 | Add `public/styles/tokens/_semantic.scss` with required aliases | File exists and is imported by `_variables.scss` |
| AOC-03 / DOD-01 | Normalize primitive naming and remove duplicates | Primitive files contain consistent category-scale naming only |
| AOC-04 / DOD-03 | Update design-system usage rules | Both design-system docs updated and synchronized |
| AOC-05 / DOD-05 | Produce violation list for six existing components | `docs/design/token-violation-audit.md` created with all six components |
| AOC-06 / DOD-04 | Compile app and smoke-check existing Storybook pages | `npm run build` succeeds and manual story-book evidence recorded |

## 17. TL Approval Gate

**Current status:** Approved.

Implementation may start only after TL explicitly approves all of the following:

- Repository targeting is correct for both `accounting-frontend` and the workspace docs mirror.
- The semantic token file path and import order are approved.
- The violation-report path and AC-78 handoff contract are approved.
- The build and manual smoke validation plan is approved.
- The acceptance-verification matrix covers all AoC and DoD items.

If approval is withheld, update this plan first and do not run `/speckit.implement`.
