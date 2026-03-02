# Task 428: Add brachistochrone_time to Rust Core and WASM Bridge

## Status: **DONE**

## Summary

Added `brachistochrone_time(distance, accel) → seconds` to `orbits.rs` and the WASM bridge — the inverse of `brachistochrone_accel`. This completes the brachistochrone function set across all three layers: Rust core, WASM bridge, and TypeScript (Task 427). Added 3 tests (2 in core, 1 in WASM).

## Rationale
- Rust had brachistochrone_accel, dv, max_distance but not time (the fourth inverse)
- TS version added in Task 427 — Rust should match
- Calculator page and analysis code may need to compute transfer times from acceleration
