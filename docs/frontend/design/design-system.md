# Design System

## Purpose

The design system defines the visual and structural rules for reusable UI across the ERP application.

It must stay:

- token-driven
- reusable
- RTL/LTR-safe
- accessible
- consistent with existing workspace patterns

## Source of Truth

### Shared UI Library

Reusable design-system components belong in:

- `libs/shared/ui/src/lib/components/`

Do not create feature-specific business components in the shared UI library.

### Story Book Surface

Interactive previews and usage documentation for shared UI components belong in:

- `apps/erp-web/src/app/dev-tools/story-book/`

Do not place shared component showcase pages under `apps/erp-web/src/app/features/`.

### Shared UI Catalog

Component-specific inventory and capability notes live in:

- `docs/design/ui-components.md`

Keep this document focused on system-wide UI rules. Keep component-by-component catalog details in the dedicated shared UI catalog.

If work adds to or changes the shared UI library, documentation updates are required in the same task. A shared UI change is not complete until the relevant design docs are updated.

### Design Tokens

Core tokens live in:

- `public/styles/tokens/_colors.scss`
- `public/styles/tokens/_spacing.scss`
- `public/styles/tokens/_typography.scss`
- `public/styles/tokens/_radius.scss`
- `public/styles/tokens/_elevation.scss`
- `public/styles/tokens/_z-index.scss`
- `public/styles/tokens/_semantic.scss` ← **the only layer components may consume**

## Token Architecture

Tokens are organized in two strict layers.

### Layer 1 — Primitive Tokens

Raw values: palette scales, spacing steps, font sizes, radii, shadow definitions.

- Defined in `_colors.scss`, `_spacing.scss`, `_typography.scss`, `_radius.scss`, `_elevation.scss`, `_z-index.scss`.
- Naming: `--color-{palette}-{scale}`, `--spacing-{n}`, `--shadow-{size}`, etc.
- **Never consumed directly by component or feature SCSS.**

### Layer 2 — Semantic Tokens

Intent-based aliases that reference primitives.

- Defined exclusively in `public/styles/tokens/_semantic.scss`.
- Naming: intent-based with no palette or scale reference — `--fg-primary`, `--gap-sm`, `--elevation-2`, `--z-modal`.
- **Components and feature styles must consume only these aliases.**

### Naming Convention

| Category | Primitive example | Semantic example |
|---|---|---|
| Color | `--color-neutral-900` | `--fg-primary` |
| Color | `--color-primary-500` | `--color-accent` (AC-78) |
| Spacing | `--spacing-4` | `--padding-md` |
| Elevation | `--shadow-sm` | `--elevation-2` |
| Z-index | _(none — z-index has no primitives)_ | `--z-modal` |

### Violation Remediation

Existing components that violate the two-layer rule are catalogued in
`docs/design/token-violation-audit.md` (in the accounting-frontend project).
Remediation is tracked under AC-78.

## Design Principles

- Keep interfaces clear and predictable.
- Reuse existing components before creating new ones.
- Prefer composition over duplication.
- Match approved design input closely.
- Keep components small and focused.

## Reuse Rules

- Use `libs/shared/ui` for generic presentational components.
- Use feature `components/` for business-specific compositions.
- Use app `shared/` for app-scoped reusable helpers.
- Do not move feature business UI into the design system unless it becomes truly generic.

## Component Architecture

- Use component-based APIs.
- Do not use directive-based UI patterns that require global style imports.
- Keep styles scoped to the component.
- Prefer semantic HTML and BEM-style class naming.

Component-specific APIs, locations, and supported behaviors are documented in `docs/design/ui-components.md`.

## Styling Rules

- Use CSS variables from the token set.
- Do not hardcode colors, spacing, radius, shadows, or z-index values.
- Use Flexbox and Grid for layout.
- Use logical properties such as `margin-inline-start` and `padding-inline-end`.
- Build mobile-first.

Example:

```scss
.card {
  color: var(--fg-primary);
  background: var(--surface-primary);
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--elevation-2);
}
```

## Tokens by Category

### Colors

Components must consume semantic color aliases from `_semantic.scss` only. Direct use of primitive palette tokens (`--color-{palette}-{scale}`) in component SCSS is prohibited.

**Global style entry point:** `_semantic.scss` must be imported in `apps/erp-web/src/styles.scss` as `@use '../../../public/styles/tokens/semantic'` — after all primitive token imports and before any component-level rules.

**Surface and text aliases:**

- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
- `--surface-primary`, `--surface-secondary`, `--surface-hover`, `--surface-active`
- `--fg-primary`, `--fg-secondary`, `--fg-tertiary`
- `--border-primary`, `--border-secondary`

**Interactive state aliases** (for focus rings, hover borders, checked states, caret — added AC-78):

- `--color-accent` — primary action color (checked state, focus ring, active borders, caret)
- `--color-accent-subtle` — tint for hover/today background on calendar cells
- `--color-interactive-hover` — hover color for icon buttons and interactive text (not borders; use `--color-interactive-hover-border` for border hover)
- `--color-interactive-hover-border` — hover border color for inputs, calendar navigation buttons, and any bordered interactive element
- `--color-interactive-border` — calendar cell hover inner border
- `--color-interactive-emphasis` — primary accent text (active/focused icon buttons; **not** used for floated form labels — those use `--fg-primary`)
- `--color-danger-interactive` — danger/error interactive state (invalid borders, error indicators)
- `--color-neutral-disabled` — disabled state border and muted background tint

**Status variant aliases** (for badge/tag components — added AC-78):

- `--color-primary-bg` / `--color-primary-fg`
- `--color-secondary-bg` / `--color-secondary-fg`
- `--color-success-bg` / `--color-success-fg`
- `--color-info-bg` / `--color-info-fg`
- `--color-warning-bg` / `--color-warning-fg`
- `--color-danger-bg` / `--color-danger-fg`
- `--color-contrast-bg` / `--color-contrast-fg`

`--color-contrast-bg` and `--color-contrast-fg` always invert the current theme — dark background with light text in light mode, light background with dark text in dark mode. Use them only when an element must visually oppose the surrounding surface.

Every color choice must remain valid for both light and dark themes. All semantic aliases cascade through the `[data-theme='dark']` override on `<html>` automatically. **Do not add `:host-context([data-theme='dark'])` override blocks when consuming semantic aliases** — they are redundant and will be removed during review.

### Runtime Theme Switching (AC-65)

Theme switching is managed exclusively by `ThemeService` (`core/services/theme.service.ts`). It is the single point of truth for reading and applying the active theme at runtime.

**Initialization order:**
1. `ThemeService` is instantiated via `APP_INITIALIZER` before the first component renders.
2. On init it reads `localStorage` for a persisted preference.
3. If no value is persisted it falls back to the OS/browser `prefers-color-scheme` setting.
4. The resolved theme is applied to `document.documentElement` before paint — no visible flash.

**Consuming `ThemeService` in features:**

```typescript
import { ThemeService } from '../core/services/theme.service';

// Read current theme reactively (Observable)
themeService.theme$.subscribe(theme => { /* ... */ });

// Read current theme synchronously
const current = themeService.getTheme(); // 'light' | 'dark'

// Switch theme
themeService.setTheme('dark');
themeService.setTheme('light');
```

**Theme-switch performance:**
When `setTheme()` is called, the service adds `theme-switching` to `<html>` before changing `data-theme`, then removes it after two animation frames. A global CSS rule suppresses all `transition` declarations during this window so that no component-level animation fires while CSS tokens are changing — the swap is visually instant regardless of how many animated elements are on screen.

**Rules:**
- Always use `ThemeService` to change the theme. Never set `document.documentElement.dataset.theme` directly from feature code.
- Never write `:host-context([data-theme='dark'])` inside component SCSS. Semantic tokens cascade automatically.
- Never hardcode color values as fallbacks inside `color-mix()` or `var()` calls using `white`, `#ffffff`, or `#000000`. Use `--surface-primary`, `--fg-white`, or the appropriate semantic alias so the fallback also adapts to theme.

### Spacing

Use the spacing scale and semantic spacing variables.

Examples:

- `--spacing-2`
- `--spacing-4`
- `--spacing-6`
- `--padding-md`
- `--gap-lg`

### Typography

Use the typography scale and font variables.

Examples:

- `--font-family-primary`
- `--font-size-xxs`
- `--font-size-xs`
- `--font-size-sm`
- `--font-size-base`
- `--font-size-md`
- `--font-size-xl`
- `--font-weight-normal`
- `--font-weight-medium`
- `--font-weight-semibold`
- `--line-height-normal`

Current shared typography tokens in `public/styles/tokens/_typography.scss` are intentionally compact for ERP data-entry surfaces:

- `--font-family-primary` and `--font-family-secondary` both start with `Vazirmatn`
- `--font-size-xxs` is `0.625rem`
- `--font-size-xs` and `--font-size-sm` are both `0.75rem`
- `--font-size-base` is `0.875rem`
- `--font-size-md` is `1rem`
- `--line-height-none` is used for floated labels and dense micro-copy when needed
- `--line-height-normal` remains the default for body and form text

Prefer the shared scale exactly as defined instead of inventing alternate control-specific font ramps. Dense controls such as the shared date picker should reuse these compact typography tokens rather than hardcoding local text sizes.

### Radius

Use radius tokens such as:

- `--radius-md`
- `--radius-lg`
- `--radius-xl`
- `--radius-full`

### Elevation

Use elevation variables instead of custom shadows.

Examples:

- `--elevation-1`
- `--elevation-2`
- `--elevation-3`

### Z-Index

Use the predefined stack only:

- `--z-base`
- `--z-dropdown`
- `--z-sticky`
- `--z-fixed`
- `--z-header`
- `--z-overlay`
- `--z-modal`
- `--z-popover`
- `--z-toast`
- `--z-tooltip`
- `--z-max`

Do not introduce custom z-index values.

## Icons

Icons should come from:

- `libs/shared/ui/src/lib/components/icon/`
- `lucide-angular`
- `libs/shared/ui/src/lib/icons/ui-icons.ts`

Use `lucide-angular` as the required icon source across the project.

Use the shared `lib-icon` wrapper as the required template-level entrypoint in app code and shared UI.

Do not introduce other icon packs, ad-hoc SVG icon systems, or parallel icon wrappers unless the project explicitly changes this rule in documentation first.

Keep site-wide icon names and Lucide mappings in the shared registry file so reusable components do not each create their own local icon map.

Do not scatter icon-name-to-icon-data mappings across multiple components when the same names are meant to be reused across the app.

## Forms

- Use Signal Forms patterns.
- Use `submit()` state for submission flow.
- Bind the submit button to the submitting state.
- Custom controls must use `FormControlValue`.

For date and date-time entry specifically:

- use the shared `ui-date-picker` from `libs/shared/ui` instead of consuming the third-party package directly in features
- prefer `pickerType` variants over creating parallel wrappers for single, range, and date-time flows
- keep labels, placeholders, and interaction states aligned with the shared floating-label treatment
- preserve RTL/LTR-safe layout and bilingual behavior when extending the component

For checkbox specifically:

- keep shared form compatibility in the reusable UI component
- preserve support for template-driven, reactive, and signal forms when extending behavior
- document any new form-related API in the story-book page

For tag specifically:

- keep the component presentational and business-agnostic
- document every new visual variant in the story-book page
- keep story-book examples translatable instead of hardcoding labels

## Interaction Rules

- Implement explicit hover, focus, and active states.
- Use specific transitions, not `transition: all`.
- Keep focus indicators visible.
- Avoid decorative motion that does not support understanding.

## Accessibility

- Meet WCAG AA contrast requirements.
- Ensure keyboard access.
- Use semantic HTML first.
- Keep labels, headings, and states understandable.

## Storybook Rules

Storybook updates are required for shared UI components when that integration exists.

When extending a shared UI component:

- add or update the story entry
- expose clean copyable examples
- keep examples minimal and realistic
- keep its route inside `dev-tools/story-book`

When a shared UI component is created or changed, update the related documentation in `docs/design/` in the same task instead of leaving docs for later follow-up.

For checkbox, keep the story-book page updated when changing:

- states
- sizes
- group behavior
- forms compatibility

For tag, keep the story-book page updated when changing:

- severity variants
- rounded behavior
- icon support
- grouping behavior
- inline text examples

Do not add Storybook entries for feature-local components unless that feature is already documented there or the task explicitly requires it.

## Figma and Precision

- Reuse existing tokens before introducing new visual values.
- Do not approximate spacing or color values if a defined token exists.
- Do not invent extra states or visual patterns.
- Keep implementation aligned with provided design input.

## Summary

The design system is centered on token-based styling, clean reuse boundaries, and direction-aware, accessible implementation. Use `ui-components.md` as the companion catalog for shared component inventory and capabilities.
