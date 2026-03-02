# Task 404: Add Dialogue transferRefs Referential Integrity Test

## Status: **DONE**

## Summary

Dialogue JSON entries contain `transferRefs` arrays pointing to transfer IDs in episode reports. Add validation test ensuring these references point to existing transfers.

## Rationale
- Completes the referential integrity coverage (evidenceQuoteIds, dialogueLineId, transferId all tested; transferRefs is the gap)
- Prevents silent data corruption if transfers are renamed or removed
