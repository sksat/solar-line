# Task 396: Fix Broken Links and Anchors in Reports

## Status: **IN PROGRESS**

## Summary

Site audit found broken links in built HTML — incorrect file paths, missing file extensions, and non-existent anchor IDs. Fix the source markdown files.

## Issues Found
1. cross-episode.md: `/ep05.html#ep05-transfer-04` → should use relative path
2. tech-overview.md: `/episodes/ep01.html` → should be `ep-001.html` format
3. cross-episode.md: `/examples/orbital-3d.html` → wrong directory
4. attitude-control.md: `/summary/ship-kestrel` → missing .html extension

## Rationale
- CLAUDE.md: "Source citations must be clickable links"
- Broken links damage user experience and report credibility
