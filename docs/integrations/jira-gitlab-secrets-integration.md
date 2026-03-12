# Jira and GitLab Secrets Integration

This guide explains how to use local credentials from `.secrets/credentials.local` for Jira and GitLab automation in this workspace.

## Operational policy for task prompts

- Task-oriented prompts run in operational mode by default.
- The agent updates Jira status and performs required GitLab operations using credentials loaded from `.secrets/credentials.local`.
- If credentials are missing/placeholder values, execution must stop with a remediation message.

## 1) Create local credentials file

```powershell
Copy-Item .secrets/credentials.template .secrets/credentials.local
```

Or generate template/local files via bash:

```bash
./.specify/scripts/bash/generate-secrets-template.sh
./.specify/scripts/bash/generate-secrets-template.sh --with-local
```

Fill values in `.secrets/credentials.local`:

- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_PROJECT_KEY`
- `JIRA_BOARD_URL`
- `JIRA_BOARD_ID`
- `GITLAB_BASE_URL`
- `GITLAB_TOKEN`
- `GITLAB_GROUP_PATH`
- `GITLAB_WORKSPACE_REPO_URL`
- `GITLAB_WORKSPACE_PROJECT_ID`
- `GITLAB_PROJECT_REPO_URL`
- `GITLAB_PROJECT_PROJECT_ID`
- `GITLAB_PROTOTYPE_REPO_URL`
- `GITLAB_PROTOTYPE_PROJECT_ID`
- `GITLAB_PROJECT_ID`

Pre-filled defaults already include this workspace context:

- Jira: `https://nexttoptech.atlassian.net`, project key `AC`, board `675`
- GitLab workspace repo: `79777158`
- GitLab accounting-project repo: `79777164`
- GitLab accounting-prototype URL is set; `79777183`

## 2) Load secrets into environment

PowerShell:

```powershell
. .specify/scripts/powershell/load-secrets.ps1 -MaskOutput
```

Bash:

```bash
source .specify/scripts/bash/load-secrets.sh
```

## 3) Use with Codex task-to-issue flow

The prompt `.codex/prompts/speckit.taskstoissues.md` is configured to:

- Read a Jira task key/link and fetch task details.
- Update Jira status for workflow execution.
- Perform GitLab issue/MR/branch operations in configured repositories.
- Maintain bi-directional Jira↔GitLab links.
- Return a summary with final status and created/reused artifacts.

## 4) Required Jira/GitLab governance for MVP

- Enforce Jira board statuses: `Backlog`, `To Do` (WIP limit `16`), `In Progress`, `In Review`, `PO Review`, `Done`.
- Enforce required Jira metadata on stories/tasks:
	- `AoC`, `DoD`, `Test Cases`, `Fix Version`, `Epic`, labels.
- Enforce fix version for MVP scope: `V 0.1 (MVP)`.
- Enforce Jira↔GitLab traceability:
	- GitLab issue per story and standalone task.
	- MR linked to corresponding GitLab issue.
	- Jira Web Links for task/story MRs and issue URLs as defined by workflow docs.
- Enforce GitLab milestone creation for releases.

## Security notes

- Never commit `.secrets/credentials.local`.
- Never print raw token values in logs.
- Rotate tokens if there is any accidental exposure.
