# Task 628: Add <main> Landmark to HTML Template

Status: DONE

## Problem
The HTML template in templates.ts wraps page content without a `<main>` landmark element. Screen readers and keyboard navigation tools rely on landmarks (`<main>`, `<nav>`, `<footer>`) to help users jump between page sections. The template already has `<nav>` and `<footer>` but is missing `<main>`.

## Solution
Wrap the main content area in a `<main>` element in the layout template function in templates.ts. Added E2E test verifying nav, main, and footer landmarks are present.

## Files Modified
- `ts/src/templates.ts` — Wrapped content in `<main>` tag
- `ts/e2e/reports.spec.ts` — Added semantic landmarks E2E test
