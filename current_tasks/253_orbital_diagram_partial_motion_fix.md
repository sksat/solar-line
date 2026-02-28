# Task 253: Fix Orbital Diagram Partial Celestial Body Motion

## Status: DONE

## Description

Human directive: In orbital transfer diagrams, some celestial bodies move during animation while others remain static. This looks unnatural. Fixed with TDD approach.

## Root Cause

Three diagrams had real planets with `angle` set but missing `meanMotion`:
- **ep04-diagram-01**: Mars (1.059e-7) and Jupiter (1.678e-8) were missing
- **ep05-diagram-01**: Mars, Jupiter, Saturn (6.761e-9), Uranus (2.37e-9) — 4 of 5 planets missing
- **ep05-diagram-03**: Uranus (2.37e-9) was missing

Reference/marker points (approach-point, escape-point, etc.) intentionally lack meanMotion.

## Changes

- Added TDD test in `report-data-validation.test.ts`: validates all animated diagrams have consistent meanMotion for real celestial bodies
- Added meanMotion to 7 orbit entries across ep04.md and ep05.md
- Test distinguishes real bodies from reference markers via REFERENCE_POINT_IDS set

## Stats
- TS tests: 1,988 → 2,003 (+15 animated diagram consistency checks)
- All 2,565 tests pass (0 failures)
