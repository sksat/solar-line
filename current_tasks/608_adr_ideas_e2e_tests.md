# Task 608: E2E Tests for ADR and Ideas Pages

## Status: **DONE**

## Summary

Add Playwright E2E tests for the `/meta/adr/` and `/meta/ideas/` rendered pages on GitHub Pages. These are the only published pages without any automated E2E test coverage.

## Acceptance Criteria

- E2E tests verify ADR pages render without JavaScript errors
- E2E tests verify ideas pages render without JavaScript errors
- Tests check that ADR index links resolve correctly
- Tests check basic content rendering (headings, status badges)
- All tests pass in CI
