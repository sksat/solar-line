# Task 222: Fix incorrect timeline dates in EP03, EP05, and cross-episode table

## Status: DONE

## Problem

Several reports contain incorrect dates that don't match the computed timeline:

### Computed timeline (from `computeTimeline()` anchored at 2240):
- EP01: 2241-09-05 → 2241-09-08 ✅
- EP02: 2241-09-11 → 2241-12-07 ✅
- EP03: 2241-12-09 → 2241-12-15
- EP04: 2241-12-17 → 2242-01-07
- EP05: same as EP04 (departure = EP03 arrival + 2d)

### Wrong dates found:
1. **ep03.md** epochAnnotation: `2242-12-12～2242-12-17` → should be `2241-12-09～2241-12-15`
2. **ep05.md** epochAnnotation (2 instances): `2242-12-19～2242-12-28` → should be `2241-12-17～2242-01-07`
3. **cross-episode.md** table:episode rows for EP3/EP4/EP5: wrong year (2242 instead of 2241) and wrong specific dates

### Root cause
When episodes were migrated from JSON to MDX (Tasks 186-187), the `update-diagram-angles` script began skipping MDX files. The wrong epoch annotations were never corrected. The table dates in cross-episode.md are manually maintained and were likely a copy error.

## Plan
1. Fix ep03.md epochAnnotation
2. Fix ep05.md epochAnnotation (2 instances)
3. Fix cross-episode.md table:episode dates for EP3/EP4/EP5
4. Add a consistency test that validates report epoch dates against computed timeline
5. All tests pass

## Files
- `reports/data/episodes/ep03.md`
- `reports/data/episodes/ep05.md`
- `reports/data/summary/cross-episode.md`
- `ts/src/report-data-validation.test.ts` (new test)
