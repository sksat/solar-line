# Task 623: Calculator Numeric Verification E2E Tests

Status: DONE

## Problem
The calculator E2E tests only verify that results are "not empty" (not "—"). No test checks that the actual numeric values are correct. A bug in the calculation logic (e.g., wrong formula, unit conversion error) would go undetected.

## Solution
Add E2E tests that:
1. Load the calculator with known EP01 default values (3.68 AU, 48000 t, 72 h, 9.8 MN)
2. Verify the required acceleration, ΔV, and verdict match expected values
3. Change inputs to a custom value and verify recalculation
4. Test preset button functionality produces expected numeric results

## Files to Modify
- `ts/e2e/reports.spec.ts` — Add numeric verification tests to the calculator describe block
