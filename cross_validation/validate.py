#!/usr/bin/env python3
"""
Cross-validation of solar-line-core Rust calculations against independent
Python (numpy/scipy) implementation.

This script independently implements the same orbital mechanics formulas and
compares results against the Rust implementation. Discrepancies beyond
tolerance indicate a bug in one or both implementations.

Usage: python3 cross_validation/validate.py [--json rust_values.json]
"""

import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import brentq


# ═══════════════════════════════════════════════════════════════════════
# Independent implementations (no shared code with Rust)
# ═══════════════════════════════════════════════════════════════════════

G0 = 9.80665  # m/s^2, standard gravitational acceleration


def vis_viva(mu: float, r: float, a: float) -> float:
    """Vis-viva equation: v = sqrt(mu * (2/r - 1/a))"""
    return math.sqrt(mu * (2.0 / r - 1.0 / a))


def hohmann_dv(mu: float, r1: float, r2: float) -> tuple[float, float]:
    """Hohmann transfer DeltaV between two circular orbits."""
    a_transfer = (r1 + r2) / 2.0
    v_circ_1 = math.sqrt(mu / r1)
    v_transfer_1 = vis_viva(mu, r1, a_transfer)
    dv1 = abs(v_transfer_1 - v_circ_1)
    v_circ_2 = math.sqrt(mu / r2)
    v_transfer_2 = vis_viva(mu, r2, a_transfer)
    dv2 = abs(v_circ_2 - v_transfer_2)
    return dv1, dv2


def orbital_period(mu: float, a: float) -> float:
    """Orbital period: T = 2*pi*sqrt(a^3/mu)"""
    return 2.0 * math.pi * math.sqrt(a**3 / mu)


def brachistochrone_accel(d: float, t: float) -> float:
    """Brachistochrone acceleration: a = 4*d/t^2"""
    return 4.0 * d / (t * t)


def brachistochrone_dv(d: float, t: float) -> float:
    """Brachistochrone delta-V: dv = 4*d/t"""
    return 4.0 * d / t


def exhaust_velocity(isp_s: float) -> float:
    """Exhaust velocity from Isp: ve = Isp * g0 / 1000 (km/s)"""
    return isp_s * G0 / 1000.0


def mass_ratio(dv: float, ve: float) -> float:
    """Tsiolkovsky mass ratio: m0/mf = exp(dv/ve)"""
    return math.exp(dv / ve)


def propellant_fraction(dv: float, ve: float) -> float:
    """Propellant fraction: 1 - 1/mass_ratio"""
    mr = mass_ratio(dv, ve)
    return 1.0 - 1.0 / mr


def required_propellant_mass(dry_mass: float, dv: float, ve: float) -> float:
    """Required propellant: m_dry * (exp(dv/ve) - 1)"""
    return dry_mass * (mass_ratio(dv, ve) - 1.0)


def initial_mass(dry_mass: float, dv: float, ve: float) -> float:
    """Initial mass: m_dry * exp(dv/ve)"""
    return dry_mass * mass_ratio(dv, ve)


def solve_kepler(M: float, e: float, tol: float = 1e-14, max_iter: int = 50) -> float:
    """Solve Kepler equation M = E - e*sin(E) using Newton-Raphson."""
    # Normalize M to [0, 2*pi)
    M = M % (2.0 * math.pi)
    if M < 0:
        M += 2.0 * math.pi

    # Initial guess
    E = M + e * math.sin(M) if e < 0.8 else math.pi

    for _ in range(max_iter):
        f = E - e * math.sin(E) - M
        fp = 1.0 - e * math.cos(E)
        delta = f / fp
        E -= delta
        if abs(delta) < tol:
            return E

    raise RuntimeError(f"Kepler solver did not converge: M={M}, e={e}")


def eccentric_to_true_anomaly(E: float, e: float) -> float:
    """Convert eccentric anomaly to true anomaly."""
    half_nu = math.sqrt((1.0 + e) / (1.0 - e)) * math.tan(E / 2.0)
    nu = 2.0 * math.atan(half_nu)
    # Normalize to [0, 2*pi)
    nu = nu % (2.0 * math.pi)
    if nu < 0:
        nu += 2.0 * math.pi
    return nu


def soi_radius(r_orbit: float, mu_planet: float, mu_sun: float) -> float:
    """Sphere of influence radius: r_SOI = a * (m_planet/m_sun)^(2/5)"""
    return r_orbit * (mu_planet / mu_sun) ** 0.4


def unpowered_flyby(mu_planet: float, v_inf_mag: float, r_periapsis: float):
    """Unpowered flyby: compute turn angle and periapsis speed."""
    a = -mu_planet / (v_inf_mag**2)
    e = 1.0 - r_periapsis / a
    turn_angle = 2.0 * math.asin(1.0 / e)
    v_peri = math.sqrt(v_inf_mag**2 + 2.0 * mu_planet / r_periapsis)
    return turn_angle, v_peri, v_inf_mag  # v_inf conserved


def powered_flyby(mu_planet: float, v_inf_mag: float, r_periapsis: float, burn_dv: float):
    """Powered flyby: compute exit v_inf and turn angle."""
    a_in = -mu_planet / (v_inf_mag**2)
    e_in = 1.0 - r_periapsis / a_in
    half_turn_in = math.asin(1.0 / e_in)

    v_peri_in = math.sqrt(v_inf_mag**2 + 2.0 * mu_planet / r_periapsis)
    v_peri_out = v_peri_in + burn_dv

    v_inf_out_sq = v_peri_out**2 - 2.0 * mu_planet / r_periapsis
    v_inf_out = math.sqrt(v_inf_out_sq) if v_inf_out_sq > 0 else 0.0

    if v_inf_out > 1e-10:
        a_out = -mu_planet / (v_inf_out**2)
    else:
        a_out = -1e20
    e_out = 1.0 - r_periapsis / a_out
    half_turn_out = math.asin(1.0 / e_out) if e_out > 1.0 else math.pi / 2.0
    turn_angle = half_turn_in + half_turn_out

    return turn_angle, v_peri_out, v_inf_out


def oberth_dv_gain(mu: float, r_peri: float, v_inf: float, burn_dv: float) -> float:
    """Oberth effect gain in v_inf."""
    v_peri = math.sqrt(v_inf**2 + 2.0 * mu / r_peri)
    v_peri_after = v_peri + burn_dv
    v_inf_after_sq = v_peri_after**2 - 2.0 * mu / r_peri
    v_inf_after = math.sqrt(v_inf_after_sq) if v_inf_after_sq > 0 else 0.0
    return (v_inf_after - v_inf) - burn_dv


def oberth_efficiency(mu: float, r_peri: float, v_inf: float, burn_dv: float) -> float:
    """Fractional Oberth efficiency."""
    if burn_dv <= 0:
        return 0.0
    v_peri = math.sqrt(v_inf**2 + 2.0 * mu / r_peri)
    v_peri_after = v_peri + burn_dv
    v_inf_after_sq = v_peri_after**2 - 2.0 * mu / r_peri
    v_inf_after = math.sqrt(v_inf_after_sq) if v_inf_after_sq > 0 else 0.0
    delta_v_inf = v_inf_after - v_inf
    return (delta_v_inf / burn_dv) - 1.0


def plane_change_dv(v: float, delta_i: float) -> float:
    """Plane change DV: 2*v*sin(delta_i/2)"""
    return 2.0 * v * abs(math.sin(delta_i / 2.0))


def propagate_kepler_scipy(mu: float, r0: float, v0: float, duration: float):
    """Propagate a circular orbit using scipy RK45 and return final state + energy."""

    def deriv(t, y):
        x, y_pos, z, vx, vy, vz = y
        r = math.sqrt(x**2 + y_pos**2 + z**2)
        r3 = r**3
        ax = -mu * x / r3
        ay = -mu * y_pos / r3
        az = -mu * z / r3
        return [vx, vy, vz, ax, ay, az]

    y0 = [r0, 0.0, 0.0, 0.0, v0, 0.0]
    sol = solve_ivp(deriv, [0, duration], y0, method='RK45',
                    rtol=1e-12, atol=1e-12, max_step=10.0)

    if not sol.success:
        raise RuntimeError(f"Integration failed: {sol.message}")

    final = sol.y[:, -1]
    x, y_pos, z, vx, vy, vz = final
    r = math.sqrt(x**2 + y_pos**2 + z**2)
    v = math.sqrt(vx**2 + vy**2 + vz**2)
    energy = 0.5 * v**2 - mu / r
    return x, y_pos, z, vx, vy, vz, r, v, energy


# ═══════════════════════════════════════════════════════════════════════
# Comparison framework
# ═══════════════════════════════════════════════════════════════════════

class ValidationResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.details = []

    def check(self, name: str, rust_val: float, python_val: float,
              rel_tol: float = 1e-10, abs_tol: float = 1e-15):
        """Compare Rust and Python values within tolerance."""
        if python_val == 0.0 and rust_val == 0.0:
            err = 0.0
        elif abs(python_val) > abs_tol:
            err = abs(rust_val - python_val) / abs(python_val)
        else:
            err = abs(rust_val - python_val)

        ok = err <= rel_tol or abs(rust_val - python_val) <= abs_tol
        status = "PASS" if ok else "FAIL"

        if ok:
            self.passed += 1
        else:
            self.failed += 1

        detail = f"  [{status}] {name}: Rust={rust_val:.12e}, Python={python_val:.12e}, rel_err={err:.4e}"
        self.details.append(detail)
        if not ok:
            print(detail, file=sys.stderr)

    def summary(self) -> str:
        lines = ["\n" + "=" * 70]
        lines.append(f"Cross-validation results: {self.passed} passed, {self.failed} failed")
        lines.append("=" * 70)
        for d in self.details:
            lines.append(d)
        lines.append("")
        if self.failed == 0:
            lines.append("All checks PASSED.")
        else:
            lines.append(f"WARNING: {self.failed} check(s) FAILED!")
        return "\n".join(lines)


def main():
    # Load Rust values
    json_path = Path(__file__).parent / "rust_values.json"
    if len(sys.argv) > 2 and sys.argv[1] == "--json":
        json_path = Path(sys.argv[2])

    with open(json_path) as f:
        rust = json.load(f)

    vr = ValidationResult()

    # --- Constants (exact match expected) ---
    print("=== Validating constants ===")
    c = rust["constants"]
    # These are from NASA JPL, we just verify they match our hardcoded values
    vr.check("mu_sun", c["mu_sun"], 1.32712440041e11)
    vr.check("mu_earth", c["mu_earth"], 3.986004418e5)
    vr.check("mu_jupiter", c["mu_jupiter"], 1.266865349e8)
    vr.check("g0", c["g0"], G0)

    # --- Vis-viva ---
    print("=== Validating vis-viva ===")
    v = rust["vis_viva"]
    vr.check("v_leo_circular", v["v_leo_circular"],
             vis_viva(c["mu_earth"], c["r_leo"], c["r_leo"]))
    vr.check("v_geo_circular", v["v_geo_circular"],
             vis_viva(c["mu_earth"], c["r_geo"], c["r_geo"]))
    vr.check("v_earth_orbit", v["v_earth_orbit"],
             vis_viva(c["mu_sun"], c["r_earth"], c["r_earth"]))

    # --- Hohmann transfers ---
    print("=== Validating Hohmann transfers ===")
    h = rust["hohmann"]
    dv1_py, dv2_py = hohmann_dv(c["mu_earth"], c["r_leo"], c["r_geo"])
    vr.check("leo_geo_dv1", h["leo_geo_dv1"], dv1_py)
    vr.check("leo_geo_dv2", h["leo_geo_dv2"], dv2_py)

    dv1_py, dv2_py = hohmann_dv(c["mu_sun"], c["r_earth"], c["r_mars"])
    vr.check("earth_mars_dv1", h["earth_mars_dv1"], dv1_py)
    vr.check("earth_mars_dv2", h["earth_mars_dv2"], dv2_py)

    dv1_py, dv2_py = hohmann_dv(c["mu_sun"], c["r_earth"], c["r_jupiter"])
    vr.check("earth_jupiter_dv1", h["earth_jupiter_dv1"], dv1_py)
    vr.check("earth_jupiter_dv2", h["earth_jupiter_dv2"], dv2_py)

    # --- Orbital periods ---
    print("=== Validating orbital periods ===")
    p = rust["periods"]
    vr.check("earth_period_days", p["earth_days"],
             orbital_period(c["mu_sun"], c["r_earth"]) / 86400.0)
    vr.check("mars_period_days", p["mars_days"],
             orbital_period(c["mu_sun"], c["r_mars"]) / 86400.0)
    vr.check("jupiter_period_days", p["jupiter_days"],
             orbital_period(c["mu_sun"], c["r_jupiter"]) / 86400.0)
    vr.check("leo_period_minutes", p["leo_minutes"],
             orbital_period(c["mu_earth"], c["r_leo"]) / 60.0)

    # --- Brachistochrone ---
    print("=== Validating brachistochrone ===")
    b = rust["brachistochrone"]
    d_1au = 149_597_870.7
    t_72h = 72.0 * 3600.0
    vr.check("brach_accel", b["accel_1au_72h"], brachistochrone_accel(d_1au, t_72h))
    vr.check("brach_dv", b["dv_1au_72h"], brachistochrone_dv(d_1au, t_72h))
    vr.check("brach_dmax", b["dmax_roundtrip"], d_1au, rel_tol=1e-10)

    # --- Tsiolkovsky ---
    print("=== Validating Tsiolkovsky ===")
    t = rust["tsiolkovsky"]
    vr.check("ve_isp450", t["ve_isp450"], exhaust_velocity(450.0))
    vr.check("ve_isp1e6", t["ve_isp1e6"], exhaust_velocity(1_000_000.0))
    vr.check("mass_ratio_dv_eq_ve", t["mass_ratio_dv_eq_ve"], math.e)
    vr.check("prop_frac_dv_eq_ve", t["prop_frac_dv_eq_ve"], 1.0 - 1.0 / math.e)
    ve_chem = exhaust_velocity(450.0)
    vr.check("prop_mass_leo_chem", t["prop_mass_leo_chem"],
             required_propellant_mass(1000.0, 9.4, ve_chem))
    ve_fusion = exhaust_velocity(1_000_000.0)
    vr.check("m0_kestrel_ep01", t["m0_kestrel_ep01"],
             initial_mass(300000.0, 8497.0, ve_fusion))

    # --- Kepler equation ---
    print("=== Validating Kepler equation ===")
    k = rust["kepler"]
    for i, sol in enumerate(k["solutions"]):
        M_val, e_val = sol["M"], sol["e"]
        E_rust = sol["E"]
        nu_rust = sol["nu"]
        E_py = solve_kepler(M_val, e_val)
        nu_py = eccentric_to_true_anomaly(E_py, e_val)

        vr.check(f"kepler_E[M={M_val:.2f},e={e_val:.1f}]", E_rust, E_py, rel_tol=1e-12)
        vr.check(f"kepler_nu[M={M_val:.2f},e={e_val:.1f}]", nu_rust, nu_py, rel_tol=1e-10)

        # Verify Kepler equation is satisfied: M = E - e*sin(E)
        M_check = E_py - e_val * math.sin(E_py)
        # Normalize
        M_norm = M_val % (2.0 * math.pi)
        if M_norm < 0:
            M_norm += 2.0 * math.pi
        vr.check(f"kepler_residual[M={M_val:.2f},e={e_val:.1f}]", M_check, M_norm, rel_tol=1e-13)

    # Anomaly round-trip: M → ν → M
    print("=== Validating Kepler anomaly round-trips ===")
    for i, rt in enumerate(k["anomaly_roundtrips"]):
        M_in, e_val, nu_rust, M_out = rt["M_in"], rt["e"], rt["nu"], rt["M_out"]
        # Independent Python: M → E → ν
        E_py = solve_kepler(M_in, e_val)
        nu_py = eccentric_to_true_anomaly(E_py, e_val)
        vr.check(f"anomaly_rt_nu[M={M_in},e={e_val}]", nu_rust, nu_py, rel_tol=1e-10)
        # ν → E → M round-trip
        E_back = 2.0 * math.atan2(
            math.sqrt(1.0 - e_val) * math.sin(nu_py / 2.0),
            math.sqrt(1.0 + e_val) * math.cos(nu_py / 2.0)
        )
        M_back = E_back - e_val * math.sin(E_back)
        # Normalize to [0, 2π)
        M_back = M_back % (2.0 * math.pi)
        if M_back < 0:
            M_back += 2.0 * math.pi
        M_out_norm = M_out % (2.0 * math.pi)
        if M_out_norm < 0:
            M_out_norm += 2.0 * math.pi
        vr.check(f"anomaly_rt_M[M={M_in},e={e_val}]", M_out_norm, M_back, rel_tol=1e-10)

    # Mean motion: n = sqrt(μ/a³)
    print("=== Validating mean motion ===")
    n_earth_py = math.sqrt(c["mu_sun"] / c["r_earth"] ** 3)
    vr.check("mean_motion_earth", k["mean_motion_earth"], n_earth_py)
    n_mars_py = math.sqrt(c["mu_sun"] / c["r_mars"] ** 3)
    vr.check("mean_motion_mars", k["mean_motion_mars"], n_mars_py)
    n_jupiter_py = math.sqrt(c["mu_sun"] / c["r_jupiter"] ** 3)
    vr.check("mean_motion_jupiter", k["mean_motion_jupiter"], n_jupiter_py)

    # --- SOI radii ---
    print("=== Validating SOI radii ===")
    s = rust["soi"]
    vr.check("soi_jupiter", s["jupiter_km"],
             soi_radius(c["r_jupiter"], c["mu_jupiter"], c["mu_sun"]))
    vr.check("soi_earth", s["earth_km"],
             soi_radius(c["r_earth"], c["mu_earth"], c["mu_sun"]))
    vr.check("soi_saturn", s["saturn_km"],
             soi_radius(c["r_saturn"], c["mu_saturn"], c["mu_sun"]))

    # Also validate against known values
    vr.check("soi_jupiter_known_Mkm", s["jupiter_km"] / 1e6, 48.2, rel_tol=0.03)
    vr.check("soi_earth_known_Mkm", s["earth_km"] / 1e6, 0.929, rel_tol=0.01)

    # --- Flyby ---
    print("=== Validating flyby ===")
    fb = rust["flyby"]
    uf = fb["unpowered_jupiter"]
    turn_py, vperi_py, vinf_out_py = unpowered_flyby(
        c["mu_jupiter"], uf["v_inf_in"], uf["r_periapsis"])
    vr.check("flyby_turn_angle", uf["turn_angle_rad"], turn_py)
    vr.check("flyby_v_periapsis", uf["v_periapsis"], vperi_py)
    vr.check("flyby_v_inf_conserved", uf["v_inf_out"], vinf_out_py)

    pf = fb["powered_jupiter"]
    turn_py, vperi_py, vinf_out_py = powered_flyby(
        c["mu_jupiter"], uf["v_inf_in"], uf["r_periapsis"], pf["burn_dv"])
    vr.check("powered_turn_angle", pf["turn_angle_rad"], turn_py)
    vr.check("powered_v_periapsis", pf["v_periapsis"], vperi_py)
    vr.check("powered_v_inf_out", pf["v_inf_out"], vinf_out_py)

    # --- Oberth effect ---
    print("=== Validating Oberth effect ===")
    ob = rust["oberth"]
    vr.check("oberth_gain_10_1", ob["gain_jupiter_10_1"],
             oberth_dv_gain(c["mu_jupiter"], 71492.0, 10.0, 1.0))
    vr.check("oberth_eff_10_1", ob["efficiency_jupiter_10_1"],
             oberth_efficiency(c["mu_jupiter"], 71492.0, 10.0, 1.0))
    vr.check("oberth_eff_1500_50", ob["efficiency_1500_50"],
             oberth_efficiency(c["mu_jupiter"], 71492.0 * 3.0, 1500.0, 50.0))

    # --- Plane change ---
    print("=== Validating plane change ===")
    pc = rust["plane_change"]
    vr.check("plane_change_90deg", pc["dv_90deg_7kms"],
             plane_change_dv(7.0, math.pi / 2.0))

    # --- Orbit propagation (scipy vs Rust RK4) ---
    print("=== Validating orbit propagation ===")
    prop = rust["propagation"]
    r_leo = c["r_leo"]
    v_circ = math.sqrt(c["mu_earth"] / r_leo)
    period = orbital_period(c["mu_earth"], r_leo)
    e_init = 0.5 * v_circ**2 - c["mu_earth"] / r_leo

    # Propagate with scipy
    x, y, z, vx, vy, vz, r_final, v_final, e_final_py = propagate_kepler_scipy(
        c["mu_earth"], r_leo, v_circ, period)

    vr.check("prop_init_energy", prop["leo_init_energy"], e_init, rel_tol=1e-10)
    # scipy energy drift should also be small
    e_drift_py = abs(e_final_py - e_init) / abs(e_init)
    vr.check("prop_scipy_energy_drift", e_drift_py, 0.0, abs_tol=1e-8)
    # Rust energy drift should be small
    vr.check("prop_rust_energy_drift", prop["leo_energy_drift"], 0.0, abs_tol=1e-8)

    # After 1 period, spacecraft should return near initial position
    vr.check("prop_return_to_start_r", prop["leo_final_r"], r_leo, rel_tol=1e-4)
    # scipy should also return near start
    vr.check("prop_scipy_return_r", r_final, r_leo, rel_tol=1e-4)

    # Print summary
    print(vr.summary())

    return 0 if vr.failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
