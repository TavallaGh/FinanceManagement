# Story REFIENMENT Standard: {{STORY_KEY}}

## 1. Story Identity

- Jira Story: {{JIRA_URL}}
- Story Key: {{STORY_KEY}}
- Epic: {{EPIC_NAME}}
- Reporter/Owner: {{OWNER_NAME}}
- REFIENMENT Date: {{YYYY-MM-DD}}
- REFIENMENT Status: {{draft|in-review|approved}}

## 2. Purpose of REFIENMENT

- Goal: Agent پروژه را بفهمد.
- This document is for deep understanding before solution/implementation.
- This phase does NOT create tasks.

## 3. Source Inputs Reviewed

- Jira description: {{SUMMARY}}
- Jira comments: {{SUMMARY}}
- Jira attachments: {{LIST}}
- Related docs: {{PATHS}}

## 4. Problem Narrative (Why)

### 4.1 Current Problem

- What is wrong today: {{DETAILS}}
- Where it happens: {{MODULES_PAGES_PROCESS}}
- Who is impacted: {{ROLES_USERS}}

### 4.2 Business Impact

- Operational impact: {{DETAILS}}
- Risk impact: {{DETAILS}}
- Compliance/security impact: {{DETAILS}}

### 4.3 Target Outcome

- What should become true after this story: {{DETAILS}}

## 5. Extracted Story Contract

### 5.1 Description (Extracted)

- Extracted/normalized description:
  - {{ITEM_1}}
  - {{ITEM_2}}

### 5.2 AoC (Acceptance of Completion / Acceptance Criteria)

- AoC-01: {{CRITERION}}
- AoC-02: {{CRITERION}}
- AoC-03: {{CRITERION}}

### 5.3 DoD (Definition of Done)

- DoD-01: {{DONE_CONDITION}}
- DoD-02: {{DONE_CONDITION}}
- DoD-03: {{DONE_CONDITION}}

## 6. Scope Decomposition (Smallest Story Parts)

- Capability slice 1: {{NAME}}
  - detail: {{DETAILS}}
- Capability slice 2: {{NAME}}
  - detail: {{DETAILS}}
- Capability slice 3: {{NAME}}
  - detail: {{DETAILS}}

## 7. Out of Scope

- Explicitly excluded in this story:
  - {{ITEM_1}}
  - {{ITEM_2}}

## 8. Dependency and Constraints

- Functional dependencies: {{ITEMS}}
- Technical dependencies: {{ITEMS}}
- Constraints: {{ITEMS}}

## 9. Probable Task Landscape (No Task Creation Here)

- Estimated task clusters:
  - Backend: {{COUNT_TOPICS}}
  - Frontend: {{COUNT_TOPICS}}
  - QA/Validation: {{COUNT_TOPICS}}
  - Docs/Release: {{COUNT_TOPICS}}

- Relative effort:
  - Low / Medium / High: {{SELECTION}}
  - Rationale: {{SHORT_REASON}}

## 10. Risks and Unknowns

- Risk-01: {{DESCRIPTION}} | mitigation: {{PLAN}}
- Risk-02: {{DESCRIPTION}} | mitigation: {{PLAN}}

## 11. REFIENMENT Conclusion

- Readiness recommendation:
  - Ready for Solution: {{YES_NO}}
  - Conditions if no: {{CONDITIONS}}

## 12. Approval Gate

- Tech Lead Review:
  - Name: {{NAME}}
  - Decision: {{APPROVED_OR_CHANGES_REQUESTED}}
  - Notes: {{NOTES}}

- Product Owner Review:
  - Name: {{NAME}}
  - Decision: {{APPROVED_OR_CHANGES_REQUESTED}}
  - Notes: {{NOTES}}

- Final REFIENMENT Decision:
  - {{APPROVED_OR_NOT_APPROVED}}
