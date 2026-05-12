# Localization Architecture and Engineering Guidelines

## 1. Scope of This Document

This document defines how localization must work across the full ERP system:

- Backend (.NET APIs)
- Frontend SPA
- Shared localization key strategy
- Error messages
- Validation messages
- Page titles
- UI text
- Notifications

All user-facing text must follow these rules.

## 2. Mandatory Localization Rules

### 2.1 All user-facing text must be localized

This includes:

- UI labels
- Page titles
- Validation messages
- Error messages
- Notifications
- Button texts
- Menu items

Hard-coded user-facing strings are forbidden.

### 2.2 Localization must be key-based

Translated text must not be embedded in backend code.

Incorrect:

```csharp
throw new Exception("User not found");
```

Correct:

```csharp
throw new BusinessException(LocalizationKeys.ErrorKeys.UserNotFound);
```

### 2.3 Keys must be centralized and strongly typed

Localization keys must be stored in static classes and referenced as constants.

Recommended class groups:

- `LocalizationKeys`
- `UiKeys`
- `ErrorKeys`
- `ValidationKeys`
- `PageKeys`
- `NotificationKeys`

Example:

```csharp
public static class UiKeys
{
    public const string LoginForm = "UI_LOGIN_FORM";
    public const string Username = "UI_USERNAME";
}
```

Benefits:

- Compile-time safety (avoids typo-prone string literals)
- Safer refactoring
- Consistent key usage across teams and services

## 3. Backend Contract Rules

### 3.1 Backend returns localization keys, not translated text

API responses must include keys such as `messageKey` and optional metadata.

Example:

```json
{
  "messageKey": "ERROR_USER_NOT_FOUND"
}
```

The frontend resolves keys to translated text.

### 3.2 Exceptions and business errors

Domain/application errors must carry keys.

```csharp
throw new BusinessException(LocalizationKeys.ErrorKeys.UserNotFound);
```

## 4. SPA Localization Strategy

Localization flow for SPA systems:

1. API returns `messageKey`
2. Frontend localization layer resolves key using active language resource
3. UI renders translated text

```text
API --> messageKey
SPA --> localization resolver
UI --> translated text
```

## 5. Localization Service / Helper

A localization service is required to avoid direct resource access spread across UI layers.

Example interface:

```csharp
public interface ILocalizationService
{
    string Get(string key);
}
```

Usage guidance:

- Backend: uses key constants for exceptions and response contracts.
- Frontend: resolves keys for rendering in components/pages.

## 6. Language Resolution Strategy

Recommended language resolution order:

1. User preference
2. Tenant configuration
3. Browser language
4. Default system language

This order supports personalized UX while preserving tenant-level governance.

## 7. Localization Storage Strategy

### Option 1 (recommended for SPA)

Use JSON language files:

```text
/localization
  en.json
  fa.json
  tr.json
```

### Option 2

Database-based localization for multi-tenant systems requiring runtime updates or tenant-specific overrides.

## 8. Localization Key Naming Convention

Use descriptive category-prefixed uppercase keys:

- `UI_LOGIN_FORM`
- `ERROR_USER_NOT_FOUND`
- `VALIDATION_REQUIRED_FIELD`
- `PAGE_LOGIN_TITLE`
- `NOTIFICATION_PASSWORD_RESET_SUCCESS`

Rules:

- Keys must be grouped by category.
- Keys must be descriptive and stable.
- Avoid ambiguous names such as `MSG_1` or `TEXT_LABEL`.

## 9. Validation Localization

Validation messages must use localization keys.

FluentValidation example:

```csharp
RuleFor(x => x.Username)
    .NotEmpty()
    .WithMessage(LocalizationKeys.ValidationKeys.RequiredField);
```

The UI resolves the key and displays translated text.

## 10. Logging Rule

Logs must not be localized.

Rules:

- Logs: English only
- UI: Localized

Why:

- Consistent debugging across environments
- Stable searchable patterns in observability tools
- Easier incident response for cross-region engineering teams

## 11. Code Review Enforcement

Localization compliance must be part of every code review.

Mandatory checks:

- No hard-coded UI strings
- No hard-coded user-facing error messages
- All user-facing text uses localization keys
- Backend returns keys instead of translated text
- Validation messages use localization keys
- API contracts and exception paths are key-based

## 12. AI Code Generation and Review Rules

AI assistants must follow these rules:

- Never generate hard-coded UI strings
- Always use localization keys
- Always reference strongly typed constants
- Backend APIs must return message keys
- Frontend must resolve translations

AI review must reject code violating these constraints.

## 13. Recommended Folder Structure

```text
/Localization
  /Keys
    UiKeys.cs
    ErrorKeys.cs
    ValidationKeys.cs
    PageKeys.cs
    NotificationKeys.cs
  /Resources
    en.json
    fa.json
    tr.json
```

Why this structure is maintainable:

- Clear separation of keys and resources
- Strong discoverability for developers and AI tools
- Simple onboarding and governance
- Scales for multi-language ERP domains

## 14. Production ERP Architecture Notes

For production-grade ERP systems:

- Localization must be deterministic and testable.
- Key compatibility must be versioned across backend/frontend contracts.
- Missing key behavior must be explicit (fallback + monitoring alert).
- CI checks should fail if hard-coded user-facing strings are introduced.
- Localization coverage should be part of release readiness.
