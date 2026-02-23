# Task 021: Cross-Episode Consistency Analysis

## Status: DONE

## Goal
Create a cross-episode consistency analysis page comparing parameters, assumptions, and findings across all 4 episodes. This is a human directive (see ideas/cross_episode_consistency.md).

## Scope
1. Extend report pipeline to support summary/cross-episode pages
2. Create TypeScript analysis module computing cross-episode comparisons
3. Generate report JSON with consistency findings
4. Add template rendering for summary pages
5. Update site navigation to include summary page links

## Key Comparisons
- Ship mass assumptions: 48,000t nominal vs. 299t (ep01), 452t (ep03) boundaries
- Thrust specifications across episodes (9.8 MN → 10.7 MN emergency → 6.37 MN damaged)
- Route continuity: Mars→Ganymede→(escape)→Enceladus→Titania→Earth
- Brachistochrone ΔV consistency
- Scientific accuracy highlights (Voyager 2 data, ICRP limits, navigation precision)

## Progress
- [x] Task file created
- [x] Design review (Codex consultation)
- [x] Type extensions (SiteManifest, SummaryReport, ComparisonTable, ComparisonRow, SummarySection)
- [x] Template additions (renderSummaryPage, renderComparisonTable, navigation update with summaryPages)
- [x] Build pipeline (discoverSummaries, manifest, render to dist/summary/)
- [x] Analysis code (cross-episode-analysis.ts + generate-cross-episode.ts)
- [x] Report JSON (reports/data/summary/cross-episode.json)
- [x] Tests (22 analysis + 28 template tests, all passing)
- [x] Build verification (4 episodes, 19 transfers, 1 summary, 7 logs)
