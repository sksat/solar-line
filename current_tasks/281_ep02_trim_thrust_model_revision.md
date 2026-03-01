# Task 281: EP02 Trim-Thrust Model Revision — Arrival Velocity Consistency

## Status: DONE

## Summary

Resolved the EP02 v∞ inconsistency by implementing a two-phase (accel+decel) trim-thrust model.

## Problem

The prograde-only model (3 days at 98 kN) gave ΔV = 84.7 km/s and v∞ ≈ 90 km/s at Saturn — incompatible with the 0.61 km/s capture ΔV used in the analysis.

## Solution

Added `twoPhaseAnalysis()` and `arrivalVelocityConsistencyAnalysis()` to ep02-analysis.ts:
- Two-phase RK4 simulation: outward thrust → coast → retrograde deceleration → Saturn arrival
- Key finding: balanced 1.5d+1.5d gives 166 days transit, v∞ = 10.5 km/s (capture ΔV = 2.9 km/s)
- Extended 3d+3d gives 107 days transit, v∞ = 10.7 km/s (capture ΔV = 3.0 km/s)
- At Isp = 10⁶ s, propellant is not the constraint (<2% for all scenarios); thrust duration is

## Changes

- `ts/src/ep02-analysis.ts`: Added TwoPhaseResult interface, simulateTwoPhaseTransfer(), twoPhaseAnalysis(), arrivalVelocityConsistencyAnalysis(); added arrivalConsistency to analyzeEpisode2()
- `ts/src/ep02-analysis.test.ts`: +8 tests (6 new arrival velocity tests + 2 integration)
- `reports/data/episodes/ep02.md`: Replaced "future investigation" note with resolved analysis including comparison table
- `reports/data/summary/science-accuracy.md`: Updated v∞ issue from "未解決" to "解決済み"
- `ts/src/article-content-validation.test.ts`: +2 tests (EP02 two-phase model, science-accuracy resolution)
- `ideas/trim_thrust_arrival_velocity_consistency.md`: Status → RESOLVED

## Test Results

- 2102 TS tests pass (was 2094, +8 new)
- TypeScript typecheck clean
