# Task 438: Extract extractWhisperLines to Testable Module

## Status: **DONE**

## Summary

Move `extractWhisperLines` from `extract-dialogue-from-whisper.ts` (CLI script with bare `main()`) to `dialogue-extraction.ts` (testable module). Add 9 tests covering empty input, normal segmentation, fragment merging, gap handling, and timestamp preservation.
