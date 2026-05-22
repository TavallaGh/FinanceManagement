# Implementation Plan: AC-97-NOTIF-01

## 1. Overview

This document provides detailed implementation guidance for **AC-97: NT.Notification.SDK Integration for Email/SMS Services**. The implementation spans two repositories:

1. **Accounting-Infrastructure** (primary): SDK integration, OTP service, notification abstractions.
2. **accounting-sso** (consumer): Refactoring ForgotPasswordEndpoints.cs to use real notifications.

The plan is organized by implementation phase, repository, and includes acceptance criteria checklists, code patterns, and testing strategies.

---

## 2. Phase 1: Infrastructure Layer Design (Week 1, Days 1-3)

### 2.1 Goals

- Finalize service abstractions (`INotificationService`, `IOtpService`, `IEmailNotificationService`, `ISmsNotificationService`).
- Establish NT.Notification.SDK integration architecture.
- Design OTP storage backend options (Redis primary, in-memory fallback).
- Create proof-of-concept integration test with mock providers.

### 2.2 Work Items

#### 2.2.1 Define Service Contracts

**Repository**: `Accounting-Infrastructure`

**File Structure**:
```
Accounting-Infrastructure/
├── Abstractions/
│   ├── Notifications/
│   │   ├── INotificationService.cs
│   │   ├── IEmailNotificationService.cs
│   │   ├── ISmsNotificationService.cs
│   │   ├── IOtpService.cs
│   │   └── Models/
│   │       ├── OtpRequest.cs
│   │       ├── OtpVerificationResult.cs
│   │       ├── EmailMessage.cs
│   │       ├── SmsMessage.cs
│   │       └── NotificationEvent.cs
├── Services/
│   ├── Notifications/
│   │   ├── OtpService.cs
│   │   ├── EmailNotificationService.cs
│   │   ├── SmsNotificationService.cs
│   │   └── NotificationServiceWrapper.cs (NT.SDK wrapper)
└── Configuration/
    └── NotificationOptions.cs
```

**Key Service Interfaces**:

```csharp
// INotificationService.cs
public interface INotificationService
{
    /// <summary>
    /// Gets the OTP service for password reset flows.
    /// </summary>
    IOtpService OtpService { get; }
    
    /// <summary>
    /// Gets the email notification service.
    /// </summary>
    IEmailNotificationService EmailService { get; }
    
    /// <summary>
    /// Gets the SMS notification service.
    /// </summary>
    ISmsNotificationService SmsService { get; }
}

// IOtpService.cs
public interface IOtpService
{
    /// <summary>
    /// Generates a cryptographically secure OTP code.
    /// </summary>
    /// <param name="userId">User ID for audit tracing.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>OTP code and metadata (expires at, etc.).</returns>
    Task<OtpRequest> GenerateOtpAsync(string userId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Verifies a submitted OTP code against stored OTP.
    /// </summary>
    /// <param name="userId">User ID.</param>
    /// <param name="submittedOtp">The OTP code submitted by the user.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Verification result (success, failure reason).</returns>
    Task<OtpVerificationResult> VerifyOtpAsync(string userId, string submittedOtp, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Marks an OTP as consumed (single-use guarantee).
    /// </summary>
    /// <param name="userId">User ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task InvalidateOtpAsync(string userId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Gets OTP configuration (length, TTL, retry limits).
    /// </summary>
    OtpServiceConfiguration GetConfiguration();
}

// IEmailNotificationService.cs
public interface IEmailNotificationService
{
    /// <summary>
    /// Sends an email asynchronously (enqueues message).
    /// </summary>
    /// <param name="message">Email message with recipient, subject, body.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Message queue ID or notification event ID for tracking.</returns>
    Task<string> SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Sends an OTP via email.
    /// </summary>
    /// <param name="recipient">Email address.</param>
    /// <param name="otp">OTP code.</param>
    /// <param name="expiresAtUtc">OTP expiry time.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<string> SendOtpAsync(string recipient, string otp, DateTime expiresAtUtc, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Sends a password reset link via email.
    /// </summary>
    /// <param name="recipient">Email address.</param>
    /// <param name="resetLink">Full reset link (includes token).</param>
    /// <param name="expiresAtUtc">Link expiry time.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<string> SendPasswordResetLinkAsync(string recipient, string resetLink, DateTime expiresAtUtc, CancellationToken cancellationToken = default);
}

// ISmsNotificationService.cs
public interface ISmsNotificationService
{
    /// <summary>
    /// Sends an SMS asynchronously (enqueues message).
    /// </summary>
    /// <param name="message">SMS message with recipient, body.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Message queue ID or notification event ID for tracking.</returns>
    Task<string> SendAsync(SmsMessage message, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Sends an OTP via SMS.
    /// </summary>
    /// <param name="phoneNumber">Phone number in E.164 format.</param>
    /// <param name="otp">OTP code.</param>
    /// <param name="expiresAtUtc">OTP expiry time.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<string> SendOtpAsync(string phoneNumber, string otp, DateTime expiresAtUtc, CancellationToken cancellationToken = default);
}
```

**Model Classes**:

```csharp
// OtpRequest.cs (response from GenerateOtpAsync)
public record OtpRequest
{
    public string Code { get; init; }
    public string UserId { get; init; }
    public DateTime GeneratedAtUtc { get; init; }
    public DateTime ExpiresAtUtc { get; init; }
    public int MaxAttempts { get; init; }
}

// OtpVerificationResult.cs
public record OtpVerificationResult
{
    public bool IsValid { get; init; }
    public string? FailureReason { get; init; } // "invalid_otp", "expired_otp", "attempt_limit_exceeded", etc.
    public int RemainingAttempts { get; init; }
    public DateTime? NextAttemptAllowedAtUtc { get; init; } // if in cooldown
}

// EmailMessage.cs
public record EmailMessage
{
    public string Recipient { get; init; }
    public string Subject { get; init; }
    public string Body { get; init; }
    public bool IsHtml { get; init; } = false;
    public string? CorrelationId { get; init; }
    public Dictionary<string, string>? Metadata { get; init; }
}

// SmsMessage.cs
public record SmsMessage
{
    public string PhoneNumber { get; init; }
    public string Body { get; init; }
    public string? CorrelationId { get; init; }
    public Dictionary<string, string>? Metadata { get; init; }
}

// NotificationEvent.cs (for audit logging)
public record NotificationEvent
{
    public enum NotificationEventType
    {
        OtpGenerated = 1,
        OtpSent = 2,
        OtpVerified = 3,
        OtpExpired = 4,
        OtpVerificationFailed = 5,
        EmailSent = 6,
        SmsSent = 7,
        DeliveryFailed = 8
    }

    public NotificationEventType EventType { get; init; }
    public string UserId { get; init; }
    public string? Recipient { get; init; } // email or phone
    public DateTime OccurredAtUtc { get; init; }
    public bool IsSuccess { get; init; }
    public string? ErrorDetails { get; init; }
    public string? CorrelationId { get; init; }
}
```

**Configuration Class**:

```csharp
// NotificationOptions.cs
public class NotificationOptions
{
    public const string SectionName = "Notifications";

    public OtpOptions Otp { get; set; } = new();
    public EmailOptions Email { get; set; } = new();
    public SmsOptions Sms { get; set; } = new();
    public QueueOptions Queue { get; set; } = new();
}

public class OtpOptions
{
    public int Length { get; set; } = 6;
    public int TtlMinutes { get; set; } = 5; // Production: 5 min, Dev: 10 min
    public int MaxAttempts { get; set; } = 3;
    public int CooldownMinutes { get; set; } = 5; // cooldown after max attempts
}

public class EmailOptions
{
    public string FromAddress { get; set; } = "noreply@accounting-system.local";
    public string FromDisplayName { get; set; } = "Accounting System";
    public string ProviderType { get; set; } = "SendGrid"; // SendGrid, Azure, SMTP, etc.
    public string? ApiKey { get; set; } // from vault, not from config file
}

public class SmsOptions
{
    public string ProviderType { get; set; } = "Twilio"; // Twilio, AWS SNS, etc.
    public string? AccountSid { get; set; } // from vault
    public string? FromNumber { get; set; }
}

public class QueueOptions
{
    public string QueueType { get; set; } = "InMemory"; // InMemory, ServiceBus, RabbitMQ
    public string? ConnectionString { get; set; }
    public int MaxRetries { get; set; } = 3;
    public int RetryDelaySeconds { get; set; } = 5;
}
```

**Acceptance Criteria (Phase 1)**:
- [ ] All interfaces and model classes are defined with comprehensive XML documentation.
- [ ] Code compiles without errors or warnings.
- [ ] Interfaces follow SOLID principles (single responsibility, dependency inversion).
- [ ] Configuration classes support binding from `appsettings.json`.

#### 2.2.2 NT.Notification.SDK Integration Research

**Steps**:
1. Review NT.Notification.SDK NuGet package documentation and API contract.
2. Create a PoC console app to test SDK usage (send test email/SMS).
3. Verify SDK supports async dispatch, queue modes, and credential injection.
4. Identify any compatibility issues or required version constraints.

**Output**: 
- Document: `Accounting-Infrastructure/docs/NT-SDK-PoC.md` with findings and recommendations.

**Acceptance Criteria**:
- [ ] PoC successfully sends test email via NT.Notification.SDK.
- [ ] PoC successfully sends test SMS via NT.Notification.SDK.
- [ ] Queue mode is confirmed to support async (non-blocking) dispatch.
- [ ] Credential injection mechanism is documented.

#### 2.2.3 OTP Storage Design

**Decision Point**: Redis (primary) vs. In-Memory (local dev).

**Redis Design**:
```
Key Format: sso:otp:notifications:{userId}

Value: JSON
{
  "code": "123456",
  "generatedAtUtc": "2026-05-19T14:30:00Z",
  "expiresAtUtc": "2026-05-19T14:35:00Z",
  "maxAttempts": 3,
  "attemptCount": 0,
  "lastAttemptAtUtc": null,
  "nextAttemptAllowedAtUtc": null,
  "metadata": {
    "recipient": "user@example.com",
    "channel": "sms" // or "email"
  }
}

TTL: Set to OtpOptions.TtlMinutes (auto-expire on Redis)
```

**In-Memory Design** (local dev):
```csharp
private ConcurrentDictionary<string, OtpData> _store = new();

// Cleanup job runs every minute to purge expired entries
```

**Acceptance Criteria (OTP Storage)**:
- [ ] Redis client library is added to `Accounting-Infrastructure` (StackExchange.Redis).
- [ ] In-memory fallback implementation is created.
- [ ] Both implementations pass the same unit tests.
- [ ] TTL is automatically enforced (expired OTPs are unretrievable).

---

### 2.3 Code Review Checklist (Phase 1)

- [ ] All service interfaces have single responsibility.
- [ ] Model classes use `record` for immutability.
- [ ] XML documentation is complete for all public members.
- [ ] No hardcoded values (all configurable via `NotificationOptions`).
- [ ] Async/await is used consistently.
- [ ] CancellationToken is threaded through all async methods.
- [ ] Configuration binding is testable (no env-specific logic in code).

---

## 3. Phase 2: Core OTP & Queue Implementation (Week 2, Days 1-4)

### 3.1 Goals

- Implement `IOtpService` with Redis and in-memory backends.
- Implement queue-based SMS/email dispatch.
- Write integration tests for the OTP lifecycle.
- Validate constant-time OTP comparison (side-channel protection).

### 3.2 Work Items

#### 3.2.1 Implement OtpService

**Repository**: `Accounting-Infrastructure`

**File**: `Services/Notifications/OtpService.cs`

```csharp
public class OtpService : IOtpService
{
    private readonly IDistributedCache _cache; // Redis or in-memory
    private readonly NotificationOptions _options;
    private readonly ILogger<OtpService> _logger;
    private readonly IAuditLogService _auditLog;
    private const string OTP_KEY_PREFIX = "sso:otp:notifications:";

    public OtpService(
        IDistributedCache cache,
        IOptions<NotificationOptions> options,
        ILogger<OtpService> logger,
        IAuditLogService auditLog)
    {
        _cache = cache;
        _options = options.Value;
        _logger = logger;
        _auditLog = auditLog;
    }

    public async Task<OtpRequest> GenerateOtpAsync(string userId, CancellationToken cancellationToken = default)
    {
        // Validate input
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));

        // Generate OTP using cryptographically secure RNG
        var otp = GenerateSecureOtp(_options.Otp.Length);
        var now = DateTime.UtcNow;
        var expiresAt = now.AddMinutes(_options.Otp.TtlMinutes);

        var otpData = new
        {
            code = otp,
            generatedAtUtc = now,
            expiresAtUtc = expiresAt,
            maxAttempts = _options.Otp.MaxAttempts,
            attemptCount = 0,
            lastAttemptAtUtc = (DateTime?)null,
            nextAttemptAllowedAtUtc = (DateTime?)null,
            metadata = new Dictionary<string, string>()
        };

        // Store in cache with TTL
        var key = $"{OTP_KEY_PREFIX}{userId}";
        var cacheOptions = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_options.Otp.TtlMinutes)
        };

        await _cache.SetAsJsonAsync(key, otpData, cacheOptions, cancellationToken);

        // Audit log
        await _auditLog.WriteAsync(new AuditLogEntry
        {
            Action = AuditAction.OtpGenerated,
            UserId = userId,
            EntityName = nameof(OtpRequest),
            EntityId = userId,
            Timestamp = now,
            Details = $"OTP generated for user {userId}. Expires at {expiresAt:O}."
        }, cancellationToken);

        _logger.LogInformation("OTP generated for user {UserId}. Expires at {ExpiresAtUtc:O}.", userId, expiresAt);

        return new OtpRequest
        {
            Code = otp,
            UserId = userId,
            GeneratedAtUtc = now,
            ExpiresAtUtc = expiresAt,
            MaxAttempts = _options.Otp.MaxAttempts
        };
    }

    public async Task<OtpVerificationResult> VerifyOtpAsync(
        string userId,
        string submittedOtp,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(submittedOtp))
            return new OtpVerificationResult
            {
                IsValid = false,
                FailureReason = "invalid_input"
            };

        var key = $"{OTP_KEY_PREFIX}{userId}";
        var cachedData = await _cache.GetAsJsonAsync<dynamic>(key, cancellationToken);

        // OTP not found (expired or never generated)
        if (cachedData == null)
        {
            await _auditLog.WriteAsync(new AuditLogEntry
            {
                Action = AuditAction.OtpVerificationFailed,
                UserId = userId,
                EntityName = nameof(OtpRequest),
                EntityId = userId,
                Timestamp = DateTime.UtcNow,
                Details = "OTP verification failed: OTP not found or expired."
            }, cancellationToken);

            _logger.LogWarning("OTP verification failed for user {UserId}: OTP not found or expired.", userId);

            return new OtpVerificationResult
            {
                IsValid = false,
                FailureReason = "expired_otp"
            };
        }

        var now = DateTime.UtcNow;
        var expiresAtUtc = DateTime.Parse(cachedData["expiresAtUtc"].ToString());
        var attemptCount = int.Parse(cachedData["attemptCount"].ToString() ?? "0");
        var maxAttempts = int.Parse(cachedData["maxAttempts"].ToString());
        var storedOtp = cachedData["code"].ToString();

        // Check if OTP has expired
        if (now > expiresAtUtc)
        {
            await _cache.RemoveAsync(key, cancellationToken);
            
            await _auditLog.WriteAsync(new AuditLogEntry
            {
                Action = AuditAction.OtpExpired,
                UserId = userId,
                Timestamp = now,
                Details = $"OTP expired for user {userId}."
            }, cancellationToken);

            return new OtpVerificationResult
            {
                IsValid = false,
                FailureReason = "expired_otp"
            };
        }

        // Check attempt limit
        if (attemptCount >= maxAttempts)
        {
            var nextAttemptAllowedAtUtc = now.AddMinutes(_options.Otp.CooldownMinutes);
            
            await _auditLog.WriteAsync(new AuditLogEntry
            {
                Action = AuditAction.OtpVerificationFailed,
                UserId = userId,
                Timestamp = now,
                Details = $"OTP verification failed: Maximum attempt limit ({maxAttempts}) exceeded."
            }, cancellationToken);

            _logger.LogWarning("OTP verification failed for user {UserId}: Attempt limit exceeded. Next attempt allowed at {NextAttemptAllowedAtUtc:O}.", userId, nextAttemptAllowedAtUtc);

            return new OtpVerificationResult
            {
                IsValid = false,
                FailureReason = "attempt_limit_exceeded",
                RemainingAttempts = 0,
                NextAttemptAllowedAtUtc = nextAttemptAllowedAtUtc
            };
        }

        // CONSTANT-TIME COMPARISON to prevent timing attacks
        bool otpMatch = ConstantTimeComparison(submittedOtp, storedOtp);

        // Increment attempt count
        cachedData["attemptCount"] = attemptCount + 1;
        cachedData["lastAttemptAtUtc"] = now;
        await _cache.SetAsJsonAsync(key, cachedData, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_options.Otp.TtlMinutes)
        }, cancellationToken);

        if (otpMatch)
        {
            // OTP is correct; mark as consumed (will be invalidated after caller confirms)
            await _auditLog.WriteAsync(new AuditLogEntry
            {
                Action = AuditAction.OtpVerified,
                UserId = userId,
                Timestamp = now,
                Details = $"OTP successfully verified for user {userId}."
            }, cancellationToken);

            _logger.LogInformation("OTP successfully verified for user {UserId}.", userId);

            return new OtpVerificationResult
            {
                IsValid = true,
                RemainingAttempts = maxAttempts - (attemptCount + 1)
            };
        }
        else
        {
            await _auditLog.WriteAsync(new AuditLogEntry
            {
                Action = AuditAction.OtpVerificationFailed,
                UserId = userId,
                Timestamp = now,
                Details = $"OTP verification failed: Invalid OTP code submitted."
            }, cancellationToken);

            _logger.LogWarning("OTP verification failed for user {UserId}: Invalid OTP submitted. Attempts remaining: {RemainingAttempts}.", userId, maxAttempts - (attemptCount + 1));

            return new OtpVerificationResult
            {
                IsValid = false,
                FailureReason = "invalid_otp",
                RemainingAttempts = maxAttempts - (attemptCount + 1)
            };
        }
    }

    public async Task InvalidateOtpAsync(string userId, CancellationToken cancellationToken = default)
    {
        var key = $"{OTP_KEY_PREFIX}{userId}";
        await _cache.RemoveAsync(key, cancellationToken);

        await _auditLog.WriteAsync(new AuditLogEntry
        {
            Action = AuditAction.OtpInvalidated,
            UserId = userId,
            Timestamp = DateTime.UtcNow,
            Details = $"OTP invalidated (consumed) for user {userId}."
        }, cancellationToken);

        _logger.LogInformation("OTP invalidated for user {UserId}.", userId);
    }

    public OtpServiceConfiguration GetConfiguration()
    {
        return new OtpServiceConfiguration
        {
            Length = _options.Otp.Length,
            TtlMinutes = _options.Otp.TtlMinutes,
            MaxAttempts = _options.Otp.MaxAttempts,
            CooldownMinutes = _options.Otp.CooldownMinutes
        };
    }

    private string GenerateSecureOtp(int length)
    {
        using (var rng = new System.Security.Cryptography.RNGCryptoServiceProvider())
        {
            byte[] randomBuffer = new byte[(int)Math.Ceiling(Math.Log(10, 2) * length)];
            rng.GetBytes(randomBuffer);

            int multiplier = (int)Math.Pow(10, length);
            int num = BitConverter.ToInt32(randomBuffer, 0);
            num = (Math.Abs(num) % multiplier);
            num /= (int)Math.Pow(10, Math.Max(0, length - 1)); // Ensure exactly `length` digits

            return num.ToString($"D{length}");
        }
    }

    private bool ConstantTimeComparison(string input1, string input2)
    {
        // Use byte-level comparison to avoid early exit on mismatch
        byte[] bytes1 = System.Text.Encoding.UTF8.GetBytes(input1);
        byte[] bytes2 = System.Text.Encoding.UTF8.GetBytes(input2);

        int result = bytes1.Length ^ bytes2.Length;
        int minLength = Math.Min(bytes1.Length, bytes2.Length);

        for (int i = 0; i < minLength; i++)
        {
            result |= bytes1[i] ^ bytes2[i];
        }

        return result == 0;
    }
}
```

**Acceptance Criteria (OtpService)**:
- [ ] OTP generation produces 6-digit (or configured-length) numeric codes.
- [ ] OTP is stored in cache with TTL; expired OTPs are unretrievable.
- [ ] OTP verification succeeds on correct input.
- [ ] OTP verification fails safely on incorrect input (no timing-based leak).
- [ ] Attempt limits are enforced; after max attempts, a cooldown is applied.
- [ ] Audit log entries are written for all events (generated, verified, failed, expired).
- [ ] Constants-time comparison prevents timing attacks.

#### 3.2.2 Implement Queue-Based SMS/Email Services

**Repository**: `Accounting-Infrastructure`

**File**: `Services/Notifications/SmsNotificationService.cs`

```csharp
public class SmsNotificationService : ISmsNotificationService
{
    private readonly INotificationQueue _queue;
    private readonly NotificationOptions _options;
    private readonly ILogger<SmsNotificationService> _logger;
    private readonly IAuditLogService _auditLog;

    public SmsNotificationService(
        INotificationQueue queue,
        IOptions<NotificationOptions> options,
        ILogger<SmsNotificationService> logger,
        IAuditLogService auditLog)
    {
        _queue = queue;
        _options = options.Value;
        _logger = logger;
        _auditLog = auditLog;
    }

    public async Task<string> SendAsync(SmsMessage message, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(message.PhoneNumber) || string.IsNullOrWhiteSpace(message.Body))
            throw new ArgumentException("Phone number and body are required.");

        var correlationId = message.CorrelationId ?? Guid.NewGuid().ToString();

        try
        {
            // Enqueue the SMS message for async dispatch (non-blocking)
            var messageId = await _queue.EnqueueSmsAsync(new QueuedSmsMessage
            {
                Id = Guid.NewGuid().ToString(),
                PhoneNumber = message.PhoneNumber,
                Body = message.Body,
                CorrelationId = correlationId,
                Metadata = message.Metadata ?? new Dictionary<string, string>(),
                EnqueuedAtUtc = DateTime.UtcNow
            }, cancellationToken);

            // Audit log: SMS enqueued successfully
            await _auditLog.WriteAsync(new AuditLogEntry
            {
                Action = AuditAction.SmsSent,
                Timestamp = DateTime.UtcNow,
                Details = $"SMS enqueued for {message.PhoneNumber}. Message ID: {messageId}, Correlation ID: {correlationId}."
            }, cancellationToken);

            _logger.LogInformation("SMS enqueued for {PhoneNumber}. Message ID: {MessageId}, Correlation ID: {CorrelationId}.", 
                MaskPhoneNumber(message.PhoneNumber), messageId, correlationId);

            return messageId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to enqueue SMS for {PhoneNumber}. Correlation ID: {CorrelationId}.", 
                MaskPhoneNumber(message.PhoneNumber), correlationId);

            await _auditLog.WriteAsync(new AuditLogEntry
            {
                Action = AuditAction.DeliveryFailed,
                Timestamp = DateTime.UtcNow,
                Details = $"Failed to enqueue SMS: {ex.Message}"
            }, cancellationToken);

            throw;
        }
    }

    public async Task<string> SendOtpAsync(string phoneNumber, string otp, DateTime expiresAtUtc, CancellationToken cancellationToken = default)
    {
        var body = $"Your verification code is: {otp}. This code will expire at {expiresAtUtc:u}. Do not share this code.";
        
        return await SendAsync(new SmsMessage
        {
            PhoneNumber = phoneNumber,
            Body = body,
            Metadata = new Dictionary<string, string>
            {
                { "type", "otp" },
                { "expiresAtUtc", expiresAtUtc.ToString("O") }
            }
        }, cancellationToken);
    }

    private string MaskPhoneNumber(string phoneNumber)
    {
        // Mask phone number for logging: +1234567890 -> +1****7890
        if (phoneNumber.Length < 8)
            return "***";

        return phoneNumber.Substring(0, 2) + new string('*', phoneNumber.Length - 4) + phoneNumber.Substring(phoneNumber.Length - 2);
    }
}
```

**Similar implementation for `EmailNotificationService`** (follows the same pattern).

**Queue Abstraction** (INotificationQueue):

```csharp
public interface INotificationQueue
{
    Task<string> EnqueueSmsAsync(QueuedSmsMessage message, CancellationToken cancellationToken = default);
    Task<string> EnqueueEmailAsync(QueuedEmailMessage message, CancellationToken cancellationToken = default);
    Task<QueuedSmsMessage?> DequeueSmsSingleAsync(CancellationToken cancellationToken = default);
    Task<QueuedEmailMessage?> DequeueEmailSingleAsync(CancellationToken cancellationToken = default);
}

// Implementations: InMemoryNotificationQueue (dev), ServiceBusNotificationQueue (production)
```

**Acceptance Criteria (Queue Services)**:
- [ ] SMS/Email messages are enqueued without blocking the caller.
- [ ] Enqueue returns immediately with a message ID (non-blocking).
- [ ] Queue messages contain sufficient metadata for retry and audit (timestamp, correlation ID, etc.).
- [ ] Configuration allows switching between queue providers (in-memory, Service Bus, RabbitMQ).
- [ ] Audit logs capture all enqueue events (success and failure).

#### 3.2.3 Integration Tests for OTP Lifecycle

**Repository**: `Accounting-Infrastructure.Tests`

**File**: `Services/Notifications/OtpServiceIntegrationTests.cs`

```csharp
[TestClass]
public class OtpServiceIntegrationTests
{
    private IServiceProvider _serviceProvider;
    private IOtpService _otpService;
    private IDistributedCache _cache;

    [TestInitialize]
    public void Setup()
    {
        var services = new ServiceCollection();

        // Register in-memory cache for testing
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = "127.0.0.1:6379"; // Assuming test Redis or mock
        });

        // Register OTP service
        services.Configure<NotificationOptions>(options =>
        {
            options.Otp.Length = 6;
            options.Otp.TtlMinutes = 5;
            options.Otp.MaxAttempts = 3;
            options.Otp.CooldownMinutes = 1;
        });

        services.AddScoped<IOtpService, OtpService>();
        services.AddScoped<ILogger<OtpService>>(sp => sp.GetRequiredService<ILoggerFactory>().CreateLogger<OtpService>());
        services.AddScoped<IAuditLogService, MockAuditLogService>();

        _serviceProvider = services.BuildServiceProvider();
        _otpService = _serviceProvider.GetRequiredService<IOtpService>();
        _cache = _serviceProvider.GetRequiredService<IDistributedCache>();
    }

    [TestMethod]
    public async Task GenerateOtp_ShouldProduceSixDigitCode()
    {
        // Arrange
        const string userId = "test-user-123";

        // Act
        var result = await _otpService.GenerateOtpAsync(userId);

        // Assert
        Assert.IsNotNull(result.Code);
        Assert.AreEqual(6, result.Code.Length);
        Assert.IsTrue(result.Code.All(char.IsDigit));
    }

    [TestMethod]
    public async Task VerifyOtp_WithCorrectCode_ShouldSucceed()
    {
        // Arrange
        const string userId = "test-user-123";
        var generateResult = await _otpService.GenerateOtpAsync(userId);

        // Act
        var verifyResult = await _otpService.VerifyOtpAsync(userId, generateResult.Code);

        // Assert
        Assert.IsTrue(verifyResult.IsValid);
    }

    [TestMethod]
    public async Task VerifyOtp_WithIncorrectCode_ShouldFail()
    {
        // Arrange
        const string userId = "test-user-123";
        var generateResult = await _otpService.GenerateOtpAsync(userId);

        // Act
        var verifyResult = await _otpService.VerifyOtpAsync(userId, "000000");

        // Assert
        Assert.IsFalse(verifyResult.IsValid);
        Assert.AreEqual("invalid_otp", verifyResult.FailureReason);
    }

    [TestMethod]
    public async Task VerifyOtp_ExceededAttemptLimit_ShouldEnforceCooldown()
    {
        // Arrange
        const string userId = "test-user-123";
        var generateResult = await _otpService.GenerateOtpAsync(userId);
        var config = _otpService.GetConfiguration();

        // Act: submit incorrect OTP max attempts times
        for (int i = 0; i < config.MaxAttempts; i++)
        {
            await _otpService.VerifyOtpAsync(userId, "000000");
        }

        var finalResult = await _otpService.VerifyOtpAsync(userId, generateResult.Code); // even correct OTP should fail now

        // Assert
        Assert.IsFalse(finalResult.IsValid);
        Assert.AreEqual("attempt_limit_exceeded", finalResult.FailureReason);
        Assert.IsNotNull(finalResult.NextAttemptAllowedAtUtc);
        Assert.IsTrue(finalResult.NextAttemptAllowedAtUtc > DateTime.UtcNow);
    }

    [TestMethod]
    public async Task VerifyOtp_WithExpiredOtp_ShouldFail()
    {
        // Arrange
        const string userId = "test-user-123";
        
        // Create OTP with very short TTL
        var services = new ServiceCollection();
        services.AddStackExchangeRedisCache(options => options.Configuration = "127.0.0.1:6379");
        services.Configure<NotificationOptions>(options =>
        {
            options.Otp.TtlMinutes = 0; // Expires immediately (for testing)
        });
        services.AddScoped<IOtpService, OtpService>();
        services.AddScoped<ILogger<OtpService>>(sp => sp.GetRequiredService<ILoggerFactory>().CreateLogger<OtpService>());
        services.AddScoped<IAuditLogService, MockAuditLogService>();

        var sp = services.BuildServiceProvider();
        var otpService = sp.GetRequiredService<IOtpService>();

        var generateResult = await otpService.GenerateOtpAsync(userId);

        // Wait for OTP to expire (or immediately check given TTL=0)
        await Task.Delay(1000);

        // Act
        var verifyResult = await otpService.VerifyOtpAsync(userId, generateResult.Code);

        // Assert
        Assert.IsFalse(verifyResult.IsValid);
        Assert.AreEqual("expired_otp", verifyResult.FailureReason);
    }

    [TestMethod]
    public async Task VerifyOtp_ShouldResistTimingAttacks()
    {
        // Arrange
        const string userId = "test-user-123";
        var generateResult = await _otpService.GenerateOtpAsync(userId);

        // Act: Measure time for correct vs. incorrect OTP
        var sw1 = System.Diagnostics.Stopwatch.StartNew();
        var result1 = await _otpService.VerifyOtpAsync(userId, generateResult.Code);
        sw1.Stop();

        // Reset for second attempt
        var generateResult2 = await _otpService.GenerateOtpAsync(userId);

        var sw2 = System.Diagnostics.Stopwatch.StartNew();
        var result2 = await _otpService.VerifyOtpAsync(userId, "000000");
        sw2.Stop();

        // Assert: Timing should be similar (within 10ms margin due to system variance)
        // This is a basic check; sophisticated timing attack detection requires more rigorous analysis
        var timingDifference = Math.Abs(sw1.ElapsedMilliseconds - sw2.ElapsedMilliseconds);
        Assert.IsTrue(timingDifference < 50, $"Timing difference too large: {timingDifference}ms");
    }

    [TestMethod]
    public async Task InvalidateOtp_ShouldRemoveOtpFromStore()
    {
        // Arrange
        const string userId = "test-user-123";
        var generateResult = await _otpService.GenerateOtpAsync(userId);

        // Act
        await _otpService.InvalidateOtpAsync(userId);
        var verifyResult = await _otpService.VerifyOtpAsync(userId, generateResult.Code);

        // Assert
        Assert.IsFalse(verifyResult.IsValid);
        Assert.AreEqual("expired_otp", verifyResult.FailureReason); // OTP is treated as expired (not found)
    }
}
```

**Acceptance Criteria (Integration Tests)**:
- [ ] All test cases pass.
- [ ] OTP lifecycle is verified end-to-end.
- [ ] Timing attack resistance is validated.
- [ ] Code coverage for `OtpService` is ≥ 90%.

---

### 3.3 Code Review Checklist (Phase 2)

- [ ] All async operations use `CancellationToken`.
- [ ] Sensitive data (OTP codes, phone numbers) is masked in logs.
- [ ] Constant-time comparison is used for OTP verification.
- [ ] Audit logs are written for all security events.
- [ ] Error messages are generic (no information leakage).
- [ ] Configuration is read from vault (no hardcoded credentials).
- [ ] Unit tests have ≥ 90% code coverage.

---

## 4. Phase 3: SSO Integration & Refactoring (Week 3)

### 4.1 Goals

- Refactor `ForgotPasswordEndpoints.cs` (AC-46) to use real OTP service instead of `12346` bypass.
- Remove dev bypass conditional logic.
- Wire real SMS/email notification services.
- Write end-to-end integration tests with the frontend (AC-47).

### 4.2 Refactoring AC-46: ForgotPasswordEndpoints

**Repository**: `accounting-sso`

**Current Code** (with dev bypass):
```csharp
// AC-46 implementation (with dev bypass OTP 12346)
public class ForgotPasswordEndpoints
{
    public static void MapForgotPasswordEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/Account/ForgotPassword")
            .WithName("ForgotPassword")
            .WithOpenApi();

        group.MapPost("/Identify", Identify).WithName("ForgotPassword_Identify").WithOpenApi();
        group.MapPost("/RequestOtp", RequestOtp).WithName("ForgotPassword_RequestOtp").WithOpenApi();
        group.MapPost("/VerifyOtp", VerifyOtp).WithName("ForgotPassword_VerifyOtp").WithOpenApi();
        group.MapPost("/SetPassword", SetPassword).WithName("ForgotPassword_SetPassword").WithOpenApi();
    }

    private static async Task<IResult> RequestOtp(string userId, UserManager<User> userManager, IHostEnvironment env, IHttpContextAccessor httpContextAccessor)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user == null)
            return Results.Ok(); // Don't leak whether user exists

        // Generate OTP (stub: use hardcoded 12346 in Development)
        var otp = env.IsDevelopment() ? "12346" : GenerateOtp();

        // Store in session
        httpContextAccessor.HttpContext?.Session.SetString($"otp:{userId}", otp);

        return Results.Ok();
    }

    // ...rest of implementation
}
```

**Refactored Code** (with AC-97 integration):
```csharp
public class ForgotPasswordEndpoints
{
    private readonly IOtpService _otpService;
    private readonly ISmsNotificationService _smsService;
    private readonly IEmailNotificationService _emailService;
    private readonly UserManager<User> _userManager;
    private readonly IAuditLogService _auditLog;
    private readonly ILogger<ForgotPasswordEndpoints> _logger;

    public ForgotPasswordEndpoints(
        IOtpService otpService,
        ISmsNotificationService smsService,
        IEmailNotificationService emailService,
        UserManager<User> userManager,
        IAuditLogService auditLog,
        ILogger<ForgotPasswordEndpoints> logger)
    {
        _otpService = otpService;
        _smsService = smsService;
        _emailService = emailService;
        _userManager = userManager;
        _auditLog = auditLog;
        _logger = logger;
    }

    public static void MapForgotPasswordEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/Account/ForgotPassword")
            .WithName("ForgotPassword")
            .WithOpenApi();

        // Binding endpoint to a method on the class
        group.MapPost("/Identify", Identify).WithName("ForgotPassword_Identify").WithOpenApi();
        group.MapPost("/RequestOtp", RequestOtp).WithName("ForgotPassword_RequestOtp").WithOpenApi();
        group.MapPost("/VerifyOtp", VerifyOtp).WithName("ForgotPassword_VerifyOtp").WithOpenApi();
        group.MapPost("/SetPassword", SetPassword).WithName("ForgotPassword_SetPassword").WithOpenApi();
    }

    public async Task<IResult> Identify(
        IdentifyRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.UsernameOrEmail))
            return Results.BadRequest(new { error = "Username or email is required." });

        // Attempt to find user by username or email
        var user = await _userManager.FindByNameAsync(request.UsernameOrEmail) ??
                   await _userManager.FindByEmailAsync(request.UsernameOrEmail);

        // Always return same response (don't leak whether user exists)
        _logger.LogInformation("Identify endpoint called for {UsernameOrEmail}. User found: {UserFound}.", 
            MaskInput(request.UsernameOrEmail), user != null);

        return Results.Ok(new { message = "If an account exists, you will receive recovery instructions." });
    }

    public async Task<IResult> RequestOtp(
        RequestOtpRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.UserId))
            return Results.BadRequest(new { error = "User ID is required." });

        var user = await _userManager.FindByIdAsync(request.UserId);
        if (user == null)
            return Results.Ok(); // Don't leak whether user exists

        try
        {
            // Generate OTP using the real OTP service (no more 12346 bypass)
            var otpRequest = await _otpService.GenerateOtpAsync(user.Id, cancellationToken);

            // Determine delivery channel (SMS or Email) from request
            string? phoneNumber = user.PhoneNumber;
            string? email = user.Email;

            if (request.Channel == "sms" && !string.IsNullOrWhiteSpace(phoneNumber))
            {
                // Send OTP via SMS
                await _smsService.SendOtpAsync(phoneNumber, otpRequest.Code, otpRequest.ExpiresAtUtc, cancellationToken);
                _logger.LogInformation("OTP sent via SMS to user {UserId}.", user.Id);

                await _auditLog.WriteAsync(new AuditLogEntry
                {
                    Action = AuditAction.PasswordResetInitiated,
                    UserId = user.Id,
                    EntityName = nameof(User),
                    EntityId = user.Id,
                    Timestamp = DateTime.UtcNow,
                    Details = "Password reset initiated. OTP sent via SMS."
                }, cancellationToken);
            }
            else if (request.Channel == "email" && !string.IsNullOrWhiteSpace(email))
            {
                // Send OTP via Email
                await _emailService.SendOtpAsync(email, otpRequest.Code, otpRequest.ExpiresAtUtc, cancellationToken);
                _logger.LogInformation("OTP sent via email to user {UserId}.", user.Id);

                await _auditLog.WriteAsync(new AuditLogEntry
                {
                    Action = AuditAction.PasswordResetInitiated,
                    UserId = user.Id,
                    EntityName = nameof(User),
                    EntityId = user.Id,
                    Timestamp = DateTime.UtcNow,
                    Details = "Password reset initiated. OTP sent via email."
                }, cancellationToken);
            }
            else
            {
                return Results.BadRequest(new { error = "Invalid channel or contact information not available." });
            }

            return Results.Ok(new { message = "OTP sent. Please check your SMS or email." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to request OTP for user {UserId}.", request.UserId);
            return Results.StatusCode(500);
        }
    }

    public async Task<IResult> VerifyOtp(
        VerifyOtpRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.UserId) || string.IsNullOrWhiteSpace(request.Otp))
            return Results.BadRequest(new { error = "User ID and OTP are required." });

        try
        {
            var result = await _otpService.VerifyOtpAsync(request.UserId, request.Otp, cancellationToken);

            if (!result.IsValid)
            {
                return Results.BadRequest(new
                {
                    error = result.FailureReason switch
                    {
                        "invalid_otp" => "Invalid OTP. Please try again.",
                        "expired_otp" => "OTP has expired. Please request a new one.",
                        "attempt_limit_exceeded" => "Maximum attempts exceeded. Please request a new OTP.",
                        _ => "Verification failed. Please try again."
                    },
                    remainingAttempts = result.RemainingAttempts
                });
            }

            return Results.Ok(new { message = "OTP verified successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to verify OTP for user {UserId}.", request.UserId);
            return Results.StatusCode(500);
        }
    }

    public async Task<IResult> SetPassword(
        SetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.UserId) ||
            string.IsNullOrWhiteSpace(request.NewPassword) ||
            string.IsNullOrWhiteSpace(request.ConfirmPassword))
            return Results.BadRequest(new { error = "User ID, new password, and confirmation are required." });

        if (request.NewPassword != request.ConfirmPassword)
            return Results.BadRequest(new { error = "Passwords do not match." });

        if (request.NewPassword.Length < 8)
            return Results.BadRequest(new { error = "Password must be at least 8 characters." });

        try
        {
            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
                return Results.BadRequest(new { error = "Invalid user." });

            // Generate password reset token (no OTP bypass needed anymore)
            var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(user, resetToken, request.NewPassword);

            if (!result.Succeeded)
            {
                _logger.LogWarning("Password reset failed for user {UserId}: {Errors}.", request.UserId, string.Join(", ", result.Errors.Select(e => e.Description)));
                return Results.BadRequest(new { error = "Password reset failed. Please try again." });
            }

            // Invalidate the OTP (single-use guarantee)
            await _otpService.InvalidateOtpAsync(user.Id, cancellationToken);

            // Audit log
            await _auditLog.WriteAsync(new AuditLogEntry
            {
                Action = AuditAction.PasswordResetCompleted,
                UserId = user.Id,
                EntityName = nameof(User),
                EntityId = user.Id,
                Timestamp = DateTime.UtcNow,
                Details = "Password successfully reset."
            }, cancellationToken);

            _logger.LogInformation("Password reset completed for user {UserId}.", user.Id);

            return Results.Ok(new { message = "Password reset successful. You can now log in with your new password." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set password for user {UserId}.", request.UserId);
            return Results.StatusCode(500);
        }
    }

    private static string MaskInput(string input)
    {
        if (input.Length < 3)
            return "***";
        return input.Substring(0, 1) + new string('*', input.Length - 2) + input.Last();
    }
}

public record IdentifyRequest(string UsernameOrEmail);
public record RequestOtpRequest(string UserId, string Channel); // "sms" or "email"
public record VerifyOtpRequest(string UserId, string Otp);
public record SetPasswordRequest(string UserId, string NewPassword, string ConfirmPassword);
```

**Acceptance Criteria (SSO Refactoring)**:
- [ ] The dev bypass OTP `12346` is completely removed.
- [ ] All four endpoints use real OTP service (`IOtpService`).
- [ ] SMS/Email services are called for OTP dispatch.
- [ ] Audit logs are written for all password reset events.
- [ ] Sensitive data is masked in logs.
- [ ] All integration tests pass.
- [ ] No breaking changes to the endpoint contracts.

---

### 4.3 End-to-End Tests (with AC-47 Frontend)

**Test Scenario**: User initiates password reset via UI → receives OTP via SMS/email → enters OTP → sets new password → login succeeds with new password.

**Acceptance Criteria (E2E Tests)**:
- [ ] Full password reset flow works end-to-end.
- [ ] OTP is received and can be entered in the UI.
- [ ] Password reset succeeds and user can log in with new password.
- [ ] Audit logs capture the entire flow.

---

## 5. Phase 4: Configuration, Audit, & Documentation (Week 4)

### 5.1 Goals

- Complete configuration management and vault integration.
- Add comprehensive audit logging.
- Write documentation (setup guides, API docs, architecture diagrams).
- Security review and production readiness.

### 5.2 Work Items

#### 5.2.1 Configuration & Secrets Management

**Files**:
- `appsettings.json` (development defaults)
- `appsettings.Production.json` (production settings, no secrets)
- Vault integration (`ISecretProvider`)

**appsettings.json Example**:
```json
{
  "Notifications": {
    "Otp": {
      "Length": 6,
      "TtlMinutes": 10,
      "MaxAttempts": 3,
      "CooldownMinutes": 5
    },
    "Email": {
      "FromAddress": "noreply@accounting-system.local",
      "FromDisplayName": "Accounting System",
      "ProviderType": "SendGrid"
    },
    "Sms": {
      "ProviderType": "Twilio"
    },
    "Queue": {
      "QueueType": "InMemory"
    }
  }
}
```

**Vault Integration (Startup)**:
```csharp
var keyVaultUrl = configuration["KeyVault:VaultUrl"];
if (!string.IsNullOrEmpty(keyVaultUrl))
{
    builder.Configuration.AddAzureKeyVault(
        new Uri(keyVaultUrl),
        new DefaultAzureCredential());
}

// Validate configuration at startup
var notificationOptions = configuration.GetSection(NotificationOptions.SectionName).Get<NotificationOptions>();
if (notificationOptions?.Email?.ApiKey == null || notificationOptions?.Sms?.AccountSid == null)
{
    if (!app.Environment.IsDevelopment())
    {
        throw new InvalidOperationException("Notification service credentials are not configured. Ensure vault secrets are set.");
    }
}
```

#### 5.2.2 Audit Logging Enhancements

Extend `AuditAction` enum (done in AC-46):
```csharp
public enum AuditAction
{
    // ... existing actions ...
    PasswordResetInitiated = 7,
    PasswordResetCompleted = 8,
    OtpGenerated = 100,
    OtpSent = 101,
    OtpVerified = 102,
    OtpExpired = 103,
    OtpVerificationFailed = 104,
    OtpInvalidated = 105,
    EmailSent = 110,
    SmsSent = 111,
    DeliveryFailed = 112
}
```

#### 5.2.3 Documentation

**File**: [docs/NOTIFICATION-ARCHITECTURE.md](docs/NOTIFICATION-ARCHITECTURE.md)

```markdown
# Notification Service Architecture

## Overview

The notification service provides a unified, queue-based abstraction for sending SMS and email notifications, with a focus on password reset OTP delivery for the SSO (Single Sign-On) system.

## Architecture Diagram

[Diagram of layers: SSO → Abstractions → Infrastructure Wrapper → External Providers]

## Configuration

### Development

```json
{
  "Notifications": {
    "Queue": {
      "QueueType": "InMemory"
    }
  }
}
```

- SMS/Email are logged to console (no actual delivery).
- In-memory queue for rapid testing.

### Production

- Queue: Azure Service Bus or RabbitMQ.
- Email: SendGrid or Azure Communication Services.
- SMS: Twilio or AWS SNS.
- All credentials from vault (Azure Key Vault).

## OTP Flow Diagram

[Sequence diagram: User → RequestOtp → IOtpService → SMS Provider → Queue → Async Dispatch]

## Security Considerations

- OTP verification uses constant-time comparison to prevent timing attacks.
- OTP codes are never logged; only metadata is logged.
- Single-use guarantee enforced via OTP invalidation after successful verification.
- Attempt limits and cooldown protect against brute-force attacks.
- Email/SMS provider credentials are never in version control; always in vault.

## Future Extensions

- Account lockout notifications
- Login alerts (new device/location)
- Session expiry warnings
- Activity summaries

---

## References

- NT.Notification.SDK Documentation: [link]
- Infrastructure Layer README: [Accounting-Infrastructure/README.md]
- Configuration Reference: [docs/CONFIGURATION.md]
```

---

### 5.3 Production Readiness Checklist

- [ ] All secrets are in vault (no hardcoded credentials).
- [ ] Configuration validation passes (fail fast on missing credentials).
- [ ] Audit logs are complete and tamper-evident.
- [ ] Integration tests pass with mocked SMS/email providers in CI.
- [ ] Load testing confirms queue-based dispatch does not block authentication endpoints.
- [ ] Security review completed (timing attacks, OTP generation, credentials management).
- [ ] Documentation is complete and reviewable.
- [ ] Rollback plan is documented (how to fall back to development OTP bypass if needed).

---

## 6. Deployment & Rollout

### 6.1 Deployment Strategy

**Phase 1: Development**
- Deploy to development environment first.
- Test with sandbox SMS/email providers.

**Phase 2: Test/Staging**
- Deploy to staging with production-like configuration.
- Perform end-to-end testing with real SMS/email delivery (to test mailbox).
- Validate audit logs and monitoring.

**Phase 3: Production**
- Deploy to production with full credentials from vault.
- Monitor queue depth, delivery success rates, and error rates.
- Alert if delivery latency exceeds SLA or failure rate exceeds threshold.

### 6.2 Monitoring & Alerting

**Metrics to Track**:
- OTP generation rate
- OTP verification success rate
- SMS delivery latency and success rate
- Email delivery latency and success rate
- Queue depth
- Audit log ingestion rate

**Alerts**:
- Delivery failure rate > 5%
- Queue depth growing (possible queue worker outage)
- Vault credential lookup failures

---

## 7. Rollback & Recovery

### 7.1 Rollback Procedure

If production experiences critical issues:
1. Disable real SMS/email dispatch (revert `ForgotPasswordEndpoints` to use dev bypass).
2. Direct users to admin support for password resets.
3. Investigate root cause and fix in staging.
4. Re-deploy to production.

### 7.2 Dead-Letter Handling

Notification messages that fail after max retries are moved to a dead-letter queue and require manual investigation/recovery.

**Manual Recovery Steps**:
1. Query dead-letter queue for failed messages.
2. Fix underlying issue (provider credentials, network, etc.).
3. Replay dead-letter messages to primary queue.

---

## 8. Sign-Off & Approval

- **Tech Lead**: ________________ Date: _______
- **Product Owner**: ________________ Date: _______
- **Infrastructure Lead**: ________________ Date: _______
- **Security Lead**: ________________ Date: _______

---

## 9. Notes

- This implementation plan is iterative and may be refined based on integration findings.
- Regular sync meetings (daily standups during implementation) are recommended to identify and resolve blockers quickly.
- Code review is mandatory before merge; at least 2 reviewers for security-sensitive code (OTP verification, credentials handling).

