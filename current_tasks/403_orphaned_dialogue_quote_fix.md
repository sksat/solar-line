# Task 403: Fix Orphaned Dialogue Quotes Missing dialogueLineId

## Status: **DONE**

## Summary

3 dialogue quotes in episode reports lack `dialogueLineId` references, bypassing all referential integrity validation. Add missing IDs and a completeness test.

- EP01 ep01-quote-07: manually transcribed, known exception
- EP03 ep03-quote-04, ep03-quote-05: should have dialogueLineId

## Rationale
- Existing validation skips quotes without dialogueLineId — these are blind spots
- CLAUDE.md: "Dialogue as single source of truth" — quotes should reference dialogue data
