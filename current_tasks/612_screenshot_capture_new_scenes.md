# Task 612: Add New 3D Scenes to Screenshot Capture

Status: DONE

## Problem
Tasks 609-611 added three new 3D scenes (jupiter-capture, earth-arrival, episode-5) to the orbital viewer, but the animation screenshot capture spec (animation-screenshots.spec.ts) was not updated to include them. The review-screenshots command only captures 7 scenes (37 screenshots) but there are now 10 scenes in total.

## Solution
1. Add jupiter-capture, earth-arrival, and episode-5 to the scenes array in animation-screenshots.spec.ts
2. Update btnIndex values to match the current button order in orbital-3d.html
3. Run screenshot capture to verify all scenes are captured
4. Update memory with new screenshot count

## Files to Modify
- `ts/e2e/animation-screenshots.spec.ts` — add 3 new scene entries
