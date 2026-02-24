pub mod attitude;
pub mod comms;
pub mod constants;
pub mod dag;
pub mod ephemeris;
pub mod flyby;
pub mod kepler;
pub mod mass_timeline;
pub mod orbits;
pub mod plasmoid;
pub mod propagation;
/// solar-line-core: Orbital mechanics analysis for SOLAR LINE 考察.
///
/// Provides type-safe orbital mechanics primitives for analyzing
/// the ΔV and orbital transfer depictions in the SOLAR LINE series.
pub mod units;
pub mod vec3;

// Re-export commonly used items for convenience
pub use constants::mu;
pub use kepler::{mean_to_true_anomaly, solve_kepler};
pub use orbits::{
    brachistochrone_accel, brachistochrone_dv, brachistochrone_max_distance, exhaust_velocity,
    hohmann_transfer_dv, initial_mass, jet_power, mass_flow_rate, mass_ratio, orbital_period,
    propellant_fraction, required_propellant_mass, specific_angular_momentum, specific_energy,
    vis_viva, OrbitalElements, StateVector,
};
pub use units::{Eccentricity, Km, KmPerSec, Mu, Radians, Seconds};
pub use vec3::Vec3;

pub use ephemeris::{Planet, PlanetPosition};
