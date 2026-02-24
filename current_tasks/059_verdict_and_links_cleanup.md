# Task 059: Verdict Policy & External Source Links Cleanup

## Status: DONE

## Motivation
Human directives:
- 参考計算には判定不能フラグは要らんのでは？
- 外部出典もリンクを踏めるようにしてほしい

## Scope

### 1. Verdict Policy Cleanup
- Review `science-accuracy.json` verification table: remove "indeterminate" status from reference calculations that don't directly compare to in-story depictions
- Specifically: items with `accuracyPercent: null` that are reference calculations (not depicted values) should use a more appropriate status
- Update the VerificationStatus type or add documentation if needed

### 2. External Source Links
- Audit all `source` and `sourceRef` fields in report JSONs
- Convert plain-text source references to clickable URLs where possible:
  - NASA NTRS papers → direct URLs
  - JPL data → links to JPL databases
  - Specific episodes → already handled by episode cross-links
- Update `renderSourceRef()` in templates.ts if needed to handle new URL patterns
- Ensure the verification table `source` column renders URLs as links

## Notes
- The `renderSourceRef()` function already handles URLs and Niconico IDs
- Some sources like "算術検証" (arithmetic verification) don't need URLs
- NASA NTRS papers have stable URLs (e.g., https://ntrs.nasa.gov/citations/...)
