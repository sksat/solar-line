# Task 548: WASM 2→3 Tests (batch 3) + Ephemeris.rs Tests

## Status: DONE

## Summary

### WASM tests (4 additions, each block: 2→3)
1. hohmann_transfer_dv: total ΔV symmetric for inner→outer and outer→inner transfers
2. propagate_mean_anomaly: quarter orbit from non-zero M0 adds exactly π/2
3. brachistochrone_accel: matches analytical formula a=4d/t²
4. brachistochrone_dv: longer distance at same time requires proportionally higher ΔV

### Rust ephemeris.rs (2 additions, 30→32)
1. JD/calendar round-trip for SOLAR LINE epoch (2215) and J2000 verification
2. Synodic periods: Earth-Mars ≈780 days, Earth-Jupiter ≈399 days

## Impact

- 11 WASM blocks now at 3+ tests (was 7 after Task 547)
- Only 4 blocks remain at 2 tests: specific_angular_momentum, brachistochrone_max_distance, brachistochrone_time, speed_of_light
- ephemeris.rs now tests far-future date conversion and synodic period accuracy
- Stats: 3,984 TS, 529 Rust, 265 E2E (4,778 total)
