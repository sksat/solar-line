# Task 616: Fix Ship Animation in Local Encounter 3D Scenes

Status: IN PROGRESS

## Problem
Ship marker is invisible and appears non-animated in local encounter scenes:
- jupiter-capture: All timeline screenshots (t000/t050/t100) look identical
- earth-arrival: All timeline screenshots look identical
- saturn-ring, uranus-approach: Likely same issue

Task 615 fixed ship visibility for full-route and episode scenes but set local scene ship radius to 0.15 which is too small. The animation may also not be working — ship position appears static across timeline frames.

## Investigation Plan
1. Examine the `updateTimelineFrame()` code path for local scenes (uses `_sceneTransferArcs` fallback)
2. Check if transfer arcs provide proper fromPos/toPos for interpolation
3. Determine correct ship marker size for each local scene type
4. Fix animation and verify with screenshots

## Files to Examine
- `ts/src/orbital-3d-viewer.js` — `updateTimelineFrame()` local scene path
- `ts/src/orbital-3d-viewer-data.ts` — `prepareLocalScene()` transfer arc data
