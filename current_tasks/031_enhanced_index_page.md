# Task 031: Enhanced Index (Top) Page

## Status: DONE

## Goal
Enhance the top page (index.html) of the published GitHub Pages site with a rich project overview and key findings summary. The current page was just a list of links — visitors need context about what SOLAR LINE is and what the analysis found.

## Changes
1. **report-types.ts**: Added `VerdictCounts` interface; extended `SiteManifest` with per-episode `summary`, `verdicts`, and site-wide `totalVerdicts`
2. **build.ts**: Added `countVerdicts()` helper; updated `buildManifest()` to compute verdict statistics from episode data
3. **templates.ts**: Enhanced `renderIndex()` with:
   - Project introduction (ゆえぴこ, SOLAR LINE, ケストレル, きりたん, route overview)
   - Stats section showing episode/transfer counts and verdict breakdown badges
   - Episode cards with summaries and per-episode verdict badges
   - New CSS classes: `.stats-grid`, `.stat-item`, `.stat-number`, `.stat-label`, `.stat-count`, `.episode-card`, `.episode-meta`
4. **17 new tests**: `countVerdicts`, `buildManifest` verdict statistics, `renderIndex` enhanced content
5. All text in Japanese (日本語)

## Test Results
- 670 TS + 52 Rust = 722 total (0 failures)
- Site builds successfully (5 episodes, 24 transfers, 1 summary)

## Depends on
- Task 005 (report pipeline) — DONE
- Task 021 (cross-episode consistency) — DONE
