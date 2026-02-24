## Status: DONE

# Task 047: EP05 Analysis Completion — Oberth Effect, Nozzle Lifespan, Remove Preliminary Flag

## Goal
Complete the EP05 analysis module which is still marked as preliminary despite all data being available (Whisper STT + dialogue attribution done). Add quantitative analysis for two key physics claims that currently lack computation.

## Scope
1. **Remove PRELIMINARY flag**: ep05-analysis.ts still has `preliminary: true` and `[PENDING]` markers on thermal/radiation/thrust values — remove these and use confirmed values from ep05.json
2. **Nozzle lifespan analysis**: The EP05 climax revolves around the 55h38m nozzle lifespan vs 55h12m burn time (26 min margin). Add a `nozzleLifespanAnalysis()` function that computes this margin and explores sensitivity to parameters
3. **Oberth effect analysis**: Add `oberth_dv_gain()` to Rust crate, WASM binding, and TypeScript analysis to verify the "3% efficiency gain" claim at Jupiter flyby (ep05-quote-07)
4. **Science accuracy**: Add EP05 verification items (Oberth 3%, nozzle margin) to science-accuracy.json
5. **Update tests**: Fix preliminary assertion, add tests for new functions

## Dependencies
- ep05.json (confirmed data — DONE from Task 042)
- ep05_dialogue.json (attribution — DONE from Task 009/023)
- Rust crate orbital mechanics functions (orbits.rs)

## Files to modify
- `crates/solar-line-core/src/orbits.rs` — add `oberth_dv_gain()`
- `crates/solar-line-core/src/lib.rs` — export new function
- `crates/solar-line-wasm/src/lib.rs` — WASM binding
- `ts/src/ep05-analysis.ts` — remove preliminary, add nozzle + Oberth analysis
- `ts/src/ep05-analysis.test.ts` — update tests
- `reports/data/episodes/ep05.json` — add explorations
- `reports/data/summary/science-accuracy.json` — add verification rows
