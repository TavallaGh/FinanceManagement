# Blazor Frontend Structure Standard

This is the adopted best-practice structure for `projects/Accounting-Project/src/Accounting.Blazor`.

## Decision

Yes, your approach is good. It is implemented with one improvement:
- Use **feature/module-first folders** for pages and services.
- Keep page models in a dedicated **Models folder** by module.

## Folder Pattern

```text
src/Accounting.Blazor/
  Layout/
  Components/
  Models/
    IDP/
      Request/
        LoginRequestModel.cs
      Response/
        LoginResponseModel.cs
      LoginPageModels.cs
  Pages/
    IDP/
      Login/
        Login.razor
        LoginPageComponent.cs
  Clients/
    IDP/
      LoginApiClient.cs
  Bootstrappers/
    FrontendDependencyBootstrapper.cs
```

## Rules

- Frontend has no interfaces by standard; classes are concrete.
- Razor page files (`.razor`) must contain markup only and inherit from a page component class.
- API calls belong to `Clients/`, not page UI files.
- A dedicated ApiClient must exist per razor page.
- ApiClient naming must follow page name: `PageNameApiClient`.
- Request/Response models must live in `Models/<Module>/Request` and `Models/<Module>/Response`.
- Request model names must end with `RequestModel`.
- Response model names must end with `ResponseModel`.
- All DI registrations must be centralized in `Bootstrappers`.
- Prefer reflection-based registration for ApiClient classes.
- Shared UI controls must be dynamic reusable components under `Components/`.

## Frontend Layer Responsibilities

- `Pages/`: markup and binding only.
- page component classes: UI state handling and calling concrete ApiClient classes.
- `Clients/`: API call implementations per page.
- `Models/Request`: request contracts.
- `Models/Response`: response contracts.
- `Components/`: shared dynamic components (table, buttons, inputs, etc.) with parameters.
- `Bootstrappers/`: centralized DI composition.

## Implemented Example

- Page: `Pages/IDP/Login/Login.razor` (target standard)
- Component class: `Pages/IDP/Login/LoginPageComponent.cs` (target standard)
- Models: `Models/IDP/Request/*`, `Models/IDP/Response/*`, `Models/IDP/LoginPageModels.cs`
- Client: `Clients/IDP/LoginApiClient.cs`
- DI registration: `Bootstrappers/FrontendDependencyBootstrapper.cs`

## Why This Is Best Practice

- Keeps UI components clean and testable.
- Makes API call logic reusable and mockable.
- Scales naturally as each module grows.
- Maintains clear ownership by business module.
