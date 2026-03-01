#!/usr/bin/env python3
"""
Cross-validation of supplementary Rust modules (relativistic, attitude, plasmoid)
against independent Python implementations.

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
