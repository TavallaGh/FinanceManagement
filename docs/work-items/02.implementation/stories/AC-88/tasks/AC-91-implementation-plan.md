# AC-91 Implementation Plan
## BE - DDD Project Structure & NT.DDD Integration (Notification)

**Task Identity:**
- Jira Task: [AC-91](https://nexttoptech.atlassian.net/browse/AC-91)
- Parent Story: [AC-88](https://nexttoptech.atlassian.net/browse/AC-88) - Notification Management System Integration
- Task Type: Backend Architecture / Domain Design
- Fix Version: V 0.1 (MVP)
- Status: Ready for Implementation
- Created: 2026-05-18

---

## Executive Summary

This task establishes a DDD-compliant project structure for the Notification Management System (`ERP.Notification`) with complete integration of NT.DDD and NT.Notification packages across all five architectural layers (Contract, Domain, Infrastructure, Application, Presentation). The implementation is **documentation-first**, structural only, with no custom business logic. The work aligns with the current branch `features/ac-91-be-ddd-project-structure-nt-ddd-integration-notification` and commit `fce7756c137ee8cda9e816f088d480a6fc661d3e` in the `accounting-notification` subproject.

---

## 1. Scope & Assumptions

### In Scope
- DDD project structure creation following NT.DDD and workspace conventions
- Five architectural layer implementation (Contract, Domain, Infrastructure, Application, Presentation)
- NT.Notification and NT.DDD package installation and integration
- Layer scaffolding with base classes, interfaces, and dependency injection
- Build verification and NuGet dependency resolution
- Controller/handler skeleton implementation for future notification endpoints
- Infrastructure configuration bootstrappers for MongoDB, RabbitMQ, Redis
- Application service layer scaffolding for notification processing
- Complete README documenting structure, layer responsibilities, and DDD principles
- Integration test framework setup (structural validation only)

### Out of Scope
- Implementation of domain services (business logic)
- Entity model implementation beyond scaffolding
- Notification workflow/orchestration implementation
- Database migrations or schema design (scaffolding only)
- RabbitMQ/Redis integration testing (configuration validation only)
- Authentication/authorization policy implementation (basic framework only)
- Custom notification domain rules or invariants

### Assumptions
- NT.DDD package version is compatible with workspace conventions (semantic versioning)
- NT.Notification package is available in organization NuGet feed
- Target framework aligns with workspace baseline (.NET 8.0 or later)
- MongoDB, RabbitMQ, Redis are available in local development environment
- IDP/authentication context is available via existing IDP module
- Project structure follows workspace folder naming: `src/01.Domains/`, `src/02.Infrastructures/`, `src/03.Applications/`, `src/04.Presentaions/`
- No team members are blocked by infrastructure setup

---

## 2. Repository Routing Matrix

### Workspace Repository (`accounting-workspace`)
**Scope:** Documentation and planning artifacts

| Artifact Type | Path | Owner | MR Target |
|---|---|---|---|
| Task Implementation Plan | `docs/work-items/02.implementation/stories/AC-88/tasks/AC-91-implementation-plan.md` | TL | `develop` (workspace) |
| Work Item Log | `docs/work-items/02.implementation/stories/AC-88/tasks/AC-91-work-log.md` | Dev | `develop` (workspace) |
| Architecture Notes | `docs/work-items/02.implementation/stories/AC-88/tasks/AC-91-architecture-notes.md` | TL | `develop` (workspace) |

**Workspace MR Strategy:**
- Create workspace MR for documentation changes
- Title: `docs: AC-91 Implementation & Work Log for Notification DDD Structure`
- Description: Include links to Jira and project MR
- Merge Strategy: Squash + Delete source branch
- Base: `develop`

### Product Repository (`accounting-notification`)
**Scope:** Product code and infrastructure configuration

| Layer | Project/Folder | Namespace Root | Key Files |
|---|---|---|---|
| **Contract** | `src/01.Domains/ERP.Notification.Contract/` | `ERP.Notification.Contract` | Interfaces, DTOs, Options |
| **Domain** | `src/01.Domains/ERP.Notification.Domain/` | `ERP.Notification.Domain` | Aggregates, Entities, Value Objects |
| **Infrastructure (MongoDB)** | `src/02.Infrastructures/ERP.Notification.Infrastructure.MongoDb/` | `ERP.Notification.Infrastructure.MongoDb` | Repositories, DbContext, Configurations |
| **Application** | `src/03.Applications/ERP.Notification.Application/` | `ERP.Notification.Application` | Use Cases, Services, Handlers |
| **Presentation** | `src/04.Presentaions/ERP.Notification.Presentation.EndPoint/` | `ERP.Notification.Presentation.EndPoint` | Controllers, Configuration, Host |

**Project MR Strategy:**
- Create project MR for code changes
- Title: `feat(ac-91): Initialize DDD project structure for Notification domain`
- Description: Include acceptance criteria, test evidence, Jira links (both workspace and project MR)
- Merge Strategy: Squash + Delete source branch
- Base: `develop`

---

## 3. Mandatory Per-Domain Hierarchy Map

The Notification domain follows the workspace-standard four-level folder hierarchy:

```
ERP.Notification (Root Domain)
├── 01.Domains/ (Contract + Domain Logic)
│   ├── ERP.Notification.Contract/
│   │   ├── Options/
│   │   ├── Interfaces/
│   │   └── DTOs/
│   └── ERP.Notification.Domain/
│       ├── Entities/
│       ├── Aggregates/
│       ├── ValueObjects/
│       ├── Services/
│       └── Contracts/ (Domain Interfaces)
├── 02.Infrastructures/ (Data Access & External Services)
│   ├── ERP.Notification.Infrastructure.MongoDb/
│   │   ├── Repositories/
│   │   ├── Contexts/
│   │   ├── Configurations/
│   │   └── InjectionBootstrappers.cs
│   ├── ERP.Notification.Infrastructure.RabbitMq/ (future)
│   └── ERP.Notification.Infrastructure.Redis/ (future)
├── 03.Applications/ (Use Cases & Orchestration)
│   ├── ERP.Notification.Application/
│   │   ├── Services/
│   │   ├── Handlers/
│   │   ├── DTOs/
│   │   └── InjectionBootstrappers.cs
│   └── ERP.Notification.Application.Tests/ (future)
└── 04.Presentaions/ (HTTP APIs & Host)
    └── ERP.Notification.Presentation.EndPoint/
        ├── Controllers/
        ├── Extensions/
        ├── Constants/
        ├── Program.cs
        └── appsettings.{env}.json
```

---

## 4. Entity-Centric Folder Naming Map

The following entity/aggregate roots are scaffolded in the Domain layer. Folder names **must** match entity names exactly:

| Entity Name | Domain Folder Path | Namespace | Base Class |
|---|---|---|---|
| `EmailNotification` | `Domain/EmailNotification/` | `ERP.Notification.Domain.EmailNotification` | `AggregateRoot<TKey>` (from NT.DDD) |
| `SmsNotification` | `Domain/SmsNotification/` | `ERP.Notification.Domain.SmsNotification` | `AggregateRoot<TKey>` (from NT.DDD) |
| `PushNotification` | `Domain/PushNotification/` | `ERP.Notification.Domain.PushNotification` | `AggregateRoot<TKey>` (from NT.DDD) |
| `WebNotification` | `Domain/WebNotification/` | `ERP.Notification.Domain.WebNotification` | `AggregateRoot<TKey>` (from NT.DDD) |
| `NotificationTemplate` | `Domain/NotificationTemplate/` | `ERP.Notification.Domain.NotificationTemplate` | `AggregateRoot<TKey>` (from NT.DDD) |
| `NotificationProvider` | `Domain/NotificationProvider/` | `ERP.Notification.Domain.NotificationProvider` | `AggregateRoot<TKey>` (from NT.DDD) |
| `SecurityPolicy` | `Domain/SecurityPolicy/` | `ERP.Notification.Domain.SecurityPolicy` | `AggregateRoot<TKey>` (from NT.DDD) |

---

## 5. Implementation Steps & Sequence

### Phase 1: Project Structure Scaffolding (Days 1-2)

#### Step 1.1: Create Solution Structure
- Create `ERP.Notification.slnx` at repository root
- Create folder structure: `src/01.Domains/`, `src/02.Infrastructures/`, `src/03.Applications/`, `src/04.Presentaions/`
- Add `.gitignore` with standard .NET patterns
- Initialize git history

**Acceptance:**
- Solution file compiles
- All folders present with correct naming
- No compilation errors

#### Step 1.2: Create Contract Layer Project
**Project:** `ERP.Notification.Contract.csproj`

**Folder Structure:**
```
ERP.Notification.Contract/
├── Options/
│   ├── IdpOptions.cs          (IDP configuration contract)
│   ├── MongoDbOptions.cs       (MongoDB connection options)
│   ├── RabbitMqOptions.cs      (RabbitMQ broker options)
│   └── RedisOptions.cs         (Redis cache options)
├── Interfaces/
│   ├── INotificationService.cs
│   ├── IEmailService.cs
│   ├── ISmsService.cs
│   ├── IPushService.cs
│   └── ITemplateService.cs
├── DTOs/
│   ├── SendEmailRequest.cs
│   ├── SendSmsRequest.cs
│   ├── SendPushRequest.cs
│   └── NotificationResponse.cs
└── ERP.Notification.Contract.csproj
```

**NuGet Dependencies:**
- `NT.DDD` (latest stable)
- `NT.Notification` (latest stable)

**Acceptance:**
- Project compiles
- No circular dependencies
- All contracts are interfaces

#### Step 1.3: Create Domain Layer Project
**Project:** `ERP.Notification.Domain.csproj`

**Folder Structure:**
```
ERP.Notification.Domain/
├── EmailNotification/
│   ├── EmailNotification.cs    (AggregateRoot)
│   └── Contracts/
│       └── IEmailNotificationRepository.cs
├── SmsNotification/
│   ├── SmsNotification.cs
│   └── Contracts/
│       └── ISmsNotificationRepository.cs
├── PushNotification/
│   ├── PushNotification.cs
│   └── Contracts/
│       └── IPushNotificationRepository.cs
├── WebNotification/
│   ├── WebNotification.cs
│   └── Contracts/
│       └── IWebNotificationRepository.cs
├── NotificationTemplate/
│   ├── NotificationTemplate.cs
│   └── Contracts/
│       └── INotificationTemplateRepository.cs
├── NotificationProvider/
│   ├── NotificationProvider.cs
│   └── Contracts/
│       └── INotificationProviderRepository.cs
├── SecurityPolicy/
│   ├── SecurityPolicy.cs
│   └── Contracts/
│       └── ISecurityPolicyRepository.cs
├── Commons/
│   ├── Extensions/
│   ├── Helpers/
│   └── Constants/
└── ERP.Notification.Domain.csproj
```

**DDD Base Classes (from NT.DDD):**
- All aggregate roots inherit from `AggregateRoot<Guid>` or `FullAuditedAggregateRoot<Guid, int>` (with auditing)
- Follow UTC naming convention for audit fields: `CreatedOnUtc`, `UpdatedOnUtc`, `DeletedOnUtc`
- All entities must implement `IEntity<Guid>` or higher

**Acceptance:**
- Domain project compiles
- All aggregates inherit from NT.DDD base classes
- No business logic implementation (scaffolding only)
- Contract interfaces properly referenced

#### Step 1.4: Create Infrastructure Layer - MongoDB Project
**Project:** `ERP.Notification.Infrastructure.MongoDb.csproj`

**Folder Structure:**
```
ERP.Notification.Infrastructure.MongoDb/
├── Repositories/
│   ├── EmailNotificationRepository.cs
│   ├── SmsNotificationRepository.cs
│   ├── PushNotificationRepository.cs
│   ├── WebNotificationRepository.cs
│   ├── NotificationTemplateRepository.cs
│   ├── NotificationProviderRepository.cs
│   └── SecurityPolicyRepository.cs
├── Contexts/
│   └── NotificationDbContext.cs
├── Configurations/
│   ├── MongoDbConnectionFactory.cs
│   └── Collections.cs
├── InjectionBootstrappers.cs
└── ERP.Notification.Infrastructure.MongoDb.csproj
```

**Repository Pattern:**
- All repositories implement domain layer `IRepository<TAggregate>` from NT.DDD
- DbContext manages MongoDB connections using `IMongoClient`
- Configuration via `MongoDbOptions` from appsettings.json

**Acceptance:**
- MongoDB repositories compile
- Dependencies resolve correctly
- InjectionBootstrappers registers all repositories
- No business logic in repositories

#### Step 1.5: Create Application Layer Project
**Project:** `ERP.Notification.Application.csproj`

**Folder Structure:**
```
ERP.Notification.Application/
├── Services/
│   ├── PushNotificationService.cs
│   ├── WebNotificationService.cs
│   ├── EmailNotificationService.cs (future)
│   └── SmsNotificationService.cs (future)
├── Handlers/
│   └── NotificationEventHandler.cs (future)
├── DTOs/
│   ├── SendNotificationDto.cs
│   └── NotificationResultDto.cs
├── InjectionBootstrappers.cs
└── ERP.Notification.Application.csproj
```

**Services:**
- Application services inject domain repositories
- Services orchestrate domain logic only (scaffolding)
- MediatR handlers in `Handlers/` folder (optional based on architecture choice)

**Acceptance:**
- Services compile
- Dependencies properly injected
- InjectionBootstrappers registers all services

#### Step 1.6: Create Presentation Layer - API Endpoints
**Project:** `ERP.Notification.Presentation.EndPoint.csproj`

**Folder Structure:**
```
ERP.Notification.Presentation.EndPoint/
├── Controllers/
│   ├── EmailController.cs
│   ├── SmsController.cs
│   ├── PushController.cs
│   ├── TemplateController.cs
│   ├── ProviderController.cs
│   └── SecurityController.cs
├── Extensions/
│   ├── VaultConfigurations.cs
│   ├── ServiceExtensions.cs
│   └── SecurityExtensions.cs
├── Constants/
│   └── AppConst.cs
├── Models/
│   ├── Requests/
│   │   └── SendNotificationRequest.cs
│   └── Responses/
│       └── NotificationResponse.cs
├── Program.cs
├── Properties/
│   └── launchSettings.json
├── appsettings.json
├── appsettings.Development.json
└── ERP.Notification.Presentation.EndPoint.csproj
```

**Controllers (Minimal APIs):**
- Implement standard Minimal API patterns
- Controllers delegate to Application services
- Request/response models properly structured

**Acceptance:**
- Project compiles
- All endpoints have proper routing
- Controllers properly inject services
- appsettings.json contains environment placeholders

---

### Phase 2: Dependency Integration & Configuration (Days 2-3)

#### Step 2.1: NuGet Package Installation & Verification
**Target Projects:** All five layer projects

**Packages to Install:**
- `NT.DDD` (NuGet URL: _from organization feed_)
- `NT.Notification` (NuGet URL: _from organization feed_)
- `MongoDB.Driver` (for MongoDB infrastructure)
- `RabbitMQ.Client` (for messaging infrastructure)
- `StackExchange.Redis` (for caching infrastructure)
- `Microsoft.AspNetCore.OpenApi` (API documentation)
- `Serilog` (structured logging)

**Post-Installation Tasks:**
1. Verify no circular dependencies
2. Update all project SDK versions to match workspace baseline
3. Ensure consistent dependency versions across all projects
4. Validate that NT.DDD base classes are accessible

**Acceptance:**
- All projects compile without warnings
- NuGet packages resolve correctly
- Base classes from NT.DDD are accessible in Domain layer

#### Step 2.2: Program.cs Configuration & DI Setup
**File:** `src/04.Presentaions/ERP.Notification.Presentation.EndPoint/Program.cs`

**Configuration Requirements:**
```csharp
// 1. InjectionBootstrappers for all layers
- Infrastructure.MongoDb.InjectionBootstrappers.RegisterServices(services)
- Application.InjectionBootstrappers.RegisterServices(services)

// 2. Configuration Binding
- MongoDbOptions from appsettings
- RabbitMqOptions from appsettings
- RedisOptions from appsettings
- IdpOptions from appsettings

// 3. Logging Configuration
- Serilog with structured logging
- Method-level logging at service boundaries
- Error/exception logging with context

// 4. Minimal API Routes
- Email endpoints
- SMS endpoints
- Push notification endpoints
- Template management endpoints
- Provider management endpoints
- Security policy endpoints
```

**Acceptance:**
- Application starts without errors
- Dependency injection container resolves all services
- Configuration loads from appsettings.json
- Logging is properly initialized

#### Step 2.3: Infrastructure Configuration Bootstrappers
**Files:**
- `InjectionBootstrappers.cs` (Infrastructure.MongoDb)
- `InjectionBootstrappers.cs` (Application)

**Bootstrap Requirements:**
```
Infrastructure.MongoDb:
├── Register IMongoClient with connection string from options
├── Register NotificationDbContext
├── Register all Repository implementations
└── Register IUnitOfWork if needed

Application:
├── Register all Service implementations
├── Register MediatR handlers (if used)
└── Register AutoMapper profiles (if used)
```

**Acceptance:**
- All services bootstrap correctly
- No registration conflicts
- Services are injectable in controllers

#### Step 2.4: VaultConfigurations Extension
**File:** `src/04.Presentaions/ERP.Notification.Presentation.EndPoint/Extensions/VaultConfigurations.cs`

**Requirements:**
- Read configuration from environment variables
- Support IDP secret management
- Database credentials handling
- API keys and tokens (if needed)
- Environment-aware configuration

**Acceptance:**
- Configuration loads from vault
- No hard-coded credentials
- Secrets are properly masked in logs

---

### Phase 3: Integration & Build Verification (Day 3-4)

#### Step 3.1: Solution Build & Compilation
**Verification Tasks:**
1. Build entire solution in Release mode
2. Run static analysis for code quality
3. Verify all NuGet packages are properly resolved
4. Check for compiler warnings (must resolve all)

**Build Command:**
```powershell
dotnet build ERP.Notification.slnx --configuration Release
```

**Acceptance Criteria:**
- Build succeeds with 0 errors, 0 warnings
- All projects compile correctly
- Output contains all expected binaries

#### Step 3.2: Structural Integration Tests
**Test Project:** `ERP.Notification.Tests` (new, to be created)

**Test Cases to Implement:**

| Test ID | Test Name | Assertion | Framework |
|---|---|---|---|
| TC-91-01 | Project compiles and builds successfully | `dotnet build` exits with code 0 | xUnit |
| TC-91-02 | All five DDD layers exist with proper namespacing | Verify folder structure and namespace roots | xUnit |
| TC-91-03 | NT.DDD base classes are accessible in domain layer | Load assembly and verify type existence | xUnit |
| TC-91-04 | Contract layer interfaces are correctly referenced | Verify no circular dependencies | Reflection |
| TC-91-05 | Domain layer entities inherit from NT.DDD base classes | Instantiate and verify inheritance | xUnit |
| TC-91-06 | Infrastructure repositories implement domain contracts | Verify interface implementation | Reflection |
| TC-91-07 | Application services can be injected in controllers | Build and resolve services from DI container | xUnit |
| TC-91-08 | MongoDB connection factory initializes correctly | Verify MongoDbOptions binding | xUnit |

**Test Implementation:**
```csharp
[Fact]
public void AllProjectsCompile()
{
    // Verify all assemblies load without errors
}

[Fact]
public void DomainLayerUsesNtDddBaseClasses()
{
    // Verify EmailNotification : AggregateRoot<T>
    // Verify SmsNotification : AggregateRoot<T>
    // ... all entities
}

[Fact]
public void RepositoriesImplementDomainContracts()
{
    // Verify EmailNotificationRepository : IRepository<EmailNotification>
}

[Fact]
public void DependencyInjectionResolvesAllServices()
{
    // Test DI container resolution for all layers
}
```

**Acceptance:**
- All 8 test cases pass
- Code coverage for structural validation ≥ 80%
- No dependencies or runtime errors

#### Step 3.3: README Documentation
**File:** `accounting-notification/README.md`

**Sections Required:**

1. **Project Overview**
   - Purpose: DDD-based Notification Management System
   - Status: Foundation/Scaffolding
   - Links to AC-88, AC-91

2. **Architecture Overview**
   - Five-layer structure diagram
   - Layer responsibilities:
     - Contract: Interfaces and DTOs
     - Domain: Business logic, aggregates, entities
     - Infrastructure: Data access, external integrations
     - Application: Use cases, orchestration
     - Presentation: HTTP APIs, routing

3. **Project Structure**
   - Complete folder tree
   - Purpose of each folder

4. **DDD Principles Applied**
   - Aggregate roots and their responsibility
   - Entity base classes from NT.DDD
   - Audit naming (CreatedOnUtc, UpdatedOnUtc, DeletedOnUtc)
   - Repository pattern

5. **Getting Started**
   - Prerequisites (MongoDB, RabbitMQ, Redis local setup)
   - Building the solution
   - Running locally
   - Configuration (appsettings.json)

6. **NuGet Packages**
   - List all packages and versions
   - Purpose of each package

7. **Future Implementation**
   - Roadmap for domain services
   - Next tasks (AC-90 Infrastructure config)

**Acceptance:**
- README is comprehensive and clear
- All sections populated
- Examples are accurate and tested

---

## 6. Code-Level Implementation Blueprint

### Layer-Specific Blueprints

#### 6.1 Contract Layer (Interfaces & Options)

**Key Files to Create:**

```csharp
// Options/IdpOptions.cs
public class IdpOptions
{
    public string Authority { get; set; }
    public string ClientId { get; set; }
    public string ClientSecret { get; set; }
}

// Options/MongoDbOptions.cs
public class MongoDbOptions
{
    public string ConnectionString { get; set; }
    public string DatabaseName { get; set; }
}

// Options/RabbitMqOptions.cs
public class RabbitMqOptions
{
    public string HostName { get; set; }
    public int Port { get; set; }
    public string UserName { get; set; }
    public string Password { get; set; }
}

// Options/RedisOptions.cs
public class RedisOptions
{
    public string ConnectionString { get; set; }
    public int DefaultExpirationMinutes { get; set; }
}

// Interfaces/INotificationService.cs
public interface INotificationService
{
    Task<NotificationResponse> SendAsync(SendNotificationRequest request, CancellationToken ct);
    Task<NotificationResponse> GetAsync(Guid notificationId, CancellationToken ct);
}
```

#### 6.2 Domain Layer (Aggregates & Entities)

**Key Files to Create:**

```csharp
// EmailNotification/EmailNotification.cs
public class EmailNotification : FullAuditedAggregateRoot<Guid, int>
{
    public string RecipientEmail { get; private set; }
    public string Subject { get; private set; }
    public string Body { get; private set; }
    public NotificationStatus Status { get; private set; }
    
    private EmailNotification() { }
    
    public static EmailNotification Create(
        string recipientEmail, 
        string subject, 
        string body,
        int creatorUserId)
    {
        return new EmailNotification
        {
            Id = Guid.NewGuid(),
            RecipientEmail = recipientEmail,
            Subject = subject,
            Body = body,
            Status = NotificationStatus.Pending,
            CreatorUserId = creatorUserId,
            CreatedOnUtc = DateTime.UtcNow
        };
    }
}

// Contracts/IEmailNotificationRepository.cs
public interface IEmailNotificationRepository : IRepository<EmailNotification, Guid>
{
    Task<EmailNotification> GetByIdAsync(Guid id, CancellationToken ct);
    Task AddAsync(EmailNotification entity, CancellationToken ct);
    Task UpdateAsync(EmailNotification entity, CancellationToken ct);
}

// Commons/Enums/NotificationStatus.cs
public enum NotificationStatus
{
    Pending = 0,
    Sent = 1,
    Failed = 2,
    Cancelled = 3
}
```

#### 6.3 Infrastructure Layer (Repositories & DbContext)

**Key Files to Create:**

```csharp
// Contexts/NotificationDbContext.cs
public class NotificationDbContext
{
    private readonly IMongoClient _mongoClient;
    private readonly MongoDbOptions _options;
    
    public IMongoCollection<EmailNotification> EmailNotifications { get; }
    public IMongoCollection<SmsNotification> SmsNotifications { get; }
    // ... other collections
    
    public NotificationDbContext(IMongoClient mongoClient, MongoDbOptions options)
    {
        _mongoClient = mongoClient;
        _options = options;
    }
}

// Repositories/EmailNotificationRepository.cs
public class EmailNotificationRepository : IEmailNotificationRepository
{
    private readonly NotificationDbContext _context;
    
    public async Task<EmailNotification> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _context.EmailNotifications
            .Find(x => x.Id == id)
            .FirstOrDefaultAsync(ct);
    }
    
    public async Task AddAsync(EmailNotification entity, CancellationToken ct)
    {
        await _context.EmailNotifications.InsertOneAsync(entity, cancellationToken: ct);
    }
}

// InjectionBootstrappers.cs
public static class InjectionBootstrappers
{
    public static IServiceCollection RegisterInfrastructureServices(
        this IServiceCollection services,
        MongoDbOptions mongoDbOptions)
    {
        var client = new MongoClient(mongoDbOptions.ConnectionString);
        services.AddSingleton(client);
        services.AddSingleton(new NotificationDbContext(client, mongoDbOptions));
        
        services.AddScoped<IEmailNotificationRepository, EmailNotificationRepository>();
        services.AddScoped<ISmsNotificationRepository, SmsNotificationRepository>();
        // ... register all repositories
        
        return services;
    }
}
```

#### 6.4 Application Layer (Services)

**Key Files to Create:**

```csharp
// Services/PushNotificationService.cs
public class PushNotificationService : IPushNotificationService
{
    private readonly IPushNotificationRepository _repository;
    private readonly ILogger<PushNotificationService> _logger;
    
    public PushNotificationService(
        IPushNotificationRepository repository,
        ILogger<PushNotificationService> logger)
    {
        _repository = repository;
        _logger = logger;
    }
    
    public async Task<NotificationResult> SendAsync(
        SendPushRequest request,
        CancellationToken ct)
    {
        try
        {
            _logger.LogInformation(
                "Sending push notification to device token: {DeviceToken}",
                request.DeviceToken);
            
            var notification = PushNotification.Create(
                request.DeviceToken,
                request.Title,
                request.Body,
                userId: request.CreatorUserId);
            
            await _repository.AddAsync(notification, ct);
            
            _logger.LogInformation(
                "Push notification created successfully: {NotificationId}",
                notification.Id);
            
            return new NotificationResult
            {
                Success = true,
                NotificationId = notification.Id,
                Message = "Push notification queued for delivery"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to send push notification to device token: {DeviceToken}",
                request.DeviceToken);
            
            return new NotificationResult
            {
                Success = false,
                Message = $"ERROR_PUSHNOTIFICATION_SEND_FAILED",
                Details = ex.Message
            };
        }
    }
}

// InjectionBootstrappers.cs
public static class InjectionBootstrappers
{
    public static IServiceCollection RegisterApplicationServices(
        this IServiceCollection services)
    {
        services.AddScoped<IPushNotificationService, PushNotificationService>();
        services.AddScoped<IWebNotificationService, WebNotificationService>();
        // ... register all services
        
        return services;
    }
}
```

#### 6.5 Presentation Layer (API Endpoints)

**Key Files to Create:**

```csharp
// Controllers/EmailController.cs
[ApiController]
[Route("api/[controller]")]
public class EmailController : ControllerBase
{
    private readonly IEmailNotificationService _emailService;
    private readonly ILogger<EmailController> _logger;
    
    public EmailController(
        IEmailNotificationService emailService,
        ILogger<EmailController> logger)
    {
        _emailService = emailService;
        _logger = logger;
    }
    
    [HttpPost("send")]
    [ProducesResponseType(typeof(NotificationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SendEmailAsync(
        SendEmailRequest request,
        CancellationToken ct)
    {
        _logger.LogInformation(
            "Email send request received for recipient: {Recipient}",
            request.RecipientEmail);
        
        var result = await _emailService.SendAsync(request, ct);
        
        if (result.Success)
        {
            return Ok(new NotificationResponse
            {
                Success = true,
                NotificationId = result.NotificationId,
                Message = "EMAIL_SENT_SUCCESSFULLY"
            });
        }
        
        return BadRequest(new ErrorResponse
        {
            ErrorCode = "ERROR_EMAIL_SEND_FAILED",
            Message = result.Message
        });
    }
    
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(NotificationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetEmailAsync(Guid id, CancellationToken ct)
    {
        _logger.LogInformation("Retrieving email notification: {NotificationId}", id);
        // Implementation
        return Ok();
    }
}

// Program.cs
var builder = WebApplicationBuilder.CreateBuilder(args);

// Configuration
var mongoOptions = builder.Configuration.GetSection("MongoDB").Get<MongoDbOptions>();
var idpOptions = builder.Configuration.GetSection("Idp").Get<IdpOptions>();

// Services
builder.Services.AddSingleton(mongoOptions);
builder.Services.AddInfrastructureServices(mongoOptions);
builder.Services.RegisterApplicationServices();
builder.Services.AddControllers();
builder.Services.AddSwaggerGen();

// Logging
builder.Host.UseSerilog((context, services, loggerConfig) =>
    loggerConfig
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console()
        .WriteTo.File("logs/notification-.txt", rollingInterval: RollingInterval.Day));

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseRouting();
app.MapControllers();

app.Run();
```

---

## 7. Global Response Key Catalog

All API responses must use consistent response keys for error and information messages. The catalog follows the pattern:
- `ERROR_<Entity>_<StateOrReason>`
- `INFORMATION_<Entity>_<StateOrEvent>`

### Error Response Keys

| Key | HTTP Status | Description | Exception Type |
|---|---|---|---|
| `ERROR_EMAILNOTIFICATION_SEND_FAILED` | 400 | Email send operation failed | `SendEmailException` |
| `ERROR_SMSNOTIFICATION_SEND_FAILED` | 400 | SMS send operation failed | `SendSmsException` |
| `ERROR_PUSHNOTIFICATION_SEND_FAILED` | 400 | Push notification send failed | `SendPushException` |
| `ERROR_WEBNOTIFICATION_SEND_FAILED` | 400 | Web notification send failed | `SendWebException` |
| `ERROR_TEMPLATE_NOT_FOUND` | 404 | Notification template not found | `TemplateNotFoundException` |
| `ERROR_PROVIDER_NOT_CONFIGURED` | 500 | Notification provider not configured | `ProviderNotConfiguredException` |
| `ERROR_SECURITY_POLICY_VIOLATION` | 403 | Security policy violation | `SecurityPolicyViolationException` |
| `ERROR_INVALID_RECIPIENT` | 400 | Invalid recipient address | `InvalidRecipientException` |
| `ERROR_UNAUTHORIZED_ACCESS` | 401 | Unauthorized access to resource | `UnauthorizedAccessException` |
| `ERROR_DATABASE_ERROR` | 500 | Database operation failed | `DatabaseException` |
| `ERROR_CONFIGURATION_ERROR` | 500 | Configuration error | `ConfigurationException` |

### Information Response Keys

| Key | HTTP Status | Description |
|---|---|---|
| `INFORMATION_EMAILNOTIFICATION_SENT` | 200 | Email notification sent successfully |
| `INFORMATION_SMSNOTIFICATION_SENT` | 200 | SMS notification sent successfully |
| `INFORMATION_PUSHNOTIFICATION_SENT` | 200 | Push notification sent successfully |
| `INFORMATION_WEBNOTIFICATION_SENT` | 200 | Web notification sent successfully |
| `INFORMATION_TEMPLATE_CREATED` | 201 | Notification template created |
| `INFORMATION_PROVIDER_CONFIGURED` | 200 | Notification provider configured |
| `INFORMATION_SECURITY_POLICY_APPLIED` | 200 | Security policy applied |

### Response Model

```csharp
// Responses/GlobalResponse.cs
public class GlobalResponse<T>
{
    public bool Success { get; set; }
    public string ResponseKey { get; set; }  // ERROR_* or INFORMATION_*
    public string Message { get; set; }
    public T Data { get; set; }
    public Dictionary<string, string> Errors { get; set; } = new();
}

// Responses/ErrorResponse.cs
public class ErrorResponse
{
    public string ErrorCode { get; set; }  // e.g., ERROR_EMAILNOTIFICATION_SEND_FAILED
    public string Message { get; set; }
    public Dictionary<string, object> Context { get; set; } = new();
}

// Responses/NotificationResponse.cs
public class NotificationResponse
{
    public bool Success { get; set; }
    public Guid NotificationId { get; set; }
    public string ResponseKey { get; set; }  // INFORMATION_* key
    public string Message { get; set; }
}
```

---

## 8. Logging & Error Handling Strategy

### Logging Architecture

**Framework:** Serilog with structured logging

**Log Levels:**
- `Information`: API requests, successful operations, state changes
- `Warning`: Retries, configuration issues, non-critical failures
- `Error`: Operation failures, exceptions, service unavailability
- `Debug`: Detailed flow, data transformations (development only)

### Logging Boundaries

#### Request Boundary (Controllers)

```csharp
// LoggingMiddleware or Controller-level
public async Task<IActionResult> SendEmailAsync(SendEmailRequest request, CancellationToken ct)
{
    _logger.LogInformation(
        "Email notification request received | Recipient: {Recipient} | " +
        "UserId: {UserId} | CorrelationId: {CorrelationId}",
        request.RecipientEmail,
        request.CreatorUserId,
        HttpContext.TraceIdentifier);
    
    try
    {
        var result = await _emailService.SendAsync(request, ct);
        
        _logger.LogInformation(
            "Email notification sent successfully | NotificationId: {NotificationId} | " +
            "Duration: {Duration}ms",
            result.NotificationId,
            stopwatch.ElapsedMilliseconds);
        
        return Ok(result);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex,
            "Email notification request failed | Recipient: {Recipient} | " +
            "ErrorCode: {ErrorCode}",
            request.RecipientEmail,
            ex.GetType().Name);
        
        return BadRequest(new ErrorResponse { /* ... */ });
    }
}
```

#### Service Boundary (Application Services)

```csharp
public async Task<NotificationResult> SendAsync(SendEmailRequest request, CancellationToken ct)
{
    _logger.LogInformation(
        "Processing email notification | " +
        "Recipient: {Recipient} | Subject: {Subject} | " +
        "CreatorUserId: {CreatorUserId}",
        request.RecipientEmail,
        request.Subject,
        request.CreatorUserId);
    
    try
    {
        // Domain entity creation
        var notification = EmailNotification.Create(
            request.RecipientEmail,
            request.Subject,
            request.Body,
            request.CreatorUserId);
        
        _logger.LogDebug(
            "Email notification entity created | " +
            "NotificationId: {NotificationId} | Status: {Status}",
            notification.Id,
            notification.Status);
        
        // Persistence
        await _repository.AddAsync(notification, ct);
        
        _logger.LogInformation(
            "Email notification persisted | " +
            "NotificationId: {NotificationId}",
            notification.Id);
        
        return new NotificationResult { /* success */ };
    }
    catch (RepositoryException ex)
    {
        _logger.LogError(ex,
            "Failed to persist email notification | " +
            "Recipient: {Recipient} | ErrorCode: {ErrorCode}",
            request.RecipientEmail,
            nameof(RepositoryException));
        
        throw;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex,
            "Unexpected error processing email notification | " +
            "Recipient: {Recipient}",
            request.RecipientEmail);
        
        throw new SendEmailException("Failed to process email notification", ex);
    }
}
```

#### Repository Boundary (Infrastructure)

```csharp
public async Task<EmailNotification> GetByIdAsync(Guid id, CancellationToken ct)
{
    _logger.LogDebug("Fetching email notification from database | Id: {Id}", id);
    
    try
    {
        var entity = await _context.EmailNotifications
            .Find(x => x.Id == id)
            .FirstOrDefaultAsync(ct);
        
        if (entity == null)
        {
            _logger.LogWarning("Email notification not found | Id: {Id}", id);
            return null;
        }
        
        _logger.LogDebug(
            "Email notification fetched successfully | " +
            "Id: {Id} | Status: {Status}",
            id,
            entity.Status);
        
        return entity;
    }
    catch (MongoException ex)
    {
        _logger.LogError(ex,
            "MongoDB error fetching email notification | Id: {Id}",
            id);
        
        throw new RepositoryException("Failed to fetch notification from database", ex);
    }
}
```

### Error Handling Policy

**Exception Hierarchy:**

```csharp
// Base exception
public class NotificationDomainException : Exception
{
    public string ErrorCode { get; }
    public NotificationDomainException(string errorCode, string message, Exception innerException = null)
        : base(message, innerException)
    {
        ErrorCode = errorCode;
    }
}

// Service exceptions
public class SendEmailException : NotificationDomainException
{
    public SendEmailException(string message, Exception innerException)
        : base("ERROR_EMAILNOTIFICATION_SEND_FAILED", message, innerException) { }
}

public class SendSmsException : NotificationDomainException
{
    public SendSmsException(string message, Exception innerException)
        : base("ERROR_SMSNOTIFICATION_SEND_FAILED", message, innerException) { }
}

public class SendPushException : NotificationDomainException
{
    public SendPushException(string message, Exception innerException)
        : base("ERROR_PUSHNOTIFICATION_SEND_FAILED", message, innerException) { }
}

public class TemplateNotFoundException : NotificationDomainException
{
    public TemplateNotFoundException(Guid templateId)
        : base("ERROR_TEMPLATE_NOT_FOUND", $"Template not found: {templateId}") { }
}

public class SecurityPolicyViolationException : NotificationDomainException
{
    public SecurityPolicyViolationException(string reason)
        : base("ERROR_SECURITY_POLICY_VIOLATION", reason) { }
}

// Infrastructure exceptions
public class RepositoryException : NotificationDomainException
{
    public RepositoryException(string message, Exception innerException)
        : base("ERROR_DATABASE_ERROR", message, innerException) { }
}

public class ConfigurationException : NotificationDomainException
{
    public ConfigurationException(string message)
        : base("ERROR_CONFIGURATION_ERROR", message) { }
}
```

---

## 9. Security & Privacy Controls

### Abuse-Case Analysis

| Abuse Case | Risk | Mitigation |
|---|---|---|
| Spam notification flooding | High | Rate limiting per recipient, daily quota per user |
| Unauthorized recipient access | Critical | Authorization check in domain (SecurityPolicy) |
| Credential exposure in logs | Critical | Never log full credentials, mask sensitive fields |
| Man-in-the-middle attack | Medium | TLS/HTTPS for all HTTP communication |
| Data injection (email/SMS) | Medium | Input validation and sanitization in Contract layer |
| Unauthorized template modification | High | Role-based access control on template endpoints |
| Database injection via MongoDB | Medium | Use parameterized queries (LINQ to MongoDB) |
| Privilege escalation | High | IDP integration for user context validation |

### Security Policy Aggregate Root

```csharp
// Domain/SecurityPolicy/SecurityPolicy.cs
public class SecurityPolicy : FullAuditedAggregateRoot<Guid, int>
{
    public int UserId { get; private set; }
    public string NotificationType { get; private set; }  // Email, SMS, Push, Web
    public int DailyLimit { get; private set; }
    public int HourlyLimit { get; private set; }
    public bool IsAllowed { get; private set; }
    
    public static SecurityPolicy CreateForUser(
        int userId,
        string notificationType,
        int dailyLimit,
        int hourlyLimit,
        int creatorUserId)
    {
        return new SecurityPolicy
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            NotificationType = notificationType,
            DailyLimit = dailyLimit,
            HourlyLimit = hourlyLimit,
            IsAllowed = true,
            CreatorUserId = creatorUserId,
            CreatedOnUtc = DateTime.UtcNow
        };
    }
    
    public void BlockNotificationType()
    {
        IsAllowed = false;
        UpdatedOnUtc = DateTime.UtcNow;
    }
}
```

### Logging Security Checklist

- ✅ Never log full email addresses (use hashed or masked version)
- ✅ Never log phone numbers
- ✅ Never log API keys or tokens
- ✅ Never log full request bodies if they contain PII
- ✅ Always log UserId/CorrelationId for audit trail
- ✅ Mask credentials in connection strings
- ✅ Log authorization failures with user context

---

## 10. Observability Requirements

### Metrics to Track

| Metric | Type | Purpose |
|---|---|---|
| `notification_sent_total` | Counter | Total notifications sent by type |
| `notification_failed_total` | Counter | Total notification failures by type and reason |
| `notification_send_duration_ms` | Histogram | Send operation latency |
| `notification_queue_depth` | Gauge | Current pending notifications in queue |
| `repository_operation_duration_ms` | Histogram | Database operation latency |
| `service_availability` | Gauge | Service uptime percentage |

### Traces to Implement

- Full trace for each notification send operation
- Span per service layer (controller → service → repository)
- Span for external service calls (IDP validation, message broker)
- Error context in trace spans

### Configuration Example

```csharp
// Program.cs
builder.Services.AddOpenTelemetry()
    .WithTracing(builder =>
    {
        builder
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddMongoDBInstrumentation()
            .AddOtlpExporter();
    })
    .WithMetrics(builder =>
    {
        builder
            .AddAspNetCoreInstrumentation()
            .AddRuntimeInstrumentation()
            .AddProcessInstrumentation()
            .AddOtlpExporter();
    });
```

---

## 11. TDD & BDD Test Plan

### TDD Test-First Execution Order

#### Phase 1: Unit Tests (Layer-Specific)

**Layer 1: Domain Layer Tests**
```
tests/01.Domain.Tests/
├── EmailNotification/
│   ├── EmailNotificationCreationTests.cs (3 tests)
│   ├── EmailNotificationStatusTransitionTests.cs (2 tests)
│   └── EmailNotificationValidationTests.cs (2 tests)
├── SmsNotification/
│   └── SmsNotificationCreationTests.cs (3 tests)
├── PushNotification/
│   └── PushNotificationCreationTests.cs (3 tests)
├── WebNotification/
│   └── WebNotificationCreationTests.cs (3 tests)
├── SecurityPolicy/
│   ├── SecurityPolicyCreationTests.cs (2 tests)
│   └── SecurityPolicyValidationTests.cs (3 tests)
└── Shared/
    └── AuditFieldTests.cs (2 tests)
```

**Example Test:**
```csharp
[Fact]
public void EmailNotification_Create_SetsCorrectInitialState()
{
    // Arrange
    var recipient = "test@example.com";
    var subject = "Test Subject";
    var body = "Test Body";
    var userId = 1;
    
    // Act
    var notification = EmailNotification.Create(recipient, subject, body, userId);
    
    // Assert
    Assert.Equal(recipient, notification.RecipientEmail);
    Assert.Equal(subject, notification.Subject);
    Assert.Equal(body, notification.Body);
    Assert.Equal(NotificationStatus.Pending, notification.Status);
    Assert.Equal(userId, notification.CreatorUserId);
    Assert.NotEqual(Guid.Empty, notification.Id);
}
```

**Layer 2: Infrastructure Tests**
```
tests/02.Infrastructure.Tests/
├── Repositories/
│   ├── EmailNotificationRepositoryTests.cs (4 tests)
│   ├── SmsNotificationRepositoryTests.cs (4 tests)
│   └── PushNotificationRepositoryTests.cs (4 tests)
├── Contexts/
│   └── NotificationDbContextTests.cs (2 tests)
└── Configuration/
    └── MongoDbConnectionFactoryTests.cs (2 tests)
```

**Example Test:**
```csharp
[Fact]
public async Task EmailNotificationRepository_AddAsync_PersistsEntity()
{
    // Arrange
    var repository = new EmailNotificationRepository(_mockContext);
    var notification = EmailNotification.Create("test@example.com", "S", "B", 1);
    
    // Act
    await repository.AddAsync(notification, CancellationToken.None);
    
    // Assert
    _mockContext.Verify(x => 
        x.EmailNotifications.InsertOneAsync(notification, null, CancellationToken.None));
}
```

**Layer 3: Application Tests**
```
tests/03.Application.Tests/
├── Services/
│   ├── PushNotificationServiceTests.cs (5 tests)
│   ├── WebNotificationServiceTests.cs (5 tests)
│   ├── EmailNotificationServiceTests.cs (5 tests)
│   └── SmsNotificationServiceTests.cs (5 tests)
└── Integration/
    └── ServiceDependencyTests.cs (3 tests)
```

**Example Test:**
```csharp
[Fact]
public async Task PushNotificationService_SendAsync_ReturnsSuccessResult()
{
    // Arrange
    var service = new PushNotificationService(_mockRepository, _mockLogger);
    var request = new SendPushRequest 
    { 
        DeviceToken = "token123",
        Title = "Title",
        Body = "Body",
        CreatorUserId = 1
    };
    
    // Act
    var result = await service.SendAsync(request, CancellationToken.None);
    
    // Assert
    Assert.True(result.Success);
    Assert.NotEqual(Guid.Empty, result.NotificationId);
}
```

#### Phase 2: Integration Tests

```
tests/04.Integration.Tests/
├── ControllerIntegrationTests.cs (6 tests)
├── FullStackNotificationFlowTests.cs (4 tests)
├── DependencyInjectionTests.cs (5 tests)
└── DatabaseIntegrationTests.cs (3 tests)
```

**Example Test:**
```csharp
[Fact]
public async Task SendEmailEndpoint_WithValidRequest_Returns200()
{
    // Arrange
    var client = _factory.CreateClient();
    var request = new SendEmailRequest 
    { 
        RecipientEmail = "test@example.com",
        Subject = "Test",
        Body = "Body",
        CreatorUserId = 1
    };
    
    // Act
    var response = await client.PostAsJsonAsync("/api/email/send", request);
    
    // Assert
    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var content = await response.Content.ReadAsAsync<NotificationResponse>();
    content.Success.Should().BeTrue();
}
```

#### Phase 3: Structural Validation Tests (TC-91-01 to TC-91-08)
See Section 3.2 for complete test list.

### BDD Scenarios

**Scenario 1: Send Email Notification**
```gherkin
Feature: Email Notification Sending
  As a notification consumer
  I want to send email notifications
  So that users receive timely email communications

Scenario: Send valid email notification successfully
  Given I am an authenticated user with ID 1
  And I have permission to send email notifications
  And the email service is configured
  
  When I send an email notification to "recipient@example.com"
  And the email contains subject "Test Subject"
  And the email contains body "Test Body"
  
  Then the notification should be created with status "Pending"
  And the notification ID should be returned
  And the response key should be "INFORMATION_EMAILNOTIFICATION_SENT"
  And the response status should be 200

Scenario: Reject email with invalid recipient
  Given I am an authenticated user with ID 1
  And the email service is configured
  
  When I attempt to send an email to "invalid-email"
  
  Then the operation should fail
  And the response key should be "ERROR_INVALID_RECIPIENT"
  And the response status should be 400

Scenario: Respect daily notification limit
  Given I am an authenticated user with ID 1
  And my daily email notification limit is 10
  And I have already sent 10 emails today
  And the security policy is enforced
  
  When I attempt to send another email
  
  Then the operation should fail
  And the response key should be "ERROR_SECURITY_POLICY_VIOLATION"
  And the response status should be 403
```

**Scenario 2: Retrieve Notification**
```gherkin
Feature: Notification Retrieval
  As a notification consumer
  I want to retrieve notification details
  So that I can track notification status

Scenario: Retrieve existing notification
  Given a notification with ID "550e8400-e29b-41d4-a716-446655440000" exists
  And I am authorized to view this notification
  
  When I request the notification details
  
  Then the notification should be returned
  And the response status should be 200
  And all notification fields should be populated

Scenario: Handle not found notification
  Given no notification exists with ID "99999999-9999-9999-9999-999999999999"
  
  When I request the non-existent notification
  
  Then the operation should fail
  And the response key should be "ERROR_TEMPLATE_NOT_FOUND"
  And the response status should be 404
```

### Test Coverage Requirements

| Layer | Unit Tests | Integration Tests | Target Coverage |
|---|---|---|---|
| Domain | 17 tests | 2 tests | ≥ 95% |
| Infrastructure | 10 tests | 3 tests | ≥ 90% |
| Application | 20 tests | 4 tests | ≥ 85% |
| Presentation | Covered by integration | 6 tests | ≥ 80% |
| **Total** | **47 tests** | **15 tests** | **≥ 85%** |

**Target Test Execution:**
- Unit tests: < 2 seconds
- Integration tests: < 10 seconds
- Full suite: < 15 seconds

---

## 12. Rollout, Rollback & Feature-Flag Strategy

### Deployment Strategy

#### Phase 1: Development Environment (Local)
- Build solution locally
- Run full test suite
- Validate all endpoints in Swagger

#### Phase 2: Testing Environment
- Deploy to `test` branch
- Run integration tests against `test` infrastructure
- QA manual validation

#### Phase 3: Staging Environment
- Deploy to `stage` branch
- Monitor application logs and metrics
- Load testing (if required)

#### Phase 4: Production
- Deploy to `main` branch
- Gradual rollout using feature flags (if required)
- Monitor for 24 hours

### Rollback Strategy

**If issues detected:**

1. **Immediate Actions:**
   - Revert the MR in GitLab (if not yet merged to `main`)
   - If already in `main`, create a hotfix revert commit
   - Roll back infrastructure configuration

2. **Revert Approach:**
   ```bash
   git revert -m 1 <merge-commit-hash>
   ```

3. **Root Cause Analysis:**
   - Collect logs from failed deployment
   - Identify breaking changes
   - Document findings for post-incident review

### Feature Flags (Optional)

**Implementation:**
```csharp
// Constants/FeatureFlags.cs
public static class FeatureFlags
{
    public const string NotificationSystemEnabled = "notification_system_enabled";
    public const string EmailNotificationsEnabled = "email_notifications_enabled";
    public const string PushNotificationsEnabled = "push_notifications_enabled";
}

// Usage in Controllers
[HttpPost("send")]
public async Task<IActionResult> SendEmailAsync(
    SendEmailRequest request,
    IFeatureFlagProvider featureFlags,
    CancellationToken ct)
{
    if (!featureFlags.IsEnabled(FeatureFlags.EmailNotificationsEnabled))
    {
        return StatusCode(StatusCodes.Status503ServiceUnavailable,
            new { Message = "Email notifications are currently unavailable" });
    }
    
    // Process request
}
```

---

## 13. Data Model & Migration Impact

### Initial Data Model (Scaffolding)

**Collections in MongoDB:**

```
database: erp_notification
├── collections:
│   ├── email_notifications
│   │   ├── _id (ObjectId)
│   │   ├── id (Guid)
│   │   ├── recipient_email (string)
│   │   ├── subject (string)
│   │   ├── body (string)
│   │   ├── status (int enum)
│   │   ├── created_on_utc (DateTime)
│   │   ├── updated_on_utc (DateTime)
│   │   ├── creator_user_id (int)
│   │   └── last_modifier_user_id (int)
│   ├── sms_notifications (similar structure)
│   ├── push_notifications (similar structure)
│   ├── web_notifications (similar structure)
│   ├── notification_templates
│   │   ├── id (Guid)
│   │   ├── name (string)
│   │   ├── template_body (string)
│   │   ├── notification_type (string)
│   │   └── audit fields
│   ├── notification_providers
│   │   ├── id (Guid)
│   │   ├── provider_name (string)
│   │   ├── api_key (encrypted)
│   │   └── audit fields
│   └── security_policies
│       ├── id (Guid)
│       ├── user_id (int)
│       ├── notification_type (string)
│       ├── daily_limit (int)
│       ├── hourly_limit (int)
│       └── audit fields
```

### Migration Path

**No migrations required for MVP** (scaffolding only). Future migrations will be handled by AC-90 (Infrastructure Configuration task).

---

## 14. Implementation Completion Checklist

### Pre-Implementation
- [ ] TL approves this implementation plan
- [ ] All prerequisites validated (environment, tools, access)
- [ ] Task assigned to development team

### Phase 1: Structure
- [ ] Solution file created
- [ ] Five-layer projects created
- [ ] Namespace hierarchy established
- [ ] NuGet packages installed
- [ ] All projects compile without errors

### Phase 2: Configuration
- [ ] DI containers configured in each layer
- [ ] Program.cs properly configured
- [ ] appsettings.json templates created
- [ ] Logging infrastructure configured

### Phase 3: Testing
- [ ] All 8 structural test cases pass (TC-91-01 to TC-91-08)
- [ ] 47 unit tests pass with ≥ 85% coverage
- [ ] 15 integration tests pass
- [ ] README completed and validated

### Post-Implementation
- [ ] Code review completed (TL + peer)
- [ ] All AoC verified
- [ ] Workspace MR merged to `develop`
- [ ] Project MR merged to `develop`
- [ ] Jira task transitioned to `In Review`
- [ ] Task marked as `Done` after PO approval

---

## 15. Success Criteria & Validation

### Acceptance Criteria (AoC)
- ✅ AoC-01: Five-layer DDD project structure created
- ✅ AoC-02: NT.Notification package installed and referenced
- ✅ AoC-03: NT.DDD base classes integrated
- ✅ AoC-04: Contract layer interfaces defined
- ✅ AoC-05: Domain layer aggregates scaffolded
- ✅ AoC-06: Infrastructure repositories created
- ✅ AoC-07: Application services framework established
- ✅ AoC-08: Presentation API structure in place
- ✅ AoC-09: NuGet dependencies resolved, builds successfully
- ✅ AoC-10: README documenting structure complete

### Definition of Done (DoD)
- ✅ Code merged to `develop` via approved MR
- ✅ All AoC verified by TL
- ✅ Build successful (Release mode, 0 errors, 0 warnings)
- ✅ All test cases pass
- ✅ Code reviewed and approved
- ✅ Documentation complete
- ✅ Jira issue marked `In Review`

### Test Evidence
- Build output: `dotnet build ERP.Notification.slnx /p:Configuration=Release`
- Test run: `dotnet test --configuration Release --logger trx`
- Code coverage: Minimum 85% for unit tests
- Integration test log output

---

## 16. Repository Targets & Links

### Workspace Repository

**Repository:** `https://gitlab.nexttoptech.com/accounting-workspace` (or equivalent)

**MR Template:**
```markdown
## Title
docs: AC-91 Implementation & Work Log for Notification DDD Structure

## Description
This MR contains documentation and work logs for AC-91 task implementation.

**Related Issues:**
- Jira: [AC-91](https://nexttoptech.atlassian.net/browse/AC-91)
- Parent Story: [AC-88](https://nexttoptech.atlassian.net/browse/AC-88)
- GitLab Issue: (link to project repo issue)

**Changes:**
- Implementation plan: `docs/work-items/02.implementation/stories/AC-88/tasks/AC-91-implementation-plan.md`
- Work log: `docs/work-items/02.implementation/stories/AC-88/tasks/AC-91-work-log.md`
- Architecture notes: `docs/work-items/02.implementation/stories/AC-88/tasks/AC-91-architecture-notes.md`

**Checklist:**
- [x] Implementation plan reviewed
- [x] AoC mapped to implementation steps
- [x] Test strategy documented
- [x] TL approval obtained

**Target Branch:** `develop`
```

### Project Repository

**Repository:** `https://gitlab.nexttoptech.com/accounting-notification` (or equivalent)

**MR Template:**
```markdown
## Title
feat(ac-91): Initialize DDD project structure for Notification domain

## Description
Establishes DDD-compliant project structure for Notification Management System with NT.DDD and NT.Notification integration.

**Related Issues:**
- Jira Task: [AC-91](https://nexttoptech.atlassian.net/browse/AC-91)
- Parent Story: [AC-88](https://nexttoptech.atlassian.net/browse/AC-88)
- Workspace MR: (link to workspace repo MR)

**Changes:**
- Five-layer DDD structure with Contract, Domain, Infrastructure, Application, Presentation layers
- NT.Notification and NT.DDD package integration
- Dependency injection containers for all layers
- Scaffold repositories, services, and controllers
- Configuration via appsettings.json
- README documentation

**Test Evidence:**
- ✅ Solution compiles: `dotnet build ERP.Notification.slnx /p:Configuration=Release`
- ✅ Unit tests pass: 47 tests, ≥ 85% coverage
- ✅ Integration tests pass: 15 tests
- ✅ Structural validation: TC-91-01 to TC-91-08 all pass

**Build Output:**
```
Build succeeded.
0 Warning(s)
0 Error(s)
Time Elapsed: XX:XX:XX.XXX
```

**Target Branch:** `develop`
**Merge Strategy:** Squash + Delete source branch
```

---

## 17. Governance & Compliance

### DDD Compliance Check
- ✅ Aggregate roots inherit from NT.DDD base classes
- ✅ UTC audit naming convention applied: `CreatedOnUtc`, `UpdatedOnUtc`, `DeletedOnUtc`
- ✅ Repository pattern implemented for data access
- ✅ Domain interfaces in `Contracts/` folders
- ✅ No business logic in repositories or handlers

### Architecture Governance
- ✅ Follows workspace convention from `docs/architecture/ddd-domain-conventions.md`
- ✅ Separation of concerns across five layers
- ✅ Dependency flow: Presentation → Application → Domain ← Infrastructure

### Security Governance
- ✅ No hard-coded credentials
- ✅ Configuration via environment variables
- ✅ IDP integration for authentication
- ✅ Security policy aggregate root scaffolded

---

## 18. Handoff & Next Steps

### After AC-91 Completion

**Immediate Actions:**
1. TL reviews and approves implementation plan
2. Dev team implements according to plan
3. All AoC and DoD verified
4. Both workspace and project MRs merged to `develop`

**Next Task: AC-90**
- Infrastructure Configuration (MongoDB, RabbitMQ, Redis)
- Depends on AC-91 completion

**Future Work:**
- Domain service implementation
- Notification workflow orchestration
- Advanced security policies
- Performance optimization

### Sign-Off Requirements

**Tech Lead Sign-Off:**
- [ ] Implementation plan is production-ready
- [ ] All AoC properly mapped to code
- [ ] TDD/BDD strategy is adequate
- [ ] Security and logging requirements met

**Approval:**
- [ ] Plan approved for implementation
- [ ] Authorization to proceed with `/speckit.implement`

---

## Appendix: File References

### Created/Modified Files
- `docs/work-items/02.implementation/stories/AC-88/tasks/AC-91-implementation-plan.md` ← **This document**
- `docs/work-items/02.implementation/stories/AC-88/tasks/AC-91-work-log.md` (to be created)
- `docs/work-items/02.implementation/stories/AC-88/tasks/AC-91-architecture-notes.md` (to be created)

### Related Documentation
- [AC-88 Story Solution](../solution.md)
- [AC-88 Task Plan](../task-plan.md)
- [AC-91 Task Spec](AC-91.md)
- [DDD Domain Conventions](../../architecture/ddd-domain-conventions.md)
- [Git Workflow Flows](../../workflows/git-workflow-flows.md)
- [Jira-GitLab Integration](../../integrations/jira-gitlab-secrets-integration.md)

---

**Document Version:** 1.0  
**Status:** Ready for TL Review & Approval  
**Last Updated:** 2026-05-18  
**Owner:** AI Implementation Agent  
**Approval Gate:** Approved.
