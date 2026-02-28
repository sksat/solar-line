# Task 220: Analysis Reproduction Test Framework

**Status:** DONE
**Human directive:** Phase 21 addendum, item 26

## Problem

Per-episode analysis reproduction commands exist (`npm run recalculate`) but ship parameters were duplicated across 5 episode analysis files, 2 report modules, and 1 relativistic analysis module. Shared parameter extraction was needed for maintainability and consistency.

## What Was Already Done (pre-existing)

1. `npm run test:analyses` — 96 golden-file tests pinning all analysis outputs (Task 133)
2. `npm run recalculate` — per-episode analysis pipeline with `--episode N` filtering
3. CI integration — `npm test` already runs all `*.test.ts` including analysis reproduction tests
4. `analysis-reproduction.test.ts` — comprehensive per-transfer test coverage for all 5 episodes

## What This Task Added

### Shared ship constants module (`kestrel.ts`)
- Created `ts/src/kestrel.ts` as single source of truth for KESTREL ship parameters
- Core params: massKg, thrustN, peakThrustN, damagedThrustN, ispS, lengthM, engine, fuel
- Derived constants: EXHAUST_VELOCITY_KMS, THRUST_MN, NOMINAL_MASS_T, AU_KM
- All 5 episode analysis files now import from `kestrel.ts` instead of defining their own
- `cross-episode-analysis.ts` SHIP_SPECS derived from shared KESTREL
- `ship-kestrel-analysis.ts` KESTREL_SPECS derived from shared KESTREL
- `relativistic-analysis.ts` uses shared ISP, thrust, and AU constants

### Consistency tests (`kestrel.test.ts`)
- 10 tests verifying shared constants match expected values
- Cross-module consistency: all 5 episode exports match the shared base
- Report module consistency: SHIP_SPECS and KESTREL_SPECS derive from KESTREL
- Damaged thrust = 65% of normal thrust validation

## Files Changed
- `ts/src/kestrel.ts` — new shared constants module
- `ts/src/kestrel.test.ts` — new consistency tests (10 tests)
- `ts/src/ep01-analysis.ts` — import KESTREL_BASE from kestrel.ts, extend with cargoKg
- `ts/src/ep02-analysis.ts` — re-export KESTREL from kestrel.ts
- `ts/src/ep03-analysis.ts` — re-export KESTREL from kestrel.ts
- `ts/src/ep04-analysis.ts` — re-export KESTREL from kestrel.ts
- `ts/src/ep05-analysis.ts` — re-export KESTREL from kestrel.ts
- `ts/src/cross-episode-analysis.ts` — derive SHIP_SPECS from shared KESTREL
- `ts/src/ship-kestrel-analysis.ts` — derive KESTREL_SPECS from shared KESTREL
- `ts/src/relativistic-analysis.ts` — import from shared module

## Test Results
- 1810 TS tests pass (1800 existing + 10 new)
- 96 analysis reproduction tests unchanged and passing
- TypeScript typecheck clean
- Recalculate pipeline verified (dry-run)
