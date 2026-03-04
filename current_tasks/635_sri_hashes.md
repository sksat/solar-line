# Task 635: Add SRI Hashes to CDN Resources

Status: DONE

## Problem
7 CDN resources (KaTeX CSS/JS/auto-render, Highlight.js CSS/JS, uPlot CSS/JS) used `crossorigin="anonymous"` but had no `integrity` attribute, leaving the site vulnerable to CDN supply-chain attacks.

## Solution
Generated SHA-384 SRI hashes for all 7 CDN resources and added `integrity="sha384-..."` attributes. Added E2E test verifying SRI presence (3+ links, 4+ scripts).

## Files Modified
- `ts/src/templates.ts` — Added integrity attributes to all CDN link/script tags
- `ts/e2e/reports.spec.ts` — Added SRI integrity E2E test
