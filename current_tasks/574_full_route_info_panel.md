# Task 574: Populate Full-Route Info Panel with 3D Analysis Data

## Status: **DONE**

## Description

The full-route 3D viewer info panel had an empty table stub (headers only, no data rows).
Populated it with per-transfer Z-height differences and inclination ΔV fractions from
the 3D orbital analysis data.

## Changes
- Added `TransferSummaryItem` type and `transferSummary` field to `SceneData`
- `prepareFullRouteScene()` now extracts summary from input data
- `updateInfoPanel()` in viewer JS renders table rows
- Updated inline JS in `templates.ts` and standalone `orbital-3d.html`
- Fixed description from "10倍誇張" → "3倍誇張"
- Added 2 tests: summary present with analysis data, absent without
