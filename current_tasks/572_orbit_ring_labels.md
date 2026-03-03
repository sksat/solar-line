# Task 572: Add orbit ring labels in full-route view

## Status: DONE

## Summary

Added Japanese labels to orbit circles in the full-route 3D view (火星軌道,
木星軌道, 土星軌道, 天王星軌道, 地球軌道). Labels appear at the top of each
orbit ring, helping identify which ring belongs to which planet — especially
useful when planets animate away from their initial positions.

### Files changed
- `ts/src/orbital-3d-viewer.js` — orbit circle labels (name param + createLabel)

## Impact
- UX improvement: orbit rings now identifiable independent of planet positions
