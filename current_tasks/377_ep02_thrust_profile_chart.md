# Task 377: Add Trim-Thrust Profile Chart to EP02

## Status: DONE

## Motivation

EP02 had only 1 timeseries chart (velocity profile), the fewest of any episode:
- EP01: 2 charts (mass-transit-time, velocity-profile)
- EP02: 1 chart (velocity-profile) ← gap
- EP03: 2 charts (velocity-profile, thrust-profile)
- EP04: 3 charts (radiation-dose, shield-life, thrust-comparison)
- EP05: 4 charts (velocity-profile, nozzle-life, thrust-profile, acceleration-evolution)

## Changes

1. **EP02 thrust profile chart** (`ep02-chart-thrust-profile`):
   - Shows 2-phase trim-thrust operation: 3d accel → ~101d coast → 3d decel (107 days total)
   - Primary series: 0.098 MN (1% of 9.8 MN) with ±10% error bands (0.088-0.108 MN)
   - Comparison series: accel-only model (3d+0d, dashed red) — shows the v∞ problem scenario
   - Annotations: phase labels for acceleration, coast, and deceleration
   - Threshold line: trim thrust reference level

2. **TDD tests** in `article-content-validation.test.ts`:
   - Chart presence test (ep02-chart-thrust-profile)
   - Thrust level verification (0.098 MN)
   - 2-phase vs accel-only model comparison

Total: +3 new content validation tests. All 2,522 TS tests pass, 398 Rust tests pass.
