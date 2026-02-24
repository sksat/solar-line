# Task 153: EP03 On-Screen Data Cross-Reference with Analysis

## Status: DONE

## Motivation

Task 150 extracted the richest on-screen data of any episode from EP03. The 6-phase
burn sequence (Saturn Escape → Cruise Burn → Exoplanar Alignment → MCC-1 → MCC-2 →
Capture Prep) with specific ΔV values and durations provides the most detailed
brachistochrone transfer data in the series. Cross-reference with EP03 orbital analysis.

## Key Findings

### Brachistochrone Symmetry
- Cruise Burn: 30:25:00 (109,500 s)
- Capture Prep: 30:25:30 (109,530 s)
- **30-second difference (0.03%)** — near-perfect symmetry

### Mass Cross-Check
- Cruise Burn: ΔV = 2990 km/s in 109,500 s → a = 27.3 m/s² = 2.78G
- At F = 9.8 MN → **mass = 359 t** (within existing 300-452t boundary)

### ΔV Budget
- Total: 5,984 km/s (existing analysis: 11,165 km/s)
- 47% reduction via gravity assist + coast optimization
- 57% of journey is coast (not pure brachistochrone)

### Navigation Crisis Triple Match
- Display: 1.43×10^7 km, Dialogue: 1436万km, Calculation: 14,393,613 km
- All match to <1%

### Route Name: SOLER LINE (作品タイトルの由来)

## Changes Made

- Created `reports/data/calculations/ep03_onscreen_crossref.json`
- Added `onScreenDataExploration` (ep03-exploration-04) to EP03 report

## Dependencies

- Task 150 (EP03 on-screen data) — DONE
- Task 015 (EP03 analysis) — DONE
