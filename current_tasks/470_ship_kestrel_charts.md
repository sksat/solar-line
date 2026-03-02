# Task 470: Add Visualization Charts to Ship Kestrel Summary Report

## Status: IN PROGRESS

## Summary

The ship-kestrel.md summary report has only 3 charts despite being the most data-rich summary report. Add 2 high-impact charts:

1. **Acceleration comparison chart (48,000t vs 300t)**: The central "mass mystery" — episode-by-episode grouped comparison showing the ~160x gap at 48,000t vs achievable acceleration at 300t. This is the most important visualization in the entire report.

2. **Mass hypothesis evaluation chart**: The 4-hypothesis comparison (慣性補償/SF慣例/推進剤消費/DWT解釈) across evaluation dimensions, currently a text-only table.

## Plan

1. Write content validation tests (TDD red)
2. Add 2 bar charts to ship-kestrel.md
3. Verify tests pass (TDD green)
4. Commit

## Impact

- Brings ship-kestrel.md from 3 to 5 visualizations
- Visualizes the central 160x mass mystery thesis
- Makes hypothesis evaluation immediately scannable
