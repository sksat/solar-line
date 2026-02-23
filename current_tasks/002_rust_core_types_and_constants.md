# Task 002: Rust Core Types, Units, and Constants

## Status: DONE (2026-02-23)

## Goal
Define foundational types for orbital mechanics: units (km, km/s, seconds, radians), gravitational parameters (μ) for solar system bodies, and basic 2-body propagation.

## Details
- Type-safe units to prevent mixing km with m, etc.
- Solar system body constants (μ for Sun, planets)
- Basic Keplerian orbital elements struct
- State vector (position, velocity) type
- Simple 2-body propagation (Kepler equation solver)
- All with thorough tests using known reference values

## Acceptance Criteria
- Types compile and have unit tests
- Kepler equation solver passes tests against known orbital data

## Implementation Notes (for next session)

### Module structure
- `units.rs` — Newtype wrappers: `Km`, `KmPerSec`, `Seconds`, `Radians`, `Mu`, `Eccentricity`
- `vec3.rs` — Generic `Vec3<T>` with `AsF64` trait for dot/norm operations
- `constants.rs` — `mu::*` (all planets), `orbit_radius::*`, `reference_orbits::*`
- `orbits.rs` — `OrbitalElements`, `StateVector`, typed `vis_viva()`, `hohmann_transfer_dv()`, `orbital_period()`, `specific_energy()`, `specific_angular_momentum()`
- `kepler.rs` — Newton-Raphson Kepler equation solver, anomaly conversions (mean ↔ eccentric ↔ true), mean motion, propagation

### Design decisions
- Simple newtypes over `uom` crate (zero dependencies, WASM-friendly)
- Consulted Codex: recommended newtypes + `Eccentricity` validation + `Vec3<T>` over arrays
- Existing `vis_viva`/`hohmann_transfer_dv` refactored to typed API (no dual raw/typed API)
- Kepler solver tested against Halley's comet (e=0.967) and Vallado textbook values

### Test coverage: 37 tests
- Unit arithmetic, display, negation
- Angle normalization (unsigned and signed)
- Eccentricity validation and classification
- Vec3 operations with typed and raw f64
- Vis-viva, Hohmann LEO→GEO, Earth→Mars
- Orbital period (Earth around Sun, LEO)
- Kepler solver: circular, low-e, moderate-e, high-e, known Vallado value
- Anomaly round-trips: ν↔E, E↔M, full ν→M→ν
- Mean motion, half-orbit propagation
