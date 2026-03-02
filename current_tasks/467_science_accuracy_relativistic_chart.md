# Task 467: Add Relativistic β Comparison Chart to Science-Accuracy Report

## Status: DONE

## Summary

The science-accuracy report has a Markdown table showing relativistic effects per episode (β, γ, time dilation) but no chart for it. A bar chart of β (v/c %) across episodes would visually confirm that all values stay well below the relativistic correction threshold.

Data:
- EP01: β = 1.42%
- EP02: β = 0.02%
- EP03: β = 1.86%
- EP04: β = 0.70%
- EP05: β = 2.54% (highest)

## Plan

1. Write content validation test (TDD red)
2. Add bar chart after relativistic effects table
3. Verify test passes (TDD green)
4. Commit

## Impact

- Adds visual confirmation of Newtonian mechanics validity across all episodes
- Follows "concrete values need visualization" directive
