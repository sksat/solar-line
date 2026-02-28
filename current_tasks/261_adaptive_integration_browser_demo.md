# Task 261: Adaptive Integration Browser Demo

## Status: DONE

## Priority: HIGH

## Objective
Create an interactive browser demo page for the orbital propagation WASM functions (RK45 Dormand-Prince, Störmer-Verlet symplectic, and fixed-step RK4). Of the ~90+ WASM-exported functions, only 8 are used browser-side. This demo addresses the massive export-to-usage gap and fulfills DESIGN.md's requirement for browser-reproducible analysis.

## Context
- CLAUDE.md: "Each interactive library should have standalone example HTML pages"
- DESIGN.md: "wasm にビルドしてレポートでの再現が可能になるようにすること"
- Existing example pages: `ts/examples/` (orbital-animation, uplot-chart, dag-viewer, duckdb-explorer, bar-chart)
- WASM propagation exports: `propagate_ballistic`, `propagate_brachistochrone`, `propagate_trajectory`, `propagate_adaptive_ballistic`, `propagate_adaptive_brachistochrone`, `propagate_symplectic_ballistic`
- Also ephemeris: `planet_position`, `planet_longitude`, etc.

## Scope
1. Standalone HTML example page: `ts/examples/propagation-demo.html`
2. Browser JS module: `ts/src/propagation-demo.js`
3. Features:
   - Select integrator (RK4, RK45, Störmer-Verlet)
   - Configure initial conditions (preset scenarios from episode transfers)
   - Visualize trajectory in 2D SVG
   - Compare integrator accuracy (energy drift) and step counts
   - Show planetary orbits as reference
4. E2E test for the demo page
5. Build pipeline integration (copy JS + HTML to dist)

## Remaining Work
- See scope above

## Acceptance Criteria
- [ ] Demo page loads and renders without errors
- [ ] All three integrators work and produce visible trajectories
- [ ] Energy drift comparison shows numeric values
- [ ] Episode preset scenarios load correctly
- [ ] E2E test passes
- [ ] Existing tests remain green
