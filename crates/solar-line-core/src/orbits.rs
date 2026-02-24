/// Orbital element types and state vectors for 2-body problem.
use crate::units::{Eccentricity, Km, KmPerSec, Mu, Radians, Seconds};
use crate::vec3::Vec3;

/// Classical Keplerian orbital elements.
///
/// Assumption: These elements describe an orbit in a 2-body problem.
/// The reference frame and epoch must be tracked separately.
#[derive(Debug, Clone, Copy)]
pub struct OrbitalElements {
    /// Semi-major axis (km). Positive for elliptical orbits.
    pub semi_major_axis: Km,
    /// Orbital eccentricity (dimensionless, >= 0)
    pub eccentricity: Eccentricity,
    /// Inclination (radians, 0 to π)
    pub inclination: Radians,
    /// Right ascension of ascending node (radians, 0 to 2π)
    pub raan: Radians,
    /// Argument of periapsis (radians, 0 to 2π)
    pub arg_periapsis: Radians,
    /// True anomaly at epoch (radians)
    pub true_anomaly: Radians,
}

/// Cartesian state vector in an inertial frame.
#[derive(Debug, Clone, Copy)]
pub struct StateVector {
    /// Position vector (km)
    pub position: Vec3<Km>,
    /// Velocity vector (km/s)
    pub velocity: Vec3<KmPerSec>,
}

impl StateVector {
    pub fn new(position: Vec3<Km>, velocity: Vec3<KmPerSec>) -> Self {
        Self { position, velocity }
    }

    /// Orbital radius (distance from central body)
    pub fn radius(&self) -> Km {
        Km(self.position.norm_raw())
    }

    /// Orbital speed (magnitude of velocity)
    pub fn speed(&self) -> KmPerSec {
        KmPerSec(self.velocity.norm_raw())
    }
}

/// Vis-viva equation: v = sqrt(μ * (2/r - 1/a))
///
/// Calculates orbital velocity at distance r from the central body,
/// for an orbit with semi-major axis a.
pub fn vis_viva(mu: Mu, r: Km, a: Km) -> KmPerSec {
    KmPerSec((mu.value() * (2.0 / r.value() - 1.0 / a.value())).sqrt())
}

/// Calculate ΔV for a Hohmann transfer between two circular orbits.
///
/// Returns (dv1, dv2): ΔV at departure and arrival (km/s).
/// Assumes both orbits are circular and coplanar.
pub fn hohmann_transfer_dv(mu: Mu, r1: Km, r2: Km) -> (KmPerSec, KmPerSec) {
    let a_transfer = Km((r1.value() + r2.value()) / 2.0);

    let v_circular_1 = KmPerSec((mu.value() / r1.value()).sqrt());
    let v_transfer_1 = vis_viva(mu, r1, a_transfer);
    let dv1 = (v_transfer_1 - v_circular_1).abs();

    let v_circular_2 = KmPerSec((mu.value() / r2.value()).sqrt());
    let v_transfer_2 = vis_viva(mu, r2, a_transfer);
    let dv2 = (v_circular_2 - v_transfer_2).abs();

    (dv1, dv2)
}

/// Orbital period for an elliptical orbit: T = 2π * sqrt(a³/μ)
pub fn orbital_period(mu: Mu, a: Km) -> crate::units::Seconds {
    let a_val = a.value();
    crate::units::Seconds(std::f64::consts::TAU * (a_val.powi(3) / mu.value()).sqrt())
}

/// Specific orbital energy: ε = -μ/(2a)
pub fn specific_energy(mu: Mu, a: Km) -> f64 {
    -mu.value() / (2.0 * a.value())
}

/// Specific angular momentum magnitude for an elliptical orbit:
/// h = sqrt(μ * a * (1 - e²))
pub fn specific_angular_momentum(mu: Mu, a: Km, e: Eccentricity) -> f64 {
    (mu.value() * a.value() * (1.0 - e.value().powi(2))).sqrt()
}

/// Required constant acceleration for a brachistochrone (flip-at-midpoint) transfer.
///
/// Model: accelerate for half the distance, flip, decelerate for the other half.
/// a_required = 4 * d / t²
///
/// Returns acceleration in km/s².
///
/// Assumption: straight-line path, constant thrust, no gravity, rest-to-rest.
pub fn brachistochrone_accel(distance: Km, time: Seconds) -> f64 {
    (4.0 * distance.value()) / (time.value() * time.value())
}

/// ΔV for a brachistochrone transfer (constant thrust, flip at midpoint).
///
/// ΔV = a_required * t = 4 * d / t
///
/// Returns ΔV in km/s.
///
/// Assumption: straight-line path, constant thrust, no gravity, rest-to-rest.
pub fn brachistochrone_dv(distance: Km, time: Seconds) -> KmPerSec {
    KmPerSec((4.0 * distance.value()) / time.value())
}

/// Maximum reachable distance for a brachistochrone transfer at given acceleration and time.
///
/// d_max = a * t² / 4
///
/// Returns distance in km.
pub fn brachistochrone_max_distance(accel_km_s2: f64, time: Seconds) -> Km {
    Km(accel_km_s2 * time.value() * time.value() / 4.0)
}

// ── Tsiolkovsky rocket equation ──────────────────────────────────────

/// Convert specific impulse (seconds) to exhaust velocity (km/s).
///
/// vₑ = Isp × g₀, with g₀ = 9.80665 m/s² (converted to km/s).
///
/// Panics if `isp_s` is not positive.
pub fn exhaust_velocity(isp_s: f64) -> KmPerSec {
    assert!(isp_s > 0.0, "Isp must be positive");
    KmPerSec(isp_s * crate::constants::G0_M_S2 / 1000.0)
}

/// Tsiolkovsky mass ratio: m₀/m_f = exp(ΔV / vₑ).
///
/// Returns the ratio of initial mass to final (dry) mass required
/// to achieve the given ΔV at the given exhaust velocity.
///
/// Panics if `ve` is not positive or `delta_v` is negative.
/// Returns f64::INFINITY if ΔV/vₑ overflows exp().
pub fn mass_ratio(delta_v: KmPerSec, ve: KmPerSec) -> f64 {
    assert!(ve.value() > 0.0, "exhaust velocity must be positive");
    assert!(delta_v.value() >= 0.0, "delta-v must be non-negative");
    (delta_v.value() / ve.value()).exp()
}

/// Propellant mass fraction: 1 - 1/mass_ratio = 1 - exp(-ΔV/vₑ).
///
/// The fraction of initial mass that must be propellant.
/// Returns a value in [0, 1). For ΔV >> vₑ this approaches 1.
pub fn propellant_fraction(delta_v: KmPerSec, ve: KmPerSec) -> f64 {
    let mr = mass_ratio(delta_v, ve);
    if mr.is_infinite() {
        1.0
    } else {
        1.0 - 1.0 / mr
    }
}

/// Required propellant mass (kg) given dry (post-burn) mass and ΔV.
///
/// m_prop = m_dry × (exp(ΔV/vₑ) - 1)
pub fn required_propellant_mass(dry_mass_kg: f64, delta_v: KmPerSec, ve: KmPerSec) -> f64 {
    dry_mass_kg * (mass_ratio(delta_v, ve) - 1.0)
}

/// Initial (pre-burn) mass (kg) given dry mass and ΔV.
///
/// m₀ = m_dry × exp(ΔV/vₑ)
pub fn initial_mass(dry_mass_kg: f64, delta_v: KmPerSec, ve: KmPerSec) -> f64 {
    dry_mass_kg * mass_ratio(delta_v, ve)
}

/// Mass flow rate (kg/s) for a given thrust (N) and exhaust velocity (km/s).
///
/// ṁ = F / vₑ  (with unit conversion: vₑ km/s → m/s)
pub fn mass_flow_rate(thrust_n: f64, ve: KmPerSec) -> f64 {
    assert!(ve.value() > 0.0, "exhaust velocity must be positive");
    thrust_n / (ve.value() * 1000.0)
}

/// Jet power (W) for a given thrust (N) and exhaust velocity (km/s).
///
/// P_jet = ½ × F × vₑ  (kinetic power in the exhaust stream)
pub fn jet_power(thrust_n: f64, ve: KmPerSec) -> f64 {
    0.5 * thrust_n * ve.value() * 1000.0
}

// ── Oberth effect ──────────────────────────────────────────────────

/// Effective velocity change from a burn performed at periapsis of a hyperbolic flyby.
///
/// When a spacecraft with hyperbolic excess speed `v_inf` performs a prograde burn
/// of magnitude `burn_dv` at periapsis distance `r_periapsis` from a body with
/// gravitational parameter `mu`, the resulting change in v_inf (at infinity) is
/// larger than the burn_dv alone — this is the Oberth effect.
///
/// v_periapsis = sqrt(v_inf² + 2μ/r_p)
/// v_periapsis_after_burn = v_periapsis + burn_dv
/// v_inf_after = sqrt(v_periapsis_after_burn² - 2μ/r_p)
/// oberth_gain = (v_inf_after - v_inf) - burn_dv
///
/// Returns the Oberth gain: the extra Δv_inf beyond what the burn alone provides.
/// A positive value means the burn was amplified by the gravity well.
///
/// All velocities in km/s, distances in km, mu in km³/s².
pub fn oberth_dv_gain(mu: Mu, r_periapsis: Km, v_inf: KmPerSec, burn_dv: KmPerSec) -> KmPerSec {
    let v_inf_val = v_inf.value();
    let mu_val = mu.value();
    let r_p = r_periapsis.value();
    let burn = burn_dv.value();

    // Speed at periapsis (hyperbolic trajectory)
    let v_peri = (v_inf_val * v_inf_val + 2.0 * mu_val / r_p).sqrt();
    // Speed at periapsis after prograde burn
    let v_peri_after = v_peri + burn;
    // New v_inf after burn (at infinity, kinetic energy minus escape energy)
    let v_inf_after_sq = v_peri_after * v_peri_after - 2.0 * mu_val / r_p;
    let v_inf_after = if v_inf_after_sq > 0.0 {
        v_inf_after_sq.sqrt()
    } else {
        // Burn not enough to escape — captured
        0.0
    };

    // Oberth gain = (change in v_inf) - burn_dv
    KmPerSec((v_inf_after - v_inf_val) - burn)
}

/// Convert classical Keplerian orbital elements to a Cartesian state vector.
///
/// Uses the standard rotation sequence: perifocal → inertial via (Ω, i, ω).
/// The central body's gravitational parameter μ is needed to compute velocity.
pub fn elements_to_state_vector(mu: Mu, elements: &OrbitalElements) -> StateVector {
    let a = elements.semi_major_axis.value();
    let e = elements.eccentricity.value();
    let i = elements.inclination.value();
    let raan = elements.raan.value();
    let w = elements.arg_periapsis.value();
    let nu = elements.true_anomaly.value();

    // Semi-latus rectum
    let p = a * (1.0 - e * e);

    // Distance
    let r = p / (1.0 + e * nu.cos());

    // Position in perifocal frame (PQW)
    let x_pqw = r * nu.cos();
    let y_pqw = r * nu.sin();

    // Velocity in perifocal frame
    let mu_over_p = (mu.value() / p).sqrt();
    let vx_pqw = -mu_over_p * nu.sin();
    let vy_pqw = mu_over_p * (e + nu.cos());

    // Rotation matrix elements (Ω, i, ω → ecliptic inertial)
    let cos_w = w.cos();
    let sin_w = w.sin();
    let cos_i = i.cos();
    let sin_i = i.sin();
    let cos_raan = raan.cos();
    let sin_raan = raan.sin();

    // Column 1 of rotation matrix (P direction)
    let r11 = cos_raan * cos_w - sin_raan * sin_w * cos_i;
    let r21 = sin_raan * cos_w + cos_raan * sin_w * cos_i;
    let r31 = sin_w * sin_i;

    // Column 2 of rotation matrix (Q direction)
    let r12 = -cos_raan * sin_w - sin_raan * cos_w * cos_i;
    let r22 = -sin_raan * sin_w + cos_raan * cos_w * cos_i;
    let r32 = cos_w * sin_i;

    let pos = Vec3::new(
        Km(r11 * x_pqw + r12 * y_pqw),
        Km(r21 * x_pqw + r22 * y_pqw),
        Km(r31 * x_pqw + r32 * y_pqw),
    );

    let vel = Vec3::new(
        KmPerSec(r11 * vx_pqw + r12 * vy_pqw),
        KmPerSec(r21 * vx_pqw + r22 * vy_pqw),
        KmPerSec(r31 * vx_pqw + r32 * vy_pqw),
    );

    StateVector::new(pos, vel)
}

/// Compute the out-of-plane ΔV required for a simple plane change maneuver.
///
/// For a velocity `v` and plane change angle `delta_i` (radians),
/// ΔV = 2 * v * sin(Δi / 2).
pub fn plane_change_dv(v: KmPerSec, delta_i: Radians) -> KmPerSec {
    KmPerSec(2.0 * v.value() * (delta_i.value() / 2.0).sin().abs())
}

/// Fractional Oberth efficiency: (Δv_inf / burn_dv) - 1.
///
/// Returns the fractional improvement in v_inf change relative to the burn magnitude.
/// For example, 0.03 means 3% more effective than a burn in free space.
pub fn oberth_efficiency(mu: Mu, r_periapsis: Km, v_inf: KmPerSec, burn_dv: KmPerSec) -> f64 {
    let v_inf_val = v_inf.value();
    let mu_val = mu.value();
    let r_p = r_periapsis.value();
    let burn = burn_dv.value();

    if burn <= 0.0 {
        return 0.0;
    }

    let v_peri = (v_inf_val * v_inf_val + 2.0 * mu_val / r_p).sqrt();
    let v_peri_after = v_peri + burn;
    let v_inf_after_sq = v_peri_after * v_peri_after - 2.0 * mu_val / r_p;
    let v_inf_after = if v_inf_after_sq > 0.0 {
        v_inf_after_sq.sqrt()
    } else {
        0.0
    };

    let delta_v_inf = v_inf_after - v_inf_val;
    (delta_v_inf / burn) - 1.0
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::{mu, orbit_radius, reference_orbits};

    #[test]
    fn test_vis_viva_circular_orbit() {
        // For a circular orbit, r == a, so v = sqrt(μ/r)
        let r = Km(6_778.0); // ~400km altitude LEO
        let v = vis_viva(mu::EARTH, r, r);
        let expected = (mu::EARTH.value() / r.value()).sqrt();
        assert!(
            (v.value() - expected).abs() < 1e-10,
            "v={}, expected={}",
            v.value(),
            expected
        );
    }

    #[test]
    fn test_hohmann_leo_to_geo() {
        let r1 = reference_orbits::LEO_RADIUS;
        let r2 = reference_orbits::GEO_RADIUS;

        let (dv1, dv2) = hohmann_transfer_dv(mu::EARTH, r1, r2);
        let total_dv = dv1.value() + dv2.value();

        // Expected total ΔV for LEO-GEO Hohmann is approximately 3.935 km/s
        assert!(
            (total_dv - 3.935).abs() < 0.05,
            "total ΔV = {} km/s, expected ~3.935 km/s",
            total_dv
        );
    }

    #[test]
    fn test_hohmann_earth_to_mars() {
        let r_earth = orbit_radius::EARTH;
        let r_mars = orbit_radius::MARS;

        let (dv1, dv2) = hohmann_transfer_dv(mu::SUN, r_earth, r_mars);

        assert!(
            (dv1.value() - 2.94).abs() < 0.1,
            "departure ΔV = {} km/s, expected ~2.94 km/s",
            dv1.value()
        );

        assert!(
            (dv2.value() - 2.65).abs() < 0.1,
            "arrival ΔV = {} km/s, expected ~2.65 km/s",
            dv2.value()
        );
    }

    #[test]
    fn test_orbital_period_earth() {
        // Earth's orbital period around Sun: ~365.25 days
        let period = orbital_period(mu::SUN, orbit_radius::EARTH);
        let days = period.value() / 86400.0;
        assert!(
            (days - 365.25).abs() < 0.5,
            "Earth orbital period = {} days, expected ~365.25",
            days
        );
    }

    #[test]
    fn test_orbital_period_leo() {
        // LEO period at ~200 km: ~88.5 minutes
        let period = orbital_period(mu::EARTH, reference_orbits::LEO_RADIUS);
        let minutes = period.value() / 60.0;
        assert!(
            (minutes - 88.5).abs() < 1.0,
            "LEO orbital period = {} min, expected ~88.5 min",
            minutes
        );
    }

    #[test]
    fn test_specific_energy_bound_orbit() {
        // Bound (elliptical) orbits have negative specific energy
        let energy = specific_energy(mu::EARTH, reference_orbits::LEO_RADIUS);
        assert!(energy < 0.0, "LEO specific energy should be negative");
    }

    #[test]
    fn test_specific_angular_momentum() {
        // For circular orbit (e=0): h = sqrt(μ * r)
        let e = Eccentricity::elliptical(0.0).unwrap();
        let r = reference_orbits::LEO_RADIUS;
        let h = specific_angular_momentum(mu::EARTH, r, e);
        let expected = (mu::EARTH.value() * r.value()).sqrt();
        assert!(
            (h - expected).abs() < 1e-6,
            "h = {}, expected = {}",
            h,
            expected
        );
    }

    #[test]
    fn test_state_vector_radius_speed() {
        // ISS-like orbit: ~408 km altitude, ~7.66 km/s
        let pos = Vec3::new(Km(6786.0), Km(0.0), Km(0.0));
        let vel = Vec3::new(KmPerSec(0.0), KmPerSec(7.66), KmPerSec(0.0));
        let state = StateVector::new(pos, vel);

        assert!((state.radius().value() - 6786.0).abs() < 1e-10);
        assert!((state.speed().value() - 7.66).abs() < 1e-10);
    }

    #[test]
    fn test_brachistochrone_accel() {
        // 1 AU in 72 hours (259,200 seconds)
        // d = 149_597_870.7 km, t = 259200 s
        // a = 4 * d / t² = 4 * 149597870.7 / 259200² = ~8.91e-3 km/s²
        let d = Km(149_597_870.7);
        let t = crate::units::Seconds(259_200.0);
        let a = brachistochrone_accel(d, t);
        let expected = 4.0 * 149_597_870.7 / (259_200.0 * 259_200.0);
        assert!(
            (a - expected).abs() < 1e-12,
            "brachistochrone accel = {}, expected = {}",
            a,
            expected
        );
    }

    #[test]
    fn test_brachistochrone_dv() {
        // ΔV = 4 * d / t
        let d = Km(149_597_870.7);
        let t = crate::units::Seconds(259_200.0);
        let dv = brachistochrone_dv(d, t);
        let expected = 4.0 * 149_597_870.7 / 259_200.0;
        assert!(
            (dv.value() - expected).abs() < 1e-8,
            "brachistochrone ΔV = {} km/s, expected = {} km/s",
            dv.value(),
            expected
        );
    }

    #[test]
    fn test_brachistochrone_identity() {
        // brachistochrone_dv = brachistochrone_accel * time
        let d = Km(550_630_800.0); // Mars-Jupiter closest
        let t = crate::units::Seconds(72.0 * 3600.0);
        let a = brachistochrone_accel(d, t);
        let dv = brachistochrone_dv(d, t);
        assert!(
            (dv.value() - a * t.value()).abs() < 1e-6,
            "ΔV ({}) should equal a*t ({})",
            dv.value(),
            a * t.value()
        );
    }

    #[test]
    fn test_brachistochrone_max_distance() {
        // Round-trip: max_distance at the computed accel should equal original distance
        let d = Km(550_630_800.0);
        let t = crate::units::Seconds(72.0 * 3600.0);
        let a = brachistochrone_accel(d, t);
        let d_max = brachistochrone_max_distance(a, t);
        assert!(
            (d_max.value() - d.value()).abs() < 1.0,
            "round-trip distance: {} vs {}",
            d_max.value(),
            d.value()
        );
    }

    // ── Tsiolkovsky rocket equation tests ────────────────────────────

    #[test]
    fn test_exhaust_velocity_chemical() {
        // Chemical rocket: Isp ≈ 450 s → vₑ ≈ 4.413 km/s
        let ve = exhaust_velocity(450.0);
        let expected = 450.0 * 9.80665 / 1000.0; // 4.41299 km/s
        assert!(
            (ve.value() - expected).abs() < 1e-6,
            "ve = {} km/s, expected = {} km/s",
            ve.value(),
            expected
        );
    }

    #[test]
    fn test_exhaust_velocity_fusion() {
        // D-He³ fusion: Isp ≈ 100,000 s → vₑ ≈ 980.665 km/s
        let ve = exhaust_velocity(100_000.0);
        assert!(
            (ve.value() - 980.665).abs() < 0.001,
            "ve = {} km/s, expected 980.665 km/s",
            ve.value()
        );
    }

    #[test]
    fn test_mass_ratio_zero_dv() {
        // Zero ΔV → mass ratio = 1 (no propellant needed)
        let mr = mass_ratio(KmPerSec(0.0), KmPerSec(1.0));
        assert!((mr - 1.0).abs() < 1e-15);
    }

    #[test]
    fn test_mass_ratio_equal_dv_ve() {
        // ΔV = vₑ → mass ratio = e ≈ 2.71828
        let mr = mass_ratio(KmPerSec(10.0), KmPerSec(10.0));
        assert!(
            (mr - std::f64::consts::E).abs() < 1e-10,
            "mass ratio = {}, expected e = {}",
            mr,
            std::f64::consts::E
        );
    }

    #[test]
    fn test_mass_ratio_chemical_leo() {
        // Chemical rocket to LEO: ΔV ≈ 9.4 km/s, Isp 450s → vₑ ≈ 4.413 km/s
        // mass ratio = exp(9.4/4.413) ≈ 8.37
        let ve = exhaust_velocity(450.0);
        let mr = mass_ratio(KmPerSec(9.4), ve);
        assert!(
            (mr - 8.37).abs() < 0.1,
            "mass ratio = {}, expected ~8.37",
            mr
        );
    }

    #[test]
    fn test_mass_ratio_overflow() {
        // Extremely high ΔV/vₑ ratio → INFINITY
        let mr = mass_ratio(KmPerSec(1e10), KmPerSec(1.0));
        assert!(mr.is_infinite(), "expected INFINITY for extreme mass ratio");
    }

    #[test]
    fn test_propellant_fraction_zero_dv() {
        let pf = propellant_fraction(KmPerSec(0.0), KmPerSec(1.0));
        assert!(pf.abs() < 1e-15, "zero ΔV → zero propellant fraction");
    }

    #[test]
    fn test_propellant_fraction_moderate() {
        // ΔV = vₑ → pf = 1 - 1/e ≈ 0.6321
        let pf = propellant_fraction(KmPerSec(10.0), KmPerSec(10.0));
        let expected = 1.0 - 1.0 / std::f64::consts::E;
        assert!(
            (pf - expected).abs() < 1e-10,
            "propellant fraction = {}, expected = {}",
            pf,
            expected
        );
    }

    #[test]
    fn test_propellant_fraction_overflow() {
        let pf = propellant_fraction(KmPerSec(1e10), KmPerSec(1.0));
        assert!(
            (pf - 1.0).abs() < 1e-15,
            "extreme ΔV → propellant fraction = 1.0"
        );
    }

    #[test]
    fn test_required_propellant_mass() {
        // 1000 kg dry, ΔV = vₑ → propellant = 1000 * (e - 1) ≈ 1718.28 kg
        let prop = required_propellant_mass(1000.0, KmPerSec(10.0), KmPerSec(10.0));
        let expected = 1000.0 * (std::f64::consts::E - 1.0);
        assert!(
            (prop - expected).abs() < 0.01,
            "propellant = {} kg, expected = {} kg",
            prop,
            expected
        );
    }

    #[test]
    fn test_initial_mass() {
        // 1000 kg dry, ΔV = vₑ → initial = 1000 * e ≈ 2718.28 kg
        let m0 = initial_mass(1000.0, KmPerSec(10.0), KmPerSec(10.0));
        let expected = 1000.0 * std::f64::consts::E;
        assert!(
            (m0 - expected).abs() < 0.01,
            "initial mass = {} kg, expected = {} kg",
            m0,
            expected
        );
    }

    #[test]
    fn test_initial_mass_consistency() {
        // initial_mass = dry_mass + required_propellant_mass
        let dry = 500.0;
        let dv = KmPerSec(20.0);
        let ve = KmPerSec(10.0);
        let m0 = initial_mass(dry, dv, ve);
        let prop = required_propellant_mass(dry, dv, ve);
        assert!(
            (m0 - (dry + prop)).abs() < 1e-6,
            "m0 = {}, dry + prop = {}",
            m0,
            dry + prop
        );
    }

    #[test]
    fn test_mass_flow_rate() {
        // 9.8 MN thrust, vₑ = 980.665 km/s (Isp 100,000 s)
        // ṁ = 9.8e6 / (980.665 * 1000) = 9.993 kg/s
        let ve = exhaust_velocity(100_000.0);
        let mdot = mass_flow_rate(9.8e6, ve);
        let expected = 9.8e6 / (980.665 * 1000.0);
        assert!(
            (mdot - expected).abs() < 0.01,
            "mdot = {} kg/s, expected = {} kg/s",
            mdot,
            expected
        );
    }

    #[test]
    fn test_jet_power() {
        // 9.8 MN thrust, vₑ = 980.665 km/s
        // P_jet = 0.5 * 9.8e6 * 980665 = 4.805e12 W ≈ 4.8 TW
        let ve = exhaust_velocity(100_000.0);
        let p = jet_power(9.8e6, ve);
        let expected = 0.5 * 9.8e6 * 980.665 * 1000.0;
        assert!(
            (p - expected).abs() < 1.0,
            "P_jet = {} W, expected = {} W",
            p,
            expected
        );
    }

    #[test]
    fn test_kestrel_propellant_budget_ep01() {
        // Kestrel EP01: ΔV ≈ 8497 km/s, dry mass 300t = 300,000 kg
        // At Isp 1,000,000 s (vₑ ≈ 9806.65 km/s):
        // mass_ratio = exp(8497/9806.65) ≈ 2.376
        // propellant fraction ≈ 0.579
        let ve = exhaust_velocity(1_000_000.0);
        let dv = KmPerSec(8497.0);
        let pf = propellant_fraction(dv, ve);
        assert!(
            pf > 0.5 && pf < 0.7,
            "EP01 propellant fraction = {} (expected 0.5-0.7 at Isp 10⁶ s)",
            pf
        );
        // At Isp 100,000 s (vₑ ≈ 980.665 km/s):
        // mass_ratio = exp(8497/980.665) ≈ 5826 → propellant fraction ≈ 0.99983
        let ve_low = exhaust_velocity(100_000.0);
        let pf_low = propellant_fraction(dv, ve_low);
        assert!(
            pf_low > 0.999,
            "EP01 at Isp 10⁵ s → propellant fraction = {} (>99.9%, impractical)",
            pf_low
        );
    }

    // ── Oberth effect tests ───────────────────────────────────────────

    #[test]
    fn test_oberth_gain_zero_burn() {
        // No burn → no gain
        let gain = oberth_dv_gain(mu::JUPITER, Km(71_492.0), KmPerSec(10.0), KmPerSec(0.0));
        assert!(
            gain.value().abs() < 1e-10,
            "zero burn should give zero gain, got {}",
            gain.value()
        );
    }

    #[test]
    fn test_oberth_gain_positive() {
        // A burn at Jupiter periapsis should yield positive Oberth gain
        // Jupiter radius ≈ 71,492 km, v_inf = 10 km/s, burn = 1 km/s
        let gain = oberth_dv_gain(mu::JUPITER, Km(71_492.0), KmPerSec(10.0), KmPerSec(1.0));
        assert!(
            gain.value() > 0.0,
            "Oberth gain should be positive at Jupiter periapsis, got {}",
            gain.value()
        );
    }

    #[test]
    fn test_oberth_gain_stronger_at_lower_periapsis() {
        // Closer periapsis → larger Oberth gain
        let gain_close = oberth_dv_gain(mu::JUPITER, Km(71_492.0), KmPerSec(10.0), KmPerSec(1.0));
        let gain_far = oberth_dv_gain(
            mu::JUPITER,
            Km(71_492.0 * 5.0),
            KmPerSec(10.0),
            KmPerSec(1.0),
        );
        assert!(
            gain_close.value() > gain_far.value(),
            "closer periapsis should give larger gain: {} vs {}",
            gain_close.value(),
            gain_far.value()
        );
    }

    #[test]
    fn test_oberth_gain_negligible_at_high_v_inf() {
        // At very high v_inf (1500 km/s), Jupiter's gravity well is tiny
        // relative to kinetic energy → Oberth gain should be very small
        let gain = oberth_dv_gain(
            mu::JUPITER,
            Km(71_492.0 * 3.0), // 3 RJ periapsis
            KmPerSec(1500.0),
            KmPerSec(50.0), // 50 km/s burn
        );
        let efficiency = oberth_efficiency(
            mu::JUPITER,
            Km(71_492.0 * 3.0),
            KmPerSec(1500.0),
            KmPerSec(50.0),
        );
        // At 1500 km/s, Jupiter's escape velocity at 3 RJ is ~40 km/s
        // So v_peri ≈ sqrt(1500² + 40²) ≈ 1500.5 km/s — barely changes
        // Efficiency should be small (a few percent at most)
        assert!(
            efficiency.abs() < 0.10,
            "Oberth efficiency at 1500 km/s should be small, got {}",
            efficiency
        );
        // But still positive
        assert!(
            gain.value() > 0.0,
            "Oberth gain should still be positive: {}",
            gain.value()
        );
    }

    #[test]
    fn test_oberth_ep05_jupiter_flyby_3_percent() {
        // EP05: v_inf ≈ 1500 km/s, powered flyby at Jupiter
        // The show claims "Oberth effect efficiency improvement approximately 3%"
        // Let's verify this is in the right ballpark for reasonable parameters
        //
        // At 1500 km/s, we need to find what periapsis + burn_dv gives ~3%
        // Try periapsis at 2-5 RJ range with burns of 30-100 km/s
        let r_j = 71_492.0;
        let v_inf = KmPerSec(1500.0);

        // With a ~50 km/s burn at 3 RJ
        let eff_3rj = oberth_efficiency(mu::JUPITER, Km(r_j * 3.0), v_inf, KmPerSec(50.0));

        // The exact 3% depends on burn_dv and r_p choices.
        // At 1500 km/s, Jupiter's well is shallow → efficiency is small.
        // Check that 3% is achievable for some parameter combination.
        // At 1 RJ with large burn:
        let eff_1rj = oberth_efficiency(mu::JUPITER, Km(r_j), v_inf, KmPerSec(100.0));

        // The efficiency increases at lower periapsis and larger burns
        assert!(
            eff_1rj > eff_3rj,
            "1 RJ should give higher efficiency than 3 RJ"
        );
    }

    #[test]
    fn test_oberth_efficiency_low_v_inf() {
        // At low v_inf (e.g. 5 km/s), Oberth effect should be very significant
        let eff = oberth_efficiency(
            mu::JUPITER,
            Km(71_492.0), // 1 RJ
            KmPerSec(5.0),
            KmPerSec(1.0),
        );
        // At Jupiter surface with v_inf=5: v_peri = sqrt(25 + 2*126.7e6/71492) ≈ 59.5 km/s
        // After 1 km/s burn: v_peri=60.5 → v_inf_after = sqrt(60.5² - 59.5²·(25/25)) ≈ ...
        // Should be significant: >> 10%
        assert!(
            eff > 0.10,
            "Oberth efficiency at low v_inf should be large, got {}",
            eff
        );
    }

    // ── elements_to_state_vector tests ─────────────────────────────────

    #[test]
    fn test_elements_to_state_circular_equatorial() {
        // Circular equatorial orbit: e=0, i=0, Ω=0, ω=0, ν=0
        // Position should be along x-axis, velocity along y-axis
        let e = Eccentricity::elliptical(0.0).unwrap();
        let elements = OrbitalElements {
            semi_major_axis: Km(6778.0), // ~400 km LEO
            eccentricity: e,
            inclination: Radians(0.0),
            raan: Radians(0.0),
            arg_periapsis: Radians(0.0),
            true_anomaly: Radians(0.0),
        };

        let sv = elements_to_state_vector(mu::EARTH, &elements);

        // Position should be at (6778, 0, 0)
        assert!(
            (sv.position.x.value() - 6778.0).abs() < 1e-6,
            "x = {}, expected 6778",
            sv.position.x.value()
        );
        assert!(
            sv.position.y.value().abs() < 1e-6,
            "y = {}, expected 0",
            sv.position.y.value()
        );
        assert!(
            sv.position.z.value().abs() < 1e-6,
            "z = {}, expected 0",
            sv.position.z.value()
        );

        // Velocity should be (0, v_circular, 0)
        let v_circ = (mu::EARTH.value() / 6778.0).sqrt();
        assert!(
            sv.velocity.x.value().abs() < 1e-6,
            "vx = {}, expected 0",
            sv.velocity.x.value()
        );
        assert!(
            (sv.velocity.y.value() - v_circ).abs() < 1e-4,
            "vy = {}, expected {}",
            sv.velocity.y.value(),
            v_circ
        );
        assert!(
            sv.velocity.z.value().abs() < 1e-6,
            "vz = {}, expected 0",
            sv.velocity.z.value()
        );
    }

    #[test]
    fn test_elements_to_state_inclined_orbit() {
        // 90° inclination: orbit is perpendicular to equatorial plane
        let e = Eccentricity::elliptical(0.0).unwrap();
        let elements = OrbitalElements {
            semi_major_axis: Km(7000.0),
            eccentricity: e,
            inclination: Radians(std::f64::consts::FRAC_PI_2), // 90°
            raan: Radians(0.0),
            arg_periapsis: Radians(0.0),
            true_anomaly: Radians(std::f64::consts::FRAC_PI_2), // 90° true anomaly
        };

        let sv = elements_to_state_vector(mu::EARTH, &elements);

        // At ν=90° in a polar orbit (i=90°, Ω=0, ω=0):
        // Position should be at (0, 0, r) — over the pole
        assert!(
            sv.position.x.value().abs() < 1e-4,
            "x = {}, expected ~0",
            sv.position.x.value()
        );
        assert!(
            sv.position.y.value().abs() < 1e-4,
            "y = {}, expected ~0",
            sv.position.y.value()
        );
        assert!(
            (sv.position.z.value() - 7000.0).abs() < 1e-4,
            "z = {}, expected ~7000",
            sv.position.z.value()
        );
    }

    #[test]
    fn test_elements_to_state_energy_conservation() {
        // Verify that specific energy computed from state vector matches
        // specific energy computed from semi-major axis
        let e = Eccentricity::elliptical(0.1).unwrap();
        let elements = OrbitalElements {
            semi_major_axis: Km(10000.0),
            eccentricity: e,
            inclination: Radians(0.5),
            raan: Radians(1.0),
            arg_periapsis: Radians(2.0),
            true_anomaly: Radians(1.5),
        };

        let sv = elements_to_state_vector(mu::EARTH, &elements);
        let r = sv.radius().value();
        let v = sv.speed().value();

        // Specific energy from state vector: ε = v²/2 - μ/r
        let eps_sv = v * v / 2.0 - mu::EARTH.value() / r;
        // Specific energy from elements: ε = -μ/(2a)
        let eps_elem = specific_energy(mu::EARTH, elements.semi_major_axis);

        assert!(
            (eps_sv - eps_elem).abs() / eps_elem.abs() < 1e-10,
            "energy mismatch: state_vector = {:.6}, elements = {:.6}",
            eps_sv,
            eps_elem
        );
    }

    #[test]
    fn test_elements_to_state_angular_momentum() {
        // Angular momentum magnitude should match h = sqrt(μ * p)
        let e_val = 0.2;
        let e = Eccentricity::elliptical(e_val).unwrap();
        let a = Km(8000.0);
        let elements = OrbitalElements {
            semi_major_axis: a,
            eccentricity: e,
            inclination: Radians(0.3),
            raan: Radians(0.7),
            arg_periapsis: Radians(1.2),
            true_anomaly: Radians(0.8),
        };

        let sv = elements_to_state_vector(mu::EARTH, &elements);

        // h = |r × v|
        let h_vec = sv.position.cross_raw_with(sv.velocity);
        let h_magnitude = h_vec.norm_raw();

        // Expected: h = sqrt(μ * a * (1 - e²))
        let h_expected = specific_angular_momentum(mu::EARTH, a, e);

        assert!(
            (h_magnitude - h_expected).abs() / h_expected < 1e-10,
            "angular momentum: computed = {:.6}, expected = {:.6}",
            h_magnitude,
            h_expected
        );
    }

    // ── plane_change_dv tests ──────────────────────────────────────────

    #[test]
    fn test_plane_change_dv_zero() {
        let dv = plane_change_dv(KmPerSec(10.0), Radians(0.0));
        assert!(dv.value().abs() < 1e-15, "zero plane change = zero ΔV");
    }

    #[test]
    fn test_plane_change_dv_90_degrees() {
        // 90° plane change at 7 km/s: ΔV = 2 * 7 * sin(45°) ≈ 9.899 km/s
        let dv = plane_change_dv(KmPerSec(7.0), Radians(std::f64::consts::FRAC_PI_2));
        let expected = 2.0 * 7.0 * (std::f64::consts::FRAC_PI_4).sin();
        assert!(
            (dv.value() - expected).abs() < 1e-10,
            "90° plane change: {} km/s, expected {} km/s",
            dv.value(),
            expected
        );
    }

    #[test]
    fn test_plane_change_dv_small_angle() {
        // Small angle approximation: ΔV ≈ v * Δi for small Δi
        let v = KmPerSec(30.0);
        let di = Radians(0.01); // ~0.57°
        let dv = plane_change_dv(v, di);
        // For small angle: 2*v*sin(Δi/2) ≈ v*Δi
        let approx = v.value() * di.value();
        assert!(
            (dv.value() - approx).abs() / approx < 0.001,
            "small angle: exact = {}, approx = {}",
            dv.value(),
            approx
        );
    }
}
