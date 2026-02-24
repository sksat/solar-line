# Task 050: Saturn-Centric Enceladus Capture Diagram for EP02

## Status: DONE

## Motivation
Every planet system encounter in the series has a local-scale orbital diagram except Saturn:
- EP02: Jupiter-centric escape diagram ✓
- EP03: Uranus-centric Titania approach ✓
- EP04: Uranus-centric Titania departure ✓
- EP05: Earth-centric capture diagram ✓
- EP02: Saturn-centric Enceladus capture — **MISSING** → now DONE

The Enceladus capture is only shown in the heliocentric EP02 diagram, where Saturn's moons are invisible at that scale. Adding a Saturn-centric diagram shows the moon orbits and capture trajectory, completing the planet-system coverage.

## Results
- Added `ep02-diagram-03`: "土星中心座標: エンケラドス捕獲"
- Saturn-centric, sqrt scale, radiusUnit=km
- Shows: Saturn rings (D環 inner, F環 outer), Mimas, Enceladus (target), Tethys, Dione, Rhea, Titan
- Approach from 30 RS (1,808,040 km) with hyperbolic capture to Enceladus orbit
- Animated (200,000s duration) with capture burn marker (ΔV≥0.61 km/s)
- All moon mean motions included for orbital animation
- Codex review: confirmed sqrt scale, rings as visual reference, 30 RS approach
- Tests: 877 TS + 86 Rust = 963 total (0 failures)
- Build: successful, diagram renders correctly in ep-002.html

## Scope
1. Add a Saturn-centric orbital diagram (`ep02-diagram-03`) to ep02.json
   - Show major Saturn moons (Mimas, Enceladus, Tethys, Dione, Rhea, Titan)
   - Show Saturn rings (D環, F環) as subtle visual references
   - Show Enceladus capture trajectory (hyperbolic approach)
   - Animate the capture sequence with moon orbital motion
   - Add burn marker for capture ΔV (≥ 0.61 km/s from EP02 analysis)
2. Existing generic validation tests automatically cover new diagram
3. Build and verify report rendering — confirmed

## Depends on
- Task 008 (EP02 analysis) — DONE
- Task 014 (orbital diagram types) — DONE
- Task 040 (engine burn visualization) — DONE
