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

- `UI_` - General UI elements (buttons, labels, common actions, shared single-word labels)
- `PAGE_` - Page-specific content and titles
- `NAVIGATION_` - Navigation menu items
- `VALIDATION_` - Form validation messages
- `NOTIFICATION_` - Success/info notifications
- `ERROR_` - Error messages
- `DS_` - Design system components (Storybook documentation)
- `DS_COMMON_` - Shared/reusable design-system labels (see below)

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

### Shared / Common Keys (`DS_COMMON_*` and `UI_*`)

Before adding a new DS key, check whether a shared key already covers the concept.
Duplicate single-word or two-word values across components are forbidden — use the shared key instead.

**`DS_COMMON_*` — shared design-system labels:**

| Key | EN | FA |
|---|---|---|
| `DS_COMMON_IMPORT` | Import | ایمپورت |
| `DS_COMMON_API_TITLE` | API | API |
| `DS_COMMON_API_NAME` | Name | نام |
| `DS_COMMON_API_PROP` | Property | ویژگی |
| `DS_COMMON_API_TYPE` | Type | نوع |
| `DS_COMMON_API_DEFAULT` | Default | پیش‌فرض |
| `DS_COMMON_API_DESCRIPTION` | Description | توضیح |
| `DS_COMMON_TOC_OVERVIEW` | Overview | نمای کلی |
| `DS_COMMON_TOC_STATES` | States | حالت‌ها |
| `DS_COMMON_FORM_TEMPLATE` | Template-Driven Form | فرم Template-driven |
| `DS_COMMON_FORM_TEMPLATE_DESC` | Integration with Angular template-driven forms. | یکپارچه‌سازی با فرم‌های مبتنی بر قالب Angular. |
| `DS_COMMON_FORM_REACTIVE` | Reactive Form | فرم Reactive |
| `DS_COMMON_FORM_REACTIVE_DESC` | Integration with Angular reactive forms. | یکپارچه‌سازی با فرم‌های واکنشی Angular. |
| `DS_COMMON_STATE_DEFAULT` | Default | پیش‌فرض |
| `DS_COMMON_STATE_DISABLED` | Disabled | غیرفعال |
| `DS_COMMON_STATE_INVALID` | Invalid | نامعتبر |
| `DS_COMMON_STATE_WITH_VALUE` | With Value | با مقدار |
| `DS_COMMON_LABEL_USERNAME` | Username | نام کاربری |
| `DS_COMMON_LABEL_EMAIL` | Email | ایمیل |
| `DS_COMMON_LABEL_PRICE` | Price | قیمت |
| `DS_COMMON_LABEL_AMOUNT` | Amount | مبلغ |
| `DS_COMMON_PLACEHOLDER_DECIMAL` | 0.00 | 0.00 |

**`UI_*` — general UI shared labels (also reusable in DS storybook):**

| Key | EN | FA |
|---|---|---|
| `UI_SEARCH` | Search | جستجو |
| `UI_SUCCESS` | Success | موفق |
| `UI_WARNING` | Warning | هشدار |
| `UI_ERROR` | Error | خطا |
| `UI_INFO` | Information | اطلاعات |
| `UI_SETTINGS` | Settings | تنظیمات |
| `UI_BUTTON` | Button | دکمه |
| `UI_SUBMIT` | Submit | ارسال |
| `UI_RESET` | Reset | بازنشانی |
| `UI_DELETE` | Delete | حذف |
| `UI_EDIT` | Edit | ویرایش |

### Deduplication Rules

- A value that is a single word or short generic phrase used in more than one component **must** use a shared key.
- `DS_COMMON_STATE_*` replaces all `DS_[COMPONENT]_STATE_*_TITLE` variants.
- `DS_COMMON_FORM_TEMPLATE` / `DS_COMMON_FORM_REACTIVE` replace all `DS_[COMPONENT]_TEMPLATE_FORM_TITLE` variants.
- `DS_COMMON_TOC_OVERVIEW` / `DS_COMMON_TOC_STATES` replace all `DS_[COMPONENT]_TOC_OVERVIEW` / `DS_[COMPONENT]_TOC_STATES` variants.
- `DS_COMMON_IMPORT` replaces all `DS_[COMPONENT]_TOC_IMPORT` variants.
- `DS_COMMON_API_TITLE` replaces all `DS_[COMPONENT]_TOC_API` variants.
- `DS_COMMON_LABEL_AMOUNT` replaces any component-specific label key whose value is "Amount" / "مبلغ".
- `UI_SEARCH` replaces any storybook usage of separate search label keys.
- `UI_SUCCESS`, `UI_ERROR`, `UI_WARNING`, `UI_SETTINGS`, `UI_BUTTON` replace component-specific tag/icon label keys when the value is the same single word.

### Common Patterns

**Navigation:**
```json
"DS_STORY_BOOK_ITEM_INPUT": "Input",
"DS_STORY_BOOK_ITEM_CHECKBOX": "Checkbox"
```

**Component title and description:**
```json
"DS_INPUT_TITLE": "Input",
"DS_INPUT_DESCRIPTION": "Single-line text input with floating label"
```

**Table of contents (use shared keys where possible):**
```json
"DS_COMMON_TOC_OVERVIEW": "Overview",
"DS_COMMON_IMPORT": "Import",
"DS_COMMON_TOC_STATES": "States",
"DS_COMMON_API_TITLE": "API",
"DS_INPUT_TOC_BASIC_USAGE": "Basic Usage"
```

**Section titles and descriptions:**
```json
"DS_COMMON_STATE_DEFAULT": "Default",
"DS_COMMON_STATE_DISABLED": "Disabled",
"DS_COMMON_STATE_INVALID": "Invalid",
"DS_INPUT_STATE_DEFAULT_DESC": "Default input state."
```

**Form sections:**
```json
"DS_COMMON_FORM_TEMPLATE": "Template-Driven Form",
"DS_COMMON_FORM_REACTIVE": "Reactive Form",
"DS_CHECKBOX_FORM_TEMPLATE_DESCRIPTION": "Bind the checkbox with ngModel..."
```

**API documentation:**
```json
"DS_COMMON_API_TITLE": "API",
"DS_COMMON_API_NAME": "Name",
"DS_COMMON_API_TYPE": "Type",
"DS_COMMON_API_DESCRIPTION": "Description",
"DS_INPUT_API_LABEL": "The label text displayed above the input field"
```

**Example values:**
```json
"DS_INPUT_LABEL_EXAMPLE": "Email Address",
"DS_INPUT_PLACEHOLDER_EXAMPLE": "you@example.com",
"DS_COMMON_LABEL_AMOUNT": "Amount",
"DS_COMMON_PLACEHOLDER_DECIMAL": "0.00"
```

### Checklist for New Components

When adding a new design system component:

- [ ] Add navigation item: `DS_STORY_BOOK_ITEM_[COMPONENT]`
- [ ] Add component title and description
- [ ] Use `DS_COMMON_TOC_OVERVIEW` for the overview TOC entry
- [ ] Use `DS_COMMON_IMPORT` for the import TOC entry
- [ ] Use `DS_COMMON_API_TITLE` for the API TOC/section entry
- [ ] Use `DS_COMMON_TOC_STATES` if the component has a states section
- [ ] Use `DS_COMMON_FORM_TEMPLATE` / `DS_COMMON_FORM_REACTIVE` for form section headings
- [ ] Use `DS_COMMON_STATE_DEFAULT/DISABLED/INVALID/WITH_VALUE` for state card titles
- [ ] Use `DS_COMMON_LABEL_*` / `UI_*` for generic labels (username, email, amount, search…)
- [ ] Add component-specific keys only for values not covered by shared keys
- [ ] Add all keys to **both** `public/assets/i18n/en.json` and `public/assets/i18n/fa.json`
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
