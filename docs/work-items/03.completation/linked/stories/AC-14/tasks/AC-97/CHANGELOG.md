# AC-97 Implementation Changelog

**Task:** NOTIF-01 — NT.Notification.SDK Integration for Email/SMS Services
**Parent Story:** AC-14 — IDP & Access Control
**Repositories:** `accounting-notification`, `accounting-sso`
**Status:** Completed
**Date:** 2026-05-21

---

## What Was Delivered

AC-97 connects the SSO forgot-password flow (built in AC-46) to real notification infrastructure. The dev-bypass OTP stub now only fires in `Development` and `Debug` environments; all other environments dispatch real SMS OTP codes and email reset links through the NT.Notification.SDK and the `accounting-notification` service.

---

### 1. Notification Service — Password Reset Email Support

**accounting-notification** was extended to receive and render password-reset email requests.

- **Design/Approach:** Template-based email dispatch via `ITemplateEmailServices`. Each template variant is a `TemplateNames` enum value; the current implementation handles `PasswordResetTemplate = 1`. Future templates add only a new case.
- **Features:**
  - `POST /api/v1/notification/email/send/name-template` endpoint accepts a typed `SendTemplateRequest<PasswordResetEmailModel>` payload
  - `PasswordResetTemplate.cshtml` — bilingual (FA/EN) RTL/LTR HTML email with reset button, expiry warning, and company footer
  - JWT Bearer authentication required on the email endpoint
  - `TemplateNames` enum acts as a stable external API contract between SSO and the notification service

### 2. SSO — Notification Service Client Integration

**accounting-sso** Application layer received two new clients backed by the NT.Notification.SDK.

- **Design/Approach:** `EmailNotificationService` is an `ApiClient`-based REST client that POSTs to the notification service with a JWT bearer token acquired via `ITokenServices`. `SmsNotificationService` wraps `ISecurityHttpClient` from the SDK for OTP send/validate without any in-process OTP storage.
- **Features:**
  - `EmailNotificationService.SendForgotPasswordAsync` — builds request body, acquires bearer token, POSTs to notification service; logs all success/failure outcomes
  - `SmsNotificationService.SendOptAsync` — calls `SendTimeBaseCodeAsync` to trigger OTP delivery via the notification service's security pipeline
  - `SmsNotificationService.ValidateOtpAsync` — calls `ValidateOtpAsync`; maps SDK result to boolean
  - All credentials loaded from HashiCorp Vault (`NotificationRestConfig`, `SdkCredentials`); no hardcoded values

### 3. SSO — Forgot-Password Token Service (Full Implementation)

`ForgotPasswordTokenService` was fully implemented to wire notification into the password-reset lifecycle.

- **Design/Approach:** The service coordinates four distinct responsibilities — token generation, email channel, SMS channel, and OTP validation — each with its own environment guard and error-handling boundary.
- **Features:**
  - `InitiateAsync` — generates mock token, creates real ASP.NET Identity reset token, stores in Redis; enumeration-safe (always returns neutral response)
  - `QueueEmailAsync` — AES-encrypts a `username:mockToken:language` compound key, constructs a single-use reset URL, dispatches via `EmailNotificationService`; encrypted token stored in Redis as a key for the reset page to consume
  - `QueueSmsAsync` — **environment-guarded**: only runs in `Staging`/`Production`; calls `SmsNotificationService.SendOptAsync`
  - `ValidateOtp` — **environment-guarded**: bypasses in `Development`/`Debug`; calls `SmsNotificationService.ValidateOtpAsync` in upper environments
  - `ResetPasswordAsync` — decrypts URL token, retrieves Identity reset token from Redis, calls `UserManager.ResetPasswordAsync`; enforces password policy (≥ 8 characters minimum)

### 4. SSO — MediatR Commands for Notification Channels

New MediatR commands route notification dispatch through the CQRS pipeline.

- **Features:**
  - `ForgotPasswordQueueEmailCommand` — dispatches email channel via `tokenService.QueueEmailAsync`
  - `ForgotPasswordQueueSmsCommand` — dispatches SMS channel via `tokenService.QueueSmsAsync`
  - `ForgotPasswordVerifyOtpCommand` — updated to call real `tokenService.ValidateOtp` (was a stub)

### 5. SSO — MassTransit + SDK Dependency Injection

Application injection was updated to wire the full notification infrastructure.

- **Features:**
  - `AddNotificationSdk(...)` — registers NT.Notification.SDK services from Vault secrets
  - `AddMassTransitAsync(...)` — registers RabbitMQ-backed MassTransit with `SendSmsRequestDto`/`SendEmailRequestDto` entity names bound to `{env}_NotificationQueue`; enables future async messaging without further DI changes
  - `AddRedisAsync(...)` — loads `RedisOptions` from Vault and registers `IRedisDatabase`
  - `Dihandler()` — DI registration for `IEmailNotificationService`, `ISmsNotificationService`, `IForgotPasswordTokenService`

### 6. SSO — ForgotPassword UI: Reset Password Page

A new Razor page and JavaScript modules complete the end-to-end UX for the reset flow.

- **Features:**
  - `ResetPassword.cshtml` — bilingual (FA/EN) Tailwind CSS page rendered server-side with an encrypted `token` query parameter; allows user to set a new password after following the email reset link
  - `wwwroot/js/account/reset-password/index.js` — handles form submit, language toggle, loading state
  - `wwwroot/js/account/forgot-password/*.js` — modular JS for each forgot-password screen (`identify`, `verify-otp`, `set-password`) integrated with the single-page login view manager
  - Error pages: `NotFound.cshtml` (404) and `ServerError.cshtml` (500) added

### 7. Domain Contracts & Shared Options

New domain-layer contracts and options support the notification infrastructure.

- **Features:**
  - `IEmailNotificationService` and `ISmsNotificationService` interfaces in `ForgotPassword/Contracts/`
  - `CryptoHelper` — `EncryptString`/`DecryptString` AES string extensions
  - `BaseUri` — `IdpBaseUrl` option for reset URL construction
  - `EncryptionConfiguration` — `EncryptionKey` from Vault
  - `ForgotPasswordChannelRequest` — channel selection DTO (username + mock token)

---

## Files Changed

### accounting-notification — Domain Contract
- **ERP.Notification.Contract/Emails/Contracts/ITemplateEmailServices.cs** *(NEW)*
  - Contract interface for template email services
- **ERP.Notification.Contract/Emails/Dtos/SendTemplateRequest.cs** *(NEW)*
  - Typed template request DTO
- **ERP.Notification.Contract/Emails/Enums/TemplateNames.cs** *(NEW)*
  - `PasswordResetTemplate = 1` enum; future templates add here
- **ERP.Notification.Contract/Emails/Models/PasswordResetEmailModel.cs** *(NEW)*
  - Bilingual model for password-reset email template

### accounting-notification — Application
- **ERP.Notification.Application/Emails/Services/TemplateEmailServices.cs** *(NEW)*
  - Handles `PasswordResetTemplate` case; dispatches via `IEmailService`
- **ERP.Notification.Application/InjectionBootstrappers.cs** *(PATCHED)*
  - DI registration for `ITemplateEmailServices`

### accounting-notification — Presentation
- **ERP.Notification.Presentation.EndPoint/Controllers/EmailController.cs** *(PATCHED)*
  - Wires `POST /api/v1/notification/email/send/name-template` to `ITemplateEmailServices`
- **ERP.Notification.Presentation.EndPoint/Extensions/VaultConfigurations.cs** *(PATCHED)*
  - Full infrastructure, authentication, Notification SDK, MassTransit wiring
- **ERP.Notification.Presentation.EndPoint/Program.cs** *(PATCHED)*
  - Middleware pipeline, static files, CORS, Razor
- **ERP.Notification.Presentation.EndPoint/Template/Emails/PasswordResetTemplate.cshtml** *(NEW)*
  - Bilingual RTL/LTR HTML email template

### accounting-sso — Domain
- **ERP.Sso.Domain/ForgotPassword/Contracts/IEmailNotificationService.cs** *(NEW)*
- **ERP.Sso.Domain/ForgotPassword/Contracts/ISmsNotificationService.cs** *(NEW)*
- **ERP.Sso.Domain/ForgotPassword/Contracts/IForgotPasswordTokenService.cs** *(PATCHED)*
  - Added `QueueEmailAsync`, `QueueSmsAsync`, `ValidateOtp` contract methods
- **ERP.Sso.Domain/ForgotPassword/Dtos/ForgotPasswordChannelRequest.cs** *(NEW)*
- **ERP.Sso.Domain/Common/Helpers/CryptoHelper.cs** *(NEW)*
- **ERP.Sso.Domain/Options/BaseUri.cs** *(NEW)*
- **ERP.Sso.Domain/Options/EncryptionConfiguration.cs** *(NEW)*
- **ERP.Sso.Domain/Options/ClientCredentialConfiguration.cs** *(NEW)*

### accounting-sso — Application
- **ERP.Sso.Application/Notifications/Services/EmailNotificationService.cs** *(NEW)*
- **ERP.Sso.Application/Notifications/Services/SmsNotificationService.cs** *(NEW)*
- **ERP.Sso.Application/Notifications/Dtos/SendTemplateRequest.cs** *(NEW)*
- **ERP.Sso.Application/Notifications/Dtos/ApiRequestWrapper.cs** *(NEW)*
- **ERP.Sso.Application/ForgotPassword/Commands/ForgotPasswordQueueEmailCommand.cs** *(NEW)*
- **ERP.Sso.Application/ForgotPassword/Commands/ForgotPasswordQueueSmsCommand.cs** *(NEW)*
- **ERP.Sso.Application/ForgotPassword/Commands/ForgotPasswordVerifyOtpCommand.cs** *(PATCHED)*
  - Now calls real `tokenService.ValidateOtp` (was a no-op stub)
- **ERP.Sso.Application/ForgotPassword/Services/ForgotPasswordTokenService.cs** *(PATCHED)*
  - Full implementation of all 5 service methods
- **ERP.Sso.Application/Injections.cs** *(PATCHED)*
  - AddNotificationSdk, AddMassTransit, AddRedis, Dihandler registrations

### accounting-sso — Infrastructure
- **ERP.Sso.Infra.Sql/ForgotPassword/EmailNotificationService.cs** *(REPLACED)*
  - Stub removed; implementation moved to Application layer
- **ERP.Sso.Infra.Sql/ForgotPassword/SmsNotificationService.cs** *(REPLACED)*
  - Stub removed; implementation moved to Application layer
- **ERP.Sso.Infra.Sql/Injections.cs** *(PATCHED)*
  - Notification stubs removed from infra DI

### accounting-sso — Presentation / UI
- **Erp.Sso.Ids/Endpoints/ForgotPasswordEndpoints.cs** *(PATCHED)*
  - Email/SMS/VerifyOtp handlers dispatch real commands
- **Erp.Sso.Ids/Controllers/ForgotPasswordController.cs** *(PATCHED)*
  - `ResetPassword` action with encrypted token decryption
- **Erp.Sso.Ids/Controllers/AccountController.cs** *(PATCHED)*
- **Erp.Sso.Ids/Commons/Extensions/VaultConfigurations.cs** *(PATCHED)*
  - Loads `BaseUri`, `EncryptionConfiguration`, `ClientCredentialConfiguration`
- **Erp.Sso.Ids/Views/ForgotPassword/ResetPassword.cshtml** *(NEW)*
- **Erp.Sso.Ids/Views/Error/NotFound.cshtml** *(NEW)*
- **Erp.Sso.Ids/Views/Error/ServerError.cshtml** *(NEW)*
- **Erp.Sso.Ids/Views/Account/Login.cshtml** *(PATCHED)*
- **Erp.Sso.Ids/Models/Account/ResetPasswordViewModel.cs** *(NEW)*
- **Erp.Sso.Ids/Models/Account/LoginViewModel.cs** *(PATCHED)*
- **Erp.Sso.Ids/wwwroot/js/account/forgot-password/identify.js** *(NEW)*
- **Erp.Sso.Ids/wwwroot/js/account/forgot-password/verify-otp.js** *(NEW)*
- **Erp.Sso.Ids/wwwroot/js/account/forgot-password/set-password.js** *(NEW)*
- **Erp.Sso.Ids/wwwroot/js/account/forgot-password/constants.js** *(NEW)*
- **Erp.Sso.Ids/wwwroot/js/account/reset-password/index.js** *(NEW)*
- **Erp.Sso.Ids/wwwroot/js/account/login/index.js** *(PATCHED)*
- **Erp.Sso.Ids/wwwroot/js/account/login/constants.js** *(PATCHED)*

### accounting-sso — Tests
- **ERP.Sso.Api.Tests.Integration/Roles/RoleEndpointSecurityTests.cs** *(PATCHED)*
- **ERP.Sso.Api.Tests.Integration/Roles/RolePermissionEndpointTests.cs** *(PATCHED)*
