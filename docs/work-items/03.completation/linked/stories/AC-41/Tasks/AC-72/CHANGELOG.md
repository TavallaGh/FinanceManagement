# AC-72 Implementation Changelog

**Task:** AC-72 - FE - Simple List Component  
**Status:** Completed  
**Date:** 2026-05-14

## What Was Delivered

A reusable simple list component for consistent feature list UIs across the accounting-frontend application. The implementation provides a business-agnostic list container with standardized item styling, state management (selected/disabled), and full RTL/LTR support through token-driven design and logical CSS properties. All components integrate seamlessly with the design system, support light/dark theme switching, and leverage Angular's OnPush change detection strategy with standalone component pattern.

### 1. Core List Components

- **Design/Approach:** Built two complementary Angular standalone components using signal-based reactive inputs and semantic token-driven styling. List container uses `ng-content` projection for flexible item composition. Item component provides consistent row structure with content projection and state management.

- **Features:**
  - `UiSimpleListComponent` — List container with `ng-content` projection, integrating `UiScrollContainerComponent` for consistent scroll styling
  - `UiSimpleListItemComponent` — Individual row with optional `selected` and `disabled` signal-based inputs
  - Separator borders between items using `--color-list-item-border` token (last item has no border)
  - Hover state with `--color-list-item-hover-bg` token (suppressed when disabled)
  - Selected state with `--color-list-item-selected-bg` token
  - Full RTL/LTR safety using logical CSS properties (`padding-inline`, `margin-inline`, `border-block-end`)
  - Automatic light/dark theme support through design token system

### 2. Storybook Documentation & Demo

- **Design/Approach:** Comprehensive interactive Storybook page demonstrating all component states, content projection patterns, and theme/RTL variations. Demo integrates real-world content examples (notification cards) to show how components handle rich content.

- **Features:**
  - Basic list rendering with multiple items
  - List with selected item state
  - List with disabled item state
  - Content projection with complex nested content (notification cards)
  - RTL layout demonstration
  - Theme switching demo (light/dark toggle)
  - Translation support for demo labels in English and Persian

### 3. Internationalization (i18n) Support

- **Design/Approach:** Added translation keys to support Storybook demo content in multiple languages. Keys follow naming convention for story-related content.

- **Features:**
  - English translation keys added to `public/assets/i18n/en.json`
  - Persian translation keys added to `public/assets/i18n/fa.json`
  - Keys support all Storybook demo sections and narrative content

## Files Changed

### Shared UI Library Components

- **UiSimpleListComponent** (`libs/shared/ui/src/lib/components/simple-list/ui-simple-list.component.ts`) *(NEW)*
  - List container component with ng-content projection and scroll container integration

- **UiSimpleListItemComponent** (`libs/shared/ui/src/lib/components/simple-list/ui-simple-list-item.component.ts`) *(NEW)*
  - Item row component with state management and token-driven styling

- **Component Styles** (`libs/shared/ui/src/lib/components/simple-list/ui-simple-list.component.scss`, `ui-simple-list-item.component.scss`) *(NEW)*
  - Token-driven styling with semantic design tokens; zero hardcoded values

- **Component Tests** (`libs/shared/ui/src/lib/components/simple-list/*.spec.ts`) *(NEW)*
  - 16+ unit test cases covering rendering, state management, CSS class binding, content projection

- **Component Exports** (`libs/shared/ui/src/lib/components/index.ts`) *(EXTENDED)*
  - Added barrel exports for `UiSimpleListComponent` and `UiSimpleListItemComponent`

### Storybook Assets

- **Storybook Page** (`apps/erp-web/src/app/dev-tools/story-book/pages/simple-list/simple-list-story-book.component.ts`) *(NEW)*
  - Angular component with 6+ story variants demonstrating all states and patterns

- **Storybook Template** (`apps/erp-web/src/app/dev-tools/story-book/pages/simple-list/simple-list-story-book.component.html`) *(NEW)*
  - HTML template for Storybook page with interactive sections

- **Storybook Routing** (`apps/erp-web/src/app/dev-tools/story-book/story-book.routes.ts`) *(EXTENDED)*
  - Route registration for simple-list page at path `simple-list`

### Internationalization Files

- **English Translations** (`public/assets/i18n/en.json`) *(EXTENDED)*
  - Storybook demo labels and narrative keys for simple-list component

- **Persian Translations** (`public/assets/i18n/fa.json`) *(EXTENDED)*
  - Storybook demo labels and narrative keys for simple-list component (Persian/Farsi)

## Test Coverage

- **Unit Tests:** 16+ test cases across both components
  - Rendering, state changes, CSS class application, content projection
  - All tests passing with full coverage of critical paths
- **Storybook Verification:** All 6+ story sections render correctly in light/dark themes
- **RTL/LTR Verification:** Logical CSS properties verified in DevTools; RTL layout tested
- **Theme Switching:** Components automatically adapt to light/dark theme changes
- **Import Verification:** Components successfully importable from `@accounting-erp/shared/ui`

## Integration Notes

- **Ready for Use:** Components are exported from shared UI library and ready for feature team integration
- **Dependency Status:** All required dependencies (AC-64, AC-65, AC-66, AC-76) are complete
  - AC-64: Semantic tokens available
  - AC-65: Theme engine functional
  - AC-66: Theme persistence working
  - AC-76: Scroll container component integrated
- **No Breaking Changes:** New components; no modifications to existing APIs
- **Recommended Next Steps:** Feature teams should use `UiSimpleListComponent` + `UiSimpleListItemComponent` as default list primitive instead of creating local list implementations
