# Task 352: Table Readability — Responsive Horizontal Scroll

## Status: DONE

## Description
Tables across reports were too wide and hard to read, especially on narrower screens.
Added responsive horizontal scrolling (`overflow-x: auto`) to all table types.

## Changes
1. **Markdown tables** (`renderMarkdownTable`): Wrapped output in `<div class="table-wrap">` with `overflow-x: auto`
2. **`.table-wrap` CSS**: Added styling for bare markdown tables (borders, padding, font-size, header styling)
3. **Named table wrappers**: Added `<div class="table-wrap">` around:
   - `renderComparisonTable()` output
   - Speaker registry tables (transcription pages)
   - Transcription index table
   - Task dashboard table
   - ADR index table
   - Ideas index table
4. **`renderCustomComparisonTable()`**: Added `overflow-x: auto` to existing div wrapper
5. **Tab panels**: Added `overflow-x: auto` to `.tab-panel` CSS for transcription tab content tables
6. **Mobile**: Added responsive font-size override for `.table-wrap` tables at ≤600px

## Testing
- 2314 TS unit tests: all pass
- 242 E2E tests: all pass
- TypeScript typecheck: clean
- Build: successful
