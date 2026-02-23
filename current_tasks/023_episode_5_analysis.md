# Task 023: Episode 5 (Finale) Analysis

## Status: PARTIAL (preliminary — awaiting subtitle data)

## Episode Info
- **Title**: SOLAR LINE Part5 END（ソーラーライン）【良いソフトウェアトーク劇場】
- **Niconico**: sm45987761
- **YouTube**: TBD (uploaded 2026-02-24, not yet on YouTube)
- **Duration**: 27:11
- **Upload date**: 2026-02-24
- **Note**: Series finale. Creator originally planned 4 parts, expanded to 5.

## Progress
- [x] Identify video IDs and metadata (Niconico API)
- [x] Add lunar constants (MU.MOON, EARTH_RADIUS, MOON_ORBIT_RADIUS, LEO_ALTITUDE) to orbital.ts
- [x] Create ep05-analysis.ts (6 analysis functions, Codex design review)
- [x] Write ep05-analysis.test.ts (38 tests, all passing)
- [x] Build ep05.json report (5 transfers, 3 explorations, 2 orbital diagrams)
- [x] Update cross-episode consistency analysis for 5 episodes
- [x] Regenerate cross-episode.json
- [x] All tests pass (466 TS + 52 Rust = 518 total)
- [x] Site builds successfully (5 episodes, 24 transfers, 1 summary)
- [ ] Collect subtitles (VTT from YouTube) — BLOCKED: video not on YouTube yet
- [ ] Extract dialogue lines (Phase 1) — BLOCKED on subtitles
- [ ] Speaker attribution (Phase 2) — BLOCKED on Phase 1
- [ ] Update report with actual dialogue quotes and timestamps
- [ ] Verify/update analysis parameters from actual episode content

## Key Analysis Results (Preliminary)
- **Hohmann baseline**: 16.1 years, 15.94 km/s total ΔV
- **Brachistochrone @300t**: 8.3 days, 15,207 km/s ΔV, 2.17G
- **Brachistochrone @48,000t**: 105 days, 1,202 km/s ΔV, 0.014G
- **Earth capture (v∞=0)**: LEO 3.18 km/s, Moon orbit 0.42 km/s
- **Burn budget**: 3 minimum (brach 2 + capture 1), available 2-3
- **Full route**: ~35.9 AU total, Mars→Ganymede→Jupiter→Enceladus→Titania→Earth

## Files Created/Modified
- `ts/src/orbital.ts` — Added MU.MOON, EARTH_RADIUS, MOON_ORBIT_RADIUS, LEO_ALTITUDE
- `ts/src/ep05-analysis.ts` — 6 analysis functions
- `ts/src/ep05-analysis.test.ts` — 38 tests
- `reports/data/episodes/ep05.json` — Episode 5 report (preliminary)
- `ts/src/cross-episode-analysis.ts` — Updated for 5 episodes
- `ts/src/cross-episode-analysis.test.ts` — Updated episode count
- `reports/data/summary/cross-episode.json` — Regenerated

## Next Session TODO
1. Check if YouTube upload has happened → collect subtitles
2. If subtitles available: extract dialogue, update report with actual quotes
3. If not: try alternative subtitle sources (manual transcription from video)
4. Update analysis parameters based on actual ep05 dialogue/events
5. Remove "暫定" markers from report

## Depends on
- Task 020 (Episode 4 analysis) — DONE
- Task 021 (Cross-episode consistency) — DONE
