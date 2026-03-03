# Task 530: Strengthen Single-Assertion WASM Test Groups

## Status: DONE

## Summary

Several WASM test groups have only 1 assertion. Add a second test to the 3 highest-value groups to improve regression detection.

## Tests to Add

### brachistochrone_accel (1 new test)
- EP02 Saturn leg: ~1.28e9 km distance, 87 days — verify different scenario produces different accel

### Saturn ring crossing (2 new tests)
- crosses_ring_plane should be true for the straight-down approach test
- approach_angle should be ~90° for straight-down approach

### Hohmann window (1 new test)
- Window should be within Earth-Mars synodic period (~780 days)

## Impact

Converts 3 schema-only tests into behavior-validating tests.
