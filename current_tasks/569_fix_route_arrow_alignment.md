# Task 569: Fix route arrows misalignment with spacecraft movement

## Status: DONE

## Summary

Transfer arc endpoints were using planet positions at the mission epoch (day 0)
for all transfers, instead of the actual departure/arrival times. This caused
arcs to point at where planets were at mission start, not where they actually
were when the ship departed/arrived.

### Root cause
- `transferArcs` were built from `planets[]` array which contains epoch positions
- Should use `planetPositionAtTime(orbit, dayOffset)` with actual JD offsets

### Fix
- Moved timeline orbit construction before transfer arc construction
- Transfer arc endpoints now computed using `planetPositionAtTime()` with
  correct day offsets (departure.jd - firstJd, arrival.jd - firstJd)
- Applied fix in all 3 code paths: data layer, inline template, standalone HTML

### Tests added (1 new)
- `orbital-3d-viewer-data.test.ts`: verifies arc endpoints match planet
  positions at departure/arrival times (100-day offset produces visible shift)

### Files changed
- `ts/src/orbital-3d-viewer-data.ts` — time-correct arc endpoint computation
- `ts/src/orbital-3d-viewer-data.test.ts` — 1 new test
- `ts/src/templates.ts` — inline viewer arc fix
- `ts/examples/orbital-3d.html` — standalone viewer arc fix

## Impact
- Human directive phase 30 item (4) addressed
