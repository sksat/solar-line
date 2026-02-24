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
}
