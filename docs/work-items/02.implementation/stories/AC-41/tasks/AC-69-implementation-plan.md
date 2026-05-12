---
title: "AC-69 - FE - Card Component - Implementation Plan"
jira: AC-69
parent: AC-41
phase: Implementation
created: 2026-05-08
status: approved
target_repo: accounting-frontend
source_branch: features/ac-69-fe-card-component
target_branch: develop
---

# AC-69 - FE - Card Component (Implementation Plan)

Source: https://nexttoptech.atlassian.net/browse/AC-69  
Parent: https://nexttoptech.atlassian.net/browse/AC-41

---

## 1. Task Summary

- Jira key: AC-69
- Parent story: AC-41 - Implement Unified Design System, Global Theming, and Core Shared UI Components
- Task summary: FE - Card Component
- Stack: Frontend / UI / Angular Component
- Canonical task spec: [Solution Task Spec](../../../../01.solution/linked/stories/AC-41/tasks/AC-69.md)
- Primary product repository: `projects/Accounting-Frontend`
- Workspace repository artifact path: `docs/work-items/02.implementation/stories/AC-41/tasks/AC-69-implementation-plan.md`
- GitLab execution context:
  - Frontend issue: `accounting-frontend/-/work_items/3`
  - Frontend MR: `accounting-frontend/-/merge_requests/12`
  - Source branch: `features/ac-69-fe-card-component`
  - Target branch: `develop`
- Dependency posture:
  - AC-64 (Token Audit & Standardization) is **complete** — semantic elevation and spacing tokens are available.
  - AC-65 (Theme Engine) is **complete** — light/dark theme switching functional.
  - AC-68 (Button Component) is **complete** — demonstrates component structure pattern.
  - AC-69 extends the shared UI library with a reusable container component for feature UIs.
  - AC-70 through AC-76 (feature form components) can proceed in parallel after AC-69 completion; they will consume `UiCardComponent`.

---

## 2. Readiness Checks

| Check | Status | Notes |
|---|---|---|
| Goal Of Task present | Yes | Provide reusable content container with token-driven styling |
| Problem-To-Solve present | Yes | Feature UIs lack shared container abstraction; hardcoded shadows/spacing |
| AoC present | Yes | AOC-01 through AOC-10 defined in task spec |
| DoD present | Yes | DOD-01 through DOD-06 defined in task spec |
| Test Cases present | Yes | TDD (3 unit + 1 integration) and BDD (2 scenarios) in task spec |
| Fix Version target | `V 0.1 (MVP)` | Confirmed |
| Labels / scope | Frontend, Core | Confirmed |
| Parent story solution approved | Yes | AC-41 solution.md Technical Decision 3 covers shared component library approach |
| Dependency AC-64 | Complete | Semantic elevation/spacing tokens defined and available |
| Dependency AC-65 | Complete | Theme engine ensures token values resolve correctly in both themes |
| Dependency AC-68 | Complete | Button component establishes OnPush/standalone pattern to follow |
| Jira and GitLab operational traceability | Started | Issue #3, MR !12 created; transitioned to In Progress |
| Task classification | Non-Domain | Frontend UI component; no domain entities or backend changes |
| TL gate required before coding | **Yes — coding blocked until TL approval of this plan** |

---

## 3. Scope & Assumptions

**In scope:**
- Angular standalone `UiCardComponent` at `libs/shared/ui/src/lib/components/card/card.component.ts`
- Three named content projection slots: `[uiCardHeader]`, `[uiCardBody]` (default), `[uiCardFooter]`
- Optional header and footer rendering (no empty sections when not projected)
- Token-driven elevation and spacing (CSS variables only; no hardcoded pixel values)
- Theme-aware styling that respects light and dark theme semantic tokens
- Logical CSS properties for RTL/LTR support (CSS `inline`, `block` dimensions)
- `ChangeDetectionStrategy.OnPush` and standalone component pattern
- Component template, styles, and class implementation
- Unit tests covering:
  - Header slot conditional rendering
  - Footer slot conditional rendering
  - Body content projection
- Integration test: all three slots populated; DOM structure verified
- Storybook page at `apps/erp-web/src/app/dev-tools/story-book/pages/card/`
- Storybook stories covering:
  - Body-only variant
  - Header + body variant
  - Header + body + footer variant
  - Content-rich body example with nested components
  - RTL layout example
- Route registration in `apps/erp-web/src/app/dev-tools/story-book/story-book.routes.ts`
- Navigation sidebar entry in `story-book-shell.component.ts`
- Bilingual translation keys for Storybook demo labels in `en.json` and `fa.json`
- Component export from `libs/shared/ui/src/lib/components/index.ts`

**Out of scope:**
- Clickable/interactive card variant
- Card list or card grid layout abstractions
- Expandable/collapsible card behavior
- Card sizing variants (small, medium, large)
- Custom theming override mechanism
- Shadow/elevation variants beyond semantic tokens

**Assumptions:**
- AC-64 semantic tokens include at least two elevation levels for cards: `--elevation-card` and `--elevation-card-hover`
- AC-65 theme engine ensures semantic token values are available under both `:root` (light) and `[data-theme='dark']`
- `libs/shared/ui/src/lib/components/button/` exists as reference implementation for component structure
- Angular 21.2.0 with standalone component support and control flow syntax (`@if`, `@for`)
- Lucide or Material icons library available if card examples need icons
- Existing Storybook infrastructure at `apps/erp-web/src/app/dev-tools/story-book/`
- Translation i18n system is in place at `public/assets/i18n/` with `en.json` and `fa.json` files

---

## 4. Repository Routing Matrix

| Artifact | Repository | Exact Path | Action |
|---|---|---|---|
| Card component class | accounting-frontend | `libs/shared/ui/src/lib/components/card/card.component.ts` | NEW |
| Card component template | accounting-frontend | `libs/shared/ui/src/lib/components/card/card.component.html` | NEW |
| Card component styles | accounting-frontend | `libs/shared/ui/src/lib/components/card/card.component.scss` | NEW |
| Card component unit tests | accounting-frontend | `libs/shared/ui/src/lib/components/card/card.component.spec.ts` | NEW |
| Storybook page | accounting-frontend | `apps/erp-web/src/app/dev-tools/story-book/pages/card/card.stories.component.ts` | NEW |
| Storybook template | accounting-frontend | `apps/erp-web/src/app/dev-tools/story-book/pages/card/card.stories.component.html` | NEW |
| Storybook styles | accounting-frontend | `apps/erp-web/src/app/dev-tools/story-book/pages/card/card.stories.component.scss` | NEW |
| Storybook routes | accounting-frontend | `apps/erp-web/src/app/dev-tools/story-book/story-book.routes.ts` | UPDATE (add card route) |
| Storybook shell nav | accounting-frontend | `apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.ts` | UPDATE (add nav entry) |
| Component export | accounting-frontend | `libs/shared/ui/src/lib/components/index.ts` | UPDATE (export UiCardComponent) |
| Translation keys | accounting-frontend | `public/assets/i18n/en.json` | UPDATE |
| Translation keys | accounting-frontend | `public/assets/i18n/fa.json` | UPDATE |
| Workspace implementation log | accounting-workspace | `docs/work-items/02.implementation/stories/AC-41/tasks/AC-69-implementation-plan.md` | NEW (this file) |

---

## 5. Domain Hierarchy Map

AC-69 introduces a presentation-layer UI component only. No domain entities, application services, or infrastructure layer changes.

```text
projects/Accounting-Frontend/
  01.Domain/
    no changes for AC-69

  02.Application/
    no changes for AC-69

  03.Infra/
    no changes for AC-69

  04.Presentation/ (frontend presentation surface)
    libs/shared/ui/src/lib/components/card/
      card.component.ts             <- new
      card.component.html           <- new
      card.component.scss           <- new
      card.component.spec.ts        <- new
    libs/shared/ui/src/lib/components/
      index.ts                      <- update (export UiCardComponent)
    apps/erp-web/src/app/
      dev-tools/story-book/
        pages/card/
          card.stories.component.ts <- new
          card.stories.component.html <- new
          card.stories.component.scss <- new
        layout/
          story-book-shell.component.ts <- update (add nav entry)
        story-book.routes.ts        <- update (add route)
    public/assets/i18n/
      en.json                       <- update (add translation keys)
      fa.json                       <- update (add translation keys)
```

---

## 6. Entity-Centric Folder Naming Map

This task introduces one presentation-layer UI component entity and its test/demo artifacts.

| Concern | Exact Folder / File Name | Rule |
|---|---|---|
| Card component entity | `libs/shared/ui/src/lib/components/card/card.component.ts` | Named `card` (singular, lowercase); placed in entity-specific folder matching component name; standalone Angular component. |
| Card template | `libs/shared/ui/src/lib/components/card/card.component.html` | Colocated with component; `.component.html` suffix is Angular standard. |
| Card styles | `libs/shared/ui/src/lib/components/card/card.component.scss` | Colocated with component; `.component.scss` suffix is Angular standard. |
| Card unit tests | `libs/shared/ui/src/lib/components/card/card.component.spec.ts` | Colocated with component; `.spec.ts` suffix is Angular/Jest convention. |
| Storybook story | `apps/erp-web/src/app/dev-tools/story-book/pages/card/card.stories.component.ts` | Named `card.stories.component.ts`; placed in entity-specific folder matching component name. |

---

## 7. Implementation Blueprint

### 7.1 Component Architecture

The `UiCardComponent` follows Angular standalone component pattern with OnPush change detection and projection-based content composition.

**Component Class** (`card.component.ts`):

```typescript
import { Component, ChangeDetectionStrategy, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-card'
  }
})
export class UiCardComponent {
  // The component is a simple container with content projection.
  // No inputs, outputs, or state needed; just slots for header, body, footer.
  // Template handles conditional rendering of empty slots.
}
```

**Template** (`card.component.html`):

```html
<div class="ui-card__container">
  <!-- Header slot (optional) -->
  <header class="ui-card__header" *ngIf="(ng-content | headerCheck) as hasHeader">
    <ng-content select="[uiCardHeader]"></ng-content>
  </header>

  <!-- Body slot (default/always renders if projected) -->
  <main class="ui-card__body">
    <ng-content></ng-content>
  </main>

  <!-- Footer slot (optional) -->
  <footer class="ui-card__footer" *ngIf="(ng-content | footerCheck) as hasFooter">
    <ng-content select="[uiCardFooter]"></ng-content>
  </footer>
</div>
```

**Note on Conditional Rendering:**
Since `ng-content` cannot be directly queried at runtime, the component will use `@ContentChild` decorator to detect presence of each slot:

```typescript
@Component({...})
export class UiCardComponent {
  @ContentChild('[uiCardHeader]') headerContent?: TemplateRef<any>;
  @ContentChild('[uiCardBody]') bodyContent?: TemplateRef<any>;
  @ContentChild('[uiCardFooter]') footerContent?: TemplateRef<any>;
}
```

Then in template use `*ngIf="headerContent"` to conditionally render slots.

**Styling** (`card.component.scss`):

```scss
// Component uses semantic tokens only — no hardcoded colors or shadows
// Respects light/dark themes via CSS custom properties set by ThemeService

.ui-card {
  display: block;
}

.ui-card__container {
  // Container layout for three slots
  display: flex;
  flex-direction: column;
  gap: var(--spacing-0);
  
  // Theme-aware background and border
  background-color: var(--bg-card);
  border-color: var(--border-primary);
  border-width: 1px;
  border-style: solid;
  
  // Token-driven elevation
  box-shadow: var(--elevation-card);
  border-radius: var(--radius-md);
  
  // Logical padding (RTL/LTR safe)
  padding-inline: var(--spacing-4);
  padding-block: var(--spacing-4);
}

.ui-card__header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding-block-end: var(--spacing-3);
  border-block-end: 1px solid var(--border-tertiary);
  margin-inline: calc(-1 * var(--spacing-4));
  margin-block: calc(-1 * var(--spacing-4));
  margin-block-end: var(--spacing-3);
  padding-inline: var(--spacing-4);
  padding-block: var(--spacing-4);
}

.ui-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.ui-card__footer {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding-block-start: var(--spacing-3);
  border-block-start: 1px solid var(--border-tertiary);
  margin-inline: calc(-1 * var(--spacing-4));
  margin-block: var(--spacing-3);
  margin-block-end: calc(-1 * var(--spacing-4));
  padding-inline: var(--spacing-4);
  padding-block: var(--spacing-4);
}

// RTL support via logical properties
:host-context([dir='rtl']) {
  .ui-card__header,
  .ui-card__footer {
    // Logical properties handle RTL automatically
    // No additional rules needed; margin-inline and padding-inline are bidirectional
  }
}

// Dark theme variation (handled by ThemeService's [data-theme='dark'])
:host-context([data-theme='dark']) {
  // Token references in CSS custom properties automatically resolve to dark values
  // No additional rules needed; semantic tokens handle the switch
}
```

### 7.2 Storybook Stories (`card.stories.component.ts`):

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiCardComponent } from '../../../shared/ui/src/lib/components/card/card.component';
import { UiButtonComponent } from '../../../shared/ui/src/lib/components/button/button.component';

@Component({
  selector: 'app-card-stories',
  standalone: true,
  imports: [CommonModule, UiCardComponent, UiButtonComponent],
  template: `
    <div class="story-container">
      <!-- Story 1: Body Only -->
      <section class="story">
        <h3>{{ 'card.stories.body_only' | translate }}</h3>
        <ui-card>
          <p>This is a card with only body content — no header or footer.</p>
        </ui-card>
      </section>

      <!-- Story 2: Header + Body -->
      <section class="story">
        <h3>{{ 'card.stories.header_body' | translate }}</h3>
        <ui-card>
          <h4 uiCardHeader>Card Title</h4>
          <p>Body content goes here.</p>
        </ui-card>
      </section>

      <!-- Story 3: Header + Body + Footer -->
      <section class="story">
        <h3>{{ 'card.stories.header_body_footer' | translate }}</h3>
        <ui-card>
          <h4 uiCardHeader>Card Title</h4>
          <p>Body content with all three slots.</p>
          <div uiCardFooter>
            <ui-button variant="primary">Action</ui-button>
          </div>
        </ui-card>
      </section>

      <!-- Story 4: Content-Rich Body -->
      <section class="story">
        <h3>{{ 'card.stories.content_rich' | translate }}</h3>
        <ui-card>
          <h4 uiCardHeader>{{ 'card.stories.account_summary' | translate }}</h4>
          <div class="content-rich">
            <p><strong>Account:</strong> 1001</p>
            <p><strong>Balance:</strong> $5,000.00</p>
            <p><strong>Status:</strong> Active</p>
          </div>
          <div uiCardFooter>
            <ui-button variant="outline">View Details</ui-button>
          </div>
        </ui-card>
      </section>

      <!-- Story 5: RTL Example -->
      <section class="story" dir="rtl">
        <h3>{{ 'card.stories.rtl_example' | translate }}</h3>
        <ui-card>
          <h4 uiCardHeader>عنوان البطاقة</h4>
          <p>محتوى البطاقة بدعم RTL الكامل.</p>
        </ui-card>
      </section>

      <!-- Theme Toggle for Testing -->
      <section class="story">
        <h3>{{ 'card.stories.theme_test' | translate }}</h3>
        <button (click)="toggleTheme()">
          {{ currentTheme === 'light' ? 'Switch to Dark' : 'Switch to Light' }}
        </button>
        <ui-card>
          <p>Card in {{ currentTheme }} theme</p>
        </ui-card>
      </section>
    </div>
  `,
  styles: [`
    .story-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: var(--spacing-4);
      padding: var(--spacing-4);
    }
    .story {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-2);
    }
  `]
})
export class CardStoriesComponent {
  currentTheme = 'light';

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    const htmlElement = document.documentElement;
    if (this.currentTheme === 'dark') {
      htmlElement.setAttribute('data-theme', 'dark');
    } else {
      htmlElement.removeAttribute('data-theme');
    }
  }
}
```

### 7.3 Unit Tests (`card.component.spec.ts`):

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { UiCardComponent } from './card.component';

describe('UiCardComponent', () => {
  let component: UiCardComponent;
  let fixture: ComponentFixture<UiCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(UiCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // TDD-01: Header slot not rendered when no content projected
  it('should not render header when [uiCardHeader] content is not projected', () => {
    const headerElement = fixture.debugElement.query(By.css('.ui-card__header'));
    expect(headerElement).toBeNull();
  });

  // TDD-02: Footer slot not rendered when no content projected
  it('should not render footer when [uiCardFooter] content is not projected', () => {
    const footerElement = fixture.debugElement.query(By.css('.ui-card__footer'));
    expect(footerElement).toBeNull();
  });

  // TDD-03: Body renders projected content correctly
  it('should render body content when projected', () => {
    // Create a test host component that projects content
    @Component({
      selector: 'app-test-host',
      template: `
        <ui-card>
          <p>Test body content</p>
        </ui-card>
      `,
      standalone: true,
      imports: [UiCardComponent]
    })
    class TestHostComponent {}

    const testFixture = TestBed.createComponent(TestHostComponent);
    testFixture.detectChanges();

    const bodyElement = testFixture.debugElement.query(By.css('.ui-card__body'));
    expect(bodyElement).toBeTruthy();
    expect(bodyElement.nativeElement.textContent).toContain('Test body content');
  });
});
```

### 7.4 Integration Test (`card.component.integration.spec.ts`):

```typescript
// Integration test: Render with all three slots populated
it('should render header, body, and footer correctly when all are projected', () => {
  @Component({
    selector: 'app-test-host-full',
    template: `
      <ui-card>
        <h4 uiCardHeader>Test Header</h4>
        <p>Test Body Content</p>
        <button uiCardFooter>Test Footer</button>
      </ui-card>
    `,
    standalone: true,
    imports: [UiCardComponent]
  })
  class TestHostComponent {}

  const fixture = TestBed.createComponent(TestHostComponent);
  fixture.detectChanges();

  const headerElement = fixture.debugElement.query(By.css('.ui-card__header'));
  const bodyElement = fixture.debugElement.query(By.css('.ui-card__body'));
  const footerElement = fixture.debugElement.query(By.css('.ui-card__footer'));

  expect(headerElement).toBeTruthy();
  expect(bodyElement).toBeTruthy();
  expect(footerElement).toBeTruthy();

  expect(headerElement.nativeElement.textContent).toContain('Test Header');
  expect(bodyElement.nativeElement.textContent).toContain('Test Body Content');
  expect(footerElement.nativeElement.textContent).toContain('Test Footer');
});
```

---

## 8. Translation Keys

Add the following keys to `public/assets/i18n/en.json` and `public/assets/i18n/fa.json`:

**en.json:**
```json
{
  "card": {
    "stories": {
      "body_only": "Body Only",
      "header_body": "Header + Body",
      "header_body_footer": "Header + Body + Footer",
      "content_rich": "Content-Rich Example",
      "rtl_example": "RTL Layout Example",
      "theme_test": "Theme Variation Test",
      "account_summary": "Account Summary"
    }
  }
}
```

**fa.json:**
```json
{
  "card": {
    "stories": {
      "body_only": "فقط جسم البطاقة",
      "header_body": "الرأس + جسم البطاقة",
      "header_body_footer": "الرأس + جسم البطاقة + التذييل",
      "content_rich": "مثال محتوى غني",
      "rtl_example": "مثال تخطيط RTL",
      "theme_test": "اختبار تنوع المواضيع",
      "account_summary": "ملخص الحساب"
    }
  }
}
```

---

## 9. Route and Navigation Registration

**Update `story-book.routes.ts`:**
```typescript
export const STORY_BOOK_ROUTES = [
  // ... existing routes ...
  {
    path: 'card',
    loadComponent: () => import('./pages/card/card.stories.component').then(m => m.CardStoriesComponent)
  }
];
```

**Update `story-book-shell.component.ts` sidebar navigation:**
```typescript
navItems = [
  // ... existing items ...
  { label: 'Card', icon: 'layout-grid', route: '/story-book/card' }
];
```

---

## 10. Implementation Steps (Sequenced)

1. **Phase 1: Component Core** (Estimated: 1-2 hours)
   - Create `libs/shared/ui/src/lib/components/card/` folder
   - Implement `card.component.ts` with `@ContentChild` detection for header/footer/body
   - Implement `card.component.html` with conditional slot rendering
   - Implement `card.component.scss` with token-driven styling (elevation, spacing, theme support)
   - Export component from `libs/shared/ui/src/lib/components/index.ts`

2. **Phase 2: Testing** (Estimated: 1-2 hours)
   - Create `card.component.spec.ts` with TDD test cases (3 unit tests)
   - Create integration test file; add integration test case
   - Run tests and verify all pass

3. **Phase 3: Storybook** (Estimated: 1.5-2 hours)
   - Create `apps/erp-web/src/app/dev-tools/story-book/pages/card/` folder
   - Implement `card.stories.component.ts` with 5 story variants (body-only, header+body, all three, content-rich, RTL)
   - Implement `card.stories.component.html`
   - Implement `card.stories.component.scss`
   - Update `story-book.routes.ts` to register card route
   - Update `story-book-shell.component.ts` to add navigation entry

4. **Phase 4: Translations & Export** (Estimated: 30-45 minutes)
   - Add translation keys to `public/assets/i18n/en.json`
   - Add translation keys to `public/assets/i18n/fa.json`
   - Update component export in `libs/shared/ui/src/lib/components/index.ts`

5. **Phase 5: Verification** (Estimated: 30 minutes)
   - Run all unit tests; verify pass
   - Run Storybook; verify all 5 story variants render correctly in both light and dark themes
   - Verify RTL layout example renders correctly
   - Verify component is accessible with proper heading hierarchy and semantic HTML

---

## 11. TDD & BDD Coverage Mapping

### TDD Test Cases (Unit + Integration)

| Test Case | Test File | Coverage | Acceptance Criteria |
|---|---|---|---|
| T-01: Header slot not rendered when empty | `card.component.spec.ts` | AOC-02 | `.ui-card__header` element is not in DOM when `[uiCardHeader]` not projected |
| T-02: Footer slot not rendered when empty | `card.component.spec.ts` | AOC-02 | `.ui-card__footer` element is not in DOM when `[uiCardFooter]` not projected |
| T-03: Body renders projected content | `card.component.spec.ts` | AOC-01 | `.ui-card__body` contains projected content correctly |
| T-04: All three slots render together | `card.component.integration.spec.ts` | AOC-01 | Header, body, footer all present when all projected |

### BDD Scenarios

**Scenario BDD-01:** Conditional Slot Rendering
- **Given** a `UiCardComponent` with only body content projected
- **When** the component renders
- **Then** only the body region is visible; no empty header or footer `<header>` / `<footer>` elements exist in DOM
- **Maps to** AOC-02, DOD-01, T-01, T-02

**Scenario BDD-02:** Dark Theme Support
- **Given** a `UiCardComponent` rendered in dark mode (`[data-theme='dark']` on `<html>`)
- **When** the component is inspected (computed styles)
- **Then** `background-color` resolves to dark-theme semantic token value; `box-shadow` (elevation) resolves to dark-theme elevation token
- **Maps to** AOC-04, DOD-02

---

## 12. Semantic Token Dependencies

The following semantic tokens must be defined in `public/styles/tokens/_semantic.scss`:

| Token Name | Usage | Light Theme Example | Dark Theme Example |
|---|---|---|---|
| `--bg-card` | Card container background | `#ffffff` | `#1e1e2e` |
| `--border-primary` | Card border | `#e0e0e0` | `#3a3a4a` |
| `--border-tertiary` | Header/footer separator border | `#f0f0f0` | `#2a2a3a` |
| `--elevation-card` | Card shadow (default) | `0 1px 3px rgba(0, 0, 0, 0.1)` | `0 1px 3px rgba(0, 0, 0, 0.3)` |
| `--spacing-0` | Gap between slots | `0` | `0` |
| `--spacing-2` | Internal gaps | `8px` | `8px` |
| `--spacing-3` | Slot separator padding | `12px` | `12px` |
| `--spacing-4` | Container padding | `16px` | `16px` |
| `--radius-md` | Border radius | `8px` | `8px` |

**Verification at Implementation Time:**
- Confirm tokens are defined in AC-64 semantic token file
- Test that ThemeService (AC-65) correctly applies dark-theme overrides when theme switches
- Verify Storybook stories render correctly under both themes

---

## 13. Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Semantic tokens missing from AC-64 | Component styling incomplete; cannot complete | Medium | Check token file before starting; if missing, request token additions from AC-64 owner |
| `@ContentChild` projection detection unreliable | Header/footer fail to render conditionally | Low | Reference AC-68 (Button component) for proven projection pattern; test extensively |
| Storybook route registration fails | Stories not accessible in dev tools | Low | Follow existing route pattern from AC-68; test route immediately after registration |
| RTL layout issues with logical properties | RTL stories display incorrectly | Low | Test with `dir="rtl"` on container; use `margin-inline` and `padding-inline` consistently |
| Dark theme tokens not resolving | Dark theme variant displays incorrectly | Medium | Coordinate with AC-65 owner; test theme switching in Storybook before marking complete |

---

## 14. Approval Checklist

- [ ] **Tech Lead Review** — Approves implementation plan, blueprint, and test strategy
- [ ] **Architecture Review** — Confirms alignment with shared UI library conventions and DDD hierarchy
- [ ] **Product Owner Review** — Confirms scope, AoC, and DoD match business requirements
- [ ] **Dependency Verification** — AC-64 tokens available; AC-65 theme engine operational
- [ ] **TL Approval Gate** — Task must remain in `AWAITING TL APPROVAL` until this checkpoint is passed

---

## 15. Execution Notes

- **Coding blocked until TL approval** of this plan is obtained.
- Once approved, transition to implementation phase and create implementation branch if not already created.
- Coordinate with AC-70 (Input Field Component) and other dependent tasks; component will be ready for consumption after AC-69 completion.
- Upon completion, update Jira status to `In Review` and request code review per AGENTS.md workflow.
- Include both workspace MR and frontend MR links in Jira Web Links after MRs are created.

---

## 16. Traceability

- **Solution Source:** [AC-41 Solution](../../../../01.solution/linked/stories/AC-41/solution.md) — Technical Decision 3 (Shared Component Library)
- **Task Spec:** [AC-69 Solution Task Spec](../../../../01.solution/linked/stories/AC-41/tasks/AC-69.md)
- **Implementation Plan:** This file
- **GitLab Issue:** [accounting-frontend #3](https://gitlab.com/next-top-tech/accounting/accounting-frontend/-/work_items/3)
- **GitLab MR:** [accounting-frontend !12](https://gitlab.com/next-top-tech/accounting/accounting-frontend/-/merge_requests/12)
- **Jira Task:** [AC-69](https://nexttoptech.atlassian.net/browse/AC-69)
