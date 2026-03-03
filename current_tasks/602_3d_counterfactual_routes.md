# Task 602: Add IF Counterfactual Routes to 3D Viewer

## Status: DONE

## Summary

Extend the 3D orbital viewer to show IF (counterfactual) routes alongside canonical transfer arcs. Currently only 2D SVG diagrams support multi-scenario display (via `DiagramScenario[]` and `TransferArc.scenarioId`). The 3D viewer shows canonical routes only.

## Scope

- Extend `TransferArcData` and `SceneData` types with scenario/IF fields
- Add IF arc definitions to `prepareEpisodeScene()` for relevant episodes
- Add scenario toggle UI to the 3D renderer (show/hide IF arcs)
- Update inline `__prepareScene` in templates.ts
- TDD approach: tests first

## Key Files

- `ts/src/orbital-3d-viewer-data.ts` — scene data preparation
- `ts/src/orbital-3d-viewer.js` — Three.js renderer
- `ts/src/report-types.ts` — types
- `ts/src/templates.ts` — inline scene prep + `renderViewer3D()`
- `ts/src/orbital-3d-viewer-data.test.ts` — data tests
- `reports/data/episodes/ep0[1-5].md` — 3d-viewer directives

## IF Scenarios per Episode (from 2D diagrams)

- **EP01**: Direct route (no Oberth maneuver) — already in ep01-diagram-03
- **EP02**: Enceladus (canonical) vs Rhea/Titan destination — ep02-diagram-04
- **EP03**: Titania (canonical) vs Miranda/Oberon destination — ep03-diagram-03
- **EP04**: Shield breakthrough (canonical) vs engine avoidance — ep04-diagram-03
- **EP05**: Jupiter flyby necessity — ep05-diagram-03

## Dependencies

- Task 601 (2D counterfactual diagrams) — DONE
- Task 587 (2D/3D alignment TDD) — DONE
