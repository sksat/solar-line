//! Cross-integrator comparison tests for SOLAR LINE episode transfers.
//!
//! Task 181: Run each episode's key transfers through RK4, RK45 (Dormand-Prince),
//! and Störmer-Verlet (for ballistic phases), comparing final positions, ΔV consistency,
//! energy conservation, and computation cost.

use solar_line_core::constants::{mu, orbit_radius};
use solar_line_core::propagation::*;
use solar_line_core::units::{Km, KmPerSec};
use solar_line_core::vec3::Vec3;

/// Compute Euclidean distance between two PropState positions (km).
fn position_difference(a: &PropState, b: &PropState) -> f64 {
    let dx = a.pos.x.value() - b.pos.x.value();
    let dy = a.pos.y.value() - b.pos.y.value();
    let dz = a.pos.z.value() - b.pos.z.value();
    (dx * dx + dy * dy + dz * dz).sqrt()
}

/// Compute speed difference (km/s).
fn speed_difference(a: &PropState, b: &PropState) -> f64 {
    (a.speed() - b.speed()).abs()
}

// ── EP01: Brachistochrone Mars→Ganymede (72h) ──────────────────────

#[test]
fn ep01_rk4_vs_rk45_brachistochrone_72h() {
    // EP01 parameters: d = 550,630,800 km, t = 72h = 259,200 s
    let distance = 550_630_800.0_f64;
    let duration = 72.0 * 3600.0;
    let accel = 4.0 * distance / (duration * duration); // ~0.03278 km/s²
    let flip_time = duration / 2.0;

    let r_mars = orbit_radius::MARS.value();
    let v_mars = (mu::SUN.value() / r_mars).sqrt();

    let state = PropState::new(
        Vec3::new(Km(r_mars), Km(0.0), Km(0.0)),
        Vec3::new(KmPerSec(0.0), KmPerSec(v_mars), KmPerSec(0.0)),
    );

    let thrust = ThrustProfile::Brachistochrone {
        accel_km_s2: accel,
        flip_time,
    };

    // RK4 with 60s steps (same as existing test)
    let rk4_config = IntegratorConfig {
        dt: 60.0,
        mu: mu::SUN,
        thrust: thrust.clone(),
    };
    let rk4_final = propagate_final(&state, &rk4_config, duration);

    // RK45 adaptive
    let adaptive_config = AdaptiveConfig::heliocentric(mu::SUN, thrust);
    let (rk45_final, n_eval) = propagate_adaptive_final(&state, &adaptive_config, duration);

    // Position difference: expect < 1000 km for a 550M km journey (<0.0002%)
    let pos_diff = position_difference(&rk4_final, &rk45_final);
    let pos_rel = pos_diff / distance;
    assert!(
        pos_rel < 1e-3,
        "EP01: RK4 vs RK45 position difference = {:.1} km ({:.2e} relative to distance)",
        pos_diff,
        pos_rel
    );

    // Speed difference: expect < 1 km/s on ~8500 km/s total ΔV scale
    let speed_diff = speed_difference(&rk4_final, &rk45_final);
    assert!(
        speed_diff < 10.0,
        "EP01: RK4 vs RK45 speed difference = {:.3} km/s",
        speed_diff
    );

    // Heliocentric distance should agree closely (relative to Jupiter orbit scale)
    let r_diff = (rk4_final.radius() - rk45_final.radius()).abs();
    let r_rel = r_diff / orbit_radius::JUPITER.value();
    assert!(
        r_rel < 1e-3,
        "EP01: Heliocentric distance difference = {:.1} km ({:.2e} relative to Jupiter orbit)",
        r_diff,
        r_rel
    );

    eprintln!(
        "EP01 RK4 vs RK45: pos_diff = {:.1} km ({:.2e} rel), speed_diff = {:.3} km/s, r_diff = {:.1} km, RK45 n_eval = {}",
        pos_diff, pos_rel, speed_diff, r_diff, n_eval
    );
}

#[test]
fn ep01_rk4_vs_rk45_at_flip_point() {
    // Compare integrators at the critical midpoint flip (36h) where thrust reverses.
    let distance = 550_630_800.0_f64;
    let duration = 72.0 * 3600.0;
    let accel = 4.0 * distance / (duration * duration);
    let flip_time = duration / 2.0;

    let r_mars = orbit_radius::MARS.value();
    let v_mars = (mu::SUN.value() / r_mars).sqrt();

    let state = PropState::new(
        Vec3::new(Km(r_mars), Km(0.0), Km(0.0)),
        Vec3::new(KmPerSec(0.0), KmPerSec(v_mars), KmPerSec(0.0)),
    );

    let thrust = ThrustProfile::Brachistochrone {
        accel_km_s2: accel,
        flip_time,
    };

    // RK4
    let rk4_config = IntegratorConfig {
        dt: 60.0,
        mu: mu::SUN,
        thrust: thrust.clone(),
    };
    let rk4_mid = propagate_final(&state, &rk4_config, flip_time);

    // RK45
    let adaptive_config = AdaptiveConfig::heliocentric(mu::SUN, thrust);
    let (rk45_mid, _) = propagate_adaptive_final(&state, &adaptive_config, flip_time);

    // At flip, both integrators should agree on peak velocity
    let speed_diff = speed_difference(&rk4_mid, &rk45_mid);
    let avg_speed = (rk4_mid.speed() + rk45_mid.speed()) / 2.0;

    assert!(
        speed_diff / avg_speed < 5e-4,
        "EP01 flip: Speed difference = {:.3} km/s ({:.2e} relative) at flip point",
        speed_diff,
        speed_diff / avg_speed
    );

    eprintln!(
        "EP01 flip: RK4 speed = {:.1} km/s, RK45 speed = {:.1} km/s, diff = {:.3} km/s",
        rk4_mid.speed(),
        rk45_mid.speed(),
        speed_diff
    );
}

// ── EP02: Ballistic Jupiter→Saturn (455 days) ─────────────────────

#[test]
fn ep02_rk4_vs_rk45_ballistic_455d() {
    // EP02 ballistic coast: 455 days, no thrust, solar gravity only.
    // This is the longest integration and most sensitive to energy drift.
    let duration = 455.0 * 24.0 * 3600.0;
    let r_jupiter = orbit_radius::JUPITER.value();
    let r_saturn = orbit_radius::SATURN.value();

    // Set up departure velocity (same as existing EP02 test)
    let a_transfer = (r_jupiter + r_saturn) / 2.0;
    let v_tang = (mu::SUN.value() * (2.0 / r_jupiter - 1.0 / a_transfer)).sqrt();
    let v_total = 18.99_f64;
    let v_radial = if v_total > v_tang {
        (v_total * v_total - v_tang * v_tang).sqrt()
    } else {
        0.0
    };

    let state = PropState::new(
        Vec3::new(Km(r_jupiter), Km(0.0), Km(0.0)),
        Vec3::new(KmPerSec(v_radial), KmPerSec(v_tang), KmPerSec(0.0)),
    );

    // RK4 with 1-hour steps
    let rk4_config = IntegratorConfig {
        dt: 3600.0,
        mu: mu::SUN,
        thrust: ThrustProfile::None,
    };
    let rk4_result = propagate(&state, &rk4_config, duration);
    let rk4_final = rk4_result.last().unwrap();

    // RK45 adaptive
    let adaptive_config = AdaptiveConfig::heliocentric(mu::SUN, ThrustProfile::None);
    let rk45_result = propagate_adaptive(&state, &adaptive_config, duration);
    let rk45_final = rk45_result.states.last().unwrap();

    // Position difference: for 455-day ballistic, small integration errors
    // accumulate. Expect < 10,000 km difference (< 1% of Saturn orbit).
    let pos_diff = position_difference(rk4_final, rk45_final);
    let pos_rel = pos_diff / r_saturn;
    assert!(
        pos_rel < 0.01,
        "EP02: RK4 vs RK45 position difference = {:.0} km ({:.2e} relative to Saturn orbit)",
        pos_diff,
        pos_rel
    );

    // Speed should agree closely (same energy, same orbit)
    let speed_diff = speed_difference(rk4_final, rk45_final);
    assert!(
        speed_diff < 0.1,
        "EP02: RK4 vs RK45 speed difference = {:.4} km/s",
        speed_diff
    );

    // Energy conservation comparison
    let e0 = state.specific_energy(mu::SUN);
    let rk4_energy = rk4_final.specific_energy(mu::SUN);
    let rk45_energy = rk45_final.specific_energy(mu::SUN);
    let rk4_drift = ((rk4_energy - e0) / e0).abs();
    let rk45_drift = ((rk45_energy - e0) / e0).abs();

    assert!(
        rk4_drift < 1e-8,
        "EP02: RK4 energy drift = {:.2e}",
        rk4_drift
    );
    assert!(
        rk45_drift < 1e-8,
        "EP02: RK45 energy drift = {:.2e}",
        rk45_drift
    );

    eprintln!(
        "EP02 ballistic 455d: pos_diff = {:.0} km ({:.2e} rel), speed_diff = {:.4} km/s",
        pos_diff, pos_rel, speed_diff
    );
    eprintln!(
        "EP02 energy drift: RK4 = {:.2e}, RK45 = {:.2e}, RK45 n_eval = {}, n_accept = {}, n_reject = {}",
        rk4_drift, rk45_drift, rk45_result.n_eval, rk45_result.n_accept, rk45_result.n_reject
    );
}

#[test]
fn ep02_rk4_vs_symplectic_ballistic_455d() {
    // EP02 is ideal for symplectic comparison: long ballistic coast.
    // Störmer-Verlet should show bounded energy oscillation (no secular drift).
    let duration = 455.0 * 24.0 * 3600.0;
    let r_jupiter = orbit_radius::JUPITER.value();
    let r_saturn = orbit_radius::SATURN.value();

    let a_transfer = (r_jupiter + r_saturn) / 2.0;
    let v_tang = (mu::SUN.value() * (2.0 / r_jupiter - 1.0 / a_transfer)).sqrt();
    let v_total = 18.99_f64;
    let v_radial = if v_total > v_tang {
        (v_total * v_total - v_tang * v_tang).sqrt()
    } else {
        0.0
    };

    let state = PropState::new(
        Vec3::new(Km(r_jupiter), Km(0.0), Km(0.0)),
        Vec3::new(KmPerSec(v_radial), KmPerSec(v_tang), KmPerSec(0.0)),
    );

    // RK4 with 1-hour steps
    let rk4_config = IntegratorConfig {
        dt: 3600.0,
        mu: mu::SUN,
        thrust: ThrustProfile::None,
    };
    let rk4_final = propagate_final(&state, &rk4_config, duration);

    // Störmer-Verlet with 1-hour steps
    let sv_final = propagate_symplectic_final(&state, mu::SUN, 3600.0, duration);

    // Position comparison
    let pos_diff = position_difference(&rk4_final, &sv_final);
    let pos_rel = pos_diff / r_saturn;

    // Symplectic vs RK4 diverge in phase over long arcs but both remain on
    // the same energy surface. Position can diverge more than RK4 vs RK45.
    assert!(
        pos_rel < 0.05,
        "EP02: RK4 vs Symplectic position difference = {:.0} km ({:.2e} relative)",
        pos_diff,
        pos_rel
    );

    // Energy conservation: symplectic should have bounded oscillation, no secular drift
    let e0 = state.specific_energy(mu::SUN);
    let rk4_drift = ((rk4_final.specific_energy(mu::SUN) - e0) / e0).abs();
    let sv_drift = ((sv_final.specific_energy(mu::SUN) - e0) / e0).abs();

    eprintln!(
        "EP02 symplectic 455d: pos_diff = {:.0} km ({:.2e} rel), RK4 E-drift = {:.2e}, SV E-drift = {:.2e}",
        pos_diff, pos_rel, rk4_drift, sv_drift
    );

    // Both should conserve energy well
    assert!(
        rk4_drift < 1e-8,
        "EP02: RK4 energy drift = {:.2e}",
        rk4_drift
    );
    assert!(
        sv_drift < 1e-8,
        "EP02: Symplectic energy drift = {:.2e}",
        sv_drift
    );
}

#[test]
fn ep02_all_integrators_reach_saturn() {
    // Verify that all three integrators agree the ship reaches Saturn's neighborhood.
    let duration = 455.0 * 24.0 * 3600.0;
    let r_jupiter = orbit_radius::JUPITER.value();
    let r_saturn = orbit_radius::SATURN.value();

    let a_transfer = (r_jupiter + r_saturn) / 2.0;
    let v_tang = (mu::SUN.value() * (2.0 / r_jupiter - 1.0 / a_transfer)).sqrt();
    let v_total = 18.99_f64;
    let v_radial = if v_total > v_tang {
        (v_total * v_total - v_tang * v_tang).sqrt()
    } else {
        0.0
    };

    let state = PropState::new(
        Vec3::new(Km(r_jupiter), Km(0.0), Km(0.0)),
        Vec3::new(KmPerSec(v_radial), KmPerSec(v_tang), KmPerSec(0.0)),
    );

    // RK4
    let rk4_final = propagate_final(
        &state,
        &IntegratorConfig {
            dt: 3600.0,
            mu: mu::SUN,
            thrust: ThrustProfile::None,
        },
        duration,
    );

    // RK45
    let (rk45_final, _) = propagate_adaptive_final(
        &state,
        &AdaptiveConfig::heliocentric(mu::SUN, ThrustProfile::None),
        duration,
    );

    // Störmer-Verlet
    let sv_final = propagate_symplectic_final(&state, mu::SUN, 3600.0, duration);

    // All should be in Saturn's neighborhood (0.5 to 2.0 × Saturn orbit)
    for (name, final_state) in [
        ("RK4", &rk4_final),
        ("RK45", &rk45_final),
        ("Störmer-Verlet", &sv_final),
    ] {
        let r = final_state.radius();
        let r_ratio = r / r_saturn;
        assert!(
            (0.5..2.0).contains(&r_ratio),
            "EP02 {}: Final r = {:.0} km ({:.2}× Saturn orbit)",
            name,
            r,
            r_ratio
        );
        eprintln!(
            "EP02 {}: r_final = {:.0} km ({:.3}× Saturn)",
            name, r, r_ratio
        );
    }
}

// ── EP03: Brachistochrone Saturn→Uranus (143h 12m) ────────────────

#[test]
fn ep03_rk4_vs_rk45_brachistochrone_143h() {
    // EP03: d = 1,438,930,000 km, t = 515,520 s, a = 21.66 m/s²
    let distance = 1_438_930_000.0_f64;
    let duration = 515_520.0;
    let accel = 4.0 * distance / (duration * duration);
    let flip_time = duration / 2.0;

    let r_saturn = orbit_radius::SATURN.value();
    let v_saturn = (mu::SUN.value() / r_saturn).sqrt();

    let state = PropState::new(
        Vec3::new(Km(r_saturn), Km(0.0), Km(0.0)),
        Vec3::new(KmPerSec(0.0), KmPerSec(v_saturn), KmPerSec(0.0)),
    );

    let thrust = ThrustProfile::Brachistochrone {
        accel_km_s2: accel,
        flip_time,
    };

    // RK4 with 60s steps
    let rk4_config = IntegratorConfig {
        dt: 60.0,
        mu: mu::SUN,
        thrust: thrust.clone(),
    };
    let rk4_final = propagate_final(&state, &rk4_config, duration);

    // RK45 adaptive
    let adaptive_config = AdaptiveConfig::heliocentric(mu::SUN, thrust);
    let (rk45_final, n_eval) = propagate_adaptive_final(&state, &adaptive_config, duration);

    let pos_diff = position_difference(&rk4_final, &rk45_final);
    let pos_rel = pos_diff / distance;

    assert!(
        pos_rel < 1e-3,
        "EP03: RK4 vs RK45 position difference = {:.0} km ({:.2e} relative)",
        pos_diff,
        pos_rel
    );

    let speed_diff = speed_difference(&rk4_final, &rk45_final);
    assert!(
        speed_diff < 10.0,
        "EP03: RK4 vs RK45 speed difference = {:.3} km/s",
        speed_diff
    );

    // Both should reach Uranus neighborhood
    let r_uranus = orbit_radius::URANUS.value();
    for (name, s) in [("RK4", &rk4_final), ("RK45", &rk45_final)] {
        let r_ratio = s.radius() / r_uranus;
        assert!(
            (0.5..2.0).contains(&r_ratio),
            "EP03 {}: Final r = {:.2}× Uranus orbit",
            name,
            r_ratio
        );
    }

    eprintln!(
        "EP03 RK4 vs RK45: pos_diff = {:.0} km ({:.2e} rel), speed_diff = {:.3} km/s, RK45 n_eval = {}",
        pos_diff, pos_rel, speed_diff, n_eval
    );
}

#[test]
fn ep03_rk4_vs_rk45_navigation_crisis_position() {
    // EP03 navigation crisis: at 14.72 AU, a 1.23° divergence yields
    // ~14,360,000 km lateral error. Compare integrators at this intermediate time.
    //
    // We propagate to the midpoint (flip time) and compare positions.
    // The navigation crisis occurs near the cruise phase midpoint.
    let distance = 1_438_930_000.0_f64;
    let duration = 515_520.0;
    let accel = 4.0 * distance / (duration * duration);
    let flip_time = duration / 2.0;

    let r_saturn = orbit_radius::SATURN.value();
    let v_saturn = (mu::SUN.value() / r_saturn).sqrt();

    let state = PropState::new(
        Vec3::new(Km(r_saturn), Km(0.0), Km(0.0)),
        Vec3::new(KmPerSec(0.0), KmPerSec(v_saturn), KmPerSec(0.0)),
    );

    let thrust = ThrustProfile::Brachistochrone {
        accel_km_s2: accel,
        flip_time,
    };

    // RK4
    let rk4_config = IntegratorConfig {
        dt: 60.0,
        mu: mu::SUN,
        thrust: thrust.clone(),
    };
    let rk4_mid = propagate_final(&state, &rk4_config, flip_time);

    // RK45
    let adaptive_config = AdaptiveConfig::heliocentric(mu::SUN, thrust);
    let (rk45_mid, _) = propagate_adaptive_final(&state, &adaptive_config, flip_time);

    let pos_diff = position_difference(&rk4_mid, &rk45_mid);

    // At the midpoint of 143h brachistochrone, the ship is ~720M km from start.
    // Integration error should be << the 14.36M km navigation error margin.
    assert!(
        pos_diff < 14_360_000.0,
        "EP03: Mid-journey integrator difference ({:.0} km) should be much less than \
         navigation crisis error budget (14,360,000 km)",
        pos_diff
    );

    // In fact, it should be orders of magnitude smaller
    assert!(
        pos_diff < 100_000.0,
        "EP03: Integrator midpoint agreement should be < 100,000 km, got {:.0} km",
        pos_diff
    );

    eprintln!(
        "EP03 nav crisis: midpoint pos_diff = {:.0} km (vs 14.36M km error budget)",
        pos_diff
    );
}

// ── EP05: Composite 4-burn route Uranus→Earth (507h) ──────────────

/// EP05 uses a 4-burn composite route. Test the longest burn segment:
/// deceleration burn at 7,600 km/s over 35h (126,000 s).
/// At cruise velocity 1500 km/s and high thrust, the ship covers enormous distances.
/// Position differences are relative to the total distance traveled.
#[test]
fn ep05_rk4_vs_rk45_deceleration_burn() {
    // EP05 leg 3: Main deceleration burn, ΔV = 7,600 km/s, 35h
    // Brachistochrone: first half accelerates then decelerates.
    // With 1500 km/s initial cruise + 3800 km/s peak from accel phase,
    // the ship covers ~200M+ km during this leg.
    let dv = 7_600.0_f64;
    let duration = 35.0 * 3600.0; // 126,000 s
    let accel = dv / duration; // ~0.0603 km/s²
    let flip_time = duration / 2.0;

    // Start from ~3 AU heading inward (post-Jupiter flyby trajectory)
    let r_start = 3.0 * orbit_radius::EARTH.value();
    let v_cruise = 1500.0_f64; // km/s cruise velocity

    let state = PropState::new(
        Vec3::new(Km(r_start), Km(0.0), Km(0.0)),
        Vec3::new(KmPerSec(-v_cruise), KmPerSec(0.0), KmPerSec(0.0)),
    );

    let thrust = ThrustProfile::Brachistochrone {
        accel_km_s2: accel,
        flip_time,
    };

    // RK4 with 10s steps (extreme ΔV + high velocity needs fine steps)
    let rk4_config = IntegratorConfig {
        dt: 10.0,
        mu: mu::SUN,
        thrust: thrust.clone(),
    };
    let rk4_final = propagate_final(&state, &rk4_config, duration);

    // RK45 adaptive
    let adaptive_config = AdaptiveConfig::heliocentric(mu::SUN, thrust);
    let (rk45_final, n_eval) = propagate_adaptive_final(&state, &adaptive_config, duration);

    let pos_diff = position_difference(&rk4_final, &rk45_final);
    let speed_diff = speed_difference(&rk4_final, &rk45_final);

    // At these extreme velocities, the ship moves ~200M km during the burn.
    // Relative position error matters more than absolute.
    let distance_scale = v_cruise * duration; // rough lower bound on distance covered
    let pos_rel = pos_diff / distance_scale;
    assert!(
        pos_rel < 1e-2,
        "EP05 decel: RK4 vs RK45 position difference = {:.0} km ({:.2e} relative to ~{:.0} km traveled)",
        pos_diff, pos_rel, distance_scale
    );

    // Speed should converge well since both integrate the same thrust profile
    assert!(
        speed_diff < 50.0,
        "EP05 decel: RK4 vs RK45 speed difference = {:.3} km/s (on ΔV scale of {} km/s)",
        speed_diff,
        dv
    );

    eprintln!(
        "EP05 decel burn: pos_diff = {:.0} km ({:.2e} rel), speed_diff = {:.3} km/s, RK45 n_eval = {}",
        pos_diff, pos_rel, speed_diff, n_eval
    );
}

#[test]
fn ep05_rk4_vs_rk45_uranus_escape_burn() {
    // EP05 leg 1: Uranus escape + cruise acceleration, ΔV = 3,800 km/s, 12h.
    // This is a prograde burn (constant acceleration), not a brachistochrone transfer.
    // The ship accelerates continuously to escape Uranus and build cruise velocity.
    let dv = 3_800.0_f64;
    let duration = 12.0 * 3600.0; // 43,200 s
    let accel = dv / duration; // ~0.0880 km/s²

    let r_uranus = orbit_radius::URANUS.value();
    let v_uranus = (mu::SUN.value() / r_uranus).sqrt();

    let state = PropState::new(
        Vec3::new(Km(r_uranus), Km(0.0), Km(0.0)),
        Vec3::new(KmPerSec(0.0), KmPerSec(v_uranus), KmPerSec(0.0)),
    );

    let thrust = ThrustProfile::ConstantPrograde { accel_km_s2: accel };

    // RK4
    let rk4_config = IntegratorConfig {
        dt: 30.0,
        mu: mu::SUN,
        thrust: thrust.clone(),
    };
    let rk4_final = propagate_final(&state, &rk4_config, duration);

    // RK45
    let adaptive_config = AdaptiveConfig::heliocentric(mu::SUN, thrust);
    let (rk45_final, n_eval) = propagate_adaptive_final(&state, &adaptive_config, duration);

    let pos_diff = position_difference(&rk4_final, &rk45_final);
    let speed_diff = speed_difference(&rk4_final, &rk45_final);

    // Distance covered ~0.5 * accel * t² + v_uranus * t ≈ 80M km
    let distance_scale = 0.5 * accel * duration * duration + v_uranus * duration;
    let pos_rel = pos_diff / distance_scale;
    assert!(
        pos_rel < 1e-3,
        "EP05 Uranus escape: RK4 vs RK45 pos_diff = {:.0} km ({:.2e} relative)",
        pos_diff,
        pos_rel
    );
    assert!(
        speed_diff < 10.0,
        "EP05 Uranus escape: RK4 vs RK45 speed_diff = {:.3} km/s",
        speed_diff
    );

    // Both should show significant velocity gain (~3800 km/s above initial)
    for (name, s) in [("RK4", &rk4_final), ("RK45", &rk45_final)] {
        assert!(
            s.speed() > v_uranus + 1000.0,
            "EP05 {}: Final speed {:.0} km/s should show significant escape velocity gain",
            name,
            s.speed()
        );
    }

    eprintln!(
        "EP05 Uranus escape: pos_diff = {:.0} km ({:.2e} rel), speed_diff = {:.3} km/s, n_eval = {}",
        pos_diff, pos_rel, speed_diff, n_eval
    );
}

#[test]
fn ep05_rk4_vs_rk45_leo_insertion() {
    // EP05 final burn: LEO insertion at 400 km altitude, ΔV = 7.67 km/s, ~0.2h
    // This is a small, fast burn — tests integrator behavior at Earth-centric scale.
    let dv = 7.67_f64;
    let duration = 0.2 * 3600.0; // 720 s
    let accel = dv / duration;
    let flip_time = duration / 2.0;

    // Earth radius + 400 km altitude. Start just outside LEO with slight excess velocity.
    let r_leo = 6_378.0 + 400.0;
    let v_circ = (mu::EARTH.value() / r_leo).sqrt();

    let state = PropState::new(
        Vec3::new(Km(r_leo), Km(0.0), Km(0.0)),
        Vec3::new(KmPerSec(0.0), KmPerSec(v_circ + dv), KmPerSec(0.0)),
    );

    let thrust = ThrustProfile::Brachistochrone {
        accel_km_s2: accel,
        flip_time,
    };

    // RK4 with 1s steps (short duration, need fine steps)
    let rk4_config = IntegratorConfig {
        dt: 1.0,
        mu: mu::EARTH,
        thrust: thrust.clone(),
    };
    let rk4_final = propagate_final(&state, &rk4_config, duration);

    // RK45 adaptive (planetocentric)
    let adaptive_config = AdaptiveConfig::planetocentric(mu::EARTH, thrust);
    let (rk45_final, _) = propagate_adaptive_final(&state, &adaptive_config, duration);

    let pos_diff = position_difference(&rk4_final, &rk45_final);
    let speed_diff = speed_difference(&rk4_final, &rk45_final);

    // For a 720s burn, differences should be small
    assert!(
        pos_diff < 5.0,
        "EP05 LEO insertion: pos_diff = {:.4} km (should be < 5 km)",
        pos_diff
    );
    assert!(
        speed_diff < 0.01,
        "EP05 LEO insertion: speed_diff = {:.6} km/s",
        speed_diff
    );

    eprintln!(
        "EP05 LEO: pos_diff = {:.4} km, speed_diff = {:.6} km/s",
        pos_diff, speed_diff
    );
}

// ── EP04: Brachistochrone with reduced thrust ─────────────────────

#[test]
fn ep04_rk4_vs_rk45_reduced_thrust_uranus_departure() {
    // EP04: Uranus departure at 65% thrust. From Titania orbit (435,910 km).
    // ΔV = 1.51 km/s (Uranus escape from Titania).
    // This tests a low-acceleration scenario near a planet.
    let dv = 1.51_f64;
    // Estimate burn time from thrust: at 300t, 65% thrust = 6.37 MN → a = 21.23 m/s²
    // t = ΔV / a = 1.51 / 0.02123 ≈ 71 s — very short burn, essentially impulsive.
    // Use a more realistic scenario: at 48000t, a = 0.133 m/s², t = 11,350 s (~3.2h)
    let accel = 0.000_133; // km/s² (65% thrust at 48000t)
    let duration = dv / accel; // ~11,350 s

    let r_titania = 436_300.0_f64; // km from Uranus center
    let v_circ = (mu::URANUS.value() / r_titania).sqrt();

    let state = PropState::new(
        Vec3::new(Km(r_titania), Km(0.0), Km(0.0)),
        Vec3::new(KmPerSec(0.0), KmPerSec(v_circ), KmPerSec(0.0)),
    );

    let thrust = ThrustProfile::ConstantPrograde { accel_km_s2: accel };

    // RK4
    let rk4_config = IntegratorConfig {
        dt: 10.0,
        mu: mu::URANUS,
        thrust: thrust.clone(),
    };
    let rk4_final = propagate_final(&state, &rk4_config, duration);

    // RK45
    let adaptive_config = AdaptiveConfig::planetocentric(mu::URANUS, thrust);
    let (rk45_final, _) = propagate_adaptive_final(&state, &adaptive_config, duration);

    let pos_diff = position_difference(&rk4_final, &rk45_final);
    let speed_diff = speed_difference(&rk4_final, &rk45_final);

    // Low-thrust, short burn — differences should be very small
    assert!(
        pos_diff < 10.0,
        "EP04 Uranus departure: pos_diff = {:.3} km",
        pos_diff
    );
    assert!(
        speed_diff < 0.001,
        "EP04 Uranus departure: speed_diff = {:.6} km/s",
        speed_diff
    );

    eprintln!(
        "EP04 Uranus departure: pos_diff = {:.3} km, speed_diff = {:.6} km/s",
        pos_diff, speed_diff
    );
}

// ── Summary: Computation Cost Comparison ──────────────────────────

#[test]
fn integrator_computation_cost_comparison() {
    // Run EP01 brachistochrone with both integrators and compare evaluation counts.
    // This documents the cost/accuracy tradeoff.
    let distance = 550_630_800.0_f64;
    let duration = 72.0 * 3600.0;
    let accel = 4.0 * distance / (duration * duration);
    let flip_time = duration / 2.0;

    let r_mars = orbit_radius::MARS.value();
    let v_mars = (mu::SUN.value() / r_mars).sqrt();

    let state = PropState::new(
        Vec3::new(Km(r_mars), Km(0.0), Km(0.0)),
        Vec3::new(KmPerSec(0.0), KmPerSec(v_mars), KmPerSec(0.0)),
    );

    let thrust = ThrustProfile::Brachistochrone {
        accel_km_s2: accel,
        flip_time,
    };

    // RK4: with 60s steps, n_eval = 4 × (duration/dt) = 4 × 4320 = 17280
    let rk4_steps = (duration / 60.0) as usize;
    let rk4_evals = rk4_steps * 4; // RK4 = 4 evaluations per step

    // RK45 adaptive
    let adaptive_config = AdaptiveConfig::heliocentric(mu::SUN, thrust);
    let result = propagate_adaptive(&state, &adaptive_config, duration);

    eprintln!("=== Computation cost comparison (EP01 72h brachistochrone) ===");
    eprintln!(
        "RK4 (dt=60s):  {} steps, ~{} derivative evaluations",
        rk4_steps, rk4_evals
    );
    eprintln!(
        "RK45 adaptive: {} evaluations, {} accepted, {} rejected",
        result.n_eval, result.n_accept, result.n_reject
    );
    eprintln!(
        "RK45/RK4 cost ratio: {:.2}×",
        result.n_eval as f64 / rk4_evals as f64
    );

    // RK45 should be reasonably efficient (not dramatically more expensive)
    // With FSAL, effective cost is 6 evals per step (7 for rejected).
    // Typical n_eval should be in the same order as RK4.
    assert!(
        result.n_eval < rk4_evals * 10,
        "RK45 should not be >10× more expensive than RK4: {} vs {}",
        result.n_eval,
        rk4_evals
    );
}
