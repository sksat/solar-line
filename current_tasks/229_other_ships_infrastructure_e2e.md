# Task 229: E2E Tests for Other-Ships and Infrastructure Pages

## Status: IN PROGRESS

## Goal
Add Playwright E2E tests for the `other-ships` and `infrastructure` summary pages.
These are the only summary pages without dedicated E2E test coverage.

## Context
- 114 E2E tests exist covering episode reports, transcription, KaTeX, side-view diagrams, animations
- The other-ships and infrastructure summary pages have no dedicated E2E tests
- CLAUDE.md requires Playwright E2E tests to catch broken rendering and layout issues

## Acceptance Criteria
- [ ] E2E tests for infrastructure.md page rendering (headings, content, navigation)
- [ ] E2E tests for other-ships.md page rendering (headings, content, sections)
- [ ] Tests verify no broken links, images, or layout issues
- [ ] All existing tests continue to pass
- [ ] CI green
