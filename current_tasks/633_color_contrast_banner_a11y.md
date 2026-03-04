# Task 633: Fix Color Contrast and Site-Banner Accessibility

Status: DONE

## Problem
1. `--text-muted: #6e7681` on `#0d1117` background has ~3.5:1 contrast ratio, failing WCAG AA (requires 4.5:1)
2. `.verdict-reference` background `#6e7681` with white text has ~4.1:1 contrast, failing WCAG AA
3. Site banner `<div>` has no ARIA role, invisible to screen reader landmark navigation

## Solution
- Changed `--text-muted` from `#6e7681` to `#848d97` (~5.0:1 contrast)
- Changed `.verdict-reference` background from `#6e7681` to `#565d65` (~6.5:1 contrast)
- Added `role="note"` and `aria-label="サイト注意事項"` to site banner div
- Added E2E test verifying banner role and aria-label

## Files Modified
- `ts/src/templates.ts` — Color contrast fixes and banner ARIA attributes
- `ts/e2e/reports.spec.ts` — Added banner accessibility E2E test
