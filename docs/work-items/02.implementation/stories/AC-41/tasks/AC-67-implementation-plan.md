# AC-67 Implementation Plan: Input & Textarea Components

**Task**: [AC-67 - FE - Input & Textarea Components](https://nexttoptech.atlassian.net/browse/AC-67)  
**Parent Story**: [AC-41](https://nexttoptech.atlassian.net/browse/AC-41)  
**Stack**: Frontend / Angular / Shared UI  
**Plan Version**: 1.0  
**Date**: May 4, 2026  
**Status**: Approved

---

## 1. Scope and Assumptions

### 1.1 In Scope
- `UiInputComponent`: Single-line text input with floating label support
- `UiTextareaComponent`: Multi-line text input with floating label support
- Both components support:
  - Label, helper text, validation message
  - Focus, error, disabled states
  - Token-driven styling (no hardcoded values)
  - RTL/LTR-safe using logical CSS properties
  - `ControlValueAccessor` for Angular forms integration
  - Business-agnostic design
- Storybook pages for both components
- Translation keys for demo content
- Export from shared UI library

### 1.2 PrimeNG Styling Requirements (User-Specified)
- **Simple inputs** (text, number, email, password, etc.): **WITH floating label**
- **Input groups** with icons or buttons inside: **WITHOUT floating label**
- **Text area**: **WITH floating label**

Reference patterns:
- https://primeng.org/inputtext (floating label pattern)
- https://primeng.org/inputgroup (input group without floating label)
- https://primeng.org/textarea (floating label pattern)

### 1.3 Out of Scope
- Select/Dropdown component
- Form validation beyond `ControlValueAccessor`
- Domain-specific inputs (currency, date range, etc.)
- Input group wrapper component (deferred to future task)

### 1.4 Key Assumptions
- AC-64 (Token Audit) is complete and semantic tokens are defined
- Existing checkbox component pattern is the reference architecture
- Storybook shell already exists and can accept new routes
- Translation system (`@ngx-translate`) is already configured

---

## 2. Repository Routing Matrix

| Artifact Type | Repository | Path |
|---------------|------------|------|
| **Component Source** | `accounting-frontend` | `libs/shared/ui/src/lib/components/input/` |
| **Component Source** | `accounting-frontend` | `libs/shared/ui/src/lib/components/textarea/` |
| **Export Registration** | `accounting-frontend` | `libs/shared/ui/src/lib/components/index.ts` |
| **Storybook Page (Input)** | `accounting-frontend` | `apps/erp-web/src/app/dev-tools/story-book/pages/input/` |
| **Storybook Page (Textarea)** | `accounting-frontend` | `apps/erp-web/src/app/dev-tools/story-book/pages/textarea/` |
| **Route Registration** | `accounting-frontend` | `apps/erp-web/src/app/dev-tools/story-book/story-book.routes.ts` |
| **Translation (EN)** | `accounting-frontend` | `apps/erp-web/src/assets/i18n/en.json` |
| **Translation (FA)** | `accounting-frontend` | `apps/erp-web/src/assets/i18n/fa.json` |
| **Task Documentation** | `accounting-workspace` | `docs/work-items/01.solution/linked/stories/AC-41/tasks/AC-67.md` |
| **Implementation Log** | `accounting-workspace` | `docs/work-items/implementation/stories/AC-41/tasks/AC-67.md` |

---

## 3. Implementation Steps and Dependencies

### Phase 1: UiInputComponent (TDD-First)
**Dependency**: None (can start immediately after approval)

#### Step 1.1: Create Component Structure
**Files to create**:
- `libs/shared/ui/src/lib/components/input/input.component.ts`
- `libs/shared/ui/src/lib/components/input/input.component.html`
- `libs/shared/ui/src/lib/components/input/input.component.scss`
- `libs/shared/ui/src/lib/components/input/input.component.spec.ts`

#### Step 1.2: Write Unit Tests First (TDD)
**Test file**: `input.component.spec.ts`

Test cases to implement (maps to TDD Coverage section 8):
1. ✅ Component renders without error
2. ✅ Label renders when `label` input is set
3. ✅ Label does NOT render when `label` input is empty
4. ✅ Helper text renders when `helperText` input is set
5. ✅ Validation message visible when `invalid=true` and `validationMessage` is set
6. ✅ Validation message hidden when `invalid=false`
7. ✅ `disabled` attribute propagated to native input element
8. ✅ `type` attribute propagated to native input element
9. ✅ `placeholder` attribute propagated to native input element
10. ✅ `ControlValueAccessor.writeValue` updates internal value state
11. ✅ `ControlValueAccessor.registerOnChange` registers callback
12. ✅ `ControlValueAccessor.registerOnTouched` registers callback
13. ✅ `ControlValueAccessor.setDisabledState` sets disabled state
14. ✅ Value change propagates through `valueChange` output
15. ✅ Integration test: Component works with `ReactiveFormsModule`

#### Step 1.3: Implement Component TypeScript
**Inputs**:
- `label: string = ''`
- `helperText: string = ''`
- `validationMessage: string = ''`
- `type: string = 'text'`
- `placeholder: string = ''`
- `disabled: boolean = false`
- `invalid: boolean = false`
- `value: string = ''`
- `inputId: string | null = null`
- `name: string | null = null`
- `ariaLabel: string | null = null`

**Outputs**:
- `valueChange: EventEmitter<string>`

**Internal Signals** (following checkbox pattern):
- `_formDisabled = signal(false)`
- `_usesFormApi = signal(false)`
- `_valueState = signal('')`
- `_isDisabled = computed(() => this.disabled() || this._formDisabled())`
- `_isVisuallyInvalid = computed(() => this.invalid())`
- `_resolvedInputId = computed(() => ...)`
- `_describedBy = computed(() => ...)`

**ControlValueAccessor Methods**:
- `writeValue(value: string | null): void`
- `registerOnChange(fn: (value: string) => void): void`
- `registerOnTouched(fn: () => void): void`
- `setDisabledState(isDisabled: boolean): void`

**Event Handlers**:
- `_onInputChange(event: Event): void`
- `_onBlur(): void`

**Decorator Configuration**:
- `ChangeDetectionStrategy.OnPush`
- Angular standalone component
- Provider: `NG_VALUE_ACCESSOR`

#### Step 1.4: Implement Component HTML Template
**Structure** (based on PrimeNG floating label pattern):
```html
<div class="ui-input">
  <div class="ui-input__wrapper">
    <input
      class="ui-input__field"
      [type]="type()"
      [id]="_resolvedInputId()"
      [name]="name()"
      [value]="_valueState()"
      [disabled]="_isDisabled()"
      [placeholder]="placeholder()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-invalid]="_isVisuallyInvalid() ? 'true' : null"
      [attr.aria-describedby]="_describedBy()"
      (input)="_onInputChange($event)"
      (blur)="_onBlur()"
    />
    
    @if (label()) {
      <label class="ui-input__label" [attr.for]="_resolvedInputId()">
        {{ label() }}
      </label>
    }
  </div>

  @if (helperText() && !_isVisuallyInvalid()) {
    <span class="ui-input__helper" [id]="_resolvedInputId() + '-helper'">
      {{ helperText() }}
    </span>
  }

  @if (_isVisuallyInvalid() && validationMessage()) {
    <span class="ui-input__error" [id]="_resolvedInputId() + '-error'">
      {{ validationMessage() }}
    </span>
  }
</div>
```

#### Step 1.5: Implement Component SCSS Styles
**Token-driven styling requirements** (maps to AOC-05, AOC-06):
- Use only semantic CSS custom properties (no hardcoded values)
- Use logical CSS properties for RTL/LTR safety
- Support interaction states: default, focus, error, disabled
- Implement floating label animation

**Key style classes**:
- `.ui-input` (host container)
- `.ui-input__wrapper` (input + floating label wrapper)
- `.ui-input__field` (native input element)
- `.ui-input__label` (floating label)
- `.ui-input__helper` (helper text)
- `.ui-input__error` (validation message)
- `.ui-input--focused` (focus state modifier)
- `.ui-input--invalid` (error state modifier)
- `.ui-input--disabled` (disabled state modifier)
- `.ui-input--has-value` (floating label positioned state)

**Semantic tokens to use**:
- `--fg-primary`, `--fg-secondary`, `--fg-error`, `--fg-disabled`
- `--surface-primary`, `--surface-disabled`
- `--border-primary`, `--border-secondary`, `--border-error`, `--border-focus`
- `--spacing-1`, `--spacing-2`, `--spacing-3`, `--spacing-4`
- `--radius-sm`, `--radius-md`
- `--font-size-sm`, `--font-size-base`
- `--line-height-snug`, `--line-height-normal`
- `--transition-fast`

**Logical CSS properties**:
- `padding-inline-start`, `padding-inline-end`
- `margin-inline-start`, `margin-inline-end`
- `border-inline-start`, `border-inline-end`
- `inset-inline-start`, `inset-inline-end`

#### Step 1.6: Export Component
Update `libs/shared/ui/src/lib/components/index.ts`:
```typescript
export { UiInputComponent } from './input/input.component';
```

---

### Phase 2: UiTextareaComponent (TDD-First)
**Dependency**: Phase 1 complete (shares same patterns)

#### Step 2.1: Create Component Structure
**Files to create**:
- `libs/shared/ui/src/lib/components/textarea/textarea.component.ts`
- `libs/shared/ui/src/lib/components/textarea/textarea.component.html`
- `libs/shared/ui/src/lib/components/textarea/textarea.component.scss`
- `libs/shared/ui/src/lib/components/textarea/textarea.component.spec.ts`

#### Step 2.2: Write Unit Tests First (TDD)
**Test file**: `textarea.component.spec.ts`

Test cases (same as Input plus `rows`):
1-15: Same test cases as Input component
16. ✅ `rows` attribute propagated to native textarea element

#### Step 2.3: Implement Component TypeScript
**Inputs** (same as Input plus):
- `rows: number = 4` (additional input for textarea height)

All other inputs, outputs, signals, and methods same as `UiInputComponent`.

#### Step 2.4: Implement Component HTML Template
Same structure as Input, but replace `<input>` with `<textarea>`:
```html
<textarea
  class="ui-textarea__field"
  [rows]="rows()"
  [id]="_resolvedInputId()"
  ...
></textarea>
```

#### Step 2.5: Implement Component SCSS Styles
Same token-driven approach as Input with textarea-specific adjustments:
- `.ui-textarea` prefix instead of `.ui-input`
- Textarea-specific height handling via `rows`
- Resize behavior control (e.g., `resize: vertical`)

#### Step 2.6: Export Component
Update `libs/shared/ui/src/lib/components/index.ts`:
```typescript
export { UiTextareaComponent } from './textarea/textarea.component';
```

---

### Phase 3: Storybook Pages
**Dependency**: Phase 1 and Phase 2 complete

#### Step 3.1: Create Input Storybook Page
**Files to create**:
- `apps/erp-web/src/app/dev-tools/story-book/pages/input/input-story-book.component.ts`
- `apps/erp-web/src/app/dev-tools/story-book/pages/input/input-story-book.component.html`

**Demos to include** (maps to AOC-08):
1. Default state
2. With label
3. With helper text
4. With validation message (invalid state)
5. Disabled state
6. Focus state (documented with note)
7. Different input types (text, email, password, number)
8. Template-driven form integration
9. Reactive form integration
10. Signal-based form integration (if applicable)
11. Playground with interactive controls

**Component structure** (following checkbox pattern):
```typescript
@Component({
  selector: 'app-input-story-book',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    UiInputComponent,
    StoryBookCodeBlockComponent
  ],
  templateUrl: './input-story-book.component.html',
  styleUrl: '../../shared/styles/story-book-content.scss'
})
export class InputStoryBookComponent implements StoryBookPageWithSections {
  // Signals for playground
  // Form controls for demonstrations
  // Code snippets for each demo
}
```

#### Step 3.2: Create Textarea Storybook Page
**Files to create**:
- `apps/erp-web/src/app/dev-tools/story-book/pages/textarea/textarea-story-book.component.ts`
- `apps/erp-web/src/app/dev-tools/story-book/pages/textarea/textarea-story-book.component.html`

**Demos to include** (maps to AOC-09):
Same as Input plus:
- Different `rows` configurations (2, 4, 6, 8)
- Auto-resize behavior (if implemented)

#### Step 3.3: Register Storybook Routes
Update `apps/erp-web/src/app/dev-tools/story-book/story-book.routes.ts`:
```typescript
{
  path: 'input',
  loadComponent: () => import('./pages/input/input-story-book.component').then(m => m.InputStoryBookComponent)
},
{
  path: 'textarea',
  loadComponent: () => import('./pages/textarea/textarea-story-book.component').then(m => m.TextareaStoryBookComponent)
}
```

**Maps to**: AOC-11

---

### Phase 4: Translation Keys
**Dependency**: Phase 3 complete (keys identified from Storybook demos)

#### Step 4.1: Add English Translation Keys
Update `apps/erp-web/src/assets/i18n/en.json`:
```json
{
  "DS_INPUT_TITLE": "Input",
  "DS_INPUT_DESCRIPTION": "Single-line text input with floating label support",
  "DS_INPUT_LABEL_EXAMPLE": "Email Address",
  "DS_INPUT_HELPER_EXAMPLE": "We'll never share your email with anyone",
  "DS_INPUT_ERROR_EXAMPLE": "Please enter a valid email address",
  "DS_INPUT_PLACEHOLDER_EXAMPLE": "you@example.com",
  "DS_INPUT_TYPE_TEXT": "Text Input",
  "DS_INPUT_TYPE_EMAIL": "Email Input",
  "DS_INPUT_TYPE_PASSWORD": "Password Input",
  "DS_INPUT_TYPE_NUMBER": "Number Input",
  "DS_INPUT_FORM_LABEL": "Username",
  "DS_INPUT_FORM_HINT": "Choose a unique username",
  "DS_INPUT_FORM_ERROR": "Username is required",
  "DS_INPUT_FORM_SUBMIT": "Submit",
  
  "DS_TEXTAREA_TITLE": "Textarea",
  "DS_TEXTAREA_DESCRIPTION": "Multi-line text input with floating label support",
  "DS_TEXTAREA_LABEL_EXAMPLE": "Description",
  "DS_TEXTAREA_HELPER_EXAMPLE": "Provide a detailed description",
  "DS_TEXTAREA_ERROR_EXAMPLE": "Description must be at least 10 characters",
  "DS_TEXTAREA_PLACEHOLDER_EXAMPLE": "Enter your description here...",
  "DS_TEXTAREA_ROWS_2": "2 Rows",
  "DS_TEXTAREA_ROWS_4": "4 Rows (Default)",
  "DS_TEXTAREA_ROWS_6": "6 Rows",
  "DS_TEXTAREA_ROWS_8": "8 Rows",
  "DS_TEXTAREA_FORM_LABEL": "Comments",
  "DS_TEXTAREA_FORM_HINT": "Share your thoughts",
  "DS_TEXTAREA_FORM_ERROR": "Comments are required",
  "DS_TEXTAREA_FORM_SUBMIT": "Submit"
}
```

#### Step 4.2: Add Persian Translation Keys
Update `apps/erp-web/src/assets/i18n/fa.json`:
```json
{
  "DS_INPUT_TITLE": "ورودی متن",
  "DS_INPUT_DESCRIPTION": "ورودی تک‌خطی با پشتیبانی از برچسب شناور",
  "DS_INPUT_LABEL_EXAMPLE": "آدرس ایمیل",
  "DS_INPUT_HELPER_EXAMPLE": "ایمیل شما با هیچ‌کس به اشتراک گذاشته نمی‌شود",
  "DS_INPUT_ERROR_EXAMPLE": "لطفا یک آدرس ایمیل معتبر وارد کنید",
  "DS_INPUT_PLACEHOLDER_EXAMPLE": "you@example.com",
  "DS_INPUT_TYPE_TEXT": "ورودی متن",
  "DS_INPUT_TYPE_EMAIL": "ورودی ایمیل",
  "DS_INPUT_TYPE_PASSWORD": "ورودی رمز عبور",
  "DS_INPUT_TYPE_NUMBER": "ورودی عدد",
  "DS_INPUT_FORM_LABEL": "نام کاربری",
  "DS_INPUT_FORM_HINT": "یک نام کاربری منحصر به فرد انتخاب کنید",
  "DS_INPUT_FORM_ERROR": "نام کاربری الزامی است",
  "DS_INPUT_FORM_SUBMIT": "ارسال",
  
  "DS_TEXTAREA_TITLE": "ناحیه متن",
  "DS_TEXTAREA_DESCRIPTION": "ورودی چندخطی با پشتیبانی از برچسب شناور",
  "DS_TEXTAREA_LABEL_EXAMPLE": "توضیحات",
  "DS_TEXTAREA_HELPER_EXAMPLE": "توضیحات تفصیلی ارائه دهید",
  "DS_TEXTAREA_ERROR_EXAMPLE": "توضیحات باید حداقل ۱۰ کاراکتر باشد",
  "DS_TEXTAREA_PLACEHOLDER_EXAMPLE": "توضیحات خود را اینجا وارد کنید...",
  "DS_TEXTAREA_ROWS_2": "۲ خط",
  "DS_TEXTAREA_ROWS_4": "۴ خط (پیش‌فرض)",
  "DS_TEXTAREA_ROWS_6": "۶ خط",
  "DS_TEXTAREA_ROWS_8": "۸ خط",
  "DS_TEXTAREA_FORM_LABEL": "نظرات",
  "DS_TEXTAREA_FORM_HINT": "نظرات خود را به اشتراک بگذارید",
  "DS_TEXTAREA_FORM_ERROR": "نظرات الزامی است",
  "DS_TEXTAREA_FORM_SUBMIT": "ارسال"
}
```

**Maps to**: AOC-12, DOD-06

---

## 4. AoC/DoD/TDD/BDD Mapping

### 4.1 Acceptance of Completion (AoC) Mapping

| AoC ID | Implementation Phase | Verification Method |
|--------|---------------------|---------------------|
| AOC-01 | Phase 1: Steps 1.3-1.4 | Unit tests + Manual verification |
| AOC-02 | Phase 2: Steps 2.3-2.4 | Unit tests + Manual verification |
| AOC-03 | Phase 1.4 + Phase 2.4 | Unit tests + Storybook demos |
| AOC-04 | Phase 1.5 + Phase 2.5 | Visual regression in Storybook |
| AOC-05 | Phase 1.5 + Phase 2.5 | Code review + CSS audit |
| AOC-06 | Phase 1.5 + Phase 2.5 | RTL test in Storybook |
| AOC-07 | Phase 1.3 + Phase 2.3 | Code review + TypeScript check |
| AOC-08 | Phase 3.1 | Storybook page completeness check |
| AOC-09 | Phase 3.2 | Storybook page completeness check |
| AOC-10 | Phase 1.6 + Phase 2.6 | Import test from consuming app |
| AOC-11 | Phase 3.3 | Manual navigation test |
| AOC-12 | Phase 4.1 + Phase 4.2 | Translation key usage verification |

### 4.2 Definition of Done (DoD) Mapping

| DoD ID | Implementation Evidence | Completion Gate |
|--------|------------------------|-----------------|
| DOD-01 | Phase 1 + Phase 2 complete | All unit tests pass |
| DOD-02 | Phase 1.5 + Phase 2.5 complete | Visual review in all states |
| DOD-03 | Phase 3 complete | RTL/LTR toggle in Storybook |
| DOD-04 | Phase 1.6 + Phase 2.6 complete | Library barrel export verified |
| DOD-05 | All unit tests in Phase 1.2 + Phase 2.2 | Test suite passes (100% coverage for public API) |
| DOD-06 | Phase 4 complete | No missing translation keys |

### 4.3 TDD Coverage Mapping (Section 8)

**Unit Tests** → Implemented in Phase 1.2 and Phase 2.2

**Integration Tests** → Implemented in Storybook demos (Phase 3)
- Template-driven forms
- Reactive forms
- Signal-based forms

**Contract/API Tests** → N/A (not applicable for UI components)

### 4.4 BDD Scenarios Mapping (Section 9)

| BDD Scenario | Verification Location | Expected Evidence |
|--------------|----------------------|-------------------|
| Scenario 1: Validation message display | Phase 1.2 (unit test) + Phase 3.1 (Storybook) | Validation message visible when `invalid=true` and `validationMessage` is set |
| Scenario 2: RTL correctness | Phase 1.5 (CSS) + Phase 3.1 (Storybook RTL demo) | All layout properties use logical CSS; visual inspection passes |
| Scenario 3: Disabled state | Phase 1.2 (unit test) + Phase 3.1 (Storybook) | Native input disabled; visual state reflects token |

---

## 5. Security and Privacy Controls

### 5.1 Input Sanitization
**Responsibility**: Consuming applications (not this component)
- Components are presentation-only and business-agnostic
- No sanitization applied at component level
- Consuming apps must sanitize user input before submission

### 5.2 Abuse-Case Checks
- ❌ **N/A**: No authentication, authorization, or data access
- ❌ **N/A**: No XSS vulnerability (Angular automatic escaping)
- ❌ **N/A**: No CSRF concern (read-only presentation components)
- ✅ **Accessibility**: ARIA attributes ensure screen reader compatibility

### 5.3 Sensitive Data Handling
- Password input type supported (`type="password"`)
- Component does NOT log or persist input values
- Values managed by Angular forms (external to component)

---

## 6. Observability Requirements

### 6.1 Logging Strategy
**Level**: None (presentation component)
- No business logic to log
- No user-domain operations
- Angular change detection handles component lifecycle

### 6.2 Metrics
**Level**: None
- No performance-critical operations
- Component rendering covered by Angular DevTools

### 6.3 Traces
**Level**: None
- No async operations or network calls

---

## 7. Global Response Key Model

**Applicability**: ❌ **N/A**

Reason: These are pure presentation components with no backend communication. Response keys are not applicable.

---

## 8. Data Model / Migration Impact

**Impact**: ❌ **None**

Reason: Frontend UI components do not affect database schema or require migrations.

---

## 9. Rollout, Rollback, and Feature Flags

### 9.1 Rollout Strategy
**Type**: Library-level release (no feature flag needed)
- Components added to shared UI library
- Consuming teams adopt incrementally
- No breaking changes to existing components

### 9.2 Rollback Strategy
**Type**: Git revert
- If critical defect found: revert commit and remove from library exports
- Consuming apps unaffected (they haven't adopted yet)

### 9.3 Feature Flags
**Required**: ❌ No
- Shared UI components are opt-in by design
- No runtime toggle needed

---

## 10. Implementation Execution Order (TDD-First)

### Execution Sequence

1. ✅ **Phase 1.1**: Create Input component file structure
2. ✅ **Phase 1.2**: Write Input unit tests (TDD-first, tests fail initially)
3. ✅ **Phase 1.3**: Implement Input TypeScript (make tests pass)
4. ✅ **Phase 1.4**: Implement Input HTML template
5. ✅ **Phase 1.5**: Implement Input SCSS styles (token-driven)
6. ✅ **Phase 1.6**: Export Input component
7. ✅ **Checkpoint**: All Input tests pass, component can be imported

8. ✅ **Phase 2.1**: Create Textarea component file structure
9. ✅ **Phase 2.2**: Write Textarea unit tests (TDD-first, tests fail initially)
10. ✅ **Phase 2.3**: Implement Textarea TypeScript (make tests pass)
11. ✅ **Phase 2.4**: Implement Textarea HTML template
12. ✅ **Phase 2.5**: Implement Textarea SCSS styles (token-driven)
13. ✅ **Phase 2.6**: Export Textarea component
14. ✅ **Checkpoint**: All Textarea tests pass, component can be imported

15. ✅ **Phase 3.1**: Create Input Storybook page
16. ✅ **Phase 3.2**: Create Textarea Storybook page
17. ✅ **Phase 3.3**: Register Storybook routes
18. ✅ **Checkpoint**: Storybook pages accessible, all demos work

19. ✅ **Phase 4.1**: Add English translation keys
20. ✅ **Phase 4.2**: Add Persian translation keys
21. ✅ **Checkpoint**: All translation keys resolve, no missing keys

22. ✅ **Final Verification**: RTL/LTR visual test in Storybook
23. ✅ **Final Verification**: All AoC items confirmed
24. ✅ **Final Verification**: All DoD items confirmed

### Parallel Work Opportunities
- Phase 1 (Input) and Phase 2 (Textarea) can run sequentially (Textarea reuses Input patterns)
- Phase 3.1 (Input Storybook) and Phase 3.2 (Textarea Storybook) can run in parallel after Phase 1-2 complete

---

## 11. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| RTL visual regression | Medium | High | Mandatory RTL verification in Storybook before marking done |
| Token naming mismatch | Low | Medium | Reference AC-64 token audit results; code review |
| Floating label animation broken | Low | Medium | Test in multiple browsers; reference PrimeNG patterns |
| `ControlValueAccessor` integration issue | Low | High | Integration tests with all form types (template, reactive, signal) |
| Missing translation keys | Medium | Low | Automated check for missing keys before commit |

---

## 12. Verification Checkpoints

### Pre-Implementation Checklist
- [ ] AC-64 (Token Audit) is complete
- [ ] Semantic tokens are documented and available
- [ ] TL approval received for this implementation plan
- [ ] Frontend branch is up-to-date with `develop`

### Post-Implementation Checklist (Before Marking Done)
- [ ] All unit tests pass (Input + Textarea)
- [ ] All integration tests pass (forms integration)
- [ ] Storybook pages render without errors
- [ ] RTL layout verified in Storybook
- [ ] LTR layout verified in Storybook
- [ ] No hardcoded color/spacing/radius values in SCSS
- [ ] All logical CSS properties used correctly
- [ ] Components exported from library barrel
- [ ] Routes registered in Storybook
- [ ] All translation keys added (EN + FA)
- [ ] No missing translation keys in console
- [ ] Focus state visually distinct
- [ ] Error state visually distinct
- [ ] Disabled state visually distinct
- [ ] Floating label animation works smoothly
- [ ] `ControlValueAccessor` contract verified
- [ ] Code review completed
- [ ] GitLab MR marked as Ready (not Draft)
- [ ] Jira task moved to "In Review"

---

## 13. Source Traceability

| Requirement | Source Document | Section/Item |
|-------------|----------------|--------------|
| Token-driven styling | `docs/work-items/01.solution/linked/stories/AC-41/solution.md` | Technical Decision 3 |
| RTL/LTR safety | `docs/work-items/00.refinement/linked/stories/AC-41/refinement.md` | AoC-09 |
| Storybook coverage | `docs/work-items/00.refinement/linked/stories/AC-41/refinement.md` | AoC-19, AoC-20 |
| ControlValueAccessor | `docs/work-items/00.refinement/linked/stories/AC-41/refinement.md` | AoC-21 |
| Translation keys | `docs/work-items/00.refinement/linked/stories/AC-41/refinement.md` | AoC-22 |
| PrimeNG floating label | User request (current session) | AC-67 Repo FRONT specification |

---

## 14. TL Approval Gate

### Approval Status
✅ **APPROVED**

### Approval Checklist
- [x] Plan is specific and production-ready (no generic placeholders)
- [x] Repository routing is explicit and correct
- [x] File structure matches existing patterns
- [x] TDD execution order is clear
- [x] All AoC/DoD/TDD/BDD items are mapped to implementation steps
- [x] Security and observability sections addressed appropriately
- [x] Risk assessment complete
- [x] Verification checkpoints defined
- [x] PrimeNG styling requirements clearly specified

### Required Approver
**Tech Lead**: Approved via interactive session

### Approval Date
**May 4, 2026**

### Approval Notes
Implementation plan approved. All required sections complete. Ready to proceed with TDD-first implementation.

---

## 15. Next Steps After Approval

1. ✅ Receive explicit TL approval confirmation
2. ✅ Update task status in Jira (remains "In Progress")
3. ✅ Trigger `/speckit.implement` with approved plan
4. ✅ Follow TDD-first execution order
5. ✅ Commit changes incrementally with `wip:` prefix
6. ✅ Complete all verification checkpoints
7. ✅ Mark GitLab MRs as Ready
8. ✅ Move Jira task to "In Review"
9. ✅ Request code review from Tech Lead
10. ✅ Address review feedback
11. ✅ Merge after approval
12. ✅ Execute `/speckit.taskclose` for completion documentation

---

**End of Implementation Plan**
