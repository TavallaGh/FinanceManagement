# i18n Guide

## Overview

The ERP app supports two languages:

- Persian (`fa`, RTL)
- English (`en`, LTR)

Translations use `@ngx-translate/core`.

## Translation Files

**Primary location** (actively used by the app):

- `public/assets/i18n/fa.json`
- `public/assets/i18n/en.json`

**⚠️ IMPORTANT**: Always add translation keys to `public/assets/i18n/` files. The `apps/erp-web/src/assets/i18n/` path is deprecated and should not be used.

## Key Naming Convention

Use flat uppercase keys with a clear prefix.

Examples:

```text
UI_LOGIN_FORM
PAGE_LOGIN_TITLE
VALIDATION_REQUIRED_FIELD
NOTIFICATION_PASSWORD_RESET_SUCCESS
ERROR_USER_NOT_FOUND
```

Allowed prefixes:

- `UI_` - General UI elements (buttons, labels, common actions)
- `PAGE_` - Page-specific content and titles
- `NAVIGATION_` - Navigation menu items
- `VALIDATION_` - Form validation messages
- `NOTIFICATION_` - Success/info notifications
- `ERROR_` - Error messages
- `DS_` - Design system components (Storybook documentation)

Do not use nested keys such as `common.save` or `dashboard.title`.

## Template Usage

```html
<h1>{{ 'PAGE_DASHBOARD_TITLE' | translate }}</h1>
<button>{{ 'UI_SAVE' | translate }}</button>
```

## TypeScript Usage

```typescript
const message = this._i18nService.translate('NOTIFICATION_SAVE_SUCCESS');
```

## Adding New Translations

1. Add the same key to both language files.
2. Use the correct prefix.
3. Reference the key in templates or TypeScript.
4. Verify both RTL and LTR rendering.

Example:

```json
{
  "PAGE_PRODUCTS_TITLE": "Products",
  "PAGE_PRODUCTS_ADD_PRODUCT": "Add Product"
}
```

## Direction Rules

- Persian must render RTL.
- English must render LTR.
- Use logical properties such as `margin-inline-start`.
- Avoid `left`, `right`, `margin-left`, and `padding-right` for layout logic.

## Storage Rule

The selected language is stored in a **cookie** managed by the BFF:

- Cookie name: `erp_app_language`
- Accessible by both backend and frontend
- BFF sets and reads this cookie
- Frontend can read the cookie to determine current language

## Design System Components (Storybook)

For design system components, use the `DS_` prefix with this structure:

```
DS_[COMPONENT]_[SECTION]_[ELEMENT]
```

### Common Patterns

**Navigation**:
```json
"DS_STORY_BOOK_ITEM_INPUT": "Input",
"DS_STORY_BOOK_ITEM_CHECKBOX": "Checkbox"
```

**Component title and description**:
```json
"DS_INPUT_TITLE": "Input",
"DS_INPUT_DESCRIPTION": "Single-line text input with floating label"
```

**Table of contents**:
```json
"DS_INPUT_TOC_OVERVIEW": "Overview",
"DS_INPUT_TOC_IMPORT": "Import",
"DS_INPUT_TOC_STATES": "States"
```

**Section titles and descriptions**:
```json
"DS_INPUT_IMPORT_TITLE": "Import",
"DS_INPUT_IMPORT_DESC": "How to import the component.",
"DS_INPUT_STATE_DEFAULT_TITLE": "Default",
"DS_INPUT_STATE_DEFAULT_DESC": "Default input state."
```

**API documentation**:
```json
"DS_INPUT_API_TITLE": "API",
"DS_INPUT_API_NAME": "Name",
"DS_INPUT_API_TYPE": "Type",
"DS_INPUT_API_DESCRIPTION": "Description",
"DS_INPUT_API_LABEL": "The label text displayed above the input field"
```

**Example values**:
```json
"DS_INPUT_LABEL_EXAMPLE": "Email Address",
"DS_INPUT_PLACEHOLDER_EXAMPLE": "you@example.com",
"DS_INPUT_HELPER_EXAMPLE": "We'll never share your email",
"DS_INPUT_ERROR_EXAMPLE": "Please enter a valid email"
```

### Checklist for New Components

When adding a new design system component:

- [ ] Add navigation item: `DS_STORY_BOOK_ITEM_[COMPONENT]`
- [ ] Add component title and description
- [ ] Add table of contents keys for all sections
- [ ] Add title and description for each section
- [ ] Add all example values (label, placeholder, helper, error)
- [ ] Add API documentation keys
- [ ] Add keys to **both** `en.json` and `fa.json`
- [ ] Test in both RTL and LTR modes

## Checklist

- No hardcoded UI strings
- Matching keys in both languages
- Correct prefix naming
- All keys added to `public/assets/i18n/`
- Correct direction in both modes
- No RTL-breaking CSS

## Summary

Keep translations flat, uppercase, synchronized across languages, and safe for both RTL and LTR layouts.
