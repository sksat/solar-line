# Task 229: E2E Tests for Other-Ships and Infrastructure Pages

## Status: DONE

## Goal
Add Playwright E2E tests for the `other-ships` and `infrastructure` summary pages.
These are the only summary pages without dedicated E2E test coverage.

## Context
- 114 E2E tests exist covering episode reports, transcription, KaTeX, side-view diagrams, animations
- The other-ships and infrastructure summary pages have no dedicated E2E tests
- CLAUDE.md requires Playwright E2E tests to catch broken rendering and layout issues

## Acceptance Criteria
- [x] E2E tests for infrastructure.md page rendering (5 tests: sections, spaceports, governance table, cross-links, beacon systems)
- [x] E2E tests for other-ships.md page rendering (7 tests: ship categories, orbital diagram, KaTeX math, tables, glossary, cross-links, nuclear torpedo section)
- [x] Tests verify no broken links, images, or layout issues
- [x] All existing tests continue to pass (126 total E2E, 1819 unit)
- [x] CI green
