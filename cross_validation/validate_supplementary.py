#!/usr/bin/env python3
"""
Cross-validation of supplementary Rust modules (relativistic, attitude, plasmoid,
comms, mass_timeline) against independent Python implementations.

These modules handle physics calculations used in the SOLAR LINE analysis
beyond core orbital mechanics (which is validated in validate.py).

Usage: python3 cross_validation/validate_supplementary.py [--json rust_values.json]
"""

import json
import math
import sys
from pathlib import Path

# ═══════════════════════════════════════════════════════════════════════
# Constants
# ═══════════════════════════════════════════════════════════════════════

C_KM_S = 299_792.458  # Speed of light in km/s (exact, SI definition)
MU_0 = 1.256_637_062e-6  # Permeability of free space (H/m)
PROTON_MASS_KG = 1.672_621_924e-27  # Proton mass (kg)


# ═══════════════════════════════════════════════════════════════════════
# Relativistic — independent implementations
# ═══════════════════════════════════════════════════════════════════════

def lorentz_factor(v_km_s: float) -> float:
    """Compute Lorentz factor γ = 1/√(1 - β²)."""
    beta = v_km_s / C_KM_S
    return 1.0 / math.sqrt(1.0 - beta * beta)


def time_dilation_loss(coordinate_time_s: float, v_km_s: float) -> float:
    """Time dilation loss = coordinate_time - proper_time."""
    gamma = lorentz_factor(v_km_s)
    proper_time = coordinate_time_s / gamma
    return coordinate_time_s - proper_time


def kinetic_energy_correction_factor(v_km_s: float) -> float:
    """Ratio of relativistic KE to classical KE: (γ-1)c² / (½v²)."""
    if abs(v_km_s) < 1e-15:
        return 1.0
    gamma = lorentz_factor(v_km_s)
    rel_ke = (gamma - 1.0) * C_KM_S * C_KM_S
    class_ke = 0.5 * v_km_s * v_km_s
    return rel_ke / class_ke


def classical_delta_v(ve_km_s: float, mass_ratio: float) -> float:
    """Classical Tsiolkovsky: Δv = ve × ln(m0/mf)."""
    return ve_km_s * math.log(mass_ratio)


def relativistic_delta_v(ve_km_s: float, mass_ratio: float) -> float:
    """Ackeret relativistic rocket equation: v = c × tanh(ve/c × ln(m0/mf))."""
    x = ve_km_s / C_KM_S * math.log(mass_ratio)
    return C_KM_S * math.tanh(x)


def delta_v_correction_fraction(ve_km_s: float, mass_ratio: float) -> float:
    """(classical - relativistic) / classical."""
    cl = classical_delta_v(ve_km_s, mass_ratio)
    rel = relativistic_delta_v(ve_km_s, mass_ratio)
    if abs(cl) < 1e-15:
        return 0.0
    return (cl - rel) / cl


def brachistochrone_times(distance_km: float, accel_km_s2: float):
    """Relativistic brachistochrone: (coordinate_time, proper_time) in seconds."""
    d = distance_km
    a = accel_km_s2
    c = C_KM_S

    d_half = d / 2.0
    x = d_half * a / (c * c) + 1.0
    t_half = (c / a) * math.sqrt(x * x - 1.0)
    t_total = 2.0 * t_half

    tau_half = (c / a) * math.asinh(a * t_half / c)
    tau_total = 2.0 * tau_half

    return t_total, tau_total


def brachistochrone_peak_velocity(distance_km: float, accel_km_s2: float) -> float:
    """Relativistic peak velocity at brachistochrone midpoint."""
    d = distance_km
    a = accel_km_s2
    c = C_KM_S

    d_half = d / 2.0
    x = d_half * a / (c * c) + 1.0
    t_half = (c / a) * math.sqrt(x * x - 1.0)

    at_over_c = a * t_half / c
    return c * at_over_c / math.sqrt(1.0 + at_over_c * at_over_c)


def effects_summary(v_km_s: float):
    """Returns (gamma, beta, time_dilation_ppm, ke_correction_ppm)."""
    b = v_km_s / C_KM_S
    g = lorentz_factor(v_km_s)
    td_fraction = 1.0 - 1.0 / g
    td_ppm = td_fraction * 1e6
    ke_factor = kinetic_energy_correction_factor(v_km_s)
    ke_ppm = (ke_factor - 1.0) * 1e6
    return g, b, td_ppm, ke_ppm


# ═══════════════════════════════════════════════════════════════════════
# Attitude — independent implementations
# ═══════════════════════════════════════════════════════════════════════

def miss_distance_km(accel_m_s2: float, burn_time_s: float, pointing_error_rad: float) -> float:
    """Lateral displacement from pointing error: 0.5 * a * t² * sin(θ), in km."""
    lateral_accel = accel_m_s2 * math.sin(pointing_error_rad)
    miss_m = 0.5 * lateral_accel * burn_time_s * burn_time_s
    return miss_m / 1000.0


def required_pointing_rad(accel_m_s2: float, burn_time_s: float, max_miss_km: float) -> float:
    """Inverse: arcsin(2 * miss_km * 1000 / (a * t²))."""
    sin_theta = 2.0 * max_miss_km * 1000.0 / (accel_m_s2 * burn_time_s * burn_time_s)
    if abs(sin_theta) > 1.0:
        return math.pi / 2.0
    return math.asin(sin_theta)


def flip_angular_rate(flip_duration_s: float) -> float:
    """Angular rate for 180° flip: π / t."""
    return math.pi / flip_duration_s


def flip_angular_momentum(mass_kg: float, radius_m: float, angular_rate: float) -> float:
    """Angular momentum: I * ω, where I = 0.5 * m * r² (cylinder)."""
    moi = 0.5 * mass_kg * radius_m * radius_m
    return moi * angular_rate


def flip_rcs_torque(mass_kg: float, radius_m: float, flip_duration_s: float, ramp_time_s: float) -> float:
    """RCS torque for trapezoidal angular velocity profile."""
    moi = 0.5 * mass_kg * radius_m * radius_m
    coast_duration = flip_duration_s - 2.0 * ramp_time_s
    if coast_duration <= 0.0:
        omega_peak = 2.0 * math.pi / flip_duration_s
        angular_accel = omega_peak / (flip_duration_s / 2.0)
        return moi * angular_accel
    omega_peak = math.pi / (coast_duration + ramp_time_s)
    angular_accel = omega_peak / ramp_time_s
    return moi * angular_accel


def velocity_error_from_pointing(accel_m_s2: float, burn_time_s: float, pointing_error_rad: float) -> float:
    """Velocity error: a * t * sin(θ), in km/s."""
    return accel_m_s2 * burn_time_s * math.sin(pointing_error_rad) / 1000.0


def accuracy_to_pointing_error_rad(accuracy_fraction: float) -> float:
    """Convert accuracy fraction to pointing error: arccos(accuracy)."""
    return math.acos(accuracy_fraction)


def gravity_gradient_torque(gm_m3_s2: float, distance_m: float, mass_kg: float,
                            length_m: float, angle_rad: float) -> float:
    """Gravity gradient torque: 3μ(Izz-Ixx)sin(2θ)/(2r³), Izz-Ixx = mL²/12."""
    delta_i = mass_kg * length_m * length_m / 12.0
    r3 = distance_m ** 3
    return 3.0 * gm_m3_s2 * delta_i * math.sin(2.0 * angle_rad) / (2.0 * r3)


# ═══════════════════════════════════════════════════════════════════════
# Plasmoid — independent implementations
# ═══════════════════════════════════════════════════════════════════════

def magnetic_pressure_pa(b_tesla: float) -> float:
    """Magnetic pressure: B²/(2μ₀)."""
    return b_tesla * b_tesla / (2.0 * MU_0)


def ram_pressure_pa(density_kg_m3: float, velocity_m_s: float) -> float:
    """Ram pressure: ½ρv²."""
    return 0.5 * density_kg_m3 * velocity_m_s * velocity_m_s


def number_density_to_mass(n_per_m3: float) -> float:
    """Convert number density to mass density (hydrogen plasma)."""
    return n_per_m3 * PROTON_MASS_KG


def plasmoid_perturbation(b_tesla, n_per_m3, v_m_s, cross_section_m2,
                          transit_s, ship_mass_kg, remaining_s):
    """Full perturbation analysis. Returns dict."""
    p_mag = magnetic_pressure_pa(b_tesla)
    rho = number_density_to_mass(n_per_m3)
    p_ram = ram_pressure_pa(rho, v_m_s)
    total_p = p_mag + p_ram
    force = total_p * cross_section_m2
    dv = force * transit_s / ship_mass_kg
    miss_km = dv * remaining_s / 1000.0
    return {
        "p_mag": p_mag, "p_ram": p_ram, "force": force,
        "dv": dv, "miss_km": miss_km,
    }


# ═══════════════════════════════════════════════════════════════════════
# Mass Timeline (Tsiolkovsky) — independent implementations
# ═══════════════════════════════════════════════════════════════════════

G0_M_S2 = 9.80665  # Standard gravitational acceleration (m/s²)


def exhaust_velocity_km_s(isp_s: float) -> float:
    """Exhaust velocity: ve = Isp × g₀ (converted to km/s)."""
    return isp_s * G0_M_S2 / 1000.0


def tsiolkovsky_mass_ratio(dv_km_s: float, ve_km_s: float) -> float:
    """Mass ratio: m₀/m_f = exp(ΔV / vₑ)."""
    return math.exp(dv_km_s / ve_km_s)


def propellant_consumed(mass_kg: float, dv_km_s: float, isp_s: float) -> float:
    """Propellant consumed: m × (1 - 1/mass_ratio)."""
    ve = exhaust_velocity_km_s(isp_s)
    mr = tsiolkovsky_mass_ratio(dv_km_s, ve)
    return mass_kg * (1.0 - 1.0 / mr)


def post_burn_mass(mass_kg: float, dv_km_s: float, isp_s: float) -> float:
    """Mass after burn."""
    return mass_kg - propellant_consumed(mass_kg, dv_km_s, isp_s)


def compute_test_timeline(
    initial_total: float, initial_dry: float
) -> dict:
    """Reproduce the exact 2-burn + jettison scenario from Rust export.

    Events:
      1. FuelBurn at t=0h: ΔV=5 km/s, Isp=1e6 s, duration=1h
      2. ContainerJettison at t=72h: 50,000 kg
      3. FuelBurn at t=72h: ΔV=3 km/s, Isp=1e6 s, duration=0.5h
    """
    propellant = initial_total - initial_dry
    dry = initial_dry

    # Event 1: Fuel burn
    total = dry + propellant
    consumed1 = propellant_consumed(total, 5.0, 1_000_000.0)
    consumed1 = min(consumed1, propellant)
    propellant -= consumed1

    # Event 2: Container jettison
    dry -= 50_000.0

    # Event 3: Fuel burn
    total = dry + propellant
    consumed2 = propellant_consumed(total, 3.0, 1_000_000.0)
    consumed2 = min(consumed2, propellant)
    propellant -= consumed2

    total = dry + propellant
    initial_prop = initial_total - initial_dry
    total_consumed = consumed1 + consumed2
    margin = propellant / initial_prop

    return {
        "final_total_kg": total,
        "final_dry_kg": dry,
        "final_propellant_kg": propellant,
        "total_consumed_kg": total_consumed,
        "margin": margin,
    }


# ═══════════════════════════════════════════════════════════════════════
# Orbital 3D Geometry — independent implementations
# ═══════════════════════════════════════════════════════════════════════

def ra_dec_to_ecliptic(ra_deg: float, dec_deg: float, eps_deg: float = 23.4393):
    """Convert RA/Dec (equatorial) to ecliptic unit vector.

    This is the IAU J2000 pole direction conversion used in orbital_3d.rs
    for both Saturn's ring plane normal and Uranus's spin axis.
    """
    ra = math.radians(ra_deg)
    dec = math.radians(dec_deg)
    eps = math.radians(eps_deg)

    # Equatorial unit vector
    eq_x = math.cos(dec) * math.cos(ra)
    eq_y = math.cos(dec) * math.sin(ra)
    eq_z = math.sin(dec)

    # Rotate to ecliptic (around x-axis by -ε)
    ecl_x = eq_x
    ecl_y = eq_y * math.cos(eps) + eq_z * math.sin(eps)
    ecl_z = -eq_y * math.sin(eps) + eq_z * math.cos(eps)

    # Normalize
    mag = math.sqrt(ecl_x**2 + ecl_y**2 + ecl_z**2)
    return (ecl_x / mag, ecl_y / mag, ecl_z / mag)


# ═══════════════════════════════════════════════════════════════════════
# Validation harness
# ═══════════════════════════════════════════════════════════════════════

passed = 0
failed = 0


def check(name: str, rust_val: float, python_val: float, rel_tol: float = 1e-10, abs_tol: float = 1e-15):
    """Compare Rust and Python values with tolerance."""
    global passed, failed
    if abs(rust_val) < abs_tol and abs(python_val) < abs_tol:
        print(f"  ✓ {name}: both ≈ 0")
        passed += 1
        return
    if abs(rust_val) < abs_tol:
        diff = abs(python_val)
    else:
        diff = abs(rust_val - python_val) / max(abs(rust_val), abs_tol)
    if diff < rel_tol:
        print(f"  ✓ {name}: {rust_val:.6e} (rel diff: {diff:.2e})")
        passed += 1
    else:
        print(f"  ✗ {name}: Rust={rust_val:.6e}, Python={python_val:.6e}, rel diff={diff:.2e}")
        failed += 1


def main():
    global passed, failed

    json_path = Path("cross_validation/rust_values.json")
    if "--json" in sys.argv:
        idx = sys.argv.index("--json")
        json_path = Path(sys.argv[idx + 1])

    with open(json_path) as f:
        rust = json.load(f)

    # ── Relativistic ──────────────────────────────────────────────
    print("\n═══ Relativistic module cross-validation ═══")
    r = rust["relativistic"]

    check("γ at 0.01c", r["gamma_001c"], lorentz_factor(0.01 * C_KM_S))
    check("γ at 0.1c", r["gamma_01c"], lorentz_factor(0.1 * C_KM_S))
    check("γ at 0.5c", r["gamma_05c"], lorentz_factor(0.5 * C_KM_S))

    check("time loss 1yr @ 0.01c", r["time_loss_1yr_001c"],
          time_dilation_loss(365.25 * 86400.0, 0.01 * C_KM_S))

    check("KE correction @ 0.025c", r["ke_correction_025c"],
          kinetic_energy_correction_factor(0.025 * C_KM_S))

    ve = 9806.65
    mr = 10.0
    check("classical ΔV ve=9807 mr=10", r["dv_classical_ve9807_mr10"],
          classical_delta_v(ve, mr))
    check("relativistic ΔV ve=9807 mr=10", r["dv_relativistic_ve9807_mr10"],
          relativistic_delta_v(ve, mr))
    check("ΔV correction fraction", r["dv_correction_fraction"],
          delta_v_correction_fraction(ve, mr))

    t_coord, t_proper = brachistochrone_times(550_630_800.0, 0.032783)
    check("brach coord time EP01", r["brach_t_coord_ep01"], t_coord)
    check("brach proper time EP01", r["brach_t_proper_ep01"], t_proper)
    check("brach peak velocity EP01", r["brach_v_peak_ep01"],
          brachistochrone_peak_velocity(550_630_800.0, 0.032783))

    g, b, td, ke = effects_summary(7600.0)
    check("γ at 7600 km/s", r["gamma_7600"], g)
    check("β at 7600 km/s", r["beta_7600"], b)
    check("TD ppm at 7600 km/s", r["td_ppm_7600"], td)
    check("KE ppm at 7600 km/s", r["ke_ppm_7600"], ke)

    # ── Attitude ──────────────────────────────────────────────────
    print("\n═══ Attitude module cross-validation ═══")
    a = rust["attitude"]

    check("miss dist 20/3600/0.001", a["miss_20_3600_0001"],
          miss_distance_km(20.0, 3600.0, 0.001))
    check("req pointing 20/3600/10km", a["req_pointing_20_3600_10km"],
          required_pointing_rad(20.0, 3600.0, 10.0))
    check("flip rate 60s", a["flip_rate_60s"], flip_angular_rate(60.0))
    check("flip H 300t/5m", a["flip_h_300t_5m"],
          flip_angular_momentum(300_000.0, 5.0, 0.05))
    check("flip torque 300t/5m/60s/10s", a["flip_torque_300t_5m_60s_10s"],
          flip_rcs_torque(300_000.0, 5.0, 60.0, 10.0))
    check("v error 20/3600/0.001", a["v_error_20_3600_0001"],
          velocity_error_from_pointing(20.0, 3600.0, 0.001))
    check("pointing from 99.8% accuracy", a["pointing_from_998_accuracy"],
          accuracy_to_pointing_error_rad(0.998))
    check("gravity gradient torque", a["gg_torque_earth_7000km"],
          gravity_gradient_torque(3.986e14, 7_000_000.0, 300_000.0, 100.0, math.pi / 4.0))

    # ── Plasmoid ──────────────────────────────────────────────────
    print("\n═══ Plasmoid module cross-validation ═══")
    p = rust["plasmoid"]

    check("P_mag 50μT", p["p_mag_50uT"], magnetic_pressure_pa(50e-6))
    check("P_mag 10nT", p["p_mag_10nT"], magnetic_pressure_pa(10e-9))
    check("ρ from n=5e6", p["rho_5e6"], number_density_to_mass(5.0e6))
    check("P_ram solar wind", p["p_ram_sw"],
          ram_pressure_pa(number_density_to_mass(5.0e6), 400_000.0))

    # EP04 nominal
    ep04_nom = plasmoid_perturbation(
        2.0e-9, 0.05e6, 150_000.0, 7854.0, 480.0, 48_000_000.0, 34_920.0)
    check("EP04 nom P_mag", p["ep04_nom_p_mag"], ep04_nom["p_mag"])
    check("EP04 nom P_ram", p["ep04_nom_p_ram"], ep04_nom["p_ram"])
    check("EP04 nom force", p["ep04_nom_force"], ep04_nom["force"])
    check("EP04 nom Δv", p["ep04_nom_dv"], ep04_nom["dv"])
    check("EP04 nom miss", p["ep04_nom_miss"], ep04_nom["miss_km"])

    # EP04 extreme
    ep04_ext = plasmoid_perturbation(
        50.0e-9, 5.0e6, 500_000.0, 7854.0, 480.0, 48_000_000.0, 34_920.0)
    check("EP04 ext force", p["ep04_ext_force"], ep04_ext["force"])
    check("EP04 ext Δv", p["ep04_ext_dv"], ep04_ext["dv"])
    check("EP04 ext miss", p["ep04_ext_miss"], ep04_ext["miss_km"])

    # ── Communications ──────────────────────────────────────────
    print("\n═══ Communications module cross-validation ═══")
    cm = rust["comms"]
    au_km = 149_597_870.7

    # Speed of light constant
    check("c (km/s)", cm["c_km_s"], C_KM_S)

    # Light time: t = d / c
    py_lt_1au = au_km / C_KM_S
    check("light time 1 AU", cm["lt_1au_s"], py_lt_1au)
    check("light time 1 AU (min)", cm["lt_1au_min"], py_lt_1au / 60.0)
    check("round-trip 1 AU", cm["rt_1au_s"], 2.0 * py_lt_1au)
    check("light time 5.2 AU", cm["lt_52au_s"], 5.2 * au_km / C_KM_S)
    check("light time 0 km", cm["lt_zero"], 0.0, abs_tol=1e-30)

    # FSPL = 20·log₁₀(d_m) + 20·log₁₀(f_Hz) + 20·log₁₀(4π/c_m_s)
    def fspl_db(dist_km, freq_hz):
        d_m = dist_km * 1000.0
        c_m_s = C_KM_S * 1000.0
        return (20.0 * math.log10(d_m) + 20.0 * math.log10(freq_hz)
                + 20.0 * math.log10(4.0 * math.pi / c_m_s))

    check("FSPL X-band 1 AU", cm["fspl_xband_1au"], fspl_db(au_km, 8.4e9))
    check("FSPL X-band 5 AU", cm["fspl_xband_5au"], fspl_db(5.0 * au_km, 8.4e9))
    check("FSPL optical 1 AU", cm["fspl_optical_1au"], fspl_db(au_km, 193.4e12))

    # Verify FSPL distance scaling: +14 dB for 5x distance (20·log₁₀(5) ≈ 13.98)
    fspl_diff = cm["fspl_xband_5au"] - cm["fspl_xband_1au"]
    py_fspl_diff = 20.0 * math.log10(5.0)
    check("FSPL 5x distance scaling", fspl_diff, py_fspl_diff)

    # ── Mass Timeline (Tsiolkovsky) ─────────────────────────────
    print("\n═══ Mass timeline (Tsiolkovsky) cross-validation ═══")
    mt = rust["mass_timeline"]

    # g0 constant
    check("g0 (m/s²)", mt["g0_m_s2"], G0_M_S2)

    # propellant_consumed: Kestrel-like (300t, 5 km/s, Isp 1e6 s)
    check("propellant consumed 300t/5kms/1e6s",
          mt["propellant_consumed_300t_5kms_1e6s"],
          propellant_consumed(300_000.0, 5.0, 1_000_000.0))

    # propellant_consumed: conventional (10t, 3 km/s, Isp 300 s)
    check("propellant consumed 10t/3kms/300s",
          mt["propellant_consumed_10t_3kms_300s"],
          propellant_consumed(10_000.0, 3.0, 300.0))

    # propellant_consumed: high dv (1t, 10 km/s, Isp 3000 s)
    check("propellant consumed 1t/10kms/3000s",
          mt["propellant_consumed_1t_10kms_3000s"],
          propellant_consumed(1_000.0, 10.0, 3000.0))

    # post_burn_mass
    check("post-burn mass 300t/5kms/1e6s",
          mt["post_burn_mass_300t_5kms_1e6s"],
          post_burn_mass(300_000.0, 5.0, 1_000_000.0))

    check("post-burn mass 10t/3kms/300s",
          mt["post_burn_mass_10t_3kms_300s"],
          post_burn_mass(10_000.0, 3.0, 300.0))

    # compute_timeline: 2-burn + jettison scenario
    tl = compute_test_timeline(300_000.0, 200_000.0)
    check("timeline final total", mt["timeline_final_total_kg"], tl["final_total_kg"])
    check("timeline final dry", mt["timeline_final_dry_kg"], tl["final_dry_kg"])
    check("timeline final propellant", mt["timeline_final_propellant_kg"], tl["final_propellant_kg"])
    check("timeline total consumed", mt["timeline_total_consumed_kg"], tl["total_consumed_kg"])
    check("timeline propellant margin", mt["timeline_propellant_margin"], tl["margin"])

    # ── Orbital 3D Geometry ─────────────────────────────────────
    print("\n═══ Orbital 3D geometry cross-validation ═══")
    o3d = rust["orbital_3d"]

    # Constants (obliquity angles)
    check("Saturn obliquity (rad)", o3d["saturn_obliquity_rad"],
          math.radians(26.73))
    check("Uranus obliquity (rad)", o3d["uranus_obliquity_rad"],
          math.radians(97.77))

    # Ring/orbit dimensions
    check("Saturn ring inner (km)", o3d["saturn_ring_inner_km"], 66_900.0)
    check("Saturn ring outer (km)", o3d["saturn_ring_outer_km"], 140_180.0)
    check("Enceladus orbit radius (km)", o3d["enceladus_orbital_radius_km"], 238_020.0)

    # Saturn ring plane normal at J2000
    # IAU J2000 Saturn pole: RA=40.589°, Dec=83.537°
    py_saturn = ra_dec_to_ecliptic(40.589, 83.537)
    check("Saturn normal x", o3d["saturn_normal_x"], py_saturn[0])
    check("Saturn normal y", o3d["saturn_normal_y"], py_saturn[1])
    check("Saturn normal z", o3d["saturn_normal_z"], py_saturn[2])

    # Verify Saturn normal is unit vector
    saturn_mag = math.sqrt(
        o3d["saturn_normal_x"]**2 + o3d["saturn_normal_y"]**2 + o3d["saturn_normal_z"]**2)
    check("Saturn normal magnitude", saturn_mag, 1.0)

    # Uranus spin axis in ecliptic
    # IAU J2000 Uranus pole: RA=257.311°, Dec=-15.175°
    py_uranus = ra_dec_to_ecliptic(257.311, -15.175)
    check("Uranus axis x", o3d["uranus_axis_x"], py_uranus[0])
    check("Uranus axis y", o3d["uranus_axis_y"], py_uranus[1])
    check("Uranus axis z", o3d["uranus_axis_z"], py_uranus[2])

    # Verify Uranus axis is unit vector
    uranus_mag = math.sqrt(
        o3d["uranus_axis_x"]**2 + o3d["uranus_axis_y"]**2 + o3d["uranus_axis_z"]**2)
    check("Uranus axis magnitude", uranus_mag, 1.0)

    # ── Summary ───────────────────────────────────────────────────
    print(f"\n{'═' * 50}")
    total = passed + failed
    print(f"Results: {passed}/{total} passed, {failed} failed")
    if failed > 0:
        print("CROSS-VALIDATION FAILED — discrepancies detected!")
        sys.exit(1)
    else:
        print("All supplementary module cross-validation checks passed ✓")


if __name__ == "__main__":
    main()
