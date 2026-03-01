# Task 317: Cross-validate Ephemeris Module

## Status: DONE

## Description
Add cross-validation for the ephemeris module (ephemeris.rs):
- calendar_to_jd / jd_to_calendar (Meeus algorithm vs astropy)
- planet_position (mean Keplerian elements vs astropy)
- synodic_period (formula vs known reference values)
- hohmann_phase_angle / hohmann_transfer_time (vs analytical formulas)

These are pure-math functions that can be validated against astropy (already installed in project venv).
