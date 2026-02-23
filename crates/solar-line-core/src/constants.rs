/// Gravitational parameters (μ) for solar system bodies.
/// Source: NASA JPL DE440/DE441
/// Units: km³/s²
use crate::units::{Km, Mu};

/// Gravitational parameter μ = GM
pub mod mu {
    use super::Mu;

    /// Sun μ (km³/s²) — NASA JPL DE440
    pub const SUN: Mu = Mu(1.327_124_400_41e11);

    /// Mercury μ (km³/s²)
    pub const MERCURY: Mu = Mu(2.203_2e4);

    /// Venus μ (km³/s²)
    pub const VENUS: Mu = Mu(3.248_59e5);

    /// Earth μ (km³/s²) — includes Moon contribution for geocentric work;
    /// use EARTH_ALONE for Earth-only
    pub const EARTH: Mu = Mu(3.986_004_418e5);

    /// Mars μ (km³/s²)
    pub const MARS: Mu = Mu(4.282_837_14e4);

    /// Jupiter μ (km³/s²)
    pub const JUPITER: Mu = Mu(1.266_865_349e8);

    /// Saturn μ (km³/s²)
    pub const SATURN: Mu = Mu(3.793_120_749e7);

    /// Uranus μ (km³/s²)
    pub const URANUS: Mu = Mu(5.793_939e6);

    /// Neptune μ (km³/s²)
    pub const NEPTUNE: Mu = Mu(6.836_529e6);
}

/// Mean orbital radii (semi-major axes) for planets around the Sun.
/// Source: NASA fact sheets
/// Units: km
pub mod orbit_radius {
    use super::Km;

    /// Earth mean orbital radius (~1 AU)
    pub const EARTH: Km = Km(149_597_870.7);

    /// Mars mean orbital radius (~1.524 AU)
    pub const MARS: Km = Km(227_939_200.0);

    /// Jupiter mean orbital radius (~5.203 AU)
    pub const JUPITER: Km = Km(778_570_000.0);

    /// Saturn mean orbital radius (~9.537 AU)
    pub const SATURN: Km = Km(1_433_530_000.0);

    /// Mercury mean orbital radius (~0.387 AU)
    pub const MERCURY: Km = Km(57_909_050.0);

    /// Venus mean orbital radius (~0.723 AU)
    pub const VENUS: Km = Km(108_208_000.0);
}

/// Standard reference orbits.
pub mod reference_orbits {
    use super::Km;

    /// Earth radius (mean equatorial) in km
    pub const EARTH_RADIUS: Km = Km(6_378.137);

    /// Low Earth Orbit altitude ~200 km
    pub const LEO_RADIUS: Km = Km(6_578.0);

    /// Geostationary Earth Orbit radius
    pub const GEO_RADIUS: Km = Km(42_164.0);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mu_sun_order_of_magnitude() {
        // Sun μ should be ~1.33e11 km³/s²
        assert!(mu::SUN.value() > 1.3e11);
        assert!(mu::SUN.value() < 1.4e11);
    }

    #[test]
    fn test_mu_ordering() {
        // Sun > Jupiter > Saturn > Neptune > Uranus > Earth > Venus > Mars > Mercury
        assert!(mu::SUN.value() > mu::JUPITER.value());
        assert!(mu::JUPITER.value() > mu::SATURN.value());
        assert!(mu::SATURN.value() > mu::NEPTUNE.value());
        assert!(mu::NEPTUNE.value() > mu::URANUS.value());
        assert!(mu::URANUS.value() > mu::EARTH.value());
        assert!(mu::EARTH.value() > mu::VENUS.value());
        assert!(mu::VENUS.value() > mu::MARS.value());
        assert!(mu::MARS.value() > mu::MERCURY.value());
    }

    #[test]
    fn test_earth_orbit_is_1au() {
        // 1 AU = 149,597,870.7 km
        assert!((orbit_radius::EARTH.value() - 149_597_870.7).abs() < 1.0);
    }

    #[test]
    fn test_mars_orbit_ratio() {
        // Mars is approximately 1.524 AU from the Sun
        let ratio = orbit_radius::MARS / orbit_radius::EARTH;
        assert!((ratio - 1.524).abs() < 0.01);
    }
}
