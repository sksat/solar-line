# Task 437: Replace Hardcoded Thrust Values in cross-episode-analysis.ts

## Status: **DONE**

## Summary

`cross-episode-analysis.ts` uses literal `9.8` and `6.37` for thrust values in `EPISODE_SUMMARIES` instead of referencing `THRUST_MN` and `DAMAGED_THRUST_MN` from `kestrel.ts`. Also fix similar literals in `ep01-analysis.ts` and `ep05-analysis.ts` for mass values.
