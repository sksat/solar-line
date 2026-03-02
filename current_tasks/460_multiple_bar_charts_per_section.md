# Task 460: Support Multiple Bar Charts Per Transfer Section

## Status: DONE

## Summary

The episode parser (`episode-mdx-parser.ts`) and `report-types.ts` only support a single `barChart` per transfer section. Adding a second bar chart to the same section (e.g., EP05 transfer-02 now has both "木星フライバイの必要性" and "深宇宙航法の位置精度比較") causes the first to be silently overwritten.

This is the same class of bug as Task 455 (timeseries-charts overwrite). Fix by converting `barChart?: BarChart` to `barCharts?: BarChart[]`.

## Impact

- EP05 E2E test failure: "EP05 has Jupiter flyby necessity bar chart (on detail page)" — the flyby bar chart was overwritten by the new navigation precision chart
- EP04 transfer-04 could also be affected if multiple bar charts are added to the same section

## Plan

1. Change `barChart?: BarChart` to `barCharts?: BarChart[]` in report-types.ts (both TransferAnalysis and SummarySection)
2. Update episode-mdx-parser.ts to collect array
3. Update templates.ts renderer to iterate over array
4. Update any tests that reference `barChart` (singular)
5. Verify E2E test passes
