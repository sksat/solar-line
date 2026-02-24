# Task 043: Full-Route Orbital Diagram & EP05 Lines Fix

## Status: DONE

## Motivation

1. **EP05 `ep05_lines.json` gap**: EP01-04 all have Phase 1 extraction files committed to `reports/data/episodes/`, but EP05's `ep05_lines.json` only exists in gitignored `raw_data/whisper/`. This breaks the consistency of the two-phase dialogue pipeline and prevents future sessions from inspecting EP05's source extraction without re-running Whisper.

2. **Cross-episode full-route diagram**: The cross-episode summary report describes the full 5-episode route (Mars → Ganymede → Jupiter escape → Enceladus → Titania → Earth, 35.9 AU total) in the "航路の連続性" section, but has no orbital diagram. The `SummarySection` type already supports `orbitalDiagrams`, and individual episode reports all have diagrams. A full-route heliocentric diagram would visually unify the entire journey.

## Changes

### Part A: EP05 Lines Fix
- [x] Copied `raw_data/whisper/ep05_lines.json` to `reports/data/episodes/ep05_lines.json`
- [x] All 830 TS tests pass (no validation test changes needed)

### Part B: Full-Route Orbital Diagram
- [x] Designed heliocentric diagram showing all 5 planetary orbits (Earth, Mars, Jupiter, Saturn, Uranus)
- [x] Added 4 transfer arcs with distinct episode colors (Codex-reviewed):
  - EP01 Mars→Jupiter: #3fb950 (green, brachistochrone)
  - EP02 Jupiter→Saturn: #8b949e (gray, ballistic/hyperbolic)
  - EP03 Saturn→Uranus: #ff6600 (orange, brachistochrone)
  - EP05 Uranus→Earth: #ff4444 (red, composite brachistochrone)
- [x] EP05 shown as canonical route (Codex recommendation: EP04 theoretical route omitted)
- [x] Animation with compressed timing (520,000s timeline) — each leg gets visible animation time
- [x] 10 burn markers: EP1 accel/decel, EP2 escape/capture, EP3 accel/decel, EP5 escape/flyby/decel/capture
- [x] Planetary positions from computed 2241-2242 ephemeris (consistent with episode diagrams)
- [x] Site builds and renders correctly

## Depends on
- All episode analyses (Tasks 006-023) — DONE
- Orbital diagram infrastructure (Tasks 014, 019, 040) — DONE
- Cross-episode summary (Task 021) — DONE
