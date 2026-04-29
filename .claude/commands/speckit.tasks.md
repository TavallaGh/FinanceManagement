---
description: Generate dependency-ordered tasks from an approved Solution artifact and upload them as Jira subtasks under the parent story. Reads Solution README and templates. Outputs task-plan.md and per-task detail files, then creates Jira subtasks.
handoffs:
  - label: Analyze For Consistency
    agent: speckit.analyze
    prompt: Run a project analysis for consistency
    send: true
  - label: Implement Project
    agent: speckit.implement
    prompt: Start the implementation in phases
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).
The argument is a Jira Story key (e.g. `AC-14`) or a full Jira story URL.

---

## Outline

### Step 1 — Load Work-Items Solution Rules

Read the following files before generating anything:

1. `docs/work-items/01.solution/README.md` — Phase rules and task packaging model.
2. `docs/work-items/01.solution/templates/solution-story-task-plan.template.md` — Task plan template.
3. `docs/work-items/01.solution/templates/solution-agentic-task.template.md` — Per-task detail template.

Reference examples:

- `docs/work-items/01.solution/linked/stories/AC-13/task-plan.md`
- `docs/work-items/01.solution/linked/stories/AC-13/tasks/AC-27.md`

---

### Step 2 — Load Approved Solution Artifacts

Derive the story key from `$ARGUMENTS`.

Read:

1. `docs/work-items/01.solution/linked/stories/{STORY_KEY}/solution.md`
2. `docs/work-items/01.solution/linked/stories/{STORY_KEY}/task-plan.md`

If neither file exists: **ERROR** — "Solution artifacts not found. Run `/speckit.solution {STORY_KEY}` first and get it approved."

Extract from solution:
- Story key, Jira URL
- Non-functional requirements
- Technical decisions
- Work breakdown (proposed tasks with names, stacks, priorities)

Extract from task-plan:
- All proposed tasks from the aggregated task landscape table
- Dependencies between tasks
- Jira mapping rule (subtask under story)

---

### Step 3 — Load Credentials

Load `.secrets/credentials.local` and extract:
- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`

Validate credentials before proceeding.

---

### Step 4 — Generate Per-Task Detail Files

For each proposed task in the task plan (from `task-plan.md` task table):

Output path: `docs/work-items/01.solution/linked/stories/{STORY_KEY}/tasks/{TASK_SLUG}.md`

Use `solution-agentic-task.template.md` structure. Fill each section with task-specific content:
- Task Identity (parent story, name, stack, status = draft)
- Description (full detailed description)
- Goal Of Task
- What Problem This Task Should Be Done For
- AoC items (numbered, specific and testable)
- Scope (in/out)
- TDD Coverage
- BDD Scenarios
- DoD items
- Execution Notes (dependencies, risks, verification checkpoints)
- Source Traceability

Quality bar: match the detail of `docs/work-items/01.solution/linked/stories/AC-13/tasks/AC-27.md`.

---

### Step 5 — Create Jira Subtasks

For each task in the task plan, create a Jira subtask under the parent story:

```
POST {JIRA_BASE_URL}/rest/api/3/issue
Authorization: Basic base64({JIRA_EMAIL}:{JIRA_API_TOKEN})
Content-Type: application/json

{
  "fields": {
    "project": { "key": "{PROJECT_KEY}" },
    "parent": { "key": "{STORY_KEY}" },
    "summary": "{TASK_NAME}",
    "issuetype": { "name": "Subtask" },
    "description": {
      "version": 1,
      "type": "doc",
      "content": [...]   // AoC, DoD, Goal, Problem from task detail file
    },
    "labels": [...],     // inherit from parent story + task-specific
    "fixVersions": [{ "name": "V 0.1 (MVP)" }]
  }
}
```

Rules:
- All tasks become Jira subtasks under `{STORY_KEY}`.
- Fix Version must be `V 0.1 (MVP)`.
- AoC, DoD, Goal, and Problem fields must be populated from the task detail file.
- After creation, record the Jira subtask key returned by the API.
- Update the per-task detail file: replace `TBD` key with the real Jira key.
- Update `task-plan.md` table: replace `TBD-xx` keys with real Jira keys.

---

### Step 6 — Report

Print a summary:

- Story key and Jira URL
- List of created Jira subtasks: key, name, URL
- Paths to all generated per-task detail files
- Updated `task-plan.md` path
- Reminder: tasks are now in Jira Backlog; use `/speckit.taskstoissues <TASK_KEY>` to start each task

Context for task generation: $ARGUMENTS

The tasks.md should be immediately executable - each task must be specific enough that an LLM can complete it without additional context.

## Task Generation Rules

**CRITICAL**: Tasks MUST be organized by user story to enable independent implementation and testing.

**Tests are OPTIONAL**: Only generate test tasks if explicitly requested in the feature specification or if user requests TDD approach.

### Checklist Format (REQUIRED)

Every task MUST strictly follow this format:

```text
- [ ] [TaskID] [P?] [Story?] Description with file path
```

**Format Components**:

1. **Checkbox**: ALWAYS start with `- [ ]` (markdown checkbox)
2. **Task ID**: Sequential number (T001, T002, T003...) in execution order
3. **[P] marker**: Include ONLY if task is parallelizable (different files, no dependencies on incomplete tasks)
4. **[Story] label**: REQUIRED for user story phase tasks only
   - Format: [US1], [US2], [US3], etc. (maps to user stories from spec.md)
   - Setup phase: NO story label
   - Foundational phase: NO story label  
   - User Story phases: MUST have story label
   - Polish phase: NO story label
5. **Description**: Clear action with exact file path

**Examples**:

- ✅ CORRECT: `- [ ] T001 Create project structure per implementation plan`
- ✅ CORRECT: `- [ ] T005 [P] Implement authentication middleware in src/middleware/auth.py`
- ✅ CORRECT: `- [ ] T012 [P] [US1] Create User model in src/models/user.py`
- ✅ CORRECT: `- [ ] T014 [US1] Implement UserService in src/services/user_service.py`
- ❌ WRONG: `- [ ] Create User model` (missing ID and Story label)
- ❌ WRONG: `T001 [US1] Create model` (missing checkbox)
- ❌ WRONG: `- [ ] [US1] Create User model` (missing Task ID)
- ❌ WRONG: `- [ ] T001 [US1] Create model` (missing file path)

### Task Organization

1. **From User Stories (spec.md)** - PRIMARY ORGANIZATION:
   - Each user story (P1, P2, P3...) gets its own phase
   - Map all related components to their story:
     - Models needed for that story
     - Services needed for that story
     - Interfaces/UI needed for that story
     - If tests requested: Tests specific to that story
   - Mark story dependencies (most stories should be independent)

2. **From Contracts**:
   - Map each interface contract → to the user story it serves
   - If tests requested: Each interface contract → contract test task [P] before implementation in that story's phase

3. **From Data Model**:
   - Map each entity to the user story(ies) that need it
   - If entity serves multiple stories: Put in earliest story or Setup phase
   - Relationships → service layer tasks in appropriate story phase

4. **From Setup/Infrastructure**:
   - Shared infrastructure → Setup phase (Phase 1)
   - Foundational/blocking tasks → Foundational phase (Phase 2)
   - Story-specific setup → within that story's phase

### Phase Structure

- **Phase 1**: Setup (project initialization)
- **Phase 2**: Foundational (blocking prerequisites - MUST complete before user stories)
- **Phase 3+**: User Stories in priority order (P1, P2, P3...)
  - Within each story: Tests (if requested) → Models → Services → Endpoints → Integration
  - Each phase should be a complete, independently testable increment
- **Final Phase**: Polish & Cross-Cutting Concerns
