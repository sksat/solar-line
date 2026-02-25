# Task 165: Fix NaN Timestamp Links in Source Citations

## Status: DONE

## Problem

The `parseTimestamp()` function in `templates.ts` only handled simple `MM:SS` or `HH:MM:SS` formats. Source citations in transfer analyses sometimes use range timestamps (e.g., `02:22-04:09（航路ブリーフィング〜天王星脱出）`) or timestamps with descriptive text. These produced `NaN` when split and parsed as numbers.

**Affected pages** (8 NaN links total):
- EP01: 1 link (`00:00 - 19:20（全編）`)
- EP02: 2 links (`09:08 - 13:45`, `16:38 - 18:30`)
- EP05: 5 links (3 unique timestamps in main page + 2 detail sub-pages)

## Fix

Updated `parseTimestamp()` to use a regex to extract the first `MM:SS` or `HH:MM:SS` pattern from the string, ignoring range delimiters, description text, and Japanese characters.

## Tests Added

8 new tests:
- `parseTimestamp`: 5 tests for range formats, descriptions, and non-timestamp text
- `timestampLink`: 3 tests ensuring no NaN in YouTube/Niconico URLs for edge cases

## Verification

- All 1447 unit tests pass
- 90 E2E tests pass
- Build produces 0 NaN links (previously 8)
- Correct seconds values: 02:22→142, 02:50→170, 20:27→1227, 09:08→548, 00:00→0
