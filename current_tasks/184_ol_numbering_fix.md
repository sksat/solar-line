# Task 184: Fix OL numbering reset when blank lines separate list items

**Status:** DONE
**Created:** 2026-02-25
**Source:** Deferred issue from Task 180 final report review

## Problem

The `markdownToHtml()` function in `templates.ts` closes `<ol>` tags when it encounters a blank line. When markdown ordered lists have blank lines between items (common for long items), this creates multiple `<ol>` elements, each starting from 1.

Example in `cross-episode.md` (lines 1447-1453):
```
1. **First long item...**

2. **Second long item...**
```

Renders as two separate `<ol>` lists, both starting at 1, instead of one continuous list.

## Fix

Modify `markdownToHtml()` to look ahead on blank lines: if the next non-empty line is an ordered list item, don't close the current `<ol>`.

## Acceptance Criteria

- Ordered list items separated by blank lines render as a single `<ol>` with correct numbering
- Existing tests continue to pass
- New unit test covers this scenario
- E2E tests pass
