# Task 607: 3D Viewer Target Body Collision Trajectory Fix

## Status: **TODO**

## Summary

Human directive: 土星→天王星接近軌道などがターゲット天体に直接突っ込むような軌道になっており、可視化上も突っ込んでいるように見える。

Transfer trajectories (especially Saturn→Uranus approach) appear to collide directly with the target body instead of entering orbit around it. The visualization should show proper orbital insertion rather than a collision trajectory. This may be related to the parking orbit radius or the approach geometry calculation.

## Dependencies

- Task 584 (DONE) — parking orbit visualization
- Task 579 (DONE) — orbital insertion alignment

## Key Files

- `ts/src/orbital-3d.html` — standalone 3D viewer
- `ts/src/orbital-3d-data.ts` — 3D data preparation
- `ts/src/templates.ts` — inline 3D viewer
