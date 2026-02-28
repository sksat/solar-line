# Idea: EP03 Distance Inconsistency Resolution

## Problem
EP03 analysis uses Saturn-Uranus minimum distance (9.62 AU, phase angle ≈ 0°) for brachistochrone calculation, but the inferred epoch (2241-12-09) places the planets at 135.5° phase angle (distance 26.82 AU).

## Impact
If the actual distance is 26.82 AU instead of 9.62 AU:
- Required acceleration increases ~2.8x (proportional to distance for fixed time)
- Mass boundary would decrease proportionally (≈162t instead of 452.5t)
- ΔV would increase by ~√(2.8) ≈ 1.67x → ~18,600 km/s instead of 11,165 km/s
- This cascades through cumulative ΔV, propellant budget, and mass timeline

## Resolution Options
1. **Re-derive the epoch**: Find a Saturn-Uranus configuration where distance ≈ 9.62 AU. This requires phase angle ≈ 0° → find years when Saturn and Uranus are roughly aligned (same heliocentric longitude). Saturn-Uranus synodic period ≈ 45.3 years.
2. **Re-analyze EP03 at 26.82 AU**: Accept the epoch, recalculate with the larger distance. This would fundamentally change EP03's analysis — higher ΔV, lower mass boundary.
3. **Accept the inconsistency**: Note that the epoch is illustrative and EP03's analysis is based on a "best case" minimum distance scenario.

## Priority
HIGH — this is a data integrity issue that undermines the cross-episode timeline. The epoch should be consistent with the analysis assumptions.

## Related
- Task 263: Cross-episode report quality review (flagged but not resolved)
- EP03 analysis: reports/data/episodes/ep03.md
- Cross-episode: reports/data/summary/cross-episode.md (lines 688, 700)
