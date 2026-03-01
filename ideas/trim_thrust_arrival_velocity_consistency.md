# Trim-Thrust Arrival Velocity Consistency Issue

## Status: RESOLVED (Task 281)

## Problem

The EP02 analysis used a **hybrid model** that combined:
- **Transit time** from the trim-thrust propagation (87 days with 3-day thrust)
- **Saturn v∞** from the ballistic hyperbolic model (4.69 km/s)

These were physically incompatible. The prograde-only trim-thrust model showed:
- 3-day thrust: arrival v∞ = 90.25 km/s (at Saturn's orbital radius)
- Ballistic: arrival v∞ = 9.21 km/s (after 997 days)

## Resolution: Two-Phase Model

Implemented a 2-phase (accel + decel) trim-thrust model with RK4 propagation:

| Scenario | Accel | Decel | Transit | v∞ (km/s) | Capture ΔV | Propellant |
|---|---|---|---|---|---|---|
| Prograde only | 3d | 0d | 87d | 90.3 | 74.1 km/s | 1.61% |
| Balanced | 1.5d | 1.5d | 166d | 10.5 | 2.9 km/s | 0.89% |
| Extended | 3d | 3d | 107d | 10.7 | 3.0 km/s | 1.74% |
| Ballistic | 0d | 0d | 997d | 9.2 | 2.2 km/s | 0.02% |

Key insight: With Isp = 10⁶ s (D-He³ fusion), propellant is NOT the constraint
(all scenarios < 2%). The constraint is damaged-ship thrust duration.

The ballistic v∞ = 4.69 km/s remains valid as a conservative lower bound.
The v∞ = 9.2 km/s from full 2D propagation is more accurate for the ballistic case.

## Consultation

gpt-5.2 physics consultation confirmed:
- 98 kN on 300t is "main engine class" by conventional standards, but at Isp = 10⁶ s
  the propellant cost is negligible (0.87% for 84.7 km/s)
- "Trim" should be interpreted as course correction + deceleration, not pure prograde
- Ballistic v∞ naturally follows from the Jupiter escape state (v_helio slightly > v_esc_solar)
