# Task 615: Fix 3D Viewer Ship Marker Visibility Across All Scene Types

Status: DONE


## Problem
The ship marker in the 3D orbital viewer was invisible in all scene types:
- Screenshots at different timeline positions looked identical — no visible ship movement
- Root cause investigation revealed the ship WAS rendering and animating correctly, but:
  1. Ship marker was too small to see at camera distances (0.2 radius in scenes spanning 5-100 scene units)
  2. Ship color was overridden to match the transfer arc color (episode color), making it blend in

## Solution
1. **Increased ship marker sizes** for all scene types:
   - Full-route: 0.2 → 0.4 (visible against planet scale)
   - Episode scenes: 0.6 → 0.8 (clearly visible)
   - Local encounter scenes: 0.2 → 0.15 (proportional to moons)
2. **Kept ship white** instead of recoloring by episode — white contrasts against all arc colors and dark background
3. **Added CSS2D label** "▲ ケストレル" above ship marker for identification
4. **Added 5 TDD tests** verifying all scenes provide correct timeline data for ship animation

## Files Modified
- `ts/src/orbital-3d-viewer.js` — ship marker size, color, label creation, label sync in update loop
- `ts/src/orbital-3d-viewer-data.test.ts` — 5 new tests for ship animation data completeness
