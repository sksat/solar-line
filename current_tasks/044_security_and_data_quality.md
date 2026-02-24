# Task 044: Security Fix & EP05 Data Quality

## Status: DONE

## Description
Fix HTML escaping vulnerability in scenario result rendering and populate missing computedDeltaV values in EP05 report.

## Changes Made

### 1. XSS Fix in Scenario Result Rendering (templates.ts)
- `renderScenarioRow()`: String values in `ExplorationScenario.results` were rendered without HTML escaping
- Added `escapeHtml(String(v))` for non-numeric result values
- Added test case verifying HTML entities are properly escaped

### 2. EP05 computedDeltaV Population
- `ep05-transfer-02` (Brachistochrone): Set `computedDeltaV: 15207` (300t most plausible scenario, matching cross-episode mass boundary analysis)
- `ep05-transfer-03` (Earth capture): Set `computedDeltaV: 3.18` (LEO 400km capture, matching actual in-story outcome)

### 3. Test Coverage
- Added `escapes HTML in string result values` test to templates.test.ts
- Total tests: 831 TS + 79 Rust = 910

## Files Modified
- `ts/src/templates.ts` — escapeHtml fix in renderScenarioRow
- `ts/src/templates.test.ts` — XSS escaping test
- `reports/data/episodes/ep05.json` — computedDeltaV for transfers 02 and 03
