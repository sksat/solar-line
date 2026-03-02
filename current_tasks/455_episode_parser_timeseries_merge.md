# Task 455: Fix Episode Parser to Merge Multiple timeseries-charts Blocks

## Status: **DONE**

## Summary

The episode MDX parser (`episode-mdx-parser.ts`) overwrites `timeSeriesCharts` when encountering multiple `timeseries-charts:` fenced blocks — later blocks silently replace earlier ones. This is error-prone and was encountered in Task 454 when adding navigation error charts to EP03.

The fix is to merge (concatenate) charts from all blocks rather than overwriting.

## Impact

- Currently, all episodes must put all timeseries charts in a single block
- This makes adding charts to specific analysis sections awkward — charts must be defined far from the prose that references them
- The summary parser (`mdx-parser.ts`) handles `timeseries:` with single-chart blocks, which is more flexible

## Plan

1. Modify `episode-mdx-parser.ts` to append rather than overwrite for `timeseries-charts`
2. Add test verifying multiple blocks are merged
3. Consider doing the same for `diagrams` and `glossary` if they have the same issue
