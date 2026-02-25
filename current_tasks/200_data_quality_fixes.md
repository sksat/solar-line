# Task 200: Fix remaining data quality issues from Task 198 review

## Status: DONE

## Description
Address the known minor issues identified during the Task 198 systematic review:

1. **Cross-episode margin timeline chart mixed units**: The margin chart mixes % and degrees on the Y-axis. EP03's value is 1.23° (angular discrepancy) while all others are %. Convert EP03 to 0.2% (= 100% − 99.8% navigation accuracy) for unit consistency.

2. **Stale 3d_orbital_analysis.json**: Contains `enceladusOrbitKm: 238042` while all other files use the corrected 238,020 km. Needs update.

3. **ep02-transfer-03 timestamp discrepancy**: Source timestamp 16:15 vs quote timestamp 16:24. Investigate and fix.

## Acceptance Criteria
- [x] All margin chart Y-axis values use consistent units (%)
- [x] 3d_orbital_analysis.json Enceladus radius matches 238,020
- [x] ep02-transfer-03 timestamp resolved
- [x] All tests pass (1613 TS, 48 Rust, cargo fmt/clippy clean, tsc clean)
