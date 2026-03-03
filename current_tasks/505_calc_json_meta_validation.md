# Task 505: Calc JSON _meta Validation for Pipeline-Generated Files

## Status: DONE

## Summary

Added 5 tests validating that all pipeline-generated calculation JSON files have proper `_meta` blocks with `reproductionCommand` and `generatedAt` timestamps.

## Tests Added

### _meta reproductionCommand (4 tests)
- relativistic_effects.json: references "npm run recalculate"
- 3d_orbital_analysis.json: references "npm run recalculate"
- transcription_accuracy.json: references "npm run recalculate"
- integrator_comparison.json: references "cargo test"

### generatedAt timestamps (1 test)
- All 3 TS pipeline-generated JSONs have ISO timestamp `generatedAt`

## Impact

Ensures the recalculate pipeline always stamps its output with metadata, making every calculation JSON traceable to its reproduction command.
