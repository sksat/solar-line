# Task 518: EP05 Earth Capture Table Reproduction Tests

## Status: DONE

## Summary

Add reproduction tests for EP05 Earth capture analysis: escape velocities, GEO scenario, and additional capture table entries (vInf=1, 3, 5 for non-LEO targets). Currently only 4 entries tested of the full 15-entry table.

## Tests to Add

### Earth escape velocities (2 tests)
- LEO escape velocity = 10.851 km/s
- Moon orbit escape velocity = 1.440 km/s

### GEO scenario (1 test)
- GEO circular velocity = 3.075 km/s

### Additional capture table entries (3 tests)
- vInf=1: LEO capture ΔV
- vInf=5: all 3 targets
- Cross-check: capture ΔV increases monotonically with vInf

## Impact

Pins Earth capture physics. Catches drift in escape velocities and orbit insertion analysis.
