# Task 023: Episode 5 (Finale) Analysis

## Status: DONE

## Episode Info
- **Title**: SOLAR LINE Part5 END（ソーラーライン）【良いソフトウェアトーク劇場】
- **Niconico**: sm45987761
- **YouTube**: TBD (uploaded 2026-02-24, not yet on YouTube)
- **Duration**: 27:11
- **Upload date**: 2026-02-24
- **Note**: Series finale. Creator originally planned 4 parts, expanded to 5.

## Progress
- [x] Identify video IDs and metadata (Niconico API)
- [x] Add lunar constants to orbital.ts
- [x] Create ep05-analysis.ts (6 analysis functions, Codex design review)
- [x] Write ep05-analysis.test.ts (38 tests, all passing)
- [x] Build ep05.json report (5 transfers, 3 explorations, 2 orbital diagrams)
- [x] Update cross-episode consistency analysis for 5 episodes
- [x] Regenerate cross-episode.json
- [x] Whisper STT extraction: 164 lines (Task 036)
- [x] Speaker attribution: 5 speakers, 13 scenes, 113 dialogue entries (Task 009)
- [x] Report updated: 24 dialogue quotes, all 5 transfers linked to evidence
- [x] Summary updated: removed "暫定" markers, added actual EP05 parameters
- [x] Verdicts updated: transfer-03 and transfer-04 upgraded from "conditional" to "plausible"
- [x] All tests pass (830 TS + 79 Rust = 909 total)
- [x] Site builds: 5 episodes, 24 transfers, 3 summaries, 7 logs

## Key Analysis Results (Updated with Dialogue Data)
- **Route plan**: 4 burns over 507h (21.1 days), not pure brachistochrone
  - Burn 1: Uranus escape + cruise acceleration → 1500 km/s
  - Burn 2: Jupiter powered flyby (Oberth effect +3%)
  - Burn 3: Mars deceleration → Earth entry trajectory
  - Burn 4: Earth LEO 400km insertion (manual override)
- **Final speed**: 2100 km/s (nuclear torpedo evasion threshold)
- **Nozzle lifetime**: 55h38m remaining vs 55h12m needed (26min margin)
- **Navigation**: Stellar autonomous nav, 20km accuracy (vs 50m with beacons)
- **Political**: Earth shuts down all solar system navigation (700 ships affected)
- **Allies**: Muse (Enceladus) provides calibration signal, Rai (Ganymede) creates decoy tracks
- **Outcome**: LEO achieved, nozzle destroyed, "この船はもう飛べません"

## Files Created/Modified
- `ts/src/orbital.ts` — Added MU.MOON, EARTH_RADIUS, MOON_ORBIT_RADIUS, LEO_ALTITUDE
- `ts/src/ep05-analysis.ts` — 6 analysis functions
- `ts/src/ep05-analysis.test.ts` — 38 tests
- `reports/data/episodes/ep05.json` — Episode 5 report (complete)
- `reports/data/episodes/ep05_speakers.json` — 5 speakers
- `reports/data/episodes/ep05_dialogue.json` — 113 entries, 13 scenes
- `ts/src/cross-episode-analysis.ts` — Updated for 5 episodes
- `reports/data/summary/cross-episode.json` — Regenerated

## Depends on
- Task 020 (Episode 4 analysis) — DONE
- Task 021 (Cross-episode consistency) — DONE
- Task 036 (Whisper STT) — DONE
- Task 009 (Dialogue attribution) — DONE
