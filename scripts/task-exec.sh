#!/usr/bin/env bash

set -euo pipefail

JIRA_KEY=""
STATUS_TARGET="In Progress"
REPO_MODE="auto"
CREDENTIALS_FILE=".secrets/credentials.local"
SOURCE_BRANCH=""
TARGET_BRANCH=""
DRY_RUN="false"
STRICT_METADATA="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --jira) JIRA_KEY="$2"; shift 2 ;;
    --status) STATUS_TARGET="$2"; shift 2 ;;
    --repo) REPO_MODE="$2"; shift 2 ;;
    --credentials) CREDENTIALS_FILE="$2"; shift 2 ;;
    --source) SOURCE_BRANCH="$2"; shift 2 ;;
    --target) TARGET_BRANCH="$2"; shift 2 ;;
    --dry-run) DRY_RUN="true"; shift ;;
    --strict-metadata) STRICT_METADATA="true"; shift ;;
    -h|--help)
      cat <<'EOF'
Usage:
  ./scripts/task-exec.sh --jira AC-123 [--status "In Progress"] [--repo auto|workspace|project|prototype]
                        [--source branch --target branch] [--dry-run] [--strict-metadata]
EOF
      exit 0
      ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$JIRA_KEY" ]]; then
  echo "--jira is required" >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
FULL_CRED_PATH="$REPO_ROOT/$CREDENTIALS_FILE"

if [[ ! -f "$FULL_CRED_PATH" ]]; then
  echo "Credentials file not found: $FULL_CRED_PATH" >&2
  exit 1
fi

while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$'\r'}"
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  [[ ! "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  export "$key=$value"
done < "$FULL_CRED_PATH"

is_placeholder() {
  local v="${1:-}"
  [[ -z "$v" ]] && return 0
  local lv
  lv="$(echo "$v" | tr '[:upper:]' '[:lower:]')"
  [[ "$lv" == replace-with* || "$lv" == your-* || "$lv" == *example.com* ]]
}

require_env() {
  local name="$1"
  local value="${!name:-}"
  if is_placeholder "$value"; then
    echo "Missing or placeholder value for $name" >&2
    exit 1
  fi
}

require_env JIRA_BASE_URL
require_env JIRA_EMAIL
require_env JIRA_API_TOKEN
require_env JIRA_PROJECT_KEY
require_env GITLAB_BASE_URL
require_env GITLAB_TOKEN
require_env GITLAB_WORKSPACE_PROJECT_ID
require_env GITLAB_PROJECT_PROJECT_ID
require_env GITLAB_PROTOTYPE_PROJECT_ID

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for scripts/task-exec.sh" >&2
  exit 1
fi

JIRA_AUTH_B64="$(printf '%s:%s' "$JIRA_EMAIL" "$JIRA_API_TOKEN" | base64 | tr -d '\r\n')"

EPIC_FIELD="${JIRA_FIELD_EPIC:-customfield_10014}"
AOC_FIELD="${JIRA_FIELD_AOC:-}"
DOD_FIELD="${JIRA_FIELD_DOD:-}"
TEST_CASES_FIELD="${JIRA_FIELD_TEST_CASES:-}"

FIELDS="summary,issuetype,status,labels,fixVersions,$EPIC_FIELD"
[[ -n "$AOC_FIELD" ]] && FIELDS="$FIELDS,$AOC_FIELD"
[[ -n "$DOD_FIELD" ]] && FIELDS="$FIELDS,$DOD_FIELD"
[[ -n "$TEST_CASES_FIELD" ]] && FIELDS="$FIELDS,$TEST_CASES_FIELD"

ISSUE_JSON="$(curl -sS --fail \
  --request GET \
  --url "$JIRA_BASE_URL/rest/api/3/issue/$JIRA_KEY?fields=$FIELDS" \
  --header "Authorization: Basic $JIRA_AUTH_B64" \
  --header "Accept: application/json")"

SUMMARY="$(echo "$ISSUE_JSON" | jq -r '.fields.summary')"
ISSUE_TYPE_NAME="$(echo "$ISSUE_JSON" | jq -r '.fields.issuetype.name // ""')"
LABELS_JSON="$(echo "$ISSUE_JSON" | jq -c '.fields.labels // []')"

to_branch_slug() {
  local text="${1:-}"
  local slug
  slug="$(echo "$text" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-{2,}/-/g')"
  [[ -z "$slug" ]] && slug="task"
  echo "$slug"
}

resolve_branch_plan() {
  local issue_type_name="$1"
  local summary="$2"
  local task_key="$3"

  if [[ -z "$SOURCE_BRANCH" ]]; then
    local kind="features"
    local default_target="develop"

    if [[ "$issue_type_name" =~ [Bb][Uu][Gg] ]]; then
      kind="bugs"
      default_target="develop"
    elif [[ "$issue_type_name" =~ [Tt][Ee][Cc][Hh][Nn][Ii][Cc][Aa][Ll]|[Ss][Pp][Ii][Kk][Ee]|[Cc][Hh][Oo][Rr][Ee] ]]; then
      kind="technicals"
      default_target="develop"
    elif [[ "$issue_type_name" =~ [Hh][Oo][Tt][Ff][Ii][Xx] ]]; then
      kind="hotfix"
      default_target="main"
    fi

    local slug
    slug="$(to_branch_slug "$summary")"
    SOURCE_BRANCH="$kind/$(echo "$task_key" | tr '[:upper:]' '[:lower:]')-$slug"

    if [[ -z "$TARGET_BRANCH" ]]; then
      TARGET_BRANCH="$default_target"
    fi
  fi

  if [[ -z "$TARGET_BRANCH" ]]; then
    case "$SOURCE_BRANCH" in
      story/*|Story/*) TARGET_BRANCH="test" ;;
      sprint/*|Sprint/*) TARGET_BRANCH="stage" ;;
      hotfix/*|Hotfix/*) TARGET_BRANCH="main" ;;
      *) TARGET_BRANCH="develop" ;;
    esac
  fi
}

ensure_gitlab_branch_exists() {
  local branch="$1"
  local ref_branch="$2"
  local branch_enc
  branch_enc="$(printf '%s' "$branch" | jq -sRr @uri)"

  if curl -sS --fail \
    --request GET \
    --url "$GITLAB_BASE_URL/api/v4/projects/$PROJECT_ID/repository/branches/$branch_enc" \
    --header "PRIVATE-TOKEN: $GITLAB_TOKEN" >/dev/null 2>&1; then
    return
  fi

  [[ "$DRY_RUN" == "true" ]] && return

  curl -sS --fail \
    --request POST \
    --url "$GITLAB_BASE_URL/api/v4/projects/$PROJECT_ID/repository/branches" \
    --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
    --data-urlencode "branch=$branch" \
    --data-urlencode "ref=$ref_branch" >/dev/null
}

ensure_local_branch_checked_out() {
  [[ "$DRY_RUN" == "true" ]] && return

  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    return
  fi

  set +e
  git fetch origin "$TARGET_BRANCH" >/dev/null 2>&1
  git fetch origin "$SOURCE_BRANCH" >/dev/null 2>&1

  if git show-ref --verify "refs/heads/$SOURCE_BRANCH" >/dev/null 2>&1; then
    git checkout "$SOURCE_BRANCH" >/dev/null 2>&1
  elif git show-ref --verify "refs/remotes/origin/$SOURCE_BRANCH" >/dev/null 2>&1; then
    git checkout -b "$SOURCE_BRANCH" "origin/$SOURCE_BRANCH" >/dev/null 2>&1
  elif git show-ref --verify "refs/remotes/origin/$TARGET_BRANCH" >/dev/null 2>&1; then
    git checkout -b "$SOURCE_BRANCH" "origin/$TARGET_BRANCH" >/dev/null 2>&1
  elif git show-ref --verify "refs/heads/$TARGET_BRANCH" >/dev/null 2>&1; then
    git checkout -b "$SOURCE_BRANCH" "$TARGET_BRANCH" >/dev/null 2>&1
  else
    git checkout -b "$SOURCE_BRANCH" >/dev/null 2>&1
  fi

  if git show-ref --verify "refs/remotes/origin/$TARGET_BRANCH" >/dev/null 2>&1; then
    git rebase "origin/$TARGET_BRANCH" >/dev/null 2>&1
  fi
  set -e
}
if ! echo "$ISSUE_JSON" | jq -e '.fields.fixVersions[]?.name | select(. == "V 0.1 (MVP)")' >/dev/null; then
  echo "Jira issue $JIRA_KEY must include Fix Version 'V 0.1 (MVP)'" >&2
  exit 1
fi

if ! echo "$LABELS_JSON" | jq -e '.[] | select(. == "frontend" or . == "backend" or . == "blocked")' >/dev/null; then
  echo "Jira issue $JIRA_KEY must include one of labels: frontend, backend, blocked" >&2
  exit 1
fi

if [[ "$STRICT_METADATA" == "true" ]]; then
  [[ -z "$AOC_FIELD" || -z "$DOD_FIELD" || -z "$TEST_CASES_FIELD" ]] && {
    echo "Strict metadata enabled, but one or more field IDs are missing: JIRA_FIELD_AOC, JIRA_FIELD_DOD, JIRA_FIELD_TEST_CASES" >&2
    exit 1
  }
  for field in "$AOC_FIELD" "$DOD_FIELD" "$TEST_CASES_FIELD"; do
    if [[ "$(echo "$ISSUE_JSON" | jq -r --arg f "$field" '.fields[$f] // empty')" == "" ]]; then
      echo "Missing required metadata field value: $field" >&2
      exit 1
    fi
  done
fi

TRANSITIONS_JSON="$(curl -sS --fail \
  --request GET \
  --url "$JIRA_BASE_URL/rest/api/3/issue/$JIRA_KEY/transitions" \
  --header "Authorization: Basic $JIRA_AUTH_B64" \
  --header "Accept: application/json")"

TRANSITION_ID="$(echo "$TRANSITIONS_JSON" | jq -r '.transitions[] | select(.id=="21") | .id' | head -n1)"
if [[ -z "$TRANSITION_ID" ]]; then
  TRANSITION_ID="$(echo "$TRANSITIONS_JSON" | jq -r --arg t "$STATUS_TARGET" '.transitions[] | select((.to.name|ascii_downcase)==($t|ascii_downcase)) | .id' | head -n1)"
fi

[[ -z "$TRANSITION_ID" ]] && {
  echo "No transition found for target '$STATUS_TARGET'" >&2
  exit 1
}

select_project_id() {
  local mode="$1"
  local labels_json="$2"
  case "$mode" in
    workspace) echo "$GITLAB_WORKSPACE_PROJECT_ID" ; return ;;
    project) echo "$GITLAB_PROJECT_PROJECT_ID" ; return ;;
    prototype) echo "$GITLAB_PROTOTYPE_PROJECT_ID" ; return ;;
  esac

  if echo "$labels_json" | jq -e '.[] | select(. == "process" or . == "docs" or . == "workflow" or . == "automation" or . == "meta")' >/dev/null; then
    echo "$GITLAB_WORKSPACE_PROJECT_ID"
    return
  fi
  echo "$GITLAB_PROJECT_PROJECT_ID"
}

normalize_mr_title() {
  local title="$1"
  echo "$title" | sed -E 's/^[[:space:]]*[Dd][Rr][Aa][Ff][Tt][[:space:]]*:[[:space:]]*//; s/^[[:space:]]*[Ww][Ii][Pp][[:space:]]*:[[:space:]]*//'
}

to_draft_mr_title() {
  local title="$1"
  local cleaned
  cleaned="$(echo "$title" | sed -E 's/^[[:space:]]*[Dd][Rr][Aa][Ff][Tt][[:space:]]*:[[:space:]]*//; s/^[[:space:]]*[Ww][Ii][Pp][[:space:]]*:[[:space:]]*//')"
  echo "Draft: $cleaned"
}

ensure_gitlab_mr_ready() {
  local mr_json="$1"

  [[ -z "$mr_json" || "$mr_json" == "null" ]] && {
    echo ""
    return
  }

  local mr_iid mr_title mr_draft mr_wip title_prefixed ready_title
  mr_iid="$(echo "$mr_json" | jq -r '.iid // empty')"
  mr_title="$(echo "$mr_json" | jq -r '.title // ""')"
  mr_draft="$(echo "$mr_json" | jq -r '.draft // false')"
  mr_wip="$(echo "$mr_json" | jq -r '.work_in_progress // false')"

  title_prefixed="false"
  if [[ "$mr_title" =~ ^[[:space:]]*[Dd][Rr][Aa][Ff][Tt][[:space:]]*: || "$mr_title" =~ ^[[:space:]]*[Ww][Ii][Pp][[:space:]]*: ]]; then
    title_prefixed="true"
  fi

  if [[ "$mr_draft" != "true" && "$mr_wip" != "true" && "$title_prefixed" != "true" ]]; then
    echo "$mr_json"
    return
  fi

  ready_title="$(normalize_mr_title "$mr_title")"
  [[ -z "$ready_title" ]] && ready_title="$mr_title"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "$mr_json" | jq --arg t "$ready_title" '.title=$t | .draft=false | .work_in_progress=false'
    return
  fi

  curl -sS --fail \
    --request PUT \
    --url "$GITLAB_BASE_URL/api/v4/projects/$PROJECT_ID/merge_requests/$mr_iid" \
    --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
    --data-urlencode "title=$ready_title"
}

PROJECT_ID="$(select_project_id "$REPO_MODE" "$LABELS_JSON")"

resolve_branch_plan "$ISSUE_TYPE_NAME" "$SUMMARY" "$JIRA_KEY"
ensure_gitlab_branch_exists "$SOURCE_BRANCH" "$TARGET_BRANCH"

if [[ "$DRY_RUN" != "true" ]]; then
  curl -sS --fail \
    --request POST \
    --url "$JIRA_BASE_URL/rest/api/3/issue/$JIRA_KEY/transitions" \
    --header "Authorization: Basic $JIRA_AUTH_B64" \
    --header "Content-Type: application/json" \
    --data "{\"transition\":{\"id\":\"$TRANSITION_ID\"}}" >/dev/null
fi

MILESTONE_JSON="$(curl -sS --fail \
  --request GET \
  --url "$GITLAB_BASE_URL/api/v4/projects/$PROJECT_ID/milestones?search=V%200.1%20(MVP)" \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN")"

MILESTONE_ID="$(echo "$MILESTONE_JSON" | jq -r '.[] | select(.title=="V 0.1 (MVP)") | .id' | head -n1)"

if [[ -z "$MILESTONE_ID" && "$DRY_RUN" != "true" ]]; then
  MILESTONE_ID="$(curl -sS --fail \
    --request POST \
    --url "$GITLAB_BASE_URL/api/v4/projects/$PROJECT_ID/milestones" \
    --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
    --data-urlencode "title=V 0.1 (MVP)" | jq -r '.id')"
fi

ISSUE_TITLE="[$JIRA_KEY] - $SUMMARY"
GL_ISSUES_JSON="$(curl -sS --fail \
  --request GET \
  --url "$GITLAB_BASE_URL/api/v4/projects/$PROJECT_ID/issues?search=$JIRA_KEY&state=opened" \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN")"

GL_ISSUE_URL="$(echo "$GL_ISSUES_JSON" | jq -r --arg k "$JIRA_KEY" '.[] | select(.title | contains($k)) | .web_url' | head -n1)"

if [[ -z "$GL_ISSUE_URL" && "$DRY_RUN" != "true" ]]; then
  LABELS_CSV="$(echo "$LABELS_JSON" | jq -r 'join(",")')"
  ISSUE_PAYLOAD=(
    --data-urlencode "title=$ISSUE_TITLE"
    --data-urlencode "description=Jira: $JIRA_BASE_URL/browse/$JIRA_KEY"
    --data-urlencode "labels=$LABELS_CSV"
  )
  if [[ -n "$MILESTONE_ID" ]]; then
    ISSUE_PAYLOAD+=(--data-urlencode "milestone_id=$MILESTONE_ID")
  fi

  GL_ISSUE_URL="$(curl -sS --fail \
    --request POST \
    --url "$GITLAB_BASE_URL/api/v4/projects/$PROJECT_ID/issues" \
    --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
    "${ISSUE_PAYLOAD[@]}" | jq -r '.web_url')"
fi

GL_MR_URL=""
if [[ -n "$SOURCE_BRANCH" && -n "$TARGET_BRANCH" ]]; then
  GL_MR_JSON="$(curl -sS --fail \
    --request GET \
    --url "$GITLAB_BASE_URL/api/v4/projects/$PROJECT_ID/merge_requests?state=opened&source_branch=$SOURCE_BRANCH&target_branch=$TARGET_BRANCH" \
    --header "PRIVATE-TOKEN: $GITLAB_TOKEN" | jq -c '.[0] // empty')"

  if [[ -z "$GL_MR_JSON" && "$DRY_RUN" != "true" ]]; then
    desc="Related Jira: $JIRA_BASE_URL/browse/$JIRA_KEY"
    [[ -n "$GL_ISSUE_URL" ]] && desc="$desc\nRelated GitLab Issue: $GL_ISSUE_URL"
    draft_title="$(to_draft_mr_title "$ISSUE_TITLE")"

    MR_CREATE_PAYLOAD=(
      --data-urlencode "source_branch=$SOURCE_BRANCH"
      --data-urlencode "target_branch=$TARGET_BRANCH"
      --data-urlencode "title=$draft_title"
      --data-urlencode "description=$desc"
    )
    if [[ "${STATUS_TARGET,,}" == "in progress" ]]; then
      MR_CREATE_PAYLOAD+=(
        --data-urlencode "remove_source_branch=true"
        --data-urlencode "squash=true"
      )
    fi

    GL_MR_JSON="$(curl -sS --fail \
      --request POST \
      --url "$GITLAB_BASE_URL/api/v4/projects/$PROJECT_ID/merge_requests" \
      --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
      "${MR_CREATE_PAYLOAD[@]}")"
  fi

  if [[ -n "$GL_MR_JSON" && "${STATUS_TARGET,,}" == "in review" ]]; then
    GL_MR_JSON="$(ensure_gitlab_mr_ready "$GL_MR_JSON")"
  fi

  GL_MR_URL="$(echo "$GL_MR_JSON" | jq -r '.web_url // empty')"
fi

add_jira_remotelink() {
  local url="$1"
  local title="$2"
  [[ -z "$url" ]] && return
  [[ "$DRY_RUN" == "true" ]] && return

  curl -sS --fail \
    --request POST \
    --url "$JIRA_BASE_URL/rest/api/3/issue/$JIRA_KEY/remotelink" \
    --header "Authorization: Basic $JIRA_AUTH_B64" \
    --header "Content-Type: application/json" \
    --data "{\"object\":{\"url\":\"$url\",\"title\":\"$title\"}}" >/dev/null
}

add_jira_remotelink "$GL_ISSUE_URL" "GitLab Issue"
add_jira_remotelink "$GL_MR_URL" "GitLab MR"

ensure_local_branch_checked_out

LOG_DIR="$REPO_ROOT/logs/task-exec"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/${JIRA_KEY}-$(date +%Y%m%d-%H%M%S).json"

cat > "$LOG_FILE" <<EOF
{
  "jiraKey": "${JIRA_KEY}",
  "jiraUrl": "${JIRA_BASE_URL}/browse/${JIRA_KEY}",
  "transitionApplied": "$( [[ "$DRY_RUN" == "true" ]] && echo "dry-run:$STATUS_TARGET" || echo "$STATUS_TARGET" )",
  "gitlabProjectId": "${PROJECT_ID}",
  "gitlabIssueUrl": "${GL_ISSUE_URL}",
  "gitlabMrUrl": "${GL_MR_URL}",
  "sourceBranch": "${SOURCE_BRANCH}",
  "targetBranch": "${TARGET_BRANCH}",
  "dryRun": ${DRY_RUN},
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

cat "$LOG_FILE"
