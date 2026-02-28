# Task 207: Episode↔Summary Analysis Consistency Tests

## Status: DONE (completed 2026-02-28)

## Priority: HIGH

## Objective
Create automated tests that detect inconsistencies between per-episode analysis and summary reports.

## Problem
- `cross-episode-analysis.ts` uses hardcoded `EPISODE_SUMMARIES[]` that can drift from episode calculations
- EP03 mass boundary: summary says 452t, episode says 452.5t (precision loss)
- No CI check validates cross-report consistency
- When episode calculations change, summary reports silently become stale

## Scope
1. **Cross-validation test**: Compare `EPISODE_SUMMARIES[]` against `analyzeEpisodeX()` outputs
2. **MDX consistency check**: Parse episode MDX `computedDeltaV`, `maxFeasibleMassT` and verify against summary references
3. **Narrative value check**: Extract numerical claims from summary MDX prose and verify against source data
4. **Fix existing discrepancies**: EP03 massBoundaryT 452 → 452.5
5. **CI integration**: Run consistency checks as part of `npm test`

## Key Files
- `ts/src/cross-episode-analysis.ts` (hardcoded EPISODE_SUMMARIES[])
- `ts/src/cross-episode-analysis.test.ts` (existing structure tests)
- `ts/src/analysis-reproduction.test.ts` (per-episode pinned values)
- `reports/data/summary/cross-episode.md`
- `reports/data/summary/ship-kestrel.md`
- `reports/data/episodes/ep0[1-5].md`

## Dependencies
- Task 206 may change EP02 parameters that affect cross-episode consistency
