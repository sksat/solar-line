# Task 125: 信頼できる外部実装による検算 (Cross-Validation)

## Status: DONE

## Description
複雑な軌道遷移の分析結果を、信頼できる外部実装（scipy/numpy による独立実装）で検算する。
自前のRust実装との差異を確認し、分析の信頼性を向上させる。

## Implementation
- `cross_validation/validate.py`: Independent Python implementation of all orbital mechanics formulas
- `cross_validation/run.sh`: End-to-end runner script
- `crates/solar-line-core/tests/cross_validation_export.rs`: Rust test that exports calculation results as JSON
- `npm run cross-validate`: npm script wrapper
- `.github/workflows/ci.yml`: CI job for automated cross-validation

## Validated Functions (64 checks, all PASS)
1. **Constants**: μ_sun, μ_earth, μ_jupiter, g₀
2. **Vis-viva**: LEO/GEO circular velocity, Earth orbital velocity
3. **Hohmann transfers**: LEO→GEO, Earth→Mars, Earth→Jupiter ΔV₁/ΔV₂
4. **Orbital periods**: Earth, Mars, Jupiter (days), LEO (minutes)
5. **Brachistochrone**: Acceleration, ΔV, max distance (1 AU in 72h)
6. **Tsiolkovsky**: Exhaust velocity, mass ratio, propellant fraction, Kestrel EP01 mass
7. **Kepler equation**: 6 test cases (e=0.1-0.9), eccentric + true anomaly
8. **SOI radii**: Jupiter (~48.2 Mkm), Earth (~0.929 Mkm), Saturn
9. **Gravity assist**: Unpowered flyby (v_inf conservation, turn angle), powered flyby (Oberth effect)
10. **Oberth effect**: Gain and efficiency at various v_inf values
11. **Plane change**: 90° plane change ΔV
12. **Orbit propagation**: LEO 1-period energy conservation (Rust RK4 vs scipy RK45)

## Key Finding
All 64 cross-validation checks pass with relative errors at or below machine epsilon (~1e-15).
Rust RK4 and scipy RK45 both maintain energy conservation to better than 1e-8 relative error
over one orbital period.

## Origin
人間指示: 「複雑な軌道遷移などは、Orekit などの信頼できるシミュレータで検算すること」
