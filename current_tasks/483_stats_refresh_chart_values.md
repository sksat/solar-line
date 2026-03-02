# Task 483: Extend stats-refresh to Update Chart Bar Values

## Status: IN_PROGRESS

## Summary

`npm run stats-refresh` updates the stats table and body text in tech-overview.md but NOT the `chart:bar` block values. This causes chart values to drift from actual counts (e.g., TS tests shows 3,612 in chart but actual is 3,625).

## Plan

1. Write TDD test verifying chart values match body text stats
2. Add `updateChartValues()` function to stats-refresh.ts
3. Verify all tests pass
4. Commit

## Impact

- Chart values stay synchronized with body text after every stats-refresh
- Eliminates manual chart value updates
