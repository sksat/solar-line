# Task 312: Cross-validate mass_timeline Tsiolkovsky Functions

## Status: DONE

## Description
Add cross-validation for the pure-math functions in mass_timeline.rs:
- propellant_consumed (Tsiolkovsky equation)
- post_burn_mass
- compute_timeline (multi-event timeline)
- total_propellant_consumed / propellant_margin

These use Tsiolkovsky's rocket equation and don't depend on ephemeris.
