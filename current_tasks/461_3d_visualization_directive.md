# Task 461: Implement 3D Interactive Visualization Directive

## Status: DONE

## Human Directive (Phase 27)

> 3次元的な変化などの可視化は、Three.js などを使って3D drag 可能な可視化にすること。履歴の可視化の場合は2Dの場合と同様にアニメーション可能であるとよりよい。TDD で開発すること。

## Context

Existing 3D infrastructure:
- `ts/examples/orbital-3d.html` — standalone Three.js 0.170.0 viewer with OrbitControls (drag/zoom/pan)
- 3 preset scenes: full route, Saturn ring plane, Uranus approach
- Timeline animation already works for the full-route scene (time slider)
- Data: `reports/data/calculations/3d_orbital_analysis.json`
- Pipeline: `orbital-3d-analysis.ts` → JSON → `orbital-3d-viewer-data.ts` → `orbital-3d-viewer.js`
- Tests: 65 unit tests (23+17+25) + 9 E2E structural tests

The directive says 3D-appropriate data should use Three.js with drag interaction, and historical (time-series) visualizations should support animation. TDD required.

## Plan

1. **Update CLAUDE.md** with the 3D visualization policy from the directive
2. **Identify current 2D charts that would benefit from 3D** — e.g., Z-height ecliptic profile (currently 2D timeseries in cross-episode report)
3. **Embed 3D viewer in reports** — currently only on standalone page; episode/summary reports could embed interactive 3D scenes inline
4. **Add animation to remaining 3D scenes** — Saturn ring and Uranus approach scenes lack time animation
5. **TDD throughout** — write tests first for each new capability

## Scope Note

This is a broad directive that may span multiple tasks. This task covers the initial implementation: embedding a 3D viewer component in the cross-episode report for the ecliptic-plane height visualization (replacing/augmenting the 2D Z-height timeseries), with TDD. Future tasks can extend to episode-level embedding and additional 3D scenes.
