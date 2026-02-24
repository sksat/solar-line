# Task 147: EP01 On-Screen Data Cross-Reference with Analysis

## Status: DONE

## Motivation

Task 146 extracted precise orbital parameters from EP01's on-screen navigation displays.
These should be cross-referenced with our existing EP01 analysis to:
1. Validate computed values against in-show depiction
2. Add new parameters (110% thrust, V∞, azimuth) to the analysis
3. Update the EP01 report with screenshot-sourced evidence

## Key Findings

### V∞ Verification — 0.67% Error
- On-screen: v = 17.8 km/s at 20 RJ, V∞ = 12.0 km/s
- Computed: v = 17.92 km/s at 20 RJ (vis-viva with V∞ = 12.0)
- **Difference: 0.12 km/s (0.67%)** — navigation display is physically accurate

### Perijove Capture — Minimum ΔV via Oberth Effect
- -2.3 km/s burn at 1.5 RJ drops velocity from 50.07 to 47.77 km/s
- Escape velocity at 1.5 RJ = 48.61 km/s
- **Ship velocity drops BELOW escape** → captured into bound Jupiter orbit
- This is the near-minimum ΔV for capture from V∞=12.0 km/s at this perijove

### Ganymede Approach
- After capture, ship passes through Ganymede orbit at 12.48 km/s
- Ganymede orbital velocity: 10.88 km/s
- Relative velocity: 1.60 km/s — manageable for final approach burn

### Mars Departure Distance
- 52° apparent diameter → ~6,950 km from center (~560 km above surface)
- Consistent with being just past the 50,000 km RCS-only zone

### Thrust Linearity
- 65% → 6.3 MN, 100% → 9.8 MN, 110% → 10.7 MN
- Relationship is nearly linear across the full range

## Changes Made

- Added `ep01-exploration-04` to EP01 report (HUD data cross-reference)
- Added `ep01-quote-07` (110% thrust) and `ep01-quote-08` (Mars diameter)
- Created `reports/data/calculations/ep01_onscreen_crossref.json`

## Dependencies

- Task 146 (video frame OCR) — DONE
- Task 006+013 (EP01 analysis) — DONE
