# Task 440: Deduplicate AU_KM Constant

## Status: **IN PROGRESS**

## Summary

`AU_KM = 149_597_870.7` is exported from `kestrel.ts` but several files define local copies or use the literal directly. Replace with imports from the single source of truth.

## Files to Change

1. `ephemeris.ts` — local `AU_KM`, import from kestrel
2. `orbital-3d-analysis.ts` — local `AU_KM`, import from kestrel
3. `timeline-analysis.ts` — local `AU_KM` + 5 inline literals, import from kestrel
4. `templates.ts` — browser JS `var KM_PER_AU = 149597870.7`, interpolate
