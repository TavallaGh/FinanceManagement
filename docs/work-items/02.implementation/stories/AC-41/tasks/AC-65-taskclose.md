---
title: "AC-65 - FE - Light/Dark Theme Engine - Task Close"
jira: AC-65
parent: AC-41
phase: Close
created: 2026-04-30
closed: 2026-05-01
status: complete
scope: FRONT
---

# AC-65 — FE - Light/Dark Theme Engine (Task Close)

**Jira:** https://nexttoptech.atlassian.net/browse/AC-65  
**Parent Story:** https://nexttoptech.atlassian.net/browse/AC-41  
**Implementation Plan:** [AC-65-implementation-plan.md](./AC-65-implementation-plan.md)

---

## 1. Execution Summary

| Field | Value |
|---|---|
| Start date | 2026-04-30 |
| End date | 2026-05-01 |
| Executed by | GitHub Copilot (AI agent) |
| Source branch | `features/ac-65-fe-light-dark-theme-engine` |
| Target branch | `develop` |
| GitLab issue (frontend) | [`accounting-frontend/-/work_items/3`](https://gitlab.com/next-top-tech/accounting/accounting-frontend/-/work_items/3) |
| GitLab MR (project) | [`accounting-frontend/-/merge_requests/6`](https://gitlab.com/next-top-tech/accounting/accounting-frontend/-/merge_requests/6) |
| GitLab MR (workspace) | [`accounting-workspace/-/merge_requests/24`](https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/24) |
| Jira transition | `In Progress` → `In Review` |

---

## 2. Commits

### Frontend repository (`accounting-frontend`)

| Short SHA | Date | Message |
|---|---|---|
| `36d7553a` | 2026-05-01 | feat: dark and light theme |
| `c41ecbce` | 2026-04-30 | fix: semantic styles |
| `8a50d382` | 2026-04-30 | fix: components |
| `2841f50c` | 2026-04-30 | fix: remove extra comments |
| `4d0c244b` | 2026-04-30 | wip: AC-64 two-layer token architecture — extract semantic layer |

### Workspace repository (`accounting-workspace`)

| Short SHA | Date | Message |
|---|---|---|
| `77d9884c` | 2026-05-01 | feat: task 65 |
| `7ad6eb6b` | 2026-04-30 | fix: task completed |
| `feba1dac` | 2026-04-30 | fix: task 78 implemented |
| `0061a8fb` | 2026-04-30 | feat: task 64 completed |
| `4bd7bb62` | 2026-04-30 | fix: task approved |
| `6edb0e04` | 2026-04-30 | wip: AC-64 workspace mirror — token architecture docs + implementation plan |

---

## 3. Delivered Changes

### 3.1 `ThemeService` — NEW

**File:** `apps/erp-web/src/app/core/services/theme.service.ts`

Angular injectable service providing the single point of truth for runtime theme switching.

Delivered capabilities:
- `signal<Theme>` for reactive state — consumers can `toObservable(themeService.theme)` without importing observables
- `theme$` observable exposed for RxJS consumers
- `getTheme()` synchronous read
- `setTheme('light' | 'dark')` to update theme, persist to `localStorage`, and apply to DOM
- `_initialize()` called by `APP_INITIALIZER` — reads `localStorage`, falls back to OS `prefers-color-scheme`, then defaults to `'light'`
- `_applyToDOM()` — sets `data-theme` on `document.documentElement`; adds `.theme-switching` class before the switch and removes it after two animation frames to suppress all CSS transitions during the swap

### 3.2 `ThemeService` Unit Tests — NEW

**File:** `apps/erp-web/src/app/core/services/theme.service.spec.ts`

7 passing unit tests (T-01 through T-07):

| Test | Description |
|---|---|
| T-01 | Defaults to light theme when no localStorage value |
| T-02 | Reads persisted theme from localStorage on init |
| T-03 | `setTheme('dark')` updates signal to dark |
| T-04 | `setTheme('light')` updates signal to light |
| T-05 | `setTheme()` writes to localStorage |
| T-06 | `setTheme()` sets `data-theme` attribute on `<html>` |
| T-07 | Reads `prefers-color-scheme: dark` when no localStorage value |

### 3.3 `APP_INITIALIZER` Registration — UPDATED

**File:** `apps/erp-web/src/app/app.config.ts`

Added `ThemeService` to the `APP_INITIALIZER` provider chain so the persisted or system-preference theme is applied to `<html>` before the first Angular component renders — no flash of wrong theme.

### 3.4 Semantic Token Layer — EXTENDED

**File:** `public/styles/tokens/_semantic.scss`

Completed the `[data-theme='dark']` block with full overrides for all semantic alias categories:

- Surface and background tokens
- Foreground (text) tokens — including `--fg-white` for invariant white text on colored cells
- Border tokens
- Surface state tokens
- Interactive state aliases
- Status variant aliases
- `--color-contrast-bg` / `--color-contrast-fg` — corrected to invert the active theme (were previously swapped, causing black-on-black in dark mode)

### 3.5 Storybook Shell Theme Toggle — NEW

**Files:**
- `apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.ts`
- `apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.html`
- `apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.scss`

Added a sun/moon theme toggle button to the Storybook header. Calls `ThemeService.setTheme()`. Reflects active theme via `[attr.data-theme-active]` binding. Uses semantic color tokens throughout.

### 3.6 Dark Mode CSS Fixes

#### Date Picker (`date-picker.component.ts` + `date-picker.component.scss`)

- `_applyLabelState()` inline styles changed from hardcoded `#ffffff` to `var(--surface-primary)` for label background and box-shadow spread; label color changed to `var(--fg-primary)` (floated) / `var(--fg-secondary)` (unfloated)
- Calendar popup background: `var(--surface-primary)` (was `color-mix(…, white)`)
- Selected date text color: `var(--fg-white)` (was `#ffffff` literal)
- Hover border: `var(--color-interactive-hover-border)` (was `--color-interactive-hover`)

#### Checkbox (`checkbox.component.scss`)

- Checkmark icon stroke: `--fg-white` (was `--bg-primary` which resolves to `#171717` in dark mode)
- Error indicator fill: `--fg-white` (was `--bg-primary`)
- Disabled box background blend base: `var(--surface-primary)` (was `var(--bg-primary, #ffffff)`)

### 3.7 Instant Theme Switching (`.theme-switching` pattern)

**File:** `apps/erp-web/src/styles.scss`

Added global rule:

```scss
.theme-switching *,
.theme-switching *::before,
.theme-switching *::after {
  transition: none !important;
  animation: none !important;
}
```

Combined with `ThemeService._applyToDOM()` adding `theme-switching` to `<html>` before changing `data-theme` and removing it two rAF frames later, this makes all theme changes visually instant regardless of the number of animated elements on screen.

### 3.8 Icon Catalog Performance

**File:** `apps/erp-web/src/app/dev-tools/story-book/pages/icon/icon-story-book.component.scss`

Added `content-visibility: auto` + `contain: layout style` + `contain-intrinsic-size: auto 8.5rem` to `.icon-catalog__item`. This prevents the hundreds of icon cards from all firing style recalculation on theme change.

### 3.9 Design System Documentation — UPDATED

Both documentation locations updated:

| File | Changes |
|---|---|
| `projects/Accounting-Frontend/docs/design/design-system.md` | `--color-interactive-hover` / `--color-interactive-emphasis` descriptions corrected; `--color-contrast-bg/fg` inversion note added; Runtime Theme Switching section expanded with initialization order, `prefers-color-scheme` fallback, `.theme-switching` class pattern, and no-hardcode rule |
| `docs/frontend/design/design-system.md` | Identical changes mirrored to workspace doc |
| `projects/Accounting-Frontend/docs/design/ui-components.md` | Storybook shell theme toggle added; checkbox dark mode token notes; date-picker dark mode implementation notes |
| `docs/frontend/design/ui-components.md` | Identical changes mirrored to workspace doc |

---

## 4. AoC / DoD Checklist

| Criterion | Status |
|---|---|
| AOC-01: `ThemeService` exists with `setTheme()` and `getTheme()` | ✅ |
| AOC-02: `[data-theme='dark']` on `<html>` is the sole theming mechanism | ✅ |
| AOC-03: All semantic tokens have dark mode overrides | ✅ |
| AOC-04: `APP_INITIALIZER` applies persisted theme before first render | ✅ |
| AOC-05: Unit tests pass for all ThemeService behaviors | ✅ (7 tests passing) |
| AOC-06: Storybook components render without visual breakage in both themes | ✅ (verified + dark mode fixes applied) |
| DOD-01: Implementation complete with no WIP stubs | ✅ |
| DOD-02: All unit tests pass | ✅ |
| DOD-03: No `:host-context([data-theme='dark'])` blocks in component SCSS | ✅ |
| DOD-04: Design system documentation updated (both repo copies) | ✅ |
| DOD-05: MR created and linked to GitLab issue | ✅ |

---

## 5. Scope Additions vs. Plan

The following items were delivered in this task but were not in the original AC-65 scope. They were added because they were directly caused by the AC-65 work and could not be left broken:

| Addition | Reason |
|---|---|
| Storybook shell theme toggle button | Required to validate AOC-06 without DevTools hacks; decision made to ship it as part of AC-65 |
| Date-picker and checkbox dark mode CSS fixes | Storybook smoke verification revealed visual breakage caused by hardcoded values that predated AC-65 |
| Icon catalog `content-visibility: auto` | Theme switch performance fix uncovered while validating the toggle |
| `prefers-color-scheme` fallback in `_initialize()` | AC-66 deferred; added minimal system preference detection to avoid defaulting to light on first dark-mode load |
| `.theme-switching` instant-switch pattern | Performance regression discovered during Storybook smoke test; required to make the toggle usable |

---

## 6. Risk and Rollback

| Risk | Mitigation |
|---|---|
| `ThemeService._applyToDOM()` called in SSR context | `isPlatformBrowser()` guard in place; DOM manipulation is skipped on server |
| `localStorage` unavailable (private mode / quota) | Try/catch with silent fallback to derived theme |
| CSS transition suppression affects interactive animations | `.theme-switching` is removed after 2 rAF frames — only active during the instant theme swap |
| `--color-contrast-bg/fg` consumers seeing unexpected swap | Previously inverted values now correct; any feature code relying on old (wrong) values may need review |

**Rollback:** Revert `features/ac-65-fe-light-dark-theme-engine` branch. The `[data-theme='dark']` block in `_semantic.scss` and `APP_INITIALIZER` registration in `app.config.ts` are the only changes that affect production behavior at rest.

---

## 7. Related Tasks

| Task | Status | Dependency |
|---|---|---|
| AC-64 — Token Audit & Standardization | ✅ Complete | AC-65 built on AC-64 output |
| AC-66 — Persistence & Flicker Prevention | Not started | Blocked on AC-65 completion |
| AC-67–AC-76 — Component tasks | In progress / planned | Can proceed in parallel after AC-64 |
