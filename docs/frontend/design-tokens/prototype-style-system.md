# Prototype Style System (React Extraction)

Date: 2026-03-10
Source: `projects/Accounting-Prototype/index.html`, `projects/Accounting-Prototype/app.js`, `projects/Accounting-Prototype/components/*.js`, `projects/Accounting-Prototype/financial/generalledger/*.js`

## 1. Typography

- Primary typeface: `Vazirmatn` (RTL-first, Persian baseline).
- Base body size in prototype shell: `13px`.
- Common content sizes:
  - `10px`, `11px`, `12px` for dense data controls.
  - `14px` and `16px` for key labels and section text.
  - `20px+` for page-level titles.
- Weight pattern:
  - Regular for body/value text.
  - `font-medium` for control labels.
  - `font-bold`/`font-black` for section headers and active UI state.

## 2. Color Direction

Primary and neutral usage in prototype:

- Primary: Indigo family (`indigo-600`, `indigo-700`, hover to `indigo-800`).
- Surface: White and soft slate backgrounds.
- Border: Slate (`slate-100`, `slate-200`, `slate-300`).
- Text:
  - Main: `slate-800`.
  - Secondary: `slate-700`.
  - Muted: `slate-500`/`slate-400`.

Semantic colors:

- Success: Emerald/Green.
- Warning: Amber/Orange.
- Danger: Red.
- Info: Blue.
- Auxiliary tag accent: Purple.

## 3. Radius, Borders, and Elevation

- Radius rhythm:
  - `rounded` and `rounded-md` for controls.
  - `rounded-lg` and `rounded-xl` for cards/panels.
  - `rounded-2xl` for major shells/dialogs.
  - `rounded-full` for avatars and circular icon buttons.
- Border rhythm:
  - Default: `1px` slate borders.
  - Active selected rows/chips: indigo border + subtle ring.
- Shadow rhythm:
  - `shadow-sm` for most cards/controls.
  - `shadow-lg` only on highlighted shell elements.

## 4. Spacing and Density

Dense enterprise grid patterns dominate:

- Typical control heights: `24px`, `32px`, `36px`, `44px`.
- Frequent horizontal paddings: `px-2`, `px-3`, `px-4`.
- Frequent vertical paddings: `py-1`, `py-1.5`, `py-2`.
- Section card paddings: `p-3`, `p-4`, `p-6`.
- Gap rhythm: `gap-1`, `gap-2`, `gap-3`, `gap-4`.

## 5. Interaction States

- Hover:
  - Neutral controls: slate hover.
  - Primary controls: deeper indigo hover.
  - Danger controls: red tint hover.
- Focus:
  - Indigo ring (`focus:ring-indigo-*`) with matching border emphasis.
- Selection:
  - Indigo-tinted background + highlighted border/ring.
- Disabled:
  - Reduced opacity and blocked pointer semantics.

## 6. Shell and Layout Pattern

Prototype shell has a consistent 3-column behavior:

- Narrow icon rail (module switcher).
- Tree/secondary side panel.
- Main workspace content region with top toolbar.

Additional shell cues:

- Light slate app background with white content panes.
- Sticky header sections where needed.
- Soft divider lines and subtle inner shadows.

## 7. RTL/LTR Rules

- Direction flips are explicit and frequent (`dir-ltr`, rtl-aware padding and icon positions).
- Numeric identifiers and technical fields often forced LTR.
- Search and icon adornments are mirrored based on direction.

## 8. Scrollbar and Motion

- Custom thin scrollbar in shell contexts.
- Subtle transition timings (`duration-150` to `duration-300`).
- Small-scale transforms for active clicks and open/close behavior.

## 9. Blazor Mapping Guidance

For `projects/Accounting-Workspace/src/Accounting.Workspace.Blazor`:

- Keep `Vazirmatn` as base font.
- Use indigo/slate token pair as default theme for parity with prototype.
- Preserve dense control heights and small typography for data-heavy pages.
- Ensure RTL/LTR helper classes stay available globally.
- Preserve consistent card radius + border + shadow rules across all UI kit components.
