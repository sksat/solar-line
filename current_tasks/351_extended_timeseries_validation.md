# Task 351: Extended Timeseries Data Validation

## Status: DONE

## Description
Extend the timeseries validation pattern from Task 350 to cover all remaining hardcoded timeseries charts in reports. Validates key data points in velocity profile, propellant mass, margin timeline, and margin-actual-vs-limit charts against expected physical values.

## Scope
1. Add validation tests for mission-velocity-profile (cruise speeds, EP05 peak)
2. Add validation tests for propellant-mass-timeline (initial/final mass, Enceladus refuel)
3. Add validation tests for margin-timeline (EP01-EP05 margins)
4. Add validation tests for margin-actual-vs-limit (EP02-EP05 constraint utilization)
5. Add validation test for ship-kestrel mass-timeline (3-scenario comparison)
6. Update 3D viewer link text in cross-episode.md
7. Stats refresh folded in

## Dependencies
- Task 350 (mission timeline data consistency)
