# Task 053: Playwright E2E Tests for Report Rendering

## Status: TODO

## Motivation
Human directive: Markdown の表が壊れるなど表示が壊れている。Playwright E2E test を組むなどして防ぐこと。

## Scope
1. Add Playwright as dev dependency
2. Create E2E test suite that:
   - Builds the site
   - Opens each page in headless browser
   - Verifies markdown tables render correctly
   - Checks orbital diagrams render (SVG visible)
   - Verifies no JS errors on pages with WASM/animation
   - Checks responsive layout
3. Add to CI pipeline
4. Use Playwright CLI for debugging

## Notes
- This catches rendering bugs that unit tests can't detect
- Focus on visual correctness, not pixel-perfect screenshots
