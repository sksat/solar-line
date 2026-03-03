# Task 521: Onscreen Crossref Reproduction Tests

## Status: DONE

## Summary

Add reproduction tests pinning key numerical values from ep01-05_onscreen_crossref.json files. These crossref files compare on-screen navigation display values with computed orbital mechanics — testing ensures computed values don't drift when algorithms change.

## Tests to Add

### EP01 Jupiter SOI (2 tests)
- vis-viva velocity at 20 RJ: 17.92 km/s (vs on-screen 17.8 → 0.67% diff)
- Ganymede approach: relative velocity 1.60 km/s, computed v=12.48 km/s

### EP03 brachistochrone symmetry (2 tests)
- Cruise/capture burn duration ratio: 1.000274 (30s diff in ~109500s)
- Total burn ΔV: 5984.54 km/s (5984.31 main + 0.23 RCS)

### EP05 burn sequence (3 tests)
- 4 burn accelerations: 16.38, 13.66, 10.92, 15.02 m/s²
- Total burn time: 80.633 hours (290280 s)
- Ice particle impact: 540.1 MJ computed, 110 MJ on-screen (multifactorial explanation)

### EP05 nozzle margin crossref (1 test)
- On-screen +0:26:00 = analysis 26 min margin (0.78%)

## Impact

Pins on-screen ↔ computed crossref values. Catches drift in orbital mechanics affecting validated comparisons with anime source material.
