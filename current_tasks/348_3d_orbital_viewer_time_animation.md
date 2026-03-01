# Task 348: 3D Orbital Viewer Time Animation

## Status: DONE

## Description
Add a time slider to the 3D orbital viewer (orbital-3d.html) that animates planetary orbital positions along the transfer timeline. The 2D SVG diagrams already have time sliders, but the 3D Three.js viewer only has static presets. This is noted in CLAUDE.md as a goal: "Add time slider to animate orbital transfers, showing how celestial body positions change during the transfer."

## Scope
1. Add time slider UI control to orbital-3d.html
2. Animate planet positions based on mean motion over the mission timeline
3. Show ship position moving along the transfer trajectory
4. Add play/pause control for automatic playback
5. Unit tests for time-dependent position calculations
6. E2E tests for slider presence and basic interaction

## Dependencies
- Task 339 (3D orbital visualization) — DONE
