# Task 024: CI Testing Workflow & Type Safety

## Status: DONE

## Summary
Added comprehensive CI testing to catch regressions, and fixed code quality issues.

## Changes
- **CI workflow** (`.github/workflows/ci.yml`): Enhanced with 3 parallel jobs:
  1. `rust`: cargo fmt --check + cargo clippy -D warnings + cargo test
  2. `typescript`: npm run typecheck + npm test (with WASM nodejs build)
  3. `wasm-web`: wasm-pack build --target web (validates browser WASM build)
  - Added concurrency group to cancel outdated runs
- **TypeScript type fix** (`ts/src/templates.ts`): Fixed `computedDeltaV` null handling in `buildDvChart()` — used type predicate filter to narrow `null` to `number`
- **Rust formatting** (`crates/solar-line-core/`): Applied `cargo fmt` to kepler.rs and lib.rs
- **Clippy fix** (`crates/solar-line-core/src/vec3.rs`): Added `#[allow(clippy::wrong_self_convention)]` to `AsF64` trait — consuming `self` is intentional since all implementors are `Copy`

## Design Decision (Codex-reviewed)
- 3 parallel CI jobs (not single job) for faster wall-clock time and cleaner failure diagnosis
- WASM browser build included as separate job to catch wasm-bindgen issues early
- `cargo fmt --check` and `cargo clippy` added per Codex recommendation

## Depends on
- None (infrastructure task)
