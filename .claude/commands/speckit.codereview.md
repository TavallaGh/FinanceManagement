---
description: Start Claude code review for a completed Jira task using linked GitLab MR
---

# /speckit.codereview

Run a **review-only operational flow** for a Jira task that is declared implementation-complete.

## Input

- Jira key or Jira URL (example: `AC-2`)
- Optional scope flags:
  - `--dotnet` (default on)
  - `--post-approved-only` (default on)

## Required runtime behavior

1. Load credentials from `.secrets/credentials.local`.
2. Fail fast on missing placeholders/tokens.
3. Resolve Jira task by key/url.
4. Extract linked GitLab MR URL from Jira Web Links (`merge_requests/...`).
5. Validate MR belongs to configured project scope.
6. Pull MR metadata and changes.
7. Perform review (general + .NET focused):
   - Architecture/layering consistency
   - Security and secrets exposure
   - Config/runtime correctness
   - Dependency pinning and package hygiene
   - Build/test feasibility (`dotnet restore/build/test` where possible)
8. Produce findings with severity:
   - `Critical`, `High`, `Medium`, `Low`
9. Present findings to the user **one by one** and wait for approval per finding.
10. Only for approved findings, post comments to GitLab MR:
    - Prefer inline discussions when file/line mapping is available.
    - Otherwise post in MR overview discussion.
11. Continue presenting remaining findings even if a previous finding is rejected.
12. Return summary:
    - approved+posted findings
    - rejected findings
    - unresolved mapping findings

## Reviewer model

- Reviewer agent: `Claude` (review-only role)
- Implementer agent: execution agent handling code changes
- Separation of duty: reviewer does not directly change code in this flow.

## Safety and policy

- Never print raw credentials.
- Never post duplicate comments (idempotent check by tag/body hash).
- Never post outside configured Jira/GitLab scope.
- Stop on API auth failures with remediation hints.

## Suggested output structure

- Task and MR resolution details
- Findings list (ordered by severity)
- User approval decisions per finding
- Posted comment references (discussion IDs / URLs)
- Final recommendation (`Ready for merge` / `Needs fixes`)
