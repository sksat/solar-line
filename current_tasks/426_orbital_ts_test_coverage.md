# Task 426: Add Tests for Untested orbital.ts Functions

## Status: **DONE**

## Summary

`orbital.ts` exports 8 functions but only 2 have tests (`visViva`, `hohmannTransferDv`). Add tests for the remaining 6 functions: `escapeVelocity`, `circularVelocity`, `hyperbolicExcess`, `orbitalPeriod`, `brachistochroneAccel`, `brachistochroneDeltaV`. All are pure math with well-known reference values.

## Rationale
- Core orbital mechanics module used throughout the project
- 75% of exports lack tests
- All functions have known reference values from NASA/textbooks for validation
