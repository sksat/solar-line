# Task 081: Rustdoc ビルド・デプロイ

## Status: DONE

## Motivation

Human directive: 「rustdoc などもビルドしてデプロイに含めること」

## Implementation

- `build.ts`: Copies `target/doc/` to `dist/doc/` via recursive directory copy
- `pages.yml`: Added `cargo doc --no-deps --document-private-items` step
- `templates.ts`: Added "API Docs" link in site footer
- Fixed rustdoc warnings in `propagation.rs` (escaped `[x,y,z]` in doc comments)

## Output

- `dist/doc/solar_line_core/` — Core crate API docs (orbits, propagation, ephemeris, etc.)
- `dist/doc/solar_line_wasm/` — WASM bridge API docs
- Accessible from site footer "API Docs" link

## Test Results
- 970 TS tests, 177 Rust tests passing
- Site builds with rustdoc: "Built: ... + rustdoc → dist/"
