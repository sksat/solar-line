# Task 432: Extract and Test deduplicateRollingText from extract-dialogue.ts

## Status: **DONE**

## Summary

Extract `deduplicateRollingText` from `extract-dialogue.ts` (CLI script with bare `main()` call) into `dialogue-extraction.ts` (already testable module) and add comprehensive tests. This is core subtitle processing logic for handling YouTube auto-generated rolling subtitle deduplication.

## Rationale
- Core text processing function with edge-case-prone logic (multi-line rolling text detection)
- Currently untestable because it's in a script module that executes on import
- `dialogue-extraction.ts` already exports functions and has tests
