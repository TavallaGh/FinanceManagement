---
description: Execute TL-approved implementation plan and deliver production-ready code in the related repository targets using TDD-first and BDD validation.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Enforce start-task approval prerequisites:
   - Require explicit TL approval for the task documentation package created in `/speckit.start-task`.
   - Require one approved artifact before coding starts:
     - Domain Design markdown package (for Domain Design tasks), or
     - Implementation Plan markdown (for non-domain tasks).
   - If approval or required artifacts are missing, stop and instruct user to run `/speckit.start-task` first.

2. Resolve implementation context from input:
   - Accept Jira task key, task markdown path, implementation-plan path, or full task content.
   - Resolve the authoritative task and approved implementation plan paths under `docs/work-items/**`.
   - If no authoritative plan is found, stop and return remediation checklist.

3. Load required references before coding:
   - Task markdown and approved implementation plan.
   - Parent solution/refinement artifacts for the same story/task.
   - AoC, DoD, and Test Cases references.
   - Governance and architecture rules:
     - AGENTS.md
     - docs/workflows/git-workflow-flows.md
     - docs/workflows/specify-codex-flow.md
     - .specify/memory/constitution.md
     - docs/architecture/ddd-domain-conventions.md
     - docs/architecture/security-implementation-review-rules.md
   - If Jira/GitLab flow is required, load `.codex/prompts/speckit.taskstoissues.md`.

4. Resolve target repositories and execution boundaries:
   - Derive target repositories from approved plan first, then from user input.
   - Require explicit mapping for:
     - Workspace/process docs repository target.
     - Product code repository target(s).
     - Expected module/service folders to modify.
   - If repository mapping is ambiguous, stop and request clarification.

5. Build mandatory traceability matrix before edits:
   - Map each AoC/DoD/Test Case to implementation tasks and tests.
   - Map each BDD scenario to executable acceptance tests.
   - Map each plan step to concrete repository paths/files to change.
   - Do not begin coding until this matrix is complete.

6. Execute implementation with strict TDD-first order:
   - Implement failing tests first (unit/contract/integration) for the mapped requirement.
   - Implement minimal production code to satisfy tests.
   - Refactor while keeping tests green.
   - Repeat per requirement slice until all mapped AoC/DoD items are complete.

7. Execute BDD acceptance verification:
   - Implement or update BDD acceptance scenarios defined in the plan.
   - Validate Given/When/Then outcomes with runnable tests or executable acceptance harnesses.
   - Capture evidence for each scenario (test output summary and coverage of expected behavior).

8. Enforce production-readiness standards:
   - No placeholder logic, TODO-only handlers, or fake responses in final implementation.
   - Apply validation, authorization, error-contract consistency, and auditability rules.
   - Include required observability hooks (logging/metrics/tracing) defined by plan.
   - Keep domain invariants in domain model/services, not controller/endpoint glue.
   - Enforce per-domain code hierarchy for all generated changes:
     - `01.Domain`: domain contracts, entities, DTOs, value objects, shared error enums/keys.
     - `02.Application`: commands/queries/handlers and orchestration only.
     - `03.Infra`: concrete implementations, persistence, integrations.
     - `04.Presentation`: endpoint/controller transport mapping only.
    - Entity-centric folders must be named by the exact entity name and remain consistent with the planned hierarchy.
   - For user-domain implementations, add structured logs at every user-related method boundary.
    - Logging and error handling are mandatory for all implemented code paths; code without both is not acceptable.
   - `GlobalResponseKey` must be used as the canonical frontend response key model for all response outcomes, not only failures.
    - Response key naming must follow:
       - `ERROR_<Entity>_<StateOrReason>`
       - `INFOMATION_<Entity>_<StateOrEvent>`
    - API contracts must return response keys; avoid plain message-only contracts.
    - Domain/service exceptions must carry response keys.

9. Multi-repo and traceability execution:
   - Keep workspace repo changes scoped to process/work-item artifacts.
   - Keep product repo changes scoped to real source code and tests.
   - Follow reuse-first Jira/GitLab policy and two-MR policy where applicable.
   - Ensure Draft MR state while in implementation, and Ready state when moving Jira to `In Review`.

10. Progress updates and task state updates:
   - Report progress by requirement slice.
   - Mark completed checklist/task items in task docs where applicable.
   - Stop on blocking failures and return exact remediation.

11. Completion validation (mandatory):
   - All mapped AoC/DoD/Test Cases implemented and verified.
   - Unit/integration/contract/BDD tests pass for changed scope.
   - Changes match approved plan scope with no unmanaged drift.
   - Security and architecture constraints validated.

12. Completion output:
   - Return concise implementation report with:
     - Task identity and approved plan path
     - Repositories and key files changed
     - Requirement traceability status (AoC/DoD/Test Cases)
     - TDD/BDD execution summary
     - Residual risks and follow-up items

## Hard Rules

- Do not implement code before TL-approved start-task package.
- Do not ignore approved repository routing.
- Do not skip tests; implementation is TDD-first and BDD-verified.
- Do not ship placeholder/prototype-only code for production tasks.
- Do not change scope beyond approved task artifacts unless explicitly approved.
