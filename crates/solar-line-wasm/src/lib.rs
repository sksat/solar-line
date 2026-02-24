/// WASM bridge for solar-line-core.
///
/// Exposes a flat f64 API for use from JavaScript/TypeScript.
/// All newtype wrapping/unwrapping happens at this boundary.
/// Units follow the core crate convention: km, km/s, seconds, radians, km³/s².
use serde::Serialize;
use wasm_bindgen::prelude::*;

use solar_line_core::kepler;
use solar_line_core::units::{Eccentricity, Km, Mu, Radians, Seconds};
use solar_line_core::{constants, ephemeris, orbits};

// ---------------------------------------------------------------------------
// Orbital mechanics functions
// ---------------------------------------------------------------------------

/// Vis-viva equation: returns orbital speed (km/s) at distance r
/// for an orbit with semi-major axis a, under gravitational parameter mu.
#[wasm_bindgen]
pub fn vis_viva(mu: f64, r: f64, a: f64) -> f64 {
    orbits::vis_viva(Mu(mu), Km(r), Km(a)).value()
}

/// Hohmann transfer ΔV between two circular coplanar orbits.
/// Returns [dv1, dv2] in km/s.
#[wasm_bindgen]
pub fn hohmann_transfer_dv(mu: f64, r1: f64, r2: f64) -> Box<[f64]> {
    let (dv1, dv2) = orbits::hohmann_transfer_dv(Mu(mu), Km(r1), Km(r2));
    Box::new([dv1.value(), dv2.value()])
}

/// Orbital period (seconds) for semi-major axis a (km) under mu (km³/s²).
#[wasm_bindgen]
pub fn orbital_period(mu: f64, a: f64) -> f64 {
    orbits::orbital_period(Mu(mu), Km(a)).value()
}

/// Specific orbital energy: ε = -μ/(2a). Returns km²/s².
#[wasm_bindgen]
pub fn specific_energy(mu: f64, a: f64) -> f64 {
    orbits::specific_energy(Mu(mu), Km(a))
}

/// Specific angular momentum for an elliptical orbit.
/// Returns km²/s.
#[wasm_bindgen]
pub fn specific_angular_momentum(mu: f64, a: f64, e: f64) -> Result<f64, JsError> {
    let ecc = Eccentricity::new(e).ok_or_else(|| JsError::new("eccentricity must be >= 0"))?;
    Ok(orbits::specific_angular_momentum(Mu(mu), Km(a), ecc))
}

// ---------------------------------------------------------------------------
// Brachistochrone transfer functions
// ---------------------------------------------------------------------------

/// Required constant acceleration (km/s²) for a brachistochrone transfer.
/// distance in km, time in seconds.
#[wasm_bindgen]
pub fn brachistochrone_accel(distance: f64, time: f64) -> f64 {
    orbits::brachistochrone_accel(Km(distance), Seconds(time))
}

/// ΔV (km/s) for a brachistochrone transfer.
/// distance in km, time in seconds.
#[wasm_bindgen]
pub fn brachistochrone_dv(distance: f64, time: f64) -> f64 {
    orbits::brachistochrone_dv(Km(distance), Seconds(time)).value()
}

/// Maximum reachable distance (km) for a brachistochrone transfer.
/// accel in km/s², time in seconds.
#[wasm_bindgen]
pub fn brachistochrone_max_distance(accel: f64, time: f64) -> f64 {
    orbits::brachistochrone_max_distance(accel, Seconds(time)).value()
}

// ---------------------------------------------------------------------------
// Kepler equation solver and anomaly conversions
// ---------------------------------------------------------------------------

/// Result of the Kepler equation solver, returned to JS as a plain object.
#[derive(Serialize)]
pub struct KeplerResult {
    pub eccentric_anomaly: f64,
    pub iterations: u32,
    pub residual: f64,
}

/// Solve Kepler's equation M = E - e sin(E) for eccentric anomaly E.
/// Returns { eccentric_anomaly, iterations, residual }.
#[wasm_bindgen]
pub fn solve_kepler(mean_anomaly: f64, e: f64) -> Result<JsValue, JsError> {
    let ecc =
        Eccentricity::elliptical(e).ok_or_else(|| JsError::new("eccentricity must be in [0,1)"))?;
    let sol = kepler::solve_kepler(Radians(mean_anomaly), ecc).map_err(|e| JsError::new(&e))?;
    let result = KeplerResult {
        eccentric_anomaly: sol.eccentric_anomaly.value(),
        iterations: sol.iterations,
        residual: sol.residual,
    };
    serde_wasm_bindgen::to_value(&result).map_err(|e| JsError::new(&e.to_string()))
}

/// Convert mean anomaly to true anomaly (radians). Solves Kepler internally.
#[wasm_bindgen]
pub fn mean_to_true_anomaly(mean_anomaly: f64, e: f64) -> Result<f64, JsError> {
    let ecc =
        Eccentricity::elliptical(e).ok_or_else(|| JsError::new("eccentricity must be in [0,1)"))?;
    kepler::mean_to_true_anomaly(Radians(mean_anomaly), ecc)
        .map(|r| r.value())
        .map_err(|e| JsError::new(&e))
}

/// Convert true anomaly to mean anomaly (radians).
#[wasm_bindgen]
pub fn true_to_mean_anomaly(true_anomaly: f64, e: f64) -> Result<f64, JsError> {
    let ecc = Eccentricity::new(e).ok_or_else(|| JsError::new("eccentricity must be >= 0"))?;
    Ok(kepler::true_to_mean_anomaly(Radians(true_anomaly), ecc).value())
}

/// Convert eccentric anomaly to true anomaly (radians).
#[wasm_bindgen]
pub fn eccentric_to_true_anomaly(eccentric_anomaly: f64, e: f64) -> Result<f64, JsError> {
    let ecc = Eccentricity::new(e).ok_or_else(|| JsError::new("eccentricity must be >= 0"))?;
    Ok(kepler::eccentric_to_true_anomaly(Radians(eccentric_anomaly), ecc).value())
}

/// Convert true anomaly to eccentric anomaly (radians).
#[wasm_bindgen]
pub fn true_to_eccentric_anomaly(true_anomaly: f64, e: f64) -> Result<f64, JsError> {
    let ecc = Eccentricity::new(e).ok_or_else(|| JsError::new("eccentricity must be >= 0"))?;
    Ok(kepler::true_to_eccentric_anomaly(Radians(true_anomaly), ecc).value())
}

/// Convert eccentric anomaly to mean anomaly (radians).
#[wasm_bindgen]
pub fn eccentric_to_mean_anomaly(eccentric_anomaly: f64, e: f64) -> Result<f64, JsError> {
    let ecc = Eccentricity::new(e).ok_or_else(|| JsError::new("eccentricity must be >= 0"))?;
    Ok(kepler::eccentric_to_mean_anomaly(Radians(eccentric_anomaly), ecc).value())
}

/// Mean motion n = sqrt(μ/a³). Returns rad/s.
#[wasm_bindgen]
pub fn mean_motion(mu: f64, a: f64) -> f64 {
    kepler::mean_motion(Mu(mu), Km(a))
}

/// Propagate mean anomaly: M(t) = M₀ + n·Δt. Returns radians, normalized to [0, 2π).
#[wasm_bindgen]
pub fn propagate_mean_anomaly(m0: f64, n: f64, dt: f64) -> f64 {
    kepler::propagate_mean_anomaly(Radians(m0), n, Seconds(dt)).value()
}

// ---------------------------------------------------------------------------
// Constants — grouped getters (per Codex recommendation)
// ---------------------------------------------------------------------------

/// Gravitational parameters for solar system bodies (km³/s²).
/// Returns { sun, mercury, venus, earth, mars, jupiter, saturn, uranus, neptune }.
#[wasm_bindgen]
pub fn get_mu_constants() -> JsValue {
    #[derive(Serialize)]
    struct MuConstants {
        sun: f64,
        mercury: f64,
        venus: f64,
        earth: f64,
        mars: f64,
        jupiter: f64,
        saturn: f64,
        uranus: f64,
        neptune: f64,
    }
    let c = MuConstants {
        sun: constants::mu::SUN.value(),
        mercury: constants::mu::MERCURY.value(),
        venus: constants::mu::VENUS.value(),
        earth: constants::mu::EARTH.value(),
        mars: constants::mu::MARS.value(),
        jupiter: constants::mu::JUPITER.value(),
        saturn: constants::mu::SATURN.value(),
        uranus: constants::mu::URANUS.value(),
        neptune: constants::mu::NEPTUNE.value(),
    };
    serde_wasm_bindgen::to_value(&c).unwrap()
}

/// Mean orbital radii for planets around the Sun (km).
/// Returns { mercury, venus, earth, mars, jupiter, saturn }.
#[wasm_bindgen]
pub fn get_orbit_radius_constants() -> JsValue {
    #[derive(Serialize)]
    struct OrbitRadii {
        mercury: f64,
        venus: f64,
        earth: f64,
        mars: f64,
        jupiter: f64,
        saturn: f64,
    }
    let c = OrbitRadii {
        mercury: constants::orbit_radius::MERCURY.value(),
        venus: constants::orbit_radius::VENUS.value(),
        earth: constants::orbit_radius::EARTH.value(),
        mars: constants::orbit_radius::MARS.value(),
        jupiter: constants::orbit_radius::JUPITER.value(),
        saturn: constants::orbit_radius::SATURN.value(),
    };
    serde_wasm_bindgen::to_value(&c).unwrap()
}

/// Reference orbits (km).
/// Returns { earth_radius, leo_radius, geo_radius }.
#[wasm_bindgen]
pub fn get_reference_orbit_constants() -> JsValue {
    #[derive(Serialize)]
    struct RefOrbits {
        earth_radius: f64,
        leo_radius: f64,
        geo_radius: f64,
    }
    let c = RefOrbits {
        earth_radius: constants::reference_orbits::EARTH_RADIUS.value(),
        leo_radius: constants::reference_orbits::LEO_RADIUS.value(),
        geo_radius: constants::reference_orbits::GEO_RADIUS.value(),
    };
    serde_wasm_bindgen::to_value(&c).unwrap()
}

// ---------------------------------------------------------------------------
// Ephemeris functions
// ---------------------------------------------------------------------------

/// Convert planet name string to Planet enum.
fn parse_planet(name: &str) -> Result<ephemeris::Planet, JsError> {
    match name.to_lowercase().as_str() {
        "mercury" => Ok(ephemeris::Planet::Mercury),
        "venus" => Ok(ephemeris::Planet::Venus),
        "earth" => Ok(ephemeris::Planet::Earth),
        "mars" => Ok(ephemeris::Planet::Mars),
        "jupiter" => Ok(ephemeris::Planet::Jupiter),
        "saturn" => Ok(ephemeris::Planet::Saturn),
        "uranus" => Ok(ephemeris::Planet::Uranus),
        "neptune" => Ok(ephemeris::Planet::Neptune),
        _ => Err(JsError::new(&format!("Unknown planet: {}", name))),
    }
}

/// Convert calendar date (year, month, day) to Julian Date.
#[wasm_bindgen]
pub fn calendar_to_jd(year: i32, month: u32, day: f64) -> f64 {
    ephemeris::calendar_to_jd(year, month, day)
}

/// Convert Julian Date to calendar date string "YYYY-MM-DD".
#[wasm_bindgen]
pub fn jd_to_date_string(jd: f64) -> String {
    ephemeris::jd_to_date_string(jd)
}

/// Compute heliocentric position of a planet at a given Julian Date.
/// Returns { longitude (rad), distance (km), x (km), y (km) }.
#[wasm_bindgen]
pub fn planet_position(planet: &str, jd: f64) -> Result<JsValue, JsError> {
    let p = parse_planet(planet)?;
    let pos = ephemeris::planet_position(p, jd);

    #[derive(Serialize)]
    struct PosResult {
        longitude: f64,
        distance: f64,
        x: f64,
        y: f64,
    }

    let result = PosResult {
        longitude: pos.longitude.value(),
        distance: pos.distance.value(),
        x: pos.x,
        y: pos.y,
    };
    serde_wasm_bindgen::to_value(&result).map_err(|e| JsError::new(&e.to_string()))
}

/// Compute ecliptic longitude of a planet at a given Julian Date (radians).
#[wasm_bindgen]
pub fn planet_longitude(planet: &str, jd: f64) -> Result<f64, JsError> {
    let p = parse_planet(planet)?;
    Ok(ephemeris::planet_longitude(p, jd).value())
}

/// Compute phase angle from planet1 to planet2 at a given Julian Date.
/// Returns signed angle in radians, normalized to (-π, π].
#[wasm_bindgen]
pub fn phase_angle(planet1: &str, planet2: &str, jd: f64) -> Result<f64, JsError> {
    let p1 = parse_planet(planet1)?;
    let p2 = parse_planet(planet2)?;
    Ok(ephemeris::phase_angle(p1, p2, jd).value())
}

/// Synodic period between two planets (seconds).
#[wasm_bindgen]
pub fn synodic_period(planet1: &str, planet2: &str) -> Result<f64, JsError> {
    let p1 = parse_planet(planet1)?;
    let p2 = parse_planet(planet2)?;
    Ok(ephemeris::synodic_period(p1, p2).value())
}

/// Required phase angle for a Hohmann transfer (radians).
#[wasm_bindgen]
pub fn hohmann_phase_angle(departure: &str, arrival: &str) -> Result<f64, JsError> {
    let p1 = parse_planet(departure)?;
    let p2 = parse_planet(arrival)?;
    Ok(ephemeris::hohmann_phase_angle(p1, p2).value())
}

/// Hohmann transfer time between two planets (seconds).
#[wasm_bindgen]
pub fn hohmann_transfer_time(departure: &str, arrival: &str) -> Result<f64, JsError> {
    let p1 = parse_planet(departure)?;
    let p2 = parse_planet(arrival)?;
    Ok(ephemeris::hohmann_transfer_time(p1, p2).value())
}

/// Find the next Hohmann transfer launch window after a given Julian Date.
/// Returns Julian Date of the window, or null if not found within search range.
#[wasm_bindgen]
pub fn next_hohmann_window(
    departure: &str,
    arrival: &str,
    after_jd: f64,
) -> Result<JsValue, JsError> {
    let p1 = parse_planet(departure)?;
    let p2 = parse_planet(arrival)?;
    match ephemeris::next_hohmann_window(p1, p2, after_jd) {
        Some(jd) => Ok(JsValue::from_f64(jd)),
        None => Ok(JsValue::NULL),
    }
}

/// Get J2000 epoch Julian Date constant.
#[wasm_bindgen]
pub fn j2000_jd() -> f64 {
    ephemeris::J2000_JD
}

// ---------------------------------------------------------------------------
// WASM tests (run with wasm-pack test)
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vis_viva_circular() {
        let mu_earth = 3.986004418e5;
        let r = 6778.0; // ~400km LEO
        let v = vis_viva(mu_earth, r, r);
        let expected = (mu_earth / r).sqrt();
        assert!((v - expected).abs() < 1e-10);
    }

    #[test]
    fn test_hohmann_earth_mars() {
        let mu_sun = 1.32712440041e11;
        let r_earth = 149_597_870.7;
        let r_mars = 227_939_200.0;
        let dvs = hohmann_transfer_dv(mu_sun, r_earth, r_mars);
        assert!((dvs[0] - 2.94).abs() < 0.1);
        assert!((dvs[1] - 2.65).abs() < 0.1);
    }

    #[test]
    fn test_orbital_period_earth() {
        let mu_sun = 1.32712440041e11;
        let r_earth = 149_597_870.7;
        let period = orbital_period(mu_sun, r_earth);
        let days = period / 86400.0;
        assert!((days - 365.25).abs() < 0.5);
    }

    #[test]
    fn test_mean_to_true_round_trip() {
        let e = 0.2;
        let nu = 2.5;
        let m = true_to_mean_anomaly(nu, e).unwrap();
        let nu_back = mean_to_true_anomaly(m, e).unwrap();
        // Normalize original for comparison
        let nu_norm = {
            let mut v = nu % std::f64::consts::TAU;
            if v < 0.0 {
                v += std::f64::consts::TAU;
            }
            v
        };
        assert!(
            (nu_norm - nu_back).abs() < 1e-11,
            "round trip: {} -> {} -> {}",
            nu,
            m,
            nu_back
        );
    }

    #[test]
    fn test_propagate_half_orbit() {
        let n = std::f64::consts::TAU / 3600.0;
        let m = propagate_mean_anomaly(0.0, n, 1800.0);
        assert!((m - std::f64::consts::PI).abs() < 1e-12);
    }

    #[test]
    fn test_specific_energy_negative_for_bound() {
        let mu_earth = 3.986004418e5;
        let leo = 6578.0;
        let energy = specific_energy(mu_earth, leo);
        assert!(energy < 0.0);
    }

    #[test]
    fn test_specific_angular_momentum_circular() {
        let mu_earth = 3.986004418e5;
        let r = 6578.0;
        let h = specific_angular_momentum(mu_earth, r, 0.0).unwrap();
        let expected = (mu_earth * r).sqrt();
        assert!((h - expected).abs() < 1e-6);
    }

    #[test]
    fn test_mean_motion_earth() {
        let mu_sun = 1.32712440041e11;
        let r_earth = 149_597_870.7;
        let n = mean_motion(mu_sun, r_earth);
        let expected = std::f64::consts::TAU / (365.25 * 86400.0);
        assert!((n - expected).abs() / expected < 0.002);
    }

    #[test]
    fn test_brachistochrone_accel_72h_mars_jupiter() {
        // Mars-Jupiter closest: ~550.6M km, 72h = 259200s
        let d = 550_630_800.0;
        let t = 72.0 * 3600.0;
        let a = brachistochrone_accel(d, t);
        let expected = 4.0 * d / (t * t);
        assert!((a - expected).abs() < 1e-10);
    }

    #[test]
    fn test_brachistochrone_dv_identity() {
        // ΔV = accel * time
        let d = 550_630_800.0;
        let t = 72.0 * 3600.0;
        let a = brachistochrone_accel(d, t);
        let dv = brachistochrone_dv(d, t);
        assert!((dv - a * t).abs() < 1e-6);
    }

    #[test]
    fn test_brachistochrone_max_distance_round_trip() {
        let d = 550_630_800.0;
        let t = 72.0 * 3600.0;
        let a = brachistochrone_accel(d, t);
        let d_back = brachistochrone_max_distance(a, t);
        assert!((d_back - d).abs() < 1.0);
    }

    // Validation error tests require JsError which only works on wasm targets.
    // Error paths are tested via the TS round-trip tests and wasm-bindgen-test.

    #[test]
    fn test_calendar_to_jd_j2000() {
        let jd = calendar_to_jd(2000, 1, 1.5);
        assert!((jd - 2_451_545.0).abs() < 1e-6);
    }

    #[test]
    fn test_jd_to_date_string_j2000() {
        let s = jd_to_date_string(2_451_545.0);
        assert_eq!(s, "2000-01-01");
    }

    #[test]
    fn test_j2000_jd_constant() {
        assert!((j2000_jd() - 2_451_545.0).abs() < 1e-10);
    }
}
