# AC-75 Implementation Changelog

**Task:** FE - Tree View Component  
**Status:** Completed  
**Date:** 2026-05-22

## What Was Delivered

Implemented `UiTreeViewComponent` and `UiTreeViewNodeComponent` as reusable, recursive Angular standalone components for hierarchical data visualization. The tree renders nodes from a `UiTreeNode[]` input with per-node expand/collapse state, selection event bubbling, and depth-driven RTL/LTR-safe indentation via CSS custom properties. Styling is entirely token-driven with zero hardcoded values, and the component is documented with a 9-section Storybook page.

### 1. UiTreeViewComponent (Root)

**Design/Approach:** Lightweight root component that renders a flat list of root-level `UiTreeNode` items, delegating all recursive depth handling and expand/collapse behavior to `UiTreeViewNodeComponent`.

**Features:**
- `nodes = input<UiTreeNode[]>([])` — accepts recursive tree data
- `nodeSelected = output<string | number>()` — bubbles selection events from any depth
- Renders root nodes via `@for (node of nodes(); track node.id)` with `UiTreeViewNodeComponent`
- Inline template with `:host { display: flex; flex-direction: column; }` styles
- `ChangeDetectionStrategy.OnPush` and `standalone: true`

### 2. UiTreeViewNodeComponent (Recursive Node)

**Design/Approach:** Self-referencing standalone component that handles one level of the tree. Recurses by rendering `<ui-tree-view-node>` children with `depth + 1`, allowing unlimited nesting.

**Features:**
- `node = input.required<UiTreeNode>()` — required node data
- `depth = input<number>(0)` — controls CSS indentation via `--tree-node-depth` host binding
- `nodeSelected = output<string | number>()` — emitted on row click, bubbled from children
- `expanded = signal<boolean>(false)` — local expand state, initialized from `node().expanded` in `ngOnInit`
- `isLeaf = computed(() => !node().children?.length)` — determines leaf vs. branch rendering
- Toggle button with `aria-expanded` and directional chevron (`chevron-down` / `chevron-left` (RTL) / `chevron-right` (LTR))
- RTL detection via `TranslateService.onLangChange` → `toSignal()` for reactive locale awareness
- Children container guarded by `@if (!isLeaf() && expanded())`

### 3. Depth-Aware RTL/LTR-Safe Indentation

**Design/Approach:** Host binding passes depth as a CSS custom property, which SCSS consumes as a multiplier for `padding-inline-start` — a logical CSS property that automatically flips in RTL layout.

**Features:**
- `host: { '[style.--tree-node-depth]': 'depth()' }` — sets `--tree-node-depth` on the host element
- SCSS: `padding-inline-start: calc(var(--gap-sm) * var(--tree-node-depth, 0) + var(--padding-sm))`
- Logical CSS throughout (`padding-block`, `padding-inline`, `flex-direction: column`) — no hardcoded `left`/`right`/`top`/`bottom`
- Chevron direction adapts per locale for natural RTL navigation

### 4. Token-Driven Styling

**Design/Approach:** 100% semantic CSS variable usage — no hardcoded colors, spacing, or size values.

**Features:**
- Spacing: `--gap-xs`, `--padding-xs`, `--padding-sm`, `--gap-sm`
- Colors: `--border-secondary`, `--fg-primary`, `--fg-secondary`, `--surface-hover`, `--color-accent`
- Typography: `--text-sm`
- Borders/Radius: `--radius-sm`
- Automatic light/dark theme support via CSS variables from Theme Engine (AC-65)

### 5. Storybook Documentation

**Design/Approach:** Full-featured Storybook page with 9 sections covering all rendering states, interaction patterns, RTL layout, and API reference.

**Sections:**
1. **Overview** — Component introduction with title and lead description
2. **Flat List (No Children)** — Leaf-only nodes with spacer alignment
3. **Single-Level Nesting** — Two-depth tree with toggleable children
4. **Multi-Level Nesting** — Deep recursive tree (3+ levels)
5. **All Expanded** — Pre-expanded tree (`expanded: true` on all nodes)
6. **All Collapsed** — Pre-collapsed tree (default collapsed state)
7. **Node Selection** — Interactive demo showing `nodeSelected` event output
8. **RTL Layout** — Full RTL demo with `dir="rtl"` and locale-aware chevrons
9. **Component API** — API reference for inputs, outputs, and `UiTreeNode` interface

### 6. Barrel Exports & API Surface

**Design/Approach:** Full export chain so the component is importable via the shared UI library path.

**Features:**
- `libs/shared/ui/src/lib/components/tree-view/index.ts` exports `UiTreeViewComponent`, `UiTreeViewNodeComponent`, and `UiTreeNode`
- Re-exported from `libs/shared/ui/src/lib/components/index.ts`
- Importable as: `import { UiTreeViewComponent, UiTreeViewNodeComponent, type UiTreeNode } from '@accounting-erp/shared/ui'`

### 7. Internationalization & Accessibility

**Design/Approach:** Bilingual support (English + Persian) with accessible ARIA attributes on toggle buttons.

**Features:**
- 21 translation keys added to `public/assets/i18n/en.json` and `public/assets/i18n/fa.json`:
  - `DS_TREE_VIEW_TITLE`, `DS_TREE_VIEW_LEAD`
  - `DS_TREE_VIEW_EXPAND_ARIA`, `DS_TREE_VIEW_COLLAPSE_ARIA`
  - `DS_TREE_VIEW_SECTION_OVERVIEW`, `DS_TREE_VIEW_SECTION_FLAT`, `DS_TREE_VIEW_SECTION_SINGLE_LEVEL`, `DS_TREE_VIEW_SECTION_MULTI_LEVEL`, `DS_TREE_VIEW_SECTION_ALL_EXPANDED`, `DS_TREE_VIEW_SECTION_ALL_COLLAPSED`, `DS_TREE_VIEW_SECTION_SELECTION`, `DS_TREE_VIEW_SECTION_RTL`, `DS_TREE_VIEW_SECTION_API`
  - `DS_TREE_VIEW_SELECTED_NODE`, `DS_TREE_VIEW_API_DESCRIPTION`, `DS_TREE_VIEW_API_NODES`, `DS_TREE_VIEW_API_NODE_SELECTED`, `DS_TREE_VIEW_API_NODE_ID`, `DS_TREE_VIEW_API_NODE_LABEL`, `DS_TREE_VIEW_API_NODE_CHILDREN`
- Toggle button: `[attr.aria-label]` bound to `DS_TREE_VIEW_EXPAND_ARIA` / `DS_TREE_VIEW_COLLAPSE_ARIA` via `translate` pipe
- Toggle button: `[attr.aria-expanded]="expanded()"` for screen reader state

## Files Changed

### Frontend Component Implementation

- **`libs/shared/ui/src/lib/components/tree-view/ui-tree-view.component.ts`** *(NEW)*
  - Root tree component with inline template; `nodes` input, `nodeSelected` output, OnPush + standalone

- **`libs/shared/ui/src/lib/components/tree-view/ui-tree-view.component.scss`** *(NEW)*
  - Host flexbox layout (`:host { display: flex; flex-direction: column; }`)

- **`libs/shared/ui/src/lib/components/tree-view/ui-tree-view.component.spec.ts`** *(NEW)*
  - 6 unit tests: root node rendering count, label rendering, event bubbling, depth CSS variable assignment at depth 0/1/2

- **`libs/shared/ui/src/lib/components/tree-view/ui-tree-view-node.component.ts`** *(NEW)*
  - Recursive node component; expand/collapse signal, isLeaf computed, RTL detection, depth host binding

- **`libs/shared/ui/src/lib/components/tree-view/ui-tree-view-node.component.html`** *(NEW)*
  - Node template: toggle button or spacer, label, recursive children container with `@if`/`@for`

- **`libs/shared/ui/src/lib/components/tree-view/ui-tree-view-node.component.scss`** *(NEW)*
  - Token-driven styles for row, toggle, spacer, label, children; logical CSS; `--tree-node-depth` indentation

- **`libs/shared/ui/src/lib/components/tree-view/ui-tree-view-node.component.spec.ts`** *(NEW)*
  - 14 unit tests: leaf/branch rendering, expand/collapse toggle, children visibility, event emission, depth CSS variable

- **`libs/shared/ui/src/lib/components/tree-view/index.ts`** *(NEW)*
  - Barrel export: `UiTreeViewComponent`, `UiTreeViewNodeComponent`, `UiTreeNode`

### Integration & Configuration

- **`libs/shared/ui/src/lib/components/index.ts`** *(PATCHED)*
  - Added re-export for `UiTreeViewComponent`, `UiTreeViewNodeComponent`, `UiTreeNode`

- **`apps/erp-web/src/app/dev-tools/story-book/pages/tree-view/tree-view-story-book.component.ts`** *(NEW)*
  - Storybook story with 9 sections; tree fixtures for flat, single/multi-level, expanded/collapsed, selection, and RTL demos

- **`apps/erp-web/src/app/dev-tools/story-book/pages/tree-view/tree-view-story-book.component.html`** *(NEW)*
  - Story template with all demo sections, preview containers, and API table

- **`apps/erp-web/src/app/dev-tools/story-book/story-book.routes.ts`** *(PATCHED)*
  - Route registered at path `'tree-view'` with lazy-loaded `TreeViewStoryBookComponent`

- **`apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.ts`** *(PATCHED)*
  - Sidebar navigation entry added: path `/story-book/tree-view`, label key `DS_TREE_VIEW_TITLE`

### Internationalization

- **`public/assets/i18n/en.json`** *(PATCHED)*
  - Added 21 tree-view translation keys (English)

- **`public/assets/i18n/fa.json`** *(PATCHED)*
  - Added 21 tree-view translation keys (Persian)

## Quality Metrics

- **Unit Tests:** 20 tests across 2 spec files — all passing
  - Node component: 14 tests (leaf rendering, branch rendering, toggle behavior, event emission, depth variable)
  - Tree view root: 6 tests (node count, label rendering, event bubbling, depth hierarchy)

- **Code Quality:**
  - Zero hardcoded hex/rgb values (100% token-driven)
  - OnPush change detection + standalone component pattern
  - Signal-based inputs/outputs (Angular 18+ modern API)
  - No compilation warnings or errors

- **Browser/Theme Coverage:**
  - Light/dark theme verified via CSS variable system
  - RTL/LTR layout verified: depth indentation flips, chevron direction adapts
  - Storybook demo sections tested in both directions

## Dependencies Resolved

All dependent tasks completed:
- ✅ AC-64 (Token Audit & Standardization) — Semantic tokens available
- ✅ AC-65 (Theme Engine) — Theme switching functional
- ✅ AC-66 (Theme Persistence) — Persistence layer available
- ✅ AC-71 (Icon Component) — `UiIconComponent` used for chevron icons

## Traceability

- **Jira Task:** [AC-75](https://nexttoptech.atlassian.net/browse/AC-75)
- **Parent Story:** [AC-41](https://nexttoptech.atlassian.net/browse/AC-41)
- **GitLab Workspace Issue:** https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/work_items/13
- **Workspace MR:** https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/53
- **GitLab Frontend Issue:** https://gitlab.com/next-top-tech/accounting/accounting-frontend/-/work_items/3
- **Frontend Project MR:** https://gitlab.com/next-top-tech/accounting/accounting-frontend/-/merge_requests/18
- **Storybook:** http://localhost:4200/story-book/tree-view
