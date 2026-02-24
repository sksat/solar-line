# Task 152: EP04 On-Screen Data Cross-Reference with Analysis

## Status: DONE

## Motivation

Task 151 extracted on-screen data from EP04 video frames. Cross-reference the
plasmoid zone parameters (180-340 nT, 0.8-2.3 cm⁻³, 2.1×10⁶ K) with existing
plasmoid analysis in Rust crate and EP04 report. Verify orbital parameters
(6.50 RU periapsis, 18.3 km/s) against vis-viva calculations.

## Key Findings

### Plasmoid Magnetic Field: On-Screen >> Rust Scenarios
- **On-screen**: 180-340 nT
- **Rust extreme scenario**: 50 nT (based on Voyager 2)
- **Ratio**: 3.6-6.8x higher than even the extreme case
- **Conclusion**: The show's plasmoid is much stronger than Voyager 2 data suggests,
  but the core conclusion (negligible momentum perturbation on 48,000t ship) is unchanged

### Density and Temperature: Consistent
- Density 0.8-2.3 cm⁻³ falls within Rust enhanced-extreme range
- Core temperature 2.1×10⁶ K matches solar corona level
- Proton thermal velocity 228 km/s >> ship velocity 18.3 km/s

### New Orbital Parameters (screen-only)
- Periapsis altitude: 6.50 RU (between Miranda and Ariel orbits)
- Intercept velocity: 18.3 km/s (below Uranus escape velocity, capture possible)
- Inclination: 2.1° (nearly equatorial — good for Titania approach)

### Burns Timeline Discrepancy Resolved
- Screen (02:38): 1-2 burns maximum (pre-plasmoid, pessimistic)
- Dialogue (17:16): 3-4 burns (post-Titania repair, improved)
- Shield 63% = cooling 63% suggests coupled degradation

## Changes Made

- Created `reports/data/calculations/ep04_onscreen_crossref.json`
- Added `onScreenDataExploration` (ep04-exploration-04) to EP04 report
- Updated Task 152 status to DONE

## Dependencies

- Task 151 (EP04 on-screen data) — DONE
- Task 020 (EP04 analysis) — DONE
