# Task 429: Add Tests for Untested build.ts Functions

## Status: **DONE**

## Summary

Add unit tests for `parseADRFile` and `resolveDialogueReferences` in `build.ts` — two exported functions with significant logic but zero test coverage.

## Rationale
- `parseADRFile` is pure parsing logic (ADR markdown → structured data) — highly testable
- `resolveDialogueReferences` resolves dialogue line IDs in reports, produces warnings for broken references — conditional logic worth verifying
- Both are already exported, so no refactoring needed to test them
