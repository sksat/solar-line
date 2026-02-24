#![allow(clippy::too_many_arguments)] // Flat WASM ABI requires many f64 parameters

/// WASM bridge for solar-line-core.
///
/// Exposes a flat f64 API for use from JavaScript/TypeScript.
/// All newtype wrapping/unwrapping happens at this boundary.
/// Units follow the core crate convention: km, km/s, seconds, radians, km³/s².
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use solar_line_core::dag;
use solar_line_core::kepler;
use solar_line_core::propagation;
use solar_line_core::units::{Eccentricity, Km, KmPerSec, Mu, Radians, Seconds};
use solar_line_core::vec3::Vec3;
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
// Tsiolkovsky rocket equation / propellant analysis
// ---------------------------------------------------------------------------

/// Convert specific impulse (seconds) to exhaust velocity (km/s).
/// vₑ = Isp × g₀ (g₀ = 9.80665 m/s²)
#[wasm_bindgen]
pub fn exhaust_velocity(isp_s: f64) -> f64 {
    orbits::exhaust_velocity(isp_s).value()
}

/// Tsiolkovsky mass ratio: m₀/m_f = exp(ΔV / vₑ).
/// delta_v and ve in km/s.
#[wasm_bindgen]
pub fn mass_ratio(delta_v: f64, ve: f64) -> f64 {
    use solar_line_core::units::KmPerSec;
    orbits::mass_ratio(KmPerSec(delta_v), KmPerSec(ve))
}

/// Propellant mass fraction: 1 - 1/mass_ratio.
/// delta_v and ve in km/s. Returns value in [0, 1).
#[wasm_bindgen]
pub fn propellant_fraction(delta_v: f64, ve: f64) -> f64 {
    use solar_line_core::units::KmPerSec;
    orbits::propellant_fraction(KmPerSec(delta_v), KmPerSec(ve))
}

/// Required propellant mass (kg) given dry (post-burn) mass and ΔV.
/// delta_v and ve in km/s.
#[wasm_bindgen]
pub fn required_propellant_mass(dry_mass_kg: f64, delta_v: f64, ve: f64) -> f64 {
    use solar_line_core::units::KmPerSec;
    orbits::required_propellant_mass(dry_mass_kg, KmPerSec(delta_v), KmPerSec(ve))
}

/// Initial (pre-burn) mass (kg) given dry mass and ΔV.
/// m₀ = m_dry × exp(ΔV/vₑ)
#[wasm_bindgen]
pub fn initial_mass(dry_mass_kg: f64, delta_v: f64, ve: f64) -> f64 {
    use solar_line_core::units::KmPerSec;
    orbits::initial_mass(dry_mass_kg, KmPerSec(delta_v), KmPerSec(ve))
}

/// Mass flow rate (kg/s) for a given thrust (N) and exhaust velocity (km/s).
/// ṁ = F / vₑ
#[wasm_bindgen]
pub fn mass_flow_rate(thrust_n: f64, ve: f64) -> f64 {
    use solar_line_core::units::KmPerSec;
    orbits::mass_flow_rate(thrust_n, KmPerSec(ve))
}

/// Jet power (W) for a given thrust (N) and exhaust velocity (km/s).
/// P_jet = ½ × F × vₑ
#[wasm_bindgen]
pub fn jet_power(thrust_n: f64, ve: f64) -> f64 {
    use solar_line_core::units::KmPerSec;
    orbits::jet_power(thrust_n, KmPerSec(ve))
}

/// Oberth effect ΔV gain (km/s) for a burn at periapsis of a hyperbolic flyby.
/// mu: gravitational parameter (km³/s²), r_periapsis (km), v_inf (km/s), burn_dv (km/s).
/// Returns the extra Δv_inf beyond the burn itself.
#[wasm_bindgen]
pub fn oberth_dv_gain(mu: f64, r_periapsis: f64, v_inf: f64, burn_dv: f64) -> f64 {
    use solar_line_core::units::KmPerSec;
    orbits::oberth_dv_gain(Mu(mu), Km(r_periapsis), KmPerSec(v_inf), KmPerSec(burn_dv)).value()
}

/// Oberth effect fractional efficiency: (Δv_inf / burn_dv) - 1.
/// Returns the fractional improvement (e.g. 0.03 = 3% gain).
#[wasm_bindgen]
pub fn oberth_efficiency(mu: f64, r_periapsis: f64, v_inf: f64, burn_dv: f64) -> f64 {
    use solar_line_core::units::KmPerSec;
    orbits::oberth_efficiency(Mu(mu), Km(r_periapsis), KmPerSec(v_inf), KmPerSec(burn_dv))
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
/// Returns { longitude (rad), latitude (rad), distance (km), x (km), y (km), z (km), inclination (rad) }.
#[wasm_bindgen]
pub fn planet_position(planet: &str, jd: f64) -> Result<JsValue, JsError> {
    let p = parse_planet(planet)?;
    let pos = ephemeris::planet_position(p, jd);

    #[derive(Serialize)]
    struct PosResult {
        longitude: f64,
        latitude: f64,
        distance: f64,
        x: f64,
        y: f64,
        z: f64,
        inclination: f64,
    }

    let result = PosResult {
        longitude: pos.longitude.value(),
        latitude: pos.latitude.value(),
        distance: pos.distance.value(),
        x: pos.x,
        y: pos.y,
        z: pos.z,
        inclination: pos.inclination.value(),
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
// Orbit propagation (RK4 integrator)
// ---------------------------------------------------------------------------

/// Propagate a ballistic (thrust-free) orbit and return the final state.
///
/// Input: initial position (km) and velocity (km/s) as 6 floats,
/// central body mu (km³/s²), time step (s), and total duration (s).
///
/// Returns [x, y, z, vx, vy, vz, time, energy_drift] — 8 floats.
/// energy_drift is the relative energy error |ΔE/E₀|.
#[wasm_bindgen]
pub fn propagate_ballistic(
    x: f64,
    y: f64,
    z: f64,
    vx: f64,
    vy: f64,
    vz: f64,
    mu: f64,
    dt: f64,
    duration: f64,
) -> Box<[f64]> {
    let initial = propagation::PropState::new(
        Vec3::new(Km(x), Km(y), Km(z)),
        Vec3::new(KmPerSec(vx), KmPerSec(vy), KmPerSec(vz)),
    );
    let config = propagation::IntegratorConfig {
        dt,
        mu: Mu(mu),
        thrust: propagation::ThrustProfile::None,
    };
    let e0 = initial.specific_energy(Mu(mu));
    let final_state = propagation::propagate_final(&initial, &config, duration);
    let ef = final_state.specific_energy(Mu(mu));
    let drift = if e0.abs() > 1e-30 {
        ((ef - e0) / e0).abs()
    } else {
        (ef - e0).abs()
    };

    Box::new([
        final_state.pos.x.value(),
        final_state.pos.y.value(),
        final_state.pos.z.value(),
        final_state.vel.x.value(),
        final_state.vel.y.value(),
        final_state.vel.z.value(),
        final_state.time,
        drift,
    ])
}

/// Propagate a brachistochrone (constant-thrust, flip-at-midpoint) trajectory.
///
/// Input: initial state (6 floats), mu (km³/s²), dt (s), duration (s),
/// acceleration (km/s²), flip_time (s from start).
///
/// Returns [x, y, z, vx, vy, vz, time] — 7 floats.
#[wasm_bindgen]
pub fn propagate_brachistochrone(
    x: f64,
    y: f64,
    z: f64,
    vx: f64,
    vy: f64,
    vz: f64,
    mu: f64,
    dt: f64,
    duration: f64,
    accel_km_s2: f64,
    flip_time: f64,
) -> Box<[f64]> {
    let initial = propagation::PropState::new(
        Vec3::new(Km(x), Km(y), Km(z)),
        Vec3::new(KmPerSec(vx), KmPerSec(vy), KmPerSec(vz)),
    );
    let config = propagation::IntegratorConfig {
        dt,
        mu: Mu(mu),
        thrust: propagation::ThrustProfile::Brachistochrone {
            accel_km_s2,
            flip_time,
        },
    };
    let final_state = propagation::propagate_final(&initial, &config, duration);

    Box::new([
        final_state.pos.x.value(),
        final_state.pos.y.value(),
        final_state.pos.z.value(),
        final_state.vel.x.value(),
        final_state.vel.y.value(),
        final_state.vel.z.value(),
        final_state.time,
    ])
}

/// Propagate a ballistic orbit and return sampled trajectory points.
///
/// Returns a flat array: [t0, x0, y0, z0, t1, x1, y1, z1, ...].
/// `sample_interval` controls how many time steps between samples.
/// E.g., sample_interval=100 with dt=10 means one point every 1000s.
#[wasm_bindgen]
pub fn propagate_trajectory(
    x: f64,
    y: f64,
    z: f64,
    vx: f64,
    vy: f64,
    vz: f64,
    mu: f64,
    dt: f64,
    duration: f64,
    sample_interval: usize,
) -> Box<[f64]> {
    let initial = propagation::PropState::new(
        Vec3::new(Km(x), Km(y), Km(z)),
        Vec3::new(KmPerSec(vx), KmPerSec(vy), KmPerSec(vz)),
    );
    let config = propagation::IntegratorConfig {
        dt,
        mu: Mu(mu),
        thrust: propagation::ThrustProfile::None,
    };
    let states = propagation::propagate(&initial, &config, duration);

    let interval = if sample_interval == 0 {
        1
    } else {
        sample_interval
    };
    let mut result = Vec::new();
    for (i, state) in states.iter().enumerate() {
        if i % interval == 0 || i == states.len() - 1 {
            result.push(state.time);
            result.push(state.pos.x.value());
            result.push(state.pos.y.value());
            result.push(state.pos.z.value());
        }
    }

    result.into_boxed_slice()
}

// ---------------------------------------------------------------------------
// Adaptive orbit propagation (RK45 Dormand-Prince)
// ---------------------------------------------------------------------------

/// Propagate a ballistic orbit using adaptive RK45 Dormand-Prince integrator.
///
/// Input: initial state (6 floats), mu (km³/s²), duration (s),
/// rtol, atol (error tolerances).
///
/// Returns [x, y, z, vx, vy, vz, time, energy_drift, n_eval, n_accept, n_reject] — 11 floats.
#[wasm_bindgen]
pub fn propagate_adaptive_ballistic(
    x: f64,
    y: f64,
    z: f64,
    vx: f64,
    vy: f64,
    vz: f64,
    mu: f64,
    duration: f64,
    rtol: f64,
    atol: f64,
) -> Box<[f64]> {
    let initial = propagation::PropState::new(
        Vec3::new(Km(x), Km(y), Km(z)),
        Vec3::new(KmPerSec(vx), KmPerSec(vy), KmPerSec(vz)),
    );
    let mut config =
        propagation::AdaptiveConfig::heliocentric(Mu(mu), propagation::ThrustProfile::None);
    config.rtol = rtol;
    config.atol = atol;

    let e0 = initial.specific_energy(Mu(mu));
    let (final_state, n_eval) = propagation::propagate_adaptive_final(&initial, &config, duration);
    let ef = final_state.specific_energy(Mu(mu));
    let drift = if e0.abs() > 1e-30 {
        ((ef - e0) / e0).abs()
    } else {
        (ef - e0).abs()
    };

    Box::new([
        final_state.pos.x.value(),
        final_state.pos.y.value(),
        final_state.pos.z.value(),
        final_state.vel.x.value(),
        final_state.vel.y.value(),
        final_state.vel.z.value(),
        final_state.time,
        drift,
        n_eval as f64,
    ])
}

/// Propagate a brachistochrone trajectory using adaptive RK45 Dormand-Prince.
///
/// Input: initial state (6 floats), mu (km³/s²), duration (s),
/// acceleration (km/s²), flip_time (s), rtol, atol.
///
/// Returns [x, y, z, vx, vy, vz, time, n_eval] — 8 floats.
#[wasm_bindgen]
pub fn propagate_adaptive_brachistochrone(
    x: f64,
    y: f64,
    z: f64,
    vx: f64,
    vy: f64,
    vz: f64,
    mu: f64,
    duration: f64,
    accel_km_s2: f64,
    flip_time: f64,
    rtol: f64,
    atol: f64,
) -> Box<[f64]> {
    let initial = propagation::PropState::new(
        Vec3::new(Km(x), Km(y), Km(z)),
        Vec3::new(KmPerSec(vx), KmPerSec(vy), KmPerSec(vz)),
    );
    let mut config = propagation::AdaptiveConfig::heliocentric(
        Mu(mu),
        propagation::ThrustProfile::Brachistochrone {
            accel_km_s2,
            flip_time,
        },
    );
    config.rtol = rtol;
    config.atol = atol;

    let (final_state, n_eval) = propagation::propagate_adaptive_final(&initial, &config, duration);

    Box::new([
        final_state.pos.x.value(),
        final_state.pos.y.value(),
        final_state.pos.z.value(),
        final_state.vel.x.value(),
        final_state.vel.y.value(),
        final_state.vel.z.value(),
        final_state.time,
        n_eval as f64,
    ])
}

// ---------------------------------------------------------------------------
// Symplectic (Störmer-Verlet) integrator
// ---------------------------------------------------------------------------

/// Propagate a ballistic orbit using the Störmer-Verlet symplectic integrator.
/// Returns final-state-only for efficiency.
///
/// Input: initial state (6 floats), mu (km³/s²), dt (s), duration (s).
/// Returns [x, y, z, vx, vy, vz, time, energy_drift, n_steps] — 9 floats.
#[wasm_bindgen]
pub fn propagate_symplectic_ballistic(
    x: f64,
    y: f64,
    z: f64,
    vx: f64,
    vy: f64,
    vz: f64,
    mu: f64,
    dt: f64,
    duration: f64,
) -> Box<[f64]> {
    let initial = propagation::PropState::new(
        Vec3::new(Km(x), Km(y), Km(z)),
        Vec3::new(KmPerSec(vx), KmPerSec(vy), KmPerSec(vz)),
    );

    let e0 = initial.specific_energy(Mu(mu));
    let final_state = propagation::propagate_symplectic_final(&initial, Mu(mu), dt, duration);
    let ef = final_state.specific_energy(Mu(mu));
    let drift = if e0.abs() > 1e-30 {
        ((ef - e0) / e0).abs()
    } else {
        (ef - e0).abs()
    };
    let n_steps = (duration / dt).ceil();

    Box::new([
        final_state.pos.x.value(),
        final_state.pos.y.value(),
        final_state.pos.z.value(),
        final_state.vel.x.value(),
        final_state.vel.y.value(),
        final_state.vel.z.value(),
        final_state.time,
        drift,
        n_steps,
    ])
}

// ---------------------------------------------------------------------------
// Gravity assist / flyby
// ---------------------------------------------------------------------------

/// Sphere of influence radius (km) for a planet.
///
/// Input: planet orbital radius (km), planet mu (km³/s²), sun mu (km³/s²).
/// Returns SOI radius in km.
#[wasm_bindgen]
pub fn soi_radius(planet_orbit_radius: f64, mu_planet: f64, mu_sun: f64) -> f64 {
    solar_line_core::flyby::soi_radius(Km(planet_orbit_radius), Mu(mu_planet), Mu(mu_sun)).value()
}

/// Compute an unpowered hyperbolic flyby.
///
/// Input: mu_planet, v_inf_in [3], r_periapsis, flyby_plane_normal [3].
/// Returns [turn_angle_rad, v_periapsis, v_inf_out, out_dir_x, out_dir_y, out_dir_z] — 6 floats.
#[wasm_bindgen]
pub fn unpowered_flyby(
    mu_planet: f64,
    v_inf_x: f64,
    v_inf_y: f64,
    v_inf_z: f64,
    r_periapsis: f64,
    normal_x: f64,
    normal_y: f64,
    normal_z: f64,
) -> Box<[f64]> {
    let result = solar_line_core::flyby::unpowered_flyby(
        Mu(mu_planet),
        [v_inf_x, v_inf_y, v_inf_z],
        Km(r_periapsis),
        [normal_x, normal_y, normal_z],
    );
    Box::new([
        result.turn_angle_rad,
        result.v_periapsis,
        result.v_inf_out,
        result.v_inf_out_dir[0],
        result.v_inf_out_dir[1],
        result.v_inf_out_dir[2],
    ])
}

/// Compute a powered flyby (burn at periapsis — Oberth effect).
///
/// Input: mu_planet, v_inf_in [3], r_periapsis, burn_dv, flyby_plane_normal [3].
/// Returns [turn_angle_rad, v_periapsis, v_inf_out, out_dir_x, out_dir_y, out_dir_z] — 6 floats.
#[wasm_bindgen]
pub fn powered_flyby(
    mu_planet: f64,
    v_inf_x: f64,
    v_inf_y: f64,
    v_inf_z: f64,
    r_periapsis: f64,
    burn_dv: f64,
    normal_x: f64,
    normal_y: f64,
    normal_z: f64,
) -> Box<[f64]> {
    let result = solar_line_core::flyby::powered_flyby(
        Mu(mu_planet),
        [v_inf_x, v_inf_y, v_inf_z],
        Km(r_periapsis),
        KmPerSec(burn_dv),
        [normal_x, normal_y, normal_z],
    );
    Box::new([
        result.turn_angle_rad,
        result.v_periapsis,
        result.v_inf_out,
        result.v_inf_out_dir[0],
        result.v_inf_out_dir[1],
        result.v_inf_out_dir[2],
    ])
}

// ---------------------------------------------------------------------------
// Communications analysis
// ---------------------------------------------------------------------------

/// Speed of light in km/s (exact, per SI definition).
#[wasm_bindgen]
pub fn speed_of_light() -> f64 {
    solar_line_core::comms::C_KM_S
}

/// One-way light time (seconds) for a given distance in km.
#[wasm_bindgen]
pub fn light_time_seconds(distance_km: f64) -> f64 {
    solar_line_core::comms::light_time_seconds(Km(distance_km))
}

/// One-way light time (minutes) for a given distance in km.
#[wasm_bindgen]
pub fn light_time_minutes(distance_km: f64) -> f64 {
    solar_line_core::comms::light_time_minutes(Km(distance_km))
}

/// Round-trip light time (seconds) for a given distance in km.
#[wasm_bindgen]
pub fn round_trip_light_time(distance_km: f64) -> f64 {
    solar_line_core::comms::round_trip_light_time(Km(distance_km))
}

/// One-way light delay (seconds) between two planets at a given Julian Date.
#[wasm_bindgen]
pub fn planet_light_delay(planet1: &str, planet2: &str, jd: f64) -> Result<f64, JsError> {
    let p1 = parse_planet(planet1)?;
    let p2 = parse_planet(planet2)?;
    Ok(solar_line_core::comms::planet_light_delay(p1, p2, jd))
}

/// One-way light delay (seconds) between a ship at (x,y) heliocentric km and a planet.
#[wasm_bindgen]
pub fn ship_planet_light_delay(
    ship_x: f64,
    ship_y: f64,
    planet: &str,
    jd: f64,
) -> Result<f64, JsError> {
    let p = parse_planet(planet)?;
    Ok(solar_line_core::comms::ship_planet_light_delay(
        ship_x, ship_y, p, jd,
    ))
}

/// Distance range (min, max in km) between two planets.
/// Returns [min_km, max_km].
#[wasm_bindgen]
pub fn planet_distance_range(planet1: &str, planet2: &str) -> Result<Box<[f64]>, JsError> {
    let p1 = parse_planet(planet1)?;
    let p2 = parse_planet(planet2)?;
    let (min, max) = solar_line_core::comms::planet_distance_range(p1, p2);
    Ok(Box::new([min.value(), max.value()]))
}

/// Light delay range (min, max in seconds) between two planets.
/// Returns [min_s, max_s].
#[wasm_bindgen]
pub fn planet_light_delay_range(planet1: &str, planet2: &str) -> Result<Box<[f64]>, JsError> {
    let p1 = parse_planet(planet1)?;
    let p2 = parse_planet(planet2)?;
    let (min, max) = solar_line_core::comms::planet_light_delay_range(p1, p2);
    Ok(Box::new([min, max]))
}

/// Free-space path loss in dB.
/// distance_km in km, freq_hz in Hz.
#[wasm_bindgen]
pub fn free_space_path_loss_db(distance_km: f64, freq_hz: f64) -> f64 {
    solar_line_core::comms::free_space_path_loss_db(distance_km, freq_hz)
}

/// Classify communication feasibility based on one-way delay (seconds).
/// Returns a Japanese label string.
#[wasm_bindgen]
pub fn comm_feasibility_label(one_way_delay_s: f64) -> String {
    solar_line_core::comms::CommFeasibility::classify(one_way_delay_s)
        .label_ja()
        .to_string()
}

/// Compute communication timeline along a linear route between two planets.
/// Returns a flat array: [jd, elapsed_s, ship_x, ship_y, delay_to_earth_s, feasibility_code, ...]
/// feasibility_code: 0=RealTime, 1=NearRealTime, 2=Delayed, 3=DeepSpace
#[wasm_bindgen]
pub fn comm_timeline_linear(
    departure: &str,
    arrival: &str,
    departure_jd: f64,
    travel_time_s: f64,
    n_steps: usize,
) -> Result<Box<[f64]>, JsError> {
    use solar_line_core::comms::CommFeasibility;

    let dep = parse_planet(departure)?;
    let arr = parse_planet(arrival)?;
    let entries = solar_line_core::comms::comm_timeline_linear(
        dep,
        arr,
        departure_jd,
        travel_time_s,
        n_steps,
    );

    let mut result = Vec::with_capacity(entries.len() * 6);
    for e in &entries {
        result.push(e.jd);
        result.push(e.elapsed_s);
        result.push(e.ship_x);
        result.push(e.ship_y);
        result.push(e.delay_to_earth_s);
        result.push(match e.feasibility {
            CommFeasibility::RealTime => 0.0,
            CommFeasibility::NearRealTime => 1.0,
            CommFeasibility::Delayed => 2.0,
            CommFeasibility::DeepSpace => 3.0,
        });
    }
    Ok(result.into_boxed_slice())
}

// ---------------------------------------------------------------------------
// Attitude control functions
// ---------------------------------------------------------------------------

/// Miss distance (km) from pointing error during a constant-thrust burn.
#[wasm_bindgen]
pub fn miss_distance_km(accel_m_s2: f64, burn_time_s: f64, pointing_error_rad: f64) -> f64 {
    solar_line_core::attitude::miss_distance_km(accel_m_s2, burn_time_s, pointing_error_rad)
}

/// Required pointing accuracy (radians) for a given miss distance.
#[wasm_bindgen]
pub fn required_pointing_rad(accel_m_s2: f64, burn_time_s: f64, max_miss_km: f64) -> f64 {
    solar_line_core::attitude::required_pointing_rad(accel_m_s2, burn_time_s, max_miss_km)
}

/// Angular rate for a 180° flip maneuver (rad/s).
#[wasm_bindgen]
pub fn flip_angular_rate(flip_duration_s: f64) -> f64 {
    solar_line_core::attitude::flip_angular_rate(flip_duration_s)
}

/// Angular momentum for a flip maneuver (kg·m²/s).
#[wasm_bindgen]
pub fn flip_angular_momentum(mass_kg: f64, radius_m: f64, angular_rate_rad_s: f64) -> f64 {
    solar_line_core::attitude::flip_angular_momentum(mass_kg, radius_m, angular_rate_rad_s)
}

/// RCS torque required for a flip maneuver (N·m).
#[wasm_bindgen]
pub fn flip_rcs_torque(mass_kg: f64, radius_m: f64, flip_duration_s: f64, ramp_time_s: f64) -> f64 {
    solar_line_core::attitude::flip_rcs_torque(mass_kg, radius_m, flip_duration_s, ramp_time_s)
}

/// Velocity error (km/s) from pointing misalignment.
#[wasm_bindgen]
pub fn velocity_error_from_pointing(
    accel_m_s2: f64,
    burn_time_s: f64,
    pointing_error_rad: f64,
) -> f64 {
    solar_line_core::attitude::velocity_error_from_pointing(
        accel_m_s2,
        burn_time_s,
        pointing_error_rad,
    )
}

/// Convert navigation accuracy fraction to pointing error (radians).
#[wasm_bindgen]
pub fn accuracy_to_pointing_error_rad(accuracy_fraction: f64) -> f64 {
    solar_line_core::attitude::accuracy_to_pointing_error_rad(accuracy_fraction)
}

/// Gravity gradient torque on an elongated spacecraft (N·m).
#[wasm_bindgen]
pub fn gravity_gradient_torque(
    gm_m3_s2: f64,
    distance_m: f64,
    mass_kg: f64,
    length_m: f64,
    angle_rad: f64,
) -> f64 {
    solar_line_core::attitude::gravity_gradient_torque(
        gm_m3_s2, distance_m, mass_kg, length_m, angle_rad,
    )
}

// ---------------------------------------------------------------------------
// DAG analysis
// ---------------------------------------------------------------------------

/// Input format matching the TypeScript DagState (dag-types.ts).
#[derive(Deserialize)]
struct JsDagState {
    nodes: std::collections::HashMap<String, JsDagNode>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsDagNode {
    #[allow(dead_code)]
    id: String,
    #[serde(rename = "type")]
    node_type: String,
    #[serde(default)]
    depends_on: Vec<String>,
    #[serde(default)]
    status: String,
    #[serde(default)]
    tags: Vec<String>,
}

/// Layout result returned to JS.
#[derive(Serialize, Deserialize)]
struct DagLayoutResult {
    /// Node IDs in the order they were processed.
    ids: Vec<String>,
    /// x positions (same order as ids).
    x: Vec<f64>,
    /// y positions (same order as ids).
    y: Vec<f64>,
    /// Layer assignment for each node.
    layers: Vec<usize>,
    /// Number of edge crossings in the layout.
    crossings: usize,
}

/// Impact analysis result returned to JS.
#[derive(Serialize, Deserialize)]
struct DagImpactResult {
    /// IDs of affected nodes (downstream cascade).
    affected: Vec<String>,
    /// Cascade count.
    cascade_count: usize,
    /// Affected count by type: { data_source, parameter, analysis, report, task }.
    by_type: DagImpactByType,
}

#[derive(Serialize, Deserialize)]
struct DagImpactByType {
    data_source: usize,
    parameter: usize,
    analysis: usize,
    report: usize,
    task: usize,
}

/// General analysis result returned to JS.
#[derive(Serialize, Deserialize)]
struct DagAnalysisResult {
    /// Topological order (node IDs).
    topo_order: Vec<String>,
    /// Critical path (node IDs).
    critical_path: Vec<String>,
    /// Depth of each node (keyed by id).
    depths: Vec<DagNodeDepth>,
    /// Orphan node IDs.
    orphans: Vec<String>,
}

#[derive(Serialize, Deserialize)]
struct DagNodeDepth {
    id: String,
    depth: usize,
}

/// Path-finding result.
#[derive(Serialize, Deserialize)]
struct DagPathResult {
    paths: Vec<Vec<String>>,
}

/// Convert JS DAG state to internal Rust representation.
/// Returns (Dag, id_list) where id_list maps index→string ID.
fn parse_dag_state(state: &JsDagState) -> (dag::Dag, Vec<String>) {
    // Collect all node IDs and assign stable indices
    let mut ids: Vec<String> = state.nodes.keys().cloned().collect();
    ids.sort(); // Stable ordering
    let id_to_idx: std::collections::HashMap<&str, usize> = ids
        .iter()
        .enumerate()
        .map(|(i, s)| (s.as_str(), i))
        .collect();

    let mut nodes = Vec::with_capacity(ids.len());
    for (i, id) in ids.iter().enumerate() {
        let js_node = &state.nodes[id];
        let node_type = dag::NodeType::parse(&js_node.node_type).unwrap_or(dag::NodeType::Task);
        let status = dag::NodeStatus::parse(&js_node.status).unwrap_or(dag::NodeStatus::Valid);
        let depends_on: Vec<usize> = js_node
            .depends_on
            .iter()
            .filter_map(|dep| id_to_idx.get(dep.as_str()).copied())
            .collect();
        nodes.push(dag::DagNode {
            id: i,
            node_type,
            status,
            depends_on,
            tags: js_node.tags.clone(),
        });
    }

    (dag::Dag::new(nodes), ids)
}

/// Compute Sugiyama-style layout for the DAG.
/// Input: JS DAG state object, width, height.
/// Returns: { ids, x, y, layers, crossings }.
#[wasm_bindgen]
pub fn dag_layout(state: JsValue, width: f64, height: f64) -> Result<JsValue, JsError> {
    let js_state: JsDagState =
        serde_wasm_bindgen::from_value(state).map_err(|e| JsError::new(&e.to_string()))?;
    let (d, ids) = parse_dag_state(&js_state);

    let positions = d.layout(width, height);
    let (layer_assign, _) = d.assign_layers();
    let crossings = d.count_crossings(&positions);

    let result = DagLayoutResult {
        ids: ids.clone(),
        x: positions.iter().map(|(x, _)| *x).collect(),
        y: positions.iter().map(|(_, y)| *y).collect(),
        layers: layer_assign,
        crossings,
    };
    serde_wasm_bindgen::to_value(&result).map_err(|e| JsError::new(&e.to_string()))
}

/// Run impact analysis: what happens if a node is invalidated?
/// Returns affected nodes and cascade statistics.
#[wasm_bindgen]
pub fn dag_impact(state: JsValue, node_id: &str) -> Result<JsValue, JsError> {
    let js_state: JsDagState =
        serde_wasm_bindgen::from_value(state).map_err(|e| JsError::new(&e.to_string()))?;
    let (d, ids) = parse_dag_state(&js_state);

    let idx = ids
        .iter()
        .position(|id| id == node_id)
        .ok_or_else(|| JsError::new(&format!("Node '{}' not found", node_id)))?;

    let impact = d.impact_analysis(idx);

    let result = DagImpactResult {
        affected: impact
            .affected_nodes
            .iter()
            .map(|&i| ids[i].clone())
            .collect(),
        cascade_count: impact.cascade_count,
        by_type: DagImpactByType {
            data_source: impact.by_type[0],
            parameter: impact.by_type[1],
            analysis: impact.by_type[2],
            report: impact.by_type[3],
            task: impact.by_type[4],
        },
    };
    serde_wasm_bindgen::to_value(&result).map_err(|e| JsError::new(&e.to_string()))
}

/// Full DAG analysis: topo order, critical path, depths, orphans.
#[wasm_bindgen]
pub fn dag_analyze(state: JsValue) -> Result<JsValue, JsError> {
    let js_state: JsDagState =
        serde_wasm_bindgen::from_value(state).map_err(|e| JsError::new(&e.to_string()))?;
    let (d, ids) = parse_dag_state(&js_state);

    let topo = d.topological_sort().unwrap_or_default();
    let crit = d.critical_path();
    let depths_vec = d.compute_depths();
    let orphan_indices = d.orphans();

    let result = DagAnalysisResult {
        topo_order: topo.iter().map(|&i| ids[i].clone()).collect(),
        critical_path: crit.iter().map(|&i| ids[i].clone()).collect(),
        depths: ids
            .iter()
            .enumerate()
            .map(|(i, id)| DagNodeDepth {
                id: id.clone(),
                depth: depths_vec[i],
            })
            .collect(),
        orphans: orphan_indices.iter().map(|&i| ids[i].clone()).collect(),
    };
    serde_wasm_bindgen::to_value(&result).map_err(|e| JsError::new(&e.to_string()))
}

/// Get all upstream dependencies of a node (transitive).
#[wasm_bindgen]
pub fn dag_upstream(state: JsValue, node_id: &str) -> Result<JsValue, JsError> {
    let js_state: JsDagState =
        serde_wasm_bindgen::from_value(state).map_err(|e| JsError::new(&e.to_string()))?;
    let (d, ids) = parse_dag_state(&js_state);

    let idx = ids
        .iter()
        .position(|id| id == node_id)
        .ok_or_else(|| JsError::new(&format!("Node '{}' not found", node_id)))?;

    let upstream: Vec<String> = d
        .all_upstream(idx)
        .iter()
        .map(|&i| ids[i].clone())
        .collect();
    serde_wasm_bindgen::to_value(&upstream).map_err(|e| JsError::new(&e.to_string()))
}

/// Get all downstream dependents of a node (transitive).
#[wasm_bindgen]
pub fn dag_downstream(state: JsValue, node_id: &str) -> Result<JsValue, JsError> {
    let js_state: JsDagState =
        serde_wasm_bindgen::from_value(state).map_err(|e| JsError::new(&e.to_string()))?;
    let (d, ids) = parse_dag_state(&js_state);

    let idx = ids
        .iter()
        .position(|id| id == node_id)
        .ok_or_else(|| JsError::new(&format!("Node '{}' not found", node_id)))?;

    let downstream: Vec<String> = d
        .all_downstream(idx)
        .iter()
        .map(|&i| ids[i].clone())
        .collect();
    serde_wasm_bindgen::to_value(&downstream).map_err(|e| JsError::new(&e.to_string()))
}

/// Find all paths between two nodes.
#[wasm_bindgen]
pub fn dag_find_paths(
    state: JsValue,
    source_id: &str,
    target_id: &str,
    max_paths: usize,
) -> Result<JsValue, JsError> {
    let js_state: JsDagState =
        serde_wasm_bindgen::from_value(state).map_err(|e| JsError::new(&e.to_string()))?;
    let (d, ids) = parse_dag_state(&js_state);

    let src = ids
        .iter()
        .position(|id| id == source_id)
        .ok_or_else(|| JsError::new(&format!("Source '{}' not found", source_id)))?;
    let tgt = ids
        .iter()
        .position(|id| id == target_id)
        .ok_or_else(|| JsError::new(&format!("Target '{}' not found", target_id)))?;

    let paths = d.find_paths(src, tgt, max_paths);
    let result = DagPathResult {
        paths: paths
            .iter()
            .map(|p| p.iter().map(|&i| ids[i].clone()).collect())
            .collect(),
    };
    serde_wasm_bindgen::to_value(&result).map_err(|e| JsError::new(&e.to_string()))
}

/// Extract a focused subgraph around nodes matching a tag.
/// Returns node IDs included in the subgraph.
#[wasm_bindgen]
pub fn dag_subgraph(state: JsValue, tag: &str, depth: usize) -> Result<JsValue, JsError> {
    let js_state: JsDagState =
        serde_wasm_bindgen::from_value(state).map_err(|e| JsError::new(&e.to_string()))?;
    let (d, ids) = parse_dag_state(&js_state);

    let tag_str = tag.to_string();
    let sub = d.subgraph(|n| n.tags.contains(&tag_str), depth);
    let result: Vec<String> = sub.iter().map(|&i| ids[i].clone()).collect();
    serde_wasm_bindgen::to_value(&result).map_err(|e| JsError::new(&e.to_string()))
}

// ---------------------------------------------------------------------------
// Mass timeline analysis
// ---------------------------------------------------------------------------

/// Compute propellant consumed (kg) during a burn.
/// pre_burn_mass_kg: total mass before burn, delta_v_km_s: ΔV, isp_s: specific impulse.
#[wasm_bindgen]
pub fn mass_propellant_consumed(pre_burn_mass_kg: f64, delta_v_km_s: f64, isp_s: f64) -> f64 {
    solar_line_core::mass_timeline::propellant_consumed(pre_burn_mass_kg, delta_v_km_s, isp_s)
}

/// Post-burn mass (kg) after propellant consumption.
#[wasm_bindgen]
pub fn mass_post_burn(pre_burn_mass_kg: f64, delta_v_km_s: f64, isp_s: f64) -> f64 {
    solar_line_core::mass_timeline::post_burn_mass(pre_burn_mass_kg, delta_v_km_s, isp_s)
}

/// Compute a full mass timeline from events.
///
/// Input: JSON object with fields:
///   name: string, initial_total_kg: number, initial_dry_kg: number,
///   events: [{ time_h, episode, label, kind: { type, ...params } }, ...]
///
/// Output: JSON object with fields:
///   name, initial_mass_kg, initial_dry_mass_kg, snapshots: [{ time_h, total_mass_kg, dry_mass_kg, propellant_kg, episode }, ...]
#[wasm_bindgen]
pub fn mass_compute_timeline(input: JsValue) -> Result<JsValue, JsError> {
    let req: MassTimelineRequest =
        serde_wasm_bindgen::from_value(input).map_err(|e| JsError::new(&e.to_string()))?;

    let events: Vec<solar_line_core::mass_timeline::MassEvent> = req
        .events
        .iter()
        .map(|e| solar_line_core::mass_timeline::MassEvent {
            time_h: e.time_h,
            kind: match &e.kind {
                JsMassEventKind::FuelBurn {
                    delta_v_km_s,
                    isp_s,
                    burn_duration_h,
                } => solar_line_core::mass_timeline::MassEventKind::FuelBurn {
                    delta_v_km_s: *delta_v_km_s,
                    isp_s: *isp_s,
                    burn_duration_h: *burn_duration_h,
                },
                JsMassEventKind::ContainerJettison { mass_kg } => {
                    solar_line_core::mass_timeline::MassEventKind::ContainerJettison {
                        mass_kg: *mass_kg,
                    }
                }
                JsMassEventKind::DamageEvent { mass_kg } => {
                    solar_line_core::mass_timeline::MassEventKind::DamageEvent { mass_kg: *mass_kg }
                }
                JsMassEventKind::Resupply { mass_kg } => {
                    solar_line_core::mass_timeline::MassEventKind::Resupply { mass_kg: *mass_kg }
                }
            },
            episode: e.episode,
            label: e.label.clone(),
        })
        .collect();

    let timeline = solar_line_core::mass_timeline::compute_timeline(
        &req.name,
        req.initial_total_kg,
        req.initial_dry_kg,
        &events,
    );

    let margin = solar_line_core::mass_timeline::propellant_margin(&timeline);
    let consumed = solar_line_core::mass_timeline::total_propellant_consumed(&timeline);

    let response = MassTimelineResponse {
        name: timeline.name,
        initial_mass_kg: timeline.initial_mass_kg,
        initial_dry_mass_kg: timeline.initial_dry_mass_kg,
        propellant_margin: margin,
        total_consumed_kg: consumed,
        snapshots: timeline
            .snapshots
            .iter()
            .map(|s| JsMassSnapshot {
                time_h: s.time_h,
                total_mass_kg: s.total_mass_kg,
                dry_mass_kg: s.dry_mass_kg,
                propellant_kg: s.propellant_kg,
                episode: s.episode,
            })
            .collect(),
    };

    serde_wasm_bindgen::to_value(&response).map_err(|e| JsError::new(&e.to_string()))
}

#[derive(Deserialize)]
struct MassTimelineRequest {
    name: String,
    initial_total_kg: f64,
    initial_dry_kg: f64,
    events: Vec<JsMassEvent>,
}

#[derive(Deserialize)]
struct JsMassEvent {
    time_h: f64,
    episode: u8,
    label: String,
    kind: JsMassEventKind,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
enum JsMassEventKind {
    #[serde(rename = "fuel_burn")]
    FuelBurn {
        delta_v_km_s: f64,
        isp_s: f64,
        burn_duration_h: f64,
    },
    #[serde(rename = "container_jettison")]
    ContainerJettison { mass_kg: f64 },
    #[serde(rename = "damage")]
    DamageEvent { mass_kg: f64 },
    #[serde(rename = "resupply")]
    Resupply { mass_kg: f64 },
}

#[derive(Serialize)]
struct MassTimelineResponse {
    name: String,
    initial_mass_kg: f64,
    initial_dry_mass_kg: f64,
    propellant_margin: f64,
    total_consumed_kg: f64,
    snapshots: Vec<JsMassSnapshot>,
}

#[derive(Serialize)]
struct JsMassSnapshot {
    time_h: f64,
    total_mass_kg: f64,
    dry_mass_kg: f64,
    propellant_kg: f64,
    episode: u8,
}

// ---------------------------------------------------------------------------
// Plasmoid perturbation analysis
// ---------------------------------------------------------------------------

/// Magnetic pressure (Pa) from a magnetic field strength in Tesla.
#[wasm_bindgen]
pub fn magnetic_pressure_pa(b_tesla: f64) -> f64 {
    solar_line_core::plasmoid::magnetic_pressure_pa(b_tesla)
}

/// Ram pressure (Pa) from plasma mass density (kg/m³) and velocity (m/s).
#[wasm_bindgen]
pub fn ram_pressure_pa(density_kg_m3: f64, velocity_m_s: f64) -> f64 {
    solar_line_core::plasmoid::ram_pressure_pa(density_kg_m3, velocity_m_s)
}

/// Convert plasma number density (particles/m³) to mass density (kg/m³).
/// Assumes pure hydrogen plasma.
#[wasm_bindgen]
pub fn plasma_number_density_to_mass(n_per_m3: f64) -> f64 {
    solar_line_core::plasmoid::number_density_to_mass(n_per_m3)
}

/// Full plasmoid perturbation analysis.
/// Returns JSON: { magnetic_pressure_pa, ram_pressure_pa, total_pressure_pa,
///   force_n, impulse_ns, velocity_perturbation_m_s, miss_distance_km, correction_dv_m_s }
#[wasm_bindgen]
pub fn plasmoid_perturbation(
    b_tesla: f64,
    n_density_per_m3: f64,
    plasma_velocity_m_s: f64,
    cross_section_m2: f64,
    transit_duration_s: f64,
    ship_mass_kg: f64,
    remaining_travel_s: f64,
) -> Result<JsValue, JsError> {
    let result = solar_line_core::plasmoid::plasmoid_perturbation(
        b_tesla,
        n_density_per_m3,
        plasma_velocity_m_s,
        cross_section_m2,
        transit_duration_s,
        ship_mass_kg,
        remaining_travel_s,
    );

    #[derive(Serialize)]
    struct PlasmoidResult {
        magnetic_pressure_pa: f64,
        ram_pressure_pa: f64,
        total_pressure_pa: f64,
        force_n: f64,
        impulse_ns: f64,
        velocity_perturbation_m_s: f64,
        miss_distance_km: f64,
        correction_dv_m_s: f64,
    }

    let r = PlasmoidResult {
        magnetic_pressure_pa: result.magnetic_pressure_pa,
        ram_pressure_pa: result.ram_pressure_pa,
        total_pressure_pa: result.total_pressure_pa,
        force_n: result.force_n,
        impulse_ns: result.impulse_ns,
        velocity_perturbation_m_s: result.velocity_perturbation_m_s,
        miss_distance_km: result.miss_distance_km,
        correction_dv_m_s: result.correction_dv_m_s,
    };
    serde_wasm_bindgen::to_value(&r).map_err(|e| JsError::new(&e.to_string()))
}

/// Get predefined Uranus plasmoid scenarios.
/// Returns JSON array: [{ label, b_tesla, n_per_m3, velocity_m_s }, ...]
#[wasm_bindgen]
pub fn uranus_plasmoid_scenarios() -> Result<JsValue, JsError> {
    #[derive(Serialize)]
    struct Scenario {
        label: String,
        b_tesla: f64,
        n_per_m3: f64,
        velocity_m_s: f64,
    }

    let scenarios: Vec<Scenario> = solar_line_core::plasmoid::uranus_plasmoid_scenarios()
        .into_iter()
        .map(|(label, b, n, v)| Scenario {
            label: label.to_string(),
            b_tesla: b,
            n_per_m3: n,
            velocity_m_s: v,
        })
        .collect();
    serde_wasm_bindgen::to_value(&scenarios).map_err(|e| JsError::new(&e.to_string()))
}

// ---------------------------------------------------------------------------
// 3D orbital analysis
// ---------------------------------------------------------------------------

/// Compute ecliptic z-height of a planet at a given Julian Date (km).
#[wasm_bindgen]
pub fn ecliptic_z_height(planet: &str, jd: f64) -> Result<f64, JsError> {
    let p = parse_planet(planet)?;
    Ok(solar_line_core::orbital_3d::ecliptic_z_height(p, jd).value())
}

/// Maximum ecliptic z-height a planet can reach (km).
#[wasm_bindgen]
pub fn max_ecliptic_z_height(planet: &str) -> Result<f64, JsError> {
    let p = parse_planet(planet)?;
    Ok(solar_line_core::orbital_3d::max_ecliptic_z_height(p).value())
}

/// Out-of-plane distance between two planets at a given Julian Date (km).
#[wasm_bindgen]
pub fn out_of_plane_distance(planet1: &str, planet2: &str, jd: f64) -> Result<f64, JsError> {
    let p1 = parse_planet(planet1)?;
    let p2 = parse_planet(planet2)?;
    Ok(solar_line_core::orbital_3d::out_of_plane_distance(p1, p2, jd).value())
}

/// ΔV penalty for inclination change (km/s).
/// Given a transfer velocity and the inclination difference between two planets.
#[wasm_bindgen]
pub fn plane_change_dv(velocity_km_s: f64, delta_inclination_rad: f64) -> f64 {
    orbits::plane_change_dv(KmPerSec(velocity_km_s), Radians(delta_inclination_rad)).value()
}

/// Transfer inclination penalty between two planets.
/// Returns { delta_i_rad, dv_penalty_km_s }.
#[wasm_bindgen]
pub fn transfer_inclination_penalty(
    departure: &str,
    arrival: &str,
    jd: f64,
    transfer_velocity_km_s: f64,
) -> Result<JsValue, JsError> {
    let dep = parse_planet(departure)?;
    let arr = parse_planet(arrival)?;
    let (delta_i, dv) = solar_line_core::orbital_3d::transfer_inclination_penalty(
        dep,
        arr,
        jd,
        transfer_velocity_km_s,
    );

    #[derive(Serialize)]
    struct InclinationResult {
        delta_i_rad: f64,
        delta_i_deg: f64,
        dv_penalty_km_s: f64,
    }

    let result = InclinationResult {
        delta_i_rad: delta_i.value(),
        delta_i_deg: delta_i.value().to_degrees(),
        dv_penalty_km_s: dv,
    };
    serde_wasm_bindgen::to_value(&result).map_err(|e| JsError::new(&e.to_string()))
}

/// Compute Saturn ring plane normal vector in ecliptic coordinates.
/// Returns [x, y, z].
#[wasm_bindgen]
pub fn saturn_ring_plane_normal(jd: f64) -> Box<[f64]> {
    let n = solar_line_core::orbital_3d::saturn_ring_plane_normal(jd);
    Box::new([n.x, n.y, n.z])
}

/// Compute Uranus spin axis direction in ecliptic coordinates.
/// Returns [x, y, z].
#[wasm_bindgen]
pub fn uranus_spin_axis_ecliptic() -> Box<[f64]> {
    let a = solar_line_core::orbital_3d::uranus_spin_axis_ecliptic();
    Box::new([a.x, a.y, a.z])
}

/// Analyze Saturn ring plane crossing.
/// Returns JSON with crossing analysis.
#[wasm_bindgen]
pub fn saturn_ring_crossing(
    pos_x: f64,
    pos_y: f64,
    pos_z: f64,
    vel_x: f64,
    vel_y: f64,
    vel_z: f64,
    jd: f64,
) -> Result<JsValue, JsError> {
    let pos = Vec3::new(pos_x, pos_y, pos_z);
    let vel = Vec3::new(vel_x, vel_y, vel_z);
    let result = solar_line_core::orbital_3d::saturn_ring_crossing(pos, vel, jd);

    #[derive(Serialize)]
    struct RingCrossingResult {
        crosses_ring_plane: bool,
        crossing_distance_km: Option<f64>,
        within_rings: bool,
        z_offset_at_closest_km: f64,
        approach_angle_to_ring_plane_deg: f64,
    }

    let js_result = RingCrossingResult {
        crosses_ring_plane: result.crosses_ring_plane,
        crossing_distance_km: result.crossing_distance_km,
        within_rings: result.within_rings,
        z_offset_at_closest_km: result.z_offset_at_closest_km,
        approach_angle_to_ring_plane_deg: result.approach_angle_to_ring_plane.value().to_degrees(),
    };
    serde_wasm_bindgen::to_value(&js_result).map_err(|e| JsError::new(&e.to_string()))
}

/// Analyze approach geometry to Uranus.
/// Returns JSON with approach analysis.
#[wasm_bindgen]
pub fn uranus_approach_analysis(
    approach_x: f64,
    approach_y: f64,
    approach_z: f64,
    closest_approach_km: f64,
) -> Result<JsValue, JsError> {
    let approach = Vec3::new(approach_x, approach_y, approach_z);
    let result =
        solar_line_core::orbital_3d::uranus_approach_analysis(approach, closest_approach_km);

    #[derive(Serialize)]
    struct UranusApproachResult {
        equatorial_ecliptic_angle_deg: f64,
        spin_axis_ecliptic: [f64; 3],
        is_polar_approach: bool,
        is_equatorial_approach: bool,
        approach_to_equatorial_deg: f64,
        ring_clearance_km: f64,
    }

    let js_result = UranusApproachResult {
        equatorial_ecliptic_angle_deg: result.equatorial_ecliptic_angle.value().to_degrees(),
        spin_axis_ecliptic: [
            result.spin_axis_ecliptic.x,
            result.spin_axis_ecliptic.y,
            result.spin_axis_ecliptic.z,
        ],
        is_polar_approach: result.is_polar_approach,
        is_equatorial_approach: result.is_equatorial_approach,
        approach_to_equatorial_deg: result.approach_to_equatorial.value().to_degrees(),
        ring_clearance_km: result.ring_clearance_km,
    };
    serde_wasm_bindgen::to_value(&js_result).map_err(|e| JsError::new(&e.to_string()))
}

/// Convert orbital elements to state vector.
/// Returns JSON with position [x,y,z] in km and velocity [vx,vy,vz] in km/s.
#[wasm_bindgen]
pub fn elements_to_state_vector(
    mu: f64,
    semi_major_axis_km: f64,
    eccentricity: f64,
    inclination_rad: f64,
    raan_rad: f64,
    arg_periapsis_rad: f64,
    true_anomaly_rad: f64,
) -> Result<JsValue, JsError> {
    let e = Eccentricity::elliptical(eccentricity)
        .ok_or_else(|| JsError::new(&format!("Invalid eccentricity: {}", eccentricity)))?;
    let elements = solar_line_core::OrbitalElements {
        semi_major_axis: Km(semi_major_axis_km),
        eccentricity: e,
        inclination: Radians(inclination_rad),
        raan: Radians(raan_rad),
        arg_periapsis: Radians(arg_periapsis_rad),
        true_anomaly: Radians(true_anomaly_rad),
    };

    let sv = orbits::elements_to_state_vector(Mu(mu), &elements);

    #[derive(Serialize)]
    struct StateVectorResult {
        position: [f64; 3],
        velocity: [f64; 3],
        radius_km: f64,
        speed_km_s: f64,
    }

    let result = StateVectorResult {
        position: [
            sv.position.x.value(),
            sv.position.y.value(),
            sv.position.z.value(),
        ],
        velocity: [
            sv.velocity.x.value(),
            sv.velocity.y.value(),
            sv.velocity.z.value(),
        ],
        radius_km: sv.radius().value(),
        speed_km_s: sv.speed().value(),
    };
    serde_wasm_bindgen::to_value(&result).map_err(|e| JsError::new(&e.to_string()))
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

    // ── Tsiolkovsky rocket equation tests ────────────────────────────

    #[test]
    fn test_wasm_exhaust_velocity() {
        // Isp 100,000 s → vₑ ≈ 980.665 km/s
        let ve = exhaust_velocity(100_000.0);
        assert!((ve - 980.665).abs() < 0.001);
    }

    #[test]
    fn test_wasm_mass_ratio() {
        // ΔV = vₑ → mass ratio = e
        let mr = mass_ratio(10.0, 10.0);
        assert!((mr - std::f64::consts::E).abs() < 1e-10);
    }

    #[test]
    fn test_wasm_propellant_fraction() {
        // ΔV = vₑ → pf = 1 - 1/e
        let pf = propellant_fraction(10.0, 10.0);
        let expected = 1.0 - 1.0 / std::f64::consts::E;
        assert!((pf - expected).abs() < 1e-10);
    }

    #[test]
    fn test_wasm_required_propellant_mass() {
        let prop = required_propellant_mass(1000.0, 10.0, 10.0);
        let expected = 1000.0 * (std::f64::consts::E - 1.0);
        assert!((prop - expected).abs() < 0.01);
    }

    #[test]
    fn test_wasm_initial_mass() {
        let m0 = initial_mass(1000.0, 10.0, 10.0);
        let expected = 1000.0 * std::f64::consts::E;
        assert!((m0 - expected).abs() < 0.01);
    }

    #[test]
    fn test_wasm_mass_flow_rate() {
        let ve = exhaust_velocity(100_000.0);
        let mdot = mass_flow_rate(9.8e6, ve);
        assert!((mdot - 9.993).abs() < 0.1);
    }

    #[test]
    fn test_wasm_jet_power() {
        let ve = exhaust_velocity(100_000.0);
        let p = jet_power(9.8e6, ve);
        // Expected: 0.5 * 9.8e6 * 980665 ≈ 4.805e12 W
        assert!(p > 4.8e12 && p < 4.81e12);
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

    #[test]
    fn test_wasm_oberth_dv_gain_positive() {
        // Jupiter flyby: v_inf=10 km/s, burn=1 km/s at 1 RJ
        let mu_j = 1.26686534e8;
        let gain = oberth_dv_gain(mu_j, 71_492.0, 10.0, 1.0);
        assert!(gain > 0.0, "Oberth gain should be positive: {}", gain);
    }

    #[test]
    fn test_wasm_oberth_efficiency_high_v_inf() {
        // At 1500 km/s, efficiency should be small
        let mu_j = 1.26686534e8;
        let eff = oberth_efficiency(mu_j, 71_492.0 * 3.0, 1500.0, 50.0);
        assert!(eff > 0.0 && eff < 0.1, "efficiency at 1500 km/s = {}", eff);
    }

    #[test]
    fn test_wasm_oberth_zero_burn() {
        let mu_j = 1.26686534e8;
        let gain = oberth_dv_gain(mu_j, 71_492.0, 10.0, 0.0);
        assert!(gain.abs() < 1e-10, "zero burn = zero gain: {}", gain);
    }

    // ── Propagation WASM tests ────────────────────────────────────────

    #[test]
    fn test_wasm_propagate_ballistic_energy_conservation() {
        // Circular LEO orbit for 1 period
        let mu_earth: f64 = 3.986004418e5;
        let r: f64 = 6578.0;
        let v = (mu_earth / r).sqrt();
        let period = std::f64::consts::TAU * (r.powi(3) / mu_earth).sqrt();

        let result = propagate_ballistic(r, 0.0, 0.0, 0.0, v, 0.0, mu_earth, 1.0, period);
        assert_eq!(result.len(), 8);

        // Energy drift (last element)
        let drift = result[7];
        assert!(drift < 1e-10, "energy drift = {:.2e}", drift);

        // Should return near start position
        let pos_err = ((result[0] - r).powi(2) + result[1].powi(2) + result[2].powi(2)).sqrt();
        assert!(pos_err / r < 1e-6, "position error = {:.2e} km", pos_err);
    }

    #[test]
    fn test_wasm_propagate_brachistochrone() {
        // Simple test: brachistochrone from LEO, 1000s
        let mu_earth: f64 = 3.986004418e5;
        let r: f64 = 6578.0;
        let v = (mu_earth / r).sqrt();

        let result = propagate_brachistochrone(
            r, 0.0, 0.0, 0.0, v, 0.0, mu_earth, 1.0, 1000.0, 1e-4, 500.0, // flip at 500s
        );
        assert_eq!(result.len(), 7);
        // Time should be approximately 1000s
        assert!((result[6] - 1000.0).abs() < 1.0);
    }

    #[test]
    fn test_wasm_propagate_adaptive_ballistic_energy() {
        // Circular LEO orbit for 1 period, adaptive
        let mu_earth: f64 = 3.986004418e5;
        let r: f64 = 6578.0;
        let v = (mu_earth / r).sqrt();
        let period = std::f64::consts::TAU * (r.powi(3) / mu_earth).sqrt();

        let result =
            propagate_adaptive_ballistic(r, 0.0, 0.0, 0.0, v, 0.0, mu_earth, period, 1e-10, 1e-12);
        assert_eq!(result.len(), 9);
        // Energy drift
        let drift = result[7];
        assert!(drift < 1e-8, "adaptive energy drift = {:.2e}", drift);
        // n_eval should be positive
        let n_eval = result[8] as usize;
        assert!(n_eval > 0, "should have taken steps");
    }

    #[test]
    fn test_wasm_propagate_adaptive_brachistochrone() {
        let mu_earth: f64 = 3.986004418e5;
        let r: f64 = 6578.0;
        let v = (mu_earth / r).sqrt();

        let result = propagate_adaptive_brachistochrone(
            r, 0.0, 0.0, 0.0, v, 0.0, mu_earth, 1000.0, 1e-4, 500.0, 1e-8, 1e-10,
        );
        assert_eq!(result.len(), 8);
        assert!((result[6] - 1000.0).abs() < 1.0, "time should be ~1000s");
    }

    #[test]
    fn test_wasm_propagate_trajectory_returns_points() {
        let mu_earth: f64 = 3.986004418e5;
        let r: f64 = 6578.0;
        let v = (mu_earth / r).sqrt();
        let period = std::f64::consts::TAU * (r.powi(3) / mu_earth).sqrt();

        let result = propagate_trajectory(r, 0.0, 0.0, 0.0, v, 0.0, mu_earth, 10.0, period, 100);
        // Should have multiple 4-float tuples (t, x, y, z)
        assert!(
            result.len() >= 8,
            "trajectory should have at least 2 points"
        );
        assert_eq!(result.len() % 4, 0, "trajectory should be [t,x,y,z] tuples");
    }

    // ── Communications WASM tests ───────────────────────────────────

    #[test]
    fn test_wasm_speed_of_light() {
        let c = speed_of_light();
        assert!((c - 299_792.458).abs() < 1e-10);
    }

    #[test]
    fn test_wasm_light_time_1au() {
        let au = 149_597_870.7;
        let delay = light_time_seconds(au);
        assert!((delay - 499.0).abs() < 0.5, "1 AU delay = {:.1}s", delay);
    }

    #[test]
    fn test_wasm_light_time_minutes() {
        let au = 149_597_870.7;
        let mins = light_time_minutes(au);
        assert!((mins - 8.317).abs() < 0.01, "1 AU = {:.3} min", mins);
    }

    #[test]
    fn test_wasm_comm_feasibility_label() {
        let label = comm_feasibility_label(1.0);
        assert!(label.contains("リアルタイム"));
        let label2 = comm_feasibility_label(3600.0);
        assert!(label2.contains("深宇宙"));
    }

    #[test]
    fn test_wasm_comm_timeline_format() {
        let jd = 2_451_545.0; // J2000
        let result = comm_timeline_linear("mars", "jupiter", jd, 72.0 * 3600.0, 5).unwrap();
        // 6 entries * 6 floats each = 36
        assert_eq!(result.len(), 36, "timeline length = {}", result.len());
        // First entry elapsed should be 0
        assert!((result[1] - 0.0).abs() < 1e-10);
        // Last entry elapsed should be travel time
        assert!((result[31] - 72.0 * 3600.0).abs() < 1e-6);
    }

    #[test]
    fn test_wasm_propagate_symplectic_ballistic() {
        let mu_earth: f64 = 3.986004418e5;
        let r: f64 = 6578.0;
        let v = (mu_earth / r).sqrt();
        let period = std::f64::consts::TAU * (r.powi(3) / mu_earth).sqrt();

        let result =
            propagate_symplectic_ballistic(r, 0.0, 0.0, 0.0, v, 0.0, mu_earth, 1.0, period);
        assert_eq!(result.len(), 9);
        // Energy drift
        let drift = result[7];
        assert!(drift < 1e-8, "symplectic energy drift = {:.2e}", drift);
        // n_steps should match ceil(period/dt)
        let n_steps = result[8] as usize;
        assert!(n_steps > 0, "should have taken steps");
        assert_eq!(n_steps, (period / 1.0).ceil() as usize);
    }

    #[test]
    fn test_wasm_soi_radius_jupiter() {
        let mu_jup = 1.267e8; // km³/s²
        let mu_sun = 1.327e11; // km³/s²
        let r_jup = 7.783e8; // km

        let r_soi = soi_radius(r_jup, mu_jup, mu_sun);
        let r_soi_mkm = r_soi / 1e6;
        assert!(
            r_soi_mkm > 40.0 && r_soi_mkm < 55.0,
            "Jupiter SOI: {:.1} Mkm",
            r_soi_mkm
        );
    }

    #[test]
    fn test_wasm_unpowered_flyby() {
        let mu_jup = 1.267e8;
        let result = unpowered_flyby(mu_jup, 10.0, 0.0, 0.0, 200_000.0, 0.0, 0.0, 1.0);
        assert_eq!(result.len(), 6);
        // v_inf_out should equal v_inf_in for unpowered
        assert!((result[2] - 10.0).abs() < 1e-6, "v_inf conserved");
        // Turn angle should be positive
        assert!(result[0] > 0.0, "turn angle > 0");
    }

    #[test]
    fn test_wasm_powered_flyby() {
        let mu_jup = 1.267e8;
        let result = powered_flyby(mu_jup, 10.0, 0.0, 0.0, 200_000.0, 1.0, 0.0, 0.0, 1.0);
        assert_eq!(result.len(), 6);
        // v_inf_out should be > v_inf_in for powered flyby
        assert!(
            result[2] > 10.0,
            "powered flyby increases v_inf: {:.4}",
            result[2]
        );
    }

    // ── DAG parsing + analysis tests (pure Rust, no JsValue) ──────

    fn make_test_dag_state() -> JsDagState {
        let json = r#"{
            "nodes": {
                "src.data": {
                    "id": "src.data",
                    "type": "data_source",
                    "dependsOn": [],
                    "status": "valid",
                    "tags": ["source"]
                },
                "param.mass": {
                    "id": "param.mass",
                    "type": "parameter",
                    "dependsOn": [],
                    "status": "valid",
                    "tags": ["parameter"]
                },
                "analysis.ep01": {
                    "id": "analysis.ep01",
                    "type": "analysis",
                    "dependsOn": ["src.data", "param.mass"],
                    "status": "valid",
                    "tags": ["episode:01"]
                },
                "analysis.ep02": {
                    "id": "analysis.ep02",
                    "type": "analysis",
                    "dependsOn": ["src.data", "param.mass"],
                    "status": "valid",
                    "tags": ["episode:02"]
                },
                "report.ep01": {
                    "id": "report.ep01",
                    "type": "report",
                    "dependsOn": ["analysis.ep01"],
                    "status": "valid",
                    "tags": ["episode:01"]
                },
                "report.summary": {
                    "id": "report.summary",
                    "type": "report",
                    "dependsOn": ["analysis.ep01", "analysis.ep02"],
                    "status": "valid",
                    "tags": ["summary"]
                }
            },
            "schemaVersion": 1
        }"#;
        serde_json::from_str(json).unwrap()
    }

    #[test]
    fn test_dag_parse_state() {
        let state = make_test_dag_state();
        let (d, ids) = parse_dag_state(&state);
        assert_eq!(d.node_count(), 6);
        assert_eq!(ids.len(), 6);
        // IDs should be sorted
        for i in 0..ids.len() - 1 {
            assert!(ids[i] < ids[i + 1], "IDs should be sorted: {:?}", ids);
        }
    }

    #[test]
    fn test_dag_layout_via_parse() {
        let state = make_test_dag_state();
        let (d, ids) = parse_dag_state(&state);
        let positions = d.layout(1200.0, 600.0);
        assert_eq!(positions.len(), 6);
        assert_eq!(ids.len(), 6);
        // All positions should be within bounds
        for (x, y) in &positions {
            assert!(*x > 0.0 && *x < 1200.0, "x out of bounds: {}", x);
            assert!(*y > 0.0 && *y < 600.0, "y out of bounds: {}", y);
        }
    }

    #[test]
    fn test_dag_analyze_via_parse() {
        let state = make_test_dag_state();
        let (d, ids) = parse_dag_state(&state);
        let topo = d.topological_sort().unwrap();
        assert_eq!(topo.len(), 6);
        let crit = d.critical_path();
        assert!(!crit.is_empty());
        let depths = d.compute_depths();
        assert_eq!(depths.len(), 6);
        // Verify roots have depth 0
        for (i, id) in ids.iter().enumerate() {
            if id == "src.data" || id == "param.mass" {
                assert_eq!(depths[i], 0, "{} should have depth 0", id);
            }
        }
    }

    #[test]
    fn test_dag_impact_param_mass_via_parse() {
        let state = make_test_dag_state();
        let (d, ids) = parse_dag_state(&state);
        let idx = ids.iter().position(|id| id == "param.mass").unwrap();
        let impact = d.impact_analysis(idx);
        // param.mass → analysis.ep01, analysis.ep02 → report.ep01, report.summary
        assert_eq!(impact.cascade_count, 4);
        assert_eq!(impact.by_type[dag::NodeType::Analysis.layer_order()], 2);
        assert_eq!(impact.by_type[dag::NodeType::Report.layer_order()], 2);
    }

    #[test]
    fn test_dag_upstream_report_via_parse() {
        let state = make_test_dag_state();
        let (d, ids) = parse_dag_state(&state);
        let idx = ids.iter().position(|id| id == "report.summary").unwrap();
        let upstream: Vec<String> = d
            .all_upstream(idx)
            .iter()
            .map(|&i| ids[i].clone())
            .collect();
        assert!(upstream.contains(&"analysis.ep01".to_string()));
        assert!(upstream.contains(&"analysis.ep02".to_string()));
        assert!(upstream.contains(&"src.data".to_string()));
        assert!(upstream.contains(&"param.mass".to_string()));
    }

    #[test]
    fn test_dag_downstream_source_via_parse() {
        let state = make_test_dag_state();
        let (d, ids) = parse_dag_state(&state);
        let idx = ids.iter().position(|id| id == "src.data").unwrap();
        let downstream: Vec<String> = d
            .all_downstream(idx)
            .iter()
            .map(|&i| ids[i].clone())
            .collect();
        assert!(downstream.contains(&"analysis.ep01".to_string()));
        assert!(downstream.contains(&"analysis.ep02".to_string()));
    }

    #[test]
    fn test_dag_find_paths_via_parse() {
        let state = make_test_dag_state();
        let (d, ids) = parse_dag_state(&state);
        let src = ids.iter().position(|id| id == "param.mass").unwrap();
        let tgt = ids.iter().position(|id| id == "report.summary").unwrap();
        let paths = d.find_paths(src, tgt, 10);
        assert_eq!(paths.len(), 2); // via ep01 and via ep02
    }

    #[test]
    fn test_dag_subgraph_episode_via_parse() {
        let state = make_test_dag_state();
        let (d, ids) = parse_dag_state(&state);
        let tag = "episode:01".to_string();
        let sub = d.subgraph(|n| n.tags.contains(&tag), 1);
        let node_ids: Vec<String> = sub.iter().map(|&i| ids[i].clone()).collect();
        assert!(node_ids.contains(&"analysis.ep01".to_string()));
        assert!(node_ids.contains(&"report.ep01".to_string()));
        assert!(node_ids.contains(&"src.data".to_string()));
    }

    // ── Mass timeline WASM tests ──────────────────────────────────

    #[test]
    fn test_wasm_mass_propellant_consumed() {
        // 300t ship, ΔV = 1000 km/s, Isp = 10⁶ s
        let consumed = mass_propellant_consumed(300_000.0, 1000.0, 1_000_000.0);
        assert!(consumed > 0.0 && consumed < 300_000.0);
    }

    #[test]
    fn test_wasm_mass_post_burn() {
        let pre = 300_000.0;
        let post = mass_post_burn(pre, 1000.0, 1_000_000.0);
        assert!(post > 0.0 && post < pre);
        // Consistency: post = pre - consumed
        let consumed = mass_propellant_consumed(pre, 1000.0, 1_000_000.0);
        assert!((post - (pre - consumed)).abs() < 1e-6);
    }
}
