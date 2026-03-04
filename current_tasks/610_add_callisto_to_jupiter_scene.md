# Task 610: Add Callisto to Jupiter Capture 3D Scene

## Status: **DONE**

## Summary

Task 609 spec required all 4 Galilean moons (Io, Europa, Ganymede, Callisto) but the implementation only included 3. Add Callisto to complete the Jupiter system visualization.

## Acceptance Criteria

- Callisto added to `PLANET_COLORS`, `PLANET_RADII`, `MOON_PERIODS_DAYS` constants
- Callisto appears in `prepareJupiterCaptureScene()` planets, orbit circles, and timeline
- Callisto added to standalone viewer (`orbital-3d.html`) and inline viewer (`templates.ts`)
- Unit tests updated to verify 4 Galilean moons
- All existing tests continue to pass

## Dependencies

- Task 609 (DONE) — Jupiter capture scene

## Key Files

- `ts/src/orbital-3d-viewer-data.ts` — scene function + constants
- `ts/src/orbital-3d-viewer-data.test.ts` — unit tests
- `ts/examples/orbital-3d.html` — standalone viewer
- `ts/src/templates.ts` — inline viewer
