# Task 456: Extend CI Cross-Validation to Include Poliastro and DAG Checks

## Status: **DONE**

## Summary

CI currently runs 3 of 5 cross-validation scripts (validate.py, validate_trim_thrust.py, validate_supplementary.py). Two are missing:
- validate_poliastro.py (42 checks, needs astropy + poliastro)
- validate_dag.py (41 checks, needs networkx)

Adding these to CI gives full 442-check coverage and catches regressions in orbital mechanics and DAG analysis.
