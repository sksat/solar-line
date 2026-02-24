/// Approximate planetary ephemeris for SOLAR LINE analysis.
///
/// Uses mean Keplerian elements with linear secular rates (J2000 epoch).
/// Source: Standish & Williams (JPL), "Keplerian Elements for Approximate
/// Positions of the Major Planets" (valid 3000 BC – 3000 AD for outer planets).
///
/// Accuracy: ~1° for outer planets over century timescales. Sufficient for
/// determining launch windows and phase angles in fiction analysis.
///
/// Reference frame: J2000 ecliptic, heliocentric.
use crate::constants::{mu, orbit_radius};
use crate::kepler;
use crate::units::{Eccentricity, Km, Mu, Radians, Seconds};
use std::f64::consts::PI;

/// Julian Date of J2000.0 epoch (2000-01-01 12:00:00 TT)
pub const J2000_JD: f64 = 2_451_545.0;

/// Julian century in days
const JULIAN_CENTURY_DAYS: f64 = 36525.0;

/// Seconds per day
const SECONDS_PER_DAY: f64 = 86400.0;

/// Planets supported by the ephemeris
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Planet {
    Mercury,
    Venus,
    Earth,
    Mars,
    Jupiter,
    Saturn,
    Uranus,
    Neptune,
}

impl Planet {
    /// All planets in order from Sun
    pub const ALL: [Planet; 8] = [
        Planet::Mercury,
        Planet::Venus,
        Planet::Earth,
        Planet::Mars,
        Planet::Jupiter,
        Planet::Saturn,
        Planet::Uranus,
        Planet::Neptune,
    ];

    /// Semi-major axis (mean value) in km
    pub fn semi_major_axis(self) -> Km {
        match self {
            Planet::Mercury => orbit_radius::MERCURY,
            Planet::Venus => orbit_radius::VENUS,
            Planet::Earth => orbit_radius::EARTH,
            Planet::Mars => orbit_radius::MARS,
            Planet::Jupiter => orbit_radius::JUPITER,
            Planet::Saturn => orbit_radius::SATURN,
            Planet::Uranus => orbit_radius::URANUS,
            Planet::Neptune => Km(4_495_060_000.0),
        }
    }

    /// Gravitational parameter μ = GM in km³/s²
    pub fn mu(self) -> Mu {
        match self {
            Planet::Mercury => mu::MERCURY,
            Planet::Venus => mu::VENUS,
            Planet::Earth => mu::EARTH,
            Planet::Mars => mu::MARS,
            Planet::Jupiter => mu::JUPITER,
            Planet::Saturn => mu::SATURN,
            Planet::Uranus => mu::URANUS,
            Planet::Neptune => mu::NEPTUNE,
        }
    }
}

/// Mean Keplerian elements at epoch with linear secular rates.
///
/// Elements: a, e, I, L (mean longitude), ω̃ (longitude of perihelion), Ω (RAAN)
/// Each has a value at J2000 and a rate per Julian century.
#[derive(Debug, Clone, Copy)]
pub struct MeanElements {
    /// Semi-major axis at J2000 (AU)
    pub a0: f64,
    /// Semi-major axis rate (AU/century)
    pub a_dot: f64,
    /// Eccentricity at J2000
    pub e0: f64,
    /// Eccentricity rate (per century)
    pub e_dot: f64,
    /// Inclination at J2000 (degrees)
    pub i0: f64,
    /// Inclination rate (degrees/century)
    pub i_dot: f64,
    /// Mean longitude at J2000 (degrees)
    pub l0: f64,
    /// Mean longitude rate (degrees/century)
    pub l_dot: f64,
    /// Longitude of perihelion at J2000 (degrees)
    pub w_bar0: f64,
    /// Longitude of perihelion rate (degrees/century)
    pub w_bar_dot: f64,
    /// Longitude of ascending node at J2000 (degrees)
    pub omega0: f64,
    /// Longitude of ascending node rate (degrees/century)
    pub omega_dot: f64,
}

/// AU to km conversion factor
const AU_KM: f64 = 149_597_870.7;

/// Get mean Keplerian elements for a planet.
///
/// Source: Standish & Williams, JPL
/// "Keplerian Elements for Approximate Positions of the Major Planets"
/// Table 1 (valid 3000 BC – 3000 AD)
pub fn mean_elements(planet: Planet) -> MeanElements {
    match planet {
        Planet::Mercury => MeanElements {
            a0: 0.387_098_31,
            a_dot: 0.0,
            e0: 0.205_630_69,
            e_dot: 0.000_020_04,
            i0: 7.004_86,
            i_dot: -0.005_93,
            l0: 252.250_84,
            l_dot: 149_472.674_11,
            w_bar0: 77.456_45,
            w_bar_dot: 0.159_29,
            omega0: 48.330_67,
            omega_dot: -0.125_34,
        },
        Planet::Venus => MeanElements {
            a0: 0.723_329_56,
            a_dot: 0.0,
            e0: 0.006_773_23,
            e_dot: -0.000_047_64,
            i0: 3.394_71,
            i_dot: -0.008_67,
            l0: 181.979_73,
            l_dot: 58_517.815_39,
            w_bar0: 131.563_70,
            w_bar_dot: 0.002_68,
            omega0: 76.679_92,
            omega_dot: -0.278_01,
        },
        Planet::Earth => MeanElements {
            a0: 1.000_002_61,
            a_dot: 0.000_005_62,
            e0: 0.016_708_57,
            e_dot: -0.000_042_04,
            i0: -0.000_15,
            i_dot: -0.013_37,
            l0: 100.464_57,
            l_dot: 35_999.372_44,
            w_bar0: 102.937_35,
            w_bar_dot: 0.323_29,
            omega0: 0.0,
            omega_dot: 0.0,
        },
        Planet::Mars => MeanElements {
            a0: 1.523_662_31,
            a_dot: -0.000_073_28,
            e0: 0.093_412_33,
            e_dot: 0.000_090_48,
            i0: 1.850_26,
            i_dot: -0.006_75,
            l0: -4.553_43,
            l_dot: 19_140.299_34,
            w_bar0: -23.943_62,
            w_bar_dot: 0.445_41,
            omega0: 49.558_09,
            omega_dot: -0.291_08,
        },
        Planet::Jupiter => MeanElements {
            a0: 5.202_603_91,
            a_dot: 0.000_016_63,
            e0: 0.048_497_64,
            e_dot: 0.000_163_41,
            i0: 1.303_30,
            i_dot: -0.001_98,
            l0: 34.396_44,
            l_dot: 3_034.905_67,
            w_bar0: 14.728_47,
            w_bar_dot: 0.215_36,
            omega0: 100.464_44,
            omega_dot: 0.176_56,
        },
        Planet::Saturn => MeanElements {
            a0: 9.554_909_16,
            a_dot: -0.000_213_89,
            e0: 0.055_508_62,
            e_dot: -0.000_346_61,
            i0: 2.488_68,
            i_dot: 0.007_74,
            l0: 49.954_24,
            l_dot: 1_222.113_71,
            w_bar0: 92.598_87,
            w_bar_dot: -0.418_97,
            omega0: 113.665_24,
            omega_dot: -0.250_60,
        },
        Planet::Uranus => MeanElements {
            a0: 19.218_446_10,
            a_dot: -0.000_202_57,
            e0: 0.046_295_11,
            e_dot: -0.000_030_26,
            i0: 0.773_20,
            i_dot: 0.000_74,
            l0: 313.238_18,
            l_dot: 428.481_03,
            w_bar0: 170.954_27,
            w_bar_dot: 0.403_17,
            omega0: 74.016_92,
            omega_dot: 0.042_40,
        },
        Planet::Neptune => MeanElements {
            a0: 30.110_386_88,
            a_dot: 0.000_069_47,
            e0: 0.008_989_22,
            e_dot: 0.000_006_06,
            i0: 1.769_17,
            i_dot: -0.005_42,
            l0: -55.120_02,
            l_dot: 218.456_52,
            w_bar0: 44.964_76,
            w_bar_dot: -0.326_36,
            omega0: 131.784_06,
            omega_dot: -0.006_51,
        },
    }
}

/// Convert calendar date to Julian Date.
///
/// Valid for dates after 1582-10-15 (Gregorian calendar).
/// Uses the standard algorithm from Meeus, "Astronomical Algorithms".
pub fn calendar_to_jd(year: i32, month: u32, day: f64) -> f64 {
    let (y, m) = if month <= 2 {
        (year as f64 - 1.0, month as f64 + 12.0)
    } else {
        (year as f64, month as f64)
    };

    let a = (y / 100.0).floor();
    let b = 2.0 - a + (a / 4.0).floor();

    (365.25 * (y + 4716.0)).floor() + (30.6001 * (m + 1.0)).floor() + day + b - 1524.5
}

/// Convert Julian Date to calendar date (year, month, day with fractional part).
pub fn jd_to_calendar(jd: f64) -> (i32, u32, f64) {
    let z = (jd + 0.5).floor();
    let f = jd + 0.5 - z;

    let a = if z < 2_299_161.0 {
        z
    } else {
        let alpha = ((z - 1_867_216.25) / 36_524.25).floor();
        z + 1.0 + alpha - (alpha / 4.0).floor()
    };

    let b = a + 1524.0;
    let c = ((b - 122.1) / 365.25).floor();
    let d = (365.25 * c).floor();
    let e = ((b - d) / 30.6001).floor();

    let day = b - d - (30.6001 * e).floor() + f;
    let month = if e < 14.0 { e - 1.0 } else { e - 13.0 };
    let year = if month > 2.0 { c - 4716.0 } else { c - 4715.0 };

    (year as i32, month as u32, day)
}

/// Heliocentric position of a planet in the ecliptic plane.
///
/// Returns (x, y) coordinates in km, where:
/// - x-axis points toward vernal equinox
/// - y-axis is 90° counter-clockwise in the ecliptic
///
/// For this analysis (coplanar approximation), we project onto the
/// ecliptic plane, which is sufficient for transfer analysis.
#[derive(Debug, Clone, Copy)]
pub struct PlanetPosition {
    /// Heliocentric ecliptic longitude (radians, 0 = vernal equinox)
    pub longitude: Radians,
    /// Heliocentric distance (km)
    pub distance: Km,
    /// X coordinate in ecliptic plane (km)
    pub x: f64,
    /// Y coordinate in ecliptic plane (km)
    pub y: f64,
}

/// Compute heliocentric position of a planet at a given Julian Date.
///
/// Uses mean Keplerian elements with secular perturbations.
/// Accuracy: ~1° for outer planets, ~2° for inner planets over centuries.
pub fn planet_position(planet: Planet, jd: f64) -> PlanetPosition {
    let elem = mean_elements(planet);
    let t = (jd - J2000_JD) / JULIAN_CENTURY_DAYS; // centuries from J2000

    // Compute elements at epoch
    let a_au = elem.a0 + elem.a_dot * t;
    let e = elem.e0 + elem.e_dot * t;
    let _i_deg = elem.i0 + elem.i_dot * t;
    let l_deg = elem.l0 + elem.l_dot * t;
    let w_bar_deg = elem.w_bar0 + elem.w_bar_dot * t;
    let omega_deg = elem.omega0 + elem.omega_dot * t;

    // Mean anomaly M = L - ω̃
    let m_deg = l_deg - w_bar_deg;
    let m_rad = Radians(m_deg.to_radians()).normalize();

    // Argument of perihelion ω = ω̃ - Ω
    let w_deg = w_bar_deg - omega_deg;
    let w_rad = w_deg.to_radians();

    // Solve Kepler's equation for eccentric anomaly
    let ecc = Eccentricity::elliptical(e.clamp(0.0, 0.999)).unwrap();
    let true_anomaly = kepler::mean_to_true_anomaly(m_rad, ecc)
        .expect("Kepler solver should converge for planetary eccentricities");

    // Heliocentric distance
    let a_km = a_au * AU_KM;
    let r_km = a_km * (1.0 - e * e) / (1.0 + e * true_anomaly.cos());

    // Ecliptic longitude (simplified: coplanar approximation)
    // λ = ω + ν + Ω  (true longitude in ecliptic)
    let lambda = Radians(w_rad + true_anomaly.value() + omega_deg.to_radians()).normalize();

    let x = r_km * lambda.cos();
    let y = r_km * lambda.sin();

    PlanetPosition {
        longitude: lambda,
        distance: Km(r_km),
        x,
        y,
    }
}

/// Compute the ecliptic longitude of a planet at a given Julian Date (radians).
///
/// Convenience wrapper around `planet_position`.
pub fn planet_longitude(planet: Planet, jd: f64) -> Radians {
    planet_position(planet, jd).longitude
}

/// Compute the angular separation between two planets at a given Julian Date.
///
/// Returns the signed angle from planet1 to planet2 in the direction of
/// orbital motion (counter-clockwise), normalized to (-π, π].
pub fn phase_angle(planet1: Planet, planet2: Planet, jd: f64) -> Radians {
    let lon1 = planet_longitude(planet1, jd);
    let lon2 = planet_longitude(planet2, jd);
    (lon2 - lon1).normalize_signed()
}

/// Synodic period between two planets (seconds).
///
/// T_synodic = 1 / |1/T1 - 1/T2|
///
/// where T1, T2 are the orbital periods.
pub fn synodic_period(planet1: Planet, planet2: Planet) -> Seconds {
    let t1 = crate::orbits::orbital_period(mu::SUN, planet1.semi_major_axis());
    let t2 = crate::orbits::orbital_period(mu::SUN, planet2.semi_major_axis());
    let inv_diff = (1.0 / t1.value() - 1.0 / t2.value()).abs();
    Seconds(1.0 / inv_diff)
}

/// Required phase angle for a Hohmann transfer between two circular orbits.
///
/// The destination planet must be ahead of the departure planet by this angle
/// at the time of departure for the spacecraft to arrive when the destination
/// planet reaches the arrival point.
///
/// Returns the phase angle in radians (always positive, measured counter-clockwise
/// from departure to destination).
pub fn hohmann_phase_angle(departure: Planet, arrival: Planet) -> Radians {
    let r1 = departure.semi_major_axis().value();
    let r2 = arrival.semi_major_axis().value();

    // Transfer semi-major axis
    let a_transfer = (r1 + r2) / 2.0;

    // Transfer time (half the orbital period of the transfer ellipse)
    let t_transfer = PI * (a_transfer.powi(3) / mu::SUN.value()).sqrt();

    // Mean motion of destination planet
    let n2 = kepler::mean_motion(mu::SUN, Km(r2));

    // Angle destination travels during transfer
    let theta_travel = n2 * t_transfer;

    // Required phase angle: destination must be at (π - θ_travel) ahead
    Radians(PI - theta_travel).normalize()
}

/// Hohmann transfer time between two planets (seconds).
///
/// Half the orbital period of the transfer ellipse.
pub fn hohmann_transfer_time(departure: Planet, arrival: Planet) -> Seconds {
    let r1 = departure.semi_major_axis().value();
    let r2 = arrival.semi_major_axis().value();
    let a_transfer = (r1 + r2) / 2.0;
    Seconds(PI * (a_transfer.powi(3) / mu::SUN.value()).sqrt())
}

/// Find the next launch window for a Hohmann transfer after a given Julian Date.
///
/// Searches forward in time for when the phase angle between departure and
/// arrival planets matches the required Hohmann phase angle.
///
/// Returns the Julian Date of the next launch window, or None if not found
/// within the search limit (one synodic period + margin).
pub fn next_hohmann_window(departure: Planet, arrival: Planet, after_jd: f64) -> Option<f64> {
    let required = hohmann_phase_angle(departure, arrival);
    let synodic = synodic_period(departure, arrival);

    // Search over one synodic period with 0.1-day steps, then refine
    let search_days = synodic.value() / SECONDS_PER_DAY * 1.2;
    let step = 0.1; // days

    let mut best_jd = after_jd;
    let mut best_diff = f64::MAX;

    let mut jd = after_jd;
    while jd < after_jd + search_days {
        let current_phase = phase_angle(departure, arrival, jd);
        let diff = (current_phase - required).normalize_signed().value().abs();
        if diff < best_diff {
            best_diff = diff;
            best_jd = jd;
        }
        jd += step;
    }

    // Refine with bisection
    let mut lo = best_jd - step;
    let mut hi = best_jd + step;

    for _ in 0..60 {
        let mid = (lo + hi) / 2.0;
        let phase_lo = phase_angle(departure, arrival, lo);
        let phase_mid = phase_angle(departure, arrival, mid);

        let diff_lo = (phase_lo - required).normalize_signed().value();
        let diff_mid = (phase_mid - required).normalize_signed().value();

        if diff_lo * diff_mid <= 0.0 {
            hi = mid;
        } else {
            lo = mid;
        }
    }

    let result_jd = (lo + hi) / 2.0;
    let final_diff = (phase_angle(departure, arrival, result_jd) - required)
        .normalize_signed()
        .value()
        .abs();

    // Accept if within 0.1° (good enough for fiction analysis)
    if final_diff < 0.1_f64.to_radians() {
        Some(result_jd)
    } else {
        None
    }
}

/// Compute the position of a destination planet at arrival, given departure date
/// and transfer time.
///
/// Returns the position at arrival and the phase angle error (how far the planet
/// actually is from where a Hohmann arrival would need it).
pub fn arrival_position(
    arrival_planet: Planet,
    departure_jd: f64,
    transfer_time: Seconds,
) -> PlanetPosition {
    let arrival_jd = departure_jd + transfer_time.value() / SECONDS_PER_DAY;
    planet_position(arrival_planet, arrival_jd)
}

/// Format Julian Date as a human-readable date string (YYYY-MM-DD).
pub fn jd_to_date_string(jd: f64) -> String {
    let (year, month, day) = jd_to_calendar(jd);
    format!("{:04}-{:02}-{:02}", year, month, day.floor() as u32)
}

/// Elapsed time between two Julian Dates in days.
pub fn elapsed_days(jd1: f64, jd2: f64) -> f64 {
    jd2 - jd1
}

/// Elapsed time between two Julian Dates in hours.
pub fn elapsed_hours(jd1: f64, jd2: f64) -> f64 {
    (jd2 - jd1) * 24.0
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_calendar_to_jd_j2000() {
        // J2000.0 = 2000-01-01 12:00:00 TT = JD 2451545.0
        let jd = calendar_to_jd(2000, 1, 1.5);
        assert!(
            (jd - J2000_JD).abs() < 1e-6,
            "J2000 JD = {}, expected {}",
            jd,
            J2000_JD
        );
    }

    #[test]
    fn test_calendar_to_jd_known_dates() {
        // 1999-12-31 0:00 UT = JD 2451543.5
        let jd = calendar_to_jd(1999, 12, 31.0);
        assert!(
            (jd - 2_451_543.5).abs() < 1e-6,
            "1999-12-31 JD = {}, expected 2451543.5",
            jd
        );

        // Sputnik launch: 1957-10-04 0h UT = JD 2436115.5
        let jd = calendar_to_jd(1957, 10, 4.0);
        assert!(
            (jd - 2_436_115.5).abs() < 1e-4,
            "Sputnik JD = {}, expected ~2436115.5",
            jd
        );
    }

    #[test]
    fn test_jd_calendar_round_trip() {
        let test_dates = [
            (2000, 1, 1.5),
            (2024, 6, 15.0),
            (1990, 3, 21.75),
            (2100, 12, 31.25),
        ];
        for (y, m, d) in test_dates {
            let jd = calendar_to_jd(y, m, d);
            let (y2, m2, d2) = jd_to_calendar(jd);
            assert_eq!(y, y2, "year mismatch for {:04}-{:02}-{}", y, m, d);
            assert_eq!(m, m2, "month mismatch for {:04}-{:02}-{}", y, m, d);
            assert!(
                (d - d2).abs() < 1e-10,
                "day mismatch for {:04}-{:02}-{}: got {}",
                y,
                m,
                d,
                d2
            );
        }
    }

    #[test]
    fn test_planet_position_earth_j2000() {
        // At J2000, Earth should be near longitude ~100° (mean longitude from elements)
        let pos = planet_position(Planet::Earth, J2000_JD);

        // Earth should be approximately 1 AU from Sun
        let dist_au = pos.distance.value() / AU_KM;
        assert!(
            (dist_au - 1.0).abs() < 0.02,
            "Earth distance at J2000 = {} AU, expected ~1.0",
            dist_au
        );
    }

    #[test]
    fn test_planet_position_mars_distance() {
        // Mars should be approximately 1.524 AU from Sun (varies with eccentricity)
        let pos = planet_position(Planet::Mars, J2000_JD);
        let dist_au = pos.distance.value() / AU_KM;
        assert!(
            (dist_au - 1.524).abs() < 0.15,
            "Mars distance at J2000 = {} AU, expected ~1.524",
            dist_au
        );
    }

    #[test]
    fn test_planet_position_jupiter_distance() {
        // Jupiter should be approximately 5.2 AU from Sun
        let pos = planet_position(Planet::Jupiter, J2000_JD);
        let dist_au = pos.distance.value() / AU_KM;
        assert!(
            (dist_au - 5.2).abs() < 0.3,
            "Jupiter distance at J2000 = {} AU, expected ~5.2",
            dist_au
        );
    }

    #[test]
    fn test_planet_position_saturn_distance() {
        let pos = planet_position(Planet::Saturn, J2000_JD);
        let dist_au = pos.distance.value() / AU_KM;
        assert!(
            (dist_au - 9.54).abs() < 0.5,
            "Saturn distance at J2000 = {} AU, expected ~9.54",
            dist_au
        );
    }

    #[test]
    fn test_planet_position_uranus_distance() {
        let pos = planet_position(Planet::Uranus, J2000_JD);
        let dist_au = pos.distance.value() / AU_KM;
        assert!(
            (dist_au - 19.2).abs() < 1.0,
            "Uranus distance at J2000 = {} AU, expected ~19.2",
            dist_au
        );
    }

    #[test]
    fn test_planet_orbital_period_consistency() {
        // Check that planets complete ~one orbit in their known period
        // Earth: 365.25 days
        let jd0 = J2000_JD;
        let jd1 = jd0 + 365.25;
        let lon0 = planet_longitude(Planet::Earth, jd0);
        let lon1 = planet_longitude(Planet::Earth, jd1);

        // After one year, Earth should return to approximately the same longitude
        let diff = (lon1 - lon0).normalize_signed().value().abs();
        assert!(
            diff < 2.0_f64.to_radians(),
            "Earth longitude after 1 year differs by {:.1}°, expected ~0°",
            diff.to_degrees()
        );
    }

    #[test]
    fn test_mars_orbital_period() {
        // Mars: ~686.97 days
        let jd0 = J2000_JD;
        let jd1 = jd0 + 686.97;
        let lon0 = planet_longitude(Planet::Mars, jd0);
        let lon1 = planet_longitude(Planet::Mars, jd1);

        let diff = (lon1 - lon0).normalize_signed().value().abs();
        assert!(
            diff < 3.0_f64.to_radians(),
            "Mars longitude after 687 days differs by {:.1}°, expected ~0°",
            diff.to_degrees()
        );
    }

    #[test]
    fn test_jupiter_orbital_period() {
        // Jupiter: ~4332.59 days (~11.86 years)
        let jd0 = J2000_JD;
        let jd1 = jd0 + 4332.59;
        let lon0 = planet_longitude(Planet::Jupiter, jd0);
        let lon1 = planet_longitude(Planet::Jupiter, jd1);

        let diff = (lon1 - lon0).normalize_signed().value().abs();
        assert!(
            diff < 5.0_f64.to_radians(),
            "Jupiter longitude after 4333 days differs by {:.1}°, expected ~0°",
            diff.to_degrees()
        );
    }

    #[test]
    fn test_phase_angle_symmetry() {
        // phase_angle(A, B) = -phase_angle(B, A)
        let jd = J2000_JD;
        let ab = phase_angle(Planet::Earth, Planet::Mars, jd);
        let ba = phase_angle(Planet::Mars, Planet::Earth, jd);

        assert!(
            (ab.value() + ba.value()).abs() < 1e-10,
            "phase_angle symmetry: {} + {} ≠ 0",
            ab.value(),
            ba.value()
        );
    }

    #[test]
    fn test_synodic_period_earth_mars() {
        // Earth-Mars synodic period: ~780 days
        let synodic = synodic_period(Planet::Earth, Planet::Mars);
        let days = synodic.value() / SECONDS_PER_DAY;
        assert!(
            (days - 780.0).abs() < 10.0,
            "Earth-Mars synodic period = {:.1} days, expected ~780",
            days
        );
    }

    #[test]
    fn test_synodic_period_earth_jupiter() {
        // Earth-Jupiter synodic period: ~398.88 days
        let synodic = synodic_period(Planet::Earth, Planet::Jupiter);
        let days = synodic.value() / SECONDS_PER_DAY;
        assert!(
            (days - 398.88).abs() < 5.0,
            "Earth-Jupiter synodic period = {:.1} days, expected ~398.88",
            days
        );
    }

    #[test]
    fn test_hohmann_phase_angle_earth_mars() {
        // Earth→Mars Hohmann: required phase angle ~44.4°
        let phase = hohmann_phase_angle(Planet::Earth, Planet::Mars);
        let deg = phase.value().to_degrees();
        assert!(
            (deg - 44.4).abs() < 2.0,
            "Earth→Mars Hohmann phase angle = {:.1}°, expected ~44.4°",
            deg
        );
    }

    #[test]
    fn test_hohmann_transfer_time_earth_mars() {
        // Earth→Mars Hohmann: ~259 days
        let time = hohmann_transfer_time(Planet::Earth, Planet::Mars);
        let days = time.value() / SECONDS_PER_DAY;
        assert!(
            (days - 259.0).abs() < 5.0,
            "Earth→Mars Hohmann time = {:.0} days, expected ~259",
            days
        );
    }

    #[test]
    fn test_hohmann_transfer_time_earth_jupiter() {
        // Earth→Jupiter Hohmann: ~997 days
        let time = hohmann_transfer_time(Planet::Earth, Planet::Jupiter);
        let days = time.value() / SECONDS_PER_DAY;
        assert!(
            (days - 997.0).abs() < 20.0,
            "Earth→Jupiter Hohmann time = {:.0} days, expected ~997",
            days
        );
    }

    #[test]
    fn test_next_hohmann_window_finds_window() {
        // There should be a Mars launch window within one synodic period from any date
        let window = next_hohmann_window(Planet::Earth, Planet::Mars, J2000_JD);
        assert!(
            window.is_some(),
            "Should find Earth→Mars Hohmann window near J2000"
        );

        let jd = window.unwrap();
        // Window should be within one synodic period
        let synodic_days = synodic_period(Planet::Earth, Planet::Mars).value() / SECONDS_PER_DAY;
        assert!(
            jd - J2000_JD < synodic_days * 1.2,
            "Window at JD {} is too far from J2000 ({:.0} days, synodic = {:.0})",
            jd,
            jd - J2000_JD,
            synodic_days
        );
    }

    #[test]
    fn test_jd_to_date_string() {
        // J2000.0 = 2000-01-01
        let s = jd_to_date_string(J2000_JD);
        assert_eq!(s, "2000-01-01", "J2000 date string");

        // 2024-01-01
        let jd = calendar_to_jd(2024, 1, 1.0);
        let s = jd_to_date_string(jd);
        assert_eq!(s, "2024-01-01");
    }

    #[test]
    fn test_elapsed_time() {
        let jd1 = J2000_JD;
        let jd2 = J2000_JD + 30.0;
        assert!((elapsed_days(jd1, jd2) - 30.0).abs() < 1e-10);
        assert!((elapsed_hours(jd1, jd2) - 720.0).abs() < 1e-8);
    }

    #[test]
    fn test_planet_all() {
        // Verify all planets can have their position computed
        for planet in &Planet::ALL {
            let pos = planet_position(*planet, J2000_JD);
            assert!(pos.distance.value() > 0.0, "{:?} has zero distance", planet);
            assert!(
                pos.distance.value().is_finite(),
                "{:?} distance is not finite",
                planet
            );
        }
    }

    #[test]
    fn test_planet_distance_ordering_at_j2000() {
        // Distances should generally increase with order (on average)
        // This tests the semi-major axis ordering
        let planets = [
            Planet::Mercury,
            Planet::Venus,
            Planet::Earth,
            Planet::Mars,
            Planet::Jupiter,
            Planet::Saturn,
            Planet::Uranus,
            Planet::Neptune,
        ];

        for i in 0..planets.len() - 1 {
            let a1 = planets[i].semi_major_axis().value();
            let a2 = planets[i + 1].semi_major_axis().value();
            assert!(
                a1 < a2,
                "{:?} semi-major axis ({}) >= {:?} semi-major axis ({})",
                planets[i],
                a1,
                planets[i + 1],
                a2,
            );
        }
    }

    #[test]
    fn test_hohmann_phase_angle_mars_jupiter() {
        // Mars→Jupiter: the required phase angle should be computed
        let phase = hohmann_phase_angle(Planet::Mars, Planet::Jupiter);
        let deg = phase.value().to_degrees();
        // The exact value depends on the orbital radii, but should be reasonable
        assert!(
            deg > 0.0 && deg < 360.0,
            "Mars→Jupiter phase angle = {:.1}°, should be in (0, 360)",
            deg
        );
    }

    #[test]
    fn test_synodic_period_symmetry() {
        // synodic_period(A, B) == synodic_period(B, A)
        let ab = synodic_period(Planet::Earth, Planet::Mars);
        let ba = synodic_period(Planet::Mars, Planet::Earth);
        assert!(
            (ab.value() - ba.value()).abs() < 1e-6,
            "synodic period asymmetry: {} vs {}",
            ab.value(),
            ba.value()
        );
    }
}
