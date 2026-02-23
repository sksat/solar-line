# Task 025: Report Quality Review & Full-Route Diagram

## Status: DONE

## Changes Made

### Report Quality Fixes
1. **EP01: Added YouTube video card** — CQ_OkDjEwRk was missing from ep01.json
2. **EP05: Fixed title duplication** — title field contained "第5話（最終話）:" which duplicated template's "第N話:" prefix. Fixed to follow "SOLAR LINE Part N" convention.
3. **Dialogue lines: Fixed file locations** — ep02-04 `_lines.json` files were in `ts/reports/data/episodes/` instead of `reports/data/episodes/`. Moved to correct location and removed stale `ts/reports/` directory.
4. **Quality audit**: Comprehensive review of all 5 episode reports found no other issues. Reports are production-ready (ep05 appropriately marked as preliminary).

### Full-Route Orbital Diagram (Codex-reviewed design)
5. **SummarySection type extended** — Added `orbitalDiagrams?: OrbitalDiagram[]` field to allow diagrams within summary sections (Option B per Codex review).
6. **Summary template updated** — renderSummaryPage now renders orbital diagrams within sections and includes animation script when diagrams are animated.
7. **Full-route diagram created** — Heliocentric log-scale diagram showing ケストレル号's complete ~35.9 AU journey (Mars→Jupiter→Saturn→Uranus→Earth) with animated transfer arcs for all 4 legs. Added to 航路の連続性 section of cross-episode.json.
8. **3 new tests** — Template tests for diagram rendering in summary sections, animation script inclusion, and no-animation case.

## Test Counts
- 52 Rust (41 core + 11 WASM) + 469 TS = 521 total (0 failures)

## Files Modified
- `ts/src/report-types.ts` — Added orbitalDiagrams to SummarySection
- `ts/src/templates.ts` — Updated renderSummaryPage for diagrams + animation script
- `ts/src/templates.test.ts` — 3 new tests
- `reports/data/episodes/ep01.json` — Added YouTube video card
- `reports/data/episodes/ep05.json` — Fixed title
- `reports/data/episodes/ep02_lines.json` — Moved from ts/reports/
- `reports/data/episodes/ep03_lines.json` — Moved from ts/reports/
- `reports/data/episodes/ep04_lines.json` — Moved from ts/reports/
- `reports/data/summary/cross-episode.json` — Added full-route orbital diagram
