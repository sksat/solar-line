# Task 532: Schema Pinning + Constants Tests

## Status: DONE

## Summary

Three targeted test improvements:
1. Schema pinning in recalculate.test.ts: verify EP03/EP04/EP05 analyzer output keys
2. Rust constants.rs: add reference_orbits ordering, G0, c, AU tests
3. kestrel.test.ts: add thrust ordering invariant (peak > nominal > damaged)

## Changes

### recalculate.test.ts (3 new tests)
- EP03 key schema: brachistochrone, navCrisis, cruiseVelocity, massFeasibility, moonComparison
- EP04 key schema: plasmoid, fleetIntercept, damageAssessment, plasmoidMomentum
- EP05 key schema: fullRoute, nozzleLifespan, oberthEffect, burnBudget, earthCapture

### constants.rs (4 new tests)
- reference_orbits ordering: LEO > Earth > GEO
- G0 standard value (9.80665)
- c order of magnitude (299,000-300,000)
- AU matches orbit_radius::EARTH

### kestrel.test.ts (1 new test)
- Thrust ordering: peak > nominal > damaged

## Impact

Guards against silent key removal in analyzers and constant value errors.
