# Task 579: Fix 3D Orbital Insertion — Planet Initial Angles at Common Epoch

## Status: **DONE**

## Description

Human directive phase 32: "3D 可視化において、周回軌道などの正しい目的地に投入される計算になっていない？TDD で修正"

**Root cause**: Each planet's `initialAngle` is set from its own event JD (departure/arrival),
not from a common mission-start epoch. This means at day 0, planets are at wrong positions
(Earth is off by ~122°). The orbital animation clock propagates from these wrong initial
positions, so arrival alignment is broken.

**Fix**: Compute all planet ecliptic longitudes at the **mission start JD** (Mars departure),
then let `meanMotionPerDay` propagation naturally bring each planet to the correct position
at its departure/arrival day.

## Plan (TDD)

1. Write test: at each transfer's arrival day, `planetPositionAtTime(toOrbit, arrDay)`
   should place the planet at the correct ecliptic longitude (from 3d_orbital_analysis.json)
2. Write test: at day 0, all planets should be at their mission-start positions
3. Fix `prepareFullRouteScene()` to compute `initialAngle` from mission-start JD
4. Update `orbital-3d-analysis.ts` to also output planet longitudes at mission start
5. Regenerate `3d_orbital_analysis.json`

## Files
- `ts/src/orbital-3d-analysis.ts` — add mission-start longitudes
- `ts/src/orbital-3d-analysis.test.ts` — test data presence
- `ts/src/orbital-3d-viewer-data.ts` — fix initialAngle computation
- `ts/src/orbital-3d-viewer-data.test.ts` — TDD arrival alignment tests
- `reports/data/calculations/3d_orbital_analysis.json` — regenerate
