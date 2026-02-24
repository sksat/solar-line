# Task 060: Detailed Orbit Propagation Validation

## Status: DONE

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

### Session 2026-02-24 (cont): EP02-EP05 validation + report integration ✅
- **9 new validation tests** (25 total propagation tests):
  - EP02: 455d ballistic Jupiter→Saturn — energy conservation <1e-9, trajectory reaches Saturn neighborhood, vis-viva arrival speed verified
  - EP02: Solar-hyperbolic trajectory confirmed (v=18.99 > v_esc=18.46), v∞≈4.44 km/s
  - EP02: Saturn capture ΔV at Enceladus orbit — minimum 0.61 km/s matches desk calc
  - EP03: 143h12m brachistochrone Saturn→Uranus — distance/arrival validated, mass boundary ≤452t confirmed
  - EP03: Desk ΔV = 11,165 km/s matches accel × time (independent of gravity)
  - EP05: Brachistochrone @300t Uranus→Earth — ship moves inward, covers correct distance
  - EP05: Nozzle lifespan margin 26min (0.78%) — without Oberth, nozzle fails
  - EP05: 375h cruise at 1,500 km/s — solar gravity causes <5 km/s speed change
  - EP05: Earth capture to LEO 400km — v_circ=7.67 km/s, capture ΔV=3.18 km/s
- **Report integration**:
  - Cross-episode report: new section "軌道伝搬による検証（RK4数値積分）" with comparison table
  - Science-accuracy report: 2 new verification rows (energy conservation, ΔV invariance)

## Key Findings
1. **ΔV is gravity-invariant**: Brachistochrone ΔV = a×t is purely a thrust integral, independent of external gravity
2. **EP02 is solar-hyperbolic**: v_helio=18.99 km/s barely exceeds solar escape (18.46), but Saturn is en route
3. **Nozzle margin is the tightest constraint**: EP05's 26-minute (0.78%) margin means Jupiter Oberth is essential
4. **High-speed coasting is near-ballistic**: At 1,500 km/s, solar gravity at 10 AU is negligible (<0.3% speed change over 375h)

## Scope — All Complete
1. ✅ Add numerical orbit propagation to Rust core (RK4 integrator)
2. ✅ WASM bindings for browser-reproducible propagation
3. ✅ Validate existing desk calculations (EP01-EP03, EP05)
4. ✅ Add propagation results to reports
5. ☐ Consider adaptive step size for better efficiency (deferred — fixed dt is adequate)

## Test Counts
- 25 propagation tests in propagation.rs (was 16, added 9)
- 111 Rust core + 27 WASM + 911 TS = 1,049 total (0 failures)
