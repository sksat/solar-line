# Task 609: Jupiter Capture 3D Scene with IF Counterfactual Routes

## Status: **DONE**

## Summary

Add a dedicated Jupiter-centric 3D scene for EP01, showing the canonical perijupiter capture (1.5 RJ) and IF high-altitude capture at Ganymede orbit. This fills a gap where EP02 (Saturn), EP03 (Uranus), and EP05 all have local scenes with IF scenario toggles, but EP01 does not.

## Background

EP01's analysis includes:
- ep01-diagram-04: "IF分析: ペリジュピター捕獲 vs 高高度捕獲" (2D only)
- ep01-exploration-05: Perijupiter vs Ganymede orbit altitude capture
- Canonical: 1.5 RJ, ΔV = 2.3 km/s (Oberth effect), V∞ = 12 km/s
- IF: 15.1 RJ (Ganymede orbit), ΔV = 4.13 km/s (no Oberth benefit)

## Acceptance Criteria

- `prepareJupiterCaptureScene()` function in orbital-3d-viewer-data.ts
- Shows Jupiter as central body with Galilean moons (Io, Europa, Ganymede, Callisto)
- Canonical scenario: Mars approach → deep perijupiter capture (1.5 RJ) → Ganymede transfer
- IF scenario: Mars approach → direct high-altitude capture at Ganymede orbit
- Scenario toggle UI (following Saturn/Uranus pattern)
- Unit tests for the new function
- Registered in orbital-3d.html and templates.ts inline viewer
- E2E test verifying the scene renders

## Dependencies

- Task 602 (DONE) — IF counterfactual routes pattern
- Task 607 (DONE) — target collision offset fix

## Key Files

- `ts/src/orbital-3d-viewer-data.ts` — new scene function
- `ts/src/orbital-3d-viewer-data.test.ts` — unit tests
- `ts/examples/orbital-3d.html` — standalone viewer registration
- `ts/src/templates.ts` — inline viewer scene list
