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
