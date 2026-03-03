# Task 546: WASM 2→3 Tests + Article Content Gaps + Relativistic.rs Tests

## Status: DONE

## Summary

### WASM tests (4 additions, each block: 2→3)
1. vis_viva: genuine elliptical orbit — periapsis faster than circular, apoapsis slower
2. solve_kepler: high eccentricity (e=0.9) converges with residual < 1e-12
3. specific_energy: quantitative E = -μ/(2a) formula verification at GEO
4. exhaust_velocity: linearity check — doubling Isp doubles ve

### Article content validation (2 additions)
1. EP04 series margin: shield margin 43% with unit verification
2. EP05 series margin: nozzle margin ~0.78% cross-checked

### Rust relativistic.rs (2 additions, 22→24)
1. ΔV divergence at 0.1c: correction ~0.33% (between 0.3% and 1%)
2. Brachistochrone time dilation increases monotonically with acceleration

## Impact

- 4 WASM describe blocks expanded from 2 to 3 tests (vis_viva, solve_kepler, specific_energy, exhaust_velocity)
- All 4 series margins (EP02-EP05) now verified in article content tests
- Relativistic divergence quantified at 0.1c — important for SOLAR LINE peak velocity analysis
- Stats: 3,977 TS, 525 Rust (4,766 total)
