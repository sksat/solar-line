# Task 375: Add Velocity Profile Chart to EP05

## Status: DONE

## Motivation

EP01, EP02, EP03, and EP04 all have velocity profile time-series charts. EP05 is the only episode missing one despite having the most complex route: a 507h composite 4-burn journey from Uranus to Earth.

The EP05 velocity profile is unique because it's NOT a simple symmetric brachistochrone — it's a multi-burn composite route:
- Burn 1 (0→25.43h): Uranus escape acceleration to ~1500 km/s
- Coast (25.43→375h): 375h at cruising velocity
- Burn 2 (375→387.2h): Jupiter flyby acceleration to ~2100 km/s
- Coast (387.2→450h): 63h at peak velocity
- Burn 3 (450→465.27h): Deceleration back to ~1500 km/s
- Coast (465.27→479h): 14h
- Burn 4 (479→506.73h): Final deceleration to 0 (Earth LEO insertion)

Key dialogue values confirmed: cruising velocity 1500 km/s (03:22), final velocity 2100 km/s (11:58).

## Changes

1. **EP05 velocity profile chart** (`ep05-chart-velocity-profile`):
   - 507h composite route, 4 burns, 21 data points with intermediate points
   - Peak velocity 2100 km/s (0.70% c) at Jupiter flyby
   - Cruising velocity 1500 km/s (0.50% c)
   - Error bands: acceleration ±10%
   - Annotations: Burn 1-4 labels and coast phases

2. **TDD tests** in `article-content-validation.test.ts`:
   - Chart presence test
   - Peak velocity ~2100 km/s
   - Cruising velocity ~1500 km/s
   - 4-burn structure verification
