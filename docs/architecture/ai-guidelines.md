# AI Agent Coding Guidelines
Project: Accounting v0
Architecture: Modular Monolith + Vertical Slice + CQRS
Status: Mandatory Rules

This document defines NON-NEGOTIABLE coding rules for AI agents contributing to this repository.

If any rule conflicts with generated output, the rule ALWAYS wins.

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

Modules MUST NOT:

- Access another module's DbContext
- Directly join another module's tables
- Depend on another module's internal services

Allowed cross-module communication:

- Interfaces
- Internal APIs
- Domain Events (in-process only)

---

# 4. CQRS Rules (MediatR Required)

Every state-changing operation MUST be implemented as a Command.
Every read operation MUST be implemented as a Query.

Handlers MUST:

- Validate input (if not already validated)
- Call service layer
- Return result

Handlers MUST NOT:

- Contain domain rules
- Execute complex business calculations
- Directly access unrelated modules

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
- Call MediatR
- Return result

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
- Create Shared domain entities
- Add logic inside Host
- Skip validation
- Skip tests
- Directly expose DbContext in endpoints
- Use static state

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

