---
description: Generate a full Refinement artifact for a Jira story under the work-items flow. Reads Refinement README and templates. Outputs refinement.md and a requirements checklist saved in the story's refinement folder.
handoffs:
  - label: Generate Solution
    agent: speckit.solution
    prompt: Generate solution for the refined story
    send: true
  - label: Clarify Requirements
    agent: speckit.clarify
    prompt: Clarify specification requirements
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

### Step 1 — Load Work-Items Refinement Rules

Read the following files to internalize rules and templates before generating anything:

1. `docs/work-items/00.refinement/README.md` — Phase rules, output goals, approval gate, and path conventions.
2. `docs/work-items/00.refinement/templates/refienment-story-standard.template.md` — Standard output template for a story-linked refinement.
3. `docs/work-items/00.refinement/templates/refienment-linked-story.template.md` — Alternative linked-story template.

Reference example for quality bar:

- `docs/work-items/00.refinement/linked/stories/AC-13/refienment.md`

---

### Step 2 — Load Credentials and Fetch Jira Story

1. Load `.secrets/credentials.local` and extract:
   - `JIRA_BASE_URL`
   - `JIRA_EMAIL`
   - `JIRA_API_TOKEN`

2. Derive the story key from `$ARGUMENTS`:
   - If full URL: extract key from path segment.
   - If bare key (e.g. `AC-14`): use as-is.

3. Fetch story details from Jira REST API:

   ```
   GET {JIRA_BASE_URL}/rest/api/3/issue/{STORY_KEY}
   Authorization: Basic base64({JIRA_EMAIL}:{JIRA_API_TOKEN})
   ```

   Extract:
   - `summary`
   - `description` (rendered text)
   - `issuetype.name`
   - `status.name`
   - `assignee`, `reporter`
   - `customfield` values for AoC, DoD, Test Cases, Epic, Fix Version, labels

4. Fetch any story comments:

   ```
   GET {JIRA_BASE_URL}/rest/api/3/issue/{STORY_KEY}/comment
   ```

5. List related local docs if any exist under:
   - `docs/work-items/00.refinement/JiraStory/{STORY_KEY}/`
   - `docs/mvp/` (search for a file matching the story subject)

---

### Step 3 — Analyze and Decompose the Story

Apply the Refinement rules from `README.md`:

- Break the story into its smallest meaningful capability slices.
- Explain the full "why":
  - What problem exists today and where.
  - Who is impacted.
  - Why it matters and what business/compliance risk exists.
- Extract and normalize `Description`, `AoC`, and `DoD` from Jira payload.
- Map a high-level cluster of probable required tasks (no Jira tasks created yet).
- Identify out-of-scope items explicitly.
- Identify dependencies and constraints.
- Identify open questions that must be resolved before Solution phase.

---

### Step 4 — Generate Refinement Artifact

Output path: `docs/work-items/00.refinement/linked/stories/{STORY_KEY}/refinement.md`

Use `refienment-story-standard.template.md` as the structure. Fill all sections:

1. Story Identity (key, URL, epic, reporter, date, status = `draft`)
2. Purpose of Refinement
3. Source Inputs Reviewed (Jira description, comments, attachments, related local docs)
4. Problem Narrative (Why) — sections 4.1 Current Problem, 4.2 Business Impact, 4.3 Target Outcome
5. Extracted Story Contract:
   - 5.1 Description (normalized)
   - 5.2 AoC (numbered, each from Jira or derived)
   - 5.3 DoD (numbered)
6. Scope Decomposition (capability slices with detail)
7. Out of Scope
8. Dependency and Constraints
9. Open Questions (anything requiring approval before Solution phase)
10. Approval Gate section (Tech Lead: pending, Product Owner: pending)

Quality bar: match the depth and detail of `docs/work-items/00.refinement/linked/stories/AC-13/refienment.md`.

---

### Step 5 — Generate Refinement Requirements Checklist

Output path: `docs/work-items/00.refinement/linked/stories/{STORY_KEY}/checklists/requirements-checklist.md`

The checklist validates the quality and completeness of the Refinement artifact — it is NOT a test plan.

Generate a checklist file with the following structure:

```markdown
# Refinement Requirements Checklist: {STORY_KEY}

**Purpose**: Validate refinement completeness and quality before proceeding to Solution phase
**Created**: {TODAY_DATE}
**Story**: [Link to refinement.md](../refinement.md)

## Completeness

- [ ] All AoC items are numbered and unambiguous
- [ ] All DoD items are defined and verifiable
- [ ] Problem narrative covers current state, business impact, and target outcome
- [ ] Scope decomposition breaks story into smallest capability slices
- [ ] Out-of-scope items are explicitly listed

## Clarity

- [ ] No AoC item is ambiguous or open to multiple interpretations
- [ ] Each capability slice has a clear description
- [ ] Dependencies and constraints are identified
- [ ] All open questions are listed with expected decision owner

## Boundary Coverage

- [ ] Security/audit requirements are covered in AoC or DoD
- [ ] Localization/RTL requirements noted if applicable
- [ ] Integration touchpoints are identified
- [ ] Out-of-scope items explicitly prevent scope creep

## Approval Readiness

- [ ] Refinement artifact is complete (no placeholder sections)
- [ ] Tech Lead has reviewed
- [ ] Product Owner has reviewed
- [ ] Jira AoC, DoD, and Fix Version fields are populated

## Notes

Items marked incomplete require refinement updates before `/speckit.solution` can proceed.
```

---

### Step 6 — Report

Print a summary:

- Story key and Jira URL
- Path to generated `refinement.md`
- Path to generated `requirements-checklist.md`
- Count of AoC items extracted
- Count of capability slices identified
- List of open questions (if any)
- Reminder: refinement must be approved before Solution phase

**IMPORTANT**: Do NOT create Jira tasks in this phase. Do NOT start solution or implementation work.
