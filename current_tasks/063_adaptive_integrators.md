# Task 063: Adaptive Timestep Integration Methods

## Status: IN_PROGRESS (Phase 1 DONE, Phases 2-3 remaining)

## Motivation
Human directive: 推進器や重力アシストの影響を加味すると、dt 固定の手法は不利なはず。TDD で複数手法試してほしい。

## Progress

### Session 2026-02-24: Phase 1 — RK45 Dormand-Prince ✅
- **Codex consultation**: Confirmed RK45 > DOP853 for this project's scope. PI controller, event detection at thrust flip, patched-conic for gravity assists.
- **propagation.rs** additions:
  - `AdaptiveConfig`: rtol/atol/h_min/h_max/max_steps, factory methods (heliocentric/planetocentric)
  - `AdaptiveResult`: states + n_eval/n_accept/n_reject statistics
  - `dopri45_step()`: Full 7-stage Dormand-Prince 5(4) with FSAL property
  - `propagate_adaptive()`: Full trajectory with PI controller step size
  - `propagate_adaptive_final()`: Memory-efficient final-state-only variant
  - `estimate_initial_step()`: Hairer-Nørsett-Wanner automatic step size estimation
  - `scaled_error_norm()`: Standard 6-component RMS error with rtol/atol scaling
  - PI controller: safety=0.9, fac_min=0.2, fac_max=5.0, exponents -0.20/+0.08
  - Event detection: Known thrust discontinuities (flip_time) force step boundary
- **11 new TDD tests** (122 core total):
  - Energy conservation: LEO (tight tol), elliptical e=0.9, heliocentric 1000 orbits
  - Orbit return: circular LEO after 1 period
  - Brachistochrone flip handling: verifies accelerate/decelerate phases
  - **Adaptive vs RK4 comparison**: same final position within 1e-6 relative, fewer evals
  - **Efficiency**: e=0.9 orbit shows >10x step size variation (small near periapsis, large near apoapsis)
  - EP01 brachistochrone: adaptive matches fixed RK4 within 1%
  - EP02 ballistic 455d: energy drift <1e-9, reaches Saturn
  - Tolerance convergence: tighter tolerance → better accuracy (verified)
- **WASM bindings**: `propagate_adaptive_ballistic`, `propagate_adaptive_brachistochrone` (2 new tests, 29 WASM total)

### Key Findings
1. **Step size adaptation works**: For e=0.9 orbit, step ratio >10x (small near periapsis, large near apoapsis)
2. **Efficiency gain**: Adaptive uses fewer evaluations than fixed-dt RK4 at comparable accuracy for elliptical orbits
3. **Event detection critical**: Thrust flip at brachistochrone midpoint must be a step boundary (Codex recommendation confirmed)
4. **Tolerance controls accuracy**: 1e-4 → 1e-10 rtol gives measurably better position accuracy (convergence test verified)

## Remaining Work
- Phase 2: Symplectic integrator (Störmer-Verlet) for long-term ballistic — evaluate if it offers better energy conservation per eval
- Phase 3: Multi-body gravity assist scenarios (patched-conic model for Jupiter flyby)
- Report integration: Add section comparing integrator methods to cross-episode or science-accuracy report

## Test Counts
- 122 Rust core tests (was 111, +11 adaptive)
- 29 WASM tests (was 27, +2 adaptive)
- 914 TS tests (unchanged)
- Total: 1,065 tests (0 failures)
