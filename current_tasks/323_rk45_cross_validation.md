# Task 323: RK45 Adaptive Propagation Cross-Validation

## Status: DONE

## Description
Add cross-validation for the Dormand-Prince RK45 adaptive integrator.
Currently only RK4 fixed-step is cross-validated (single LEO orbit).
The adaptive integrator is the most sophisticated numerical code and is used
for EP02 trim-thrust analysis.

Export RK45 results for:
- LEO circular orbit (10 periods) — compare energy drift vs scipy RK45
- Elliptical orbit — compare final state position/velocity
