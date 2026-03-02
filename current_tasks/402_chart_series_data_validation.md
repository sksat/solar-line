# Task 402: Add Chart Series Data Validation Tests

## Status: **DONE**

## Summary

Add unit tests validating TimeSeriesChart data integrity: x/y array length consistency, numeric value validity, x-axis monotonicity, and cross-series alignment. Complements existing yLow/yHigh validation.

## Rationale
- Chart rendering failures are user-visible and hard to debug
- uPlot assumes valid data structures; validation catches issues at data generation time
- Existing tests validate error bands but not core data shape invariants
