/// Gravitational parameter (μ) in km³/s² for solar system bodies.
/// Source: NASA JPL DE440/DE441
pub mod constants {
    /// Sun μ (km³/s²)
    pub const MU_SUN: f64 = 1.327_124_400_41e11;

    /// Earth μ (km³/s²)
    pub const MU_EARTH: f64 = 3.986_004_418e5;

    /// Mars μ (km³/s²)
    pub const MU_MARS: f64 = 4.282_837_14e4;
}

/// Calculate the vis-viva equation: v = sqrt(μ * (2/r - 1/a))
///
/// # Arguments
/// * `mu` - Gravitational parameter (km³/s²)
/// * `r` - Current orbital radius (km)
/// * `a` - Semi-major axis (km)
///
/// # Returns
/// Orbital velocity (km/s)
pub fn vis_viva(mu: f64, r: f64, a: f64) -> f64 {
    (mu * (2.0 / r - 1.0 / a)).sqrt()
}

/// Calculate ΔV for a simple Hohmann transfer between two circular orbits.
///
/// # Arguments
/// * `mu` - Gravitational parameter (km³/s²)
/// * `r1` - Radius of inner circular orbit (km)
/// * `r2` - Radius of outer circular orbit (km)
///
/// # Returns
/// (dv1, dv2) - ΔV at departure and arrival (km/s)
pub fn hohmann_transfer_dv(mu: f64, r1: f64, r2: f64) -> (f64, f64) {
    // Semi-major axis of transfer ellipse
    let a_transfer = (r1 + r2) / 2.0;

    // Circular velocity at r1
    let v_circular_1 = (mu / r1).sqrt();
    // Velocity at periapsis of transfer ellipse
    let v_transfer_1 = vis_viva(mu, r1, a_transfer);
    let dv1 = (v_transfer_1 - v_circular_1).abs();

    // Circular velocity at r2
    let v_circular_2 = (mu / r2).sqrt();
    // Velocity at apoapsis of transfer ellipse
    let v_transfer_2 = vis_viva(mu, r2, a_transfer);
    let dv2 = (v_circular_2 - v_transfer_2).abs();

    (dv1, dv2)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vis_viva_circular_orbit() {
        // For a circular orbit, r == a, so v = sqrt(μ/r)
        let mu = constants::MU_EARTH;
        let r = 6_778.0; // ~400km altitude LEO (km)
        let v = vis_viva(mu, r, r);
        let expected = (mu / r).sqrt();
        assert!((v - expected).abs() < 1e-10, "v={v}, expected={expected}");
    }

    #[test]
    fn test_hohmann_leo_to_geo() {
        // Classic LEO to GEO Hohmann transfer
        // LEO: ~200 km altitude → r1 = 6578 km
        // GEO: ~35786 km altitude → r2 = 42164 km
        let mu = constants::MU_EARTH;
        let r1 = 6_578.0;
        let r2 = 42_164.0;

        let (dv1, dv2) = hohmann_transfer_dv(mu, r1, r2);
        let total_dv = dv1 + dv2;

        // Expected total ΔV for LEO-GEO Hohmann is approximately 3.9 km/s
        assert!(
            (total_dv - 3.935).abs() < 0.05,
            "total ΔV = {total_dv} km/s, expected ~3.935 km/s"
        );
    }

    #[test]
    fn test_hohmann_earth_to_mars() {
        // Earth-Mars Hohmann transfer (heliocentric, circular orbit approximation)
        // Earth orbit radius: ~1 AU = 149_597_870.7 km
        // Mars orbit radius: ~1.524 AU = 227_939_200 km
        let mu = constants::MU_SUN;
        let r_earth = 149_597_870.7;
        let r_mars = 227_939_200.0;

        let (dv1, dv2) = hohmann_transfer_dv(mu, r_earth, r_mars);

        // Departure ΔV from Earth's heliocentric orbit: ~2.94 km/s
        assert!(
            (dv1 - 2.94).abs() < 0.1,
            "departure ΔV = {dv1} km/s, expected ~2.94 km/s"
        );

        // Arrival ΔV at Mars heliocentric orbit: ~2.65 km/s
        assert!(
            (dv2 - 2.65).abs() < 0.1,
            "arrival ΔV = {dv2} km/s, expected ~2.65 km/s"
        );
    }
}
