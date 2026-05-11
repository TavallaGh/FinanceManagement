# REVISED Implementation Plan: AC-46 — Forgot-Password Backend (Service Wiring & Token Management)

**Task Identity:** AC-46 (BE-01)  
**Parent Story:** AC-14  
**Target Repository:** `accounting-sso`  
**Plan Status:** Approved  
**Revision Date:** 2026-05-07  

---

## 1. Executive Summary — What's Actually Needed

**Current State:**
- ✅ `ForgotPasswordEndpoints.cs` exists with 5 endpoints (identify, email, sms, verify-otp, set-password)
- ✅ Request/response DTOs defined
- ✅ Endpoints registered in `Program.cs`
- ❌ Endpoints are stubs — no actual service wiring
- ❌ No Redis integration
- ❌ No token management service

**What This Plan Delivers:**
1. Service contracts (interfaces only):
   - `IForgotPasswordTokenService` (token generation, Redis storage, exchange)
   - `IEmailService` (stub contract, no implementation)
   - `ISmsService` (stub contract, no implementation)
2. Token flow implementation:
   - **Identify**: Generate mock token (`fp-{guid}`); store user session
   - **Email/SMS**: Generate real token; store in Redis with mock token as key; return mock token for email URL
   - **Token Exchange**: When user clicks email link with mock token, exchange for real token from Redis
3. Redis registration in infra layer with vault credentials

**Out of Scope (AC-46):**
- Email/SMS notification dispatch (services are stub contracts only)
- OTP validation logic (deferred to future story when SMS/Email are fully implemented)
- Implementation of actual email/SMS delivery

---

## 2. Scope & Assumptions

### In Scope
- Five endpoints in `Erp.Sso.Ids/Endpoints/ForgotPasswordEndpoints.cs` (already defined, will be wired)
- Service contracts (interfaces) in Application layer:
  - `IForgotPasswordTokenService` — Redis-backed token management
  - `IEmailService` — stub contract for future implementation
  - `ISmsService` — stub contract for future implementation
- Token flow:
  - Mock token generation (client-side transport in URL)
  - Real token generation (server-side, stored in Redis)
  - Token exchange mechanism (mock token → real token)
- Redis configuration in infra layer (credentials from vault)
- Dependency injection wiring in `Program.cs`

### Out of Scope
- Email/SMS sending implementation
- OTP validation (will be implemented with SMS/Email services)
- User identification logic beyond username lookup
- Database schema changes

### Assumptions
- Redis is available in vault configuration (`Redis:ConnectionString`)
- `IUserService` (existing) can be injected and used
- `ILogger` is available for injected logging
- Vault secrets are loaded before service registration

---

## 3. Repository Routing Matrix

| Layer | Module | Artifact | Action |
|---|---|---|---|
| **Domain** | `ERP.Sso.Domain` | `Common/Contracts/` | Create `IForgotPasswordTokenService` interface (no changes to domain entities) |
| **Application** | `ERP.Sso.Application` | `ForgotPassword/Contracts/` | Create `IForgotPasswordTokenService`, `IEmailService`, `ISmsService` (interfaces) |
| **Application** | `ERP.Sso.Application` | `ForgotPassword/Services/` | Create stub implementations (empty, for DI registration) |
| **Infrastructure** | `ERP.Sso.Infra.Sql` | `ForgotPassword/Services/` | Create `ForgotPasswordTokenService` (Redis-backed implementation) |
| **Infrastructure** | `ERP.Sso.Infra.Sql` | `Injections.cs` | Register Redis + service contracts |
| **Presentation (IDP)** | `Erp.Sso.Ids` | `Endpoints/ForgotPasswordEndpoints.cs` | Wire endpoints with injected services |
| **Presentation (IDP)** | `Erp.Sso.Ids` | `Program.cs` | Verify Redis registration, service wiring |

---

## 4. Implementation Steps (Detailed)

### Step 1: Create Service Contracts in Domain/Application Layer

#### File 1: `projects/accounting-sso/src/01.Domain/ERP.Sso.Domain/Common/Contracts/IForgotPasswordTokenService.cs` (NEW)

```csharp
namespace ERP.Sso.Domain.Common.Contracts;

/// <summary>
/// Service for managing forgot-password tokens.
/// Mock tokens are used in URLs; real tokens are stored in Redis.
/// </summary>
public interface IForgotPasswordTokenService
{
    /// <summary>
    /// Generates a mock token for use in email URLs and a real token stored in Redis.
    /// Returns the mock token to be sent in the email.
    /// </summary>
    Task<(string MockToken, string RealToken)> GenerateTokenPairAsync(int userId, string username, CancellationToken ct = default);

    /// <summary>
    /// Exchanges a mock token (from email URL) for the real token stored in Redis.
    /// Removes the token from Redis after retrieval (single-use).
    /// </summary>
    Task<string?> ExchangeMockTokenForRealAsync(string mockToken, CancellationToken ct = default);

    /// <summary>
    /// Stores a real token in Redis with mock token as key.
    /// Called by GenerateTokenPairAsync internally.
    /// </summary>
    Task StoreRealTokenAsync(string mockToken, string realToken, TimeSpan ttl, CancellationToken ct = default);

    /// <summary>
    /// Clears a token from Redis (cleanup after exchange or timeout).
    /// </summary>
    Task ClearTokenAsync(string mockToken, CancellationToken ct = default);
}
```

#### File 2: `projects/accounting-sso/src/02.Application/ERP.Sso.Application/ForgotPassword/Contracts/IEmailService.cs` (NEW)

```csharp
namespace ERP.Sso.Application.ForgotPassword.Contracts;

/// <summary>
/// Service for sending forgot-password emails.
/// Implementation deferred to future story.
/// </summary>
public interface IEmailService
{
    /// <summary>
    /// Sends forgot-password email with reset link containing the mock token.
    /// </summary>
    Task SendForgotPasswordEmailAsync(
        string recipientEmail,
        string username,
        string mockToken,
        string resetUrl,
        CancellationToken ct = default);
}
```

#### File 3: `projects/accounting-sso/src/02.Application/ERP.Sso.Application/ForgotPassword/Contracts/ISmsService.cs` (NEW)

```csharp
namespace ERP.Sso.Application.ForgotPassword.Contracts;

/// <summary>
/// Service for sending forgot-password SMS messages.
/// Implementation deferred to future story.
/// </summary>
public interface ISmsService
{
    /// <summary>
    /// Sends forgot-password SMS with OTP or token.
    /// </summary>
    Task SendForgotPasswordSmsAsync(
        string phoneNumber,
        string username,
        string otp,
        CancellationToken ct = default);
}
```

---

### Step 2: Create Stub Service Implementations for DI Registration

#### File 4: `projects/accounting-sso/src/02.Application/ERP.Sso.Application/ForgotPassword/Services/EmailService.cs` (NEW)

```csharp
using ERP.Sso.Application.ForgotPassword.Contracts;
using Microsoft.Extensions.Logging;

namespace ERP.Sso.Application.ForgotPassword.Services;

/// <summary>
/// Stub email service. Implementation deferred to future story.
/// </summary>
public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;

    public EmailService(ILogger<EmailService> logger)
    {
        _logger = logger;
    }

    public Task SendForgotPasswordEmailAsync(
        string recipientEmail,
        string username,
        string mockToken,
        string resetUrl,
        CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Email service stub called: SendForgotPasswordEmail for username {Username}, email {Email}. Implementation deferred.",
            username,
            recipientEmail);
        
        // Stub: no-op
        return Task.CompletedTask;
    }
}
```

#### File 5: `projects/accounting-sso/src/02.Application/ERP.Sso.Application/ForgotPassword/Services/SmsService.cs` (NEW)

```csharp
using ERP.Sso.Application.ForgotPassword.Contracts;
using Microsoft.Extensions.Logging;

namespace ERP.Sso.Application.ForgotPassword.Services;

/// <summary>
/// Stub SMS service. Implementation deferred to future story.
/// </summary>
public class SmsService : ISmsService
{
    private readonly ILogger<SmsService> _logger;

    public SmsService(ILogger<SmsService> logger)
    {
        _logger = logger;
    }

    public Task SendForgotPasswordSmsAsync(
        string phoneNumber,
        string username,
        string otp,
        CancellationToken ct = default)
    {
        _logger.LogInformation(
            "SMS service stub called: SendForgotPasswordSms for username {Username}, phone {Phone}. Implementation deferred.",
            username,
            phoneNumber);
        
        // Stub: no-op
        return Task.CompletedTask;
    }
}
```

---

### Step 3: Create Redis-Backed Token Service in Infrastructure Layer

#### File 6: `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/ForgotPassword/Services/ForgotPasswordTokenService.cs` (NEW)

```csharp
using ERP.Sso.Domain.Common.Contracts;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace ERP.Sso.Infra.Sql.ForgotPassword.Services;

/// <summary>
/// Redis-backed forgot-password token service.
/// Manages mock tokens (for URLs) and real tokens (stored in Redis).
/// </summary>
public class ForgotPasswordTokenService : IForgotPasswordTokenService
{
    private readonly IDatabase _redisDb;
    private readonly ILogger<ForgotPasswordTokenService> _logger;
    private const string TokenKeyPrefix = "forgot-password-token:";
    private const string DefaultTtlMinutes = 30;

    public ForgotPasswordTokenService(
        IConnectionMultiplexer redisConnection,
        ILogger<ForgotPasswordTokenService> logger)
    {
        _redisDb = redisConnection.GetDatabase();
        _logger = logger;
    }

    /// <summary>
    /// Generates a mock token (GUID-based, for email URL) and a real token (ASP.NET Identity style).
    /// Stores the real token in Redis with the mock token as key.
    /// </summary>
    public async Task<(string MockToken, string RealToken)> GenerateTokenPairAsync(
        int userId,
        string username,
        CancellationToken ct = default)
    {
        try
        {
            // Generate mock token (client-side transport in email URL)
            var mockToken = $"fp-{Guid.NewGuid():N}";

            // Generate real token (ASP.NET Identity style base64-encoded data)
            var realToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray());

            // Store real token in Redis with mock token as key
            var ttl = TimeSpan.FromMinutes(DefaultTtlMinutes);
            await StoreRealTokenAsync(mockToken, realToken, ttl, ct);

            _logger.LogInformation(
                "Token pair generated for userId {UserId}, username {Username}. Mock token: {MockToken}",
                userId,
                username,
                mockToken);

            return (mockToken, realToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate token pair for userId {UserId}", userId);
            throw;
        }
    }

    /// <summary>
    /// Exchanges a mock token (from email URL) for the real token stored in Redis.
    /// Token is removed from Redis after retrieval (single-use).
    /// </summary>
    public async Task<string?> ExchangeMockTokenForRealAsync(
        string mockToken,
        CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(mockToken))
            {
                _logger.LogWarning("Token exchange requested with null or empty mock token");
                return null;
            }

            var redisKey = $"{TokenKeyPrefix}{mockToken}";
            var realToken = await _redisDb.StringGetAsync(redisKey);

            if (!realToken.HasValue)
            {
                _logger.LogWarning("Token exchange failed: mock token {MockToken} not found in Redis", mockToken);
                return null;
            }

            // Delete token immediately (single-use)
            await _redisDb.KeyDeleteAsync(redisKey);

            _logger.LogInformation("Token successfully exchanged for mock token {MockToken}", mockToken);

            return realToken.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to exchange mock token {MockToken}", mockToken);
            throw;
        }
    }

    /// <summary>
    /// Stores a real token in Redis with mock token as key and TTL.
    /// </summary>
    public async Task StoreRealTokenAsync(
        string mockToken,
        string realToken,
        TimeSpan ttl,
        CancellationToken ct = default)
    {
        try
        {
            var redisKey = $"{TokenKeyPrefix}{mockToken}";
            await _redisDb.StringSetAsync(redisKey, realToken, ttl);

            _logger.LogDebug(
                "Real token stored in Redis with mock token {MockToken}, TTL {TtlSeconds}s",
                mockToken,
                ttl.TotalSeconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to store real token for mock token {MockToken}", mockToken);
            throw;
        }
    }

    /// <summary>
    /// Clears a token from Redis.
    /// </summary>
    public async Task ClearTokenAsync(string mockToken, CancellationToken ct = default)
    {
        try
        {
            var redisKey = $"{TokenKeyPrefix}{mockToken}";
            await _redisDb.KeyDeleteAsync(redisKey);

            _logger.LogDebug("Token cleared from Redis: {MockToken}", mockToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to clear token {MockToken}", mockToken);
            throw;
        }
    }
}
```

---

### Step 4: Register Redis and Services in Infra Layer Injections

#### File Update: `projects/accounting-sso/src/03.Infra/ERP.Sso.Infra.Sql/Injections.cs`

Add the following method to register Redis and ForgotPassword services:

```csharp
public static async Task<IHashiCorpVaultContext> AddForgotPasswordModuleAsync(
    this IHashiCorpVaultContext context,
    string globalMountPoint,
    CancellationToken cancellationToken = default)
{
    // Get Redis connection string from vault
    var redisConnectionString = await context.GetSecretAsync(
        globalMountPoint,
        "Redis:ConnectionString",
        cancellationToken);

    // Register Redis
    var options = ConfigurationOptions.Parse(redisConnectionString);
    var redis = await ConnectionMultiplexer.ConnectAsync(options);
    context.Services.AddSingleton<IConnectionMultiplexer>(redis);

    // Register token service
    context.Services.AddScoped<IForgotPasswordTokenService, ForgotPasswordTokenService>();

    return context;
}
```

Also add to the existing `AddIdentityServerModuleAsync` method (after other service registrations):

```csharp
// Register Email and SMS service stubs
context.Services.AddScoped<IEmailService, EmailService>();
context.Services.AddScoped<ISmsService, SmsService>();
```

---

### Step 5: Wire Endpoints with Services

#### File Update: `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Endpoints/ForgotPasswordEndpoints.cs`

Replace the stub implementations with actual service wiring. Key changes:

```csharp
private static IResult Identify(
    [FromBody] ForgotPasswordIdentifyRequest request,
    [FromServices] IUserService userService,
    [FromServices] IForgotPasswordTokenService tokenService,
    [FromServices] ILogger<ForgotPasswordEndpointsLogger> logger)
{
    if (string.IsNullOrWhiteSpace(request.Identifier))
    {
        return Results.BadRequest(new ForgotPasswordActionResponse(false, "Identifier is required."));
    }

    logger.LogInformation("ForgotPassword identify requested for identifier {Identifier}", request.Identifier);

    // TODO: Find user by username or email (use IUserService)
    // TODO: Generate token pair using IForgotPasswordTokenService
    // TODO: Return mock token (not the real one)
    
    var token = $"fp-{Guid.NewGuid():N}"; // Placeholder; will be replaced by actual call
    return Results.Ok(new ForgotPasswordIdentifyResponse(true, request.Identifier, token, "Identifier accepted."));
}

private static async Task<IResult> SendEmail(
    [FromBody] ForgotPasswordChannelRequest request,
    [FromServices] IUserService userService,
    [FromServices] IForgotPasswordTokenService tokenService,
    [FromServices] IEmailService emailService,
    [FromServices] ILogger<ForgotPasswordEndpointsLogger> logger)
{
    if (string.IsNullOrWhiteSpace(request.Username))
    {
        return Results.BadRequest(new ForgotPasswordActionResponse(false, "Username is required."));
    }

    logger.LogInformation("ForgotPassword email channel requested for username {Username}", request.Username);

    // TODO: Find user by username (use IUserService)
    // TODO: Generate token pair using IForgotPasswordTokenService
    // TODO: Build reset URL with mock token
    // TODO: Send email using IEmailService
    
    return Results.Ok(new ForgotPasswordActionResponse(true, "Email channel accepted."));
}
```

---

### Step 6: Update Program.cs for Redis Registration

#### File Update: `projects/accounting-sso/src/04.Presentation/IDP/Erp.Sso.Ids/Program.cs`

Add Redis registration in the vault configuration section:

```csharp
await builder.ConfigureVaultServerAsync();

// Add ForgotPassword module (registers Redis + services)
await builder.Services.AddForgotPasswordModuleAsync(""); // Mount point TBD from vault config

builder.Services.AddControllersWithViews();
builder.Services.AddHttpContextAccessor();
builder.Services.Configure<AuthorizationModuleOptions>(builder.Configuration.GetSection(AuthorizationModuleOptions.SectionName));
```

---

## 5. Token Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Forgot Password Token Flow                                  │
├─────────────────────────────────────────────────────────────┤

1. IDENTIFY ENDPOINT
   Client: POST /api/v1/account/forgot/identify
           { identifier: "user@email.com" }
   
   Server: Generate token pair (mock + real)
           Mock token: "fp-{uuid}"
           Real token: base64 encoded
           Store: Redis[fp-{uuid}] = real_token (TTL: 30 min)
   
   Response: { success: true, identifier: "user@email.com", token: "fp-{uuid}" }

2. EMAIL ENDPOINT (with mock token from Identify)
   Client: POST /api/v1/account/forgot/email
           { username: "user@email.com", token: "fp-{uuid}" }
   
   Server: Find user by username
           Build reset URL: /forgot-password?token=fp-{uuid}
           Call IEmailService.SendEmail(...) [STUB - no-op for now]
   
   Response: { success: true, message: "Email sent" }

3. USER CLICKS EMAIL LINK
   Browser: GET /forgot-password?token=fp-{uuid}
   
   Frontend: Displays password reset form
             Stores mock token in form

4. SET PASSWORD ENDPOINT
   Client: POST /api/v1/account/forgot/set-password
           { username: "user@email.com", token: "fp-{uuid}", newPassword: "..." }
   
   Server: Exchange mock token for real token
           real_token = await tokenService.ExchangeMockTokenForRealAsync(mockToken)
           If real_token == null: Error 400
           Use real_token with UserManager.ResetPasswordAsync()
   
   Response: { success: true, message: "Password updated" }

┌─────────────────────────────────────────────────────────────┐
│ Redis Data Structure                                        │
├─────────────────────────────────────────────────────────────┤
Key: "forgot-password-token:fp-{uuid}"
Value: base64-encoded-real-token
TTL: 30 minutes
Access: Single-use (deleted after exchange)
```

---

## 6. Vault Configuration (Example)

Add to `configuration.json` in vault:

```json
{
  "Redis": {
    "ConnectionString": "localhost:6379,ssl=false,abortConnect=false"
  }
}
```

Or via vault CLI:

```bash
vault kv put secret/data/accounting-sso/redis \
  ConnectionString="localhost:6379,ssl=false,abortConnect=false"
```

---

## 7. NuGet Dependencies to Add

Update `ERP.Sso.Infra.Sql.csproj`:

```xml
<ItemGroup>
  <PackageReference Include="StackExchange.Redis" Version="2.7.0" />
</ItemGroup>
```

---

## 8. TDD Test Plan (Focused on Service Wiring)

### Unit Tests for `ForgotPasswordTokenService`

**Test 1:** `GenerateTokenPairAsync_CreatesValidTokens`
- Arrange: Mock Redis connection
- Act: Call `GenerateTokenPairAsync(userId: 1, username: "test")`
- Assert: Mock and real tokens are different; real token stored in Redis

**Test 2:** `ExchangeMockTokenForRealAsync_ReturnsRealTokenOnce`
- Arrange: Generated token pair; mock token in Redis
- Act: Call `ExchangeMockTokenForRealAsync(mockToken)` twice
- Assert: First call returns real token; second call returns null (deleted)

**Test 3:** `ExchangeMockTokenForRealAsync_ReturnNullOnInvalidToken`
- Arrange: Mock Redis connection with no stored token
- Act: Call `ExchangeMockTokenForRealAsync("invalid-token")`
- Assert: Returns null; no exceptions

### Integration Tests for Endpoints

**Test 1:** `IdentifyEndpoint_GeneratesTokenAndStoresInRedis`
- Setup: Redis running; user in database
- Act: POST /api/v1/account/forgot/identify
- Assert: Response contains mock token; real token exists in Redis

**Test 2:** `SetPasswordEndpoint_ExchangesTokenAndUpdatesPassword`
- Setup: Identify flow completed; mock token in Redis
- Act: POST /api/v1/account/forgot/set-password with mock token and new password
- Assert: Password updated; token removed from Redis

---

## 9. Logging & Observability

| Event | Level | Message | Triggered By |
|---|---|---|---|
| Token pair generated | Info | `Token pair generated for userId {UserId}, username {Username}. Mock token: {MockToken}` | GenerateTokenPairAsync |
| Real token stored | Debug | `Real token stored in Redis with mock token {MockToken}, TTL {TtlSeconds}s` | StoreRealTokenAsync |
| Token successfully exchanged | Info | `Token successfully exchanged for mock token {MockToken}` | ExchangeMockTokenForRealAsync |
| Token not found | Warn | `Token exchange failed: mock token {MockToken} not found in Redis` | ExchangeMockTokenForRealAsync |
| Email service called | Info | `Email service stub called... Implementation deferred.` | SendEmail endpoint |
| SMS service called | Info | `SMS service stub called... Implementation deferred.` | SendSms endpoint |
| Redis connection error | Error | `Failed to generate token pair for userId {UserId}` | Any service call |

---

## 10. Security Considerations

| Control | Implementation | Verified By |
|---|---|---|
| Single-use tokens | Token deleted after Redis lookup | Unit test: `ExchangeMockTokenForRealAsync_ReturnsRealTokenOnce` |
| Token TTL | Redis TTL set to 30 minutes | Integration test verifies expired tokens return null |
| Mock token format | UUID-based: `fp-{uuid}` | No sensitive data in URL |
| Real token format | Base64-encoded GUID, not predictable | Generated via `Guid.NewGuid()` |
| Redis isolation | Tokens namespaced with `forgot-password-token:` prefix | Prevents key collisions |
| Error handling | Generic error messages (no "token not found" to user) | Endpoint test: verify 400 status, no details |

---

## 11. Traceability

| Artifact | Source | Maps To | Implementation |
|---|---|---|---|
| Identify endpoint | [ForgotPasswordEndpoints.cs](../ForgotPasswordEndpoints.cs#L48) | Step 5 | Wire `IForgotPasswordTokenService` |
| Email endpoint | [ForgotPasswordEndpoints.cs](../ForgotPasswordEndpoints.cs#L60) | Step 5 | Wire `IEmailService` (stub) |
| SMS endpoint | [ForgotPasswordEndpoints.cs](../ForgotPasswordEndpoints.cs#L72) | Step 5 | Wire `ISmsService` (stub) |
| Set-password endpoint | [ForgotPasswordEndpoints.cs](../ForgotPasswordEndpoints.cs#L104) | Step 5 | Wire token exchange |
| Token management | AC-46 requirement | Steps 1–3 | `IForgotPasswordTokenService` + Redis |
| Redis registration | AC-46 requirement | Step 4 | Vault-driven configuration |

---

## 12. Implementation Execution Order

1. **Step 1:** Create service contracts (interfaces) — 15 min
2. **Step 2:** Create stub service implementations — 10 min
3. **Step 3:** Create Redis-backed token service — 30 min
4. **Step 4:** Register services in infra layer — 10 min
5. **Step 5:** Wire endpoints with injected services — 30 min
6. **Step 6:** Update Program.cs for Redis registration — 10 min
7. **Unit tests:** Token service tests — 20 min
8. **Integration tests:** Endpoint-to-Redis flow — 20 min
9. **Code review & refinement** — 15 min

**Total Estimated Time:** 2.5–3 hours

---

## 13. Success Criteria (Implementation Complete)

✅ All 5 endpoints callable and accept service injections  
✅ `IForgotPasswordTokenService` generates and exchanges tokens via Redis  
✅ Mock tokens are returned to client; real tokens stored in Redis  
✅ `IEmailService` and `ISmsService` contracts registered (stub implementations)  
✅ Token flow tested: identify → email → set-password (mock token → real token)  
✅ Redis connection established from vault credentials  
✅ All unit tests pass (token service logic)  

---

## 14. Canonical Implementation Patterns (Established by AC-46)

> These patterns were finalized during AC-46 implementation and serve as the **reference standard** for all future SSO and ERP services.

---

### 14.1 Redis Integration via NT.Caching.Redis

**Package:** `NT.Caching.Redis` (version `1.1.0-rc01` or later)  
**Do NOT use** raw `StackExchange.Redis` directly in infra registrations.

**DI Registration Pattern:**

```csharp
private static async Task AddRedisAsync(
    this IHashiCorpVaultContext context,
    string globalMountPoint,
    CancellationToken cancellationToken)
{
    RedisOptions result = new();
    await context.GetCredentialsAsync<RedisOptions>(nameof(RedisOptions), t =>
    {
        context.Services.AddSingleton(t);
        result = t;
    }, credentialsMountPoint: globalMountPoint, cancellationToken: cancellationToken);

    await context.AddStackExchangeRedisAsync(
        option => { option.Database = result.Database; },
        pathAction => { context.Configurations.GetSection("VaultOption:RedisSecrets").Bind(pathAction); },
        cancellationToken: cancellationToken);
}
```

**Key points:**
- `GetCredentialsAsync<T>` loads options **and** registers them as singleton in one call
- `AddStackExchangeRedisAsync` accepts `optionAction` (configure `RedisOption`) and `pathAction` (bind vault path)
- Vault path for Redis: `VaultOption:RedisSecrets` (parallel to `VaultOption:MsSqlSecrets`)
- `IRedisDatabase` (from `StackExchange.Redis.Extensions.Core.Abstractions`) is the injectable service in consumers

**Consumer Pattern (service class):**

```csharp
public sealed class MyRedisService(IRedisDatabase redis, ...) : IMyService
{
    private const string _KeyPrefix = "sso:my-entity:";

    private async Task StoreAsync(string key, string value, TimeSpan ttl, CancellationToken ct)
        => await redis.AddAsync($"{_KeyPrefix}{key}", value, ttl);

    private async Task<string?> GetAndRemoveAsync(string key, CancellationToken ct)
    {
        var value = await redis.GetAsync<string>($"{_KeyPrefix}{key}");
        if (string.IsNullOrWhiteSpace(value)) return null;
        await redis.RemoveAsync($"{_KeyPrefix}{key}");
        return value;
    }
}
```

**Naming convention for Redis keys:** `{service-namespace}:{entity}:{id}` e.g. `sso:forgot-password:{mockToken}`

---

### 14.2 Vault Credentials Loading Pattern

All secrets are loaded via `GetCredentialsAsync<T>`. Never use raw string lookups or `IOptions<T>`.

```csharp
await context.GetCredentialsAsync<MyOptions>(
    nameof(MyOptions),
    t =>
    {
        context.Services.AddSingleton(t);   // register as singleton
        result = t;                          // capture for immediate use
    },
    credentialsMountPoint: globalMountPoint,
    cancellationToken: cancellationToken);
```

**Rules:**
- Register as `AddSingleton` (not scoped or transient)
- Inject the concrete options class directly (never `IOptions<T>`)
- Capture `result` to use in subsequent vault calls (e.g., `AddStackExchangeRedisAsync`)

---

### 14.3 Module Registration Pattern

All infra registrations are `private static async Task` extension methods on `IHashiCorpVaultContext`:

```csharp
// Main entry point — called from Program.cs
public static async Task AddIdentityServerModuleAsync(
    this IHashiCorpVaultContext context,
    string globalMountPoint,
    CancellationToken cancellationToken = default)
{
    await context.AddMsSqlAsync(globalMountPoint, cancellationToken);
    await context.AddRedisAsync(globalMountPoint, cancellationToken);
    await context.AddForgotPasswordModuleAsync();
    // ... other modules
}

// Domain-specific module (sync when no vault calls needed)
private static async Task AddForgotPasswordModuleAsync(this IHashiCorpVaultContext context)
{
    context.Services.AddScoped<IForgotPasswordTokenService, ForgotPasswordTokenService>();
    context.Services.AddScoped<IEmailNotificationService, EmailNotificationService>();
    context.Services.AddScoped<ISmsNotificationService, SmsNotificationService>();
}
```

---

### 14.4 DTO Placement

- All request/response DTOs belong in the **Domain layer**: `src/01.Domain/ERP.Sso.Domain/{Feature}/Dtos/`
- Result records use `sealed record`: `public sealed record MyResult(bool Succeeded, ...)`
- Error DTOs carry `GlobalResponseKey? ErrorKey` and `string? ErrorMessage`
- Endpoint-local DTOs (not shared across layers) may be defined as `record` types at the bottom of the endpoint file

---

### 14.5 Options Placement

- All options classes belong in the Domain layer namespace `ERP.Sso.Domain.Options`
- File location: `src/01.Domain/ERP.Sso.Domain/Options/{Name}Options.cs`
- Options are **not** scoped to a feature folder — they are shared infrastructure configuration
- Do NOT use `IOptions<T>` — inject the concrete class directly

**Example (`RedisOptions`):**

```csharp
namespace ERP.Sso.Domain.Options;

public sealed class RedisOptions
{
    public int ForgotPasswordTokenTtlMinutes { get; set; } = 30;
    public int Database { get; set; } = 1;
}
```

---

### 14.6 Service Class Code Style

All non-trivial service classes use `#region` blocks:

```csharp
public sealed class MyService(...) : IMyService
{
    #region Props
    // private fields derived from constructor params
    #endregion

    #region Methods
    // public interface implementations
    #endregion

    #region Utilities
    // private helper methods
    #endregion
}
```

---

### 14.7 GlobalResponseKey Pattern

All API responses include a `ResponseKey` string field carrying the enum name:

- Error keys: `ERROR_{ENTITY}_{REASON}` — e.g. `ERROR_FORGOTPASSWORD_TOKEN_EXPIRED`
- Info keys: `INFORMATION_{ENTITY}_{EVENT}` — e.g. `INFORMATION_FORGOTPASSWORD_PASSWORD_UPDATED`
- Throw in services: `throw new GlobalAppException(GlobalResponseKey.XXX, "message")`
- Endpoints return the key as `ResponseKey = result.ErrorKey?.ToString()` or `nameof(GlobalResponseKey.XXX)`

✅ All integration tests pass (endpoint-to-Redis flow)  
✅ Logging captures all critical events (token generation, exchange, errors)  
✅ Code reviewed by TL  
✅ Ready to hand off to AC-47 (razor UI frontend)  

---

## 14. Next Steps

1. **TL Review:** Confirm approval of revised implementation plan (Steps 1–6)
2. **On Approval:** Begin implementation with TDD-first approach (Step 1–6 execution)
3. **On Non-Approval:** Provide specific feedback; plan will be revised accordingly

**Status:** ⏳ **Pending TL Approval of Revised Scope**

---

## Appendix A: File Checklist

Files to create:
- [ ] `ERP.Sso.Domain/Common/Contracts/IForgotPasswordTokenService.cs`
- [ ] `ERP.Sso.Application/ForgotPassword/Contracts/IEmailService.cs`
- [ ] `ERP.Sso.Application/ForgotPassword/Contracts/ISmsService.cs`
- [ ] `ERP.Sso.Application/ForgotPassword/Services/EmailService.cs`
- [ ] `ERP.Sso.Application/ForgotPassword/Services/SmsService.cs`
- [ ] `ERP.Sso.Infra.Sql/ForgotPassword/Services/ForgotPasswordTokenService.cs`

Files to update:
- [ ] `ERP.Sso.Infra.Sql/Injections.cs` — add Redis + service registration
- [ ] `Erp.Sso.Ids/Endpoints/ForgotPasswordEndpoints.cs` — wire services
- [ ] `Erp.Sso.Ids/Program.cs` — add Redis registration
- [ ] `ERP.Sso.Infra.Sql.csproj` — add StackExchange.Redis NuGet
- [ ] `configuration.json` (vault) — add Redis connection string

Test files to create:
- [ ] `ERP.Sso.Infra.Sql.Tests/ForgotPassword/ForgotPasswordTokenServiceTests.cs`
- [ ] `Erp.Sso.Ids.Tests/Endpoints/ForgotPasswordEndpointsIntegrationTests.cs`
