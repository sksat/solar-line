# Task 584: Fix Orbital Insertion — Ship Orbits at Destination

## Status: **DONE**

## Description

Human directive phase 33: Ship appears to crash into destination planets
instead of entering orbit. Also: show 2-3 orbital loops at destination
for parking orbit visualization.

Two issues:
1. Transfer arc endpoints go too close to planet center (offsetFromPlanet
   uses 1.5× display radius which is very small visually)
2. Between transfer legs and after final arrival, ship disappears instead
   of orbiting the destination

## Plan
1. Add parking orbit data to TimelineTransfer (parkingOrbitRadius, parkingPlanet)
2. In updateTimelineFrame, when between transfers, show ship orbiting
   destination planet at a visible radius
3. Increase offset distance for arc endpoints to clear planet surface better
4. Add tests for parking orbit behavior

## Files
- `ts/src/orbital-3d-viewer-data.ts` — add parking orbit data
- `ts/src/orbital-3d-viewer-data.test.ts` — test parking orbit
- `ts/src/orbital-3d-viewer.js` — render parking orbit animation
- `ts/src/templates.ts` — update inline viewer
- `ts/examples/orbital-3d.html` — update standalone
