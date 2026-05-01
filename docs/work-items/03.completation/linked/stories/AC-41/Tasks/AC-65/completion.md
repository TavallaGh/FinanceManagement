# AC-65 — Task Completion

## Summary

- **Task:** AC-65
- **Related Story:** AC-41 — Implement Unified Design System, Global Theming, and Core Shared UI Components
- **Title:** FE - Light/Dark Theme Engine
- **Scope:** FRONT (`accounting-frontend`)
- **Status:** Completed — ready for review
- **Completed:** 2026-05-01

---

## Description

Implemented the runtime light/dark theme engine for the frontend design system. Completed the two-layer CSS token contract by supplying full dark-mode overrides in `[data-theme='dark']` on `<html>`. Built `ThemeService` — an Angular injectable that reads the persisted preference from `localStorage`, falls back to `prefers-color-scheme`, applies the theme to the DOM before first render via `APP_INITIALIZER`, and exposes a reactive `theme$` observable. Added a `.theme-switching` suppression pattern to make all theme transitions visually instant. Verified all 6 existing shared components in Storybook under both themes; fixed dark-mode breakage in `date-picker` and `checkbox` components. Shipped a sun/moon toggle in the Storybook shell for ongoing manual verification.

---

## Acceptance Criteria

- **AOC-01:** `:root` defines all semantic token values for the light theme.
  - ✅ All semantic alias categories (bg, fg, border, surface, interactive-state, status-variant, spacing, elevation, z-index) present under `:root` in `public/styles/tokens/_semantic.scss`.

- **AOC-02:** `[data-theme='dark']` on the `<html>` element overrides all semantic tokens for the dark theme; switching the attribute changes all resolved values immediately.
  - ✅ Full `[data-theme='dark']` block completed in `_semantic.scss`. `.theme-switching` pattern suppresses CSS transitions during swap — all changes are visually instant.

- **AOC-03:** `ThemeService` is an Angular injectable that exposes `setTheme(theme)`, `getTheme()`, and a `theme$` Observable.
  - ✅ `theme.service.ts` implemented with `setTheme()`, `getTheme()`, `theme$` observable, and a `theme` signal for reactive consumers.

- **AOC-04:** Calling `ThemeService.setTheme('dark')` sets `document.documentElement.dataset['theme']` to `'dark'`; `setTheme('light')` removes or resets it.
  - ✅ `_applyToDOM()` sets/removes `data-theme` on `document.documentElement`. Confirmed by unit test T-06.

- **AOC-05:** Angular Material components respond correctly to the theme switch — `--mdc-*` and `--mat-*` variables are overridden by semantic token mappings.
  - ✅ Material variable bridge in `_semantic.scss`. No Angular Material component shows raw unthemed values in Storybook smoke test.

- **AOC-06:** All 6 existing shared components render without visual breakage in both light and dark themes in Storybook.
  - ✅ All 6 components verified. Dark-mode CSS regressions in `date-picker` and `checkbox` discovered and fixed as part of this task.

---

## Implementation Notes

### Files Changed

| File | Repository | Change |
|---|---|---|
| `apps/erp-web/src/app/core/services/theme.service.ts` | accounting-frontend | **NEW** — Angular `ThemeService`; `setTheme()`, `getTheme()`, `theme$`, `theme` signal, `_initialize()`, `_applyToDOM()`, `APP_INITIALIZER` factory |
| `apps/erp-web/src/app/core/services/theme.service.spec.ts` | accounting-frontend | **NEW** — 7 unit tests (T-01 through T-07) covering defaults, localStorage read, `setTheme()` state/DOM/storage, and `prefers-color-scheme` fallback |
| `apps/erp-web/src/app/app.config.ts` | accounting-frontend | **UPDATED** — `ThemeService` registered in `APP_INITIALIZER` provider chain |
| `public/styles/tokens/_semantic.scss` | accounting-frontend | **EXTENDED** — Complete `[data-theme='dark']` overrides for all alias categories; `--color-contrast-bg/fg` inversion corrected |
| `apps/erp-web/src/styles.scss` | accounting-frontend | **UPDATED** — `.theme-switching *` rule added to suppress transitions during theme swap |
| `apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.ts` | accounting-frontend | **NEW** — Storybook shell component with sun/moon theme toggle button |
| `apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.html` | accounting-frontend | **NEW** — Template with toggle button and `[attr.data-theme-active]` binding |
| `apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.scss` | accounting-frontend | **NEW** — Semantic token–based styles for Storybook shell header |
| `apps/erp-web/src/app/dev-tools/story-book/pages/date-picker/date-picker.component.ts` | accounting-frontend | **UPDATED** — `_applyLabelState()` inline colors changed from hardcoded `#ffffff` to `var(--surface-primary)` / `var(--fg-primary)` / `var(--fg-secondary)` |
| `apps/erp-web/src/app/dev-tools/story-book/pages/date-picker/date-picker.component.scss` | accounting-frontend | **UPDATED** — Calendar popup bg, selected date text, hover border changed from hardcoded values to semantic tokens |
| `apps/erp-web/src/app/dev-tools/story-book/pages/checkbox/checkbox.component.scss` | accounting-frontend | **UPDATED** — Checkmark stroke, error fill, disabled bg blend base changed from `--bg-primary` literals to `--fg-white` / `var(--surface-primary)` |
| `apps/erp-web/src/app/dev-tools/story-book/pages/icon/icon-story-book.component.scss` | accounting-frontend | **UPDATED** — `content-visibility: auto` + `contain-intrinsic-size` added to prevent icon catalog style recalculation on theme change |
| `projects/Accounting-Frontend/docs/design/design-system.md` | accounting-frontend | **UPDATED** — Runtime Theme Switching section expanded; `--color-contrast-bg/fg` inversion note; `.theme-switching` pattern documented |
| `docs/frontend/design/design-system.md` | accounting-workspace | **UPDATED** — Mirror of product design-system.md update |
| `projects/Accounting-Frontend/docs/design/ui-components.md` | accounting-frontend | **UPDATED** — Storybook shell toggle, checkbox dark mode notes, date-picker dark mode implementation notes |
| `docs/frontend/design/ui-components.md` | accounting-workspace | **UPDATED** — Mirror of product ui-components.md update |
| `docs/work-items/02.implementation/stories/AC-41/tasks/AC-65-implementation-plan.md` | accounting-workspace | **NEW** — Implementation plan artifact |
| `docs/work-items/02.implementation/stories/AC-41/tasks/AC-65-taskclose.md` | accounting-workspace | **NEW** — Task close artifact |

### Key Design Decisions

1. **Signal-first reactive state:** `ThemeService` uses an Angular `signal<Theme>` internally. `theme$` is derived via `toObservable()` for RxJS consumers. This avoids BehaviorSubject boilerplate and aligns with the project's Angular 17+ reactive patterns.

2. **`APP_INITIALIZER` over inline script:** The implementation plan required CSP compliance. The persisted/system-preference theme is applied in `_initialize()` called by `APP_INITIALIZER` — no inline `<script>` in `index.html`. Eliminates FOUC without violating CSP.

3. **`.theme-switching` suppression pattern:** Adding `transition: none !important` to all children under `.theme-switching` (applied for two animation frames around the `data-theme` switch) prevents any accumulated CSS transitions from making the theme change feel sluggish regardless of page complexity.

4. **`--color-contrast-bg/fg` inversion fix:** These tokens were previously swapped — `--color-contrast-bg` resolved to the foreground color and vice versa — causing black-on-black text in dark mode. Corrected in the `[data-theme='dark']` block during this task.

5. **Scope additions justified:** Storybook toggle, date-picker/checkbox dark mode fixes, and icon catalog performance fix were all directly uncovered by the AC-65 AOC-06 smoke verification. They were not deferred to keep the codebase in a functional state.

---

## Tests

- **Unit tests:** 7 tests in `theme.service.spec.ts` (T-01 through T-07) — all passing.
  - T-01: Defaults to light theme when no `localStorage` value
  - T-02: Reads persisted theme from `localStorage` on init
  - T-03: `setTheme('dark')` updates signal to dark
  - T-04: `setTheme('light')` updates signal to light
  - T-05: `setTheme()` writes to `localStorage`
  - T-06: `setTheme()` sets `data-theme` attribute on `<html>`
  - T-07: Reads `prefers-color-scheme: dark` when no `localStorage` value
- **Storybook smoke:** All 6 shared components verified in both light and dark themes at `localhost:4200/story-book/`.
- **Build validation:** No Sass compilation errors. Full `nx build erp-web` run deferred to CI.

Manual verification steps:
1. Open app in browser — confirm correct theme loads without flash (persisted or system preference).
2. Click the sun/moon toggle in the Storybook shell header — confirm all components switch theme instantly with no visible transition delay.
3. Reload page after switching to dark — confirm dark theme persists from `localStorage`.
4. Open DevTools → toggle `prefers-color-scheme` to `dark` (no `localStorage`) — confirm app defaults to dark.

---

## Traceability

- Jira: https://nexttoptech.atlassian.net/browse/AC-65
- Parent Story: https://nexttoptech.atlassian.net/browse/AC-41
- GitLab Issue (frontend): https://gitlab.com/next-top-tech/accounting/accounting-frontend/-/work_items/3
- Workspace MR: https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/24
- Project MR: https://gitlab.com/next-top-tech/accounting/accounting-frontend/-/merge_requests/6

## Source Files

- `apps/erp-web/src/app/core/services/theme.service.ts`
- `apps/erp-web/src/app/core/services/theme.service.spec.ts`
- `apps/erp-web/src/app/app.config.ts`
- `public/styles/tokens/_semantic.scss`
- `apps/erp-web/src/styles.scss`
- `apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.ts`
- `apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.html`
- `apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.scss`
- `apps/erp-web/src/app/dev-tools/story-book/pages/date-picker/date-picker.component.ts`
- `apps/erp-web/src/app/dev-tools/story-book/pages/date-picker/date-picker.component.scss`
- `apps/erp-web/src/app/dev-tools/story-book/pages/checkbox/checkbox.component.scss`
- `apps/erp-web/src/app/dev-tools/story-book/pages/icon/icon-story-book.component.scss`
- `docs/frontend/design/design-system.md`
- `docs/frontend/design/ui-components.md`
- `docs/work-items/02.implementation/stories/AC-41/tasks/AC-65-implementation-plan.md`
- `docs/work-items/02.implementation/stories/AC-41/tasks/AC-65-taskclose.md`

## Sign-off

- Developer:
- Reviewer:
