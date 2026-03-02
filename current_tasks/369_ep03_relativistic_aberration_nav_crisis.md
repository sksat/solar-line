# Task 369: EP03 Navigation Crisis — Relativistic Stellar Aberration Analysis

## Status: DONE

## Goal
Analyze whether relativistic stellar aberration at 3,000 km/s (~1% c) could explain the 1.23° discrepancy between stellar navigation and inertial navigation in EP03.

## Findings

### Aberration calculation (verified by gpt-5.2)
- Maximum single-star aberration: arcsin(β) = arcsin(3000/299792.458) ≈ 0.573°
- This explains ~47% of the 1.23° discrepancy directly
- Aberration alone CANNOT reach 1.23° — it caps at 0.573° per star

### System-level failure hypothesis
At β ≈ 1%, star-tracker operation exceeds design assumptions:
1. Velocity vector input error → aberration correction residual
2. Non-rigid sky distortion (Lorentz mapping ≠ rotation) → pattern match failure
3. Doppler shift (±1%) → detection/weighting bias
4. CCD degradation from cosmic rays (mentioned in show)

### Key insight
INS (accelerometers/gyros) is unaffected by aberration — exactly matching the show's "two systems disagree" depiction. きりたん's "星は嘘をつかないか" (16:12) is literally physically correct: relativistic effects made the stars "lie."

## Changes
- `ts/src/relativistic-analysis.ts`: Added `analyzeStellarAberration()` with velocity sweep data
- `ts/src/relativistic-analysis.test.ts`: +8 stellar-aberration tests
- `reports/data/episodes/ep03.md`: Added "航法系不一致の物理的原因 — 相対論的光行差仮説" section with chart data
- `reports/data/summary/cross-episode.md`: Added "例外: 相対論的光行差と EP03 航法危機" subsection
- `ts/src/article-content-validation.test.ts`: +3 content validation tests
- Total: +11 new tests, all 2,384 TS tests pass
