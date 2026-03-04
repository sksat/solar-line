# Task 637: Add Canonical URL and og:url Meta Tags

Status: DONE

## Problem
Missing `<link rel="canonical">` and `<meta property="og:url">`. Without these, search engines may index duplicate URLs and social sharing previews lack canonical references.

## Solution
Added optional `canonicalPath` parameter to `layoutHtml()`. When provided, emits both `og:url` and `link rel="canonical"` with the full GitHub Pages URL. Applied to landing page, episode pages, summary pages, transcription pages, calculator, and explorer.

## Files Modified
- `ts/src/templates.ts` — Added canonicalPath parameter and og:url/canonical tags
- `ts/e2e/reports.spec.ts` — Added canonical URL E2E test
