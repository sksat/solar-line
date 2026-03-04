# Task 603: 3D Counterfactual Routes — E2E Tests + Full Route + EP01/EP05

## Status: DONE

## Summary

Task 602 added IF counterfactual routes to Saturn and Uranus local scenes. This task completes coverage:
1. E2E tests for the 3D scenario toggle UI (no Playwright coverage yet)
2. Full-route scene IF routes (cross-episode summary 3D viewer has no counterfactuals)
3. EP01 direct-route IF scenario in episode-1 3D scene
4. EP05 Jupiter flyby necessity IF in uranus-approach or episode-5 scene

## Key Files

- `ts/e2e/examples.spec.ts` — 3D viewer E2E tests
- `ts/src/orbital-3d-viewer-data.ts` — scene data
- `ts/src/orbital-3d-viewer-data.test.ts` — data unit tests
- `ts/src/orbital-3d-viewer.js` — renderer
- `ts/src/templates.ts` — inline scene prep

## Dependencies

- Task 602 (3D IF counterfactual routes) — DONE
