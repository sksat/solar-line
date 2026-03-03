# Task 582: Extract Geometry Helpers from Browser-Only Viewer to Testable Module

## Status: **DONE**

## Description

`orbital-3d-viewer.js` contains geometry helper functions that are untestable
because they depend on Three.js (browser-only). The pure-math logic can be
extracted to `orbital-3d-viewer-data.ts` and tested in Node.js:

1. `arcControlPoint(from, to)` → compute Bezier control point at angular midpoint
2. `arcControlPointLocal(from, to)` → lateral offset for local scenes
3. `offsetFromPlanet(point, otherPoint, planetName, sceneType)` → displace arc endpoint from planet center

The viewer.js will import these from the data module (via plain [x,y,z] arrays)
and convert to Three.js Vector3 at the call site.

## Files
- `ts/src/orbital-3d-viewer-data.ts` — add exported geometry functions
- `ts/src/orbital-3d-viewer-data.test.ts` — add tests for geometry functions
- `ts/src/orbital-3d-viewer.js` — call data module functions instead of local copies
