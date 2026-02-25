# Task 197: Fix 3D Orbital Analysis Dates and Data Provenance

Status: DONE
Claimed by: Claude Opus session

## Problem

Deferred issues from Task 196 systematic review:

1. **3D orbital analysis dates wrong**: Earth arrival in `3d_orbital_analysis.json` is 2242-02-10, but the story timeline ends 2242-12-28 (479 days). The 3D analysis uses only 158 days for the full journey — ~10.5 months too short.

2. **Plane-change fraction denominators wrong**: `orbital-3d-analysis.ts` uses `2 * transferVelocityKmS` as denominator for plane-change percentages, but these are approximate cruise velocities, not actual brachistochrone ΔV. Result: percentages are ~2x what they should be relative to total ΔV budget.

3. **EP03 moon comparison ΔV values have no provenance**: Values like Titania capture ΔV 0.37 km/s and orbit insertion 1.88 km/s appear in ep03.md but not in any calculation file. Need reproducible calculation script.

## Plan

1. Fix leg dates in `orbital-3d-analysis.ts` to match actual episode timeline
2. Fix plane-change fraction denominator to use actual brachistochrone ΔV
3. Add EP03 Uranian moon ΔV calculations to recalculate script
4. Regenerate `3d_orbital_analysis.json` and update cross-episode.md
5. Run all tests, verify CI

## References

- `reports/data/calculations/3d_orbital_analysis.json`
- `ts/src/orbital-3d-analysis.ts`
- `reports/data/summary/cross-episode.md`
- `reports/data/episodes/ep03.md`
- `reports/data/calculations/ep03_calculations.json`
