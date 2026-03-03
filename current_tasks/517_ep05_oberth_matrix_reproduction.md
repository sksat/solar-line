# Task 517: EP05 Oberth Efficiency Matrix Reproduction Tests

## Status: DONE

## Summary

Add reproduction tests for the EP05 Oberth effect efficiency matrix (5 radii × 5 burn ΔV). Currently only `bestCaseVelocityEfficiencyPercent` is tested. The matrix contains 25 physically computed efficiency values that should be pinned to catch drift.

## Tests to Add

### Matrix structure (2 tests)
- 5 radii from 1 RJ to 10 RJ
- Each radius has 5 burn scenarios (10, 30, 50, 100, 200 km/s)

### Key physics values (3 tests)
- Best case: 1 RJ, 10 km/s burn → 0.078% efficiency
- Worst case: 10 RJ, 200 km/s burn → 0.0069% efficiency
- Efficiency decreases with higher periapsis radius (weaker Oberth)

### Energy efficiency (1 test)
- energyEfficiencyPercent = 0.0774%

## Impact

Pins the Oberth effect analysis matrix. This analysis supports the EP05 conclusion that Jupiter flyby saves +3% ΔV but the mechanism is mission-level-composite, not classical Oberth.
