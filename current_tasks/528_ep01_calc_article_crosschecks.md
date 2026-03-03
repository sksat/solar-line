# Task 528: EP01 Calc→Article Cross-Checks for Coverage Parity

## Status: DONE

## Summary

EP01 has 23 calc→article cross-check assertions vs 28-34 for other episodes. It's the only episode without a Task 507/508 "additional calc JSON" block. Add ~10 assertions to bring EP01 to parity.

## Tests to Add

### Additional calc→article cross-checks (~10 assertions)
- 161x thrust gap (160.57 rounded) cited in report
- 3.34G / 32.8 m/s² required acceleration at 299t
- reachable distance 0.023 AU at 48,000t in 72h
- 912h / 38 days minimum transit at 48,000t
- Mass sensitivity: 4,800t scenario 0.229 AU, 480t scenario 2.29 AU
- Hohmann transfer time 1126.84 days in calc JSON
- Ship nominal acceleration 0.204 m/s² at 48,000t
- 48t scenario 22.9 AU (exceeds Mars-Jupiter distance)

## Impact

Achieves assertion count parity (~33) with EP02-EP05 cross-check sections.
