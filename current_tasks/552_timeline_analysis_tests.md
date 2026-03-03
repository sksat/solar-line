# Task 552: Timeline analysis test expansion

## Status: DONE

## Summary

Added 10 tests to timeline-analysis.test.ts (20→30):

### FIXED_DURATIONS (new, 0→3)
1. EP01 is 72h = 3 days
2. EP03 is ~143h ≈ 5.96 days
3. EP05 coast is 375h ≈ 15.6 days

### searchMultipleEpochs (new, 0→3)
4. Returns multiple candidate timelines
5. All results have 4 events
6. Results are sorted by total duration

### ep02SensitivityAnalysis (new, 0→2)
7. Returns multiple scenarios
8. Each scenario has positive transit time

### narrativePlausibilityAnalysis (new, 0→2)
9. Returns entries for multiple episodes
10. Each entry has reasoning and coastFeelsLong boolean

## Impact
- Stats: 4,007 TS, 531 Rust, 265 E2E (4,803 total)
- All 6 exported functions from timeline-analysis.ts now tested
