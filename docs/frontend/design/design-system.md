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

### Design Tokens

Core tokens live in:

- `public/styles/tokens/_colors.scss`
- `public/styles/tokens/_spacing.scss`
- `public/styles/tokens/_typography.scss`
- `public/styles/tokens/_radius.scss`
- `public/styles/tokens/_elevation.scss`
- `public/styles/tokens/_z-index.scss`

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

Use semantic variables such as:

- `--bg-primary`
- `--surface-primary`
- `--fg-primary`
- `--border-primary`
- `--color-primary-500`
- `--color-success-700`
- `--color-warning-700`

Every color choice must remain valid for both light and dark themes.

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
- `--font-size-sm`
- `--font-size-xl`
- `--font-weight-semibold`

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

- `public/icon/bcm-icon.scss`

Do not introduce SVG icons unless explicitly required.

## Forms

- Use Signal Forms patterns.
- Use `submit()` state for submission flow.
- Bind the submit button to the submitting state.
- Custom controls must use `FormControlValue`.

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

Do not add Storybook entries for feature-local components unless that feature is already documented there or the task explicitly requires it.

## Figma and Precision

- Reuse existing tokens before introducing new visual values.
- Do not approximate spacing or color values if a defined token exists.
- Do not invent extra states or visual patterns.
- Keep implementation aligned with provided design input.

## Summary

The design system is centered on shared UI components, token-based styling, clean reuse boundaries, and direction-aware, accessible implementation.
