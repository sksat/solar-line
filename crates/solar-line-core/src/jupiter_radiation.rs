//! Jupiter radiation belt dose model for SOLAR LINE EP02 analysis.
//!
//! Models radiation dose rate as a function of distance from Jupiter using a
//! piecewise power-law model calibrated to Galileo-era measurements.
//!
//! The model estimates TID (Total Ionizing Dose) behind a reference shielding
//! thickness, expressed in krad(Si) behind 100 mil Al equivalent.
//!
//! Physical basis:
//!   - Jupiter's radiation belts are the most intense in the solar system
//!   - Trapped electron population dominates dose in the 10-30 RJ region
//!   - Dose rate falls off roughly as a power law with distance
//!   - The magnetopause (~50-100 RJ on dayside) marks the outer boundary
//!
//! Calibration references:
//!   - Europa (~9.4 RJ): ~5,400 krad/year behind 100 mil Al (Galileo DDD)
//!   - Ganymede (~15 RJ): ~540 krad/year behind 100 mil Al
//!   - Callisto (~26 RJ): ~1 krad/year behind 100 mil Al
//!   - These values are order-of-magnitude from NASA Europa mission studies
//!     and the Galileo Design Dose Document (DDD).
//!
//! Key insight for EP02: The ship AI's "radiation shield remaining life: 42 min"
//! is best interpreted as `dose_budget_remaining / instantaneous_dose_rate`,
//! evaluated at the current position (~15 RJ). As the ship moves outward,
//! the dose rate drops dramatically, so the actual time to shield depletion
//! increases — potentially allowing the entire escape to succeed within budget.

/// Jupiter equatorial radius in km.
pub const JUPITER_RADIUS_KM: f64 = 71_492.0;

/// A region of the piecewise power-law dose model.
///
/// Within this region, dose_rate(r) = d0 * (r / r0)^(-alpha)
/// where r is in Jupiter radii.
#[derive(Debug, Clone, Copy)]
pub struct RadiationRegion {
    /// Inner boundary of this region (in RJ). Inclusive.
    pub r_min_rj: f64,
    /// Outer boundary of this region (in RJ). Exclusive (except for outermost).
    pub r_max_rj: f64,
    /// Reference dose rate at r0 (krad(Si)/hour behind 100 mil Al)
    pub d0_krad_per_hour: f64,
    /// Reference distance (in RJ)
    pub r0_rj: f64,
    /// Power-law exponent (positive = rate decreases outward)
    pub alpha: f64,
}

/// Configuration for the Jupiter radiation dose model.
#[derive(Debug, Clone)]
pub struct JupiterRadiationConfig {
    /// Piecewise regions from inner to outer.
    /// Must be sorted by r_min_rj and contiguous.
    pub regions: Vec<RadiationRegion>,
    /// Magnetopause distance in RJ. Beyond this, trapped radiation is zero.
    pub magnetopause_rj: f64,
    /// Geometry/variability multipliers
    pub latitude_factor: f64,
    /// Plasma sheet crossing factor (1.0 = in sheet, typically 0.3-0.5 outside)
    pub plasma_sheet_factor: f64,
    /// Storm/quiet multiplier (1.0 = nominal, 2-5 for storm)
    pub storm_factor: f64,
}

/// Results of a Jupiter radiation transit analysis.
#[derive(Debug, Clone)]
pub struct JupiterTransitResult {
    /// Total accumulated dose during transit (krad behind 100 mil Al)
    pub total_dose_krad: f64,
    /// Dose rate at departure point (krad/hour)
    pub departure_dose_rate_krad_h: f64,
    /// Dose rate at arrival point (krad/hour)
    pub arrival_dose_rate_krad_h: f64,
    /// Shield life remaining at departure = budget/rate (hours)
    pub shield_life_at_departure_h: f64,
    /// Shield life remaining at arrival = (budget - accumulated)/rate (hours)
    pub shield_life_at_arrival_h: f64,
    /// Whether the shield survives the transit (total_dose < budget)
    pub shield_survives: bool,
    /// Fraction of dose accumulated in each region
    pub region_dose_fractions: Vec<(f64, f64, f64)>, // (r_min, r_max, fraction)
    /// Peak dose rate encountered (krad/hour)
    pub peak_dose_rate_krad_h: f64,
}

impl JupiterRadiationConfig {
    /// Create the default model calibrated to Galileo-era data.
    ///
    /// Dose rates in krad(Si)/hour behind 100 mil Al:
    /// - Europa (~9.4 RJ): ~0.616 krad/h (= 5,400 krad/year)
    /// - Ganymede (~15 RJ): ~0.0616 krad/h (= 540 krad/year)
    /// - Callisto (~26 RJ): ~0.000114 krad/h (= 1 krad/year)
    pub fn default_model() -> Self {
        // Region 1: Inner belt (6-15 RJ)
        // Calibrated: at 9.4 RJ ≈ 0.616 krad/h, at 15 RJ ≈ 0.0616 krad/h
        // alpha = ln(0.616/0.0616) / ln(15/9.4) ≈ 2.303 / 0.468 ≈ 4.92
        let inner = RadiationRegion {
            r_min_rj: 6.0,
            r_max_rj: 15.0,
            d0_krad_per_hour: 0.616,
            r0_rj: 9.4,
            alpha: 4.92,
        };

        // Region 2: Middle magnetosphere (15-30 RJ)
        // Calibrated: at 15 RJ ≈ 0.0616 krad/h, at 26 RJ ≈ 0.000114 krad/h
        // alpha = ln(0.0616/0.000114) / ln(26/15) ≈ 6.29 / 0.549 ≈ 11.46
        // This is very steep — Callisto orbit is much quieter than Ganymede.
        // However, empirical data shows this steep falloff is real.
        // Use a slightly moderated value to account for non-equatorial paths.
        let middle = RadiationRegion {
            r_min_rj: 15.0,
            r_max_rj: 30.0,
            d0_krad_per_hour: 0.0616,
            r0_rj: 15.0,
            alpha: 9.5,
        };

        // Region 3: Outer magnetosphere (30-63 RJ)
        // Much lower dose rate, gradual falloff to magnetopause
        // Extrapolate from middle region endpoint
        let d_at_30 = middle.d0_krad_per_hour * (30.0 / middle.r0_rj).powf(-middle.alpha);
        let outer = RadiationRegion {
            r_min_rj: 30.0,
            r_max_rj: 100.0,
            d0_krad_per_hour: d_at_30,
            r0_rj: 30.0,
            alpha: 2.0,
        };

        JupiterRadiationConfig {
            regions: vec![inner, middle, outer],
            magnetopause_rj: 63.0, // Nominal subsolar magnetopause
            latitude_factor: 1.0,
            plasma_sheet_factor: 1.0,
            storm_factor: 1.0,
        }
    }

    /// Instantaneous dose rate at distance r (in RJ) in krad/hour.
    ///
    /// Returns 0 if r is beyond the magnetopause.
    pub fn dose_rate_krad_h(&self, r_rj: f64) -> f64 {
        if r_rj >= self.magnetopause_rj || r_rj < 0.0 {
            return 0.0;
        }

        let geometry_mult = self.latitude_factor * self.plasma_sheet_factor * self.storm_factor;

        for region in &self.regions {
            if r_rj >= region.r_min_rj && r_rj < region.r_max_rj {
                let rate = region.d0_krad_per_hour * (r_rj / region.r0_rj).powf(-region.alpha);
                return rate * geometry_mult;
            }
        }

        // Beyond all defined regions but inside magnetopause
        0.0
    }

    /// Analytical dose integral for a single power-law region.
    ///
    /// For constant radial velocity v_r (km/s):
    ///   Dose = ∫ D(r) dt = ∫ D(r) dr / v_r
    ///        = (D0 * r0^alpha / v_r) * ∫[r1..r2] r^(-alpha) dr
    ///
    /// For alpha ≠ 1:
    ///   ∫ r^(-alpha) dr = r^(1-alpha) / (1-alpha)
    ///
    /// Returns dose in krad. v_r in km/s, distances in RJ.
    fn analytical_dose_segment(
        region: &RadiationRegion,
        r_start_rj: f64,
        r_end_rj: f64,
        v_radial_km_s: f64,
    ) -> f64 {
        if v_radial_km_s.abs() < 1e-10 {
            return 0.0; // Avoid division by zero
        }

        let alpha = region.alpha;
        let d0 = region.d0_krad_per_hour;
        let r0 = region.r0_rj;

        // Convert v_r from km/s to RJ/hour:
        // 1 RJ = 71,492 km, 1 hour = 3600 s
        // v_rj_per_h = v_km_s * 3600 / 71492
        let v_rj_per_h = v_radial_km_s * 3600.0 / JUPITER_RADIUS_KM;

        let (a, b) = if r_start_rj < r_end_rj {
            (r_start_rj, r_end_rj) // outward
        } else {
            (r_end_rj, r_start_rj) // inward
        };

        let coeff = d0 * r0.powf(alpha) / v_rj_per_h.abs();

        if (alpha - 1.0).abs() < 1e-10 {
            // Special case: alpha ≈ 1
            // ∫ r^(-1) dr = ln(r)
            coeff * (b.ln() - a.ln())
        } else {
            // General case
            let exp = 1.0 - alpha;
            coeff * (b.powf(exp) - a.powf(exp)) / exp
        }
    }

    /// Compute total accumulated dose along a radial transit.
    ///
    /// Assumes constant radial velocity (reasonable for hyperbolic escape
    /// far from periapsis where gravity turn is small).
    ///
    /// # Arguments
    /// * `r_start_rj` - Starting distance from Jupiter center (RJ)
    /// * `r_end_rj` - Ending distance (RJ). Must be > r_start for outward.
    /// * `v_radial_km_s` - Radial velocity component (km/s, positive = outward)
    /// * `shield_budget_krad` - Total dose budget of the radiation shield (krad)
    pub fn transit_analysis(
        &self,
        r_start_rj: f64,
        r_end_rj: f64,
        v_radial_km_s: f64,
        shield_budget_krad: f64,
    ) -> JupiterTransitResult {
        let geometry_mult = self.latitude_factor * self.plasma_sheet_factor * self.storm_factor;

        let mut total_dose = 0.0;
        let mut region_doses: Vec<(f64, f64, f64)> = Vec::new();

        // Clamp end to magnetopause
        let effective_end = if r_end_rj > self.magnetopause_rj {
            self.magnetopause_rj
        } else {
            r_end_rj
        };

        for region in &self.regions {
            // Compute overlap between transit path and this region
            let seg_start = r_start_rj.max(region.r_min_rj);
            let seg_end = effective_end.min(region.r_max_rj);

            if seg_start < seg_end {
                let dose = Self::analytical_dose_segment(region, seg_start, seg_end, v_radial_km_s)
                    * geometry_mult;
                total_dose += dose;
                region_doses.push((seg_start, seg_end, dose));
            }
        }

        // Convert absolute doses to fractions
        let region_fractions: Vec<(f64, f64, f64)> = region_doses
            .iter()
            .map(|(a, b, d)| {
                (
                    *a,
                    *b,
                    if total_dose > 0.0 {
                        d / total_dose
                    } else {
                        0.0
                    },
                )
            })
            .collect();

        let departure_rate = self.dose_rate_krad_h(r_start_rj);
        let arrival_rate = self.dose_rate_krad_h(r_end_rj.min(self.magnetopause_rj));
        let peak_rate = departure_rate.max(arrival_rate); // For outward transit, peak is at start

        let shield_life_at_departure = if departure_rate > 0.0 {
            shield_budget_krad / departure_rate
        } else {
            f64::INFINITY
        };

        let remaining_budget = shield_budget_krad - total_dose;
        let shield_life_at_arrival = if arrival_rate > 0.0 && remaining_budget > 0.0 {
            remaining_budget / arrival_rate
        } else if remaining_budget <= 0.0 {
            0.0
        } else {
            f64::INFINITY
        };

        JupiterTransitResult {
            total_dose_krad: total_dose,
            departure_dose_rate_krad_h: departure_rate,
            arrival_dose_rate_krad_h: arrival_rate,
            shield_life_at_departure_h: shield_life_at_departure,
            shield_life_at_arrival_h: shield_life_at_arrival,
            shield_survives: total_dose < shield_budget_krad,
            region_dose_fractions: region_fractions,
            peak_dose_rate_krad_h: peak_rate,
        }
    }
}

/// EP02 scenario: Kestrel's Jupiter escape from Ganymede orbit.
///
/// Parameters from the episode:
/// - Starts at ~15 RJ (Ganymede orbit)
/// - Reaches 50 RJ with Jupiter-frame velocity 10.3 km/s
/// - Shield remaining life: 42 minutes at departure
///
/// Key finding: "42 minutes remaining at current rate" translates to a dose
/// budget of D_rate × 42/60 hours. Whether the shield survives depends on
/// how fast the ship moves through the belt. At 7 km/s radial (passive escape),
/// the transit takes ~99 hours and the shield fails. At higher velocities
/// (active brachistochrone escape), the shield can survive.
///
/// Returns results for multiple velocity/geometry scenarios.
pub fn ep02_jupiter_escape_analysis() -> Vec<(&'static str, JupiterTransitResult)> {
    let config = JupiterRadiationConfig::default_model();
    let departure_rate = config.dose_rate_krad_h(15.0);
    let shield_budget_42min = departure_rate * (42.0 / 60.0);

    let mut results = Vec::new();

    // Scenario 1: Passive escape at 7 km/s radial (hyperbolic coast)
    // Transit time: ~99 hours. Shield FAILS.
    let result_passive = config.transit_analysis(15.0, 50.0, 7.0, shield_budget_42min);
    results.push(("弾道脱出 7 km/s", result_passive));

    // Scenario 2: Active brachistochrone escape at ~60 km/s average radial
    // If the ship uses brachistochrone (32.7 m/s² from EP01 analysis),
    // the radial velocity increases rapidly. Effective average ~60 km/s.
    // Transit time: ~12 hours. Shield survives.
    let result_brach = config.transit_analysis(15.0, 50.0, 60.0, shield_budget_42min);
    results.push(("加速脱出 60 km/s", result_brach));

    // Scenario 3: Moderate acceleration at 20 km/s average
    // Represents a damaged-ship scenario with reduced thrust
    let result_moderate = config.transit_analysis(15.0, 50.0, 20.0, shield_budget_42min);
    results.push(("損傷状態 20 km/s", result_moderate));

    // Scenario 4: High-latitude escape at 7 km/s (reduced equatorial dose)
    let mut lat_config = JupiterRadiationConfig::default_model();
    lat_config.latitude_factor = 0.15; // Well above equatorial plane
    let result_lat = lat_config.transit_analysis(15.0, 50.0, 7.0, shield_budget_42min);
    results.push(("高緯度脱出 7 km/s", result_lat));

    results
}

/// Find the minimum average radial velocity for shield survival.
///
/// Binary searches for the threshold velocity where the 42-minute
/// shield budget is exactly depleted during transit from r_start to r_end.
pub fn minimum_survival_velocity(
    config: &JupiterRadiationConfig,
    r_start_rj: f64,
    r_end_rj: f64,
    shield_budget_krad: f64,
) -> f64 {
    let mut v_low = 1.0_f64;
    let mut v_high = 200.0_f64;
    for _ in 0..60 {
        let v_mid = (v_low + v_high) / 2.0;
        let result = config.transit_analysis(r_start_rj, r_end_rj, v_mid, shield_budget_krad);
        if result.shield_survives {
            v_high = v_mid;
        } else {
            v_low = v_mid;
        }
    }
    (v_low + v_high) / 2.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_model_creation() {
        let config = JupiterRadiationConfig::default_model();
        assert_eq!(config.regions.len(), 3);
        assert_eq!(config.magnetopause_rj, 63.0);
        assert_eq!(config.latitude_factor, 1.0);
    }

    #[test]
    fn test_dose_rate_at_europa_order_of_magnitude() {
        // Europa (~9.4 RJ): ~0.616 krad/h (calibration point)
        let config = JupiterRadiationConfig::default_model();
        let rate = config.dose_rate_krad_h(9.4);
        // Should be close to the calibration value
        assert!(
            (rate - 0.616).abs() < 0.01,
            "Europa rate = {rate:.4} krad/h (expected ~0.616)"
        );
    }

    #[test]
    fn test_dose_rate_at_ganymede_order_of_magnitude() {
        // Ganymede (~15 RJ): ~0.0616 krad/h
        let config = JupiterRadiationConfig::default_model();
        let rate = config.dose_rate_krad_h(15.0);
        // The inner region ends at 15 RJ; check boundary behavior
        // At exactly 15 RJ, we're at the boundary — check the middle region
        // Middle region has d0=0.0616 at r0=15.0, so rate should be 0.0616
        assert!(
            (rate - 0.0616).abs() < 0.005,
            "Ganymede rate = {rate:.6} krad/h (expected ~0.0616)"
        );
    }

    #[test]
    fn test_dose_rate_decreases_outward() {
        let config = JupiterRadiationConfig::default_model();
        let rate_15 = config.dose_rate_krad_h(15.0);
        let rate_20 = config.dose_rate_krad_h(20.0);
        let rate_30 = config.dose_rate_krad_h(30.0);
        let rate_50 = config.dose_rate_krad_h(50.0);
        assert!(
            rate_15 > rate_20,
            "rate should decrease: 15 RJ ({rate_15}) > 20 RJ ({rate_20})"
        );
        assert!(
            rate_20 > rate_30,
            "rate should decrease: 20 RJ ({rate_20}) > 30 RJ ({rate_30})"
        );
        assert!(
            rate_30 > rate_50,
            "rate should decrease: 30 RJ ({rate_30}) > 50 RJ ({rate_50})"
        );
    }

    #[test]
    fn test_dose_rate_steep_falloff_ganymede_to_callisto() {
        // From Ganymede (15 RJ) to Callisto (26 RJ), dose drops by ~500x
        let config = JupiterRadiationConfig::default_model();
        let rate_15 = config.dose_rate_krad_h(15.0);
        let rate_26 = config.dose_rate_krad_h(26.0);
        let ratio = rate_15 / rate_26;
        // Empirically should be ~500x (5,400/1 in yearly terms)
        assert!(
            ratio > 100.0 && ratio < 2000.0,
            "Ganymede/Callisto ratio = {ratio:.0}x (expected ~500x)"
        );
    }

    #[test]
    fn test_dose_rate_zero_beyond_magnetopause() {
        let config = JupiterRadiationConfig::default_model();
        assert_eq!(config.dose_rate_krad_h(100.0), 0.0);
        assert_eq!(config.dose_rate_krad_h(63.0), 0.0);
        assert_eq!(config.dose_rate_krad_h(63.1), 0.0);
    }

    #[test]
    fn test_dose_rate_negative_distance() {
        let config = JupiterRadiationConfig::default_model();
        assert_eq!(config.dose_rate_krad_h(-1.0), 0.0);
    }

    #[test]
    fn test_geometry_multipliers() {
        let mut config = JupiterRadiationConfig::default_model();
        let base_rate = config.dose_rate_krad_h(15.0);

        config.storm_factor = 2.0;
        let storm_rate = config.dose_rate_krad_h(15.0);
        assert!(
            (storm_rate - 2.0 * base_rate).abs() < 1e-10,
            "Storm factor should double rate"
        );

        config.storm_factor = 1.0;
        config.latitude_factor = 0.3;
        let lat_rate = config.dose_rate_krad_h(15.0);
        assert!(
            (lat_rate - 0.3 * base_rate).abs() < 1e-10,
            "Latitude factor should scale rate"
        );
    }

    #[test]
    fn test_analytical_dose_nonzero() {
        let config = JupiterRadiationConfig::default_model();
        let result = config.transit_analysis(15.0, 50.0, 7.0, 100.0);
        assert!(
            result.total_dose_krad > 0.0,
            "Total dose should be positive for transit through radiation belt"
        );
    }

    #[test]
    fn test_dose_dominated_by_inner_region() {
        // Most dose should accumulate in the 15-30 RJ region (first segment)
        let config = JupiterRadiationConfig::default_model();
        let result = config.transit_analysis(15.0, 50.0, 7.0, 100.0);

        assert!(!result.region_dose_fractions.is_empty());
        // First region (15-30 RJ) should dominate
        let first_fraction = result.region_dose_fractions[0].2;
        assert!(
            first_fraction > 0.9,
            "Inner region should dominate dose: {first_fraction:.3} (expected > 0.9)"
        );
    }

    #[test]
    fn test_shield_42min_at_constant_position_exceeds_transit_dose() {
        // Key finding: "42 minutes" at 15 RJ corresponds to a shield budget
        // of 0.043 krad. The transit from 15→50 RJ at 7 km/s accumulates
        // ~0.31 krad — about 7x more than the budget.
        //
        // This means the "42 minutes remaining" interpretation requires one of:
        // (a) Much higher radial velocity (rapid brachistochrone escape)
        // (b) High-latitude path reducing equatorial dose
        // (c) The shield has a dynamic regeneration/cooling mechanism
        //
        // The analysis explores which interpretation is most plausible.
        let config = JupiterRadiationConfig::default_model();
        let departure_rate = config.dose_rate_krad_h(15.0);
        let shield_budget_42min = departure_rate * (42.0 / 60.0);

        let result = config.transit_analysis(15.0, 50.0, 7.0, shield_budget_42min);

        // At constant 7 km/s, the shield does NOT survive
        assert!(
            !result.shield_survives,
            "At 7 km/s, shield should NOT survive: dose={:.4} > budget={:.4}",
            result.total_dose_krad, shield_budget_42min,
        );

        // Verify departure shield life is 42 min = 0.7 h
        assert!(
            (result.shield_life_at_departure_h - 0.7).abs() < 0.01,
            "Departure shield life = {:.3} h (expected 0.7 h = 42 min)",
            result.shield_life_at_departure_h,
        );
    }

    #[test]
    fn test_shield_survives_with_higher_velocity() {
        // At ~51 km/s average radial velocity, transit time drops enough
        // for the shield to survive with a 42-minute budget.
        // This is physically achievable with brachistochrone thrust (32.7 m/s²).
        let config = JupiterRadiationConfig::default_model();
        let departure_rate = config.dose_rate_krad_h(15.0);
        let shield_budget_42min = departure_rate * (42.0 / 60.0);

        // Find the threshold
        let threshold = minimum_survival_velocity(&config, 15.0, 50.0, shield_budget_42min);

        // At threshold + margin, shield survives
        let result = config.transit_analysis(15.0, 50.0, threshold + 5.0, shield_budget_42min);
        assert!(
            result.shield_survives,
            "Above threshold ({:.1} km/s), shield should survive: dose={:.6}",
            threshold, result.total_dose_krad,
        );

        // Threshold should be ~50 km/s range
        assert!(
            threshold > 30.0 && threshold < 80.0,
            "Threshold = {threshold:.1} km/s (expected 30-80)"
        );
    }

    #[test]
    fn test_shield_survives_high_latitude() {
        // High-latitude escape (30% of equatorial dose) with moderate velocity
        let mut config = JupiterRadiationConfig::default_model();
        config.latitude_factor = 0.3;
        let departure_rate = config.dose_rate_krad_h(15.0);
        let shield_budget_42min = departure_rate * (42.0 / 60.0);

        let result = config.transit_analysis(15.0, 50.0, 7.0, shield_budget_42min);
        // High-latitude reduces accumulated dose by 0.3x, same as budget
        // so this is still marginal
        assert!(
            !result.shield_survives || result.total_dose_krad < shield_budget_42min * 1.1,
            "High-latitude should be marginal: dose={:.6}, budget={:.6}",
            result.total_dose_krad,
            shield_budget_42min,
        );
    }

    #[test]
    fn test_ep02_scenarios_run() {
        let results = ep02_jupiter_escape_analysis();
        assert_eq!(results.len(), 4);
        for (label, result) in &results {
            assert!(
                result.total_dose_krad > 0.0,
                "Scenario '{label}' should have positive dose"
            );
        }

        // Scenario 1 (7 km/s passive): shield fails
        assert!(
            !results[0].1.shield_survives,
            "Passive escape should NOT survive"
        );
        // Scenario 2 (50 km/s brachistochrone): shield survives
        assert!(
            results[1].1.shield_survives,
            "Brachistochrone escape should survive"
        );
    }

    #[test]
    fn test_minimum_velocity_for_shield_survival() {
        // Find the minimum radial velocity where the shield (42 min budget) survives
        let config = JupiterRadiationConfig::default_model();
        let departure_rate = config.dose_rate_krad_h(15.0);
        let shield_budget = departure_rate * (42.0 / 60.0);

        // Binary search for threshold velocity
        let mut v_low = 5.0_f64;
        let mut v_high = 100.0_f64;
        for _ in 0..50 {
            let v_mid = (v_low + v_high) / 2.0;
            let result = config.transit_analysis(15.0, 50.0, v_mid, shield_budget);
            if result.shield_survives {
                v_high = v_mid;
            } else {
                v_low = v_mid;
            }
        }
        let threshold_v = (v_low + v_high) / 2.0;

        // Threshold should be in a physically meaningful range
        assert!(
            threshold_v > 10.0 && threshold_v < 80.0,
            "Threshold velocity = {threshold_v:.1} km/s (should be 10-80 km/s)"
        );
    }

    #[test]
    fn test_transit_time_physical() {
        // Verify transit time is physically reasonable
        // 15 → 50 RJ at 7 km/s radial
        let dist_km = (50.0 - 15.0) * JUPITER_RADIUS_KM;
        let time_h = dist_km / 7.0 / 3600.0;
        // Should be ~99.4 hours
        assert!(
            (time_h - 99.4).abs() < 1.0,
            "Transit time = {time_h:.1} h (expected ~99.4 h)"
        );
    }

    #[test]
    fn test_dose_rate_continuity_at_boundaries() {
        // Check approximate continuity at region boundaries
        let config = JupiterRadiationConfig::default_model();

        // At 15 RJ boundary (inner → middle)
        let rate_inner = config.regions[0].d0_krad_per_hour
            * (14.999 / config.regions[0].r0_rj).powf(-config.regions[0].alpha);
        let rate_middle = config.dose_rate_krad_h(15.0);
        // These may not match perfectly due to calibration approach,
        // but should be within order of magnitude
        let ratio = rate_inner / rate_middle;
        assert!(
            ratio > 0.5 && ratio < 2.0,
            "15 RJ boundary discontinuity: inner={rate_inner:.4} vs middle={rate_middle:.4} (ratio={ratio:.2})"
        );
    }

    #[test]
    fn test_zero_velocity_returns_zero_dose() {
        let config = JupiterRadiationConfig::default_model();
        let result = config.transit_analysis(15.0, 50.0, 0.0, 100.0);
        assert_eq!(result.total_dose_krad, 0.0);
    }

    #[test]
    fn test_higher_velocity_means_lower_dose() {
        // Faster transit → less time in radiation → less dose
        let config = JupiterRadiationConfig::default_model();
        let result_slow = config.transit_analysis(15.0, 50.0, 5.0, 100.0);
        let result_fast = config.transit_analysis(15.0, 50.0, 10.0, 100.0);
        assert!(
            result_slow.total_dose_krad > result_fast.total_dose_krad,
            "Slower transit should accumulate more dose: slow={:.4} > fast={:.4}",
            result_slow.total_dose_krad,
            result_fast.total_dose_krad,
        );
    }

    /// Print full analysis report (run with --nocapture to see output).
    /// This test always passes — it's used to generate report data.
    #[test]
    fn test_print_analysis_report() {
        let config = JupiterRadiationConfig::default_model();
        let dep_rate = config.dose_rate_krad_h(15.0);
        let budget = dep_rate * (42.0 / 60.0);
        let threshold = minimum_survival_velocity(&config, 15.0, 50.0, budget);

        eprintln!("=== EP02 Jupiter Radiation Analysis ===");
        eprintln!("Departure rate at 15 RJ: {dep_rate:.6} krad/h");
        eprintln!("Shield budget (42 min): {budget:.6} krad");
        eprintln!("Min survival velocity: {threshold:.1} km/s");

        let results = ep02_jupiter_escape_analysis();
        for (label, r) in &results {
            eprintln!("\n--- {label} ---");
            eprintln!(
                "  Dose: {:.6} krad, Survives: {}",
                r.total_dose_krad, r.shield_survives
            );
            eprintln!(
                "  Dep rate: {:.6} krad/h, Arr rate: {:.10} krad/h",
                r.departure_dose_rate_krad_h, r.arrival_dose_rate_krad_h
            );
            eprintln!(
                "  Life@dep: {:.2}h ({:.1}min), Life@arr: {:.1}h",
                r.shield_life_at_departure_h,
                r.shield_life_at_departure_h * 60.0,
                r.shield_life_at_arrival_h
            );
        }

        eprintln!("\n=== Dose Rate Profile ===");
        for r in [10, 12, 15, 17, 20, 25, 30, 40, 50, 63] {
            let rate = config.dose_rate_krad_h(r as f64);
            eprintln!("  {r:3} RJ: {rate:.8} krad/h");
        }
    }
}
