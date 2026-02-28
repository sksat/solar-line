# Task 219: RK4 Precision Validation for Gravity Capture

**Status:** CLAIMED (next after 218)
**Human directive:** Phase 21, item 24

## Problem

The project uses fixed-dt RK4 for various orbital transfer calculations. For ballistic trajectories near gravity wells (gravity capture, hyperbolic flyby, periapsis passage), the gravitational acceleration changes rapidly, and fixed-dt may not capture these dynamics accurately.

The adaptive RK45 (Dormand-Prince) and symplectic Störmer-Verlet already exist in `propagation.rs`, but systematic validation for gravity-capture scenarios is missing.

## Plan

### Phase 1: Analytical test cases (TDD — write tests first)
1. **Two-body hyperbolic flyby**: Given V∞ and periapsis distance, compute turning angle analytically. Compare RK4/RK45 at various dt.
2. **Gravity capture**: Apply known ΔV at periapsis of hyperbolic orbit → compute resulting bound orbit analytically. Compare integrator results.
3. **Kepler equation validation**: Propagate known elliptical orbit, compare position at arbitrary true anomaly using Kepler equation.
4. **SOI transition**: Test accuracy at sphere-of-influence boundaries where gravity field switches.

### Phase 2: Identify failure modes
1. Run RK4 at dt=60s, 600s, 3600s for gravity-capture scenarios
2. Measure position/velocity error vs analytical solution
3. Document dt thresholds where RK4 accuracy degrades
4. Compare with RK45 adaptive results

### Phase 3: Fix affected analyses
1. If specific episode analyses use inadequate dt, switch to RK45 or reduce dt
2. Update cross-validation if needed
3. Document findings in analysis reports

## Files
- `crates/solar-line-core/src/propagation.rs` — integrators
- `crates/solar-line-core/tests/oracle_propagation.rs` — oracle tests
- `cross_validation/validate.py` — scipy cross-validation
