//! Plasmoid perturbation analysis for SOLAR LINE.
//!
//! Models the trajectory perturbation from a plasmoid encounter in the
//! Uranus magnetosphere (EP04). Distinguishes between:
//!   - **Radiation effect** (biological): modeled elsewhere (EP04 report)
//!   - **Momentum effect** (trajectory): modeled here
//!
//! Based on DiBraccio & Gershman (2019) Voyager 2 observations:
//!   - Plasmoid dimensions: ~200,000 km × 400,000 km
//!   - Composition: primarily ionized hydrogen
//!   - Mass loss rate: ~0.007 kg/s (implies low density)
//!   - Magnetic field: closed loop topology
//!
//! Key physics:
//!   - Ram pressure: P_ram = 0.5 × ρ × v²
//!   - Magnetic pressure: P_mag = B² / (2μ₀)
//!   - Force on ship: F = P × A_cross (cross-sectional area)
//!   - Impulse: J = F × Δt (transit duration)
//!   - Velocity change: Δv = J / m_ship

/// Permeability of free space (H/m = kg⋅m/A²/s²)
const MU_0: f64 = 1.256_637_062e-6;

/// Proton mass (kg) for hydrogen plasma density calculations
const PROTON_MASS_KG: f64 = 1.672_621_924e-27;

/// Magnetic pressure (Pa) from a magnetic field.
///
/// P_mag = B² / (2μ₀)
///
/// # Arguments
/// * `b_tesla` - Magnetic field strength in Tesla
pub fn magnetic_pressure_pa(b_tesla: f64) -> f64 {
    b_tesla * b_tesla / (2.0 * MU_0)
}

/// Ram pressure (Pa) from bulk plasma flow.
///
/// P_ram = 0.5 × ρ × v²
///
/// # Arguments
/// * `density_kg_m3` - Plasma mass density in kg/m³
/// * `velocity_m_s` - Bulk flow velocity in m/s
pub fn ram_pressure_pa(density_kg_m3: f64, velocity_m_s: f64) -> f64 {
    0.5 * density_kg_m3 * velocity_m_s * velocity_m_s
}

/// Plasma number density to mass density conversion.
///
/// Assumes pure hydrogen (proton) plasma.
///
/// # Arguments
/// * `n_per_m3` - Number density in particles/m³
pub fn number_density_to_mass(n_per_m3: f64) -> f64 {
    n_per_m3 * PROTON_MASS_KG
}

/// Force on spacecraft from combined magnetic and ram pressure.
///
/// F = (P_mag + P_ram) × A_cross
///
/// Uses the effective cross-section exposed to the plasmoid flow.
/// For a magnetically shielded ship, the effective area is the
/// magnetosphere standoff cross-section, not the physical hull.
///
/// # Arguments
/// * `pressure_pa` - Total dynamic + magnetic pressure (Pa)
/// * `cross_section_m2` - Effective cross-sectional area (m²)
pub fn plasmoid_force_n(pressure_pa: f64, cross_section_m2: f64) -> f64 {
    pressure_pa * cross_section_m2
}

/// Velocity perturbation from plasmoid encounter.
///
/// Δv = F × Δt / m_ship
///
/// # Arguments
/// * `force_n` - Force on spacecraft (N)
/// * `transit_duration_s` - Duration of plasmoid transit (s)
/// * `ship_mass_kg` - Spacecraft mass (kg)
///
/// Returns velocity perturbation in m/s.
pub fn velocity_perturbation_m_s(force_n: f64, transit_duration_s: f64, ship_mass_kg: f64) -> f64 {
    force_n * transit_duration_s / ship_mass_kg
}

/// Miss distance from a velocity perturbation over remaining travel time.
///
/// For a small lateral velocity kick Δv_lateral applied at time t=0,
/// the lateral displacement after time T is:
///   miss = Δv_lateral × T
///
/// # Arguments
/// * `dv_lateral_m_s` - Lateral velocity perturbation (m/s)
/// * `remaining_time_s` - Time from perturbation to destination (s)
///
/// Returns miss distance in km.
pub fn miss_distance_from_perturbation_km(dv_lateral_m_s: f64, remaining_time_s: f64) -> f64 {
    (dv_lateral_m_s * remaining_time_s) / 1000.0
}

/// Course-correction ΔV needed to compensate for a perturbation.
///
/// For an impulsive correction at time t_corr after the perturbation,
/// the required ΔV equals the original perturbation (for optimal
/// immediate correction). For delayed correction:
///   Δv_corr = miss_distance / remaining_time_after_correction
///
/// For immediate correction (best case), Δv_corr ≈ Δv_perturbation.
///
/// # Arguments
/// * `dv_perturbation_m_s` - Velocity perturbation to correct (m/s)
///
/// Returns required correction ΔV in m/s.
pub fn correction_dv_m_s(dv_perturbation_m_s: f64) -> f64 {
    dv_perturbation_m_s.abs()
}

/// Full plasmoid perturbation analysis.
///
/// Computes trajectory perturbation for a spacecraft transiting
/// through a plasmoid in the Uranus magnetosphere.
///
/// # Arguments
/// * `b_tesla` - Plasmoid magnetic field strength (T)
/// * `n_density_per_m3` - Plasma number density (particles/m³)
/// * `plasma_velocity_m_s` - Bulk plasma flow velocity (m/s)
/// * `cross_section_m2` - Spacecraft effective cross-section (m²)
/// * `transit_duration_s` - Plasmoid transit duration (s)
/// * `ship_mass_kg` - Spacecraft mass (kg)
/// * `remaining_travel_s` - Time from plasmoid to destination (s)
pub fn plasmoid_perturbation(
    b_tesla: f64,
    n_density_per_m3: f64,
    plasma_velocity_m_s: f64,
    cross_section_m2: f64,
    transit_duration_s: f64,
    ship_mass_kg: f64,
    remaining_travel_s: f64,
) -> PlasmoidPerturbation {
    let p_mag = magnetic_pressure_pa(b_tesla);
    let rho = number_density_to_mass(n_density_per_m3);
    let p_ram = ram_pressure_pa(rho, plasma_velocity_m_s);
    let total_pressure = p_mag + p_ram;

    let force = plasmoid_force_n(total_pressure, cross_section_m2);
    let impulse_ns = force * transit_duration_s;
    let dv = velocity_perturbation_m_s(force, transit_duration_s, ship_mass_kg);
    let miss_km = miss_distance_from_perturbation_km(dv, remaining_travel_s);
    let correction = correction_dv_m_s(dv);

    PlasmoidPerturbation {
        magnetic_pressure_pa: p_mag,
        ram_pressure_pa: p_ram,
        total_pressure_pa: total_pressure,
        force_n: force,
        impulse_ns,
        velocity_perturbation_m_s: dv,
        miss_distance_km: miss_km,
        correction_dv_m_s: correction,
    }
}

/// Results of a plasmoid perturbation analysis.
#[derive(Debug, Clone)]
pub struct PlasmoidPerturbation {
    /// Magnetic pressure component (Pa)
    pub magnetic_pressure_pa: f64,
    /// Ram (dynamic) pressure component (Pa)
    pub ram_pressure_pa: f64,
    /// Total pressure on spacecraft (Pa)
    pub total_pressure_pa: f64,
    /// Force on spacecraft (N)
    pub force_n: f64,
    /// Total impulse (N⋅s)
    pub impulse_ns: f64,
    /// Velocity change from encounter (m/s)
    pub velocity_perturbation_m_s: f64,
    /// Miss distance at destination (km)
    pub miss_distance_km: f64,
    /// Required course-correction ΔV (m/s)
    pub correction_dv_m_s: f64,
}

/// Parameter scenarios for Uranus plasmoid analysis.
///
/// Returns (label, B_tesla, n_per_m3, v_m_s) tuples for
/// nominal, enhanced, and extreme scenarios based on
/// Voyager 2 data and magnetosphere models.
pub fn uranus_plasmoid_scenarios() -> Vec<(&'static str, f64, f64, f64)> {
    vec![
        // Nominal: typical magnetotail conditions from Voyager 2
        // B ~ 1-5 nT, n ~ 0.01-0.1 cm⁻³, v ~ 100-200 km/s
        ("nominal", 2.0e-9, 0.05e6, 150_000.0),
        // Enhanced: compressed plasmoid with higher density/field
        // B ~ 10-20 nT, n ~ 0.5-1 cm⁻³, v ~ 200-300 km/s
        ("enhanced", 15.0e-9, 0.5e6, 250_000.0),
        // Extreme: reconnection-driven fast plasmoid
        // B ~ 50 nT (upper bound), n ~ 5 cm⁻³, v ~ 500 km/s
        ("extreme", 50.0e-9, 5.0e6, 500_000.0),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_magnetic_pressure_earth_field() {
        // Earth surface field ~50 μT → P = (50e-6)² / (2 × 1.257e-6) ≈ 0.995e-3 Pa
        let p = magnetic_pressure_pa(50e-6);
        assert!((p - 9.947e-4).abs() < 1e-5, "P_mag = {p} Pa");
    }

    #[test]
    fn test_magnetic_pressure_nanotelsa() {
        // 10 nT field → P ≈ 4e-11 Pa (very small)
        let p = magnetic_pressure_pa(10e-9);
        assert!(p < 1e-9, "P_mag = {p} Pa");
        assert!(p > 1e-12, "P_mag = {p} Pa");
    }

    #[test]
    fn test_ram_pressure() {
        // Solar wind at 1 AU: ρ ~ 5 cm⁻³ × mp, v ~ 400 km/s
        // P ≈ 0.5 × 5e6 × 1.67e-27 × (400e3)² ≈ 0.5 × 8.36e-21 × 1.6e11 ≈ 6.7e-10 Pa
        let rho = number_density_to_mass(5.0e6);
        let p = ram_pressure_pa(rho, 400_000.0);
        assert!(p > 1e-10 && p < 1e-8, "P_ram = {p} Pa");
    }

    #[test]
    fn test_number_density_conversion() {
        // 1 proton/cm³ = 1e6 proton/m³
        let rho = number_density_to_mass(1.0e6);
        assert!((rho - PROTON_MASS_KG * 1.0e6).abs() < 1e-30);
    }

    #[test]
    fn test_velocity_perturbation_basic() {
        // 1 N force, 480 s, 48e6 kg ship → Δv = 480 / 48e6 = 1e-5 m/s
        let dv = velocity_perturbation_m_s(1.0, 480.0, 48_000_000.0);
        assert!((dv - 1e-5).abs() < 1e-10, "dv = {dv} m/s");
    }

    #[test]
    fn test_miss_distance_basic() {
        // 0.001 m/s lateral, 30 days remaining
        let miss = miss_distance_from_perturbation_km(0.001, 30.0 * 86400.0);
        // 0.001 * 2.592e6 / 1000 = 2.592 km
        assert!((miss - 2.592).abs() < 0.01, "miss = {miss} km");
    }

    #[test]
    fn test_correction_dv_equals_perturbation() {
        assert_eq!(correction_dv_m_s(0.005), 0.005);
        assert_eq!(correction_dv_m_s(-0.005), 0.005);
    }

    #[test]
    fn test_ep04_nominal_scenario() {
        // EP04 Kestrel parameters:
        // - Mass: 48,000 t = 48e6 kg
        // - Transit: 8 min = 480 s
        // - Remaining to Titania: ~9h42m = 34920 s
        // - Ship cross-section (estimate): ~200 m² (magnetic shield larger)
        //   Kestrel with magnetic shield → effective standoff ~50 m radius → π×50² ≈ 7854 m²
        let result = plasmoid_perturbation(
            2.0e-9,       // 2 nT nominal field
            0.05e6,       // 0.05 cm⁻³ density
            150_000.0,    // 150 km/s bulk velocity
            7854.0,       // π × 50² m² effective cross-section
            480.0,        // 8 min transit
            48_000_000.0, // 48,000 t
            34_920.0,     // 9h42m to Titania
        );

        // At nominal conditions, perturbation should be very small
        assert!(
            result.velocity_perturbation_m_s < 0.001,
            "nominal Δv = {} m/s (should be < 0.001)",
            result.velocity_perturbation_m_s
        );
        assert!(
            result.miss_distance_km < 1.0,
            "nominal miss = {} km",
            result.miss_distance_km
        );
        assert!(result.force_n < 1.0, "nominal force = {} N", result.force_n);
    }

    #[test]
    fn test_ep04_extreme_scenario() {
        // Even at extreme conditions, perturbation on a 48,000 t ship is small
        let result = plasmoid_perturbation(
            50.0e-9,      // 50 nT extreme field
            5.0e6,        // 5 cm⁻³ high density
            500_000.0,    // 500 km/s fast plasmoid
            7854.0,       // same cross-section
            480.0,        // 8 min transit
            48_000_000.0, // 48,000 t
            34_920.0,     // 9h42m to Titania
        );

        // Even extreme scenario: perturbation is negligible for a massive ship
        // Force should be < 100 N, Δv < 0.01 m/s
        assert!(
            result.velocity_perturbation_m_s < 0.1,
            "extreme Δv = {} m/s",
            result.velocity_perturbation_m_s
        );
        assert!(
            result.correction_dv_m_s < 0.1,
            "extreme correction = {} m/s",
            result.correction_dv_m_s
        );
    }

    #[test]
    fn test_scenarios_provided() {
        let scenarios = uranus_plasmoid_scenarios();
        assert_eq!(scenarios.len(), 3);
        assert_eq!(scenarios[0].0, "nominal");
        assert_eq!(scenarios[1].0, "enhanced");
        assert_eq!(scenarios[2].0, "extreme");
    }

    #[test]
    fn test_pressure_dominance_at_low_field() {
        // At low B (2 nT) and higher density (1 cm⁻³), ram pressure dominates
        let p_mag = magnetic_pressure_pa(2.0e-9);
        let rho = number_density_to_mass(1.0e6); // 1 cm⁻³
        let p_ram = ram_pressure_pa(rho, 300_000.0); // 300 km/s
        assert!(
            p_ram > p_mag,
            "p_ram={p_ram} should > p_mag={p_mag} at low B, high density"
        );
    }

    #[test]
    fn test_pressure_dominance_at_high_field() {
        // At higher B (50 nT), magnetic pressure becomes more significant
        let p_mag = magnetic_pressure_pa(50.0e-9);
        // Compare with low-density slow ram pressure
        let rho = number_density_to_mass(0.01e6);
        let p_ram = ram_pressure_pa(rho, 100_000.0);
        // At 50 nT, P_mag ≈ 1e-9 Pa, P_ram for low density ≈ 8.4e-11 Pa
        // Magnetic pressure should dominate at high field + low density
        assert!(
            p_mag > p_ram,
            "p_mag={p_mag} should > p_ram={p_ram} at high B / low density"
        );
    }

    #[test]
    fn test_radiation_vs_momentum_insight() {
        // Key insight for EP04 analysis: radiation is dangerous,
        // but momentum perturbation is negligible for a 48,000 t ship.
        //
        // This is because:
        // 1. The ship is extremely massive (48,000 t)
        // 2. Plasmoid pressures are ~nPa level
        // 3. Even with 8 min transit, impulse << ship momentum
        //
        // Contrast with radiation: 480 mSv is biologically significant
        // but mechanically irrelevant.
        let result = plasmoid_perturbation(
            15.0e-9,      // enhanced field
            0.5e6,        // enhanced density
            250_000.0,    // 250 km/s
            7854.0,       // shield area
            480.0,        // 8 min
            48_000_000.0, // 48,000 t
            34_920.0,     // 9h42m
        );

        // Ship velocity change vs. orbital velocity (~5 km/s at Titania orbit)
        // perturbation / orbital velocity ratio
        let orbital_v_m_s = 5000.0; // ~5 km/s Titania orbital velocity
        let ratio = result.velocity_perturbation_m_s / orbital_v_m_s;
        assert!(
            ratio < 1e-6,
            "perturbation/orbital ratio = {ratio} (negligible)"
        );
    }

    // --- Edge case tests ---

    #[test]
    fn zero_magnetic_field() {
        assert_eq!(magnetic_pressure_pa(0.0), 0.0);
    }

    #[test]
    fn zero_density_ram_pressure() {
        assert_eq!(ram_pressure_pa(0.0, 500_000.0), 0.0);
    }

    #[test]
    fn zero_velocity_ram_pressure() {
        assert_eq!(ram_pressure_pa(1e-20, 0.0), 0.0);
    }

    #[test]
    fn zero_transit_duration() {
        let dv = velocity_perturbation_m_s(100.0, 0.0, 48_000_000.0);
        assert_eq!(dv, 0.0);
    }

    #[test]
    fn zero_remaining_time_zero_miss() {
        let miss = miss_distance_from_perturbation_km(0.01, 0.0);
        assert_eq!(miss, 0.0);
    }

    #[test]
    fn plasmoid_force_scales_linearly() {
        let f1 = plasmoid_force_n(1e-9, 1000.0);
        let f2 = plasmoid_force_n(1e-9, 2000.0);
        assert!((f2 / f1 - 2.0).abs() < 1e-14);
    }

    #[test]
    fn correction_dv_zero_input() {
        assert_eq!(correction_dv_m_s(0.0), 0.0);
    }

    #[test]
    fn plasmoid_perturbation_zero_field_and_density() {
        let result = plasmoid_perturbation(
            0.0,          // no field
            0.0,          // no density
            150_000.0,
            7854.0,
            480.0,
            48_000_000.0,
            34_920.0,
        );
        assert_eq!(result.magnetic_pressure_pa, 0.0);
        assert_eq!(result.ram_pressure_pa, 0.0);
        assert_eq!(result.velocity_perturbation_m_s, 0.0);
        assert_eq!(result.miss_distance_km, 0.0);
    }

    #[test]
    fn light_ship_larger_perturbation() {
        // A 300 t ship (EP05 effective mass) gets perturbed more
        let heavy = plasmoid_perturbation(
            15.0e-9, 0.5e6, 250_000.0, 7854.0, 480.0,
            48_000_000.0, 34_920.0,
        );
        let light = plasmoid_perturbation(
            15.0e-9, 0.5e6, 250_000.0, 7854.0, 480.0,
            300_000.0, 34_920.0,
        );
        assert!(
            light.velocity_perturbation_m_s > heavy.velocity_perturbation_m_s * 100.0,
            "light ship Δv should be >> heavy ship Δv"
        );
    }

    #[test]
    fn scenarios_field_increases_with_severity() {
        let scenarios = uranus_plasmoid_scenarios();
        let (_, b0, _, _) = scenarios[0];
        let (_, b1, _, _) = scenarios[1];
        let (_, b2, _, _) = scenarios[2];
        assert!(b0 < b1, "nominal B < enhanced B");
        assert!(b1 < b2, "enhanced B < extreme B");
    }
}
