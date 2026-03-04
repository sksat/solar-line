# Task 606: 3D Viewer Time Slider Scene-Switch Sync

## Status: **TODO**

## Summary

Human directive: time slider の幅が可視化種類切り替えに追従してない。

When switching between scenes (e.g., full-route → episode-1), the time slider range/width doesn't update to match the new scene's duration. The slider should recalculate its range based on the active scene's total duration.

## Key Files

- `ts/src/orbital-3d.html` — standalone 3D viewer
- `ts/src/templates.ts` — inline 3D viewer rendering
- `ts/e2e/reports.spec.ts` — E2E tests for 3D viewer
