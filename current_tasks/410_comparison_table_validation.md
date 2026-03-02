# Task 410: Add Comparison Table Data Integrity Validation

## Status: **DONE**

## Summary

Summary reports contain 18 comparison tables (15 standard ComparisonTable + 3 custom) with no data integrity tests. Add validation for row-column consistency, non-empty data, and caption presence.

## Rationale
- 18 tables across 5 summary reports have zero validation coverage
- ComparisonTable rows have `values: Record<number, string>` that should match `episodes: number[]`
- Custom tables have headers[] that should match each row's values[] length
- CLAUDE.md: "Article content TDD" — all report data structures need validation
