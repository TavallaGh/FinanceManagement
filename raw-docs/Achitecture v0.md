# Architecture Specification — Accounting v0 (MVP)

Version: 0.2  
Status: Approved (MVP Baseline)  
Architecture Style: Microservices (SSO + BFF + Accounting API + Notification Service)  
Accounting API Internal Style: Modular Monolith + Vertical Slice  
Evolution Path: Selective SoA (post-MVP)

---

## 1) Executive Summary

Accounting v0 is designed for fast, controlled MVP delivery with clear module boundaries and strong operational observability.

Approved MVP modules:
- General Ledger
- Treasury
- IDP (Access Control)
- System Settings

Primary goals:
- Faster financial operations with lower manual rework
- Better process standardization and lower error risk
- Controlled integration readiness for internal/external systems
- Technical baseline that can evolve without costly rewrite

---

## 2) Technology Baseline

- Backend: .NET 10 + ASP.NET Minimal API (Accounting API)
- Frontend: Angular SPA (separate repo: `Accounting-Frontend`), backed by BFF
- BFF: Backend-for-Frontend — handles sessions, cookies, token refresh, API proxying
- SSO Service: `accounting-sso` — owns user management, roles, permissions, token issuance/revocation
- Notification Service: `accounting-notification` — handles email, SMS, OTP; consumed by SSO and other services
- Primary Database: SQL Server
- Read Acceleration: Redis
- Logging: Serilog to ELK
- Health/Metrics: Liveness, Readiness, operational KPIs
- Application Pattern: CQRS + MediatR (within Accounting API)
- Quality Strategy: TDD + BDD

---

## 3) Architecture Principles

1. No shared business domain across modules (minimal technical shared kernel only).
2. Presentation is hosted centrally; business endpoints stay inside modules.
3. Host is composition root (registration, cross-cutting, infrastructure wiring).
4. Single database in MVP, with strict data ownership per module.
5. No direct cross-module table joins.
6. CQRS handlers stay thin; business rules live in domain/services.
7. TDD + BDD are mandatory quality gates.

---

## 4) High-Level Design

Flow:
1. User works in Angular SPA.
2. Angular SPA calls BFF.
3. BFF manages session/token and proxies to Accounting API Host.
4. SSO Service handles authentication, user management, roles, and permissions.
5. Host routes to module endpoints inside the Accounting API.
6. Each module executes command/query via application layer.
7. Writes go to SQL Server; read-heavy paths can use read-model + Redis.
8. Observability is captured end-to-end with logs, traces, metrics, health.
9. Notification Service (`accounting-notification`) handles outbound communication (email, SMS, OTP) and is consumed by SSO.

Diagram file: `Achitecture v0.svg`

---

## 5) Module Boundary Template

Each module follows vertical slice structure:

- Endpoints / API
- Application (CQRS handlers)
- Domain (entities, invariants, rules)
- Infrastructure (repositories, query adapters)

Host responsibilities:
- AddModule()
- MapModuleEndpoints()
- Authentication/Authorization middleware
- Validation, logging, monitoring, caching policies

Host must not contain module business logic.

---

## 6) CQRS & Data Rules

CQRS rules:
- Command changes state.
- Query is read-only.
- Handlers orchestrate, not own domain logic.

Data strategy:
- Module ownership is explicit.
- Cross-module direct joins are forbidden.
- Heavy reads use query layer, view/projection, or specialized read model.

Result:
- Keeps module contracts stable.
- Reduces coupling in MVP.
- Preserves clean path for later extraction.

---

## 7) Read Performance Strategy

Read optimization ladder:
- Simple reads: EF projections
- Heavy grids: Dapper/View/SP
- Aggregated analytics: Read models

Redis use cases:
- Reference data
- Permission/policy cache
- Cached frequent query outputs

Redis governance:
- TTL required
- Versioned cache keys
- Explicit invalidation policy

---

## 8) Authentication & Authorization Model

SSO Service (`accounting-sso`) owns:
- User management (create, update, deactivate)
- Role and permission management
- Token issuance and revocation
- Notification delivery (via `accounting-notification` service)

BFF owns:
- Session management (HttpOnly cookies)
- Token refresh orchestration
- API proxying to Accounting API

Accounting API owns:
- Token validation (JWT signature, issuer, audience, expiry) — does NOT issue tokens
- `UserManagement` module: Accounting-scoped user context (company/fiscal linkage, local user references)

3-layer access control model (enforced via claims in token from SSO):
- Layer 1: Form/Data scope
- Layer 2: Operation permission (View/Edit/Delete/Approve)
- Layer 3: Document type permission (Opening/Normal/Closing)

Additional controls:
- Ownership gate (owner/creator)
- Workflow state gate
- Fiscal period lock gate

Implementation anchors:
- Policy + Claims in Accounting API Host (from token issued by SSO)
- Permission matrix managed in SSO DB
- Permission evaluator in Accounting application layer
- Audit log for allow/deny decisions

---

## 9) Integrations & External Boundaries

Internal integration approach:
- Unified internal SaaS-style integration hub (post-MVP implementation)
- Contract standardization and version control

External integration approach:
- ACL layer for provider normalization
- Mapping, retry, validation, and error handling centralized

Purpose:
- Keep core accounting domain independent from provider volatility.

---

## 10) Observability & Reliability

Observability baseline:
- Structured logging with CorrelationId
- Tracing across request lifecycle
- Health checks for SQL/Redis/Identity dependencies
- Metrics: p95/p99 latency, error rate, throughput, cache hit/miss

Reliability posture:
- Error budget mindset
- Alerting on critical degradation
- Release safety through health-gated rollout

---

## 11) Testing & Delivery Controls

Testing strategy:
- TDD for domain/services and feature internals
- BDD for high-value user scenarios
- Integration tests for critical API flows

Quality gate:
- At least one meaningful test per feature
- Test pass required for merge/release

Release controls:
- Version tagging
- Release notes (feature/fix/breaking changes)
- Rollback trigger + playbook

---

## 12) Evolution Plan (MVP to SoA)

Phase 1: MVP
- Modular monolith
- Fast delivery

Phase 2: Controlled extraction
- Integration / reporting / workflow-oriented extraction

Phase 3: Selective SoA
- Domain service extraction only under measurable pressure
- KPI-driven decisions (latency, scale, ownership friction)

Guiding rule:
- No premature microservices.

---

## 13) Risks & Mitigations

Key risks:
- Data coupling
- Read/grid performance
- Authorization complexity
- AI-assisted code drift from standards

Mitigations:
- Strict ownership and data rules
- Query/read-model + Redis strategy
- Policy tests + integration tests
- Template enforcement + PR gates + TDD/BDD

---

## 14) Final Decision Snapshot

- Architecture: Microservices (SSO + BFF + Accounting API + Notification Service)
- Accounting API Internal: Modular Monolith + Vertical Slice
- Delivery shape: Vertical Slice
- Data model: Single DB per service + module ownership within Accounting API
- App pattern: CQRS + MediatR (within Accounting API)
- API: Minimal API
- UI: Angular SPA + BFF
- Auth: SSO Service (accounting-sso) + JWT token validation in Accounting API
- Notifications: accounting-notification microservice
- Observability: Serilog + ELK + Health/Metrics
- Quality: TDD/BDD mandatory

This baseline is approved for MVP execution and is intended to maximize delivery speed while preserving architectural control and a practical path to future service extraction.