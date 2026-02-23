# Task 008: Episode 2 Content Analysis

## Status: DONE

## Goal
Analyze orbital transfers depicted in Episode 2 of SOLAR LINE. Identify ΔV claims, evaluate plausibility, and generate report.

## Depends on
- Task 002 (orbital mechanics library)
- Task 005 (report pipeline)
- Task 006 (Episode 1 analysis — as template)

## Completed Work
1. **Research**: Identified Part 2 source (sm45407401 / YXZWJLKD7Oo), collected auto-generated subtitles
2. **Orbital constants**: Added Saturn, Uranus, Enceladus constants + escape/circular/hyperbolic velocity functions to orbital.ts
3. **Analysis code**: ep02-analysis.ts with 5 transfer analyses and 3 parameter explorations
4. **Tests**: 32 new tests, all passing (267/267 new tests pass; 3 pre-existing build test failures)
5. **Report**: ep02.json with 5 transfers, 3 explorations, 2 video cards, 8 dialogue quotes
6. **Site build**: ep-002.html generated successfully

## Key Findings
- **Jupiter escape at 50 RJ, 10.3 km/s**: PLAUSIBLE — exceeds escape velocity (8.42 km/s), v_inf ≈ 5.93 km/s
- **Solar system escape**: Ship is on a solar-hyperbolic trajectory (v_helio ≈ 18.99 > v_esc_sun ≈ 18.46)
- **Transit to Saturn**: ~455 days on natural trajectory, passes Saturn orbit on the way out
- **Saturn capture**: Minimum ΔV ≈ 0.61 km/s (achievable even with trim-only thrust at 300t mass)
- **"No correction burns" constraint**: Margin to solar escape is only 0.53 km/s — very tight, making the constraint realistic
- **500,000t vessel encounter**: Proximity ops at 0.12 km/s, 3 km — plausible intercept geometry

## Codex Consultation
- Confirmed analysis approach covers key orbital mechanics aspects
- Suggested patched-conic chain (Jupiter SOI exit → heliocentric arc → Saturn SOI entry)
- Calculated v_esc at 50 RJ ≈ 8.42 km/s independently (matches our code)
- Recommended including Saturn capture ΔV analysis (implemented)

## Files Modified/Created
- `ts/src/orbital.ts` — Added MU.SATURN, ORBIT_RADIUS.SATURN/URANUS, JUPITER_RADIUS, SATURN_RADIUS, ENCELADUS_ORBIT_RADIUS, escapeVelocity(), circularVelocity(), hyperbolicExcess()
- `ts/src/ep02-analysis.ts` — Full Episode 2 analysis module
- `ts/src/ep02-analysis.test.ts` — 32 tests for Episode 2 analysis
- `ts/src/report-types.ts` — Made computedDeltaV nullable (number | null)
- `ts/src/templates.ts` — Handle null computedDeltaV in transfer cards
- `reports/data/episodes/ep02.json` — Episode 2 report
- `ts/reports/data/episodes/ep02_lines.json` — Extracted dialogue (80 lines)
