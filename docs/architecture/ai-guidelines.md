# AI Agent Coding Guidelines
Project: Accounting v0
Architecture: Modular Monolith + Vertical Slice + CQRS
Status: Mandatory Rules

This document defines NON-NEGOTIABLE coding rules for AI agents contributing to this repository.

If any rule conflicts with generated output, the rule ALWAYS wins.

Localization reference (mandatory):

- `docs/architecture/localization-architecture-engineering-guidelines.md`

Security reference (mandatory):

- `docs/architecture/security-implementation-review-rules.md`

---

# 0. AI Generation And Review Quality Principles

The following principles are mandatory for both:

- AI code generation
- AI code review

Required engineering principles:

- DRY: avoid duplicated logic, duplicated validation, and duplicated mapping code.
- SOLID: keep responsibilities focused, depend on abstractions where architecture allows, and avoid god classes.
- KISS: choose the simplest implementation that satisfies requirements and constraints.
- Prefer modern .NET/C# language features when they improve clarity and maintainability.

Modern C# standards (mandatory where applicable):

- DTO types must be implemented as `record` (prefer `record class` for reference DTOs).
- Prefer primary constructors for simple dependency-only classes.
- Prefer one-line expression-bodied members for simple single-line methods.
- Prefer `foreach` for readable collection iteration when indexing is not required.

Required domain principle:

- DDD: use domain language, keep invariants near domain logic, and model behavior around business concepts.

Method input parameter standard (mandatory):

- Method parameters must be explicit, intention-revealing, and consistently named.
- Prefer strong types/value objects over ambiguous primitive chains when practical.
- Validate inputs at boundaries (endpoint/handler/service boundary as applicable).
- Avoid long unordered parameter lists; use request models for complex input payloads.
- Nullability and optionality must be explicit and intentional.

Review enforcement:

- Any violation of DRY, SOLID, KISS, DDD, or method input standards must be reported and fixed before completion.
- Any violation of modern C# standards (DTO record, constructor style, simple method style) must be reported and fixed before completion.
- Any localization violation (hard-coded user-facing text, non-key-based contracts, backend returning translated text) must be reported and fixed before completion.

General data and application rules (mandatory for generation and review):

- All read queries must use `AsNoTracking()` unless tracking is explicitly required.
- Read queries must project to DTO/view models; never return full EF entities for read APIs.
- Avoid `Include()` for large graphs; prefer explicit projection or separate queries.
- Lazy loading is forbidden.
- All list queries must enforce pagination (`Skip()` and `Take()`).
- Frequently used queries should use EF compiled queries.
- Write operations must use tracked entities with one `SaveChangesAsync()` per logical transaction.
- `SaveChangesAsync()` inside loops is forbidden; batch with `AddRange()` or bulk operations.
- Financial writes must run in a database transaction.
- Money must use `decimal` and mapped DB precision (for example `decimal(18,2)`). Never use `float`/`double` for money.
- Timestamps must be stored in UTC (`DateTime.UtcNow`).
- Important entities must use optimistic concurrency (`RowVersion`/timestamp).
- Controllers/endpoints must not contain business logic; delegate to application/domain services.
- Entities must never be exposed directly by APIs; return DTOs only.
- Use `ExecuteUpdateAsync()` and `ExecuteDeleteAsync()` for bulk mutations.
- Queries must be index-friendly; avoid non-sargable filters on indexed columns.
- Enable DB query logging in development.
- Heavy operations (reporting, fiscal close, ledger rebuild) must run as background jobs.
- Domain validation must run before financial persistence (for example debit must equal credit).
- Database access must be explicit, predictable, and minimal; hidden queries are forbidden.

Code example generation rules:

- Prefer async methods.
- Keep clear separation of concerns.
- Follow clean architecture practices.
- Optimize for performance and maintainability.
- Target production-grade quality suitable for financial/ERP systems.

---

# 1. Core Architectural Rules

1. DO NOT create a shared business domain layer.
2. DO NOT introduce cross-module database coupling.
3. DO NOT place business logic inside:
   - Endpoints
   - Handlers
   - Host project
4. Handlers MUST be thin orchestration layers.
5. Business rules MUST live inside Services or Domain classes.
6. Each feature MUST follow Vertical Slice structure.
7. Each module MUST remain independent.
8. SharedKernel must contain technical primitives only.
9. All user-facing text MUST be key-based localized according to the localization guideline.

---

# 2. Solution Structure Enforcement

Root folders:

/src
/tests

The folder structure inside `/tests` MUST mirror `/src`.

If a new Feature is added in:

/src/Modules/Ledgers/Features/CreateLedger

Then a corresponding test folder MUST exist in:

/tests/Modules/Ledgers/Features/CreateLedger

No exceptions.

---

# 3. Modular Monolith Rules

Each Module MUST:

- Own its entities
- Own its tables
- Own its DbContext configuration (if separate context used)
- Register its services via Module class
- Include a `Commons/` folder for module-local shared code
- Include a `Handlers/` folder for CQRS handlers and request handling

Domain structure standard (mandatory):

- Use `Domain/<EntityName>/` as the root per business entity.
- Under each entity root, organize as needed into:
  - `Entities/`
  - `Enums/`
  - `Aggregates/`
  - `Contracts/`

Commons structure standard (mandatory):

- `Commons/Helpers/` for reusable helper utilities inside the same module only.
- `Commons/Extensions/` for extension methods used by that module only.

Data access structure standard (mandatory):

- Repository implementations must live under `Infrastructure/Repositories/`
  (or `Infrastructures/Repositories/` where that naming already exists).
- DbContext classes must live under `Infrastructure/Contexts/`
  (or `Infrastructures/Contexts/` where that naming already exists).

Modules MUST NOT:

- Access another module's DbContext
- Directly join another module's tables
- Depend on another module's internal services

Allowed cross-module communication:

- Contracts
- Internal APIs
- Domain Events (in-process only)

---

# 4. CQRS and Handlers Rules

Every state-changing operation MUST be implemented as a Command.
Every read operation MUST be implemented as a Query.

Handlers MUST:

- Validate input (if not already validated)
- Act as facade/orchestrator for one use case
- Coordinate one or more independent services when needed
- Return result

Handlers MUST NOT:

- Contain domain rules
- Execute complex business calculations
- Directly access unrelated modules
- Contain repository/data access logic

Result Pattern (mandatory):

- All command/query outcomes must use Result Pattern.
- Use shared Result and Option abstractions from `src/Frameworks/Accounting.Frameworks`.
- Backends must return structured failures with code + localization key, not translated text.

Rich Domain Modeling (mandatory):

- Domain behavior must be implemented in rich domain classes, not in handlers.
- Use Builder and/or Factory when domain construction is complex.
- Split each entity into three partial files when applicable:
  - core entity shape/state
  - rich behavior/invariants
  - construction (builder/factory)

---

# 5. Vertical Slice Structure

Each Feature MUST contain:

- Endpoint
- Command or Query
- Handler
- Validator
- Service usage
- At least one test

Example structure:

Modules/Ledgers/Features/CreateLedger/
  CreateLedgerEndpoint.cs
  CreateLedgerCommand.cs
  CreateLedgerHandler.cs
  CreateLedgerValidator.cs

---

# 6. Endpoint Rules (Minimal API)

- Endpoints MUST be defined inside module.
- Host project MUST only register endpoints.
- No business logic inside endpoint.
- No data access inside endpoint.

Endpoint responsibility:

- Receive request
- Call request Handler
- Return result

Processing chain:

- Minimal API endpoint -> Handler -> Service(s) -> Repository
- Domain business rules must be implemented in rich Domain (services coordinate infrastructure/application concerns).

---

# 7. Database Rules (SQL Server)

- Single database in MVP.
- Schema-per-module recommended.
- Cross-module joins are FORBIDDEN.
- Heavy reads must use projection or dedicated query layer.

---

# 8. Caching Rules (Redis)

- Cache only read operations.
- Define TTL explicitly.
- Version cache keys.
- Invalidate cache when related write operation occurs.

---

# 9. Authentication & Authorization

- Use Duende IdentityServer.
- Use policy-based authorization.
- Apply scope filtering where required.
- NEVER bypass authorization checks.

Security implementation and review rules are mandatory:

- Follow `docs/architecture/security-implementation-review-rules.md`.
- Apply negative scoring security review in each PR.
- Any Critical security finding blocks completion.

---

# 10. Logging & Observability

Logging MUST:

- Be structured (Serilog)
- Include CorrelationId
- Avoid logging sensitive data

Health checks MUST include:

- SQL connectivity
- Redis connectivity
- Identity server availability

Metrics MUST capture:

- Request latency
- Error rate
- Cache hit/miss
- DB performance indicators

---

# 11. Testing Rules (MANDATORY)

Development is TDD-first.

Every feature MUST include:

- Unit tests for services/domain
- At least one meaningful behavior test

Handlers MUST be testable.

Critical flows MUST include BDD-style tests.

A feature without tests MUST NOT be considered complete.

---

# 12. Forbidden Patterns

AI MUST NOT:

- Create God services
- Create Fat handlers
- Put business logic in handlers
- Create Shared domain entities
- Add logic inside Host
- Skip validation
- Skip tests
- Directly expose DbContext in endpoints
- Use static state
- Put cross-module shared business logic in `Commons/`

---

# 13. Definition of Done (AI Enforcement)

A Feature is considered complete only if:

- Architecture rules respected
- CQRS respected
- Folder structure respected
- Tests exist and pass
- No cross-module violation
- No logging or security violation
- Health & observability unaffected

If any of the above fails, regenerate solution.

---

# 14. AI Behavior Expectations

AI agent MUST:

- Follow existing folder conventions
- Reuse established patterns
- Avoid introducing new architectural styles
- Ask for clarification if architectural conflict appears
- Prefer explicit over implicit behavior
- Keep code readable and minimal

---

# 15. Future Compatibility

All generated code MUST:

- Preserve ability to migrate to SoA
- Avoid tight coupling
- Respect module boundaries
- Avoid shared mutable state

