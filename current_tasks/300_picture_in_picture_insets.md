# Task 300: Picture-in-Picture Inset Diagrams on Full-Route

## Status: DONE

## Description
Added picture-in-picture (PiP) inset sub-diagrams to the cross-episode full-route orbital diagram. Instead of requiring readers to scroll to separate standalone diagrams, the full-route heliocentric view now shows small inset windows that zoom into each planetary system at the waypoints.

## Changes
- **`ts/src/report-types.ts`**: Added `InsetDiagram` interface with position, centerLabel, orbits, transfers, anchor orbit, and scale settings. Added `insets?: InsetDiagram[]` to `OrbitalDiagram`.
- **`ts/src/templates.ts`**: Added `renderInsetDiagrams()` function that renders each inset as a 120×120px SVG sub-group with background rect, orbits, body dots, transfer arcs, center label, title, unit label, and a dashed connector line from the inset to the parent orbit position.
- **`reports/data/summary/cross-episode.md`**: Added 3 insets to the full-route diagram:
  - Jupiter system (top-right): hyperbolic approach → perijove → Ganymede capture
  - Saturn system (bottom-right): hyperbolic approach → Enceladus capture
  - Uranus system (bottom-left): approach → Titania capture
- **Tests**: +14 unit tests (renderInsetDiagrams), +1 article validation test, +3 E2E tests = 18 new tests
- **`ideas/full_route_enhancements.md`**: Marked RESOLVED — all enhancement ideas complete

## Test Results
- 2221 TS unit tests (was 2206)
- 222 E2E tests (was 219)
- 377 Rust tests (unchanged)
- Total: 2820 (was 2802)
