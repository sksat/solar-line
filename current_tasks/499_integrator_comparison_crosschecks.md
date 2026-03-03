# Task 499: Integrator Comparison JSON → Report Cross-Checks

## Status: DONE

## Summary

Added cross-integrator comparison section to cross-episode.md and 5 new cross-check tests validating that `integrator_comparison.json` values are properly cited.

## Changes

### Report (cross-episode.md)
- Added "積分器クロスチェック（RK4 vs RK45 vs Störmer-Verlet）" subsection
- Cites specific position differences: EP01 0.015%, EP03 0.008%, EP05 0.007%
- Cites RK45 cost ratio 0.07 (15× cheaper than RK4)
- Notes Störmer-Verlet symplectic energy oscillation and machine-precision agreement for EP02 ballistic

### Tests (article-content-validation.test.ts)
- 5 new tests in `integrator_comparison.json → report cross-checks`:
  - EP01, EP03, EP05 brachistochrone position difference percentages
  - RK45 cost ratio 0.07
  - Conclusion "no analysis results need updating" reflected

## Impact

- All standalone calculation JSONs now have report cross-checks: relativistic_effects, 3d_orbital_analysis, integrator_comparison, onscreen_crossref (per-episode)
- Cross-episode report gains quantitative cross-integrator validation section
