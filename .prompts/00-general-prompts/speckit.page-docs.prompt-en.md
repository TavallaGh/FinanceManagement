---
description: Generate full functional & business documentation (bilingual FA/EN, two separate files) for one or more UI page source files. Requires at least one file attachment. Saves output to the same folder as the attached file(s). PAGENAME comes from the first attached file or a user-supplied name argument. ZERO technical advice — business and user-facing content only.
---

# /speckit.page-docs

Generate comprehensive, bilingual (Persian + English) functional and business documentation for the attached UI page(s).

---

## ⛔ PRE-FLIGHT CHECK — REQUIRED BEFORE ANY ACTION

**Inspect the current context for attached files.**

- If **no files are attached** to this prompt invocation:

  ```
  ❌ Cannot generate documentation.
  No source files were attached.

  Please attach one or more UI page/component files and re-run this prompt.
  Example: attach security/UserManagement.js or any screen source file.
  ```

  **STOP. Do not generate anything. Do not guess. Wait for files.**

- If **one or more files are attached**: proceed with the steps below.

---

## Absolute Non-Negotiable Rules

> **Read every rule below before writing a single word of output.
> Violating any of these rules invalidates the entire document.**

### 🚫 RULE 1 — ZERO Technical Content

This documentation is **purely functional and business-facing**.

You **MUST NOT** mention, reference, suggest, or imply:

- Any framework, library, or language name (no React, Angular, Vue, .NET, C#, TypeScript, JavaScript, SQL, Supabase, REST, API, GraphQL, HTTP, JSON, etc.)
- Any code construct (functions, hooks, state, components, classes, methods, props, variables, database tables, columns, query names, etc.)
- Any infrastructure term (server, client, endpoint, database, schema, migration, deployment, cloud, container, etc.)
- Any architectural pattern (MVC, CQRS, DDD, microservices, layered architecture, etc.)
- Any performance or implementation advice whatsoever

**Why this rule is critical:**
The backend is built on .NET and the frontend is built on Angular. This documentation will be read by business analysts, product owners, QA testers, and non-technical stakeholders. Any technical content — even seemingly harmless — can corrupt the mental model of the codebase and mislead implementation decisions.

**If you feel the urge to mention a technical detail, replace it with the business-observable behavior instead.**

Examples of forbidden vs. allowed phrasing:

| ❌ Forbidden | ✅ Allowed |
|-------------|-----------|
| "The `hashPassword()` function hashes the value using SHA-256" | "The password is securely stored after the user confirms it" |
| "The `useEffect` hook fetches data on mount" | "The page loads all required data automatically when opened" |
| "The `filteredData` memo re-computes on filter change" | "The list updates instantly as the user adjusts filter selections" |
| "Supabase returns error code 23505" | "The system detects a duplicate entry and shows an error message" |
| "The component uses ReactDOM.createPortal" | "The search dropdown appears above all other screen elements" |
| "Angular service calls the .NET endpoint" | "The page sends the entered information and receives a response" |

---

### 🚫 RULE 2 — No Advice on Technical Improvements

You **MUST NOT** suggest:

- Switching to a different technology or framework
- Refactoring patterns
- Performance optimizations using technical methods
- Security fixes involving code changes
- Database index or query optimizations
- Any "you should use X instead of Y" style recommendations

In Section 8 (Recommendations), only describe **what is missing from a business/UX perspective** — missing user feedback, missing user flows, missing business validations, missing audit trails for business compliance — all described in plain language with zero technical prescription.

---

### 🚫 RULE 3 — Source Language is Irrelevant

Do not mention, infer, or reference the programming language, framework, or runtime used to build any of the attached files. Treat the attached files as black-box UI specifications, not code.

---

## Output Specification

### Files to Create

Generate **exactly two separate Markdown files**:

1. **English version:** `USER-DOCS-{PAGENAME}-EN.md`
2. **Persian version:** `USER-DOCS-{PAGENAME}-FA.md`

**`{PAGENAME}` derivation rules (in priority order):**
1. If the user provides an explicit name as an input argument (e.g., `/speckit.page-docs MyReportName`), use that name (uppercased, spaces replaced with hyphens).
2. Otherwise, use the **first attached file's name** (without extension, uppercased, spaces replaced with hyphens) — regardless of how many files are attached.

### Output Folder

Save both files to the **same folder where the attached file(s) reside**.

- If a single file is attached: save to its parent directory.
- If multiple files are attached: save to the parent directory of the **first attached file**.
- If the attached input is an entire folder: save to that folder.

Example: if the attached file is `docs/mvp/UserManagement.js`, save to `docs/mvp/`.
Example: if multiple files from `security/` are attached, save to `security/`.
Example: if the attached folder is `docs/mvp/`, save to `docs/mvp/`.

Do **not** create a new subfolder. Do **not** use `project-docs-mvp-*` paths.

---

## Document Structure

Each file (EN and FA) must contain **all 8 sections** listed below, fully written in its own language with no mixed-language content.

---

### Section 1 — Page Description, Goal & Purpose

For each attached page/screen:

- What is the purpose of this screen in the business workflow?
- What problem does it solve for the end user?
- Who is the primary audience of this screen?
- What does a user accomplish by the end of using this screen?
- Where does this screen sit in the overall application navigation? (breadcrumb path, if identifiable)
- What data or state does this screen depend on before it can be used?

Write in plain, non-technical narrative paragraphs. No bullet lists of code artifacts.

---

### Section 2 — How the Screen Works (All Forms, Modals, Sections & Buttons)

Describe every visible and interactive element of every screen in the attached files:

#### For each screen / main view:
- What information is displayed?
- How is it organized (columns, cards, rows, sections)?
- What are the column headers and what does each column mean to the user?
- What happens when the user clicks, double-clicks, or hovers on a row?

#### For each button / action:
- What is its label?
- When is it visible or hidden?
- When is it enabled or disabled?
- What happens when the user clicks it? (Describe in user-observable terms only)
- Does it open another modal/dialog? If yes, describe that modal fully.

#### For each form / modal:
- What is the title?
- What fields does it contain?
  - Field label, placeholder, required or optional, default value, allowed values
- What validation rules apply (described as: "the system prevents saving if...")
- What does the save/confirm button do?
- What does the cancel/close button do?
- Are there any auto-fill behaviors? (e.g., "selecting a person auto-fills the contact fields")
- What happens after a successful save?
- What happens after a failed save?

#### For each section within a complex modal (tabs, panels, zones):
- What is the purpose of each zone?
- How do the zones relate to each other?
- What must the user do in each zone?

Be exhaustive. Every button, every field, every badge, every icon action must be described.

---

### Section 3 — User Stories

Write formal user stories for every meaningful interaction a user can perform on these screens.

Format:

```
US-XX | As a [role], I want to [action], so that [business outcome].
Acceptance: [What the user observes when this story is successfully completed]
```

Cover:
- Happy paths (successful operations)
- Alternative paths (e.g., user cancels, user leaves optional fields blank)
- Edge cases visible to the user (e.g., duplicate entry blocked, no results found)

Minimum: 10 user stories per screen.

---

### Section 4 — Messages, Errors & Warnings

Create a complete table of every message, error, warning, or notification a user can see on these screens.

Columns: Message Trigger | Message Text (in document language) | Message Type (Error / Warning / Info / Success) | When Shown | What the User Should Do

Include:
- Validation messages (field-level and form-level)
- System error messages
- Confirmation dialogs
- Informational notices
- Success confirmations (if any)
- Empty state messages (e.g., "No records found")
- Warning banners

---

### Section 5 — Acceptance Criteria (AC)

Write full acceptance criteria for every feature and interaction on these screens, in checklist format.

These criteria must be:
- Written from the **user's perspective** (what the user sees and experiences)
- Testable by a QA tester with no technical knowledge
- Grouped logically by feature area

Format:
```
Feature Area: [Name]
- [ ] [Observable behavior the tester verifies]
- [ ] [Observable behavior the tester verifies]
```

Cover every field, button, modal, filter, validation, and flow visible in the attached files. Be thorough — every tiny element counts.

---

### Section 6 — Filters & Search: What They Filter and How

For each filter or search input on the screen:

- What is the filter's label?
- What type of filter is it? (dropdown, free text, date range, checkbox group, etc.)
- What list of items does the filter apply to? (describe in business terms, e.g., "the main users list", "the permissions list")
- What field/attribute of each item does it filter on? (describe in business terms, e.g., "the linked person's name", "the user's active status")
- How are multiple filters combined? (AND / OR logic — describe as: "all active filters must match simultaneously")
- What happens when a filter is cleared?
- Are any filters dependent on each other? (e.g., "the Role filter only shows roles that exist in the system")

Present this as a clear table or structured list — no technical references.

---

### Section 7 — Access & Roles: Who Can Use This Screen

Define access requirements from a **business and organizational perspective**:

#### Access Model Overview
Describe in plain language how the system determines what a user can see and do (without naming any technical mechanism):
- Is access based on job role / position?
- Is there layered access (e.g., "a user gets a base set of permissions from their role, and individual extra permissions on top")?
- How does access affect what the user sees in this specific screen?

#### User Type Matrix

| User Type / Role | Can Open This Screen? | What They Can Do | What They Cannot Do |
|------------------|-----------------------|-----------------|---------------------|

Cover all user types that are relevant to the attached screens.

#### Data-Level Restrictions
If the screen supports restricting which records or data categories a user can see (e.g., only certain branches, only certain document types):
- What are those restriction categories?
- How do they affect the user's experience on this screen?
- What does a user with restrictions see vs. a user without restrictions?

---

### Section 8 — Observations & Improvement Suggestions

**⚠️ CRITICAL REMINDER: This section must contain ZERO technical content.**

Observe and describe only what is visible to the user or missing from the user's experience:

#### 🔴 Critical Business Gaps
Issues that could cause data loss, security risk to the business, or block users from completing their work. Describe the business impact — not the technical cause.

Example of allowed phrasing:
> "When saving a new user without filling the username field, nothing happens and the user receives no explanation. This leaves the user confused about why their action failed."

#### 🟡 User Experience Issues
Missing feedback, confusing flows, incomplete features, or interactions that frustrate or mislead users.

#### 🟢 Suggested Improvements
New capabilities, missing business validations, audit requirements, workflow enhancements, or usability improvements — described as business features, not technical implementations.

Each item should follow:
- **What is missing / What goes wrong:** (user-observable description)
- **Business impact:** (what this means for the business or end user)
- **Suggested improvement:** (what the user should experience instead)

---

## Execution Steps

1. **Confirm files are attached.** If not → stop and display the error message.
2. **Determine the output folder:** the parent directory of the first attached file (or the attached folder itself).
3. **Determine `{PAGENAME}`:** use the explicit name argument if provided; otherwise use the first attached file's name (no extension, uppercased, hyphens for spaces).
5. **Read all attached files thoroughly** before writing anything.
6. **Draft all 8 sections** for both language files simultaneously.
7. **Self-review:** Before saving, re-read every sentence and remove any technical term, code reference, or implementation advice. Replace with business-observable language.
7. **Save** `USER-DOCS-{PAGENAME}-EN.md` and `USER-DOCS-{PAGENAME}-FA.md` to the output folder (same directory as the first attached file).
9. **Confirm** to the user: list both file paths created, the output folder, and a one-line summary of what was documented.

---

## Final Reminder Before You Start Writing

Ask yourself for every sentence you write:

> "Could a business analyst, product owner, or QA tester who has never seen the source code understand this sentence and verify it by clicking through the UI?"

If yes → keep it.
If no → rewrite it in plain business language or remove it.

**The goal of this document is to help every person on the team — technical and non-technical — understand exactly what every screen does, for whom, and why. Nothing more.**
