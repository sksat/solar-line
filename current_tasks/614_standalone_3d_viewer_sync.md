# Task 614: Sync Standalone orbital-3d.html with TypeScript Data Module

Status: DONE

## Problem
The standalone `orbital-3d.html` has diverged from the TypeScript `orbital-3d-viewer-data.ts` module in several ways:
1. Moon colors (rhea, titan, miranda, oberon) use old muted colors vs vivid colors in TS
2. Moon radii differ (rhea 0.07→0.08, titan 0.09→0.10, oberon 0.07→0.08)
3. Full-route scene missing `supportedViewModes` field
4. Episode titles lack mission parameters (duration, method)
5. Description text differences (minor)

## Solution
Sync the standalone HTML's PLANET_COLORS, PLANET_RADII, scene data with the TypeScript module values. This ensures the standalone viewer and inline episode viewers produce identical visual output.

## Files to Modify
- `ts/examples/orbital-3d.html` — sync colors, radii, viewmode, titles
