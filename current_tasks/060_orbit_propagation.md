# Task 060: Detailed Orbit Propagation Validation

## Status: TODO

## Motivation
Human directive: 大雑把な机上計算による分析の後に詳細な軌道伝搬も行ってみて検証するとよい。特に時間経過などの細かいパラメータについては。

## Scope
1. Add numerical orbit propagation to Rust core (Runge-Kutta or similar integrator)
   - Support central-body gravity + optional perturbations
   - Brachistochrone continuous-thrust propagation (flip-and-burn)
   - Time-stepping with configurable step size
2. WASM bindings for browser-reproducible propagation
3. Validate existing desk calculations:
   - EP01: 72h Mars→Ganymede brachistochrone — does flip point match halfway?
   - EP02: 455d ballistic Jupiter→Saturn — does arrival time match with gravity?
   - EP03: 143h Saturn→Uranus brachistochrone
   - EP05: composite route timing
4. Add propagation results to reports (overlay on orbital diagrams or separate comparison)

## TDD & Accuracy Verification (Human Directive)
- **Numerical integration accuracy estimation**: Each integrator step size / method must have documented error bounds
- **Energy conservation tests**: Total system energy (kinetic + potential) should be conserved in ballistic segments; write tests asserting energy drift stays below threshold
- **Test-first approach**: Write accuracy/conservation tests BEFORE implementing the integrator, then make them pass
- Example test: 2-body Keplerian orbit should conserve energy to <1e-10 relative error over 1000 orbits

## Notes
- Start simple: 2-body + constant thrust. Add N-body later if needed.
- Key validation: does the ship actually arrive at the stated destination in the stated time?
- Time-dependent parameters (planetary positions during transit) benefit most from propagation.
- This is a significant Rust engineering task — may need multiple sessions.

## Dependencies
- Existing: orbits.rs (vis-viva, brachistochrone), ephemeris.rs (planetary positions)
- New: integrator module, state propagation
