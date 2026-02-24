# Task 132: 数式レンダリングのTDD回帰テスト

## Status: TODO

## Human Directive
「たまに数式のレンダリングが壊れている。TDD で修正することで維持するべき。」

## Scope
1. Identify current math rendering failures (audit all reports for broken `$...$` and `$$...$$`)
2. Add comprehensive regression tests for `extractMath()` and `markdownToHtml()` math handling
3. Test edge cases: nested delimiters, escaped dollars, math inside code blocks, adjacent math
4. Fix any currently broken math rendering
5. Add E2E (Playwright) tests that verify KaTeX renders correctly in the browser

## Technical Notes
- KaTeX v0.16.21 loaded from CDN in layoutHtml
- `extractMath()` in templates.ts protects math from HTML escaping
- Display math `$$...$$` handled at block level in `markdownToHtml()`
- Inline math `$...$` handled in `inlineFormat()` via extractMath
- Existing: 8 math rendering tests in templates.test.ts

## Dependencies
- Task 052 (KaTeX integration — DONE)
