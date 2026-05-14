# AC-76 Implementation Plan

**Task**: AC-76 - FE - Scroll Container Component  
**Parent Story**: AC-41  
**Repository Target**: FRONT (Accounting-Frontend)  
**Status**: Ready for Implementation  
**Plan Approval**: Approved

---

## Quick Reference

| Item | Value |
|------|-------|
| **Jira Key** | AC-76 |
| **Summary** | FE - Scroll Container Component |
| **Type** | Subtask |
| **Parent** | AC-41 (Implement Unified Design System, Global Theming, and Core Shared UI Components) |
| **Repository** | FRONT (Accounting-Frontend) |
| **Component Location** | `libs/shared/ui/src/lib/components/scroll-container/` |
| **Feature Branch** | `features/ac-76-fe-scroll-container-component` |
| **Target Branch** | `develop` |
| **Fix Version** | V 0.1 (MVP) |
| **Labels** | Core, Frontend |

---

## Requirement Traceability Matrix

| ID | Requirement | Type | Implementation Task | Test Case | Status |
|----|-------------|------|---------------------|-----------|--------|
| AOC-01 | Orientation input ('vertical' \| 'horizontal' \| 'both'; default 'vertical') | AoC | Add @Input() orientation property | Input binding test | Not Started |
| AOC-02 | Correct overflow CSS based on orientation | AoC | Implement overflow styles in component SCSS | Overflow CSS test | Not Started |
| AOC-03 | Custom scrollbar styling (::-webkit-scrollbar, scrollbar-width, scrollbar-color) with token colors | AoC | Add scrollbar styles in component SCSS; resolve colors from tokens | Scrollbar style verification | Not Started |
| AOC-04 | Scrollbar styling adapts to light/dark theme via token resolution | AoC | Use CSS custom properties/tokens for scrollbar colors | Theme switching test | Not Started |
| AOC-05 | Content projection using ng-content | AoC | Add ng-content to template | Content projection test | Not Started |
| AOC-06 | Logical CSS properties; RTL-compatible scrollbar direction | AoC | Use inset-inline-end, padding-inline, gap, etc.; verify RTL layout | RTL layout test | Not Started |
| AOC-07 | ChangeDetectionStrategy.OnPush; standalone pattern; zero hardcoded values | AoC | Component class setup; token-driven styling | Code review check | Not Started |
| AOC-08 | Storybook page with 6 variants: vertical, horizontal, both, light theme, dark theme, RTL | AoC | Create scroll-container.stories.ts with all stories | Storybook visual validation | Not Started |
| AOC-09 | Component exported from libs/shared/ui/src/lib/components/index.ts | AoC | Add barrel export | Export resolution test | Not Started |
| AOC-10 | Route registered in story-book.routes.ts | AoC | Add Storybook route | Navigation test | Not Started |
| AOC-11 | i18n keys for demo text in en.json and fa.json | AoC | Add translation keys | i18n key resolution test | Not Started |
| DOD-01 | UiScrollContainerComponent implemented with orientation input and content projection | DoD | Phase 1 & 2 complete | Component functionality test | Not Started |
| DOD-02 | Component uses ChangeDetectionStrategy.OnPush and standalone pattern | DoD | Verify Phase 1 implementation | Code review | Not Started |
| DOD-03 | Custom scrollbar styling with token-driven colors; theme-aware | DoD | Phase 2 styling complete | Theme test matrix | Not Started |
| DOD-04 | Logical CSS properties used; RTL-compatible | DoD | Linting + manual audit | RTL test | Not Started |
| DOD-05 | Content projection via ng-content functional | DoD | Phase 1 template complete | Content test | Not Started |
| DOD-06 | Storybook demonstrates all 6 usage scenarios | DoD | Phase 3 complete | Visual test suite | Not Started |
| DOD-07 | Component exported and route registered | DoD | Phase 3 complete | Import/navigation test | Not Started |
| DOD-08 | MR ready for review; all tests passing; Jira transitioned to In Review | DoD | Phase 5 complete | CI/CD pipeline checks | Not Started |

---

## Implementation Execution Plan

### Phase 1: Component Setup & Structure
**Duration**: 2–3 hours  
**Goal**: Establish component class, template, and basic configuration

**Tasks**:

1.1. **Create Component Folder Structure**
   - Path: `libs/shared/ui/src/lib/components/scroll-container/`
   - Create files:
     - `scroll-container.component.ts` - Component class
     - `scroll-container.component.html` - Component template
     - `scroll-container.component.scss` - Component styles
     - `index.ts` - Barrel export
   - **Deliverable**: Folder structure created with placeholder files

1.2. **Implement Component TypeScript Class**
   - Path: `scroll-container.component.ts`
   - Contents:
     ```typescript
     import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
     import { CommonModule } from '@angular/common';
     
     type ScrollOrientation = 'vertical' | 'horizontal' | 'both';
     
     @Component({
       selector: 'ui-scroll-container',
       standalone: true,
       imports: [CommonModule],
       templateUrl: './scroll-container.component.html',
       styleUrls: ['./scroll-container.component.scss'],
       changeDetection: ChangeDetectionStrategy.OnPush
     })
     export class UiScrollContainerComponent {
       @Input() orientation: ScrollOrientation = 'vertical';
     }
     ```
   - Ensure:
     - Standalone declaration (no module imports)
     - ChangeDetectionStrategy.OnPush enabled
     - @Input() orientation with correct type and default value
     - CommonModule imported for *ngIf if needed
   - **Deliverable**: Component TypeScript class complete

1.3. **Implement Component Template**
   - Path: `scroll-container.component.html`
   - Contents:
     ```html
     <div
       class="ui-scroll-container"
       [attr.data-scroll-orientation]="orientation"
     >
       <ng-content></ng-content>
     </div>
     ```
   - Features:
     - Single root div with class `ui-scroll-container`
     - Dynamic `[attr.data-scroll-orientation]` attribute for CSS targeting
     - ng-content for content projection (no constraints on content type)
   - **Deliverable**: Component template complete

1.4. **Create Barrel Export**
   - Path: `scroll-container/index.ts`
   - Contents:
     ```typescript
     export * from './scroll-container.component';
     ```
   - **Deliverable**: Barrel export file created

1.5. **Add Component to Library Exports**
   - Path: `libs/shared/ui/src/lib/components/index.ts` (main barrel export)
   - Add line:
     ```typescript
     export * from './scroll-container';
     ```
   - Verify:
     - Export is added in alphabetical order (or project convention)
     - No duplicate exports
   - **Deliverable**: Component exported from library

**Exit Criteria**:
- [ ] Folder structure created with all required files
- [ ] Component TypeScript class compiles without errors
- [ ] Template renders with ng-content projection
- [ ] Barrel exports resolve correctly
- [ ] Component compiles in dev/build

---

### Phase 2: Styling & Theming
**Duration**: 3–4 hours  
**Goal**: Implement overflow behavior, custom scrollbars, and theme-aware styling

**Tasks**:

2.1. **Research Design Tokens for Scrollbar Colors**
   - Location: Explore `libs/shared/tokens/` or `src/shared/tokens/`
   - Identify available semantic tokens:
     - Scrollbar track color (light theme)
     - Scrollbar thumb color (light theme)
     - Scrollbar track color (dark theme)
     - Scrollbar thumb color (dark theme)
   - Document token names and CSS variable references
   - If tokens don't exist, create placeholder CSS custom properties:
     - `--scrollbar-track-color-light`
     - `--scrollbar-thumb-color-light`
     - `--scrollbar-track-color-dark`
     - `--scrollbar-thumb-color-dark`
     - Add TODO comment: "Replace with AC-64 token references"
   - **Deliverable**: Token research document in task record

2.2. **Implement Core Overflow Styles**
   - Path: `scroll-container.component.scss`
   - Add base container styles:
     ```scss
     .ui-scroll-container {
       width: 100%;
       height: 100%;
       overflow: auto; // default
     }
     
     // Orientation-based overflow control
     [data-scroll-orientation="vertical"] {
       overflow-x: hidden;
       overflow-y: auto;
     }
     
     [data-scroll-orientation="horizontal"] {
       overflow-x: auto;
       overflow-y: hidden;
     }
     
     [data-scroll-orientation="both"] {
       overflow: auto;
     }
     ```
   - Ensure:
     - Width/height can accommodate content
     - Overflow values respect orientation input
     - Logical properties used (not physical left/right)
   - **Deliverable**: Core overflow styles implemented

2.3. **Implement Webkit Scrollbar Styling**
   - Add to `scroll-container.component.scss`:
     ```scss
     // Webkit browsers (Chrome, Edge, Safari)
     .ui-scroll-container {
       &::-webkit-scrollbar {
         width: 12px;
         height: 12px;
       }
     
       &::-webkit-scrollbar-track {
         background: var(--scrollbar-track-color-light, #f1f1f1);
       }
     
       &::-webkit-scrollbar-thumb {
         background: var(--scrollbar-thumb-color-light, #888);
         border-radius: 6px;
         
         &:hover {
           background: var(--scrollbar-thumb-color-light-hover, #555);
         }
       }
     }
     
     // Dark theme scrollbar styles
     :host-context(.dark-theme) .ui-scroll-container,
     .dark-theme .ui-scroll-container {
       &::-webkit-scrollbar-track {
         background: var(--scrollbar-track-color-dark, #2a2a2a);
       }
     
       &::-webkit-scrollbar-thumb {
         background: var(--scrollbar-thumb-color-dark, #666);
         
         &:hover {
           background: var(--scrollbar-thumb-color-dark-hover, #999);
         }
       }
     }
     ```
   - Notes:
     - Scrollbar width/height typically 12-16px
     - Use rounded corners for thumb (border-radius)
     - Add hover state for interactivity
   - **Deliverable**: Webkit scrollbar styles implemented

2.4. **Implement Firefox Scrollbar Styling**
   - Add to `scroll-container.component.scss`:
     ```scss
     // Firefox support (scrollbar-width, scrollbar-color)
     .ui-scroll-container {
       scrollbar-width: thin;
       scrollbar-color: var(--scrollbar-thumb-color-light, #888) 
                        var(--scrollbar-track-color-light, #f1f1f1);
     }
     
     // Dark theme for Firefox
     :host-context(.dark-theme) .ui-scroll-container,
     .dark-theme .ui-scroll-container {
       scrollbar-color: var(--scrollbar-thumb-color-dark, #666) 
                        var(--scrollbar-track-color-dark, #2a2a2a);
     }
     ```
   - Notes:
     - `scrollbar-width: thin` aligns with webkit 12px width
     - `scrollbar-color` uses space-separated format: `<thumb> <track>`
     - Limited customization in Firefox (no rounded corners)
   - **Deliverable**: Firefox scrollbar styles implemented

2.5. **Implement Theme-Aware Styling**
   - Add CSS custom property definitions for theme switching
   - Methods (choose based on project convention):
     - **Option A**: Light/dark theme class on root element
       ```scss
       .light-theme {
         --scrollbar-track-color: #f1f1f1;
         --scrollbar-thumb-color: #888;
       }
       
       .dark-theme {
         --scrollbar-track-color: #2a2a2a;
         --scrollbar-thumb-color: #666;
       }
       ```
     - **Option B**: CSS prefers-color-scheme media query
       ```scss
       @media (prefers-color-scheme: light) {
         .ui-scroll-container {
           --scrollbar-track-color: #f1f1f1;
           --scrollbar-thumb-color: #888;
         }
       }
       
       @media (prefers-color-scheme: dark) {
         .ui-scroll-container {
           --scrollbar-track-color: #2a2a2a;
           --scrollbar-thumb-color: #666;
         }
       }
       ```
   - Verify:
     - Theme variables used in scrollbar styles (no hardcoded colors)
     - Theme switching tested in Storybook (Phase 3)
   - **Deliverable**: Theme-aware styling implemented

2.6. **Ensure RTL Compatibility**
   - Audit all CSS for logical properties:
     - ✅ Use `gap`, `padding-inline`, `margin-inline`, `inset-inline-start`, `inset-inline-end`
     - ❌ Avoid `left`, `right`, `padding-left`, `padding-right`, `margin-left`, `margin-right`
   - Verify:
     - Scrollbar direction reverses naturally in RTL mode
     - No hardcoded left/right positioning
     - All spacing uses logical properties
   - **Deliverable**: RTL compatibility verified

2.7. **Add Component-Level Comments**
   - Document:
     - Component purpose (reusable scroll wrapper)
     - Orientation behavior
     - Token references
     - Browser support notes (webkit vs Firefox differences)
   - Example comment block:
     ```scss
     /**
      * UiScrollContainerComponent SCSS
      * 
      * Provides consistent scroll styling with token-driven colors.
      * Supports three scroll orientations: vertical, horizontal, both.
      * 
      * Scrollbar styling uses:
      * - Webkit (::-webkit-scrollbar) for Chrome, Edge, Safari
      * - scrollbar-width/scrollbar-color for Firefox
      * - CSS custom properties for theme-aware colors (light/dark mode)
      * 
      * All colors resolve from semantic tokens for maintainability.
      * RTL-compatible: uses logical CSS properties only.
      */
     ```
   - **Deliverable**: Code comments added

**Code Quality Checks**:
- [ ] All token references use CSS custom properties (no hardcoded hex values)
- [ ] No physical left/right CSS properties
- [ ] Scrollbar styles compile without SCSS errors
- [ ] Theme switching works correctly
- [ ] RTL rendering verified

**Exit Criteria**:
- [ ] Overflow behavior correct for all orientations
- [ ] Webkit and Firefox scrollbar styles implemented
- [ ] Theme-aware colors applied
- [ ] RTL compatibility verified
- [ ] SCSS compiles without errors
- [ ] Component renders with styled scrollbars

---

### Phase 3: Storybook Documentation & Stories
**Duration**: 3–4 hours  
**Goal**: Create interactive examples and demonstrate all usage scenarios

**Tasks**:

3.1. **Create Storybook Story File**
   - Path: `libs/shared/ui/src/lib/components/scroll-container/scroll-container.stories.ts`
   - Language: TypeScript (`.stories.ts` format)
   - Structure:
     ```typescript
     import { Meta, StoryObj } from '@storybook/angular';
     import { UiScrollContainerComponent } from './scroll-container.component';
     
     const meta: Meta<UiScrollContainerComponent> = {
       component: UiScrollContainerComponent,
       title: 'Core/Scroll Container',
       tags: ['autodocs']
     };
     
     export default meta;
     type Story = StoryObj<typeof meta>;
     
     export const VerticalScroll: Story = { ... };
     export const HorizontalScroll: Story = { ... };
     export const BothAxesScroll: Story = { ... };
     export const LightThemeScrollbar: Story = { ... };
     export const DarkThemeScrollbar: Story = { ... };
     export const RTLLayout: Story = { ... };
     ```
   - **Deliverable**: Story file skeleton created

3.2. **Implement Story 1: Vertical Scroll**
   - Story name: `VerticalScroll`
   - Template:
     ```typescript
     export const VerticalScroll: Story = {
       args: {
         orientation: 'vertical'
       },
       template: `
         <ui-scroll-container orientation="vertical" style="height: 300px; border: 1px solid #ccc;">
           <div style="padding: 16px;">
             <h3>{{ 'storybook.scroll.verticalTitle' | translate }}</h3>
             <p *ngFor="let item of itemsList">{{ item }}</p>
           </div>
         </ui-scroll-container>
       `
     };
     ```
   - Demo content: 10-15 paragraphs to exceed 300px height
   - Show: Vertical scrollbar visible, horizontal hidden
   - **Deliverable**: Vertical scroll story complete

3.3. **Implement Story 2: Horizontal Scroll**
   - Story name: `HorizontalScroll`
   - Template:
     ```typescript
     export const HorizontalScroll: Story = {
       args: {
         orientation: 'horizontal'
       },
       template: `
         <ui-scroll-container orientation="horizontal" style="width: 100%; height: 150px; border: 1px solid #ccc;">
           <div style="display: flex; gap: 16px; padding: 16px; min-width: max-content;">
             <div *ngFor="let item of wideItemsList" 
                  style="flex-shrink: 0; width: 200px; background: #f0f0f0; padding: 16px;">
               {{ item }}
             </div>
           </div>
         </ui-scroll-container>
       `
     };
     ```
   - Demo content: 8-10 wide boxes (200px each) to exceed container width
   - Show: Horizontal scrollbar visible, vertical hidden
   - **Deliverable**: Horizontal scroll story complete

3.4. **Implement Story 3: Both Axes Scroll**
   - Story name: `BothAxesScroll`
   - Template:
     ```typescript
     export const BothAxesScroll: Story = {
       args: {
         orientation: 'both'
       },
       template: `
         <ui-scroll-container orientation="both" style="width: 100%; height: 300px; border: 1px solid #ccc;">
           <div style="padding: 16px; min-width: max-content;">
             <h3>{{ 'storybook.scroll.bothTitle' | translate }}</h3>
             <table style="border-collapse: collapse;">
               <tr *ngFor="let row of tableData">
                 <td *ngFor="let cell of row" 
                     style="border: 1px solid #ddd; padding: 8px; white-space: nowrap;">
                   {{ cell }}
                 </td>
               </tr>
             </table>
           </div>
         </ui-scroll-container>
       `
     };
     ```
   - Demo content: Table with many rows and columns
   - Show: Both horizontal and vertical scrollbars visible
   - **Deliverable**: Both axes scroll story complete

3.5. **Implement Story 4: Light Theme Showcase**
   - Story name: `LightThemeScrollbar`
   - Template:
     ```typescript
     export const LightThemeScrollbar: Story = {
       args: {
         orientation: 'vertical'
       },
       template: `
         <div class="light-theme">
           <ui-scroll-container orientation="vertical" style="height: 300px; border: 1px solid #ccc;">
             <div style="padding: 16px;">
               <h3>{{ 'storybook.scroll.lightTheme' | translate }}</h3>
               <p *ngFor="let item of itemsList">{{ item }}</p>
             </div>
           </ui-scroll-container>
         </div>
       `
     };
     ```
   - Show: Scrollbar styling in light theme (light colors)
   - **Deliverable**: Light theme story complete

3.6. **Implement Story 5: Dark Theme Showcase**
   - Story name: `DarkThemeScrollbar`
   - Template:
     ```typescript
     export const DarkThemeScrollbar: Story = {
       args: {
         orientation: 'vertical'
       },
       template: `
         <div class="dark-theme" style="background: #1a1a1a; padding: 16px; border-radius: 4px;">
           <ui-scroll-container orientation="vertical" style="height: 300px; border: 1px solid #444; color: #fff;">
             <div style="padding: 16px;">
               <h3>{{ 'storybook.scroll.darkTheme' | translate }}</h3>
               <p *ngFor="let item of itemsList">{{ item }}</p>
             </div>
           </ui-scroll-container>
         </div>
       `
     };
     ```
   - Show: Scrollbar styling in dark theme (dark colors)
   - **Deliverable**: Dark theme story complete

3.7. **Implement Story 6: RTL Layout**
   - Story name: `RTLLayout`
   - Template:
     ```typescript
     export const RTLLayout: Story = {
       args: {
         orientation: 'vertical'
       },
       template: `
         <div dir="rtl">
           <ui-scroll-container orientation="vertical" style="height: 300px; border: 1px solid #ccc;">
             <div style="padding: 16px;">
               <h3>{{ 'storybook.scroll.rtl' | translate }}</h3>
               <p *ngFor="let item of persianTextList">{{ item }}</p>
             </div>
           </ui-scroll-container>
         </div>
       `
     };
     ```
   - Show: Scrollbar on right side (RTL layout), text in Persian/Farsi
   - **Deliverable**: RTL story complete

3.8. **Create Demo Data Component or Utilities**
   - Create helper arrays for story content:
     ```typescript
     const generateLoremText = (count: number): string[] => {
       return Array.from({ length: count }, (_, i) => 
         `Paragraph ${i + 1}: Lorem ipsum dolor sit amet...`
       );
     };
     
     const wideItems = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);
     const tableData = Array.from({ length: 20 }, () =>
       Array.from({ length: 6 }, (_, i) => `Cell ${i + 1}`)
     );
     const persianText = [...]; // Persian/Farsi paragraphs
     ```
   - **Deliverable**: Helper data utilities created

3.9. **Register Storybook Route**
   - Path: `libs/shared/ui/src/lib/story-book.routes.ts` (or equivalent)
   - Add route entry:
     ```typescript
     {
       path: 'scroll-container',
       loadComponent: () => import('./components/scroll-container/scroll-container.stories').then(m => m.ScrollContainerStory)
     }
     ```
   - Or if using Storybook auto-discovery:
     - Ensure story file is in recognized pattern
     - Story title path: `Core/Scroll Container` (will appear in sidebar)
   - Verify:
     - Storybook refreshes and shows story in sidebar
     - Story loads without errors
   - **Deliverable**: Route registered and accessible

3.10. **Update Storybook Navigation** (if manual sidebar management)
   - Add entry to navigation config:
     ```typescript
     {
       title: 'Scroll Container',
       path: '/scroll-container',
       category: 'Core Components'
     }
     ```
   - Verify sidebar shows new entry
   - **Deliverable**: Navigation updated

**Exit Criteria**:
- [ ] All 6 story variants created and render without errors
- [ ] Each story demonstrates required functionality
- [ ] Storybook sidebar shows stories
- [ ] All stories interactive and responsive to prop changes
- [ ] Demo content meaningful and demonstrates scrolling behavior

---

### Phase 4: i18n Translation Keys
**Duration**: 1–2 hours  
**Goal**: Add translation strings for Storybook demo content

**Tasks**:

4.1. **Identify Translation Keys Needed**
   - Story text requiring translation:
     - `storybook.scroll.verticalTitle` - "Vertical Scroll Example"
     - `storybook.scroll.horizontalTitle` - "Horizontal Scroll Example"
     - `storybook.scroll.bothTitle` - "Both Axes Scroll Example"
     - `storybook.scroll.lightTheme` - "Light Theme Scrollbar"
     - `storybook.scroll.darkTheme` - "Dark Theme Scrollbar"
     - `storybook.scroll.rtl` - "RTL Layout Example"
     - `storybook.scroll.paragraphContent` - Lorem ipsum content (or use as-is)
   - **Deliverable**: Key list documented

4.2. **Add English (en) Translations**
   - Path: `projects/Accounting-Frontend/src/assets/i18n/en.json` (or project i18n location)
   - Add keys:
     ```json
     {
       "storybook": {
         "scroll": {
           "verticalTitle": "Vertical Scroll Example",
           "horizontalTitle": "Horizontal Scroll Example",
           "bothTitle": "Both Axes Scroll Example (Table)",
           "lightTheme": "Light Theme Scrollbar Styling",
           "darkTheme": "Dark Theme Scrollbar Styling",
           "rtl": "RTL Layout Example (Right-to-Left)"
         }
       }
     }
     ```
   - Verify:
     - JSON syntax is valid
     - Keys match story template references
     - No duplicate keys
   - **Deliverable**: English translations added

4.3. **Add Persian/Farsi (fa) Translations**
   - Path: `projects/Accounting-Frontend/src/assets/i18n/fa.json`
   - Add keys in Persian:
     ```json
     {
       "storybook": {
         "scroll": {
           "verticalTitle": "مثال پیمایش عمودی",
           "horizontalTitle": "مثال پیمایش افقی",
           "bothTitle": "مثال پیمایش دو محوری (جدول)",
           "lightTheme": "سبک نوار پیمایش تیره",
           "darkTheme": "سبک نوار پیمایش روشن",
           "rtl": "مثال نمایش راست به چپ"
         }
       }
     }
     ```
   - Verify:
     - Keys match English version exactly
     - Persian text is correct and properly formatted
     - No encoding issues
   - **Deliverable**: Persian translations added

4.4. **Verify Translation Resolution**
   - Test in Storybook:
     - Switch language to English → verify text displays in English
     - Switch language to Persian → verify text displays in Persian
     - No missing key placeholders (`[key_not_found]` etc.)
   - Test in component:
     - Use `translate` pipe in story templates: `{{ 'storybook.scroll.verticalTitle' | translate }}`
     - Verify pipe resolves keys correctly
   - **Deliverable**: Translation verification completed

**Exit Criteria**:
- [ ] All story text translation keys added to en.json
- [ ] All translation keys added to fa.json with Persian text
- [ ] Keys resolve correctly in Storybook
- [ ] Language switching works without errors

---

### Phase 5: Testing & Validation
**Duration**: 2–3 hours  
**Goal**: Verify component functionality, styling, and accessibility

**Tasks**:

5.1. **Manual Component Testing**
   - Test orientation input:
     - [ ] vertical: Vertical scrollbar only, horizontal hidden
     - [ ] horizontal: Horizontal scrollbar only, vertical hidden
     - [ ] both: Both scrollbars visible
   - Test content projection:
     - [ ] ng-content renders projected content correctly
     - [ ] Scrollable content exceeds container bounds
     - [ ] Any content type works (text, images, tables, etc.)
   - Test each story in Storybook:
     - [ ] VerticalScroll story scrolls vertically
     - [ ] HorizontalScroll story scrolls horizontally
     - [ ] BothAxesScroll story scrolls in both directions
   - **Deliverable**: Manual test results documented

5.2. **Theme Switching Testing**
   - Test light theme:
     - [ ] Scrollbar track color matches light theme token
     - [ ] Scrollbar thumb color matches light theme token
     - [ ] Hover state visible and responsive
   - Test dark theme:
     - [ ] Scrollbar track color matches dark theme token
     - [ ] Scrollbar thumb color matches dark theme token
     - [ ] Contrast sufficient for accessibility
   - Test theme switching in Storybook:
     - [ ] Storybook theme switcher available
     - [ ] Scrollbar colors update on theme change
     - [ ] No flickering or lag during switch
   - **Deliverable**: Theme test results documented

5.3. **RTL Layout Testing**
   - Test RTL rendering:
     - [ ] `dir="rtl"` on container works correctly
     - [ ] Scrollbar position correct in RTL mode (right side if vertical)
     - [ ] Logical CSS properties ensure correct layout in RTL
     - [ ] No hardcoded left/right values visible
   - Test with Persian text:
     - [ ] Persian content displays correctly
     - [ ] Text direction (right-to-left) respected
     - [ ] Scrollbar appears on correct side
   - **Deliverable**: RTL test results documented

5.4. **Cross-Browser Testing** (Optional but Recommended)
   - Test in:
     - [ ] Chrome/Chromium (Webkit scrollbar)
     - [ ] Firefox (scrollbar-width/scrollbar-color)
     - [ ] Safari (Webkit scrollbar)
     - [ ] Edge (Webkit scrollbar)
   - Verify:
     - Scrollbar styling visible in all browsers
     - Overflow behavior consistent
     - No browser-specific rendering issues
   - Document any browser-specific quirks
   - **Deliverable**: Cross-browser test matrix

5.5. **TypeScript/Linting Checks**
   - Run TypeScript compiler:
     - [ ] Component compiles without errors
     - [ ] No unused imports or variables
     - [ ] Type safety verified
   - Run SCSS linter (if configured):
     - [ ] No SCSS syntax errors
     - [ ] No hardcoded pixel values in scrollbar styles
     - [ ] All token references valid
   - Run Angular linter (ng lint):
     - [ ] No Angular-specific warnings
     - [ ] Component follows Angular style guide
   - **Deliverable**: Linting reports clean

5.6. **Accessibility Testing**
   - Keyboard navigation:
     - [ ] Scrollbar accessible via keyboard (if applicable)
     - [ ] Content within scrollable container reachable
   - Screen reader support:
     - [ ] Content projected via ng-content announced correctly
     - [ ] No ARIA attribute conflicts
   - Color contrast:
     - [ ] Scrollbar thumb/track colors meet WCAG AA contrast ratio (4.5:1)
     - [ ] In both light and dark themes
   - **Deliverable**: Accessibility test results

5.7. **Component Export Verification**
   - Test barrel exports:
     - [ ] Component imports from `libs/shared/ui` work
     - [ ] No circular dependencies
     - [ ] Can import in other feature modules
   - Test in test application:
     ```typescript
     import { UiScrollContainerComponent } from '@shared/ui';
     
     // Component available and type-safe
     ```
   - **Deliverable**: Export verification passed

**Exit Criteria**:
- [ ] All manual tests completed and documented
- [ ] Theme switching works correctly
- [ ] RTL layout verified
- [ ] Cross-browser testing complete (or documented as out-of-scope)
- [ ] No TypeScript or linting errors
- [ ] Accessibility requirements met
- [ ] Component exports work correctly

---

### Phase 6: Git Workflow & MR Preparation
**Duration**: 1–2 hours  
**Goal**: Prepare Git artifacts, create MRs, and update Jira

**Tasks**:

6.1. **Create Feature Branch**
   - Branch name: `features/ac-76-fe-scroll-container-component` (already created)
   - Verify branch exists locally:
     ```bash
     git branch -a | grep "features/ac-76"
     ```
   - If not exists, create:
     ```bash
     git checkout -b features/ac-76-fe-scroll-container-component origin/develop
     ```
   - **Deliverable**: Feature branch active locally

6.2. **Commit Implementation**
   - Commit 1: Component TypeScript and template
     ```bash
     git add libs/shared/ui/src/lib/components/scroll-container/scroll-container.component.ts
     git add libs/shared/ui/src/lib/components/scroll-container/scroll-container.component.html
     git commit -m "[AC-76] Scroll container component: TypeScript class, template, input binding"
     ```
   - Commit 2: Component styling and theme support
     ```bash
     git add libs/shared/ui/src/lib/components/scroll-container/scroll-container.component.scss
     git commit -m "[AC-76] Scroll container styling: overflow behavior, theme-aware scrollbars, RTL support"
     ```
   - Commit 3: Component export
     ```bash
     git add libs/shared/ui/src/lib/components/index.ts
     git add libs/shared/ui/src/lib/components/scroll-container/index.ts
     git commit -m "[AC-76] Export scroll container component from library"
     ```
   - Commit 4: Storybook stories
     ```bash
     git add libs/shared/ui/src/lib/components/scroll-container/scroll-container.stories.ts
     git commit -m "[AC-76] Storybook scroll container: 6 stories (vertical, horizontal, both, light theme, dark theme, RTL)"
     ```
   - Commit 5: i18n translations
     ```bash
     git add src/assets/i18n/en.json
     git add src/assets/i18n/fa.json
     git commit -m "[AC-76] i18n: Add English and Persian translations for scroll container stories"
     ```
   - All commits reference task: Include `[AC-76]` prefix in message
   - **Deliverable**: Clean commit history on feature branch

6.3. **Create Project MR** (for component code)
   - Repository: Project (accounting-frontend)
   - Target: `develop`
   - Title: `[AC-76] Scroll container component: Angular standalone component with theme-aware scrollbars`
   - Description (template):
     ```markdown
     # [AC-76] Scroll Container Component
     
     ## Summary
     Implements UiScrollContainerComponent as an Angular standalone component with:
     - Configurable scroll orientation (vertical, horizontal, both)
     - Custom scrollbar styling with theme-aware colors
     - RTL-compatible using logical CSS properties
     - OnPush change detection strategy
     - Content projection via ng-content
     
     ## Parent Story
     AC-41: Implement Unified Design System, Global Theming, and Core Shared UI Components
     
     ## Related Links
     - Jira: https://nexttoptech.atlassian.net/browse/AC-76
     - GitLab Issue: [will be populated from script]
     
     ## Changes
     - libs/shared/ui/src/lib/components/scroll-container/ (component files)
     - libs/shared/ui/src/lib/components/index.ts (export)
     - src/assets/i18n/en.json, fa.json (translations)
     
     ## Testing
     - Manual: All stories verified (vertical, horizontal, both, light, dark, RTL)
     - Theme switching: Light/dark mode colors correct
     - RTL: Layout verified in RTL mode
     - Cross-browser: Chrome, Firefox, Safari, Edge (if tested)
     
     ## Acceptance Criteria
     - [x] AOC-01: Orientation input (vertical | horizontal | both)
     - [x] AOC-02: Correct overflow CSS
     - [x] AOC-03: Custom scrollbar styling with token colors
     - [x] AOC-04: Theme-aware scrollbars
     - [x] AOC-05: Content projection via ng-content
     - [x] AOC-06: RTL-compatible (logical CSS)
     - [x] AOC-07: OnPush, standalone, zero hardcoded values
     - [x] AOC-08: 6 Storybook stories
     - [x] AOC-09: Exported from library
     - [x] AOC-10: Route registered
     - [x] AOC-11: i18n keys added
     ```
   - MR Status: **Draft** (until all tests pass and ready for review)
   - Enable: Delete source branch, Squash commits
   - Assignee: Self (for review step later)
   - **Deliverable**: Project MR created (Draft)

6.4. **Create Workspace MR** (for task documentation)
   - Repository: Workspace (accounting-workspace)
   - Target: `develop`
   - Title: `[AC-76] Task documentation: Scroll container component implementation record`
   - Description:
     ```markdown
     # [AC-76] Task Documentation
     
     ## Artifact
     docs/work-items/02.implementation/stories/AC-41/tasks/AC-76-implementation-plan.md
     
     ## Related Links
     - Jira: https://nexttoptech.atlassian.net/browse/AC-76
     - Project MR: [link to project MR]
     
     ## Content
     - Implementation plan with 6 phases
     - Requirement traceability matrix
     - TDD/BDD test cases
     - Success criteria checklist
     ```
   - MR Status: **Draft**
   - Enable: Delete source branch, Squash commits
   - **Deliverable**: Workspace MR created (Draft)

6.5. **Update Jira Web Links**
   - Add web links to Jira issue AC-76:
     - **Workspace MR**: [URL of workspace MR]
     - **Project MR**: [URL of project MR]
   - Use Jira UI or API to add customfield_10015 (Web Links)
   - Format: Include both MR URLs with descriptions
   - **Deliverable**: Jira Web Links populated

6.6. **Transition Jira to In Review** (when ready)
   - Prerequisites:
     - [ ] Both MRs are **Ready** (not Draft)
     - [ ] All tests passing
     - [ ] All Acceptance Criteria verified
   - Command:
     ```bash
     ./scripts/task-exec.ps1 -JiraKey AC-76 -StatusTarget "In Review" -Repo front
     ```
   - Verify Jira status changed to `In Review`
   - **Note**: Do this AFTER MR review approval decision is made
   - **Deliverable**: Jira transitioned to In Review

**Exit Criteria**:
- [ ] Feature branch created and pushed
- [ ] Clean commit history on branch (5+ descriptive commits)
- [ ] Both workspace and project MRs created (Draft status)
- [ ] Jira Web Links updated with MR URLs
- [ ] Ready to move Jira to In Review (after review)

---

## TDD/BDD Test Cases

### Unit Tests (Recommended)

**Test File Location**: `libs/shared/ui/src/lib/components/scroll-container/scroll-container.component.spec.ts`

**Test Suite: UiScrollContainerComponent**

| Test Case ID | Test Description | Given | When | Then | Status |
|--------------|------------------|-------|------|------|--------|
| UT-01 | Component renders with default orientation | Component created with no @Input | Template rendered | Container has `data-scroll-orientation="vertical"` | Not Started |
| UT-02 | Vertical orientation applies correct overflow | Component with `orientation="vertical"` | Element renders | CSS shows `overflow-x: hidden; overflow-y: auto` | Not Started |
| UT-03 | Horizontal orientation applies correct overflow | Component with `orientation="horizontal"` | Element renders | CSS shows `overflow-x: auto; overflow-y: hidden` | Not Started |
| UT-04 | Both orientation applies correct overflow | Component with `orientation="both"` | Element renders | CSS shows `overflow: auto` | Not Started |
| UT-05 | Content projection works | Component with ng-content, nested content | Template renders | Projected content visible inside container | Not Started |
| UT-06 | Theme-aware scrollbar colors applied | Component in light/dark theme context | CSS computed styles read | Scrollbar colors match theme tokens | Not Started |
| UT-07 | RTL scrollbar positioning | Component with `dir="rtl"` | CSS in RTL context | Scrollbar position correct (right for vertical) | Not Started |
| UT-08 | ChangeDetectionStrategy.OnPush set | Component class inspected | Metadata read | Strategy is OnPush | Not Started |
| UT-09 | Component is standalone | Component decorator inspected | Metadata read | `standalone: true` set | Not Started |
| UT-10 | Logical CSS properties used (no left/right) | SCSS source code audited | Source inspection | Only logical properties found | Not Started |

**Test Execution Method**:
```bash
ng test --include='**/scroll-container.component.spec.ts'
```

---

## Blocking Dependencies

- **Design Tokens (AC-64)**: Scrollbar colors should resolve from semantic tokens
  - Check: Token availability in `libs/shared/tokens/` or similar
  - If missing: Use placeholder CSS custom properties with TODO comments for AC-64 integration
  - **Action**: Coordinate with AC-64 task owner if needed

- **Storybook Configuration**: Storybook must be set up in Accounting-Frontend
  - Check: `.storybook/` folder and `storybook.config.js` exist
  - If missing: Set up Storybook or document as out-of-scope

- **Angular Configuration**: Project must support standalone components (Angular 14+)
  - Check: `angular.json` and `package.json` versions
  - If old Angular version: Refactor to module-based component (update implementation)

---

## Repository Targeting

| Artifact | Repository | Path | Branch |
|----------|-----------|------|--------|
| Scroll container component | FRONT (accounting-frontend) | `libs/shared/ui/src/lib/components/scroll-container/` | features/ac-76-fe-scroll-container-component |
| Storybook story | FRONT (accounting-frontend) | `libs/shared/ui/src/lib/components/scroll-container/scroll-container.stories.ts` | features/ac-76-fe-scroll-container-component |
| i18n translations | FRONT (accounting-frontend) | `src/assets/i18n/en.json`, `fa.json` | features/ac-76-fe-scroll-container-component |
| Component export | FRONT (accounting-frontend) | `libs/shared/ui/src/lib/components/index.ts` | features/ac-76-fe-scroll-container-component |
| Task implementation record | Workspace (accounting-workspace) | `docs/work-items/02.implementation/stories/AC-41/tasks/AC-76-implementation-plan.md` | features/ac-76-fe-scroll-container-component |
| Project MR | FRONT (accounting-frontend) | — | features/ac-76-fe-scroll-container-component |
| Workspace MR | Workspace (accounting-workspace) | — | features/ac-76-fe-scroll-container-component |

---

## Success Criteria Checklist

### Acceptance Criteria (AoC)
- [ ] AOC-01: Orientation input with 'vertical' | 'horizontal' | 'both' (default vertical)
- [ ] AOC-02: Correct overflow CSS based on orientation
- [ ] AOC-03: Custom scrollbar styling (::-webkit-scrollbar, scrollbar-width, scrollbar-color)
- [ ] AOC-04: Theme-aware scrollbars (light/dark mode)
- [ ] AOC-05: Content projection via ng-content
- [ ] AOC-06: RTL-compatible (logical CSS properties)
- [ ] AOC-07: OnPush, standalone, zero hardcoded values
- [ ] AOC-08: 6 Storybook stories (vertical, horizontal, both, light, dark, RTL)
- [ ] AOC-09: Exported from libs/shared/ui/src/lib/components/index.ts
- [ ] AOC-10: Route registered in story-book.routes.ts
- [ ] AOC-11: i18n keys in en.json and fa.json

### Definition of Done (DoD)
- [ ] DOD-01: Component implemented with orientation input and content projection
- [ ] DOD-02: OnPush and standalone pattern applied
- [ ] DOD-03: Custom scrollbar styling with token-driven colors
- [ ] DOD-04: Logical CSS properties used; RTL-compatible
- [ ] DOD-05: Content projection via ng-content functional
- [ ] DOD-06: All 6 Storybook stories created and interactive
- [ ] DOD-07: Component exported and route registered
- [ ] DOD-08: MR ready for review; tests passing; Jira In Review

### Phase Completion
- [ ] Phase 1: Component structure and template complete
- [ ] Phase 2: Styling and theming complete
- [ ] Phase 3: Storybook stories complete
- [ ] Phase 4: i18n translations complete
- [ ] Phase 5: Testing complete
- [ ] Phase 6: Git workflow complete

### Quality Checks
- [ ] No TypeScript errors
- [ ] No SCSS linting errors
- [ ] All token references valid
- [ ] No hardcoded pixel values in scrollbar styles
- [ ] RTL layout verified
- [ ] Cross-browser testing complete (or noted)
- [ ] Accessibility requirements met

---

## Notes

1. **Token References**: If AC-64 spacing/scrollbar tokens are not yet available, create placeholder CSS custom properties in Phase 2 with clear TODO comments. Refactor after AC-64 is deployed.

2. **Scrollbar Width**: Standardized to 12px to match design system sizing. Adjust if project convention differs.

3. **Browser Support**: Webkit scrollbar styles (::-webkit-scrollbar) work in Chrome, Edge, Safari. Firefox uses scrollbar-width and scrollbar-color (more limited customization). Both are included for broad coverage.

4. **Theme Switching**: Supports both CSS class-based theming (`.light-theme`, `.dark-theme`) and `@media (prefers-color-scheme)`. Adjust in Phase 2 based on project convention.

5. **RTL Testing**: Critical for localization. Use browser dev tools or actual RTL locale to verify. Persian/Farsi text included in RTL story.

6. **Reusability**: Once complete, scroll-container can be used across all features. Consider adding to shared component library documentation.

7. **Migration Path**: Future features using hardcoded scrollbars should be refactored to use this component. Include migration example in design docs.

---

**Plan Ready for Implementation**  
Approved - May 13, 2026
