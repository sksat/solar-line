# Task 425: Add Edge Case Tests for dag-task-sync

## Status: **DONE**

## Summary

Add comprehensive edge case tests for `parseTaskFile()` and `syncTasksIntoDag()` in `dag-task-sync.ts`. Current tests cover basic cases but miss: IN_PROGRESS variant spelling, title fallback from filename, bold-wrapped status, second-pass dependency wiring for tasks added in the same run, cycle-skip behavior, title update of existing nodes, duplicate dependency handling, and multi-episode tag extraction.

## Rationale
- `dag-task-sync.ts` has 2 exported functions with partial test coverage
- The second-pass dependency wiring logic (lines 125-143) is complex and untested
- Cycle-skip behavior in the try/catch block is untested
- Edge cases in status parsing (bold markers, IN_PROGRESS spelling) are untested
