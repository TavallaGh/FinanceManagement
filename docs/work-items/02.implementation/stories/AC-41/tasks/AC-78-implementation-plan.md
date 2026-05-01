---
title: "AC-78 - FE - Shared UI Token Alignment Refactor - Implementation Plan"
jira: AC-78
parent: AC-41
phase: Implementation
created: 2026-04-30
status: approved
scope: FRONT
target_repo: accounting-frontend
source_branch: features/ac-78-fe-shared-ui-token-alignment-refactor
target_branch: develop
---

# AC-78 - FE - Shared UI Token Alignment Refactor (Implementation Plan)

Source: https://nexttoptech.atlassian.net/browse/AC-78
Parent: https://nexttoptech.atlassian.net/browse/AC-41

---

## 1. Task Summary

- Jira key: AC-78
- Parent story: AC-41 - Shared UI Foundation
- Task summary: FE - Shared UI Token Alignment Refactor
- Stack: Frontend / UI / Styles
- Canonical task spec: [Solution Task Spec](../../../../01.solution/linked/stories/AC-41/tasks/AC-78.md)
- Primary product repository: `projects/Accounting-Frontend`
- Workspace repository artifact path: `docs/work-items/02.implementation/stories/AC-41/tasks/AC-78-implementation-plan.md`
- GitLab execution context: to be created when credentials available
  - Frontend issue: TBD
  - Frontend MR: TBD
  - Workspace issue: TBD
  - Workspace MR: TBD
  - Source branch: `features/ac-78-fe-shared-ui-token-alignment-refactor`
  - Target branch: `develop`
- Dependency posture:
  - AC-64 (Token Audit): **complete** — `token-violation-audit.md` produced and is the authoritative input for this task.
  - AC-65 (Theme Engine): **required** before dark-mode Storybook verification step can be signed off.

---

## 2. Readiness Checks

- Goal Of Task present: Yes
- Problem-To-Solve present: Yes
- AoC present: Yes (AOC-01 through AOC-05)
- DoD present: Yes (DOD-01 through DOD-05)
- Test Cases present: Yes — TDD coverage + BDD scenarios
- Fix Version target: `V 0.1 (MVP)` (story-level scope; applies to all AC-41 subtasks)
- Labels / scope: `frontend`
- Jira and GitLab operational traceability: pending credentials
- Task classification: Non-Domain
- TL gate required before coding: **Yes — hard gate; no implementation until explicit TL approval**

---

## 3. Scope & Assumptions

**In scope:**
- Extend `public/styles/tokens/_semantic.scss` with 19 new semantic aliases required by the three affected components.
- Refactor `libs/shared/ui/src/lib/components/tag/tag.component.scss` — replace all direct primitive color references with semantic aliases.
- Refactor `libs/shared/ui/src/lib/components/checkbox/checkbox.component.scss` — replace all direct primitive color references with semantic aliases; map two icon-dimension internal variables to primitives; document remaining icon geometry hardcoded values as intentional deviations.
- Refactor `libs/shared/ui/src/lib/components/date-picker/date-picker.component.scss` — replace four direct primitive color references with semantic aliases.
- Evaluate and handle `--font-size-sm` duplicate in `_typography.scss` per AC-64 directive.
- Verify Storybook smoke for all 6 existing shared components after refactoring (including 3 that had auto-resolved violations in AC-64).

**Out of scope:**
- TypeScript, template, or Angular component logic changes.
- Behavioral or API changes to any existing component.
- New component implementations.
- `checkbox-group`, `icon`, `tag-group` component SCSS changes — their violations were auto-resolved by AC-64 semantic extraction; no code change is needed.
- Token alignment for new components AC-67 through AC-76 (built to standard from the start).

**Assumptions:**
- AC-64 is complete and merged to `develop`. `_semantic.scss` is already wired into `_variables.scss`.
- The violation audit at `projects/Accounting-Frontend/docs/design/token-violation-audit.md` is the authoritative handoff — all findings and recommended aliases are used as-is.
- AC-65 (theme engine) may or may not be merged at the time of this task's implementation; dark-mode Storybook verification is gated on AC-65 completion.
- No new test infrastructure is required. Verification is build-time + Storybook smoke.

---

## 4. Repository Routing Matrix

| Artifact | Repository | Exact Path |
|---|---|---|
| Semantic alias extension | accounting-frontend | `public/styles/tokens/_semantic.scss` |
| Checkbox SCSS refactor | accounting-frontend | `libs/shared/ui/src/lib/components/checkbox/checkbox.component.scss` |
| Date-picker SCSS refactor | accounting-frontend | `libs/shared/ui/src/lib/components/date-picker/date-picker.component.scss` |
| Tag SCSS refactor | accounting-frontend | `libs/shared/ui/src/lib/components/tag/tag.component.scss` |
| Typography duplicate cleanup | accounting-frontend | `public/styles/tokens/_typography.scss` |
| Workspace implementation plan | accounting-workspace | `docs/work-items/02.implementation/stories/AC-41/tasks/AC-78-implementation-plan.md` |
| Task log (workspace MR scope) | accounting-workspace | `docs/work-items/02.implementation/stories/AC-41/tasks/` |

---

## 5. Domain Hierarchy Map

AC-78 touches only the frontend presentation layer. No backend, application, or infrastructure changes are made.

```text
projects/Accounting-Frontend/
  01.Domain/
    no changes

  02.Application/
    no changes

  03.Infra/
    no changes

  04.Presentation/ (frontend presentation surface)
    public/styles/
      tokens/
        _semantic.scss     <- EXTEND (add 19 new aliases)
        _typography.scss   <- UPDATE (remove --font-size-sm duplicate if safe, else keep comment)
    libs/shared/ui/
      src/lib/components/
        checkbox/
          checkbox.component.scss  <- REFACTOR
        date-picker/
          date-picker.component.scss  <- REFACTOR
        tag/
          tag.component.scss  <- REFACTOR
        checkbox-group/      <- no change (auto-resolved by AC-64)
        icon/                <- no change (no violations)
        tag-group/           <- no change (auto-resolved by AC-64)
```

---

## 6. Entity-Centric Folder Naming Map

This task has no business domain entities. The folder contract maps to shared UI component names and token files.

| Concern | Exact Folder / File Name | Rule |
|---|---|---|
| Interactive-state semantic aliases | `tokens/_semantic.scss` | Add `--color-accent`, `--color-interactive-hover`, `--color-interactive-emphasis`, `--color-danger-interactive`, `--color-neutral-disabled` |
| Status-variant semantic aliases | `tokens/_semantic.scss` | Add all 14 status-variant aliases per violation audit section 4 |
| Checkbox refactor | `components/checkbox/checkbox.component.scss` | Replace 8 `--color-primary-*` / `--color-danger-*` / `--color-neutral-*` direct primitives; map 2 icon-dimension values to primitives; document remaining icon geometry deviations |
| Date-picker refactor | `components/date-picker/date-picker.component.scss` | Replace 4 `--color-primary-*` direct primitives |
| Tag refactor | `components/tag/tag.component.scss` | Replace all 14 direct primitive color refs in light and 14 in dark override |

---

## 7. Implementation Steps & Dependencies

### Phase 1: Extend Semantic Token Layer (prerequisite for all refactors)

1. Open `public/styles/tokens/_semantic.scss`.
2. Append two new sections: **Interactive State Aliases** and **Status Variant Aliases**.
3. Define all 19 new aliases in the `:root` block.
4. Define dark-mode overrides for all 19 aliases in the `[data-theme='dark']` override block.
5. Do not rename, remove, or alter any existing semantic aliases already present in the file.

### Phase 2: Refactor `tag.component.scss` (highest priority)

1. Replace each of the 7 variant background colors (`--color-primary-100`, `--color-neutral-100`, `--color-green-100`, `--color-blue-100`, `--color-amber-100`, `--color-red-100`, `--color-neutral-900`) with the corresponding new semantic background alias.
2. Replace each of the 7 variant text colors (`--color-primary-700`, `--color-neutral-600`, `--color-green-700`, `--color-blue-700`, `--color-amber-700`, `--color-red-700`, `--color-neutral-50`) with the corresponding new semantic foreground alias.
3. Remove the entire `:host-context([data-theme='dark'])` override block — dark-mode token resolution is now handled by the semantic layer's `[data-theme='dark']` block on `<html>`.
4. Verify no `--color-*` primitive references remain in the file after refactoring.

### Phase 3: Refactor `checkbox.component.scss`

1. Replace `var(--color-primary-500, ...)` in `__box` default `box-shadow` with `var(--color-accent)`.
2. Replace `var(--color-primary-500, ...)` in `focus-visible` border-color and box-shadow with `var(--color-accent)`.
3. Replace `var(--color-primary-400, ...)` in hover border-color with `var(--color-interactive-hover)`.
4. Replace both `var(--color-primary-500, ...)` in `.ui-checkbox--checked` (border-color + background) with `var(--color-accent)`.
5. Replace `var(--color-danger-500, ...)` in `.ui-checkbox--invalid` border-color with `var(--color-danger-interactive)`.
6. Replace `var(--color-danger-500, ...)` in invalid focus-ring box-shadow with `var(--color-danger-interactive)`.
7. Replace `var(--color-danger-500, ...)` in `__error-indicator` background with `var(--color-danger-interactive)`.
8. Replace `var(--color-neutral-300, ...)` in disabled border with `var(--color-neutral-disabled)`.
9. Replace `var(--color-neutral-100, ...)` in disabled background `color-mix` with `var(--color-neutral-disabled)`.
10. Replace `var(--color-neutral-400, ...)` in disabled-checked border `color-mix` with `var(--color-neutral-disabled)`.
11. **Icon geometry mapping** (where primitive match exists):
    - `--size-sm` block: update `--ui-checkbox-icon-inline-size: 0.5rem` → `var(--spacing-2)`.
    - `--size-lg` block: update `--ui-checkbox-icon-inline-size: 0.75rem` → `var(--spacing-3)`.
12. **Icon geometry intentional deviations** (document with inline comment, do NOT replace):
    - Default: `--ui-checkbox-icon-inline-size: 0.625rem` → `/* intentional: checkmark geometry, no token match */`
    - Default: `--ui-checkbox-icon-block-size: 0.375rem` → `/* intentional: checkmark geometry, no token match */`
    - Default: `--ui-checkbox-icon-stroke: 0.125rem` → `/* intentional: checkmark stroke, no token match */`
    - `--size-sm`: `--ui-checkbox-icon-block-size: 0.3125rem` → `/* intentional: checkmark geometry, no token match */`
    - `--size-sm`: `--ui-checkbox-label-size: 0.6875rem` → `/* intentional: compact label scale deviation, no token match */`
    - `--size-sm`: `--ui-checkbox-label-line-height: 1.25` → `/* intentional: compact label line-height, unitless */`
    - `--size-sm`: `--ui-checkbox-description-line-height: 1.375` → `/* intentional: compact description line-height, unitless */`
    - `--size-lg`: `--ui-checkbox-icon-block-size: 0.4375rem` → `/* intentional: checkmark geometry, no token match */`
    - `--size-lg`: `--ui-checkbox-icon-stroke: 0.15625rem` → `/* intentional: checkmark stroke, no token match */`

> Note: Line-height unitless values (`1.25`, `1.375`) are intentional typographic deviations matching the compact-density variants. AOC-05 scope excludes unitless multipliers; the prohibition is against hardcoded color, spacing, radius, elevation, and z-index CSS values.

### Phase 4: Refactor `date-picker.component.scss`

1. Replace `var(--color-primary-300, ...)` in hover border on `.mat-mdc-text-field-wrapper` with `var(--color-interactive-hover)`.
2. Replace `var(--color-primary-500, ...)` in active/focused border on `.mat-mdc-form-field[data-ui-active]` with `var(--color-accent)`.
3. Replace `var(--color-primary-600, ...)` in toggle button hover/focus color with `var(--color-interactive-emphasis)`.
4. Replace `var(--color-primary-500, ...)` in `caret-color` with `var(--color-accent)`.

### Phase 5: Typography Duplicate Cleanup

1. Inspect `public/styles/tokens/_typography.scss` for the `--font-size-sm` duplicate marker left by AC-64 (`/* duplicate — remove in AC-78 */`).
2. Verify whether `checkbox.component.scss` or `date-picker.component.scss` still reference `--font-size-sm` after the refactoring in phases 3 and 4.
   - `checkbox.component.scss`: uses `var(--font-size-sm, 0.875rem)` for `--ui-checkbox-label-size` and `--ui-checkbox-description-size` (default size).
   - `date-picker.component.scss`: uses `var(--font-size-sm, 0.875rem)` in `.mat-mdc-input-element` and `.mdc-floating-label`.
3. Since both components reference `--font-size-sm`, retain the variable in `_typography.scss` and remove the removal-candidate comment. Leave a note: `/* used by checkbox, date-picker — not a duplicate of --font-size-xs; see token-violation-audit.md */`.
4. No value changes; no component changes required.

### Phase 6: Build Validation

1. Run `npm run build` (or `nx build erp-web`) from `projects/Accounting-Frontend`.
2. Expected: build succeeds with zero Sass/CSS errors or unknown-variable warnings.
3. If SCSS variable resolution fails, resolve unknown alias names before proceeding.

### Phase 7: Storybook Smoke Validation

1. Start the dev tools / Storybook shell: navigate the existing Storybook pages for all 6 components.
2. Light mode verification:
   - All 6 existing pages render without visual change compared to pre-refactor baseline (no regression).
3. Dark mode verification (requires AC-65 to be complete and reachable in Storybook):
   - Toggle to dark theme.
   - Verify `checkbox`, `date-picker`, and `tag` pages update correctly through the semantic token layer.
   - Verify `checkbox-group`, `icon`, and `tag-group` pages also update (or remain neutral for `icon`).
4. Record acceptance evidence: Storybook page screenshots or reviewer sign-off for each AOC.

---

## 8. Code-Level Implementation Blueprint

### 8.1 `_semantic.scss` — EXTEND

**New section to append: Interactive State Aliases**

Add to `:root` block:

| Alias | Light Mode Resolves To | Dark Mode Resolves To | Used By |
|---|---|---|---|
| `--color-accent` | `var(--color-primary-500)` | `var(--color-primary-400)` | checkbox, date-picker |
| `--color-interactive-hover` | `var(--color-primary-400)` | `var(--color-primary-300)` | checkbox, date-picker |
| `--color-interactive-emphasis` | `var(--color-primary-600)` | `var(--color-primary-500)` | date-picker |
| `--color-danger-interactive` | `var(--color-danger-500)` | `var(--color-danger-400)` | checkbox |
| `--color-neutral-disabled` | `var(--color-neutral-300)` | `var(--color-neutral-400)` | checkbox |

**New section to append: Status Variant Aliases**

Add to `:root` block:

| Alias | Light Mode Resolves To | Dark Mode Resolves To | Used By |
|---|---|---|---|
| `--color-primary-bg` | `var(--color-primary-100)` | `var(--color-primary-300)` | tag (primary variant) |
| `--color-primary-fg` | `var(--color-primary-700)` | `var(--color-primary-900)` | tag (primary variant) |
| `--color-secondary-bg` | `var(--color-neutral-100)` | `var(--color-neutral-300)` | tag (secondary variant) |
| `--color-secondary-fg` | `var(--color-neutral-600)` | `var(--color-neutral-900)` | tag (secondary variant) |
| `--color-success-bg` | `var(--color-green-100)` | `var(--color-green-300)` | tag |
| `--color-success-fg` | `var(--color-green-700)` | `var(--color-green-900)` | tag |
| `--color-info-bg` | `var(--color-blue-100)` | `var(--color-blue-300)` | tag |
| `--color-info-fg` | `var(--color-blue-700)` | `var(--color-blue-900)` | tag |
| `--color-warning-bg` | `var(--color-amber-100)` | `var(--color-amber-300)` | tag |
| `--color-warning-fg` | `var(--color-amber-700)` | `var(--color-amber-900)` | tag |
| `--color-danger-bg` | `var(--color-red-100)` | `var(--color-red-300)` | tag |
| `--color-danger-fg` | `var(--color-red-700)` | `var(--color-red-900)` | tag |
| `--color-contrast-bg` | `var(--color-neutral-900)` | `var(--color-neutral-50)` | tag |
| `--color-contrast-fg` | `var(--color-neutral-50)` | `var(--color-neutral-900)` | tag |

**Total new aliases: 19**

**Structure rule:** All 19 aliases must appear in `:root` (light values). All 19 must also appear in `[data-theme='dark']` override block. No other changes to the existing file content.

---

### 8.2 `checkbox.component.scss` — REFACTOR

**Primitive → Semantic mapping table:**

| Original Value | Replace With | Location |
|---|---|---|
| `var(--color-primary-500, #0ea5e9)` in `box-shadow` | `var(--color-accent)` | `__box` initial state |
| `var(--color-primary-500, #0ea5e9)` in `focus-visible` | `var(--color-accent)` | focus ring border + shadow |
| `var(--color-primary-400, #38bdf8)` in hover | `var(--color-interactive-hover)` | hover border |
| `var(--color-primary-500, #0ea5e9)` in checked | `var(--color-accent)` | checked border + background |
| `var(--color-danger-500, #ef4444)` in invalid | `var(--color-danger-interactive)` | invalid border |
| `var(--color-danger-500, #ef4444)` in invalid focus-ring | `var(--color-danger-interactive)` | invalid focus shadow |
| `var(--color-danger-500, #ef4444)` in `__error-indicator` | `var(--color-danger-interactive)` | error indicator background |
| `var(--color-neutral-300, #d4d4d4)` in disabled | `var(--color-neutral-disabled)` | disabled border |
| `var(--color-neutral-100, #f5f5f5)` in disabled bg | `var(--color-neutral-disabled)` | disabled bg (inside color-mix) |
| `var(--color-neutral-400, #a3a3a3)` in disabled checked | `var(--color-neutral-disabled)` | disabled checked border (inside color-mix) |

**Icon dimension mapping (internal component-local variables):**

| Variable | Before | After |
|---|---|---|
| `--size-sm` `--ui-checkbox-icon-inline-size` | `0.5rem` | `var(--spacing-2)` |
| `--size-lg` `--ui-checkbox-icon-inline-size` | `0.75rem` | `var(--spacing-3)` |

**Intentional deviations (add inline comment, do NOT replace):**

| Variable | Value | Comment |
|---|---|---|
| Default `--ui-checkbox-icon-inline-size` | `0.625rem` | `/* intentional: checkmark geometry, no token match */` |
| Default `--ui-checkbox-icon-block-size` | `0.375rem` | `/* intentional: checkmark geometry, no token match */` |
| Default `--ui-checkbox-icon-stroke` | `0.125rem` | `/* intentional: checkmark stroke, no token match */` |
| `--size-sm` `--ui-checkbox-icon-block-size` | `0.3125rem` | `/* intentional: checkmark geometry, no token match */` |
| `--size-sm` `--ui-checkbox-label-size` | `0.6875rem` | `/* intentional: compact label scale deviation, no token match */` |
| `--size-sm` `--ui-checkbox-label-line-height` | `1.25` | `/* intentional: compact label line-height, unitless */` |
| `--size-sm` `--ui-checkbox-description-line-height` | `1.375` | `/* intentional: compact description line-height, unitless */` |
| `--size-lg` `--ui-checkbox-icon-block-size` | `0.4375rem` | `/* intentional: checkmark geometry, no token match */` |
| `--size-lg` `--ui-checkbox-icon-stroke` | `0.15625rem` | `/* intentional: checkmark stroke, no token match */` |

**Post-condition:** Zero `--color-*` primitive references remain in the file. Nine intentional-deviation comments are added for geometric/typographic values outside token scale scope.

---

### 8.3 `date-picker.component.scss` — REFACTOR

**Primitive → Semantic mapping table:**

| Original Value | Replace With | Location |
|---|---|---|
| `var(--color-primary-300, #93c5fd)` | `var(--color-interactive-hover)` | hover border on `.mat-mdc-text-field-wrapper` |
| `var(--color-primary-500, #3b82f6)` | `var(--color-accent)` | active/focused border on `[data-ui-active]` |
| `var(--color-primary-600, #2563eb)` | `var(--color-interactive-emphasis)` | toggle button hover/focus color |
| `var(--color-primary-500, #3b82f6)` | `var(--color-accent)` | `caret-color` on input element |

**Post-condition:** Zero `--color-*` primitive references remain in the file.

---

### 8.4 `tag.component.scss` — REFACTOR

**Primitive → Semantic mapping table:**

| Original Value | Variant / Context | Replace With |
|---|---|---|
| `var(--color-primary-100)` | `:host` default + `.ui-tag--primary` background | `var(--color-primary-bg)` |
| `var(--color-primary-700)` | `:host` default + `.ui-tag--primary` text | `var(--color-primary-fg)` |
| `var(--color-neutral-100)` | `.ui-tag--secondary` background | `var(--color-secondary-bg)` |
| `var(--color-neutral-600)` | `.ui-tag--secondary` text | `var(--color-secondary-fg)` |
| `var(--color-green-100)` | `.ui-tag--success` background | `var(--color-success-bg)` |
| `var(--color-green-700)` | `.ui-tag--success` text | `var(--color-success-fg)` |
| `var(--color-blue-100)` | `.ui-tag--info` background | `var(--color-info-bg)` |
| `var(--color-blue-700)` | `.ui-tag--info` text | `var(--color-info-fg)` |
| `var(--color-amber-100)` | `.ui-tag--warn` background | `var(--color-warning-bg)` |
| `var(--color-amber-700)` | `.ui-tag--warn` text | `var(--color-warning-fg)` |
| `var(--color-red-100)` | `.ui-tag--danger` background | `var(--color-danger-bg)` |
| `var(--color-red-700)` | `.ui-tag--danger` text | `var(--color-danger-fg)` |
| `var(--color-neutral-900)` | `.ui-tag--contrast` background | `var(--color-contrast-bg)` |
| `var(--color-neutral-50)` | `.ui-tag--contrast` text | `var(--color-contrast-fg)` |

**Dark mode strategy:**

The existing `:host-context([data-theme='dark'])` override blocks must be **removed entirely**. The semantic layer's `[data-theme='dark']` block on `<html>` now provides the dark-mode values for all aliases via CSS custom property cascade. `:host-context()` overrides are not needed once the tag component consumes semantic aliases.

**Post-condition:** Zero `--color-*` primitive references remain in the file. Zero `:host-context([data-theme='dark'])` blocks remain.

---

### 8.5 `_typography.scss` — UPDATE (conditional)

- Confirm `--font-size-sm` is still present in the file with the AC-64 removal-candidate comment.
- Since both `checkbox.component.scss` and `date-picker.component.scss` reference `var(--font-size-sm)`, the variable must be retained.
- Remove the `/* duplicate — remove in AC-78 */` comment and replace with:
  `/* used by checkbox + date-picker components — intentional; not a duplicate of --font-size-xs */`
- No value change. No component change.

---

## 9. Security / Privacy Controls and Abuse-Case Checks

- No secrets, tokens, or credentials appear in SCSS files or design docs produced by this task.
- CSS custom property names must not shadow or mimic security-sensitive variable names (e.g. `--token`, `--api-key`).
- Token injection risk: CSS custom properties with fallback values that reference external URLs are not permitted. All new aliases reference only existing custom property primitives. No external assets introduced.
- Semantic alias centralization: all 19 new aliases must reside exclusively in `_semantic.scss`. Component SCSS must not re-declare semantic-sounding custom properties that shadow the global layer.
- `color-mix()` usage in `checkbox.component.scss` is a native CSS function call with primitive-resolved color values — not a security concern. After refactoring, color arguments are semantic aliases, preserving the same risk profile.
- Review output for this task must explicitly state `No security findings` or enumerate findings with severity.

---

## 10. Observability and Error-Handling Strategy

This task has no runtime service boundaries. Observability applies at build-time and review-time only.

| Boundary | Signal | Requirement |
|---|---|---|
| Sass compilation | Build error on unknown `--color-*` alias | All 19 aliases must be defined in `_semantic.scss` before the component SCSS changes are compiled |
| Angular build | `nx build erp-web` passes cleanly | Prerequisite for task completion |
| Storybook smoke | No white/broken pages for any of the 6 existing components | Required for AOC-02 and AOC-04 |
| Dark theme toggle | All 3 refactored components update visually | Required for AOC-02 (gated on AC-65 availability) |
| Regression guard | Light theme: all 6 component pages unchanged from pre-refactor baseline | Required for AOC-04 |

No runtime logging additions are required for this task.

---

## 11. GlobalResponseKey Model and Catalog

This task does not create or modify frontend service calls, API contracts, or user-facing runtime responses.

- `GlobalResponseKey` additions for AC-78: **none**.
- CSS/SCSS changes do not participate in the response-key naming contract.

---

## 12. Data Model / Migration Impact

| Change | Type | Notes |
|---|---|---|
| Semantic alias extension | UPDATE | CSS custom-property additions only — no visual value changes |
| Checkbox SCSS refactor | UPDATE | Alias substitution + geometry comments — no visual regression |
| Date-picker SCSS refactor | UPDATE | Alias substitution only — no visual regression |
| Tag SCSS refactor | UPDATE | Alias substitution + dark override removal — dark mode becomes new capability |
| Typography duplicate comment | UPDATE | Documentation comment only — no value change |

No database, API, or backend migration impact.

---

## 13. TDD Plan (Execution Order)

### Phase 1 — Baseline Snapshot

- Before any file change, record the current state of all 3 affected component SCSS files.
- Capture current Storybook light-mode rendering as baseline evidence.
- This is the regression reference.

### Phase 2 — Semantic Extension (non-breaking addition)

- Add 19 aliases to `_semantic.scss`.
- Run `npm run build` after this step alone.
- **Expected:** Build passes. Zero component behavioral change yet.
- **Fail condition:** Unknown primitive reference in a new alias expression means a primitive token name was mistyped; correct before proceeding.

### Phase 3 — Component Refactors (per component)

For each component in order: `tag` → `checkbox` → `date-picker`:

1. Apply the SCSS substitutions for that component.
2. Run `npm run build`.
3. **Expected:** Build passes.
4. Smoke-check that component's Storybook page in light mode.
5. **Expected:** Visual appearance unchanged.
6. Proceed to next component only on green.

### Phase 4 — Full Build + Full Storybook Smoke

- Run full build.
- Open all 6 existing component pages in Storybook.
- Light mode: confirm no regression on all 6 pages.
- Dark mode (if AC-65 available): confirm all 3 refactored components update via semantic layer.

### Phase 5 — Typography Cleanup

- Apply the `_typography.scss` comment update.
- Run build again to confirm no regression.

---

## 14. BDD Scenarios

### Scenario 1: Dark theme — `tag` component responds via semantic layer

```
Given the tag SCSS refactor is complete and all :host-context([data-theme='dark']) overrides are removed
When the Storybook theme is switched to dark mode
Then all tag variant pages (primary, secondary, success, info, warn, danger, contrast) update their colors
  via the semantic alias layer — no light-mode primitive colors remain visible
```

**Evidence:** Storybook dark theme toggle; dark-mode screenshots for each tag variant.

### Scenario 2: Light theme — no visual regression on `tag`

```
Given the tag SCSS refactor is complete
When the Storybook page for tag is opened in light mode
Then the visual appearance is identical to the pre-refactor baseline
```

**Evidence:** Storybook light theme; visual comparison to baseline screenshot.

### Scenario 3: Dark theme — `checkbox` responds via semantic layer

```
Given the checkbox SCSS refactor is complete
When the Storybook theme is switched to dark mode
Then the checkbox focus ring, checked background, hover border, error state, and disabled state
  all update their colors via --color-accent, --color-danger-interactive, and --color-neutral-disabled
  — no hardcoded primitive colors remain visible in any state
```

**Evidence:** Storybook dark theme; interactive state screenshots for checkbox.

### Scenario 4: Dark theme — `date-picker` responds via semantic layer

```
Given the date-picker SCSS refactor is complete
When the Storybook theme is switched to dark mode
Then the date-picker's hover border, active border, toggle button, and caret-color
  all update via --color-accent, --color-interactive-hover, and --color-interactive-emphasis
```

**Evidence:** Storybook dark theme; screenshots for date-picker hover and active states.

### Scenario 5: Light theme — no regression on `checkbox-group`, `icon`, `tag-group`

```
Given AC-78 refactoring is complete (semantic layer extended, 3 components refactored)
When the Storybook pages for checkbox-group, icon, and tag-group are opened in light mode
Then their visual appearance is unchanged (these components had no AC-78 action items)
```

**Evidence:** Storybook light theme; screenshots match pre-AC-64 baseline.

### Scenario 6: Build integrity

```
Given all SCSS changes from AC-78 are applied
When nx build erp-web is run
Then the build completes with zero Sass compilation errors and zero unknown-variable warnings
```

**Evidence:** Build log showing successful compilation.

---

## 15. Rollout, Rollback, and Feature-Flag Strategy

- **Rollout:** Standard GitFlow — merged to `develop` via task MR. Story cherry-pick into `story/*` branch for test promotion.
- **Rollback:** All changes are additive CSS alias additions and substitution-only SCSS refactors. Rollback is a git revert of the task MR.
- **Feature flag:** Not applicable — this is a pure SCSS change with no runtime behavioral surface.
- **Risk — tag dark mode:** The `:host-context()` removal is a deliberate improvement enabling dark theme capability. If the dark theme is not yet tested on the tag component, this constitutes a NEW capability on top of the existing light-mode behavior. Risk is LOW because the semantic layer (contributed by AC-64 and AC-65) controls the dark values, not the tag component itself.
- **Risk — date-picker complexity:** The date-picker has extensive Angular Material override rules. The 4 targeted primitives are isolated to specific rule sets; no Material selector logic is changed.

---

## 16. Pre-Implementation Credential Gate

Before any Jira or GitLab operational steps can run:

- `.secrets/credentials.local` must exist and contain valid values for:
  - `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`
  - `GITLAB_BASE_URL`, `GITLAB_TOKEN`
  - `GITLAB_WORKSPACE_PROJECT_ID`, `GITLAB_PROJECT_PROJECT_ID` (or `GITLAB_FRONT_PROJECT_ID`)
- Currently: **MISSING** — `.secrets/credentials.local` does not exist.
- Action required: populate `.secrets/credentials.local` before running `/speckit.implement AC-78 FRONT`.

Operational steps blocked until credentials present:
1. Jira status transition: `To Do → In Progress` for AC-78
2. GitLab issue creation in accounting-frontend
3. GitLab issue creation in accounting-workspace
4. GitLab MR creation (Draft) in accounting-frontend (`features/ac-78-fe-shared-ui-token-alignment-refactor → develop`)
5. GitLab MR creation (Draft) in accounting-workspace
6. Bi-directional web link registration in Jira

---

## 17. Source Traceability

| Artifact | Location |
|---|---|
| Canonical task spec | `docs/work-items/01.solution/linked/stories/AC-41/tasks/AC-78.md` |
| Parent story solution | `docs/work-items/01.solution/linked/stories/AC-41/solution.md` |
| Story task plan | `docs/work-items/01.solution/linked/stories/AC-41/task-plan.md` |
| Violation audit (authoritative input) | `projects/Accounting-Frontend/docs/design/token-violation-audit.md` |
| AC-64 implementation plan (token foundation) | `docs/work-items/02.implementation/stories/AC-41/tasks/AC-64-implementation-plan.md` |
| Semantic token file | `projects/Accounting-Frontend/public/styles/tokens/_semantic.scss` |
| Checkbox SCSS | `projects/Accounting-Frontend/libs/shared/ui/src/lib/components/checkbox/checkbox.component.scss` |
| Date-picker SCSS | `projects/Accounting-Frontend/libs/shared/ui/src/lib/components/date-picker/date-picker.component.scss` |
| Tag SCSS | `projects/Accounting-Frontend/libs/shared/ui/src/lib/components/tag/tag.component.scss` |

---

## 18. Approval

- Tech Lead decision: **pending** — TL approval required before implementation begins
- Product Owner decision: pending (PO review occurs at story-level after all AC-41 tasks complete)
