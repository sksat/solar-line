# Task 577: Add In-Plane Curvature to 3D Transfer Arcs

## Status: **DONE**

## Description

3D transfer arcs are straight-line chords between planets with only a vertical (z-height)
bump. Real orbital transfers curve around the Sun. The 2D SVG diagrams correctly show
curved arcs (using angular midpoint at average radius as Bezier control point), but the
3D viewer does not. This makes the 3D visualization look unrealistic and inconsistent
with the 2D diagrams.

## Plan

1. Modify arc control point calculation in `orbital-3d-viewer.js` to add in-plane curvature
   - Keep the existing z-height bump
   - Add displacement toward the Sun side (inward from the chord midpoint)
   - The control point should be at approximately the angular midpoint between departure
     and arrival angles, at the average orbital radius
2. Apply to all three arc-building code paths:
   - `addTransferArc()` (static scene)
   - `loadTimeline()` orbit-based arcs
   - `loadTimeline()` pre-defined arcs
3. Add tests verifying arc control points have in-plane displacement
4. Verify visually via E2E tests

## Files
- `ts/src/orbital-3d-viewer.js` — arc rendering
- `ts/src/orbital-3d-viewer-data.ts` — test data structure
- `ts/src/orbital-3d-viewer-data.test.ts` — tests
