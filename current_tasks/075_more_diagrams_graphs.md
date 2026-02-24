# Task 075: 解説の図・グラフ追加

## Status: DONE

## Motivation

Human directive: 「解説としての分かりやすさのために、もっと図やグラフがほしい」

## Implementation

### New report types
- `BarChart` and `BarChartItem` interfaces in report-types.ts
- `barChart` optional field on `SummarySection`
- `comparisonTable` (custom headers) optional field on `SummarySection`

### Renderer
- `renderBarChartFromData()`: Delegates to existing `renderBarChart()` SVG renderer
- `renderCustomComparisonTable()`: Non-episode-keyed comparison tables
- Both wired into `renderSummaryPage()` section renderer
- CSS: `.bar-chart-container`, `.chart-caption`

### Charts added to cross-episode.json
1. **Transit duration chart** (航路の連続性): Log-scale bar chart showing EP01-05 transit times (72h → 455d → 143h → 507h)
2. **ΔV comparison chart** (Brachistochrone ΔVスケーリング): EP01/03/04/05 ΔV values with distance/time annotations
3. **Margin cascade chart** (マージン連鎖分析): EP02-05 margin percentages showing contraction (2.9% → 1.23% → 43% → 0.78%)

### Charts added to infrastructure.json
- Custom comparison tables for ships and governance bodies (via `comparisonTable` field)
