# Task 181: Validate episode transfers with adaptive integrators

## Status: DONE

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

## Results
12 integration tests added in `tests/episode_integrator_comparison.rs`:

| Test | Episode | Result |
|------|---------|--------|
| EP01 brachistochrone 72h | 1 | pos_diff 85k km (0.015% rel), speed_diff 0.66 km/s |
| EP01 flip point | 1 | Speed agrees to 0.015% (4272.1 vs 4272.7 km/s) |
| EP02 ballistic RK4 vs RK45 | 2 | Machine precision agreement (~3e-15 relative) |
| EP02 ballistic RK4 vs Störmer-Verlet | 2 | Sub-km agreement; SV energy drift 2.5e-9 (bounded) |
| EP02 all integrators reach Saturn | 2 | All three agree to rounding: 0.877× Saturn orbit |
| EP03 brachistochrone 143h | 3 | pos_diff 112k km (0.008% rel) |
| EP03 nav crisis midpoint | 3 | Integrator diff ~0 km vs 14.36M km error budget |
| EP04 Uranus departure | 4 | ~0 km, ~0 km/s (low thrust, short burn) |
| EP05 Uranus escape | 5 | Machine precision agreement |
| EP05 decel burn 35h | 5 | pos_diff 12.6k km (0.007% rel) |
| EP05 LEO insertion | 5 | pos_diff 1.28 km, speed_diff 0.004 km/s |
| Computation cost | 1 | RK45 uses 15× fewer derivative evaluations |

**Conclusion**: RK4 and RK45 agree to high precision. No episode analyses need updating.
RK45 is 7-15× more efficient. Störmer-Verlet shows proper bounded energy oscillation.

## Notes
- EP02 ballistic 455-day coast is ideal for symplectic integrator comparison
- EP01/EP05 brachistochrone transfers test thrust on/off transitions
- EP03 precision navigation (99.8%) is a good test of adaptive step sizing
