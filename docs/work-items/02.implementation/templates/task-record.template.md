# Task Record: <TASK-KEY>

## Identity

- Jira Task: <JIRA_URL>
- Story (if applicable): <STORY_KEY / URL>
- Type: <features|bugs|technicals|hotfix>
- Fix Version: V 0.1 (MVP)
- Labels: <frontend|backend|blocked|...>

## Timeline

- Start datetime: <YYYY-MM-DD HH:mm:ss TZ>
- End datetime: <YYYY-MM-DD HH:mm:ss TZ>
- Jira Status at completion: <In Review|PO Review|Done|...>

## GitFlow Context

- Source branch: <branch>
- Target branch: <branch>
- Promotion path: <develop -> story/test -> sprint/stage -> main>

## GitLab References

- GitLab Issue: <URL>
- GitLab MR: <URL>
- MR state: <draft/open/merged>

## Delivered Changes

- <Change 1>
- <Change 2>
- <Change 3>

## Commit References

- <sha> <message>
- <sha> <message>

## API Changes (if any)

- Collection path: <docs/work-items/implementation/.../postman/...json>
- Added endpoints: <list>
- Updated endpoints: <list>
- Removed endpoints: <list>
- Endpoint mapper files: <list>
- Endpoint contract compliance (mandatory for endpoint tasks):
	- Group prefix used with `MapGroup("/api/v1/...")`: <yes/no>
	- Child routes under group are relative (no leading slash): <yes/no>
	- Each endpoint has explicit `Produces` and `WithDescription`: <yes/no>
	- Each endpoint has explicit `RequireAuthorization(...)`: <yes/no>
	- Endpoint handlers remain thin (no business/data access logic): <yes/no>

## Validation & Review Notes

- Technical review notes: <notes>
- PO review notes: <notes>

## Risks / Rollback

- Risks: <notes>
- Rollback strategy: <notes>
