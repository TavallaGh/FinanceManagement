# ERP System Frontend

A modern ERP frontend foundation built with Angular and an Nx monorepo.

## Overview

This repository contains the frontend foundation for an ERP system with:

- Nx monorepo architecture
- Angular SPA with BFF-based runtime
- Modern Angular patterns (signals, zone-less)
- Shared design system and token-based styling
- Persian/English support with full RTL/LTR
- Dark and light themes

## System Requirements

- Node.js v18+
- npm v9+
- Angular CLI v21+
- Nx v19+

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start
```

Application runs at `http://localhost:4200`.

The internal shared-component showcase is available at:

- `http://localhost:4200/story-book/card`
- `http://localhost:4200/story-book/notification-card`
- `http://localhost:4200/story-book/action-card`
- `http://localhost:4200/story-book/checkbox`
- `http://localhost:4200/story-book/date-time-picker`
- `http://localhost:4200/story-book/icon`
- `http://localhost:4200/story-book/tag`

## Common Commands

```bash
# Development
npm start                                    # Start dev server
nx lint erp-web                             # Run linter
nx test erp-web                             # Run tests

# Build
nx build erp-web --configuration=production # Production build
```

## Documentation

### Architecture

- [architecture/erp-architecture.md](architecture/erp-architecture.md) - Workspace structure and patterns
- [architecture/bff-architecture.md](architecture/bff-architecture.md) - BFF pattern and security model

### Guides

- [guides/development-guide.md](guides/development-guide.md) - Development conventions and workflow

### Design

- [design/design-system.md](design/design-system.md) - Design system and UI guidance
- [design/ui-components.md](design/ui-components.md) - Shared UI component catalog and story-book references

### Story Book

- Shared UI previews and usage docs live under `apps/erp-web/src/app/dev-tools/story-book/`
- Current showcase routes: `story-book/card`, `story-book/notification-card`, `story-book/action-card`, `story-book/checkbox`, `story-book/date-time-picker`, `story-book/icon`, `story-book/tag`

### Localization

- [localization/i18n-guide.md](localization/i18n-guide.md) - Internationalization and RTL/LTR support

### Rules

- [rules/copilot-instructions.md](rules/copilot-instructions.md) - AI assistant instructions and patterns

## License

[MIT License](LICENSE)
