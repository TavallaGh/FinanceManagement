# Token Violation Audit — AC-64

**Generated:** 2026-05-13
**Task:** AC-64 - FE - Token Audit & Standardization
**Jira:** https://nexttoptech.atlassian.net/browse/AC-64
**Scope:** Read-only audit of six existing shared components. No refactoring here.
**Remediation target:** AC-78 - FE - Shared UI Token Alignment Refactor
**Remediation status:** ✅ Complete — all violations addressed in AC-78 (2026-04-30)
**Last Updated:** 2026-05-13

---

## 1. Summary Table

| Component | Hardcoded Values | Direct Primitive References | Semantic-in-Primitive (auto-resolved by AC-64) | AC-78 Required |
|---|---|---|---|---|
| `checkbox` | Yes | Yes | Yes (auto-resolved) | Yes |
| `checkbox-group` | No | No | Yes (auto-resolved) | No |
| `date-picker` | No | Yes | Yes (auto-resolved) | Yes |
| `icon` | No | No | No | No |
| `tag` | No | Yes (all variant colors) | No | Yes |
| `tag-group` | No | No | Yes (auto-resolved) | No |

**Auto-resolved by AC-64:** semantic aliases that previously lived inside primitive token files
(`_colors.scss` and `_spacing.scss`) are now correctly sourced from `_semantic.scss`. Components
that consumed `--gap-sm`, `--fg-primary`, `--border-secondary`, `--surface-primary`, etc. do NOT
need code changes — their `var()` references now resolve through the semantic layer without
modification.

---

## 2. Hardcoded Value Findings

### `checkbox` — `libs/shared/ui/src/lib/components/checkbox/checkbox.component.scss`

| Location | Hardcoded Value | Nearest Token Candidate | AC-78 Action |
|---|---|---|---|
| `--size-sm` variant: `--ui-checkbox-label-size` | `0.6875rem` | No exact match in scale; closest is `--font-size-xs` (0.75rem). Acceptable as component-local internal variable — document as intentional deviation. | Document intent; do not force a mismatch |
| `--size-sm` variant: `--ui-checkbox-icon-inline-size` | `0.5rem` | `--spacing-2` (0.5rem) — but this is an icon dimension, not layout spacing. | Map to component-local token referencing primitive |
| `--size-sm` variant: `--ui-checkbox-icon-block-size` | `0.3125rem` | No match in scale; intentional icon geometry. | Document as intentional deviation |
| `--size-lg` variant: `--ui-checkbox-icon-inline-size` | `0.75rem` | `--spacing-3` (0.75rem) | Map to component-local token referencing primitive |
| `--size-lg` variant: `--ui-checkbox-icon-block-size` | `0.4375rem` | No match; intentional icon geometry. | Document as intentional deviation |
| `--size-lg` variant: `--ui-checkbox-icon-stroke` | `0.15625rem` | No match; intentional stroke geometry. | Document as intentional deviation |

---

## 3. Direct Primitive Token References

### `checkbox` — `libs/shared/ui/src/lib/components/checkbox/checkbox.component.scss`

| Reference | Line context | Finding |
|---|---|---|
| `var(--color-primary-500, #0ea5e9)` | `box-shadow` ring in `__box` | Direct primitive for focus ring and checked state background |
| `var(--color-primary-500, #0ea5e9)` | `focus-visible` border | Direct primitive |
| `var(--color-primary-400, #38bdf8)` | hover border | Direct primitive |
| `var(--color-primary-500, #0ea5e9)` | checked box border + background | Direct primitive |
| `var(--color-danger-500, #ef4444)` | invalid border | Direct primitive (also used in `__error-indicator` background) |
| `var(--color-neutral-300, #d4d4d4)` | disabled border | Direct primitive |
| `var(--color-neutral-100, #f5f5f5)` | disabled background (via `color-mix`) | Direct primitive |
| `var(--color-neutral-400, #a3a3a3)` | disabled checked border (via `color-mix`) | Direct primitive |

**Note:** `--color-primary-500` is used as an interactive accent token. AC-78 should introduce
`--color-accent` or `--color-interactive` semantic aliases to replace these references.

---

### `date-picker` — `libs/shared/ui/src/lib/components/date-picker/date-picker.component.scss`

| Reference | Line context | Finding |
|---|---|---|
| `var(--color-primary-300, #93c5fd)` | hover border on `.mat-mdc-text-field-wrapper` | Direct primitive |
| `var(--color-primary-500, #3b82f6)` | active/focused border | Direct primitive |
| `var(--color-primary-600, #2563eb)` | toggle button hover/focus color | Direct primitive |
| `var(--color-primary-500, #3b82f6)` | `caret-color` on input element | Direct primitive |

**Note:** Same `--color-primary-*` interactive-state pattern as checkbox. AC-78 semantic alias
`--color-interactive` or `--color-accent` will resolve these.

---

### `tag` — `libs/shared/ui/src/lib/components/tag/tag.component.scss`

| Reference | Line context | Finding |
|---|---|---|
| `var(--color-primary-100)` | `:host` default + `.ui-tag--primary` background | Direct primitive |
| `var(--color-primary-700)` | `:host` default + `.ui-tag--primary` text | Direct primitive |
| `var(--color-neutral-100)` | `.ui-tag--secondary` background | Direct primitive |
| `var(--color-neutral-600)` | `.ui-tag--secondary` text | Direct primitive |
| `var(--color-green-100)` | `.ui-tag--success` background | Direct primitive |
| `var(--color-green-700)` | `.ui-tag--success` text | Direct primitive |
| `var(--color-blue-100)` | `.ui-tag--info` background | Direct primitive |
| `var(--color-blue-700)` | `.ui-tag--info` text | Direct primitive |
| `var(--color-amber-100)` | `.ui-tag--warn` background | Direct primitive |
| `var(--color-amber-700)` | `.ui-tag--warn` text | Direct primitive |
| `var(--color-red-100)` | `.ui-tag--danger` background | Direct primitive |
| `var(--color-red-700)` | `.ui-tag--danger` text | Direct primitive |
| `var(--color-neutral-900)` | `.ui-tag--contrast` background | Direct primitive |
| `var(--color-neutral-50)` | `.ui-tag--contrast` text | Direct primitive |
| Same 14 `--color-*-{300/900}` references | `[data-theme='dark']` variant overrides | Direct primitives for dark variants |

**This is the highest-priority AC-78 item.** All tag variant colors need status-variant semantic
aliases before AC-78 can refactor the tag component.

---

## 4. Missing Semantic Alias Needs

These aliases do not yet exist in `_semantic.scss` and must be added in AC-78 before the
component refactors can proceed.

| Alias Name | Resolves To (light) | Resolves To (dark) | Required By |
|---|---|---|---|
| `--color-accent` or `--color-interactive` | `var(--color-primary-500)` | `var(--color-primary-400)` | `checkbox`, `date-picker` |
| `--color-interactive-hover` | `var(--color-primary-400)` | `var(--color-primary-300)` | `checkbox`, `date-picker` |
| `--color-interactive-emphasis` | `var(--color-primary-600)` | `var(--color-primary-500)` | `date-picker` |
| `--color-danger-interactive` | `var(--color-danger-500)` | `var(--color-danger-400)` | `checkbox` |
| `--color-neutral-disabled` | `var(--color-neutral-300)` | `var(--color-neutral-400)` | `checkbox` |
| `--color-success-bg` | `var(--color-green-100)` | `var(--color-green-300)` | `tag` |
| `--color-success-fg` | `var(--color-green-700)` | `var(--color-green-900)` | `tag` |
| `--color-info-bg` | `var(--color-blue-100)` | `var(--color-blue-300)` | `tag` |
| `--color-info-fg` | `var(--color-blue-700)` | `var(--color-blue-900)` | `tag` |
| `--color-warning-bg` | `var(--color-amber-100)` | `var(--color-amber-300)` | `tag` |
| `--color-warning-fg` | `var(--color-amber-700)` | `var(--color-amber-900)` | `tag` |
| `--color-danger-bg` | `var(--color-red-100)` | `var(--color-red-300)` | `tag` |
| `--color-danger-fg` | `var(--color-red-700)` | `var(--color-red-900)` | `tag` |
| `--color-contrast-bg` | `var(--color-neutral-900)` | `var(--color-neutral-50)` | `tag` |
| `--color-contrast-fg` | `var(--color-neutral-50)` | `var(--color-neutral-900)` | `tag` |

---

## 5. Components with No Violations

### `icon` — `libs/shared/ui/src/lib/components/icon/icon.component.scss`

No violations found. The icon component uses only `currentColor` and relative `1em` sizing.
No token is required and none is consumed. **AC-78 action: none.**

### `checkbox-group` — `libs/shared/ui/src/lib/components/checkbox-group/checkbox-group.component.scss`

Semantic-in-primitive reference `var(--gap-md, 1rem)` was present before AC-64. This now
correctly resolves through `_semantic.scss` after the AC-64 extraction. **AC-78 action: none.**

### `tag-group` — `libs/shared/ui/src/lib/components/tag-group/tag-group.component.scss`

Semantic-in-primitive reference `var(--gap-sm, 0.5rem)` was present before AC-64. This now
correctly resolves through `_semantic.scss` after the AC-64 extraction. **AC-78 action: none.**

---

## 6. Recommended AC-78 Follow-Up Actions (Priority Order)

1. **Add status-variant semantic aliases to `_semantic.scss`** (all 15 aliases in section 4 above)
   before refactoring `tag.component.scss`. This is a prerequisite for all other AC-78 color work.

2. **Add interactive-state semantic aliases to `_semantic.scss`** (`--color-accent`,
   `--color-interactive-hover`, `--color-interactive-emphasis`, `--color-danger-interactive`,
   `--color-neutral-disabled`) before refactoring `checkbox.component.scss` and
   `date-picker.component.scss`.

3. **Refactor `tag.component.scss`** — replace all 14 direct primitive color references with
   the new status-variant semantic aliases. Include dark-mode overrides.

4. **Refactor `checkbox.component.scss`** — replace the 8 direct primitive color references with
   interactive-state semantic aliases. Evaluate the 6 hardcoded icon-geometry values and document
   intentional deviations for those without a scale match.

5. **Refactor `date-picker.component.scss`** — replace the 4 direct primitive color references
   with interactive-state semantic aliases.

6. **Keep the compact font scale documented**: `--font-size-xs` is now `0.6875rem` (11px) and
   `--font-size-sm` is `0.75rem` (12px). Use `--font-size-xs` for dense form labels and
   `--font-size-sm` for regular body/helper text.

---

*Produced by AC-64. This file is the authoritative violation handoff to AC-78.*
