# Task 030: Report Data Integrity Validation & Dialogue Evidence Enrichment

## Status: DONE

## Goal
1. Create integration tests that validate report JSON data integrity (evidenceQuoteIds reference valid quotes, speaker consistency, etc.)
2. Enrich report transfers with dialogue evidence from the attributed dialogue data (EP01-04)
3. Validate that dialogue quotes in reports match the corrected text from attribution work

## Progress
- [x] Write report-data-validation.test.ts (159 integration tests for JSON data)
- [x] Fix EP02-04 speaker name inconsistencies (ケストレル船載AI → ケストレルAI)
- [x] Fix EP05 invalid source types (reference → external-reference, etc.)
- [x] Remove EP05 placeholder dialogue quote
- [x] Add dialogue evidence quotes to ep01-transfer-04 (ship performance)
- [x] All 653 TS + 52 Rust tests pass

## Context
- EP01-04 have rich attributed dialogue data (_dialogue.json) but reports only use curated subsets
- Hohmann baseline transfers intentionally have no evidence quotes (reference calculations)
- ep01-transfer-04 (ship performance) has no evidence quotes but should
- Some report dialogue quote text may have been written before attribution corrections

## Depends on
- Task 029 (EP01 dialogue attribution) — DONE
- Task 028 (EP02-04 dialogue attribution) — DONE
