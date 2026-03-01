//! Export orbital mechanics calculation results from the Rust implementation
//! as JSON for cross-validation with external Python implementation.
//!
//! Usage: cargo test --test cross_validation_export -- --nocapture > cross_validation/rust_values.json
//!
//! This is run as part of `npm run cross-validate`.

#[cfg(test)]
mod export {
    use solar_line_core::attitude;
    use solar_line_core::comms;
    use solar_line_core::constants::{mu, orbit_radius, reference_orbits, G0_M_S2};
    use solar_line_core::ephemeris;
    use solar_line_core::flyby;
    use solar_line_core::kepler;
    use solar_line_core::mass_timeline;
    use solar_line_core::orbital_3d;
    use solar_line_core::orbits;
    use solar_line_core::plasmoid;
    use solar_line_core::propagation::*;
    use solar_line_core::relativistic;
    use solar_line_core::units::{Eccentricity, Km, KmPerSec, Radians, Seconds};
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

        // === Specific energy & angular momentum ===
        results.push_str("  \"orbital_energy\": {\n");
        let eps_leo = orbits::specific_energy(mu::EARTH, reference_orbits::LEO_RADIUS);
        results.push_str(&format!("    \"eps_leo\": {:.15e},\n", eps_leo));
        let eps_geo = orbits::specific_energy(mu::EARTH, reference_orbits::GEO_RADIUS);
        results.push_str(&format!("    \"eps_geo\": {:.15e},\n", eps_geo));
        let eps_earth_sun = orbits::specific_energy(mu::SUN, orbit_radius::EARTH);
        results.push_str(&format!("    \"eps_earth_sun\": {:.15e},\n", eps_earth_sun));
        let h_leo = orbits::specific_angular_momentum(
            mu::EARTH,
            reference_orbits::LEO_RADIUS,
            Eccentricity::elliptical(0.0).unwrap(),
        );
        results.push_str(&format!("    \"h_leo_circular\": {:.15e},\n", h_leo));
        let h_mars = orbits::specific_angular_momentum(
            mu::SUN,
            orbit_radius::MARS,
            Eccentricity::elliptical(0.0934).unwrap(),
        );
        results.push_str(&format!("    \"h_mars_e0934\": {:.15e}\n", h_mars));
        results.push_str("  },\n");

        // === Mass flow rate & jet power ===
        results.push_str("  \"propulsion\": {\n");
        let ve_1e6 = orbits::exhaust_velocity(1_000_000.0);
        let mdot = orbits::mass_flow_rate(9.8e6, ve_1e6);
        results.push_str(&format!("    \"mdot_98MN_isp1e6\": {:.15e},\n", mdot));
        let jet_p = orbits::jet_power(9.8e6, ve_1e6);
        results.push_str(&format!("    \"jet_power_98MN_isp1e6\": {:.15e},\n", jet_p));
        let ve_450 = orbits::exhaust_velocity(450.0);
        let mdot_chem = orbits::mass_flow_rate(1.0e6, ve_450);
        results.push_str(&format!("    \"mdot_1MN_isp450\": {:.15e},\n", mdot_chem));
        let jet_p_chem = orbits::jet_power(1.0e6, ve_450);
        results.push_str(&format!(
            "    \"jet_power_1MN_isp450\": {:.15e}\n",
            jet_p_chem
        ));
        results.push_str("  },\n");

        // === Elements to state vector ===
        results.push_str("  \"elements_to_state\": {\n");
        // Test case 1: circular equatorial LEO
        let e_circ = Eccentricity::elliptical(0.0).unwrap();
        let elem1 = orbits::OrbitalElements {
            semi_major_axis: Km(6778.0),
            eccentricity: e_circ,
            inclination: Radians(0.0),
            raan: Radians(0.0),
            arg_periapsis: Radians(0.0),
            true_anomaly: Radians(0.0),
        };
        let sv1 = orbits::elements_to_state_vector(mu::EARTH, &elem1);
        results.push_str("    \"circular_leo\": {\n");
        results.push_str(&format!("      \"px\": {:.15e},\n", sv1.position.x.value()));
        results.push_str(&format!("      \"py\": {:.15e},\n", sv1.position.y.value()));
        results.push_str(&format!("      \"pz\": {:.15e},\n", sv1.position.z.value()));
        results.push_str(&format!("      \"vx\": {:.15e},\n", sv1.velocity.x.value()));
        results.push_str(&format!("      \"vy\": {:.15e},\n", sv1.velocity.y.value()));
        results.push_str(&format!("      \"vz\": {:.15e}\n", sv1.velocity.z.value()));
        results.push_str("    },\n");
        // Test case 2: eccentric inclined orbit
        let e_ecc = Eccentricity::elliptical(0.2).unwrap();
        let elem2 = orbits::OrbitalElements {
            semi_major_axis: Km(10000.0),
            eccentricity: e_ecc,
            inclination: Radians(0.5),
            raan: Radians(1.0),
            arg_periapsis: Radians(2.0),
            true_anomaly: Radians(1.5),
        };
        let sv2 = orbits::elements_to_state_vector(mu::EARTH, &elem2);
        results.push_str("    \"eccentric_inclined\": {\n");
        results.push_str(&format!("      \"a\": {:.15e},\n", 10000.0));
        results.push_str(&format!("      \"e\": {:.15e},\n", 0.2));
        results.push_str(&format!("      \"i\": {:.15e},\n", 0.5));
        results.push_str(&format!("      \"raan\": {:.15e},\n", 1.0));
        results.push_str(&format!("      \"w\": {:.15e},\n", 2.0));
        results.push_str(&format!("      \"nu\": {:.15e},\n", 1.5));
        results.push_str(&format!("      \"px\": {:.15e},\n", sv2.position.x.value()));
        results.push_str(&format!("      \"py\": {:.15e},\n", sv2.position.y.value()));
        results.push_str(&format!("      \"pz\": {:.15e},\n", sv2.position.z.value()));
        results.push_str(&format!("      \"vx\": {:.15e},\n", sv2.velocity.x.value()));
        results.push_str(&format!("      \"vy\": {:.15e},\n", sv2.velocity.y.value()));
        results.push_str(&format!("      \"vz\": {:.15e}\n", sv2.velocity.z.value()));
        results.push_str("    },\n");
        // Test case 3: high eccentricity solar orbit (Halley-like)
        let e_halley = Eccentricity::elliptical(0.967).unwrap();
        let elem3 = orbits::OrbitalElements {
            semi_major_axis: Km(2.667e9),
            eccentricity: e_halley,
            inclination: Radians(2.8387),
            raan: Radians(0.99559),
            arg_periapsis: Radians(1.87176),
            true_anomaly: Radians(0.5),
        };
        let sv3 = orbits::elements_to_state_vector(mu::SUN, &elem3);
        results.push_str("    \"halley_like\": {\n");
        results.push_str(&format!("      \"a\": {:.15e},\n", 2.667e9));
        results.push_str(&format!("      \"e\": {:.15e},\n", 0.967));
        results.push_str(&format!("      \"i\": {:.15e},\n", 2.8387));
        results.push_str(&format!("      \"raan\": {:.15e},\n", 0.99559));
        results.push_str(&format!("      \"w\": {:.15e},\n", 1.87176));
        results.push_str(&format!("      \"nu\": {:.15e},\n", 0.5));
        results.push_str(&format!("      \"px\": {:.15e},\n", sv3.position.x.value()));
        results.push_str(&format!("      \"py\": {:.15e},\n", sv3.position.y.value()));
        results.push_str(&format!("      \"pz\": {:.15e},\n", sv3.position.z.value()));
        results.push_str(&format!("      \"vx\": {:.15e},\n", sv3.velocity.x.value()));
        results.push_str(&format!("      \"vy\": {:.15e},\n", sv3.velocity.y.value()));
        results.push_str(&format!("      \"vz\": {:.15e}\n", sv3.velocity.z.value()));
        results.push_str("    }\n");
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
        results.push_str("    ],\n");

        // Anomaly round-trip: M → ν → M (verify full chain)
        let rt_cases = [(1.0, 0.3), (2.5, 0.6), (0.3, 0.05)];
        results.push_str("    \"anomaly_roundtrips\": [\n");
        for (i, &(m, e)) in rt_cases.iter().enumerate() {
            let ecc = Eccentricity::elliptical(e).unwrap();
            let nu = kepler::mean_to_true_anomaly(Radians(m), ecc).unwrap();
            let m_back = kepler::true_to_mean_anomaly(nu, ecc);
            let comma = if i < rt_cases.len() - 1 { "," } else { "" };
            results.push_str(&format!(
                "      {{\"M_in\": {:.15e}, \"e\": {:.15e}, \"nu\": {:.15e}, \"M_out\": {:.15e}}}{}\n",
                m, e, nu.value(), m_back.value(), comma
            ));
        }
        results.push_str("    ],\n");

        // Mean motion: n = sqrt(μ/a³) (rad/s)
        let n_earth = kepler::mean_motion(mu::SUN, orbit_radius::EARTH);
        results.push_str(&format!("    \"mean_motion_earth\": {:.15e},\n", n_earth));
        let n_mars = kepler::mean_motion(mu::SUN, orbit_radius::MARS);
        results.push_str(&format!("    \"mean_motion_mars\": {:.15e},\n", n_mars));
        let n_jupiter = kepler::mean_motion(mu::SUN, orbit_radius::JUPITER);
        results.push_str(&format!(
            "    \"mean_motion_jupiter\": {:.15e},\n",
            n_jupiter
        ));

        // Individual anomaly conversions: true↔eccentric, eccentric→mean
        let conv_cases = [(1.0, 0.3), (2.5, 0.6), (0.5, 0.05), (3.0, 0.9)];
        results.push_str("    \"anomaly_conversions\": [\n");
        for (ci, &(nu_val, e_val)) in conv_cases.iter().enumerate() {
            let ecc = Eccentricity::elliptical(e_val).unwrap();
            let big_e = kepler::true_to_eccentric_anomaly(Radians(nu_val), ecc);
            let m_from_e = kepler::eccentric_to_mean_anomaly(big_e, ecc);
            let nu_back = kepler::eccentric_to_true_anomaly(big_e, ecc);
            let comma = if ci < conv_cases.len() - 1 { "," } else { "" };
            results.push_str(&format!(
                "      {{\"nu_in\": {:.15e}, \"e\": {:.15e}, \"E\": {:.15e}, \"M\": {:.15e}, \"nu_back\": {:.15e}}}{}\n",
                nu_val, e_val, big_e.value(), m_from_e.value(), nu_back.value(), comma
            ));
        }
        results.push_str("    ],\n");

        // Propagate mean anomaly
        let m0 = Radians(0.5);
        let n_test = kepler::mean_motion(mu::SUN, orbit_radius::EARTH);
        let dt_half_orbit =
            Seconds(orbits::orbital_period(mu::SUN, orbit_radius::EARTH).value() / 2.0);
        let m_half = kepler::propagate_mean_anomaly(m0, n_test, dt_half_orbit);
        results.push_str(&format!(
            "    \"propagate_m0_05_half_orbit\": {:.15e},\n",
            m_half.value()
        ));
        let dt_full = Seconds(orbits::orbital_period(mu::SUN, orbit_radius::EARTH).value());
        let m_full = kepler::propagate_mean_anomaly(m0, n_test, dt_full);
        results.push_str(&format!(
            "    \"propagate_m0_05_full_orbit\": {:.15e}\n",
            m_full.value()
        ));
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
        results.push_str("    },\n");

        // Heliocentric exit velocity
        let planet_vel = [0.0, 13.07, 0.0]; // Jupiter orbital velocity ~13.07 km/s
        let v_helio = flyby::heliocentric_exit_velocity(planet_vel, &fb);
        results.push_str("    \"heliocentric_exit\": {\n");
        results.push_str(&format!("      \"planet_vx\": {:.15e},\n", planet_vel[0]));
        results.push_str(&format!("      \"planet_vy\": {:.15e},\n", planet_vel[1]));
        results.push_str(&format!("      \"planet_vz\": {:.15e},\n", planet_vel[2]));
        results.push_str(&format!(
            "      \"v_inf_out_dir_x\": {:.15e},\n",
            fb.v_inf_out_dir[0]
        ));
        results.push_str(&format!(
            "      \"v_inf_out_dir_y\": {:.15e},\n",
            fb.v_inf_out_dir[1]
        ));
        results.push_str(&format!(
            "      \"v_inf_out_dir_z\": {:.15e},\n",
            fb.v_inf_out_dir[2]
        ));
        results.push_str(&format!("      \"helio_vx\": {:.15e},\n", v_helio[0]));
        results.push_str(&format!("      \"helio_vy\": {:.15e},\n", v_helio[1]));
        results.push_str(&format!("      \"helio_vz\": {:.15e}\n", v_helio[2]));
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
            "    \"leo_final_r\": {:.15e},\n",
            final_state.radius()
        ));

        // RK45 adaptive: 10 LEO orbits for energy drift comparison
        let config_rk45 = AdaptiveConfig {
            mu: mu::EARTH,
            thrust: ThrustProfile::None,
            rtol: 1e-10,
            atol: 1e-12,
            h_init: 10.0,
            h_min: 0.001,
            h_max: 60.0,
            max_steps: 100_000,
        };
        let duration_10 = 10.0 * period.value();
        let (final_rk45, n_eval_rk45) = propagate_adaptive_final(&state, &config_rk45, duration_10);
        let e_rk45 = final_rk45.specific_energy(mu::EARTH);
        results.push_str(&format!(
            "    \"rk45_10orbits_final_energy\": {:.15e},\n",
            e_rk45
        ));
        results.push_str(&format!(
            "    \"rk45_10orbits_energy_drift\": {:.15e},\n",
            (e_rk45 - e0).abs() / e0.abs()
        ));
        results.push_str(&format!(
            "    \"rk45_10orbits_final_r\": {:.15e},\n",
            final_rk45.radius()
        ));
        results.push_str(&format!(
            "    \"rk45_10orbits_final_x\": {:.15e},\n",
            final_rk45.pos.x.value()
        ));
        results.push_str(&format!(
            "    \"rk45_10orbits_final_y\": {:.15e},\n",
            final_rk45.pos.y.value()
        ));
        results.push_str(&format!("    \"rk45_10orbits_n_eval\": {},\n", n_eval_rk45));

        // RK45: eccentric orbit (e=0.5, a=10000 km)
        let a_ecc = 10000.0_f64;
        let e_ecc_val = 0.5_f64;
        // At periapsis: r = a*(1-e), v = sqrt(mu*(2/r - 1/a))
        let r_peri = a_ecc * (1.0 - e_ecc_val);
        let v_peri = (mu::EARTH.value() * (2.0 / r_peri - 1.0 / a_ecc)).sqrt();
        let state_ecc = PropState::new(
            Vec3::new(Km(r_peri), Km(0.0), Km(0.0)),
            Vec3::new(KmPerSec(0.0), KmPerSec(v_peri), KmPerSec(0.0)),
        );
        let period_ecc = orbits::orbital_period(mu::EARTH, Km(a_ecc));
        let e0_ecc = state_ecc.specific_energy(mu::EARTH);
        let (final_ecc, _) = propagate_adaptive_final(&state_ecc, &config_rk45, period_ecc.value());
        let ef_ecc = final_ecc.specific_energy(mu::EARTH);
        results.push_str(&format!("    \"rk45_ecc_init_r\": {:.15e},\n", r_peri));
        results.push_str(&format!("    \"rk45_ecc_init_v\": {:.15e},\n", v_peri));
        results.push_str(&format!("    \"rk45_ecc_init_energy\": {:.15e},\n", e0_ecc));
        results.push_str(&format!(
            "    \"rk45_ecc_final_energy\": {:.15e},\n",
            ef_ecc
        ));
        results.push_str(&format!(
            "    \"rk45_ecc_energy_drift\": {:.15e},\n",
            (ef_ecc - e0_ecc).abs() / e0_ecc.abs()
        ));
        results.push_str(&format!(
            "    \"rk45_ecc_final_x\": {:.15e},\n",
            final_ecc.pos.x.value()
        ));
        results.push_str(&format!(
            "    \"rk45_ecc_final_y\": {:.15e},\n",
            final_ecc.pos.y.value()
        ));
        results.push_str(&format!(
            "    \"rk45_ecc_final_r\": {:.15e}\n",
            final_ecc.radius()
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
        results.push_str("  },\n");

        // === Relativistic ===
        results.push_str("  \"relativistic\": {\n");
        // Lorentz factor at various velocities
        let gamma_001c = relativistic::lorentz_factor(KmPerSec(0.01 * relativistic::C_KM_S));
        let gamma_01c = relativistic::lorentz_factor(KmPerSec(0.1 * relativistic::C_KM_S));
        let gamma_05c = relativistic::lorentz_factor(KmPerSec(0.5 * relativistic::C_KM_S));
        results.push_str(&format!("    \"gamma_001c\": {:.15e},\n", gamma_001c));
        results.push_str(&format!("    \"gamma_01c\": {:.15e},\n", gamma_01c));
        results.push_str(&format!("    \"gamma_05c\": {:.15e},\n", gamma_05c));

        // Time dilation loss over 1 year at 1% c
        let loss_1yr = relativistic::time_dilation_loss(
            Seconds(365.25 * 86400.0),
            KmPerSec(0.01 * relativistic::C_KM_S),
        );
        results.push_str(&format!(
            "    \"time_loss_1yr_001c\": {:.15e},\n",
            loss_1yr.value()
        ));

        // KE correction factor at 2.5% c
        let ke_025c =
            relativistic::kinetic_energy_correction_factor(KmPerSec(0.025 * relativistic::C_KM_S));
        results.push_str(&format!("    \"ke_correction_025c\": {:.15e},\n", ke_025c));

        // Classical vs relativistic delta-V
        let ve_fusion = KmPerSec(9806.65); // Isp 10^6 s
        let mr_10 = 10.0_f64;
        let dv_classical = relativistic::classical_delta_v(ve_fusion, mr_10);
        let dv_relativ = relativistic::relativistic_delta_v(ve_fusion, mr_10);
        results.push_str(&format!(
            "    \"dv_classical_ve9807_mr10\": {:.15e},\n",
            dv_classical.value()
        ));
        results.push_str(&format!(
            "    \"dv_relativistic_ve9807_mr10\": {:.15e},\n",
            dv_relativ.value()
        ));
        let correction = relativistic::delta_v_correction_fraction(ve_fusion, mr_10);
        results.push_str(&format!(
            "    \"dv_correction_fraction\": {:.15e},\n",
            correction
        ));

        // Brachistochrone proper time (Mars-Jupiter EP01)
        let d_mj = Km(550_630_800.0);
        let a_ep01 = 0.032_783; // km/s²
        let (t_coord, t_proper) = relativistic::brachistochrone_times(d_mj, a_ep01);
        results.push_str(&format!(
            "    \"brach_t_coord_ep01\": {:.15e},\n",
            t_coord.value()
        ));
        results.push_str(&format!(
            "    \"brach_t_proper_ep01\": {:.15e},\n",
            t_proper.value()
        ));

        // Peak velocity
        let v_peak = relativistic::brachistochrone_peak_velocity(d_mj, a_ep01);
        results.push_str(&format!(
            "    \"brach_v_peak_ep01\": {:.15e},\n",
            v_peak.value()
        ));

        // Effects summary at 7600 km/s
        let (gamma_7600, beta_7600, td_ppm_7600, ke_ppm_7600) =
            relativistic::effects_summary(KmPerSec(7600.0));
        results.push_str(&format!("    \"gamma_7600\": {:.15e},\n", gamma_7600));
        results.push_str(&format!("    \"beta_7600\": {:.15e},\n", beta_7600));
        results.push_str(&format!("    \"td_ppm_7600\": {:.15e},\n", td_ppm_7600));
        results.push_str(&format!("    \"ke_ppm_7600\": {:.15e}\n", ke_ppm_7600));
        results.push_str("  },\n");

        // === Attitude ===
        results.push_str("  \"attitude\": {\n");
        // Miss distance: 20 m/s², 1 hour, 0.001 rad
        let miss_1 = attitude::miss_distance_km(20.0, 3600.0, 0.001);
        results.push_str(&format!("    \"miss_20_3600_0001\": {:.15e},\n", miss_1));

        // Required pointing for 10 km miss
        let theta_10km = attitude::required_pointing_rad(20.0, 3600.0, 10.0);
        results.push_str(&format!(
            "    \"req_pointing_20_3600_10km\": {:.15e},\n",
            theta_10km
        ));

        // Flip angular rate: 60s flip
        let flip_rate = attitude::flip_angular_rate(60.0);
        results.push_str(&format!("    \"flip_rate_60s\": {:.15e},\n", flip_rate));

        // Flip angular momentum: 300t, 5m radius, 0.05 rad/s
        let flip_h = attitude::flip_angular_momentum(300_000.0, 5.0, 0.05);
        results.push_str(&format!("    \"flip_h_300t_5m\": {:.15e},\n", flip_h));

        // Flip RCS torque: 300t, 5m, 60s flip, 10s ramp
        let flip_torque = attitude::flip_rcs_torque(300_000.0, 5.0, 60.0, 10.0);
        results.push_str(&format!(
            "    \"flip_torque_300t_5m_60s_10s\": {:.15e},\n",
            flip_torque
        ));

        // Velocity error from pointing: 20 m/s², 3600s, 0.001 rad
        let v_err = attitude::velocity_error_from_pointing(20.0, 3600.0, 0.001);
        results.push_str(&format!("    \"v_error_20_3600_0001\": {:.15e},\n", v_err));

        // Accuracy to pointing error: 99.8%
        let theta_998 = attitude::accuracy_to_pointing_error_rad(0.998);
        results.push_str(&format!(
            "    \"pointing_from_998_accuracy\": {:.15e},\n",
            theta_998
        ));

        // Gravity gradient torque: Earth GM, 7000 km, 300t, 100m, 45°
        let gg_torque = attitude::gravity_gradient_torque(
            3.986e14,
            7_000_000.0,
            300_000.0,
            100.0,
            std::f64::consts::FRAC_PI_4,
        );
        results.push_str(&format!(
            "    \"gg_torque_earth_7000km\": {:.15e}\n",
            gg_torque
        ));
        results.push_str("  },\n");

        // === Plasmoid ===
        results.push_str("  \"plasmoid\": {\n");
        // Magnetic pressure at 50 μT (Earth surface)
        let p_mag_earth = plasmoid::magnetic_pressure_pa(50e-6);
        results.push_str(&format!("    \"p_mag_50uT\": {:.15e},\n", p_mag_earth));

        // Magnetic pressure at 10 nT
        let p_mag_10nt = plasmoid::magnetic_pressure_pa(10e-9);
        results.push_str(&format!("    \"p_mag_10nT\": {:.15e},\n", p_mag_10nt));

        // Ram pressure: solar wind conditions
        let rho_sw = plasmoid::number_density_to_mass(5.0e6);
        let p_ram_sw = plasmoid::ram_pressure_pa(rho_sw, 400_000.0);
        results.push_str(&format!("    \"rho_5e6\": {:.15e},\n", rho_sw));
        results.push_str(&format!("    \"p_ram_sw\": {:.15e},\n", p_ram_sw));

        // Full EP04 nominal scenario
        let ep04_nom = plasmoid::plasmoid_perturbation(
            2.0e-9,
            0.05e6,
            150_000.0,
            7854.0,
            480.0,
            48_000_000.0,
            34_920.0,
        );
        results.push_str(&format!(
            "    \"ep04_nom_p_mag\": {:.15e},\n",
            ep04_nom.magnetic_pressure_pa
        ));
        results.push_str(&format!(
            "    \"ep04_nom_p_ram\": {:.15e},\n",
            ep04_nom.ram_pressure_pa
        ));
        results.push_str(&format!(
            "    \"ep04_nom_force\": {:.15e},\n",
            ep04_nom.force_n
        ));
        results.push_str(&format!(
            "    \"ep04_nom_dv\": {:.15e},\n",
            ep04_nom.velocity_perturbation_m_s
        ));
        results.push_str(&format!(
            "    \"ep04_nom_miss\": {:.15e},\n",
            ep04_nom.miss_distance_km
        ));

        // EP04 extreme scenario
        let ep04_ext = plasmoid::plasmoid_perturbation(
            50.0e-9,
            5.0e6,
            500_000.0,
            7854.0,
            480.0,
            48_000_000.0,
            34_920.0,
        );
        results.push_str(&format!(
            "    \"ep04_ext_force\": {:.15e},\n",
            ep04_ext.force_n
        ));
        results.push_str(&format!(
            "    \"ep04_ext_dv\": {:.15e},\n",
            ep04_ext.velocity_perturbation_m_s
        ));
        results.push_str(&format!(
            "    \"ep04_ext_miss\": {:.15e}\n",
            ep04_ext.miss_distance_km
        ));
        results.push_str("  },\n");

        // === Communications ===
        results.push_str("  \"comms\": {\n");
        let au_km = 149_597_870.7_f64;

        // Light time at 1 AU
        let lt_1au = comms::light_time_seconds(Km(au_km));
        results.push_str(&format!("    \"lt_1au_s\": {:.15e},\n", lt_1au));

        // Light time in minutes at 1 AU
        let lt_1au_min = comms::light_time_minutes(Km(au_km));
        results.push_str(&format!("    \"lt_1au_min\": {:.15e},\n", lt_1au_min));

        // Round-trip at 1 AU
        let rt_1au = comms::round_trip_light_time(Km(au_km));
        results.push_str(&format!("    \"rt_1au_s\": {:.15e},\n", rt_1au));

        // Light time at 5.2 AU (Jupiter distance)
        let lt_jupiter = comms::light_time_seconds(Km(5.2 * au_km));
        results.push_str(&format!("    \"lt_52au_s\": {:.15e},\n", lt_jupiter));

        // Light time at 0 km
        let lt_zero = comms::light_time_seconds(Km(0.0));
        results.push_str(&format!("    \"lt_zero\": {:.15e},\n", lt_zero));

        // Free-space path loss: X-band (8.4 GHz) at 1 AU
        let fspl_xband_1au = comms::free_space_path_loss_db(au_km, 8.4e9);
        results.push_str(&format!(
            "    \"fspl_xband_1au\": {:.15e},\n",
            fspl_xband_1au
        ));

        // FSPL at 5 AU
        let fspl_xband_5au = comms::free_space_path_loss_db(5.0 * au_km, 8.4e9);
        results.push_str(&format!(
            "    \"fspl_xband_5au\": {:.15e},\n",
            fspl_xband_5au
        ));

        // FSPL optical (1550 nm = 193.4 THz) at 1 AU
        let fspl_optical_1au = comms::free_space_path_loss_db(au_km, 193.4e12);
        results.push_str(&format!(
            "    \"fspl_optical_1au\": {:.15e},\n",
            fspl_optical_1au
        ));

        // Speed of light constant
        results.push_str(&format!("    \"c_km_s\": {:.15e},\n", comms::C_KM_S));

        // Planet light delay at J2000 (end-to-end ephemeris+comms)
        let j2000_jd = 2_451_545.0_f64;
        let pld_em =
            comms::planet_light_delay(ephemeris::Planet::Earth, ephemeris::Planet::Mars, j2000_jd);
        results.push_str(&format!(
            "    \"planet_delay_earth_mars_j2000_s\": {:.15e},\n",
            pld_em
        ));
        let pld_ej = comms::planet_light_delay(
            ephemeris::Planet::Earth,
            ephemeris::Planet::Jupiter,
            j2000_jd,
        );
        results.push_str(&format!(
            "    \"planet_delay_earth_jupiter_j2000_s\": {:.15e},\n",
            pld_ej
        ));

        // Distance between positions (using known planet positions at J2000)
        let earth_pos_j2000 = ephemeris::planet_position(ephemeris::Planet::Earth, j2000_jd);
        let mars_pos_j2000 = ephemeris::planet_position(ephemeris::Planet::Mars, j2000_jd);
        let jupiter_pos_j2000 = ephemeris::planet_position(ephemeris::Planet::Jupiter, j2000_jd);
        let dist_em = comms::distance_between_positions(&earth_pos_j2000, &mars_pos_j2000);
        results.push_str(&format!(
            "    \"dist_earth_mars_j2000_km\": {:.15e},\n",
            dist_em.value()
        ));
        let dist_ej = comms::distance_between_positions(&earth_pos_j2000, &jupiter_pos_j2000);
        results.push_str(&format!(
            "    \"dist_earth_jupiter_j2000_km\": {:.15e}\n",
            dist_ej.value()
        ));
        results.push_str("  },\n");

        // === Mass Timeline (Tsiolkovsky) ===
        results.push_str("  \"mass_timeline\": {\n");

        // propellant_consumed: m * (1 - exp(-dv/ve)), ve = isp * g0
        // Test case 1: Kestrel-like parameters (300t, 5 km/s, Isp 1e6 s)
        let pc1 = mass_timeline::propellant_consumed(300_000.0, 5.0, 1_000_000.0);
        results.push_str(&format!(
            "    \"propellant_consumed_300t_5kms_1e6s\": {:.15e},\n",
            pc1
        ));

        // Test case 2: conventional rocket (10000 kg, 3 km/s, Isp 300 s)
        let pc2 = mass_timeline::propellant_consumed(10_000.0, 3.0, 300.0);
        results.push_str(&format!(
            "    \"propellant_consumed_10t_3kms_300s\": {:.15e},\n",
            pc2
        ));

        // Test case 3: high dv (1000 kg, 10 km/s, Isp 3000 s)
        let pc3 = mass_timeline::propellant_consumed(1_000.0, 10.0, 3000.0);
        results.push_str(&format!(
            "    \"propellant_consumed_1t_10kms_3000s\": {:.15e},\n",
            pc3
        ));

        // post_burn_mass
        let pbm1 = mass_timeline::post_burn_mass(300_000.0, 5.0, 1_000_000.0);
        results.push_str(&format!(
            "    \"post_burn_mass_300t_5kms_1e6s\": {:.15e},\n",
            pbm1
        ));

        let pbm2 = mass_timeline::post_burn_mass(10_000.0, 3.0, 300.0);
        results.push_str(&format!(
            "    \"post_burn_mass_10t_3kms_300s\": {:.15e},\n",
            pbm2
        ));

        // G0 constant used in exhaust velocity calculation
        results.push_str(&format!("    \"g0_m_s2\": {:.15e},\n", G0_M_S2));

        // compute_timeline: simple 2-burn scenario
        let events = vec![
            mass_timeline::MassEvent {
                time_h: 0.0,
                kind: mass_timeline::MassEventKind::FuelBurn {
                    delta_v_km_s: 5.0,
                    isp_s: 1_000_000.0,
                    burn_duration_h: 1.0,
                },
                episode: 1,
                label: "burn1".to_string(),
            },
            mass_timeline::MassEvent {
                time_h: 72.0,
                kind: mass_timeline::MassEventKind::ContainerJettison { mass_kg: 50_000.0 },
                episode: 1,
                label: "jettison".to_string(),
            },
            mass_timeline::MassEvent {
                time_h: 72.0,
                kind: mass_timeline::MassEventKind::FuelBurn {
                    delta_v_km_s: 3.0,
                    isp_s: 1_000_000.0,
                    burn_duration_h: 0.5,
                },
                episode: 1,
                label: "burn2".to_string(),
            },
        ];
        let timeline = mass_timeline::compute_timeline("test", 300_000.0, 200_000.0, &events);
        let final_snap = mass_timeline::final_mass(&timeline).unwrap();
        let total_consumed = mass_timeline::total_propellant_consumed(&timeline);
        let margin = mass_timeline::propellant_margin(&timeline);

        results.push_str(&format!(
            "    \"timeline_final_total_kg\": {:.15e},\n",
            final_snap.total_mass_kg
        ));
        results.push_str(&format!(
            "    \"timeline_final_dry_kg\": {:.15e},\n",
            final_snap.dry_mass_kg
        ));
        results.push_str(&format!(
            "    \"timeline_final_propellant_kg\": {:.15e},\n",
            final_snap.propellant_kg
        ));
        results.push_str(&format!(
            "    \"timeline_total_consumed_kg\": {:.15e},\n",
            total_consumed
        ));
        results.push_str(&format!(
            "    \"timeline_propellant_margin\": {:.15e}\n",
            margin
        ));
        results.push_str("  },\n");

        // === Orbital 3D Geometry ===
        results.push_str("  \"orbital_3d\": {\n");

        // Constants
        results.push_str(&format!(
            "    \"saturn_obliquity_rad\": {:.15e},\n",
            orbital_3d::SATURN_OBLIQUITY_RAD
        ));
        results.push_str(&format!(
            "    \"uranus_obliquity_rad\": {:.15e},\n",
            orbital_3d::URANUS_OBLIQUITY_RAD
        ));
        results.push_str(&format!(
            "    \"saturn_ring_inner_km\": {:.15e},\n",
            orbital_3d::SATURN_RING_INNER_KM
        ));
        results.push_str(&format!(
            "    \"saturn_ring_outer_km\": {:.15e},\n",
            orbital_3d::SATURN_RING_OUTER_KM
        ));
        results.push_str(&format!(
            "    \"enceladus_orbital_radius_km\": {:.15e},\n",
            orbital_3d::ENCELADUS_ORBITAL_RADIUS_KM
        ));

        // Saturn ring plane normal at J2000 (RA/Dec → ecliptic conversion)
        let j2000 = 2_451_545.0_f64;
        let saturn_normal = orbital_3d::saturn_ring_plane_normal(j2000);
        results.push_str(&format!(
            "    \"saturn_normal_x\": {:.15e},\n",
            saturn_normal.x
        ));
        results.push_str(&format!(
            "    \"saturn_normal_y\": {:.15e},\n",
            saturn_normal.y
        ));
        results.push_str(&format!(
            "    \"saturn_normal_z\": {:.15e},\n",
            saturn_normal.z
        ));

        // Uranus spin axis in ecliptic (RA/Dec → ecliptic conversion)
        let uranus_axis = orbital_3d::uranus_spin_axis_ecliptic();
        results.push_str(&format!("    \"uranus_axis_x\": {:.15e},\n", uranus_axis.x));
        results.push_str(&format!("    \"uranus_axis_y\": {:.15e},\n", uranus_axis.y));
        results.push_str(&format!("    \"uranus_axis_z\": {:.15e}\n", uranus_axis.z));
        results.push_str("  },\n");

        // === Ephemeris ===
        results.push_str("  \"ephemeris\": {\n");

        // Calendar ↔ JD conversion
        // J2000.0: 2000-01-01 12:00:00 TT = JD 2451545.0
        let jd_j2000 = ephemeris::calendar_to_jd(2000, 1, 1.5);
        results.push_str(&format!("    \"jd_j2000\": {:.15e},\n", jd_j2000));

        // Sputnik: 1957-10-04 = JD 2436115.5
        let jd_sputnik = ephemeris::calendar_to_jd(1957, 10, 4.0);
        results.push_str(&format!("    \"jd_sputnik\": {:.15e},\n", jd_sputnik));

        // Moon landing: 1969-07-20 = JD 2440423.5
        let jd_moon = ephemeris::calendar_to_jd(1969, 7, 20.0);
        results.push_str(&format!("    \"jd_moon_landing\": {:.15e},\n", jd_moon));

        // JD→calendar round-trip: J2000
        let (y_rt, m_rt, d_rt) = ephemeris::jd_to_calendar(2_451_545.0);
        results.push_str(&format!("    \"rt_j2000_year\": {},\n", y_rt));
        results.push_str(&format!("    \"rt_j2000_month\": {},\n", m_rt));
        results.push_str(&format!("    \"rt_j2000_day\": {:.15e},\n", d_rt));

        // Planet positions at J2000 (heliocentric ecliptic)
        let au_km = 149_597_870.7_f64;

        // Earth at J2000
        let earth_j2000 = ephemeris::planet_position(ephemeris::Planet::Earth, j2000);
        results.push_str(&format!(
            "    \"earth_j2000_lon_rad\": {:.15e},\n",
            earth_j2000.longitude.value()
        ));
        results.push_str(&format!(
            "    \"earth_j2000_dist_au\": {:.15e},\n",
            earth_j2000.distance.value() / au_km
        ));
        results.push_str(&format!(
            "    \"earth_j2000_x_km\": {:.15e},\n",
            earth_j2000.x
        ));
        results.push_str(&format!(
            "    \"earth_j2000_y_km\": {:.15e},\n",
            earth_j2000.y
        ));
        results.push_str(&format!(
            "    \"earth_j2000_z_km\": {:.15e},\n",
            earth_j2000.z
        ));

        // Mars at J2000
        let mars_j2000 = ephemeris::planet_position(ephemeris::Planet::Mars, j2000);
        results.push_str(&format!(
            "    \"mars_j2000_lon_rad\": {:.15e},\n",
            mars_j2000.longitude.value()
        ));
        results.push_str(&format!(
            "    \"mars_j2000_dist_au\": {:.15e},\n",
            mars_j2000.distance.value() / au_km
        ));

        // Jupiter at J2000
        let jupiter_j2000 = ephemeris::planet_position(ephemeris::Planet::Jupiter, j2000);
        results.push_str(&format!(
            "    \"jupiter_j2000_lon_rad\": {:.15e},\n",
            jupiter_j2000.longitude.value()
        ));
        results.push_str(&format!(
            "    \"jupiter_j2000_dist_au\": {:.15e},\n",
            jupiter_j2000.distance.value() / au_km
        ));

        // Saturn at J2000
        let saturn_j2000 = ephemeris::planet_position(ephemeris::Planet::Saturn, j2000);
        results.push_str(&format!(
            "    \"saturn_j2000_lon_rad\": {:.15e},\n",
            saturn_j2000.longitude.value()
        ));
        results.push_str(&format!(
            "    \"saturn_j2000_dist_au\": {:.15e},\n",
            saturn_j2000.distance.value() / au_km
        ));

        // Synodic periods (seconds)
        let syn_earth_mars =
            ephemeris::synodic_period(ephemeris::Planet::Earth, ephemeris::Planet::Mars);
        results.push_str(&format!(
            "    \"synodic_earth_mars_days\": {:.15e},\n",
            syn_earth_mars.value() / 86400.0
        ));

        let syn_earth_jupiter =
            ephemeris::synodic_period(ephemeris::Planet::Earth, ephemeris::Planet::Jupiter);
        results.push_str(&format!(
            "    \"synodic_earth_jupiter_days\": {:.15e},\n",
            syn_earth_jupiter.value() / 86400.0
        ));

        // Hohmann phase angles (radians)
        let phase_em =
            ephemeris::hohmann_phase_angle(ephemeris::Planet::Earth, ephemeris::Planet::Mars);
        results.push_str(&format!(
            "    \"hohmann_phase_earth_mars_rad\": {:.15e},\n",
            phase_em.value()
        ));

        let phase_ej =
            ephemeris::hohmann_phase_angle(ephemeris::Planet::Earth, ephemeris::Planet::Jupiter);
        results.push_str(&format!(
            "    \"hohmann_phase_earth_jupiter_rad\": {:.15e},\n",
            phase_ej.value()
        ));

        // Hohmann transfer times (seconds → days)
        let time_em =
            ephemeris::hohmann_transfer_time(ephemeris::Planet::Earth, ephemeris::Planet::Mars);
        results.push_str(&format!(
            "    \"hohmann_time_earth_mars_days\": {:.15e},\n",
            time_em.value() / 86400.0
        ));

        let time_ej =
            ephemeris::hohmann_transfer_time(ephemeris::Planet::Earth, ephemeris::Planet::Jupiter);
        results.push_str(&format!(
            "    \"hohmann_time_earth_jupiter_days\": {:.15e},\n",
            time_ej.value() / 86400.0
        ));

        // Phase angles at J2000
        let pa_em =
            ephemeris::phase_angle(ephemeris::Planet::Earth, ephemeris::Planet::Mars, j2000);
        results.push_str(&format!(
            "    \"phase_angle_earth_mars_j2000_rad\": {:.15e},\n",
            pa_em.value()
        ));

        let pa_ej =
            ephemeris::phase_angle(ephemeris::Planet::Earth, ephemeris::Planet::Jupiter, j2000);
        results.push_str(&format!(
            "    \"phase_angle_earth_jupiter_j2000_rad\": {:.15e},\n",
            pa_ej.value()
        ));

        // Next Hohmann window from J2000
        let window_em = ephemeris::next_hohmann_window(
            ephemeris::Planet::Earth,
            ephemeris::Planet::Mars,
            j2000,
        );
        results.push_str(&format!(
            "    \"next_window_earth_mars_jd\": {:.15e},\n",
            window_em.unwrap()
        ));

        let window_ej = ephemeris::next_hohmann_window(
            ephemeris::Planet::Earth,
            ephemeris::Planet::Jupiter,
            j2000,
        );
        results.push_str(&format!(
            "    \"next_window_earth_jupiter_jd\": {:.15e}\n",
            window_ej.unwrap()
        ));

        results.push_str("  }\n");

        results.push_str("}\n");

        println!("{}", results);
    }
}
