# Development Guide

## Requirements

- Node.js 18 or newer
- npm 9 or newer
- Git
- VS Code recommended

## Recommended VS Code Extensions

- Angular Language Service
- ESLint
- Prettier
- Stylelint
- GitHub Copilot
- GitLens

## Start the App

```bash
npm install
npm run start
```

## Core Rules

- Use modern Angular APIs.
- Use `inject()` instead of constructor injection when possible.
- Use signals for local UI state.
- Use `rxResource` for server state.
- Keep components small and focused.
- Keep HTTP logic out of components.

## File Naming

### Components

```text
feature-name.component.ts
feature-name.component.html
feature-name.component.scss
feature-name.component.spec.ts
```

### Services

```text
feature-name.service.ts
feature-name.service.spec.ts
```

### Models

```text
feature-name.model.ts
feature-name.dto.ts
feature-name.enum.ts
```

## Translation Key Naming

Use flat uppercase keys with a domain prefix.

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

## Template Rules

- Use `@if`, `@for`, and `@let`.
- Prefer self-closing tags where valid.
- Use translation keys instead of hardcoded text.

Example:

```html
<h1>{{ 'PAGE_LOGIN_TITLE' | translate }}</h1>
<button>{{ 'UI_SAVE' | translate }}</button>
<span>{{ 'VALIDATION_REQUIRED_FIELD' | translate }}</span>
```

## Styling Rules

- Use design tokens.
- Use the shared typography tokens from `public/styles/tokens/_typography.scss` instead of local font-size ramps.
- Use logical properties for RTL and LTR support.
- Avoid hardcoded colors, spacing, and shadows.
- Keep styles local unless they are true global primitives.

Example:

```scss
.panel {
  padding: var(--spacing-4);
  color: var(--fg-primary);
  background: var(--surface-primary);
  border-radius: var(--radius-lg);
}
```

## Nx Commands

```bash
npm run start
npm run build
npm run test
npm run lint
npm run graph
```

## Feature Placement

- App features live in `apps/erp-web/src/app/features/`.
- App-wide infrastructure lives in `apps/erp-web/src/app/core/`.
- App-scoped reusable helpers live in `apps/erp-web/src/app/shared/`.
- Internal component docs and story-book pages live in `apps/erp-web/src/app/dev-tools/story-book/`.
- Shared generic UI belongs in `libs/shared/ui/`.

## Story Book Placement

- Put shared component documentation pages under `apps/erp-web/src/app/dev-tools/story-book/`.
- Keep story-book routes in a local `story-book.routes.ts` file.
- Route previews from `/story-book/<component-name>`.
- Current shared showcase routes include `/story-book/card`, `/story-book/notification-card`, `/story-book/action-card`, `/story-book/checkbox`, `/story-book/date-time-picker`, `/story-book/icon`, and `/story-book/tag`.
- Do not place design-system preview pages under `apps/erp-web/src/app/features/`.

## Quality Checklist

- No hardcoded UI text
- No `any`
- No deprecated Angular patterns
- No direct `HttpClient` usage in components
- No RTL-breaking CSS
- No unrelated structural changes

## Summary

Write small Angular components, keep state predictable, respect workspace boundaries, and follow the token and translation conventions.
