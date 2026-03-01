# Task 346: Infrastructure Report Visualization

## Status: DONE

## Description
Add visual components to the infrastructure summary report — the only summary report currently without charts. Add bar charts showing governance jurisdiction scope (AU range) and beacon shutdown cascading impact, making the structural asymmetry between Inner/Outer Sphere visually clear.

## Changes
- `reports/data/summary/infrastructure.md`: Add `chart:bar` directives
- `ts/src/article-content-validation.test.ts`: Add infrastructure chart validation tests
- E2E test for chart rendering on infrastructure page

## Notes
All 8 other summary reports already have visual components. This completes the set.
Stats refresh folded into this task per human directive.
