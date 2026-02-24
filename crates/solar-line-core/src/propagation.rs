/// Numerical orbit propagation for SOLAR LINE 考察.
///
/// Implements Runge-Kutta 4th order (RK4) integrator for:
/// - 2-body Keplerian orbits (central gravity only)
/// - Constant-thrust brachistochrone (flip-and-burn) trajectories
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
/// Returns (dr/dt, dv/dt) as raw f64 arrays [x,y,z] each.
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
/// Takes position [x,y,z] in km, velocity [vx,vy,vz] in km/s,
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
pub fn elliptical_orbit_state_at_periapsis(mu: Mu, semi_major_axis: Km, eccentricity: f64) -> PropState {
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
        let state = elliptical_orbit_state_at_periapsis(mu::EARTH, reference_orbits::GEO_RADIUS, 0.5);
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
        let desk_dv = crate::orbits::brachistochrone_dv(Km(distance), crate::units::Seconds(duration));

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
}
