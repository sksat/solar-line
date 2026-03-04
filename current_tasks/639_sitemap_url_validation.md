# Task 639: Sitemap URL Validation E2E Test

Status: DONE

## Problem
Sitemap.xml is tested for structure but no test verifies that sitemap URLs actually resolve to existing pages.

## Solution
Added E2E test that parses sitemap.xml, extracts all `<loc>` URLs, verifies at least 20 entries exist, and spot-checks 4 sample URLs for 200 status.

## Files Modified
- `ts/e2e/reports.spec.ts` — Added sitemap URL resolution test
