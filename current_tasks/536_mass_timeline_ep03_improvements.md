# Task 536: Mass Timeline + EP03 Test Improvements

## Status: DONE

## Summary

Two-pronged test improvement:

### Rust mass_timeline.rs (3 new tests, 23→26)
1. Consecutive burns compound correctly: second burn uses post-first-burn mass, consumes less propellant
2. Resupply then burn: uses increased total mass for Tsiolkovsky calculation
3. Total mass invariant: total_mass = dry + propellant verified at every snapshot across mixed events

### EP03 article content (3 new tests, 29→32)
1. Cruise velocity: brachistochrone peak ~5,583 km/s matches analysis
2. Brachistochrone closest: 106x thrust ratio at 48,000t
3. Nav crisis error magnitude: 14.36M km at 14.72 AU matches analysis

## Impact

mass_timeline now validates compound event interactions. EP03 reaches assertion parity with EP01/EP04/EP05 (~32 each).
