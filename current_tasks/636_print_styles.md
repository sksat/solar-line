# Task 636: Add Print Styles for Dark Theme

Status: DONE

## Problem
No `@media print` styles exist. Dark background would print as black-on-black.

## Solution
Added `@media print` CSS block: white background, black text, hidden nav/footer/controls.

## Files Modified
- `ts/src/templates.ts` — Added @media print CSS
- `ts/e2e/reports.spec.ts` — Added print styles E2E test
