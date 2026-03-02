# Task 415: Add Dialogue Temporal Integrity Tests

## Status: **DONE**

## Summary

Dialogue data files (`epXX_dialogue.json`) have structural validation (valid speakers, scenes, schema version) but lack temporal integrity checks. Add tests for: timestamp monotonicity within scenes, dialogue entries falling within their scene boundaries, scene interval ordering, and cross-episode speaker ID consistency for recurring characters.

## Rationale
- Dialogue data is a fundamental source of truth for the project
- Timestamps drive video link generation and quote citation
- Out-of-order entries or entries outside scene boundaries would cause incorrect citations
- CLAUDE.md: "Timestamp accuracy matters" and "Transcription-report sync"
- Cross-episode speaker consistency prevents silent divergence of IDs for recurring characters

## Plan
1. Add per-scene dialogue timestamp monotonicity test
2. Add dialogue-within-scene-boundary containment test
3. Add scene interval ordering and non-overlap test
4. Add cross-episode recurring speaker ID consistency test
5. Run tests, fix any data issues found, commit
