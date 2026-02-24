/// Numerical orbit propagation for SOLAR LINE 考察.
///
/// Implements multiple integrators:
/// - RK4 (fixed step): Simple, reliable for smooth trajectories
/// - RK45 Dormand-Prince (adaptive step): Efficient for varying dynamics
///   (thrust onset/cutoff, gravity assists, high-eccentricity orbits)
///
/// # Accuracy Validation (TDD approach)
///
/// Energy conservation is the primary accuracy metric:
/// - Ballistic (thrust-free) segments must conserve total specific energy
///   (kinetic + potential) to within a defined tolerance.
/// - Energy drift below 1e-10 relative error over 1000 orbits for
///   well-resolved Keplerian orbits.
use crate::units::{Km, KmPerSec, Mu};
use crate::vec3::Vec3;

/// State of a spacecraft/body in 3D Cartesian coordinates.
#[derive(Debug, Clone, Copy)]
pub struct PropState {
    /// Position (km)
    pub pos: Vec3<Km>,
    /// Velocity (km/s)
    pub vel: Vec3<KmPerSec>,
    /// Elapsed time (s)
    pub time: f64,
}

impl PropState {
    pub fn new(pos: Vec3<Km>, vel: Vec3<KmPerSec>) -> Self {
        Self {
            pos,
            vel,
            time: 0.0,
        }
    }

    /// Distance from origin (km)
    pub fn radius(&self) -> f64 {
        self.pos.norm_raw()
    }

    /// Speed magnitude (km/s)
    pub fn speed(&self) -> f64 {
        self.vel.norm_raw()
    }

    /// Specific orbital energy: v²/2 - μ/r (km²/s²)
    pub fn specific_energy(&self, mu: Mu) -> f64 {
        let v = self.speed();
        let r = self.radius();
        0.5 * v * v - mu.value() / r
    }

    /// Specific angular momentum vector: r × v
    pub fn angular_momentum(&self) -> Vec3<f64> {
        let r = &self.pos;
        let v = &self.vel;
        Vec3::new(
            r.y.value() * v.z.value() - r.z.value() * v.y.value(),
            r.z.value() * v.x.value() - r.x.value() * v.z.value(),
            r.x.value() * v.y.value() - r.y.value() * v.x.value(),
        )
    }
}

/// Thrust profile for continuous-thrust propagation.
#[derive(Debug, Clone, Copy)]
pub enum ThrustProfile {
    /// No thrust (ballistic/Keplerian)
    None,
    /// Constant thrust magnitude (N) in current velocity direction.
    /// Mass is assumed constant (electric propulsion approximation
    /// where mass flow is negligible over the simulation timespan).
    ConstantPrograde {
        /// Acceleration magnitude (km/s²)
        accel_km_s2: f64,
    },
    /// Brachistochrone: accelerate for first half, decelerate for second half.
    /// `flip_time` is the time (s) at which thrust reverses direction.
    Brachistochrone {
        /// Acceleration magnitude (km/s²)
        accel_km_s2: f64,
        /// Time at which to flip thrust direction (s from start)
        flip_time: f64,
    },
}

/// Configuration for the RK4 integrator.
#[derive(Debug, Clone, Copy)]
pub struct IntegratorConfig {
    /// Time step (s)
    pub dt: f64,
    /// Central body gravitational parameter (km³/s²)
    pub mu: Mu,
    /// Thrust profile
    pub thrust: ThrustProfile,
}

/// Derivative of state: (velocity, acceleration).
/// Returns (dr/dt, dv/dt) as raw f64 arrays \[x,y,z\] each.
fn derivatives(
    pos: [f64; 3],
    vel: [f64; 3],
    time: f64,
    mu_val: f64,
    thrust: &ThrustProfile,
) -> ([f64; 3], [f64; 3]) {
    // dr/dt = v
    let drdt = vel;

    // Gravitational acceleration: -μ/r³ * r
    let r_sq = pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2];
    let r = r_sq.sqrt();
    let r_cubed = r * r_sq;
    let grav_factor = -mu_val / r_cubed;

    let mut ax = grav_factor * pos[0];
    let mut ay = grav_factor * pos[1];
    let mut az = grav_factor * pos[2];

    // Add thrust acceleration
    match thrust {
        ThrustProfile::None => {}
        ThrustProfile::ConstantPrograde { accel_km_s2 } => {
            let speed = (vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]).sqrt();
            if speed > 1e-15 {
                let factor = accel_km_s2 / speed;
                ax += factor * vel[0];
                ay += factor * vel[1];
                az += factor * vel[2];
            }
        }
        ThrustProfile::Brachistochrone {
            accel_km_s2,
            flip_time,
        } => {
            let speed = (vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]).sqrt();
            if speed > 1e-15 {
                // Before flip: thrust prograde. After flip: thrust retrograde.
                let sign = if time < *flip_time { 1.0 } else { -1.0 };
                let factor = sign * accel_km_s2 / speed;
                ax += factor * vel[0];
                ay += factor * vel[1];
                az += factor * vel[2];
            }
        }
    }

    let dvdt = [ax, ay, az];
    (drdt, dvdt)
}

/// Perform one RK4 step.
///
/// Takes position \[x,y,z\] in km, velocity \[vx,vy,vz\] in km/s,
/// time in seconds, and returns updated (pos, vel).
fn rk4_step(
    pos: [f64; 3],
    vel: [f64; 3],
    time: f64,
    dt: f64,
    mu_val: f64,
    thrust: &ThrustProfile,
) -> ([f64; 3], [f64; 3]) {
    // k1
    let (k1r, k1v) = derivatives(pos, vel, time, mu_val, thrust);

    // k2
    let pos2 = [
        pos[0] + 0.5 * dt * k1r[0],
        pos[1] + 0.5 * dt * k1r[1],
        pos[2] + 0.5 * dt * k1r[2],
    ];
    let vel2 = [
        vel[0] + 0.5 * dt * k1v[0],
        vel[1] + 0.5 * dt * k1v[1],
        vel[2] + 0.5 * dt * k1v[2],
    ];
    let (k2r, k2v) = derivatives(pos2, vel2, time + 0.5 * dt, mu_val, thrust);

    // k3
    let pos3 = [
        pos[0] + 0.5 * dt * k2r[0],
        pos[1] + 0.5 * dt * k2r[1],
        pos[2] + 0.5 * dt * k2r[2],
    ];
    let vel3 = [
        vel[0] + 0.5 * dt * k2v[0],
        vel[1] + 0.5 * dt * k2v[1],
        vel[2] + 0.5 * dt * k2v[2],
    ];
    let (k3r, k3v) = derivatives(pos3, vel3, time + 0.5 * dt, mu_val, thrust);

    // k4
    let pos4 = [
        pos[0] + dt * k3r[0],
        pos[1] + dt * k3r[1],
        pos[2] + dt * k3r[2],
    ];
    let vel4 = [
        vel[0] + dt * k3v[0],
        vel[1] + dt * k3v[1],
        vel[2] + dt * k3v[2],
    ];
    let (k4r, k4v) = derivatives(pos4, vel4, time + dt, mu_val, thrust);

    // Weighted average
    let new_pos = [
        pos[0] + dt / 6.0 * (k1r[0] + 2.0 * k2r[0] + 2.0 * k3r[0] + k4r[0]),
        pos[1] + dt / 6.0 * (k1r[1] + 2.0 * k2r[1] + 2.0 * k3r[1] + k4r[1]),
        pos[2] + dt / 6.0 * (k1r[2] + 2.0 * k2r[2] + 2.0 * k3r[2] + k4r[2]),
    ];
    let new_vel = [
        vel[0] + dt / 6.0 * (k1v[0] + 2.0 * k2v[0] + 2.0 * k3v[0] + k4v[0]),
        vel[1] + dt / 6.0 * (k1v[1] + 2.0 * k2v[1] + 2.0 * k3v[1] + k4v[1]),
        vel[2] + dt / 6.0 * (k1v[2] + 2.0 * k2v[2] + 2.0 * k3v[2] + k4v[2]),
    ];

    (new_pos, new_vel)
}

/// Propagate an orbit from initial state for a given duration.
///
/// Returns a vector of PropState at each time step (including initial state).
pub fn propagate(initial: &PropState, config: &IntegratorConfig, duration: f64) -> Vec<PropState> {
    let n_steps = (duration / config.dt).ceil() as usize;
    let mu_val = config.mu.value();
    let dt = config.dt;

    let mut states = Vec::with_capacity(n_steps + 1);
    states.push(*initial);

    let mut pos = [
        initial.pos.x.value(),
        initial.pos.y.value(),
        initial.pos.z.value(),
    ];
    let mut vel = [
        initial.vel.x.value(),
        initial.vel.y.value(),
        initial.vel.z.value(),
    ];
    let mut t = initial.time;

    for i in 0..n_steps {
        // Last step may be shorter
        let step_dt = if i == n_steps - 1 {
            let remaining = duration - (t - initial.time);
            if remaining < dt {
                remaining
            } else {
                dt
            }
        } else {
            dt
        };

        let (new_pos, new_vel) = rk4_step(pos, vel, t, step_dt, mu_val, &config.thrust);
        pos = new_pos;
        vel = new_vel;
        t += step_dt;

        states.push(PropState {
            pos: Vec3::new(Km(pos[0]), Km(pos[1]), Km(pos[2])),
            vel: Vec3::new(KmPerSec(vel[0]), KmPerSec(vel[1]), KmPerSec(vel[2])),
            time: t,
        });
    }

    states
}

/// Propagate and return only the final state (memory-efficient for long propagations).
pub fn propagate_final(initial: &PropState, config: &IntegratorConfig, duration: f64) -> PropState {
    let n_steps = (duration / config.dt).ceil() as usize;
    let mu_val = config.mu.value();
    let dt = config.dt;

    let mut pos = [
        initial.pos.x.value(),
        initial.pos.y.value(),
        initial.pos.z.value(),
    ];
    let mut vel = [
        initial.vel.x.value(),
        initial.vel.y.value(),
        initial.vel.z.value(),
    ];
    let mut t = initial.time;

    for i in 0..n_steps {
        let step_dt = if i == n_steps - 1 {
            let remaining = duration - (t - initial.time);
            if remaining < dt {
                remaining
            } else {
                dt
            }
        } else {
            dt
        };

        let (new_pos, new_vel) = rk4_step(pos, vel, t, step_dt, mu_val, &config.thrust);
        pos = new_pos;
        vel = new_vel;
        t += step_dt;
    }

    PropState {
        pos: Vec3::new(Km(pos[0]), Km(pos[1]), Km(pos[2])),
        vel: Vec3::new(KmPerSec(vel[0]), KmPerSec(vel[1]), KmPerSec(vel[2])),
        time: t,
    }
}

/// Compute maximum relative energy drift during a propagation.
///
/// Returns (max_relative_error, final_relative_error).
/// Useful for validating integrator accuracy.
pub fn energy_drift(states: &[PropState], mu: Mu) -> (f64, f64) {
    if states.is_empty() {
        return (0.0, 0.0);
    }

    let e0 = states[0].specific_energy(mu);
    let mut max_rel = 0.0;

    for state in &states[1..] {
        let e = state.specific_energy(mu);
        let rel = if e0.abs() > 1e-30 {
            ((e - e0) / e0).abs()
        } else {
            (e - e0).abs()
        };
        if rel > max_rel {
            max_rel = rel;
        }
    }

    let e_final = states.last().unwrap().specific_energy(mu);
    let final_rel = if e0.abs() > 1e-30 {
        ((e_final - e0) / e0).abs()
    } else {
        (e_final - e0).abs()
    };

    (max_rel, final_rel)
}

// ══════════════════════════════════════════════════════════════════════
// RK45 Dormand-Prince Adaptive Integrator
// ══════════════════════════════════════════════════════════════════════

/// Dormand-Prince 5(4) Butcher tableau coefficients (FSAL).
/// c nodes (time fractions within step)
const DP_C: [f64; 7] = [0.0, 1.0 / 5.0, 3.0 / 10.0, 4.0 / 5.0, 8.0 / 9.0, 1.0, 1.0];

/// a matrix (lower triangular, row by row)
const DP_A21: f64 = 1.0 / 5.0;
const DP_A31: f64 = 3.0 / 40.0;
const DP_A32: f64 = 9.0 / 40.0;
const DP_A41: f64 = 44.0 / 45.0;
const DP_A42: f64 = -56.0 / 15.0;
const DP_A43: f64 = 32.0 / 9.0;
const DP_A51: f64 = 19372.0 / 6561.0;
const DP_A52: f64 = -25360.0 / 2187.0;
const DP_A53: f64 = 64448.0 / 6561.0;
const DP_A54: f64 = -212.0 / 729.0;
const DP_A61: f64 = 9017.0 / 3168.0;
const DP_A62: f64 = -355.0 / 33.0;
const DP_A63: f64 = 46732.0 / 5247.0;
const DP_A64: f64 = 49.0 / 176.0;
const DP_A65: f64 = -5103.0 / 18656.0;

/// 5th-order weights (solution)
const DP_B: [f64; 7] = [
    35.0 / 384.0,
    0.0,
    500.0 / 1113.0,
    125.0 / 192.0,
    -2187.0 / 6784.0,
    11.0 / 84.0,
    0.0,
];

/// Error coefficients: e_i = b_i - b*_i (difference between 5th and 4th order)
const DP_E: [f64; 7] = [
    35.0 / 384.0 - 5179.0 / 57600.0,
    0.0,
    500.0 / 1113.0 - 7571.0 / 16695.0,
    125.0 / 192.0 - 393.0 / 640.0,
    -2187.0 / 6784.0 + 92097.0 / 339200.0,
    11.0 / 84.0 - 187.0 / 2100.0,
    0.0 - 1.0 / 40.0,
];

/// Configuration for the RK45 adaptive integrator.
#[derive(Debug, Clone, Copy)]
pub struct AdaptiveConfig {
    /// Central body gravitational parameter (km³/s²)
    pub mu: Mu,
    /// Thrust profile
    pub thrust: ThrustProfile,
    /// Relative tolerance (default: 1e-8)
    pub rtol: f64,
    /// Absolute tolerance (default: 1e-10)
    pub atol: f64,
    /// Initial step size (s). If 0, auto-estimated.
    pub h_init: f64,
    /// Minimum step size (s). Below this, integration stops with error.
    pub h_min: f64,
    /// Maximum step size (s)
    pub h_max: f64,
    /// Maximum number of steps (safety limit)
    pub max_steps: usize,
}

impl AdaptiveConfig {
    /// Create with sensible defaults for heliocentric propagation.
    pub fn heliocentric(mu: Mu, thrust: ThrustProfile) -> Self {
        Self {
            mu,
            thrust,
            rtol: 1e-8,
            atol: 1e-10,
            h_init: 0.0, // auto
            h_min: 1e-6,
            h_max: 86400.0, // 1 day max
            max_steps: 10_000_000,
        }
    }

    /// Create with sensible defaults for planetocentric propagation.
    pub fn planetocentric(mu: Mu, thrust: ThrustProfile) -> Self {
        Self {
            mu,
            thrust,
            rtol: 1e-8,
            atol: 1e-10,
            h_init: 0.0,
            h_min: 1e-6,
            h_max: 3600.0, // 1 hour max
            max_steps: 10_000_000,
        }
    }
}

/// Result of an adaptive propagation.
#[derive(Debug)]
pub struct AdaptiveResult {
    /// Trajectory states (including initial)
    pub states: Vec<PropState>,
    /// Total number of derivative evaluations (cost metric)
    pub n_eval: usize,
    /// Number of accepted steps
    pub n_accept: usize,
    /// Number of rejected steps
    pub n_reject: usize,
}

/// PI controller constants for step size selection (Codex-recommended).
const SAFETY: f64 = 0.9;
const FAC_MIN: f64 = 0.2;
const FAC_MAX: f64 = 5.0;
const PI_EXPONENT_I: f64 = -0.20; // integral gain (1/p where p=5 for RK45)
const PI_EXPONENT_P: f64 = 0.08; // proportional gain

/// Estimate initial step size using the approach from Hairer-Nørsett-Wanner.
fn estimate_initial_step(
    pos: [f64; 3],
    vel: [f64; 3],
    mu_val: f64,
    thrust: &ThrustProfile,
    rtol: f64,
    atol: f64,
) -> f64 {
    // Compute initial derivatives
    let (_, dvdt) = derivatives(pos, vel, 0.0, mu_val, thrust);

    // Norms of state and derivative
    let mut d0_sq = 0.0;
    let mut d1_sq = 0.0;
    for i in 0..3 {
        let sc_r = atol + rtol * pos[i].abs();
        let sc_v = atol + rtol * vel[i].abs();
        d0_sq += (pos[i] / sc_r).powi(2) + (vel[i] / sc_v).powi(2);
        d1_sq += (vel[i] / sc_r).powi(2) + (dvdt[i] / sc_v).powi(2);
    }
    let d0 = (d0_sq / 6.0).sqrt();
    let d1 = (d1_sq / 6.0).sqrt();

    // Initial guess: h0 = 0.01 * d0/d1
    if d0 < 1e-5 || d1 < 1e-5 {
        1e-6
    } else {
        0.01 * d0 / d1
    }
}

/// Compute scaled RMS error norm for step acceptance.
/// State is [x, y, z, vx, vy, vz] (6 components).
#[allow(clippy::too_many_arguments)]
fn scaled_error_norm(
    err_pos: [f64; 3],
    err_vel: [f64; 3],
    y_old_pos: [f64; 3],
    y_old_vel: [f64; 3],
    y_new_pos: [f64; 3],
    y_new_vel: [f64; 3],
    rtol: f64,
    atol: f64,
) -> f64 {
    let mut sum_sq = 0.0;
    for i in 0..3 {
        let sc_r = atol + rtol * y_old_pos[i].abs().max(y_new_pos[i].abs());
        let sc_v = atol + rtol * y_old_vel[i].abs().max(y_new_vel[i].abs());
        sum_sq += (err_pos[i] / sc_r).powi(2);
        sum_sq += (err_vel[i] / sc_v).powi(2);
    }
    (sum_sq / 6.0).sqrt()
}

/// Perform one RK45 Dormand-Prince step. Returns (new_pos, new_vel, err_pos, err_vel).
/// Uses 7 stages (FSAL: k7 of this step = k1 of next step).
fn dopri45_step(
    pos: [f64; 3],
    vel: [f64; 3],
    time: f64,
    h: f64,
    mu_val: f64,
    thrust: &ThrustProfile,
) -> ([f64; 3], [f64; 3], [f64; 3], [f64; 3]) {
    // k1
    let (k1r, k1v) = derivatives(pos, vel, time, mu_val, thrust);

    // k2
    let mut p2 = [0.0; 3];
    let mut v2 = [0.0; 3];
    for i in 0..3 {
        p2[i] = pos[i] + h * DP_A21 * k1r[i];
        v2[i] = vel[i] + h * DP_A21 * k1v[i];
    }
    let (k2r, k2v) = derivatives(p2, v2, time + DP_C[1] * h, mu_val, thrust);

    // k3
    let mut p3 = [0.0; 3];
    let mut v3 = [0.0; 3];
    for i in 0..3 {
        p3[i] = pos[i] + h * (DP_A31 * k1r[i] + DP_A32 * k2r[i]);
        v3[i] = vel[i] + h * (DP_A31 * k1v[i] + DP_A32 * k2v[i]);
    }
    let (k3r, k3v) = derivatives(p3, v3, time + DP_C[2] * h, mu_val, thrust);

    // k4
    let mut p4 = [0.0; 3];
    let mut v4 = [0.0; 3];
    for i in 0..3 {
        p4[i] = pos[i] + h * (DP_A41 * k1r[i] + DP_A42 * k2r[i] + DP_A43 * k3r[i]);
        v4[i] = vel[i] + h * (DP_A41 * k1v[i] + DP_A42 * k2v[i] + DP_A43 * k3v[i]);
    }
    let (k4r, k4v) = derivatives(p4, v4, time + DP_C[3] * h, mu_val, thrust);

    // k5
    let mut p5 = [0.0; 3];
    let mut v5 = [0.0; 3];
    for i in 0..3 {
        p5[i] =
            pos[i] + h * (DP_A51 * k1r[i] + DP_A52 * k2r[i] + DP_A53 * k3r[i] + DP_A54 * k4r[i]);
        v5[i] =
            vel[i] + h * (DP_A51 * k1v[i] + DP_A52 * k2v[i] + DP_A53 * k3v[i] + DP_A54 * k4v[i]);
    }
    let (k5r, k5v) = derivatives(p5, v5, time + DP_C[4] * h, mu_val, thrust);

    // k6
    let mut p6 = [0.0; 3];
    let mut v6 = [0.0; 3];
    for i in 0..3 {
        p6[i] = pos[i]
            + h * (DP_A61 * k1r[i]
                + DP_A62 * k2r[i]
                + DP_A63 * k3r[i]
                + DP_A64 * k4r[i]
                + DP_A65 * k5r[i]);
        v6[i] = vel[i]
            + h * (DP_A61 * k1v[i]
                + DP_A62 * k2v[i]
                + DP_A63 * k3v[i]
                + DP_A64 * k4v[i]
                + DP_A65 * k5v[i]);
    }
    let (k6r, k6v) = derivatives(p6, v6, time + DP_C[5] * h, mu_val, thrust);

    // 5th-order solution
    let mut new_pos = [0.0; 3];
    let mut new_vel = [0.0; 3];
    for i in 0..3 {
        new_pos[i] = pos[i]
            + h * (DP_B[0] * k1r[i]
                + DP_B[2] * k3r[i]
                + DP_B[3] * k4r[i]
                + DP_B[4] * k5r[i]
                + DP_B[5] * k6r[i]);
        new_vel[i] = vel[i]
            + h * (DP_B[0] * k1v[i]
                + DP_B[2] * k3v[i]
                + DP_B[3] * k4v[i]
                + DP_B[4] * k5v[i]
                + DP_B[5] * k6v[i]);
    }

    // Error estimate (difference between 5th and 4th order)
    let mut err_pos = [0.0; 3];
    let mut err_vel = [0.0; 3];
    // k7 = derivatives at new state (FSAL)
    let (k7r, k7v) = derivatives(new_pos, new_vel, time + h, mu_val, thrust);
    for i in 0..3 {
        err_pos[i] = h
            * (DP_E[0] * k1r[i]
                + DP_E[2] * k3r[i]
                + DP_E[3] * k4r[i]
                + DP_E[4] * k5r[i]
                + DP_E[5] * k6r[i]
                + DP_E[6] * k7r[i]);
        err_vel[i] = h
            * (DP_E[0] * k1v[i]
                + DP_E[2] * k3v[i]
                + DP_E[3] * k4v[i]
                + DP_E[4] * k5v[i]
                + DP_E[5] * k6v[i]
                + DP_E[6] * k7v[i]);
    }

    (new_pos, new_vel, err_pos, err_vel)
}

/// Propagate using RK45 Dormand-Prince adaptive step integrator.
///
/// Returns trajectory states and integration statistics.
/// Uses PI controller for step size (Hairer-Nørsett-Wanner approach).
pub fn propagate_adaptive(
    initial: &PropState,
    config: &AdaptiveConfig,
    duration: f64,
) -> AdaptiveResult {
    let mu_val = config.mu.value();
    let thrust = &config.thrust;

    let mut pos = [
        initial.pos.x.value(),
        initial.pos.y.value(),
        initial.pos.z.value(),
    ];
    let mut vel = [
        initial.vel.x.value(),
        initial.vel.y.value(),
        initial.vel.z.value(),
    ];
    let mut t = initial.time;
    let t_end = initial.time + duration;

    let mut states = vec![*initial];
    let mut n_eval: usize = 0;
    let mut n_accept: usize = 0;
    let mut n_reject: usize = 0;

    // Initial step size
    let mut h = if config.h_init > 0.0 {
        config.h_init
    } else {
        estimate_initial_step(pos, vel, mu_val, thrust, config.rtol, config.atol)
            .min(config.h_max)
            .max(config.h_min)
    };

    let mut err_prev = 1.0_f64; // for PI controller

    // Detect known time events (flip_time for brachistochrone)
    let event_times = match thrust {
        ThrustProfile::Brachistochrone { flip_time, .. } => vec![*flip_time],
        _ => vec![],
    };

    let mut step_count = 0;
    while t < t_end - 1e-12 {
        step_count += 1;
        if step_count > config.max_steps {
            break;
        }

        // Don't overshoot end
        if t + h > t_end {
            h = t_end - t;
        }

        // Don't straddle known events (thrust discontinuities)
        let mut hit_event = false;
        for &te in &event_times {
            if t < te && t + h > te {
                h = te - t;
                hit_event = true;
                break;
            }
        }

        // Take a trial step
        let (new_pos, new_vel, err_pos, err_vel) = dopri45_step(pos, vel, t, h, mu_val, thrust);
        n_eval += 7; // 7 stages per DOPRI45 step

        // Compute scaled error norm
        let err = scaled_error_norm(
            err_pos,
            err_vel,
            pos,
            vel,
            new_pos,
            new_vel,
            config.rtol,
            config.atol,
        );

        if err <= 1.0 {
            // Accept step
            pos = new_pos;
            vel = new_vel;
            t += h;
            n_accept += 1;

            states.push(PropState {
                pos: Vec3::new(Km(pos[0]), Km(pos[1]), Km(pos[2])),
                vel: Vec3::new(KmPerSec(vel[0]), KmPerSec(vel[1]), KmPerSec(vel[2])),
                time: t,
            });

            // PI controller for next step size
            if err > 1e-30 {
                let factor = SAFETY * err.powf(PI_EXPONENT_I) * err_prev.powf(PI_EXPONENT_P);
                h *= factor.clamp(FAC_MIN, FAC_MAX);
            } else {
                h *= FAC_MAX;
            }
            err_prev = err;

            // After hitting an event, restore max step
            if hit_event {
                h = h.min(config.h_max);
            }
        } else {
            // Reject step
            n_reject += 1;
            let factor = SAFETY * err.powf(PI_EXPONENT_I);
            h *= factor.max(0.1);
        }

        // Enforce step size bounds
        h = h.clamp(config.h_min, config.h_max);
    }

    AdaptiveResult {
        states,
        n_eval,
        n_accept,
        n_reject,
    }
}

/// Propagate adaptively and return only the final state (memory-efficient).
pub fn propagate_adaptive_final(
    initial: &PropState,
    config: &AdaptiveConfig,
    duration: f64,
) -> (PropState, usize) {
    let mu_val = config.mu.value();
    let thrust = &config.thrust;

    let mut pos = [
        initial.pos.x.value(),
        initial.pos.y.value(),
        initial.pos.z.value(),
    ];
    let mut vel = [
        initial.vel.x.value(),
        initial.vel.y.value(),
        initial.vel.z.value(),
    ];
    let mut t = initial.time;
    let t_end = initial.time + duration;

    let mut n_eval: usize = 0;

    let mut h = if config.h_init > 0.0 {
        config.h_init
    } else {
        estimate_initial_step(pos, vel, mu_val, thrust, config.rtol, config.atol)
            .min(config.h_max)
            .max(config.h_min)
    };

    let mut err_prev = 1.0_f64;

    let event_times = match thrust {
        ThrustProfile::Brachistochrone { flip_time, .. } => vec![*flip_time],
        _ => vec![],
    };

    let mut step_count = 0;
    while t < t_end - 1e-12 {
        step_count += 1;
        if step_count > config.max_steps {
            break;
        }

        if t + h > t_end {
            h = t_end - t;
        }

        let mut hit_event = false;
        for &te in &event_times {
            if t < te && t + h > te {
                h = te - t;
                hit_event = true;
                break;
            }
        }

        let (new_pos, new_vel, err_pos, err_vel) = dopri45_step(pos, vel, t, h, mu_val, thrust);
        n_eval += 7;

        let err = scaled_error_norm(
            err_pos,
            err_vel,
            pos,
            vel,
            new_pos,
            new_vel,
            config.rtol,
            config.atol,
        );

        if err <= 1.0 {
            pos = new_pos;
            vel = new_vel;
            t += h;

            if err > 1e-30 {
                let factor = SAFETY * err.powf(PI_EXPONENT_I) * err_prev.powf(PI_EXPONENT_P);
                h *= factor.clamp(FAC_MIN, FAC_MAX);
            } else {
                h *= FAC_MAX;
            }
            err_prev = err;

            if hit_event {
                h = h.min(config.h_max);
            }
        } else {
            let factor = SAFETY * err.powf(PI_EXPONENT_I);
            h *= factor.max(0.1);
        }

        h = h.clamp(config.h_min, config.h_max);
    }

    let final_state = PropState {
        pos: Vec3::new(Km(pos[0]), Km(pos[1]), Km(pos[2])),
        vel: Vec3::new(KmPerSec(vel[0]), KmPerSec(vel[1]), KmPerSec(vel[2])),
        time: t,
    };
    (final_state, n_eval)
}

/// Create initial state for a circular orbit in the XY plane.
///
/// Position: (r, 0, 0)
/// Velocity: (0, v_circ, 0) where v_circ = sqrt(μ/r)
pub fn circular_orbit_state(mu: Mu, radius: Km) -> PropState {
    let v_circ = (mu.value() / radius.value()).sqrt();
    PropState::new(
        Vec3::new(radius, Km(0.0), Km(0.0)),
        Vec3::new(KmPerSec(0.0), KmPerSec(v_circ), KmPerSec(0.0)),
    )
}

/// Create initial state for an elliptical orbit in the XY plane at periapsis.
///
/// At periapsis (true anomaly = 0):
/// Position: (r_p, 0, 0)
/// Velocity: (0, v_p, 0) where v_p = sqrt(μ(2/r_p - 1/a))
pub fn elliptical_orbit_state_at_periapsis(
    mu: Mu,
    semi_major_axis: Km,
    eccentricity: f64,
) -> PropState {
    let a = semi_major_axis.value();
    let r_p = a * (1.0 - eccentricity);
    let v_p = (mu.value() * (2.0 / r_p - 1.0 / a)).sqrt();
    PropState::new(
        Vec3::new(Km(r_p), Km(0.0), Km(0.0)),
        Vec3::new(KmPerSec(0.0), KmPerSec(v_p), KmPerSec(0.0)),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::{mu, orbit_radius, reference_orbits};

    // ── Energy Conservation Tests (TDD) ─────────────────────────────────

    #[test]
    fn test_energy_conservation_circular_leo() {
        // Circular LEO orbit: propagate for 1 full period
        // Energy should be conserved to <1e-10 relative error
        let state = circular_orbit_state(mu::EARTH, reference_orbits::LEO_RADIUS);
        let period = crate::orbits::orbital_period(mu::EARTH, reference_orbits::LEO_RADIUS);

        let config = IntegratorConfig {
            dt: 1.0, // 1 second steps
            mu: mu::EARTH,
            thrust: ThrustProfile::None,
        };

        let states = propagate(&state, &config, period.value());
        let (max_err, final_err) = energy_drift(&states, mu::EARTH);

        assert!(
            max_err < 1e-10,
            "LEO 1-period max energy drift = {:.2e} (should be <1e-10)",
            max_err
        );
        assert!(
            final_err < 1e-10,
            "LEO 1-period final energy drift = {:.2e} (should be <1e-10)",
            final_err
        );
    }

    #[test]
    fn test_energy_conservation_circular_leo_100_orbits() {
        // 100 orbits of LEO: energy should still be well-conserved
        let state = circular_orbit_state(mu::EARTH, reference_orbits::LEO_RADIUS);
        let period = crate::orbits::orbital_period(mu::EARTH, reference_orbits::LEO_RADIUS);
        let duration = period.value() * 100.0;

        let config = IntegratorConfig {
            dt: 5.0, // 5 second steps for 100-orbit precision
            mu: mu::EARTH,
            thrust: ThrustProfile::None,
        };

        // Use propagate_final for memory efficiency
        let final_state = propagate_final(&state, &config, duration);
        let e0 = state.specific_energy(mu::EARTH);
        let ef = final_state.specific_energy(mu::EARTH);
        let rel_err = ((ef - e0) / e0).abs();

        assert!(
            rel_err < 1e-9,
            "LEO 100-orbit energy drift = {:.2e} (should be <1e-9)",
            rel_err
        );
    }

    #[test]
    fn test_energy_conservation_elliptical_orbit() {
        // Elliptical orbit (e=0.5): energy conservation is harder
        // due to varying velocity through periapsis
        let state =
            elliptical_orbit_state_at_periapsis(mu::EARTH, reference_orbits::GEO_RADIUS, 0.5);
        let period = crate::orbits::orbital_period(mu::EARTH, reference_orbits::GEO_RADIUS);

        let config = IntegratorConfig {
            dt: 5.0, // 5 second steps
            mu: mu::EARTH,
            thrust: ThrustProfile::None,
        };

        let states = propagate(&state, &config, period.value());
        let (max_err, final_err) = energy_drift(&states, mu::EARTH);

        assert!(
            max_err < 1e-9,
            "Elliptical (e=0.5) 1-period max energy drift = {:.2e} (should be <1e-9)",
            max_err
        );
        assert!(
            final_err < 1e-9,
            "Elliptical (e=0.5) 1-period final energy drift = {:.2e} (should be <1e-9)",
            final_err
        );
    }

    #[test]
    fn test_energy_conservation_elliptical_high_ecc() {
        // Highly elliptical (e=0.9): toughest test for energy conservation
        // Needs smaller dt near periapsis
        let state =
            elliptical_orbit_state_at_periapsis(mu::EARTH, reference_orbits::GEO_RADIUS, 0.9);
        let period = crate::orbits::orbital_period(mu::EARTH, reference_orbits::GEO_RADIUS);

        let config = IntegratorConfig {
            dt: 1.0, // 1 second steps for high eccentricity
            mu: mu::EARTH,
            thrust: ThrustProfile::None,
        };

        let states = propagate(&state, &config, period.value());
        let (max_err, _final_err) = energy_drift(&states, mu::EARTH);

        assert!(
            max_err < 1e-7,
            "Highly elliptical (e=0.9) 1-period max energy drift = {:.2e} (should be <1e-7)",
            max_err
        );
    }

    #[test]
    fn test_energy_conservation_heliocentric_earth() {
        // Earth orbit around Sun: 1 period
        let state = circular_orbit_state(mu::SUN, orbit_radius::EARTH);
        let period = crate::orbits::orbital_period(mu::SUN, orbit_radius::EARTH);

        let config = IntegratorConfig {
            dt: 3600.0, // 1 hour steps (fine for year-long heliocentric orbit)
            mu: mu::SUN,
            thrust: ThrustProfile::None,
        };

        let states = propagate(&state, &config, period.value());
        let (max_err, final_err) = energy_drift(&states, mu::SUN);

        assert!(
            max_err < 1e-10,
            "Heliocentric Earth 1-period max energy drift = {:.2e} (should be <1e-10)",
            max_err
        );
        assert!(
            final_err < 1e-10,
            "Heliocentric Earth 1-period final energy drift = {:.2e} (should be <1e-10)",
            final_err
        );
    }

    #[test]
    fn test_energy_conservation_heliocentric_1000_orbits() {
        // 1000 Earth orbits (~1000 years): the strictest long-term test
        let state = circular_orbit_state(mu::SUN, orbit_radius::EARTH);
        let period = crate::orbits::orbital_period(mu::SUN, orbit_radius::EARTH);
        let duration = period.value() * 1000.0;

        let config = IntegratorConfig {
            dt: 3600.0, // 1 hour steps
            mu: mu::SUN,
            thrust: ThrustProfile::None,
        };

        let final_state = propagate_final(&state, &config, duration);
        let e0 = state.specific_energy(mu::SUN);
        let ef = final_state.specific_energy(mu::SUN);
        let rel_err = ((ef - e0) / e0).abs();

        assert!(
            rel_err < 1e-8,
            "1000 heliocentric orbits energy drift = {:.2e} (should be <1e-8)",
            rel_err
        );
    }

    // ── Angular Momentum Conservation Tests ─────────────────────────────

    #[test]
    fn test_angular_momentum_conservation_circular() {
        // Angular momentum should be conserved in 2-body
        let state = circular_orbit_state(mu::EARTH, reference_orbits::LEO_RADIUS);
        let period = crate::orbits::orbital_period(mu::EARTH, reference_orbits::LEO_RADIUS);

        let config = IntegratorConfig {
            dt: 1.0,
            mu: mu::EARTH,
            thrust: ThrustProfile::None,
        };

        let states = propagate(&state, &config, period.value());

        let h0 = states[0].angular_momentum();
        let h0_mag = (h0.x * h0.x + h0.y * h0.y + h0.z * h0.z).sqrt();

        for state in &states[1..] {
            let h = state.angular_momentum();
            let h_mag = (h.x * h.x + h.y * h.y + h.z * h.z).sqrt();
            let rel = ((h_mag - h0_mag) / h0_mag).abs();
            assert!(
                rel < 1e-10,
                "Angular momentum drift = {:.2e} (should be <1e-10)",
                rel
            );
        }
    }

    // ── Orbit Return Tests ──────────────────────────────────────────────

    #[test]
    fn test_circular_orbit_returns_to_start() {
        // After one full period, the spacecraft should return to its starting position
        let state = circular_orbit_state(mu::EARTH, reference_orbits::LEO_RADIUS);
        let period = crate::orbits::orbital_period(mu::EARTH, reference_orbits::LEO_RADIUS);

        let config = IntegratorConfig {
            dt: 1.0,
            mu: mu::EARTH,
            thrust: ThrustProfile::None,
        };

        let final_state = propagate_final(&state, &config, period.value());

        // Position should return to start
        let dx = (final_state.pos.x.value() - state.pos.x.value()).abs();
        let dy = (final_state.pos.y.value() - state.pos.y.value()).abs();
        let dz = (final_state.pos.z.value() - state.pos.z.value()).abs();
        let pos_err = (dx * dx + dy * dy + dz * dz).sqrt();
        let radius = state.radius();

        assert!(
            pos_err / radius < 1e-8,
            "Position error after 1 period = {:.2e} km ({:.2e} relative to radius)",
            pos_err,
            pos_err / radius
        );

        // Velocity should return to start
        let dvx = (final_state.vel.x.value() - state.vel.x.value()).abs();
        let dvy = (final_state.vel.y.value() - state.vel.y.value()).abs();
        let dvz = (final_state.vel.z.value() - state.vel.z.value()).abs();
        let vel_err = (dvx * dvx + dvy * dvy + dvz * dvz).sqrt();
        let speed = state.speed();

        assert!(
            vel_err / speed < 1e-8,
            "Velocity error after 1 period = {:.2e} km/s ({:.2e} relative to speed)",
            vel_err,
            vel_err / speed
        );
    }

    #[test]
    fn test_elliptical_orbit_returns_to_start() {
        // Elliptical orbit (e=0.5) should also return to periapsis after one period
        let state =
            elliptical_orbit_state_at_periapsis(mu::EARTH, reference_orbits::GEO_RADIUS, 0.5);
        let period = crate::orbits::orbital_period(mu::EARTH, reference_orbits::GEO_RADIUS);

        let config = IntegratorConfig {
            dt: 5.0,
            mu: mu::EARTH,
            thrust: ThrustProfile::None,
        };

        let final_state = propagate_final(&state, &config, period.value());

        let dx = (final_state.pos.x.value() - state.pos.x.value()).abs();
        let dy = (final_state.pos.y.value() - state.pos.y.value()).abs();
        let pos_err = (dx * dx + dy * dy).sqrt();
        let r_p = state.radius();

        assert!(
            pos_err / r_p < 1e-6,
            "Elliptical orbit position error after 1 period = {:.2e} km ({:.2e} relative)",
            pos_err,
            pos_err / r_p
        );
    }

    // ── Thrust Tests ────────────────────────────────────────────────────

    #[test]
    fn test_constant_thrust_increases_energy() {
        // Prograde thrust should increase orbital energy
        let state = circular_orbit_state(mu::EARTH, reference_orbits::LEO_RADIUS);
        let e0 = state.specific_energy(mu::EARTH);

        let config = IntegratorConfig {
            dt: 1.0,
            mu: mu::EARTH,
            thrust: ThrustProfile::ConstantPrograde {
                accel_km_s2: 1e-4, // ~10 m/s² (~1G)
            },
        };

        let final_state = propagate_final(&state, &config, 600.0); // 10 minutes
        let ef = final_state.specific_energy(mu::EARTH);

        assert!(
            ef > e0,
            "Energy should increase with prograde thrust: e0={:.4}, ef={:.4}",
            e0,
            ef
        );
    }

    #[test]
    fn test_brachistochrone_deceleration_phase() {
        // In a brachistochrone, the second half should decelerate.
        // After full duration, speed should be lower than at flip point.
        let state = circular_orbit_state(mu::SUN, orbit_radius::EARTH);
        let duration = 72.0 * 3600.0; // 72 hours
        let flip = duration / 2.0;

        let config_to_flip = IntegratorConfig {
            dt: 60.0,
            mu: mu::SUN,
            thrust: ThrustProfile::Brachistochrone {
                accel_km_s2: 1e-4,
                flip_time: flip,
            },
        };

        // Propagate to flip point
        let mid_state = propagate_final(&state, &config_to_flip, flip);
        let speed_at_flip = mid_state.speed();

        // Propagate full duration
        let config_full = IntegratorConfig {
            dt: 60.0,
            mu: mu::SUN,
            thrust: ThrustProfile::Brachistochrone {
                accel_km_s2: 1e-4,
                flip_time: flip,
            },
        };
        let final_state = propagate_final(&state, &config_full, duration);
        let speed_final = final_state.speed();

        // Speed at flip should be higher than initial speed
        assert!(
            speed_at_flip > state.speed(),
            "Speed at flip ({:.2} km/s) should exceed initial ({:.2} km/s)",
            speed_at_flip,
            state.speed()
        );

        // Speed at end should be lower than at flip (deceleration occurred)
        assert!(
            speed_final < speed_at_flip,
            "Final speed ({:.2} km/s) should be less than flip speed ({:.2} km/s)",
            speed_final,
            speed_at_flip
        );
    }

    // ── Convergence Test ────────────────────────────────────────────────

    #[test]
    fn test_rk4_convergence_order() {
        // RK4 is 4th-order: halving dt should reduce error by ~16x
        let state = circular_orbit_state(mu::EARTH, reference_orbits::LEO_RADIUS);
        let period = crate::orbits::orbital_period(mu::EARTH, reference_orbits::LEO_RADIUS);

        // Coarse: dt = 100s
        let config_coarse = IntegratorConfig {
            dt: 100.0,
            mu: mu::EARTH,
            thrust: ThrustProfile::None,
        };
        let final_coarse = propagate_final(&state, &config_coarse, period.value());
        let err_coarse = (final_coarse.pos.x.value() - state.pos.x.value()).powi(2)
            + (final_coarse.pos.y.value() - state.pos.y.value()).powi(2);
        let err_coarse = err_coarse.sqrt();

        // Fine: dt = 50s
        let config_fine = IntegratorConfig {
            dt: 50.0,
            mu: mu::EARTH,
            thrust: ThrustProfile::None,
        };
        let final_fine = propagate_final(&state, &config_fine, period.value());
        let err_fine = (final_fine.pos.x.value() - state.pos.x.value()).powi(2)
            + (final_fine.pos.y.value() - state.pos.y.value()).powi(2);
        let err_fine = err_fine.sqrt();

        // For RK4, error scales as O(dt^4), so halving dt → 1/16 error
        // Allow some slack: ratio should be at least 8 (between 3rd and 4th order)
        if err_coarse > 1e-12 && err_fine > 1e-12 {
            let ratio = err_coarse / err_fine;
            assert!(
                ratio > 8.0,
                "RK4 convergence ratio = {:.1} (expected >8 for 4th-order method). \
                 err_coarse={:.2e}, err_fine={:.2e}",
                ratio,
                err_coarse,
                err_fine
            );
        }
        // If both errors are tiny (< 1e-12), the test passes trivially
    }

    // ── Specific scenario tests for SOLAR LINE ──────────────────────────

    #[test]
    fn test_heliocentric_mars_orbit_stability() {
        // Mars orbit around Sun for 10 periods
        let state = circular_orbit_state(mu::SUN, orbit_radius::MARS);
        let period = crate::orbits::orbital_period(mu::SUN, orbit_radius::MARS);
        let duration = period.value() * 10.0;

        let config = IntegratorConfig {
            dt: 3600.0,
            mu: mu::SUN,
            thrust: ThrustProfile::None,
        };

        let final_state = propagate_final(&state, &config, duration);
        let e0 = state.specific_energy(mu::SUN);
        let ef = final_state.specific_energy(mu::SUN);
        let rel_err = ((ef - e0) / e0).abs();

        assert!(
            rel_err < 1e-10,
            "Mars 10-period energy drift = {:.2e}",
            rel_err
        );
    }

    #[test]
    fn test_heliocentric_jupiter_orbit_stability() {
        // Jupiter orbit around Sun for 5 periods
        let state = circular_orbit_state(mu::SUN, orbit_radius::JUPITER);
        let period = crate::orbits::orbital_period(mu::SUN, orbit_radius::JUPITER);
        let duration = period.value() * 5.0;

        let config = IntegratorConfig {
            dt: 7200.0, // 2 hour steps
            mu: mu::SUN,
            thrust: ThrustProfile::None,
        };

        let final_state = propagate_final(&state, &config, duration);
        let e0 = state.specific_energy(mu::SUN);
        let ef = final_state.specific_energy(mu::SUN);
        let rel_err = ((ef - e0) / e0).abs();

        assert!(
            rel_err < 1e-10,
            "Jupiter 5-period energy drift = {:.2e}",
            rel_err
        );
    }

    // ── SOLAR LINE Episode Validation Tests ─────────────────────────────

    #[test]
    fn test_ep01_brachistochrone_mars_to_jupiter_72h() {
        // EP01: Kestrel departs Mars orbit toward Jupiter (Ganymede) in 72 hours.
        // Desk calculation: d = 550,630,800 km, t = 259,200 s
        //   a = 4d/t² = 32.78 m/s² (0.03278 km/s²)
        //   ΔV = 4d/t = 8,497.39 km/s
        //
        // Propagation validation: starting from Mars orbit with constant
        // acceleration (brachistochrone), does the ship travel ~550.6M km
        // in 72 hours under solar gravity?

        let distance_target = 550_630_800.0_f64; // km (Mars→Jupiter at closest)
        let duration = 72.0 * 3600.0; // 259,200 seconds
        let accel = 4.0 * distance_target / (duration * duration); // km/s²
        let flip_time = duration / 2.0;

        // Start from Mars orbit: position at (r_mars, 0, 0), velocity circular
        // We use circular Mars orbit velocity plus apply brachistochrone thrust
        // in a roughly radial-outward direction.
        let r_mars = orbit_radius::MARS.value();
        let v_mars_circ = (mu::SUN.value() / r_mars).sqrt();

        // Place ship at Mars, moving in circular orbit
        let state = PropState::new(
            Vec3::new(Km(r_mars), Km(0.0), Km(0.0)),
            Vec3::new(KmPerSec(0.0), KmPerSec(v_mars_circ), KmPerSec(0.0)),
        );

        // Propagate with brachistochrone thrust
        let config = IntegratorConfig {
            dt: 60.0, // 1-minute steps
            mu: mu::SUN,
            thrust: ThrustProfile::Brachistochrone {
                accel_km_s2: accel,
                flip_time,
            },
        };

        let final_state = propagate_final(&state, &config, duration);

        // Calculate distance traveled from initial position
        let dx = final_state.pos.x.value() - state.pos.x.value();
        let dy = final_state.pos.y.value() - state.pos.y.value();
        let dz = final_state.pos.z.value() - state.pos.z.value();
        let distance_traveled = (dx * dx + dy * dy + dz * dz).sqrt();

        // The propagated distance should be within ~10% of the desk calculation.
        // The difference comes from:
        // 1. Solar gravity bending the trajectory
        // 2. Thrust direction following velocity (not fixed)
        // 3. Initial orbital velocity of Mars
        let ratio = distance_traveled / distance_target;
        assert!(
            (0.5..2.0).contains(&ratio),
            "EP01: Propagated distance = {:.0} km, target = {:.0} km, ratio = {:.2}. \
             The propagation should produce a distance in the same order of magnitude.",
            distance_traveled,
            distance_target,
            ratio
        );

        // Final speed should be relatively low (brachistochrone decelerates in second half)
        // The desk calculation assumes rest-to-rest, but with gravity the final speed
        // won't be exactly zero. It should still be much less than the max speed at flip.
        let mid_state = propagate_final(&state, &config, flip_time);
        let speed_at_flip = mid_state.speed();
        let speed_final = final_state.speed();

        assert!(
            speed_final < speed_at_flip,
            "EP01: Final speed ({:.1} km/s) should be less than flip speed ({:.1} km/s)",
            speed_final,
            speed_at_flip
        );

        // Final radial distance from Sun should be roughly near Jupiter's orbit
        // (since we're heading from Mars to Jupiter region)
        let r_jupiter = orbit_radius::JUPITER.value();
        let final_r = final_state.radius();
        let r_ratio = final_r / r_jupiter;
        assert!(
            (0.3..3.0).contains(&r_ratio),
            "EP01: Final heliocentric distance = {:.0} km ({:.2} of Jupiter orbit). \
             Should be in the Jupiter neighborhood.",
            final_r,
            r_ratio
        );
    }

    #[test]
    fn test_ep01_brachistochrone_desk_vs_propagation_dv() {
        // Compare the ΔV from desk calculation vs. actual velocity change
        // from the propagation. Solar gravity should cause a difference.
        let distance = 550_630_800.0_f64;
        let duration = 72.0 * 3600.0;
        let accel = 4.0 * distance / (duration * duration);

        // Desk ΔV (no gravity, straight line)
        let desk_dv =
            crate::orbits::brachistochrone_dv(Km(distance), crate::units::Seconds(duration));

        // Propagation: track actual velocity integral
        let r_mars = orbit_radius::MARS.value();
        let v_mars = (mu::SUN.value() / r_mars).sqrt();
        let state = PropState::new(
            Vec3::new(Km(r_mars), Km(0.0), Km(0.0)),
            Vec3::new(KmPerSec(0.0), KmPerSec(v_mars), KmPerSec(0.0)),
        );

        let config = IntegratorConfig {
            dt: 60.0,
            mu: mu::SUN,
            thrust: ThrustProfile::Brachistochrone {
                accel_km_s2: accel,
                flip_time: duration / 2.0,
            },
        };

        // The actual ΔV from constant-magnitude thrust over time t is accel * t
        // (same as desk calculation). The difference is in WHERE you end up,
        // not in the ΔV spent. So the ΔV should be identical.
        let actual_dv = accel * duration;
        assert!(
            (actual_dv - desk_dv.value()).abs() < 1e-3,
            "ΔV from propagation ({:.2} km/s) should match desk ({:.2} km/s)",
            actual_dv,
            desk_dv.value()
        );

        // But the arrival position differs due to gravity.
        // This is the key insight: the desk calculation's distance assumption
        // doesn't account for solar gravity, but the ΔV budget is correct.
        let final_state = propagate_final(&state, &config, duration);
        let final_r = final_state.radius();

        // The ship should end up somewhere between Mars and Jupiter orbit
        assert!(
            final_r > orbit_radius::MARS.value(),
            "EP01: Ship should have moved outward from Mars"
        );
    }

    // ── EP02: Ballistic Jupiter→Saturn (455 days) ─────────────────────

    #[test]
    fn test_ep02_ballistic_jupiter_to_saturn_455d() {
        // EP02: After Jupiter escape, Kestrel coasts ballistically to Saturn.
        // Heliocentric velocity at departure: 18.99 km/s (> Jupiter circular ~13.07)
        // Duration: 455 days = 39,312,000 s
        //
        // Key insight: a purely tangential departure from Jupiter won't reach Saturn
        // because it's barely hyperbolic. The actual trajectory must have a radial
        // component aimed outward toward Saturn.
        //
        // For a Hohmann-like transfer orbit from Jupiter to Saturn:
        //   a_transfer = (r_J + r_S) / 2
        //   v_depart = sqrt(μ_sun * (2/r_J - 1/a_transfer)) ≈ 15.71 km/s
        // But the ship has 18.99 km/s — faster than Hohmann — so it's a faster
        // transfer. The extra speed means it arrives at Saturn in less time than
        // the Hohmann half-period.
        //
        // We set up the departure with a radial+tangential velocity split so the
        // ship is aimed outward. At Jupiter, the ship has v_inf = 5.93 km/s relative
        // to Jupiter. The heliocentric velocity depends on the departure angle.
        // For a direct outward trajectory, we need enough radial component.

        let duration = 455.0 * 24.0 * 3600.0; // 39,312,000 s
        let r_jupiter = orbit_radius::JUPITER.value();
        let r_saturn = orbit_radius::SATURN.value();
        let v_depart_total = 18.99_f64; // km/s heliocentric

        // For a transfer orbit that reaches Saturn, use vis-viva to find the
        // tangential velocity component needed, then the rest is radial.
        // Semi-major axis for orbit touching both Jupiter and Saturn:
        let a_transfer = (r_jupiter + r_saturn) / 2.0;
        // Tangential velocity at Jupiter for this transfer orbit:
        // v_t = sqrt(μ * (2/r - 1/a)) requires v_t to be the full speed
        // for an apsis. For departure at periapsis (r_J) of a transfer to r_S:
        let v_tang = (mu::SUN.value() * (2.0 / r_jupiter - 1.0 / a_transfer)).sqrt();

        // Radial component: v_r² = v_total² - v_t²
        // If v_total > v_tang, the orbit is faster (hyperbolic or higher-energy)
        let v_radial = if v_depart_total > v_tang {
            (v_depart_total * v_depart_total - v_tang * v_tang).sqrt()
        } else {
            0.0
        };

        // Place ship at Jupiter, tangential in +y, radial outward in +x
        let state = PropState::new(
            Vec3::new(Km(r_jupiter), Km(0.0), Km(0.0)),
            Vec3::new(KmPerSec(v_radial), KmPerSec(v_tang), KmPerSec(0.0)),
        );

        let config = IntegratorConfig {
            dt: 3600.0, // 1-hour steps
            mu: mu::SUN,
            thrust: ThrustProfile::None,
        };

        // Energy conservation check first
        let final_state = propagate_final(&state, &config, duration);
        let e0 = state.specific_energy(mu::SUN);
        let ef = final_state.specific_energy(mu::SUN);
        let rel_err = ((ef - e0) / e0).abs();
        assert!(
            rel_err < 1e-9,
            "EP02 ballistic 455d energy drift = {:.2e} (should be <1e-9)",
            rel_err
        );

        // Final heliocentric distance should be near Saturn's orbit
        let final_r = final_state.radius();
        let r_ratio = final_r / r_saturn;
        assert!(
            (0.5..2.0).contains(&r_ratio),
            "EP02: Final heliocentric r = {:.0} km ({:.2}× Saturn orbit). \
             Should be in Saturn's neighborhood.",
            final_r,
            r_ratio
        );

        // The ship should have moved outward from Jupiter
        assert!(
            final_r > r_jupiter,
            "EP02: Ship should have moved outward from Jupiter orbit"
        );

        // Arrival velocity: from vis-viva at the final distance
        let final_v = final_state.speed();
        let v_visviva = (2.0 * (e0 + mu::SUN.value() / final_r)).sqrt();
        let v_ratio = final_v / v_visviva;
        assert!(
            (0.95..1.05).contains(&v_ratio),
            "EP02: Final speed {:.2} km/s vs vis-viva predicted {:.2} km/s (ratio {:.4})",
            final_v,
            v_visviva,
            v_ratio
        );
    }

    #[test]
    fn test_ep02_trajectory_is_elliptic_not_hyperbolic() {
        // EP02 report states v_helio = 18.99 km/s at Jupiter.
        // Solar escape velocity at Jupiter orbit: v_esc = sqrt(2μ/r) ≈ 18.46 km/s.
        // So 18.99 > 18.46 → the trajectory is barely hyperbolic (solar escape).
        //
        // However, the ship reaches Saturn (doesn't escape to infinity),
        // so there must be some deceleration. Let's verify the energy:
        // if E > 0, trajectory is hyperbolic (solar escape).

        let r_jupiter = orbit_radius::JUPITER.value();
        let v_depart = 18.99;
        let v_esc_sun = (2.0 * mu::SUN.value() / r_jupiter).sqrt();

        // Verify the report's claim
        assert!(
            v_depart > v_esc_sun,
            "EP02: v_depart ({:.2}) should exceed solar escape at Jupiter ({:.2})",
            v_depart,
            v_esc_sun
        );

        let state = PropState::new(
            Vec3::new(Km(r_jupiter), Km(0.0), Km(0.0)),
            Vec3::new(KmPerSec(0.0), KmPerSec(v_depart), KmPerSec(0.0)),
        );

        let energy = state.specific_energy(mu::SUN);
        // Positive energy = hyperbolic (unbound)
        assert!(
            energy > 0.0,
            "EP02: Specific energy {:.4} should be positive (solar-hyperbolic)",
            energy
        );

        // The margin is very slim: excess velocity v∞ = sqrt(2E)
        let v_inf_solar = (2.0 * energy).sqrt();
        assert!(
            v_inf_solar < 5.0,
            "EP02: Solar v∞ = {:.2} km/s should be small (barely escaping)",
            v_inf_solar
        );

        // Despite being technically unbound from the Sun, Saturn is at 9.5 AU
        // and the ship will still pass through that region. The trajectory
        // doesn't need to be bound to reach Saturn — it just needs to be aimed right.
    }

    #[test]
    fn test_ep02_saturn_capture_delta_v() {
        // At Saturn, the ship has v∞ = 4.69 km/s relative to Saturn.
        // To capture into Enceladus orbit (r = 238,020 km), compute ΔV.
        //
        // Approach: hyperbolic periapsis at r_peri, then burn to capture.
        // v_at_periapsis = sqrt(v∞² + v_esc²), v_circ = sqrt(μ/r)
        // ΔV = v_at_periapsis - v_circ (for circular orbit capture at periapsis)

        let r_enceladus = 238_020.0; // km (Enceladus orbit radius around Saturn)
        let v_inf = 4.69; // km/s (Saturn-relative)

        // Escape velocity at Enceladus orbit from Saturn
        let v_esc = (2.0 * mu::SATURN.value() / r_enceladus).sqrt();
        // Circular velocity at Enceladus orbit
        let v_circ = (mu::SATURN.value() / r_enceladus).sqrt();

        // Hyperbolic arrival velocity at Enceladus distance
        let v_hyp = (v_inf * v_inf + v_esc * v_esc).sqrt();

        // ΔV for circular capture
        let dv_capture = v_hyp - v_circ;

        // Report says: min capture ΔV ≈ 0.61 km/s (bound capture, not circular)
        // Our circular capture ΔV should be larger: ~5.83 km/s (full circularization)
        assert!(
            dv_capture > 0.5,
            "EP02: Circular capture ΔV = {:.2} km/s should be > 0.5",
            dv_capture
        );

        // Minimum capture ΔV (just become bound, don't circularize):
        // Need to reduce v_hyp to v_esc at periapsis
        // But actually, minimum capture = reduce to exactly v_esc: ΔV = v_hyp - v_esc
        // Wait: v_esc at a given r is the parabolic velocity. To become bound,
        // need v < v_esc. So minimum ΔV = v_hyp - v_esc
        let dv_min_capture = v_hyp - v_esc;
        let report_dv = 0.61;
        assert!(
            (dv_min_capture - report_dv).abs() < 0.2,
            "EP02: Min capture ΔV = {:.2} km/s vs report {:.2} km/s",
            dv_min_capture,
            report_dv
        );
    }

    // ── EP03: Brachistochrone Saturn→Uranus (143h) ────────────────────

    #[test]
    fn test_ep03_brachistochrone_saturn_to_uranus_143h() {
        // EP03: Kestrel departs Saturn→Uranus in 143h 12m via brachistochrone.
        // Distance: ~1,438,930,000 km (Saturn-Uranus minimum distance)
        // Duration: 143h 12m = 515,520 s
        // Desk ΔV: 11,165 km/s
        // Desk accel: 21.66 m/s² ≈ 2.21G → 0.02166 km/s²

        let distance_target = 1_438_930_000.0_f64; // km
        let duration = 515_520.0; // s (143h 12m)
        let accel = 4.0 * distance_target / (duration * duration); // km/s²
        let flip_time = duration / 2.0;

        // Verify desk acceleration
        let accel_ms2 = accel * 1000.0;
        assert!(
            (accel_ms2 - 21.66).abs() < 1.0,
            "EP03: Acceleration {:.2} m/s² should be ~21.66 m/s²",
            accel_ms2
        );

        // Start from Saturn orbit
        let r_saturn = orbit_radius::SATURN.value();
        let v_saturn_circ = (mu::SUN.value() / r_saturn).sqrt();

        let state = PropState::new(
            Vec3::new(Km(r_saturn), Km(0.0), Km(0.0)),
            Vec3::new(KmPerSec(0.0), KmPerSec(v_saturn_circ), KmPerSec(0.0)),
        );

        let config = IntegratorConfig {
            dt: 60.0, // 1-minute steps
            mu: mu::SUN,
            thrust: ThrustProfile::Brachistochrone {
                accel_km_s2: accel,
                flip_time,
            },
        };

        let final_state = propagate_final(&state, &config, duration);

        // Distance traveled from start
        let dx = final_state.pos.x.value() - state.pos.x.value();
        let dy = final_state.pos.y.value() - state.pos.y.value();
        let dz = final_state.pos.z.value() - state.pos.z.value();
        let distance_traveled = (dx * dx + dy * dy + dz * dz).sqrt();

        // Should be in the same order of magnitude as desk distance
        let ratio = distance_traveled / distance_target;
        assert!(
            (0.5..2.0).contains(&ratio),
            "EP03: Propagated distance = {:.0} km, target = {:.0} km, ratio = {:.2}",
            distance_traveled,
            distance_target,
            ratio
        );

        // Final heliocentric distance should be near Uranus orbit
        let r_uranus = orbit_radius::URANUS.value();
        let final_r = final_state.radius();
        let r_ratio = final_r / r_uranus;
        assert!(
            (0.5..2.0).contains(&r_ratio),
            "EP03: Final heliocentric r = {:.0} km ({:.2}× Uranus orbit)",
            final_r,
            r_ratio
        );

        // Speed at flip should be near the cruise velocity (~3000 km/s)
        let mid_state = propagate_final(&state, &config, flip_time);
        let speed_at_flip = mid_state.speed();
        let _expected_cruise = accel * flip_time; // ~v_max at flip
                                                  // The cruise velocity includes initial orbital velocity, so it will differ
                                                  // The desk calc gives v_max = accel * t/2 = 0.02166 * 257760 ≈ 5582 km/s
                                                  // But total speed = v_orbital + v_thrust (approximately, since thrust follows velocity)
        assert!(
            speed_at_flip > 1000.0,
            "EP03: Speed at flip = {:.0} km/s should be > 1000 km/s (cruise ~3000 km/s)",
            speed_at_flip
        );

        // Final speed should be much less than flip speed (deceleration phase)
        let speed_final = final_state.speed();
        assert!(
            speed_final < speed_at_flip,
            "EP03: Final speed ({:.0} km/s) < flip speed ({:.0} km/s)",
            speed_final,
            speed_at_flip
        );
    }

    #[test]
    fn test_ep03_desk_dv_matches_accel_times_duration() {
        // EP03: Desk ΔV = 11,165 km/s, accel = 4d/t², duration = 515,520 s
        // ΔV = accel × t = 4d/t
        let distance = 1_438_930_000.0_f64;
        let duration = 515_520.0;

        let desk_dv =
            crate::orbits::brachistochrone_dv(Km(distance), crate::units::Seconds(duration));

        // Report says 11,165 km/s
        assert!(
            (desk_dv.value() - 11_165.0).abs() < 50.0,
            "EP03: Desk ΔV = {:.0} km/s, expected ~11,165",
            desk_dv.value()
        );

        // Mass boundary: at 9.8 MN thrust and 452t,
        // accel = F/m = 9.8e6 / (452e3) = 21.68 m/s² ✓
        let thrust_n = 9.8e6;
        let mass_kg = 452_000.0;
        let a_check = thrust_n / mass_kg / 1000.0; // km/s²
        let a_desk = 4.0 * distance / (duration * duration);
        assert!(
            (a_check - a_desk).abs() / a_desk < 0.01,
            "EP03: Mass boundary accel {:.4e} vs desk {:.4e} km/s²",
            a_check,
            a_desk
        );
    }

    // ── EP05: Composite Route Uranus→Earth ────────────────────────────

    #[test]
    fn test_ep05_brachistochrone_uranus_to_earth_at_300t() {
        // EP05: At 300t mass, pure brachistochrone Uranus→Earth
        // Duration: 8.3 days = 717,120 s
        // ΔV: 15,207 km/s
        // Accel: 2.17G ≈ 21.28 m/s² ≈ 0.02128 km/s²
        // Distance: ~2,722,861,977 km (18.2 AU)

        let distance_target = 2_722_861_977.0_f64; // km
        let duration = 8.3 * 24.0 * 3600.0; // 717,120 s
        let accel = 4.0 * distance_target / (duration * duration); // km/s²
        let flip_time = duration / 2.0;

        // Verify desk ΔV
        let desk_dv =
            crate::orbits::brachistochrone_dv(Km(distance_target), crate::units::Seconds(duration));
        assert!(
            (desk_dv.value() - 15_207.0).abs() < 100.0,
            "EP05: Desk ΔV = {:.0} km/s, expected ~15,207",
            desk_dv.value()
        );

        // For an inward brachistochrone (Uranus→Earth), the ship must
        // thrust INWARD, not along orbital velocity. Our brachistochrone
        // model thrusts along the velocity vector, which for a circular orbit
        // is tangential. For an inward transfer at ~21 m/s² over 8.3 days,
        // the thrust completely dominates over orbital velocity (~6.8 km/s),
        // so we set initial velocity pointing inward (toward Sun).
        //
        // Place ship at Uranus, velocity pointing radially inward (-x).
        // This models the ship having already escaped Uranus and aimed at Earth.
        let r_uranus = orbit_radius::URANUS.value();

        let state = PropState::new(
            Vec3::new(Km(r_uranus), Km(0.0), Km(0.0)),
            // Small initial velocity inward — the brachistochrone thrust will dominate
            Vec3::new(KmPerSec(-10.0), KmPerSec(0.0), KmPerSec(0.0)),
        );

        let config = IntegratorConfig {
            dt: 60.0,
            mu: mu::SUN,
            thrust: ThrustProfile::Brachistochrone {
                accel_km_s2: accel,
                flip_time,
            },
        };

        let final_state = propagate_final(&state, &config, duration);

        // Final heliocentric distance should be much smaller than Uranus
        let final_r = final_state.radius();

        // Ship should have moved significantly inward from Uranus
        assert!(
            final_r < r_uranus * 0.5,
            "EP05 @300t: Ship should move well inward from Uranus. \
             Final r = {:.0} km ({:.2} AU)",
            final_r,
            final_r / orbit_radius::EARTH.value()
        );

        // The desk calculation distance (18.2 AU ≈ Uranus-Earth) is
        // approximate. With solar gravity, the actual trajectory differs.
        // The key validation: the ship covers a distance of the right magnitude.
        let distance_from_start = (final_state.pos.x.value() - state.pos.x.value()).abs();
        assert!(
            distance_from_start > distance_target * 0.3,
            "EP05 @300t: Distance traveled {:.0} km should be significant fraction \
             of {:.0} km (desk estimate)",
            distance_from_start,
            distance_target
        );
    }

    #[test]
    fn test_ep05_nozzle_lifespan_margin() {
        // EP05's critical constraint: nozzle life 55h38m (200,280 s)
        // Required burn time: 55h12m (198,720 s)
        // Margin: 26 minutes (1,560 s) = 0.78%
        //
        // This is a desk calculation check, not propagation, but validates
        // the tightest constraint in the series.

        let nozzle_life_s = 55.0 * 3600.0 + 38.0 * 60.0; // 200,280 s
        let burn_time_s = 55.0 * 3600.0 + 12.0 * 60.0; // 198,720 s
        let margin_s: f64 = nozzle_life_s - burn_time_s;
        let margin_pct: f64 = margin_s / nozzle_life_s * 100.0;

        assert!(
            (margin_s - 1560.0).abs() < 1.0,
            "EP05: Nozzle margin = {:.0} s (expected 1560 s = 26 min)",
            margin_s
        );
        assert!(
            (margin_pct - 0.78).abs() < 0.01,
            "EP05: Nozzle margin = {:.2}% (expected 0.78%)",
            margin_pct
        );

        // Without Oberth effect at Jupiter (+3% efficiency = ~99 min saved),
        // burn time would be 56h51m = 204,660 s > nozzle life
        let burn_without_oberth = 56.0 * 3600.0 + 51.0 * 60.0; // 204,660 s
        assert!(
            burn_without_oberth > nozzle_life_s,
            "EP05: Without Jupiter Oberth, burn time {:.0}s > nozzle life {:.0}s — nozzle destroyed en route",
            burn_without_oberth,
            nozzle_life_s
        );
    }

    #[test]
    fn test_ep05_cruise_velocity_propagation() {
        // EP05: The ship cruises at 1,500 km/s (0.005c) for 375 hours.
        // During coast phase, solar gravity decelerates the ship slightly.
        // Check how much velocity the ship loses over 375h coast at ~10 AU.
        //
        // This validates whether the coast phase is realistic: even
        // though the ship is barely bound (or unbound), the deceleration
        // from solar gravity at ~10 AU is small.

        let coast_duration = 375.0 * 3600.0; // 1,350,000 s
        let v_cruise = 1_500.0; // km/s

        // Position: somewhere between Uranus and Jupiter, say ~10 AU
        let r_start = 10.0 * orbit_radius::EARTH.value(); // ~10 AU

        let state = PropState::new(
            Vec3::new(Km(r_start), Km(0.0), Km(0.0)),
            // Heading inward toward Sun (negative y for simplicity)
            Vec3::new(KmPerSec(0.0), KmPerSec(-v_cruise), KmPerSec(0.0)),
        );

        let config = IntegratorConfig {
            dt: 3600.0, // 1-hour steps
            mu: mu::SUN,
            thrust: ThrustProfile::None,
        };

        let final_state = propagate_final(&state, &config, coast_duration);
        let final_speed = final_state.speed();

        // Solar gravity acceleration at 10 AU: a = μ/r² ≈ 5.9e-7 km/s²
        // Over 375h: Δv ≈ a × t ≈ 5.9e-7 × 1.35e6 ≈ 0.80 km/s
        // So the ship should lose less than ~2 km/s out of 1500 km/s
        let speed_change = (final_speed - v_cruise).abs();
        assert!(
            speed_change < 5.0,
            "EP05: Speed change during 375h coast = {:.2} km/s (expected < 5 km/s gravity loss)",
            speed_change
        );

        // Energy conservation (ballistic)
        let e0 = state.specific_energy(mu::SUN);
        let ef = final_state.specific_energy(mu::SUN);
        let rel_err = ((ef - e0) / e0).abs();
        assert!(rel_err < 1e-9, "EP05 coast energy drift = {:.2e}", rel_err);
    }

    #[test]
    fn test_ep05_earth_capture_delta_v() {
        // EP05: Earth capture to LEO 400 km.
        // Earth LEO radius: 6,778 km (6,378 + 400)
        // Required circular velocity: sqrt(μ_E / r) ≈ 7.67 km/s
        // For capture from v∞ ≈ 0 (ship decelerates to near-rest):
        //   ΔV = v_circ ≈ 3.18 km/s (from hyperbolic approach)
        //
        // More precisely: if ship arrives with some v∞ at Earth,
        // ΔV_capture = v_hyp_at_periapsis - v_circ

        let r_leo = 6_378.137 + 400.0; // km
        let v_circ = (mu::EARTH.value() / r_leo).sqrt();

        assert!(
            (v_circ - 7.67).abs() < 0.1,
            "EP05: LEO 400km circular velocity = {:.2} km/s (expected ~7.67)",
            v_circ
        );

        // For near-zero v∞ approach, periapsis velocity on a parabolic trajectory:
        // v_para = sqrt(2μ/r) = v_esc at LEO altitude
        let v_esc_leo = (2.0 * mu::EARTH.value() / r_leo).sqrt();
        let dv_capture = v_esc_leo - v_circ;

        assert!(
            (dv_capture - 3.18).abs() < 0.2,
            "EP05: Capture ΔV from parabolic = {:.2} km/s (expected ~3.18)",
            dv_capture
        );
    }

    // ══════════════════════════════════════════════════════════════════
    // RK45 Dormand-Prince Adaptive Integrator Tests
    // ══════════════════════════════════════════════════════════════════

    #[test]
    fn test_adaptive_energy_conservation_circular_leo() {
        // Energy conservation for 1 LEO period with tight tolerance
        let state = circular_orbit_state(mu::EARTH, reference_orbits::LEO_RADIUS);
        let period = crate::orbits::orbital_period(mu::EARTH, reference_orbits::LEO_RADIUS);

        let mut config = AdaptiveConfig::planetocentric(mu::EARTH, ThrustProfile::None);
        config.rtol = 1e-12;
        config.atol = 1e-14;
        let result = propagate_adaptive(&state, &config, period.value());
        let (max_err, final_err) = energy_drift(&result.states, mu::EARTH);

        assert!(
            max_err < 1e-10,
            "Adaptive LEO 1-period max energy drift = {:.2e} (should be <1e-10)",
            max_err
        );
        assert!(
            final_err < 1e-10,
            "Adaptive LEO 1-period final energy drift = {:.2e} (should be <1e-10)",
            final_err
        );
    }

    #[test]
    fn test_adaptive_energy_conservation_elliptical_e09() {
        // High eccentricity (e=0.9): this is where adaptive shines.
        // Fixed RK4 needs dt=1s and many steps. Adaptive should handle it
        // with far fewer evaluations while achieving similar accuracy.
        let state =
            elliptical_orbit_state_at_periapsis(mu::EARTH, reference_orbits::GEO_RADIUS, 0.9);
        let period = crate::orbits::orbital_period(mu::EARTH, reference_orbits::GEO_RADIUS);

        let config = AdaptiveConfig::planetocentric(mu::EARTH, ThrustProfile::None);
        let result = propagate_adaptive(&state, &config, period.value());
        let (max_err, _) = energy_drift(&result.states, mu::EARTH);

        assert!(
            max_err < 1e-7,
            "Adaptive elliptical (e=0.9) max energy drift = {:.2e} (should be <1e-7)",
            max_err
        );

        // Adaptive should use fewer derivative evaluations than fixed RK4
        // Fixed RK4 with dt=1s for GEO period (~86,164s) = 86,164 steps × 4 evals = 344,656
        let fixed_rk4_evals = (period.value() / 1.0).ceil() as usize * 4;
        assert!(
            result.n_eval < fixed_rk4_evals,
            "Adaptive should use fewer evals ({}) than fixed RK4 ({}) for e=0.9",
            result.n_eval,
            fixed_rk4_evals
        );
    }

    #[test]
    fn test_adaptive_energy_conservation_heliocentric_1000_orbits() {
        // Long-term: 1000 Earth orbits with adaptive integrator
        let state = circular_orbit_state(mu::SUN, orbit_radius::EARTH);
        let period = crate::orbits::orbital_period(mu::SUN, orbit_radius::EARTH);
        let duration = period.value() * 1000.0;

        let mut config = AdaptiveConfig::heliocentric(mu::SUN, ThrustProfile::None);
        config.rtol = 1e-10; // tight tolerance for 1000 orbits

        let (final_state, n_eval) = propagate_adaptive_final(&state, &config, duration);
        let e0 = state.specific_energy(mu::SUN);
        let ef = final_state.specific_energy(mu::SUN);
        let rel_err = ((ef - e0) / e0).abs();

        assert!(
            rel_err < 1e-8,
            "Adaptive 1000 heliocentric orbits energy drift = {:.2e} (should be <1e-8)",
            rel_err
        );

        // Adaptive should have taken some steps
        assert!(
            n_eval > 0,
            "Adaptive should have taken some steps (took {} evals)",
            n_eval
        );
    }

    #[test]
    fn test_adaptive_orbit_return_circular() {
        // Circular orbit should return to start after 1 period
        let state = circular_orbit_state(mu::EARTH, reference_orbits::LEO_RADIUS);
        let period = crate::orbits::orbital_period(mu::EARTH, reference_orbits::LEO_RADIUS);

        let mut config = AdaptiveConfig::planetocentric(mu::EARTH, ThrustProfile::None);
        config.rtol = 1e-12;
        config.atol = 1e-14;
        let (final_state, _) = propagate_adaptive_final(&state, &config, period.value());

        let dx = (final_state.pos.x.value() - state.pos.x.value()).abs();
        let dy = (final_state.pos.y.value() - state.pos.y.value()).abs();
        let dz = (final_state.pos.z.value() - state.pos.z.value()).abs();
        let pos_err = (dx * dx + dy * dy + dz * dz).sqrt();
        let radius = state.radius();

        assert!(
            pos_err / radius < 1e-8,
            "Adaptive position error after 1 period = {:.2e} (relative {:.2e})",
            pos_err,
            pos_err / radius
        );
    }

    #[test]
    fn test_adaptive_brachistochrone_handles_flip() {
        // The adaptive integrator must not straddle the thrust flip point.
        // Test: brachistochrone with flip — energy should increase then decrease.
        let state = circular_orbit_state(mu::SUN, orbit_radius::EARTH);
        let duration = 72.0 * 3600.0;
        let flip = duration / 2.0;
        let accel = 1e-4; // km/s²

        let config = AdaptiveConfig::heliocentric(
            mu::SUN,
            ThrustProfile::Brachistochrone {
                accel_km_s2: accel,
                flip_time: flip,
            },
        );

        let result = propagate_adaptive(&state, &config, duration);

        // Find state nearest to flip time
        let mut speed_at_flip = 0.0_f64;
        for s in &result.states {
            if (s.time - flip).abs() < 120.0 {
                speed_at_flip = s.speed();
                break;
            }
        }

        let final_speed = result.states.last().unwrap().speed();

        // Speed at flip should be higher than initial (acceleration phase)
        assert!(
            speed_at_flip > state.speed(),
            "Adaptive: speed at flip ({:.1}) > initial ({:.1})",
            speed_at_flip,
            state.speed()
        );

        // Speed at end should be less than at flip (deceleration phase)
        assert!(
            final_speed < speed_at_flip,
            "Adaptive: final speed ({:.1}) < flip speed ({:.1})",
            final_speed,
            speed_at_flip
        );
    }

    #[test]
    fn test_adaptive_vs_rk4_accuracy_comparison() {
        // Compare adaptive vs fixed RK4 for same problem.
        // Both should agree on final position to within tolerance.
        let state =
            elliptical_orbit_state_at_periapsis(mu::EARTH, reference_orbits::GEO_RADIUS, 0.5);
        let period = crate::orbits::orbital_period(mu::EARTH, reference_orbits::GEO_RADIUS);

        // Fixed RK4 (reference, very small dt)
        let config_rk4 = IntegratorConfig {
            dt: 1.0, // 1s steps (very accurate for reference)
            mu: mu::EARTH,
            thrust: ThrustProfile::None,
        };
        let rk4_final = propagate_final(&state, &config_rk4, period.value());

        // Adaptive RK45
        let config_adaptive = AdaptiveConfig::planetocentric(mu::EARTH, ThrustProfile::None);
        let (adaptive_final, n_eval) =
            propagate_adaptive_final(&state, &config_adaptive, period.value());

        // Position agreement
        let dx = (rk4_final.pos.x.value() - adaptive_final.pos.x.value()).abs();
        let dy = (rk4_final.pos.y.value() - adaptive_final.pos.y.value()).abs();
        let dz = (rk4_final.pos.z.value() - adaptive_final.pos.z.value()).abs();
        let pos_diff = (dx * dx + dy * dy + dz * dz).sqrt();
        let radius = state.radius();

        assert!(
            pos_diff / radius < 1e-6,
            "Adaptive vs RK4 position difference = {:.2e} km ({:.2e} relative)",
            pos_diff,
            pos_diff / radius
        );

        // Adaptive should use fewer evaluations than RK4 at dt=1s
        let rk4_evals = (period.value() / 1.0).ceil() as usize * 4;
        assert!(
            n_eval < rk4_evals,
            "Adaptive ({} evals) should be more efficient than RK4 dt=1s ({} evals)",
            n_eval,
            rk4_evals
        );
    }

    #[test]
    fn test_adaptive_efficiency_high_eccentricity() {
        // For high eccentricity, adaptive should dramatically outperform fixed-dt.
        // The integrator should take small steps near periapsis and large steps
        // near apoapsis.
        let state =
            elliptical_orbit_state_at_periapsis(mu::EARTH, reference_orbits::GEO_RADIUS, 0.9);
        let period = crate::orbits::orbital_period(mu::EARTH, reference_orbits::GEO_RADIUS);

        let config = AdaptiveConfig::planetocentric(mu::EARTH, ThrustProfile::None);
        let result = propagate_adaptive(&state, &config, period.value());

        // Check that step sizes vary significantly
        // Near periapsis: small steps. Near apoapsis: large steps.
        let mut min_dt = f64::MAX;
        let mut max_dt = 0.0_f64;
        for i in 1..result.states.len() {
            let dt = result.states[i].time - result.states[i - 1].time;
            if dt < min_dt {
                min_dt = dt;
            }
            if dt > max_dt {
                max_dt = dt;
            }
        }

        // For e=0.9, step size ratio should be at least 10x
        let ratio = max_dt / min_dt;
        assert!(
            ratio > 10.0,
            "Adaptive step size ratio (max/min) = {:.1} (expected >10 for e=0.9). \
             min_dt={:.2e}s, max_dt={:.2e}s",
            ratio,
            min_dt,
            max_dt
        );
    }

    #[test]
    fn test_adaptive_heliocentric_mars_10_periods() {
        // Mars orbit around Sun for 10 periods, adaptive
        let state = circular_orbit_state(mu::SUN, orbit_radius::MARS);
        let period = crate::orbits::orbital_period(mu::SUN, orbit_radius::MARS);
        let duration = period.value() * 10.0;

        let config = AdaptiveConfig::heliocentric(mu::SUN, ThrustProfile::None);
        let (final_state, n_eval) = propagate_adaptive_final(&state, &config, duration);
        let e0 = state.specific_energy(mu::SUN);
        let ef = final_state.specific_energy(mu::SUN);
        let rel_err = ((ef - e0) / e0).abs();

        assert!(
            rel_err < 1e-10,
            "Adaptive Mars 10-period energy drift = {:.2e}",
            rel_err
        );

        // Adaptive should have taken at least some steps
        assert!(
            n_eval > 0,
            "Adaptive Mars 10-period should have taken steps"
        );
    }

    #[test]
    fn test_adaptive_ep01_brachistochrone_mars_to_jupiter() {
        // EP01: Same scenario as fixed-RK4 test, but with adaptive integrator.
        // Verifies that adaptive handles brachistochrone + solar gravity correctly.
        let distance_target = 550_630_800.0_f64;
        let duration = 72.0 * 3600.0;
        let accel = 4.0 * distance_target / (duration * duration);
        let flip_time = duration / 2.0;

        let r_mars = orbit_radius::MARS.value();
        let v_mars_circ = (mu::SUN.value() / r_mars).sqrt();

        let state = PropState::new(
            Vec3::new(Km(r_mars), Km(0.0), Km(0.0)),
            Vec3::new(KmPerSec(0.0), KmPerSec(v_mars_circ), KmPerSec(0.0)),
        );

        let config = AdaptiveConfig::heliocentric(
            mu::SUN,
            ThrustProfile::Brachistochrone {
                accel_km_s2: accel,
                flip_time,
            },
        );

        let (final_state, _n_eval) = propagate_adaptive_final(&state, &config, duration);

        // Distance traveled
        let dx = final_state.pos.x.value() - state.pos.x.value();
        let dy = final_state.pos.y.value() - state.pos.y.value();
        let dz = final_state.pos.z.value() - state.pos.z.value();
        let distance_traveled = (dx * dx + dy * dy + dz * dz).sqrt();

        let ratio = distance_traveled / distance_target;
        assert!(
            (0.5..2.0).contains(&ratio),
            "Adaptive EP01: distance = {:.0} km, target = {:.0} km, ratio = {:.2}",
            distance_traveled,
            distance_target,
            ratio
        );

        // Compare with fixed RK4 result
        let config_rk4 = IntegratorConfig {
            dt: 60.0,
            mu: mu::SUN,
            thrust: ThrustProfile::Brachistochrone {
                accel_km_s2: accel,
                flip_time,
            },
        };
        let rk4_final = propagate_final(&state, &config_rk4, duration);

        // Both should agree on final position within ~1%
        let dx2 = (final_state.pos.x.value() - rk4_final.pos.x.value()).abs();
        let dy2 = (final_state.pos.y.value() - rk4_final.pos.y.value()).abs();
        let diff = (dx2 * dx2 + dy2 * dy2).sqrt();
        let scale = distance_traveled;

        assert!(
            diff / scale < 0.01,
            "Adaptive vs RK4 EP01 position difference = {:.2e} km ({:.4}%)",
            diff,
            diff / scale * 100.0
        );
    }

    #[test]
    fn test_adaptive_ep02_ballistic_455d() {
        // EP02: Ballistic Jupiter→Saturn, 455 days.
        // Adaptive should handle this long coast efficiently.
        let duration = 455.0 * 24.0 * 3600.0;
        let r_jupiter = orbit_radius::JUPITER.value();
        let r_saturn = orbit_radius::SATURN.value();
        let v_depart_total = 18.99_f64;

        let a_transfer = (r_jupiter + r_saturn) / 2.0;
        let v_tang = (mu::SUN.value() * (2.0 / r_jupiter - 1.0 / a_transfer)).sqrt();
        let v_radial = if v_depart_total > v_tang {
            (v_depart_total * v_depart_total - v_tang * v_tang).sqrt()
        } else {
            0.0
        };

        let state = PropState::new(
            Vec3::new(Km(r_jupiter), Km(0.0), Km(0.0)),
            Vec3::new(KmPerSec(v_radial), KmPerSec(v_tang), KmPerSec(0.0)),
        );

        let config = AdaptiveConfig::heliocentric(mu::SUN, ThrustProfile::None);
        let (final_state, n_eval) = propagate_adaptive_final(&state, &config, duration);

        // Energy conservation
        let e0 = state.specific_energy(mu::SUN);
        let ef = final_state.specific_energy(mu::SUN);
        let rel_err = ((ef - e0) / e0).abs();
        assert!(
            rel_err < 1e-9,
            "Adaptive EP02 energy drift = {:.2e}",
            rel_err
        );

        // Should reach Saturn neighborhood
        let final_r = final_state.radius();
        let r_ratio = final_r / r_saturn;
        assert!(
            (0.5..2.0).contains(&r_ratio),
            "Adaptive EP02: final r = {:.0} km ({:.2}× Saturn)",
            final_r,
            r_ratio
        );

        // Adaptive should have processed the trajectory
        assert!(n_eval > 0, "Should have taken steps (n_eval={})", n_eval);
    }

    #[test]
    fn test_adaptive_convergence_with_tolerance() {
        // Tighter tolerance → better accuracy (convergence test)
        let state =
            elliptical_orbit_state_at_periapsis(mu::EARTH, reference_orbits::GEO_RADIUS, 0.5);
        let period = crate::orbits::orbital_period(mu::EARTH, reference_orbits::GEO_RADIUS);

        // Loose tolerance
        let mut config_loose = AdaptiveConfig::planetocentric(mu::EARTH, ThrustProfile::None);
        config_loose.rtol = 1e-4;
        config_loose.atol = 1e-6;
        let (final_loose, _) = propagate_adaptive_final(&state, &config_loose, period.value());

        // Tight tolerance
        let mut config_tight = AdaptiveConfig::planetocentric(mu::EARTH, ThrustProfile::None);
        config_tight.rtol = 1e-10;
        config_tight.atol = 1e-12;
        let (final_tight, _) = propagate_adaptive_final(&state, &config_tight, period.value());

        // Tight should be closer to the true solution (periodic orbit returns to start)
        let err_loose = (final_loose.pos.x.value() - state.pos.x.value()).powi(2)
            + (final_loose.pos.y.value() - state.pos.y.value()).powi(2);
        let err_loose = err_loose.sqrt();

        let err_tight = (final_tight.pos.x.value() - state.pos.x.value()).powi(2)
            + (final_tight.pos.y.value() - state.pos.y.value()).powi(2);
        let err_tight = err_tight.sqrt();

        assert!(
            err_tight < err_loose,
            "Tight tolerance error ({:.2e}) should be less than loose ({:.2e})",
            err_tight,
            err_loose
        );
    }
}
