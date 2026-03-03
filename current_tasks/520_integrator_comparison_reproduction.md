# Task 520: Integrator Comparison Reproduction Tests

## Status: DONE

## Summary

Add reproduction tests for integrator_comparison.json pinning key cross-integrator validation values. Currently only existence checks in article-content-validation.test.ts (text appears in report). No golden-file tests pin the actual numerical values.

## Tests to Add

### EP01 brachistochrone (2 tests)
- Position diff = 0.015% (1.54e-4 relative)
- Speed diff at flip = 0.656 km/s (1.53e-4 relative)

### EP02 trim-thrust (2 tests)
- RK4/RK45 machine precision agreement (3.01e-15)
- Störmer-Verlet energy drift = 2.53e-9 (bounded)

### EP03 brachistochrone (1 test)
- Position diff = 0.008% (7.76e-5 relative)

### EP05 deceleration (2 tests)
- Main decel: position diff = 0.007% (6.68e-5 relative)
- RK45 cost ratio = 0.07 (15× cheaper)

### Cross-integrator consistency (1 test)
- All episode position diffs < 0.02% relative

## Impact

Pins cross-validation results. Catches integrator algorithm changes silently altering validated baselines.
