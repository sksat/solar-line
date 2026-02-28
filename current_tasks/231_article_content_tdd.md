# Task 231: Article Content TDD — Report Content Verification Tests

## Status: DONE

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

## Implementation

Created `ts/src/article-content-validation.test.ts` with 31 tests covering:

### Tech-overview stats freshness (7 tests)
- Task count matches current_tasks/ (with ±5 tolerance for lag)
- Rust test count in body text matches stats table
- Body task count matches stats table
- Total test count = sum of components
- All 3 integrator types mentioned
- Störmer-Verlet marked as ballistic only
- DAG viewer mentions WASM

### Per-episode article content (5 episodes, 16 tests total)
- EP01: 72h transit, mass boundary, ΔV, Mars→Ganymede route
- EP02: ~87d primary (not 455d), Jupiter/Saturn route
- EP03: 143h transit, Enceladus→Titania, 452.5t boundary
- EP04: 65% thrust, plasmoid exposure, Titania→Earth
- EP05: 507h composite, nozzle margin, LEO 400km, Uranus→Earth

### Cross-report consistency (6 tests)
- 9.8 MN thrust in ship-kestrel + cross-episode
- 48,000t mass in ship-kestrel + cross-episode
- 6.37 MN / 65% in ship-kestrel
- 24 transfers in tech-overview
- KESTREL constants ↔ SHIP_SPECS sync
- 全5話 referenced consistently

### Verdict summary (2 tests)
- Verdict counts sum to 24
- Zero implausible verdicts

### Design decisions resolved
- Separate test file: YES (`article-content-validation.test.ts`)
- Stats lag: task count allows ±5 tolerance; commit count not tested (changes too frequently)
- DAG awareness: NOT needed — tests are comprehensive enough without it
