# Task 583: Fix Timeline Bar Width/Behavior on Scene Switch

## Status: **DONE**

## Description

Human directive phase 33: "時間のバーの幅が誤っている。特に切り替え時。"

Multiple bugs in the inline 3D viewer's timeline controls:

1. **Slider→day conversion bug**: Slider input handler passed fraction (0-1) instead
   of day value to `updateTimelineFrame(day)`. Full-route worked by accident (frac≈0
   at start) but local scenes were broken.

2. **Scene switch stale state**: `switchScene()` didn't update `container.dataset.scene`,
   so the `tick()` loop always used the initial scene's `totalDays` even after switching.

3. **Time display**: Used `Math.round(day) + "日"` which shows "0日" for local scenes
   (totalDays < 5 days). Added `fmtDay()` matching standalone HTML's `formatDays()`.

4. **Transfer label**: `.viewer3d-label` element existed but was never populated.
   Added `getLabel(day)` matching transfers to current time.

5. **Timeline end**: Play button didn't revert to ▶ when animation finished.
   Added `_onTimelineEnd` callback and reset-on-replay logic.

## Files
- `ts/src/templates.ts` — all 5 fixes in inline viewer script
- `ts/src/templates.test.ts` — 3 new sync tests
