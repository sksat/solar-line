# Task 228: Fix EP03 mass boundary rounding (452 → 452.5t)

## Status: DONE

## Description

Task 207 established the canonical EP03 mass boundary as 452.5t (from computed value 452.4988t), but several files still used the rounded 452t. Fixed all remaining instances for consistency.

## Files
- `ts/src/ship-kestrel-analysis.ts` — 2 instances (table values)
- `reports/data/episodes/ep03.md` — 3 instances (source label, boundary condition, scenario label)
- `reports/data/episodes/ep01.md` — 2 instances (cross-episode reference)
- `reports/data/calculations/ep03_onscreen_crossref.json` — 1 instance
- `reports/data/summary/tech-overview.md` — task count 222→227
