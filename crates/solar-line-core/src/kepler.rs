/// Kepler equation solver and anomaly conversions.
///
/// The Kepler equation relates mean anomaly M to eccentric anomaly E:
///   M = E - e * sin(E)     (elliptical, e < 1)
///
/// This module provides Newton-Raphson iteration to solve for E given M,
/// and conversions between mean anomaly, eccentric anomaly, and true anomaly.
use crate::units::{Eccentricity, Mu, Radians, Seconds};

/// Result of Kepler equation solver.
#[derive(Debug, Clone, Copy)]
pub struct KeplerSolution {
    /// Eccentric anomaly (radians)
    pub eccentric_anomaly: Radians,
    /// Number of iterations used
    pub iterations: u32,
    /// Final residual |M - (E - e*sin(E))|
    pub residual: f64,
}

/// Default tolerance for Kepler equation solver
const DEFAULT_TOL: f64 = 1e-14;

/// Default maximum iterations for Kepler equation solver
const DEFAULT_MAX_ITER: u32 = 50;

/// Solve Kepler's equation M = E - e*sin(E) for eccentric anomaly E.
///
/// Uses Newton-Raphson iteration with a smart initial guess.
///
/// # Arguments
/// * `mean_anomaly` - Mean anomaly M (radians)
/// * `e` - Eccentricity (must be < 1 for elliptical orbits)
///
/// # Returns
/// `Ok(KeplerSolution)` on convergence, `Err` message if max iterations exceeded.
///
/// # Assumptions
/// - Elliptical orbit only (e < 1). For hyperbolic orbits, use a different solver.
pub fn solve_kepler(
    mean_anomaly: Radians,
    e: Eccentricity,
) -> Result<KeplerSolution, String> {
    solve_kepler_with_params(mean_anomaly, e, DEFAULT_TOL, DEFAULT_MAX_ITER)
}

/// Solve Kepler's equation with custom tolerance and iteration limit.
pub fn solve_kepler_with_params(
    mean_anomaly: Radians,
    e: Eccentricity,
    tol: f64,
    max_iter: u32,
) -> Result<KeplerSolution, String> {
    if !e.is_elliptical() {
        return Err(format!(
            "Kepler solver requires elliptical orbit (e < 1), got e={}",
            e.value()
        ));
    }

    let m = mean_anomaly.normalize().value();
    let ecc = e.value();

    // Initial guess: E₀ = M + e*sin(M) (good for low eccentricity)
    // For higher eccentricity, use a better initial guess
    let mut big_e = if ecc < 0.8 {
        m + ecc * m.sin()
    } else {
        // For high eccentricity, start from π when M is near π
        std::f64::consts::PI
    };

    for i in 0..max_iter {
        let sin_e = big_e.sin();
        let cos_e = big_e.cos();
        let f = big_e - ecc * sin_e - m;
        let f_prime = 1.0 - ecc * cos_e;

        // Guard against near-zero derivative (shouldn't happen for e < 1)
        if f_prime.abs() < 1e-30 {
            return Err("Kepler solver: derivative near zero".to_string());
        }

        let delta = f / f_prime;
        big_e -= delta;

        if delta.abs() < tol {
            let residual = (big_e - ecc * big_e.sin() - m).abs();
            return Ok(KeplerSolution {
                eccentric_anomaly: Radians(big_e),
                iterations: i + 1,
                residual,
            });
        }
    }

    Err(format!(
        "Kepler solver did not converge after {} iterations (e={}, M={})",
        max_iter, ecc, m
    ))
}

/// Convert eccentric anomaly to true anomaly.
///
/// tan(ν/2) = sqrt((1+e)/(1-e)) * tan(E/2)
pub fn eccentric_to_true_anomaly(big_e: Radians, e: Eccentricity) -> Radians {
    let ecc = e.value();
    let half_e = big_e.value() / 2.0;
    let half_nu = ((1.0 + ecc) / (1.0 - ecc)).sqrt() * half_e.tan();
    Radians(2.0 * half_nu.atan()).normalize()
}

/// Convert true anomaly to eccentric anomaly.
///
/// tan(E/2) = sqrt((1-e)/(1+e)) * tan(ν/2)
pub fn true_to_eccentric_anomaly(nu: Radians, e: Eccentricity) -> Radians {
    let ecc = e.value();
    let half_nu = nu.value() / 2.0;
    let half_e = ((1.0 - ecc) / (1.0 + ecc)).sqrt() * half_nu.tan();
    Radians(2.0 * half_e.atan()).normalize()
}

/// Convert eccentric anomaly to mean anomaly.
///
/// M = E - e*sin(E)
pub fn eccentric_to_mean_anomaly(big_e: Radians, e: Eccentricity) -> Radians {
    Radians(big_e.value() - e.value() * big_e.sin()).normalize()
}

/// Convert true anomaly to mean anomaly (via eccentric anomaly).
pub fn true_to_mean_anomaly(nu: Radians, e: Eccentricity) -> Radians {
    let big_e = true_to_eccentric_anomaly(nu, e);
    eccentric_to_mean_anomaly(big_e, e)
}

/// Convert mean anomaly to true anomaly (via Kepler equation solver).
pub fn mean_to_true_anomaly(
    mean_anomaly: Radians,
    e: Eccentricity,
) -> Result<Radians, String> {
    let solution = solve_kepler(mean_anomaly, e)?;
    Ok(eccentric_to_true_anomaly(solution.eccentric_anomaly, e))
}

/// Compute mean anomaly at a future time given initial mean anomaly,
/// mean motion n, and elapsed time Δt.
///
/// M(t) = M₀ + n * Δt
///
/// Mean motion n = sqrt(μ/a³)
pub fn mean_motion(mu: Mu, a: crate::units::Km) -> f64 {
    (mu.value() / a.value().powi(3)).sqrt()
}

/// Propagate mean anomaly forward by Δt seconds.
pub fn propagate_mean_anomaly(
    m0: Radians,
    n: f64,
    dt: Seconds,
) -> Radians {
    Radians(m0.value() + n * dt.value()).normalize()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f64::consts::{PI, TAU};

    #[test]
    fn test_kepler_circular_orbit() {
        // For e=0, E = M exactly
        let e = Eccentricity::elliptical(0.0).unwrap();
        let m = Radians(1.5);
        let sol = solve_kepler(m, e).unwrap();
        assert!(
            (sol.eccentric_anomaly.value() - 1.5).abs() < 1e-14,
            "E={}, expected 1.5",
            sol.eccentric_anomaly.value()
        );
        assert_eq!(sol.iterations, 1); // Should converge immediately
    }

    #[test]
    fn test_kepler_low_eccentricity() {
        // Earth-like orbit: e ≈ 0.0167
        let e = Eccentricity::elliptical(0.0167).unwrap();
        let m = Radians(PI / 4.0);
        let sol = solve_kepler(m, e).unwrap();

        // Verify: M = E - e*sin(E)
        let big_e = sol.eccentric_anomaly.value();
        let residual = (big_e - e.value() * big_e.sin() - (PI / 4.0)).abs();
        assert!(
            residual < 1e-14,
            "residual = {}, expected < 1e-14",
            residual
        );
    }

    #[test]
    fn test_kepler_moderate_eccentricity() {
        // Mars-like orbit: e ≈ 0.0934
        let e = Eccentricity::elliptical(0.0934).unwrap();
        let m = Radians(2.0);
        let sol = solve_kepler(m, e).unwrap();

        let big_e = sol.eccentric_anomaly.value();
        let residual = (big_e - e.value() * big_e.sin() - 2.0).abs();
        assert!(
            residual < 1e-14,
            "residual = {}, expected < 1e-14",
            residual
        );
    }

    #[test]
    fn test_kepler_high_eccentricity() {
        // Comet-like orbit: e ≈ 0.967 (Halley's comet)
        let e = Eccentricity::elliptical(0.967).unwrap();
        for m_val in [0.1, 0.5, 1.0, PI / 2.0, PI, 5.0] {
            let m = Radians(m_val);
            let sol = solve_kepler(m, e).unwrap();

            let big_e = sol.eccentric_anomaly.value();
            let m_norm = m.normalize().value();
            let residual = (big_e - e.value() * big_e.sin() - m_norm).abs();
            assert!(
                residual < 1e-12,
                "e=0.967, M={}: residual = {}",
                m_val,
                residual
            );
        }
    }

    #[test]
    fn test_kepler_rejects_hyperbolic() {
        let e = Eccentricity::new(1.5).unwrap();
        let result = solve_kepler(Radians(1.0), e);
        assert!(result.is_err());
    }

    #[test]
    fn test_anomaly_round_trip_true_eccentric() {
        let e = Eccentricity::elliptical(0.3).unwrap();
        let nu = Radians(1.2);
        let big_e = true_to_eccentric_anomaly(nu, e);
        let nu_back = eccentric_to_true_anomaly(big_e, e);
        assert!(
            (nu.normalize().value() - nu_back.value()).abs() < 1e-12,
            "round trip failed: {} -> {} -> {}",
            nu.value(),
            big_e.value(),
            nu_back.value()
        );
    }

    #[test]
    fn test_anomaly_round_trip_mean_eccentric() {
        let e = Eccentricity::elliptical(0.5).unwrap();
        let big_e = Radians(1.0);
        let m = eccentric_to_mean_anomaly(big_e, e);
        let sol = solve_kepler(m, e).unwrap();
        assert!(
            (sol.eccentric_anomaly.value() - big_e.value()).abs() < 1e-12,
            "round trip failed: E={} -> M={} -> E={}",
            big_e.value(),
            m.value(),
            sol.eccentric_anomaly.value()
        );
    }

    #[test]
    fn test_full_anomaly_round_trip() {
        // ν → E → M → (solve Kepler) → E → ν
        let e = Eccentricity::elliptical(0.2).unwrap();
        let nu_original = Radians(2.5);
        let m = true_to_mean_anomaly(nu_original, e);
        let nu_recovered = mean_to_true_anomaly(m, e).unwrap();
        assert!(
            (nu_original.normalize().value() - nu_recovered.value()).abs() < 1e-11,
            "full round trip failed: {} -> {} -> {}",
            nu_original.value(),
            m.value(),
            nu_recovered.value()
        );
    }

    #[test]
    fn test_mean_motion_earth() {
        // Earth mean motion around Sun: n = 2π / (365.25 * 86400) ≈ 1.991e-7 rad/s
        let n = mean_motion(
            crate::constants::mu::SUN,
            crate::constants::orbit_radius::EARTH,
        );
        let expected = TAU / (365.25 * 86400.0);
        assert!(
            (n - expected).abs() / expected < 0.002, // within 0.2%
            "n = {}, expected ≈ {}",
            n,
            expected
        );
    }

    #[test]
    fn test_propagate_half_orbit() {
        // Start at M=0, propagate half an orbit → M should be ~π
        let n = TAU / 3600.0; // period = 3600 s for simplicity
        let m0 = Radians(0.0);
        let dt = crate::units::Seconds(1800.0); // half period
        let m1 = propagate_mean_anomaly(m0, n, dt);
        assert!(
            (m1.value() - PI).abs() < 1e-12,
            "M after half orbit = {}, expected π",
            m1.value()
        );
    }

    #[test]
    fn test_kepler_known_value() {
        // Known test case from Vallado "Fundamentals of Astrodynamics"
        // e = 0.4, M = 235.4° = 4.1102 rad
        // Expected E ≈ 220.512° = 3.8489 rad (approximately)
        let e = Eccentricity::elliptical(0.4).unwrap();
        let m = Radians(235.4_f64.to_radians());
        let sol = solve_kepler(m, e).unwrap();

        // Verify the solution satisfies Kepler's equation
        let big_e = sol.eccentric_anomaly.value();
        let m_normalized = m.normalize().value();
        let residual = (big_e - e.value() * big_e.sin() - m_normalized).abs();
        assert!(
            residual < 1e-14,
            "Vallado test case: residual = {}",
            residual
        );

        // E should be around 3.85 rad (220.5°)
        let e_deg = sol.eccentric_anomaly.value().to_degrees();
        assert!(
            (e_deg - 220.5).abs() < 1.0,
            "E = {}°, expected ~220.5°",
            e_deg
        );
    }
}
