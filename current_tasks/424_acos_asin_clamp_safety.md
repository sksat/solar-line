# Task 424: Add acos/asin Input Clamping for Float Safety

## Status: **DONE**

## Summary

Audit and fix all `acos()`/`asin()` calls in the Rust crate to prevent NaN from floating-point precision errors. Added `.clamp(-1.0, 1.0)` guards before `acos`/`asin` in three locations: `orbital_3d.rs` (equatorial-ecliptic angle), `attitude.rs` (accuracy_to_pointing_error_rad), and `ephemeris.rs` (ecliptic latitude). The `orbital_3d.rs` approach-to-axis acos was already fixed in Task 422.

## Rationale
- Dot products of unit vectors can exceed [-1, 1] range due to floating-point error
- `acos`/`asin` of values outside [-1, 1] return NaN, causing silent data corruption
- Discovered via polar approach edge case test in Task 422
