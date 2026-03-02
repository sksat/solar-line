# Task 466: Add Charts to Communications Summary Report

## Status: DONE

## Summary

The communications summary report has only 1 bar chart + 1 timeseries — far fewer than other summaries like cross-episode (6 charts). Add 2 charts:

1. **Beacon reliability degradation** (EP01→EP05): Progressive failure from 100% → 99.8% → degraded → 0% (UNAVAILABLE). Shows the escalating navigation crisis across the series.

2. **FSOC data rate vs distance**: DSOC at 0.2 AU (267 Mbps) vs 1.5 AU (25 Mbps) vs deep-space scaling. Demonstrates why optical comms technology featured in the series is realistic.

## Plan

1. Write content validation tests (TDD red)
2. Add 2 bar charts to communications.md
3. Verify tests pass (TDD green)
4. Commit

## Impact

- Brings communications.md from 2 to 4 visualizations
- Makes the beacon degradation narrative visually compelling
- Follows "more figures are better than fewer"
