# Task 027: Report Quality Review (Round 2) — Codex Consultation

## Status: DONE

## Objective
Periodic report quality review as directed by CLAUDE.md. Used Codex consultation to review reports for readability, accuracy, and completeness. Fixed all high-priority issues found.

## Codex Review Findings (6 issues identified, ordered by severity)
1. **Transfer explanations rendered as raw text** — markdown not converted to HTML
2. **SVG marker ID collisions** — same orbit pair transfers share arrowhead IDs
3. **EP05 provisional status insufficient** — only in intro, not on cards
4. **Comparison table alignment** — `.numeric` class applied to text cells
5. **No prev/next episode navigation** — requires backtracking from deep pages
6. **Mobile layout risk** — calculator controls compress on narrow screens

## Changes Made
- [x] **Markdown in transfer explanations**: Now renders bold, lists, code via markdownToHtml()
- [x] **Markdown in episode/summary summaries**: Same treatment
- [x] **SVG marker IDs unique**: Arrow IDs now include transfer index (`-0`, `-1`, etc.)
- [x] **Animation pathIds match**: Updated animation JSON pathId generation to use same indexed format
- [x] **Smart numeric detection**: Comparison table cells only get `.numeric` class for actual numbers/measurements
- [x] **EP05 provisional badge**: `暫定分析` badge (verdict-indeterminate style) on episode title when summary contains 暫定
- [x] **Prev/next episode navigation**: Bottom nav bar with prev/next episode links + top link
- [x] **Mobile responsive**: Added `@media (max-width: 600px)` breakpoint for calculator and table layouts
- [x] **13 new tests**: Covers all changes (markdown in explanations, prev/next nav, provisional badge, numeric detection, marker IDs)
- [x] All 493 tests pass (was 480), Rust 52 pass

## Files Modified
- `ts/src/templates.ts` — All template improvements
- `ts/src/templates.test.ts` — 13 new tests
- `ts/src/build.ts` — Pass totalEpisodes to renderEpisode

## Depends on
- Task 025 (Report quality review round 1) — DONE
- Task 026 (Accessibility improvements) — DONE
