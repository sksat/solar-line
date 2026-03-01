# Task 314: Add validate_trim_thrust.py to run.sh

## Status: DONE

## Description
The local cross-validation script (run.sh) was missing validate_trim_thrust.py,
which CI already runs. Added it as Step 5, renumbered supplementary to Step 6.
This ensures local and CI cross-validation coverage match.
