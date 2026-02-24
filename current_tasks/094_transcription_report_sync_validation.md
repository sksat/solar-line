# Task 094: Transcription-Report Sync Validation

## Status: DONE

## Motivation
CLAUDE.md specifies multiple times: "When transcription corrections are made, update corresponding dialogue quotes in episode reports. Run validation to check consistency between dialogue data files and report citations."

Currently, the validation tests check:
- Speaker names in reports match dialogue registry ✓
- Structural integrity of reports ✓
- Referential integrity (evidenceQuoteIds → dialogueQuotes) ✓

Missing validation:
- **Dialogue quote text** in reports vs actual dialogue text in `epXX_dialogue.json`
- **Dialogue quote timestamps** in reports vs actual dialogue timestamps
- **Speaker attribution** for quoted text matches the attributed speaker in dialogue data

This creates a risk of drift: when transcriptions are corrected (Task 089 just completed a full re-review), report quotes may become stale.

## Scope
1. Add test: For each dialogue quote in an episode report, find the closest matching entry in dialogue data and validate:
   - Speaker name matches
   - Text is a substring or close match (quotes may be abbreviated)
   - Timestamp is within reasonable tolerance (±5s)
2. Report which quotes have no matching dialogue entry (possible fabrication or paraphrase)
3. All new validation as tests in `report-data-validation.test.ts`

## Notes
- Dialogue quotes in reports are often abbreviated or paraphrased — exact match is not expected
- Timestamp matching needs tolerance since VTT timestamps are approximate
- This is a guard against drift, not a strict equality check
