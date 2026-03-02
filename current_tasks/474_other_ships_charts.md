# Task 474: Add Charts to Other-Ships Summary Report

## Status: IN PROGRESS

## Summary

The other-ships.md report has only 1 bar chart despite being rich in numerical comparisons. Add 2 charts:

1. **Fleet approach acceleration comparison**: EP04 fleet scenario 1 (2.9g) vs scenario 2 (40g) vs Kestrel EP03 on same route (3.33g) — showing fleet superiority.

2. **Nuclear torpedo evasion speed gap**: Kestrel speed 2,100 km/s vs torpedo estimated speed (~10 km/s) vs kill radius transit time 0.038s — showing physical impossibility of interception.

## Plan

1. Write content validation tests (TDD red)
2. Add 2 bar charts to other-ships.md
3. Verify tests pass (TDD green)
4. Commit

## Impact

- Brings other-ships.md from 1 to 3 bar charts
- Visualizes the fleet's orbital capability advantage
- Makes the nuclear torpedo physics immediately clear
