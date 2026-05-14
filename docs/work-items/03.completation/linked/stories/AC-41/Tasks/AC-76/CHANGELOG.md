# AC-76 Implementation Changelog

**Task:** FE - Scroll Container Component
**Status:** Completed
**Date:** 2026-05-13

---

## What Was Delivered

Implemented `UiScrollContainerComponent` — a standalone Angular shared UI component providing a consistent, theme-aware custom scroll container for the ERP frontend. The component replaces native browser scrollbars with custom draggable scrollbars driven entirely by semantic design tokens, ensuring visual consistency across themes and browsers.

---

### 1. Scroll Container Core Component

- **Design/Approach:** Standalone Angular component using signal-based inputs/outputs and `ChangeDetectionStrategy.OnPush`. Custom scrollbar rendering via pointer event tracking, `ResizeObserver`, and `MutationObserver` rather than relying on native browser scrollbar APIs.
- **Features:**
  - `orientation` input: `'vertical' | 'horizontal' | 'both'` (default: both axes)
  - `autoHide` input with configurable `autoHideDelay` (default 800ms): scrollbars auto-hide on inactivity, shown on mouse enter
  - `smooth` input for animated scroll behavior
  - `wheelStep` and `minThumbSize` inputs for fine-grained control
  - `scrolled` output: emits `{ top, left, ratioY, ratioX }` position data
  - Boundary detection outputs: `reachTop`, `reachBottom`, `reachStart`, `reachEnd`
  - Draggable scrollbar thumbs via pointer event handlers
  - Responsive thumb sizing using `ResizeObserver`
  - Content change tracking via `MutationObserver`
  - `ng-content` projection — supports any content type without constraint

### 2. Theming and RTL Compatibility

- **Design/Approach:** All visual values (colors, spacing, radius) resolved from semantic token CSS variables. RTL handled with logical CSS properties (e.g., `inset-inline-end`) to avoid physical left/right hardcoding.
- **Features:**
  - Light and dark theme support via token resolution
  - RTL/LTR-compatible scrollbar positioning with `inset-inline-end`
  - Webkit (`-webkit-scrollbar`) and Firefox (`scrollbar-width`, `scrollbar-color`) cross-browser support
  - Hover and active states on scrollbar thumbs
  - Zero hardcoded visual values — all from token system

### 3. Storybook Integration

- **Design/Approach:** `StoryBookPageWithSections` interface with 8 documented sections: overview, import guide, vertical variant, horizontal variant, both-axes variant, features, API reference, and theme/RTL demo.
- **Features:**
  - Live preview of all 3 orientation variants
  - Code snippets for import and usage
  - Interactive theme switching demonstration
  - RTL layout toggle demonstration
  - Event output logging examples

### 4. Localization (i18n)

- **Design/Approach:** All Storybook UI text externalized using `DS_SCROLL_CONTAINER_*` translation key pattern for full bilingual parity.
- **Features:**
  - 20+ translation keys added to `en.json` and `fa.json`
  - Covers all section titles, descriptions, and API documentation labels
  - Full Persian (Farsi) translations with RTL-safe layout support

---

## Files Changed

### Component Implementation (`libs/shared/ui`)

- **`scroll-container/scroll-container.component.ts`** *(NEW)*
  - Core standalone component (169 lines); signal-based inputs/outputs; pointer/wheel/observer event handling

- **`scroll-container/scroll-container.component.html`** *(NEW)*
  - Component template (24 lines); viewport + content wrapper + track/thumb structure; data attribute styling hooks

- **`scroll-container/scroll-container.component.scss`** *(NEW)*
  - Comprehensive styling (120+ lines); semantic token variables; logical CSS properties; webkit + Firefox support; hover/active states

- **`scroll-container/index.ts`** *(NEW)*
  - Barrel export for component

- **`components/index.ts`** *(PATCHED)*
  - Added `export { UiScrollContainerComponent } from './scroll-container'` at line 15; maintains alphabetical ordering

### Storybook Page (`apps/erp-web`)

- **`pages/scroll-container/scroll-container-story-book.component.ts`** *(NEW)*
  - Storybook page component (80+ lines); 8 sections; code snippets; theme/RTL demo support

- **`pages/scroll-container/scroll-container-story-book.component.html`** *(NEW)*
  - Storybook template; live previews; code block examples; multi-section layout

### Localization

- **`public/assets/i18n/en.json`** *(PATCHED)*
  - 20+ `DS_SCROLL_CONTAINER_*` keys added for Storybook English text

- **`public/assets/i18n/fa.json`** *(PATCHED)*
  - 20+ `DS_SCROLL_CONTAINER_*` keys added for Storybook Persian/Farsi text
