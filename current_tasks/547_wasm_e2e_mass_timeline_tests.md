# Task 547: WASM 2→3 Tests (batch 2) + EP01 E2E Parity + Mass Timeline Tests

## Status: DONE

## Summary

### WASM tests (3 additions, each block: 2→3)
1. orbital_period: Kepler's third law — period ratio = (semi-major axis ratio)^1.5
2. anomaly round-trip: circular orbit e=0 — mean anomaly = true anomaly identity
3. mean_motion: Kepler's third law — n ratio = (a ratio)^(-3/2)

### E2E tests (1 addition: EP01 3→4)
1. EP01 orbital diagram renders with SVG circle/ellipse/path elements

### Rust mass_timeline.rs (2 additions, 26→28)
1. Resupply event increases total mass; propellant gains exactly specified mass
2. Propellant margin after mixed events (burn + jettison + burn): margin in (0,1), consumed consistent

## Impact

- 7 WASM blocks now at 3 tests (was 4 after Task 546)
- EP01 E2E matches EP02-EP05 at 4 tests each (parity achieved across all episodes)
- mass_timeline.rs covers resupply path and propellant_margin helper (both previously untested)
- Stats: 3,980 TS, 527 Rust, 265 E2E (4,772 total)
