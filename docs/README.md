# Documentation Map

This folder organizes workspace documentation by intent so process docs, integration references, and product docs are easier to find and maintain.

## Structure

- `docs/operations/`
  - Run and governance docs for day-to-day execution.
  - `WORKFLOW.md`, `RUNBOOK.md`, `REPO-ROUTING.md`
- `docs/workflows/`
  - Canonical workflow and SpecKit-related process references.
  - `git-workflow-flows.md`, `specify-codex-flow.md`, `specify-memory-flow.md`, `specify-branching-template.md`
- `docs/integrations/`
  - Jira/GitLab integration and prompt usage references.
  - `jira-gitlab-secrets-integration.md`, `prompt-usage-jira-gitlab.md`
- `docs/work-items/`
  - Phase-oriented work-item documentation tree (`REFIENMENT`, `solution`, `implementation`, `completion`).
  - Supports both independent artifacts and story/task-linked artifacts.
  - Includes bilingual SpecKit prompt reference: `SPECKIT-PROMPTS-FA-EN.md`.
- `docs/guides/`
  - End-user and developer how-to material.
- `docs/architecture/`
  - Architecture references.
  - Includes mandatory domain modeling conventions: `ddd-domain-conventions.md`.
- `docs/mvp/`
  - MVP functional/module-level documentation.

## Notes

- SpecKit core folders (`.specify/` and related generated structures) are intentionally untouched.
- Existing documentation content is preserved; only locations and cross-references were normalized.
- Domain modeling must follow `docs/architecture/ddd-domain-conventions.md`.
