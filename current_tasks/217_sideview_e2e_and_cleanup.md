# Task 217: Side-view SVG E2E tests + hydration script dead code cleanup

## Status: DONE

## Description

Two focused improvements:

1. **E2E tests for side-view SVG diagrams** (2 tests): Cross-episode page has Saturn ring
   crossing and Uranus approach geometry side-view diagrams. Verify SVG renders with
   expected elements (circle, line, ellipse, path, description paragraph).

2. **Dead code cleanup**: Removed unused `mainIdx` variable assignment in the uPlot
   hydration script (templates.ts inline DOMContentLoaded handler). The variable was
   assigned but never referenced.

## Verification

- 1776 TS unit tests: ALL PASS
- 14 new E2E tests (KaTeX + transcription + sideview): ALL PASS
- Total E2E: 114 (was 112)
