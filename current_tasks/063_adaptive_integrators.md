# Task 063: Adaptive Timestep Integration Methods

## Status: IN_PROGRESS (claimed 2026-02-24)

## Motivation
Human directive: 推進器や重力アシストの影響を加味すると、dt 固定の手法は不利なはず。TDD で複数手法試してほしい。

The current propagation.rs uses fixed-dt RK4. This works well for smooth trajectories but is suboptimal for:
- **Close encounters / gravity assists**: Rapid potential changes near massive bodies require tiny dt, but most of the orbit is smooth
- **Thrust onset/cutoff**: Discontinuities in acceleration at thrust boundaries
- **High-eccentricity orbits**: Near periapsis, velocity changes rapidly

## Plan

### Phase 1: Adaptive RK45 (Dormand-Prince) with TDD
1. Implement RK45 (Dormand-Prince) adaptive step method
   - Embedded 4th/5th order pair for error estimation
   - Automatic step size control based on local truncation error
   - User-configurable tolerance (rtol, atol)
2. TDD tests comparing RK45 vs fixed RK4:
   - Same accuracy with fewer steps (efficiency)
   - Energy conservation on elliptical orbits (e=0.9)
   - Convergence to specified tolerance

### Phase 2: Additional methods (if beneficial)
3. Consider Störmer-Verlet / leapfrog (symplectic, preserves energy long-term)
4. Consider RKN (Runge-Kutta-Nyström) for second-order ODEs
5. TDD comparison: accuracy per function evaluation across methods

### Phase 3: Gravity assist scenarios
6. Apply adaptive integrator to multi-body gravity assist (Jupiter flyby)
7. Validate that adaptive dt resolves close approach dynamics
8. Compare step count: adaptive vs fixed for same accuracy

## Dependencies
- propagation.rs (Task 060) — extend existing module

## Deliverables
- New integrator(s) in propagation.rs with TDD tests
- Benchmark comparison in test output
- Report section in cross-episode or science accuracy report
