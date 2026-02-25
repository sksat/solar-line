/// Relativistic corrections for high-velocity orbital transfers.
///
/// At velocities reaching ~1-2.5% of the speed of light (as seen in SOLAR LINE
/// brachistochrone transfers), special relativistic effects become potentially
/// measurable. This module quantifies:
///
/// - Lorentz factor γ
/// - Time dilation (proper time vs coordinate time)
/// - Relativistic vs classical Tsiolkovsky rocket equation
/// - Relativistic kinetic energy vs classical approximation
use crate::units::{KmPerSec, Seconds};

/// Speed of light in km/s (exact value per SI definition).
/// c = 299,792.458 km/s
pub const C_KM_S: f64 = 299_792.458;

/// Compute the Lorentz factor γ = 1 / √(1 - β²), where β = v/c.
///
/// Returns γ ≥ 1. For v = 0, returns exactly 1.0.
/// Panics if v ≥ c (speed of light).
pub fn lorentz_factor(v: KmPerSec) -> f64 {
    let beta = v.value() / C_KM_S;
    assert!(
        beta.abs() < 1.0,
        "velocity must be less than c ({} km/s), got {} km/s",
        C_KM_S,
        v.value()
    );
    1.0 / (1.0 - beta * beta).sqrt()
}

/// Compute β = v/c (velocity as a fraction of the speed of light).
pub fn beta(v: KmPerSec) -> f64 {
    v.value() / C_KM_S
}

/// Time dilation: compute proper time (ship time) given coordinate time.
///
/// For a constant-velocity segment at speed v:
///   Δτ = Δt / γ = Δt × √(1 - β²)
///
/// This is an approximation — real brachistochrone transfers involve
/// continuously varying velocity. For a more accurate calculation,
/// use `brachistochrone_proper_time`.
pub fn time_dilation_constant_v(coordinate_time: Seconds, v: KmPerSec) -> Seconds {
    let gamma = lorentz_factor(v);
    Seconds(coordinate_time.value() / gamma)
}

/// Proper time lost due to time dilation at constant velocity.
///
/// Returns the difference: coordinate_time - proper_time.
/// This is how much less time passes on the ship compared to an
/// external observer.
pub fn time_dilation_loss(coordinate_time: Seconds, v: KmPerSec) -> Seconds {
    let proper = time_dilation_constant_v(coordinate_time, v);
    Seconds(coordinate_time.value() - proper.value())
}

/// Relativistic kinetic energy factor relative to classical.
///
/// Classical: KE = ½mv²
/// Relativistic: KE = (γ - 1)mc²
///
/// Returns the ratio: (γ - 1)c² / (½v²)
/// For v << c this approaches 1.0.
/// For v ~ 0.025c this is ~1.0003 (0.03% correction).
pub fn kinetic_energy_correction_factor(v: KmPerSec) -> f64 {
    let beta_val = beta(v);
    let gamma = lorentz_factor(v);

    // Avoid division by zero for v=0
    if beta_val.abs() < 1e-15 {
        return 1.0;
    }

    let relativistic_ke = (gamma - 1.0) * C_KM_S * C_KM_S;
    let classical_ke = 0.5 * v.value() * v.value();
    relativistic_ke / classical_ke
}

/// Classical (Newtonian) Tsiolkovsky ΔV.
///
/// Δv = ve × ln(m0/mf)
pub fn classical_delta_v(exhaust_velocity: KmPerSec, mass_ratio: f64) -> KmPerSec {
    assert!(mass_ratio > 0.0, "mass ratio must be positive");
    KmPerSec(exhaust_velocity.value() * mass_ratio.ln())
}

/// Relativistic rocket equation (constant-thrust, constant-exhaust-velocity).
///
/// For a relativistic rocket with exhaust velocity ve and mass ratio m0/mf,
/// the final coordinate velocity is:
///
///   v_final = c × tanh(ve/c × ln(m0/mf))
///
/// This is the Ackeret relativistic rocket equation. When ve << c,
/// tanh(x) ≈ x and this reduces to the classical Tsiolkovsky equation.
///
/// Note: This gives the velocity achievable from rest. For ve << c,
/// v_final ≈ ve × ln(m0/mf) (classical limit).
pub fn relativistic_delta_v(exhaust_velocity: KmPerSec, mass_ratio: f64) -> KmPerSec {
    assert!(mass_ratio > 0.0, "mass ratio must be positive");
    let x = exhaust_velocity.value() / C_KM_S * mass_ratio.ln();
    KmPerSec(C_KM_S * x.tanh())
}

/// Fractional correction between relativistic and classical ΔV.
///
/// Returns (classical - relativistic) / classical.
///
/// A positive value means the relativistic ΔV is less than the classical
/// (as expected — tanh(x) < x for x > 0). This represents how much
/// the classical equation overestimates the achievable velocity.
pub fn delta_v_correction_fraction(exhaust_velocity: KmPerSec, mass_ratio: f64) -> f64 {
    let classical = classical_delta_v(exhaust_velocity, mass_ratio);
    let relativistic = relativistic_delta_v(exhaust_velocity, mass_ratio);

    if classical.value().abs() < 1e-15 {
        return 0.0;
    }

    (classical.value() - relativistic.value()) / classical.value()
}

/// Compute proper time for a brachistochrone (constant-acceleration) transfer.
///
/// For a flip-at-midpoint brachistochrone at constant proper acceleration `a`,
/// covering distance `d` (coordinate distance), the proper time experienced
/// by the crew is:
///
///   τ = (2c/a) × arcsinh(a × t_half / c)
///
/// where t_half is the coordinate time for the acceleration phase (half the
/// total coordinate time), computed from the relativistic kinematics.
///
/// For a << c²/d (non-relativistic), this approaches the classical result.
///
/// Parameters:
/// - `distance`: total transfer distance in km
/// - `accel_km_s2`: constant proper acceleration in km/s²
///
/// Returns (coordinate_time, proper_time) both in seconds.
pub fn brachistochrone_times(distance: crate::units::Km, accel_km_s2: f64) -> (Seconds, Seconds) {
    let d = distance.value();
    let a = accel_km_s2;
    let c = C_KM_S;

    // Half-distance for the acceleration phase
    let d_half = d / 2.0;

    // Relativistic coordinate time for half the journey (accelerating):
    // d_half = (c²/a)(√(1 + (at/c)²) - 1)
    // Solving for t: t = (c/a)√((d_half·a/c² + 1)² - 1)
    let x = d_half * a / (c * c) + 1.0;
    let t_half = (c / a) * (x * x - 1.0).sqrt();
    let t_total = 2.0 * t_half;

    // Proper time for half the journey:
    // τ_half = (c/a) × arcsinh(a × t_half / c)
    let tau_half = (c / a) * (a * t_half / c).asinh();
    let tau_total = 2.0 * tau_half;

    (Seconds(t_total), Seconds(tau_total))
}

/// Peak velocity at the midpoint of a brachistochrone transfer.
///
/// v_peak = a × t_half / √(1 + (a × t_half / c)²)
///
/// For non-relativistic cases, this simplifies to a × t_half.
pub fn brachistochrone_peak_velocity(distance: crate::units::Km, accel_km_s2: f64) -> KmPerSec {
    let d = distance.value();
    let a = accel_km_s2;
    let c = C_KM_S;

    let d_half = d / 2.0;
    let x = d_half * a / (c * c) + 1.0;
    let t_half = (c / a) * (x * x - 1.0).sqrt();

    let at_over_c = a * t_half / c;
    let v_peak = c * at_over_c / (1.0 + at_over_c * at_over_c).sqrt();

    KmPerSec(v_peak)
}

/// Summary of relativistic effects for a given velocity.
///
/// Returns (gamma, beta, time_dilation_ppm, ke_correction_ppm):
/// - gamma: Lorentz factor
/// - beta: v/c fraction
/// - time_dilation_ppm: parts per million of time dilation (τ shorter than t)
/// - ke_correction_ppm: parts per million correction to kinetic energy
pub fn effects_summary(v: KmPerSec) -> (f64, f64, f64, f64) {
    let b = beta(v);
    let g = lorentz_factor(v);

    // Time dilation: fraction of time "lost" = 1 - 1/γ
    let td_fraction = 1.0 - 1.0 / g;
    let td_ppm = td_fraction * 1e6;

    // KE correction: fraction above classical
    let ke_factor = kinetic_energy_correction_factor(v);
    let ke_ppm = (ke_factor - 1.0) * 1e6;

    (g, b, td_ppm, ke_ppm)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::units::Km;

    #[test]
    fn test_speed_of_light() {
        // c = 299,792.458 km/s (exact)
        assert!((C_KM_S - 299_792.458).abs() < 1e-3);
    }

    #[test]
    fn test_lorentz_factor_zero_velocity() {
        let gamma = lorentz_factor(KmPerSec(0.0));
        assert!((gamma - 1.0).abs() < 1e-15, "γ at v=0 should be 1.0");
    }

    #[test]
    fn test_lorentz_factor_known_values() {
        // At v = 0.1c: γ = 1/√(1-0.01) = 1/√0.99 ≈ 1.00504
        let v_01c = KmPerSec(0.1 * C_KM_S);
        let gamma = lorentz_factor(v_01c);
        let expected = 1.0 / (1.0 - 0.01_f64).sqrt();
        assert!(
            (gamma - expected).abs() < 1e-10,
            "γ at 0.1c: {} vs expected {}",
            gamma,
            expected
        );
    }

    #[test]
    fn test_lorentz_factor_half_c() {
        // At v = 0.5c: γ = 1/√(1-0.25) = 1/√0.75 ≈ 1.1547
        let v = KmPerSec(0.5 * C_KM_S);
        let gamma = lorentz_factor(v);
        let expected = 1.0 / (0.75_f64).sqrt();
        assert!(
            (gamma - expected).abs() < 1e-10,
            "γ at 0.5c: {} vs expected {}",
            gamma,
            expected
        );
    }

    #[test]
    fn test_beta_computation() {
        let v = KmPerSec(2997.92458); // 0.01c = 1% of light speed
        let b = beta(v);
        assert!((b - 0.01).abs() < 1e-10, "β should be 0.01, got {}", b);
    }

    #[test]
    fn test_time_dilation_at_rest() {
        let t = Seconds(3600.0); // 1 hour
        let proper = time_dilation_constant_v(t, KmPerSec(0.0));
        assert!(
            (proper.value() - 3600.0).abs() < 1e-10,
            "no time dilation at rest"
        );
    }

    #[test]
    fn test_time_dilation_at_1_percent_c() {
        // v = 0.01c → γ ≈ 1.00005
        // Time dilation loss over 1 year ≈ 1577 seconds (26 min)
        let v = KmPerSec(0.01 * C_KM_S);
        let one_year = Seconds(365.25 * 86400.0);
        let loss = time_dilation_loss(one_year, v);

        // Expected: Δτ = t × (1 - 1/γ)
        let gamma = lorentz_factor(v);
        let expected_loss = one_year.value() * (1.0 - 1.0 / gamma);
        assert!(
            (loss.value() - expected_loss).abs() < 1e-6,
            "time loss: {} s vs expected {} s",
            loss.value(),
            expected_loss
        );

        // At 0.01c, loss should be ~0.005% of total time (tiny but measurable)
        let loss_fraction = loss.value() / one_year.value();
        assert!(
            loss_fraction > 1e-5 && loss_fraction < 1e-3,
            "loss fraction at 1%c: {}",
            loss_fraction
        );
    }

    #[test]
    fn test_kinetic_energy_correction_at_zero() {
        let factor = kinetic_energy_correction_factor(KmPerSec(0.0));
        assert!(
            (factor - 1.0).abs() < 1e-10,
            "KE correction at v=0 should be 1.0"
        );
    }

    #[test]
    fn test_kinetic_energy_correction_at_low_v() {
        // At v = 0.01c: γ ≈ 1.00005
        // KE_rel / KE_class = (γ-1)c² / (½v²)
        // = (0.00005 × c²) / (0.5 × (0.01c)²)
        // = 0.00005 / (0.5 × 0.0001)
        // ≈ 1.00005
        let v = KmPerSec(0.01 * C_KM_S);
        let factor = kinetic_energy_correction_factor(v);
        // Should be very close to 1 — well within 0.1%
        assert!(
            (factor - 1.0).abs() < 0.001,
            "KE correction at 0.01c: {} (expected ~1.0)",
            factor
        );
    }

    #[test]
    fn test_kinetic_energy_correction_increases_with_v() {
        let factor_1 = kinetic_energy_correction_factor(KmPerSec(0.01 * C_KM_S));
        let factor_5 = kinetic_energy_correction_factor(KmPerSec(0.05 * C_KM_S));
        let factor_10 = kinetic_energy_correction_factor(KmPerSec(0.10 * C_KM_S));

        assert!(factor_5 > factor_1, "KE correction should increase with v");
        assert!(factor_10 > factor_5, "KE correction should increase with v");
    }

    #[test]
    fn test_classical_delta_v() {
        // Classical: Δv = ve × ln(m0/mf)
        let ve = KmPerSec(9806.65); // Isp 10^6 s
        let mr = std::f64::consts::E; // mass ratio = e → Δv = ve
        let dv = classical_delta_v(ve, mr);
        assert!(
            (dv.value() - ve.value()).abs() < 1e-6,
            "Δv should equal ve for mass ratio e"
        );
    }

    #[test]
    fn test_relativistic_delta_v_low_speed() {
        // At low velocities, relativistic ≈ classical
        let ve = KmPerSec(10.0); // 10 km/s (chemical rockets)
        let mr = 3.0;
        let classical = classical_delta_v(ve, mr);
        let relativistic = relativistic_delta_v(ve, mr);

        let diff = (classical.value() - relativistic.value()).abs();
        assert!(
            diff / classical.value() < 1e-6,
            "at low v, relativistic should match classical: rel diff = {}",
            diff / classical.value()
        );
    }

    #[test]
    fn test_relativistic_delta_v_less_than_classical() {
        // Relativistic Δv is always ≤ classical (tanh(x) ≤ x)
        let ve = KmPerSec(9806.65); // Isp 10^6 s → ve ≈ 0.033c
        let mr = 10.0; // mass ratio 10 → classical Δv ≈ 22,578 km/s ≈ 7.5%c
        let classical = classical_delta_v(ve, mr);
        let relativistic = relativistic_delta_v(ve, mr);

        assert!(
            relativistic.value() <= classical.value(),
            "relativistic ({}) should be ≤ classical ({})",
            relativistic.value(),
            classical.value()
        );

        // At 7.5%c the correction should be noticeable but small
        let correction = delta_v_correction_fraction(ve, mr);
        assert!(
            correction > 0.0 && correction < 0.1,
            "correction at 7.5%c: {}",
            correction
        );
    }

    #[test]
    fn test_relativistic_delta_v_high_mass_ratio() {
        // Very high mass ratio → velocity approaches c asymptotically
        // ve = 0.1c, mr = 1e10 → x = 0.1 × ln(1e10) ≈ 2.3 → tanh(2.3) ≈ 0.98
        let ve = KmPerSec(0.1 * C_KM_S); // ve = 0.1c
        let mr = 1e10;
        let relativistic = relativistic_delta_v(ve, mr);

        // tanh approaches 1, so v → c, but not instantly
        assert!(
            relativistic.value() < C_KM_S,
            "relativistic velocity should be < c"
        );
        // At ve=0.1c, mr=1e10: v ≈ 0.98c
        assert!(
            relativistic.value() > 0.95 * C_KM_S,
            "at extreme mass ratio, velocity should be close to c: {} km/s ({}c)",
            relativistic.value(),
            relativistic.value() / C_KM_S
        );

        // With even higher mass ratio, should get closer to c
        let mr_extreme = 1e100;
        let rel_extreme = relativistic_delta_v(ve, mr_extreme);
        assert!(
            rel_extreme.value() > relativistic.value(),
            "higher mass ratio should give higher velocity"
        );
        assert!(
            rel_extreme.value() > 0.999 * C_KM_S,
            "at extreme mass ratio (1e100), should be very close to c: {} km/s",
            rel_extreme.value()
        );
    }

    #[test]
    fn test_delta_v_correction_kestrel_ep01() {
        // Kestrel EP01: Δv ≈ 8497 km/s, Isp = 10^6 s (ve ≈ 9806.65 km/s)
        // β_peak ≈ 8497 / 299792 ≈ 0.0283 (2.83% c)
        // mass_ratio = exp(8497 / 9806.65) ≈ 2.376
        let ve = KmPerSec(9806.65);
        let mr = (8497.0_f64 / 9806.65).exp();
        let correction = delta_v_correction_fraction(ve, mr);

        // At ~2.8%c, the correction should be on the order of 0.01-0.1%
        assert!(correction > 0.0, "correction should be positive");
        assert!(
            correction < 0.01,
            "correction at 2.8%c should be < 1%, got {}%",
            correction * 100.0
        );
    }

    #[test]
    fn test_brachistochrone_times_classical_limit() {
        // For low acceleration and short distance (non-relativistic),
        // coordinate time and proper time should be nearly identical
        let d = Km(550_630_800.0); // Mars-Jupiter closest
        let a = 0.032_783; // km/s² (EP01 72h scenario)

        let (t_coord, t_proper) = brachistochrone_times(d, a);

        // Classical: t = sqrt(4d/a) = 2 × sqrt(d/a) for half-distance
        // Actually: d = ½at² for half-journey → t_half = sqrt(2d_half/a) = sqrt(d/a)
        // Total: t = 2 × sqrt(d/a)
        // Wait — classical brachistochrone: d = ½ × a × (t/2)² × 2 = a × t²/4
        // So t = 2 × sqrt(d/a)
        let t_classical = 2.0 * (d.value() / a).sqrt();

        // Should be close for non-relativistic case (within ~0.01%)
        let rel_diff = (t_coord.value() - t_classical).abs() / t_classical;
        assert!(
            rel_diff < 1e-4,
            "coordinate time should match classical: {} vs {}, rel diff = {}",
            t_coord.value(),
            t_classical,
            rel_diff
        );

        // Proper time should also be close to coordinate time
        let td_diff = (t_coord.value() - t_proper.value()).abs() / t_coord.value();
        assert!(
            td_diff < 1e-3,
            "proper time should be close to coordinate time: diff = {}",
            td_diff
        );
    }

    #[test]
    fn test_brachistochrone_times_high_accel() {
        // High acceleration: a = 1 km/s² over 1 AU
        // Peak velocity will be significant fraction of c
        let d = Km(149_597_870.7); // 1 AU
        let a = 1.0; // 1 km/s² ≈ 102g

        let (t_coord, t_proper) = brachistochrone_times(d, a);

        // Proper time should be less than coordinate time
        assert!(
            t_proper.value() < t_coord.value(),
            "proper time should be less than coordinate time"
        );
        assert!(t_proper.value() > 0.0, "proper time should be positive");
    }

    #[test]
    fn test_brachistochrone_peak_velocity() {
        // EP01 scenario: Mars-Jupiter closest, 72h
        let d = Km(550_630_800.0);
        let a = 0.032_783; // km/s²

        let v_peak = brachistochrone_peak_velocity(d, a);

        // Classical: v_peak = a × t_half = a × sqrt(d/a) = sqrt(a × d)
        // Actually: v_peak = a × (t/2) where t = 2√(d/a)
        // v_peak = a × √(d/a) = √(a × d)
        let v_classical = (a * d.value()).sqrt();

        // Should be close in non-relativistic regime
        let rel_diff = (v_peak.value() - v_classical).abs() / v_classical;
        assert!(
            rel_diff < 1e-4,
            "peak velocity: {} vs classical {}, diff = {}",
            v_peak.value(),
            v_classical,
            rel_diff
        );

        // Check the velocity is in the right ballpark (~4249 km/s ≈ 1.4% c)
        assert!(
            v_peak.value() > 4000.0 && v_peak.value() < 5000.0,
            "EP01 peak velocity should be ~4249 km/s, got {} km/s",
            v_peak.value()
        );
    }

    #[test]
    fn test_brachistochrone_peak_velocity_capped_at_c() {
        // Extremely high acceleration should still give v < c
        let d = Km(1e12); // very large distance
        let a = 100.0; // very high acceleration

        let v_peak = brachistochrone_peak_velocity(d, a);
        assert!(
            v_peak.value() < C_KM_S,
            "peak velocity should be < c, got {} km/s",
            v_peak.value()
        );
    }

    #[test]
    fn test_effects_summary_solar_line_velocities() {
        // Test at key velocities from the series:
        // 1500 km/s (cruise), 4249 km/s (EP01 peak), 7600 km/s (max peak)

        let (gamma_1500, beta_1500, td_1500, _ke_1500) = effects_summary(KmPerSec(1500.0));
        assert!(
            (beta_1500 - 1500.0 / C_KM_S).abs() < 1e-10,
            "β at 1500 km/s"
        );
        assert!(gamma_1500 > 1.0, "γ should be > 1");
        assert!(td_1500 > 0.0, "time dilation should be positive");

        // At 1500 km/s (0.5% c): very small effects
        assert!(
            td_1500 < 100.0,
            "time dilation at 0.5%c should be < 100 ppm, got {} ppm",
            td_1500
        );

        // At 7600 km/s (2.5% c): still small but measurable
        let (_gamma_7600, _beta_7600, td_7600, _ke_7600) = effects_summary(KmPerSec(7600.0));
        assert!(
            td_7600 > td_1500,
            "time dilation should increase with velocity"
        );
        assert!(
            td_7600 < 1000.0,
            "time dilation at 2.5%c should be < 1000 ppm, got {} ppm",
            td_7600
        );
    }

    #[test]
    fn test_effects_summary_ep01_peak() {
        // EP01: Mars→Ganymede 72h, peak velocity ~4249 km/s ≈ 1.42%c
        let v = KmPerSec(4249.0);
        let (gamma, beta_val, td_ppm, ke_ppm) = effects_summary(v);

        // β ≈ 0.0142
        assert!(
            (beta_val - 0.01417).abs() < 0.001,
            "β at 4249 km/s: {}",
            beta_val
        );

        // γ ≈ 1 + β²/2 ≈ 1.0001
        assert!(gamma > 1.0 && gamma < 1.001, "γ at 1.4%c: {}", gamma);

        // Time dilation: ~100 ppm (β²/2 × 10^6)
        assert!(
            td_ppm > 50.0 && td_ppm < 200.0,
            "time dilation at 1.4%c: {} ppm",
            td_ppm
        );

        // KE correction: similar magnitude
        assert!(
            ke_ppm > 0.0 && ke_ppm < 200.0,
            "KE correction at 1.4%c: {} ppm",
            ke_ppm
        );
    }

    #[test]
    fn test_effects_summary_max_peak() {
        // Maximum peak velocity ~7600 km/s ≈ 2.53%c (from highest-accel brachistochrone)
        let v = KmPerSec(7600.0);
        let (gamma, beta_val, td_ppm, ke_ppm) = effects_summary(v);

        // β ≈ 0.0253
        assert!(
            (beta_val - 0.02535).abs() < 0.001,
            "β at 7600 km/s: {}",
            beta_val
        );

        // Time dilation: ~321 ppm (β²/2 × 10^6)
        // Over 72h = 259,200s → loss ≈ 83s
        // At 2.5%c, β²/2 ≈ 3.2e-4, so loss ≈ 259200 × 3.2e-4 ≈ 83s
        // This is measurable but negligible for navigation (~0.032%)
        let loss_72h = td_ppm * 1e-6 * 259200.0;
        assert!(
            loss_72h > 50.0 && loss_72h < 150.0,
            "time dilation loss over 72h at 2.5%c should be ~83s, got {} s",
            loss_72h
        );

        // All corrections should be under 1000 ppm (0.1%)
        assert!(
            td_ppm < 1000.0 && ke_ppm < 1000.0,
            "corrections at 2.5%c: td={} ppm, ke={} ppm",
            td_ppm,
            ke_ppm
        );

        // Verify gamma and beta are consistent
        let expected_gamma = 1.0 / (1.0 - beta_val * beta_val).sqrt();
        assert!(
            (gamma - expected_gamma).abs() < 1e-10,
            "γ consistency check"
        );
    }
}
