# AC-70 Implementation Plan

**Task**: AC-70 - FE - Grid System  
**Parent Story**: AC-41  
**Repository Target**: FRONT (Accounting-Frontend)  
**Status**: Ready for Implementation  
**Plan Approval**: Approved

---

## Quick Reference

| Item | Value |
|------|-------|
| **Jira Key** | AC-70 |
| **Summary** | FE - Grid System |
| **Type** | Subtask |
| **Parent** | AC-41 (Implement Unified Design System, Global Theming, and Core Shared UI Components) |
| **Repository** | FRONT (Accounting-Frontend) |
| **Source Branch** | `develop` (or AC-41 feature branch) |
| **Target Branch** | `develop` |
| **Fix Version** | V 0.1 (MVP) |
| **Labels** | Core, Frontend |

---

## Requirement Traceability Matrix

| ID | Requirement | Type | Implementation Task | Test Case | Status |
|----|-------------|------|---------------------|-----------|--------|
| AOC-01 | CSS utility class set delivered (ui-grid, ui-grid--cols-N, ui-row, ui-col, ui-gap-SIZE) | AoC | Create grid.css with all classes | CSS class resolution test | Not Started |
| AOC-02 | All gap/gutter values resolve from tokens; zero hardcoded pixels | AoC | Import AC-64 tokens; use CSS vars/token refs | Token value verification test | Not Started |
| AOC-03 | Logical CSS properties used (gap, padding-inline, margin-inline) | AoC | Implement classes using logical properties | CSS property audit test | Not Started |
| AOC-04 | Responsive breakpoint modifiers (sm, md, lg) at token-aligned values | AoC | Add responsive media queries | Responsive breakpoint test | Not Started |
| AOC-05 | Grid API documented in docs/frontend/design/design-system.md | AoC | Write design system API docs | Doc completeness check | Not Started |
| AOC-06 | Storybook page with responsive, RTL, multi-column examples | AoC | Create Storybook story file | Storybook visual validation | Not Started |
| AOC-07 | Route registered in story-book.routes.ts, sidebar entry added | AoC | Register Storybook route/nav | Navigation test | Not Started |
| AOC-08 | CSS-only delivery; no Angular component/directive | AoC | Grid utilities only; no component | Code review check | Not Started |
| DOD-01 | Grid utility classes delivered with token-driven gaps | DoD | Complete Phase 2 (Core CSS Classes) | Unit test suite | Not Started |
| DOD-02 | Logical CSS properties used throughout | DoD | Verify Phase 2 implementation | Linting + manual audit | Not Started |
| DOD-03 | Responsive breakpoint modifiers functional | DoD | Test Phase 4 (Testing) | Responsive test matrix | Not Started |
| DOD-04 | Grid API documented in design-system.md | DoD | Complete Phase 3 (Storybook) | Doc review | Not Started |
| DOD-05 | Storybook demonstrates LTR and RTL layouts | DoD | Create Storybook stories | Visual test in both modes | Not Started |
| DOD-06 | Unit/integration tests for grid utilities | DoD | Write CSS utility tests | Test coverage report | Recommended |
| DOD-07 | MR ready for review; all tests passing | DoD | Phase 5 Git workflow | CI/CD pipeline checks | Not Started |
| DOD-08 | Jira transitioned to In Review | DoD | Use task-exec.ps1 script | Jira status check | Not Started |

---

## Implementation Execution Plan

### Phase 1: Setup & Token Alignment
**Duration**: 2–3 hours  
**Goal**: Establish CSS file structure and verify AC-64 token availability

**Tasks**:

1.1. **Research AC-64 Spacing Tokens**
   - Location: Explore `projects/Accounting-Frontend/src/shared/tokens/` (or similar)
   - Verify AC-64 token export (CSS variables, SCSS maps, or JSON)
   - Document token names and values (xs, sm, md, lg, xl, etc.)
   - Confirm responsive breakpoint definitions (sm, md, lg pixel/em values)
   - **Deliverable**: Token reference document in task record

1.2. **Create Grid CSS Module**
   - Path: `projects/Accounting-Frontend/src/shared/styles/utilities/grid.css` (or `.scss`)
   - Import or reference AC-64 token source
   - Add file header comments explaining class structure and token references
   - **Deliverable**: Grid utility CSS file with skeleton structure and imports

1.3. **Document Breakpoint Values**
   - Add breakpoint definitions as comments in grid.css header
   - Example:
     ```css
     /* Breakpoints (from AC-64):
        - sm: 576px (media: (min-width: 576px))
        - md: 768px (media: (min-width: 768px))
        - lg: 992px (media: (min-width: 992px))
     */
     ```
   - **Deliverable**: Breakpoint documentation in CSS file

**Exit Criteria**:
- [ ] AC-64 token reference confirmed and documented
- [ ] Grid CSS file created with proper import structure
- [ ] Breakpoint definitions documented
- [ ] No token conflicts or missing definitions

---

### Phase 2: Core CSS Utility Classes
**Duration**: 4–5 hours  
**Goal**: Implement production-ready CSS utility classes

**Tasks**:

2.1. **Grid Container Classes**
   - Implement `ui-grid` base class
     - Use CSS Grid or Flexbox (per project convention)
     - Base display properties: `display: grid` or `display: flex`
   - Implement `ui-grid--cols-N` modifiers (N = 1 to 12)
     - Use CSS `grid-template-columns` or flex-basis calculations
     - Example: `ui-grid--cols-6` = 2 columns (50% width each)
   - Implement responsive variants: `sm:ui-grid--cols-N`, `md:ui-grid--cols-N`, `lg:ui-grid--cols-N`
     - Use media queries with AC-64 breakpoint values
   - **Deliverable**: Grid container classes in grid.css

2.2. **Row/Column Layout Classes**
   - Implement `ui-row` class
     - Flexbox row: `display: flex; flex-direction: row`
   - Implement `ui-col` class
     - Flex column item: `flex: 1; min-width: 0`
   - Implement responsive column span if needed (e.g., `ui-col--span-6`)
   - **Deliverable**: Row/column classes in grid.css

2.3. **Spacing Utility Classes**
   - Implement `ui-gap-{size}` classes using token values
     - Example: `ui-gap-md` → `gap: var(--spacing-md)` (from AC-64)
     - Sizes: xs, sm, md, lg, xl (match AC-64 token names)
   - Implement directional gap variants: `ui-gap-x-{size}`, `ui-gap-y-{size}` (if needed)
     - Use logical properties: `gap-inline`, `gap-block` (not row-gap/column-gap)
   - Implement responsive variants: `md:ui-gap-lg`, `lg:ui-gap-xl`, etc.
   - **Deliverable**: Spacing utility classes in grid.css

2.4. **Logical Property Implementation**
   - Audit all spacing classes for logical property use
   - Replace physical properties:
     - ❌ `padding-left/right` → ✅ `padding-inline` / `padding-inline-start` / `padding-inline-end`
     - ❌ `margin-left/right` → ✅ `margin-inline` / `margin-inline-start` / `margin-inline-end`
     - ❌ `left/right` positioning → ✅ `inset-inline-start` / `inset-inline-end`
   - Use `gap` (already logical) instead of `row-gap`/`column-gap`
   - **Deliverable**: All classes updated with logical properties

2.5. **Optional Alignment Helpers** (scope-dependent)
   - If needed: `ui-items-center`, `ui-justify-between`, `ui-justify-center`, etc.
   - Use flexbox alignment properties
   - **Deliverable**: Alignment helpers in grid.css (or documented as out-of-scope)

**Code Quality Checks**:
- [ ] All token references resolve from AC-64 (no hardcoded pixels)
- [ ] No unused classes or orphaned selectors
- [ ] CSS passes project linter (stylelint or equivalent)
- [ ] Naming convention consistent: `ui-{component}--{modifier}` or `ui-{component}-{size}`
- [ ] Comments documenting token references for each class

**Exit Criteria**:
- [ ] All AoC-01, AoC-02, AoC-03, AoC-04 classes implemented
- [ ] CSS passes linting without errors
- [ ] All classes tested manually at target breakpoints

---

### Phase 3: Storybook Documentation
**Duration**: 3–4 hours  
**Goal**: Create interactive examples and API documentation

**Tasks**:

3.1. **Create Storybook Story File**
   - Path: `projects/Accounting-Frontend/src/shared/stories/grid-system.stories.ts` (or `.mdx` for docs+examples)
   - Language: TypeScript (if .ts) or Markdown + HTML examples (if .mdx)
   - Stories to include (minimum):
     - **Basic Grid**: Single-column, multi-column (2, 3, 4, 12)
       - Example HTML: `<div class="ui-grid ui-grid--cols-4">...</div>`
     - **Responsive Grid**: Show layout behavior at sm, md, lg breakpoints
       - Example: `<div class="ui-grid ui-grid--cols-1 sm:ui-grid--cols-2 md:ui-grid--cols-3 lg:ui-grid--cols-4">...</div>`
     - **Spacing Modifiers**: Demonstrate gap variants (xs, sm, md, lg, xl)
       - Example: `<div class="ui-grid ui-gap-md">...</div>`
     - **RTL Layout**: Same layout in both LTR and RTL modes
       - Use Storybook RTL plugin or manual RTL class toggle
     - **Nested Grids**: Grid within grid example
     - **Token Reference**: Visual chart of available tokens and corresponding CSS class values
   - Use `.sb-show-main` or similar to display code snippets
   - **Deliverable**: Complete Storybook story file with all stories

3.2. **Design System API Documentation**
   - Path: `projects/Accounting-Frontend/docs/frontend/design/design-system.md` (update or create)
   - Alternatively create: `docs/work-items/02.implementation/stories/AC-41/docs/grid-api.md`
   - Contents:
     - **Grid System Overview**: Purpose, design principles, token-driven approach
     - **Class Reference Table**:
       | Class | CSS Property | Token/Value | Responsive | Example |
       |-------|--------------|-------------|-----------|---------|
       | `ui-grid` | `display: grid/flex` | — | No | `<div class="ui-grid">` |
       | `ui-grid--cols-N` | `grid-template-columns` | — | Yes | `<div class="ui-grid ui-grid--cols-6">` |
       | `ui-gap-{size}` | `gap` | `var(--spacing-{size})` | Yes | `<div class="ui-grid ui-gap-md">` |
     - **Token Reference Table**: Map token names to CSS variables to pixel values
       | Token Name | CSS Variable | Pixel Value | Example Class |
       |-----------|--------------|-------------|---------------|
       | xs | `--spacing-xs` | 4px | `ui-gap-xs` |
       | sm | `--spacing-sm` | 8px | `ui-gap-sm` |
     - **Usage Examples**: HTML snippets for common layouts
       - Single-column: `<div class="ui-grid ui-grid--cols-1">...</div>`
       - Two-column: `<div class="ui-grid ui-grid--cols-2">...</div>`
       - Three-column: `<div class="ui-grid ui-grid--cols-3 md:ui-grid--cols-6">...</div>`
     - **Responsive Behavior**: Explanation of media query breakpoints
     - **RTL Considerations**: How logical properties ensure RTL correctness
     - **Migration Guide**: Examples of converting hardcoded layouts to grid utilities
   - **Deliverable**: Complete design system documentation

3.3. **Storybook Navigation Setup**
   - Path: `projects/Accounting-Frontend/src/shared/stories/story-book.routes.ts` (or equivalent routing file)
   - Register grid-system story route:
     - Route path: `/design/grid-system` or `/core/grid-system`
     - Route name: "Grid System" or "Layout Grid"
   - Update Storybook sidebar/navigation:
     - Add entry under appropriate category (Design System, Core, Layout, etc.)
   - Verify route is accessible in Storybook UI
   - **Deliverable**: Route registered and navigation entry visible

**Exit Criteria**:
- [ ] Storybook story file renders without errors
- [ ] All minimum stories visible and interactive
- [ ] Design system documentation complete and accurate
- [ ] Storybook navigation entry accessible
- [ ] Responsive behavior visibly demonstrated at all breakpoints
- [ ] RTL layout visibly demonstrated

---

### Phase 4: Testing & Validation
**Duration**: 2–3 hours  
**Goal**: Ensure grid utilities work reliably across browsers and locales

**Tasks**:

4.1. **Manual Responsive Testing**
   - Test each responsive breakpoint (sm, md, lg) on real browser sizes
   - Use browser dev tools to simulate viewport widths (576px, 768px, 992px)
   - Verify column count changes correctly at each breakpoint
   - Verify spacing (gap, padding) values correct at each breakpoint
   - Document any issues in task record
   - **Deliverable**: Responsive test results

4.2. **RTL Layout Testing**
   - Test all grid layouts in RTL mode
   - Methods:
     - Add `dir="rtl"` to HTML element and verify layout
     - Use browser dev tools "Toggle RTL" or RTL extension
     - Test in actual RTL locale if available
   - Verify:
     - Logical properties (gap, padding-inline) work correctly in RTL
     - Grid direction reverses correctly (if using direction-sensitive properties)
     - No hardcoded left/right values visible
   - Document results in task record
   - **Deliverable**: RTL test results

4.3. **CSS Linting & Validation**
   - Run project's CSS linter (stylelint, Sass lint, etc.)
   - Check for:
     - Unused classes or selectors
     - Invalid property values
     - Logical property conflicts
     - Token reference resolution
   - Fix any linting errors
   - Capture linting report in task record
   - **Deliverable**: Linting pass report

4.4. **Token Alignment Verification**
   - Cross-check all token values used in grid classes against AC-64 definitions
   - Verify:
     - All token references (e.g., `--spacing-md`) match AC-64 token names
     - Token values in Storybook match actual CSS output
     - No undefined or typo'd token references
   - Update documentation if discrepancies found
   - **Deliverable**: Token alignment verification report

4.5. **Cross-Browser Testing** (Optional but Recommended)
   - Test in modern browsers: Chrome, Firefox, Safari, Edge
   - Verify CSS Grid and logical property support
   - Verify RTL rendering in each browser
   - Document any browser-specific issues
   - **Deliverable**: Cross-browser test matrix (or note if out of scope)

**Exit Criteria**:
- [ ] All responsive breakpoints verified in browser
- [ ] RTL layouts verified in RTL mode
- [ ] CSS linting passes without errors
- [ ] All token references verified
- [ ] Cross-browser testing complete (if in scope)

---

### Phase 5: Git Workflow & MR Preparation
**Duration**: 1–2 hours  
**Goal**: Prepare Git artifacts and update Jira status

**Tasks**:

5.1. **Create Feature Branch**
   - Branch name: `AC-70-grid-system` (kebab-case with task key)
   - Branch from: `develop` (or AC-41 feature branch if it exists)
   - Command: `git checkout -b AC-70-grid-system origin/develop`
   - **Deliverable**: Feature branch created locally

5.2. **Commit Implementation**
   - Commit 1: Core CSS utilities
     - Message: `[AC-70] Grid system CSS utilities: base classes, responsive modifiers, gap utilities`
   - Commit 2: Storybook story file
     - Message: `[AC-70] Storybook grid system documentation: interactive examples, responsive/RTL demos`
   - Commit 3: Design system API documentation
     - Message: `[AC-70] Grid system design system API: class reference, token mapping, usage guide`
   - All commits reference task: Include `Jira: AC-70` or `Closes #AC-70` in footer
   - **Deliverable**: Clean commit history on feature branch

5.3. **Create Workspace MR** (for process/documentation artifacts)
   - Repository: Workspace (accounting-workspace)
   - Target: `develop`
   - Title: `[AC-70] Grid system documentation: design system API, implementation record`
   - Description: Include AC-70 Jira link, parent story (AC-41), list of changes
   - MR Status: **Draft** (until all tests pass)
   - Enable: Delete source branch, Squash commits
   - **Deliverable**: Workspace MR created (Draft)

5.4. **Create Project MR** (for CSS and Storybook implementation)
   - Repository: Project (accounting-frontend)
   - Target: `develop`
   - Title: `[AC-70] Grid system utilities: CSS classes, Storybook, responsive/RTL support`
   - Description: Include AC-70 Jira link, parent story (AC-41), list of files changed, test results
   - MR Status: **Draft** (until all tests pass)
   - Enable: Delete source branch, Squash commits
   - **Deliverable**: Project MR created (Draft)

5.5. **Update Jira Web Links**
   - Add workspace MR link to Jira Web Links (customfield_10015)
   - Add project MR link to Jira Web Links
   - Format: Include both MR URLs in Jira field
   - **Deliverable**: Jira Web Links populated

5.6. **Transition Jira Status** (when ready for review)
   - Use script: `scripts/task-exec.ps1` with `-StatusTarget "In Review"`
   - Command: `./task-exec.ps1 -JiraKey AC-70 -StatusTarget "In Review" -Repo front`
   - Verify Jira status changed to `In Review`
   - Note: Do this **after** both MRs are Ready (not Draft) and tests passing
   - **Deliverable**: Jira moved to In Review status

**Exit Criteria**:
- [ ] Feature branch created and pushed
- [ ] Clean commit history on branch
- [ ] Both workspace and project MRs created (Draft)
- [ ] Jira Web Links updated with MR URLs
- [ ] Ready to transition Jira to In Review

---

## TDD/BDD Test Cases

### Unit Tests (Optional but Recommended)

**Test File Location**: `projects/Accounting-Frontend/src/shared/styles/__tests__/grid.test.ts` or `.spec.ts`

**Test Suite: Grid CSS Utilities**

| Test Case ID | Test Description | Given | When | Then | Status |
|--------------|-----------------|-------|------|------|--------|
| UT-01 | Grid container renders with correct display | Element with class `ui-grid` | CSS computed styles read | `display: grid` or `display: flex` | Not Started |
| UT-02 | Column modifier applies correct width | Element with class `ui-grid--cols-6` | CSS computed styles read | Element width = 50% (2 columns) | Not Started |
| UT-03 | Gap utility applies correct token value | Element with class `ui-gap-md` | CSS computed styles read | `gap` matches `--spacing-md` value from AC-64 | Not Started |
| UT-04 | Responsive modifier activates at breakpoint | Element with class `md:ui-grid--cols-4` | Media query at 768px (md breakpoint) | Column count = 3 (12-col / 4) | Not Started |
| UT-05 | Logical properties used (no physical left/right) | Element with any gap/padding class | CSS source inspection | Only logical properties found (`padding-inline`, `margin-inline`, `gap`) | Not Started |
| UT-06 | RTL mode reverses layout correctly | Grid with `ui-grid--cols-4` with `dir="rtl"` | CSS applied in RTL context | Columns render in RTL direction | Not Started |
| UT-07 | Token reference resolves | Any class using token ref (e.g., `var(--spacing-md)`) | CSS parsing | Token variable resolves to pixel value from AC-64 | Not Started |
| UT-08 | Gap variant classes apply correct values | Elements with `ui-gap-xs`, `ui-gap-sm`, `ui-gap-md`, `ui-gap-lg`, `ui-gap-xl` | CSS computed styles read | Each class applies corresponding token value | Not Started |

**Test Execution Method**:
- If project uses CSS-in-JS testing (e.g., Jest + CSS modules), use that framework
- If project uses traditional CSS with e2e tests, use Cypress or similar for visual validation
- Document test framework and execution command in task record

---

## Blocking Dependencies

- **AC-64 (Spacing Tokens)**: Must be implemented and exported as CSS variables or SCSS maps
  - Check: `projects/Accounting-Frontend/src/shared/tokens/` for token availability
  - If missing: Create temporary hardcoded token values with TODO comments for AC-64 integration

- **Storybook Setup**: Assume Storybook is configured in Accounting-Frontend
  - Check: `projects/Accounting-Frontend/.storybook/` or `projects/Accounting-Frontend/storybook.config.js` exists
  - If missing: Create minimal Storybook setup or document as out-of-scope

---

## Repository Targeting

| Artifact | Repository | Path | Branch |
|----------|-----------|------|--------|
| Grid CSS utilities | FRONT (accounting-frontend) | `src/shared/styles/utilities/grid.css` | AC-70-grid-system |
| Storybook story | FRONT (accounting-frontend) | `src/shared/stories/grid-system.stories.ts` | AC-70-grid-system |
| Design system docs | FRONT (accounting-frontend) | `docs/frontend/design/design-system.md` | AC-70-grid-system |
| Task implementation record | Workspace (accounting-workspace) | `docs/work-items/02.implementation/stories/AC-41/tasks/AC-70.md` | AC-70-grid-system |
| Workspace MR | Workspace (accounting-workspace) | — | AC-70-grid-system |
| Project MR | FRONT (accounting-frontend) | — | AC-70-grid-system |

---

## Success Criteria Checklist

- [ ] Phase 1: Token research complete, grid.css created with imports
- [ ] Phase 2: All utility classes implemented with token-driven values
- [ ] Phase 3: Storybook story and design docs complete
- [ ] Phase 4: Responsive and RTL testing complete
- [ ] Phase 5: Git commits clean, MRs created, Jira links updated
- [ ] All AoC criteria verified (AOC-01 through AOC-08)
- [ ] All DoD criteria verified (DOD-01 through DOD-08)
- [ ] Unit/integration tests passing (if in scope)
- [ ] CSS linting passes without errors
- [ ] Both MRs ready for reviewer approval

---

## Notes

1. **AC-64 Dependency**: If AC-64 (spacing tokens) is not yet deployed, use temporary hardcoded values in Phase 1 with clear TODO comments for refactoring after AC-64 is available.

2. **RTL-First Design**: All spacing and layout use logical CSS properties from the start. No physical left/right properties in production code.

3. **Reusability**: Once this task is complete, all future feature tasks (AC-71+) should use grid utilities instead of hardcoded layouts. Include migration examples in design docs.

4. **Testing Approach**: TDD is recommended for grid utility CSS (write test expectations first, then implement classes to satisfy tests). BDD scenarios can use Storybook stories as acceptance validation.

5. **MR Review Gateway**: When moving Jira to `In Review`, both MRs must be **Ready** (not Draft) and all tests must pass. Reviewer approval is required before merge.

---

**Plan Ready for Implementation**  
Approved
