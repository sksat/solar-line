# Task 231: Article Content TDD — Report Content Verification Tests

## Status: TODO

## Human Directive

単に記事の存在をチェックするのみのテストにはあまり意味が無い。Web ページとしての成立性検証（レンダリングが正しく行われているか、リンク先が機能しているか、など）と記事そのもののテストは論理的に意味が異なるもの。特に後者についてはテストの仕組みを既存のツール（Playwright など）に乗っかりにくいため、このプロジェクト内でメンテナンスする必要がある。その中で、記事内の検証を「テスト」として扱い、それによる TDD 的アプローチによる記事編集・自動テストによる記事の内容が検証されている状態の維持を行う。

## Goal

Distinguish between two categories of tests and build infrastructure for the second:

### Category 1: Web Page Rendering Tests (existing, Playwright)
- Does the page render without JS errors?
- Do links point to valid destinations?
- Are components (tables, KaTeX, diagrams) rendered correctly?
- These already exist in `ts/e2e/` — 126 tests.

### Category 2: Article Content Verification Tests (new)
- Are the numerical values in reports consistent with calculation outputs?
- Do parameter values cited in reports match the source data?
- Are cross-references between episodes consistent (mass, thrust, timeline)?
- Do dialogue quotes match the transcription data files?
- Are statistics (test counts, task counts) up to date?

## Approach

Build a report content verification test suite within the TS test infrastructure that:
1. Parses MDX report files
2. Extracts factual claims (numerical values, parameters, cross-references)
3. Validates them against source data (calculation files, transcription data, git metadata)
4. Runs as part of `npm test` (not Playwright) for fast feedback

## Related Existing Work

- Task 207: Episode↔summary consistency tests (34 tests) — this is a good foundation
- Task 220: Analysis reproduction framework (96 golden-file tests)
- Task 094: Transcription-report sync validation
- Various data validation tests in `ts/src/__tests__/`

## Design Questions

- Should content tests be a separate test file (e.g. `report-content-validation.test.ts`)?
- How to handle stats that change with each commit (task count, commit count)?
- Should the test suite be aware of the DAG to know which reports need re-validation?
