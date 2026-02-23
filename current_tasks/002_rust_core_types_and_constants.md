# Task 002: Rust Core Types, Units, and Constants

## Status: UNCLAIMED

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
