# Task 417: Add Lines JSON Structural Validation Tests

## Status: **DONE**

## Summary

The Phase 1 extraction data files (`epXX_lines.json`) lack structural validation tests. Add tests verifying: required top-level keys, lineId format and uniqueness, timestamp monotonicity and validity, non-empty text, and consistent episode numbering.

## Rationale
- Lines files are the foundation of the transcription pipeline — malformed data cascades to Phase 2 dialogue attribution
- No tests currently validate these files (dialogue tests exist, but lines tests don't)
- CLAUDE.md: "Timestamp accuracy matters" — validate temporal integrity at the extraction layer too
- Consistent with Task 416 pattern (calculation JSON validation)
