# Task 241: Add Data Validation Tests for Margin Gauges

## Status: DONE

## Description

Add report-data-validation tests to ensure all margin gauge data across reports is structurally valid and internally consistent. This catches data quality issues like negative values, missing units, or duplicate IDs.

## Tests Added (6 tests in report-data-validation.test.ts)

- ✅ Has margin gauges across reports (at least 5)
- ✅ All margin gauge IDs are unique across the site
- ✅ All items have positive actual and limit values
- ✅ All items have non-empty labels and units
- ✅ All gauges have non-empty title and at least 1 item
- ✅ Cross-report consistency: EP05 nozzle margin matches cross-episode gauge

## Stats

- TS tests: 1922 → 1928 (+6)
- All 1928 tests pass
