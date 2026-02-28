# Task 221: EP02 Trim-Thrust Transfer Cross-Validation

**Status:** DONE
**Origin:** CLAUDE.md (cross-validation with trusted simulators), identified gap in cross_validation/

## Problem

The EP02 trim-thrust transfer analysis (455→87 day correction) is the most consequential numerical result in the project. It uses custom RK4 2D heliocentric propagation with low thrust (1% of normal, ~98 kN). However, this analysis has NO cross-validation against an independent implementation.

The existing cross-validation suite (scipy + poliastro) only covers basic orbital mechanics formulas (Hohmann, vis-viva, brachistochrone, escape velocity). The RK4 trim-thrust propagation — which involves continuous thrust integration over ~87 days — is not validated.

## Plan

### Phase 1: Python independent implementation
- Implement the same 2D heliocentric trim-thrust propagation in Python using scipy's `solve_ivp` (RK45 adaptive integrator)
- Same initial conditions: Jupiter escape at 50 RJ, v_inf, heliocentric state
- Same thrust model: 98 kN, 300,000 kg, 3-day burn then coast
- Compare: total transit time to Saturn orbit, arrival velocity, trajectory shape

### Phase 2: Compare results
- Tolerance: transit time within 1%, arrival v_inf within 5%
- Document discrepancies and assess whether they affect conclusions
- Add to CI cross-validation job

## Key Files
- `ts/src/ep02-analysis.ts` — trimThrustTransferAnalysis()
- `cross_validation/validate_trim_thrust.py` — new
- `.github/workflows/ci.yml` — extend cross-validate job
