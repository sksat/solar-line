# Task 475: Add Bar Charts to EP05 Explorations

## Status: IN PROGRESS

## Summary

EP05 has the worst chart-to-exploration ratio (3 charts for 13 explorations = 0.23). Add 2 charts for the most data-rich explorations:

1. **Mass vs transit time chart** (exploration-01): 300t→8.3d, 500t→10.7d, 1000t→15.1d, 48000t→105d. Shows the mass mystery impact on EP05.

2. **Nozzle conservation IF analysis chart** (exploration-07): 507h (0.78% margin) vs 700h (-54min) vs 800h (10.9% margin) vs 50% thrust (-54h47m). Counter-intuitive: reducing thrust makes it worse.

## Plan

1. Write content validation tests (TDD red)
2. Add 2 bar charts after relevant explorations
3. Verify tests pass (TDD green)
4. Commit

## Impact

- Brings EP05 from 3 to 5 bar charts
- Visualizes the mass-transit relationship for the final episode
- Makes the nozzle conservation dilemma visually clear
