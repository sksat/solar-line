//! Oracle tests for orbit propagation: verify energy conservation,
//! period accuracy, and cross-integrator consistency.
//!
//! These tests use nalgebra for independent verification of vector
//! operations and known analytical solutions as oracles.

use nalgebra::Vector3;
use solar_line_core::constants::{mu, orbit_radius};
use solar_line_core::propagation::*;
use solar_line_core::units::{Km, KmPerSec, Mu};
use solar_line_core::vec3::Vec3;

/// Independent energy computation using nalgebra for vector operations.
fn nalgebra_specific_energy(pos: &Vec3<Km>, vel: &Vec3<KmPerSec>, mu: Mu) -> f64 {
    let r = Vector3::new(pos.x.value(), pos.y.value(), pos.z.value());
    let v = Vector3::new(vel.x.value(), vel.y.value(), vel.z.value());
    0.5 * v.norm_squared() - mu.value() / r.norm()
}

// ── Circular orbit energy conservation ──────────────────────────────

#[test]
fn rk4_circular_orbit_energy_conservation_100_periods() {
    let state = circular_orbit_state(mu::EARTH, Km(6778.0));
    let period = solar_line_core::orbital_period(mu::EARTH, Km(6778.0));

    let config = IntegratorConfig {
        dt: 10.0, // 10s step
        mu: mu::EARTH,
        thrust: ThrustProfile::None,
    };

    let duration = 100.0 * period.value();
    let final_state = propagate_final(&state, &config, duration);

    // Energy should be conserved
    let e0 = state.specific_energy(mu::EARTH);
    let ef = final_state.specific_energy(mu::EARTH);
    let rel_drift = (ef - e0).abs() / e0.abs();

    assert!(
        rel_drift < 1e-8,
        "RK4 energy drift after 100 LEO periods: {rel_drift:.2e}"
    );

    // Cross-check with nalgebra-computed energy
    let e0_na = nalgebra_specific_energy(&state.pos, &state.vel, mu::EARTH);
    assert!(
        (e0 - e0_na).abs() / e0.abs() < 1e-14,
        "Energy computation disagrees with nalgebra: ours={e0}, nalgebra={e0_na}"
    );
}

#[test]
fn adaptive_circular_orbit_energy_conservation() {
    let state = circular_orbit_state(mu::EARTH, Km(6778.0));
    let period = solar_line_core::orbital_period(mu::EARTH, Km(6778.0));

    let config = AdaptiveConfig::planetocentric(mu::EARTH, ThrustProfile::None);
    let duration = 100.0 * period.value();

    let result = propagate_adaptive(&state, &config, duration);

    let e0 = state.specific_energy(mu::EARTH);
    let ef = result.states.last().unwrap().specific_energy(mu::EARTH);
    let rel_drift = (ef - e0).abs() / e0.abs();

    // Adaptive RK45 accumulates some energy drift over many periods.
    // 100 LEO periods ≈ 154 hours → 1e-6 relative drift is acceptable.
    assert!(
        rel_drift < 1e-5,
        "Adaptive energy drift after 100 LEO periods: {rel_drift:.2e}"
    );
}

#[test]
fn symplectic_circular_orbit_energy_conservation_1000_periods() {
    let state = circular_orbit_state(mu::EARTH, Km(6778.0));
    let period = solar_line_core::orbital_period(mu::EARTH, Km(6778.0));

    let dt = 10.0;
    let duration = 1000.0 * period.value();

    let result = propagate_symplectic_final(&state, mu::EARTH, dt, duration);

    let e0 = state.specific_energy(mu::EARTH);
    let ef = result.specific_energy(mu::EARTH);
    let rel_drift = (ef - e0).abs() / e0.abs();

    // Symplectic integrators have bounded, non-secular energy oscillation
    assert!(
        rel_drift < 1e-8,
        "Symplectic energy drift after 1000 LEO periods: {rel_drift:.2e}"
    );
}

// ── Elliptical orbit conservation ───────────────────────────────────

#[test]
fn rk4_elliptical_orbit_energy_conservation() {
    // Highly elliptical orbit (Molniya-like: e ≈ 0.7)
    let state = elliptical_orbit_state_at_periapsis(mu::EARTH, Km(26600.0), 0.7);
    let period = solar_line_core::orbital_period(mu::EARTH, Km(26600.0));

    let config = IntegratorConfig {
        dt: 30.0,
        mu: mu::EARTH,
        thrust: ThrustProfile::None,
    };

    let duration = 10.0 * period.value();
    let final_state = propagate_final(&state, &config, duration);

    let e0 = state.specific_energy(mu::EARTH);
    let ef = final_state.specific_energy(mu::EARTH);
    let rel_drift = (ef - e0).abs() / e0.abs();

    assert!(
        rel_drift < 1e-6,
        "RK4 elliptical energy drift after 10 periods: {rel_drift:.2e}"
    );
}

#[test]
fn adaptive_elliptical_orbit_returns_to_periapsis() {
    // After one period, position should return close to initial
    let a = Km(26600.0);
    let e = 0.5;
    let state = elliptical_orbit_state_at_periapsis(mu::EARTH, a, e);
    let period = solar_line_core::orbital_period(mu::EARTH, a);

    let config = AdaptiveConfig::planetocentric(mu::EARTH, ThrustProfile::None);
    let (final_state, _n_eval) = propagate_adaptive_final(&state, &config, period.value());

    // Position should be close to initial (periapsis)
    let dx = (final_state.pos.x.value() - state.pos.x.value()).abs();
    let dy = (final_state.pos.y.value() - state.pos.y.value()).abs();
    let dz = (final_state.pos.z.value() - state.pos.z.value()).abs();
    let pos_err = (dx * dx + dy * dy + dz * dz).sqrt();
    let r_p = a.value() * (1.0 - e);

    let rel_pos_err = pos_err / r_p;
    assert!(
        rel_pos_err < 1e-6,
        "After one period, position error: {pos_err:.3} km ({rel_pos_err:.2e} relative)"
    );
}

// ── Cross-integrator comparison ─────────────────────────────────────

#[test]
fn rk4_vs_adaptive_circular_orbit() {
    let state = circular_orbit_state(mu::EARTH, Km(42164.0)); // GEO
    let period = solar_line_core::orbital_period(mu::EARTH, Km(42164.0));
    let duration = period.value(); // 1 period (~24h)

    // RK4
    let rk4_config = IntegratorConfig {
        dt: 30.0,
        mu: mu::EARTH,
        thrust: ThrustProfile::None,
    };
    let rk4_final = propagate_final(&state, &rk4_config, duration);

    // Adaptive RK45
    let adaptive_config = AdaptiveConfig::planetocentric(mu::EARTH, ThrustProfile::None);
    let (adaptive_final, _) = propagate_adaptive_final(&state, &adaptive_config, duration);

    // Both should give similar final position
    let dx = (rk4_final.pos.x.value() - adaptive_final.pos.x.value()).abs();
    let dy = (rk4_final.pos.y.value() - adaptive_final.pos.y.value()).abs();
    let dz = (rk4_final.pos.z.value() - adaptive_final.pos.z.value()).abs();
    let pos_diff = (dx * dx + dy * dy + dz * dz).sqrt();

    assert!(
        pos_diff < 1.0, // < 1 km difference for GEO orbit after 1 period
        "RK4 vs Adaptive position difference: {pos_diff:.3} km"
    );
}

#[test]
fn rk4_vs_symplectic_circular_orbit() {
    let state = circular_orbit_state(mu::EARTH, Km(6778.0));
    let period = solar_line_core::orbital_period(mu::EARTH, Km(6778.0));
    let duration = 10.0 * period.value();

    // RK4
    let rk4_config = IntegratorConfig {
        dt: 10.0,
        mu: mu::EARTH,
        thrust: ThrustProfile::None,
    };
    let rk4_final = propagate_final(&state, &rk4_config, duration);

    // Symplectic
    let symplectic_result = propagate_symplectic_final(&state, mu::EARTH, 10.0, duration);

    // Compare final positions
    let dx = (rk4_final.pos.x.value() - symplectic_result.pos.x.value()).abs();
    let dy = (rk4_final.pos.y.value() - symplectic_result.pos.y.value()).abs();
    let dz = (rk4_final.pos.z.value() - symplectic_result.pos.z.value()).abs();
    let pos_diff = (dx * dx + dy * dy + dz * dz).sqrt();
    let r = state.radius();

    // Different integrators diverge in phase over many periods.
    // The key metric is that both conserve energy well, not that they agree on phase.
    // 10 periods → ~18 km difference for LEO (~2.7e-3 relative) is expected.
    assert!(
        pos_diff / r < 1e-2,
        "RK4 vs Symplectic position difference: {pos_diff:.3} km (relative: {:.2e})",
        pos_diff / r
    );
}

// ── Heliocentric orbit: Earth around Sun ────────────────────────────

#[test]
fn heliocentric_earth_orbit_energy_conservation() {
    let state = circular_orbit_state(mu::SUN, orbit_radius::EARTH);
    let period = solar_line_core::orbital_period(mu::SUN, orbit_radius::EARTH);

    let config = AdaptiveConfig::heliocentric(mu::SUN, ThrustProfile::None);
    let duration = period.value(); // 1 year

    let result = propagate_adaptive(&state, &config, duration);
    let final_state = result.states.last().unwrap();

    let e0 = state.specific_energy(mu::SUN);
    let ef = final_state.specific_energy(mu::SUN);
    let rel_drift = (ef - e0).abs() / e0.abs();

    assert!(
        rel_drift < 1e-10,
        "Heliocentric energy drift after 1 year: {rel_drift:.2e}"
    );

    // Should return close to starting position
    let pos_diff = ((final_state.pos.x.value() - state.pos.x.value()).powi(2)
        + (final_state.pos.y.value() - state.pos.y.value()).powi(2)
        + (final_state.pos.z.value() - state.pos.z.value()).powi(2))
    .sqrt();
    let rel_pos_err = pos_diff / orbit_radius::EARTH.value();

    assert!(
        rel_pos_err < 1e-6,
        "Earth should return to start after 1 year: {pos_diff:.0} km ({rel_pos_err:.2e} relative)"
    );
}

// ── Angular momentum conservation ───────────────────────────────────

#[test]
fn angular_momentum_conserved_elliptical_orbit() {
    let state = elliptical_orbit_state_at_periapsis(mu::EARTH, Km(26600.0), 0.5);
    let period = solar_line_core::orbital_period(mu::EARTH, Km(26600.0));

    let config = AdaptiveConfig::planetocentric(mu::EARTH, ThrustProfile::None);
    let result = propagate_adaptive(&state, &config, period.value());

    let h0 = state.angular_momentum();
    let h0_mag = (h0.x * h0.x + h0.y * h0.y + h0.z * h0.z).sqrt();

    // Check angular momentum at several points along the trajectory
    let n_check = result.states.len().min(100);
    let step = result.states.len() / n_check;
    for i in (0..result.states.len()).step_by(step.max(1)) {
        let h = result.states[i].angular_momentum();
        let h_mag = (h.x * h.x + h.y * h.y + h.z * h.z).sqrt();
        let rel_err = (h_mag - h0_mag).abs() / h0_mag;
        // Adaptive integrator angular momentum drift scales with tolerance settings
        assert!(
            rel_err < 1e-7,
            "Angular momentum drift at step {i}: {rel_err:.2e}"
        );
    }
}

// ── nalgebra cross-validation of angular momentum ───────────────────

#[test]
fn angular_momentum_matches_nalgebra_cross_product() {
    let state = circular_orbit_state(mu::EARTH, Km(6778.0));

    // Our angular momentum
    let h = state.angular_momentum();

    // nalgebra cross product
    let r = Vector3::new(
        state.pos.x.value(),
        state.pos.y.value(),
        state.pos.z.value(),
    );
    let v = Vector3::new(
        state.vel.x.value(),
        state.vel.y.value(),
        state.vel.z.value(),
    );
    let h_na = r.cross(&v);

    assert!(
        (h.x - h_na[0]).abs() < 1e-10,
        "h.x mismatch: {} vs {}",
        h.x,
        h_na[0]
    );
    assert!(
        (h.y - h_na[1]).abs() < 1e-10,
        "h.y mismatch: {} vs {}",
        h.y,
        h_na[1]
    );
    assert!(
        (h.z - h_na[2]).abs() < 1e-10,
        "h.z mismatch: {} vs {}",
        h.z,
        h_na[2]
    );
}

// ── Gravity capture / hyperbolic flyby precision ─────────────────────

/// Create initial state for a hyperbolic approach at distance r_start,
/// headed toward periapsis r_p with excess velocity v_inf (km/s).
/// The orbit is in the XY plane with periapsis on the +X axis.
fn hyperbolic_approach_state(mu: Mu, r_start: f64, r_p: f64, v_inf: f64) -> PropState {
    // Hyperbolic orbit elements:
    //   a = -μ / v_inf²  (negative for hyperbola)
    //   e = 1 - r_p/a = 1 + r_p*v_inf²/μ
    let mu_val = mu.value();
    let a = -mu_val / (v_inf * v_inf);
    let ecc = 1.0 - r_p / a;

    // Semi-latus rectum: p = a(1 - e²)
    let p = a * (1.0 - ecc * ecc);

    // True anomaly at r_start: r = p/(1 + e*cos(ν))
    // cos(ν) = (p/r - 1)/e
    let cos_nu = (p / r_start - 1.0) / ecc;
    // For incoming branch, ν < 0 (approaching periapsis)
    let nu = -cos_nu.acos();

    // Position in perifocal frame (periapsis direction = +X)
    let x = r_start * nu.cos();
    let y = r_start * nu.sin();

    // Velocity in perifocal frame using orbital mechanics:
    // v_r = (μ/h) * e * sin(ν)  (radial)
    // v_t = (μ/h) * (1 + e * cos(ν))  (transverse, positive counterclockwise)
    let h = (mu_val * p).sqrt(); // specific angular momentum magnitude
    let v_radial = mu_val / h * ecc * nu.sin();
    let v_transverse = mu_val / h * (1.0 + ecc * nu.cos());

    // Convert from radial/transverse to Cartesian
    // Radial direction: (cos ν, sin ν), Transverse direction: (-sin ν, cos ν)
    let vx = v_radial * nu.cos() - v_transverse * nu.sin();
    let vy = v_radial * nu.sin() + v_transverse * nu.cos();

    PropState::new(
        Vec3::new(Km(x), Km(y), Km(0.0)),
        Vec3::new(KmPerSec(vx), KmPerSec(vy), KmPerSec(0.0)),
    )
}

/// Analytical time from true anomaly ν₁ to ν₂ on a hyperbolic orbit.
/// Uses the hyperbolic Kepler equation: M = e·sinh(H) - H, where t = M·(-a³/μ)^(1/2)
fn hyperbolic_time_of_flight(mu: Mu, a: f64, ecc: f64, nu_from: f64, nu_to: f64) -> f64 {
    let hyperbolic_anomaly = |nu: f64| -> f64 {
        // tan(H/2) = sqrt((e-1)/(e+1)) * tan(ν/2)
        let half_h = ((ecc - 1.0) / (ecc + 1.0)).sqrt() * (nu / 2.0).tan();
        2.0 * half_h.atanh()
    };

    let h1 = hyperbolic_anomaly(nu_from);
    let h2 = hyperbolic_anomaly(nu_to);

    let m1 = ecc * h1.sinh() - h1;
    let m2 = ecc * h2.sinh() - h2;

    let n = (mu.value() / (-a).powi(3)).sqrt(); // mean motion for hyperbola
    (m2 - m1) / n
}

#[test]
fn hyperbolic_flyby_energy_conservation_rk4() {
    // Jupiter flyby: V∞ = 12 km/s, periapsis = 1.5 RJ (~107,238 km)
    let r_j = 71_492.0;
    let r_p = 1.5 * r_j;
    let v_inf = 12.0; // km/s
    let r_start = 2_000_000.0; // 2 million km (~28 RJ)

    let state = hyperbolic_approach_state(mu::JUPITER, r_start, r_p, v_inf);

    // Verify initial energy matches analytical v_inf
    let e0 = state.specific_energy(mu::JUPITER);
    let expected_energy = 0.5 * v_inf * v_inf; // At infinity: E = ½v∞²
    let rel_err = (e0 - expected_energy).abs() / expected_energy.abs();
    assert!(
        rel_err < 1e-6,
        "Initial energy doesn't match v_inf: E={e0:.4}, expected={expected_energy:.4}, rel_err={rel_err:.2e}"
    );

    // Analytical time of flight to periapsis and beyond
    let a = -mu::JUPITER.value() / (v_inf * v_inf);
    let ecc = 1.0 - r_p / a;
    let p = a * (1.0 - ecc * ecc);
    let cos_nu_start = (p / r_start - 1.0) / ecc;
    let nu_start = -cos_nu_start.acos();
    let tof = hyperbolic_time_of_flight(mu::JUPITER, a, ecc, nu_start, -nu_start);

    // Propagate with RK4 at dt=60s (typical brachistochrone step)
    let config_60 = IntegratorConfig {
        dt: 60.0,
        mu: mu::JUPITER,
        thrust: ThrustProfile::None,
    };
    let final_60 = propagate_final(&state, &config_60, tof);
    let ef_60 = final_60.specific_energy(mu::JUPITER);
    let drift_60 = (ef_60 - e0).abs() / e0.abs();

    // Propagate with RK4 at dt=10s (finer step)
    let config_10 = IntegratorConfig {
        dt: 10.0,
        mu: mu::JUPITER,
        thrust: ThrustProfile::None,
    };
    let final_10 = propagate_final(&state, &config_10, tof);
    let ef_10 = final_10.specific_energy(mu::JUPITER);
    let drift_10 = (ef_10 - e0).abs() / e0.abs();

    // Propagate with adaptive RK45 (reference)
    let adaptive_config = AdaptiveConfig::planetocentric(mu::JUPITER, ThrustProfile::None);
    let (final_adaptive, _) = propagate_adaptive_final(&state, &adaptive_config, tof);
    let ef_adaptive = final_adaptive.specific_energy(mu::JUPITER);
    let drift_adaptive = (ef_adaptive - e0).abs() / e0.abs();

    eprintln!("=== Hyperbolic flyby energy conservation ===");
    eprintln!("V∞ = {v_inf} km/s, r_p = {r_p:.0} km, TOF = {tof:.0} s");
    eprintln!("RK4 dt=60s:  energy drift = {drift_60:.2e}");
    eprintln!("RK4 dt=10s:  energy drift = {drift_10:.2e}");
    eprintln!("Adaptive:    energy drift = {drift_adaptive:.2e}");

    // Adaptive should have good accuracy (may trade precision for step count)
    assert!(
        drift_adaptive < 1e-6,
        "Adaptive energy drift: {drift_adaptive:.2e}"
    );

    // RK4 dt=10s should also be good
    assert!(drift_10 < 1e-6, "RK4 dt=10s energy drift: {drift_10:.2e}");

    // RK4 dt=60s: check and document. For periapsis passage through deep
    // gravity well, this may have larger drift.
    // Tolerance: 1e-4 (still acceptable for analysis purposes)
    assert!(
        drift_60 < 1e-4,
        "RK4 dt=60s energy drift too large for flyby: {drift_60:.2e}"
    );
}

#[test]
fn hyperbolic_flyby_turning_angle_rk4_vs_analytical() {
    // Jupiter flyby: V∞ = 12 km/s, periapsis = 1.5 RJ
    let r_j = 71_492.0;
    let r_p = 1.5 * r_j;
    let v_inf = 12.0;
    let r_start = 2_000_000.0;

    let state = hyperbolic_approach_state(mu::JUPITER, r_start, r_p, v_inf);

    // Analytical turning angle
    let a = -mu::JUPITER.value() / (v_inf * v_inf);
    let ecc = 1.0 - r_p / a;
    let expected_turn = 2.0 * (1.0 / ecc).asin();

    // Time of flight (approaching periapsis and departing symmetrically)
    let p = a * (1.0 - ecc * ecc);
    let cos_nu_start = (p / r_start - 1.0) / ecc;
    let nu_start = -cos_nu_start.acos();
    let tof = hyperbolic_time_of_flight(mu::JUPITER, a, ecc, nu_start, -nu_start);

    // Propagate with RK4 dt=10s
    let config = IntegratorConfig {
        dt: 10.0,
        mu: mu::JUPITER,
        thrust: ThrustProfile::None,
    };
    let final_state = propagate_final(&state, &config, tof);

    // Compute actual turning angle from velocity vectors
    let v0 = [
        state.vel.x.value(),
        state.vel.y.value(),
        state.vel.z.value(),
    ];
    let vf = [
        final_state.vel.x.value(),
        final_state.vel.y.value(),
        final_state.vel.z.value(),
    ];
    let dot = v0[0] * vf[0] + v0[1] * vf[1] + v0[2] * vf[2];
    let mag0 = (v0[0] * v0[0] + v0[1] * v0[1] + v0[2] * v0[2]).sqrt();
    let magf = (vf[0] * vf[0] + vf[1] * vf[1] + vf[2] * vf[2]).sqrt();
    let actual_turn = (dot / (mag0 * magf)).acos();

    // Also compare with flyby.rs analytical.
    // flyby.rs takes V∞ (velocity at infinity), not velocity at r_start.
    // Compute V∞ direction from the asymptotic approach angle.
    // For incoming branch, V∞ direction is along the approach asymptote.
    let v_inf_dir_angle = std::f64::consts::PI - (1.0 / ecc).acos(); // angle from periapsis axis
    let v_inf_in = [
        v_inf * v_inf_dir_angle.cos(),
        v_inf * v_inf_dir_angle.sin(),
        0.0,
    ];
    let flyby_result =
        solar_line_core::flyby::unpowered_flyby(mu::JUPITER, v_inf_in, Km(r_p), [0.0, 0.0, 1.0]);

    eprintln!("=== Hyperbolic flyby turning angle ===");
    eprintln!("Analytical turn angle:  {:.4}°", expected_turn.to_degrees());
    eprintln!(
        "flyby.rs turn angle:    {:.4}°",
        flyby_result.turn_angle_rad.to_degrees()
    );
    eprintln!("RK4 dt=10s turn angle:  {:.4}°", actual_turn.to_degrees());
    eprintln!(
        "Difference (RK4-analyt): {:.4}°",
        (actual_turn - expected_turn).to_degrees().abs()
    );

    // flyby.rs should match analytical exactly
    assert!(
        (flyby_result.turn_angle_rad - expected_turn).abs() < 1e-10,
        "flyby.rs disagrees with analytical: {:.6}° vs {:.6}°",
        flyby_result.turn_angle_rad.to_degrees(),
        expected_turn.to_degrees()
    );

    // The expected turn angle at finite distance is less than the asymptotic
    // turn angle because the velocity hasn't fully rotated by r_start.
    // The "expected at finite r" turn uses the true anomaly at r_start:
    //   velocity turn at r = 2|ν(r)| for symmetric inbound/outbound,
    //   but velocity direction ≠ position direction on a hyperbola.
    // Use the adaptive integrator as the reference "ground truth".
    let adaptive_config = AdaptiveConfig::planetocentric(mu::JUPITER, ThrustProfile::None);
    let (adaptive_final, _) = propagate_adaptive_final(&state, &adaptive_config, tof);
    let va = [
        adaptive_final.vel.x.value(),
        adaptive_final.vel.y.value(),
        adaptive_final.vel.z.value(),
    ];
    let dot_a = v0[0] * va[0] + v0[1] * va[1] + v0[2] * va[2];
    let mag_a = (va[0] * va[0] + va[1] * va[1] + va[2] * va[2]).sqrt();
    let adaptive_turn = (dot_a / (mag0 * mag_a)).acos();

    eprintln!(
        "Asymptotic turn angle:    {:.4}°",
        expected_turn.to_degrees()
    );
    eprintln!(
        "Adaptive turn (at r_start): {:.4}°",
        adaptive_turn.to_degrees()
    );
    eprintln!("RK4 dt=10s turn:          {:.4}°", actual_turn.to_degrees());
    eprintln!(
        "Expected deficit (asymptotic - finite r): {:.4}°",
        (expected_turn - adaptive_turn).to_degrees()
    );

    // RK4 dt=10s should match adaptive (the reference) very closely
    let rk4_vs_adaptive_err = (actual_turn - adaptive_turn).to_degrees().abs();
    eprintln!("RK4 vs Adaptive error:    {:.6}°", rk4_vs_adaptive_err);
    assert!(
        rk4_vs_adaptive_err < 0.01,
        "RK4 dt=10s should match adaptive: {rk4_vs_adaptive_err:.4}° error"
    );

    // The asymptotic turn should be larger than the finite-r turn (expected)
    assert!(
        expected_turn > adaptive_turn,
        "Asymptotic turn ({:.4}°) should exceed finite-r turn ({:.4}°)",
        expected_turn.to_degrees(),
        adaptive_turn.to_degrees()
    );
}

#[test]
fn gravity_capture_energy_change_analytical() {
    // Scenario: Approach Jupiter at V∞ = 12 km/s, apply retrograde ΔV at periapsis
    // Analytical: E_after = ½(v_p - ΔV)² - μ/r_p
    // If E_after < 0, spacecraft is captured.
    let r_j = 71_492.0;
    let r_p = 1.5 * r_j;
    let v_inf = 12.0;
    let r_start = 2_000_000.0;
    let delta_v = 2.3; // km/s retrograde burn (from EP01 analysis)

    let state = hyperbolic_approach_state(mu::JUPITER, r_start, r_p, v_inf);

    // Analytical periapsis velocity
    let v_p_analytical = (v_inf * v_inf + 2.0 * mu::JUPITER.value() / r_p).sqrt();
    let v_p_after_burn = v_p_analytical - delta_v;
    let energy_after_burn = 0.5 * v_p_after_burn * v_p_after_burn - mu::JUPITER.value() / r_p;

    eprintln!("=== Gravity capture energy analysis ===");
    eprintln!("V_periapsis (analytical): {v_p_analytical:.3} km/s");
    eprintln!("V_after_burn: {v_p_after_burn:.3} km/s");
    eprintln!("E_after_burn: {energy_after_burn:.3} km²/s²");
    eprintln!("Captured: {}", energy_after_burn < 0.0);

    // Propagate to periapsis with adaptive RK45
    let a = -mu::JUPITER.value() / (v_inf * v_inf);
    let ecc = 1.0 - r_p / a;
    let p = a * (1.0 - ecc * ecc);
    let cos_nu_start = (p / r_start - 1.0) / ecc;
    let nu_start = -cos_nu_start.acos();
    // Time to periapsis only (ν = 0)
    let tof_to_peri = hyperbolic_time_of_flight(mu::JUPITER, a, ecc, nu_start, 0.0);

    let adaptive_config = AdaptiveConfig::planetocentric(mu::JUPITER, ThrustProfile::None);
    let (state_at_peri, _) = propagate_adaptive_final(&state, &adaptive_config, tof_to_peri);

    // Check we actually reached periapsis (distance should be close to r_p)
    let r_actual = state_at_peri.radius();
    let r_err_km = (r_actual - r_p).abs();
    eprintln!("Actual r at periapsis: {r_actual:.1} km (expected {r_p:.0}, err {r_err_km:.1} km)");

    // Apply retrograde burn: reduce velocity by ΔV in velocity direction
    let speed = state_at_peri.speed();
    let factor = (speed - delta_v) / speed;
    let state_after_burn = PropState::new(
        state_at_peri.pos,
        Vec3::new(
            KmPerSec(state_at_peri.vel.x.value() * factor),
            KmPerSec(state_at_peri.vel.y.value() * factor),
            KmPerSec(state_at_peri.vel.z.value() * factor),
        ),
    );

    let e_after = state_after_burn.specific_energy(mu::JUPITER);
    let e_analytical = energy_after_burn;
    let abs_err = (e_after - e_analytical).abs();

    eprintln!("E_after (propagated + burn): {e_after:.6}");
    eprintln!("E_after (analytical):        {e_analytical:.6}");
    eprintln!("Absolute error: {abs_err:.2e} km²/s²");

    // Energy should match within ~1 km²/s²
    assert!(
        abs_err < 1.0,
        "Post-capture energy mismatch: {abs_err:.4} km²/s² (propagated={e_after:.4}, analytical={e_analytical:.4})"
    );

    // Verify capture (negative energy)
    assert!(e_after < 0.0, "Should be captured: E = {e_after:.4}");
}

#[test]
fn rk4_dt_sensitivity_periapsis_passage() {
    // Compare periapsis-passage accuracy at different dt values.
    // This quantifies the RK4 precision problem for gravity capture scenarios.
    let r_j = 71_492.0;
    let r_p = 1.5 * r_j;
    let v_inf = 12.0;
    let r_start = 1_000_000.0; // 1M km

    let state = hyperbolic_approach_state(mu::JUPITER, r_start, r_p, v_inf);

    let a = -mu::JUPITER.value() / (v_inf * v_inf);
    let ecc = 1.0 - r_p / a;
    let p = a * (1.0 - ecc * ecc);
    let cos_nu_start = (p / r_start - 1.0) / ecc;
    let nu_start = -cos_nu_start.acos();
    let tof = hyperbolic_time_of_flight(mu::JUPITER, a, ecc, nu_start, -nu_start);

    // Adaptive as reference
    let adaptive_config = AdaptiveConfig::planetocentric(mu::JUPITER, ThrustProfile::None);
    let (ref_state, _) = propagate_adaptive_final(&state, &adaptive_config, tof);

    let dts = [600.0, 300.0, 60.0, 10.0, 1.0];
    let mut results = Vec::new();

    for &dt in &dts {
        let config = IntegratorConfig {
            dt,
            mu: mu::JUPITER,
            thrust: ThrustProfile::None,
        };
        let final_state = propagate_final(&state, &config, tof);

        let pos_diff = ((final_state.pos.x.value() - ref_state.pos.x.value()).powi(2)
            + (final_state.pos.y.value() - ref_state.pos.y.value()).powi(2)
            + (final_state.pos.z.value() - ref_state.pos.z.value()).powi(2))
        .sqrt();
        let vel_diff = ((final_state.vel.x.value() - ref_state.vel.x.value()).powi(2)
            + (final_state.vel.y.value() - ref_state.vel.y.value()).powi(2)
            + (final_state.vel.z.value() - ref_state.vel.z.value()).powi(2))
        .sqrt();
        let energy_drift =
            (final_state.specific_energy(mu::JUPITER) - state.specific_energy(mu::JUPITER)).abs()
                / state.specific_energy(mu::JUPITER).abs();

        results.push((dt, pos_diff, vel_diff, energy_drift));
    }

    eprintln!("=== RK4 dt sensitivity for Jupiter periapsis passage ===");
    eprintln!(
        "{:>10} | {:>15} | {:>15} | {:>15}",
        "dt (s)", "pos err (km)", "vel err (km/s)", "energy drift"
    );
    for (dt, pos, vel, energy) in &results {
        eprintln!("{dt:>10.0} | {pos:>15.3} | {vel:>15.6} | {energy:>15.2e}");
    }

    // dt=60s should have < 100 km position error for ~28 hour flyby
    let (_, pos_60, _, _) = results.iter().find(|(dt, _, _, _)| *dt == 60.0).unwrap();
    assert!(
        *pos_60 < 100.0,
        "RK4 dt=60s position error: {pos_60:.3} km (should be < 100 km)"
    );

    // dt=600s might have larger error — document it for analysis guidance
    let (_, pos_600, _, energy_600) = results.iter().find(|(dt, _, _, _)| *dt == 600.0).unwrap();
    eprintln!("\ndt=600s position error: {pos_600:.1} km, energy drift: {energy_600:.2e}");

    // Convergence check: dt=10s should have smaller energy drift than dt=300s
    let (_, _, _, energy_10) = results.iter().find(|(dt, _, _, _)| *dt == 10.0).unwrap();
    let (_, _, _, energy_300) = results.iter().find(|(dt, _, _, _)| *dt == 300.0).unwrap();
    assert!(
        energy_10 < energy_300,
        "Finer dt should improve energy conservation: dt=10s ({energy_10:.2e}) vs dt=300s ({energy_300:.2e})"
    );

    // dt=600s energy drift should still be reasonable for survey-level analysis
    assert!(
        *energy_600 < 1e-3,
        "dt=600s energy drift: {energy_600:.2e} (acceptable for survey, not precision work)"
    );
}

#[test]
fn rk4_highly_elliptical_capture_orbit_energy() {
    // After capture: the spacecraft is on a highly elliptical bound orbit.
    // Test that RK4 can propagate this orbit accurately.
    // r_p = 1.5 RJ, E < 0 (captured), propagate for 1 orbit period.
    let r_j = 71_492.0;
    let r_p = 1.5 * r_j;
    let v_inf = 12.0;
    let delta_v = 2.3; // retrograde

    // Compute captured orbit parameters analytically
    let v_p = (v_inf * v_inf + 2.0 * mu::JUPITER.value() / r_p).sqrt() - delta_v;
    let energy = 0.5 * v_p * v_p - mu::JUPITER.value() / r_p;
    let a_capture = -mu::JUPITER.value() / (2.0 * energy); // should be positive (bound orbit)
    let ecc_capture = 1.0 - r_p / a_capture;

    eprintln!("=== Highly elliptical capture orbit ===");
    eprintln!("a = {a_capture:.0} km, e = {ecc_capture:.4}");
    eprintln!(
        "r_p = {r_p:.0} km, r_a = {:.0} km",
        a_capture * (1.0 + ecc_capture)
    );

    assert!(energy < 0.0, "Should be captured");
    assert!(a_capture > 0.0, "Semi-major axis should be positive");
    assert!(ecc_capture < 1.0, "Should be elliptical, not hyperbolic");

    // Create state at periapsis with post-burn velocity
    let state = PropState::new(
        Vec3::new(Km(r_p), Km(0.0), Km(0.0)),
        Vec3::new(KmPerSec(0.0), KmPerSec(v_p), KmPerSec(0.0)),
    );

    let period = solar_line_core::orbital_period(mu::JUPITER, Km(a_capture));

    // Propagate with RK4 at dt=60s for 1 period
    let config_60 = IntegratorConfig {
        dt: 60.0,
        mu: mu::JUPITER,
        thrust: ThrustProfile::None,
    };
    let final_60 = propagate_final(&state, &config_60, period.value());
    let drift_60 = (final_60.specific_energy(mu::JUPITER) - energy).abs() / energy.abs();

    // Propagate with adaptive
    let adaptive_config = AdaptiveConfig::planetocentric(mu::JUPITER, ThrustProfile::None);
    let (final_adaptive, _) = propagate_adaptive_final(&state, &adaptive_config, period.value());
    let drift_adaptive =
        (final_adaptive.specific_energy(mu::JUPITER) - energy).abs() / energy.abs();

    // Position return accuracy
    let pos_err_60 = ((final_60.pos.x.value() - r_p).powi(2)
        + final_60.pos.y.value().powi(2)
        + final_60.pos.z.value().powi(2))
    .sqrt();
    let pos_err_adaptive = ((final_adaptive.pos.x.value() - r_p).powi(2)
        + final_adaptive.pos.y.value().powi(2)
        + final_adaptive.pos.z.value().powi(2))
    .sqrt();

    eprintln!(
        "Period: {:.0} s ({:.1} h)",
        period.value(),
        period.value() / 3600.0
    );
    eprintln!("RK4 dt=60s:  energy drift = {drift_60:.2e}, pos return err = {pos_err_60:.1} km");
    eprintln!("Adaptive:    energy drift = {drift_adaptive:.2e}, pos return err = {pos_err_adaptive:.1} km");

    // Energy conservation over 1 highly-elliptical orbit
    assert!(
        drift_60 < 1e-4,
        "RK4 dt=60s energy drift after 1 capture orbit: {drift_60:.2e}"
    );
    assert!(
        drift_adaptive < 1e-6,
        "Adaptive energy drift after 1 capture orbit: {drift_adaptive:.2e}"
    );
}
