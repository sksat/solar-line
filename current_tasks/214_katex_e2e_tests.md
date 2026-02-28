# Task 214: KaTeX math rendering E2E regression tests

## Status: DONE

## Description

CLAUDE.md explicitly calls for "TDD-based regression tests to catch and prevent [KaTeX] rendering issues."
Currently zero E2E tests verify math rendering. Add Playwright tests to catch regressions.

## Tests

- [ ] KaTeX renders on EP01 (has inline math like `$m \leq ...$`)
- [ ] No raw LaTeX syntax leaks into body text
- [ ] Cross-episode summary page has KaTeX rendering
- [ ] Display math (`$$...$$`) renders correctly
