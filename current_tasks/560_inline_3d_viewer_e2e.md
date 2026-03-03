# Task 560: Add E2E tests for inline 3D viewer in cross-episode report

## Status: DONE

## Summary

Added 9 E2E tests verifying the inline `3d-viewer:` directive renders correctly
in the cross-episode report page. Previously only the standalone orbital-3d.html
had E2E coverage.

### Tests added (9 new)
- `reports.spec.ts`: "Inline 3D viewer in cross-episode report" describe block:
  1. viewer3d figure element exists
  2. viewer3d container has correct data-scene/data-scenes attributes
  3. 3 scene switcher buttons with correct Japanese labels
  4. first scene button is active by default
  5. timeline controls (play, slider, time) attached
  6. play button aria-label
  7. slider aria-label and range
  8. view mode toggle button with aria-label and text
  9. drag/zoom hint and caption text

### Files changed
- `ts/e2e/reports.spec.ts` — 9 new E2E tests (266→275 E2E total)

## Impact
- Stats: 4,031 TS, 275 E2E (4,837 total)
