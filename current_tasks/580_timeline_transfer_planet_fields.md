# Task 580: Add from/to Planet Fields to TimelineTransfer

## Status: **DONE**

## Description

The `getOrbitForTransfer()` function in `orbital-3d-viewer.js` uses a hardcoded
`episodeRoutes` mapping (episode→planet pair) instead of deriving planet names
from the transfer data. This is fragile and fails for episode 5.

Fix: Add `from` and `to` planet name fields to `TimelineTransfer` interface,
populate them from transfer data, and use them directly in `getOrbitForTransfer`.

## Files
- `ts/src/orbital-3d-viewer-data.ts` — add fields to interface and builder
- `ts/src/orbital-3d-viewer.js` — use transfer.from/to instead of hardcoded map
- `ts/src/templates.ts` — update inline viewer
- `ts/examples/orbital-3d.html` — update standalone
- `ts/src/orbital-3d-viewer-data.test.ts` — test new fields
