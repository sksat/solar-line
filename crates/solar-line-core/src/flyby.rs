/// Patched-conic gravity assist model for SOLAR LINE 考察.
///
/// Implements a multi-body flyby model by switching between heliocentric
/// and planetocentric frames at the sphere of influence (SOI) boundary.
///
/// # Approach
///
/// 1. Propagate heliocentric trajectory until spacecraft enters planet SOI
/// 2. Transform to planetocentric frame
/// 3. Compute hyperbolic flyby (analytic or propagated)
/// 4. Transform back to heliocentric frame at SOI exit
/// 5. Continue heliocentric propagation
///
/// This is the standard patched-conic approximation used in mission design.

use crate::units::{Km, KmPerSec, Mu};

/// Sphere of influence radius (km) using Hill's approximation.
///
/// r_SOI = a_planet * (m_planet / m_sun)^(2/5)
///
/// where a_planet is the semi-major axis of the planet's orbit.
pub fn soi_radius(planet_orbit_radius: Km, mu_planet: Mu, mu_sun: Mu) -> Km {
    let a = planet_orbit_radius.value();
    let ratio = mu_planet.value() / mu_sun.value();
    Km(a * ratio.powf(0.4))
}

/// Hyperbolic flyby geometry.
///
/// Given the approach conditions (v_infinity vector and periapsis distance),
/// computes the flyby turn angle, periapsis velocity, and exit v_infinity vector.
#[derive(Debug, Clone, Copy)]
pub struct FlybyResult {
    /// Turn angle (radians) — the angle between incoming and outgoing v_infinity vectors
    pub turn_angle_rad: f64,
    /// Speed at periapsis (km/s)
    pub v_periapsis: f64,
    /// Outgoing v_infinity magnitude (km/s)
    pub v_inf_out: f64,
    /// Outgoing v_infinity direction (unit vector in planetocentric frame)
    pub v_inf_out_dir: [f64; 3],
}

/// Compute an unpowered (gravity-only) hyperbolic flyby.
///
/// The incoming v_infinity is rotated by the turn angle in the plane defined
/// by the v_infinity vector and the periapsis direction.
///
/// # Arguments
/// * `mu_planet` — Planet gravitational parameter (km³/s²)
/// * `v_inf_in` — Incoming v_infinity vector in planetocentric frame [km/s; 3]
/// * `r_periapsis` — Closest approach distance from planet center (km)
/// * `flyby_plane_normal` — Normal to the flyby plane (unit vector). The turn
///   is applied in the plane perpendicular to this normal. For a 2D (ecliptic)
///   flyby, use [0, 0, 1].
pub fn unpowered_flyby(
    mu_planet: Mu,
    v_inf_in: [f64; 3],
    r_periapsis: Km,
    flyby_plane_normal: [f64; 3],
) -> FlybyResult {
    let mu = mu_planet.value();
    let r_p = r_periapsis.value();

    // v_inf magnitude
    let v_inf = (v_inf_in[0].powi(2) + v_inf_in[1].powi(2) + v_inf_in[2].powi(2)).sqrt();

    // Semi-major axis of hyperbola (negative for hyperbolic)
    let a = -mu / (v_inf * v_inf);

    // Eccentricity
    let e = 1.0 - r_p / a;

    // Turn angle: δ = 2 * arcsin(1/e)
    let turn_angle = 2.0 * (1.0 / e).asin();

    // Speed at periapsis
    let v_peri = (v_inf * v_inf + 2.0 * mu / r_p).sqrt();

    // Rotate incoming v_inf by turn_angle around the flyby plane normal
    // Using Rodrigues' rotation formula
    let v_inf_out_dir = rodrigues_rotate(v_inf_in, flyby_plane_normal, turn_angle);
    let v_inf_out_mag = v_inf; // conserved for unpowered flyby

    // Normalize the direction
    let norm = (v_inf_out_dir[0].powi(2) + v_inf_out_dir[1].powi(2) + v_inf_out_dir[2].powi(2))
        .sqrt();

    FlybyResult {
        turn_angle_rad: turn_angle,
        v_periapsis: v_peri,
        v_inf_out: v_inf_out_mag,
        v_inf_out_dir: [
            v_inf_out_dir[0] / norm,
            v_inf_out_dir[1] / norm,
            v_inf_out_dir[2] / norm,
        ],
    }
}

/// Compute a powered flyby (burn at periapsis — Oberth effect).
///
/// Same as unpowered flyby but with an added prograde burn at periapsis.
/// The burn increases the periapsis speed, changing both the exit v_inf
/// magnitude and the turn angle.
pub fn powered_flyby(
    mu_planet: Mu,
    v_inf_in: [f64; 3],
    r_periapsis: Km,
    burn_dv: KmPerSec,
    flyby_plane_normal: [f64; 3],
) -> FlybyResult {
    let mu = mu_planet.value();
    let r_p = r_periapsis.value();
    let dv = burn_dv.value();

    let v_inf_mag =
        (v_inf_in[0].powi(2) + v_inf_in[1].powi(2) + v_inf_in[2].powi(2)).sqrt();

    // Semi-major axis (incoming hyperbola)
    let a_in = -mu / (v_inf_mag * v_inf_mag);
    let e_in = 1.0 - r_p / a_in;

    // Incoming turn half-angle
    let half_turn_in = (1.0 / e_in).asin();

    // Periapsis speed (incoming)
    let v_peri_in = (v_inf_mag * v_inf_mag + 2.0 * mu / r_p).sqrt();

    // Periapsis speed after prograde burn
    let v_peri_out = v_peri_in + dv;

    // Exit v_inf
    let v_inf_out_sq = v_peri_out * v_peri_out - 2.0 * mu / r_p;
    let v_inf_out = if v_inf_out_sq > 0.0 {
        v_inf_out_sq.sqrt()
    } else {
        0.0 // Captured — burn was too small to escape
    };

    // Outgoing hyperbola eccentricity and half-turn
    let a_out = if v_inf_out > 1e-10 {
        -mu / (v_inf_out * v_inf_out)
    } else {
        -1e20 // Effectively circular capture
    };
    let e_out = 1.0 - r_p / a_out;
    let half_turn_out = if e_out > 1.0 {
        (1.0 / e_out).asin()
    } else {
        std::f64::consts::FRAC_PI_2
    };

    // Total turn angle: sum of incoming and outgoing half-turns
    let turn_angle = half_turn_in + half_turn_out;

    // Rotate incoming v_inf direction by total turn angle
    let v_inf_out_dir = rodrigues_rotate(v_inf_in, flyby_plane_normal, turn_angle);
    let norm = (v_inf_out_dir[0].powi(2) + v_inf_out_dir[1].powi(2) + v_inf_out_dir[2].powi(2))
        .sqrt();

    FlybyResult {
        turn_angle_rad: turn_angle,
        v_periapsis: v_peri_out,
        v_inf_out,
        v_inf_out_dir: [
            v_inf_out_dir[0] / norm,
            v_inf_out_dir[1] / norm,
            v_inf_out_dir[2] / norm,
        ],
    }
}

/// Rodrigues' rotation formula: rotate vector v around unit axis k by angle θ.
fn rodrigues_rotate(v: [f64; 3], k: [f64; 3], theta: f64) -> [f64; 3] {
    let cos_t = theta.cos();
    let sin_t = theta.sin();

    // k dot v
    let k_dot_v = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];

    // k cross v
    let k_cross_v = [
        k[1] * v[2] - k[2] * v[1],
        k[2] * v[0] - k[0] * v[2],
        k[0] * v[1] - k[1] * v[0],
    ];

    [
        v[0] * cos_t + k_cross_v[0] * sin_t + k[0] * k_dot_v * (1.0 - cos_t),
        v[1] * cos_t + k_cross_v[1] * sin_t + k[1] * k_dot_v * (1.0 - cos_t),
        v[2] * cos_t + k_cross_v[2] * sin_t + k[2] * k_dot_v * (1.0 - cos_t),
    ]
}

/// Heliocentric velocity of the outgoing spacecraft after a flyby.
///
/// v_helio_out = v_planet + v_inf_out
///
/// where v_inf_out = |v_inf_out| * v_inf_out_dir from the flyby result.
pub fn heliocentric_exit_velocity(
    planet_velocity: [f64; 3],
    flyby: &FlybyResult,
) -> [f64; 3] {
    [
        planet_velocity[0] + flyby.v_inf_out * flyby.v_inf_out_dir[0],
        planet_velocity[1] + flyby.v_inf_out * flyby.v_inf_out_dir[1],
        planet_velocity[2] + flyby.v_inf_out * flyby.v_inf_out_dir[2],
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::{mu, orbit_radius};

    #[test]
    fn test_soi_radius_jupiter() {
        // Jupiter SOI ≈ 48.2 million km (well-known value)
        let r_soi = soi_radius(orbit_radius::JUPITER, mu::JUPITER, mu::SUN);
        let expected_million_km = 48.2;
        let actual_million_km = r_soi.value() / 1e6;
        assert!(
            (actual_million_km - expected_million_km).abs() < 2.0,
            "Jupiter SOI: {:.1} Mkm (expected ~{:.1} Mkm)",
            actual_million_km,
            expected_million_km
        );
    }

    #[test]
    fn test_soi_radius_earth() {
        // Earth SOI ≈ 0.929 million km (well-known value)
        let r_soi = soi_radius(orbit_radius::EARTH, mu::EARTH, mu::SUN);
        let expected_million_km = 0.929;
        let actual_million_km = r_soi.value() / 1e6;
        assert!(
            (actual_million_km - expected_million_km).abs() < 0.05,
            "Earth SOI: {:.3} Mkm (expected ~{:.3} Mkm)",
            actual_million_km,
            expected_million_km
        );
    }

    #[test]
    fn test_unpowered_flyby_conserves_vinf() {
        // Unpowered flyby should conserve |v_inf|
        let v_inf_in = [10.0, 0.0, 0.0]; // 10 km/s approach
        let r_peri = Km(200_000.0); // 200,000 km periapsis (above Jupiter surface)
        let normal = [0.0, 0.0, 1.0]; // ecliptic flyby

        let result = unpowered_flyby(mu::JUPITER, v_inf_in, r_peri, normal);

        // v_inf should be conserved
        let v_inf_in_mag = 10.0;
        assert!(
            (result.v_inf_out - v_inf_in_mag).abs() < 1e-10,
            "Unpowered flyby should conserve v_inf: {:.6} vs {:.6}",
            result.v_inf_out,
            v_inf_in_mag
        );

        // Turn angle should be positive
        assert!(result.turn_angle_rad > 0.0);
        assert!(result.turn_angle_rad < std::f64::consts::PI);
    }

    #[test]
    fn test_unpowered_flyby_turn_angle() {
        // Closer periapsis → larger turn angle
        let v_inf_in = [5.0, 0.0, 0.0];
        let normal = [0.0, 0.0, 1.0];

        let result_far = unpowered_flyby(mu::JUPITER, v_inf_in, Km(500_000.0), normal);
        let result_close = unpowered_flyby(mu::JUPITER, v_inf_in, Km(100_000.0), normal);

        assert!(
            result_close.turn_angle_rad > result_far.turn_angle_rad,
            "Closer periapsis should give larger turn: {:.4} vs {:.4} rad",
            result_close.turn_angle_rad,
            result_far.turn_angle_rad
        );
    }

    #[test]
    fn test_powered_flyby_oberth_effect() {
        // Powered flyby with Oberth effect: a burn at deep periapsis should yield
        // a v_inf gain larger than the burn dv itself (Oberth amplification).
        let v_inf_in = [10.0, 0.0, 0.0];
        let r_peri = Km(200_000.0); // Deep in Jupiter's gravity well
        let burn_dv = KmPerSec(1.0); // 1 km/s prograde burn at periapsis
        let normal = [0.0, 0.0, 1.0];

        let result = powered_flyby(mu::JUPITER, v_inf_in, r_peri, burn_dv, normal);

        // Exit v_inf should be > input v_inf (energy added by burn)
        assert!(
            result.v_inf_out > 10.0,
            "Powered flyby should increase v_inf: {:.4} km/s",
            result.v_inf_out
        );

        // Oberth amplification: the v_inf gain (v_inf_out - v_inf_in) should exceed
        // the raw burn_dv because the burn was performed deep in the gravity well.
        let v_inf_gain = result.v_inf_out - 10.0;
        assert!(
            v_inf_gain > 1.0,
            "Oberth should amplify: v_inf gain = {:.4} km/s (burn was 1.0 km/s)",
            v_inf_gain
        );
    }

    #[test]
    fn test_ep05_jupiter_flyby_scenario() {
        // EP05: Kestrel approaches Jupiter at ~1500 km/s (v_inf)
        // Performs powered flyby for ~3% efficiency gain
        let v_inf_in = [1500.0, 0.0, 0.0]; // 1500 km/s approach
        let r_peri = Km(100_000.0); // Close flyby (Jupiter radius ~71,492 km)
        let normal = [0.0, 0.0, 1.0];

        // Unpowered first
        let unpowered = unpowered_flyby(mu::JUPITER, v_inf_in, r_peri, normal);

        // At 1500 km/s, Jupiter gravity barely bends the trajectory
        // Turn angle should be very small
        assert!(
            unpowered.turn_angle_rad < 0.01, // < 0.6 degrees
            "At 1500 km/s, Jupiter turn should be tiny: {:.4} rad ({:.2}°)",
            unpowered.turn_angle_rad,
            unpowered.turn_angle_rad.to_degrees()
        );

        // Powered flyby with modest burn
        let burn_dv = KmPerSec(10.0); // 10 km/s burn at periapsis
        let powered = powered_flyby(mu::JUPITER, v_inf_in, r_peri, burn_dv, normal);

        // Should gain more than 10 km/s in exit v_inf (Oberth amplification)
        let oberth_gain = powered.v_inf_out - 1500.0;
        assert!(
            oberth_gain > 10.0,
            "Powered flyby should amplify the burn: exit gain = {:.2} km/s (burn was 10 km/s)",
            oberth_gain
        );
    }

    #[test]
    fn test_rodrigues_rotation_90_degrees() {
        // Rotate [1,0,0] by 90° around Z axis → [0,1,0]
        let v = [1.0, 0.0, 0.0];
        let k = [0.0, 0.0, 1.0];
        let result = rodrigues_rotate(v, k, std::f64::consts::FRAC_PI_2);

        assert!((result[0] - 0.0).abs() < 1e-10);
        assert!((result[1] - 1.0).abs() < 1e-10);
        assert!((result[2] - 0.0).abs() < 1e-10);
    }

    #[test]
    fn test_heliocentric_exit_velocity() {
        let planet_vel = [0.0, 13.07, 0.0]; // Jupiter orbital velocity ~13.07 km/s
        let flyby = FlybyResult {
            turn_angle_rad: 0.5,
            v_periapsis: 15.0,
            v_inf_out: 10.0,
            v_inf_out_dir: [0.877, 0.479, 0.0], // Turned by ~29°
        };

        let v_helio = heliocentric_exit_velocity(planet_vel, &flyby);

        // Should be planet_vel + v_inf_out * dir
        let expected_x = 0.0 + 10.0 * 0.877;
        let expected_y = 13.07 + 10.0 * 0.479;
        assert!((v_helio[0] - expected_x).abs() < 0.01);
        assert!((v_helio[1] - expected_y).abs() < 0.01);
    }
}
