# Task 247: Deepen Episode Content Validation Tests

## Status: DONE

## Description

Episode reports (1100-1800 lines each) had only 4-6 content tests vs summary reports (7-20 tests). Added deeper validation for core analytical values that should not silently drift.

## Tests Added (14)

### EP01 (+4, now 9 tests)
- ✅ Hohmann baseline ΔV: 10.15 km/s, ~3.1 years
- ✅ 150h normal route: mass boundary 1297t, 0.77g
- ✅ HUD cross-check: vis-viva 17.92 km/s vs onscreen 17.8 km/s, 0.67% error
- ✅ Perijove capture: ΔV 2.3 km/s, Oberth ratio 8.2x

### EP02 (+5, now 8 tests)
- ✅ Jupiter escape velocity at 50 RJ: 8.42 km/s
- ✅ Heliocentric speed 18.99 km/s vs solar escape 18.46 km/s
- ✅ Enceladus minimum capture ΔV: 0.61 km/s
- ✅ Hohmann baseline: 3.36 km/s, ~10 years
- ✅ Ballistic transit ~997 days vs trim thrust ~87 days

### EP05 (+5, now 11 tests)
- ✅ Oberth effect: ~3% efficiency gain at Jupiter flyby
- ✅ Without flyby: burn time 56h51m, nozzle exceeded by 73 min
- ✅ 300t scenario peak velocity: 7,604 km/s = 2.5%c
- ✅ LEO capture ΔV: 3.18 km/s vs moon orbit 0.42 km/s
- ✅ Oberth flyby saves 99 min of burn time

## Stats
- TS tests: 1,953 → 1,967 (+14)
- All 2,516 tests pass (0 failures)
