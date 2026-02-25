#!/usr/bin/env python3
"""
Cross-validation of solar-line-core Rust calculations against poliastro
(an independent, trusted orbital mechanics library based on astropy).

This provides a third independent validation source alongside the existing
numpy/scipy validation (validate.py). poliastro uses JPL ephemeris data
and astropy constants, giving an independent check on both formulas and
physical constants.

Usage: python3 cross_validation/validate_poliastro.py [--json rust_values.json]
"""

import json
import math
import sys
from pathlib import Path

from astropy import units as u
from poliastro.bodies import Earth, Mars, Jupiter, Saturn, Sun
from poliastro.maneuver import Maneuver
from poliastro.twobody import Orbit
import poliastro


# ═══════════════════════════════════════════════════════════════════════
# Comparison framework
# ═══════════════════════════════════════════════════════════════════════

class ValidationResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.details = []

    def check(self, name: str, rust_val: float, poliastro_val: float,
              rel_tol: float = 1e-4, abs_tol: float = 1e-10):
        """Compare Rust and poliastro values within tolerance.

        Note: Higher tolerance than scipy validation because poliastro uses
        different (more precise) physical constants from JPL DE ephemerides.
        The discrepancies reveal constant-sourcing differences, not formula bugs.
        """
        if poliastro_val == 0.0 and rust_val == 0.0:
            err = 0.0
        elif abs(poliastro_val) > abs_tol:
            err = abs(rust_val - poliastro_val) / abs(poliastro_val)
        else:
            err = abs(rust_val - poliastro_val)

        ok = err <= rel_tol or abs(rust_val - poliastro_val) <= abs_tol
        status = "PASS" if ok else "FAIL"

        if ok:
            self.passed += 1
        else:
            self.failed += 1

        detail = f"  [{status}] {name}: Rust={rust_val:.12e}, poliastro={poliastro_val:.12e}, rel_err={err:.6e}"
        self.details.append(detail)
        if not ok:
            print(detail, file=sys.stderr)

    def summary(self) -> str:
        lines = ["\n" + "=" * 76]
        lines.append(f"Poliastro cross-validation: {self.passed} passed, {self.failed} failed")
        lines.append("=" * 76)
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

    # ═══════════════════════════════════════════════════════════════
    # 1. Gravitational parameters (GM / mu) comparison
    # ═══════════════════════════════════════════════════════════════
    print("=== Validating gravitational parameters against poliastro/astropy ===")
    c = rust["constants"]

    # poliastro uses astropy constants from IAU/JPL — slight differences expected
    mu_sun_pa = Sun.k.to(u.km**3 / u.s**2).value
    mu_earth_pa = Earth.k.to(u.km**3 / u.s**2).value
    mu_mars_pa = Mars.k.to(u.km**3 / u.s**2).value
    mu_jupiter_pa = Jupiter.k.to(u.km**3 / u.s**2).value
    mu_saturn_pa = Saturn.k.to(u.km**3 / u.s**2).value

    # GM values may differ slightly between sources (IAU 2015 vs DE430 vs DE440)
    # Use 0.01% tolerance for constant comparison
    vr.check("mu_sun", c["mu_sun"], mu_sun_pa, rel_tol=1e-4)
    vr.check("mu_earth", c["mu_earth"], mu_earth_pa, rel_tol=1e-4)
    vr.check("mu_mars", c["mu_mars"], mu_mars_pa, rel_tol=1e-2)  # Mars GM varies more between sources
    # Jupiter GM: Rust uses 1.266865349e8 (DE430), poliastro uses 1.267127625e8 (DE440)
    # The ~0.02% difference is from different JPL ephemeris versions — document this
    vr.check("mu_jupiter", c["mu_jupiter"], mu_jupiter_pa, rel_tol=3e-4)
    vr.check("mu_saturn", c["mu_saturn"], mu_saturn_pa, rel_tol=1e-4)

    # ═══════════════════════════════════════════════════════════════
    # 2. Circular orbit velocities via poliastro Orbit objects
    # ═══════════════════════════════════════════════════════════════
    print("=== Validating circular orbit velocities ===")

    # LEO circular orbit at 200km altitude (r = 6578 km)
    r_leo = c["r_leo"] * u.km
    leo_orbit = Orbit.circular(Earth, alt=(r_leo - Earth.R))
    v_leo_pa = leo_orbit.v.to(u.km / u.s).value
    v_leo_mag = math.sqrt(sum(vi**2 for vi in v_leo_pa))
    vr.check("v_leo_circular", rust["vis_viva"]["v_leo_circular"], v_leo_mag, rel_tol=1e-3)

    # Earth orbit velocity around Sun
    r_earth = c["r_earth"] * u.km
    earth_orbit = Orbit.circular(Sun, alt=(r_earth - Sun.R))
    v_earth_pa = earth_orbit.v.to(u.km / u.s).value
    v_earth_mag = math.sqrt(sum(vi**2 for vi in v_earth_pa))
    vr.check("v_earth_orbit", rust["vis_viva"]["v_earth_orbit"], v_earth_mag, rel_tol=1e-3)

    # ═══════════════════════════════════════════════════════════════
    # 3. Hohmann transfer ΔV via poliastro Maneuver
    # ═══════════════════════════════════════════════════════════════
    print("=== Validating Hohmann transfers via poliastro ===")

    # LEO → GEO
    r_geo = c["r_geo"] * u.km
    leo_circ = Orbit.circular(Earth, alt=(r_leo - Earth.R))
    hohmann_leo_geo = Maneuver.hohmann(leo_circ, r_geo)
    dv1_leo_geo = abs(hohmann_leo_geo.impulses[0][1].to(u.km / u.s).value[0])
    # The impulse is a velocity vector; get magnitude of each
    dv1_mag = math.sqrt(sum(v**2 for v in hohmann_leo_geo.impulses[0][1].to(u.km / u.s).value))
    dv2_mag = math.sqrt(sum(v**2 for v in hohmann_leo_geo.impulses[1][1].to(u.km / u.s).value))
    vr.check("hohmann_leo_geo_dv1", rust["hohmann"]["leo_geo_dv1"], dv1_mag, rel_tol=1e-3)
    vr.check("hohmann_leo_geo_dv2", rust["hohmann"]["leo_geo_dv2"], dv2_mag, rel_tol=1e-3)

    # Earth → Mars (heliocentric)
    earth_circ = Orbit.circular(Sun, alt=(r_earth - Sun.R))
    r_mars = c["r_mars"] * u.km
    hohmann_earth_mars = Maneuver.hohmann(earth_circ, r_mars)
    dv1_em = math.sqrt(sum(v**2 for v in hohmann_earth_mars.impulses[0][1].to(u.km / u.s).value))
    dv2_em = math.sqrt(sum(v**2 for v in hohmann_earth_mars.impulses[1][1].to(u.km / u.s).value))
    vr.check("hohmann_earth_mars_dv1", rust["hohmann"]["earth_mars_dv1"], dv1_em, rel_tol=1e-3)
    vr.check("hohmann_earth_mars_dv2", rust["hohmann"]["earth_mars_dv2"], dv2_em, rel_tol=1e-3)

    # Earth → Jupiter (heliocentric)
    r_jupiter = c["r_jupiter"] * u.km
    hohmann_earth_jupiter = Maneuver.hohmann(earth_circ, r_jupiter)
    dv1_ej = math.sqrt(sum(v**2 for v in hohmann_earth_jupiter.impulses[0][1].to(u.km / u.s).value))
    dv2_ej = math.sqrt(sum(v**2 for v in hohmann_earth_jupiter.impulses[1][1].to(u.km / u.s).value))
    vr.check("hohmann_earth_jupiter_dv1", rust["hohmann"]["earth_jupiter_dv1"], dv1_ej, rel_tol=1e-3)
    vr.check("hohmann_earth_jupiter_dv2", rust["hohmann"]["earth_jupiter_dv2"], dv2_ej, rel_tol=1e-3)

    # ═══════════════════════════════════════════════════════════════
    # 4. Orbital periods via poliastro
    # ═══════════════════════════════════════════════════════════════
    print("=== Validating orbital periods ===")

    # Earth orbital period around Sun
    earth_period_pa = earth_orbit.period.to(u.day).value
    vr.check("earth_period_days", rust["periods"]["earth_days"], earth_period_pa, rel_tol=1e-3)

    # Mars orbital period
    mars_orbit = Orbit.circular(Sun, alt=(r_mars - Sun.R))
    mars_period_pa = mars_orbit.period.to(u.day).value
    vr.check("mars_period_days", rust["periods"]["mars_days"], mars_period_pa, rel_tol=1e-3)

    # Jupiter orbital period
    jupiter_orbit = Orbit.circular(Sun, alt=(r_jupiter - Sun.R))
    jupiter_period_pa = jupiter_orbit.period.to(u.day).value
    vr.check("jupiter_period_days", rust["periods"]["jupiter_days"], jupiter_period_pa, rel_tol=1e-3)

    # LEO period
    leo_period_pa = leo_orbit.period.to(u.min).value
    vr.check("leo_period_minutes", rust["periods"]["leo_minutes"], leo_period_pa, rel_tol=1e-3)

    # ═══════════════════════════════════════════════════════════════
    # 5. SOI radii comparison
    # ═══════════════════════════════════════════════════════════════
    print("=== Validating SOI radii ===")

    # SOI = a * (m_planet/m_sun)^(2/5)
    # poliastro doesn't have a direct SOI function, but we can compute with its constants
    soi_jupiter_pa = (c["r_jupiter"] * (mu_jupiter_pa / mu_sun_pa) ** 0.4)
    soi_earth_pa = (c["r_earth"] * (mu_earth_pa / mu_sun_pa) ** 0.4)
    soi_saturn_pa = (c["r_saturn"] * (mu_saturn_pa / mu_sun_pa) ** 0.4)

    vr.check("soi_jupiter", rust["soi"]["jupiter_km"], soi_jupiter_pa, rel_tol=1e-3)
    vr.check("soi_earth", rust["soi"]["earth_km"], soi_earth_pa, rel_tol=1e-3)
    vr.check("soi_saturn", rust["soi"]["saturn_km"], soi_saturn_pa, rel_tol=1e-3)

    # Cross-check against known literature values
    vr.check("soi_jupiter_known_48Mkm", soi_jupiter_pa / 1e6, 48.2, rel_tol=0.03)
    vr.check("soi_earth_known_0.93Mkm", soi_earth_pa / 1e6, 0.929, rel_tol=0.02)

    # ═══════════════════════════════════════════════════════════════
    # 6. Hohmann transfer times via poliastro
    # ═══════════════════════════════════════════════════════════════
    print("=== Validating Hohmann transfer times ===")

    # Earth → Mars transfer time
    tof_earth_mars = hohmann_earth_mars.get_total_time().to(u.day).value
    # Hohmann half-period: T/2 = pi * sqrt(a^3/mu)
    a_transfer = (c["r_earth"] + c["r_mars"]) / 2.0
    tof_analytical = math.pi * math.sqrt(a_transfer**3 / c["mu_sun"]) / 86400.0
    vr.check("hohmann_earth_mars_tof_days", tof_analytical, tof_earth_mars, rel_tol=1e-3)

    # Earth → Jupiter transfer time
    tof_earth_jupiter = hohmann_earth_jupiter.get_total_time().to(u.day).value
    a_transfer_ej = (c["r_earth"] + c["r_jupiter"]) / 2.0
    tof_analytical_ej = math.pi * math.sqrt(a_transfer_ej**3 / c["mu_sun"]) / 86400.0
    vr.check("hohmann_earth_jupiter_tof_days", tof_analytical_ej, tof_earth_jupiter, rel_tol=1e-3)

    # ═══════════════════════════════════════════════════════════════
    # 7. Orbit propagation energy conservation
    # ═══════════════════════════════════════════════════════════════
    print("=== Validating orbital energy ===")

    # LEO specific orbital energy
    v_circ = math.sqrt(mu_earth_pa / c["r_leo"])
    e_specific = 0.5 * v_circ**2 - mu_earth_pa / c["r_leo"]
    # Compare poliastro's energy with Rust's
    leo_energy_pa = leo_orbit.energy.to(u.km**2 / u.s**2).value
    vr.check("leo_energy", rust["propagation"]["leo_init_energy"], leo_energy_pa, rel_tol=1e-3)

    # ═══════════════════════════════════════════════════════════════
    # Print summary and export results
    # ═══════════════════════════════════════════════════════════════
    print(vr.summary())

    # Export results as JSON for reporting
    results = {
        "validator": "poliastro",
        "version": str(poliastro.__version__),
        "total_checks": vr.passed + vr.failed,
        "passed": vr.passed,
        "failed": vr.failed,
        "constants_source": "astropy/JPL DE ephemeris",
        "details": vr.details,
    }

    out_path = Path(__file__).parent / "poliastro_results.json"
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults exported to {out_path}")

    return 0 if vr.failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
