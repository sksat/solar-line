/// Mass timeline analysis for Kestrel's journey.
///
/// Models mass changes over time: propellant consumption during burns,
/// container jettison, and damage-related mass loss. Uses Tsiolkovsky
/// equation for propellant consumption during each burn segment.
use crate::orbits::{exhaust_velocity, mass_ratio};
use crate::units::KmPerSec;

/// A discrete mass-changing event in the ship's timeline.
#[derive(Debug, Clone)]
pub struct MassEvent {
    /// Mission elapsed time at event start (hours from EP01 departure).
    pub time_h: f64,
    /// Type of mass change.
    pub kind: MassEventKind,
    /// Episode number (1-5).
    pub episode: u8,
    /// Human-readable label (Japanese).
    pub label: String,
}

/// Classification of mass-changing events.
#[derive(Debug, Clone)]
pub enum MassEventKind {
    /// Propellant consumption during a burn.
    /// Contains: ΔV (km/s), exhaust velocity via Isp (s), burn duration (hours).
    FuelBurn {
        delta_v_km_s: f64,
        isp_s: f64,
        burn_duration_h: f64,
    },
    /// Container or cargo jettison (mass removed from ship).
    ContainerJettison { mass_kg: f64 },
    /// Damage-related mass loss (debris, ablation, etc.).
    DamageEvent { mass_kg: f64 },
    /// Resupply or loading (mass added).
    Resupply { mass_kg: f64 },
}

/// A snapshot of ship mass at a point in time.
#[derive(Debug, Clone, Copy)]
pub struct MassSnapshot {
    /// Mission elapsed time (hours).
    pub time_h: f64,
    /// Total ship mass (kg).
    pub total_mass_kg: f64,
    /// Dry mass component (structure + payload, kg).
    pub dry_mass_kg: f64,
    /// Remaining propellant (kg).
    pub propellant_kg: f64,
    /// Episode number.
    pub episode: u8,
}

/// A complete mass timeline scenario.
#[derive(Debug, Clone)]
pub struct MassTimeline {
    /// Scenario name.
    pub name: String,
    /// Initial total mass (kg).
    pub initial_mass_kg: f64,
    /// Initial dry mass (kg).
    pub initial_dry_mass_kg: f64,
    /// Ordered snapshots (before and after each event).
    pub snapshots: Vec<MassSnapshot>,
}

/// Compute propellant consumed during a burn using Tsiolkovsky equation.
///
/// Given the pre-burn total mass, ΔV, and exhaust velocity (from Isp),
/// returns the propellant mass consumed (kg).
///
/// m_propellant = m_before × (1 - 1/mass_ratio)
///              = m_before × (1 - exp(-ΔV/vₑ))
pub fn propellant_consumed(pre_burn_mass_kg: f64, delta_v_km_s: f64, isp_s: f64) -> f64 {
    assert!(pre_burn_mass_kg > 0.0, "pre-burn mass must be positive");
    assert!(delta_v_km_s >= 0.0, "delta-v must be non-negative");
    assert!(isp_s > 0.0, "Isp must be positive");

    let ve = exhaust_velocity(isp_s);
    let mr = mass_ratio(KmPerSec(delta_v_km_s), ve);

    if mr.is_infinite() {
        pre_burn_mass_kg // all mass consumed
    } else {
        pre_burn_mass_kg * (1.0 - 1.0 / mr)
    }
}

/// Post-burn mass after consuming propellant.
pub fn post_burn_mass(pre_burn_mass_kg: f64, delta_v_km_s: f64, isp_s: f64) -> f64 {
    pre_burn_mass_kg - propellant_consumed(pre_burn_mass_kg, delta_v_km_s, isp_s)
}

/// Generate a mass timeline from an initial state and ordered events.
///
/// For each event:
/// - FuelBurn: applies Tsiolkovsky equation, reduces propellant
/// - ContainerJettison: reduces dry mass
/// - DamageEvent: reduces dry mass (structural loss)
/// - Resupply: adds to propellant (or dry mass depending on context)
///
/// Returns a MassTimeline with snapshots before and after each event.
pub fn compute_timeline(
    name: &str,
    initial_total_kg: f64,
    initial_dry_kg: f64,
    events: &[MassEvent],
) -> MassTimeline {
    assert!(
        initial_total_kg >= initial_dry_kg,
        "total mass must be >= dry mass"
    );

    let initial_propellant = initial_total_kg - initial_dry_kg;
    let mut snapshots = Vec::with_capacity(events.len() * 2 + 1);

    // Initial snapshot
    let first_episode = events.first().map_or(1, |e| e.episode);
    snapshots.push(MassSnapshot {
        time_h: 0.0,
        total_mass_kg: initial_total_kg,
        dry_mass_kg: initial_dry_kg,
        propellant_kg: initial_propellant,
        episode: first_episode,
    });

    let mut current_dry = initial_dry_kg;
    let mut current_propellant = initial_propellant;

    for event in events {
        let current_total = current_dry + current_propellant;

        // Pre-event snapshot (if time differs from last snapshot)
        if let Some(last) = snapshots.last() {
            if (event.time_h - last.time_h).abs() > 1e-6 {
                snapshots.push(MassSnapshot {
                    time_h: event.time_h,
                    total_mass_kg: current_total,
                    dry_mass_kg: current_dry,
                    propellant_kg: current_propellant,
                    episode: event.episode,
                });
            }
        }

        match &event.kind {
            MassEventKind::FuelBurn {
                delta_v_km_s,
                isp_s,
                burn_duration_h,
            } => {
                let consumed = propellant_consumed(current_total, *delta_v_km_s, *isp_s);
                // Clamp to available propellant
                let consumed = consumed.min(current_propellant);
                current_propellant -= consumed;

                // Post-burn snapshot at end of burn
                let post_time = event.time_h + burn_duration_h;
                snapshots.push(MassSnapshot {
                    time_h: post_time,
                    total_mass_kg: current_dry + current_propellant,
                    dry_mass_kg: current_dry,
                    propellant_kg: current_propellant,
                    episode: event.episode,
                });
            }
            MassEventKind::ContainerJettison { mass_kg } => {
                current_dry -= mass_kg;
                snapshots.push(MassSnapshot {
                    time_h: event.time_h,
                    total_mass_kg: current_dry + current_propellant,
                    dry_mass_kg: current_dry,
                    propellant_kg: current_propellant,
                    episode: event.episode,
                });
            }
            MassEventKind::DamageEvent { mass_kg } => {
                current_dry -= mass_kg;
                snapshots.push(MassSnapshot {
                    time_h: event.time_h,
                    total_mass_kg: current_dry + current_propellant,
                    dry_mass_kg: current_dry,
                    propellant_kg: current_propellant,
                    episode: event.episode,
                });
            }
            MassEventKind::Resupply { mass_kg } => {
                current_propellant += mass_kg;
                snapshots.push(MassSnapshot {
                    time_h: event.time_h,
                    total_mass_kg: current_dry + current_propellant,
                    dry_mass_kg: current_dry,
                    propellant_kg: current_propellant,
                    episode: event.episode,
                });
            }
        }
    }

    MassTimeline {
        name: name.to_string(),
        initial_mass_kg: initial_total_kg,
        initial_dry_mass_kg: initial_dry_kg,
        snapshots,
    }
}

/// Compute final mass after all events.
pub fn final_mass(timeline: &MassTimeline) -> Option<&MassSnapshot> {
    timeline.snapshots.last()
}

/// Compute total propellant consumed across all burns.
pub fn total_propellant_consumed(timeline: &MassTimeline) -> f64 {
    let initial_prop = timeline.initial_mass_kg - timeline.initial_dry_mass_kg;
    match timeline.snapshots.last() {
        Some(last) => initial_prop - last.propellant_kg,
        None => 0.0,
    }
}

/// Compute propellant margin (remaining / initial).
pub fn propellant_margin(timeline: &MassTimeline) -> f64 {
    let initial_prop = timeline.initial_mass_kg - timeline.initial_dry_mass_kg;
    if initial_prop <= 0.0 {
        return 0.0;
    }
    match timeline.snapshots.last() {
        Some(last) => last.propellant_kg / initial_prop,
        None => 1.0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const ISP_HIGH: f64 = 1_000_000.0; // Isp = 10⁶ s (D-He³ fusion)

    #[test]
    fn propellant_consumed_zero_dv() {
        let consumed = propellant_consumed(300_000.0, 0.0, ISP_HIGH);
        assert!(consumed.abs() < 1e-6, "zero ΔV → zero propellant");
    }

    #[test]
    fn propellant_consumed_moderate_dv() {
        // 300t ship, ΔV = 8497 km/s, Isp = 10⁶ s
        // vₑ = 9806.65 km/s
        // mass_ratio = exp(8497/9806.65) ≈ 2.376
        // propellant = 300,000 * (1 - 1/2.376) ≈ 173,720 kg
        let consumed = propellant_consumed(300_000.0, 8497.0, ISP_HIGH);
        assert!(
            consumed > 170_000.0 && consumed < 180_000.0,
            "EP01 propellant consumed = {consumed} kg, expected ~173,720"
        );
    }

    #[test]
    fn post_burn_mass_consistency() {
        let pre = 300_000.0;
        let dv = 5000.0;
        let post = post_burn_mass(pre, dv, ISP_HIGH);
        let consumed = propellant_consumed(pre, dv, ISP_HIGH);
        assert!(
            (post - (pre - consumed)).abs() < 1e-6,
            "post_burn = pre - consumed"
        );
        assert!(post > 0.0 && post < pre);
    }

    #[test]
    fn empty_timeline() {
        let tl = compute_timeline("empty", 300_000.0, 100_000.0, &[]);
        assert_eq!(tl.snapshots.len(), 1);
        assert_eq!(tl.snapshots[0].total_mass_kg, 300_000.0);
        assert_eq!(tl.snapshots[0].propellant_kg, 200_000.0);
    }

    #[test]
    fn single_burn_timeline() {
        let events = vec![MassEvent {
            time_h: 0.0,
            kind: MassEventKind::FuelBurn {
                delta_v_km_s: 1000.0,
                isp_s: ISP_HIGH,
                burn_duration_h: 12.0,
            },
            episode: 1,
            label: "test burn".into(),
        }];

        let tl = compute_timeline("test", 300_000.0, 100_000.0, &events);
        // Should have: initial + post-burn = 2 snapshots
        assert!(tl.snapshots.len() >= 2);

        let final_snap = final_mass(&tl).unwrap();
        assert!(final_snap.total_mass_kg < 300_000.0);
        assert!(final_snap.total_mass_kg > 100_000.0); // above dry mass
        assert_eq!(final_snap.dry_mass_kg, 100_000.0); // dry unchanged
        assert!(final_snap.propellant_kg < 200_000.0); // propellant reduced
    }

    #[test]
    fn container_jettison_reduces_dry_mass() {
        let events = vec![MassEvent {
            time_h: 10.0,
            kind: MassEventKind::ContainerJettison { mass_kg: 42_300.0 },
            episode: 1,
            label: "cargo delivery".into(),
        }];

        let tl = compute_timeline("jettison", 300_000.0, 142_300.0, &events);
        let final_snap = final_mass(&tl).unwrap();
        assert!(
            (final_snap.dry_mass_kg - 100_000.0).abs() < 1e-6,
            "dry mass reduced by container: {}",
            final_snap.dry_mass_kg
        );
        assert!(
            (final_snap.propellant_kg - 157_700.0).abs() < 1e-6,
            "propellant unchanged"
        );
    }

    #[test]
    fn multi_event_timeline() {
        let events = vec![
            MassEvent {
                time_h: 0.0,
                kind: MassEventKind::FuelBurn {
                    delta_v_km_s: 4000.0,
                    isp_s: ISP_HIGH,
                    burn_duration_h: 36.0,
                },
                episode: 1,
                label: "accel phase".into(),
            },
            MassEvent {
                time_h: 36.0,
                kind: MassEventKind::FuelBurn {
                    delta_v_km_s: 4000.0,
                    isp_s: ISP_HIGH,
                    burn_duration_h: 36.0,
                },
                episode: 1,
                label: "decel phase".into(),
            },
            MassEvent {
                time_h: 72.0,
                kind: MassEventKind::ContainerJettison { mass_kg: 42_300.0 },
                episode: 1,
                label: "cargo delivery".into(),
            },
        ];

        let tl = compute_timeline("multi", 300_000.0, 142_300.0, &events);
        let final_snap = final_mass(&tl).unwrap();

        // Dry mass should be 142300 - 42300 = 100000
        assert!(
            (final_snap.dry_mass_kg - 100_000.0).abs() < 1e-6,
            "final dry = {}",
            final_snap.dry_mass_kg
        );

        // Should have consumed propellant from both burns
        let consumed = total_propellant_consumed(&tl);
        assert!(consumed > 0.0, "propellant consumed = {consumed}");

        // Total mass should be dry + remaining propellant
        assert!(
            (final_snap.total_mass_kg - final_snap.dry_mass_kg - final_snap.propellant_kg).abs()
                < 1e-6
        );
    }

    #[test]
    fn propellant_margin_full_and_empty() {
        // Full propellant (no events)
        let tl = compute_timeline("full", 300_000.0, 100_000.0, &[]);
        assert!((propellant_margin(&tl) - 1.0).abs() < 1e-10);

        // Nearly empty
        let events = vec![MassEvent {
            time_h: 0.0,
            kind: MassEventKind::FuelBurn {
                delta_v_km_s: 50000.0, // very high ΔV
                isp_s: ISP_HIGH,
                burn_duration_h: 100.0,
            },
            episode: 5,
            label: "massive burn".into(),
        }];
        let tl2 = compute_timeline("empty", 300_000.0, 100_000.0, &events);
        let margin = propellant_margin(&tl2);
        assert!(margin < 0.1, "margin should be near zero: {margin}");
    }

    // ── Kestrel-specific scenario tests ──

    #[test]
    fn kestrel_ep01_brachistochrone_72h() {
        // EP01: Mars→Ganymede, 72h, ΔV = 8497 km/s at 9.8 MN
        // Ship mass ≤299t for this to work
        // mass_ratio = exp(8497/9806.65) ≈ 2.376
        // final_mass = 299,000 / 2.376 ≈ 125,800 kg (dry mass bound)
        // Two sequential half-burns consume slightly more than one full burn,
        // so dry mass should be < 125,000 kg for margin.
        // Scenario A: 80t structure + 42.3t cargo ≈ 122.3t dry
        let dry_mass = 80_000.0 + 42_300.0; // 122.3t
        let total = 299_000.0;

        // Brachistochrone: accel 36h + decel 36h
        let events = vec![
            MassEvent {
                time_h: 0.0,
                kind: MassEventKind::FuelBurn {
                    delta_v_km_s: 4248.5, // half of 8497
                    isp_s: ISP_HIGH,
                    burn_duration_h: 36.0,
                },
                episode: 1,
                label: "加速フェーズ".into(),
            },
            MassEvent {
                time_h: 36.0,
                kind: MassEventKind::FuelBurn {
                    delta_v_km_s: 4248.5,
                    isp_s: ISP_HIGH,
                    burn_duration_h: 36.0,
                },
                episode: 1,
                label: "減速フェーズ".into(),
            },
        ];

        let tl = compute_timeline("EP01 299t", total, dry_mass, &events);
        let final_snap = final_mass(&tl).unwrap();

        // Should have positive propellant remaining
        assert!(
            final_snap.propellant_kg > 0.0,
            "propellant remaining = {} kg",
            final_snap.propellant_kg
        );
        // Dry mass unchanged
        assert!(
            (final_snap.dry_mass_kg - dry_mass).abs() < 1e-6,
            "dry mass should be unchanged"
        );

        // mass_ratio for total ΔV = 8497 km/s:
        // consumed ≈ 299,000 * 0.579 ≈ 173,000 kg
        let consumed = total_propellant_consumed(&tl);
        let initial_prop = total - dry_mass;
        assert!(
            consumed / initial_prop > 0.5 && consumed / initial_prop < 1.0,
            "consumed fraction = {:.3}",
            consumed / initial_prop
        );
    }

    #[test]
    fn kestrel_ep05_nozzle_limit_budget() {
        // EP05: 4 burns, 55h12m total burn, ΔV = 15207 km/s at 300t
        // mass_ratio = exp(15207/9806.65) ≈ 4.72
        // propellant_fraction ≈ 0.788 → need 236,400 kg propellant from 300t
        // dry mass ≈ 63,600 kg — use 60t (ship already damaged/lightened)
        let dry_mass = 60_000.0;
        let total = 300_000.0;

        let events = vec![
            MassEvent {
                time_h: 0.0,
                kind: MassEventKind::FuelBurn {
                    delta_v_km_s: 3800.0,
                    isp_s: ISP_HIGH,
                    burn_duration_h: 12.0,
                },
                episode: 5,
                label: "天王星脱出+巡航加速".into(),
            },
            MassEvent {
                time_h: 375.0,
                kind: MassEventKind::FuelBurn {
                    delta_v_km_s: 456.0, // Oberth +3%
                    isp_s: ISP_HIGH,
                    burn_duration_h: 8.0,
                },
                episode: 5,
                label: "木星フライバイ".into(),
            },
            MassEvent {
                time_h: 400.0,
                kind: MassEventKind::FuelBurn {
                    delta_v_km_s: 7600.0,
                    isp_s: ISP_HIGH,
                    burn_duration_h: 35.0,
                },
                episode: 5,
                label: "減速フェーズ".into(),
            },
            MassEvent {
                time_h: 505.0,
                kind: MassEventKind::FuelBurn {
                    delta_v_km_s: 7.67, // LEO insertion
                    isp_s: ISP_HIGH,
                    burn_duration_h: 0.2,
                },
                episode: 5,
                label: "LEO投入".into(),
            },
        ];

        let tl = compute_timeline("EP05 300t", total, dry_mass, &events);
        let final_snap = final_mass(&tl).unwrap();

        // Must still have positive propellant
        assert!(
            final_snap.propellant_kg > 0.0,
            "EP05 must not run out of propellant: {} kg remaining",
            final_snap.propellant_kg
        );

        // Total burn time = 12 + 8 + 35 + 0.2 = 55.2h < 55h38m nozzle life
        let total_burn_h = 12.0 + 8.0 + 35.0 + 0.2;
        assert!(
            total_burn_h < 55.0 + 38.0 / 60.0,
            "burn time {total_burn_h}h exceeds nozzle life"
        );

        // Final propellant margin should be reasonable but tight
        let margin = propellant_margin(&tl);
        assert!(
            margin < 0.5,
            "EP05 should consume >50% of propellant, margin = {margin:.3}"
        );
    }

    #[test]
    fn damage_event_reduces_mass() {
        let events = vec![MassEvent {
            time_h: 100.0,
            kind: MassEventKind::DamageEvent { mass_kg: 5_000.0 },
            episode: 4,
            label: "プラズモイド被害".into(),
        }];

        let tl = compute_timeline("damage", 300_000.0, 150_000.0, &events);
        let final_snap = final_mass(&tl).unwrap();
        assert!(
            (final_snap.dry_mass_kg - 145_000.0).abs() < 1e-6,
            "dry mass after damage = {}",
            final_snap.dry_mass_kg
        );
    }

    #[test]
    fn resupply_adds_mass() {
        let events = vec![MassEvent {
            time_h: 500.0,
            kind: MassEventKind::Resupply { mass_kg: 50_000.0 },
            episode: 2,
            label: "エンケラドス補給".into(),
        }];

        let tl = compute_timeline("resupply", 200_000.0, 150_000.0, &events);
        let final_snap = final_mass(&tl).unwrap();
        assert!(
            (final_snap.propellant_kg - 100_000.0).abs() < 1e-6,
            "propellant after resupply = {}",
            final_snap.propellant_kg
        );
        assert!(
            (final_snap.total_mass_kg - 250_000.0).abs() < 1e-6,
            "total after resupply = {}",
            final_snap.total_mass_kg
        );
    }

    #[test]
    fn propellant_clamp_prevents_negative() {
        // Huge ΔV should consume all propellant but not go negative
        let events = vec![MassEvent {
            time_h: 0.0,
            kind: MassEventKind::FuelBurn {
                delta_v_km_s: 100_000.0,
                isp_s: ISP_HIGH,
                burn_duration_h: 1.0,
            },
            episode: 1,
            label: "impossible burn".into(),
        }];

        let tl = compute_timeline("clamp", 200_000.0, 150_000.0, &events);
        let final_snap = final_mass(&tl).unwrap();
        assert!(
            final_snap.propellant_kg >= 0.0,
            "propellant must not go negative: {}",
            final_snap.propellant_kg
        );
    }
}
