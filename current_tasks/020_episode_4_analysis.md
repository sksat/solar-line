# Task 020: Episode 4 Analysis

## Status: DONE

## Overview
Analyze orbital mechanics depicted in SOLAR LINE Episode 4 (Part 4).

- YouTube: 1cTmWjYSlTM
- Niconico: sm45851569

## Progress
- [x] Collect subtitle data (446 cues via yt-dlp)
- [x] Extract dialogue lines (Phase 1: 85 lines from VTT)
- [x] Analyze orbital transfers depicted in episode
- [x] Implement analysis functions (ep04-analysis.ts)
- [x] Write tests (31 tests, all passing)
- [x] Create episode report JSON (ep04.json — 5 transfers, 3 explorations, 2 diagrams, 14 quotes)
- [x] Build verified: 4 episodes, 19 transfers

## Key Findings
- **Titania approach timing**: 9h42m remaining, coolant fails in 12h — margin is real but razor-thin
- **Plasmoid encounter**: Uranus magnetic tilt 60° matches Voyager 2 data (59.7°) within 0.5%. Shield margin 6 min / 14 min total. Actual exposure 480 mSv — within ICRP emergency limits
- **Uranus departure**: 1.51 km/s ΔV from Titania orbit — easily achievable even at 65% thrust
- **Brachistochrone Uranus→Earth**: At 48,000t/65%thrust → ~105 days, 1,202 km/s ΔV. At 300t → ~8 days
- **Fleet intercept**: 5+ ships, 33h out → ~23h available after arrival. Speed requires 842-12,112 km/s depending on remaining distance
- **Damage constraints**: 3-4 burns available, exactly matching escape + brachistochrone (2-3) needs

## New Constants
- ORBIT_RADIUS.EARTH added to orbital.ts: 149,598,023 km (NASA)

## Depends on
- Task 006 pattern (episode analysis workflow)
- Task 004 (subtitle collection)
- Task 009 (dialogue extraction)
