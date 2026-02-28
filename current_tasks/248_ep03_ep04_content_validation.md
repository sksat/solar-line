# Task 248: Deepen EP03 and EP04 Content Validation Tests

## Status: DONE

## Description

EP03 and EP04 had only 4 tests each. Added deeper validation for core analytical values.

## Tests Added (10)

### EP03 (+5, now 9 tests)
- ✅ Hohmann baseline: 2.74 km/s, ~27.3 years
- ✅ Saturn escape ΔV: 5.23 km/s from Enceladus orbit
- ✅ Peak velocity: 5,583 km/s (1.86% c)
- ✅ Navigation crisis: 1.23° error at 14.72 AU = ~1,436万km
- ✅ Saturn orbital velocity: 9.62 km/s (gravity assist)

### EP04 (+5, now 9 tests)
- ✅ Hohmann baseline: 15.94 km/s, ~16.1 years
- ✅ Titania escape ΔV: 1.51 km/s
- ✅ Magnetic shield: 14 min remaining vs 8 min plasmoid passage
- ✅ Uranus magnetic axis offset: 60°
- ✅ Radiation dose dialogue: 480 mSv

## Stats
- TS tests: 1,967 → 1,977 (+10)
- All 2,526 tests pass (0 failures)

## Summary

All 5 episodes now have 8-11 content validation tests each (up from 3-6), covering core ΔV values, Hohmann baselines, mission-critical parameters, and key dialogue citations.
