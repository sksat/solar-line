# Task 465: Add Bar Charts to EP03 and EP04 Explorations

## Status: DONE

## Summary

EP03 and EP04 each have only 2 bar charts. Add 2 charts per episode for the most impactful explorations:

### EP03
1. **Mass boundary thrust comparison** (exploration-01): Required thrust at 48,000t (1,040 MN, 106x) vs 452t (9.8 MN, 1.0x) vs 300t (6.5 MN, 0.66x)
2. **Uranus moon capture ΔV comparison** (exploration-05): Miranda/Ariel/Titania/Oberon capture ΔV

### EP04
1. **Radiation exposure benchmarks** (exploration-02): Actual 480 mSv vs ICRP annual (50), ICRP emergency (500), NASA career (600) — shows narrow margin

## Plan

1. Write content validation tests (TDD red)
2. Add 4 bar charts
3. Verify tests pass (TDD green)
4. Commit

## Impact

- Brings EP03 and EP04 from 2 to 4 bar charts each
- All 5 episodes will have 4-5 bar charts (balanced)
