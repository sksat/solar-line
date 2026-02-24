/// Export orbital mechanics calculation results from the Rust implementation
/// as JSON for cross-validation with external Python implementation.
///
/// Usage: cargo test --test cross_validation_export -- --nocapture > cross_validation/rust_values.json
///
/// This is run as part of `npm run cross-validate`.

#[cfg(test)]
mod export {
    use solar_line_core::constants::{mu, orbit_radius, reference_orbits, G0_M_S2};
    use solar_line_core::flyby;
    use solar_line_core::kepler;
    use solar_line_core::orbits;
    use solar_line_core::propagation::*;
    use solar_line_core::units::{Eccentricity, Km, KmPerSec, Mu, Radians, Seconds};
    use solar_line_core::vec3::Vec3;

    #[test]
    fn export_values() {
        // Collect all calculation results
        let mut results = String::from("{\n");

        // === Constants ===
        results.push_str("  \"constants\": {\n");
        results.push_str(&format!("    \"mu_sun\": {:.15e},\n", mu::SUN.value()));
        results.push_str(&format!("    \"mu_earth\": {:.15e},\n", mu::EARTH.value()));
        results.push_str(&format!("    \"mu_mars\": {:.15e},\n", mu::MARS.value()));
        results.push_str(&format!(
            "    \"mu_jupiter\": {:.15e},\n",
            mu::JUPITER.value()
        ));
        results.push_str(&format!(
            "    \"mu_saturn\": {:.15e},\n",
            mu::SATURN.value()
        ));
        results.push_str(&format!(
            "    \"mu_uranus\": {:.15e},\n",
            mu::URANUS.value()
        ));
        results.push_str(&format!(
            "    \"r_earth\": {:.15e},\n",
            orbit_radius::EARTH.value()
        ));
        results.push_str(&format!(
            "    \"r_mars\": {:.15e},\n",
            orbit_radius::MARS.value()
        ));
        results.push_str(&format!(
            "    \"r_jupiter\": {:.15e},\n",
            orbit_radius::JUPITER.value()
        ));
        results.push_str(&format!(
            "    \"r_saturn\": {:.15e},\n",
            orbit_radius::SATURN.value()
        ));
        results.push_str(&format!(
            "    \"r_uranus\": {:.15e},\n",
            orbit_radius::URANUS.value()
        ));
        results.push_str(&format!(
            "    \"r_leo\": {:.15e},\n",
            reference_orbits::LEO_RADIUS.value()
        ));
        results.push_str(&format!(
            "    \"r_geo\": {:.15e},\n",
            reference_orbits::GEO_RADIUS.value()
        ));
        results.push_str(&format!("    \"g0\": {:.15e}\n", G0_M_S2));
        results.push_str("  },\n");

        // === Vis-viva ===
        results.push_str("  \"vis_viva\": {\n");
        // LEO circular velocity
        let v_leo = orbits::vis_viva(
            mu::EARTH,
            reference_orbits::LEO_RADIUS,
            reference_orbits::LEO_RADIUS,
        );
        results.push_str(&format!(
            "    \"v_leo_circular\": {:.15e},\n",
            v_leo.value()
        ));
        // GEO circular velocity
        let v_geo = orbits::vis_viva(
            mu::EARTH,
            reference_orbits::GEO_RADIUS,
            reference_orbits::GEO_RADIUS,
        );
        results.push_str(&format!(
            "    \"v_geo_circular\": {:.15e},\n",
            v_geo.value()
        ));
        // Earth orbital velocity
        let v_earth = orbits::vis_viva(mu::SUN, orbit_radius::EARTH, orbit_radius::EARTH);
        results.push_str(&format!(
            "    \"v_earth_orbit\": {:.15e}\n",
            v_earth.value()
        ));
        results.push_str("  },\n");

        // === Hohmann transfers ===
        results.push_str("  \"hohmann\": {\n");
        // LEO to GEO
        let (dv1_lg, dv2_lg) = orbits::hohmann_transfer_dv(
            mu::EARTH,
            reference_orbits::LEO_RADIUS,
            reference_orbits::GEO_RADIUS,
        );
        results.push_str(&format!("    \"leo_geo_dv1\": {:.15e},\n", dv1_lg.value()));
        results.push_str(&format!("    \"leo_geo_dv2\": {:.15e},\n", dv2_lg.value()));
        // Earth to Mars
        let (dv1_em, dv2_em) =
            orbits::hohmann_transfer_dv(mu::SUN, orbit_radius::EARTH, orbit_radius::MARS);
        results.push_str(&format!(
            "    \"earth_mars_dv1\": {:.15e},\n",
            dv1_em.value()
        ));
        results.push_str(&format!(
            "    \"earth_mars_dv2\": {:.15e},\n",
            dv2_em.value()
        ));
        // Earth to Jupiter
        let (dv1_ej, dv2_ej) =
            orbits::hohmann_transfer_dv(mu::SUN, orbit_radius::EARTH, orbit_radius::JUPITER);
        results.push_str(&format!(
            "    \"earth_jupiter_dv1\": {:.15e},\n",
            dv1_ej.value()
        ));
        results.push_str(&format!(
            "    \"earth_jupiter_dv2\": {:.15e}\n",
            dv2_ej.value()
        ));
        results.push_str("  },\n");

        // === Orbital periods ===
        results.push_str("  \"periods\": {\n");
        let t_earth = orbits::orbital_period(mu::SUN, orbit_radius::EARTH);
        results.push_str(&format!(
            "    \"earth_days\": {:.15e},\n",
            t_earth.value() / 86400.0
        ));
        let t_mars = orbits::orbital_period(mu::SUN, orbit_radius::MARS);
        results.push_str(&format!(
            "    \"mars_days\": {:.15e},\n",
            t_mars.value() / 86400.0
        ));
        let t_jupiter = orbits::orbital_period(mu::SUN, orbit_radius::JUPITER);
        results.push_str(&format!(
            "    \"jupiter_days\": {:.15e},\n",
            t_jupiter.value() / 86400.0
        ));
        let t_leo = orbits::orbital_period(mu::EARTH, reference_orbits::LEO_RADIUS);
        results.push_str(&format!(
            "    \"leo_minutes\": {:.15e}\n",
            t_leo.value() / 60.0
        ));
        results.push_str("  },\n");

        // === Brachistochrone ===
        results.push_str("  \"brachistochrone\": {\n");
        let d_au = Km(149_597_870.7); // 1 AU
        let t_72h = Seconds(72.0 * 3600.0);
        let a_brach = orbits::brachistochrone_accel(d_au, t_72h);
        let dv_brach = orbits::brachistochrone_dv(d_au, t_72h);
        let d_max = orbits::brachistochrone_max_distance(a_brach, t_72h);
        results.push_str(&format!("    \"accel_1au_72h\": {:.15e},\n", a_brach));
        results.push_str(&format!("    \"dv_1au_72h\": {:.15e},\n", dv_brach.value()));
        results.push_str(&format!("    \"dmax_roundtrip\": {:.15e}\n", d_max.value()));
        results.push_str("  },\n");

        // === Tsiolkovsky ===
        results.push_str("  \"tsiolkovsky\": {\n");
        let ve_chem = orbits::exhaust_velocity(450.0);
        results.push_str(&format!("    \"ve_isp450\": {:.15e},\n", ve_chem.value()));
        let ve_fusion = orbits::exhaust_velocity(1_000_000.0);
        results.push_str(&format!("    \"ve_isp1e6\": {:.15e},\n", ve_fusion.value()));
        let mr = orbits::mass_ratio(KmPerSec(10.0), KmPerSec(10.0));
        results.push_str(&format!("    \"mass_ratio_dv_eq_ve\": {:.15e},\n", mr));
        let pf = orbits::propellant_fraction(KmPerSec(10.0), KmPerSec(10.0));
        results.push_str(&format!("    \"prop_frac_dv_eq_ve\": {:.15e},\n", pf));
        let prop = orbits::required_propellant_mass(1000.0, KmPerSec(9.4), ve_chem);
        results.push_str(&format!("    \"prop_mass_leo_chem\": {:.15e},\n", prop));
        let m0 = orbits::initial_mass(300000.0, KmPerSec(8497.0), ve_fusion);
        results.push_str(&format!("    \"m0_kestrel_ep01\": {:.15e}\n", m0));
        results.push_str("  },\n");

        // === Kepler equation ===
        results.push_str("  \"kepler\": {\n");
        // Test cases: (M, e) → E
        let test_cases = [
            (0.5, 0.1),
            (1.0, 0.3),
            (2.0, 0.5),
            (3.0, 0.7),
            (0.1, 0.9),
            (std::f64::consts::PI, 0.5),
        ];
        results.push_str("    \"solutions\": [\n");
        for (i, &(m, e)) in test_cases.iter().enumerate() {
            let sol =
                kepler::solve_kepler(Radians(m), Eccentricity::elliptical(e).unwrap()).unwrap();
            let nu = kepler::eccentric_to_true_anomaly(
                sol.eccentric_anomaly,
                Eccentricity::elliptical(e).unwrap(),
            );
            let comma = if i < test_cases.len() - 1 { "," } else { "" };
            results.push_str(&format!(
                "      {{\"M\": {:.15e}, \"e\": {:.15e}, \"E\": {:.15e}, \"nu\": {:.15e}, \"residual\": {:.15e}}}{}\n",
                m, e, sol.eccentric_anomaly.value(), nu.value(), sol.residual, comma
            ));
        }
        results.push_str("    ]\n");
        results.push_str("  },\n");

        // === SOI radii ===
        results.push_str("  \"soi\": {\n");
        let soi_jup = flyby::soi_radius(orbit_radius::JUPITER, mu::JUPITER, mu::SUN);
        results.push_str(&format!("    \"jupiter_km\": {:.15e},\n", soi_jup.value()));
        let soi_earth = flyby::soi_radius(orbit_radius::EARTH, mu::EARTH, mu::SUN);
        results.push_str(&format!("    \"earth_km\": {:.15e},\n", soi_earth.value()));
        let soi_saturn = flyby::soi_radius(orbit_radius::SATURN, mu::SATURN, mu::SUN);
        results.push_str(&format!("    \"saturn_km\": {:.15e}\n", soi_saturn.value()));
        results.push_str("  },\n");

        // === Flyby ===
        results.push_str("  \"flyby\": {\n");
        // Unpowered Jupiter flyby
        let v_inf_in = [10.0, 0.0, 0.0];
        let r_peri = Km(200_000.0);
        let normal = [0.0, 0.0, 1.0];
        let fb = flyby::unpowered_flyby(mu::JUPITER, v_inf_in, r_peri, normal);
        results.push_str("    \"unpowered_jupiter\": {\n");
        results.push_str(&format!("      \"v_inf_in\": {:.15e},\n", 10.0));
        results.push_str(&format!("      \"r_periapsis\": {:.15e},\n", 200000.0));
        results.push_str(&format!(
            "      \"turn_angle_rad\": {:.15e},\n",
            fb.turn_angle_rad
        ));
        results.push_str(&format!(
            "      \"v_periapsis\": {:.15e},\n",
            fb.v_periapsis
        ));
        results.push_str(&format!("      \"v_inf_out\": {:.15e}\n", fb.v_inf_out));
        results.push_str("    },\n");
        // Powered Jupiter flyby
        let fb_pow = flyby::powered_flyby(mu::JUPITER, v_inf_in, r_peri, KmPerSec(1.0), normal);
        results.push_str("    \"powered_jupiter\": {\n");
        results.push_str(&format!("      \"burn_dv\": {:.15e},\n", 1.0));
        results.push_str(&format!(
            "      \"turn_angle_rad\": {:.15e},\n",
            fb_pow.turn_angle_rad
        ));
        results.push_str(&format!(
            "      \"v_periapsis\": {:.15e},\n",
            fb_pow.v_periapsis
        ));
        results.push_str(&format!("      \"v_inf_out\": {:.15e}\n", fb_pow.v_inf_out));
        results.push_str("    }\n");
        results.push_str("  },\n");

        // === Orbit propagation ===
        results.push_str("  \"propagation\": {\n");
        // Propagate circular LEO orbit for 1 period, check energy conservation
        let r_leo = reference_orbits::LEO_RADIUS.value();
        let v_circ = (mu::EARTH.value() / r_leo).sqrt();
        let state = PropState::new(
            Vec3::new(Km(r_leo), Km(0.0), Km(0.0)),
            Vec3::new(KmPerSec(0.0), KmPerSec(v_circ), KmPerSec(0.0)),
        );
        let period = orbits::orbital_period(mu::EARTH, reference_orbits::LEO_RADIUS);
        let config = IntegratorConfig {
            dt: 10.0,
            mu: mu::EARTH,
            thrust: ThrustProfile::None,
        };
        let final_state = propagate_final(&state, &config, period.value());
        let e0 = state.specific_energy(mu::EARTH);
        let ef = final_state.specific_energy(mu::EARTH);
        results.push_str(&format!("    \"leo_init_energy\": {:.15e},\n", e0));
        results.push_str(&format!("    \"leo_final_energy\": {:.15e},\n", ef));
        results.push_str(&format!(
            "    \"leo_energy_drift\": {:.15e},\n",
            (ef - e0).abs() / e0.abs()
        ));
        results.push_str(&format!(
            "    \"leo_final_x\": {:.15e},\n",
            final_state.pos.x.value()
        ));
        results.push_str(&format!(
            "    \"leo_final_y\": {:.15e},\n",
            final_state.pos.y.value()
        ));
        results.push_str(&format!(
            "    \"leo_final_r\": {:.15e}\n",
            final_state.radius()
        ));
        results.push_str("  },\n");

        // === Oberth effect ===
        results.push_str("  \"oberth\": {\n");
        let gain = orbits::oberth_dv_gain(mu::JUPITER, Km(71_492.0), KmPerSec(10.0), KmPerSec(1.0));
        results.push_str(&format!(
            "    \"gain_jupiter_10_1\": {:.15e},\n",
            gain.value()
        ));
        let eff =
            orbits::oberth_efficiency(mu::JUPITER, Km(71_492.0), KmPerSec(10.0), KmPerSec(1.0));
        results.push_str(&format!("    \"efficiency_jupiter_10_1\": {:.15e},\n", eff));
        let eff_high = orbits::oberth_efficiency(
            mu::JUPITER,
            Km(71_492.0 * 3.0),
            KmPerSec(1500.0),
            KmPerSec(50.0),
        );
        results.push_str(&format!("    \"efficiency_1500_50\": {:.15e}\n", eff_high));
        results.push_str("  },\n");

        // === Plane change ===
        results.push_str("  \"plane_change\": {\n");
        let dv_90 = orbits::plane_change_dv(KmPerSec(7.0), Radians(std::f64::consts::FRAC_PI_2));
        results.push_str(&format!("    \"dv_90deg_7kms\": {:.15e}\n", dv_90.value()));
        results.push_str("  }\n");

        results.push_str("}\n");

        println!("{}", results);
    }
}
