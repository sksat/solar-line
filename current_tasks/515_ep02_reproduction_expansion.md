# Task 515: EP02 Reproduction Test Expansion

## Status: DONE

## Summary

Expand EP02 reproduction tests to cover untested calc JSON sections: brachistochrone30d, brachistochrone90d, damagedThrust (4 scenarios), and additionalDvNeeded.

## Tests to Add

### EP02 brachistochrone 30-day and 90-day (3 tests)
- 30d closest: accel 0.390 m/s², ΔV 1011 km/s
- 90d closest: accel 0.043 m/s², ΔV 337 km/s
- Same distances used across all brachistochrone timeframes

### EP02 damaged thrust scenarios (3 tests)
- 4 scenarios: 100%, 50%, 25%, trim-only (1%)
- Full thrust: 3.28 days closest, 50%: 4.64 days
- Trim-only: 32.8 days (1% thrust, consistent with trim-thrust model)

### EP02 additional ΔV needed (1 test)
- Naturally reaches Saturn (hyperbolic), no additional ΔV needed

## Impact

Fills remaining EP02 calc JSON gaps. EP02 currently has 8 describe blocks.
