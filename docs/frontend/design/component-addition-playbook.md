# Design System Component Addition Playbook

## Purpose

This document defines the exact workflow for adding a new shared UI component to the design system and story-book surface in this repository.

Use this file as the execution contract for future component work so the implementation can proceed without re-explaining the expected structure, story-book behavior, or documentation format.

## When To Use This Document

Use this playbook whenever a request means any of the following:

- add a new reusable design-system component
- extend an existing shared UI component with new states or variants
- create or update story-book documentation for a shared UI component
- add form compatibility, accessibility states, or API surface to a shared component

Do not use this playbook for feature-local business components.

## Repository Source Of Truth

### Shared UI Component Location

Reusable design-system components must live in:

- `libs/shared/ui/src/lib/components/<component-name>/`

Export them through:

- `libs/shared/ui/src/lib/components/index.ts`

The library root already re-exports from the components barrel through:

- `libs/shared/ui/src/index.ts`

Do not duplicate export definitions in multiple barrels when a single re-export path is enough.

### Story-Book Location

Interactive component documentation must live in:

- `apps/erp-web/src/app/dev-tools/story-book/`

Within story-book, organize files by responsibility:

- `layout/` for shell-level layout files
- `pages/<component-name>/` for page-specific component docs
- `shared/components/` for reusable story-book-only components
- `shared/contracts/` for shared interfaces and contracts
- `shared/services/` for story-book services
- `shared/styles/` for shared story-book styles

Shared story-book page styling must come from:

- `apps/erp-web/src/app/dev-tools/story-book/shared/styles/story-book-content.scss`

Shared story-book utilities are organized by responsibility under:

- `apps/erp-web/src/app/dev-tools/story-book/shared/components/`
- `apps/erp-web/src/app/dev-tools/story-book/shared/contracts/`
- `apps/erp-web/src/app/dev-tools/story-book/shared/services/`
- `apps/erp-web/src/app/dev-tools/story-book/shared/styles/`

### Mandatory Reuse Of Existing Story-Book Components

If a component already exists under `story-book/shared/components/`, you MUST use it. Never recreate an equivalent component at the page level.

Currently available shared story-book components:

- `StoryBookCodeBlockComponent` — renders copyable, syntax-highlighted code snippets (single or tabbed via `[snippets]`). Import from `../../shared/components/code-block/story-book-code-block.component`.
- `StoryBookPreviewComponent` — wraps a live component preview with an auto-extracted or custom code block below it. Supports `[code]` for a single custom snippet, `[snippets]` for a tabbed multi-file view (e.g. HTML + TypeScript), and `[showCode]` to hide the code block entirely. Import from `../../shared/components/preview/story-book-preview.component`.

Rule: every story-book page must use `StoryBookCodeBlockComponent` for all code samples and `StoryBookPreviewComponent` for all live previews. Inline `<pre>` blocks or ad-hoc preview wrappers are not allowed.

### Mandatory Reuse Of Existing Design-System Components

Before writing any new component or using any third-party UI element, you MUST check whether the project already provides a component that covers the requirement:

1. Check `libs/shared/ui/src/lib/components/` first — this is the canonical design-system library.
2. Check `apps/erp-web/src/app/shared/` for app-scoped shared components.
3. Check the target feature's own `components/` folder for local compositions.

Do NOT:
- Create a new component if an existing one in `libs/shared/ui` already covers the need
- Import Angular Material or any third-party UI element if the project's own design system provides an equivalent
- Define an ad-hoc inline component when an existing shared component can be reused with different inputs

If an existing component is missing a variant or input needed by the task, extend the existing component. Do not create a parallel one.

Each documented page must align with the existing shell and route structure in:

- `apps/erp-web/src/app/dev-tools/story-book/story-book.routes.ts`
- `apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.ts`

### Translation Files

If story-book text changes, update both language sources:

- `public/assets/i18n/en.json`
- `public/assets/i18n/fa.json`

Never add story-book UI text in templates directly.

Before adding a new key, check whether a shared `DS_COMMON_*` or `UI_*` key already covers the value. See `docs/frontend/localization/i18n-guide.md` for the full shared-key table and deduplication rules.

## Decision Rule: New Page Or Existing Page

Before creating a new story-book page, decide whether the new item is:

### A standalone component page

Create a dedicated story-book route and page when the component has its own distinct API, visual identity, and examples.

Examples:

- button
- input text
- tag
- dialog

### A subcomponent inside an existing page

Document the item inside an existing page when it is tightly coupled to the parent component and is mostly consumed as part of that same family.

Examples:

- checkbox-group documented inside the checkbox page
- input prefix/suffix helpers documented inside the input page

Rule:

- if users are likely to search for it as an independent reusable component, give it its own page
- if it is mainly a supporting composition around another shared control, document it in the parent page unless there is a strong reason to split it

## Required Output For Every New Shared Component

When adding a component to the design system, the work is not complete until all applicable items below are done.

### 1. Shared UI Implementation

Create or update the component inside:

- `libs/shared/ui/src/lib/components/<component-name>/`

Expected structure usually includes:

- `<component-name>.component.ts`
- `<component-name>.component.html`
- `<component-name>.component.scss`

The component must:

- use `ChangeDetectionStrategy.OnPush`
- use `input()` and `output()` APIs
- stay token-driven
- stay RTL/LTR-safe
- be accessible by default
- remain reusable and business-agnostic

### 2. Barrel Exports

Update:

- `libs/shared/ui/src/lib/components/index.ts`

Only update `libs/shared/ui/src/index.ts` if the current barrel structure requires it. Prefer a single barrel source of truth.

### 3. Story-Book Documentation

Add or update the documentation page under:

- `apps/erp-web/src/app/dev-tools/story-book/pages/<component-name>/`

Use the existing checkbox page as the reference implementation for structure and density.

Use the existing tag page as the reference implementation when the component needs status variants, grouped examples, inline-text composition, or a fully translated story-book surface.

Use the shared story-book styling contract first.

Do not start by creating a dedicated SCSS file for every story-book page.

Preferred default:

- point the component `styleUrl` or `styleUrls` to `../../shared/styles/story-book-content.scss`
- build the page with the shared `story-book` block and its `__...` elements
- add a local SCSS file only if the page has truly component-specific layout or presentation that does not belong in the shared story-book layer

If a local SCSS file is added, keep it minimal and only for page-specific rules.

### 4. Story-Book Routing And Navigation

If the component gets its own page, update:

- `apps/erp-web/src/app/dev-tools/story-book/story-book.routes.ts`
- `apps/erp-web/src/app/dev-tools/story-book/layout/story-book-shell.component.ts`

Add:

- a lazy route
- a sidebar navigation item

Do not create a new route when the component should live inside an existing page.

### 5. Copyable Code Samples

Every documented example must use the shared code-block pattern already present in story-book.

Use:

- `StoryBookCodeBlockComponent`

If the example needs more than one file view, provide tabbed snippets such as:

- `ts`
- `html`
- `scss` when it adds real value

**Code block requirements:**

- Always set `[showCode]="false"` on `<app-story-book-preview>` whenever the component renders dynamic data, rows, paginators, lists, or any structure larger than a simple self-contained widget. Never rely on the auto-extracted DOM output for complex components.
- Always provide explicit code snippets in a separate `<app-story-book-code-block>` element.
- Whenever the component requires TypeScript setup (column definitions, data arrays, signal declarations, action handlers, etc.), include a TypeScript tab alongside the HTML tab:

  ```html
  <app-story-book-code-block [snippets]="[
    { label: 'TypeScript', code: _myTsSnippet },
    { label: 'HTML',       code: _myHtmlSnippet }
  ]" />
  ```

- A single HTML-only code block is only acceptable when the component has no required TypeScript setup.
- Story-book code snippets must be defined as `protected readonly` string properties in the component class — not inlined in the template.

**Story-book update is mandatory for every new or changed feature.** Adding a new input, output, variant, or behaviour to a shared component without updating its story-book page is not acceptable. The task is not complete until the story-book reflects every change.

### 6. Translations

Add all new story-book labels and descriptions to both language files in English and Persian:

- `public/assets/i18n/en.json`
- `public/assets/i18n/fa.json`

Before creating a component-specific key, check whether an existing shared key already covers the value:

- `DS_COMMON_TOC_OVERVIEW` — overview TOC entry for every component
- `DS_COMMON_IMPORT` — import TOC entry and import section heading
- `DS_COMMON_API_TITLE` — API TOC entry and API section heading
- `DS_COMMON_TOC_STATES` — states TOC entry
- `DS_COMMON_FORM_TEMPLATE` / `DS_COMMON_FORM_REACTIVE` — form section titles
- `DS_COMMON_STATE_DEFAULT/DISABLED/INVALID/WITH_VALUE` — state card titles
- `DS_COMMON_API_NAME/TYPE/DEFAULT/DESCRIPTION/PROP` — API table column headers
- `DS_COMMON_LABEL_USERNAME/EMAIL/PRICE/AMOUNT` — common field labels
- `DS_COMMON_PLACEHOLDER_DECIMAL` — decimal placeholder `0.00`
- `UI_SEARCH/SUCCESS/WARNING/ERROR/SETTINGS/BUTTON/SUBMIT/RESET/DELETE/EDIT` — common single-word UI labels

Only introduce a new `DS_[COMPONENT]_*` key when no shared key covers the concept.

See `docs/frontend/localization/i18n-guide.md` for the complete shared-key reference and deduplication rules.

### 7. Design System Documentation

Update:

- `docs/design/design-system.md`
- `docs/design/ui-components.md`

This is mandatory, not optional.

Whenever a component is created, extended, renamed, moved, or otherwise added to `libs/shared/ui`, the related documentation must be updated in the same task before the work is considered complete.

Update `design-system.md` when the rules, token guidance, or reusable UI constraints change.

Update `ui-components.md` when the shared component catalog, supported capabilities, or story-book locations change.

If the change also alters how shared tokens are consumed, update the token guidance in the same document so component docs and styling rules stay aligned.

If the component introduces icons that should be reused elsewhere, add them to the shared icon registry instead of creating a component-local icon map.

If the work introduces or changes icon usage, keep the implementation on the project Lucide path only:

- use `lucide-angular` as the icon source
- use `libs/shared/ui/src/lib/components/icon/` as the template-level wrapper
- use `libs/shared/ui/src/lib/icons/ui-icons.ts` as the shared registry
- do not introduce a second icon library or a parallel icon system without first updating the design docs and explicitly changing the rule

## Required Story-Book Page Structure

Each standalone shared component page should follow this structure unless there is a strong reason not to.

### Page sections

Include most or all of the following:

- overview
- import
- states
- sizes, if the component supports density or scale variants
- groups or composition helpers, if relevant
- inline text composition, if the component is commonly embedded inside copy
- forms, if the component participates in forms
- API

### Section metadata

Each page must expose:

- `storyBookSections`

using the contract from:

- `apps/erp-web/src/app/dev-tools/story-book/shared/contracts/story-book-page-sections.ts`

This is required so the shell can render the right-side page table of contents.

Each section entry must also follow this ID contract:

- `storyBookSections[].id` must exactly match a rendered `id` attribute inside the page markup
- place the matching `id` on the actual scroll target, typically the section wrapper or section header
- do not add section metadata for anchors that are not rendered in the scroll container

The shell now syncs the active table-of-contents item automatically while the content area scrolls, so mismatched IDs will break both active-state tracking and hash-based deep links.

## Story-Book Shared Styling Contract

Story-book pages must use the shared BEM-style block defined in:

- `apps/erp-web/src/app/dev-tools/story-book/shared/styles/story-book-content.scss`

### Required default approach

When building a new story-book page, assume that no page-specific SCSS file is needed unless the page proves otherwise.

The shared stylesheet already provides the base layout, preview, form, list, and API-table patterns.

This means a typical story-book page should be able to render correctly by using the shared class contract directly in the template.

### Class naming pattern

Use the shared block:

- `story-book`

Then use its elements in markup, such as:

- `story-book__page-main`
- `story-book__hero`
- `story-book__hero-copy`
- `story-book__section`
- `story-book__section-header`
- `story-book__grid`
- `story-book__example`
- `story-book__card-head`
- `story-book__preview`
- `story-book__preview--sizes`
- `story-book__sizes-row`
- `story-book__panel`
- `story-book__panel--api`
- `story-book__form-preview`
- `story-book__form-action`
- `story-book__api-table`
- `story-book__api-row`
- `story-book__api-row--head`
- `story-book__list`
- `story-book__list-item`
- `story-book__page-title`
- `story-book__page-lead`
- `story-book__section-title`
- `story-book__section-text`
- `story-book__card-title`
- `story-book__card-text`

Do not introduce parallel page-specific naming for these same responsibilities.

Examples of what should be avoided when there is no real need:

- `button-docs__section`
- `dialog-docs__example`
- `input-story__card-head`

If those structures are the same as existing story-book patterns, reuse `story-book__...` instead.

### When local story-book SCSS is allowed

Add a page-local SCSS file only when the page needs behavior or presentation that is genuinely specific to that component documentation page.

Examples:

- a unique demo layout that is not reusable across other pages
- a special preview arrangement that only one component family needs
- temporary page-specific adjustments while the shared contract is being deliberately extended

If the new style is likely to be reused by future story-book pages, move it into `story-book-content.scss` instead of leaving it local.

### Minimal implementation pattern

Typical component decorator setup:

- `styleUrl: '../../shared/styles/story-book-content.scss'`

or, if truly needed:

- `styleUrls: ['../../shared/styles/story-book-content.scss', './<page>.component.scss']`

Template structure should start from the shared block:

```html
<section class="story-book">
	<div class="story-book__page-main">
		<header class="story-book__hero" id="overview">
			<div class="story-book__hero-copy">
				<h1 class="story-book__page-title">...</h1>
				<p class="story-book__page-lead">...</p>
			</div>
		</header>

		<section class="story-book__section" id="states">
			<div class="story-book__section-header">
				<h2 class="story-book__section-title">...</h2>
				<p class="story-book__section-text">...</p>
			</div>

			<div class="story-book__grid">
				<section class="story-book__example">
					<div class="story-book__card-head">
						<h3 class="story-book__card-title">...</h3>
						<p class="story-book__card-text">...</p>
					</div>

					<div class="story-book__preview">...</div>
				</section>
			</div>
		</section>
	</div>
</section>
```

This is the default contract. Deviation should be intentional and minimal.

### Visual density

The page should remain compact and documentation-first.

Do:

- keep section intros short
- keep previews focused
- keep code examples minimal
- show variations side by side when comparison matters, such as sizes

Do not:

- write marketing-style copy
- make examples verbose when a smaller sample is enough
- scatter related variants into too many separate cards if a single comparison preview works better

## Required Example Types

For any new shared input-like control, document all relevant examples from this list.

### States

Show the core visual states explicitly.

Examples:

- default
- disabled
- invalid
- checked or selected states when applicable
- hover/focus only if the design requires explicit explanation

### Sizes

If the component supports multiple sizes, show them together in a single side-by-side preview when comparison is the primary goal.

### Forms

If the component behaves like a form control, document the supported forms integrations explicitly.

For Angular 21 in this repo, cover whichever of these are truly supported:

- template-driven forms with `ngModel`
- reactive forms with `formControlName`
- signal forms with `formField`

Do not claim compatibility that is not actually working in the component.

### Composition helpers

If the component has a paired wrapper or helper, such as a group component, document that relationship on the same page or on a separate page based on the decision rule above.

## Forms Contract For Shared Controls

For shared controls that participate in forms:

- preserve compatibility with existing supported form styles when extending the component
- do not break `ControlValueAccessor` support if reactive or template-driven forms rely on it
- if signal forms are supported, use the Angular 21 `formField` pattern correctly and do not manually bind field-owned state like `invalid` on the same node

When documenting forms examples:

- keep code realistic
- use validation scenarios that actually show why the control matters
- keep the snippet aligned with the live preview

## Styling Rules For New Components

Every new shared component must:

- use existing tokens from `public/styles/tokens/`
- avoid hardcoded spacing, color, radius, elevation, and z-index values unless there is already an accepted local fallback pattern
- use logical properties for direction safety
- keep focus states visible
- avoid `transition: all`

If the component supports size variants:

- scale both control geometry and typography when appropriate
- do not resize only the outer control while leaving the label visually mismatched

## Accessibility Requirements

Every new shared component must:

- remain keyboard accessible
- expose appropriate labels and descriptions
- keep error text understandable
- preserve accessible relationships such as `aria-describedby` when helper or error text exists

For grouped controls:

- ensure the group itself can receive an accessible label when needed

## Documentation Style Rules

The story-book page must be practical, not generic.

Write examples and docs in a way that lets the next implementation proceed with minimal clarification.

Keep:

- labels short
- descriptions functional
- API tables explicit
- code examples directly copyable

Avoid:

- vague summaries
- undocumented API additions
- examples that do not reflect the real component API
- page-specific story-book class systems that duplicate the shared `story-book__...` structure without a real reason

## Definition Of Done

The task is done only when all applicable items below are satisfied.

- shared component exists in `libs/shared/ui`
- exports are wired correctly
- story-book page exists or is updated in the correct place
- route and sidebar entry are updated when a standalone page is needed
- all user-visible docs text is translated in `en.json` and `fa.json` in both app and public paths
- copyable code examples are present
- page sections are wired for the shell table of contents and their IDs exactly match rendered scroll targets
- shared story-book styling from `story-book-content.scss` is reused by default
- no separate story-book SCSS file exists unless it is genuinely necessary
- forms examples are included when relevant
- size examples are included when relevant
- API table reflects the actual public API
- `docs/design/design-system.md` is updated when shared UI rules or token guidance change
- `docs/design/ui-components.md` is updated when the shared component catalog changes
- shared icon mappings are updated in `libs/shared/ui/src/lib/icons/ui-icons.ts` when reusable icon names change
- any new or changed shared UI component ships with matching documentation updates in the same task

## Reference Implementation

Use the checkbox documentation as the main local reference for future work.

Use the tag documentation as the main local reference for status-label and grouped-badge style components.

Relevant files:

- `libs/shared/ui/src/lib/components/checkbox/`
- `libs/shared/ui/src/lib/components/checkbox-group/`
- `libs/shared/ui/src/lib/components/tag/`
- `libs/shared/ui/src/lib/components/tag-group/`
- `apps/erp-web/src/app/dev-tools/story-book/pages/checkbox/`
- `apps/erp-web/src/app/dev-tools/story-book/pages/tag/`

Keep the root of `apps/erp-web/src/app/dev-tools/story-book/` limited to route registration and high-level folders.

Do not leave page component files directly in the root when they belong under `layout/` or `pages/`.

This reference demonstrates:

- a shared control plus a related group helper
- state documentation
- size documentation
- form compatibility documentation
- copyable code samples
- integration with the shared story-book shell and scroll-synced page table of contents
- translated examples with matching entries in both app and public i18n files
- direct usage of shared token primitives when extra alias layers are unnecessary
