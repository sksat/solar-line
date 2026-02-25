# Task 181: Validate episode transfers with adaptive integrators

## Status: TODO

## Description
The adaptive integrators (RK45 Dormand-Prince, Störmer-Verlet) are implemented in solar-line-core
but have only been validated with unit tests. Run the full episode transfer calculations through
the adaptive integrators and compare results against the existing RK4 fixed-step results.

This serves dual purposes:
1. Cross-validate the existing analysis results
2. Identify if any transfers benefit from adaptive stepping (e.g., near-body passages, thrust transitions)

## Steps
1. Add integration tests that run each episode's key transfers through both RK4 and RK45
2. Compare ΔV, travel time, and arrival position accuracy
3. Check energy conservation metrics for ballistic phases (Störmer-Verlet vs RK4)
4. Document any meaningful differences in `reports/data/calculations/`
5. If adaptive results are significantly more accurate, update episode analyses

## Notes
- EP02 ballistic 455-day coast is ideal for symplectic integrator comparison
- EP01/EP05 brachistochrone transfers test thrust on/off transitions
- EP03 precision navigation (99.8%) is a good test of adaptive step sizing
