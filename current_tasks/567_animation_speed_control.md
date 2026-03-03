# Task 567: Add configurable animation speed to 3D viewer

## Status: DONE

## Summary

Added animation speed control button to 3D orbital viewer. Cycles through
0.5×, 1×, 2×, 4× speeds. At 1× the full mission completes in ~15 seconds.

### Implementation
- `orbital-3d-viewer.js`: `_animationSpeed` state, `setAnimationSpeed()`, `getAnimationSpeed()` exports
- `templates.ts`: Speed button HTML in `renderViewer3D`, handler in `generateViewer3dScript`
- `orbital-3d.html`: Speed button in standalone viewer

### Tests added (2 new unit + 1 E2E)
- `templates.test.ts`: episode speed button, summary speed button (in controls test)
- `reports.spec.ts`: E2E speed button presence check

### Files changed
- `ts/src/orbital-3d-viewer.js` — speed state + exports
- `ts/src/templates.ts` — speed button HTML + JS handler
- `ts/src/templates.test.ts` — 2 speed button tests
- `ts/examples/orbital-3d.html` — standalone speed button
- `ts/e2e/reports.spec.ts` — 1 E2E test

## Impact
- Human directive phase 30 item (2) addressed
