# Task 556: Add animation to Saturn/Uranus local 3D scenes

## Status: DONE

## Summary

Added timeline animation data to Saturn and Uranus local 3D scenes. Previously only the
full-route scene had animation. Now moons (Enceladus, Titania) orbit their parent planets
and the ship approach arc is animated.

### Changes
1. Added `MOON_PERIODS_DAYS` constants (Enceladus: 1.37d, Titania: 8.71d)
2. `prepareSaturnScene` now returns timeline with Enceladus orbit (3 orbital periods)
3. `prepareUranusScene` now returns timeline with Titania orbit (3 orbital periods)
4. Renderer `loadTimeline` handles local scene transfer arcs via `_sceneTransferArcs`
5. Example HTML: timeline controls work for all scenes (was hardcoded to full-route)

### Tests added/modified (5 changes)
- `orbital-3d-viewer.test.ts`: replaced 2 "no timeline" tests with 3 tests checking local timelines
- `orbital-3d-viewer-data.test.ts`: 2 new tests for Saturn/Uranus timeline orbit data

### Files changed
- `ts/src/orbital-3d-viewer-data.ts` — MOON_PERIODS_DAYS, timeline in Saturn/Uranus scenes
- `ts/src/orbital-3d-viewer-data.test.ts` — 2 new tests (31→33)
- `ts/src/orbital-3d-viewer.test.ts` — 3 new tests replacing 2 old (45→46)
- `ts/src/orbital-3d-viewer.js` — _sceneTransferArcs, local scene transfer curve fallback
- `ts/examples/orbital-3d.html` — timeline data for local scenes, activeTimeline tracking

## Impact
- Stats: 4,029 TS tests
- Human directive phase 29 item (1) addressed: all scenes now have animation
