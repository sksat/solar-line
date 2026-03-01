# Task 360: Integrate EP04 Onscreen Crossref Findings into Report

## Status: DONE

## Description
The EP04 onscreen crossref data (`ep04_onscreen_crossref.json`) contains significant unintegrated findings:

1. **Burns-remaining discrepancy**: HUD shows "1-2 BURNS MAXIMUM" (02:38, pre-plasmoid) vs dialogue "3-4回" (17:16, post-repair). Timeline reconciliation proves Titania repairs doubled the burn prognosis.
2. **Onscreen plasmoid parameters vs Rust model**: B-field 180-340 nT is 3.6-6.8× the Rust extreme scenario (50 nT). Plasma density and temperature within expected ranges.
3. **Intercept velocity 18.3 km/s and periapsis 6.50 RU**: HUD-only values confirming gravitational binding and placement between Miranda/Ariel orbits.
4. **Navigation mode CS > INERTIAL (BEACON UNAVAIL)**: Connection to EP03 navigation crisis.

## Changes
- `reports/data/episodes/ep04.md`: New explorations with crossref analysis
- `ts/src/article-content-validation.test.ts`: TDD content tests
- `reports/data/summary/tech-overview.md`: Stats refresh
