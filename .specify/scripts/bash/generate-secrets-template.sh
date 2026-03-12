#!/usr/bin/env bash

set -euo pipefail

if git_root=$(git rev-parse --show-toplevel 2>/dev/null); then
  REPO_ROOT="$git_root"
else
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
fi

SECRETS_DIR="$REPO_ROOT/.secrets"
TEMPLATE_FILE="$SECRETS_DIR/credentials.template"
LOCAL_FILE="$SECRETS_DIR/credentials.local"

FORCE=false
CREATE_LOCAL=false

for arg in "$@"; do
  case "$arg" in
    --force)
      FORCE=true
      ;;
    --with-local)
      CREATE_LOCAL=true
      ;;
    --help|-h)
      cat <<'EOF'
Generate .secrets template/local files.

Usage:
  ./.specify/scripts/bash/generate-secrets-template.sh [--force] [--with-local]

Options:
  --force       Overwrite existing .secrets/credentials.template
  --with-local  Also create .secrets/credentials.local from template if missing
  -h, --help    Show this help
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Use --help for usage." >&2
      exit 1
      ;;
  esac
done

mkdir -p "$SECRETS_DIR"

if [[ -f "$TEMPLATE_FILE" && "$FORCE" != true ]]; then
  echo "Template already exists: $TEMPLATE_FILE"
  echo "Use --force to overwrite it."
else
  cat > "$TEMPLATE_FILE" <<'EOF'
# Copy this file to credentials.local and replace placeholders.
# Never commit credentials.local.

# =========================
# Jira
# =========================
JIRA_BASE_URL=https://nexttoptech.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=replace-with-jira-api-token
JIRA_PROJECT_KEY=AC
JIRA_BOARD_URL=https://nexttoptech.atlassian.net/jira/software/projects/AC/boards/675
JIRA_BOARD_ID=675

# =========================
# GitLab
# =========================
GITLAB_BASE_URL=https://gitlab.com
GITLAB_TOKEN=replace-with-gitlab-token
GITLAB_GROUP_PATH=next-top-tech/accounting
GITLAB_WORKSPACE_REPO_URL=https://gitlab.com/next-top-tech/accounting/accounting-workspace
GITLAB_WORKSPACE_PROJECT_ID=79777158
GITLAB_PROJECT_REPO_URL=https://gitlab.com/next-top-tech/accounting/accounting-project
GITLAB_PROJECT_PROJECT_ID=79777164
GITLAB_PROTOTYPE_REPO_URL=https://gitlab.com/next-top-tech/accounting/accounting-prototype
GITLAB_PROTOTYPE_PROJECT_ID=79777183
GITLAB_PROJECT_ID=79777158
GITLAB_GROUP_ID=125634417

# =========================
# SSH (optional)
# =========================
SSH_PASSPHRASE=replace-with-ssh-passphrase-if-needed
EOF
  echo "Generated template: $TEMPLATE_FILE"
fi

if [[ "$CREATE_LOCAL" == true ]]; then
  if [[ -f "$LOCAL_FILE" ]]; then
    echo "Local secrets already exist: $LOCAL_FILE"
  else
    cp "$TEMPLATE_FILE" "$LOCAL_FILE"
    echo "Created local secrets file: $LOCAL_FILE"
  fi
fi

echo "Next steps:"
echo "  1) Fill values in .secrets/credentials.local"
echo "  2) Load secrets: source .specify/scripts/bash/load-secrets.sh"
