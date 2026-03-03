# Task 578: Fix 3D Viewer dist Bug, Local Scene Arcs, Add E2E JS Error Test

## Status: **DONE**

## Description

1. **Critical bug**: `dist` variable used in `addTransferArc()` arrow helper sizing was
   undefined after Task 577 refactoring removed the local `dist` calculation. Fixed by
   recomputing `dist = from.distanceTo(to)` before the arrow helper.

2. **Local scene arcs**: `arcControlPoint()` assumed Sun-centric geometry, producing
   near-straight arcs in planet-centric local scenes (saturn-ring, uranus-approach).
   Added `arcControlPointLocal()` with lateral offset for flyby-style curvature.

3. **Missing E2E test**: The 3D viewer example page had no "loads without JS errors"
   test, unlike all other interactive component examples. Added test.

## Files
- `ts/src/orbital-3d-viewer.js` — fix dist bug, add arcControlPointLocal, scene-aware dispatch
- `ts/e2e/examples.spec.ts` — add JS error test for 3D viewer
- `current_tasks/578_3d_viewer_bugfix_and_tests.md` — this file
