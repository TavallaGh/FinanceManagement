# SpecKit Prompts Guide (FA/EN)

This guide catalogs SpecKit-based prompts available in this workspace and explains when and how to use them.

این راهنما پرامپت های مبتنی بر SpecKit که در این پروژه در دسترس هستند را فهرست می کند و نحوه استفاده از آن ها را توضیح می دهد.

## Prompt Categories (Updated)

Both prompt trees are now categorized into three folders:

1. General Prompts
2. Story Refinement Flow Prompts
3. Implementation Phase Prompts

### Ordered Flow Prompts (0-based)

Refinement flow order:

1. `00.speckit.refine`
2. `01.speckit.solution`
3. `02.speckit.tasks`

Implementation phase order:

1. `00.speckit.taskstoissues`
2. `01.speckit.start-task`
3. `02.speckit.implement`
4. `03.speckit.taskcompletion`
5. `04.speckit.taskclose`

### Prompt Index

| Prompt | Category | Short Description | Persian Guide | English Guide |
|---|---|---|---|---|
| `/speckit.constitution` | General | Create or update project constitution and sync dependent templates. | [FA](#fa-speckit-constitution) | [EN](#en-speckit-constitution) |
| `/speckit.clarify` | General | Ask targeted clarification questions and encode answers into spec. | [FA](#fa-speckit-clarify) | [EN](#en-speckit-clarify) |
| `/speckit.checklist` | General | Generate a requirements-quality checklist. When given a story key, saves to the story's refinement folder. | [FA](#fa-speckit-checklist) | [EN](#en-speckit-checklist) |
| `/speckit.analyze` | General | Run cross-artifact consistency analysis. | [FA](#fa-speckit-analyze) | [EN](#en-speckit-analyze) |
| `/speckit.generate-entities` | General | Generate multi-domain C# entities from domain docs with mandatory DDD/security rules. | [FA](#fa-speckit-generate-entities) | [EN](#en-speckit-generate-entities) |
| `/speckit.codereview` | General (Claude flow) | Run Claude review-only flow on linked MR after implementation done. | [FA](#fa-speckit-codereview) | [EN](#en-speckit-codereview) |
| `/speckit.refine` | Story Refinement Flow | **[Work-Items Flow]** Generate Refinement artifact + checklist for a Jira story under `docs/work-items/00.refinement/`. | [FA](#fa-speckit-refine) | [EN](#en-speckit-refine) |
| `/speckit.solution` | Story Refinement Flow | **[Work-Items Flow]** Generate `solution.md` + `task-plan.md` for an approved refined story under `docs/work-items/01.solution/`. | [FA](#fa-speckit-solution) | [EN](#en-speckit-solution) |
| `/speckit.tasks` | Story Refinement Flow | **[Work-Items Flow]** Generate per-task detail files from solution and upload tasks as Jira subtasks under the parent story. | [FA](#fa-speckit-tasks) | [EN](#en-speckit-tasks) |
| `/speckit.taskstoissues` | Implementation Phase | Execute Jira-to-GitLab operational flow for a task. | [FA](#fa-speckit-taskstoissues) | [EN](#en-speckit-taskstoissues) |
| `/speckit.start-task` | Implementation Phase | Start task in documentation-first mode and gate implementation on approval. | N/A | N/A |
| `/speckit.implement` | Implementation Phase | Execute implementation tasks. | [FA](#fa-speckit-implement) | [EN](#en-speckit-implement) |
| `/speckit.taskclose` | Implementation Phase | Finalize task documentation and rollup artifacts. | [FA](#fa-speckit-taskclose) | [EN](#en-speckit-taskclose) |
| `/speckit.taskcompletion` | Implementation Phase | Create/update completion markdown for story/task completion output. | N/A | N/A |

## Work-Items Flow Overview

The primary workflow for Jira story execution follows this sequence:

```
/speckit.refine <STORY-KEY>      (00)
   ↓  (generates docs/work-items/00.refinement/linked/stories/<KEY>/refinement.md + checklists/)
/speckit.checklist <STORY-KEY>     ← optional extra checklist passes
   ↓
[Tech Lead + PO approve refinement]
   ↓
/speckit.solution <STORY-KEY>    (01)
   ↓  (generates docs/work-items/01.solution/linked/stories/<KEY>/solution.md + task-plan.md + tasks/)
[Tech Lead + PO approve solution]
   ↓
/speckit.tasks <STORY-KEY>       (02)
   ↓  (generates per-task detail files + uploads as Jira subtasks under parent story)
/speckit.taskstoissues <TASK-KEY>  (00 implementation)
/speckit.start-task <TASK-KEY>     (01 implementation)
/speckit.implement                 (02 implementation)
/speckit.taskclose <TASK-KEY>      (03 implementation)
/speckit.taskcompletion <TASK-KEY> (04 implementation)
/speckit.codereview <TASK-KEY>
```

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

<a id="fa-speckit-refine"></a>
### FA: `/speckit.refine`
- هدف: تولید مستند Refinement کامل برای یک Story جیرا، شامل تحلیل عمیق مشکل، AoC، DoD، تقسیم‌بندی Capability Slice ها، و چک‌لیست کیفیت.
- زمان استفاده: شروع فاز Refinement برای یک Story جیرا. قبل از هر Solution یا پیاده‌سازی.
- خروجی: `docs/work-items/00.refinement/linked/stories/<KEY>/refinement.md` + `checklists/requirements-checklist.md`
- مثال:
```text
/speckit.refine AC-14
```

<a id="fa-speckit-clarify"></a>
### FA: `/speckit.clarify`
- هدف: پیدا کردن ابهام های مهم و ثبت پاسخ ها در Spec.
- زمان استفاده: قبل از Solution زمانی که Refinement ناقص یا مبهم است.
- مثال:
```text
/speckit.clarify
```

<a id="fa-speckit-solution"></a>
### FA: `/speckit.solution`
- هدف: تولید `solution.md` و `task-plan.md` برای یک Story تأییدشده. شامل تصمیمات فنی، تجزیه وظایف، و مدل Task Packaging.
- زمان استفاده: بعد از تأیید Refinement توسط Tech Lead و PO. قبل از ایجاد Subtask های جیرا.
- خروجی: `docs/work-items/01.solution/linked/stories/<KEY>/solution.md` + `task-plan.md` + `tasks/<TASK-KEY>.md`
- مثال:
```text
/speckit.solution AC-14
```

<a id="fa-speckit-tasks"></a>
### FA: `/speckit.tasks`
- هدف: تولید فایل‌های جزئیات هر Task از Solution و آپلود آن‌ها به جیرا به عنوان Subtask زیر Story والد.
- زمان استفاده: بعد از تأیید Solution توسط Tech Lead و PO.
- خروجی: فایل‌های `tasks/<KEY>.md` به‌روزرسانی شده + Subtask های جیرا ایجادشده
- مثال:
```text
/speckit.tasks AC-14
```

<a id="fa-speckit-checklist"></a>
### FA: `/speckit.checklist`
- هدف: تولید چک لیست کیفیت نیازمندی‌ها (نه تست پیاده‌سازی). هر آیتم یک سؤال از نوع «آیا نیازمندی X کامل/واضح/قابل اندازه‌گیری است؟» می‌باشد.
- زمان استفاده: بعد از Refinement یا Solution برای اعتبارسنجی کیفیت مستندات.
- خروجی با Story Key: `docs/work-items/00.refinement/linked/stories/<KEY>/checklists/<domain>.md`
- مثال با Story Key:
```text
/speckit.checklist AC-14
```
- مثال بدون Story Key (فیچر آزاد):
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

<a id="en-speckit-refine"></a>
### EN: `/speckit.refine`
- Purpose: Generate a full Refinement artifact for a Jira story. Reads Refinement README and templates. Fetches story from Jira. Generates `refinement.md` (problem narrative, AoC, DoD, capability slices, dependencies, open questions) and `requirements-checklist.md`.
- Use when: Starting the Refinement phase for a Jira story. Must run before Solution.
- Output: `docs/work-items/00.refinement/linked/stories/<KEY>/refinement.md` + `checklists/requirements-checklist.md`
- Example:
```text
/speckit.refine AC-14
```

> **Note**: `/speckit.specify` is retained for free-form (non-Jira) feature specs only.

<a id="en-speckit-clarify"></a>
### EN: `/speckit.clarify`
- Purpose: Resolve high-impact ambiguities and encode answers into the spec.
- Use when: Spec is underspecified before planning.
- Example:
```text
/speckit.clarify
```

<a id="en-speckit-solution"></a>
### EN: `/speckit.solution`
- Purpose: Generate `solution.md` + `task-plan.md` for an approved refined story. Reads Solution README and templates. Produces technical decisions, work breakdown, aggregated task table, and optional per-task detail files.
- Use when: Refinement is approved by Tech Lead and PO. Before creating Jira subtasks.
- Output: `docs/work-items/01.solution/linked/stories/<KEY>/solution.md` + `task-plan.md` + `tasks/*.md`
- Example:
```text
/speckit.solution AC-14
```

<a id="en-speckit-tasks"></a>
### EN: `/speckit.tasks`
- Purpose: Generate per-task detail files from an approved Solution artifact and upload all tasks as Jira subtasks under the parent story. Uses Solution README templates as the standard format.
- Use when: Solution is approved and tasks are ready for Jira import.
- Output: Updated `task-plan.md` with real Jira keys + per-task `tasks/<KEY>.md` files + Jira subtasks created
- Example:
```text
/speckit.tasks AC-14
```

<a id="en-speckit-checklist"></a>
### EN: `/speckit.checklist`
- Purpose: Generate a requirements-quality checklist ("unit tests for requirements writing"). When a story key is provided, saves output to the story's refinement `checklists/` folder.
- Use when: After Refinement or Solution to validate quality and completeness of artifacts.
- Output with story key: `docs/work-items/00.refinement/linked/stories/<KEY>/checklists/<domain>.md`
- Example with story key:
```text
/speckit.checklist AC-14
```
- Example free-form:
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

## Suggested End-to-End Sequence (Work-Items Flow)

1. `/speckit.refine <STORY-KEY>` — Generate Refinement artifact + requirements checklist
2. `/speckit.checklist <STORY-KEY>` — (optional) Additional checklist passes on refinement
3. `/speckit.clarify` — Resolve open questions before solution
4. **[Approval Gate]** Tech Lead + PO approve Refinement
5. `/speckit.solution <STORY-KEY>` — Generate `solution.md` + `task-plan.md`
6. **[Approval Gate]** Tech Lead + PO approve Solution
7. `/speckit.tasks <STORY-KEY>` — Generate per-task files + upload as Jira subtasks
8. `/speckit.analyze` — Cross-artifact consistency check
9. `/speckit.generate-entities --docs <DOMAIN-DOCS> --out <OUTPUT-ROOT>` — (if entities needed)
10. Per subtask: `/speckit.taskstoissues <TASK-KEY>` — Start Jira-to-GitLab flow
11. Per subtask: `/speckit.start-task <TASK-KEY>` — Prepare approved implementation package
12. `/speckit.implement` — Execute implementation
13. `/speckit.taskclose <TASK-KEY>` — Finalize task docs
14. `/speckit.taskcompletion <TASK-KEY>` — Write completion markdown
15. `/speckit.codereview <TASK-KEY>` — Claude MR review

