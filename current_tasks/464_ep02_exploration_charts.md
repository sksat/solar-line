# Task 464: Add Bar Charts to EP02 Explorations

## Status: DONE

## Summary

EP02 has the fewest bar charts of any episode (only 1), despite having 9 explorations with rich numerical data. Add bar charts to the 3 most impactful explorations:

1. **Saturn moon capture ΔV comparison** (exploration-04): Min ΔV across Enceladus/Rhea/Titan/SOI — shows why Enceladus was optimal
2. **Trim-thrust burn duration vs transit time** (exploration-05): 0/3/7/14 day burns → 997/87/41/26 day transit — dramatic nonlinear effect
3. **Thrust damage level vs acceleration** (exploration-02): 100%/50%/25%/1% thrust → acceleration comparison — visualizes damaged engine constraint

## Plan

1. Write content validation tests (TDD red)
2. Add 3 bar charts to ep02.md after the respective explorations
3. Verify tests pass (TDD green)
4. Commit

## Impact

- Brings EP02 bar chart count from 1 to 4
- Makes EP02's key tradeoffs visually clear
- Follows "more figures are better than fewer"
