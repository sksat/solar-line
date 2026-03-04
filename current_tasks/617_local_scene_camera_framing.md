# Task 617: Fix Local Scene Camera Framing for Ship Visibility at t=0

Status: DONE

## Problem
At t=0 in local encounter scenes, the ship marker starts at the approach point (e.g., [12, 5, 0]) which is outside the default camera viewport at (8, 6, 10). The ship only becomes visible mid-animation.

## Solution
Apply bounding box-based camera framing (already used for episode scenes) to local scenes too. Compute bounding box from all transfer arc endpoints + planet positions + approach points, then position camera to frame everything.

## Files to Modify
- `ts/src/orbital-3d-viewer.js` — `loadScene()` local scene camera logic
