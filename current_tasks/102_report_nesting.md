# Task 102: Report Nesting for Long Analyses

## Status: DONE

## Motivation
Human directive: 各分析は、長くなってきたらレポートの切り分け方を見直したり、レポートをネストさせたりしてもよい。ネストさせる場合はネストの深さに気を付けることと、ヘッダの選択でもネストさせること。

## Scope
1. Design sub-report structure: allow an episode report to link to child reports for detailed sub-analyses
2. Update report types to support parent-child relationships
3. Update navigation (breadcrumbs, back links) for nested reports
4. Ensure header levels (h1-h6) are consistent with nesting depth
5. Apply to longest reports first (EP05 has 8 explorations, EP02 has 5 transfers)

## Implementation (2026-02-24)
- New type `TransferDetailPage` in report-types.ts: slug, transferIds, diagramIds, chartIds, title
- New `EpisodeReport.detailPages` optional field: opt-in per episode
- `renderTransferSummaryCard()`: compact card with verdict, ΔV, first paragraph, detail link
- `renderTransferDetailPage()`: full sub-page with breadcrumb, transfers, explorations, diagrams, charts
- Build pipeline generates `episodes/ep-XXX/<slug>.html` sub-pages
- TOC shows "詳細ページ" badge for transfers with detail pages
- Applied to EP05: brachistochrone (transfer-02 + 3 explorations + 2 diagrams), ignition-budget (transfer-04 + 4 explorations + 2 charts)
- 15 new tests (388 total templates+build tests pass)
- CSS: breadcrumb, detail-badge, transfer-summary, detail-page-parent, detail-page-nav

## Notes
- Opt-in design: only episodes with `detailPages` field get sub-pages; others remain unchanged
- EP02 (40KB, 5 transfers, 4 explorations) is a candidate for future splitting
- URL structure: `episodes/ep-005/brachistochrone.html` (SEO-friendly)
- Backward compatible: no existing report data needs changing unless opting in
