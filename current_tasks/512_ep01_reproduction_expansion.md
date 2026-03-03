# Task 512: EP01 Reproduction Test Expansion

## Status: DONE

## Summary

Expand EP01 reproduction tests to cover untested calc JSON sections: brachistochrone150h (3 scenarios), reachableWithShipThrust, massSensitivity (4 mass interpretations), and thrustBoundary72h. EP01 currently has the fewest reproduction test coverage (5 describe blocks) among all episodes.

## Tests to Add

### EP01 150h brachistochrone (3 tests)
- Closest: accel = 7.553 m/s² (0.770g), ΔV = 4,079 km/s
- Mid/farthest distance and accel values
- All 3 scenarios maintain same distance as 72h

### EP01 reachable distance at canonical mass (2 tests)
- At 48,000t in 72h: only 3,429 km reachable (0.023 AU)
- Contrast with Mars-Ganymede 550,631,000 km (161x shortfall)

### EP01 mass sensitivity (3 tests)
- 4 scenarios: 48kt, 4.8kt, 480t, 48t
- 480t scenario: accel ~2.08g, reachable 2.29 AU
- 48t scenario: accel ~20.8g, reachable 22.9 AU (exceeds distance)

### EP01 thrust boundary at 48,000t (2 tests)
- Required thrust: 1,574 MN (161x Kestrel's 9.8 MN)
- Required accel: 32.78 m/s² (same as brachistochrone 72h)

## Impact

Brings EP01 from 5 to ~9 describe blocks, achieving parity with other episodes.
