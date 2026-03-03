# Task 588: Extend Screenshot Capture to Per-Episode 3D Scenes

## Status: **IN PROGRESS**

## Description

Follow-up to Tasks 586 (screenshot infra) and 587 (per-episode 3D viewers).
The animation screenshot capture spec only covers full-route, saturn-ring, and
uranus-approach scenes. Extend it to also capture episode-1 through episode-4
scenes added in Task 587.

Also investigate whether local scene animations (saturn-ring, uranus-approach)
are properly animating — screenshots at t=0 and t=100 look nearly identical.

## Plan
1. Read the current screenshot spec and orbital-3d.html scene button layout
2. Add episode-1 through episode-4 to the screenshot capture scenes
3. Investigate local scene animation progression
4. Run capture and review screenshots
5. Commit

## Files
- `ts/e2e/animation-screenshots.spec.ts` — extend scenes array
- `ts/examples/orbital-3d.html` — check animation behavior
