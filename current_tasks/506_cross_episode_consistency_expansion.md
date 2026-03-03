# Task 506: Cross-Episode Consistency Expansion in analysis-reproduction.test.ts

## Status: DONE

## Summary

Expanded cross-episode consistency checks in `analysis-reproduction.test.ts` from 3 tests to 24 tests. Verifies that per-episode analyses use consistent parameters across independently-maintained calculation modules.

## Tests Added (21 new)

### Constants consistency (5 tests)
- Isp: relativistic analysis `parameters.ispSeconds` == KESTREL.ispS
- Speed of light: relativistic `parameters.speedOfLightKms` == C_KMS
- Exhaust velocity: relativistic `parameters.exhaustVelocityKms` == EXHAUST_VELOCITY_KMS
- EP04 damaged thrust == DAMAGED_THRUST_MN (6.37)
- EP04 normal thrust == THRUST_MN (9.8)

### EP04→EP05 damage linkage (4 tests)
- Thrust fraction 0.65 consistent; 48kt accel matches EP04→EP05
- Radiation exposure 480 mSv carries from EP04 into EP05 burn budget
- EP05 remaining-to-ICRP = limit - current (arithmetic consistency)
- EP04 plasmoid shield margin 43% matches EP05 nozzle seriesMargins

### Nozzle sensitivity (3 tests)
- Plan scenario has positive margin (1560s)
- 1% burn increase → negative margin (nozzle fails)
- 5% decrease → largest positive margin (>10000s)

### Relativistic cumulative (3 tests)
- Cumulative time dilation ≈ sum of per-transfer values
- Minutes = seconds / 60 (unit consistency)
- EP05 contributes the most time dilation

### Oberth effect (3 tests)
- Best-case efficiency 0.07% << claimed 3%
- Burn saving exceeds 26 min nozzle margin
- v_inf 1500 km/s < EP05 peak velocity (conservative assumption)

### Full route (3 tests)
- Furthest point ~19.2 AU ≈ Uranus semi-major axis
- 4 route legs
- EP04 damaged thrust / mass = EP05 48kt acceleration (parameter chain)

## Impact

Catches parameter drift across EP04→EP05 damage linkage, verifies kestrel.ts constants flow through to relativistic analysis, and confirms nozzle sensitivity scenarios bracket the margin correctly.
