# Task 250: Episode-Specific E2E Tests

## Status: DONE

## Description

Added episode-specific E2E tests for EP02-EP05. Previously, episode pages only had 7 generic tests (shared across all 5) plus 1 EP01-specific test. Now each episode has dedicated feature tests.

## Tests Added (13)

### EP02 (+3)
- ✅ Has margin gauge section
- ✅ Has 5 transfer analysis sections (verdict badges)
- ✅ Has timeseries chart

### EP03 (+3)
- ✅ Has margin gauge with navigation accuracy
- ✅ Has velocity profile timeseries chart
- ✅ Has IF analysis sections (explorations)

### EP04 (+3)
- ✅ Has plasmoid radiation timeseries chart
- ✅ Has margin gauge with radiation/shield data
- ✅ Has 5 transfer analysis sections

### EP05 (+4)
- ✅ Has nozzle lifespan timeseries chart
- ✅ Has margin gauge for nozzle
- ✅ Has interactive brachistochrone calculator
- ✅ Has multiple IF-analysis explorations

## Stats
- E2E tests: 172 → 185 (+13)
- All 2,545 tests pass (0 failures)
