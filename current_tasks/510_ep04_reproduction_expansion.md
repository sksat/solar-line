# Task 510: EP04 Analysis Reproduction Expansion

## Status: DONE

## Summary

Added 11 reproduction tests expanding EP04 coverage from 13 to 24 tests, pinning Uranus departure parameters, plasmoid momentum perturbation, and fleet intercept scenarios.

## Tests Added

### Uranus departure (4 tests)
- Titania escape ΔV = 1.510 km/s
- Escape velocity at Titania orbit = 5.156 km/s
- Titania circular velocity = 3.646 km/s
- Acceleration at full mass = 0.1327 m/s² (consistent with brachistochrone)

### Plasmoid momentum perturbation (4 tests)
- 3 scenarios: nominal, enhanced, extreme
- Nominal velocity perturbation negligible (< 1e-12 m/s)
- All scenarios: correction-to-orbital ratio << 1
- Force increases monotonically: nominal < enhanced < extreme

### Fleet intercept (3 tests)
- Arrival time at Titania = 9.7 hours
- 5 fleet ships
- Saturn-Uranus distance scenario at 1,438,930,000 km

## Impact

EP04 was the least-covered episode in reproduction tests (13 tests). Now at 24 tests, on par with other episodes. Pins plasmoid momentum perturbation values that confirm momentum effects are negligible.
