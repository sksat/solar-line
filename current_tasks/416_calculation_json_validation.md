# Task 416: Add Calculation JSON Structural Validation Tests

## Status: **DONE**

## Summary

The 14 calculation JSON files in `reports/data/calculations/` have no structural validation tests. Add tests verifying: required top-level keys exist, `_meta` fields are present, numeric values are finite and within plausible ranges, and per-episode calculation keys match expected schemas.

## Rationale
- Calculation files drive all numerical analysis — malformed data would silently corrupt reports
- `npm run recalculate` can overwrite these files — no test catches schema violations
- CLAUDE.md: "Reproducible numerical analysis" requires verified outputs
- Task 412 already validates calculation→report consistency; this validates the calculations themselves
