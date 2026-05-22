# Copilot Instructions — ERP Angular Project

## Pre-Task Protocol

Before starting any task, confirm availability of the Angular MCP Server (mandatory) and Figma MCP Server (recommended). Both are configured **locally** — do not search for remote MCP servers, attempt external server discovery, or auto-detect cloud-based endpoints. Report their status and wait for confirmation before implementing anything.

Before writing any code, review `/docs/erp-architecture.md`, the UI library structure, domain isolation rules, and existing reusable components.

---

## i18n & RTL/LTR Support

This project is **bilingual** (Persian/English) with full RTL/LTR support.

### Translation Rules

- **Never hardcode text** — always use translation keys
- Use `{{ 'key.subkey' | translate }}` in templates
- Use `this._i18nService.translate('key')` in TypeScript
- Add new keys to both `/assets/i18n/fa.json` and `/assets/i18n/en.json`

### RTL/LTR Guidelines

- Use **logical properties** exclusively:
  - `margin-inline-start` instead of `margin-left`
  - `padding-inline-end` instead of `padding-right`
  - `inset-inline-start` instead of `left`
  - `inset-inline-end` instead of `right`
- Direction is managed automatically via `html[dir]` attribute
- Test components in both RTL and LTR modes

### Language Storage

- Language preference is stored in a **cookie** managed by BFF (name: `erp_app_language`)
- Cookie is accessible by both backend and frontend
- BFF handles setting and reading the language cookie
- Changes apply **immediately without page refresh**

### Separation Of Concerns

- Use **cookies for language preference** (managed by BFF, accessible by both frontend and backend)
- Use **localStorage only for UI-only preferences** such as theme selection, sidebar state
- Use **HttpOnly cookie for authentication/session** via BFF
- Do not store access tokens or refresh tokens in localStorage or sessionStorage

### Adding New Translations

1. Add key to `/assets/i18n/fa.json`
2. Add equivalent key to `/assets/i18n/en.json`
3. Use in template: `{{ 'your.key' | translate }}`
4. Ensure Persian text is properly written (RTL)

---

## Angular Version & APIs

Always use the latest Angular version. Deprecated APIs are not allowed.

Always use:

- `signal()`, `computed()`, `effect()`, `linkedSignal()`
- `inject()` for dependency injection
- `rxResource`
- Signal inputs, signal outputs, signal `viewChild`, signal `viewContent`
- `FormControlValue` for custom form controls (not `ControlValueAccessor`)
- `ChangeDetectionStrategy.OnPush` on every component
- **Zone-less mode**: No `NgZone` usage — all change detection must be signal-based

---

## Template Syntax

Use modern Angular control flow syntax exclusively:

- `@if`, `@for`, `@let`

Never use `*ngIf`, `*ngFor`, or `*ngSwitch`.

---

## Component Structure

- Do not add `standalone: true` — components are standalone by default.
- Do not import `CommonModule`.
- Use self-closing tags when there's no content inside: `<app-button />`, `<app-icon />`, `<img />`, `<input />`.
- Never use legacy structural module patterns.

---

## ERP Project Structure

This is an **ERP (Enterprise Resource Planning)** system organized as an **Nx Monorepo** with the following architecture:

### Runtime Architecture

- Frontend runs as **Angular SPA**
- Authentication and API mediation run through **BFF**
- Backend owns login, token issuance, and business APIs
- **SSR is not required by default** for ERP internal pages

Use SSR only if the project later adds public SEO-sensitive pages outside the authenticated ERP application.

### Apps Layer
- `apps/erp-web/` - Main web application containing all ERP features

### Features (Inside erp-web app)
Features are organized under `apps/erp-web/src/app/features/`:
- `dashboard/` - Main dashboard with KPIs and metrics
- `accounting/` - Accounting module (GL, AR, AP, Financial Reports)
- `hr/` - Human Resources (Employees, Payroll, Attendance)
- `inventory/` - Inventory management
- `sales/` - Sales management
- `purchasing/` - Purchasing and procurement
- `crm/` - Customer Relationship Management
- `manufacturing/` - Manufacturing and production
- `reports/` - Reporting and analytics

### Shared Libraries
Libraries under `libs/shared/`:
- `ui/` - Design system and reusable UI components
- `data-access/` - Shared services, HTTP clients, interceptors
- `util/` - Utilities, validators, formatters, pipes
- `models/` - Shared interfaces, DTOs, and types
- `auth/` - Authentication and authorization

### Domain Libraries (Optional)
Libraries under `libs/domains/<domain>/`:
- `feature/` - Domain feature implementations
- `data-access/` - Domain-specific API services
- `ui/` - Domain-specific UI components
- `util/` - Domain-specific utilities

Each feature under `apps/erp-web/src/app/features/<feature-name>/` contains:
- `components/` - Feature-specific components
- `services/` - Feature-specific business logic and API
- `domain/` - Feature-specific models, DTOs, enums
- `constants/` - Feature-specific constants
- `<feature>.routes.ts` - Feature routing

Follow the existing structure of the target feature instead of introducing a new folder convention.

---

## Nx Workspace Boundaries

Libraries must follow Nx layer architecture:

apps -> feature -> ui -> data-access -> core

Rules:
- apps can import from any lib
- feature libs can import ui and data-access
- ui libs cannot import feature libs
- data-access cannot import ui
- core cannot depend on domain libs

---

## Import Boundaries

Respect the current workspace boundaries:

- `apps/<app>/src/app/core` is for app-level core concerns such as configuration, guards, interceptors, app-scoped services, and cross-feature infrastructure
- `apps/<app>/src/app/shared` is for app-level shared helpers, utilities, and reusable app-scoped building blocks
- `libs/ui` is the design system and reusable presentational UI library shared across apps
- `apps/<app>/src/app/features/*/components` is only for feature-local UI that is not reusable across multiple features
- `apps/<app>/src/app/features/*/services` is only for feature-local business logic and API interaction
- `apps/<app>/src/app/features/*/domain` is only for feature-local types and domain contracts

Do not move logic between these layers unless explicitly asked.

---

## UI Reuse Rules

Before creating a new component, check `libs/ui/src/lib/components` first.

Use `libs/ui` only for reusable, generic, design-system-level components.

Use feature `components/` only for feature-specific compositions or screens that contain business context.

Do not create a new UI library component if the requirement can be solved by composing existing components from `libs/ui`.

Do not move feature-specific business components into `libs/ui`.

---

## Feature Domain Folder Rules

Within each feature, the `domain/` folder contains only feature-specific:

- interfaces
- types
- DTOs
- enums
- response/request models
- mapping contracts

Do not place Angular components, services, or view logic inside `domain/`.

---

## Service Rules

Feature API calls and feature business logic must remain inside that feature’s `services/` folder unless an equivalent app-level core service already exists.

Do not call `HttpClient` directly from components.

Components may only consume feature services or existing app/core services.

Keep services scoped to the feature when they are not reused outside that feature.

For authenticated requests, frontend services must call **BFF endpoints** and rely on browser-managed cookies. They must not manually attach bearer tokens from browser storage.

---

## Existing Structure First

Always inspect the target feature and follow its current local structure before adding files.

If a feature already has `components`, `services`, `domain`, `constants`, or local route files, continue using that pattern.

Do not introduce a parallel structure inside the same feature.

---

## State Management

Server state must use rxResource.

UI state must use signal() or signalStore.

Avoid RxJS subscriptions inside components.

Effects must be used for side effects only.

Global state must live in domain-level stores.

---

## Error Handling

All HTTP errors must be handled via interceptor.

User-facing errors must use toast service.

Components must not contain manual try/catch logic for HTTP.

Domain services must map API errors to domain errors.

---

## Loading State

Loading states must come from resource.status.

Do not create manual loading signals when using rxResource.

Skeleton components must be used for loading states.

---

## Routing

All routes must be lazy loaded.

Domains must expose their own route configuration.

Apps should only import domain routes.

Never define routes inside UI libraries.

---

## Routing Rules

Each feature must own its routing in a local `<feature>.routes.ts` file when the feature already follows that pattern.

Keep route definitions close to the feature.

Do not define feature routes inside `libs/ui`.

Use lazy loading where the current app architecture already supports it.

---

## Performance

Avoid large signal trees.

Computed signals must remain pure.

Heavy computations must move to services.

Avoid unnecessary effects.

---

## Domain Architecture

Every feature must follow the existing project architecture defined in `/docs`.

In this workspace, features are primarily implemented under:
`apps/<app-name>/src/app/features/<feature-name>/`

Feature internals must remain isolated using the existing local structure of that feature.

Shared app-level models belong in the existing app or workspace `core` structure.

Feature-specific models must remain in the feature’s local `domain/` folder.

Reusable presentational UI components belong in `libs/ui`.

App-scoped shared helpers and utilities belong in the existing `shared` structure.

---


## Workspace Structure Rules

This project uses the existing workspace structure and it must be preserved.

Current architecture must be respected exactly as implemented in the repository:

- app features live under `apps/<app-name>/src/app/features/<feature-name>/`
- app core concerns live under `apps/<app-name>/src/app/core`
- app shared logic lives under `apps/<app-name>/src/app/shared`
- reusable design-system UI components live under `libs/ui/src/lib/components`

Do not introduce a new folder strategy unless explicitly requested.

When working inside a feature, follow the existing local structure of that feature. If the feature already contains folders such as:

- `components`
- `services`
- `domain`
- `constants`

then continue using the same structure.

### Feature folder responsibilities

- `components/`: feature-specific components and compositions
- `services/`: feature-specific services, business logic, and API interaction
- `domain/`: feature-specific interfaces, DTOs, enums, and types
- `constants/`: feature-specific constants
- `<feature>.routes.ts`: feature-local route definitions

### Reuse boundaries

Before creating a new component, always check `libs/ui/src/lib/components`.

- Use `libs/ui` for generic, reusable, design-system components
- Use feature `components/` for feature-specific business UI
- Use app `shared/` for app-scoped reusable helpers and utilities
- Use app `core/` for infrastructure, configuration, guards, interceptors, and app-wide services

Do not duplicate existing UI libraries.
Do not move feature-local code into `libs/ui` unless it is truly generic and reusable.
Do not create parallel folder conventions inside an existing feature.

### Service and data rules

- Components must not call `HttpClient` directly
- Feature components must consume feature services or existing app/core services
- Feature-specific request/response models must stay inside that feature’s `domain/`
- Shared app-level models may live in the existing `core` structure when already established by the workspace

### Routing rules

Keep routing close to the feature using the existing local route file pattern such as `<feature>.routes.ts`.

Do not place feature routes inside `libs/ui`.

### Storybook rules for this workspace

Storybook updates are mandatory for `libs/ui` components and for any existing storybook integration already present in the workspace.

Do not create storybook entries for feature-local components unless explicitly requested or already supported by the current storybook structure.

### Existing structure first

Always inspect the target area and extend the existing pattern before creating files.

Do not reorganize folders, rename architectural layers, or migrate structure unless explicitly requested.

## UI Library Rules

Before creating a new library, analyze all existing UI libraries. If a related library exists, extend or modify it — do not duplicate or create similar variations. Only create a new library if no suitable extension is possible. Redundant libraries are prohibited.

Libraries must be simple, minimal, exact to Figma, and not over-engineered.

**Component Architecture:**

- Use **component-based pattern** only — never use directive pattern that requires global style imports
- Directive pattern (e.g., `button[nttButton]`) increases initial bundle size by requiring global CSS imports
- All UI libraries must be self-contained components with scoped styles
- Ensure RTL/LTR flexibility in all layouts and positioning without using dir or somehting like that page direction will handle it but just keep eye on it

**Persian Text:**

- All examples in UI libraries must use Persian text, not English placeholders

---

## Storybook Rules

After building or extending any UI library, you MUST update Storybook:

1. **Always add menu link**: Add a new entry to `menuItems` in `StoryBookComponent` (`src/app/dev-tools/story-book/story-book.component.ts`).

2. **Always add route**: Add a route entry to `story-book.routes.ts` with lazy loading.

3. **Extend existing stories**: If a storybook for the component already exists, extend it with new variations — do not create a separate story file.

4. **Enable easy copy**: Each story item must include a copiable code snippet. Use a "Copy" button or click-to-copy functionality so developers can quickly grab the base markup.

5. **Clean base usage**: Each variation must show minimal, clean markup that developers can copy directly into their code.

6. **Story-book update is mandatory for every new or changed feature**: When you add a new component, a new variant, or a new feature to an existing component, you MUST update (or create) its story-book page. This is not optional. The task is not complete until the story-book reflects the change.

7. **Always set `[showCode]="false"` on `StoryBookPreviewComponent` for complex components**: Never rely on the auto-extracted DOM output for components that render dynamic data, rows, paginated content, or any structure larger than a single self-contained widget. Always set `[showCode]="false"` on `<app-story-book-preview>` and provide explicit code snippets via `<app-story-book-code-block>`.

8. **Code blocks must have explicit TypeScript + HTML tabs**: Whenever a component requires TypeScript setup (column definitions, data arrays, signal declarations, action handlers, etc.), the code block must include a TypeScript tab alongside the HTML tab. Use the `[snippets]` input on `StoryBookCodeBlockComponent`:

   ```html
   <app-story-book-code-block [snippets]="[
     { label: 'TypeScript', code: _myTsSnippet },
     { label: 'HTML',       code: _myHtmlSnippet }
   ]" />
   ```

   A single HTML-only code block is only acceptable when the component has no required TypeScript setup.

**Storybook Checklist:**

- [ ] Menu link added to `StoryBookComponent.menuItems`
- [ ] Route added to `story-book.routes.ts`
- [ ] Story component created or extended
- [ ] Each item has copy-to-clipboard functionality
- [ ] Base markup is clean and minimal
- [ ] Story-book page updated for every new feature or variant added
- [ ] All `<app-story-book-preview>` elements on complex components have `[showCode]="false"`
- [ ] Every example section has an `<app-story-book-code-block>` with both TypeScript and HTML tabs where applicable

---

## Storybook Scope

Storybook updates are mandatory only for components in `libs/ui` or for app-level storybook pages already wired into the current workspace storybook structure.

Do not create storybook entries for feature-local components unless the project already exposes that feature in storybook or the task explicitly asks for it.

When extending `libs/ui`, update the existing storybook integration in the current workspace structure instead of inventing a new one.

---

## Reusable Component First

Do not use Tailwind or utility-class-based styling for implementation.

If a UI pattern, layout block, form section, state view, or repeated visual structure appears more than once or is likely to be reused, extract it into a reusable component instead of repeating markup and styles.

Prefer building small reusable Angular components over copying template fragments.

Reusable presentational components shared across features or apps must be added to `libs/ui` when they are generic and design-system-level.

Feature-specific repeated blocks must be extracted into local reusable components inside that feature’s `components/` folder.

Do not solve repeated UI patterns with long utility-class chains or duplicated HTML structures.
### Always Use Existing Project Components

Before writing any new component or importing any third-party UI element, you MUST check whether the project already provides a component that covers the requirement:

1. Check `libs/shared/ui/src/lib/components/` first — this is the canonical design-system library.
2. Check `apps/erp-web/src/app/shared/` for any app-scoped shared components.
3. Check the target feature's own `components/` folder for existing local compositions.

Do NOT:
- Create a new component if an existing one in `libs/shared/ui` already covers the need
- Import Angular Material or any third-party component library if the project's own design system provides an equivalent
- Define a one-off inline component when an existing shared component can be reused with different inputs
- Copy-paste a component's template structure instead of reusing the component itself

This rule applies everywhere: feature components, page layouts, story-book pages, and infrastructure. If you discover that an existing component is missing a required variant or input, extend the existing component — do not create a parallel one.
Angular Material is allowed when it fits the project and no existing workspace UI component already covers the requirement.

When using Angular Material:
- prefer composition and extension over raw default Material appearance
- adapt it to the project design tokens and Figma requirements
- do not introduce Angular Material if an existing `libs/ui` component already solves the problem
- do not mix Angular Material styling patterns with utility-class styling

---

## Figma Compliance

Every element visible in Figma or a screenshot must be detected, built, and converted into a reusable UI library component. Implement only defined states: hover, focus, active.

Do not invent behavior, add visual enhancements, simplify structure, or ignore small details. Do not approximate spacing or guess values. Always map Figma values to existing project variables.

If a mismatch exists between Figma and what can be implemented, add an inline comment:

```
# NOT_MATCHED_WITH_FIGMA
```

Then continue implementation.

---

## Design Tokens & Variables

All design tokens must be defined in `/public` and cover: colors (light & dark), spacing, typography, radius, elevation, and z-index layers.

Never use explicit pixel values (e.g. `14px`), inline spacing, or hardcoded Figma values. Always use token variables with fallback values. No custom variables inside libraries.

Every color must support both light mode and dark mode — no exceptions.

**Z-Index Layers:**

Use predefined z-index variables from `/public/styles/tokens/_z-index.scss`:

- `--z-base: 0` — Base layer for normal content
- `--z-dropdown: 50` — Dropdown menus
- `--z-sticky: 100` — Sticky elements
- `--z-fixed: 200` — Fixed position elements
- `--z-header: 300` — Fixed headers and navigation
- `--z-overlay: 400` — Overlay backgrounds
- `--z-modal: 500` — Modal dialogs and popups
- `--z-popover: 600` — Popover components
- `--z-toast: 700` — Toast notifications and alerts
- `--z-tooltip: 800` — Tooltips
- `--z-max: 9999` — Maximum z-index for critical overlays

Never use hardcoded z-index values. Always reference these variables.

---

## Icons

All icons must come from `/public/icon/bcm-icon.scss`. Do not use SVG unless explicitly required. Get width and height from Figma MCP and map sizes exactly.

---

## Forms

Pages must use Signal Forms with `submit()` signal, `disable()`, and `required()`. The submit button must bind to the submitting state. Custom controls must use `FormControlValue`.

---

## CSS & Markup

Use BEM methodology, OOP CSS, semantic HTML, and accessibility best practices. Use Flex and Grid for layout.

Do not use Tailwind, Tailwind-like utilities, or utility-class-driven markup.

Prefer reusable Angular components and scoped styles over utility-class composition.

If a visual block or layout pattern is reused, extract it into a reusable component instead of duplicating markup.

Never use explicit margin, padding, radius, or font values — use helper variables only. Avoid overflow hacks, artificial spacing, and forced layout corrections. The DOM must appear clean, logical, and structurally organized with no visual hacks.

**CSS Rules:**

- No normalizer styles
- Do not repeat styles — extract common patterns
- When using `var()` in CSS within **UI libraries only**, always include fallback values based on the exact variable value from the workspace
  - Example: `color: var(--fg-primary, #181d27);`
  - **Note**: Fallback values are NOT required in app area or shared components — only in UI libraries
- No heavy CSS rules like `transition: all 0.2s ease-in-out;` — be specific with properties
  - Use: `transition: opacity 0.2s ease-in-out;` instead of `transition: all 0.2s ease-in-out;`
- Ensure RTL/LTR flexibility — use logical properties (`margin-inline-start`, `padding-inline-end`)

**Linting:**

- ESLint and Stylelint must pass on all TypeScript, SASS, and HTML files
- Zero errors or warnings allowed before submission

---

## Styling Scope

Feature-specific styles must remain inside the feature.

App-level shared styles must be reused from the existing app structure when available.

Do not create new global style dependencies for a feature when the feature can use local scoped styles.

Do not convert local feature styles into a UI library style unless the component is truly reusable across multiple features or apps.

---

## Angular Material Usage

Angular Material may be used when appropriate.

Before using Angular Material, first check whether an equivalent component already exists in `libs/ui` or in the target feature.

Prefer existing project components over Angular Material when possible.

Angular Material components must be styled and composed to match Figma, project tokens, and workspace conventions.

Do not rely on raw default Angular Material visuals when they do not match the design system.

Do not create duplicate wrappers around Angular Material unless a reusable project-specific abstraction is actually needed.

---

## Code Conventions

- All private methods and fields must start with `_`.
- No `any` type.
- No unnecessary `public` modifiers.
- No redundant explicit typing.
- Reusable components must use Angular's ID generator SDK.
- Leave no ESLint or Stylelint errors or warnings.
- No code comments except in directives and pipes where a guide comment is appropriate.

---

## Mobile-First

When building a page, implement mobile layout first, then extend to desktop.

---

## Token Naming Differences

If spacing or token naming differs between Foundations and Figma, map by value — this is acceptable.

---

## Absolute Prohibitions

- No invented UI
- No approximate or hardcoded spacing/pixel values
- No deprecated Angular APIs
- No Tailwind
- No SVG icons (unless explicitly required)
- No `any` type
- No custom variables inside libraries
- No redundant libraries
- No remote MCP server discovery
- No `*ngIf`, `*ngFor`, `*ngSwitch`
- No `CommonModule`
- No `standalone: true`
- No code comments (except directive/pipe guides)
- No `NgZone` usage
- No normalizer styles
- No directive pattern for UI libraries (use component-based approach)
- No heavy CSS transitions like `transition: all`
- No CSS var() without fallback values in UI libraries (app area and shared components don't require fallbacks)
- No English text in library examples (use Persian)

---

## Pre-Submission Checklist

- MCP servers confirmed (local only)
- Documentation reviewed
- Existing libraries analyzed and extended where possible
- Figma strictly matched; mismatches marked `# NOT_MATCHED_WITH_FIGMA`
- All variables mapped correctly; no hardcoded values
- All CSS var() in UI libraries includes fallback values (not required in app/shared)
- Dark mode covered
- Storybook created or updated
- Lint clean (ESLint + Stylelint)
- Architecture respected (`features/`, `core/`, `shared/`, `libs/ui`)
- No deprecated APIs used
- Modern template syntax (`@if`, `@for`, `@let`) used throughout
- Mobile-first layout applied
- RTL/LTR flexibility implemented
- Component-based pattern used (no directive pattern)
- Persian text in all examples
- No heavy CSS transitions or repeated styles
- No NgZone usage
- Don't import mixins and variables in scss files
