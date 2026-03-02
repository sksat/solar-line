# Task 443: Consolidate Duplicated Rust Constants

## Status: **DONE**

## Summary

`C_KM_S` (speed of light) is defined in both `relativistic.rs` and `comms.rs`. `AU_KM` is defined in both `ephemeris.rs` and `comms.rs`. Consolidate into `constants.rs` and import from there.

## Files to Change

1. `constants.rs` — add `AU_KM` and `C_KM_S` constants
2. `relativistic.rs` — remove local `C_KM_S`, use constants module
3. `comms.rs` — remove local `C_KM_S` and `AU_KM`, use constants module
4. `ephemeris.rs` — remove local `AU_KM`, use constants module
