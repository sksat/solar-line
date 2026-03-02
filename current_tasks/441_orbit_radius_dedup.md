# Task 441: Deduplicate ORBIT_RADIUS Constants

## Status: **DONE**

## Summary

`mission-timeline.ts` and `relativistic-analysis.ts` duplicate orbit radius values (Mars 227,939,200, Jupiter 778,570,000, etc.) that are already exported from `orbital.ts` as `ORBIT_RADIUS.MARS`, `ORBIT_RADIUS.JUPITER`, etc. Replace with imports.

## Files to Change

1. `mission-timeline.ts` — BODY_AU uses inline km values ÷ AU_KM, replace with ORBIT_RADIUS / AU_KM
2. `relativistic-analysis.ts` — inline orbit radii in distance calculations
