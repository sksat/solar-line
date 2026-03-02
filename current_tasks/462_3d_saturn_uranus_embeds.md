# Task 462: Embed Saturn Ring and Uranus Approach 3D Viewers in Cross-Episode Report

## Status: DONE

## Summary

Task 461 added the full-route 3D viewer embed to the cross-episode report's "3次元軌道解析" section. The Saturn ring crossing and Uranus approach sub-sections still only have 2D sideview diagrams. Per the Phase 27 directive (3D data should use interactive Three.js viewers), these sections should also embed their respective 3D scenes inline.

## Plan

1. Add `3d-viewer:` directive for `saturn-ring` scene after the Saturn ring crossing sideview diagram
2. Add `3d-viewer:` directive for `uranus-approach` scene after the Uranus approach sideview diagram
3. Add content validation tests for both new embeds
4. TDD: tests first, then implementation

## Impact

- Completes the 3D visualization coverage for all three scenes in the cross-episode report
- Saturn ring plane geometry and Uranus axial tilt are inherently 3D — 2D diagrams miss the full picture
