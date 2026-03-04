# Task 624: Log Page Spot-Check E2E Tests

Status: DONE

## Problem
Only the logs index page is tested by E2E tests. Individual log pages (17 pages) have no rendering verification. A broken template or missing stylesheet would go undetected.

## Solution
Add E2E tests that spot-check a sample of individual log pages for:
- Page loads without JS errors
- Has h1 heading
- Has nav element
- Has substantive content (session log text)

## Files to Modify
- `ts/e2e/reports.spec.ts` — Add log page spot-check tests
