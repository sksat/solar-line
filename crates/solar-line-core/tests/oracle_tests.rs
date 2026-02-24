//! Oracle tests: verify solar-line-core calculations against nalgebra
//! and known analytical solutions.
//!
//! These tests compare our hand-rolled implementations against trusted
//! external libraries (dev-dependencies only). They serve as accuracy
//! regression tests — if any tolerance is exceeded, it means our
//! implementation has drifted from known-good results.

use nalgebra::Vector3;
use solar_line_core::constants::{mu, orbit_radius};
use solar_line_core::kepler;
use solar_line_core::orbits;
use solar_line_core::units::{Eccentricity, Km, KmPerSec, Radians, Seconds};
use solar_line_core::vec3::Vec3;
use std::f64::consts::{FRAC_PI_2, FRAC_PI_4, PI, TAU};

// ── Vec3 vs nalgebra::Vector3 ───────────────────────────────────────

#[test]
fn vec3_dot_matches_nalgebra() {
    let cases = [
        ([3.0, 4.0, 0.0], [1.0, 0.0, 0.0]),
        ([1.0, 2.0, 3.0], [4.0, 5.0, 6.0]),
        ([-1.5, 2.7, -0.3], [0.8, -1.2, 4.5]),
        ([1e6, 2e6, 3e6], [4e6, 5e6, 6e6]),
    ];

    for (a, b) in &cases {
        let ours = Vec3::new(a[0], a[1], a[2]).dot_raw(Vec3::new(b[0], b[1], b[2]));
        let theirs = Vector3::new(a[0], a[1], a[2]).dot(&Vector3::new(b[0], b[1], b[2]));
        assert!(
            (ours - theirs).abs() < 1e-10,
            "dot mismatch: ours={ours}, nalgebra={theirs}"
        );
    }
}

#[test]
fn vec3_norm_matches_nalgebra() {
    let cases = [
        [3.0, 4.0, 0.0],
        [1.0, 1.0, 1.0],
        [1e8, 2e8, 3e8],
        [0.001, 0.002, 0.003],
    ];

    for v in &cases {
        let ours = Vec3::new(v[0], v[1], v[2]).norm_raw();
        let theirs = Vector3::new(v[0], v[1], v[2]).norm();
        let rel_err = if theirs.abs() > 0.0 {
            (ours - theirs).abs() / theirs
        } else {
            (ours - theirs).abs()
        };
        assert!(
            rel_err < 1e-14,
            "norm mismatch for {v:?}: ours={ours}, nalgebra={theirs}, rel_err={rel_err}"
        );
    }
}

#[test]
fn vec3_cross_product_matches_nalgebra() {
    // Our Vec3 doesn't have a direct cross product, but PropState.angular_momentum
    // computes r × v. Verify the math directly using f64 vectors.
    let cases = [
        ([1.0, 0.0, 0.0], [0.0, 1.0, 0.0]),
        ([3.0, -3.0, 1.0], [4.0, 9.0, 2.0]),
        ([-1.0, 2.0, -3.0], [4.0, -5.0, 6.0]),
    ];

    for (a, b) in &cases {
        // Manual cross product (matches our angular_momentum logic)
        let cross_x: f64 = a[1] * b[2] - a[2] * b[1];
        let cross_y: f64 = a[2] * b[0] - a[0] * b[2];
        let cross_z: f64 = a[0] * b[1] - a[1] * b[0];

        let na = Vector3::new(a[0], a[1], a[2]);
        let nb = Vector3::new(b[0], b[1], b[2]);
        let nc = na.cross(&nb);

        assert!((cross_x - nc[0]).abs() < 1e-14, "cross x mismatch");
        assert!((cross_y - nc[1]).abs() < 1e-14, "cross y mismatch");
        assert!((cross_z - nc[2]).abs() < 1e-14, "cross z mismatch");
    }
}

// ── Vis-viva equation ───────────────────────────────────────────────

#[test]
fn vis_viva_circular_orbit_earth() {
    // For a circular orbit, v = sqrt(μ/r)
    let mu_earth = mu::EARTH;
    let leo_radius = Km(6778.0); // ~400 km altitude

    let v = orbits::vis_viva(mu_earth, leo_radius, leo_radius);
    let v_expected = (mu_earth.value() / leo_radius.value()).sqrt();
    assert!(
        (v.value() - v_expected).abs() < 1e-10,
        "circular orbit vis-viva: got {}, expected {}",
        v.value(),
        v_expected
    );
    // ISS-like orbit should be ~7.67 km/s
    assert!(
        (v.value() - 7.67).abs() < 0.05,
        "LEO velocity should be ~7.67 km/s, got {}",
        v.value()
    );
}

#[test]
fn vis_viva_escape_velocity() {
    // Escape velocity: v_esc = sqrt(2μ/r) (semi-major axis → infinity, 1/a → 0)
    // vis_viva with a → very large should approach sqrt(2μ/r)
    let r = Km(6778.0);
    let a_huge = Km(1e15);
    let v = orbits::vis_viva(mu::EARTH, r, a_huge);
    let v_esc = (2.0 * mu::EARTH.value() / r.value()).sqrt();
    let rel_err = (v.value() - v_esc).abs() / v_esc;
    assert!(
        rel_err < 1e-6,
        "escape velocity: got {}, expected {}, rel_err={}",
        v.value(),
        v_esc,
        rel_err
    );
}

// ── Hohmann transfer: known Earth→Mars values ───────────────────────

#[test]
fn hohmann_earth_to_mars_dv_matches_textbook() {
    // Textbook Earth→Mars Hohmann transfer ΔV:
    //   ΔV₁ ≈ 2.94 km/s (departure), ΔV₂ ≈ 2.65 km/s (arrival)
    //   Total ≈ 5.59 km/s
    //   (using mean circular orbits)
    let (dv1, dv2) = orbits::hohmann_transfer_dv(mu::SUN, orbit_radius::EARTH, orbit_radius::MARS);
    let total = dv1.value() + dv2.value();

    assert!(
        (dv1.value() - 2.94).abs() < 0.1,
        "Earth departure ΔV: expected ~2.94, got {}",
        dv1.value()
    );
    assert!(
        (dv2.value() - 2.65).abs() < 0.1,
        "Mars arrival ΔV: expected ~2.65, got {}",
        dv2.value()
    );
    assert!(
        (total - 5.59).abs() < 0.15,
        "Total Hohmann ΔV: expected ~5.59, got {}",
        total
    );
}

#[test]
fn hohmann_earth_to_jupiter_dv() {
    // Earth→Jupiter Hohmann: ΔV₁ ≈ 8.79 km/s, ΔV₂ ≈ 5.64 km/s
    let (dv1, dv2) =
        orbits::hohmann_transfer_dv(mu::SUN, orbit_radius::EARTH, orbit_radius::JUPITER);

    assert!(
        (dv1.value() - 8.79).abs() < 0.15,
        "Jupiter departure ΔV: expected ~8.79, got {}",
        dv1.value()
    );
    assert!(
        (dv2.value() - 5.64).abs() < 0.15,
        "Jupiter arrival ΔV: expected ~5.64, got {}",
        dv2.value()
    );
}

// ── Orbital period: known values ────────────────────────────────────

#[test]
fn orbital_period_earth() {
    // Earth's orbital period ≈ 365.25 days
    let period = orbits::orbital_period(mu::SUN, orbit_radius::EARTH);
    let days = period.value() / 86400.0;
    assert!(
        (days - 365.25).abs() < 0.3,
        "Earth period: expected ~365.25 days, got {}",
        days
    );
}

#[test]
fn orbital_period_iss() {
    // ISS period ≈ 92.7 minutes
    let r = Km(6778.0);
    let period = orbits::orbital_period(mu::EARTH, r);
    let minutes = period.value() / 60.0;
    assert!(
        (minutes - 92.7).abs() < 1.0,
        "ISS period: expected ~92.7 min, got {}",
        minutes
    );
}

// ── Kepler equation: round-trip consistency ─────────────────────────

#[test]
fn kepler_round_trip_low_eccentricity() {
    // For various M values, solve Kepler → get E → compute M back.
    // Should round-trip to machine precision.
    let e = Eccentricity::new(0.0167).unwrap(); // Earth-like
    let test_ms = [0.0, 0.5, 1.0, PI / 2.0, PI, 3.0 * PI / 2.0, TAU - 0.01];

    for &m_val in &test_ms {
        let m = Radians(m_val);
        let solution = kepler::solve_kepler(m, e).expect("should converge");
        let m_back = kepler::eccentric_to_mean_anomaly(solution.eccentric_anomaly, e);

        // Compare modulo 2π
        let diff = (m.normalize().value() - m_back.normalize().value()).abs();
        let diff = if diff > PI { TAU - diff } else { diff };
        assert!(
            diff < 1e-12,
            "Kepler round-trip failed for M={m_val}: got back {}, diff={diff}",
            m_back.value()
        );
    }
}

#[test]
fn kepler_round_trip_high_eccentricity() {
    let e = Eccentricity::new(0.9).unwrap(); // Near-parabolic
    let test_ms = [0.1, 0.5, 1.0, PI / 2.0, PI, 2.5, TAU - 0.1];

    for &m_val in &test_ms {
        let m = Radians(m_val);
        let solution = kepler::solve_kepler(m, e).expect("should converge");
        let m_back = kepler::eccentric_to_mean_anomaly(solution.eccentric_anomaly, e);

        let diff = (m.normalize().value() - m_back.normalize().value()).abs();
        let diff = if diff > PI { TAU - diff } else { diff };
        assert!(
            diff < 1e-12,
            "High-e Kepler round-trip failed for M={m_val}: diff={diff}"
        );
    }
}

#[test]
fn kepler_anomaly_conversions_round_trip() {
    // true anomaly → eccentric anomaly → true anomaly should round-trip
    let eccs = [0.0, 0.1, 0.5, 0.8, 0.95];
    let true_anomalies = [0.0, FRAC_PI_4, FRAC_PI_2, PI, 3.0 * FRAC_PI_2, TAU - 0.1];

    for &e_val in &eccs {
        let e = Eccentricity::new(e_val).unwrap();
        for &nu_val in &true_anomalies {
            let nu = Radians(nu_val);
            let big_e = kepler::true_to_eccentric_anomaly(nu, e);
            let nu_back = kepler::eccentric_to_true_anomaly(big_e, e);

            let diff = (nu.normalize().value() - nu_back.normalize().value()).abs();
            let diff = if diff > PI { TAU - diff } else { diff };
            assert!(
                diff < 1e-10,
                "anomaly round-trip failed: e={e_val}, nu={nu_val}, got back {}, diff={diff}",
                nu_back.value()
            );
        }
    }
}

// ── Kepler equation: known analytical cases ─────────────────────────

#[test]
fn kepler_circular_orbit() {
    // For e=0, E = M exactly
    let e = Eccentricity::new(0.0).unwrap();
    let test_ms = [0.0, 1.0, PI, 5.0];

    for &m_val in &test_ms {
        let m = Radians(m_val);
        let solution = kepler::solve_kepler(m, e).expect("should converge");
        let diff = (solution.eccentric_anomaly.value() - m.normalize().value()).abs();
        assert!(
            diff < 1e-14,
            "For e=0, E should equal M: M={}, E={}, diff={diff}",
            m.normalize().value(),
            solution.eccentric_anomaly.value()
        );
    }
}

// ── Tsiolkovsky rocket equation ─────────────────────────────────────

#[test]
fn tsiolkovsky_mass_ratio_known_values() {
    // For ΔV = vₑ: mass ratio = e ≈ 2.718
    let ve = KmPerSec(10.0);
    let dv = KmPerSec(10.0);
    let mr = orbits::mass_ratio(dv, ve);
    assert!(
        (mr - std::f64::consts::E).abs() < 1e-10,
        "mass ratio for ΔV=vₑ should be e: got {}",
        mr
    );

    // For ΔV = 0: mass ratio = 1
    let mr_zero = orbits::mass_ratio(KmPerSec(0.0), ve);
    assert!(
        (mr_zero - 1.0).abs() < 1e-14,
        "mass ratio for ΔV=0 should be 1: got {}",
        mr_zero
    );
}

#[test]
fn tsiolkovsky_propellant_fraction_limits() {
    let ve = KmPerSec(10.0);

    // ΔV = 0 → propellant fraction = 0
    let pf_zero = orbits::propellant_fraction(KmPerSec(0.0), ve);
    assert!(
        pf_zero.abs() < 1e-14,
        "propellant fraction for ΔV=0 should be 0: got {}",
        pf_zero
    );

    // ΔV = vₑ → propellant fraction = 1 - 1/e ≈ 0.632
    let pf_one = orbits::propellant_fraction(KmPerSec(10.0), ve);
    let expected = 1.0 - 1.0 / std::f64::consts::E;
    assert!(
        (pf_one - expected).abs() < 1e-10,
        "propellant fraction for ΔV=vₑ: got {}, expected {}",
        pf_one,
        expected
    );

    // Large ΔV → propellant fraction → 1
    let pf_large = orbits::propellant_fraction(KmPerSec(100.0), ve);
    assert!(
        pf_large > 0.99,
        "propellant fraction for ΔV>>vₑ should approach 1: got {}",
        pf_large
    );
}

#[test]
fn exhaust_velocity_isp_conversion() {
    // Isp 300s → vₑ ≈ 2.942 km/s (chemical)
    let ve_300 = orbits::exhaust_velocity(300.0);
    let expected_300 = 300.0 * 9.80665 / 1000.0;
    assert!(
        (ve_300.value() - expected_300).abs() < 1e-10,
        "Isp 300s: got {} km/s, expected {}",
        ve_300.value(),
        expected_300
    );

    // Isp 3000s → vₑ ≈ 29.42 km/s (ion)
    let ve_3000 = orbits::exhaust_velocity(3000.0);
    let expected_3000 = 3000.0 * 9.80665 / 1000.0;
    assert!(
        (ve_3000.value() - expected_3000).abs() < 1e-10,
        "Isp 3000s: got {} km/s, expected {}",
        ve_3000.value(),
        expected_3000
    );
}

// ── Brachistochrone ─────────────────────────────────────────────────

#[test]
fn brachistochrone_accel_self_consistent() {
    // d = a*t²/4 (inverse of brachistochrone_accel formula)
    let d = Km(1e9); // 1 billion km
    let t = Seconds(86400.0 * 30.0); // 30 days

    let accel = orbits::brachistochrone_accel(d, t);
    let d_back = orbits::brachistochrone_max_distance(accel, t);

    assert!(
        (d.value() - d_back.value()).abs() / d.value() < 1e-12,
        "brachistochrone accel round-trip: d={}, d_back={}",
        d.value(),
        d_back.value()
    );

    // ΔV = a*t should match brachistochrone_dv
    let dv_from_accel = accel * t.value();
    let dv_formula = orbits::brachistochrone_dv(d, t);
    assert!(
        (dv_from_accel - dv_formula.value()).abs() < 1e-8,
        "brachistochrone ΔV consistency: a*t={}, formula={}",
        dv_from_accel,
        dv_formula.value()
    );
}

// ── Specific energy and angular momentum ────────────────────────────

#[test]
fn specific_energy_vis_viva_consistency() {
    // ε = v²/2 - μ/r = -μ/(2a)
    // These two forms should agree
    let mu_sun = mu::SUN;
    let r = orbit_radius::EARTH;
    let a = r; // Circular orbit

    let energy_from_a = orbits::specific_energy(mu_sun, a);
    let v = orbits::vis_viva(mu_sun, r, a);
    let energy_from_v = 0.5 * v.value() * v.value() - mu_sun.value() / r.value();

    let rel_err = (energy_from_a - energy_from_v).abs() / energy_from_a.abs();
    assert!(
        rel_err < 1e-12,
        "specific energy inconsistency: from a={}, from v={}, rel_err={}",
        energy_from_a,
        energy_from_v,
        rel_err
    );
}

#[test]
fn angular_momentum_circular_orbit() {
    // For circular orbit: h = r × v = r * v (perpendicular)
    let mu_earth = mu::EARTH;
    let r_val = 6778.0;
    let a = Km(r_val);
    let v = orbits::vis_viva(mu_earth, a, a); // circular

    let h_expected = r_val * v.value();
    let h = orbits::specific_angular_momentum(mu_earth, a, Eccentricity::new(0.0).unwrap());

    let rel_err = (h - h_expected).abs() / h_expected;
    assert!(
        rel_err < 1e-12,
        "angular momentum: expected {}, got {}, rel_err={}",
        h_expected,
        h,
        rel_err
    );
}

// ── Oberth effect sanity checks ─────────────────────────────────────

#[test]
fn oberth_gain_zero_for_no_burn() {
    // No burn → no Oberth gain
    let gain = orbits::oberth_dv_gain(
        mu::JUPITER,
        Km(71492.0), // Jupiter surface
        KmPerSec(10.0),
        KmPerSec(0.0),
    );
    assert!(
        gain.value().abs() < 1e-10,
        "Oberth gain for zero burn should be 0, got {}",
        gain.value()
    );
}

#[test]
fn oberth_gain_positive_for_deep_gravity_well() {
    // A burn deep in Jupiter's gravity well should produce positive Oberth gain
    let gain = orbits::oberth_dv_gain(
        mu::JUPITER,
        Km(71492.0 + 1000.0), // Just above Jupiter
        KmPerSec(5.0),        // 5 km/s hyperbolic excess
        KmPerSec(1.0),        // 1 km/s burn
    );
    assert!(
        gain.value() > 0.0,
        "Oberth gain should be positive, got {}",
        gain.value()
    );
}

// ── nalgebra vector comparison: larger-scale numerical test ─────────

#[test]
fn vec3_operations_bulk_nalgebra_comparison() {
    // Generate deterministic test vectors and compare operations
    let vectors: Vec<([f64; 3], [f64; 3])> = (0..100)
        .map(|i| {
            let i = i as f64;
            let a = [
                (i * 1.1).sin() * 1e6,
                (i * 2.3).cos() * 1e6,
                (i * 0.7).sin() * 1e6,
            ];
            let b = [
                (i * 3.1).cos() * 1e6,
                (i * 0.9).sin() * 1e6,
                (i * 1.7).cos() * 1e6,
            ];
            (a, b)
        })
        .collect();

    for (a, b) in &vectors {
        let our_a = Vec3::new(a[0], a[1], a[2]);
        let our_b = Vec3::new(b[0], b[1], b[2]);
        let na_a = Vector3::new(a[0], a[1], a[2]);
        let na_b = Vector3::new(b[0], b[1], b[2]);

        // Dot product
        let our_dot = our_a.dot_raw(our_b);
        let na_dot = na_a.dot(&na_b);
        assert!(
            (our_dot - na_dot).abs() < 1e-4, // Large values → allow small absolute error
            "Bulk dot mismatch: ours={our_dot}, nalgebra={na_dot}"
        );

        // Norm
        let our_norm_a = our_a.norm_raw();
        let na_norm_a = na_a.norm();
        let rel_err = (our_norm_a - na_norm_a).abs() / na_norm_a.max(1e-30);
        assert!(
            rel_err < 1e-14,
            "Bulk norm mismatch: ours={our_norm_a}, nalgebra={na_norm_a}"
        );
    }
}

// ── Hohmann transfer time ───────────────────────────────────────────

#[test]
fn hohmann_transfer_time_earth_mars() {
    // Transfer time = half the period of transfer ellipse
    // a_transfer = (r1 + r2) / 2
    let r1 = orbit_radius::EARTH.value();
    let r2 = orbit_radius::MARS.value();
    let a_t = (r1 + r2) / 2.0;
    let period = orbits::orbital_period(mu::SUN, Km(a_t));
    let transfer_time_days = period.value() / 2.0 / 86400.0;

    // Known: Earth→Mars Hohmann ≈ 259 days
    assert!(
        (transfer_time_days - 259.0).abs() < 5.0,
        "Earth→Mars Hohmann transfer time: expected ~259 days, got {}",
        transfer_time_days
    );
}

// ── Mean motion consistency ─────────────────────────────────────────

#[test]
fn mean_motion_matches_period() {
    // n = 2π/T, and T = orbital_period(mu, a)
    let a = orbit_radius::EARTH;
    let n = kepler::mean_motion(mu::SUN, a);
    let t = orbits::orbital_period(mu::SUN, a);
    let n_from_period = TAU / t.value();

    let rel_err = (n - n_from_period).abs() / n;
    assert!(
        rel_err < 1e-14,
        "mean motion inconsistency: direct={}, from period={}, rel_err={}",
        n,
        n_from_period,
        rel_err
    );
}
