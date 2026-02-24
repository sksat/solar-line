/// Attitude control analysis for SOLAR LINE.
///
/// Analyzes pointing accuracy requirements, flip maneuver dynamics,
/// and miss-distance sensitivity for brachistochrone trajectories.

/// Miss distance (km) from pointing error during a constant-thrust burn.
///
/// For a burn of duration `t` seconds at acceleration `a` m/s²,
/// a pointing error of `theta` radians produces a lateral displacement:
///   miss = 0.5 * a * t² * sin(theta)
/// For small angles: miss ≈ 0.5 * a * t² * theta
///
/// Returns miss distance in km.
pub fn miss_distance_km(accel_m_s2: f64, burn_time_s: f64, pointing_error_rad: f64) -> f64 {
    let lateral_accel = accel_m_s2 * pointing_error_rad.sin();
    let miss_m = 0.5 * lateral_accel * burn_time_s * burn_time_s;
    miss_m / 1000.0 // m → km
}

/// Required pointing accuracy (radians) to achieve a given miss distance.
///
/// Inverse of miss_distance_km:
///   theta = arcsin(2 * miss_km * 1000 / (a * t²))
/// For small angles: theta ≈ 2 * miss_km * 1000 / (a * t²)
pub fn required_pointing_rad(accel_m_s2: f64, burn_time_s: f64, max_miss_km: f64) -> f64 {
    let sin_theta = 2.0 * max_miss_km * 1000.0 / (accel_m_s2 * burn_time_s * burn_time_s);
    if sin_theta.abs() > 1.0 {
        // Any pointing accuracy is sufficient (miss is already small enough)
        std::f64::consts::FRAC_PI_2
    } else {
        sin_theta.asin()
    }
}

/// Angular rate for a flip maneuver (rad/s).
///
/// A brachistochrone flip involves rotating the ship 180° at the midpoint.
/// Given a desired flip duration in seconds, returns the angular rate.
/// Assumes constant angular velocity (instantaneous start/stop).
pub fn flip_angular_rate(flip_duration_s: f64) -> f64 {
    std::f64::consts::PI / flip_duration_s
}

/// Angular momentum for a flip maneuver (kg·m²/s).
///
/// Given ship mass (kg), characteristic radius (m, distance from
/// center of mass to thrust point), and flip angular rate (rad/s),
/// returns the angular momentum about the rotation axis.
///
/// Approximates the ship as a cylinder: I ≈ 0.5 * m * r²
pub fn flip_angular_momentum(mass_kg: f64, radius_m: f64, angular_rate_rad_s: f64) -> f64 {
    let moment_of_inertia = 0.5 * mass_kg * radius_m * radius_m;
    moment_of_inertia * angular_rate_rad_s
}

/// RCS torque required for a flip maneuver (N·m).
///
/// Given moment of inertia (I = 0.5 * m * r²), flip duration, and
/// desired angular acceleration/deceleration time (ramp time).
/// Assumes trapezoidal angular velocity profile:
///   accelerate for ramp_s, coast, decelerate for ramp_s.
pub fn flip_rcs_torque(mass_kg: f64, radius_m: f64, flip_duration_s: f64, ramp_time_s: f64) -> f64 {
    let moment_of_inertia = 0.5 * mass_kg * radius_m * radius_m;
    // Peak angular velocity: ω = π / (flip_duration - ramp_time)
    // (approximately, for trapezoidal profile)
    let coast_duration = flip_duration_s - 2.0 * ramp_time_s;
    if coast_duration <= 0.0 {
        // Pure triangular profile
        let omega_peak = 2.0 * std::f64::consts::PI / flip_duration_s;
        let angular_accel = omega_peak / (flip_duration_s / 2.0);
        return moment_of_inertia * angular_accel;
    }
    let omega_peak = std::f64::consts::PI / (coast_duration + ramp_time_s);
    let angular_accel = omega_peak / ramp_time_s;
    moment_of_inertia * angular_accel
}

/// Pointing error from thrust vector misalignment over a burn.
///
/// Returns the velocity error (km/s) from a constant pointing offset.
///   v_error = a * t * sin(theta)
pub fn velocity_error_from_pointing(accel_m_s2: f64, burn_time_s: f64, pointing_error_rad: f64) -> f64 {
    let v_error_m_s = accel_m_s2 * burn_time_s * pointing_error_rad.sin();
    v_error_m_s / 1000.0 // m/s → km/s
}

/// Navigation accuracy as angular precision.
///
/// Given "accuracy X%" where X represents the fraction of velocity
/// that is correctly aligned, convert to pointing error in radians.
///   accuracy = cos(theta)  →  theta = arccos(accuracy)
/// For 99.8% accuracy: theta ≈ 0.063 rad ≈ 3.6°
pub fn accuracy_to_pointing_error_rad(accuracy_fraction: f64) -> f64 {
    accuracy_fraction.acos()
}

/// Gravity gradient torque on an elongated spacecraft (N·m).
///
/// In a gravity field, a non-spherical body experiences torque that
/// tends to align its long axis radially. For a cylinder of length L:
///   τ ≈ 3 * μ * (I_zz - I_xx) * sin(2θ) / (2 * r³)
/// where θ is the angle between the long axis and the local vertical.
///
/// Returns torque in N·m. Inputs: GM (m³/s²), distance (m),
/// mass (kg), length (m), angle from vertical (rad).
pub fn gravity_gradient_torque(
    gm_m3_s2: f64,
    distance_m: f64,
    mass_kg: f64,
    length_m: f64,
    angle_rad: f64,
) -> f64 {
    // For a uniform cylinder: I_zz - I_xx ≈ m * L² / 12
    let delta_i = mass_kg * length_m * length_m / 12.0;
    let r3 = distance_m * distance_m * distance_m;
    3.0 * gm_m3_s2 * delta_i * (2.0 * angle_rad).sin() / (2.0 * r3)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_miss_distance_small_angle() {
        // 20 m/s² accel, 1 hour burn, 0.001 rad (~0.057°) error
        let miss = miss_distance_km(20.0, 3600.0, 0.001);
        // 0.5 * 20 * 3600² * 0.001 / 1000 = 0.5 * 20 * 12960000 * 0.001 / 1000 = 129.6 km
        assert!((miss - 129.6).abs() < 0.1, "miss = {miss}");
    }

    #[test]
    fn test_miss_distance_zero_error() {
        assert_eq!(miss_distance_km(20.0, 3600.0, 0.0), 0.0);
    }

    #[test]
    fn test_required_pointing_inverse() {
        let accel = 20.0;
        let burn_time = 3600.0;
        let target_miss = 10.0; // 10 km
        let theta = required_pointing_rad(accel, burn_time, target_miss);
        let actual_miss = miss_distance_km(accel, burn_time, theta);
        assert!((actual_miss - target_miss).abs() < 0.01, "actual = {actual_miss}");
    }

    #[test]
    fn test_flip_angular_rate() {
        // 60 second flip → π/60 rad/s ≈ 0.0524 rad/s ≈ 3°/s
        let rate = flip_angular_rate(60.0);
        assert!((rate - std::f64::consts::PI / 60.0).abs() < 1e-10);
    }

    #[test]
    fn test_flip_angular_momentum() {
        // 300,000 kg ship, 5 m radius, 0.05 rad/s
        let h = flip_angular_momentum(300_000.0, 5.0, 0.05);
        // I = 0.5 * 300000 * 25 = 3,750,000 kg·m²
        // H = 3,750,000 * 0.05 = 187,500 kg·m²/s
        assert!((h - 187_500.0).abs() < 1.0, "h = {h}");
    }

    #[test]
    fn test_flip_rcs_torque() {
        // 300,000 kg, 5 m radius, 60 s flip, 10 s ramp
        let torque = flip_rcs_torque(300_000.0, 5.0, 60.0, 10.0);
        // I = 3,750,000 kg·m²
        // coast = 60 - 20 = 40 s
        // ω_peak = π / (40 + 10) = π/50 ≈ 0.0628 rad/s
        // α = ω_peak / 10 ≈ 0.00628 rad/s²
        // τ = I * α ≈ 3,750,000 * 0.00628 ≈ 23,562 N·m
        assert!((torque - 23_562.0).abs() < 100.0, "torque = {torque}");
    }

    #[test]
    fn test_velocity_error() {
        // 20 m/s², 3600 s, 0.001 rad
        let v_err = velocity_error_from_pointing(20.0, 3600.0, 0.001);
        // 20 * 3600 * sin(0.001) / 1000 ≈ 72 * 0.001 = 0.072 km/s
        assert!((v_err - 0.072).abs() < 0.001, "v_err = {v_err}");
    }

    #[test]
    fn test_accuracy_to_pointing() {
        // 99.8% accuracy → cos(θ) = 0.998
        let theta = accuracy_to_pointing_error_rad(0.998);
        // arccos(0.998) ≈ 0.0632 rad ≈ 3.62°
        assert!((theta - 0.0632).abs() < 0.001, "theta = {theta}");
    }

    #[test]
    fn test_gravity_gradient_torque_zero_angle() {
        // At zero angle (aligned with vertical), torque is zero
        let torque = gravity_gradient_torque(3.986e14, 7_000_000.0, 300_000.0, 100.0, 0.0);
        assert!(torque.abs() < 1e-6, "torque = {torque}");
    }

    #[test]
    fn test_gravity_gradient_torque_nonzero() {
        // At 45°, torque is maximum
        let torque = gravity_gradient_torque(
            3.986e14,  // Earth GM in m³/s²
            7_000_000.0,  // 7000 km orbit
            300_000.0,  // 300 t
            100.0,  // 100 m length
            std::f64::consts::FRAC_PI_4,
        );
        // Should be positive and significant
        assert!(torque > 0.0, "torque = {torque}");
        // τ ≈ 3 * 3.986e14 * (300000 * 10000 / 12) * sin(π/2) / (2 * 3.43e20)
        // ≈ 3 * 3.986e14 * 2.5e8 * 1 / 6.86e20
        // ≈ 2.99e23 / 6.86e20 ≈ 436 N·m
        assert!((torque - 436.0).abs() < 10.0, "torque = {torque}");
    }
}
