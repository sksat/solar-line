/// Communications analysis for SOLAR LINE.
///
/// Computes light delays, link budgets, and communication feasibility
/// between spacecraft and planets at various distances.
///
/// Key analysis questions:
/// - Is real-time dialogue plausible at depicted distances?
/// - What data rates are achievable?
/// - When would communication blackouts occur?
use crate::ephemeris::{self, Planet, PlanetPosition};
use crate::units::Km;

/// Speed of light in km/s (exact, per SI definition).
pub const C_KM_S: f64 = 299_792.458;

/// One-way light time (seconds) for a given distance in km.
///
/// ```text
/// t = d / c
/// ```
pub fn light_time_seconds(distance: Km) -> f64 {
    distance.value() / C_KM_S
}

/// One-way light time in minutes.
pub fn light_time_minutes(distance: Km) -> f64 {
    light_time_seconds(distance) / 60.0
}

/// Round-trip light time (seconds) — relevant for query-response communication.
pub fn round_trip_light_time(distance: Km) -> f64 {
    2.0 * light_time_seconds(distance)
}

/// Distance between two heliocentric positions (km).
///
/// Uses 2D ecliptic plane positions (sufficient for this analysis since
/// planetary inclinations are small).
pub fn distance_between_positions(pos1: &PlanetPosition, pos2: &PlanetPosition) -> Km {
    let dx = pos1.x - pos2.x;
    let dy = pos1.y - pos2.y;
    let dz = pos1.z - pos2.z;
    Km((dx * dx + dy * dy + dz * dz).sqrt())
}

/// Light delay between two planets at a given Julian Date.
///
/// Returns one-way light time in seconds.
pub fn planet_light_delay(planet1: Planet, planet2: Planet, jd: f64) -> f64 {
    let pos1 = ephemeris::planet_position(planet1, jd);
    let pos2 = ephemeris::planet_position(planet2, jd);
    let dist = distance_between_positions(&pos1, &pos2);
    light_time_seconds(dist)
}

/// Light delay between a spacecraft position (x, y in km, heliocentric) and a planet.
///
/// Returns one-way light time in seconds.
pub fn ship_planet_light_delay(ship_x: f64, ship_y: f64, planet: Planet, jd: f64) -> f64 {
    let planet_pos = ephemeris::planet_position(planet, jd);
    let dx = ship_x - planet_pos.x;
    let dy = ship_y - planet_pos.y;
    let dist = Km((dx * dx + dy * dy).sqrt());
    light_time_seconds(dist)
}

/// Communication feasibility classification.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CommFeasibility {
    /// Real-time conversation possible (delay < 3 seconds one-way)
    RealTime,
    /// Near-real-time with noticeable lag (3s–30s one-way)
    NearRealTime,
    /// Delayed communication — must use store-and-forward (30s–30min)
    Delayed,
    /// Deep space communication — very long delays (> 30 min)
    DeepSpace,
}

impl CommFeasibility {
    /// Classify communication feasibility based on one-way light delay (seconds).
    pub fn classify(one_way_delay_s: f64) -> Self {
        if one_way_delay_s < 3.0 {
            CommFeasibility::RealTime
        } else if one_way_delay_s < 30.0 {
            CommFeasibility::NearRealTime
        } else if one_way_delay_s < 1800.0 {
            CommFeasibility::Delayed
        } else {
            CommFeasibility::DeepSpace
        }
    }

    /// Human-readable Japanese label.
    pub fn label_ja(&self) -> &'static str {
        match self {
            CommFeasibility::RealTime => "リアルタイム通信可能",
            CommFeasibility::NearRealTime => "準リアルタイム（顕著な遅延あり）",
            CommFeasibility::Delayed => "遅延通信（蓄積転送）",
            CommFeasibility::DeepSpace => "深宇宙通信（大幅な遅延）",
        }
    }
}

/// Free-space path loss in dB.
///
/// FSPL = 20·log₁₀(d) + 20·log₁₀(f) + 20·log₁₀(4π/c)
///
/// where d is distance in meters, f is frequency in Hz.
/// This follows the standard telecommunications formula.
pub fn free_space_path_loss_db(distance_km: f64, freq_hz: f64) -> f64 {
    let d_m = distance_km * 1000.0;
    let c_m_s = C_KM_S * 1000.0;
    20.0 * d_m.log10()
        + 20.0 * freq_hz.log10()
        + 20.0 * (4.0 * std::f64::consts::PI / c_m_s).log10()
}

/// Minimum and maximum distances between two planets (km).
///
/// Uses mean orbital radii (circular orbit approximation).
/// Min distance = |r2 - r1| (conjunction), Max = r1 + r2 (opposition).
pub fn planet_distance_range(planet1: Planet, planet2: Planet) -> (Km, Km) {
    let r1 = planet1.semi_major_axis().value();
    let r2 = planet2.semi_major_axis().value();
    let min = (r2 - r1).abs();
    let max = r1 + r2;
    (Km(min), Km(max))
}

/// Light delay range between two planets (min, max) in seconds.
pub fn planet_light_delay_range(planet1: Planet, planet2: Planet) -> (f64, f64) {
    let (min_dist, max_dist) = planet_distance_range(planet1, planet2);
    (light_time_seconds(min_dist), light_time_seconds(max_dist))
}

/// Timeline entry for communication delay along a route.
#[derive(Debug, Clone)]
pub struct CommTimelineEntry {
    /// Julian Date
    pub jd: f64,
    /// Elapsed time from route start (seconds)
    pub elapsed_s: f64,
    /// Ship heliocentric x (km)
    pub ship_x: f64,
    /// Ship heliocentric y (km)
    pub ship_y: f64,
    /// One-way light delay to Earth (seconds)
    pub delay_to_earth_s: f64,
    /// Communication feasibility classification
    pub feasibility: CommFeasibility,
}

/// Compute communication timeline along a linear route between two planets.
///
/// Assumes the ship travels in a straight line from departure planet position
/// to arrival planet position (simplified; actual trajectories curve).
/// This is sufficient for estimating the light delay profile.
///
/// Returns entries at regular time intervals.
pub fn comm_timeline_linear(
    departure: Planet,
    arrival: Planet,
    departure_jd: f64,
    travel_time_s: f64,
    n_steps: usize,
) -> Vec<CommTimelineEntry> {
    let dep_pos = ephemeris::planet_position(departure, departure_jd);
    let arr_jd = departure_jd + travel_time_s / 86400.0;
    let arr_pos = ephemeris::planet_position(arrival, arr_jd);

    let mut entries = Vec::with_capacity(n_steps + 1);
    for i in 0..=n_steps {
        let frac = i as f64 / n_steps as f64;
        let elapsed = frac * travel_time_s;
        let jd = departure_jd + elapsed / 86400.0;

        // Linear interpolation of ship position
        let ship_x = dep_pos.x + frac * (arr_pos.x - dep_pos.x);
        let ship_y = dep_pos.y + frac * (arr_pos.y - dep_pos.y);

        // Delay to Earth (Earth position at this instant)
        let earth_pos = ephemeris::planet_position(Planet::Earth, jd);
        let dx = ship_x - earth_pos.x;
        let dy = ship_y - earth_pos.y;
        let dist = (dx * dx + dy * dy).sqrt();
        let delay = dist / C_KM_S;

        entries.push(CommTimelineEntry {
            jd,
            elapsed_s: elapsed,
            ship_x,
            ship_y,
            delay_to_earth_s: delay,
            feasibility: CommFeasibility::classify(delay),
        });
    }

    entries
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ephemeris::J2000_JD;

    const AU_KM: f64 = 149_597_870.7;

    #[test]
    fn test_light_time_1au() {
        // Light time for 1 AU ≈ 499.0 seconds ≈ 8.317 minutes
        let delay = light_time_seconds(Km(AU_KM));
        assert!(
            (delay - 499.0).abs() < 0.5,
            "1 AU light time = {:.1}s, expected ~499s",
            delay
        );
    }

    #[test]
    fn test_light_time_minutes_1au() {
        let minutes = light_time_minutes(Km(AU_KM));
        assert!(
            (minutes - 8.317).abs() < 0.01,
            "1 AU light time = {:.3} min, expected ~8.317 min",
            minutes
        );
    }

    #[test]
    fn test_round_trip_1au() {
        let rt = round_trip_light_time(Km(AU_KM));
        assert!(
            (rt - 998.0).abs() < 1.0,
            "1 AU round trip = {:.1}s, expected ~998s",
            rt
        );
    }

    #[test]
    fn test_light_time_zero_distance() {
        let delay = light_time_seconds(Km(0.0));
        assert_eq!(delay, 0.0);
    }

    #[test]
    fn test_planet_distance_range_earth_mars() {
        let (min, max) = planet_distance_range(Planet::Earth, Planet::Mars);
        // Earth-Mars: min ~0.524 AU (~78.3M km), max ~2.524 AU (~377.5M km)
        let min_au = min.value() / AU_KM;
        let max_au = max.value() / AU_KM;
        assert!(
            (min_au - 0.524).abs() < 0.02,
            "Earth-Mars min = {:.3} AU, expected ~0.524",
            min_au
        );
        assert!(
            (max_au - 2.524).abs() < 0.02,
            "Earth-Mars max = {:.3} AU, expected ~2.524",
            max_au
        );
    }

    #[test]
    fn test_planet_distance_range_earth_jupiter() {
        let (min, max) = planet_distance_range(Planet::Earth, Planet::Jupiter);
        let min_au = min.value() / AU_KM;
        let max_au = max.value() / AU_KM;
        // Min ~4.2 AU, Max ~6.2 AU
        assert!(
            (min_au - 4.2).abs() < 0.1,
            "Earth-Jupiter min = {:.1} AU",
            min_au
        );
        assert!(
            (max_au - 6.2).abs() < 0.1,
            "Earth-Jupiter max = {:.1} AU",
            max_au
        );
    }

    #[test]
    fn test_planet_distance_range_earth_saturn() {
        let (min, max) = planet_distance_range(Planet::Earth, Planet::Saturn);
        let min_au = min.value() / AU_KM;
        let max_au = max.value() / AU_KM;
        // Min ~8.5 AU, Max ~10.5 AU
        assert!(
            min_au > 8.0 && min_au < 9.0,
            "Earth-Saturn min = {:.1} AU",
            min_au
        );
        assert!(
            max_au > 10.0 && max_au < 11.0,
            "Earth-Saturn max = {:.1} AU",
            max_au
        );
    }

    #[test]
    fn test_planet_distance_range_earth_uranus() {
        let (min, max) = planet_distance_range(Planet::Earth, Planet::Uranus);
        let min_au = min.value() / AU_KM;
        let max_au = max.value() / AU_KM;
        // Min ~18.2 AU, Max ~20.2 AU
        assert!(
            min_au > 17.5 && min_au < 19.0,
            "Earth-Uranus min = {:.1} AU",
            min_au
        );
        assert!(
            max_au > 19.5 && max_au < 21.0,
            "Earth-Uranus max = {:.1} AU",
            max_au
        );
    }

    #[test]
    fn test_planet_light_delay_range_earth_mars() {
        let (min_s, max_s) = planet_light_delay_range(Planet::Earth, Planet::Mars);
        let min_min = min_s / 60.0;
        let max_min = max_s / 60.0;
        // Earth-Mars: min ~4.3 min, max ~21 min
        assert!(
            min_min > 3.5 && min_min < 5.0,
            "Earth-Mars min delay = {:.1} min",
            min_min
        );
        assert!(
            max_min > 19.0 && max_min < 22.0,
            "Earth-Mars max delay = {:.1} min",
            max_min
        );
    }

    #[test]
    fn test_planet_light_delay_at_epoch() {
        // At J2000, compute Earth-Mars light delay (should be a valid, finite value)
        let delay = planet_light_delay(Planet::Earth, Planet::Mars, J2000_JD);
        assert!(delay > 0.0 && delay.is_finite(), "delay = {}", delay);
        // Should be between min and max
        let (min_s, max_s) = planet_light_delay_range(Planet::Earth, Planet::Mars);
        assert!(
            delay >= min_s * 0.9 && delay <= max_s * 1.1,
            "delay {} outside expected range [{}, {}]",
            delay,
            min_s,
            max_s
        );
    }

    #[test]
    fn test_ship_planet_light_delay() {
        // Ship at Earth's position should have ~0 delay to Earth
        let earth_pos = ephemeris::planet_position(Planet::Earth, J2000_JD);
        let delay = ship_planet_light_delay(earth_pos.x, earth_pos.y, Planet::Earth, J2000_JD);
        assert!(
            delay < 1.0,
            "ship at Earth position should have near-zero delay: {}",
            delay
        );
    }

    #[test]
    fn test_feasibility_classification() {
        assert_eq!(CommFeasibility::classify(0.5), CommFeasibility::RealTime);
        assert_eq!(CommFeasibility::classify(2.9), CommFeasibility::RealTime);
        assert_eq!(
            CommFeasibility::classify(3.0),
            CommFeasibility::NearRealTime
        );
        assert_eq!(
            CommFeasibility::classify(15.0),
            CommFeasibility::NearRealTime
        );
        assert_eq!(CommFeasibility::classify(30.0), CommFeasibility::Delayed);
        assert_eq!(CommFeasibility::classify(600.0), CommFeasibility::Delayed);
        assert_eq!(
            CommFeasibility::classify(1800.0),
            CommFeasibility::DeepSpace
        );
        assert_eq!(
            CommFeasibility::classify(3600.0),
            CommFeasibility::DeepSpace
        );
    }

    #[test]
    fn test_free_space_path_loss_x_band() {
        // X-band (8.4 GHz) at 1 AU distance
        // FSPL = 20·log₁₀(d_m) + 20·log₁₀(f_Hz) + 20·log₁₀(4π/c)
        // ≈ 274.4 dB at 1 AU (standard free-space path loss)
        let fspl = free_space_path_loss_db(AU_KM, 8.4e9);
        assert!(
            (fspl - 274.4).abs() < 1.0,
            "X-band FSPL at 1 AU = {:.1} dB, expected ~274.4",
            fspl
        );
    }

    #[test]
    fn test_free_space_path_loss_increases_with_distance() {
        let fspl_1au = free_space_path_loss_db(AU_KM, 8.4e9);
        let fspl_5au = free_space_path_loss_db(5.0 * AU_KM, 8.4e9);
        // 5x distance = +14 dB (20·log₁₀(5) ≈ 14.0)
        assert!(
            (fspl_5au - fspl_1au - 14.0).abs() < 0.1,
            "FSPL increase for 5x distance = {:.1} dB, expected ~14.0",
            fspl_5au - fspl_1au
        );
    }

    #[test]
    fn test_distance_between_positions() {
        let pos1 = PlanetPosition {
            longitude: crate::units::Radians(0.0),
            latitude: crate::units::Radians(0.0),
            distance: Km(AU_KM),
            x: AU_KM,
            y: 0.0,
            z: 0.0,
            inclination: crate::units::Radians(0.0),
        };
        let pos2 = PlanetPosition {
            longitude: crate::units::Radians(std::f64::consts::PI),
            latitude: crate::units::Radians(0.0),
            distance: Km(AU_KM),
            x: -AU_KM,
            y: 0.0,
            z: 0.0,
            inclination: crate::units::Radians(0.0),
        };
        let dist = distance_between_positions(&pos1, &pos2);
        assert!(
            (dist.value() - 2.0 * AU_KM).abs() < 1.0,
            "opposite sides of 1 AU orbit = {:.0} km, expected {:.0}",
            dist.value(),
            2.0 * AU_KM
        );
    }

    #[test]
    fn test_comm_timeline_linear_ep01_mars_ganymede() {
        // EP01: Mars → Ganymede (actually Mars → Jupiter vicinity), 72 hours
        // Use Mars→Jupiter as approximation for this test
        let jd = J2000_JD;
        let travel_time = 72.0 * 3600.0; // 72 hours

        let timeline = comm_timeline_linear(Planet::Mars, Planet::Jupiter, jd, travel_time, 10);

        assert_eq!(timeline.len(), 11); // 10 steps + 1
        assert!((timeline[0].elapsed_s - 0.0).abs() < 1e-10);
        assert!((timeline[10].elapsed_s - travel_time).abs() < 1e-6);

        // All entries should have valid delays
        for entry in &timeline {
            assert!(entry.delay_to_earth_s > 0.0);
            assert!(entry.delay_to_earth_s.is_finite());
        }
    }

    #[test]
    fn test_comm_timeline_entries_have_monotonic_elapsed() {
        let timeline = comm_timeline_linear(
            Planet::Earth,
            Planet::Mars,
            J2000_JD,
            259.0 * 86400.0, // ~259 day Hohmann
            20,
        );
        for i in 1..timeline.len() {
            assert!(
                timeline[i].elapsed_s > timeline[i - 1].elapsed_s,
                "elapsed time not monotonic at step {}",
                i
            );
        }
    }

    // ── SOLAR LINE episode-specific tests ──────────────────────────────

    #[test]
    fn test_ep01_mars_fire_control_is_nearrealtime() {
        // EP01 scene 03: Mars control communication while still near Mars
        // Ship is near Mars, communicating with Mars control → should be real-time
        // Ship 10,000 km from Mars
        let delay = light_time_seconds(Km(10_000.0));
        assert!(delay < 0.1, "Mars control at 10,000 km = {:.3}s", delay);
        assert_eq!(CommFeasibility::classify(delay), CommFeasibility::RealTime);
    }

    #[test]
    fn test_ep02_jupiter_saturn_delay_range() {
        // EP02: Jupiter → Saturn, ballistic 455 days
        // Jupiter-Saturn distance: 4.3–10.5 AU
        let (min, max) = planet_distance_range(Planet::Jupiter, Planet::Saturn);
        let min_au = min.value() / AU_KM;
        let max_au = max.value() / AU_KM;
        assert!(min_au > 4.0 && min_au < 5.0, "J-S min = {:.1} AU", min_au);
        assert!(max_au > 14.0 && max_au < 16.0, "J-S max = {:.1} AU", max_au);

        // Light delay at minimum: ~35 min
        let min_delay_min = light_time_minutes(min);
        assert!(
            min_delay_min > 30.0,
            "J-S min delay = {:.1} min",
            min_delay_min
        );
    }

    #[test]
    fn test_ep04_uranus_earth_deep_space() {
        // EP04: Near Uranus, communicating with Earth
        // Uranus-Earth: 18–20 AU → deep space communication
        let (min_s, _max_s) = planet_light_delay_range(Planet::Earth, Planet::Uranus);
        let min_min = min_s / 60.0;
        // Even minimum delay > 30 min → deep space
        assert!(
            CommFeasibility::classify(min_s) == CommFeasibility::DeepSpace,
            "Uranus-Earth min delay = {:.0} min should be DeepSpace",
            min_min
        );
    }

    #[test]
    fn test_speed_of_light_constant() {
        // Verify c = 299,792.458 km/s (exact by definition)
        assert!((C_KM_S - 299_792.458).abs() < 1e-10);
    }
}
