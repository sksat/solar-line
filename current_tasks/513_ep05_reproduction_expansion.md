# Task 513: EP05 Reproduction Test Expansion

## Status: DONE

## Summary

Expand EP05 reproduction tests to cover untested calc JSON sections: earthApproach (orbital mechanics), burnBudget thermal analysis, missing brachistochroneByMass scenarios (1,000t and 3,929t), and nozzle seriesMargins. EP05 has the most untested fields of any episode.

## Tests to Add

### EP05 Earth approach analysis (4 tests)
- Hohmann arrival velocity
- Brachistochrone arrival velocity
- LEO/Moon orbit parameters
- Earth escape velocities

### EP05 burn budget thermal analysis (2 tests)
- Initial/final thermal margins
- Thermal risk assessment

### EP05 missing brachistochrone mass scenarios (2 tests)
- 1,000t scenario
- 3,929t scenario

### EP05 nozzle seriesMargins (2 tests)
- Margin values for EP02, EP03, EP05
- Sensitivity: 5% and 3% increase scenarios

## Impact

Fills the largest gaps in EP05 reproduction coverage. Catches drift in Earth approach and thermal analysis.
