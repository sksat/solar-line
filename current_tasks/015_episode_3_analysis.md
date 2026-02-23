# Task 015: Episode 3 (Part 3) Analysis

## Status: DONE

## Goal
Analyze the orbital transfers depicted in SOLAR LINE Part 3, following the same methodology as Episodes 1 and 2.

## Video Sources
- YouTube: l1jjXpv17-E (Part 3)
- Niconico: sm45588149 (Part 3)

## Progress
- [x] Research Episode 3 content (video metadata, subtitle collection)
- [x] Extract dialogue lines (Phase 1) — 88 lines from VTT
- [x] Identify orbital transfers depicted (5 transfers)
- [x] Implement analysis in ep03-analysis.ts (28 tests, all passing)
- [x] Add Uranus constants (MU.URANUS, URANUS_RADIUS, TITANIA_ORBIT_RADIUS)
- [x] Create ep03.json report with Japanese text (5 transfers, 3 explorations, 2 diagrams, 10 quotes)
- [x] Add orbital diagrams (heliocentric Saturn→Uranus + Uranus-centric capture)
- [x] Run tests — 305 TS + 52 Rust = 357 total, 0 failures

## Key Findings
1. **Navigation error computation matches the anime precisely** — 1.23° at 14.72 AU → computed 14,393,613 km vs stated 14,360,000 km (0.2% difference)
2. **143h brachistochrone** needs ~11,165 km/s ΔV and 2.2G constant acceleration (106× Kestrel's thrust at 48,000t)
3. **Mass boundary**: ~452t feasible at 9.8 MN thrust — consistent with ep01's ~299t boundary
4. **Hohmann baseline**: ~27.3 years, 2.74 km/s — 143h is 1,674× faster
5. **Saturn departure from Enceladus**: 5.23 km/s ΔV to escape — plausible
6. **Cruise velocity 3000 km/s**: Consistent with brachistochrone average (2,791 km/s), light speed ~1%

## Architecture
- `ts/src/ep03-analysis.ts`: Analysis functions
- `ts/src/ep03-analysis.test.ts`: 28 tests (node:test)
- `ts/src/orbital.ts`: Added MU.URANUS, URANUS_RADIUS, TITANIA_ORBIT_RADIUS
- `crates/solar-line-core/src/constants.rs`: Added orbit_radius::URANUS
- `reports/data/episodes/ep03.json`: Report data
- `reports/data/episodes/ep03_lines.json`: 88 extracted dialogue lines

## Depends on
- Task 001-003 (infrastructure)
- Task 005 (report pipeline)
- Task 010 (Japanese reports)
- Task 014 (orbital diagrams)
