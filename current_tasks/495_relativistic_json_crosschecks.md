# Task 495: Relativistic Effects JSON → Report Cross-Checks

## Status: DONE

## Summary

Added cross-checks validating that `relativistic_effects.json` calculation values are properly cited in episode reports and the cross-episode summary.

## Changes

- Added `relativistic_effects.json → report cross-checks` describe block to article-content-validation.test.ts
- 12 new tests: peak velocity and β% for each episode (EP01-05), plus max β% and max γ in cross-episode report
- Used primary (first) transfer per episode via Map deduplication to avoid false failures from duplicate transfers (EP01 has both closest and mid-distance scenarios)
- Uses `classicalPeakVelocityKms` (not relativistic-corrected) since reports cite classical values

## Impact

- Catches drift between relativistic calculations JSON and episode/summary report prose
- Consistent with analysis-derived cross-check pattern used across all reports
