# Task 409: Fix Summary Chart Validation to Check Section-Level Data

## Status: **DONE**

## Summary

Summary report time-series and bar chart validation tests read from top-level `report.timeSeriesCharts` / `report.barCharts`, which are always empty. All 12 time-series charts and 19 bar charts live inside `section.timeSeriesCharts` / `section.barChart`. Fix the existing test and add bar chart validation.

## Rationale
- Task 402's summary time-series chart integrity test generates ZERO test cases (silently passes)
- 12 time-series charts and 19 bar charts have no data integrity validation
- CLAUDE.md: "Article content TDD" — content tests must actually validate data
