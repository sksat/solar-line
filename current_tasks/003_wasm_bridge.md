# Task 003: WASM Bridge and TS Bindings

## Status: DONE (2026-02-23)

## Goal
Expose a minimal stable API from the Rust core library to TypeScript via WASM. Verify with round-trip tests.

## Depends on
- Task 002 (Rust core types)

## Implementation Notes

### Design Decision (Codex-reviewed)
- **Approach A: Flat f64 API** — functions take/return raw f64, newtype wrapping at the WASM boundary
- Separate `solar-line-wasm` crate depends on `solar-line-core`
- Built with `wasm-pack --target nodejs` for Node tests; `--target web` for browser reports
- Constants exported as grouped getters (get_mu_constants, etc.) not individual functions
- Compound results: arrays for tuples (hohmann_transfer_dv → Float64Array), objects for named fields (solve_kepler → {eccentric_anomaly, iterations, residual})

### Files Added/Changed
- `crates/solar-line-wasm/` — new crate (Cargo.toml + src/lib.rs)
  - Dependencies: wasm-bindgen, serde, serde-wasm-bindgen
  - 8 native Rust tests
- `ts/src/wasm.test.ts` — 16 round-trip tests verifying WASM matches TS and reference values
- `.github/workflows/ci.yml` — updated to build WASM before TS tests
- `.gitignore` — added ts/pkg/ (generated WASM output)

### Exported WASM API
- `vis_viva(mu, r, a) → f64`
- `hohmann_transfer_dv(mu, r1, r2) → Float64Array`
- `orbital_period(mu, a) → f64`
- `specific_energy(mu, a) → f64`
- `specific_angular_momentum(mu, a, e) → f64`
- `solve_kepler(M, e) → {eccentric_anomaly, iterations, residual}`
- `mean_to_true_anomaly(M, e) → f64`
- `true_to_mean_anomaly(nu, e) → f64`
- `eccentric_to_true_anomaly(E, e) → f64`
- `true_to_eccentric_anomaly(nu, e) → f64`
- `eccentric_to_mean_anomaly(E, e) → f64`
- `mean_motion(mu, a) → f64`
- `propagate_mean_anomaly(m0, n, dt) → f64`
- `get_mu_constants() → {sun, mercury, venus, earth, mars, jupiter, saturn, uranus, neptune}`
- `get_orbit_radius_constants() → {mercury, venus, earth, mars, jupiter, saturn}`
- `get_reference_orbit_constants() → {earth_radius, leo_radius, geo_radius}`

### Test Coverage
- 37 Rust core tests + 8 WASM crate tests + 19 TypeScript tests (16 WASM round-trip) = 64 total
