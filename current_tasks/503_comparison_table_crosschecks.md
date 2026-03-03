# Task 503: Cross-Episode Comparison Table → Calc JSON Cross-Checks

## Status: DONE

## Summary

Added 9 cross-checks verifying that the Hohmann and Brachistochrone ΔV values in the cross-episode comparison table match per-episode calculation JSON outputs.

## Tests Added

### Hohmann ΔV (4 tests)
- EP01: 10.15 km/s matches calc JSON
- EP03: 2.74 km/s matches calc JSON
- EP04: 15.94 km/s matches calc JSON
- EP05: 15.94 km/s matches calc JSON
- (EP02 excluded — trim-thrust, no standard Hohmann baseline in table)

### Brachistochrone ΔV (4 tests)
- EP01: 8,497 km/s from brachistochrone72h[0]
- EP03: 11,165 km/s from brachistochrone[0]
- EP04: 1,202 km/s from brachistochrone[0] (48,000t @6.37 MN)
- EP05: 15,207 km/s from brachistochroneByMass[0] (300t)

### Bar chart (1 test)
- Brachistochrone ΔV bar chart values match table values

## Impact

Catches drift between the cross-episode comparison table (manually written prose) and the per-episode calculations (automated). If a recalculation changes a Hohmann or Brachistochrone value, the test will flag the table as stale.
