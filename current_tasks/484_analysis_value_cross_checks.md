# Task 484: Add Analysis-Derived Value Cross-Checks to EP02-EP04

## Status: DONE

## Summary

EP01 and EP05 have `assertContainsApproxValue` cross-checks that verify report prose matches analysis function outputs. EP02-EP04 only use basic string matching without `analyzeEpisode*()` cross-checks for key derived values.

Add analysis-derived cross-checks to EP02-EP04 to catch report-analysis drift:
- EP02: escape velocity, Saturn capture ΔV, radiation shield budget
- EP03: navigation crisis accuracy, mass boundary, Hohmann baseline
- EP04: plasmoid perturbation, fleet timeline values

## Plan

1. Identify key analysis values from `analyzeEpisode2()`, `3()`, `4()` that should be cross-checked
2. Add tests using `assertContainsApproxValue` to verify these values appear in reports
3. Verify all tests pass
4. Commit

## Impact

- Prevents silent report-analysis drift for critical values in 3 episodes
- Strengthens the "analysis → report" data integrity pipeline
