# Task 589: Fix Per-Episode 3D Scene Camera Framing

## Status: **DONE**

## Description

Per-episode 3D scenes (from Tasks 587-588) had poor camera framing. The camera
used hardcoded positions that didn't account for where the transfer arc was
located in the scene, making arcs invisible or off-screen.

## Root Cause

Two issues in `loadScene()` camera positioning for episode scenes:
1. **Coordinate swap bug**: Arc positions from `sceneData.transferArcs` use data
   coords `[x_ecliptic, y_ecliptic, z_height]`, but Three.js Y-up needs
   `(data[0], data[2], data[1])`. The bounding box was computed in wrong coords.
2. **Fixed camera direction**: Using a fixed direction vector `(0.54, 0.45, 0.72)`
   worked for some arcs but failed for arcs in other quadrants of the solar system.

## Fix

- Fixed coordinate swap: use Three.js coords for bounding box computation
- Included all visible planet positions (not just arc endpoints) for complete bbox
- Computed camera direction dynamically: outward from origin through arc center,
  elevated 35° above ecliptic plane. This ensures the camera always looks "inward
  and down" at the arc regardless of its position.

## Files
- `ts/src/orbital-3d-viewer.js` — camera positioning logic in `loadScene()`
