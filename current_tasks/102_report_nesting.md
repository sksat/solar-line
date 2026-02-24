# Task 102: Report Nesting for Long Analyses

## Status: TODO

## Motivation
Human directive: 各分析は、長くなってきたらレポートの切り分け方を見直したり、レポートをネストさせたりしてもよい。ネストさせる場合はネストの深さに気を付けることと、ヘッダの選択でもネストさせること。

## Scope
1. Design sub-report structure: allow an episode report to link to child reports for detailed sub-analyses
2. Update report types to support parent-child relationships
3. Update navigation (breadcrumbs, back links) for nested reports
4. Ensure header levels (h1-h6) are consistent with nesting depth
5. Apply to longest reports first (EP05 has 8 explorations, EP02 has 5 transfers)

## Notes
- Current structure: one JSON file per episode, all sections in one page
- Potential split: transfer-level sub-pages for deep explorations
- Must maintain SEO-friendly URLs and cross-linking
