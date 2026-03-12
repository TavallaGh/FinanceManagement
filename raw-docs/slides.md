# Accounting Architecture Slides (Combined)


---

<!-- Source: 01-context-mvp.html -->

# Context MVP و مسیر اجرای معماری

تیم، Scope چهار ماژول و فازبندی اجرای معماری

Slide 2

## اعضای تیم

- تولی قربانیان — Product Manager
- مصطفی حسن‌پور — Tech Lead
- حمیدرضا غلامی — Software Engineer

## بخش تایید

- پیام رحیمی — VP Product (Approval)
- مصطفی اکبری‌زاده — VP Tech (Approval)

## Scope ماژول‌های MVP

- دفتر کل
- خزانه‌داری
- IDP (Access Control)
- تنظیمات سیستم

## نقشه مسیر اجرای معماری

Phase 1

### Foundation

راه‌اندازی Host، Identity، پایگاه داده، Logging و چارچوب تست.

Phase 2

### Core Modules

پیاده‌سازی ۴ ماژول اصلی: دفتر کل، خزانه‌داری، IDP (Access Control) و تنظیمات سیستم.

Phase 3

### Performance & Reliability

افزودن Redis، Read Model بهینه، HealthCheck و داشبورد مانیتورینگ.

Phase 4

### Release Readiness

UAT، سخت‌گیری امنیتی، نسخه‌بندی و تحویل رسمی MVP.

---

<!-- Source: 02-problem-goals-scope.html -->

# Problem, Goals & Scope (MVP)

جمع‌بندی چالش‌ها، اهداف بیزینسی و Scope ماژول‌های MVP در یک اسلاید

Slide 3

## Problem / Why Now

- تداخل واحدها و عدم شفافیت فرآیندهای مالی
- ورود تکراری اطلاعات و اتلاف زمان تیم‌های عملیاتی
- نیاز به رشد بدون اصطکاک (چند شرکت/شعبه/ارز)

## اهداف بیزینسی MVP

- کاهش ورود تکراری و افزایش بهره‌وری تیم مالی
- استانداردسازی فرآیندها و کاهش خطا/ریسک
- یکپارچگی کنترل‌شده با سیستم‌های داخلی/خارجی
- ایجاد بستر توسعه‌پذیر برای فازهای بعدی

## KPI Focus

Time Saved
Accuracy
Integration
Scale

## Scope ماژول‌های MVP

- دفتر کل (General Ledger)
- خزانه‌داری (Treasury)
- IDP (Access Control)
- تنظیمات سیستم (System Settings)

---

<!-- Source: 03-architecture-principles.html -->

# اصول معماری (به شدت توصیه شده)

قواعد پایه MVP به همراه تصمیم کلان مسیر معماری

Slide 4

## قواعد معماری

1. No Shared Business Domain (فقط SharedKernel حداقلی)
2. Presentation مشترک در Host
3. Endpoint داخل ماژول‌ها، Host فقط Register
4. Single DB در MVP + مالکیت داده
5. CQRS with Thin Handlers
6. TDD + BDD اجباری

## تصمیم کلان MVP

- MVP = Modular Monolith + Vertical Slice
- Next = SoA (Extract gradually)

MVP
Evolution
SoA

## نتیجه اجرایی

در فاز MVP تمرکز روی سرعت تحویل، مرزبندی ماژول‌ها و کیفیت تست است؛ استخراج سرویس‌ها به‌صورت تدریجی در فازهای بعدی انجام می‌شود.

---

<!-- Source: 04-tech-stack-overview.html -->

# Tech Stack Overview

فناوری‌های منتخب برای MVP و رشد مرحله‌ای

Slide 5

## Backend Core

- .NET 10 + ASP.NET Minimal API
- CQRS با MediatR برای جداسازی Read/Write
- Endpointها داخل ماژول‌ها، Host فقط Register

## Frontend & Experience

- Blazor WebAssembly (Hosted)
- یکپارچه با API Host برای توسعه سریع MVP
- آماده برای توسعه تدریجی قابلیت‌ها

## Data & Performance

- SQL Server به‌عنوان DB اصلی MVP
- Redis برای کش لایه خواندن
- NoSQL به‌صورت Optional در فازهای بعدی

## Security & Observability

- Auth: Duende IdentityServer + Microsoft Identity
- Logs: Serilog → ELK
- Health/Metrics: کامل

IdentityServer + ELK + Health/Metrics نیز در مسیر سرویس‌دهی قرار دارند.

Security
Observability
Reliability

## Integration Readiness

- طراحی API برای اتصال کنترل‌شده با سرویس‌های داخلی
- الگوی یکپارچه‌سازی با قراردادهای پایدار
- جدا نگه‌داشتن وابستگی‌های بیرونی از هسته دامنه

## Evolution Path

- اکنون: Modular Monolith برای سرعت و سادگی MVP
- بعدی: استخراج تدریجی سرویس‌ها بر اساس نیاز واقعی
- هدف: گذار کم‌ریسک به SoA بدون بازنویسی پرهزینه

---

<!-- Source: 05-high-level-system-diagram.html -->

# High-Level System Diagram (L1)

User → Blazor WASM → API Host → Modules → SQL/Redis

Slide 6

User

Blazor WASM

Accounting.Api Host
Minimal API

Duende IdentityServer + MS Identity

Modules

Redis

SQL Server

Serilog

ELK

Health & Metrics

---

<!-- Source: 06-context-diagram.html -->

# Context Diagram (C4-L1)

این دیاگرام مرز سیستم حسابداری MVP را مشخص می‌کند، بازیگران و سامانه‌های پیرامونی را نشان می‌دهد و مسیرهای ارتباطی کلان بین آن‌ها را شفاف می‌سازد.

Slide 7

## System Context — Accounting Platform (MVP)

کاربر مالی / حسابدار

مدیر سیستم / ادمین

Accounting Platform (MVP)

دفتر کل

خزانه‌داری

IDP (Access Control)

تنظیمات سیستم


بانک / درگاه پرداخت

سامانه گزارش/BI

سرویس اطلاع‌رسانی

---

<!-- Source: 07-container-diagram.html -->

# Container Diagram (C4-L2)

چیدمان ستونی برای توضیح ساده‌تر: ستون 1 UI (Blazor)، ستون 2 API Host، ستون 3 ماژول‌ها + Identity، ستون 4 زیرساخت داده و مانیتورینگ

Slide 8

## Accounting Containers

ستون 1: Blazor UI

ستون 2: API Host

ستون 3: Modules + Identity

ستون 4: DB / Cache / Ops

Blazor WASM UI

API Host (Minimal API)
AuthN/AuthZ + Endpoints
Validation + Logging

دفتر کل Module

خزانه‌داری Module

IDP (Access Control) Module

تنظیمات سیستم Module


SQL Server (Main DB)

Redis (Read Cache)

ELK + Health/Metrics

External Integrations

### Communication Rules

- UI فقط با API Host صحبت می‌کند
- دسترسی به داده از مسیر Moduleها انجام می‌شود
- Cross-cuttingها در Host اعمال می‌شوند

### Container Outcomes

Isolation
Scalability
Traceability
Security

---

<!-- Source: 08-proposed-architecture-layered.html -->

# Proposed Architecture — Modular Monolith + Vertical Slice

نمای کامل لایه‌بندی و جایگاه ۴ ماژول اصلی در معماری پیشنهادی

Slide 9

## Layered View with Module Boundaries

Accounting Host (Modular Monolith)

Cross-Cutting Layer: AuthZ | Validation | Logging | Monitoring | Caching Policies

Presentation Layer (Shared): Blazor UI + Shared Components

Shared Domain Layer: Common Value Objects, Policies, Contracts

External / Infra Services (Shared)

دفتر کل

Endpoint / API

App (CQRS Handlers)

Domain (Entities/Rules)

Infra (Repo/Queries)

خزانه‌داری

Endpoint / API

App (CQRS Handlers)

Domain (Entities/Rules)

Infra (Repo/Queries)

IDP (Access Control)

Endpoint / API

App (CQRS Handlers)

Domain (Entities/Rules)

Infra (Repo/Queries)

تنظیمات سیستم

Endpoint / API

App (CQRS Handlers)

Domain (Entities/Rules)

Infra (Repo/Queries)

SQL Server (OLTP)

Redis Cache


ELK + Metrics + Health

در این معماری، هر ماژول مرزبندی مستقل دارد و به‌صورت Vertical Slice پیاده‌سازی می‌شود؛ در عین حال استقرار یکپارچه Modular Monolith حفظ می‌گردد تا توسعه MVP سریع، کنترل‌شده و قابل تکامل باشد.

---

<!-- Source: 09-module-structure.html -->

# Modular Template + Presentation Rule

چرایی انتخاب معماری و الگوی اجرای استاندارد ماژول‌ها در MVP

Slide 10

## چرا Modular Monolith + Vertical Slice انتخاب مناسبی است؟

- تحویل سریع MVP با استقرار یکپارچه و پیچیدگی عملیاتی کمتر
- مرزبندی شفاف ماژول‌ها (Data Ownership + Contracts) بدون درهم‌ریختگی دامنه
- قابلیت توسعه تدریجی هر Feature به‌صورت مستقل در قالب Vertical Slice
- آمادگی برای استخراج سرویس‌ها در آینده، بدون بازنویسی گسترده

## ساختار ماژول (Template)

- Features/
- Domain/
- Services/
- Infrastructure/
- Module.cs (Add/Map)

## Presentation Rule

در Host فقط ثبت ماژول‌ها انجام می‌شود و endpoint داخل خود ماژول می‌ماند.

✅ AddModule()
✅ MapModuleEndpoints()
❌ Endpoint در Host

---

<!-- Source: 10-cqrs-rules.html -->

# CQRS + Data Strategy (Modular Monolith)

تفکیک Command/Query در کنار قواعد مالکیت داده برای حفظ مرز ماژول‌ها

Slide 11

## CQRS Rules (MediatR)

- Command = تغییر حالت
- Query = فقط خواندن
- Handler = orchestration
- Logic = Services/Domain

Endpoint → MediatR → Service

## Data Strategy

- هر ماژول مالک جدول‌های خودش
- Cross-module join ممنوع
- Read سنگین از مسیر رسمی (Query layer / views / projections)

## نتیجه‌گیری: CQRS چگونه به Data Strategy کمک می‌کند؟

- با جداسازی Command/Query، نوشتن و خواندن هر ماژول مستقل می‌ماند و مالکیت داده حفظ می‌شود.
- Query Modelهای اختصاصی، نیاز به Join مستقیم بین ماژول‌ها را کم می‌کند و وابستگی را کاهش می‌دهد.
- Handlerهای نازک، منطق را در Domain/Service نگه می‌دارند و از نشت قواعد یک ماژول به ماژول دیگر جلوگیری می‌کنند.
- در ماژولار مونولیت، این الگو هم‌زمان سرعت MVP را حفظ می‌کند و مسیر مقیاس‌پذیری آینده را هموار می‌سازد.

---

<!-- Source: 11-read-performance.html -->

# Read Performance + Redis Caching

لَدر بهینه‌سازی خواندن و استفاده هدفمند از Redis برای سرعت بالاتر

Slide 12

### Simple

EF Projection برای read ساده

### Heavy Grid

Dapper/View/SP برای grid سنگین

### Aggregate

Read Model برای گزارش‌های تجمیعی

### Redis Use Cases

- Reference Data
- Permission/Policy cache
- Cached query results برای صفحات پرتکرار

### Redis Rules

- TTL
- Versioned keys
- Invalidation policy

### نتیجه عملی

در سناریوهای پرتکرار خواندن، ترکیب Query Model + Redis باعث کاهش latency، کاهش بار SQL Server و پایداری بهتر تجربه کاربر می‌شود.

---

<!-- Source: 12-integrations.html -->

# Integrations (Internal/External)

مدل یکپارچه‌سازی پیشنهادی برای جمع‌آوری منسجم داده از پروژه‌های داخلی و Providerهای بیرونی

Slide 13

## Internal Integrations

TC
CoiniGO
PiniCode
Bakart
Tethery
AVA Star
PFA

- یک SaaS داخلی برای تجمیع API پروژه‌های داخلی
- استانداردسازی قراردادها، احراز هویت و نسخه‌بندی
- ایجاد Data Collection منظم برای گزارش‌گیری و تحلیل
- کاهش اتصال‌های مستقیم و جلوگیری از coupling بین سیستم‌ها

## External Integrations

- ایجاد ACL برای Provider/Supplierهای بیرونی
- نرمال‌سازی داده بانک‌ها، نرخ ارز، مودیان و پیام‌رسان‌ها
- مدیریت Mapping، Retry، Validation و Error Handling در یک نقطه
- ارائه خروجی منسجم و پایدار به هسته حسابداری

## جمع‌بندی اجرایی

ترکیب Internal Integration SaaS و External ACL باعث می‌شود جمع‌آوری داده‌ها قابل‌کنترل، قابل‌گسترش و مستقل از تغییرات Providerها باشد؛ در نتیجه کیفیت داده ورودی به ماژول‌های حسابداری بالاتر و توسعه آینده ساده‌تر خواهد شد.

**نکته مهم ارائه:** این ساختار در این مرحله صرفاً برای تبیین Solution Integration ارائه شده است و پیاده‌سازی عملیاتی آن در برنامه پس از فاز MVP قرار می‌گیرد.

---

<!-- Source: 13-workflow-workbench.html -->

# Workflow / Workbench / Dashboards

سه قابلیت مکمل برای اجرای فرآیند، مدیریت کار روزانه و تصمیم‌گیری مدیریتی

Slide 14

## هدف این سه قابلیت

Workflow اجرای استاندارد فرآیند را تضمین می‌کند، Workbench بهره‌وری کاربر عملیاتی را بالا می‌برد و Dashboard/Report دید تصمیم‌گیری را برای مدیران فراهم می‌سازد.

### Workflow (BPMN-Based)

- تعریف مراحل: Draft → Review → Approve → Post
- قواعد ارجاع خودکار بر اساس نقش/واحد
- ثبت کامل تاریخچه و Audit Trail
- خروجی: کاهش خطای فرآیندی و تسریع گردش کار

### User Workbench (کارتابل عملیاتی)

- Inbox کارها: Pending / In Review / Overdue
- اقدام سریع: تایید، ارجاع، بازگشت، ثبت توضیح
- فیلتر بر اساس اولویت، نوع سند و SLA
- خروجی: دید روزانه شفاف برای هر کاربر

### Dashboards + Report Builder

- KPIهای کلیدی مالی (مانده، گردش، وضعیت تایید)
- Drill-down از شاخص تا سند مبنا
- گزارش‌ساز پارامتریک برای نیازهای واحدها
- خروجی: تصمیم‌گیری سریع‌تر و مبتنی بر داده

## مرز MVP

Workflow پایه + Approval
Workbench کارتابل اصلی
Dashboardهای استاندارد
گزارش‌ساز پیشرفته (Post-MVP)

---

<!-- Source: 14-access-control.html -->

# IDP (Access Control) Model (3-Layer + Ownership)

نمای گرافیکی مدل دسترسی با جزئیات فنی پیاده‌سازی در Modular Monolith

Slide 15

## IDP (Access Control) Layers — Visual Model

Identity + Role + Claims (JWT / Policy-based Authorization)

Layer 1: فرم / دیتا
Form & Data Scope

Layer 2: عملیات
View / Edit / Delete / Approve

Layer 3: نوع سند
Opening / Normal / Closing

Ownership Rule + Document Status Gate
(Owner, Creator, Workflow State, Fiscal Period Lock)

### دید تکنیکال پیاده‌سازی

- Authorization Policy + Claims در API Host
- Permission Matrix در DB (Role, Scope, Operation, DocumentType)
- PermissionEvaluator در Application Layer
- OwnershipGuard برای وضعیت سند و قفل دوره مالی
- Audit Log برای تصمیم مجاز/غیرمجاز

---

<!-- Source: 15-observability-reliability.html -->

# Observability & Reliability

نمای گرافیکی پایش سرویس + واژه‌نامه کاربردی برای تیم فنی و محصول

Slide 16

## Observability Pipeline

API / Modules

Structured Logging

Tracing + CorrelationId

ELK

Metrics

HealthChecks

Alerts

### Logging

Serilog → ELK + الگوی Structured Log برای تحلیل دقیق‌تر رخدادها

### Tracing

CorrelationId در کل زنجیره درخواست برای ردیابی End-to-End

### Health

Liveness/Readiness + Dependency Checks برای SQL/Redis/Identity

### Metrics

latency p95/p99, error rate, throughput, cache hit/miss + Error Budget برای پایش پایداری

### واژه‌نامه کلیدی (عمومی + اختصاصی پروژه)

- **CorrelationId** — عمومی: شناسه یکتا برای ردیابی یک درخواست بین سرویس‌ها | پروژه: روی تمام لاگ‌های API/Module ثبت می‌شود تا مسیر کامل یک سند مالی قابل ردیابی باشد.
- **Structured Logging** — عمومی: ثبت لاگ به‌صورت فیلددار (JSON) | پروژه: فیلدهای کلیدی مثل Module, UserId, FiscalPeriod, DocumentType استاندارد می‌شوند.
- **Liveness / Readiness** — عمومی: سلامت سرویس و آمادگی پاسخ‌گویی | پروژه: برای SQL Server، Redis و Identity Check اختصاصی تعریف می‌شود.
- **p95 / p99 Latency** — عمومی: تاخیر پاسخ در صدک‌های بحرانی | پروژه: برای APIهای پرترافیک گرید و گزارش به‌عنوان KPI عملیاتی پایش می‌شود.
- **Error Budget** — عمومی: میزان خطای قابل‌قبول نسبت به SLA | پروژه: مبنای تصمیم برای Freeze ویژگی جدید و تمرکز روی پایداری خواهد بود.

---

<!-- Source: 16-testing-strategy.html -->

# Testing Strategy: TDD + BDD

کیفیت، بخشی از Feature است نه مرحله‌ی بعدی؛ هر قابلیت باید هم درست کار کند هم قابل اعتماد باشد

Slide 17

## Quality Narrative

در MVP سرعت مهم است، اما بدون اعتماد به خروجی ارزش ندارد. این استراتژی تضمین می‌کند هر فیچر قبل از تحویل، هم در سطح منطق فنی و هم در سطح سناریوی واقعی کاربر اعتبارسنجی شده باشد.

## TDD + BDD Flow

Feature Request

TDD: Rules & Services

BDD: User Scenarios

Quality Gate

Release Ready

### TDD Focus

- تست قوانین دامنه و سرویس‌ها قبل از کدنویسی کامل
- پیشگیری از Regression در تغییرات بعدی
- افزایش اطمینان در Refactor

### BDD Focus

- تست سناریوهای حیاتی کاربر (Given/When/Then)
- هم‌راستاسازی تیم فنی با انتظار بیزینسی
- کاهش ابهام در پذیرش Feature

### Quality Gate

- حداقل 1 تست معنی‌دار برای هر Feature
- قبولی تست‌ها شرط Merge/Release
- شفافیت کیفیت برای تیم و مدیران

## پیام کلیدی اسلاید

Test-First Mindset
Business Confidence
Predictable Delivery
Post-MVP: Test Automation Depth

---

<!-- Source: 17-folder-structure.html -->

# Folder Structure: src / tests Mirror

ساختار پوشه‌ها فقط چیدمان نیست؛ نقشه‌ی فهم پروژه، سرعت onboarding و کیفیت تست‌هاست

Slide 18

## Mirror Structure (Code ↔ Test)

- **/src/Modules/Ledgers/Features/CreateVoucher/...**
- **/tests/Modules/Ledgers/Features/CreateVoucher/...**

هر Feature در کد باید مسیر معادل خود را در تست داشته باشد تا پیدا کردن منطق و سناریوهای اعتبارسنجی سریع و قابل ردیابی بماند.

### چرا این ساختار مهم است؟

- Onboarding سریع‌تر اعضای جدید تیم
- کاهش زمان یافتن فایل مرتبط با Bug/Feature
- یکپارچگی استاندارد توسعه بین ماژول‌ها

### قواعد عملی تیم

- هر Feature جدید = مسیر تست متناظر
- نام‌گذاری پوشه‌ها همسو با زبان دامنه
- عدم ایجاد پوشه‌های عمومیِ مبهم و غیرقابل‌مالکیت

### خروجی قابل اندازه‌گیری

Traceability
Maintainability
Test Coverage Mapping
Faster Debugging

## پیام کلیدی

در Modular Monolith + Vertical Slice، ساختار پوشه درست کمک می‌کند مرز ماژول‌ها حفظ شود، تست‌ها از کد عقب نمانند و تیم با سرعت بالاتر اما کنترل‌شده توسعه دهد.

---

<!-- Source: 18-release-versioning.html -->

# Release & Versioning + Change Communication

انتشار کنترل‌شده، نسخه‌بندی شفاف و اطلاع‌رسانی قابل‌اعتماد برای کاهش ریسک عملیاتی

Slide 19

## Release Flow

Build & Test

Version Tag

Release Notes

Communication

Deploy / Rollback

### Release Notes

- Featureها، Bug fixها و Breaking changeها
- اثر تغییر روی کاربران و تیم عملیات
- Version قابل ردیابی برای هر انتشار

### اطلاع‌رسانی تغییرات

- اعلام زمان انتشار و دامنه اثر
- راهنمای استفاده از تغییرات جدید
- کانال مشخص برای بازخورد و Incident

### Rollback (در صورت نیاز)

- Triggerهای مشخص برای بازگشت نسخه
- Playbook آماده برای تیم عملیات
- بازگشت سریع با کمترین اختلال سرویس

## پیام کلیدی اسلاید

Predictable Releases
Clear Communication
Operational Safety
Controlled Rollback

---

<!-- Source: 19-evolution-plan.html -->

# MVP → SoA Evolution Plan

نقشه تکامل مرحله‌ای: شروع سریع با MVP و حرکت کنترل‌شده به SoA بر اساس نیاز واقعی

Slide 20

## Evolution Timeline

Phase 1: MVP
Modular Monolith
Fast Delivery

Phase 2: Extraction
Integration / Reporting / Workflow
Operational Decoupling

Phase 3: SoA (Selective)
Domain Service Extraction
Only by Real Pressure

### Phase 1 — MVP

- تمرکز روی زمان عرضه و ثبات محصول
- مرزبندی ماژول‌ها در یک Host مشترک
- حداقل پیچیدگی عملیاتی

### Phase 2 — Controlled Extraction

- استخراج Integration / Reporting / Workflow
- کاهش بار عملیاتی هسته حسابداری
- ایجاد مرزهای سرویسی با ریسک پایین

### Phase 3 — Selective SoA

- استخراج سرویس دامنه فقط با فشار واقعی
- تصمیم مبتنی بر KPI (Latency/Scale/Ownership)
- جلوگیری از Over-Engineering زودهنگام

## اصل تصمیم‌گیری تکامل

Business Need First
Measure Before Extract
Incremental Evolution
No Premature Microservices

---

<!-- Source: 20-risks-mitigations.html -->

# Risks & Mitigations

نمای تصمیم‌پذیر ریسک‌ها: شدت اثر، احتمال وقوع و اقدامات کاهش ریسک

Slide 21

## Risk Overview Matrix

DB Coupling — Impact: High / Likelihood: Medium
Grid Performance — Impact: High / Likelihood: High
Auth Complexity — Impact: Medium / Likelihood: Medium
AI Code Drift — Impact: Medium / Likelihood: Medium

### Risk #1 — DB Coupling

- ریشه: وابستگی مستقیم بین جداول ماژول‌ها
- اثر: شکست مرز ماژول و افت توسعه‌پذیری
- کاهش: Ownership صریح + ممنوعیت Join بین ماژولی

### Risk #2 — Grid Performance

- ریشه: کوئری‌های سنگین در صفحات پرترافیک
- اثر: افزایش latency و نارضایتی کاربر
- کاهش: Query Layer + Read Model + Redis Caching

### Risk #3 — Auth Complexity

- ریشه: ترکیب قوانین نقش، سند و وضعیت
- اثر: خطای دسترسی یا over-permission
- کاهش: Policy استاندارد + Integration Tests

### Risk #4 — AI-Driven Code Drift

- ریشه: تولید کد ناسازگار با استاندارد تیم
- اثر: افزایش هزینه نگهداشت و خطای معماری
- کاهش: Template ثابت + PR Gates + TDD/BDD

## Decision Message

این ریسک‌ها قابل مدیریت‌اند اگر کنترل‌ها از ابتدا در فرآیند توسعه نهادینه شوند؛ یعنی مرزبندی داده، مسیر رسمی Read، سیاست‌های دسترسی و Quality Gate باید بخشی از Definition of Done هر Feature باشند.

---

<!-- Source: 21-summary-decisions.html -->

# Summary / Decisions Snapshot

تصویر نهایی تصمیم‌های تاییدشده برای شروع اجرای کنترل‌شده MVP

Slide 22

## تصمیم‌های تایید شده (By Domain)

Architecture: Modular Monolith
Delivery: Vertical Slice
Data: Single DB + Ownership
Performance: Redis + Query Layer
Application: CQRS + MediatR
API: Minimal API
UI: Blazor WASM
Security: IdentityServer
Observability: Serilog + ELK
Quality: TDD/BDD

### Outcome for MVP

- تحویل سریع‌تر با ریسک کنترل‌شده
- مرزبندی ماژول‌ها و داده‌ها از ابتدا
- کیفیت قابل پایش و قابل اعتماد

### Next Action

- نهایی‌سازی Backlog فاز اول
- تایید Architecture Baseline
- شروع اجرای اسکوپ ۴ ماژول MVP

## Executive Closing

با این تصمیم‌ها تیم می‌تواند MVP را با سرعت، شفافیت و کنترل فنی بالا آغاز کند؛ در عین حال مسیر تکامل به SoA
به‌صورت تدریجی و مبتنی بر نیاز واقعی حفظ می‌شود.

**توجه:** سه اسلاید بعدی به‌عنوان پیوست ارائه (Appendix) در نظر گرفته شده‌اند.

Footer: تایید مدیران

---

<!-- Source: 22-zachman-framework.html -->

# Zachman Framework (MVP View)

نمای یکپارچه پرسش‌های کلیدی معماری برای ذی‌نفعان مختلف در سیستم حسابداری

Slide 23

## Zachman Matrix — Accounting MVP

| سطح / پرسش | What (Data) | How (Function) | Where (Network) | Who (People) | When (Time) | Why (Motivation) |
| --- | --- | --- | --- | --- | --- | --- |
| Scope Planner | Ledger, Treasury, Access, Settings | فرآیندهای مالی پایه | HQ + شعب + Cloud | Finance, Admin, Manager | دوره مالی و تقویم عملیات | یکپارچگی و کنترل مالی |
| Business Model Owner | مالکیت داده هر ماژول | ثبت سند، پرداخت، کنترل دسترسی | جریان بین واحدها | نقش‌ها و سطح دسترسی | چرخه تایید و بستن دوره | کاهش خطا و افزایش سرعت |
| System Model Designer | SQL + Read Models + Cache | CQRS + Vertical Slice | API Host + External Services | Identity + Authorization | Jobها، Eventها، SLA | پایداری، نگهداشت‌پذیری |
| Technology Model Builder | SQL Server / Redis | .NET + Minimal API + MediatR | Hosted Blazor + API | Duende + Microsoft Identity | Release / Monitoring cadence | تحویل سریع MVP |

این جدول کمک می‌کند تیم روی یک زبان مشترک معماری هم‌راستا شود: در هر سطح (از دید کسب‌وکار تا فناوری)
دقیقاً مشخص می‌شود «چه داده‌ای»، «چه کاری»، «توسط چه کسی»، «در چه زمانی» و «با چه هدفی» باید انجام شود.
نتیجه این است که تصمیم‌های MVP شفاف‌تر، قابل‌پیگیری‌تر و قابل‌تحویل‌تر می‌شوند.

---

<!-- Source: 23-rag-architecture-diagram.html -->

# RAG Architecture Diagram

جریان داده از اسناد تا پاسخ نهایی با Retrieval-Augmented Generation

Slide 24

## RAG Pipeline

Data Sources

Ingestion / ETL

Chunk + Embed

Vector Store

Index

User Query

Retriever + Ranker
Top-K Context Selection

LLM

Grounded Answer

مفهوم ساده این دیاگرام: ابتدا دانش سازمانی جمع‌آوری و قابل جست‌وجو می‌شود، سپس هنگام هر سوال،
فقط بخش‌های مرتبط بازیابی می‌گردد و همراه سوال به مدل زبانی داده می‌شود تا پاسخ نهایی هم دقیق‌تر باشد
و هم بر پایه مستندات واقعی سیستم تولید شود.

---

<!-- Source: 24-agent-workflow-diagram.html -->

# Agent Workflow Diagram

گردش کار عامل هوشمند از دریافت درخواست تا اجرای ابزار و بازخورد نهایی

Slide 25

## Agent Orchestration Flow

User Request

Intent Parsing

Planner Agent
Task Decomposition

Tool Router

Code Executor

Knowledge Retrieval

State / Memory

Final Response

این گردش‌کار نشان می‌دهد عامل هوشمند چگونه درخواست کاربر را به کارهای کوچک‌تر می‌شکند،
ابزار مناسب را اجرا می‌کند، دانش لازم را بازیابی می‌کند و در نهایت با اتکا به وضعیت/حافظه،
یک پاسخ نهایی منسجم و قابل استفاده برمی‌گرداند.

---

<!-- Source: index.html -->

# Architecture & SDD — Accounting v0 (MVP)

Modular Monolith + Vertical Slice + CQRS + Observable Delivery

1404/12/08 • نسخه 0.1 • Approved

## چشم‌انداز MVP

این ارائه Snapshot تصمیم‌های فنی تاییدشده را نشان می‌دهد تا تیم بتواند با ریسک پایین،
توسعه ماژول‌های حسابداری را شروع کند و همزمان مسیر تکامل به معماری سرویس‌محور حفظ شود.

زمان عرضه فاز اول
**6–8 هفته**

ماژول‌های پایه MVP
**4 ماژول**

پایداری هدف
**99.5%**

Latency خواندن
**< 200ms**

### Stack مصوب

.NET 10
ASP.NET Minimal API
Blazor Hosted (WASM + API)
SQL Server
Redis
Serilog + ELK
IdentityServer

### اهداف این Deck

- هم‌راستاسازی فنی و محصولی روی معماری v0
- مشخص کردن مرز MVP و خروجی قابل تحویل
- تثبیت تصمیم‌های پرریسک قبل از توسعه
- ایجاد مبنای مشترک برای تیم Dev و مدیران

### دامنه تحویل MVP

- دفتر کل
- خزانه‌داری
- IDP (Access Control)
- تنظیمات سیستم
