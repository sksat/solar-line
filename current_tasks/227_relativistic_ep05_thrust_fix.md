# Task 227: Fix EP05 relativistic analysis to use damaged thrust (65%)

## Status: DONE

## Problem

The relativistic analysis used full thrust (9.8 MN) for EP05's brachistochrone computation, giving β_max = 3.14%c and peak velocity 9431 km/s. However, EP05 operates with damaged engines at 65% thrust (6.37 MN). This caused a discrepancy with the EP05 episode analysis (7604 km/s = 2.54%c) and the cross-episode report text ("最大2.5%c").

## Changes

1. **Fix**: Use `KESTREL.damagedThrustN` (6.37 MN) instead of `KESTREL.thrustN` (9.8 MN) for EP05 scenario
2. **Result**: β_max corrected from 3.14%c → 2.54%c, cumulative dilation 174s → 156s
3. **Cross-episode heading**: "光速の1〜3%" → "光速の1〜2.5%"
4. **Test**: Added consistency assertion (EP05 peak < 8000 km/s, β < 3%c)
5. **Regenerated**: `relativistic_effects.json` with correct EP05 values

## Files
- `ts/src/relativistic-analysis.ts` — use damagedThrustN
- `ts/src/relativistic-analysis.test.ts` — consistency test + comment update
- `reports/data/calculations/relativistic_effects.json` — regenerated
- `reports/data/summary/cross-episode.md` — heading fix
