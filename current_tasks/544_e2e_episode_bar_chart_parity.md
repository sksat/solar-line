# Task 544: E2E Episode Bar Chart Parity

## Status: DONE

## Summary

Added a 4th E2E test to EP02, EP03, and EP04 episode-specific describe blocks to match EP01 and EP05 which already had 4 tests each. Each new test verifies that SVG bar charts with aria-labels are present on the episode page.

### New tests (3, 261→264 E2E)
1. EP02: bar charts for radiation and departure scenarios
2. EP03: bar charts for burn phase analysis
3. EP04: bar charts for cooling and fleet analysis

## Impact

All 5 episodes now have exactly 4 dedicated E2E tests in their episode-specific describe blocks. EP05 has additional sub-page tests beyond the 4 baseline.
