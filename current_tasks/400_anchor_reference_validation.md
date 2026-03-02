# Task 400: Add Anchor Reference Validation Test

## Status: **IN PROGRESS**

## Summary

Tasks 398-399 fixed broken anchor references. Add automated validation that verifies anchor references in markdown links (#section-id) match actual heading IDs produced by slugify. This prevents anchor mismatches from recurring.

## Rationale
- Anchor mismatches silently fail (page loads but doesn't scroll to target)
- 6 files had the same broken anchor pattern — systematic validation prevents recurrence
- Complements the link validation from Task 397

## Implementation
1. For each markdown link with #anchor, verify the anchor matches slugify output of a heading in the target file
2. Focus on cross-file anchor references (within same file is harder to validate statically)
