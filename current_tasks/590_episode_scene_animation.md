# Task 590: Fix Per-Episode 3D Scene Animation

## Status: **DONE**

## Description

Per-episode 3D scenes (episode-1 through episode-4) do not animate. Comparing
screenshots at t=0% and t=100%, the views are pixel-identical: no ship marker
movement, no planet orbital motion. The full-route scene animates correctly.

## Investigation

Need to determine why the timeline animation doesn't work for episode scenes.
Likely causes:
1. Timeline data not set up correctly for episode scenes
2. Ship marker not created or positioned for episode scenes
3. Animation loop not updating episode scene objects

## Files
- `ts/src/orbital-3d-viewer.js` — animation update logic
- `ts/examples/orbital-3d.html` — prepareEpisodeScene() timeline data
