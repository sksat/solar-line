# Task 591: Localize 3D Viewer Labels to Japanese

## Status: **DONE**

## Problem

The 3D orbital viewer has mixed-language labels:
- Planet labels: Japanese (火星, 木星, etc.) ✓
- Orbit labels: Japanese (火星軌道, 木星軌道, etc.) ✓
- **Transfer route labels: English** (Mars→Jupiter, Jupiter→Saturn, etc.) ✗
- **Full-route planet labels: English** (Mars, Jupiter, etc.) ✗

Per CLAUDE.md: "All reports published to GitHub Pages must be written in Japanese"

## Root Cause

1. `ts/src/orbital-3d-analysis.ts` LEGS array has English `label` values
2. `ts/src/orbital-3d-viewer-data.ts` `prepareFullRouteScene` generates English planet labels at line 439

## Fix

1. Change LEGS labels in `orbital-3d-analysis.ts` to Japanese
2. Fix `prepareFullRouteScene` planet labels to use PLANET_LABELS
3. Regenerate `3d_orbital_analysis.json`
4. Update tests

## Files
- `ts/src/orbital-3d-analysis.ts` — source of `leg` labels
- `ts/src/orbital-3d-viewer-data.ts` — planet label generation
- `reports/data/calculations/3d_orbital_analysis.json` — generated output
- `ts/src/orbital-3d-viewer-data.test.ts` — tests
- `ts/src/orbital-3d-analysis.test.ts` — tests
