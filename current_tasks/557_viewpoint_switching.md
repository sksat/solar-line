# Task 557: Add inertial/ship viewpoint switching to 3D viewer

## Status: DONE

## Summary

Added viewpoint switching between inertial frame (fixed center) and ship frame
(camera follows the ship marker) in the 3D orbital viewer.

### Changes
1. Added `ViewMode` type ("inertial" | "ship") and `supportedViewModes` to `SceneData`
2. All 3 scenes now declare support for both view modes
3. Renderer: `setViewMode`/`getViewMode` exports, camera tracking in `updateTimelineFrame`
4. HTML: "慣性/宇宙船" toggle button in timeline controls

### How ship-frame works
- Camera target follows ship marker position during animation
- Camera maintains offset (5, 8, 10) from ship for good viewing angle
- Switching back to inertial resets camera to scene center
- User can still drag to rotate/zoom in both modes

### Tests added (2 new)
- `orbital-3d-viewer-data.test.ts`: full-route supports both view modes
- `orbital-3d-viewer-data.test.ts`: Saturn scene supports both view modes

### Files changed
- `ts/src/orbital-3d-viewer-data.ts` — ViewMode type, supportedViewModes
- `ts/src/orbital-3d-viewer-data.test.ts` — 2 new tests (33→35)
- `ts/src/orbital-3d-viewer.js` — setViewMode, getViewMode, ship-frame camera tracking
- `ts/examples/orbital-3d.html` — view mode button + handler

## Impact
- Stats: 4,031 TS tests
- Human directive phase 29 item (3) addressed: viewpoint switching
