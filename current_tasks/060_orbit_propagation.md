# Task 060: Detailed Orbit Propagation Validation

## Status: IN PROGRESS (Session 2026-02-24)

## Motivation
Human directive: 大雑把な机上計算による分析の後に詳細な軌道伝搬も行ってみて検証するとよい。特に時間経過などの細かいパラメータについては。

## Progress

### Session 2026-02-24: Core integrator + EP01 validation ✅
- **propagation.rs**: RK4 integrator with 2-body gravity + thrust profiles
  - Ballistic, constant-prograde, brachistochrone (flip-and-burn)
  - PropState, IntegratorConfig, ThrustProfile types
  - propagate() (full trajectory), propagate_final() (memory-efficient)
  - energy_drift() accuracy monitor
  - circular_orbit_state(), elliptical_orbit_state_at_periapsis() helpers
- **16 TDD tests** all passing:
  - Energy conservation: LEO (1/100 orbits), elliptical (e=0.5/0.9), heliocentric (1/1000 orbits), Mars, Jupiter — all <1e-8
  - Angular momentum conservation <1e-10
  - Orbit return (position/velocity after 1 period)
  - RK4 4th-order convergence verified
  - EP01 72h brachistochrone: distance & arrival validation
- **WASM bindings**: propagate_ballistic, propagate_brachistochrone, propagate_trajectory (3 tests)

### Remaining
- ☐ EP02: 455d ballistic Jupiter→Saturn validation
- ☐ EP03: 143h Saturn→Uranus brachistochrone validation
- ☐ EP05: composite route timing validation
- ☐ Report integration (propagation results in reports/diagrams)
- ☐ Consider adaptive step size for better efficiency

## Scope
1. ✅ Add numerical orbit propagation to Rust core (RK4 integrator)
   - ✅ Support central-body gravity
   - ✅ Brachistochrone continuous-thrust propagation (flip-and-burn)
   - ✅ Time-stepping with configurable step size
2. ✅ WASM bindings for browser-reproducible propagation
3. Validate existing desk calculations:
   - ✅ EP01: 72h Mars→Ganymede brachistochrone
   - ☐ EP02: 455d ballistic Jupiter→Saturn
   - ☐ EP03: 143h Saturn→Uranus brachistochrone
   - ☐ EP05: composite route timing
4. ☐ Add propagation results to reports (overlay on orbital diagrams or separate comparison)

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
