# Task 634: Add og:locale Meta Tag

Status: DONE

## Problem
Missing `og:locale` Open Graph meta tag. Social sharing previews don't indicate the content language.

## Solution
Added `<meta property="og:locale" content="ja_JP">` to the HTML template. Added E2E test verifying the tag.

## Files Modified
- `ts/src/templates.ts` — Added og:locale meta tag
- `ts/e2e/reports.spec.ts` — Added og:locale E2E test
