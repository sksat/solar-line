# Task 215: Transcription page E2E tests

## Status: DONE

## Description

Added Playwright E2E tests for transcription pages — previously zero browser coverage.

## Tests added (7)

- Transcription index page loads and lists episode links
- EP01 has Layer 0 script tab (active by default)
- EP01 has 4 tabs (Layer 0/2/2/3)
- EP02 has 3 tabs (no Layer 0 script)
- Tab switching shows correct panel and hides others
- Transcription tables contain dialogue data (10+ rows)
- No raw VTT timing syntax leaks into rendered text

## Verification

- 112 Playwright E2E tests: ALL PASS
- 1776 TS unit tests: ALL PASS
