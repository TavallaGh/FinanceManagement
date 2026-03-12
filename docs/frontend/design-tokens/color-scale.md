# Extracted Color Scale (Prototype)

Source scan:
- `projects/Accounting-Prototype/**/*.js`
- `projects/Accounting-Prototype/index.html`

## 1. Tailwind Color Families In Use

- `slate`: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900
- `indigo`: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900
- `blue`: 50, 100, 200, 300, 500, 600, 700, 800, 900
- `emerald`: 50, 100, 400, 500, 600, 700, 900
- `green`: 50, 100, 200, 500, 600, 700
- `amber`: 50, 100, 200, 400, 600, 700, 900
- `red`: 50, 100, 200, 300, 400, 500, 600, 700, 900
- `purple`: 50, 100, 200, 300, 600, 700, 800
- `orange`: 50, 100, 500, 600, 700
- `yellow`: 100, 200, 600, 900
- `cyan`: 600, 700
- `gray`: 100, 200

## 2. Gradient Tokens Found

- `from-indigo-100` -> `to-blue-50`
- `from-indigo-600` -> `to-blue-500`
- `from-indigo-700` -> `to-blue-600|700`

## 3. Ring Tokens Found

- `ring-indigo-100|200|300|400|500`
- `ring-blue-200`
- `ring-emerald-100`
- `ring-purple-200`

## 4. Direct Hex Colors Found

- `#cbd5e1` (scrollbar thumb)
- `#94a3b8` (scrollbar thumb hover)
- `#f1f5f9` (print gray background)
- `#000` (print borders)

Notes:
- `#89204` appears in `components/UserProfile.js` as plain text user ID, not a color token.

## 5. Practical Design Token Mapping

- Primary brand: Indigo (`indigo-600`, `indigo-700`)
- Neutral UI surfaces: Slate (`slate-50`..`slate-900`)
- Success semantics: Emerald/Green
- Warning semantics: Amber/Orange
- Error semantics: Red
- Info semantics: Blue
