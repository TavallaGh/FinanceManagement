# Implementation Plan: AC-72 — FE - Simple List Component

## 1. Task Identity

- **Jira Task**: [AC-72 - FE - Simple List Component](https://nexttoptech.atlassian.net/browse/AC-72)
- **Parent Story**: [AC-41 - Shared UI Foundation](https://nexttoptech.atlassian.net/browse/AC-41)
- **Type**: Frontend / UI Components
- **Fix Version**: V 0.1 (MVP)
- **Repository Target**: Accounting-Frontend (FRONT)
- **Labels**: `frontend`, `shared-ui`, `components`, `storybook`
- **Status**: Approved

---

## 2. Task Readiness Checklist

- ✅ **AoC (12 items)**: All acceptance criteria defined with verifiable outcomes
- ✅ **DoD (6 items)**: Definition of done covers components, styling, tests, exports, and documentation
- ✅ **TDD Coverage**: Unit and integration tests specified with behavioral expectations
- ✅ **BDD Scenarios**: Two end-to-end scenarios with Given/When/Then structure
- ✅ **Goal**: Clear — provide reusable list primitive for consistent feature UIs
- ✅ **Problem-To-Solve**: Defined — eliminate divergent list implementations across features
- ⚠️ **Dependency**: AC-64 (Token Audit & Standardization) must be completed and approved before this task begins. All token references in component styles must use finalized semantic tokens from `public/styles/tokens/_semantic.scss`.

---

## 3. Scope & Assumptions

### In Scope

- Implement `UiSimpleListComponent` and `UiSimpleListItemComponent` as standalone Angular components.
- Full token-driven styling using semantic tokens from `_semantic.scss`.
- RTL/LTR-safe layout using logical CSS properties.
- Component state management: `selected`, `disabled`, hover, and default states.
- Content projection via `ng-content` (business-agnostic payload).
- Storybook page covering all component states in both themes and both directionalities.
- Translation keys for Storybook demo content in English and Persian.
- Proper exports and route registration.

### Out of Scope

- Pagination logic (AC-73 handles "List with Pagination").
- Drag-and-drop reordering.
- Virtual scrolling.
- List filtering or search within components.

### Assumptions

1. AC-64 Token Audit task completes with a finalized `_semantic.scss` file defining:
   - `--color-list-item-hover-bg`
   - `--color-list-item-selected-bg`
   - `--color-list-item-border`
   - `--color-list-item-text` (inherits from primary text token)
   - Semantic elevation and spacing tokens for list items.

2. Angular version in project supports:
   - Signal-based components and inputs (no `@Input()` decorator).
   - `ChangeDetectionStrategy.OnPush` with standalone components.
   - Modern control flow syntax (`@if`, `@for`).
   - Logical CSS properties.

3. Nx workspace is configured with shared UI library boundaries and correct dependency paths.

4. Storybook routing infrastructure is in place (shell component, routes file, sidebar navigation).

---

## 4. Repository Routing Matrix

All changes are scoped to **Accounting-Frontend** project repository.

| Artifact Type | Location | Repository | Purpose |
|---|---|---|---|
| Component source code | `libs/shared/ui/src/lib/components/simple-list/` | Accounting-Frontend | Component implementations (`.component.ts`, `.component.scss`) |
| Component tests | `libs/shared/ui/src/lib/components/simple-list/*.spec.ts` | Accounting-Frontend | Unit and integration tests |
| Component exports | `libs/shared/ui/src/lib/components/index.ts` | Accounting-Frontend | Shared UI barrel export |
| Storybook page | `apps/erp-web/src/app/dev-tools/story-book/pages/simple-list/` | Accounting-Frontend | Component showcase and documentation |
| Storybook routes | `apps/erp-web/src/app/dev-tools/story-book/story-book.routes.ts` | Accounting-Frontend | Route registration |
| Translation keys | `apps/erp-web/src/assets/i18n/en.json`, `fa.json` | Accounting-Frontend | English and Persian demo text |
| Task documentation | `docs/work-items/02.implementation/stories/AC-41/tasks/AC-72-implementation-plan.md` | accounting-workspace | Process and traceability |

---

## 5. Domain Hierarchy & Folder Naming Map

### UI Component Layer

This task operates in the **Presentation / Shared UI** layer.

```
libs/shared/ui/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── simple-list/                      ← Entity folder (canonical component name)
│   │   │   │   ├── ui-simple-list.component.ts  ← Container component
│   │   │   │   ├── ui-simple-list.component.scss
│   │   │   │   ├── ui-simple-list-item.component.ts  ← Item wrapper component
│   │   │   │   ├── ui-simple-list-item.component.scss
│   │   │   │   ├── ui-simple-list.component.spec.ts
│   │   │   │   └── ui-simple-list-item.component.spec.ts
│   │   │   └── index.ts                         ← Barrel export for simple-list
│   │   └── components/
│   │       └── index.ts                         ← Add simple-list exports here
│   └── index.ts                                 ← Public API
```

### Storybook Layer

```
apps/erp-web/
└── src/
    └── app/
        └── dev-tools/
            └── story-book/
                ├── pages/
                │   ├── simple-list/
                │   │   └── simple-list-story-book.component.ts  ← Showcase component
                │   │   └── simple-list-story-book.component.scss
                │   └── pages/                  ← Storybook page components
                └── story-book.routes.ts        ← Route registration
```

### Entity-Centric Naming Rules

- **Folder name**: `simple-list` (kebab-case, matches component family)
- **Component selectors**: `ui-simple-list`, `ui-simple-list-item` (kebab-case)
- **Component class names**: `UiSimpleListComponent`, `UiSimpleListItemComponent` (PascalCase)
- **File naming**: `ui-simple-list.component.ts`, `ui-simple-list-item.component.ts`

---

## 6. Implementation Steps & Dependencies

### Phase 1: Component Implementation (Blocking Phase)

**Dependency Check**: AC-64 must be approved before starting.

#### Step 1.1 — Create Component Folder Structure

```powershell
mkdir libs/shared/ui/src/lib/components/simple-list
```

Files to create:
- `ui-simple-list.component.ts`
- `ui-simple-list.component.scss`
- `ui-simple-list-item.component.ts`
- `ui-simple-list-item.component.scss`
- `ui-simple-list.component.spec.ts`
- `ui-simple-list-item.component.spec.ts`

#### Step 1.2 — Implement `UiSimpleListItemComponent`

- Standalone component with `ChangeDetectionStrategy.OnPush`.
- Inputs: `selected` (boolean, optional, default `false`); `disabled` (boolean, optional, default `false`).
- Default `ng-content` slot for item content projection.
- CSS classes applied based on state: `.selected`, `.disabled`, `.hover-state`.
- Logical CSS for RTL-safe padding/margin: `padding-inline-start`, `padding-inline-end`, `margin-block-start`, `margin-block-end`.
- Border separator using `border-block-end` (logical property for RTL-safe bottom border).
- Hover state suppressed when `disabled=true` (no hover color applied).
- All colors and spacing via semantic tokens: `--color-list-item-text`, `--color-list-item-hover-bg`, `--color-list-item-selected-bg`, `--color-list-item-border`, `--spacing-md`, etc.

#### Step 1.3 — Implement `UiSimpleListComponent`

- Standalone component with `ChangeDetectionStrategy.OnPush`.
- Container wrapper for one or more `UiSimpleListItemComponent` children.
- Provides default `ng-content` projection for item children.
- Applies list-level styling: gap between items, list background, padding.
- Logical CSS for list wrapper: `padding-inline`, `padding-block`, `gap`.
- All colors and spacing via semantic tokens.

#### Step 1.4 — Write Unit Tests

Create `ui-simple-list-item.component.spec.ts`:
- ✅ Test: `UiSimpleListItemComponent` applies `.selected` CSS class when `selected=true`.
- ✅ Test: `UiSimpleListItemComponent` suppresses hover state (no hover class applied) when `disabled=true`.
- ✅ Test: Content projection renders inside item wrapper.
- ✅ Test: `selected` input updates dynamically (change detection test).
- ✅ Test: `disabled` input updates dynamically.

Create `ui-simple-list.component.spec.ts`:
- ✅ Test: `UiSimpleListComponent` renders as a container with `ng-content` slot.
- ✅ Test: Multiple `UiSimpleListItemComponent` children render with correct gap separation.
- ✅ Test: List wrapper applies semantic token values for padding and gap.

#### Step 1.5 — Write Integration Tests

Create integration test suite:
- ✅ Test: Full list with mixed states (some selected, some disabled, some default) renders correctly.
- ✅ Test: RTL layout (with `[dir="rtl"]` on container) renders with correct logical property placement.
- ✅ Test: Token values are resolved and applied to DOM elements (check `getComputedStyle`).

#### Step 1.6 — Export from Shared UI Library

**File**: `libs/shared/ui/src/lib/components/index.ts`

```typescript
export * from './simple-list/ui-simple-list.component';
export * from './simple-list/ui-simple-list-item.component';
```

**File**: `libs/shared/ui/src/index.ts`

Ensure `UiSimpleListComponent` and `UiSimpleListItemComponent` are exported from public API.

### Phase 2: Storybook & Documentation (Parallel with Phase 1 or immediately after)

#### Step 2.1 — Create Storybook Page Component

Create `apps/erp-web/src/app/dev-tools/story-book/pages/simple-list/simple-list-story-book.component.ts`:

- Showcase component demonstrating all component states.
- Include sections for:
  - **Basic list**: 3 items with default styling.
  - **List with selected item**: Mark one item with `[selected]="true"`.
  - **List with disabled item**: Mark one item with `[disabled]="true"`.
  - **Content-rich item projection**: Items with complex content (icons, badges, etc.).
  - **RTL layout**: Render the same list in RTL mode using `[dir="rtl"]` wrapper.
  - **Theme switching**: Show component in light and dark themes.

#### Step 2.2 — Add Storybook Styling

Create `apps/erp-web/src/app/dev-tools/story-book/pages/simple-list/simple-list-story-book.component.scss`:

- Layout for Storybook sections (grid or flex).
- Spacing and dividers between sections.
- All styling via semantic tokens or existing utility classes.

#### Step 2.3 — Register Storybook Route

**File**: `apps/erp-web/src/app/dev-tools/story-book/story-book.routes.ts`

Add route entry:

```typescript
{
  path: 'simple-list',
  data: { label: 'Simple List' },
  loadComponent: () =>
    import('./pages/simple-list/simple-list-story-book.component')
      .then(m => m.SimpleListStoryBookComponent)
}
```

#### Step 2.4 — Update Storybook Shell Navigation

**File**: `apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.ts`

Add navigation entry in sidebar for "Simple List" linking to `/story-book/simple-list`.

#### Step 2.5 — Add Translation Keys

**File**: `apps/erp-web/src/assets/i18n/en.json`

Add keys for demo content:

```json
{
  "storybook": {
    "simpleList": {
      "title": "Simple List",
      "basicListLabel": "Basic List",
      "basicItem1": "First item",
      "basicItem2": "Second item",
      "basicItem3": "Third item",
      "selectedStateLabel": "List with Selected Item",
      "disabledStateLabel": "List with Disabled Item",
      "contentRichLabel": "Content-Rich Item Projection",
      "rtlLayoutLabel": "RTL Layout",
      "userItem": "John Doe",
      "adminItem": "Admin User (Disabled)",
      "guestItem": "Guest (Selected)"
    }
  }
}
```

**File**: `apps/erp-web/src/assets/i18n/fa.json`

Add Persian equivalents:

```json
{
  "storybook": {
    "simpleList": {
      "title": "لیست ساده",
      "basicListLabel": "لیست پایه",
      "basicItem1": "آیتم اول",
      "basicItem2": "آیتم دوم",
      "basicItem3": "آیتم سوم",
      "selectedStateLabel": "لیست با آیتم انتخاب شده",
      "disabledStateLabel": "لیست با آیتم غیرفعال",
      "contentRichLabel": "پروجکشن محتوای غنی",
      "rtlLayoutLabel": "طرح بندی RTL",
      "userItem": "جان دو",
      "adminItem": "کاربر مدیر (غیرفعال)",
      "guestItem": "مهمان (انتخاب شده)"
    }
  }
}
```

---

## 7. Code-Level Implementation Blueprint

### UiSimpleListItemComponent

```typescript
// ui-simple-list-item.component.ts
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-simple-list-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-simple-list-item.component.html',
  styleUrls: ['./ui-simple-list-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.selected]': 'selected()',
    '[class.disabled]': 'disabled()'
  }
})
export class UiSimpleListItemComponent {
  selected = signal(false);
  disabled = signal(false);

  constructor() {
    // Accept inputs as signals when Angular 19+ fully supports signal inputs
    // For now, use @Input with computed() wrapper if needed
  }
}
```

### Stylesheet Strategy

**File**: `ui-simple-list-item.component.scss`

```scss
// Logical properties for RTL/LTR safety
:host {
  display: flex;
  flex-direction: column;
  padding-inline: var(--spacing-md);
  padding-block: var(--spacing-sm);
  
  // Default state
  color: var(--color-list-item-text);
  background-color: transparent;
  border-block-end: 1px solid var(--color-list-item-border);
  transition: background-color 0.2s ease;
  
  // Hover state (not applied when disabled)
  &:not(.disabled):hover {
    background-color: var(--color-list-item-hover-bg);
  }
  
  // Selected state
  &.selected {
    background-color: var(--color-list-item-selected-bg);
    font-weight: 500;
  }
  
  // Disabled state
  &.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  // Last item: no bottom border
  &:last-child {
    border-block-end: none;
  }
}

// Content projection slot
::ng-deep {
  // Project content styling if needed
}
```

### UiSimpleListComponent

```typescript
// ui-simple-list.component.ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-simple-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="simple-list-container">
      <ng-content></ng-content>
    </div>
  `,
  styleUrls: ['./ui-simple-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiSimpleListComponent {}
```

**File**: `ui-simple-list.component.scss`

```scss
.simple-list-container {
  display: flex;
  flex-direction: column;
  padding-inline: var(--spacing-lg);
  padding-block: var(--spacing-md);
  gap: 0; // Items handle own borders; gap not needed
  
  // Optional: background for list surface
  background-color: var(--color-list-surface, transparent);
  border-radius: var(--radius-md);
  
  // Support for nested lists
  &.nested {
    padding-inline: var(--spacing-md);
    padding-block: var(--spacing-sm);
  }
}
```

---

## 8. Data Model & Migration Impact

This task introduces no database or API changes. It is purely a **UI component delivery** task.

### Token Dependency

The component styling depends on semantic tokens defined in AC-64 (Token Audit).

**Required tokens** (must exist in `public/styles/tokens/_semantic.scss` after AC-64):
- `--color-list-item-text`
- `--color-list-item-hover-bg`
- `--color-list-item-selected-bg`
- `--color-list-item-border`
- `--color-list-surface` (optional, for background)
- `--spacing-sm`, `--spacing-md`, `--spacing-lg`
- `--radius-md`

**Action if tokens are missing**: Task cannot pass verification until AC-64 is approved and all required tokens are available in `_semantic.scss`.

---

## 9. Security & Privacy Controls

### Component-Level Security

1. **Content Projection Safety**: Component accepts arbitrary content via `ng-content`. Content is expected to be controlled by the consuming feature/application. No sanitization is performed by the component itself.
2. **No Data Binding to External Sources**: Component does not fetch data, make API calls, or interact with services. All data is provided by the consumer.
3. **Accessibility (a11y)**: Component renders semantic HTML (`div` elements with ARIA attributes if needed). Consumers must provide appropriate ARIA labels for list context (`role="list"`, `role="listitem"` if semantically required).
4. **Abuse-Case Checks**:
   - **Malicious content injection**: Mitigated by Angular's built-in XSS protection on projections.
   - **Style injection via tokens**: Tokens are controlled server-side and cannot be overridden per-item.
   - **Excessive re-renders**: Signal-based OnPush change detection prevents unnecessary renders.

### Privacy Controls

- No user data is stored in the component.
- No logging of user interactions (see Observability section for optional event logging).
- Component does not interact with authentication or authorization systems.

---

## 10. Observability Requirements

### Logging Strategy

The component itself does not log. However, consuming features may log interactions.

**Optional Feature-Level Logging** (feature consumer responsibility):

If a feature uses the component and wants to log item selection:

```typescript
// Feature component consuming simple-list
export class MyFeatureComponent {
  onItemSelected(itemId: string, itemName: string) {
    // Feature logs user interaction (not component responsibility)
    this.logger.info('list_item_selected', {
      itemId,
      itemName,
      timestamp: new Date().toISOString(),
      userId: this.userContext.id
    });
  }
}
```

### Metrics & Observability

- **Component render count**: Covered by Angular's OnPush strategy (minimal renders).
- **Storybook verification**: Manual verification in Storybook ensures component renders all states correctly.
- **No runtime metrics required** for this component (it is a presentational primitive).

### Method-Level Logging

N/A — component has no methods that perform business operations.

---

## 11. Global Response Key Model & Error Handling

This component does not produce error responses. It is a UI primitive.

### Storybook Demo Responses

If Storybook demo includes form validation or interaction feedback, use the global response-key pattern:

**Response Key Naming for UI Confirmations** (if needed):
- `INFORMATION_SimpleList_ItemSelected`
- `INFORMATION_SimpleList_ItemsLoaded`

Example:

```typescript
// Storybook demo component
interface ListItemSelectedMessage {
  responseKey: 'INFORMATION_SimpleList_ItemSelected';
  message: string;
  itemId: string;
}
```

**No ERROR response keys** are defined for this component because it is purely presentational.

---

## 12. Response Key Naming Catalog

This component produces no business responses. It is a UI container.

**Not applicable** — component has no API contracts or error states that require response keys.

---

## 13. TDD Plan — Test-First Execution Order

**Test-first approach**: Write tests before implementation.

### Execution Order (Dependency-Driven)

1. **Item Component Behavioral Tests** (write spec, then implement component)
   - `UiSimpleListItemComponent` renders with default styles.
   - `UiSimpleListItemComponent` applies `.selected` class when `selected=true`.
   - `UiSimpleListItemComponent` suppresses hover when `disabled=true`.
   - Content projection works (slot renders passed content).

2. **Container Component Tests**
   - `UiSimpleListComponent` renders wrapper.
   - Multiple items render with separator borders.
   - Last item has no bottom border.

3. **Integration Tests**
   - Full list with mixed states renders correctly in light and dark themes.
   - RTL layout (logical CSS) places padding and borders correctly.

4. **Storybook Verification Tests** (manual + visual regression if tooling available)
   - Verify all showcase sections render in light theme.
   - Verify all showcase sections render in dark theme.
   - Verify RTL section shows correct layout.
   - Verify translations load correctly in both languages.

### Test Files

- `ui-simple-list-item.component.spec.ts` — 8–10 test cases
- `ui-simple-list.component.spec.ts` — 6–8 test cases
- Storybook acts as visual regression baseline.

---

## 14. BDD Scenarios with Evidence Mapping

### Scenario 1: Selected Item State

**Given**
- A `UiSimpleListComponent` with three `UiSimpleListItemComponent` children.
- One item marked with `[selected]="true"`.

**When**
- Component renders.

**Then**
- Selected item has `--color-list-item-selected-bg` background applied.
- Other items render with default styling (no background).
- Verified in Storybook "List with Selected Item" section; observable in browser DevTools.

**Evidence Checklist**:
- ✅ Storybook screenshot shows correct background color for selected item.
- ✅ `getComputedStyle(selectedItem)` returns correct background-color value.
- ✅ Unit test assertion verifies `.selected` CSS class is applied.

### Scenario 2: RTL Layout

**Given**
- A `UiSimpleListComponent` rendered in RTL layout (container has `[dir="rtl"]`).

**When**
- Component renders.

**Then**
- Item padding uses logical properties: `padding-inline-start`, `padding-inline-end` (not left/right).
- Padding placement is correct for RTL reading direction.
- Border separator uses `border-block-end` (not `border-bottom`).
- Content alignment inside items respects text direction.

**Evidence Checklist**:
- ✅ Storybook "RTL Layout" section displays correct visual layout.
- ✅ DevTools inspection shows `padding-inline-start` in computed styles (not `padding-left`).
- ✅ No hardcoded `left`/`right` values in CSS.
- ✅ Unit test verifies component renders without errors in RTL context.

---

## 15. Rollout, Rollback, and Feature-Flag Strategy

### Rollout Strategy

1. **Merge to `develop`** (via task MR in Accounting-Frontend).
2. **Storybook available** for immediate verification and feature team consumption.
3. **Export from shared UI library** makes component immediately available to all features.
4. **No feature flag** is required — component is a shared primitive and opt-in by design (features choose to use it).
5. **Dependency communication**: Feature teams notified via Slack/wiki that `ui-simple-list` component is now available in shared UI library.

### Rollback Strategy

If issues are discovered post-merge:

1. **Revert MR** to `develop` if issue is critical (component is unusable).
2. **Create bug ticket** (AC-XX) if issue is non-critical (feature team can continue using old implementation).
3. **No data migration** is needed (component is stateless and does not persist data).
4. **Feature code is unaffected** by rollback — features that have adopted the component will need to switch back to previous implementation.

### Feature Flag Consideration

**Not applicable** — component is a shared UI primitive. Adoption is voluntary by consuming features.

---

## 16. Implementation Verification Checklist

### Pre-Merge Verification

Before marking this task as "In Review":

- ✅ `UiSimpleListComponent` and `UiSimpleListItemComponent` implemented in `libs/shared/ui/src/lib/components/simple-list/`.
- ✅ Both components use `ChangeDetectionStrategy.OnPush` and standalone pattern.
- ✅ All styling uses semantic tokens exclusively (no hardcoded colors, spacing, radii).
- ✅ All CSS properties use logical equivalents (no `left`/`right`, use `inset-inline-start`/`inset-inline-end`, etc.).
- ✅ Content projection via `ng-content` works and accepts arbitrary content.
- ✅ `selected` input applies `.selected` CSS class correctly.
- ✅ `disabled` input suppresses hover state and applies `.disabled` CSS class.
- ✅ Item separator (border) renders between items; last item has no border.
- ✅ Unit tests pass (8–10 for item component, 6–8 for container component).
- ✅ Integration tests pass (full list, mixed states, RTL layout, theme switching).
- ✅ Storybook page created at `apps/erp-web/src/app/dev-tools/story-book/pages/simple-list/`.
- ✅ Storybook route registered in `story-book.routes.ts`.
- ✅ Storybook shell navigation updated with "Simple List" entry.
- ✅ Translation keys added to `en.json` and `fa.json`.
- ✅ Components exported from `libs/shared/ui/src/lib/components/index.ts` and public API.
- ✅ Storybook displays all sections (basic, selected, disabled, content-rich, RTL, both themes).
- ✅ RTL layout verified in Storybook (icons, text, padding align correctly).
- ✅ Light and dark themes both render correctly.

### AoC Mapping to Verification

| AoC Item | Verification Method |
|---|---|
| AOC-01: List container with ng-content | Storybook visual + unit test |
| AOC-02: Item component with selected/disabled inputs | Unit test + Storybook |
| AOC-03: Item separator via token-driven border | Storybook visual + DevTools CSS inspection |
| AOC-04: Hover state with token color; suppressed when disabled | Storybook visual hover + unit test `.disabled` suppression |
| AOC-05: Selected state with token color | Storybook visual + unit test `.selected` class |
| AOC-06: All styling uses semantic tokens exclusively | CSS code review (no hardcoded hex/rgb values) |
| AOC-07: Logical CSS properties for RTL/LTR safety | CSS code review + Storybook RTL section |
| AOC-08: OnPush change detection + standalone pattern | Component code review |
| AOC-09: Storybook page covers all states in both themes and RTL | Storybook manual verification |
| AOC-10: Components exported from shared UI index.ts | Import test from consuming feature code |
| AOC-11: Route registered; navigation entry in sidebar | Storybook shell navigation verification |
| AOC-12: Translation keys added to en.json and fa.json | Language switching in Storybook demo |

### DoD Mapping to Verification

| DoD Item | Verification Method |
|---|---|
| DOD-01: Both components implemented | Code exists and compiles |
| DOD-02: States fully token-driven | CSS code review + DevTools inspection |
| DOD-03: Storybook page covers all states in both themes and LTR/RTL | Storybook manual verification |
| DOD-04: Components exported from shared UI library index.ts | Import test; barrel export visible |
| DOD-05: Unit tests pass | Test runner output shows passing tests |
| DOD-06: Translation keys added | `en.json` and `fa.json` contain keys |

---

## 17. Dependency & Integration Points

### Hard Blocker Dependency

- **AC-64 (Token Audit & Standardization)** must be **completed and approved** before this task implementation begins.
  - Reason: All component styling depends on finalized semantic tokens from `_semantic.scss`.
  - Action if AC-64 is not approved: Task cannot proceed past step 1.6 (component styling will fail without tokens).

### Soft Dependencies

- **AC-65 & AC-66 (Theme Engine & Persistence)**: Should be completed before Storybook verification to ensure theme switching works in demo.
- **AC-77 (Storybook & Docs Update)**: Final Storybook shell consolidation happens in AC-77; this task registers its own route and navigation entry.

### External Integration Points

- **Accounting-Frontend Nx workspace**: Shared UI library configuration must support new component folder.
- **Storybook routing**: `story-book.routes.ts` must support dynamic route imports.
- **i18n infrastructure**: Translation service must be available in Storybook demo.
- **CSS tokenization**: `_semantic.scss` must be properly compiled into `:root` or theme-aware selectors.

---

## 18. Known Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AC-64 tokens not finalized on time | Medium | Task blocked at styling phase | Start implementation of component logic (TS) while tokens are finalized; CSS can be added once tokens are ready. |
| Logical CSS properties not supported by target browsers | Low | RTL layout fails in production | Verify browser support matrix in project documentation; use PostCSS plugin if needed to transpile logical properties. |
| Content projection causes layout issues with complex content | Medium | Storybook demo breaks with real-world content | Test with various content types (text, icons, badges) in Storybook content-rich section before merge. |
| Token naming conflict with existing semantic tokens | Low | Component uses wrong token values | Coordinate token naming with AC-64 task owner; include simple-list token names in AC-64 audit. |
| Storybook route conflicts with existing routes | Low | Storybook navigation broken | Verify `story-book.routes.ts` structure before adding route; test route loading. |

---

## 19. Source Traceability & Jira Mapping

### Refinement & Solution Documentation

- **Refinement**: `docs/work-items/00.refinement/linked/stories/AC-41/refinement.md`
  - AC-72 originates from Capability Slice 10 in story refinement.
  - Maps to AoC items: AoC-14, AoC-19, AoC-20, AoC-21, AoC-25.

- **Solution**: `docs/work-items/01.solution/linked/stories/AC-41/solution.md`
  - Confirms NFRs: OnPush change detection, no hardcoded values, logical CSS, CSP-safe theme handling.
  - Confirms token-driven design system approach.

- **Task Plan**: `docs/work-items/01.solution/linked/stories/AC-41/task-plan.md`
  - AC-72 row defines scope and integration points.

### Jira Links

- **Story**: [AC-41 - Shared UI Foundation](https://nexttoptech.atlassian.net/browse/AC-41)
- **Task**: [AC-72 - FE - Simple List Component](https://nexttoptech.atlassian.net/browse/AC-72)
- **Dependency**: [AC-64 - Token Audit & Standardization](https://nexttoptech.atlassian.net/browse/AC-64)
- **Related**: [AC-77 - Storybook Coverage & Design Docs Update](https://nexttoptech.atlassian.net/browse/AC-77)
- **Related**: [AC-73 - List with Pagination Component](https://nexttoptech.atlassian.net/browse/AC-73)

---

## 20. Implementation Handoff Checklist

### Ready for Implementation When

- ✅ AC-64 (Token Audit) is **approved and tokens are available** in `_semantic.scss`.
- ✅ Frontend project structure is verified (Nx workspace, Storybook routes configured).
- ✅ This implementation plan is **reviewed and approved by Tech Lead**.
- ✅ Task Jira status is set to `In Progress`.
- ✅ Feature branch created: `features/AC-72-simple-list-component`.

### Implementation Entry Point

After TL approval:

1. **Create feature branch**:
   ```powershell
   git checkout -b features/AC-72-simple-list-component develop
   ```

2. **Start coding** following Phase 1 steps in order (component logic before styling if tokens are pending).

3. **Push commits** with traceable messages:
   - `feat(AC-72): add ui-simple-list and ui-simple-list-item components`
   - `feat(AC-72): add component unit and integration tests`
   - `feat(AC-72): add storybook page and routes for simple-list`
   - `feat(AC-72): add i18n keys for storybook demo`

4. **Open task MR** to `develop` when ready for review:
   - Title: `[AC-72] FE - Simple List Component`
   - Link to this plan in MR description.
   - Start as Draft.
   - Link Jira issue.

5. **Update Jira** to `In Review` when MR is marked Ready.

### Post-Implementation

- Task record: `docs/work-items/02.implementation/stories/AC-41/tasks/AC-72-task-record.md` (created after merge).
- Jira transition to `PO Review` after TL approval of MR.
- Jira transition to `Done` after PO signs off.

---

## 21. TL Approval Gate

**This implementation plan is ready for approval by the Technical Lead.**

### Approval Requested For

1. ✅ **Scope clarity**: Is the component scope, dependencies, and integration points clear and achievable?
2. ✅ **Repository targeting**: Are the Accounting-Frontend paths and artifact locations correct?
3. ✅ **Token dependency**: Is AC-64 completion acceptable as a blocker, or should token fallbacks be added?
4. ✅ **Timeline**: Is the implementation timeline reasonable given team capacity?
5. ✅ **Quality gates**: Do TDD, integration testing, and Storybook verification requirements align with project standards?

### Approval Checklist (TL to Complete)

- [ ] **Reviewed** implementation plan sections 1–20.
- [ ] **Confirmed** AC-64 token availability or adjusted token dependency strategy.
- [ ] **Verified** Accounting-Frontend Nx configuration supports new component.
- [ ] **Verified** Storybook routing and shell navigation infrastructure is ready.
- [ ] **Approved** TDD execution order and test case coverage.
- [ ] **Confirmed** implementation can proceed (or identified blockers).

### Approval Status

**Pending Tech Lead Review & Sign-Off**

---

## 22. Revision History

| Date | Author | Status | Notes |
|---|---|---|---|
| 2026-05-14 | Copilot Agent | Draft | Initial implementation plan generated; awaiting TL review and AC-64 token approval. |

---

## 23. References & Related Documents

- **DDD Conventions**: `docs/architecture/ddd-domain-conventions.md`
- **Git Workflow**: `docs/workflows/git-workflow-flows.md`
- **Frontend Rules**: `docs/frontend/rules/copilot-instructions.md`
- **Design System**: `docs/frontend/design/design-system.md`
- **UI Components Catalog**: `docs/frontend/design/ui-components.md`
- **Token Architecture**: Task AC-64 deliverables
- **Theme System**: Tasks AC-65, AC-66 deliverables

---

**End of Implementation Plan: AC-72**
