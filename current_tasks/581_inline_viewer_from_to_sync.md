# Task 581: Fix Inline Viewer Local Scene from/to + Add Sync Tests

## Status: **DONE**

## Description

The `templates.ts` inline 3D viewer (`__prepareScene`) has two issues found by
code review:

1. **Bug**: Saturn/Uranus local scene `timeline.transfers[0]` objects are missing
   `from`/`to` fields. Since Task 580 made `getOrbitForTransfer()` depend on these
   fields, the ship marker never animates in inline local scenes.

2. **Test gap**: No test verifies that the inline `__prepareScene` output matches
   the TypeScript `prepareFullRouteScene`/`prepareSaturnScene`/`prepareUranusScene`
   output. Constants are duplicated between the two implementations.

## Fix
- Add `from`/`to` to inline viewer's Saturn and Uranus timeline transfers
- Add a sync test comparing inline script constants against data module
- Add test for `planetLongitudesAtMissionStart` precedence in data module

## Files
- `ts/src/templates.ts` — fix missing from/to in local scenes
- `ts/src/templates.test.ts` — add sync test for inline script constants
- `ts/src/orbital-3d-viewer-data.test.ts` — add planetLongitudesAtMissionStart precedence test
