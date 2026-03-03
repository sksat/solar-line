# Task 555: Add planetary orbit circles to full-route 3D scene

## Status: DONE

## Summary

Added orbital path circles for all 5 planets (Mars, Jupiter, Saturn, Uranus, Earth) in the
full-route 3D viewer. Previously only moon orbit circles were drawn in local scenes.

### Changes
1. Added `OrbitCircleData` interface and `orbitCircles` field to `SceneData`
2. `prepareFullRouteScene` now generates orbit circles with correct AU-to-scene radii and z heights
3. Renderer draws semi-transparent orbit circles at each planet's ecliptic height
4. Updated orbital-3d.html example to match

### Tests added (5 new)
- `orbital-3d-viewer-data.test.ts`: orbit circles for 5 planets, radii ordering, AU_TO_SCENE match
- `orbital-3d-viewer.test.ts`: 5 orbit circles present with positive radii and colors

### Files changed
- `ts/src/orbital-3d-viewer-data.ts` — OrbitCircleData type, orbitCircles in SceneData, populate in prepareFullRouteScene
- `ts/src/orbital-3d-viewer-data.test.ts` — 3 new tests (28→31)
- `ts/src/orbital-3d-viewer.test.ts` — 2 new tests (43→45)
- `ts/src/orbital-3d-viewer.js` — addFullRouteOrbitCircle renderer, render in loadScene
- `ts/examples/orbital-3d.html` — orbitCircles generation

## Impact
- Stats: 4,026 TS tests
- Human directive phase 29 item (2) addressed: planetary orbits now visible
