# Task 535: Flyby + WASM + EP04 Test Improvements

## Status: DONE

## Summary

Three-pronged test improvement:

### Rust flyby.rs (5 new tests, 21→26)
1. heliocentric_exit_velocity: retrograde flyby reduces heliocentric speed (3.07 vs 23.07 km/s)
2. powered_flyby zero-burn: verify exit direction vector matches unpowered (not just magnitudes)
3. Rodrigues rotation around X axis (all prior tests used [0,0,1] Z-axis)
4. Flyby with inclined normal [0,1,0]: deflection in X-Z plane instead of X-Y
5. Verifies turn angle is independent of flyby plane orientation

### WASM single-assertion groups (3 new tests)
1. specific_energy: far orbit less bound than close orbit
2. orbital_period: Mercury ~87.97 days (was Earth-only)
3. orbital elements: inclined (i=90°) orbit has nonzero z-component

### EP04 article content (4 new tests, 28→32)
1. Cooling pressures 1.87/0.96 MPa match analysis
2. Shield coil system status cited
3. Fleet intercept: 5 ships, 33h ETA, 9.7h Titania arrival
4. Brachistochrone closest scenario ~105 days cross-check

## Impact

flyby.rs now tests 3D geometry paths beyond Z-axis. EP04 reaches assertion parity with EP01/EP05. 3 WASM groups go from schema-only to behavior-validating.
