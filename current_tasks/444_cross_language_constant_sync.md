# Task 444: Sync TS and Rust Physics Constants

## Status: **DONE**

## Summary

Cross-language comparison found mismatches between TS (orbital.ts) and Rust (constants.rs):

1. **MU.JUPITER**: TS `1.26686534e8` vs Rust `1.266_865_349e8` (0.9 km³/s²)
2. **MU.SATURN**: TS `3.7931187e7` vs Rust `3.793_120_749e7` (20.49 km³/s²)
3. **EARTH radius**: TS `6_371` (mean) vs Rust `6_378.137` (equatorial)

Update TS to match the higher-precision Rust values (both sourced from JPL DE440/441).
Earth radius mismatch is a known difference (mean vs equatorial) — document it.
