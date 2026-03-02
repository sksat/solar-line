# Task 421: Add Unit Type Edge Case Tests

## Status: **DONE**

## Summary

The `units.rs` module has the lowest test-to-function ratio (0.53) in the crate. Several macro-generated types (`Seconds`, `Mu`, `Radians` arithmetic, `KmPerSec` arithmetic) lack individual tests. Edge cases for `Km::abs()`, `KmPerSec::abs()`, `Radians::tan()`, `normalize_signed` boundary, and `Eccentricity::value()/Display` are also missing.

## Rationale
- Unit types underpin every calculation in the crate — silent breakage here cascades everywhere
- Macro-generated operators for `Seconds` and `Mu` have zero dedicated tests
- `Radians::tan()` not tested, `normalize_signed` boundary at exactly -π untested
- CLAUDE.md: TDD approach, all tests must pass
