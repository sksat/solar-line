/// solar-line-core: Orbital mechanics analysis for SOLAR LINE 考察.
///
/// Provides type-safe orbital mechanics primitives for analyzing
/// the ΔV and orbital transfer depictions in the SOLAR LINE series.
pub mod units;
pub mod vec3;
pub mod constants;
pub mod orbits;
pub mod kepler;

// Re-export commonly used items for convenience
pub use units::{Eccentricity, Km, KmPerSec, Mu, Radians, Seconds};
pub use vec3::Vec3;
pub use constants::mu;
pub use orbits::{
    brachistochrone_accel, brachistochrone_dv, brachistochrone_max_distance,
    hohmann_transfer_dv, orbital_period, specific_angular_momentum, specific_energy, vis_viva,
    OrbitalElements, StateVector,
};
pub use kepler::{mean_to_true_anomaly, solve_kepler};
