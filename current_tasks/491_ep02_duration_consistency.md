# Task 491: Fix EP02 Duration Inconsistency in Cross-Episode Report

## Status: DONE

## Summary

The cross-episode report's 航路の連続性 section cited EP02 transit time as "約107日" (2-phase model) while the timeline, charts, and all other references consistently used "約87日" (single-phase prograde model). This created internal inconsistency.

The 87-day value is the prograde-only trajectory time (3-day thrust + ballistic cruise). The 107-day value accounts for a deceleration phase needed for Saturn capture (3+3 day 2-phase model). Both are correct for different purposes, but the timeline calculations all use ~87 days.

Fixed by:
- Line 138: "約87日、土星捕獲のための2相減速を含めると約107日" — acknowledges both values
- Line 141: "約87日、2相モデルでは約107日" — same dual citation in cold sleep section
- Added TDD test verifying 航路の連続性 and タイムライン sections both cite 87日

## Impact

- Cross-episode report now internally consistent on EP02 duration
- Readers understand why two values exist (trajectory time vs capture-capable arrival)
- Test prevents future regression of this inconsistency
