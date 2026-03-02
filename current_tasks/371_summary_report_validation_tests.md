# Task 371: Summary Report Comprehensive Validation Tests

## Status: DONE

## Motivation

Episode reports have extensive structural validation in `report-data-validation.test.ts` (IDs, references, transfers, diagrams, etc.), but summary reports have minimal validation. Gaps include:

1. **Slug-filename consistency**: No test ensures `slug:` in frontmatter matches the `.md` filename stem
2. **Slug uniqueness across .md files**: Only `.json`+`.md` same-name clash is checked, not same-slug-different-filename
3. **All 9 summaries parse without error**: Build silently skips parse failures; no unit test catches this
4. **Nav manifest consistency**: No test verifies all summaries appear in the correct nav group (`summaryPages` vs `metaPages`)
5. **Full summary file iteration**: Only `cross-episode` is tested by name; others only via margin gauge and link tests

## Approach (TDD)

Write tests first in `report-data-validation.test.ts`, then verify all pass against current data.

## Tests to Add

1. All summary .md files in reports/data/summary/ parse without error
2. Each summary slug matches its filename stem
3. All slugs are unique across summary reports
4. Category values are valid ("analysis" | "meta" | undefined)
5. Nav manifest contains all expected summaries in correct groups
6. Every summary has at least one content section with heading and markdown

## Scope

- `ts/src/report-data-validation.test.ts` — new test section for summary validation
- No report content changes needed — tests should pass against current data
