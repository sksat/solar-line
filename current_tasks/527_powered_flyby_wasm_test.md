# Task 527: Add powered_flyby WASM Test

## Status: DONE

## Summary

Add TS-side WASM test for `powered_flyby` — the only WASM export without a corresponding test in wasm.test.ts. The function computes a powered flyby (Oberth burn at periapsis), used in EP05 Jupiter flyby analysis.

## Tests to Add

### powered_flyby (2 assertions)
- v_inf_out > v_inf_in (powered burn increases hyperbolic excess velocity)
- Output direction is a unit vector and differs from input direction

## Impact

Closes the last WASM TS-side test coverage gap. All 104 WASM exports now have TS tests.
