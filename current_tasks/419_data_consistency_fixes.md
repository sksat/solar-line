# Task 419: Fix Data Consistency Issues Found by Validation Tests

## Status: **DONE**

## Summary

Task 418 validation tests discovered data consistency issues:
1. EP02 `speakers.json` missing `guest-esper` speaker (present in dialogue file)
2. EP05 `onscreen_data.json` uses different schema (missing `schemaVersion`, different summary structure)

Fix these to align all data files with consistent schemas.

## Rationale
- Consistent schemas simplify parsing and reduce special-case handling
- Missing speaker definitions could cause rendering issues
- Data discovered by automated tests should be fixed systematically
