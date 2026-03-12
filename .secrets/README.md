# Local Secrets (Do Not Commit)

This folder is for local credentials used during development.

## Best-practice usage

1. Keep real credentials only in local files inside this folder.
2. Never commit real tokens, passwords, or API keys.
3. Rotate any credential immediately if it is exposed.
4. Prefer short-lived tokens over long-lived credentials.

## Setup

Copy the template and fill your local values:

```powershell
Copy-Item .secrets/credentials.template .secrets/credentials.local
```

Or generate a safe template (and optional local file) via bash:

```bash
./.specify/scripts/bash/generate-secrets-template.sh
./.specify/scripts/bash/generate-secrets-template.sh --with-local
```

Then load environment variables from `.secrets/credentials.local`:

```powershell
. .specify/scripts/powershell/load-secrets.ps1 -MaskOutput
```

```bash
source .specify/scripts/bash/load-secrets.sh
```

After loading, tools and prompts in `.codex` and `.specify` can use these variables for Jira/GitLab API operations.

## Preconfigured non-secret defaults in this workspace

- Jira base URL: `https://nexttoptech.atlassian.net`
- Jira project key: `AC`
- Jira board URL: `https://nexttoptech.atlassian.net/jira/software/projects/AC/boards/675`
- GitLab group path: `next-top-tech/accounting`
- Workspace repo: `https://gitlab.com/next-top-tech/accounting/accounting-workspace` (`79777158`)
- Accounting-Project repo: `https://gitlab.com/next-top-tech/accounting/accounting-project` (`79777164`)
- Accounting-Prototype repo: `https://gitlab.com/next-top-tech/accounting/accounting-prototype` (fill project ID)

Only tokens and optional IDs that are still placeholders should be filled locally.
