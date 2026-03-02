# Task 471: Add Plasmoid Perturbation Comparison Chart to EP04

## Status: DONE

## Summary

EP04's plasmoid analysis (exploration-02) has 3 scenarios of momentum perturbation (nominal/enhanced/extreme) with velocity deltas spanning 3 orders of magnitude (1.99e-13 to 1.60e-10 m/s), presented as text only. A log-scale bar chart powerfully illustrates that even the extreme scenario is negligible compared to radiation risk.

## Plan

1. Write content validation test (TDD red)
2. Add log-scale bar chart after exploration-02 data
3. Verify test passes (TDD green)
4. Commit

## Impact

- Visualizes the "radiation vs trajectory" distinction in EP04
- EP04 goes from 4 to 5 visualizations (now comparable to other episodes)
