# Task 561: Add inline 3D viewers to EP03 and EP05 episode reports

## Status: DONE

## Summary

Added inline `3d-viewer:` directive support to the episode MDX parser and
embedded 3D viewers in EP03 (Saturn ring scene) and EP05 (Uranus approach scene).
Also refactored the viewer3d script generation into a shared function used by
both episode and summary templates.

### Changes
1. **Type**: Added `viewer3d?: Viewer3DEmbed` to `EpisodeReport` interface
2. **Parser**: Added `3d-viewer` to episode parser fence regex + `applyReportDirective`
3. **Template**: Extracted `generateViewer3dScript(basePath)` shared function,
   used by both `renderEpisode` and `renderSummary`
4. **EP03**: Added saturn-ring scene 3D viewer in preamble
5. **EP05**: Added uranus-approach scene 3D viewer in preamble
6. **Validation**: Updated directive validation test to include `3d-viewer`

### Tests added
- `episode-mdx-parser.test.ts`: 2 new tests (extracts + parses 3d-viewer)
- `reports.spec.ts`: 7 new E2E tests (EP03 scene/controls/TOC, EP05 scene/controls/TOC, EP01 no viewer)

### Files changed
- `ts/src/report-types.ts` — viewer3d field on EpisodeReport
- `ts/src/episode-mdx-parser.ts` — 3d-viewer directive support
- `ts/src/episode-mdx-parser.test.ts` — 2 new parser tests
- `ts/src/templates.ts` — generateViewer3dScript shared function + episode rendering
- `ts/src/article-content-validation.test.ts` — updated directive set
- `ts/e2e/reports.spec.ts` — 7 new E2E tests
- `reports/data/episodes/ep03.md` — 3d-viewer directive (saturn-ring)
- `reports/data/episodes/ep05.md` — 3d-viewer directive (uranus-approach)

## Impact
- Stats: 4,033 TS, 282 E2E (4,846 total)
- EP03 and EP05 now have interactive 3D orbital viewers
