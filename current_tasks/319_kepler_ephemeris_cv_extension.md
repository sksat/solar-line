# Task 319: Extend Kepler + Ephemeris Cross-Validation Coverage

## Status: DONE

## Description
Add cross-validation for uncovered kepler and ephemeris functions:
- kepler: mean_to_true_anomaly, true_to_mean_anomaly round-trip, mean_motion
- ephemeris: phase_angle, next_hohmann_window
- orbits: specific_energy, elements_to_state_vector

These are mathematically non-trivial functions used throughout the analysis.
