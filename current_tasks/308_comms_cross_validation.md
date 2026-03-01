# Task 308: Comms Module Cross-validation

## Status: DONE

## Description
Add cross-validation for the pure-math functions in comms.rs:
- light_time_seconds / light_time_minutes / round_trip_light_time
- free_space_path_loss_db
- CommFeasibility classification thresholds

These don't depend on ephemeris and can be validated independently.
Also fix cargo fmt issue from Task 306.
