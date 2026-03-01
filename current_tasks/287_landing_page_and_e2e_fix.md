# Task 287: Landing Page Summary Cards + E2E Bug Fix

## Status: DONE

## Motivation

1. **E2E bug**: `reports.spec.ts` line 379 used `ep.slug` which doesn't exist on the manifest episode type (only `ep.path` exists). This caused the "no NaN in video timestamp links" test to navigate to `/episodes/undefined.html` — silently passing because an error page also has 0 NaN links.

2. **Landing page UX**: Summary analysis pages were listed as a plain `<ul>` with just titles, while episode pages got styled cards with summaries and metadata. This was an inconsistency in visual presentation.

## Changes

1. **E2E fix**: Changed `ep.slug` to `ep.path` in the NaN-in-links regression test
2. **Landing page**: Summary pages now render as a responsive grid of cards (`.summary-card`) with page descriptions, matching the episode card style
3. **Type update**: Added `summary` field to `SiteManifest.summaryPages` type
4. **Build update**: `buildManifest()` now includes summary text from `SummaryReport.summary`
5. **CSS**: Added `.summary-cards` grid layout (auto-fill, min 280px columns)
6. **Test fixes**: Updated test data to include required `summary` field

## Verification

- TypeScript typecheck passes (0 errors)
- All 2,147 TS unit tests pass
- Build produces correct output with summary cards and descriptions
