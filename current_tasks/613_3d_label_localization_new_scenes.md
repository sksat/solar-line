# Task 613: Fix 3D Viewer Label Localization in New Scenes

Status: IN PROGRESS

## Problem
The jupiter-capture (Task 609-610) and earth-arrival (Task 611) 3D scenes have inconsistent label localization:
- Jupiter-capture: shows both Japanese orbit labels ("カリスト", "エウロパ") AND English planet labels ("callisto", "ganymede", "io", "europa") — duplicate labels
- Earth-arrival: shows "luna" (English) alongside "月" (Japanese), "geo"/"leo" in English

Per CLAUDE.md, all reports must be in Japanese. The 3D viewer localization (Task 591) was completed before these scenes were added.

## Solution
1. Trace the label generation in orbital-3d-viewer-data.ts for jupiter-capture and earth-arrival scenes
2. Ensure orbit labels use Japanese names and planet labels are either hidden or Japanese
3. Add TDD tests for label content
4. Verify with screenshot capture

## Files to Modify
- `ts/src/orbital-3d-viewer-data.ts` — fix scene label data
- `ts/src/orbital-3d-viewer-data.test.ts` — add label localization tests
- `ts/examples/orbital-3d.html` — may need label rendering fixes
