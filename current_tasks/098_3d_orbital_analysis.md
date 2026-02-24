# Task 098: 3D Orbital Analysis

## Status: DONE (2026-02-24)

## Motivation
Human directive: 2次元的な計算である程度の分析ができてきたら、3次元的な詳細な分析も行い、軌道傾斜角や土星の輪との位置関係などについても分析すること。

## Scope
1. Extend orbit propagation to 3D (add orbital inclination, RAAN, argument of periapsis)
2. Analyze Saturn ring plane crossing — does Kestrel's trajectory intersect the rings?
3. Consider out-of-plane components for:
   - Transfer orbits between planets with different inclinations
   - Gravity assists (hyperbolic plane vs ecliptic)
   - Enceladus orbit relative to Saturn ring plane
4. Add 3D visualization or projection views to reports

## Completed Work

### Rust Core (solar-line-core)
- **Vec3**: Added `cross_raw()`, `cross_raw_with()` (mixed types), `normalize()` methods
- **ephemeris.rs**: Extended `PlanetPosition` with `z`, `latitude`, `inclination` fields. Updated `planet_position()` from simplified coplanar λ=ω+ν+Ω to proper 3D rotation matrix (Ω, i, ω)
- **orbits.rs**: Added `elements_to_state_vector()` (Keplerian → Cartesian via perifocal rotation) and `plane_change_dv()` function
- **orbital_3d.rs** (NEW): Module for 3D orbital analysis:
  - Saturn ring system constants and ring plane normal (IAU J2000 pole)
  - Uranus system constants and spin axis computation
  - `saturn_ring_crossing()`: analyzes trajectory intersections with Saturn's ring plane
  - `uranus_approach_analysis()`: analyzes approach geometry relative to Uranus's extreme tilt
  - `ecliptic_z_height()`, `max_ecliptic_z_height()`, `out_of_plane_distance()`
  - `transfer_inclination_penalty()`: computes inclination-change ΔV for each transfer
  - 17 tests in orbital_3d, 7 tests in orbits.rs (elements_to_state_vector, plane_change_dv)
- **comms.rs**: Updated `distance_between_positions()` to 3D, fixed test PlanetPosition construction

### WASM Bridge (solar-line-wasm)
- Updated `planet_position()` binding to return z, latitude, inclination
- Added 9 new WASM bindings: `ecliptic_z_height`, `max_ecliptic_z_height`, `out_of_plane_distance`, `plane_change_dv`, `transfer_inclination_penalty`, `saturn_ring_plane_normal`, `uranus_spin_axis_ecliptic`, `saturn_ring_crossing`, `uranus_approach_analysis`, `elements_to_state_vector`

### TypeScript
- **ephemeris.ts**: Updated `PlanetPosition` interface with z, latitude, inclination. Updated `planetPosition()` to use 3D rotation matrix
- **orbital-3d-analysis.ts** (NEW): 3D analysis script computing:
  - Per-transfer ecliptic z-heights and out-of-plane distances
  - Inclination change ΔV penalties per episode
  - Saturn ring plane crossing analysis (EP02)
  - Uranus axial tilt approach geometry (EP03/EP04)
- **ephemeris.test.ts**: Updated consistency test for 3D coordinates
- Output: `reports/data/calculations/3d_orbital_analysis.json`

### Key Findings
- **Coplanar approximation mostly valid**: Plane change ΔV < 1% of transfer ΔV for EP01 (0.47%) and EP04 (0.71%). Slightly > 1% for EP02 (1.06%) and EP03 (1.51%)
- **Saturn ring approach**: 26.8° angle to ring plane from Jupiter approach. Enceladus orbits at 238,042 km, safely outside rings (140,180 km)
- **Uranus approach**: From Saturn at ~60° to equatorial, toward Earth at ~69° — nearly polar, consistent with Uranus's 97.77° obliquity
- **Out-of-plane distances**: Up to 0.22 AU for Saturn→Uranus transfer

## Remaining Work (future tasks)
- 3D visualization/projection views in reports
- Ring crossing animation in orbital diagrams
- Extend to gravity assist out-of-plane analysis
