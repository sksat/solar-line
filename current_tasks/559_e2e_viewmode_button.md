# Task 559: Add E2E test for view mode toggle button

## Status: DONE

## Summary

Added E2E test verifying the view mode toggle button exists in the 3D orbital viewer
with correct aria-label and initial text.

### Tests added (1 new)
- `e2e/examples.spec.ts`: "has view mode toggle button" — checks #view-mode-btn is attached,
  has aria-label="視点切替", shows "慣性" text

### Files changed
- `ts/e2e/examples.spec.ts` — 1 new E2E test (265→266 E2E total)

## Impact
- Stats: 4,031 TS, 531 Rust, 266 E2E (4,828 total)
