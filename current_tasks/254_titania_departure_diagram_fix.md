# Task 254: Fix Titania Departure Orbital Diagram

## Status: DONE

## Description

Human directive: The Titania departure orbital transfer diagram appears to show the ship falling onto Uranus's surface.

## Root Cause

In ep04-diagram-02, the escape transfer arc went from `titania` (435,910 km) **to** `uranus-surface` (25,559 km) — drawing the path inward toward Uranus. For an escape trajectory, the path should go outward.

EP05's equivalent diagram (ep05-diagram-04) was already correct, going from `titania` to `escape-point` at 638,975 km.

## Fix

- Added `escape-point` orbit at 638,975 km (matching EP05's diagram)
- Changed transfer's `toOrbitId` from `uranus-surface` to `escape-point`
- Added TDD test validating all escape transfers ("脱出") go outward (toOrbit.radius >= fromOrbit.radius)

## Stats
- TS tests: 2,003 → 2,006 (+3 escape direction tests)
- All 2,568 tests pass (0 failures)
