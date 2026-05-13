# UI Components

## Purpose

This document is the catalog for reusable shared UI components in the ERP frontend.

Use it to understand:

- which shared UI components already exist
- where each component lives in the workspace
- where each component is documented in story-book
- which capabilities each component currently supports

Use `design-system.md` for design rules, tokens, reuse boundaries, and implementation constraints.

## Source of Truth

### Shared UI Library

Reusable UI components live in:

- `libs/shared/ui/src/lib/components/`

Current shared components include:

- `card/`
- `checkbox/`
- `checkbox-group/`
- `date-picker/`
- `icon/`
- `tag/`
- `tag-group/`
- `grid-list/`

### Story Book Surface

Interactive component previews and usage documentation live in:

- `apps/erp-web/src/app/dev-tools/story-book/`

Current story-book pages for shared UI components include:

- `apps/erp-web/src/app/dev-tools/story-book/pages/card/`
- `apps/erp-web/src/app/dev-tools/story-book/pages/notification-card/`
- `apps/erp-web/src/app/dev-tools/story-book/pages/action-card/`
- `apps/erp-web/src/app/dev-tools/story-book/pages/checkbox/`
- `apps/erp-web/src/app/dev-tools/story-book/pages/date-time-picker/`
- `apps/erp-web/src/app/dev-tools/story-book/pages/icon/`
- `apps/erp-web/src/app/dev-tools/story-book/pages/tag/`
- `apps/erp-web/src/app/dev-tools/story-book/pages/grid-system/`

### Story Book Shell Layout

The story-book shell (`apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component`) provides the shared application frame for all story-book pages.

It includes:

- language switcher (Persian / English)
- theme toggle button (sun / moon) that calls `ThemeService.setTheme()` — added AC-65
- sidebar navigation

The theme toggle is visible in the header and reflects the active theme. It does not require any input from feature pages.

## Component Catalog

### Card Components

The shared card components family is implemented in:

- `libs/shared/ui/src/lib/components/card/`

The family includes three specialized card variants:

- `card.component` — Base card container with optional header and footer slots
- `stat-card.component` — Statistical metric card with icon, title, value, and optional trend indicator
- `notification-card.component` — Notification display card with severity icon, content, and action buttons
- `action-card.component` — Action prompt card with description and footer action buttons

Interactive documentation is organized across three separate story-book pages:

- `apps/erp-web/src/app/dev-tools/story-book/pages/card/` — Base card and stat card documentation
- `apps/erp-web/src/app/dev-tools/story-book/pages/notification-card/` — Notification card documentation
- `apps/erp-web/src/app/dev-tools/story-book/pages/action-card/` — Action card documentation

#### Base Card (UiCardComponent)

The base card provides a flexible container with:

- default content slot
- optional header slot via `uiCardHeader` directive
- optional footer slot via `uiCardFooter` directive
- consistent elevation, radius, and spacing tokens
- automatic RTL/LTR layout support

Use the base card for generic content grouping and as the foundation for specialized card variants.

#### Stat Card (UiStatCardComponent)

The stat card displays statistical metrics with:

- 3-row layout: icon + trend badge (row 1), title (row 2), value (row 3)
- configurable icon and icon variant background colors via `icon` and `iconVariant` inputs
- optional trend indicator using `UiTagComponent` with `trend` ('up' | 'down') and `trendValue` inputs
- automatic severity mapping: 'up' trend → success tag, 'down' trend → danger tag
- icon hover scale animation
- icon border with 10% opacity via `color-mix(in srgb, currentColor 10%, transparent)`
- automatic RTL/LTR layout support (layout inherits from document direction)

Icon variant options: `'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger'`

Use the stat card for dashboard metrics, KPI displays, and summary statistics.

**RTL/LTR Behavior:**
- Layout automatically adapts to document `dir` attribute
- Uses CSS logical properties for text alignment
- No manual direction overrides needed in component styles

#### Notification Card (UiNotificationCardComponent)

The notification card displays notifications with:

- 3-column grid layout: severity icon (left/right), content (center), action buttons (right/left)
- severity variants: `'success' | 'info' | 'warning' | 'danger'`
- configurable title, text, and optional date
- read/unread state with visual indicator (purple background tint for unread)
- mark-as-read button (conditionally shown when unread)
- delete button with danger hover state
- automatic RTL/LTR layout support via CSS Grid direction inheritance
- flat design (no box-shadow), subtle border styling

Use the notification card for activity feeds, alert lists, and notification centers.

**RTL/LTR Behavior:**
- CSS Grid automatically reverses column order based on document `dir`
- Text alignment uses `text-align: start` for automatic adaptation
- No hardcoded layout direction in component or page templates

#### Action Card (UiActionCardComponent)

The action card presents actionable prompts with:

- header slot for icon and title via `uiCardHeader` directive
- default content slot for description text
- footer slot for action buttons via `uiCardFooter` directive
- no footer border (clean separation between content and actions)
- automatic RTL/LTR layout support

Use the action card for call-to-action sections, empty states, and user prompts.

**Styling Notes:**
- Footer border removed via `::ng-deep .ui-card__footer { border-block-start: none !important; }`
- Maintains consistent spacing and token usage with base card

### Checkbox Component

The shared checkbox is implemented in:

- `libs/shared/ui/src/lib/components/checkbox/`

Its interactive documentation is implemented in:

- `apps/erp-web/src/app/dev-tools/story-book/pages/checkbox/`

The checkbox supports:

- simple, disabled, and invalid states
- checkbox groups
- size variants: `sm`, `md`, `lg`
- template-driven forms
- reactive forms with `formControlName`
- Angular signal forms with `formField`

**Dark mode token usage inside `checkbox.component.scss`:**
- Checkmark icon stroke: `--fg-white` (always white, contrasts against `--color-accent` checked background regardless of theme)
- Error indicator background: `--fg-white` for the indicator icon fill
- Disabled box background: `color-mix(in srgb, var(--color-neutral-disabled) ..., var(--surface-primary))` so the blended base adapts to the active theme surface

Use the shared checkbox for generic boolean selection patterns instead of recreating local checkbox UI.

### Checkbox Group Component

The shared checkbox group is implemented in:

- `libs/shared/ui/src/lib/components/checkbox-group/`

Its interactive documentation is implemented in:

- `apps/erp-web/src/app/dev-tools/story-book/pages/checkbox/`

The checkbox group supports:

- grouping multiple shared checkboxes
- vertical layout
- horizontal layout
- accessible group labeling through `ariaLabel`

Use the shared checkbox group when a set of checkbox options needs shared spacing, orientation, and accessibility behavior.

### Icon Component

The shared icon component is implemented in:

- `libs/shared/ui/src/lib/components/icon/`

Its interactive documentation is implemented in:

- `apps/erp-web/src/app/dev-tools/story-book/pages/icon/`

The icon component supports:

- rendering any registered Lucide icon by name
- inheriting size from the component font size through `1em`
- inheriting color from `currentColor`
- optional accessible label through `label`
- configurable stroke width through `strokeWidth`
- story-book catalog coverage for the shared Lucide registry with thematic grouping and search

Icon names come from the shared registry in:

- `libs/shared/ui/src/lib/icons/ui-icons.ts`

The registry exposes the project Lucide icon set and normalizes names to kebab-case such as `search`, `user`, `triangle-alert`, and `panel-left-close`.

Use the shared icon component in templates instead of placing `lucide-angular` directly in feature or shared component markup.

All project icons must use Lucide through the shared `lib-icon` component and shared registry.

### Date Picker Component

The shared date picker is implemented in:

- `libs/shared/ui/src/lib/components/date-picker/`

Its interactive documentation is implemented in:

- `apps/erp-web/src/app/dev-tools/story-book/pages/date-time-picker/`

The date picker supports:

- four modes through `pickerType`: `date`, `date-range`, `date-time`, `date-time-range`
- reactive form integration through `controlName`, `fromControlName`, and `toControlName`
- automatic Persian and English behavior through the active application language
- Jalali and Gregorian presentation through the wrapped shared date-time package behavior
- single-field and range-field labels and placeholders
- optional `UTC`, `timeZoneName`, `min`, `max`, and `datepickerFilterDays` inputs
- shared floating-label, clear-action, and range-divider styling aligned with the design system
- story-book coverage for all four supported picker variants

**Dark mode implementation notes:**
- The floated label color is set inline via `_applyLabelState()` using `var(--fg-primary)` (floated/focused) and `var(--fg-secondary)` (unfloated) so both states adapt to the active theme.
- The floated label background and `box-shadow` spread use `var(--surface-primary)` to mask the underlying input border cleanly in both themes. Never use `#ffffff` or a hardcoded color here.
- The calendar popup background uses `var(--surface-primary)` rather than any `color-mix(..., white)` expression.
- Selected date text uses `var(--fg-white)` for always-white text on the accent-colored cell.
- Hover border uses `var(--color-interactive-hover-border)` (not `--color-interactive-hover`).

Use the shared date picker for generic date and date-time inputs instead of wiring the underlying third-party package directly inside features.

### Tag Component

The shared tag is implemented in:

- `libs/shared/ui/src/lib/components/tag/`

Its interactive documentation is implemented in:

- `apps/erp-web/src/app/dev-tools/story-book/pages/tag/`

The tag supports:

- visual status variants through `severity`
- compact rounded presentation through `rounded`
- optional leading icon through `icon`
- projected custom content for custom tag layouts
- translatable story-book examples for Persian and English
- shared `lib-icon` wrapper backed by `libs/shared/ui/src/lib/icons/ui-icons.ts`

Available severity values are:

- `primary`
- `secondary`
- `success`
- `info`
- `warn`
- `danger`
- `contrast`

The tag can consume any icon name that exists in the shared icon registry.

Use the shared tag for status labels, category badges, and short inline annotations instead of rebuilding badge-like UI locally.

### Tag Group Component

The shared tag group is implemented in:

- `libs/shared/ui/src/lib/components/tag-group/`

Its interactive documentation is implemented in:

- `apps/erp-web/src/app/dev-tools/story-book/pages/tag/`

The tag group supports:

- grouping multiple shared tags inside one accessible wrapper
- horizontal layout
- vertical layout
- shared spacing and wrap behavior
- accessible labeling through `ariaLabel`

Use the shared tag group when several tags should be rendered as one related set with consistent spacing and orientation behavior.

### Grid List Components

The shared grid list components are implemented in:

- `libs/shared/ui/src/lib/components/grid-list/`

The family includes two components:

- `grid-list.component` — Material-style grid list with fixed columns and aspect-ratio tile heights
- `grid-tile.component` — Individual tile with colspan and rowspan support

Interactive documentation is implemented in:

- `apps/erp-web/src/app/dev-tools/story-book/pages/grid-system/`

#### UiGridListComponent

The grid list provides a tile-based layout container with:

- configurable column count via `cols` input
- aspect-ratio-driven row height via `rowHeight` input (e.g. `'4:1'`, `'1:1'`)
- configurable gutter between tiles via `gutterSize` input
- automatic RTL/LTR support through CSS logical properties
- no Angular Material dependency

Use `UiGridListComponent` as the container whenever a fixed-column, aspect-ratio tile layout is needed.

#### UiGridTileComponent

The grid tile provides a single slot inside a grid list with:

- column span via `colspan` input (default: 1)
- row span via `rowspan` input (default: 1)
- full height/width fill of its assigned cell area

Place `UiCardComponent` with `class="ui-fill"` inside the tile to get a card that fills the tile area.

**RTL/LTR Behavior:**
- Grid layout inherits direction from `<html dir>` attribute automatically
- No manual direction overrides needed

## Update Rule

Update this document whenever:

- a new shared UI component is added
- an existing shared component gains a new public capability
- a component story-book page moves or is renamed
- a shared component is deprecated or replaced

This update is mandatory whenever work touches `libs/shared/ui`. If a shared UI component is added or changed, this catalog must be reviewed and updated in the same task.
