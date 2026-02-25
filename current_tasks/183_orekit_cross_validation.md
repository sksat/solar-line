# Task 183: Add Orekit-based cross-validation to orbital calculations

## Status: TODO

## Description
The `cross_validation/` directory uses scipy for cross-validation, but the human directive
and CLAUDE.md both call for Orekit cross-validation specifically. Add Orekit-based validation
scripts to complement the existing scipy-based approach.

## Steps
1. Add Orekit Python wrapper (orekit pip package or poliastro as alternative)
2. Implement Orekit-based validation for key transfers:
   - EP01 brachistochrone Mars→Ganymede
   - EP02 ballistic Jupiter→Saturn
   - EP05 composite Uranus→Earth
3. Compare Orekit results against both Rust calculations and scipy results
4. Document discrepancies and update cross_validation/README.md

## Notes
- Orekit is a Java library with Python bindings
- Alternative: poliastro (pure Python) may be easier to set up
- The key value is having an independent, trusted orbital mechanics library validate our results
- Existing scipy validation already shows errors at ~1e-15, so this is mainly about confidence building
