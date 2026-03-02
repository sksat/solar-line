# Task 412: Add Calculation-Report Consistency Tests

## Status: **DONE**

## Summary

Calculation JSON files (ep01-05_calculations.json) contain computed orbital mechanics values. Episode reports cite these values but there's no automated test ensuring they stay in sync. Add tests that load calculation outputs and verify key values appear in the corresponding report text.

## Rationale
- CLAUDE.md: "Reproducible numerical analysis" — calculations must be traceable to reports
- 50+ key values across 5 episodes link calculations to report citations
- Prevents silent drift when calculations are re-run and values change
- Focus on the most critical values: Hohmann ΔV/time, brachistochrone parameters, mass boundaries
