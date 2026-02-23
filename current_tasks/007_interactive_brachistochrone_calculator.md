# Task 007: Interactive Brachistochrone Calculator

## Status: DONE (session 2026-02-23)

## Goal
Add an interactive WASM-powered brachistochrone calculator to the Episode 1 report page, allowing users to explore how distance, ship mass, and transfer time affect required acceleration and ΔV.

## Depends on
- Task 002 (Rust orbital mechanics core)
- Task 003 (WASM bridge)
- Task 005 (report pipeline)
- Task 006 (Episode 1 analysis)

## What was done
1. Added `brachistochrone_accel`, `brachistochrone_dv`, `brachistochrone_max_distance` to `solar-line-core` (4 tests)
2. Exported all 3 functions via WASM bridge (3 tests)
3. Created `ts/src/calculator.js` — browser module with WASM-first + JS fallback
4. Added `renderCalculator()` to templates with sliders, presets, result table, verdict badge
5. Fixed WASM copy path bug in `build.ts` (Codex-identified)
6. Added calculator.js copy step in build pipeline
7. 9 new TS template tests + 4 new WASM round-trip tests
8. Total: 52 Rust + 134 TS = 186 tests, all passing

## Codex consultation
- Recommended WASM+JS dual path, separate JS file (Option B), and identified WASM copy path bug

## Origin
- `ideas/interactive_brachistochrone.md`
- Task 006 follow-up (mass ambiguity exploration)
