# Task 516: EP04 Reproduction Test Expansion (Phase 2)

## Status: DONE

## Summary

Expand EP04 reproduction tests to cover remaining gaps: Hohmann departure/arrival ΔV and semi-major axis, mass feasibility intermediate scenarios (60d/90d/180d), and brachistochrone mid/farthest scenarios.

## Tests to Add

### EP04 Hohmann extended fields (2 tests)
- Departure ΔV = 4.658 km/s, arrival ΔV = 11.281 km/s
- Semi-major axis = 1,511,029,012 km

### EP04 mass feasibility intermediate scenarios (2 tests)
- 60-day: max mass = 15,718 t
- 90-day: max mass = 35,364 t
- 180-day: max mass = 141,458 t

### EP04 brachistochrone mid and farthest (2 tests)
- Mid: 107.8 days, 1236 km/s
- Farthest: 110.5 days, 1267 km/s

## Impact

Fills remaining EP04 calc JSON gaps. Completes systematic per-episode reproduction coverage.
