# Task 427: Add Brachistochrone Inverse Functions to orbital.ts

## Status: **DONE**

## Summary

Added `brachistochroneMaxDistance` and `brachistochroneTime` to `orbital.ts` — the inverse functions of `brachistochroneAccel`. These complete the brachistochrone API symmetry (the WASM bridge already had `brachistochrone_max_distance`). Added 7 tests including round-trip consistency checks.

## Rationale
- WASM bridge had `brachistochrone_max_distance` but TS side lacked it
- Calculator page falls back to JS when WASM unavailable — needs TS implementations
- Round-trip tests (accel → maxDistance → accel) verify mathematical consistency
