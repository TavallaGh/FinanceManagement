# REPO-ROUTING

This file defines default routing between the three GitLab repositories.

## Repositories

- Workspace repo (`Accounting-Workspace`)
  - URL: `https://gitlab.com/next-top-tech/accounting/accounting-workspace`
  - Project ID: `79777158`
- Project repo (`Accounting-Project`)
  - URL: `https://gitlab.com/next-top-tech/accounting/accounting-project`
  - Project ID: `79777164`
- Prototype repo (`Accounting-Prototype`)
  - URL: `https://gitlab.com/next-top-tech/accounting/accounting-prototype`
  - Project ID: `79777183`

## Routing Policy

Use explicit override when available. Otherwise `auto` uses these rules:

1. If item is process/docs/workflow/automation/meta → route to `workspace`.
2. Product implementation work (both `frontend` and `backend`) → route to `project`.
3. Fallback default for delivery tasks/stories/bugs/technicals/hotfixes → `project`.

`prototype` is **not** an auto-routing target. It is a product design reference repository and should only be selected with explicit override when needed.

## Type-Based Defaults

- Story task branch (`features/*`, `bugs/*`, `technicals/*`) → `project`.
- Story promotion (`story/*`) and sprint (`sprint/*`) artifacts → same repo as related task cluster.
- Standalone non-product process tasks → `workspace`.
- Hotfixes → `project` by default (unless explicit override is required).

## Environment Variables Used by Executors

- `GITLAB_WORKSPACE_PROJECT_ID`
- `GITLAB_PROJECT_PROJECT_ID`
- `GITLAB_PROTOTYPE_PROJECT_ID`
- `GITLAB_GROUP_PATH`

## Override Strategy

Executors accept explicit repo override:

- `workspace`
- `project`
- `prototype`
- `auto` (default)
