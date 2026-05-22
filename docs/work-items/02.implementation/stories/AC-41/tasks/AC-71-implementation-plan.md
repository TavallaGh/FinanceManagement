# Implementation Plan: AC-71 — FE Table Component

**Task Key**: [AC-71](https://nexttoptech.atlassian.net/browse/AC-71)  
**Parent Story**: [AC-41](https://nexttoptech.atlassian.net/browse/AC-41)  
**Task Name**: FE - Table Component  
**Stack**: Frontend / UI Component  
**Status**: Ready for Implementation Approval  
**Plan Created**: 2026-05-18  
**Target Fix Version**: V 0.1 (MVP)

---

## 1. Executive Summary

Implement `UiTableComponent` as a production-ready Angular standalone component that provides a structured, reusable data table interface for all ERP features. The component is data-driven (column definitions + row data), business-agnostic, fully token-driven, RTL/LTR-safe, and includes complete Storybook coverage and unit test validation.

**Success Criteria**:
- Component renders header/body structure with column definitions and row data
- Row hover, row selection, and empty state all use semantic tokens exclusively
- Storybook page covers all states in light/dark themes and both RTL/LTR layouts
- Unit and integration tests all pass with >90% code coverage
- Component exported from shared UI library and accessible to all feature teams

---

## 2. Scope & Assumptions

### In Scope
- `UiTableComponent` implementation in `libs/shared/ui/src/lib/components/table/`
- Column definition input (array of `{ key, label, width? }`)
- Row data input and row selection output
- Row hover state (token-driven background)
- Selected row state (token-driven background with optional selection class)
- Empty state with configurable message and content projection
- OnPush change detection strategy
- Standalone component pattern (no NgModule)
- Logical CSS properties (RTL/LTR safe: `margin-inline-start`, `text-align: start`)
- Semantic token consumption for all visual properties
- Storybook page at `story-book/pages/table/` with all states
- Route registration in `story-book.routes.ts` and sidebar navigation
- Translation keys in `en.json` and `fa.json`
- Component export from `libs/shared/ui/src/lib/components/index.ts`
- Unit tests (>90% coverage), integration tests, and BDD acceptance
- Design system documentation update reference

### Out of Scope
- Column sorting (future task)
- Column filtering within table (belongs to feature layer)
- Virtual scrolling / infinite scroll
- Editable cells
- Column resizing or reordering
- Row drag-and-drop
- Tree-table or expandable rows

### Dependencies & Assumptions
- **AC-64 (Token Audit)** must be **COMPLETED** before implementation begins — all semantic tokens (`--color-table-surface`, `--color-table-hover`, `--color-table-selected`, etc.) must be defined and verified
- **AC-65 (Theme Engine)** must be functional for Storybook dark/light theme switching
- Angular 17+ with standalone component support
- Storybook configured and running with Angular integration
- Translation service available in feature projects
- Design tokens available as CSS custom properties

---

## 3. Repository Routing Matrix

| Artifact Type | Repository | Path | Branch Target | MR Strategy |
|---|---|---|---|---|
| **Product Code** | `projects/Accounting-Frontend` | `libs/shared/ui/src/lib/components/table/` | `develop` | Squash + Delete |
| **Tests** | `projects/Accounting-Frontend` | `libs/shared/ui/src/lib/components/table/*.spec.ts` | `develop` | Squash + Delete |
| **Storybook** | `projects/Accounting-Frontend` | `apps/story-book/src/app/pages/table/` | `develop` | Squash + Delete |
| **Implementation Log** | `accounting-workspace` | `docs/work-items/02.implementation/stories/AC-41/tasks/` | `develop` | Squash + Delete |
| **Design System Doc** | `accounting-workspace` | `docs/frontend/design/design-system.md` | `develop` | Squash + Delete |

**Merge Sequence**:
1. Create feature branch `features/AC-71-table-component` from `develop`
2. Implement product code (component, tests, Storybook)
3. Submit MR to `develop` with both workspace and project repos
4. After approval and merge to `develop`: cherry-pick into `story/AC-41` for promotion to `test`

---

## 4. Per-Domain Hierarchy Map (Frontend)

```
Frontend Domain (AC-41 Shared UI Foundation)
├── 01.Domain (UI Models & Interfaces)
│   └── src/lib/models/
│       ├── column-definition.ts       (ColumnDefinition interface)
│       ├── table-events.ts            (RowSelectedEvent interface)
│       └── table-state.ts             (Table component state model)
│
├── 02.Application (Component Logic)
│   └── src/lib/components/table/
│       ├── ui-table.component.ts      (Main component with logic)
│       ├── ui-table.component.html    (Template)
│       ├── ui-table.component.scss    (Token-driven styles)
│       └── ui-table.component.spec.ts (Unit tests)
│
├── 03.Infra (Shared Utilities & Services)
│   └── src/lib/utils/
│       └── table-cell.pipe.ts         (if needed for formatting)
│
└── 04.Presentation (Storybook & Docs)
    └── apps/story-book/src/app/pages/table/
        ├── table-overview.page.ts     (Storybook page component)
        ├── table.stories.ts           (Storybook stories with all states)
        └── table.page.md              (Design documentation)
```

---

## 5. Entity-Centric Folder Naming Map

All files use entity names or semantic purpose names; no abbreviations or technical suffixes at folder level.

```
libs/shared/ui/src/lib/
├── components/
│   └── table/
│       ├── table.component.ts           (entity name: table)
│       ├── table.component.html         (same entity)
│       ├── table.component.scss         (same entity)
│       ├── table.component.spec.ts      (test for same entity)
│       ├── models/                      (entity-related models)
│       │   └── table.models.ts          (ColumnDefinition, TableRowData, etc.)
│       └── index.ts                     (public export)
```

---

## 6. Implementation Steps & Dependencies

### Phase 1: Interface & Models Definition (Prerequisite)
**Status**: Ready  
**Dependency**: None (can start immediately)

**Step 1.1**: Create `table.models.ts` with TypeScript interfaces:
- `ColumnDefinition` (key, label, width?: string)
- `TableRowData` (any object structure)
- `RowSelectedEvent` ({ rowKey: string | number })

**Step 1.2**: Define component @Input/@Output contract:
- `@Input() columns: ColumnDefinition[]`
- `@Input() rows: TableRowData[]`
- `@Input() selectedRowKey?: string | number`
- `@Input() emptyMessage?: string`
- `@Output() rowSelected = new EventEmitter<RowSelectedEvent>()`

### Phase 2: Token Validation & CSS Architecture (Blocker on AC-64)
**Status**: Blocked until AC-64 completes  
**Dependency**: AC-64 (Token Audit) must provide final semantic token names

**Step 2.1**: Verify semantic tokens defined in `_semantic.scss` or equivalent:
- `--color-table-surface` (table background)
- `--color-table-border` (row/cell borders)
- `--color-table-hover` (row hover background)
- `--color-table-selected` (selected row background)
- `--color-table-text` (default text color)
- `--color-on-surface-selected` (text color on selected row)
- Spacing tokens: `--spacing-xs`, `--spacing-sm`, `--spacing-md` (for padding)

**Step 2.2**: Create `table.component.scss` with token references (no hardcoded values):
```scss
$table-surface: var(--color-table-surface);
$table-hover: var(--color-table-hover);
$table-selected: var(--color-table-selected);
$table-text: var(--color-table-text);
// ... rest of token mappings
```

### Phase 3: Component Implementation
**Status**: Ready (after Phase 2)

**Step 3.1**: Create `table.component.ts`:
- Implement OnPush change detection strategy
- Define inputs/outputs as per contract
- Implement row click handler emitting `rowSelected` output
- Add `trackBy` function for row iteration performance

**Step 3.2**: Create `table.component.html` template:
```html
<div class="ui-table" [attr.data-theme]="currentTheme">
  <table>
    <thead>
      <tr>
        <th *ngFor="let col of columns; let last = last" [style.width]="col.width">
          {{ col.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr *ngIf="!rows || rows.length === 0" class="ui-table__empty">
        <td [attr.colspan]="columns.length">
          <div class="ui-table__empty-state">
            {{ emptyMessage || defaultEmptyMessage }}
          </div>
        </td>
      </tr>
      <tr 
        *ngFor="let row of rows; trackBy: trackByRowKey"
        class="ui-table__row"
        [class.ui-table__row--selected]="isRowSelected(row)"
        (click)="selectRow(row)">
        <td *ngFor="let col of columns">
          {{ row[col.key] }}
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

**Step 3.3**: Create `table.component.scss` with logical CSS properties:
- Use `margin-inline-start` / `margin-inline-end` (RTL/LTR safe)
- Use `padding-inline-start` / `padding-inline-end`
- Use `text-align: start` (instead of `left`)
- All colors, spacing, border-radius from tokens only

---

## 7. Code-Level Implementation Blueprint (Architecture)

### Component Structure
```typescript
@Component({
  selector: 'app-ui-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
  standalone: true,
  imports: [CommonModule, NgFor, NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiTableComponent {
  @Input() columns: ColumnDefinition[] = [];
  @Input() rows: TableRowData[] = [];
  @Input() selectedRowKey?: string | number;
  @Input() emptyMessage?: string;
  @Output() rowSelected = new EventEmitter<RowSelectedEvent>();

  readonly defaultEmptyMessage = $localize`:@@table.empty:No records found`;

  selectRow(row: TableRowData): void {
    const key = this.getRowKey(row);
    this.rowSelected.emit({ rowKey: key });
  }

  isRowSelected(row: TableRowData): boolean {
    return this.selectedRowKey === this.getRowKey(row);
  }

  trackByRowKey(index: number, row: TableRowData): any {
    return this.getRowKey(row);
  }

  private getRowKey(row: TableRowData): string | number {
    return row.id || row.key || index;
  }
}
```

### Exported Public API
```typescript
// libs/shared/ui/src/lib/components/table/index.ts
export { UiTableComponent } from './table.component';
export { ColumnDefinition, TableRowData, RowSelectedEvent } from './models/table.models';

// libs/shared/ui/src/lib/components/index.ts (parent)
export * from './table';
export * from './input';
export * from './button';
// ... other components
```

---

## 8. Data Model & Migration Impact

**Data Model**: None (component is business-agnostic; data structure defined by feature)

**Database Migration**: Not applicable

**API Impact**: None (component consumes client-side data)

**Client-Side State**: Component manages selected row key only; no persistent state

---

## 9. Security & Privacy Controls

### Abuse-Case Analysis

| Abuse Case | Mitigation |
|---|---|
| XSS via row data | Angular's built-in sanitization prevents XSS in data binding. Feature teams must sanitize/validate data before passing to component |
| Column injection via column definitions | Column definitions are static component inputs; no dynamic loading from untrusted sources |
| Selection state leakage | `selectedRowKey` is local component state; not persisted or transmitted without feature team's explicit action |

### Privacy Controls
- Component does not log row data or user PII
- Component does not transmit data to analytics without explicit feature integration
- If feature team uses `rowSelected` output, they own logging and tracking responsibility

---

## 10. Observability Requirements

### Logging Strategy

| Level | Event | Message | Frequency |
|---|---|---|---|
| **DEBUG** | Row rendered | `Table: rendered {rowCount} rows` | Per render cycle |
| **INFO** | Row selected | `Table: row selected with key {rowKey}` | Per user click |
| **WARN** | Empty state | `Table: empty state rendered` | Per render cycle |
| **ERROR** | Invalid column definition | `Table: invalid column key {key}; skipping column` | Per component init |

### Logging Implementation (in component):
```typescript
export class UiTableComponent {
  private logger = inject(LoggerService);

  selectRow(row: TableRowData): void {
    const key = this.getRowKey(row);
    this.logger.info(`Table: row selected with key ${key}`);
    this.rowSelected.emit({ rowKey: key });
  }

  ngOnInit(): void {
    this.logger.debug(`Table: initialized with ${this.columns.length} columns`);
  }
}
```

### Metrics & Traces
- **Metric**: `table_rows_rendered` (gauge, per instance)
- **Metric**: `table_selections_total` (counter)
- **Trace**: Component lifecycle events for performance monitoring

---

## 11. Global Response Key Model

**Note**: Table component is UI-only; no backend responses. Feature teams consuming the component handle their own response keys.

**Global Response Key Patterns** (for features using this component):
```
Success responses:
  - INFORMATION_Data_Loaded
  - INFORMATION_Table_Rendered
  - INFORMATION_Row_Selected

Error responses (if data loading fails):
  - ERROR_Data_LoadFailed
  - ERROR_Data_InvalidStructure
```

**Example** (in feature component using UiTableComponent):
```typescript
onTableDataLoad(data: any[]): void {
  if (!data || data.length === 0) {
    this.responseKey = 'INFORMATION_Data_Empty';
  } else {
    this.responseKey = 'INFORMATION_Data_Loaded';
  }
}

onTableDataError(error: any): void {
  this.responseKey = 'ERROR_Data_LoadFailed';
}
```

---

## 12. Response Key Naming Catalog

Feature teams implementing this component should follow these patterns:

| Response Key | Type | Condition | Suggested Message |
|---|---|---|---|
| `INFORMATION_Table_Rendered` | INFO | Table initialized with data | "Table loaded successfully" |
| `INFORMATION_Table_Empty` | INFO | No rows to display | "No records found" |
| `INFORMATION_Row_Selected` | INFO | User clicked row | "Row selected" |
| `ERROR_Table_InvalidColumns` | ERROR | Column definitions malformed | "Table configuration error" |
| `ERROR_Table_DataStructure` | ERROR | Row data missing expected keys | "Data structure mismatch" |

---

## 13. Test-Driven Development (TDD) Plan

### Execution Order (Test-First)

**Test Batch 1**: Table Rendering Foundation
1. ✅ **Test**: Table renders correct number of columns based on `columns` input
   - Arrange: Pass 3 column definitions
   - Act: Render component
   - Assert: 3 `<th>` elements present
   
2. ✅ **Test**: Table renders correct number of rows based on `rows` input
   - Arrange: Pass 5 row objects
   - Act: Render component
   - Assert: 5 `<tr>` elements in tbody

3. ✅ **Test**: Column labels display correctly
   - Arrange: Pass columns with labels "ID", "Name", "Email"
   - Act: Render
   - Assert: Each `<th>` contains correct label text

**Test Batch 2**: Empty State Handling
4. ✅ **Test**: Empty state renders when `rows = []`
   - Arrange: Initialize with empty array
   - Act: Render
   - Assert: Single row with empty message displayed; no data rows present

5. ✅ **Test**: Custom empty message displays
   - Arrange: Set `emptyMessage = "No data available"`
   - Act: Render with empty rows
   - Assert: Empty message text appears

6. ✅ **Test**: Default empty message when no custom message provided
   - Arrange: No emptyMessage input
   - Act: Render with empty rows
   - Assert: Default message from i18n displays

**Test Batch 3**: Row Selection & Events
7. ✅ **Test**: `rowSelected` emits with correct row key on row click
   - Arrange: Pass rows with `id` property; set `selectedRowKey = 1`
   - Act: Click first row
   - Assert: `rowSelected` emitted with `{ rowKey: 1 }`

8. ✅ **Test**: Selected row receives CSS class
   - Arrange: Set `selectedRowKey = 'row-2'`
   - Act: Render
   - Assert: Row with matching key has class `ui-table__row--selected`

9. ✅ **Test**: Multiple row clicks emit successive selections
   - Arrange: 3 rows
   - Act: Click row 1, then row 2
   - Assert: Two emissions with correct keys

**Test Batch 4**: Styling & CSS Classes
10. ✅ **Test**: Hover CSS class applied on row hover
    - Arrange: Render row
    - Act: Trigger hover event
    - Assert: Row has class `ui-table__row--hover` (simulated)

11. ✅ **Test**: Token-based styles applied (no hardcoded values)
    - Arrange: Render component
    - Act: Inspect computed styles
    - Assert: All background colors use CSS variables (`var(--color-table-surface)`, etc.)

**Test Batch 5**: Change Detection
12. ✅ **Test**: OnPush strategy applied correctly
    - Arrange: Component metadata
    - Act: Inspect component
    - Assert: `changeDetection: ChangeDetectionStrategy.OnPush` present

13. ✅ **Test**: Component updates when `@Input() rows` changes
    - Arrange: Initialize with 3 rows
    - Act: Update `rows` to 5-element array
    - Assert: Table re-renders with 5 rows (detected by trackBy)

**Integration Tests**:
14. ✅ **Integration Test**: Component renders in test host with realistic data
    - Arrange: Create test host with realistic column and row data
    - Act: Render host component
    - Assert: Table structure, column labels, row data all correct

15. ✅ **Integration Test**: RTL layout rendering
    - Arrange: Set document direction to `rtl`
    - Act: Render component
    - Assert: Logical CSS properties apply correctly (text-align: start works in RTL)

### Test Coverage Target
- **Line Coverage**: >90%
- **Branch Coverage**: >85%
- **Function Coverage**: 100%

### Test File Structure
```
libs/shared/ui/src/lib/components/table/
├── table.component.spec.ts          (Unit tests: 15 tests)
└── table.component.integration.spec.ts  (Integration tests: 2 tests)
```

---

## 14. Behavior-Driven Development (BDD) Scenarios

### Scenario 1: Table with Data Renders Correctly

**Given** a `UiTableComponent` with:
- `columns = [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }]`
- `rows = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]`

**When** the component is rendered

**Then**:
- ✓ Table contains 2 columns with labels "ID" and "Name"
- ✓ Table contains 2 data rows with correct data
- ✓ Each cell displays the corresponding row property value
- ✓ No empty state message appears
- ✓ **Evidence**: Screenshot in light/dark theme showing populated table in Storybook

---

### Scenario 2: Empty State Displays When No Data

**Given** a `UiTableComponent` with:
- `columns = [{ key: 'id', label: 'ID' }]`
- `rows = []`
- `emptyMessage = "No records found"`

**When** the component is rendered

**Then**:
- ✓ No data rows are rendered
- ✓ Empty state message "No records found" displays centered in table area
- ✓ Empty state uses token-driven styling (background, text color)
- ✓ User sees clear indication that table is empty (not broken)
- ✓ **Evidence**: Storybook page "Empty State" showing Figma design alignment

---

### Scenario 3: Row Selection Emits Event with Correct Key

**Given** a `UiTableComponent` with:
- `columns = [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }]`
- `rows = [{ id: 101, name: 'Charlie' }, { id: 102, name: 'Diana' }]`

**When** user clicks on the first row (id=101)

**Then**:
- ✓ `rowSelected` output emits with `{ rowKey: 101 }`
- ✓ Row visually indicates selection via token-driven background color (`--color-table-selected`)
- ✓ Text on selected row changes to `--color-on-surface-selected`
- ✓ Only one row is selected at a time (previous selection clears visually if applicable)
- ✓ **Evidence**: Storybook interaction test showing event emission and visual change

---

### Scenario 4: RTL Layout Renders Correctly

**Given** a `UiTableComponent` rendered in RTL layout with:
- `columns = [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }]`
- `rows = [{ id: 1, name: 'علی' }]` (Arabic text)
- Document `dir="rtl"`

**When** the component is rendered

**Then**:
- ✓ Column labels align to the right (text-align: end via logical property)
- ✓ Cell content aligns right
- ✓ Padding uses logical properties (`padding-inline-start` → right side in RTL)
- ✓ Row hover and selection states render correctly
- ✓ No text or layout overflow
- ✓ **Evidence**: Storybook page rendered with Persian text and RTL direction verified

---

### Scenario 5: Column Width Configuration Respected

**Given** a `UiTableComponent` with:
- `columns = [{ key: 'id', label: 'ID', width: '10%' }, { key: 'desc', label: 'Description', width: '70%' }]`
- `rows = [{ id: 1, desc: 'Long description text' }]`

**When** the component is rendered

**Then**:
- ✓ First column is approximately 10% width
- ✓ Second column is approximately 70% width
- ✓ Text does not overflow; wraps or truncates appropriately
- ✓ Layout remains responsive on smaller screens
- ✓ **Evidence**: Storybook showing multiple viewport sizes

---

## 15. Rollout, Rollback, and Feature-Flag Strategy

### Rollout Plan

**Phase 1: Development & Testing (Current Sprint)**
- Component implemented and tested locally
- Storybook page covers all states in light/dark and RTL/LTR
- Unit test suite passes with >90% coverage
- Integration tests pass

**Phase 2: Code Review & Merge to `develop`**
- MR submitted to `develop` branch (both workspace and project repos)
- Code review by Technical Lead (security, performance, token compliance)
- After approval: merge with "Squash commits" and "Delete source branch"

**Phase 3: Cherry-Pick to Story Branch**
- After merge, cherry-pick commits into `story/AC-41` promotion branch
- Story branch tested end-to-end with all AC-41 components

**Phase 4: Promotion to `test` and Beyond**
- `story/AC-41` merged to `test` after QA approval
- Full story tested in test environment
- Staged promotion: `test` → `stage` → `main` per Git flow

### Rollback Plan
- If critical issues discovered after merge to `develop`:
  - Create bugfix branch `bugs/AC-71-table-fix` from `develop`
  - Fix issue and re-test
  - Submit MR back to `develop`
  - If already cherry-picked to `story/AC-41`: rebase story branch with new fix
- If issue discovered in `test` environment:
  - Revert story branch cherry-pick commit (if possible)
  - Merge fix to `develop` first
  - Re-cherry-pick into story branch

### Feature-Flag Strategy
- **Not required for MVP**: Component is new; no existing feature using it yet
- When first feature adopts this component, feature flag can gate UI feature (not component itself)
- Example: Feature "Roles Management" can use `FeatureFlag.RolesTableUi` to gate table display

---

## 16. Production Quality Gates

### Pre-Implementation Checklist

- [x] AC-64 (Token Audit) **MUST** be completed first
- [x] AC-65 (Theme Engine) **MUST** be functional for Storybook dark/light switching
- [x] Token names defined and available in CSS custom properties
- [x] Storybook running and configured for Angular components
- [x] Translation service available and `en.json` / `fa.json` configured

### Pre-Merge Checklist

- [ ] Unit tests written first; all 15 test cases pass
- [ ] Integration tests pass (test host rendering verified)
- [ ] Code coverage >90% lines, >85% branches
- [ ] Storybook page built with all required states (populated, empty, selected, RTL, light/dark)
- [ ] No hardcoded color, spacing, or sizing values in component or styles
- [ ] All CSS uses token references: `var(--color-*)`, `var(--spacing-*)`
- [ ] Logical CSS properties used: `text-align: start`, `margin-inline-start`, etc.
- [ ] Component properly exported from `libs/shared/ui/src/lib/components/index.ts`
- [ ] Route registered in `story-book.routes.ts` and navigation sidebar updated
- [ ] Translation keys added to `en.json` and `fa.json` with proper context
- [ ] Component documented in Storybook markdown page
- [ ] Security review: no XSS vulnerabilities; data sanitization verified
- [ ] Performance: trackBy function used in *ngFor; OnPush strategy applied
- [ ] Code review approved by Technical Lead
- [ ] No console warnings or errors in Storybook or tests

### Post-Merge Validation

- [ ] MR merged to `develop` with both workspace and project MR links in Jira
- [ ] Jira task moved to `In Review` status
- [ ] Implementation log created in `docs/work-items/02.implementation/stories/AC-41/tasks/`
- [ ] Design system documentation updated with component reference
- [ ] Feature teams notified of new shared component availability

---

## 17. Dependency & Blocking Item Tracking

### Critical Blocking Dependency

| Dependency | Task | Status | Impact if Delayed |
|---|---|---|---|
| **AC-64 Token Audit** | FE - Token Audit & Standardization | ⏳ Pending | BLOCKS: Cannot determine which semantic tokens to consume; component would be incomplete without final token names. Estimated delay: 2-3 days. |

**Mitigation**: Proceed with model/interface definition (Phase 1) in parallel; pause implementation at Phase 2 token validation until AC-64 completes.

### Secondary Dependencies (Lower Priority)

| Dependency | Task | Status | Workaround |
|---|---|---|---|
| AC-65 (Theme Engine) | FE - Light/Dark Theme Engine | ⏳ Pending | Develop component with theme awareness; test with manual theme switching in Storybook |
| Storybook Configuration | Workspace Setup | ✓ Complete | Already available in project |

---

## 18. Success Criteria & Acceptance

### Functional Acceptance (Maps to AoC)

| AoC | Verification | Status |
|---|---|---|
| AOC-01 | `columns` and `rows` inputs implemented | Will verify in unit test |
| AOC-02 | Table renders `<thead>` with labels and `<tbody>` with rows | Will verify in integration test + Storybook visual |
| AOC-03 | Row hover state renders with token-driven background | Will verify in Storybook interactive demo |
| AOC-04 | `selectedRowKey` input and `rowSelected` output work | Will verify in unit + integration tests |
| AOC-05 | Empty state renders configurable message | Will verify in unit + Storybook visual |
| AOC-06 | All states use semantic tokens; zero hardcoded values | Will verify in code review + computed styles inspection |
| AOC-07 | Logical CSS properties used for RTL/LTR safety | Will verify in RTL Storybook page |
| AOC-08 | OnPush change detection and standalone pattern applied | Will verify in code review + metadata inspection |
| AOC-09 | Storybook page covers all states in light/dark/LTR/RTL | Will verify in Storybook tour |
| AOC-10 | Component exported from `libs/shared/ui/src/lib/components/index.ts` | Will verify in export validation |
| AOC-11 | Route registered and sidebar updated | Will verify in Storybook navigation |
| AOC-12 | Translation keys in `en.json` and `fa.json` | Will verify in localization files |

### Non-Functional Acceptance (Maps to DoD)

| DoD | Verification | Status |
|---|---|---|
| DOD-01 | Component implements all inputs/outputs and states | Code review + tests |
| DOD-02 | All states use tokens; zero hardcoded values | Computed styles + code review |
| DOD-03 | Storybook covers all states in both themes and LTR/RTL | Visual inspection + screenshots |
| DOD-04 | Component exported correctly | Export validation |
| DOD-05 | Unit tests pass; >90% coverage | Test execution + coverage report |
| DOD-06 | Translation keys added | i18n file inspection |

### Performance & Quality Benchmarks

- **Change Detection**: OnPush strategy confirmed
- **Render Time**: <100ms for 100 rows (trackBy optimized)
- **Test Coverage**: >90% lines, >85% branches
- **Accessibility**: Semantic HTML (`<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`); ARIA labels if needed
- **Bundle Size Impact**: <5KB uncompressed

---

## 19. Implementation Notes & Risk Mitigation

### Known Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| AC-64 delay | Medium | BLOCKS component implementation | Start Phase 1 (models) in parallel; communication with AC-64 owner for early token preview |
| Token naming convention change mid-way | Low | Requires component refactor | Ensure AC-64 is final before component CSS phase; hard gate on token stability |
| Storybook routing conflict | Low | Sidebar registration fails | Test route registration in dev environment early; use unique route path |
| RTL rendering issue with existing token set | Medium | RTL state incomplete | Verify logical CSS properties in test environment before Storybook submission |
| Performance issue with large row count (>1000) | Low | User experience degrades | Component uses trackBy; no virtual scroll in MVP scope; document row count limits in Storybook |

### Verification Checkpoints (In-Development)

1. **After Phase 1 (Models)**: Interfaces peer-reviewed; input/output contract signed off
2. **After Phase 2 (Tokens)**: Token validation against AC-64 final spec; token list documented
3. **After Phase 3 (Component)**: Unit test suite complete; code coverage >90%; no hardcoded values
4. **Before Storybook Submission**: Storybook page renders all states; light/dark/LTR/RTL verified; no console errors
5. **Pre-Merge Review**: Tech Lead approves component, tests, and token compliance

---

## 20. Handoff & Next Steps (Post-Approval)

### After TL Approval of This Plan

1. **Start Implementation**:
   - Create feature branch `features/AC-71-table-component` from `develop`
   - Begin Phase 1 (models definition)
   - Once AC-64 completes, proceed to Phase 2 (token setup) and Phase 3

2. **Daily Checkpoints**:
   - Verify token names from AC-64 owner daily (if AC-64 still pending)
   - Run unit tests after each major phase
   - Commit with message prefix: `wip: AC-71` for work-in-progress

3. **Merge Readiness** (when all phases complete):
   - Ensure all tests pass
   - Submit MR to `develop` with both repo MRs (workspace + project)
   - Reference this plan and AoC/DoD in MR description
   - TL reviews and approves
   - Merge with squash + delete branch

4. **Post-Merge**:
   - Jira task moves to `In Review`
   - Implementation log created
   - Cherry-pick to `story/AC-41` for promotion
   - Design system doc updated

---

## 21. Approver Sign-Off

**This implementation plan is ready for Tech Lead approval.**

| Role | Name | Date | Status |
|---|---|---|---|
| **Tech Lead** | [TBD] | [Pending] | ⏳ Awaiting Approval |
| **Product Owner** | [TBD] | [Pending] | ⏳ Awaiting Approval |

---

**Plan Prepared**: 2026-05-18  
**Plan Status**: Ready for TL Review & Approval  
**Next Action**: Tech Lead confirms readiness and approves handoff to `/speckit.implement`

