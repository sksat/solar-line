# Task 573: Use Epoch-Derived Planet Positions in 3D Viewer

## Status: **DONE**

## Description

The 3D full-route viewer uses hard-coded planet angles (Mars ~18°, Jupiter ~63°, etc.)
instead of actual ecliptic longitudes from the mission epoch. This makes the 3D
visualization inconsistent with the 2D SVG diagrams (which use ephemeris-derived angles).

## Plan

1. Add `eclipticLongitudeRad` to `ZHeightAnalysis` in `orbital-3d-analysis.ts`
2. Regenerate `3d_orbital_analysis.json` with longitude data
3. Update `prepareFullRouteScene()` in `orbital-3d-viewer-data.ts` to use longitudes
4. Update inline JS in `templates.ts` and standalone `orbital-3d.html`
5. Add/update tests

## Files
- `ts/src/orbital-3d-analysis.ts` — add longitude to output
- `ts/src/orbital-3d-analysis.test.ts` — test longitude presence
- `reports/data/calculations/3d_orbital_analysis.json` — regenerate
- `ts/src/orbital-3d-viewer-data.ts` — use longitude as initialAngle
- `ts/src/orbital-3d-viewer-data.test.ts` — test epoch angles used
- `ts/src/templates.ts` — update inline JS
- `ts/examples/orbital-3d.html` — update standalone
