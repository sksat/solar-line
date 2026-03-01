# Task 333: Communication Delay Chart Data Validation

## Status: DONE

## Description
Add TDD unit tests that validate the communication delay chart data points are physically consistent:
- Each delay value = distance × 8.317 min/AU (light time per AU)
- Values increase monotonically during outbound phases
- Values reach ~168 min at maximum Earth-Kestrel distance (~20.2 AU)
- Values return to 0 at Earth arrival

## Deliverables
- TypeScript unit tests validating chart data physical consistency
- Cross-check key data points against report's stated distances
