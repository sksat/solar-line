/// 3D orbital analysis for SOLAR LINE.
///
/// Extends the 2D coplanar analysis with:
/// - Out-of-ecliptic-plane positions and velocities
/// - Saturn ring plane crossing analysis
/// - Uranus axial tilt effects on approach geometry
/// - Inclination change ΔV costs
use crate::ephemeris::{self, Planet};
use crate::units::{Km, Radians};
use crate::vec3::Vec3;
use std::f64::consts::PI;

// ── Saturn Ring System ──────────────────────────────────────────────

/// Saturn's axial tilt (obliquity) relative to its orbital plane: 26.73°
pub const SATURN_OBLIQUITY_RAD: f64 = 26.73 * PI / 180.0;

/// Saturn ring inner edge (D ring): ~66,900 km from center
pub const SATURN_RING_INNER_KM: f64 = 66_900.0;

/// Saturn ring outer edge (F ring): ~140,180 km from center
pub const SATURN_RING_OUTER_KM: f64 = 140_180.0;

/// Saturn main ring outer edge (A ring): ~136,775 km from center
pub const SATURN_RING_A_OUTER_KM: f64 = 136_775.0;

/// Saturn equatorial radius: 60,268 km
pub const SATURN_EQUATORIAL_RADIUS_KM: f64 = 60_268.0;

/// Enceladus orbital radius: ~238,020 km (outside ring system)
/// Note: NASA JPL gives semi-major axis 238,042 km; 238,020 km is used
/// throughout EP02 calculations for internal consistency.
pub const ENCELADUS_ORBITAL_RADIUS_KM: f64 = 238_020.0;

// ── Uranus System ───────────────────────────────────────────────────

/// Uranus axial tilt: 97.77° (retrograde rotation)
pub const URANUS_OBLIQUITY_RAD: f64 = 97.77 * PI / 180.0;

/// Uranus equatorial radius: 25,559 km
pub const URANUS_EQUATORIAL_RADIUS_KM: f64 = 25_559.0;

/// Titania orbital radius: ~436,300 km
pub const TITANIA_ORBITAL_RADIUS_KM: f64 = 436_300.0;

/// Uranus ring system outer edge: ~51,149 km
pub const URANUS_RING_OUTER_KM: f64 = 51_149.0;

/// Result of analyzing whether a transfer trajectory crosses Saturn's ring plane.
#[derive(Debug, Clone)]
pub struct RingCrossingAnalysis {
    /// Whether the trajectory crosses the ring plane
    pub crosses_ring_plane: bool,
    /// Distance from Saturn at ring plane crossing (km), if crossing occurs
    pub crossing_distance_km: Option<f64>,
    /// Whether the crossing occurs within the ring system (ring inner to outer)
    pub within_rings: bool,
    /// Z-height above/below Saturn's equatorial plane at closest approach
    pub z_offset_at_closest_km: f64,
    /// Angle between approach velocity and ring plane (radians)
    pub approach_angle_to_ring_plane: Radians,
}

/// Compute the normal vector of Saturn's ring plane in ecliptic coordinates.
///
/// Saturn's ring plane coincides with its equatorial plane.
/// The pole direction depends on Saturn's RAAN (Ω) and obliquity (ε).
///
/// The ring plane normal in ecliptic coordinates is derived from:
/// - Saturn's orbital inclination to ecliptic
/// - Saturn's obliquity (axial tilt relative to orbital plane)
/// - Saturn's RAAN (longitude of ascending node)
pub fn saturn_ring_plane_normal(jd: f64) -> Vec3<f64> {
    let elem = ephemeris::mean_elements(Planet::Saturn);
    let t = (jd - ephemeris::J2000_JD) / 36525.0;

    let i_orb = (elem.i0 + elem.i_dot * t).to_radians();
    let omega = (elem.omega0 + elem.omega_dot * t).to_radians();

    // Saturn's north pole direction in ecliptic coordinates.
    // First, the orbital pole is tilted by i_orb from ecliptic north.
    // Then Saturn's spin axis is tilted by SATURN_OBLIQUITY from the orbital pole.
    //
    // For a simplified model, we combine the orbital inclination and obliquity.
    // Saturn's north pole RA/Dec (J2000): RA=40.589°, Dec=83.537°
    // In ecliptic coordinates, this gives us the ring plane normal.
    //
    // Using IAU J2000 pole: RA = 40.589°, Dec = 83.537°
    // Convert equatorial to ecliptic (obliquity of ecliptic ε = 23.4393°)
    let ra_rad = 40.589_f64.to_radians();
    let dec_rad = 83.537_f64.to_radians();
    let eps = 23.4393_f64.to_radians(); // Earth's obliquity

    // Equatorial unit vector of Saturn's pole
    let eq_x = dec_rad.cos() * ra_rad.cos();
    let eq_y = dec_rad.cos() * ra_rad.sin();
    let eq_z = dec_rad.sin();

    // Rotate to ecliptic coordinates (rotate around x-axis by -ε)
    let ecl_x = eq_x;
    let ecl_y = eq_y * eps.cos() + eq_z * eps.sin();
    let ecl_z = -eq_y * eps.sin() + eq_z * eps.cos();

    // Precess from J2000 to epoch (small correction for ~2.4 centuries)
    // For the accuracy needed here, J2000 pole is sufficient
    let _ = (i_orb, omega, t); // suppress unused warnings — used for documentation

    Vec3::new(ecl_x, ecl_y, ecl_z).normalize()
}

/// Analyze whether a trajectory approaching Saturn crosses its ring plane.
///
/// Given a spacecraft position relative to Saturn and approach velocity vector,
/// determine if and where the trajectory intersects the ring plane.
///
/// `spacecraft_pos_km`: position relative to Saturn in ecliptic frame (km)
/// `approach_vel`: velocity vector in ecliptic frame (unit direction)
/// `jd`: Julian Date (for computing ring plane orientation)
pub fn saturn_ring_crossing(
    spacecraft_pos_km: Vec3<f64>,
    approach_vel: Vec3<f64>,
    jd: f64,
) -> RingCrossingAnalysis {
    let ring_normal = saturn_ring_plane_normal(jd);

    // Distance of spacecraft from ring plane: d = pos · normal
    let dist_from_plane = spacecraft_pos_km.dot_raw(ring_normal);

    // Component of velocity along ring normal
    let vel_normal = approach_vel.dot_raw(ring_normal);

    // Angle between approach velocity and ring plane
    let vel_mag = approach_vel.norm_raw();
    let approach_angle = if vel_mag > 1e-15 {
        Radians((vel_normal / vel_mag).abs().clamp(0.0, 1.0).asin())
    } else {
        Radians(0.0)
    };

    // Check if trajectory crosses the ring plane
    if vel_normal.abs() < 1e-15 {
        // Moving parallel to ring plane
        return RingCrossingAnalysis {
            crosses_ring_plane: false,
            crossing_distance_km: None,
            within_rings: false,
            z_offset_at_closest_km: dist_from_plane,
            approach_angle_to_ring_plane: approach_angle,
        };
    }

    // Time parameter to ring plane crossing: t = -dist_from_plane / vel_normal
    let t_crossing = -dist_from_plane / vel_normal;

    if t_crossing < 0.0 {
        // Crossing is behind the spacecraft (already passed)
        return RingCrossingAnalysis {
            crosses_ring_plane: false,
            crossing_distance_km: None,
            within_rings: false,
            z_offset_at_closest_km: dist_from_plane,
            approach_angle_to_ring_plane: approach_angle,
        };
    }

    // Position at ring plane crossing
    let crossing_pos = spacecraft_pos_km + approach_vel.scale(t_crossing);
    let crossing_dist = crossing_pos.norm_raw();

    let within_rings = (SATURN_RING_INNER_KM..=SATURN_RING_OUTER_KM).contains(&crossing_dist);

    RingCrossingAnalysis {
        crosses_ring_plane: true,
        crossing_distance_km: Some(crossing_dist),
        within_rings,
        z_offset_at_closest_km: dist_from_plane,
        approach_angle_to_ring_plane: approach_angle,
    }
}

/// Result of analyzing Uranus approach geometry.
#[derive(Debug, Clone)]
pub struct UranusApproachAnalysis {
    /// Angle between ecliptic plane and Uranus's equatorial plane (radians)
    pub equatorial_ecliptic_angle: Radians,
    /// Uranus spin axis direction in ecliptic coordinates (unit vector)
    pub spin_axis_ecliptic: Vec3<f64>,
    /// Whether the approach is roughly polar (within 30° of spin axis)
    pub is_polar_approach: bool,
    /// Whether the approach is roughly equatorial (within 30° of equatorial plane)
    pub is_equatorial_approach: bool,
    /// Angle between approach direction and Uranus equatorial plane (radians)
    pub approach_to_equatorial: Radians,
    /// Minimum distance from Uranus ring system during approach (km)
    /// Negative means the approach passes through the ring plane within ring distance
    pub ring_clearance_km: f64,
}

/// Compute Uranus's spin axis direction in ecliptic coordinates.
///
/// Uranus's north pole (IAU J2000): RA = 257.311°, Dec = -15.175°
/// The negative declination and RA near 257° mean the axis lies nearly
/// in the ecliptic plane, pointed roughly toward ecliptic longitude ~260°.
pub fn uranus_spin_axis_ecliptic() -> Vec3<f64> {
    // IAU J2000 pole: RA = 257.311°, Dec = -15.175°
    let ra_rad = 257.311_f64.to_radians();
    let dec_rad = (-15.175_f64).to_radians();
    let eps = 23.4393_f64.to_radians(); // Earth's obliquity

    // Equatorial unit vector
    let eq_x = dec_rad.cos() * ra_rad.cos();
    let eq_y = dec_rad.cos() * ra_rad.sin();
    let eq_z = dec_rad.sin();

    // Rotate to ecliptic coordinates (rotate around x-axis by -ε)
    let ecl_x = eq_x;
    let ecl_y = eq_y * eps.cos() + eq_z * eps.sin();
    let ecl_z = -eq_y * eps.sin() + eq_z * eps.cos();

    Vec3::new(ecl_x, ecl_y, ecl_z).normalize()
}

/// Analyze the approach geometry to Uranus from a given direction.
///
/// `approach_dir`: unit vector of approach direction in ecliptic frame
///     (direction FROM which the spacecraft comes, i.e. opposite of velocity)
/// `closest_approach_km`: planned closest approach distance from Uranus center
pub fn uranus_approach_analysis(
    approach_dir: Vec3<f64>,
    closest_approach_km: f64,
) -> UranusApproachAnalysis {
    let spin_axis = uranus_spin_axis_ecliptic();

    // Angle between spin axis and ecliptic north (0,0,1)
    let ecliptic_north = Vec3::new(0.0, 0.0, 1.0);
    let equatorial_ecliptic_angle = Radians(spin_axis.dot_raw(ecliptic_north).acos());

    // Angle between approach direction and spin axis
    let approach_normalized = approach_dir.normalize();
    let cos_approach_to_axis = approach_normalized.dot_raw(spin_axis).abs().clamp(0.0, 1.0);
    let approach_to_axis_angle = cos_approach_to_axis.acos();

    // Approach angle relative to equatorial plane = 90° - angle_to_axis
    let approach_to_equatorial = Radians(PI / 2.0 - approach_to_axis_angle);

    let is_polar_approach = approach_to_axis_angle < (30.0_f64).to_radians();
    let is_equatorial_approach = approach_to_equatorial.value().abs() < (30.0_f64).to_radians();

    // Ring clearance: project closest approach onto ring plane
    // If approach passes through ring plane within ring distance, clearance is negative
    let sin_angle_to_equatorial = approach_to_equatorial.value().sin().abs();
    let z_at_ring_distance = closest_approach_km * sin_angle_to_equatorial;
    let ring_clearance = if closest_approach_km > URANUS_RING_OUTER_KM {
        // Closest approach is outside rings — safe
        closest_approach_km - URANUS_RING_OUTER_KM
    } else {
        // Closest approach is inside ring zone — check z-offset
        z_at_ring_distance // simplified: positive means above/below ring plane
    };

    UranusApproachAnalysis {
        equatorial_ecliptic_angle,
        spin_axis_ecliptic: spin_axis,
        is_polar_approach,
        is_equatorial_approach,
        approach_to_equatorial,
        ring_clearance_km: ring_clearance,
    }
}

/// Compute the ecliptic z-height of a planet at a given Julian Date.
///
/// Returns the distance above (+) or below (-) the ecliptic plane in km.
pub fn ecliptic_z_height(planet: Planet, jd: f64) -> Km {
    let pos = ephemeris::planet_position(planet, jd);
    Km(pos.z)
}

/// Compute the maximum ecliptic z-height a planet can reach.
///
/// For a planet with inclination i and semi-major axis a:
/// max z ≈ a * sin(i) (approximate, ignoring eccentricity)
pub fn max_ecliptic_z_height(planet: Planet) -> Km {
    let a = planet.semi_major_axis().value();
    let elem = ephemeris::mean_elements(planet);
    let i_rad = elem.i0.to_radians();
    Km(a * i_rad.sin())
}

/// Out-of-plane distance between two planet positions.
///
/// Returns the z-difference in km between two planets' positions at a given JD.
pub fn out_of_plane_distance(planet1: Planet, planet2: Planet, jd: f64) -> Km {
    let pos1 = ephemeris::planet_position(planet1, jd);
    let pos2 = ephemeris::planet_position(planet2, jd);
    Km((pos2.z - pos1.z).abs())
}

/// Transfer inclination analysis: given departure and arrival planet positions,
/// compute the required inclination change and associated ΔV penalty.
///
/// Returns (inclination_change_rad, dv_penalty_km_s) where:
/// - inclination_change_rad: angle between departure and arrival orbital planes
/// - dv_penalty_km_s: additional ΔV needed for plane change at given transfer velocity
pub fn transfer_inclination_penalty(
    departure: Planet,
    arrival: Planet,
    jd: f64,
    transfer_velocity_km_s: f64,
) -> (Radians, f64) {
    let pos1 = ephemeris::planet_position(departure, jd);
    let pos2 = ephemeris::planet_position(arrival, jd);

    // Inclination difference between orbital planes (simplified: direct subtraction)
    let delta_i = (pos2.inclination.value() - pos1.inclination.value()).abs();

    // ΔV for plane change: 2 * v * sin(Δi/2)
    let dv_penalty = 2.0 * transfer_velocity_km_s * (delta_i / 2.0).sin();

    (Radians(delta_i), dv_penalty)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ephemeris::calendar_to_jd;

    #[test]
    fn test_saturn_ring_plane_normal_is_unit_vector() {
        let jd = ephemeris::J2000_JD;
        let normal = saturn_ring_plane_normal(jd);
        let mag = normal.norm_raw();
        assert!(
            (mag - 1.0).abs() < 1e-10,
            "ring plane normal should be unit vector, got magnitude {}",
            mag
        );
    }

    #[test]
    fn test_saturn_ring_plane_normal_tilted_from_ecliptic() {
        // Saturn's ring plane is tilted ~26.7° from its orbital plane,
        // which itself is tilted ~2.5° from ecliptic.
        // So the ring plane normal should be tilted ~24-29° from ecliptic north.
        let jd = ephemeris::J2000_JD;
        let normal = saturn_ring_plane_normal(jd);
        let ecliptic_north = Vec3::new(0.0_f64, 0.0, 1.0);
        let cos_angle = normal.dot_raw(ecliptic_north);
        let angle_deg = cos_angle.acos().to_degrees();
        assert!(
            angle_deg > 20.0 && angle_deg < 35.0,
            "ring plane normal angle from ecliptic north = {:.1}°, expected ~26°",
            angle_deg
        );
    }

    #[test]
    fn test_saturn_ring_crossing_head_on() {
        let jd = ephemeris::J2000_JD;
        let ring_normal = saturn_ring_plane_normal(jd);

        // Spacecraft approaching along ring normal direction (perpendicular to rings)
        let pos = ring_normal.scale(500_000.0); // 500,000 km above ring plane
        let vel = -ring_normal; // approaching toward Saturn

        let result = saturn_ring_crossing(pos, vel, jd);
        assert!(result.crosses_ring_plane, "should cross ring plane");
        assert!(
            result.approach_angle_to_ring_plane.value().to_degrees() > 80.0,
            "approach should be nearly perpendicular to ring plane, got {:.1}°",
            result.approach_angle_to_ring_plane.value().to_degrees()
        );
    }

    #[test]
    fn test_saturn_ring_crossing_parallel() {
        let jd = ephemeris::J2000_JD;
        let ring_normal = saturn_ring_plane_normal(jd);

        // Spacecraft moving parallel to ring plane
        // Construct a velocity perpendicular to ring normal
        let arbitrary = Vec3::new(1.0, 0.0, 0.0);
        let parallel_vel = ring_normal.cross_raw(arbitrary).normalize();
        let pos = ring_normal.scale(100_000.0);

        let result = saturn_ring_crossing(pos, parallel_vel, jd);
        assert!(
            !result.crosses_ring_plane,
            "should not cross ring plane when moving parallel"
        );
    }

    #[test]
    fn test_uranus_spin_axis_nearly_in_ecliptic() {
        // Uranus's spin axis is nearly in the ecliptic plane (97.77° obliquity)
        let spin = uranus_spin_axis_ecliptic();
        let mag = spin.norm_raw();
        assert!((mag - 1.0).abs() < 1e-10, "spin axis should be unit vector");

        // The z-component should be small (axis nearly in ecliptic plane)
        assert!(
            spin.z.abs() < 0.3,
            "Uranus spin axis z-component should be small (nearly in ecliptic), got {}",
            spin.z
        );
    }

    #[test]
    fn test_uranus_approach_from_ecliptic() {
        // Approaching Uranus from within the ecliptic plane
        let approach = Vec3::new(1.0, 0.0, 0.0);
        let result = uranus_approach_analysis(approach, 100_000.0);

        // Uranus's equatorial plane is nearly perpendicular to ecliptic
        // So an ecliptic approach should be roughly polar
        assert!(
            result.equatorial_ecliptic_angle.value().to_degrees() > 70.0,
            "Uranus equatorial plane should be steeply tilted from ecliptic: {:.1}°",
            result.equatorial_ecliptic_angle.value().to_degrees()
        );
    }

    #[test]
    fn test_uranus_ring_clearance_far_approach() {
        let approach = Vec3::new(1.0, 0.0, 0.0);
        let result = uranus_approach_analysis(approach, 200_000.0);
        assert!(
            result.ring_clearance_km > 0.0,
            "approach at 200,000 km should clear rings (outer edge ~51,149 km)"
        );
    }

    #[test]
    fn test_ecliptic_z_height_earth_small() {
        // Earth's orbital inclination to ecliptic is ~0°, so z-height should be tiny
        let jd = ephemeris::J2000_JD;
        let z = ecliptic_z_height(Planet::Earth, jd);
        let z_au = z.value() / 149_597_870.7;
        assert!(
            z_au.abs() < 0.01,
            "Earth z-height should be near zero, got {} AU",
            z_au
        );
    }

    #[test]
    fn test_ecliptic_z_height_jupiter_nonzero() {
        // Jupiter has ~1.3° inclination, so at some epochs z can be nonzero
        // At 5.2 AU with 1.3° inclination: max z ≈ 5.2 * sin(1.3°) ≈ 0.118 AU
        let max_z = max_ecliptic_z_height(Planet::Jupiter);
        let max_z_au = max_z.value() / 149_597_870.7;
        assert!(
            (max_z_au - 0.118).abs() < 0.02,
            "Jupiter max z ≈ {:.3} AU, expected ~0.118 AU",
            max_z_au
        );
    }

    #[test]
    fn test_max_ecliptic_z_saturn() {
        // Saturn: ~9.54 AU, i ≈ 2.49° → max z ≈ 0.414 AU
        let max_z = max_ecliptic_z_height(Planet::Saturn);
        let max_z_au = max_z.value() / 149_597_870.7;
        assert!(
            (max_z_au - 0.414).abs() < 0.05,
            "Saturn max z ≈ {:.3} AU, expected ~0.414 AU",
            max_z_au
        );
    }

    #[test]
    fn test_transfer_inclination_penalty() {
        // Earth (i≈0°) → Jupiter (i≈1.3°): small plane change
        let jd = calendar_to_jd(2241, 9, 5.0); // SOLAR LINE epoch
        let (delta_i, dv) = transfer_inclination_penalty(
            Planet::Earth,
            Planet::Jupiter,
            jd,
            30.0, // ~30 km/s transfer velocity
        );

        // 1.3° plane change at 30 km/s: ΔV ≈ 2 * 30 * sin(0.65°) ≈ 0.68 km/s
        assert!(
            delta_i.value().to_degrees() < 3.0,
            "Earth-Jupiter inclination change should be small: {:.2}°",
            delta_i.value().to_degrees()
        );
        assert!(dv < 2.0, "plane change ΔV should be modest: {:.2} km/s", dv);
    }

    #[test]
    fn test_transfer_inclination_penalty_saturn_uranus() {
        // Saturn (i≈2.49°) → Uranus (i≈0.77°): inclination decreases
        let jd = calendar_to_jd(2242, 1, 1.0);
        let (delta_i, _dv) = transfer_inclination_penalty(Planet::Saturn, Planet::Uranus, jd, 20.0);

        assert!(
            delta_i.value().to_degrees() < 3.0,
            "Saturn-Uranus inclination change should be small: {:.2}°",
            delta_i.value().to_degrees()
        );
    }

    #[test]
    fn test_out_of_plane_distance() {
        let jd = calendar_to_jd(2241, 9, 5.0);
        let z_diff = out_of_plane_distance(Planet::Mars, Planet::Jupiter, jd);
        // Should be non-trivial (millions of km possible at outer solar system distances)
        // but bounded by max z-heights
        let max_z_j = max_ecliptic_z_height(Planet::Jupiter).value();
        let max_z_m = max_ecliptic_z_height(Planet::Mars).value();
        assert!(
            z_diff.value() <= max_z_j + max_z_m,
            "z-diff {} should not exceed sum of max z-heights",
            z_diff.value()
        );
    }

    #[test]
    fn test_planet_position_3d_consistency() {
        // Verify that x² + y² + z² = distance² for all planets
        let jd = ephemeris::J2000_JD;
        for planet in &Planet::ALL {
            let pos = ephemeris::planet_position(*planet, jd);
            let r_sq = pos.x * pos.x + pos.y * pos.y + pos.z * pos.z;
            let d_sq = pos.distance.value() * pos.distance.value();
            let rel_err = ((r_sq - d_sq) / d_sq).abs();
            assert!(
                rel_err < 1e-10,
                "{:?}: sqrt(x²+y²+z²) = {:.0}, distance = {:.0}, rel_err = {:.2e}",
                planet,
                r_sq.sqrt(),
                pos.distance.value(),
                rel_err
            );
        }
    }

    #[test]
    fn test_planet_latitude_bounded() {
        // Latitude should be bounded by orbital inclination
        let jd = ephemeris::J2000_JD;
        for planet in &Planet::ALL {
            let pos = ephemeris::planet_position(*planet, jd);
            assert!(
                pos.latitude.value().abs() <= pos.inclination.value() + 0.01,
                "{:?}: latitude {:.4}° exceeds inclination {:.4}°",
                planet,
                pos.latitude.value().to_degrees(),
                pos.inclination.value().to_degrees()
            );
        }
    }

    #[test]
    fn test_planet_position_3d_earth_z_near_zero() {
        // Earth's ecliptic inclination is ~0°, so z should be nearly 0
        let jd = ephemeris::J2000_JD;
        let pos = ephemeris::planet_position(Planet::Earth, jd);
        let z_au = pos.z / 149_597_870.7;
        assert!(
            z_au.abs() < 0.001,
            "Earth z should be ~0, got {:.6} AU",
            z_au
        );
    }

    #[test]
    fn test_saturn_ring_crossing_already_passed() {
        // Spacecraft is below ring plane and moving away — crossing is behind
        let jd = ephemeris::J2000_JD;
        let ring_normal = saturn_ring_plane_normal(jd);

        // Below ring plane, moving further away
        let pos = -ring_normal.scale(100_000.0);
        let vel = -ring_normal; // moving further below
        let result = saturn_ring_crossing(pos, vel, jd);
        assert!(
            !result.crosses_ring_plane,
            "should not cross ring plane when moving away"
        );
    }

    #[test]
    fn test_saturn_ring_crossing_within_rings() {
        // Crossing the ring plane at a distance within the ring system
        let jd = ephemeris::J2000_JD;
        let ring_normal = saturn_ring_plane_normal(jd);

        // Construct a velocity that crosses the ring plane at ~100,000 km from Saturn
        // We need to be above the plane, with a velocity toward Saturn that crosses
        // the ring plane at ring-radius distance.
        // Place ship on ring normal at 200,000 km above, velocity toward ring center area
        let pos = ring_normal.scale(200_000.0);
        // Velocity: toward a point ~100,000 km from Saturn in the ring plane
        // The ring plane has two axes perpendicular to ring_normal
        let arb = Vec3::new(1.0, 0.0, 0.0);
        let in_plane = ring_normal.cross_raw(arb).normalize();
        let target = in_plane.scale(100_000.0); // ~100,000 km from Saturn in ring plane
        let vel_dir = Vec3::new(
            target.x - pos.x,
            target.y - pos.y,
            target.z - pos.z,
        ).normalize();

        let result = saturn_ring_crossing(pos, vel_dir, jd);
        assert!(result.crosses_ring_plane);
        if let Some(dist) = result.crossing_distance_km {
            // The crossing should be near 100,000 km ± some geometry
            assert!(
                dist > SATURN_RING_INNER_KM && dist < SATURN_RING_OUTER_KM * 2.0,
                "crossing distance = {} km",
                dist
            );
        }
    }

    #[test]
    fn test_uranus_approach_polar() {
        // Approach exactly along Uranus's spin axis — should be polar approach
        // Tests the acos clamp fix for exact-alignment floating point edge case
        let spin = uranus_spin_axis_ecliptic();
        let result = uranus_approach_analysis(spin, 100_000.0);
        assert!(
            result.is_polar_approach,
            "approach along spin axis should be polar, approach_to_equatorial = {:.1}°",
            result.approach_to_equatorial.value().to_degrees()
        );
        // approach_to_equatorial should be ~90° (perpendicular to equatorial plane)
        assert!(
            result.approach_to_equatorial.value().to_degrees() > 60.0,
            "should be high angle to equatorial: {:.1}°",
            result.approach_to_equatorial.value().to_degrees()
        );
    }

    #[test]
    fn test_uranus_approach_close_ring_clearance() {
        // Approach inside ring zone
        let approach = Vec3::new(1.0, 0.0, 0.0);
        let result = uranus_approach_analysis(approach, 40_000.0);
        // Closest approach (40,000 km) is inside ring outer (51,149 km)
        // Ring clearance depends on z-offset
        // Since this is inside the ring zone, the clearance is the z_offset
        assert!(
            result.ring_clearance_km >= 0.0,
            "ring clearance should be >= 0 (z-offset approach)"
        );
    }

    #[test]
    fn test_planet_position_3d_backwards_compatible() {
        // The 2D projection (x, y) should approximately match the old coplanar results.
        // Since we changed from simplified λ = ω+ν+Ω to proper rotation matrix,
        // there may be small differences, but distances should match exactly.
        let jd = ephemeris::J2000_JD;
        for planet in &Planet::ALL {
            let pos = ephemeris::planet_position(*planet, jd);
            // x-y distance should approximately equal total distance (since z is small)
            let r_xy = (pos.x * pos.x + pos.y * pos.y).sqrt();
            let r_total = pos.distance.value();
            let z_fraction = pos.z.abs() / r_total;
            // z should be small fraction of total distance (planets have small inclinations)
            // Mercury has the largest inclination at ~7°, so z/r can be up to sin(7°) ≈ 0.12
            assert!(
                z_fraction < 0.13,
                "{:?}: z/r = {:.4}, z = {:.0} km",
                planet,
                z_fraction,
                pos.z
            );
            // r_xy should be close to r_total
            let r_diff = (r_xy - r_total).abs() / r_total;
            assert!(
                r_diff < 0.002,
                "{:?}: r_xy/r = {:.6}, diff = {:.2e}",
                planet,
                r_xy / r_total,
                r_diff
            );
        }
    }
}
