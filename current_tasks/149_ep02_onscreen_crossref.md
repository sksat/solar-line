# Task 149: EP02 On-Screen Data Cross-Reference with Analysis

## Status: DONE

## Motivation

Task 148 extracted on-screen data from EP02 video frames. Cross-reference with
existing EP02 analysis to validate parameters and add new infrastructure findings.

## Key Findings

### Subtitle vs HUD Verification
- **Relative velocity 0.12 km/s**: Exact match between HUD display (-0.12 km/s),
  subtitle (0.12 km/s), and dialogue data. Sign difference indicates approach direction.
- **Jupiter departure 10.3 km/s**: Confirmed by subtitle and dialogue, but no HUD display
  (this scene uses location labels, not navigation panels).

### Ship Infrastructure Data (NEW)
- **Kestrel ship ID**: MTS-9907/EXT-P17 (Mars Transport Ship 9907 / Exterior Path 17)
- **Operating system**: MARS PORT AUTHORITY (火星港湾公社)
- **Alert system**: COIAS (shares name with real-world Subaru Telescope asteroid detection system)
- **Large ship ID**: MPA-MC-SCV-02814 (Mars Port Authority registry — confirms fire-mars origin)
- **OVERS BURN**: Overshoot correction maneuver (parallel concept to EP01's PERIJOVE OVERSHOT CORRECTION)

### Jurisdiction Structure
- Jupiter system: 木星港湾公社 / 木星圏
- Saturn system: 国際連合・火星自治連邦保護領 / 土星圏
- "保護領" (protectorate) suggests sparse population in Saturn frontier

### Detection Method
- Stellar occultation for dark ship detection — real astronomical technique applied to SF context

## Changes Made

- Created `reports/data/calculations/ep02_onscreen_crossref.json`
- Added `onScreenDataExploration` (ep02-exploration-05) to EP02 report
- Updated Task 149 status to DONE

## Dependencies

- Task 148 (EP02 on-screen data) — DONE
- Task 008 (EP02 analysis) — DONE
