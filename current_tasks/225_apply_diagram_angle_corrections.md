# Task 225: Apply diagram angle corrections for EP04/EP05

## Status: DONE

## Description

Now that Task 224 added MDX episode support to `update-diagram-angles`, run the script to sync EP04 and EP05 planet orbit positions with the computed ephemeris timeline.

## Changes

1. **EP04 diagram angles**: All 5 planet orbits updated to match computed positions at EP04 departure epoch (2241-12-17). Departure/arrival burn markers updated accordingly.

2. **EP05 diagram angles**: All 5 planet orbits updated across 3 diagrams (direct brachistochrone, composite flyby, direct nozzle-failure). Departure/arrival/flyby burn markers updated.

3. **EP05 Oberth burn fix**: The "Oberth加速（+3%）" burn at Jupiter wasn't updated by the script (intermediate planet safety), so it was manually corrected to match Jupiter's new orbit angle (3.6104→3.1254).

4. **Cross-episode burn script fix**: `updateCrossEpisodeDiagram()` now snaps burn markers to the orbit's static angle instead of computing from the actual departure JD. This is correct because orbits have `meanMotion` for animation — the animation handles the temporal offset, and the static burn marker should match the orbit's t=0 position.

## Files
- `reports/data/episodes/ep04.md` — orbit angles + burn markers
- `reports/data/episodes/ep05.md` — orbit angles + burn markers
- `ts/src/update-diagram-angles.ts` — cross-episode burn snapping fix
