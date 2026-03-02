# Task 488: Complete Cross-Episode Relativistic Effects Table

## Status: DONE

## Summary

The cross-episode report's relativistic effects table (ローレンツ因子の計算) listed only EP01, EP03, and EP05 brachistochrone transfers. EP02 (trim-thrust cruise) and EP04 (65% thrust brachistochrone) were omitted despite having computed values in relativistic_effects.json.

Added:
- EP02 row: 65 km/s peak, β = 0.022%, γ-1 = 2.4×10⁻⁸ (negligible)
- EP04 row: 2,101 km/s peak, β = 0.70%, γ-1 = 2.5×10⁻⁵ (+0.0025%)

Added TDD test verifying all 5 episodes appear in the relativistic table section.

## Impact

- Complete coverage of all episodes in relativistic analysis
- EP04's β = 0.70% fills the gap between EP02's negligible and EP01/03/05's 1-2.5%
- Readers can see the full velocity progression across the series
