# Task 339: 3D Orbital Visualization for Inclined Planes

## Status: DONE

## Description
Add interactive 3D visualization for cases where orbital planes don't align or where approach angles are oblique. TDD development required.

## Source
Human directive (AGENT_PROMPT.md phase 25): "軌道面が揃っていない天体を扱う場合や、軌道面に対して斜めに侵入するようなケースではグリグリできる3D可視化もあるとよい（もちろんシミュレーションも3Dで行う必要がある）。開発は TDD で行うこと。"

## Deliverables
- Interactive 3D orbital visualization (rotatable via Three.js)
- 3 preset scenes: Saturn ring crossing, Uranus approach, full route ecliptic
- TDD tests (20 unit + 6 E2E + 1 article content validation)
- Link from cross-episode report 3次元軌道解析 section

## Implementation
- `ts/src/orbital-3d-viewer-data.ts` — Pure data transformation module (Node.js-testable)
- `ts/src/orbital-3d-viewer.js` — Three.js browser module (scene rendering, OrbitControls, CSS2DRenderer labels)
- `ts/examples/orbital-3d.html` — Standalone viewer page with preset buttons
- Three.js loaded via CDN importmap (no npm dependency)
- Build copies orbital-3d-viewer.js to dist/
- Cross-episode.md links to interactive viewer from 3次元軌道解析 section

## Test Summary
- +20 unit tests (3 scene prepare functions × 7 assertions each)
- +6 E2E tests (page structure, preset buttons, viewer container, controls hint, aria-pressed, back link)
- +1 article content validation test (3D viewer link in cross-episode)
- All 2266 TS tests, 234 E2E tests pass
