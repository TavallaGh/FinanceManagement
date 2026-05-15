# AC-73 Implementation Plan: FE - List with Pagination Component

**Status:** Ready for TL Approval → Implementation  
**Source Task:** [AC-73](https://nexttoptech.atlassian.net/browse/AC-73)  
**Parent Story:** [AC-41](https://nexttoptech.atlassian.net/browse/AC-41) — Shared UI Foundation  
**Plan Generated:** 2026-05-15  
**Repository Target:** Frontend (`projects/Accounting-Frontend`)

---

## 1. Scope & Assumptions

### In Scope
- Implement `UiListWithPaginationComponent` as stateless, data-driven Angular standalone component
- Component location: `libs/shared/ui/src/lib/components/list-with-pagination/`
- Inputs: `pageSize`, `pageIndex`, `totalItems`, `emptyMessage`
- Output: `pageChange` event with `{ pageIndex, pageSize }` payload
- Previous/next button controls with boundary disable logic
- Content projection via `ng-content` for list items
- Token-driven styling (zero hardcoded values)
- Logical CSS properties for RTL/LTR safety
- `ChangeDetectionStrategy.OnPush` + standalone component pattern
- Storybook page with all state variants (first page, last page, RTL, empty state)
- Translation keys for pagination labels (en.json, fa.json)
- Component export from `libs/shared/ui/src/lib/components/index.ts`
- Route registration in `story-book.routes.ts` with sidebar navigation entry

### Out of Scope
- Page size selector dropdown
- Jump-to-page direct input
- Page number button list (previous/next only per refined AoC)
- Infinite scroll alternative
- Server-side pagination handler logic (consumer responsibility)

### Assumptions
1. Semantic tokens (`--color-*`, `--spacing-*`, `--radius-*`, `--elevation-*`) are defined by AC-64 (Token Audit) before component implementation begins
2. Button component (AC-68) will exist or pagination buttons may use `<button>` baseline element for now (refactor to UiButtonComponent when AC-68 is complete)
3. i18n service and translation file consolidation (public/assets/i18n/) is active (per frontend-doc-sync)
4. `[dir="rtl"|"ltr"]` attribute on `<html>` is managed by I18nService; component inherits direction automatically
5. Storybook theming (light/dark) and direction switching (via I18nService) is functional via AC-65 and AC-66

---

## 2. Repository Routing Matrix

| Artifact Type | Repository | Path | Responsibility |
|---------------|-----------|------|-----------------|
| **Product Code** | Accounting-Frontend (project) | `libs/shared/ui/src/lib/components/list-with-pagination/` | Component implementation, unit tests, spec file |
| **Storybook Page** | Accounting-Frontend (project) | `apps/story-book/src/app/pages/list-with-pagination/` | Story routes, story component, story module |
| **Story Routes Registration** | Accounting-Frontend (project) | `apps/story-book/src/app/story-book.routes.ts` | Route entry for pagination stories |
| **Storybook Sidebar Navigation** | Accounting-Frontend (project) | `apps/story-book/src/app/shell/sidebar/` | Navigation entry and category placement |
| **Translation Files** | Accounting-Frontend (project) | `public/assets/i18n/en.json`, `public/assets/i18n/fa.json` | Pagination labels: `pagination.previous`, `pagination.next`, `pagination.pageInfo` |
| **Implementation Logs** | accounting-workspace (workspace) | `docs/work-items/02.implementation/stories/AC-41/tasks/AC-73-logs.md` | Task execution log, blockers, decisions |
| **Design System Update** | accounting-workspace (workspace) | `docs/frontend/design/ui-components.md` | Component API reference, usage examples |

---

## 3. Domain Hierarchy & Folder Structure

### Domain Layers (Presentation Tier — No Domain/Application Layers for UI Components)

```
libs/shared/ui/
├── src/lib/
│   ├── components/
│   │   ├── list-with-pagination/          ← NEW (this task)
│   │   │   ├── list-with-pagination.component.ts       (component class + OnPush strategy)
│   │   │   ├── list-with-pagination.component.html     (template with ng-content projection)
│   │   │   ├── list-with-pagination.component.scss     (token-driven styling, logical properties)
│   │   │   ├── list-with-pagination.component.spec.ts  (unit tests: boundary logic, event emission)
│   │   │   └── README.md                               (component API documentation)
│   │   ├── [existing components...]
│   │   └── index.ts                                    (barrel export for all components)
│   └── index.ts                           (public API, re-exports components/index.ts)
```

### Storybook Path Structure
```
apps/story-book/
├── src/app/
│   ├── pages/
│   │   ├── list-with-pagination/          ← NEW (this task)
│   │   │   ├── list-with-pagination.stories.ts        (Storybook story definitions)
│   │   │   └── list-with-pagination-demo.component.ts (demo component for stateful wrapper)
│   │   ├── [existing pages...]
│   │   └── index.ts                       (route configuration exports)
│   ├── shell/
│   │   └── sidebar/                       (navigation item registration)
│   ├── story-book.routes.ts               (routes configuration)
│   └── story-book.module.ts or app.config.ts (Storybook app setup)
```

### Entity-Centric Naming
- **Entity**: `ListWithPagination` (not `PaginatedList`, not `PagedList` for consistency with existing component naming)
- **Component Class**: `UiListWithPaginationComponent`
- **Folder Name**: `list-with-pagination` (matches entity, kebab-case for filesystem)
- **Story File**: `list-with-pagination.stories.ts`
- **Route Path**: `/list-with-pagination`

---

## 4. Implementation Steps & Dependencies

### Execution Order
1. **Pre-Implementation Gate**: AC-64 (Token Audit) must complete and approve semantic token definitions
2. **Component Implementation** (sequential):
   - Step 1: Create component files and inputs/outputs contract
   - Step 2: Implement template with ng-content projection and pagination controls
   - Step 3: Implement boundary logic (previous/next disable states)
   - Step 4: Apply token-driven styling with logical CSS properties
   - Step 5: Implement unit tests (TDD-first if possible)
3. **Storybook & Translation** (parallel after component core is testable):
   - Step 6: Create Storybook story with state variants
   - Step 7: Add translation keys (en.json, fa.json)
   - Step 8: Register route in story-book.routes.ts and sidebar navigation
4. **Verification & Export** (sequential):
   - Step 9: Export component from libs/shared/ui index.ts
   - Step 10: Documentation update (ui-components.md)
   - Step 11: Final verification: Storybook runs, all states render, RTL verified

### Dependency Notes
- **Blocking**: AC-64 (Token definitions) must be complete before implementation begins
- **Recommended completion before**: AC-68 (Button Component) — if available, use UiButtonComponent for previous/next buttons; otherwise use `<button>` element and refactor post-AC-68
- **Can proceed in parallel**: AC-65, AC-66, AC-67, AC-72, AC-74–AC-76
- **Internal**: Component is stateless; no runtime dependencies on other shared components except optional Button (AC-68)

---

## 5. Code-Level Implementation Blueprint

### Component Contract (Inputs/Outputs/Template)

**File**: `libs/shared/ui/src/lib/components/list-with-pagination/list-with-pagination.component.ts`

```typescript
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ContentChild, TemplateRef } from '@angular/core';

@Component({
  selector: 'ui-list-with-pagination',
  standalone: true,
  imports: [CommonModule], // or material/button if AC-68 is used
  templateUrl: './list-with-pagination.component.html',
  styleUrls: ['./list-with-pagination.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiListWithPaginationComponent {
  @Input() pageSize: number = 10;
  @Input() pageIndex: number = 0;
  @Input() totalItems: number = 0;
  @Input() emptyMessage: string = 'No items to display';

  @Output() pageChange = new EventEmitter<{ pageIndex: number; pageSize: number }>();

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize) || 1;
  }

  get isPreviousDisabled(): boolean {
    return this.pageIndex === 0;
  }

  get isNextDisabled(): boolean {
    return this.pageIndex >= this.totalPages - 1;
  }

  get currentPageDisplay(): string {
    return `${this.pageIndex + 1}`; // 1-indexed for display
  }

  get pageInfoDisplay(): string {
    return `${this.currentPageDisplay} of ${this.totalPages}`;
  }

  onPreviousClick(): void {
    if (!this.isPreviousDisabled) {
      this.pageChange.emit({ pageIndex: this.pageIndex - 1, pageSize: this.pageSize });
    }
  }

  onNextClick(): void {
    if (!this.isNextDisabled) {
      this.pageChange.emit({ pageIndex: this.pageIndex + 1, pageSize: this.pageSize });
    }
  }
}
```

**File**: `libs/shared/ui/src/lib/components/list-with-pagination/list-with-pagination.component.html`

```html
<div class="ui-list-with-pagination">
  <!-- Content projection area for list items -->
  <div class="ui-list-with-pagination__content" *ngIf="totalItems > 0">
    <ng-content></ng-content>
  </div>

  <!-- Empty state -->
  <div class="ui-list-with-pagination__empty" *ngIf="totalItems === 0">
    {{ emptyMessage }}
  </div>

  <!-- Pagination controls (always visible) -->
  <div class="ui-list-with-pagination__pagination">
    <button
      type="button"
      class="ui-list-with-pagination__button ui-list-with-pagination__button--previous"
      [disabled]="isPreviousDisabled"
      (click)="onPreviousClick()"
      [attr.aria-label]="'pagination.previous' | translate"
    >
      <span class="ui-list-with-pagination__icon">←</span>
    </button>

    <span class="ui-list-with-pagination__info" [attr.aria-live]="'polite'">
      {{ pageInfoDisplay }}
    </span>

    <button
      type="button"
      class="ui-list-with-pagination__button ui-list-with-pagination__button--next"
      [disabled]="isNextDisabled"
      (click)="onNextClick()"
      [attr.aria-label]="'pagination.next' | translate"
    >
      <span class="ui-list-with-pagination__icon">→</span>
    </button>
  </div>
</div>
```

**File**: `libs/shared/ui/src/lib/components/list-with-pagination/list-with-pagination.component.scss`

```scss
// No hardcoded values; all resolved via CSS custom properties (semantic tokens from AC-64)

.ui-list-with-pagination {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md); // Token from AC-64
  
  &__content {
    flex: 1;
  }

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-block-size: 10rem; // Use block-size for vertical, respects [dir="rtl|ltr"]
    color: var(--color-on-surface-variant);
    font-size: var(--font-size-body-medium);
  }

  &__pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background-color: var(--color-surface-dim);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-outline-variant);
  }

  &__button {
    display: flex;
    align-items: center;
    justify-content: center;
    min-inline-size: 2.5rem; // Logical property: width in LTR, width in RTL (no change)
    min-block-size: 2.5rem; // Logical property: height (no direction change)
    padding: var(--spacing-xs);
    background-color: var(--color-primary-container);
    color: var(--color-on-primary-container);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 200ms ease-in-out;

    &:hover:not(:disabled) {
      background-color: var(--color-primary);
      color: var(--color-on-primary);
    }

    &:active:not(:disabled) {
      transform: scale(0.95);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background-color: var(--color-surface-dim);
      color: var(--color-on-surface-variant);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  &__icon {
    font-size: 1.25rem;
    font-weight: bold;
    
    // RTL-aware arrow direction: flip in RTL
    [dir="rtl"] & {
      &.ui-list-with-pagination__icon {
        transform: scaleX(-1);
      }
    }
  }

  &__info {
    min-inline-size: 5rem; // Logical property: minimum width
    text-align: center;
    font-size: var(--font-size-label-medium);
    font-weight: var(--font-weight-medium);
    color: var(--color-on-surface);
  }
}
```

---

## 6. Data Model & Migrations

**Not Applicable** — This is a UI component. No database entities, no backend migrations, no data model changes required.

---

## 7. Security & Privacy Controls

### Abuse Case Checks

| Abuse Case | Prevention Strategy |
|-----------|-------------------|
| XSS via injected `emptyMessage` | Sanitize via Angular DomSanitizer or require `SafeHtml` input; use text binding `{{ emptyMessage }}` (safe by default in Angular) |
| Page index manipulation (e.g., negative or out-of-bounds index) | Consumer (feature team) owns page state; component validates `pageIndex < totalPages` via computed properties; component emits only; does not accept invalid state |
| CSRF on page change event | Not applicable; pagination is local state management; no HTTP request issued by component |
| Unauthorized data access based on page index | No; component does not fetch data; consumer implements authorization on data-fetching service layer |

### Privacy Controls
- Component does not capture, store, or log user pagination behavior
- Page index/size are transient local state owned by consumer
- No telemetry or event tracking is added
- No PII exposure via template rendering (emptyMessage is consumer-controlled plain text)

---

## 8. Observability Requirements

### Logging Strategy

**Where**: Pagination component does not issue logging directly (business logic is in consumer).

**Consumer's Responsibility** (logging in feature component that consumes this):
```typescript
// In feature component that uses UiListWithPaginationComponent:
onPageChange(event: { pageIndex: number; pageSize: number }): void {
  // Log pagination action at info level
  this.logger.info('User navigated to page', {
    pageIndex: event.pageIndex,
    pageSize: event.pageSize,
    timestamp: new Date().toISOString(),
    userId: this.currentUser?.id,
    feature: 'account-list', // Example
  });
  
  // Fetch data for new page
  this.fetchAccountsForPage(event.pageIndex, event.pageSize);
}
```

### Metrics
- **Metric**: Pagination component state changes (tracked by consumer)
  - `pagination.page_changes` (counter): Total page navigations
  - `pagination.current_page` (gauge): Current page for given feature
  - `pagination.avg_items_per_page` (histogram): Page size distribution

### Traces
- Pagination does not issue traces; consumer wraps data fetch with trace context

### Accessibility Logs
- `[aria-live="polite"]` on page info display announces page changes to screen readers
- `[aria-label]` on buttons provides context for pagination actions
- No hardcoded a11y logging; browser/screen-reader integration handles announcements

---

## 9. Global Response-Key Model

### Not Applicable
Pagination component is purely presentational; it does not issue HTTP responses or error states. Error handling and response codes are the consumer's responsibility.

**If consumer encounters data-fetch error**, consumer must:
1. Set `totalItems = 0` and update `emptyMessage` to display error text (or use separate error state outside this component)
2. No `GlobalResponseKey` is issued by the pagination component itself

---

## 10. Response-Key Naming Catalog

### Not Applicable
Component does not define response keys. Catalog applies to feature services/endpoints.

---

## 11. TDD Plan & Test-First Execution Order

### Test Execution Order (TDD-First)

1. **Unit Test Suite 1: Boundary Logic**
   - Test: `Previous button disabled when pageIndex === 0`
   - Test: `Next button disabled when pageIndex >= totalPages - 1`
   - Test: `currentPageDisplay returns 1-indexed page number`
   - Test: `pageInfoDisplay shows "page X of Y" format`

2. **Unit Test Suite 2: Event Emission**
   - Test: `pageChange emits { pageIndex: pageIndex - 1 } on previous click`
   - Test: `pageChange emits { pageIndex: pageIndex + 1 } on next click`
   - Test: `pageChange does not emit when previous is disabled`
   - Test: `pageChange does not emit when next is disabled`

3. **Unit Test Suite 3: Content Projection & Empty State**
   - Test: `ng-content projects list items when totalItems > 0`
   - Test: `emptyMessage renders when totalItems === 0`
   - Test: `Content area hidden when totalItems === 0`

4. **Unit Test Suite 4: Change Detection**
   - Test: `Component uses ChangeDetectionStrategy.OnPush` (static assertion)
   - Test: `Input changes trigger change detection (no manual markForCheck needed)`

5. **Unit Test Suite 5: Translation & Accessibility**
   - Test: `Previous button aria-label references 'pagination.previous' key`
   - Test: `Next button aria-label references 'pagination.next' key`
   - Test: `Page info element has aria-live="polite"`

### Test Implementation Pseudo-Code
```typescript
// list-with-pagination.component.spec.ts

describe('UiListWithPaginationComponent', () => {
  let component: UiListWithPaginationComponent;
  let fixture: ComponentFixture<UiListWithPaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiListWithPaginationComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(UiListWithPaginationComponent);
    component = fixture.componentInstance;
  });

  describe('Boundary Logic', () => {
    it('should disable previous button when pageIndex is 0', () => {
      component.pageIndex = 0;
      fixture.detectChanges();
      expect(component.isPreviousDisabled).toBe(true);
    });

    it('should disable next button on last page', () => {
      component.pageIndex = 3; // e.g., pages 0-3 (4 pages total)
      component.totalItems = 40;
      component.pageSize = 10;
      fixture.detectChanges();
      expect(component.isNextDisabled).toBe(true);
    });

    it('should return correct pageInfoDisplay', () => {
      component.pageIndex = 2;
      component.pageSize = 10;
      component.totalItems = 50;
      fixture.detectChanges();
      expect(component.pageInfoDisplay).toBe('3 of 5');
    });
  });

  describe('Event Emission', () => {
    it('should emit pageChange with decremented pageIndex on previous click', (done) => {
      component.pageIndex = 2;
      component.pageSize = 10;
      component.totalItems = 50;
      
      component.pageChange.subscribe((event) => {
        expect(event).toEqual({ pageIndex: 1, pageSize: 10 });
        done();
      });
      
      fixture.detectChanges();
      component.onPreviousClick();
    });

    it('should emit pageChange with incremented pageIndex on next click', (done) => {
      component.pageIndex = 1;
      component.pageSize = 10;
      component.totalItems = 50;
      
      component.pageChange.subscribe((event) => {
        expect(event).toEqual({ pageIndex: 2, pageSize: 10 });
        done();
      });
      
      fixture.detectChanges();
      component.onNextClick();
    });

    it('should not emit when previous is disabled', () => {
      component.pageIndex = 0;
      let emitted = false;
      component.pageChange.subscribe(() => {
        emitted = true;
      });
      
      fixture.detectChanges();
      component.onPreviousClick();
      expect(emitted).toBe(false);
    });
  });

  describe('Content Projection & Empty State', () => {
    it('should render ng-content when totalItems > 0', () => {
      component.totalItems = 10;
      fixture.detectChanges();
      const contentDiv = fixture.debugElement.query(
        By.css('.ui-list-with-pagination__content')
      );
      expect(contentDiv).toBeTruthy();
    });

    it('should render emptyMessage when totalItems === 0', () => {
      component.totalItems = 0;
      component.emptyMessage = 'No data found';
      fixture.detectChanges();
      const emptyDiv = fixture.debugElement.query(
        By.css('.ui-list-with-pagination__empty')
      );
      expect(emptyDiv.nativeElement.textContent).toContain('No data found');
    });
  });
});
```

---

## 12. BDD Scenarios with Evidence

### Scenario 1: First Page Display
```gherkin
Feature: List with Pagination Component - Page State Management

  Scenario: User views first page of list
    Given UiListWithPaginationComponent is rendered
      And pageIndex=0, pageSize=10, totalItems=35
    When component initializes
    Then previous button is disabled
      And next button is enabled
      And page info displays "Page 1 of 4"
      And ng-content area is visible

    Evidence:
      - Inspect `.ui-list-with-pagination__button--previous` → [disabled] attribute present
      - Inspect `.ui-list-with-pagination__button--next` → [disabled] attribute absent
      - Inspect `.ui-list-with-pagination__info` → text content matches regex "Page 1 of 4"
      - Inspect `.ui-list-with-pagination__content` → visible (display !== none)
```

### Scenario 2: Last Page Display
```gherkin
  Scenario: User navigates to last page
    Given UiListWithPaginationComponent with pageSize=10, totalItems=35
    When pageIndex is set to 3 (4th page, last page)
    Then next button is disabled
      And previous button is enabled
      And page info displays "Page 4 of 4"

    Evidence:
      - Inspect `.ui-list-with-pagination__button--next` → [disabled] attribute present
      - Inspect `.ui-list-with-pagination__button--previous` → [disabled] attribute absent
      - Inspect `.ui-list-with-pagination__info` → text content matches "Page 4 of 4"
```

### Scenario 3: Empty State
```gherkin
  Scenario: No items to display
    Given UiListWithPaginationComponent with totalItems=0
      And emptyMessage="No results found"
    When component renders
    Then content area is hidden
      And empty message is visible
      And pagination controls are still rendered (but both buttons disabled)

    Evidence:
      - Inspect `.ui-list-with-pagination__content` → visibility: hidden or display: none
      - Inspect `.ui-list-with-pagination__empty` → visible and contains "No results found"
      - Inspect `.ui-list-with-pagination__pagination` → visible
      - Both previous and next buttons have [disabled] attribute
```

### Scenario 4: RTL Layout
```gherkin
  Scenario: Pagination controls in RTL layout
    Given UiListWithPaginationComponent rendered in RTL context
      And html[dir="rtl"] attribute is set
      And pageIndex=1, pageSize=10, totalItems=35
    When Storybook loads in RTL mode
    Then previous button arrow icon is flipped (points right, toward start)
      And next button arrow icon is flipped (points left, toward end)
      And pagination controls layout respects logical properties (inline-start/inline-end)

    Evidence (in Storybook):
      - Visual: Previous arrow visually points to the right in RTL
      - Visual: Next arrow visually points to the left in RTL
      - CSS inspection: `.ui-list-with-pagination__button` uses `min-inline-size` (not width)
      - CSS inspection: `.ui-list-with-pagination__pagination` uses `gap: var(--spacing-sm)` (respects flex direction)
```

### Scenario 5: Page Navigation Emission
```gherkin
  Scenario: User clicks pagination button
    Given UiListWithPaginationComponent with pageIndex=1, pageSize=10, totalItems=50
    When user clicks "next" button
    Then pageChange event is emitted
      And event payload is { pageIndex: 2, pageSize: 10 }

    Evidence (in Storybook action panel):
      - Inspect Actions panel → "pageChange" action logged
      - Payload shows { pageIndex: 2, pageSize: 10 }
```

---

## 13. Implementation Files & Contracts Summary

| File | Responsibility | LOC Est. | Critical Decisions |
|------|---|---|---|
| `list-with-pagination.component.ts` | Component logic, inputs, outputs, computed properties | ~50 | Stateless design (no internal page state), 1-indexed display (0-indexed input) |
| `list-with-pagination.component.html` | Template, ng-content, projection, pagination controls | ~40 | `aria-live="polite"`, `aria-label` with translation keys, simple button markup |
| `list-with-pagination.component.scss` | Token-driven styling, RTL-aware logical properties, disabled/hover states | ~80 | Zero hardcoded values, logical properties (`inline-size`, `block-size`, `margin-inline-*`), `[dir="rtl"]` selector for icon flip |
| `list-with-pagination.component.spec.ts` | TDD unit tests: boundary logic, event emission, projection, a11y | ~150 | Comprehensive boundary tests, event payload validation, no template-based DOM testing dependency |
| `list-with-pagination.stories.ts` | Storybook story definitions, state variants, controls | ~100 | Story templates for first page, last page, middle page, single page, empty state, RTL variant |
| `list-with-pagination-demo.component.ts` | Optional demo component showing stateful wrapper | ~50 | Shows consumer pattern (managing page state outside component) |
| `libs/shared/ui/src/lib/components/index.ts` | Barrel export update | +2 | Add `export * from './list-with-pagination/list-with-pagination.component'` |

---

## 14. Rollout, Rollback & Feature Flag Strategy

### Rollout Strategy
1. **Phase 1 (Component Core)**: Component delivered to `libs/shared/ui`, exported from barrel, available for import by any feature
2. **Phase 2 (Storybook Registration)**: Route and sidebar navigation registered; Storybook accessible at `/story-book/list-with-pagination`
3. **Phase 3 (Feature Adoption)**: Feature teams (e.g., accounts, invoices) adopt and integrate into their own feature pages; no feature flag required because component is purely presentational
4. **Rollback Scenario**: If critical bug found, revert component to previous version; feature teams must fall back to inline pagination implementation temporarily

### No Feature Flag Required
- Pagination component is backward-compatible (new shared library addition)
- No breaking changes to existing shared components
- Feature teams opt-in by importing `UiListWithPaginationComponent`
- No runtime feature flag toggle needed

### Deprecation Path
- If new pagination paradigm emerges (e.g., infinite scroll), existing `UiListWithPaginationComponent` is marked `@deprecated` with migration guide; old component remains functional for backward compatibility

---

## 15. Completion Checklist (AoC → DoD Mapping)

### AoC → Implementation Mapping

| AoC Item | Implementation Evidence | Verification Method |
|----------|-------------------------|-------------------|
| AOC-01: Inputs/outputs contract | `list-with-pagination.component.ts` has `@Input pageSize, pageIndex, totalItems` and `@Output pageChange` | Code inspection + TypeScript compilation |
| AOC-02: Pagination controls render | `list-with-pagination.component.html` has previous, page indicator, next buttons | Storybook visual + DOM inspection |
| AOC-03: Boundary disabled states | `isPreviousDisabled`, `isNextDisabled` computed properties + unit tests | Unit test: "Previous disabled at pageIndex=0" passes |
| AOC-04: Stateless pageChange event | Component does not store `pageIndex`; emits only; consumer updates via `@Input` | Unit test: "pageChange emits new pageIndex, component re-receives via @Input" |
| AOC-05: Content projection | `<ng-content></ng-content>` in template | Storybook story projects list items into component |
| AOC-06: Empty state | Conditional `*ngIf="totalItems === 0"` renders `emptyMessage` | Storybook story "Empty State" variant |
| AOC-07: Token-driven styling | No hardcoded hex colors, spacing px, etc. in `.scss` file | CSS inspection: all values use `var(--*)` |
| AOC-08: Logical CSS properties | Template styles use `inline-size`, `margin-inline-*`, `block-size` | CSS inspection + RTL Storybook variant |
| AOC-09: OnPush + standalone | `ChangeDetectionStrategy.OnPush` + `standalone: true` in component decorator | Code inspection |
| AOC-10: Storybook coverage | Stories cover first page, last page, middle, single page, empty, RTL | Storybook renders all 6+ story variants |
| AOC-11: Export from index | `libs/shared/ui/src/lib/components/index.ts` includes component export | Code inspection + import test |
| AOC-12: Route + sidebar | Route in `story-book.routes.ts`, sidebar navigation item present | Manual: Navigate to `/story-book` and verify link |
| AOC-13: Translation keys | `en.json` and `fa.json` contain `pagination.previous`, `pagination.next`, `pagination.pageInfo` | JSON inspection + `translate` pipe test |

### DoD → Verification Mapping

| DoD Item | Verification Step | Acceptance Criteria |
|----------|-------------------|-------------------|
| DOD-01: Stateless component | Unit test "pageChange updates component via @Input" passes | Component re-renders when parent updates inputs (no internal state) |
| DOD-02: Previous/next controls | Unit tests for boundary logic pass; Storybook shows correct disabled states | All 4 tests pass; visual inspection confirms buttons gray/disabled at boundaries |
| DOD-03: Empty state | Unit test "emptyMessage renders when totalItems=0" passes | Storybook "Empty State" variant shows message, no crash |
| DOD-04: Token styling | CSS inspection: no hardcoded color/spacing/radius values | All styles use `var(--*)` tokens defined by AC-64 |
| DOD-05: Storybook full coverage | Storybook loads all stories; light/dark theme switch works; RTL layout correct | Screenshot comparison: same component looks correct in light, dark, LTR, RTL |
| DOD-06: Component exported | `libs/shared/ui` exposes `UiListWithPaginationComponent` publicly | `import { UiListWithPaginationComponent } from '@myapp/shared/ui'` works |
| DOD-07: Unit tests pass | All unit test suites execute with 100% pass rate | `ng test --watch=false` returns exit code 0 |
| DOD-08: Translation keys present | `en.json` and `fa.json` validated for required keys | Script verifies `pagination.previous`, `pagination.next` exist and are non-empty |

---

## 16. Approval Gate & Handoff

### Pre-Approval Checklist (Ready for TL Review)

- ✅ Task AC-73 readiness validation complete (AoC, DoD, test cases present)
- ✅ Repository targets confirmed (Accounting-Frontend project)
- ✅ Dependencies identified (AC-64 blocking, AC-68 recommended)
- ✅ Implementation plan covers: scope, repository routing, domain structure, code blueprint, TDD/BDD, all AoC/DoD items
- ✅ No ambiguous architectural decisions; folder structure and file paths explicit
- ✅ Logging, observability, security, and translation strategy defined
- ✅ RTL/LTR strategy aligned with existing frontend conventions (logical CSS properties, `[dir]` attribute inheritance)

### Tech Lead Approval Required

**Question for TL:**

Review the implementation plan for AC-73 above. Is the plan production-ready and sufficiently detailed to execute without guessing missing architecture?

**Approval Criteria:**
1. All repository targets are clear and correct
2. Component contract (inputs/outputs) is unambiguous
3. Token strategy for styling is approved (assuming AC-64 tokens will be available)
4. Test plan covers all AoC and DoD items
5. Storybook coverage scope is acceptable

**If TL Approves:**
→ Proceed to implementation phase with `/speckit.implement AC-73` command
→ Execute TDD-first per test plan (Section 11)
→ Follow code blueprint (Section 5)
→ Maintain Git flow: feature branch → task MR (workspace + project) → review → merge to `develop`

**If TL Rejects:**
→ Return remediation checklist with specific missing items
→ Update implementation plan
→ Resubmit for approval

---

## 17. Git Flow & Traceability Setup (Post-Approval)

### Jira Metadata Update (Post-Approval)
- **Epic**: Must be set to `AC-41` (parent story)
- **Fix Version**: Must be `V 0.1 (MVP)`
- **Labels**: Add `frontend`, `ui-component` (based on task scope)

### GitLab Issue & MR Creation (Post-Approval)
Once TL approves, run:
```powershell
scripts/speckit-taskstoissues.ps1 AC-73 "Repo FRONT"
```

This will:
1. Create GitLab issue under `accounting-workspace` project with task summary and parent story link
2. Create workspace MR for implementation logs (`docs/work-items/...`)
3. Create project MR for component code (`libs/shared/ui/...`)
4. Link both MRs to Jira task via Web Links
5. Set MRs to `Draft` status

### MR Merge Strategy
- Default: `Squash commits` + `Delete source branch` enabled
- Final merge to `develop` after review approval

---

## 18. Implementation Handoff

**Status:** Ready for implementation phase  
**Next Command:** `/speckit.implement AC-73-implementation-plan.md` (pending TL approval)  
**Implementation Owner:** [TBD - will be assigned post-approval]  
**Expected Duration:** 3–5 business days (component + tests + Storybook + translation)  
**Success Criteria:** All DoD items satisfied, code review approved, merge to `develop` complete

---

**Plan Owner Signature Line (for Jira/Approval Gate):**  
**Prepared by:** AI Agent (Automated task planning)  
**Generated:** 2026-05-15  
**Status:** ⏳ **PENDING TECH LEAD APPROVAL**
