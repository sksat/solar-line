# Task 356: EP02 Jupiter Radiation Belt Quantitative Analysis

## Status: DONE

## Description

EP02 mentions "放射線シールドの残寿命42分" as a constraint on Jupiter escape, but the current analysis treated this qualitatively. This task adds a quantitative radiation dose model for the Jupiter magnetosphere transit.

## Results

### Key Finding: Shield survival requires active acceleration

| Scenario | Avg radial v | Transit time | Accumulated dose | Shield budget | Survives? |
|---|---|---|---|---|---|
| Passive escape | 7 km/s | 99.4 h | 0.310 krad | 0.043 krad | **NO** (7.2× over) |
| Brachistochrone | 60 km/s | 11.6 h | 0.036 krad | 0.043 krad | **YES** (84%) |
| Damaged (20 km/s) | 20 km/s | 34.8 h | 0.109 krad | 0.043 krad | **NO** (2.5× over) |
| High-latitude | 7 km/s | 99.4 h | 0.047 krad | 0.043 krad | **NO** (8% over) |

**Minimum survival velocity: ~50.4 km/s** (average radial component)

### Physical interpretation

"42分" = shield dose budget remaining / instantaneous dose rate at 15 RJ. As the ship moves outward, dose rate drops steeply (540× between Ganymede and Callisto), so the shield effectively "heals" — but only if the ship passes through the belt quickly enough. Passive coast takes too long.

### Codex consultation (gpt-5.2)

Consulted on model design. Key recommendations adopted:
- Piecewise power-law with analytical integration (closed-form, no numerical integrator)
- "42 min" = dose_budget / current_rate interpretation
- Geometry/variability multipliers (latitude, plasma sheet, storm)
- Magnetopause cutoff at 63 RJ

## Implementation

- **20 Rust tests** in `jupiter_radiation.rs` (all pass)
- **Piecewise power-law model** calibrated to Galileo DDD values
- **Analytical dose integration** per segment (no numerical quadrature)
- **TypeScript mirror** in `ep02-analysis.ts` for calculation output
- **EP02 report** new exploration `ep02-exploration-07`
- **Content validation test** for the new exploration

## Files
- `crates/solar-line-core/src/jupiter_radiation.rs` — radiation belt dose model (20 tests)
- `ts/src/ep02-analysis.ts` — TypeScript radiation analysis + calculation output
- `ts/src/article-content-validation.test.ts` — EP02 radiation content test
- `reports/data/episodes/ep02.md` — ep02-exploration-07 (radiation analysis)
- `reports/data/calculations/ep02_calculations.json` — jupiterRadiation section
