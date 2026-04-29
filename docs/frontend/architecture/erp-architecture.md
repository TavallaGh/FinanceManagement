# ERP Architecture

## Overview

This repository is an Nx monorepo for an ERP frontend built with Angular.

Runtime model:

- Angular SPA for UI
- BFF for authentication and API mediation
- backend services for business logic

The ERP application is private and authenticated, so SSR is not required by default.

## Workspace Shape

### Root Structure

Key top-level areas:

- `apps/`
- `libs/`
- `public/`
- `docs/`

### Project Tree

The current repository structure is:

```text
accounting-frontend/
├── .github/
├── .vscode/
├── apps/
│   └── erp-web/
│       └── src/
│           ├── app/
│           │   ├── core/
│           │   ├── features/
│           │   └── shared/
│           ├── assets/
│           └── environments/
├── docs/
├── libs/
│   ├── domains/
│   └── shared/
│       ├── auth/
│       ├── data-access/
│       ├── models/
│       ├── ui/
│       └── util/
├── public/
│   ├── assets/
│   └── styles/
│       ├── tokens/
│       └── utils/
├── angular.json
├── nx.json
├── package.json
├── proxy.conf.json
├── README.md
└── tsconfig.json
```

### Main App

The main web app is:

- `apps/erp-web/`

Its app-level structure is:

```text
apps/erp-web/src/app/
├── dev-tools/
├── core/
├── features/
└── shared/
```

### App-Level Responsibilities

- `dev-tools/` for internal documentation, story-book pages, and developer-only UI previews
- `core/` for app-wide infrastructure, configuration, guards, interceptors, and core services
- `shared/` for app-scoped reusable helpers and components
- `features/` for ERP business modules

## Feature Structure

Feature modules live under:

- `apps/erp-web/src/app/features/`

When a feature already has an internal structure, keep using that pattern.

Typical feature structure:

```text
feature-name/
├── components/
├── services/
├── domain/
└── constants/
```

### Feature Folder Responsibilities

- `components/` for feature-local UI and compositions
- `services/` for feature business logic and BFF/API interaction
- `domain/` for feature-specific interfaces, DTOs, enums, and types
- `constants/` for feature-specific constants

## Shared Libraries

Shared libraries live under `libs/shared/`.

- `ui/` for reusable presentational UI
- `data-access/` for shared services, HTTP helpers, and cross-cutting data logic
- `util/` for utilities, validators, formatters, and helpers
- `models/` for shared types and DTOs
- `auth/` for authentication-related frontend logic

## Domain Libraries

Domain-specific libraries may exist under `libs/domains/<domain>/`.

Typical layers:

- `feature/`
- `data-access/`
- `ui/`
- `util/`

Use them when the domain needs stronger isolation or reuse beyond the app folder.

## Dependency Boundaries

Keep dependency direction strict.

High-level rule:

```text
apps -> feature/domain -> shared
```

Practical rules:

- apps can depend on shared and domain code
- feature code can depend on UI and data-access layers
- UI libraries must not depend on feature libraries
- data-access must not depend on UI
- components must not bypass their service layer for HTTP
- do not move logic across layers without a clear reason

## UI Placement Rules

- Generic reusable UI belongs in `libs/shared/ui`.
- Feature-specific UI belongs in `apps/erp-web/src/app/features/<feature>/components/`.
- App-scoped shared pieces belong in `apps/erp-web/src/app/shared/`.
- Internal shared-component showcases belong in `apps/erp-web/src/app/dev-tools/story-book/`.

Do not create parallel folder conventions inside a feature.

## Routing

- Keep routes lazy-loaded.
- Keep feature routes close to the feature.
- Do not place feature routes inside shared UI libraries.
- Let features own their route files when that pattern already exists.

## State Strategy

- Use `rxResource` for server state.
- Use signals for local UI state.
- Use `computed()` for derived state.
- Keep effects for side effects only.
- Put broader shared state in the appropriate shared or domain store layer.

## Service Rules

- Components must not call `HttpClient` directly.
- Feature services should call BFF endpoints.
- Authentication relies on browser-managed cookies, not local bearer tokens.
- Shared services belong in the proper shared library only when reuse is real.

## Error and Loading Strategy

- Handle HTTP errors through interceptors or mapped service behavior.
- Keep user-facing notifications centralized.
- Derive loading state from resource state when using `rxResource`.

## i18n and Direction

- The app supports Persian and English.
- Language preference is stored in a cookie managed by BFF.
- Direction is controlled through the document `dir` attribute.
- Use logical CSS properties for both directions.

## Public Assets

Global visual primitives live under `public/`, including:

- design tokens in `public/styles/tokens/`
- runtime translation files in `public/assets/i18n/`

## Summary

The architecture keeps the Angular app focused on UI, preserves feature isolation, enforces workspace boundaries, and relies on the BFF for authentication and backend coordination.
