# Task 485: Add EP05 Analysis-Derived Cross-Checks

## Status: DONE

## Summary

EP05 article content validation uses only 1 analysis-derived cross-check (`nozzleLifespan.marginMinutes`). EP01-EP04 all have Hohmann baseline and other key values cross-checked via `assertContainsApproxValue`. EP05 is missing:

- Hohmann baseline (totalDvKms, transferTimeYears) — cross-checked for EP01-EP04 but not EP05
- Oberth effect: `threePercentBurnSavingMinutes` — the 99-min burn saving
- Earth approach: `dvCaptureLEOKms` — the 3.18 km/s value
- Brachistochrone by mass: 300t scenario peak velocity

## Plan

1. Add `assertContainsApproxValue` cross-checks for EP05 Hohmann, Oberth, earth approach, and brachistochrone values
2. Verify all tests pass
3. Commit

## Impact

- Completes analysis-derived cross-check coverage for all 5 episodes
- Catches report-analysis drift for EP05's key derived values
