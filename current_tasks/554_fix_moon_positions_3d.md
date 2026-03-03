# Task 554: Fix moon positions in 3D viewer scenes (TDD)

## Status: DONE

## Summary

Fixed Saturn/Enceladus and Uranus/Titania appearing at the same position in 3D viewer.
Both moons had hardcoded `x: 0, y: 0, z: 0` (identical to their parent planet).

### Root Cause
- `prepareSaturnScene` and `prepareUranusScene` set moon coordinates to (0,0,0)
- The `orbitRadius` property was only used by the renderer for orbit circle drawing
- Moon sphere position was never computed from orbitRadius

### Fix (data layer, TDD)
1. Added `LOCAL_SCENE_SCALE = 50,000` export (matching renderer's km→scene conversion)
2. Compute moon position at 45° on orbit: `x = (orbitRadius/50000) * cos(π/4)`, same for y
3. Enceladus: 238,020 km → ~4.76 scene units from Saturn
4. Titania: 436,300 km → ~8.73 scene units from Uranus

### Tests added (6 new)
- `orbital-3d-viewer-data.test.ts`: Enceladus not at Saturn position, Enceladus at correct distance (×2 scenes)
- `orbital-3d-viewer-data.test.ts`: Titania not at Uranus position, Titania at correct distance (×2 scenes)
- `orbital-3d-viewer.test.ts`: Enceladus not at Saturn position (real data)
- `orbital-3d-viewer.test.ts`: Titania not at Uranus position (real data)

### Files changed
- `ts/src/orbital-3d-viewer-data.ts` — export LOCAL_SCENE_SCALE, compute moon positions
- `ts/src/orbital-3d-viewer-data.test.ts` — 4 new tests (24→28)
- `ts/src/orbital-3d-viewer.test.ts` — 2 new tests (41→43)
- `ts/examples/orbital-3d.html` — matching fix for example page

## Impact
- Stats: 4,021 TS tests
- Human directive phase 29 item (4) resolved
