# Frontend System Design

## 1. Goals

- Deliver an RTL/LTR bilingual accounting frontend.
- Keep a consistent App Shell (sidebar, header, workspace).
- Enforce role/permission-aware navigation and page actions.
- Support module-based incremental delivery from MVP docs.

## 2. Runtime Architecture

## 2.1 Boot Layer

- Entry page: `projects/Accounting-Prototype/index.html`
- Runtime model:
  - CDN React and ReactDOM.
  - Babel runtime (`text/babel` modules loaded in browser).
  - Tailwind via CDN.
  - Supabase client via import map (`@supabase/supabase-js`).
- Global namespace pattern: screen modules are attached to `window.*` and consumed by `app.js`.

## 2.2 Application Layer

- Core app shell: `projects/Accounting-Prototype/app.js`
- Main responsibilities:
  - Authentication and password fallback verification.
  - Session user state.
  - Permission aggregation from role and direct grants.
  - Dynamic menu filtering (`window.hasAccess`).
  - Active module/page routing by `activeId`.
  - Header actions (search, docs, language, alerts).

## 2.3 Feature Layer

- Shared UI primitives: `projects/Accounting-Prototype/components/UIComponents.js`
- Master data and admin pages: `projects/Accounting-Prototype/components/*.js`
- GL pages: `projects/Accounting-Prototype/financial/generalledger/*.js`

## 3. Logical Design

## 3.1 Context And State

- UI context:
  - `lang` -> changes `dir` and labels.
  - `activeModuleId` and `activeId` -> screen rendering.
  - `sidebarCollapsed` -> two-panel shell behavior.
- Auth context:
  - `currentUser`, `isLoggedIn`.
  - Recovery and login view state.
- Security context:
  - `window.IS_ADMIN` for global full access.
  - `window.USER_PERMISSIONS` as a normalized permission set.

## 3.2 Access Control Design

- Permission levels in current implementation:
  - Level 1: page/form access (`resource`).
  - Level 2: action access (`resource.action` or wildcard).
- Data-scope level exists in MVP docs and should be expanded in next phase.

## 3.3 Navigation Design

- Module selector: icon rail (first sidebar).
- Tree menu: nested items per module (second sidebar).
- Workspace: route target by `activeId`.

## 4. Data And Integration Design

- Current backend integration: Supabase schema `gen`.
- Login retrieves `gen.users` and validates hash/plain/base64/fallback RPC.
- Permission resolution reads:
  - `gen.user_roles`
  - `gen.permissions`
- Menu model comes from in-memory `window.MENU_DATA` and is filtered at runtime.

## 5. UI/UX Design Constraints (From MVP)

- Mandatory dual language and directional support (RTL/LTR).
- Persian typography baseline (Vazirmatn).
- Consistent visual rules in all pages.
- Boolean fields should use checkbox style (per MVP docs).

## 6. Risks And Technical Debt

- Browser Babel + many script tags do not scale for production.
- Global `window.*` registration is fragile and hard to type/test.
- Missing formal route/state management package.
- Partial mismatch between MVP-defined components and currently mounted routes.

## 7. Recommended Next Architecture Step

- Move to build-based React app (Vite/Next) while preserving current UX and module contracts.
- Introduce:
  - Typed route registry.
  - Permission service (form/action/data-scope complete).
  - API client layer and DTO mapping.
  - Component library package for shared UI primitives.

## 8. Blazor Module Structure (Adopted)

For `projects/Accounting-Project/src/Accounting.Blazor`, the adopted structure is:

- `Models/<Module>/Request` and `Models/<Module>/Response` for API contracts.
- `Modules/<Module>/<Submodule>/Pages/...` for current Razor page placement.
- `Clients/<Module>/...` for concrete API clients.
- `Bootstrappers/...` for centralized DI registration (reflection preferred).
- Razor pages must keep UI markup only and inherit from a separate component class that contains page logic.
- ApiClient naming convention is `PageNameApiClient` (for example `LoginApiClient`).
- ApiClients are injected into page components through the DI container.

Implemented reference:

- `projects/Accounting-Project/src/Accounting.Blazor/Modules/IDP/Login/Pages/Login.razor`
- `projects/Accounting-Project/src/Accounting.Blazor/Modules/IDP/Login/Pages/LoginPageComponent.cs`
- `projects/Accounting-Project/src/Accounting.Blazor/Models/IDP/LoginPageModels.cs`
- `projects/Accounting-Project/src/Accounting.Blazor/Models/IDP/Request/LoginRequestModel.cs`
- `projects/Accounting-Project/src/Accounting.Blazor/Models/IDP/Response/LoginResponseModel.cs`
- `projects/Accounting-Project/src/Accounting.Blazor/Clients/IDP/LoginApiClient.cs`
- `projects/Accounting-Project/src/Accounting.Blazor/Bootstrappers/FrontendDependencyBootstrapper.cs`
