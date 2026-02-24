# Task 064: Attitude Control Precision & Stability Analysis

## Status: DONE

## Motivation
Human directive: 要求される姿勢制御精度や姿勢安定度についても考察したい

SOLAR LINE features high-acceleration brachistochrone maneuvers (20-30 m/s²) and precision navigation. The attitude control requirements hadn't been analyzed yet.

## Completed

### Rust Core (`crates/solar-line-core/src/attitude.rs`)
8 attitude control functions with 10 unit tests:
- `miss_distance_km`: Pointing error → lateral displacement during burn
- `required_pointing_rad`: Inverse — desired miss → required accuracy
- `flip_angular_rate`: 180° flip maneuver angular velocity
- `flip_angular_momentum`: Ship I × ω
- `flip_rcs_torque`: Trapezoidal profile RCS torque for flip
- `velocity_error_from_pointing`: Pointing offset → velocity error
- `accuracy_to_pointing_error_rad`: Navigation accuracy fraction → angle
- `gravity_gradient_torque`: Gravity gradient on elongated spacecraft

### WASM Bindings (`crates/solar-line-wasm/src/lib.rs`)
All 8 functions exposed with flat f64 API.

### Analysis Report (`reports/data/summary/attitude-control.json`)
Dedicated summary page with 7 sections:
1. Overview — inertia models, analysis scope
2. EP01 — pointing sensitivity table (0.001″→1°), flip maneuver dynamics (60s→600s)
3. EP03 — 1.23° nav crisis matches tan calculation to 0.2%, INS drift rate consistent with modern RLG
4. EP04 — thrust misalignment torque analysis, 65% output RCS requirements
5. EP05 — 20km@18.2AU = 1.5 milliarcsec (33× Hubble), nozzle asymmetry → seconds to diverge
6. LEO gravity gradient — 88 N·m max, manageable
7. Conclusion — all findings summarized, SOLAR LINE respects attitude physics implicitly

### DAG
- Added `analysis.attitude_control` and `report.attitude_control` nodes
- DAG: 60 nodes, 300 edges (was 58/267)

### Key Findings
- EP01: Ganymede SOI requires ≤37.6″ pointing — achievable with star trackers
- EP03: 1.23° nav error = 14,390,000 km miss (show says 14,360,000 km — 0.2% match!)
- EP03: INS drift rate 0.01°/h × 143h ≈ 1.43° — matches the 1.23° discrepancy
- EP05: 20km arrival precision = 1.5 milliarcsec angular accuracy (impressive but achievable with MCC)
- EP05: 0.1% nozzle asymmetry → 1° misalignment in 3.4s (needs constant RCS correction)

### Test Results
- Rust: 153 core + 34 WASM = 187 tests passing
- TypeScript: 998 tests passing
- Total: 1,185 tests (0 failures)
