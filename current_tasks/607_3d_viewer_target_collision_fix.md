# Task 607: 3D Viewer Target Body Collision Trajectory Fix

## Status: **DONE**

## Summary

Human directive: 土星→天王星接近軌道などがターゲット天体に直接突っ込むような軌道になっており、可視化上も突っ込んでいるように見える。

Transfer trajectories (especially Saturn→Uranus approach) appeared to collide directly with the target body because `offsetFromPlanet` used `PLANET_RADII` base values (Saturn: 0.35, Uranus: 0.25) instead of the actual rendered sphere radii in local scenes (Saturn: 0.5, Uranus: 0.4). For Uranus, the offset was 0.375 — inside the 0.4 sphere.

## Root Cause

`PLANET_RADII` stores base display radii, but local scene central bodies override these with larger values in `orbital-3d-viewer-data.ts`. The `offsetFromPlanet` function didn't know about these overrides, so arc endpoints could land inside the planet sphere.

## Fix

1. **`orbital-3d-viewer-data.ts`**: Added optional `explicitRadius` parameter to `offsetFromPlanet()` so callers can pass the actual rendered radius.
2. **`orbital-3d-viewer.js`**: Added `_planetDisplayRadii` map populated during scene build (from planet data), used by `offsetFromPlanet` to get the correct sphere radius. Falls back to mesh geometry, then PLANET_RADII.
3. **Tests**: Added 2 tests verifying explicit radius usage and that offset clears actual sphere radius for Saturn (0.5) and Uranus (0.4).

## Dependencies

- Task 584 (DONE) — parking orbit visualization
- Task 579 (DONE) — orbital insertion alignment

## Key Files

- `ts/src/orbital-3d-viewer.js` — collision offset fix (scene build populates `_planetDisplayRadii`)
- `ts/src/orbital-3d-viewer-data.ts` — `offsetFromPlanet` accepts explicit radius
- `ts/src/orbital-3d-viewer-data.test.ts` — 2 new tests
