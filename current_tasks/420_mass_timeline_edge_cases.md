# Task 420: Add Mass Timeline Edge Case Tests

## Status: **DONE**

## Summary

The `mass_timeline.rs` module has all public functions covered by at least one test, but several edge cases and boundary conditions are untested. Add tests for: zero initial propellant, out-of-order events, concurrent-timestamp events, over-jettison, zero-duration burns, low-Isp scenarios, and the infinite mass ratio overflow path.

## Rationale
- Edge cases in mass calculations can silently produce incorrect results
- Some code paths (infinite mass ratio clamp, zero-propellant margin) are untested
- CLAUDE.md: "Mass timeline analysis" and "Track container jettison, propellant consumption"
- Robust edge case coverage prevents regressions during analysis expansion
