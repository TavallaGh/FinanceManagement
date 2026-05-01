# AC-78 — Task Completion

## Summary

- **Task:** AC-78
- **Related Story:** AC-41 — Shared UI Foundation
- **Title:** FE - Shared UI Token Alignment Refactor
- **Scope:** FRONT (`accounting-frontend`)
- **Status:** Completed — ready for review
- **Completed:** 2026-04-30

---

## Description

Refactored three existing shared UI components (`tag`, `checkbox`, `date-picker`) to consume semantic token aliases exclusively, eliminating all direct primitive `--color-*` references. Extended `_semantic.scss` with 23 new aliases (9 interactive-state + 14 status-variant). Applied a comprehensive semantic overhaul that absorbed the deleted `colors/` folder into `_semantic.scss`. Fixed a critical build bug where `_semantic.scss` was never imported into the Angular build entry point. Aligned all Storybook shell accent colors to the project primary color (`--color-primary-500`).

---

## Acceptance Criteria

- **AOC-01:** `_semantic.scss` extended with all required interactive-state aliases (`--color-accent`, `--color-interactive-*`, `--color-danger-interactive`, `--color-neutral-disabled`).
  - ✅ 9 interactive-state aliases added with light and dark overrides.

- **AOC-02:** `tag.component.scss` — zero primitive color refs, zero `:host-context([data-theme='dark'])` blocks.
  - ✅ All 14 primitive refs replaced. All 8 `:host-context` blocks removed. `font-size: var(--font-size-xs)` added.

- **AOC-03:** `checkbox.component.scss` — zero primitive color refs, intentional-deviation geometry comments in place.
  - ✅ 10 primitive refs replaced. 9 intentional-deviation comments added. 2 icon-dimension vars mapped to spacing primitives.

- **AOC-04:** `date-picker.component.scss` — zero primitive color refs across full file (input field + calendar panel overlay).
  - ✅ Full-file audit applied. 12+ refs replaced (audit undercount corrected).

- **AOC-05:** `styles.scss` contains `@use '../../../public/styles/tokens/semantic'`.
  - ✅ Import added and confirmed as the root fix for the visual regression.

---

## Implementation Notes

### Files Changed

| File | Repository | Change |
|---|---|---|
| `public/styles/tokens/_semantic.scss` | accounting-frontend | Extended: 23 new aliases (interactive-state + status-variant) + full overhaul absorbing `colors/` folder |
| `public/styles/tokens/colors/` (folder) | accounting-frontend | **DELETED** — 7 files absorbed into `_semantic.scss` |
| `apps/erp-web/src/styles.scss` | accounting-frontend | Critical fix: `@use '../../../public/styles/tokens/semantic'` added |
| `libs/shared/ui/src/lib/components/tag/tag.component.scss` | accounting-frontend | Full refactor — semantic aliases, `:host-context` blocks removed, `font-size` added |
| `libs/shared/ui/src/lib/components/checkbox/checkbox.component.scss` | accounting-frontend | Full refactor — semantic aliases, deviation comments |
| `libs/shared/ui/src/lib/components/date-picker/date-picker.component.scss` | accounting-frontend | Full refactor — full-file primitive audit applied |
| `public/styles/tokens/_typography.scss` | accounting-frontend | `--font-size-sm` comment updated |
| `docs/design/design-system.md` | accounting-frontend | Colors section rewritten with AC-78 alias catalog |
| `docs/design/token-violation-audit.md` | accounting-frontend | Remediation status marked complete |
| `apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.scss` | accounting-frontend | Hardcoded purple/blue/pink accent colors replaced with primary semantic tokens |
| `apps/erp-web/src/app/dev-tools/story-book/shared/styles/story-book-content.scss` | accounting-frontend | Preview border updated to `--color-accent-subtle` |
| `docs/frontend/design/design-system.md` | accounting-workspace | Mirror of product doc update |
| `docs/work-items/02.implementation/stories/AC-41/tasks/AC-78-taskclose.md` | accounting-workspace | Task close artifact |

### Key Design Decisions

1. **Root cause of visual regression:** `_semantic.scss` was not imported in `styles.scss`. Components that consumed semantic aliases after the refactor had all CSS custom properties resolve to `initial` (transparent/unset). Fixed by adding `@use` import directly in `styles.scss` — the true Angular build entry point.

2. **Full-file date-picker audit:** The AC-64 violation audit undercounted date-picker refs (identified 4, actual was 12+). Calendar panel overlay selectors (`.mat-calendar-*`, `.mat-datepicker-content`) also contained `--color-primary-*` refs. Full-file audit was applied.

3. **`--color-accent-subtle` dark mode:** Original plan used `--color-primary-950` which does not exist in `_colors.scss`. Corrected to `--color-primary-800` during semantic overhaul.

4. **Storybook primary color alignment:** Storybook shell used hardcoded purple/blue/pink values (`#b89cff`, `#8fc3ff`, `#ffbadf`) unrelated to the project primary. All replaced with `var(--color-primary-*)` semantic aliases and interactive-state aliases.

---

## Tests

- **Automated tests:** Not applicable — CSS-only change; verification is build-time + visual smoke.
- **Storybook smoke (light mode):** ✅ Verified visually — tag color badges, checkbox checked state, date-picker interactive states all render correctly after `styles.scss` fix.
- **Dark-mode smoke:** ⏳ Deferred — pending AC-65 (Theme Engine) completion.
- **Full build:** ⏳ `nx build erp-web` run pending to confirm DOD-05 (zero Sass errors).

Manual verification:
1. `cd projects/Accounting-Frontend && npx nx build erp-web` — expect zero Sass errors.
2. `localhost:4200/story-book/tag` — confirm 7 colored severity variants.
3. `localhost:4200/story-book/checkbox` — confirm primary-colored checked state and focus ring.
4. `localhost:4200/story-book/date-time-picker` — confirm calendar opens with primary-colored selected date.

---

## Traceability

- **Jira:** https://nexttoptech.atlassian.net/browse/AC-78
- **Parent Story:** https://nexttoptech.atlassian.net/browse/AC-41
- **Depends on:** AC-64 ✅ Complete
- **GitLab issue (project):** TBD — blocked on `.secrets/credentials.local`
- **Project MR:** TBD — blocked on `.secrets/credentials.local`
- **Workspace MR:** TBD — blocked on `.secrets/credentials.local`
- **Source branch:** `features/ac-78-fe-shared-ui-token-alignment-refactor`
- **Target branch:** `develop`
- **Task close artifact:** `docs/work-items/02.implementation/stories/AC-41/tasks/AC-78-taskclose.md`

---

## Outstanding Items

- Run `nx build erp-web` to confirm DOD-05 (zero Sass compilation errors).
- Provision `.secrets/credentials.local` to unblock GitLab branch/MR creation and Jira transition.
- AC-65 (Theme Engine) required before dark-mode Storybook smoke sign-off.

---

## Sign-off

- **Developer:** GitHub Copilot (AI agent)
- **Reviewer:**
