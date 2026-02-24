# Task 045: Propellant Budget Analysis (Tsiolkovsky Rocket Equation)

## Status: DONE

## Description
Add propellant mass analysis using the Tsiolkovsky rocket equation to evaluate whether D-He³ fusion propulsion can realistically deliver the ΔV values computed across all 5 episodes.

## Design (Codex-reviewed)
- Codex confirmed function set, recommended adding `initial_mass` helper and thrust-power checks
- Isp range 10⁵–10⁶ s confirmed as reasonable (cited NASA NTRS Longshot, Daedalus studies)
- Recommended cumulative sequential mass propagation across episodes
- Noted Tsiolkovsky as ideal lower bound (no gravity losses)

## Changes Made

### 1. Rust Core (crates/solar-line-core/src/orbits.rs)
New functions:
- `exhaust_velocity(isp_s)` — Isp (s) → exhaust velocity (km/s) via g₀
- `mass_ratio(delta_v, ve)` — Tsiolkovsky mass ratio exp(ΔV/vₑ)
- `propellant_fraction(delta_v, ve)` — 1 - 1/mass_ratio
- `required_propellant_mass(dry_mass_kg, delta_v, ve)` — propellant mass (kg)
- `initial_mass(dry_mass_kg, delta_v, ve)` — pre-burn mass (kg)
- `mass_flow_rate(thrust_n, ve)` — ṁ = F/vₑ (kg/s)
- `jet_power(thrust_n, ve)` — P_jet = ½Fvₑ (W)
- `G0_M_S2` constant added to constants.rs
- 15 new tests (chemical, fusion, overflow, Kestrel EP01 validation)

### 2. WASM Bindings (crates/solar-line-wasm/src/lib.rs)
- 7 new wasm_bindgen functions (flat f64 API, matching existing pattern)
- 7 new tests

### 3. Cross-Episode Summary (reports/data/summary/cross-episode.json)
New section: "推進剤収支（ツィオルコフスキー方程式による検証）"
- Isp sensitivity analysis: 10⁵, 5×10⁵, 10⁶ s
- Per-transfer propellant fractions for EP01, EP03, EP04, EP05
- Cumulative mass propagation (300t dry → 11,873t at Mars departure @ Isp 10⁶ s)
- Enceladus refueling hypothesis
- Thrust-power consistency: 48.1 TW @ Isp 10⁶ s
- Comparison table (Isp sensitivity)
- Updated 総合評価 with propellant budget findings
- Key finding: 48,000t公称値 is consistent as "満載時最大質量" (loaded maximum mass)

### 4. Test Counts
- Rust core: 80 tests (was 65, +15 new)
- WASM: 21 tests (was 14, +7 new)
- TypeScript: 831 tests (unchanged)
- Total: 932 tests (was 910, +22 new), 0 failures

## Files Modified
- `crates/solar-line-core/src/constants.rs` — G0_M_S2 constant
- `crates/solar-line-core/src/orbits.rs` — 7 new functions + 15 tests
- `crates/solar-line-core/src/lib.rs` — re-exports
- `crates/solar-line-wasm/src/lib.rs` — 7 WASM bindings + 7 tests
- `reports/data/summary/cross-episode.json` — new section + updated 総合評価
