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
- `scroll-container/`
- `simple-list/`
- `list-with-pagination/`
- `tag/`
- `tag-group/`
- `grid-list/`
- `table/` (includes `UiTableComponent` and `UiPaginatorComponent`)
- `tree-view/` (includes `UiTreeViewComponent`, `UiTreeViewNodeComponent`, and `UiTreeViewGridComponent`)

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
- `apps/erp-web/src/app/dev-tools/story-book/pages/scroll-container/`
- `apps/erp-web/src/app/dev-tools/story-book/pages/simple-list/`
- `apps/erp-web/src/app/dev-tools/story-book/pages/list-with-pagination/`
- `apps/erp-web/src/app/dev-tools/story-book/pages/tag/`
- `apps/erp-web/src/app/dev-tools/story-book/pages/grid-system/`
- `apps/erp-web/src/app/dev-tools/story-book/pages/table/`
- `apps/erp-web/src/app/dev-tools/story-book/pages/paginator/`
- `apps/erp-web/src/app/dev-tools/story-book/pages/tree-view/`

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

#### CSS Custom Properties for Overriding Card Layout

The base card exposes CSS custom properties so data-container components (such as table and tree-view-grid) can suppress internal padding without `::ng-deep`. Set these on the consuming component's `:host`:

| Property | Default | Description |
|---|---|---|
| `--ui-card-header-padding-inline` | `var(--spacing-4)` | Header inline padding |
| `--ui-card-header-padding-block` | `var(--spacing-2)` | Header block padding |
| `--ui-card-header-min-height` | `40px` | Header minimum height |
| `--ui-card-body-padding-inline` | `var(--spacing-4)` | Body inline padding |
| `--ui-card-body-padding-block` | `var(--spacing-4)` | Body block padding |
| `--ui-card-body-gap` | `var(--spacing-2)` | Body flex gap |
| `--ui-card-body-overflow` | `unset` | Body overflow behavior |
| `--ui-card-footer-padding-inline` | `var(--spacing-4)` | Footer inline padding |
| `--ui-card-footer-padding-block` | `var(--spacing-3)` | Footer block padding |
| `--ui-card-footer-border-start` | `1px solid var(--border-tertiary)` | Footer top border |

CSS custom properties cascade through Angular's emulated ViewEncapsulation naturally — they are not affected by specificity ordering unlike `::ng-deep` overrides.

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
- Footer border removed by setting `--ui-card-footer-border-start: none` on `:host`
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

### Scroll Container Component

The shared scroll container is implemented in:

- `libs/shared/ui/src/lib/components/scroll-container/`

Its interactive documentation is implemented in:

- `apps/erp-web/src/app/dev-tools/story-book/pages/scroll-container/`

The scroll container provides a lightweight, custom-scrollbar alternative with:

- custom styled, draggable scrollbars (vertical, horizontal, or both)
- auto-hide capability with configurable delay
- complete RTL/LTR support with logical CSS properties
- proportional wheel-scroll with delta-mode normalization (pixels, lines, pages)
- orientation-aware wheel scroll (vertical delta maps to horizontal scroll when `orientation="horizontal"`)
- public API for programmatic scrolling: `scrollTo()`, `scrollBy()`, `scrollToTop()`, `scrollToBottom()`
- scroll event emissions with position and ratio data
- event outputs: `scrolled`, `reachTop`, `reachBottom`, `reachStart`, `reachEnd`
- ResizeObserver for automatic geometry updates
- MutationObserver for content change detection

Configuration inputs:

- `orientation` — scroll axis mode: `'vertical'` | `'horizontal'` | `'both'` (default: omitted = both)
- `autoHide` — enable auto-hide behavior (default: `true`)
- `autoHideDelay` — delay before hiding in milliseconds (default: `800`)
- `smooth` — enable smooth scroll behavior (default: `true`)
- `minThumbSize` — minimum thumb size in pixels (default: `24`)

**RTL/LTR Behavior:**
- Horizontal thumb positioning automatically reverses in RTL mode
- Drag behavior correctly maps to logical start/end edges
- Wheel scroll direction respects document `dir` attribute
- Uses CSS logical properties for track positioning

**Browser Support:**
- Chrome/Edge: negative `scrollLeft` in RTL
- Firefox: reversed positive `scrollLeft` in RTL
- Safari: full support with current implementation

**Implementation Notes:**
- Track element has `pointer-events: none` when not visible; `pointer-events: auto` only when the `--visible` modifier class is applied — this prevents the invisible track from intercepting mouse events and showing an unexpected cursor
- Thumb drag start uses `getBoundingClientRect()` for accurate initial position; `offsetTop`/`offsetLeft` are unreliable when CSS `transform` is in use
- `scroll-behavior: smooth` is intentionally absent from the viewport CSS; native smooth scroll causes wheel-event accumulation and jumpy behavior when scrolling quickly — scrolling is handled entirely through JavaScript for accuracy
- Thumb transform is directly synced to viewport scroll position on every drag frame for immediate 1:1 tracking
- Body `cursor: grabbing` and `user-select: none` are applied while a thumb is being dragged, and restored on pointer up

**Internal Usage:**
- `UiSimpleListComponent` embeds `UiScrollContainerComponent` internally. When a `height` is set on `<ui-simple-list>`, the internal scroll container fills that height and handles scrolling. Consumers do not need to wrap simple lists in a scroll container manually.

Use the shared scroll container for custom content areas needing styled scrollbars, auto-hide behavior, or advanced scroll event handling instead of relying on native browser scrollbars.

### Simple List Components

The simple list components are implemented in:

- `libs/shared/ui/src/lib/components/simple-list/`

Interactive documentation is implemented in:

- `apps/erp-web/src/app/dev-tools/story-book/pages/simple-list/`

The family includes two components:

- `ui-simple-list.component` — Container that wraps its content in an internal `UiScrollContainerComponent`
- `ui-simple-list-item.component` — Individual row with state-driven styling

#### UiSimpleListComponent

The simple list provides a scrollable list container with:

- internal `UiScrollContainerComponent` for vertical scrolling — no external scroll container needed
- transparent background and no border or border-radius of its own
- height-activated scroll: set `height` (or `max-height`) on `<ui-simple-list>` to enable bounded scrolling; without a height the list expands to fit all items
- RTL/LTR safe layout through internal scroll container

**Usage:**

```html
<!-- Scrollable list showing 3 items at a time -->
<ui-simple-list style="height: 9rem;">
  @for (item of items; track item) {
    <ui-simple-list-item>{{ item }}</ui-simple-list-item>
  }
</ui-simple-list>
```

**Composition rule:** Do not wrap `<ui-simple-list>` inside `<ui-card>`. If a card wrapper is needed for elevation or background, place the card around the list in the consuming template. Cards and card-like components go *inside* list items, not around the list itself.

#### UiSimpleListItemComponent

The simple list item provides a single row with:

- `selected` signal input (`boolean`, default: `false`) — applies `.selected` host class → `--color-accent-subtle` background, medium font weight
- `disabled` signal input (`boolean`, default: `false`) — applies `.disabled` host class → reduced opacity, no hover, `pointer-events: none`
- `border-block-end` separator between rows (removed on the last child)
- hover background: `var(--surface-hover)`
- `padding-inline: var(--padding-md)`, `padding-block: var(--padding-sm)` for text content rows
- automatic card-child detection via CSS `:has()`: when the item contains a `ui-notification-card` or `ui-card`, inline padding is removed, block padding is reduced to `var(--gap-sm)`, the separator border is removed, and hover/selected backgrounds are suppressed — the card manages its own visuals
- RTL/LTR safe with CSS logical properties

**Inputs:**

| Input | Type | Default | Description |
|---|---|---|---|
| `selected` | `boolean` | `false` | Marks the item as selected (accent background) |
| `disabled` | `boolean` | `false` | Marks the item as non-interactive (reduced opacity) |

**Usage:**

```html
<!-- Text items -->
<ui-simple-list>
  <ui-simple-list-item [selected]="true">Selected item</ui-simple-list-item>
  <ui-simple-list-item>Default item</ui-simple-list-item>
  <ui-simple-list-item [disabled]="true">Disabled item</ui-simple-list-item>
</ui-simple-list>

<!-- Items containing cards (padding/border suppressed automatically) -->
<ui-simple-list style="height: 320px;">
  @for (n of notifications; track n.id) {
    <ui-simple-list-item>
      <ui-notification-card [severity]="n.severity" [title]="n.title" [text]="n.text" />
    </ui-simple-list-item>
  }
</ui-simple-list>
```

**RTL/LTR Behavior:**
- Layout and separators use CSS logical properties (`padding-inline`, `padding-block`, `border-block-end`)
- Renders correctly for both LTR and RTL without any per-item direction attribute

### List with Pagination Component

The list with pagination component is implemented in:

- `libs/shared/ui/src/lib/components/list-with-pagination/`

Its interactive documentation is implemented in:

- `apps/erp-web/src/app/dev-tools/story-book/pages/list-with-pagination/`

#### UiListWithPaginationComponent

The list with pagination component provides a stateless client-side pagination wrapper with:

- content projection via `ng-content` — the consumer provides the list items
- previous/next navigation buttons using `UiButtonComponent`
- page indicator displaying current page and total pages (`Page X of Y`)
- computed `totalPages` derived from `totalItems` and `pageSize`
- boundary-aware disable logic: previous disabled at page 0, next disabled at last page
- `pageChange` event emission with `{ pageIndex, pageSize }` payload
- empty state when `totalItems` is 0, with configurable or default translated message
- pagination footer shown only when `totalPages > 1`
- token-driven styling with `UiSimpleListComponent` as the inner scroll container
- fully RTL/LTR safe with CSS logical properties
- `OnPush` change detection and signal-based inputs/outputs

**Inputs:**

| Input | Type | Default | Description |
|---|---|---|---|
| `pageSize` | `number` | `20` | Number of items per page |
| `pageIndex` | `number` | `0` | Zero-based current page index |
| `totalItems` | `number` | `0` | Total number of items across all pages |
| `emptyMessage` | `string` | `''` | Custom empty-state message; falls back to `DS_LIST_PAGINATION_EMPTY` translation |

**Outputs:**

| Output | Payload | Description |
|---|---|---|
| `pageChange` | `{ pageIndex: number; pageSize: number }` | Emitted when the user navigates to a different page |

**Usage:**

```html
<ui-list-with-pagination
  [pageIndex]="_pageIndex()"
  [pageSize]="_pageSize"
  [totalItems]="_allItems().length"
  (pageChange)="_onPageChange($event)"
  style="height: 26rem;">
  @for (item of _pagedItems(); track item.id) {
    <ui-simple-list-item>...</ui-simple-list-item>
  }
</ui-list-with-pagination>
```

The consumer is responsible for managing page state and slicing the data. The component is stateless — it only emits `pageChange` and renders whatever items are projected into `ng-content`.

**RTL/LTR Behavior:**
- Previous/next button order and footer layout adapt automatically via CSS logical properties
- No hardcoded direction attributes needed in the consuming template

Use `UiListWithPaginationComponent` whenever a list needs client-side previous/next pagination without managing scroll or item rendering internally.

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

### Table Component

The shared table is implemented in:

- `libs/shared/ui/src/lib/components/table/`

Its interactive documentation is implemented in:

- `apps/erp-web/src/app/dev-tools/story-book/pages/table/`

The table supports:

- column definitions via `TableColumnDef[]` with type, label, sortable, filterable, summarizable flags
- multi-row checkbox selection via `selectable` input
- per-row action buttons via `actions` input (`TableRowAction[]`)
- bulk actions on selected rows via `bulkActions` input (`TableBulkAction[]`)
- server-side or client-side pagination via `paginator` and `pageSize` inputs
- client-side column filtering with filter chip display via `showColumnFilters` and `showFilterChips`
- column sorting with sort indicator
- drag-and-drop column reordering via `reorderableColumns`
- sticky column pinning (start/end) via `pinnableColumns`
- column visibility panel (show/hide columns) via `columnVisibility`
- column grouping via `groupable`
- summary row for numeric/summarizable columns via `showSummaryRow`
- skeleton loading state via `loading` and `skeletonRows`
- empty state with custom icon (`emptyIcon`) and message
- drag-and-drop row reordering via `rowReorderable`
- size variants: `'sm' | 'md' | 'lg'`
- striped row style via `striped`
- full RTL/LTR support with reactive direction detection
- translatable story-book examples for Persian and English

#### Auto-Translation via DS_TABLE_* Keys

All UI labels inside the table (empty message, pagination labels, group labels, column settings panel title, etc.) are auto-translated through `DS_TABLE_*` i18n keys. Consumers do **not** need to pass label inputs; the component reads the current language and resolves all labels internally.

Label inputs (`emptyMessage`, `noResultsMessage`, `groupByLabel`, etc.) still exist but default to `null`. When `null`, the component falls back to the auto-translated `DS_TABLE_*` key. Only pass a label input when you need to override the default translation for a specific instance.

#### Column Visibility Panel

The column visibility panel uses the following shared components internally:

- `UiCardComponent` / `UiCardHeaderDirective` — panel container
- `UiSimpleListComponent` / `UiSimpleListItemComponent` — item list
- `UiCheckboxComponent` — per-column toggle

Consumers do not need to configure the panel; it renders automatically when `[columnVisibility]="true"`.

#### Group Row Count

Group header rows display the item count as a `<ui-tag severity="primary">` badge.

#### Sticky Cell Background

Sticky (pinned) column cells use a `--_cell-bg` CSS custom property pattern. Each row state sets the property:

```scss
.ui-table__row {
  --_cell-bg: var(--bg-table-row);
  &:hover { --_cell-bg: var(--bg-table-row-hover); }
  &--selected { --_cell-bg: color-mix(in srgb, var(--bg-brand-primary) 30%, var(--bg-table-row)); }
  &--selected:hover { --_cell-bg: var(--bg-brand-secondary); }
  &--summary { --_cell-bg: var(--bg-table-header); }
}
.ui-table__row--group-header { --_cell-bg: var(--bg-secondary); }
```

Sticky cells read `background: var(--_cell-bg)` so they always render fully opaque regardless of the row state, including partially transparent selected rows.

#### Card-Based Layout

The table wraps all of its content inside `UiCardComponent`:

- Toolbar row → `[uiCardHeader]` slot
- Scroll table area → default card body slot
- Paginator → `[uiCardFooter]` slot (wrapped in a `.ui-table__footer` div)

Internal card padding is suppressed via CSS custom properties on `:host` (`--ui-card-header-padding-inline: 0px`, `--ui-card-body-padding-inline: 0px`, etc.) so the table content and toolbar extend edge-to-edge.

Use `UiTableComponent` for all data-grid needs in the ERP application. Do not build local table components.

### Tree View Component

The shared tree view is implemented in:

- `libs/shared/ui/src/lib/components/tree-view/`

The family includes three components:

- `ui-tree-view.component` — Root container that renders a flat list of root-level `UiTreeViewNodeComponent` instances
- `ui-tree-view-node.component` — Recursive node that renders its label, a collapse/expand toggle, and its children
- `ui-tree-view-grid.component` — Complete tree management panel combining toolbar, search, and `UiTreeViewComponent` in a card layout

Its interactive documentation is implemented in:

- `apps/erp-web/src/app/dev-tools/story-book/pages/tree-view/`

The tree view supports:

- recursive, arbitrarily deep node trees
- expand/collapse toggle per branch node
- pre-expanded nodes via `expanded: true` on the `UiTreeNode` data object
- node selection via `(nodeSelected)` output emitting the selected node `id`
- depth-based indentation using a `--tree-node-depth` CSS custom property
- full RTL/LTR support: collapsed arrow reacts to the active language via `TranslateService` — shows `chevron-left` in RTL (Persian) and `chevron-right` in LTR
- token-driven styling
- `OnPush` change detection

**Component API:**

`UiTreeViewComponent` inputs/outputs:

| Name | Type | Default | Description |
|---|---|---|---|
| `nodes` | `UiTreeNode[]` | `[]` | Array of root nodes to render |
| `(nodeSelected)` | `string \| number` | — | Emitted with the selected node `id` when a label is clicked |

`UiTreeNode` interface:

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string \| number` | Yes | Unique identifier; emitted on selection |
| `label` | `string` | Yes | Display text rendered for the node |
| `children` | `UiTreeNode[]` | No | Nested child nodes; absence means leaf node |
| `expanded` | `boolean` | No | Initial expand state; defaults to `false` |

**RTL/LTR Behavior:**
- The collapse chevron switches between `chevron-right` (LTR) and `chevron-left` (RTL) reactively via `toSignal(translateService.onLangChange)` inside `UiTreeViewNodeComponent`
- Depth indentation uses `padding-inline-start` (logical property) so it automatically mirrors in RTL
- No manual `dir` attribute or CSS `transform` overrides are needed in consuming templates

### UiTreeViewGridComponent

A complete tree management panel that combines toolbar, search, and `UiTreeViewComponent` inside a `UiCardComponent` wrapper.

**Implemented in:** `libs/shared/ui/src/lib/components/tree-view/`

**Story-book:** section within `apps/erp-web/src/app/dev-tools/story-book/pages/tree-view/`

Features:

- Toolbar with "Add Root" button, expand/collapse all, and a search field via `UiInputComponent`
- Export buttons (download sample, upload, spreadsheet)
- Uses `UiCardComponent` with toolbar in `[uiCardHeader]` and tree body in the default slot
- Search filters nodes reactively
- Expand all is triggered automatically when a new root node is added
- Version counter pattern for expand/collapse all: `signal<{ expand: boolean; version: number } | null>` ensures repeated same-direction clicks always trigger change detection
- Full RTL/LTR support; empty state with `git-branch` icon and translated message

**Inputs and outputs mirror `UiTreeViewComponent`** plus:

| Name | Type | Description |
|---|---|---|
| `(nodeDelete)` | `string \| number` | Emitted with the node `id` when the delete button is clicked |
| `(nodeAdd)` | `void` | Emitted when the "Add Root" button is clicked |

Use `UiTreeViewGridComponent` for all tree management panels. Do not build local toolbar + tree combinations.

Use `UiTreeViewComponent` for all hierarchical tree or category-navigation needs. Do not build local recursive tree components.

Update this document whenever:

- a new shared UI component is added
- an existing shared component gains a new public capability
- a component story-book page moves or is renamed
- a shared component is deprecated or replaced

This update is mandatory whenever work touches `libs/shared/ui`. If a shared UI component is added or changed, this catalog must be reviewed and updated in the same task.
