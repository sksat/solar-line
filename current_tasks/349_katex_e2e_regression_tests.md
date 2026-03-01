# Task 349: KaTeX E2E Regression Test Expansion

## Status: DONE

## Description
Expand KaTeX math rendering E2E tests to cover untested pages. Currently EP01, EP04, cross-episode, attitude-control, other-ships, and communications have KaTeX E2E tests but EP02, EP03, EP05, and ai-costs.md are missing coverage. Also verify no raw LaTeX leaks in rendered output.

## Scope
1. Add KaTeX E2E tests for EP02 (highest math density, 6 expressions)
2. Add KaTeX E2E tests for EP03 and EP05
3. Add KaTeX E2E test for ai-costs.md (28 expressions, 0 E2E tests)
4. Verify no raw LaTeX syntax leaks (unrendered $...$ in page text)

## Dependencies
- Task 214 (katex_e2e_tests) — DONE (original KaTeX E2E tests)
