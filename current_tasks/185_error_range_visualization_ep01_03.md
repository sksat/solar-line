# Task 185: Add error range visualization to EP01-EP03 time-series charts

## Status: DONE

## Description
EP04 and EP05 already include `yLow`/`yHigh` error bands on their time-series charts
(radiation dose and nozzle life respectively), but EP01-EP03 lack this visualization.
The type infrastructure (`TimeSeriesDatum.yLow/yHigh`, `errorSource`) and the uPlot
rendering code already support error bands. This task adds uncertainty visualization
to the earlier episodes.

## Specific Changes

### EP02: Velocity profile chart (`ep02-chart-velocity-profile`)
- Add `yLow`/`yHigh` bands reflecting initial velocity uncertainty (departure ΔV margin)
- errorSource: "parameter" (initial conditions uncertainty)

### EP03: Velocity and thrust profile charts
- `ep03-chart-velocity-profile`: Add error bands from mass uncertainty affecting acceleration
- `ep03-chart-thrust-profile`: Add error bands from thrust variation (damaged nozzle degradation)
- errorSource: "parameter"

### EP01: Mass-transit-time chart (`ep01-mass-transit-time`)
- This is a parameter-space chart (mass vs transit time), not a time series
- Add series for thrust uncertainty range (65% to 110% of nominal)
- This shows the boundary shift visually

## Motivation
CLAUDE.md: "Visualize uncertainty/error ranges in time-series charts (error bands)"
DESIGN.md: "誤差範囲の可視化"
