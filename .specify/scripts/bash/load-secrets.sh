#!/usr/bin/env bash

set -euo pipefail

SECRETS_FILE="${1:-.secrets/credentials.local}"

if git_root=$(git rev-parse --show-toplevel 2>/dev/null); then
  REPO_ROOT="$git_root"
else
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
fi

FULL_PATH="$REPO_ROOT/$SECRETS_FILE"

if [[ ! -f "$FULL_PATH" ]]; then
  echo "Secrets file not found: $FULL_PATH" >&2
  echo "Create it from template: cp .secrets/credentials.template .secrets/credentials.local" >&2
  exit 1
fi

loaded_count=0

while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%%$'\r'}"
  line="${line#${line%%[![:space:]]*}}"
  line="${line%${line##*[![:space:]]}}"

  [[ -z "$line" ]] && continue
  [[ "$line" =~ ^# ]] && continue
  [[ ! "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] && continue

  key="${line%%=*}"
  value="${line#*=}"

  if [[ "$value" =~ ^\".*\"$ || "$value" =~ ^\'.*\'$ ]]; then
    value="${value:1:${#value}-2}"
  fi

  export "$key=$value"
  loaded_count=$((loaded_count + 1))
done < "$FULL_PATH"

echo "Loaded $loaded_count secrets into current shell environment."
