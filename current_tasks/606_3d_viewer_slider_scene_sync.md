# Task 606: 3D Viewer Time Slider Scene-Switch Sync

## Status: **DONE**

## Summary

Human directive: time slider の幅が可視化種類切り替えに追従してない。

Fix: Added total duration indicator (`/ X日Y時間`) next to the current time display. When switching scenes, the total duration updates to show the new scene's duration, making it visually clear that the slider range has changed. Moved `fmtDay()` function to module scope so it's available during scene switch. Applied to both inline viewer (templates.ts) and standalone viewer (orbital-3d.html). 2 new E2E tests verify the indicator appears and updates on scene switch.

## Key Files

- `ts/src/orbital-3d.html` — standalone 3D viewer
- `ts/src/templates.ts` — inline 3D viewer rendering
- `ts/e2e/reports.spec.ts` — E2E tests for 3D viewer
