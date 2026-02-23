/// Orbital element types and state vectors for 2-body problem.
use crate::units::{Eccentricity, Km, KmPerSec, Mu, Radians};
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
}
