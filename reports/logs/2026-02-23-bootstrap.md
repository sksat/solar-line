# Project Bootstrap

Initialized the SOLAR LINE 考察 project with:

- Rust workspace with `solar-line-core` (orbital mechanics library, 37 tests)
- WASM bridge crate `solar-line-wasm` (flat f64 API, 8 crate tests)
- TypeScript project with orbital utilities and 19 WASM round-trip tests
- GitHub Actions CI running both Rust and TypeScript tests
- Total: 64 tests, all passing

## Design Decisions

- Simple newtypes over `uom` crate for units (Codex-reviewed)
- Zero external Rust dependencies for WASM compatibility
- Flat f64 API at WASM boundary, type-safe internally
- Eccentricity validated at construction time

## Next Steps

- Subtitle collection script (Task 004)
- GitHub Pages report pipeline (Task 005)
- Episode 1 analysis (Task 006)
