# Task 476: Add Charts to EP01 Remaining Explorations

## Status: DONE

## Summary

EP01 has 3 charts for 7 explorations (ratio 0.43, lowest among episodes). Add 2 charts for the most data-rich explorations without charts:

1. **Required thrust chart** (exploration-02): 9.8 MN (actual) vs 100 MN (10x) vs 1,574 MN (needed for 72h at 48,000t). Shows the 161x thrust gap at nominal mass.

2. **HUD accuracy + Oberth efficiency chart** (exploration-04): vis-viva computed 17.92 vs HUD displayed 17.8 km/s (0.67% error), plus Oberth efficiency ratio at different altitudes (ΔV from exploration-05 data overlaps nicely).

## Plan

1. Write content validation tests (TDD red)
2. Add 2 bar charts after relevant explorations
3. Verify tests pass (TDD green)
4. Commit

## Impact

- Brings EP01 from 3 to 5 bar charts
- Visualizes the thrust gap at nominal mass
- Visualizes the HUD data accuracy and Oberth efficiency
