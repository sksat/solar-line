# Task 621: Add Inline 3D Viewer Screenshot Capture for Episode Pages

Status: DONE

## Problem
Task 620 fixed a critical bug where EP01-EP04 inline 3D viewers never initialized (regex escape issue in template literal). The fix is verified by E2E tests checking controls become visible, but there's no visual confirmation that the viewers actually render correct 3D scenes. The existing `capture-screenshots` workflow only covers the standalone `orbital-3d.html`, not inline viewers in episode pages.

## Solution
Extend the screenshot capture infrastructure to also capture screenshots from inline 3D viewers in episode pages (EP01-EP05). This provides visual evidence that the Task 620 fix produces correct rendering, not just DOM element visibility.

## Files to Modify
- `ts/e2e/animation-screenshots.spec.ts` — Add inline viewer screenshot capture
- `ts/src/review-screenshots.ts` — Update review to include inline viewer screenshots (if needed)
