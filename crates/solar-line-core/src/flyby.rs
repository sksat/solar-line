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
    let norm =
        (v_inf_out_dir[0].powi(2) + v_inf_out_dir[1].powi(2) + v_inf_out_dir[2].powi(2)).sqrt();

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

    let v_inf_mag = (v_inf_in[0].powi(2) + v_inf_in[1].powi(2) + v_inf_in[2].powi(2)).sqrt();

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
    let norm =
        (v_inf_out_dir[0].powi(2) + v_inf_out_dir[1].powi(2) + v_inf_out_dir[2].powi(2)).sqrt();

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
pub fn heliocentric_exit_velocity(planet_velocity: [f64; 3], flyby: &FlybyResult) -> [f64; 3] {
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

    // ===== Oracle tests: cross-validation against published mission data =====

    #[test]
    fn oracle_soi_radius_saturn() {
        // Saturn SOI ≈ 54.5 million km (well-known reference value)
        let r_soi = soi_radius(orbit_radius::SATURN, mu::SATURN, mu::SUN);
        let actual_mkm = r_soi.value() / 1e6;
        // Our Hill-approximation formula gives ~54.81 Mkm
        assert!(
            (actual_mkm - 54.5).abs() < 1.5,
            "Saturn SOI: {:.2} Mkm (expected ~54.5 Mkm)",
            actual_mkm
        );
    }

    #[test]
    fn oracle_soi_radius_uranus() {
        // Uranus SOI ≈ 51.8 million km (well-known reference value)
        let r_soi = soi_radius(orbit_radius::URANUS, mu::URANUS, mu::SUN);
        let actual_mkm = r_soi.value() / 1e6;
        assert!(
            (actual_mkm - 51.8).abs() < 1.5,
            "Uranus SOI: {:.2} Mkm (expected ~51.8 Mkm)",
            actual_mkm
        );
    }

    #[test]
    fn oracle_voyager1_jupiter_flyby() {
        // Voyager 1 Jupiter flyby (March 5, 1979)
        // Source: NASA PDS — closest approach 348,890 km from center
        // v_inf ≈ 10.48 km/s (commonly cited in orbital mechanics textbooks)
        //
        // Expected (analytic): turn angle ≈ 100.3°, v_periapsis ≈ 28.91 km/s
        let v_inf_in = [10.48, 0.0, 0.0];
        let r_peri = Km(348_890.0);
        let normal = [0.0, 0.0, 1.0];

        let result = unpowered_flyby(mu::JUPITER, v_inf_in, r_peri, normal);

        // Turn angle ≈ 100.3° (1.751 rad) — large deflection from deep gravity well
        let turn_deg = result.turn_angle_rad.to_degrees();
        assert!(
            (turn_deg - 100.3).abs() < 1.0,
            "Voyager 1 Jupiter turn angle: {:.2}° (expected ~100.3°)",
            turn_deg
        );

        // v_inf conserved (unpowered)
        assert!(
            (result.v_inf_out - 10.48).abs() < 1e-10,
            "v_inf should be conserved: {:.6}",
            result.v_inf_out
        );

        // Periapsis speed ≈ 28.91 km/s
        assert!(
            (result.v_periapsis - 28.91).abs() < 0.5,
            "Voyager 1 v_periapsis: {:.2} km/s (expected ~28.91)",
            result.v_periapsis
        );
    }

    #[test]
    fn oracle_voyager1_saturn_flyby_textbook() {
        // Well-known textbook problem (Brainly/Chegg):
        // Voyager 1 Saturn flyby with r_p = 124,000 km, v_inf = 7.51 km/s
        // μ_Saturn = 3.793e7 km³/s²
        //
        // Expected (analytic): e ≈ 1.184, turn angle ≈ 115.2°, v_peri ≈ 25.85 km/s
        let v_inf_in = [7.51, 0.0, 0.0];
        let r_peri = Km(124_000.0);
        let normal = [0.0, 0.0, 1.0];

        let result = unpowered_flyby(mu::SATURN, v_inf_in, r_peri, normal);

        // Turn angle ≈ 115.2° — very strong deflection
        let turn_deg = result.turn_angle_rad.to_degrees();
        assert!(
            (turn_deg - 115.2).abs() < 1.0,
            "Voyager 1 Saturn turn angle: {:.2}° (expected ~115.2°)",
            turn_deg
        );

        // Periapsis speed ≈ 25.85 km/s
        assert!(
            (result.v_periapsis - 25.85).abs() < 0.5,
            "Voyager 1 Saturn v_periapsis: {:.2} km/s (expected ~25.85)",
            result.v_periapsis
        );

        // v_inf conserved
        assert!(
            (result.v_inf_out - 7.51).abs() < 1e-10,
            "v_inf conserved: {:.6}",
            result.v_inf_out
        );
    }

    #[test]
    fn oracle_voyager2_uranus_flyby() {
        // Voyager 2 Uranus flyby (January 24, 1986)
        // Source: NASA PDS — closest approach 107,000 km from center
        // v_inf ≈ 5.4 km/s (approximate from trajectory data)
        //
        // Expected (analytic): turn angle ≈ 81.1°, v_peri ≈ 11.72 km/s
        let v_inf_in = [5.4, 0.0, 0.0];
        let r_peri = Km(107_000.0);
        let normal = [0.0, 0.0, 1.0];

        let result = unpowered_flyby(mu::URANUS, v_inf_in, r_peri, normal);

        // Turn angle ≈ 81.1°
        let turn_deg = result.turn_angle_rad.to_degrees();
        assert!(
            (turn_deg - 81.1).abs() < 2.0,
            "Voyager 2 Uranus turn angle: {:.2}° (expected ~81.1°)",
            turn_deg
        );

        // Periapsis speed ≈ 11.72 km/s
        assert!(
            (result.v_periapsis - 11.72).abs() < 0.5,
            "Voyager 2 Uranus v_periapsis: {:.2} km/s (expected ~11.72)",
            result.v_periapsis
        );
    }

    // ===== Edge case tests =====

    #[test]
    fn edge_powered_flyby_zero_dv_equals_unpowered() {
        // A powered flyby with zero burn should produce identical results
        // to an unpowered flyby.
        let v_inf_in = [8.0, 3.0, 0.0];
        let r_peri = Km(200_000.0);
        let normal = [0.0, 0.0, 1.0];

        let unpowered = unpowered_flyby(mu::JUPITER, v_inf_in, r_peri, normal);
        let powered = powered_flyby(mu::JUPITER, v_inf_in, r_peri, KmPerSec(0.0), normal);

        assert!(
            (powered.v_inf_out - unpowered.v_inf_out).abs() < 1e-10,
            "Zero-burn powered should match unpowered v_inf: {:.6} vs {:.6}",
            powered.v_inf_out,
            unpowered.v_inf_out
        );
        assert!(
            (powered.turn_angle_rad - unpowered.turn_angle_rad).abs() < 1e-10,
            "Zero-burn powered should match unpowered turn: {:.6} vs {:.6}",
            powered.turn_angle_rad,
            unpowered.turn_angle_rad
        );
        assert!(
            (powered.v_periapsis - unpowered.v_periapsis).abs() < 1e-10,
            "Zero-burn powered should match unpowered v_peri: {:.6} vs {:.6}",
            powered.v_periapsis,
            unpowered.v_periapsis
        );
    }

    #[test]
    fn edge_near_capture_powered_flyby() {
        // A burn at periapsis that is too small to escape → v_inf_out = 0 (capture)
        // Use a slow approach with a retrograde burn (negative effective dv scenario:
        // approach slowly, burn doesn't add enough to escape)
        //
        // v_inf = 1 km/s approach to Jupiter at r_p = 200,000 km
        // v_peri_in = sqrt(1 + 2*mu/r_p) = sqrt(1 + 1266.87) ≈ 35.6 km/s
        // Escape speed at r_p = sqrt(2*mu/r_p) ≈ 35.58 km/s
        // v_peri_in = 35.59 km/s (just barely hyperbolic)
        //
        // A "burn" of 0 km/s gives v_inf_out = v_inf_in = 1 (escapes)
        // We can't easily create a capture scenario with prograde burns
        // (they always add energy). Instead, test that near-escape condition
        // produces a small but positive v_inf_out.
        let v_inf_in = [0.1, 0.0, 0.0]; // Very slow approach (0.1 km/s)
        let r_peri = Km(200_000.0);
        let normal = [0.0, 0.0, 1.0];
        let burn_dv = KmPerSec(0.0); // No burn

        let result = powered_flyby(mu::JUPITER, v_inf_in, r_peri, burn_dv, normal);

        // Should still escape with v_inf_out = 0.1 km/s (same as input)
        assert!(
            (result.v_inf_out - 0.1).abs() < 1e-8,
            "Near-escape v_inf_out: {:.8} (expected 0.1)",
            result.v_inf_out
        );

        // Turn angle should be close to π (nearly captured = strong deflection)
        assert!(
            result.turn_angle_rad > 2.5, // > 143°
            "Near-capture should produce large turn angle: {:.4} rad ({:.1}°)",
            result.turn_angle_rad,
            result.turn_angle_rad.to_degrees()
        );
    }

    #[test]
    fn edge_retrograde_flyby_plane() {
        // Flyby in the opposite plane (normal = [0,0,-1]) should produce
        // the same turn angle magnitude but mirror the exit direction.
        let v_inf_in = [10.0, 0.0, 0.0];
        let r_peri = Km(200_000.0);

        let prograde = unpowered_flyby(mu::JUPITER, v_inf_in, r_peri, [0.0, 0.0, 1.0]);
        let retrograde = unpowered_flyby(mu::JUPITER, v_inf_in, r_peri, [0.0, 0.0, -1.0]);

        // Same turn angle
        assert!(
            (prograde.turn_angle_rad - retrograde.turn_angle_rad).abs() < 1e-10,
            "Turn angle should be the same: {:.6} vs {:.6}",
            prograde.turn_angle_rad,
            retrograde.turn_angle_rad
        );

        // Same v_inf_out magnitude
        assert!(
            (prograde.v_inf_out - retrograde.v_inf_out).abs() < 1e-10,
            "v_inf magnitude should match: {:.6} vs {:.6}",
            prograde.v_inf_out,
            retrograde.v_inf_out
        );

        // Exit directions should be mirrored in Y (Z stays 0, X same)
        assert!(
            (prograde.v_inf_out_dir[0] - retrograde.v_inf_out_dir[0]).abs() < 1e-10,
            "X component should match"
        );
        assert!(
            (prograde.v_inf_out_dir[1] + retrograde.v_inf_out_dir[1]).abs() < 1e-10,
            "Y component should be mirrored: {:.6} vs {:.6}",
            prograde.v_inf_out_dir[1],
            retrograde.v_inf_out_dir[1]
        );
    }

    #[test]
    fn edge_rodrigues_rotation_360_identity() {
        // Rotating by 2π should return the original vector
        let v = [3.0, 4.0, 5.0];
        let k = [0.0, 0.0, 1.0];
        let result = rodrigues_rotate(v, k, 2.0 * std::f64::consts::PI);

        assert!(
            (result[0] - v[0]).abs() < 1e-10,
            "360° rotation X: {:.10} vs {:.10}",
            result[0],
            v[0]
        );
        assert!(
            (result[1] - v[1]).abs() < 1e-10,
            "360° rotation Y: {:.10} vs {:.10}",
            result[1],
            v[1]
        );
        assert!(
            (result[2] - v[2]).abs() < 1e-10,
            "360° rotation Z: {:.10} vs {:.10}",
            result[2],
            v[2]
        );
    }

    #[test]
    fn edge_rodrigues_rotation_180_degrees() {
        // Rotate [1,0,0] by 180° around Z axis → [-1,0,0]
        let v = [1.0, 0.0, 0.0];
        let k = [0.0, 0.0, 1.0];
        let result = rodrigues_rotate(v, k, std::f64::consts::PI);

        assert!(
            (result[0] - (-1.0)).abs() < 1e-10,
            "180° rotation X: {:.10}",
            result[0]
        );
        assert!(
            result[1].abs() < 1e-10,
            "180° rotation Y: {:.10}",
            result[1]
        );
    }

    #[test]
    fn edge_powered_flyby_large_burn_amplification() {
        // A large burn at deep periapsis should produce significant
        // Oberth amplification: ΔE = v_peri × Δv is maximized when
        // v_peri is large (deep in gravity well).
        //
        // Compare same burn at Jupiter (deep well) vs weaker planet
        let v_inf_in = [5.0, 0.0, 0.0];
        let r_peri = Km(100_000.0); // Close periapsis
        let burn = KmPerSec(2.0);
        let normal = [0.0, 0.0, 1.0];

        let jupiter = powered_flyby(mu::JUPITER, v_inf_in, r_peri, burn, normal);
        let saturn = powered_flyby(mu::SATURN, v_inf_in, r_peri, burn, normal);

        // Jupiter has deeper gravity well → higher v_peri → more Oberth gain
        let jupiter_gain = jupiter.v_inf_out - 5.0;
        let saturn_gain = saturn.v_inf_out - 5.0;

        assert!(
            jupiter_gain > saturn_gain,
            "Jupiter Oberth gain ({:.3} km/s) should exceed Saturn ({:.3} km/s)",
            jupiter_gain,
            saturn_gain
        );

        // Both should exceed the raw 2 km/s burn (Oberth amplification)
        assert!(
            jupiter_gain > 2.0,
            "Jupiter gain should exceed raw burn: {:.3} > 2.0",
            jupiter_gain
        );
    }

    #[test]
    fn edge_flyby_energy_conservation() {
        // For an unpowered flyby, the specific orbital energy must be conserved:
        // E = v_inf²/2 (which equals -μ/(2a), the vis-viva at infinity)
        let v_inf_in = [8.0, 3.0, 0.0];
        let v_inf_mag = (8.0_f64.powi(2) + 3.0_f64.powi(2)).sqrt();
        let r_peri = Km(300_000.0);
        let normal = [0.0, 0.0, 1.0];

        let result = unpowered_flyby(mu::JUPITER, v_inf_in, r_peri, normal);

        // Check energy conservation via v_inf conservation
        assert!(
            (result.v_inf_out - v_inf_mag).abs() < 1e-10,
            "Energy conservation: v_inf_out {:.10} should equal v_inf_in {:.10}",
            result.v_inf_out,
            v_inf_mag
        );

        // Check that exit direction is a unit vector
        let dir_mag = (result.v_inf_out_dir[0].powi(2)
            + result.v_inf_out_dir[1].powi(2)
            + result.v_inf_out_dir[2].powi(2))
        .sqrt();
        assert!(
            (dir_mag - 1.0).abs() < 1e-10,
            "Exit direction should be unit vector: |dir| = {:.10}",
            dir_mag
        );
    }

    #[test]
    fn edge_3d_approach_vector() {
        // Test with a non-planar approach vector to verify 3D geometry
        let v_inf_in = [5.0, 3.0, 2.0]; // 3D approach
        let v_inf_mag = (25.0 + 9.0 + 4.0_f64).sqrt(); // √38 ≈ 6.164
        let r_peri = Km(200_000.0);
        let normal = [0.0, 0.0, 1.0];

        let result = unpowered_flyby(mu::JUPITER, v_inf_in, r_peri, normal);

        // v_inf conserved
        assert!(
            (result.v_inf_out - v_inf_mag).abs() < 1e-8,
            "3D v_inf conserved: {:.6} vs {:.6}",
            result.v_inf_out,
            v_inf_mag
        );

        // Exit direction unit vector
        let dir_mag = (result.v_inf_out_dir[0].powi(2)
            + result.v_inf_out_dir[1].powi(2)
            + result.v_inf_out_dir[2].powi(2))
        .sqrt();
        assert!(
            (dir_mag - 1.0).abs() < 1e-10,
            "3D exit dir unit: {:.10}",
            dir_mag
        );

        // The rotation is around Z axis, so the Z component of v_inf_out_dir
        // should stay proportional to the original (Z component is along the
        // rotation axis, so k_dot_v * k is the parallel component)
        // For Z rotation: parallel component = v_z * [0,0,1] is preserved
        let expected_z = v_inf_in[2] / v_inf_mag; // Original z direction
        assert!(
            (result.v_inf_out_dir[2] - expected_z).abs() < 1e-10,
            "Z component preserved under Z-axis rotation: {:.6} vs {:.6}",
            result.v_inf_out_dir[2],
            expected_z
        );
    }
}
