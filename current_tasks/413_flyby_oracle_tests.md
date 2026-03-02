# Task 413: Add Flyby Oracle Tests with Published Mission Data

## Status: **DONE**

## Summary

The `flyby.rs` module (patched-conic gravity assist model) has only 8 tests — none cross-validated against published real mission data. Add oracle tests using Voyager 1/2 flyby parameters and additional edge case coverage to strengthen analytical credibility.

## Rationale
- flyby.rs implements the core gravity assist model used in EP05 Jupiter flyby analysis
- 8 tests only cover happy paths — no edge cases (near-capture, retrograde)
- No cross-validation against published NASA mission data (Voyager, Cassini)
- CLAUDE.md: "Cross-validation with trusted simulators" and oracle test philosophy
- SOI radius tests exist for Jupiter and Earth but not Saturn/Uranus (used in EP02-EP04)

## Plan
1. Add Voyager 1 Jupiter flyby oracle test (v_inf ≈ 10.48 km/s, turn angle ≈ 80.3°)
2. Add Voyager 2 Saturn flyby oracle test (v_inf ≈ 7.56 km/s)
3. Add SOI radius tests for Saturn and Uranus
4. Add edge cases: near-capture powered flyby, retrograde flyby plane, zero-dv powered = unpowered
5. Run cargo test, commit
