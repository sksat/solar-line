# Task 514: EP03 Reproduction Test Expansion

## Status: DONE

## Summary

Expand EP03 reproduction tests to cover untested calc JSON sections: minTransferTime at canonical mass, extended uranusCapture fields, navCrisis position/error details, and cruiseVelocity candidates. EP03 has 10 describe blocks but several key fields are unverified.

## Tests to Add

### EP03 min transfer time at canonical mass (2 tests)
- At 48,000t: min time = 1474.9 h (61.5 days)
- Same accel as EP01 (0.204 m/s²) — canonical mass

### EP03 extended Uranus capture (3 tests)
- Approach at 25 RU (638,975 km)
- vEsc at Titania orbit = 5.156 km/s, vCirc = 3.646 km/s
- Circular capture ΔV = 5572.0 km/s

### EP03 nav crisis extended (3 tests)
- Position at 14.72 AU, remaining 4.48 AU
- Error vs Uranus SOI = 27.8%
- Error magnitude ratio = 797,778x

### EP03 cruise velocity candidates (2 tests)
- 3 candidate velocities: 30, 300, 3000 km/s
- Heliocentric solar circular at 14 AU = 7.763 km/s

## Impact

Fills remaining EP03 calc JSON gaps. Catches drift in navigation crisis and capture analysis.
