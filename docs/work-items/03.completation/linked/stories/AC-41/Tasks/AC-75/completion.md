# AC-75 — Task Completion

## Summary

- **Task:** AC-75
- **Related Story:** AC-41 — Implement Unified Design System, Global Theming, and Core Shared UI Components
- **Title:** FE - Tree View Component
- **Scope:** FRONT (`accounting-frontend`)
- **Status:** Completed — ready for review
- **Completed:** 2026-05-22

---

## Description

Implemented `UiTreeViewComponent` and `UiTreeViewNodeComponent` as Angular standalone components in `libs/shared/ui/src/lib/components/tree-view/`. The component renders hierarchical data with expand/collapse behavior per node, driven by a recursive `UiTreeNode[]` input (fields: `id`, `label`, optional `children`, optional `expanded`). Depth-aware indentation is RTL/LTR-safe, powered by the `--tree-node-depth` CSS custom property and logical CSS `padding-inline-start`. All styling is token-driven with zero hardcoded values, and the component is fully documented with a Storybook page covering 8 demo sections plus API reference. This provides a reusable, accessible tree visualization primitive so any ERP feature that needs hierarchical data rendering uses a single, consistent component.

---

## Acceptance Criteria

- **AOC-01:** `UiTreeViewComponent` accepts `nodes: UiTreeNode[]` input and renders root-level hierarchical data.
  - ✅ `UiTreeViewComponent` with `nodes = input<UiTreeNode[]>([])` and `nodeSelected = output<string | number>()`. Renders root nodes via `@for (node of nodes(); track node.id)` using `UiTreeViewNodeComponent`.

- **AOC-02:** `UiTreeViewNodeComponent` handles expand/collapse state per node.
  - ✅ Expand state managed via `expanded = signal<boolean>(false)`, initialized from `node().expanded ?? false` in `ngOnInit`. `toggleExpanded()` method flips state. Children rendered with `@if (!isLeaf() && expanded())` guard.

- **AOC-03:** Leaf vs. branch node detection with appropriate toggle or spacer.
  - ✅ `isLeaf = computed(() => !node().children?.length)`. Leaf nodes display `<span class="tree-node__spacer">` for alignment. Branch nodes display `<button class="tree-node__toggle">` with `aria-expanded` and a directional chevron icon.

- **AOC-04:** Node selection event emission and bubbling through tree depth.
  - ✅ `nodeSelected` output on `UiTreeViewNodeComponent` emits `node().id` on row click. Child `nodeSelected` events bubble up through `(nodeSelected)="nodeSelected.emit($event)"` at each depth level.

- **AOC-05:** Depth-aware, RTL/LTR-safe indentation via `--tree-node-depth` CSS variable.
  - ✅ Host binding `'[style.--tree-node-depth]': 'depth()'` passes depth to CSS. SCSS uses `padding-inline-start: calc(var(--gap-sm) * var(--tree-node-depth, 0) + var(--padding-sm))` — a logical CSS property that auto-flips in RTL.

- **AOC-06:** All styling is token-driven; zero hardcoded color/spacing values.
  - ✅ `ui-tree-view-node.component.scss` uses exclusively semantic CSS variables: `--gap-xs`, `--padding-xs`, `--padding-sm`, `--gap-sm`, `--border-secondary`, `--fg-primary`, `--fg-secondary`, `--surface-hover`, `--color-accent`, `--radius-sm`, `--text-sm`. No hardcoded hex/rgb values.

- **AOC-07:** RTL chevron icon direction adapts to active locale.
  - ✅ Toggle chevron: `'chevron-down'` when expanded; `'chevron-left'` (RTL) or `'chevron-right'` (LTR) when collapsed. RTL state derived from `TranslateService.onLangChange` pipe: `toSignal(onLangChange.pipe(map(({ lang }) => lang === 'fa')))`.

- **AOC-08:** Components exported from shared UI library; importable as `@accounting-erp/shared/ui`.
  - ✅ `UiTreeViewComponent`, `UiTreeViewNodeComponent`, and `UiTreeNode` exported from `libs/shared/ui/src/lib/components/tree-view/index.ts` and re-exported from `libs/shared/ui/src/lib/components/index.ts`.

- **AOC-09:** Storybook page covers all tree states in both themes and RTL/LTR.
  - ✅ 9 storybook sections: Overview, Flat List (No Children), Single-Level Nesting, Multi-Level Nesting, All Expanded, All Collapsed, Node Selection (interactive), RTL Layout, Component API. Route registered at `tree-view` in `story-book.routes.ts` and navigation entry added to `story-book-shell.component.ts`.

- **AOC-10:** Translation keys added to `en.json` and `fa.json`.
  - ✅ 21 bilingual translation keys added: `DS_TREE_VIEW_TITLE`, `DS_TREE_VIEW_LEAD`, `DS_TREE_VIEW_EXPAND_ARIA`, `DS_TREE_VIEW_COLLAPSE_ARIA`, `DS_TREE_VIEW_SECTION_*` (8 keys), `DS_TREE_VIEW_SELECTED_NODE`, `DS_TREE_VIEW_API_*` (7 keys). All component aria labels and storybook labels use i18n keys.

---

## Definition of Done

- **DOD-01:** Components fully implemented and compiling.
  - ✅ `UiTreeViewComponent` (inline template + styles) and `UiTreeViewNodeComponent` (separate template + SCSS) fully implemented. No compilation errors.

- **DOD-02:** All styling token-driven; zero hardcoded values.
  - ✅ SCSS uses semantic CSS variables exclusively. `padding-inline-start` uses depth-based `calc()` expression with token variables. No hardcoded hex/rgb/px color values.

- **DOD-03:** Storybook page covers all states in light/dark themes and RTL/LTR.
  - ✅ 9 story sections rendered: flat list, single/multi-level nesting, all expanded/collapsed states, node selection with event display, RTL layout demo, and API reference. Theme and RTL toggles verified.

- **DOD-04:** Components exported from shared UI; importable.
  - ✅ Barrel exports configured. `UiTreeViewComponent`, `UiTreeViewNodeComponent`, `UiTreeNode` importable from `@accounting-erp/shared/ui`.

- **DOD-05:** Unit test suite passes; all test cases green.
  - ✅ 20 total tests across 2 spec files. Node component: 14 tests covering leaf/branch rendering, expand/collapse toggle, event emission, and depth CSS variable. Tree view component: 6 tests covering root node rendering, label rendering, event bubbling, and depth assignment.

- **DOD-06:** i18n keys added and used.
  - ✅ 21 translation keys added to `en.json` and `fa.json`. Component aria labels and storybook section headers use `| translate` pipe.

---

## Dependency Status

| Dependency | Status | Notes |
|---|---|---|
| AC-64 (Token Audit & Standardization) | ✅ COMPLETE | Semantic spacing and color token variables available |
| AC-65 (Theme Engine) | ✅ COMPLETE | Light/dark theme switching functional; component auto-adapts |
| AC-66 (Theme Persistence & No-Flicker Initialization) | ✅ COMPLETE | Theme persistence available for Storybook demo |
| AC-71 (Icon Component) | ✅ COMPLETE | `UiIconComponent` used for expand/collapse chevron icons |

---

## Implementation Artifacts

### Frontend Changes (accounting-frontend)

| Artifact | Path | Type | Status |
|----------|------|------|--------|
| Tree View Component | `libs/shared/ui/src/lib/components/tree-view/ui-tree-view.component.ts` | Component (inline template) | ✅ Complete |
| Tree View Styles | `libs/shared/ui/src/lib/components/tree-view/ui-tree-view.component.scss` | Styles | ✅ Complete |
| Tree View Unit Tests | `libs/shared/ui/src/lib/components/tree-view/ui-tree-view.component.spec.ts` | Test Suite | ✅ Complete (6 tests) |
| Tree View Node Component | `libs/shared/ui/src/lib/components/tree-view/ui-tree-view-node.component.ts` | Component | ✅ Complete |
| Tree View Node Template | `libs/shared/ui/src/lib/components/tree-view/ui-tree-view-node.component.html` | Template | ✅ Complete |
| Tree View Node Styles | `libs/shared/ui/src/lib/components/tree-view/ui-tree-view-node.component.scss` | Styles | ✅ Complete |
| Tree View Node Unit Tests | `libs/shared/ui/src/lib/components/tree-view/ui-tree-view-node.component.spec.ts` | Test Suite | ✅ Complete (14 tests) |
| Component Barrel Export | `libs/shared/ui/src/lib/components/tree-view/index.ts` | Export | ✅ Complete |
| Components Index Re-export | `libs/shared/ui/src/lib/components/index.ts` | Export | ✅ Complete (patched) |
| Storybook Component | `apps/erp-web/src/app/dev-tools/story-book/pages/tree-view/tree-view-story-book.component.ts` | Story | ✅ Complete |
| Storybook Template | `apps/erp-web/src/app/dev-tools/story-book/pages/tree-view/tree-view-story-book.component.html` | Story Template | ✅ Complete |
| Route Registration | `apps/erp-web/src/app/dev-tools/story-book/story-book.routes.ts` | Configuration | ✅ Complete (patched) |
| Sidebar Navigation Entry | `apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.ts` | Configuration | ✅ Complete (patched) |
| i18n English Keys | `public/assets/i18n/en.json` | Translation | ✅ Complete (21 keys) |
| i18n Persian Keys | `public/assets/i18n/fa.json` | Translation | ✅ Complete (21 keys) |

---

## Test Results

### Unit Tests — `UiTreeViewNodeComponent`
- **Test File:** `libs/shared/ui/src/lib/components/tree-view/ui-tree-view-node.component.spec.ts`
- **Test Framework:** Jasmine + Angular TestBed (Vitest-compatible)
- **Test Count:** 14

| # | Test Case | Result |
|---|-----------|--------|
| 1 | should render the component | ✅ |
| 2 | should NOT render the toggle button for a leaf node | ✅ |
| 3 | should render the spacer element for leaf alignment | ✅ |
| 4 | should render the node label | ✅ |
| 5 | should render the toggle button for a branch node | ✅ |
| 6 | should NOT render the spacer for a branch node | ✅ |
| 7 | should not render children container when collapsed (default) | ✅ |
| 8 | should render children container when node.expanded is true | ✅ |
| 9 | should reveal children after clicking toggle on a collapsed node | ✅ |
| 10 | should hide children after clicking toggle twice | ✅ |
| 11 | should emit the node id when the row is clicked | ✅ |
| 12 | should NOT emit nodeSelected when only the toggle is clicked | ✅ |
| 13 | should set --tree-node-depth to 0 when depth input is 0 | ✅ |
| 14 | should set --tree-node-depth to 2 when depth input is 2 | ✅ |

### Unit Tests — `UiTreeViewComponent`
- **Test File:** `libs/shared/ui/src/lib/components/tree-view/ui-tree-view.component.spec.ts`
- **Test Count:** 6

| # | Test Case | Result |
|---|-----------|--------|
| 1 | should render the correct number of root-level nodes | ✅ |
| 2 | should render each root node label | ✅ |
| 3 | should bubble nodeSelected from a nested node to the root output | ✅ |
| 4 | should assign --tree-node-depth=0 to root-level nodes | ✅ |
| 5 | should assign --tree-node-depth=1 to first-level children | ✅ |
| 6 | should assign --tree-node-depth=2 to second-level children | ✅ |

**Total: 20 tests — all passing**

---

## Traceability

| Link | URL |
|------|-----|
| Jira Task | https://nexttoptech.atlassian.net/browse/AC-75 |
| Parent Story | https://nexttoptech.atlassian.net/browse/AC-41 |
| GitLab Workspace Issue | https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/work_items/13 |
| GitLab Workspace MR 53 | https://gitlab.com/next-top-tech/accounting/accounting-workspace/-/merge_requests/53 |
| GitLab Frontend Issue | https://gitlab.com/next-top-tech/accounting/accounting-frontend/-/work_items/3 |
| GitLab Frontend MR 18 | https://gitlab.com/next-top-tech/accounting/accounting-frontend/-/merge_requests/18 |
| Storybook (local) | http://localhost:4200/story-book/tree-view |

---

## Handoff Notes

- Release notes input: New `UiTreeViewComponent` and `UiTreeViewNodeComponent` added to shared UI library — reusable recursive tree for hierarchical data visualization.
- Operations notes: N/A — frontend-only component with no backend dependencies.

## Outstanding Items

- N/A
