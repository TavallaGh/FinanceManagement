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

### Localization

- [localization/i18n-guide.md](localization/i18n-guide.md) - Internationalization and RTL/LTR support

### Rules

- [rules/copilot-instructions.md](rules/copilot-instructions.md) - AI assistant instructions and patterns

## License

[MIT License](LICENSE)
