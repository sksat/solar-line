# Task 325: Symplectic Integrator + Orbital 3D + Plasmoid Cross-Validation

## Status: DONE

## Description
Add cross-validation for uncovered Rust functions:
1. **Störmer-Verlet symplectic integrator** — 10 LEO orbits + eccentric orbit (energy drift, return-to-start)
2. **orbital_3d geometry** — saturn_ring_crossing, uranus_approach_analysis, ecliptic_z_height, max_ecliptic_z_height, out_of_plane_distance, transfer_inclination_penalty
3. **Plasmoid sub-functions** — plasmoid_force_n, velocity_perturbation_m_s, miss_distance_from_perturbation_km, correction_dv_m_s + full EP04 composition check
4. **Comms extras** — planet_distance_range, planet_light_delay_range

Cross-validation: 268 → 313 (scipy 168 + poliastro 25 + trim-thrust 5 + supplementary 115)
