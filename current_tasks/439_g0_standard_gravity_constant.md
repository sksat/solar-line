# Task 439: Export G0_MS2 Standard Gravity Constant

## Status: **DONE**

## Summary

The literal `9.80665` (standard gravity in m/s²) appears ~17 times across all 5 episode analysis files. `kestrel.ts` already uses it internally but does not export it. Export `G0_MS2` from `kestrel.ts` and replace all analysis-file occurrences.

## Files to Change

1. `ts/src/kestrel.ts` — add `export const G0_MS2 = 9.80665;`
2. `ts/src/ep01-analysis.ts` — replace ~6 occurrences
3. `ts/src/ep02-analysis.ts` — replace ~6 occurrences
4. `ts/src/ep03-analysis.ts` — replace ~3 occurrences
5. `ts/src/ep04-analysis.ts` — replace ~3 occurrences
6. `ts/src/ep05-analysis.ts` — replace ~1 occurrence
