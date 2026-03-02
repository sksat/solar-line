# Task 370: D-He³ Fusion Power Budget Analysis for Ship-Kestrel Report

## Status: DONE

## Motivation
The cross-episode analysis mentions jet power (48.1 TW at Isp=10⁶s) in passing, but the ship-kestrel report lacks a dedicated power budget analysis. Key questions:
1. What are the power requirements at each thrust regime (100% vs 65%)?
2. How does D-He³ fuel burn rate relate to the jet power?
3. What fraction of fusion output becomes waste heat?
4. Does the 65% thrust limitation (from cooling damage) make physical sense thermally?

## Changes
- `ts/src/fusion-power-budget.ts`: New analysis module with jet power, fusion power, waste heat, fuel burn rate, per-episode budget
- `ts/src/fusion-power-budget.test.ts`: +23 TDD unit tests covering all calculations
- `reports/data/summary/ship-kestrel.md`: Added "核融合出力収支: 48 TW エンジンの内訳" section with:
  - Per-episode power requirements table (100% → trim → 65%)
  - Bar chart comparing power states with world electricity reference line
  - Analysis of 65% thrust limitation as thermal constraint (waste heat 112→73 TW)
  - D-He³ fuel consumption analysis (~0.46 kg/s at 100%, ~119t per 72h burn)
- `ts/src/article-content-validation.test.ts`: +7 content validation tests
- `reports/data/summary/tech-overview.md`: Stats refresh (370 tasks, 3,055 tests)
- Total: +30 new tests, all 2,414 TS tests pass

## Key Findings
- **Jet power**: 48.1 TW at 100% thrust (2.6× world electricity), 31.2 TW at 65%
- **Fusion total output**: ~160 TW at η=0.30 (8.7× world electricity)
- **Waste heat**: 112 TW at 100% → 73 TW at 65% (35% reduction)
- **65% limitation is thermally consistent**: Cooling at 63% capacity + 65% output = waste heat within residual cooling capacity
- **Fuel consumption**: ~0.46 kg/s D-He³ at 100%, comparable to propellant mass flow (~1 kg/s) — consistent with direct-drive where fusion products are the propellant
