# Task 350: Mission Timeline Data Consistency Validation

## Status: DONE

## Description
The cross-episode report (cross-episode.md) has 4 hardcoded timeseries charts (distance, ΔV, nozzle, radiation) in `timeseries:` code fences, while `mission-timeline.ts` generates the same data programmatically. There's no validation ensuring these stay in sync. Add article content validation tests that compare the hardcoded report data against the computed values from mission-timeline.ts, ensuring drift is detected.

## Scope
1. Add validation tests in article-content-validation.test.ts comparing timeseries chart IDs in cross-episode.md against buildAllMissionTimelineCharts()
2. Verify key data points (EP boundaries, peak values, endpoint values) match between report and computed data
3. Commit dag_values.json (untracked cross-validation test data)
4. Stats refresh folded in

## Dependencies
- mission-timeline.ts (existing)
- cross-episode.md timeseries fences (existing)
