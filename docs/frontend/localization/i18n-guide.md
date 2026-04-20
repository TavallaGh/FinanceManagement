# i18n Guide

## Overview

The ERP app supports two languages:

- Persian (`fa`, RTL)
- English (`en`, LTR)

Translations use `@ngx-translate/core`.

## Translation Files

Source files:

- `apps/erp-web/src/assets/i18n/fa.json`
- `apps/erp-web/src/assets/i18n/en.json`

Runtime files currently served by the app:

- `public/assets/i18n/fa.json`
- `public/assets/i18n/en.json`

Keep both locations in sync until the project is reduced to a single source of truth.

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

- `UI_`
- `PAGE_`
- `NAVIGATION_`
- `VALIDATION_`
- `NOTIFICATION_`
- `ERROR_`

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

## Checklist

- No hardcoded UI strings
- Matching keys in both languages
- Correct prefix naming
- Correct direction in both modes
- No RTL-breaking CSS

## Summary

Keep translations flat, uppercase, synchronized across languages, and safe for both RTL and LTR layouts.
