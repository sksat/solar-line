# Task 376: Mission-wide Propulsion G-force Timeline Chart

## Status: DONE

## Motivation

The cross-episode report has 5 mission-wide time-series charts (velocity, distance, ΔV, nozzle, radiation) but no propulsion G-force (acceleration) timeline, despite:
1. CLAUDE.md explicitly lists "推力プロファイル" as a priority time-series chart
2. The "居住G vs 推進G" separation is a major analytical theme
3. G-force varies dramatically: EP01 (3.34g) → EP02 (0g coast) → EP03 (2.21g) → EP04-05 (1.1-1.7g)

## Changes

1. **`mission-gforce-timeline` timeseries chart** in cross-episode.md:
   - 33 data points covering all 124 days with step transitions
   - EP01: 3.34g (299t, full thrust) — mission peak
   - EP02: 0.03g trim thrust (3 days) then 0g coast (84 days)
   - EP03: 2.21g (452t, full thrust)
   - EP04-05: 4 discrete burns at 1.67→1.39→1.11→1.53g (65% thrust, 389t, nozzle degradation visible)
   - Threshold lines: 1G (Earth surface), 3G (fighter pilot sustained reference)
   - Episode region shading consistent with other 5 charts
   - Updated closing paragraph: "4つ" → "5つ" + G-force commentary

2. **TDD tests** (7 new tests in `article-content-validation.test.ts`):
   - Chart presence (in "all 5 timeseries" check, updated from "all 4")
   - EP01 peak 3.34g
   - EP02 coast 0g
   - EP03 2.21g
   - EP05 Burn 1 1.67g
   - EP05 coast between burns 0g
   - 1G threshold reference

Total: 2,514 TS tests pass (+7 new), 243 E2E tests pass, site builds with 376 tasks.
