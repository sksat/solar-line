# Trim-Thrust Arrival Velocity Consistency Issue

## Problem

The EP02 analysis uses a **hybrid model** that combines:
- **Transit time** from the trim-thrust propagation (87 days with 3-day thrust)
- **Saturn v∞** from the ballistic hyperbolic model (4.69 km/s)

These are physically incompatible. The trim-thrust propagation shows:
- 3-day thrust: arrival v∞ = 90.25 km/s (at Saturn's orbital radius)
- Ballistic: arrival v∞ = 9.21 km/s (after 997 days)
- Simple vis-viva: v∞ = 4.69 km/s (ignores orbital curvature)

If the ship fires prograde for 3 days (ΔV = 84.7 km/s), it crosses Saturn's orbital radius in 87 days but at ~91.6 km/s — far too fast for the 0.61 km/s capture ΔV.

## Root Cause

The current trim-thrust model (`ep02-analysis.ts::trimThrustTransferAnalysis`) applies constant prograde thrust (optimized angle) for N days, then coasts. It correctly computes when the ship crosses Saturn's orbital radius. However, it doesn't model:

1. **Deceleration before Saturn**: The ship would need to flip and brake before arriving
2. **Course correction vs acceleration**: "Trim only" might mean direction changes, not speed increases
3. **Saturn SOI entry dynamics**: The propagation doesn't switch to Saturn-centric frame at SOI

## Possible Resolutions

1. **Reinterpret "trim" as course correction**: The 3-day thrust applies primarily cross-track corrections to redirect toward Saturn, with minimal net speed increase. This would reduce arrival v∞ but also increase transit time.

2. **Add a deceleration phase**: After 3 days of acceleration and coast, the ship performs a deceleration burn near Saturn. This requires propellant but the 0.86% consumption is compatible with having fuel reserves.

3. **Use the ballistic model for capture analysis**: Accept that the "87 days" is approximate and the actual Saturn arrival conditions are better described by the ballistic model (v∞ ≈ 9.2 km/s). The trim thrust primarily ensures the ship reaches Saturn at all, not that it arrives at a specific speed.

4. **Saturn gravitational capture**: With v∞ = 4.69 km/s (ballistic hyperbolic), the minimum capture ΔV at Enceladus orbit is 0.61 km/s. With v∞ = 9.21 km/s (propagated ballistic), it's significantly higher. Need to recalculate.

## Status

Documented as a known inconsistency in the EP02 report text. The analysis text now notes the discrepancy and flags it for future investigation.

## Priority: MEDIUM

This doesn't affect the story's plausibility verdict (conditional), but it weakens the quantitative analysis of the Saturn approach/capture sequence.
