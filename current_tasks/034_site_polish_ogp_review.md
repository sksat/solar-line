# Task 034: Site Polish — OGP Meta Tags + Report Content Review (Codex)

## Status: DONE

## Objective
1. Add Open Graph Protocol (OGP) meta tags to all generated pages for better social media sharing
2. Consult Codex (nice-friend) for report content quality review
3. Address findings from quality review

## Changes Made

### OGP Meta Tags
- Added `og:title`, `og:description`, `og:type`, `og:site_name`, and `<meta name="description">` to all pages via `layoutHtml`
- Episode pages use truncated episode summary as description
- Summary pages use truncated report summary as description
- Index page has a custom project description
- Default fallback description for logs and other pages
- 5 new tests for OGP rendering

### Codex Quality Review (10 findings, 3 HIGH / 4 MEDIUM / 3 LOW)

**HIGH — Fixed:**
1. **EP03 digit error**: "14.36万km" → "約1,436万km" (exploration-02 summary)
2. **EP05 Hohmann verdict inconsistency**: `plausible` → `indeterminate` (matching ep01-04 baseline convention)
3. **EP05 provisional tone**: Added "※暫定" markers to transfer-02, transfer-03, transfer-04 explanations

**MEDIUM — Fixed:**
4. **Terminology**: ep04 "ブラキストクローネ" → "brachistochrone" (per CLAUDE.md convention)
5. **Cross-episode assertion**: "全話で物理的に成立可能" → "質量を数百tと仮定すれば全話で成立可能"

**Assessed but not changed (LOW or already appropriate):**
6. ep04 "完全に整合する" — refers to Voyager 2 observational data match (0.5%), justified
7. Non-specialist terminology (v∞, SOI, etc.) — deferred to future task (glossary)
8. Long sentences — style concern, deferred
9. English term annotations — deferred

## Test Results
- 685 TS tests + 52 Rust tests = 737 total (0 failures)
- 160 data validation tests pass
- Site builds: 5 episodes, 24 transfers, 1 summary, 7 logs

## Files Modified
- `ts/src/templates.ts` — OGP meta tags in layoutHtml, descriptions passed from render functions
- `ts/src/templates.test.ts` — 5 new OGP tests
- `reports/data/episodes/ep03.json` — Fixed digit error in navigation crisis summary
- `reports/data/episodes/ep04.json` — Fixed ブラキストクローネ → brachistochrone
- `reports/data/episodes/ep05.json` — Fixed verdict, added provisional markers, softened assertions
- `reports/data/summary/cross-episode.json` — Softened "成立可能" assertion

## Depends on
- Task 033 (Report data quality) — DONE
