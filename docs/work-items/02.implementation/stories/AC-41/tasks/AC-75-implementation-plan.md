# Implementation Plan: AC-75 — FE - Tree View Component

## 1. Task Identity

- **Jira Task**: [AC-75 — FE - Tree View Component](https://nexttoptech.atlassian.net/browse/AC-75)
- **Parent Story**: [AC-41 — Implement Unified Design System, Global Theming, and Core Shared UI Components](https://nexttoptech.atlassian.net/browse/AC-41)
- **Type**: Subtask / Frontend / UI Component
- **Fix Version**: V 0.1 (MVP)
- **Repository Target**: FRONT (Accounting-Frontend)
- **Labels**: `frontend`, `shared-ui`, `components`, `storybook`
- **Feature Branch**: `features/ac-75-fe-tree-view-component`
- **Target Branch**: `develop`
- **Status**: Ready for TL Approval

---

## 2. Task Readiness Checklist

| Item | Status | Notes |
|------|--------|-------|
| AoC (12 items) | ✅ Complete | All criteria are verifiable and implementation-targeted |
| DoD (7 items) | ✅ Complete | Covers components, tests, tokens, exports, translations |
| TDD Coverage | ✅ Complete | Unit tests and integration tests specified with behavioral expectations |
| BDD Scenarios | ✅ Complete | 3 scenarios with full Given/When/Then structure |
| Goal | ✅ Defined | Shared tree view primitive for hierarchical ERP data |
| Problem-To-Solve | ✅ Defined | Eliminate duplicated recursive rendering across features |
| Fix Version | ✅ V 0.1 (MVP) | Inherited from parent story AC-41 |
| Dependency AC-64 | ✅ Complete | Token Audit & Standardization done; `_semantic.scss` finalized |
| Dependency AC-78 | ✅ Complete | Interactive state and semantic aliases added |
| Tree-view folder | ✅ Greenfield | Neither component nor Storybook folder exists — clean start |

> **Dependency risk (TBD-01)**: Task note references spacing tokens for indentation as TBD. Since AC-64 and AC-78 are complete and `_semantic.scss` includes the full spacing scale (`--gap-xs` through `--gap-xl`, `--padding-xs` through `--padding-xl`), the dependency is satisfied. Indentation will use `--gap-sm` (`8px`) per depth level via a CSS custom property depth multiplier approach.

---

## 3. Scope & Assumptions

### In Scope

- `UiTreeViewComponent` — root tree container (standalone, OnPush)
- `UiTreeViewNodeComponent` — recursive node renderer (standalone, OnPush)
- `UiTreeNode` interface with `id`, `label`, `children?`, `expanded?`
- Internal expand/collapse state management per node
- `nodeSelected` output emitting selected node `id`
- Token-driven indentation via `--gap-sm` per depth level
- Logical CSS properties for RTL/LTR safety
- Storybook page at `apps/erp-web/src/app/dev-tools/story-book/pages/tree-view/`
- Route registration in `story-book.routes.ts`
- Sidebar navigation entry in `story-book-shell.component.ts`
- Translation keys in `public/assets/i18n/en.json` and `public/assets/i18n/fa.json`
- Barrel export from `libs/shared/ui/src/lib/components/index.ts`

### Out of Scope

- Drag-and-drop node reordering
- Inline node editing
- Lazy loading of children from API
- Checkbox-based multi-select tree
- Virtual scrolling for large trees

### Assumptions

1. `_semantic.scss` spacing tokens (`--gap-xs`, `--gap-sm`, etc.) are the approved source for indentation; no new tree-specific tokens are introduced unless AC-64 requires it.
2. Indentation per depth level: `calc(var(--gap-sm) * depth)` using a CSS custom property `--tree-node-depth` set inline per node.
3. Expand/collapse state is managed internally (`signal<boolean>`) in `UiTreeViewNodeComponent`, initialized from the `node.expanded` input if provided.
4. Angular signal-based `input()` API is used (consistent with `UiSimpleListItemComponent` pattern).
5. `ChangeDetectionStrategy.OnPush` is used for both components.
6. Each `UiTreeViewNodeComponent` self-recurses via importing itself — Angular standalone supports self-referencing components.
7. Toggle icon uses `UiIconComponent` from the shared UI library (existing component).
8. No `NgModule`; no `CommonModule` import (use Angular 17+ control flow: `@if`, `@for`).

---

## 4. Repository Routing Matrix

All changes are scoped to **Accounting-Frontend** project repository, except the plan document itself.

| Artifact Type | Location | Repository | Purpose |
|---|---|---|---|
| Component source | `libs/shared/ui/src/lib/components/tree-view/` | Accounting-Frontend | `UiTreeViewComponent`, `UiTreeViewNodeComponent`, interface |
| Component tests | `libs/shared/ui/src/lib/components/tree-view/*.spec.ts` | Accounting-Frontend | Unit and integration tests |
| Component barrel export | `libs/shared/ui/src/lib/components/tree-view/index.ts` | Accounting-Frontend | Tree-view barrel export |
| Shared UI barrel | `libs/shared/ui/src/lib/components/index.ts` | Accounting-Frontend | Add tree-view exports |
| Storybook page | `apps/erp-web/src/app/dev-tools/story-book/pages/tree-view/` | Accounting-Frontend | Component showcase |
| Storybook routes | `apps/erp-web/src/app/dev-tools/story-book/story-book.routes.ts` | Accounting-Frontend | Route `tree-view` |
| Storybook sidebar | `apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.ts` | Accounting-Frontend | Nav entry |
| Translation keys — EN | `public/assets/i18n/en.json` | Accounting-Frontend | English strings |
| Translation keys — FA | `public/assets/i18n/fa.json` | Accounting-Frontend | Persian strings |
| Task plan | `docs/work-items/02.implementation/stories/AC-41/tasks/AC-75-implementation-plan.md` | accounting-workspace | Process and traceability |

---

## 5. Domain Hierarchy & Folder Naming Map

This task operates in the **Presentation / Shared UI** layer only. No domain, application, or infrastructure layers are touched.

### Component Layer

```
libs/shared/ui/
└── src/
    └── lib/
        └── components/
            └── tree-view/                               ← Entity folder (canonical name)
                ├── ui-tree-view.component.ts            ← Root tree container
                ├── ui-tree-view.component.scss          ← Root styles
                ├── ui-tree-view.component.spec.ts       ← Unit tests for container
                ├── ui-tree-view-node.component.ts       ← Recursive node component
                ├── ui-tree-view-node.component.scss     ← Node styles
                ├── ui-tree-view-node.component.spec.ts  ← Unit tests for node
                └── index.ts                             ← Barrel export
```

### Storybook Layer

```
apps/erp-web/
└── src/
    └── app/
        └── dev-tools/
            └── story-book/
                └── pages/
                    └── tree-view/
                        ├── tree-view-story-book.component.ts
                        └── tree-view-story-book.component.html
```

### Entity-Centric Naming Rules

| Concern | Convention | Example |
|---|---|---|
| Folder name | `tree-view` (kebab-case, entity-canonical) | `libs/.../components/tree-view/` |
| Component selectors | `ui-tree-view`, `ui-tree-view-node` | `<ui-tree-view>`, `<ui-tree-view-node>` |
| Class names | `UiTreeViewComponent`, `UiTreeViewNodeComponent` | PascalCase |
| Interface | `UiTreeNode` | Exported from barrel |
| File names | `ui-tree-view.component.ts`, `ui-tree-view-node.component.ts` | kebab-case |
| Test files | `ui-tree-view.component.spec.ts`, `ui-tree-view-node.component.spec.ts` | |
| Storybook selector | `app-tree-view-story-book` | `TreeViewStoryBookComponent` |

---

## 6. Code-Level Implementation Blueprint

> **No source code is included here** — this is a file/contract map for use by `/speckit.implement`.

### 6.1 Interface: `UiTreeNode`

**File**: `libs/shared/ui/src/lib/components/tree-view/ui-tree-view.component.ts` (or a co-located `ui-tree-node.model.ts`)

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string \| number` | ✅ | Unique identifier; emitted on selection |
| `label` | `string` | ✅ | Display text for the node |
| `children` | `UiTreeNode[]` | ❌ | Nested children; absence = leaf node |
| `expanded` | `boolean` | ❌ | Initial expand state; defaults to `false` |

### 6.2 `UiTreeViewComponent`

**File**: `libs/shared/ui/src/lib/components/tree-view/ui-tree-view.component.ts`

| Concern | Spec |
|---|---|
| Decorator | `@Component` — `standalone: true`, `changeDetection: ChangeDetectionStrategy.OnPush` |
| Selector | `ui-tree-view` |
| Input | `nodes = input<UiTreeNode[]>([])` — signal-based |
| Output | `nodeSelected = output<string \| number>()` |
| Template | `@for (node of nodes(); track node.id)` renders `<ui-tree-view-node>` instances; passes `node` and `nodeSelected` |
| Imports | `[UiTreeViewNodeComponent]` |
| Host binding | None required at root |
| Depth | Root nodes are at depth `0` |

### 6.3 `UiTreeViewNodeComponent`

**File**: `libs/shared/ui/src/lib/components/tree-view/ui-tree-view-node.component.ts`

| Concern | Spec |
|---|---|
| Decorator | `@Component` — `standalone: true`, `changeDetection: ChangeDetectionStrategy.OnPush` |
| Selector | `ui-tree-view-node` |
| Input | `node = input.required<UiTreeNode>()` |
| Input | `depth = input<number>(0)` — incremented per recursion level |
| Output | `nodeSelected = output<string \| number>()` |
| Internal state | `expanded = signal<boolean>(false)` — initialized from `node().expanded ?? false` using `effect()` or `toSignal` on init |
| Template structure | See Section 6.4 |
| Imports | `[UiTreeViewNodeComponent, UiIconComponent, TranslateModule]` — self-import for recursion |
| Host style binding | `[style.--tree-node-depth]="depth()"` — passes depth as CSS custom property |
| Leaf detection | `isLeaf = computed(() => !node().children?.length)` |
| Toggle method | `toggleExpanded()` — flips `expanded` signal; no DOM event needed |
| Select method | `onLabelClick()` — emits `nodeSelected` with `node().id` |

### 6.4 Template Structure for `UiTreeViewNodeComponent`

```
<div class="tree-node">
  <div class="tree-node__row" (click)="onLabelClick()">
    <button class="tree-node__toggle" *ngIf="!isLeaf()" ...aria...>
      <ui-icon [name]="expanded() ? 'chevron-down' : 'chevron-right'" />
    </button>
    <span class="tree-node__spacer" *ngIf="isLeaf()"></span>
    <span class="tree-node__label">{{ node().label }}</span>
  </div>
  @if (!isLeaf() && expanded()) {
    <div class="tree-node__children">
      @for (child of node().children; track child.id) {
        <ui-tree-view-node
          [node]="child"
          [depth]="depth() + 1"
          (nodeSelected)="nodeSelected.emit($event)"
        />
      }
    </div>
  }
</div>
```

> Note: `@if` / `@for` use Angular 17+ control flow. No `*ngIf`/`*ngFor` directives.

### 6.5 Styling Contract for `ui-tree-view-node.component.scss`

| Rule | Token / Value |
|---|---|
| Node row padding | `padding-inline: var(--padding-sm)` |
| Indentation per depth | `padding-inline-start: calc(var(--gap-sm) * var(--tree-node-depth))` |
| Label color | `var(--fg-primary)` or `var(--text-primary)` |
| Toggle icon color | `var(--fg-secondary)` |
| Row hover background | `var(--bg-primary-hover)` |
| Selected row background | `var(--surface-hover)` _(future; not required for AOC — track for AC-78 alignment)_ |
| Row border bottom | `border-block-end: 1px solid var(--border-secondary)` |
| Toggle button | `background: none; border: none; cursor: pointer; display: inline-flex; align-items: center` |
| Spacer (leaf indent) | Same width as the toggle icon to align leaf labels with branch labels |
| Zero hardcoded values | ✅ All spacing and color values must resolve through semantic tokens |
| Logical properties | ✅ `padding-inline-start`, `padding-block`, `border-block-end` |

### 6.6 Barrel Export: `tree-view/index.ts`

Exports: `UiTreeViewComponent`, `UiTreeViewNodeComponent`, `UiTreeNode` (interface)

### 6.7 Update `libs/shared/ui/src/lib/components/index.ts`

Add after the current last entry (`export * from './table'`):
```
export { UiTreeViewComponent, UiTreeViewNodeComponent, type UiTreeNode } from './tree-view';
```

### 6.8 Translation Key Catalog

**Prefix**: `DS_TREE_VIEW_`  
**Files**: `public/assets/i18n/en.json` and `public/assets/i18n/fa.json`

| Key | EN Value | FA Value (example) |
|---|---|---|
| `DS_TREE_VIEW_TITLE` | `"Tree View"` | `"درخت دسته‌بندی"` |
| `DS_TREE_VIEW_LEAD` | `"A recursive, token-driven tree component for hierarchical data. Supports expand/collapse per node, selection events, and RTL-safe indentation."` | _(Persian equivalent)_ |
| `DS_TREE_VIEW_EXPAND_ARIA` | `"Expand node"` | `"باز کردن گره"` |
| `DS_TREE_VIEW_COLLAPSE_ARIA` | `"Collapse node"` | `"بستن گره"` |
| `DS_TREE_VIEW_SECTION_OVERVIEW` | `"Overview"` | `"نمای کلی"` |
| `DS_TREE_VIEW_SECTION_FLAT` | `"Flat List (No Children)"` | `"لیست ساده"` |
| `DS_TREE_VIEW_SECTION_SINGLE_LEVEL` | `"Single-Level Nesting"` | `"یک سطح تودرتو"` |
| `DS_TREE_VIEW_SECTION_MULTI_LEVEL` | `"Multi-Level Nesting"` | `"چند سطح تودرتو"` |
| `DS_TREE_VIEW_SECTION_ALL_EXPANDED` | `"All Expanded"` | `"همه باز"` |
| `DS_TREE_VIEW_SECTION_ALL_COLLAPSED` | `"All Collapsed"` | `"همه بسته"` |
| `DS_TREE_VIEW_SECTION_SELECTION` | `"Node Selection"` | `"انتخاب گره"` |
| `DS_TREE_VIEW_SECTION_RTL` | `"RTL Layout"` | `"چیدمان راست‌به‌چپ"` |
| `DS_TREE_VIEW_SECTION_API` | `"Component API"` | `"مستندات کامپوننت"` |
| `DS_TREE_VIEW_SELECTED_NODE` | `"Selected node ID: {{id}}"` | `"شناسه گره انتخاب‌شده: {{id}}"` |

### 6.9 Storybook Route and Nav Entry

**`story-book.routes.ts`** — add before the closing `]`:
```typescript
{
  path: 'tree-view',
  loadComponent: () => import('./pages/tree-view/tree-view-story-book.component')
    .then(m => m.TreeViewStoryBookComponent)
},
```

**`story-book-shell.component.ts`** — add nav item alongside `DS_SIMPLE_LIST_TITLE` entry:
```typescript
{ path: '/story-book/tree-view', labelKey: 'DS_TREE_VIEW_TITLE' },
```

### 6.10 `TreeViewStoryBookComponent` Contract

**File**: `apps/erp-web/src/app/dev-tools/story-book/pages/tree-view/tree-view-story-book.component.ts`

| Concern | Spec |
|---|---|
| Selector | `app-tree-view-story-book` |
| Implements | `StoryBookPageWithSections` |
| Imports | `UiTreeViewComponent`, `UiTreeViewNodeComponent`, `TranslateModule`, `StoryBookCodeBlockComponent`, `StoryBookPreviewComponent` |
| Protected signals | `_selectedNodeId = signal<string \| number \| null>(null)` |
| Demo trees | `_flatNodes`, `_singleLevelNodes`, `_multiLevelNodes`, `_allExpandedNodes` (typed as `UiTreeNode[]`) |
| Template file | `tree-view-story-book.component.html` |
| Sections | Overview, Flat List, Single-Level, Multi-Level, All Expanded, All Collapsed, Node Selection, RTL Layout, Component API |

---

## 7. Implementation Steps & Dependencies

### Prerequisite

- ✅ AC-64 Token Audit: Complete — `_semantic.scss` is stable.
- ✅ Existing `UiIconComponent` available in shared UI for toggle icon.
- ✅ `StoryBookCodeBlockComponent` and `StoryBookPreviewComponent` available in storybook shared.

### Phase 1: Core Component Implementation

**Step 1.1 — Create folder structure**
- Create `libs/shared/ui/src/lib/components/tree-view/`
- Create 7 files: `.component.ts`, `.component.scss` (×2 components), `.component.spec.ts` (×2), `index.ts`

**Step 1.2 — Define `UiTreeNode` interface**
- Inline in `ui-tree-view.component.ts` or co-located in `ui-tree-view-node.model.ts`
- Export from barrel

**Step 1.3 — Implement `UiTreeViewNodeComponent`**
- Standalone, OnPush, signal-based inputs/outputs
- Self-imports itself for recursion
- Internal `expanded` signal initialized from `node().expanded ?? false`
- `isLeaf = computed(() => !(node().children?.length))`
- `toggleExpanded()` flips signal; click only on toggle button (not full row)
- `onLabelClick()` emits `nodeSelected`
- Aria labels using translation keys: `[attr.aria-label]="(expanded() ? 'DS_TREE_VIEW_COLLAPSE_ARIA' : 'DS_TREE_VIEW_EXPAND_ARIA') | translate"`

**Step 1.4 — Implement `UiTreeViewComponent`**
- Standalone, OnPush, signal-based `nodes` input
- Iterates root nodes with `@for`; passes `depth=0` to each `UiTreeViewNodeComponent`
- Bubbles `nodeSelected` output up

**Step 1.5 — Create barrel `index.ts`**
- Export `UiTreeViewComponent`, `UiTreeViewNodeComponent`, `UiTreeNode`

**Step 1.6 — Style `ui-tree-view-node.component.scss`**
- All values via semantic tokens (see Section 6.5)
- `--tree-node-depth` CSS custom property set via host binding
- Indentation: `padding-inline-start: calc(var(--gap-sm) * var(--tree-node-depth))`
- Toggle spacer for leaf nodes: same width as toggle icon (e.g., `1.25rem` if icon is fixed — use `var(--spacing-5)` which is `1.25rem`)

**Step 1.7 — Update shared components barrel**
- Add `export { UiTreeViewComponent, UiTreeViewNodeComponent, type UiTreeNode } from './tree-view';` to `libs/shared/ui/src/lib/components/index.ts`

### Phase 2: Tests

**Step 2.1 — `ui-tree-view-node.component.spec.ts`**
Implement all TDD unit tests (see Section 8).

**Step 2.2 — `ui-tree-view.component.spec.ts`**
Container-level tests: correct number of root nodes rendered; `nodeSelected` bubbling.

**Step 2.3 — Integration test block**
Three-level deep tree renders with correct DOM structure; RTL logical property resolution.

### Phase 3: Translations

**Step 3.1 — Add keys to `en.json`**
Add all `DS_TREE_VIEW_*` keys from Section 6.8.

**Step 3.2 — Add keys to `fa.json`**
Add Persian equivalents.

### Phase 4: Storybook Page

**Step 4.1 — Create `tree-view-story-book.component.ts`**
Per blueprint in Section 6.10.

**Step 4.2 — Create `tree-view-story-book.component.html`**
Sections: Overview, Flat List, Single-Level, Multi-Level, All Expanded, All Collapsed, Node Selection, RTL Layout, API.

**Step 4.3 — Register route**
Add `tree-view` route in `story-book.routes.ts`.

**Step 4.4 — Register sidebar nav**
Add `{ path: '/story-book/tree-view', labelKey: 'DS_TREE_VIEW_TITLE' }` in `story-book-shell.component.ts` nav array.

---

## 8. TDD Plan

### Execution Order (test-first)

All tests must be written before implementation code is written for the corresponding behavior.

| Order | Test | File | Assertion |
|---|---|---|---|
| 1 | Leaf node renders without toggle button | `ui-tree-view-node.component.spec.ts` | No `.tree-node__toggle` element in DOM when `node.children` is empty/absent |
| 2 | Branch node renders with toggle button | `ui-tree-view-node.component.spec.ts` | `.tree-node__toggle` element present when `node.children` has items |
| 3 | Node starts collapsed when `expanded` not provided | `ui-tree-view-node.component.spec.ts` | Children container absent from DOM |
| 4 | Node starts expanded when `expanded: true` on input | `ui-tree-view-node.component.spec.ts` | Children container present in DOM |
| 5 | Clicking toggle on collapsed node reveals children | `ui-tree-view-node.component.spec.ts` | After toggle click → children container present |
| 6 | Clicking toggle on expanded node hides children | `ui-tree-view-node.component.spec.ts` | After toggle click on expanded node → children container absent |
| 7 | `nodeSelected` emits correct `id` on label click | `ui-tree-view-node.component.spec.ts` | Output spy receives correct id |
| 8 | Clicking toggle does not emit `nodeSelected` | `ui-tree-view-node.component.spec.ts` | Output spy not called when only toggle is clicked |
| 9 | Root tree renders correct number of root nodes | `ui-tree-view.component.spec.ts` | DOM has N `<ui-tree-view-node>` elements |
| 10 | `nodeSelected` bubbles from nested node to root | `ui-tree-view.component.spec.ts` | Root output spy fires with nested node id |
| 11 | Three-level tree: correct indentation levels | Integration spec | `--tree-node-depth` CSS custom property is `0`, `1`, `2` at respective levels |
| 12 | RTL: `padding-inline-start` used (not `padding-left`) | CSS spec audit | No `padding-left` in component SCSS |

### Test Case AoC Mapping

| AoC | Covered By Tests |
|---|---|
| AOC-01 | Tests 1–4 (interface structure) |
| AOC-02 | Tests 1–2 (toggle presence) |
| AOC-03 | Tests 3–6 (expand/collapse behavior) |
| AOC-04 | Test 7 (nodeSelected output) |
| AOC-05 | Test 11 (token-driven indentation) |
| AOC-06 | CSS audit: only token references |
| AOC-07 | Test 12 (logical CSS properties) |
| AOC-08 | Code review: standalone + OnPush |
| AOC-09 | Storybook page manual/E2E |
| AOC-10 | Barrel export compilation check |
| AOC-11 | Route navigation test |
| AOC-12 | i18n key existence check |

---

## 9. BDD Scenarios

### Scenario 1 — Expand root, children revealed; grandchildren remain hidden

```gherkin
Given a UiTreeViewComponent with a three-level hierarchy
  And all nodes start collapsed (expanded not provided)
When the root node's toggle button is clicked
Then the root node's direct children are visible in the DOM
  And second-level children remain absent from the DOM
```

**Evidence**: DOM snapshot before and after toggle click; `UiTreeViewNodeComponent` internal `expanded` signal value.

### Scenario 2 — RTL: Indentation on inline-end

```gherkin
Given a UiTreeViewComponent rendered inside a container with [dir="rtl"]
When the rendered tree is inspected
Then the computed padding on the inline-start side (visual right in RTL) is non-zero for depth > 0 nodes
  And no hard-coded `padding-left` or `padding-right` properties exist in component styles
```

**Evidence**: CSS logical property audit; computed style in a `dir="rtl"` Storybook scenario.

### Scenario 3 — Node selection output

```gherkin
Given a UiTreeViewComponent with nodes
  And an observer is attached to the (nodeSelected) output
When a node label is clicked
Then the (nodeSelected) output emits exactly one event containing the clicked node's id
```

**Evidence**: Output spy assertion in unit test; Storybook interactive demo showing selected node ID.

---

## 10. Security & Privacy Controls

| Concern | Mitigation |
|---|---|
| XSS via `node.label` | Label rendered via Angular template interpolation `{{ node().label }}` — Angular's built-in HTML escaping prevents XSS. Never use `[innerHTML]` with label data. |
| Input validation | `nodes` input accepts `UiTreeNode[]`; types enforce structure at compile time. No runtime sanitization needed for a display-only component. |
| No network calls | Component is purely presentational — no HTTP, no API, no auth surface. |
| No sensitive data storage | Tree view stores no state beyond expand/collapse signals. No localStorage or sessionStorage usage. |

---

## 11. Observability Requirements

Since this is a shared UI primitive (no domain operations, no user data access), minimal observability is required:

| Signal | Where | Level |
|---|---|---|
| Tree rendered with N root nodes | Storybook dev tool console only | DEBUG (not production) |
| Node selected | `nodeSelected` output — consumers log if needed | Consumer concern |
| No production logging required | Component is stateless presentation only | — |

No method-level logging is required for a shared UI primitive. If integrated into a feature context (e.g., ChartOfAccounts feature), the feature service is responsible for logging user interactions.

---

## 12. GlobalResponseKey / Response Key Catalog

**Not applicable** — `UiTreeViewComponent` is a shared UI primitive. It emits `nodeSelected` (a local component output), not a global response. No `GlobalResponseKey` pattern applies.

Consumer features that handle tree selection within domain logic must map the output to their own `GlobalResponseKey` error/information patterns if needed.

---

## 13. Rollout & Rollback Strategy

| Item | Detail |
|---|---|
| **Rollout** | Delivered in single MR to `develop`. No feature flag needed — shared UI primitive, not a user-facing feature toggle. |
| **Rollback** | Revert MR or revert barrel export line + delete `tree-view/` folder. No migration, no database change, no API change. |
| **Risk: Self-recursive component** | Angular supports standalone component self-import since v15+. Risk is low; existing `UiTreeViewNodeComponent` template imports itself. Verified safe in Angular 17+ with `@for` control flow. |
| **Risk: OnPush + signals** | Each `UiTreeViewNodeComponent` is an independent component instance with its own `expanded` signal. OnPush fires per-instance on signal change — correct behavior. No `markForCheck()` needed. |
| **Risk: Deep tree performance** | Storybook page must include a note recommending max tree depth of ~10 levels for UX reasons (not a technical limit). Document in the Storybook Overview section. |

---

## 14. Requirement Traceability Matrix

| AoC/DoD ID | Requirement | Implementation Target | Test Coverage |
|---|---|---|---|
| AOC-01 | `UiTreeNode` interface with id/label/children/expanded | `UiTreeNode` interface in `ui-tree-view.component.ts` | Unit tests 1–4 |
| AOC-02 | Leaf nodes: no toggle; branch nodes: toggle | Template conditional in `UiTreeViewNodeComponent` | Unit tests 1–2 |
| AOC-03 | Expand/collapse state management | `expanded` signal + `toggleExpanded()` | Unit tests 3–6 |
| AOC-04 | `nodeSelected` output emits `id` | `output<string \| number>()` in both components | Unit test 7 |
| AOC-05 | Token-driven indentation per depth | `--tree-node-depth` + `calc(var(--gap-sm) * var(--tree-node-depth))` | Unit test 11 |
| AOC-06 | All styling via semantic tokens; tree lines via border tokens | `ui-tree-view-node.component.scss` audit | CSS review |
| AOC-07 | Logical CSS for indentation/icon positioning | `padding-inline-start`, `border-block-end` | Unit test 12 |
| AOC-08 | OnPush + standalone | Component decorators | Code review |
| AOC-09 | Storybook page with 7 scenarios | `tree-view-story-book.component` | Manual + E2E |
| AOC-10 | Export from `components/index.ts` | Barrel export line | Compilation check |
| AOC-11 | Route registered + nav entry | `story-book.routes.ts` + shell component | Navigation test |
| AOC-12 | Translation keys EN + FA | `en.json` + `fa.json` | i18n key existence check |
| DOD-01 | Both components implemented with recursive rendering | Phase 1 complete | Integration test |
| DOD-02 | Expand/collapse all depth levels | Recursive `UiTreeViewNodeComponent` self-import | Unit tests 5–6 |
| DOD-03 | Token-driven; zero hardcoded values | SCSS audit | CSS review |
| DOD-04 | Storybook multi-level + all states + RTL | Storybook page sections | Manual |
| DOD-05 | Exported from `index.ts` | Barrel export | Compilation |
| DOD-06 | Unit tests pass | `*.spec.ts` files | CI |
| DOD-07 | Translation keys added | JSON files | i18n check |

---

## 15. GitFlow Context

| Item | Value |
|---|---|
| Source branch | `features/ac-75-fe-tree-view-component` |
| Branch from | `develop` |
| Target branch (MR) | `develop` |
| MR title | `Draft: [AC-75] FE - Tree View Component` |
| MR strategy | Squash + Delete source branch (standard task MR) |
| Workspace MR scope | Task plan document (`docs/work-items/...`) |
| Project MR scope | All product code changes (`libs/`, `apps/`, `public/`) |
| Transition to In Review | Mark MR as Ready (remove Draft) when all tests pass and Storybook verified |

---

## 16. Open Questions / Risks

| ID | Item | Owner | Resolution |
|---|---|---|---|
| OQ-01 | Toggle icon name: `chevron-down` / `chevron-right` — confirm icon names exist in `UiIconComponent` icon registry | Implementer | Check `UiIconName` type before coding |
| OQ-02 | Tree line visual connector (vertical guide lines) — AOC-06 mentions "if rendered"; confirm with PO whether guide lines are required for MVP | PO | Default: no guide lines for MVP unless explicitly required |
| OQ-03 | Leaf node spacer width — must match toggle icon width exactly for alignment; confirm icon size token | Implementer | Use `var(--spacing-5)` (1.25rem = 20px) as spacer if icon is 20px |

