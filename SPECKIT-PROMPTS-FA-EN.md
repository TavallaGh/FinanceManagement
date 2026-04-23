# SpecKit Prompts Guide (FA/EN)

This guide catalogs SpecKit-based prompts available in this workspace and explains when and how to use them.

این راهنما پرامپت های مبتنی بر SpecKit که در این پروژه در دسترس هستند را فهرست می کند و نحوه استفاده از آن ها را توضیح می دهد.

## Prompt Index

| Prompt | Short Description | Persian Guide | English Guide |
|---|---|---|---|
| `/speckit.constitution` | Create or update project constitution and sync dependent templates. | [FA](#fa-speckit-constitution) | [EN](#en-speckit-constitution) |
| `/speckit.specify` | Create/update feature specification from natural language input. | [FA](#fa-speckit-specify) | [EN](#en-speckit-specify) |
| `/speckit.clarify` | Ask targeted clarification questions and encode answers into spec. | [FA](#fa-speckit-clarify) | [EN](#en-speckit-clarify) |
| `/speckit.plan` | Generate implementation planning artifacts from the spec. | [FA](#fa-speckit-plan) | [EN](#en-speckit-plan) |
| `/speckit.tasks` | Generate dependency-ordered `tasks.md`. | [FA](#fa-speckit-tasks) | [EN](#en-speckit-tasks) |
| `/speckit.checklist` | Generate a custom checklist for the current feature. | [FA](#fa-speckit-checklist) | [EN](#en-speckit-checklist) |
| `/speckit.analyze` | Run cross-artifact consistency analysis (`spec.md`, `plan.md`, `tasks.md`). | [FA](#fa-speckit-analyze) | [EN](#en-speckit-analyze) |
| `/speckit.implement` | Execute implementation tasks from `tasks.md`. | [FA](#fa-speckit-implement) | [EN](#en-speckit-implement) |
| `/speckit.generate-entities` | Generate multi-domain C# entities from domain docs with mandatory DDD/security rules. | [FA](#fa-speckit-generate-entities) | [EN](#en-speckit-generate-entities) |
| `/speckit.taskstoissues` | Execute Jira-to-GitLab operational flow for a task. | [FA](#fa-speckit-taskstoissues) | [EN](#en-speckit-taskstoissues) |
| `/speckit.taskclose` | Finalize task documentation and rollup artifacts. | [FA](#fa-speckit-taskclose) | [EN](#en-speckit-taskclose) |
| `/speckit.codereview` | Run Claude review-only flow on linked MR after implementation done. | [FA](#fa-speckit-codereview) | [EN](#en-speckit-codereview) |

## Environment Endpoints (From credentials.template)

- Jira base URL: `https://nexttoptech.atlassian.net`
- Jira board URL: `https://nexttoptech.atlassian.net/jira/software/projects/AC/boards/675`
- GitLab base URL: `https://gitlab.com`
- GitLab group path: `next-top-tech/accounting`
- Workspace repo URL: `https://gitlab.com/next-top-tech/accounting/accounting-workspace`
- Project repo URL: `https://gitlab.com/next-top-tech/accounting/accounting-project`
- Prototype repo URL: `https://gitlab.com/next-top-tech/accounting/accounting-prototype`

## Persian Details

<a id="fa-speckit-constitution"></a>
### FA: `/speckit.constitution`
- هدف: ایجاد یا به روزرسانی منشور پروژه و هماهنگ سازی قالب های وابسته.
- زمان استفاده: ابتدای پروژه یا هنگام تغییر قوانین کلیدی.
- مثال:
```text
/speckit.constitution
```

<a id="fa-speckit-specify"></a>
### FA: `/speckit.specify`
- هدف: ساخت یا ویرایش `spec.md` از روی نیازمندی متنی.
- زمان استفاده: شروع فاز REFIENMENT یا شروع فیچر جدید.
- مثال:
```text
/speckit.specify پیاده سازی مدیریت چند شعبه برای حسابداری
```

<a id="fa-speckit-clarify"></a>
### FA: `/speckit.clarify`
- هدف: پیدا کردن ابهام های مهم و ثبت پاسخ ها در Spec.
- زمان استفاده: قبل از Plan زمانی که Spec ناقص یا مبهم است.
- مثال:
```text
/speckit.clarify
```

<a id="fa-speckit-plan"></a>
### FA: `/speckit.plan`
- هدف: تولید خروجی های طراحی و برنامه اجرا (مثل `plan.md`, `research.md`).
- زمان استفاده: ابتدای فاز Solution پس از مشخص شدن نیازها.
- مثال:
```text
/speckit.plan
```

<a id="fa-speckit-tasks"></a>
### FA: `/speckit.tasks`
- هدف: تولید `tasks.md` به ترتیب وابستگی.
- زمان استفاده: بعد از Plan و قبل از اجرا.
- مثال:
```text
/speckit.tasks
```

<a id="fa-speckit-checklist"></a>
### FA: `/speckit.checklist`
- هدف: ایجاد چک لیست اختصاصی برای کنترل کیفیت یا آماده بودن خروجی.
- زمان استفاده: قبل از شروع اجرا یا قبل از تحویل.
- مثال:
```text
/speckit.checklist
```

<a id="fa-speckit-analyze"></a>
### FA: `/speckit.analyze`
- هدف: تحلیل ناسازگاری بین Spec/Plan/Tasks بدون تغییر فایل ها.
- زمان استفاده: بعد از تولید Tasks و قبل از پیاده سازی کامل.
- مثال:
```text
/speckit.analyze
```

<a id="fa-speckit-implement"></a>
### FA: `/speckit.implement`
- هدف: اجرای تسک های تعریف شده در `tasks.md`.
- زمان استفاده: فاز Implementation.
- مثال:
```text
/speckit.implement
```

<a id="fa-speckit-generate-entities"></a>
### FA: `/speckit.generate-entities`
- هدف: تولید موجودیت های دامنه C# از چند سند دامنه به صورت همزمان.
- قوانین اجباری: `docs/architecture/ddd-domain-conventions.md` و `docs/architecture/security-implementation-review-rules.md`.
- زمان استفاده: وقتی Data/Domain docs آماده هستند و باید Entityها طبق قواعد استاندارد تولید شوند.
- مثال:
```text
/speckit.generate-entities --docs "docs/work-items/domain/accounting.md,docs/work-items/domain/idp.md" --out "src" --namespace "NextTopTech.Accounting" --user-key "int"
```


<a id="fa-speckit-taskstoissues"></a>
### FA: `/speckit.taskstoissues`
- هدف: اجرای کامل جریان عملیاتی Jira و GitLab برای یک Task.
- زمان استفاده: وقتی Jira Task مشخص است و باید اجرا آغاز شود.
- مثال:
```text
/speckit.taskstoissues AC-245
```

یا با URL کامل جیرا:

```text
/speckit.taskstoissues https://nexttoptech.atlassian.net/browse/AC-245
```

<a id="fa-speckit-taskclose"></a>
### FA: `/speckit.taskclose`
- هدف: نهایی سازی مستندات Task در مسیرهای Work Items و ثبت خروجی ها.
- زمان استفاده: انتهای Implementation یا هنگام انتقال به Review.
- مثال:
```text
/speckit.taskclose AC-245
```

<a id="fa-speckit-codereview"></a>
### FA: `/speckit.codereview`
- هدف: اجرای review-only توسط Claude روی MR مرتبط با Jira Task.
- زمان استفاده: بعد از اتمام پیاده سازی و آماده بودن MR برای بازبینی.
- مثال:
```text
/speckit.codereview AC-245
```

یا با URL کامل جیرا:

```text
/speckit.codereview https://nexttoptech.atlassian.net/browse/AC-245
```

## English Details

<a id="en-speckit-constitution"></a>
### EN: `/speckit.constitution`
- Purpose: Create or update project constitution and synchronize dependent templates.
- Use when: Starting a project or revising core governance rules.
- Example:
```text
/speckit.constitution
```

<a id="en-speckit-specify"></a>
### EN: `/speckit.specify`
- Purpose: Build or update `spec.md` from natural-language requirements.
- Use when: Starting REFIENMENT or defining a new feature.
- Example:
```text
/speckit.specify Implement multi-branch accounting workflow
```

<a id="en-speckit-clarify"></a>
### EN: `/speckit.clarify`
- Purpose: Resolve high-impact ambiguities and encode answers into the spec.
- Use when: Spec is underspecified before planning.
- Example:
```text
/speckit.clarify
```

<a id="en-speckit-plan"></a>
### EN: `/speckit.plan`
- Purpose: Generate planning artifacts (for example `plan.md`, `research.md`).
- Use when: Entering Solution phase after requirements are clarified.
- Example:
```text
/speckit.plan
```

<a id="en-speckit-tasks"></a>
### EN: `/speckit.tasks`
- Purpose: Generate dependency-ordered `tasks.md`.
- Use when: Plan is ready and implementation needs actionable tasks.
- Example:
```text
/speckit.tasks
```

<a id="en-speckit-checklist"></a>
### EN: `/speckit.checklist`
- Purpose: Generate a custom checklist for quality and readiness.
- Use when: Before implementation or before handoff/review.
- Example:
```text
/speckit.checklist
```

<a id="en-speckit-analyze"></a>
### EN: `/speckit.analyze`
- Purpose: Perform non-destructive consistency analysis across Spec/Plan/Tasks.
- Use when: Tasks are generated and risk review is required.
- Example:
```text
/speckit.analyze
```

<a id="en-speckit-implement"></a>
### EN: `/speckit.implement`
- Purpose: Execute implementation tasks defined in `tasks.md`.
- Use when: Entering Implementation phase.
- Example:
```text
/speckit.implement
```
<a id="en-speckit-generate-entities"></a>
### EN: `/speckit.generate-entities`
- Purpose: Generate C# domain entities across multiple domain docs in one run.
- Mandatory rules: `docs/architecture/ddd-domain-conventions.md` and `docs/architecture/security-implementation-review-rules.md`.
- Use when: Domain/data docs are ready and entities must be generated under strict conventions.
- Example:
```text
/speckit.generate-entities --docs "docs/work-items/domain/accounting.md,docs/work-items/domain/idp.md" --out "src" --namespace "NextTopTech.Accounting" --user-key "int"
```

<a id="en-speckit-taskstoissues"></a>
### EN: `/speckit.taskstoissues`
- Purpose: Run end-to-end operational Jira-to-GitLab workflow for a Jira task.
- Use when: A Jira task key or URL is provided and execution must start.
- Example:
```text
/speckit.taskstoissues AC-245
```

or with full Jira URL:

```text
/speckit.taskstoissues https://nexttoptech.atlassian.net/browse/AC-245
```

<a id="en-speckit-taskclose"></a>
### EN: `/speckit.taskclose`
- Purpose: Finalize task documentation and story rollup artifacts under work-items paths.
- Use when: Implementation is complete and completion records are required.
- Example:
```text
/speckit.taskclose AC-245
```

<a id="en-speckit-codereview"></a>
### EN: `/speckit.codereview`
- Purpose: Run Claude review-only flow against the MR linked from Jira web links.
- Use when: Implementation is done and review gate must be executed.
- Example:
```text
/speckit.codereview AC-245
```

or with full Jira URL:

```text
/speckit.codereview https://nexttoptech.atlassian.net/browse/AC-245
```

## Suggested End-to-End Sequence

1. `/speckit.specify`
2. `/speckit.clarify`
3. `/speckit.plan`
4. `/speckit.tasks`
5. `/speckit.analyze`
6. `/speckit.generate-entities --docs <DOMAIN-DOCS> --out <OUTPUT-ROOT>`
7. `/speckit.taskstoissues <JIRA-KEY>`
8. `/speckit.implement`
9. `/speckit.taskclose <JIRA-KEY>`
10. `/speckit.codereview <JIRA-KEY>`
