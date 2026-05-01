---
title: "AC-65 - FE - Light/Dark Theme Engine - Implementation Plan"
jira: AC-65
parent: AC-41
phase: Implementation
created: 2026-05-01
status: approved
target_repo: accounting-frontend
source_branch: features/ac-65-fe-light-dark-theme-engine
target_branch: develop
---

# AC-65 - FE - Light/Dark Theme Engine (Implementation Plan)

Source: https://nexttoptech.atlassian.net/browse/AC-65
Parent: https://nexttoptech.atlassian.net/browse/AC-41

---

## 1. Task Summary

- Jira key: AC-65
- Parent story: AC-41 - Implement Unified Design System, Global Theming, and Core Shared UI Components
- Task summary: FE - Light/Dark Theme Engine
- Stack: Frontend / Styles / Angular Service
- Canonical task spec: [Solution Task Spec](../../../../01.solution/linked/stories/AC-41/tasks/AC-65.md)
- Primary product repository: `projects/Accounting-Frontend`
- Workspace repository artifact path: `docs/work-items/02.implementation/stories/AC-41/tasks/AC-65-implementation-plan.md`
- GitLab execution context:
  - Frontend issue: `accounting-frontend/-/work_items/3`
  - Frontend MR: `accounting-frontend/-/merge_requests/6`
  - Source branch: `features/ac-65-fe-light-dark-theme-engine`
  - Target branch: `develop`
- Dependency posture:
  - AC-64 (Token Audit & Standardization) is **complete** — `_semantic.scss` and the two-layer token contract are in place.
  - AC-65 extends `_semantic.scss` with complete light/dark values and introduces `ThemeService`.
  - AC-66 (Persistence & Flicker Prevention) depends on AC-65 completion.
  - AC-67 through AC-76 (component tasks) may proceed in parallel after AC-64 is approved; they are not blocked by AC-65.

---

## 2. Readiness Checks

| Check | Status | Notes |
|---|---|---|
| Goal Of Task present | Yes | Runtime theme switching with no component-specific theme logic |
| Problem-To-Solve present | Yes | No runtime theme switching; scattered hardcoded theme values |
| AoC present | Yes | AOC-01 through AOC-06 defined in task spec |
| DoD present | Yes | DOD-01 through DOD-05 defined in task spec |
| Test Cases present | Yes | TDD (4 unit + 1 integration) and BDD (2 scenarios) in task spec |
| Fix Version target | `V 0.1 (MVP)` | Confirmed |
| Labels / scope | Frontend, Core | Confirmed |
| Parent story solution approved | Yes | AC-41 solution.md Technical Decision 4 covers theme bridge approach |
| Dependency AC-64 | Complete | `_semantic.scss` exists; token contract approved |
| Jira and GitLab operational traceability | Started | Issue #3, MR !6 created; transitioned to In Progress |
| Task classification | Non-Domain | Frontend styling + Angular service; no domain entities |
| CSP constraint confirmed | Yes | Inline `<script>` in index.html is prohibited; APP_INITIALIZER fallback required |
| TL gate required before coding | **Yes — coding blocked until TL approval of this plan** |

---

## 3. Scope & Assumptions

**In scope:**
- Complete light theme semantic token values at `:root` in `public/styles/tokens/_semantic.scss`.
- Complete dark theme semantic token overrides in `[data-theme='dark']` block.
- `ThemeService` Angular injectable (`apps/erp-web/src/app/core/services/theme.service.ts`).
- `APP_INITIALIZER` registration in `apps/erp-web/src/app/app.config.ts` to apply persisted theme before first render (CSP-safe; no inline script).
- Basic localStorage read on init (reading only; write deferred to AC-66 for full persistence strategy).
- Unit tests: `theme.service.spec.ts` with 6 test cases (T-01 through T-06).
- Storybook smoke verification: confirm all 6 existing shared components render without visual breakage under both themes.
- Design-system.md update (both product and workspace copies) documenting the `[data-theme]` consumption contract.

**Out of scope:**
- Theme persistence write strategy and flicker prevention (AC-66).
- New shared component delivery (AC-67 through AC-76).
- Token value changes to primitive token files (AC-64 is complete; do not touch primitive files).
- Server-side nonce-based inline script for no-flicker (AC-66).
- User-facing theme toggle UI component (consumed by feature teams after AC-65 completes).

**Assumptions:**
- AC-64 has been merged; `public/styles/tokens/_semantic.scss` exists and `_variables.scss` already imports it.
- Angular Material is installed and in use in the project.
- The existing 6 shared components consume only semantic tokens from `_semantic.scss`; switching `[data-theme='dark']` on `<html>` is sufficient to retheme them.
- Angular project uses standalone component architecture and signal-based state.
- `toObservable` from `@angular/core/rxjs-interop` is available (Angular 17+).
- localStorage is used as a basic persistence store; if unavailable (private mode, quota exceeded), the service gracefully falls back to the default theme without throwing.
- Exact Angular Material `--mdc-*` / `--mat-*` variable names must be confirmed at implementation time against the installed Material version in `package.json`.

---

## 4. Repository Routing Matrix

| Artifact | Repository | Exact Path | Action |
|---|---|---|---|
| Semantic token layer — extend light/dark values | accounting-frontend | `public/styles/tokens/_semantic.scss` | UPDATE |
| ThemeService Angular injectable | accounting-frontend | `apps/erp-web/src/app/core/services/theme.service.ts` | NEW |
| ThemeService unit tests | accounting-frontend | `apps/erp-web/src/app/core/services/theme.service.spec.ts` | NEW |
| App providers — APP_INITIALIZER registration | accounting-frontend | `apps/erp-web/src/app/app.config.ts` | UPDATE |
| Design system doc update | accounting-frontend | `docs/design/design-system.md` | UPDATE |
| Storybook smoke targets (verify only) | accounting-frontend | `apps/erp-web/src/app/dev-tools/story-book/pages/{checkbox,icon,tag,date-time-picker}/` | VERIFY |
| Workspace implementation plan | accounting-workspace | `docs/work-items/02.implementation/stories/AC-41/tasks/AC-65-implementation-plan.md` | NEW |
| Workspace design-system mirror update | accounting-workspace | `docs/frontend/design/design-system.md` | UPDATE |

---

## 5. Domain Hierarchy Map

AC-65 touches frontend presentation assets and application-layer services only. No domain or infrastructure layers are affected.

```text
projects/Accounting-Frontend/
  01.Domain/
    no changes for AC-65

  02.Application/
    apps/erp-web/src/app/core/services/
      theme.service.ts              <- new
      theme.service.spec.ts         <- new

  03.Infra/
    no changes for AC-65

  04.Presentation/ (effective frontend presentation surface)
    public/styles/
      tokens/
        _semantic.scss              <- update (complete light/dark values)
    apps/erp-web/src/
      app/
        app.config.ts               <- update (APP_INITIALIZER)
        dev-tools/story-book/
          pages/checkbox/           <- smoke verify
          pages/icon/               <- smoke verify
          pages/tag/                <- smoke verify
          pages/date-time-picker/   <- smoke verify
    docs/design/
      design-system.md              <- update
```

---

## 6. Entity-Centric Folder Naming Map

This task introduces one application-layer service entity (`ThemeService`) and extends one CSS token file.

| Concern | Exact Folder / File Name | Rule |
|---|---|---|
| Theme service entity | `core/services/theme.service.ts` | Named after domain concern (`theme`); singular. Lives in `core/services/` per ERP architecture convention. |
| Theme service tests | `core/services/theme.service.spec.ts` | Co-located with service file; `.spec.ts` suffix is Angular standard. |
| Semantic token extension | `tokens/_semantic.scss` | Same file AC-64 created; extend by completing the `[data-theme='dark']` block. No new file is created. |

---

## 7. Implementation Steps & Dependencies

### Step 1 — Verify AC-64 baseline

- Confirm `public/styles/tokens/_semantic.scss` exists and is imported in `_variables.scss`.
- Confirm the existing 6 shared components build without errors with the current `_semantic.scss`.
- Confirm `[data-theme='dark']` block is present in `_semantic.scss` (even if values are placeholder).
- If any of the above fails, stop and resolve the AC-64 state before proceeding.

### Step 2 — Write unit tests first (TDD-first)

- Create `apps/erp-web/src/app/core/services/theme.service.spec.ts`.
- Write the 6 failing unit tests (T-01 through T-06) as specified in Section 13.
- Run tests; confirm all 6 fail with "ThemeService not found" or similar.
- Do not implement the service yet.

### Step 3 — Implement ThemeService

- Create `apps/erp-web/src/app/core/services/theme.service.ts` following the blueprint in Section 8.2.
- Run tests; confirm all 6 unit tests pass.

### Step 4 — Register ThemeService via APP_INITIALIZER

- Update `apps/erp-web/src/app/app.config.ts` to include the `APP_INITIALIZER` provider from Section 8.3.
- Confirm the app builds and ThemeService is instantiated on load.

### Step 5 — Complete semantic token light/dark values

- Extend `public/styles/tokens/_semantic.scss` with the complete dark theme token values per Section 8.1.
- Ensure every semantic alias defined in `:root` has a corresponding override in `[data-theme='dark']`.
- Verify color contrast ratios meet WCAG AA (minimum 4.5:1 for normal text) in both themes.

### Step 6 — Integration smoke test

- Start the app in development mode.
- Open browser DevTools; call `document.documentElement.dataset.theme = 'dark'` manually.
- Verify all semantic tokens switch to dark values.
- Revert to light; verify all tokens switch back.
- Apply light → dark → light sequence (T-07 integration test scenario).

### Step 7 — Storybook smoke verification

- Open each of the 4 Storybook pages:
  - `checkbox`, `icon`, `tag`, `date-time-picker`
- Manually toggle `[data-theme='dark']` on `<html>` in DevTools.
- Confirm no visual breakage (no hardcoded colors bleeding through, correct contrast, no invisible elements).
- This satisfies AOC-06.

### Step 8 — Update design-system documentation

- Update `docs/design/design-system.md` (product repo copy) and `docs/frontend/design/design-system.md` (workspace copy) to:
  - Document that `[data-theme='dark']` on `<html>` is the sole theming mechanism.
  - Explicitly forbid `:host-context([data-theme='dark'])` overrides inside component SCSS.
  - Add `ThemeService` usage note for feature teams.

### Step 9 — Final build validation

- Run `nx build erp-web` and confirm clean build.
- Run `nx test erp-web` and confirm all tests pass.
- Review the security checklist from Section 10.

---

## 8. Code-Level Implementation Blueprint

### 8.1 `_semantic.scss` — EXTEND (complete light/dark token values)

**File:** `public/styles/tokens/_semantic.scss`

The AC-64 `_semantic.scss` introduced the structural blocks. AC-65 extends the `[data-theme='dark']` block to cover all semantic token categories. Final exact values must be confirmed against the approved design palette; the table below shows the resolution strategy.

**Complete `:root` block (light theme — confirm and finalize from AC-64 output):**

```scss
:root {
  /* ── Surface & Background ─────────────────────────────────────────── */
  --bg-primary:       #ffffff;
  --bg-secondary:     var(--color-neutral-50);
  --bg-tertiary:      var(--color-neutral-100);

  /* ── Foreground (text) ────────────────────────────────────────────── */
  --fg-primary:       var(--color-neutral-900);
  --fg-secondary:     var(--color-neutral-700);
  --fg-tertiary:      var(--color-neutral-500);

  /* ── Border ──────────────────────────────────────────────────────── */
  --border-primary:   var(--color-neutral-200);
  --border-secondary: var(--color-neutral-300);

  /* ── Surface states ──────────────────────────────────────────────── */
  --surface-primary:  #ffffff;
  --surface-secondary:var(--color-neutral-50);
  --surface-hover:    var(--color-neutral-100);
  --surface-active:   var(--color-neutral-200);

  /* ── Interactive state aliases (added AC-78, confirmed AC-64) ─────── */
  --color-accent:               var(--color-primary-500);
  --color-accent-subtle:        var(--color-primary-50);
  --color-interactive-hover:    var(--color-primary-400);
  --color-interactive-hover-border: var(--color-primary-300);
  --color-interactive-border:   var(--color-neutral-300);
  --color-interactive-emphasis: var(--color-primary-600);
  --color-danger-interactive:   var(--color-danger-500);
  --color-neutral-disabled:     var(--color-neutral-300);

  /* ── Status variant aliases ──────────────────────────────────────── */
  --color-primary-bg:   var(--color-primary-50);
  --color-primary-fg:   var(--color-primary-700);
  --color-secondary-bg: var(--color-neutral-100);
  --color-secondary-fg: var(--color-neutral-700);
  --color-success-bg:   var(--color-green-50);
  --color-success-fg:   var(--color-green-700);
  --color-info-bg:      var(--color-blue-50);
  --color-info-fg:      var(--color-blue-700);
  --color-warning-bg:   var(--color-amber-50);
  --color-warning-fg:   var(--color-amber-700);
  --color-danger-bg:    var(--color-red-50);
  --color-danger-fg:    var(--color-red-700);
  --color-contrast-bg:  var(--color-neutral-900);
  --color-contrast-fg:  #ffffff;
}
```

**`[data-theme='dark']` override block (dark theme — NEW in AC-65):**

```scss
[data-theme='dark'] {
  /* ── Surface & Background ─────────────────────────────────────────── */
  --bg-primary:       #0f0f0f;
  --bg-secondary:     #1a1a1a;
  --bg-tertiary:      #262626;

  /* ── Foreground (text) ────────────────────────────────────────────── */
  --fg-primary:       var(--color-neutral-50);
  --fg-secondary:     var(--color-neutral-300);
  --fg-tertiary:      var(--color-neutral-500);

  /* ── Border ──────────────────────────────────────────────────────── */
  --border-primary:   var(--color-neutral-700);
  --border-secondary: var(--color-neutral-600);

  /* ── Surface states ──────────────────────────────────────────────── */
  --surface-primary:  #1e1e1e;
  --surface-secondary:#262626;
  --surface-hover:    #333333;
  --surface-active:   #404040;

  /* ── Interactive state overrides ─────────────────────────────────── */
  --color-accent:               var(--color-primary-400);
  --color-accent-subtle:        rgba(var(--color-primary-400-rgb, 56, 189, 248), 0.15);
  --color-interactive-hover:    var(--color-primary-300);
  --color-interactive-hover-border: var(--color-primary-300);
  --color-interactive-border:   var(--color-neutral-600);
  --color-interactive-emphasis: var(--color-primary-300);
  --color-danger-interactive:   var(--color-danger-400);
  --color-neutral-disabled:     var(--color-neutral-600);

  /* ── Status variant overrides ────────────────────────────────────── */
  --color-primary-bg:   rgba(var(--color-primary-500-rgb, 14, 165, 233), 0.15);
  --color-primary-fg:   var(--color-primary-300);
  --color-secondary-bg: var(--color-neutral-800);
  --color-secondary-fg: var(--color-neutral-300);
  --color-success-bg:   rgba(var(--color-green-500-rgb, 34, 197, 94), 0.15);
  --color-success-fg:   var(--color-green-300);
  --color-info-bg:      rgba(var(--color-blue-500-rgb, 59, 130, 246), 0.15);
  --color-info-fg:      var(--color-blue-300);
  --color-warning-bg:   rgba(var(--color-amber-500-rgb, 245, 158, 11), 0.15);
  --color-warning-fg:   var(--color-amber-300);
  --color-danger-bg:    rgba(var(--color-red-500-rgb, 239, 68, 68), 0.15);
  --color-danger-fg:    var(--color-red-400);
  --color-contrast-bg:  var(--color-neutral-100);
  --color-contrast-fg:  var(--color-neutral-900);
}
```

> **Implementation note:** Exact hex values must be validated against WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text). Use a contrast checker tool during implementation. If the palette does not provide `--color-*-rgb` form variables, replace `rgba()` calls with equivalent dark alpha blends using literal hex values.

---

### 8.2 `ThemeService` — NEW

**File:** `apps/erp-web/src/app/core/services/theme.service.ts`

**Class contract:**

| Member | Type | Description |
|---|---|---|
| `theme$` | `Observable<Theme>` | Emits current theme on every change. Subscribe in components or effects. |
| `setTheme(theme)` | `(theme: Theme) => void` | Applies theme to DOM, persists to localStorage. |
| `getTheme()` | `() => Theme` | Returns current theme string synchronously. |
| `currentTheme` | `Signal<Theme>` | Private signal; source of truth for reactive state. |

**Required behavior:**
- On construction: read localStorage `'app-theme'` key; default to `'light'` if absent or invalid.
- `setTheme('dark')`: sets `document.documentElement.dataset['theme'] = 'dark'`; writes `'dark'` to localStorage.
- `setTheme('light')`: removes `document.documentElement.dataset['theme']`; writes `'light'` to localStorage.
- `getTheme()`: returns the current signal value.
- `theme$`: derived from `toObservable(currentTheme)`.
- All localStorage operations must be wrapped in `try/catch`; failures must be silently caught (no thrown errors).
- No imports from feature libraries; no domain service calls; no HTTP calls.

**Blueprint (not source code — shows interface only):**

```typescript
export type Theme = 'light' | 'dark';
const THEME_STORAGE_KEY = 'app-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>('light');
  readonly theme$: Observable<Theme> = toObservable(this._theme);

  constructor() { /* call _initialize() */ }

  setTheme(theme: Theme): void { /* update signal, apply DOM, persist */ }
  getTheme(): Theme { /* return this._theme() */ }

  private _initialize(): void { /* read persisted, apply, set signal */ }
  private _applyToDOM(theme: Theme): void { /* set/delete dataset['theme'] */ }
  private _persist(theme: Theme): void { /* localStorage.setItem with try/catch */ }
  private _readPersisted(): Theme | null { /* localStorage.getItem with try/catch */ }
}
```

**File location rule:** `core/services/` is the correct location per ERP architecture (`core/` is app-wide infrastructure). Do not place `ThemeService` in a feature folder or `shared/`.

---

### 8.3 `app.config.ts` — UPDATE (APP_INITIALIZER)

**File:** `apps/erp-web/src/app/app.config.ts`

Add one entry to the `providers` array:

```typescript
{
  provide: APP_INITIALIZER,
  useFactory: (themeService: ThemeService) => () => {
    // ThemeService constructor applies persisted theme on instantiation.
    // This token ensures ThemeService is created before the first render.
  },
  deps: [ThemeService],
  multi: true,
}
```

**Why APP_INITIALIZER:** Angular's dependency injection would normally instantiate `ThemeService` lazily on first injection. By adding it to `APP_INITIALIZER`, the service is forced to construct — and therefore apply the persisted theme to the DOM — before Angular renders any component. This is the CSP-safe equivalent of the inline-script approach.

**No other changes** to `app.config.ts`.

---

## 9. Data Model / Migration Impact

None. AC-65 introduces no backend or database changes. localStorage is used as ephemeral client-side state; no schema or migration is involved.

---

## 10. Security / Privacy Controls & Abuse-Case Checks

| Concern | Analysis | Verdict |
|---|---|---|
| XSS via theme value | `setTheme()` accepts only `'light' \| 'dark'` (TypeScript union). Any other value is rejected at compile time. DOM write is `dataset['theme'] = 'dark'` — attribute value, not innerHTML. No XSS vector. | Safe |
| localStorage injection | The value read from localStorage is validated: only `'light'` or `'dark'` are accepted; any other value is treated as absent. No eval or DOM interpolation of stored value. | Safe |
| Inline script (CSP) | `APP_INITIALIZER` approach is used; no `<script>` injection in `index.html`. Fully CSP-safe. | Safe |
| CSS injection via theme attribute | `[data-theme='dark']` is a data attribute; value is only used as a CSS attribute selector. No CSS injection vector. | Safe |
| Sensitive data in localStorage | Only `'light'` or `'dark'` strings stored. No PII or sensitive information. | Safe |
| Security score per gate model | No findings. Score: 0 (no negative). | Pass |

---

## 11. Observability Requirements

| Level | Requirement |
|---|---|
| Debug logging | Log theme transitions: `console.debug('[ThemeService] Theme applied: light → dark')`. Only in development/non-production environments (check `!environment.production`). |
| Warning logging | Log localStorage unavailability: `console.warn('[ThemeService] localStorage unavailable; theme will not persist.')`. Applies in both environments. |
| Error logging | No expected errors; service is designed to fail-silent on storage access. |
| Metrics / traces | Not applicable for a client-side style service. |
| Method boundary logging | `setTheme()` and `_initialize()` must emit debug logs when `!environment.production`. |

---

## 12. GlobalResponseKey Model / Response Key Catalog

**Not applicable for AC-65.**

`ThemeService` is a pure client-side Angular service with no HTTP calls, no API responses, and no user-facing error messages routed through the global response key model. The `GlobalResponseKey` pattern applies to API-boundary responses and is not required here.

If a future enhancement exposes theme preferences via a user-profile API endpoint, the relevant feature task must define response keys at that time.

---

## 13. TDD Plan (Test-First Execution Order)

All tests must be written **before** `ThemeService` is implemented (TDD-first; Step 2 precedes Step 3 in Section 7).

**File:** `apps/erp-web/src/app/core/services/theme.service.spec.ts`

**Test setup:**
```
beforeEach: TestBed.configureTestingModule({})
           + inject ThemeService
           + reset: delete document.documentElement.dataset['theme']
           + reset: localStorage.removeItem('app-theme')
```

| Test ID | Description | Condition | Expected Outcome | Maps To |
|---|---|---|---|---|
| T-01 | Default theme on construction (no persisted value) | localStorage is empty; service is freshly created | `getTheme()` returns `'light'`; no `[data-theme]` attribute on `<html>` | AOC-01, DOD-02 |
| T-02 | `setTheme('dark')` updates DOM attribute | Call `setTheme('dark')` | `document.documentElement.dataset['theme']` equals `'dark'` | AOC-02, AOC-04 |
| T-03 | `setTheme('light')` removes DOM attribute | Start in dark; call `setTheme('light')` | `document.documentElement.dataset['theme']` is `undefined` or absent | AOC-04 |
| T-04 | `theme$` emits value on `setTheme` call | Subscribe to `theme$`; call `setTheme('dark')` | Observable emits `'dark'`; then `setTheme('light')` emits `'light'` | AOC-03, DOD-02 |
| T-05 | `getTheme()` reflects current state | Call `setTheme('dark')`; call `getTheme()` | Returns `'dark'` | AOC-03 |
| T-06 | Multiple rapid theme switches | Call `setTheme` 5 times alternating light/dark | Final DOM state matches last `setTheme` call; `theme$` emits each transition | DOD-02 |

**Integration test (manual / E2E scope — not unit test):**

| Test ID | Description | Steps | Expected Outcome | Maps To |
|---|---|---|---|---|
| T-07 | CSS variable resolution changes on theme switch | Inject service; call `setTheme('dark')`; read `getComputedStyle(document.documentElement).getPropertyValue('--bg-primary')` | Value differs between light and dark; dark value is not `#ffffff` | AOC-02, DOD-01 |

---

## 14. BDD Scenarios

### S-01: Full-app theme switch

```
Given the app is rendered in light mode (default)
  And all shared components are visible (checkbox, icon, tag, date-picker)
When ThemeService.setTheme('dark') is called
Then [data-theme="dark"] is set on the <html> element
  And all semantic CSS variables resolve to dark palette values
  And all shared components render without visual breakage
  And Angular Material surfaces (date-picker calendar, checkboxes) reflect the dark palette
```

**Evidence:** Storybook smoke test in DevTools with `[data-theme="dark"]` applied manually. Screenshots or visual comparison logs attached to MR.

---

### S-02: Angular Material component dark theme correctness

```
Given the app is in dark mode (ThemeService.setTheme('dark') called)
  And at least one Angular Material component is rendered (e.g. mat-form-field, mat-checkbox)
When the component is inspected in browser DevTools
Then --mdc-outlined-text-field-outline-color resolves to the dark border-primary value
  And --mdc-checkbox-selected-container-color resolves to the dark color-accent value
  And component backgrounds do not show #ffffff (light surface bleed)
```

**Evidence:** DevTools computed styles screenshot showing `--mdc-*` variables with dark values attached to MR review.

---

### S-03: Initial load applies persisted theme without flicker (basic — AC-66 scope)

```
Given a user previously selected dark theme (localStorage['app-theme'] = 'dark')
When the Angular app bootstraps
Then APP_INITIALIZER applies dark theme before first component renders
  And no white-background flash is visible to the user
  And ThemeService.getTheme() returns 'dark' immediately after bootstrap
```

**Evidence:** Manual test — reload app in dark mode; observe no white flash. Acceptable single-frame flash is documented as known limitation until AC-66 nonce/server-side solution is applied.

---

## 15. Rollout, Rollback & Feature-Flag Strategy

**Rollout:**
- AC-65 ships as a squash-merged MR to `develop`.
- No feature flag required — the theme engine is infrastructure, not a user-visible feature in isolation.
- The `[data-theme]` attribute defaults to absent (light theme); existing app experience is unchanged until the user or a future component calls `setTheme('dark')`.

**Rollback:**
- If a critical regression is found after merge, revert the MR on `develop`.
- Reverting removes `ThemeService`, the Material bridge, and the extended `_semantic.scss` block.
- Dependent tasks (AC-66, AC-67+) are on separate feature branches; revert does not affect them.

**Feature flag:**
- Not applicable. Theme engine is a foundational infrastructure concern; it does not expose new UI to end users by itself.

---

## 16. Approval Gate

### TL Approval Checklist

> **Hard gate: no coding starts until TL provides explicit approval below.**

```
[ ] Implementation plan is production-ready and specific enough for coding
[ ] All AoC items (AOC-01 through AOC-06) are verifiable
[ ] All DoD items (DOD-01 through DOD-05) are verifiable
[ ] TDD test cases (T-01 through T-06) cover all critical paths
[ ] BDD scenarios (S-01 through S-03) align with expected user outcomes
[ ] Repository routing matrix is correct (accounting-frontend confirmed)
[ ] ThemeService location (core/services/) is correct per ERP architecture
[ ] CSP-safe APP_INITIALIZER approach is acceptable (single-frame flash acknowledged for AC-66)
[ ] Security review passed (no XSS, no localStorage injection, CSP-safe)
[ ] Dependency on AC-64 completion verified
[ ] WCAG contrast review for dark theme values is required at implementation time
[ ] Dark theme values in Section 8.1 are acceptable starting points (or require design review first)
```

**TL Decision:**
- `[ ]` Approved — proceed with `/speckit.implement AC-65 FRONT`
- `[ ]` Needs Revision — see comments
- `[ ]` Blocked — document blocking issue

---

*Plan authored by GitHub Copilot — 2026-05-01. All sections are execution-ready pending TL approval.*
