# Task 392: Fix EP03 Stellar Aberration Chart Not Rendering

## Status: **DONE**

## Summary

EP03 has a `chart-data:` directive (line 1127) for stellar aberration vs velocity, but this format doesn't match the episode MDX parser's fence regex (`timeseries-charts` not `chart-data`). The chart silently fails to render. Fix by converting to a timeseries chart inside the existing `timeseries-charts:` array.

## Rationale
- This is a rendering bug — existing analysis visualization is broken
- The stellar aberration chart is important context for EP03's navigation crisis
- The test `ep03-stellar-aberration-sweep` passes because it only checks string inclusion, not rendered output
