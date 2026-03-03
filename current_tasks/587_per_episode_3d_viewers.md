# Task 587: Per-Episode 3D Viewers with 2D/3D TDD Alignment

## Status: **DONE**

## Description

Human directive phase 33 item 4: "クロスエピソード分析以外でも3D可視化はあってよいと思う。
ただしまずベースにする計算が2D計算と整合していることを TDD 的に確認してから。"

Extend the inline 3D viewer to support per-episode scenes. First verify that 3D
viewer data (planet positions, transfer arcs, timing) is consistent with 2D
orbital diagram data for each episode. Then add episode-specific 3D scenes.

## Plan
1. Write TDD tests comparing 2D diagram data with 3D viewer data for each episode
2. Verify planet positions, transfer timing, and arc geometry match between 2D and 3D
3. Add per-episode scene preparation functions to orbital-3d-viewer-data.ts
4. Wire up per-episode 3D viewers in episode report templates

## Files
- `ts/src/orbital-3d-viewer-data.ts` — per-episode scene preparation functions
- `ts/src/orbital-3d-viewer-data.test.ts` — 2D/3D alignment tests
- `ts/src/templates.ts` — per-episode 3D viewer integration
