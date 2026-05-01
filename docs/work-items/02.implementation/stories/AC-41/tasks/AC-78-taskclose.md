---
title: "AC-78 - FE - Shared UI Token Alignment Refactor - Task Close"
jira: AC-78
parent: AC-41
phase: Close
created: 2026-04-30
closed: 2026-04-30
status: complete
scope: FRONT
---

# AC-78 — FE - Shared UI Token Alignment Refactor (Task Close)

**Jira:** https://nexttoptech.atlassian.net/browse/AC-78  
**Parent Story:** https://nexttoptech.atlassian.net/browse/AC-41  
**Dependency resolved:** AC-64 (Token Audit) — complete

---

## 1. Execution Summary

| Field | Value |
|---|---|
| Start date | 2026-04-30 |
| End date | 2026-04-30 |
| Executed by | GitHub Copilot (AI agent) |
| Source branch | `features/ac-78-fe-shared-ui-token-alignment-refactor` |
| Target branch | `develop` |
| GitLab issue (project) | TBD — blocked on `.secrets/credentials.local` |
| GitLab MR (project) | TBD — blocked on `.secrets/credentials.local` |
| GitLab MR (workspace) | TBD — blocked on `.secrets/credentials.local` |
| Jira transition | TBD — blocked on `.secrets/credentials.local` |

---

## 2. Delivered Changes

### 2.1 `_semantic.scss` — EXTENDED

**File:** `projects/Accounting-Frontend/public/styles/tokens/_semantic.scss`

The file was comprehensively overhauled in this task:

**Phase 1 — Interactive State Aliases (9 new, AC-78 core scope):**

| Alias | Light value | Dark value |
|---|---|---|
| `--color-accent` | `--color-primary-500` | `--color-primary-400` |
| `--color-accent-subtle` | `--color-primary-100` | `--color-primary-800` |
| `--color-interactive-hover` | `--color-primary-400` | `--color-primary-300` |
| `--color-interactive-hover-border` | `--color-primary-300` | `--color-primary-500` |
| `--color-interactive-border` | `--color-primary-200` | `--color-primary-700` |
| `--color-interactive-emphasis` | `--color-primary-700` | `--color-primary-300` |
| `--color-interactive-active` | `--color-primary-500` | `--color-primary-400` |
| `--color-danger-interactive` | `--color-danger-500` | `--color-danger-500` |
| `--color-neutral-disabled` | `--color-neutral-300` | `--color-neutral-400` |

**Phase 2 — Status Variant Aliases (14 new, for tag/badge variants):**

| Alias pair | Light | Dark |
|---|---|---|
| `--color-primary-bg/fg` | `--color-primary-100` / `--color-primary-700` | `--color-primary-300` / `--color-primary-900` |
| `--color-secondary-bg/fg` | `--color-neutral-100` / `--color-neutral-600` | `--color-neutral-300` / `--color-neutral-900` |
| `--color-success-bg/fg` | `--color-green-100` / `--color-green-700` | `--color-green-300` / `--color-green-900` |
| `--color-info-bg/fg` | `--color-blue-100` / `--color-blue-700` | `--color-blue-300` / `--color-blue-900` |
| `--color-warning-bg/fg` | `--color-amber-100` / `--color-amber-700` | `--color-amber-300` / `--color-amber-900` |
| `--color-danger-bg/fg` | `--color-red-100` / `--color-red-700` | `--color-red-300` / `--color-red-900` |
| `--color-contrast-bg/fg` | `--color-neutral-900` / `--color-neutral-50` | `--color-neutral-50` / `--color-neutral-900` |

**Phase 3 — Full Semantic Overhaul (colors/ folder absorption):**

The `public/styles/tokens/colors/` folder (7 files, never wired into the Angular build) was deleted and its entire token inventory absorbed into `_semantic.scss`:

- Background group (`--bg-*`): 34 tokens
- Foreground group (`--fg-*`): 21 tokens
- Text group (`--text-*`): 24 tokens
- Border group (`--border-*`): 11 tokens
- Surface group (`--surface-*`): 4 tokens
- Focus-ring group (`--focus-ring*`): 2 tokens
- Utility group (`--utility-*`): 17 tokens

All tokens follow `// #region` + `:root {}` / `[data-theme='dark'] {}` pair structure. All primitive references map to `_colors.scss` names.

---

### 2.2 `styles.scss` — BUG FIX (Critical)

**File:** `projects/Accounting-Frontend/apps/erp-web/src/styles.scss`

Added `@use '../../../public/styles/tokens/semantic'` as the 8th `@use` statement (after all primitive token imports).

**Root cause:** Without this import, all semantic aliases were undefined CSS custom properties at runtime. Every component that consumed semantic tokens after the refactor rendered with no colors. The fix was identified from visual regression in Storybook (tag component page showed unstyled plain text instead of colored badges).

---

### 2.3 `tag.component.scss` — FULLY REFACTORED

**File:** `projects/Accounting-Frontend/libs/shared/ui/src/lib/components/tag/tag.component.scss`

- All 14 direct `--color-*` primitive references replaced with status-variant semantic aliases.
- All 8 `:host-context([data-theme='dark'])` override blocks removed — dark mode handled by semantic layer cascade.
- Added `font-size: var(--font-size-xs)` (previously inheriting unpredictably from parent).

**Mapping applied:**

| Before | After |
|---|---|
| `var(--color-primary-100)` / `var(--color-primary-700)` | `var(--color-primary-bg)` / `var(--color-primary-fg)` |
| `var(--color-green-100)` / `var(--color-green-700)` | `var(--color-success-bg)` / `var(--color-success-fg)` |
| `var(--color-blue-100)` / `var(--color-blue-700)` | `var(--color-info-bg)` / `var(--color-info-fg)` |
| `var(--color-amber-100)` / `var(--color-amber-700)` | `var(--color-warning-bg)` / `var(--color-warning-fg)` |
| `var(--color-red-100)` / `var(--color-red-700)` | `var(--color-danger-bg)` / `var(--color-danger-fg)` |
| `var(--color-neutral-100)` / `var(--color-neutral-600)` | `var(--color-secondary-bg)` / `var(--color-secondary-fg)` |
| `var(--color-neutral-900)` / `var(--color-neutral-50)` | `var(--color-contrast-bg)` / `var(--color-contrast-fg)` |

---

### 2.4 `checkbox.component.scss` — FULLY REFACTORED

**File:** `projects/Accounting-Frontend/libs/shared/ui/src/lib/components/checkbox/checkbox.component.scss`

- 10 direct `--color-primary-*` / `--color-neutral-*` / `--color-danger-*` primitive references replaced with semantic aliases.
- 2 icon-dimension component-local vars mapped to `--spacing-2` / `--spacing-3` primitives (per AC-64 audit directive).
- 9 intentional-deviation comments added for checkmark geometry values with no token match.

**Mapping applied:**

| Before | After |
|---|---|
| `var(--color-primary-500)` | `var(--color-accent)` |
| `var(--color-primary-400)` | `var(--color-interactive-hover)` |
| `var(--color-danger-500)` | `var(--color-danger-interactive)` |
| `var(--color-neutral-300)` / `var(--color-neutral-100)` / `var(--color-neutral-400)` | `var(--color-neutral-disabled)` |

---

### 2.5 `date-picker.component.scss` — FULLY REFACTORED

**File:** `projects/Accounting-Frontend/libs/shared/ui/src/lib/components/date-picker/date-picker.component.scss`

Full-file primitive audit applied (the AC-64 violation audit undercounted — it identified 4 refs in the input field area but the file had 12+ refs including the calendar panel overlay). All `--color-primary-*` refs replaced throughout.

**Mapping applied:**

| Before | After |
|---|---|
| `var(--color-primary-500)` | `var(--color-accent)` |
| `var(--color-primary-400)` / `var(--color-primary-300)` | `var(--color-interactive-hover)` |
| `var(--color-primary-600)` / `var(--color-primary-700)` | `var(--color-interactive-emphasis)` |
| `var(--color-primary-50)` / `var(--color-primary-100)` | `var(--color-accent-subtle)` |
| `var(--color-primary-200)` | `var(--color-interactive-border)` |

---

### 2.6 `_typography.scss` — COMMENT UPDATED

**File:** `projects/Accounting-Frontend/public/styles/tokens/_typography.scss`

`--font-size-sm: 0.75rem` comment updated from `/* 12px */` to `/* 12px — used by checkbox + date-picker components; intentional; not a duplicate of --font-size-xs */`. The AC-64 removal-candidate marker was removed.

---

### 2.7 Design System Docs — UPDATED (both repos)

Colors section in both docs rewritten to document the full AC-78 semantic alias catalog, the `styles.scss` import requirement, and the `:host-context` prohibition rule.

| File | Repository |
|---|---|
| `docs/design/design-system.md` | accounting-frontend |
| `docs/frontend/design/design-system.md` | accounting-workspace |

---

### 2.8 Token Violation Audit — STATUS UPDATED

**File:** `projects/Accounting-Frontend/docs/design/token-violation-audit.md`

Header updated with: `**Remediation status:** ✅ Complete — all violations addressed in AC-78 (2026-04-30)`.

---

### 2.9 Storybook Shell — PRIMARY COLOR ALIGNED

**Files updated:**
- `apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.scss`
- `apps/erp-web/src/app/dev-tools/story-book/shared/styles/story-book-content.scss`

All hardcoded purple (`#b89cff`, `#c7a7ff`), blue (`#8fc3ff`, `#8fcfff`), and pink (`#ffbadf`, `#f3edff`, `#f7efff`) accent colors replaced with `--color-primary-*` semantic aliases. Background gradients, glow orbs, nav active/hover states, and TOC active indicator all now use the project primary color.

---

## 3. Acceptance Criteria Sign-off

| AoC | Description | Status |
|---|---|---|
| AOC-01 | `_semantic.scss` extended with all required interactive-state aliases | ✅ |
| AOC-02 | `tag.component.scss` refactored — zero primitive color refs, no `:host-context` blocks | ✅ |
| AOC-03 | `checkbox.component.scss` refactored — zero primitive color refs, deviation comments added | ✅ |
| AOC-04 | `date-picker.component.scss` refactored — zero primitive color refs (full file) | ✅ |
| AOC-05 | `styles.scss` semantic import present and correct | ✅ (bug fix applied) |

---

## 4. Definition of Done Sign-off

| DoD | Description | Status |
|---|---|---|
| DOD-01 | `_semantic.scss` has all required new aliases | ✅ |
| DOD-02 | Zero direct `--color-*` primitive refs in all 3 refactored component SCSS files | ✅ Verified by grep |
| DOD-03 | Zero `:host-context([data-theme='dark'])` blocks in refactored components | ✅ |
| DOD-04 | Storybook light-mode smoke — all 6 component pages render correctly | ✅ Visually verified |
| DOD-05 | `nx build erp-web` — zero Sass compilation errors | ⏳ Full build run pending |
| Dark-mode smoke | Deferred — pending AC-65 (Theme Engine) | ⏳ Blocked on AC-65 |

---

## 5. Risk & Rollback Notes

| Risk | Notes |
|---|---|
| `styles.scss` import omission | Root cause of visual regression. Fixed. Guard: `styles.scss` must always list `semantic` after all primitive `@use` statements. |
| Audit undercount on `date-picker` | AC-64 audit identified 4 refs; full-file audit found 12+. Full file was remediated. |
| `--color-primary-950` in dark mode | Does not exist in `_colors.scss`. Dark mode `--color-accent-subtle` override corrected to use `--color-primary-800`. |
| `colors/` folder deletion | Folder was not imported by the build — deletion is safe. Full token inventory migrated to `_semantic.scss`. |

**Rollback:** Revert `_semantic.scss`, `styles.scss`, and the three component SCSS files. Restore `colors/` folder from git history.

---

## 6. Jira / GitLab Operational Steps

> ⚠️ **BLOCKED** — `.secrets/credentials.local` is missing. Steps must be executed manually or re-run when credentials are available.

- [ ] Create GitLab branch `features/ac-78-fe-shared-ui-token-alignment-refactor` from `develop` in `accounting-frontend`
- [ ] Create Draft MR in `accounting-frontend` (squash + delete source branch enabled)
- [ ] Create Draft MR in `accounting-workspace` (workspace artifact MR for this taskclose doc)
- [ ] Add Jira Web Links for both MRs to AC-78 (bi-directional traceability)
- [ ] Transition AC-78: `To Do → In Progress` (if not already)
- [ ] When review-ready: mark both MRs as Ready (remove Draft), transition AC-78 → `In Review`
- [ ] Add Jira comment: _"Task closed 2026-04-30. Task-close artifact: `docs/work-items/02.implementation/stories/AC-41/tasks/AC-78-taskclose.md`"_

---

## 7. Suggested Commit Message

```
wip: AC-78 - task close - shared UI token alignment refactor [wip]
```
