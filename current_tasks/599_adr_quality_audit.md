# Task 599: ADR Quality Audit + Orekit Cross-Validation

## Status: **DONE**

## Description

### ADR Quality Audit
- All 15 ADRs (001-015) already have "Alternatives Considered" and "Assumptions" sections
- Added 31 regression tests in `report-data-validation.test.ts` to prevent future ADRs from missing these sections
- ADR template (000-template.md) also includes both sections

### Orekit Cross-Validation (main deliverable)
- CLAUDE.md explicitly requested cross-validation against trusted simulators like Orekit
- Installed `orekit-jpype` (Java-bridged Orekit) with DE-440 ephemeris data
- Created `cross_validation/validate_orekit.py` with **62 checks** across 10 categories:
  1. Gravitational parameters (GM) — 7 bodies validated against Orekit's JPL DE440 values
  2. Circular orbit velocities — LEO, GEO, Earth orbit
  3. Hohmann transfer ΔV — 5 transfers (LEO→GEO, Earth→Mars/Jupiter/Saturn/Uranus)
  4. Orbital periods — 5 planets + LEO
  5. Sphere of Influence radii — Jupiter, Earth, Saturn, Uranus
  6. Flyby mechanics — turn angle, v_periapsis, powered v∞ amplification
  7. Kepler equation — 6 test cases (E and ν, machine-precision match)
  8. Orbital elements → state vector — eccentric inclined + Halley-like orbits
  9. Numerical propagation — energy conservation to 1e-14
  10. Fundamental constants — g0

### Notable findings
- Sun GM: Rust vs Orekit match to 2e-12 relative error
- Jupiter/Saturn GM: ~2e-4 difference (DE430 vs DE440 ephemeris versions) — documented
- Kepler equation: machine-precision agreement (1e-16)
- Hohmann ΔV: ~1e-12 relative error
- State vectors: position exact, velocity ~8e-9 (from GM difference propagation)

### CI Integration
- Updated CI to install Java 17 + orekit-jpype
- Downloads Orekit ephemeris data during CI
- Added `validate_orekit.py` to CI pipeline
- Updated `run.sh` with conditional Orekit step

### Stats
- Python checks: 442 → 504 (+62 Orekit)
- TS tests: 4,105 → 4,136 (+31 ADR quality)
