# Task 446: Expand WASM Bridge Test Coverage

## Status: **IN PROGRESS**

## Summary

Only 21 of 104 WASM-exported functions have round-trip tests in `wasm.test.ts`. Add tests for simple utility functions to verify the binding layer works correctly for:
- brachistochrone_time (inverse of existing tested functions)
- exhaust_velocity, mass_ratio, propellant_fraction, initial_mass, mass_flow_rate (rocket equation)
- speed_of_light (constant accessor)
- lorentz_factor, beta (relativistic)
- light_time_seconds, light_time_minutes, round_trip_light_time (comms)
- calendar_to_jd, jd_to_date_string (ephemeris)
