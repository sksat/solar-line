# Task 306: Cross-validate Supplementary Rust Modules

## Status: DONE

## Description
Add independent Python cross-validation for supplementary Rust modules that are currently
only tested internally:

1. **relativistic.rs**: Lorentz factor, time dilation, relativistic rocket equation, brachistochrone proper time
2. **attitude.rs**: Miss distance, pointing accuracy, flip maneuver torque, gravity gradient torque
3. **plasmoid.rs**: Magnetic/ram pressure, velocity perturbation, miss distance from encounter

These modules have internal Rust tests but no external cross-validation against
independent implementations (unlike the orbital mechanics core which has scipy/poliastro validation).

## Approach
- Add export of key values from these modules in `cross_validation_export.rs`
- Create `cross_validation/validate_supplementary.py` with independent Python implementations
- Integrate into `run.sh`
