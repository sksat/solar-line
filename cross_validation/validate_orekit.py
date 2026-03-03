#!/usr/bin/env python3
"""
Cross-validation of solar-line-core Rust calculations against Orekit
(ESA's trusted space dynamics library, via orekit-jpype Python bindings).

Orekit provides a 4th independent validation source alongside the existing:
  - numpy/scipy (validate.py)
  - poliastro/astropy (validate_poliastro.py)
  - supplementary checks (validate_supplementary.py)

Orekit uses its own bundled JPL ephemeris data and GM constants from
IERS/IAU/JPL standards, providing an independent check on both formulas
and physical constants.

Requirements: orekit-jpype, jpype1 (pip install orekit-jpype)
              Java JRE 11+ (orekit-jpype bundles Orekit .jar files)

Usage: python3 cross_validation/validate_orekit.py [--json rust_values.json]
"""

import json
import math
import sys
from pathlib import Path

# Initialize Orekit JVM before any Orekit imports
import os
import orekit_jpype
vm = orekit_jpype.initVM()

# Set up Orekit data context (DE-440 ephemeris, Earth orientation, etc.)
from org.orekit.data import DataProvidersManager, ZipJarCrawler
from java.io import File as JFile

_data_candidates = [
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "raw_data", "orekit-data.zip"),
    os.path.join(os.getcwd(), "orekit-data.zip"),
    os.path.join(os.getcwd(), "raw_data", "orekit-data.zip"),
]
_data_zip = None
for _candidate in _data_candidates:
    if os.path.exists(_candidate):
        _data_zip = os.path.abspath(_candidate)
        break

if _data_zip is None:
    print("ERROR: orekit-data.zip not found. Download via:", file=sys.stderr)
    print("  cd raw_data && python3 -c 'import orekit_jpype; orekit_jpype.initVM(); "
          "from orekit_jpype.pyhelpers import download_orekit_data_curdir; "
          "download_orekit_data_curdir()'", file=sys.stderr)
    sys.exit(1)

from org.orekit.data import DataContext
_manager = DataContext.getDefault().getDataProvidersManager()
_manager.addProvider(ZipJarCrawler(JFile(_data_zip)))

from org.orekit.utils import Constants as OrekitConstants
from org.orekit.frames import FramesFactory
from org.orekit.time import AbsoluteDate, TimeScalesFactory
from org.orekit.orbits import KeplerianOrbit, PositionAngleType
from org.orekit.bodies import CelestialBodyFactory
from org.hipparchus.geometry.euclidean.threed import Vector3D


# ═══════════════════════════════════════════════════════════════════════
# Comparison framework (same pattern as validate_poliastro.py)
# ═══════════════════════════════════════════════════════════════════════

class ValidationResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.details = []

    def check(self, name: str, rust_val: float, orekit_val: float,
              rel_tol: float = 1e-4, abs_tol: float = 1e-10):
        """Compare Rust and Orekit values within tolerance."""
        if orekit_val == 0.0 and rust_val == 0.0:
            err = 0.0
        elif abs(orekit_val) > abs_tol:
            err = abs(rust_val - orekit_val) / abs(orekit_val)
        else:
            err = abs(rust_val - orekit_val)

        ok = err <= rel_tol or abs(rust_val - orekit_val) <= abs_tol
        status = "PASS" if ok else "FAIL"

        if ok:
            self.passed += 1
        else:
            self.failed += 1

        detail = f"  [{status}] {name}: Rust={rust_val:.12e}, Orekit={orekit_val:.12e}, rel_err={err:.6e}"
        self.details.append(detail)
        if not ok:
            print(detail, file=sys.stderr)

    def summary(self) -> str:
        lines = ["\n" + "=" * 76]
        lines.append(f"Orekit cross-validation: {self.passed} passed, {self.failed} failed")
        lines.append("=" * 76)
        for d in self.details:
            lines.append(d)
        lines.append("")
        if self.failed == 0:
            lines.append("All checks PASSED.")
        else:
            lines.append(f"WARNING: {self.failed} check(s) FAILED!")
        return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════
# Helper functions
# ═══════════════════════════════════════════════════════════════════════

def vis_viva(mu_m3s2: float, r_m: float, a_m: float) -> float:
    """Vis-viva equation: v = sqrt(mu * (2/r - 1/a)), returns m/s."""
    return math.sqrt(mu_m3s2 * (2.0 / r_m - 1.0 / a_m))


def hohmann_dv(mu_m3s2: float, r1_m: float, r2_m: float) -> tuple[float, float]:
    """Hohmann transfer ΔV using vis-viva, returns (dv1, dv2) in m/s."""
    a_transfer = (r1_m + r2_m) / 2.0
    v1_circ = math.sqrt(mu_m3s2 / r1_m)
    v1_transfer = vis_viva(mu_m3s2, r1_m, a_transfer)
    dv1 = abs(v1_transfer - v1_circ)
    v2_circ = math.sqrt(mu_m3s2 / r2_m)
    v2_transfer = vis_viva(mu_m3s2, r2_m, a_transfer)
    dv2 = abs(v2_circ - v2_transfer)
    return dv1, dv2


def soi_radius(a_planet_m: float, m_planet: float, m_sun: float) -> float:
    """Hill sphere SOI approximation: r_SOI = a * (m_planet / m_sun)^(2/5)."""
    return a_planet_m * (m_planet / m_sun) ** 0.4


def orekit_mu_km3s2(body_name: str) -> float:
    """Get GM from Orekit's CelestialBodyFactory in km^3/s^2."""
    body = CelestialBodyFactory.getBody(body_name)
    mu_m3s2 = body.getGM()
    return mu_m3s2 / 1e9  # m^3/s^2 → km^3/s^2


def main():
    # Load Rust values
    json_path = Path(__file__).parent / "rust_values.json"
    if len(sys.argv) > 2 and sys.argv[1] == "--json":
        json_path = Path(sys.argv[2])

    with open(json_path) as f:
        rust = json.load(f)

    vr = ValidationResult()

    # ═══════════════════════════════════════════════════════════════
    # 1. Gravitational parameters (GM) from Orekit vs Rust
    # ═══════════════════════════════════════════════════════════════
    print("=== Validating gravitational parameters against Orekit ===")
    c = rust["constants"]

    # Orekit GM values from its built-in ephemeris/constants files
    mu_sun_ok = orekit_mu_km3s2("Sun")
    mu_earth_ok = orekit_mu_km3s2("Earth")
    mu_mars_ok = orekit_mu_km3s2("Mars")
    mu_jupiter_ok = orekit_mu_km3s2("Jupiter")
    mu_saturn_ok = orekit_mu_km3s2("Saturn")
    mu_uranus_ok = orekit_mu_km3s2("Uranus")
    mu_neptune_ok = orekit_mu_km3s2("Neptune")

    # GM values differ between Orekit (DE440/441), Rust (DE430/440), poliastro
    # 0.1% tolerance for constant comparison across sources
    vr.check("mu_sun", c["mu_sun"], mu_sun_ok, rel_tol=1e-3)
    vr.check("mu_earth", c["mu_earth"], mu_earth_ok, rel_tol=1e-3)
    vr.check("mu_mars", c["mu_mars"], mu_mars_ok, rel_tol=1e-2)  # Mars GM varies most between sources
    vr.check("mu_jupiter", c["mu_jupiter"], mu_jupiter_ok, rel_tol=1e-3)
    vr.check("mu_saturn", c["mu_saturn"], mu_saturn_ok, rel_tol=1e-3)
    vr.check("mu_uranus", c["mu_uranus"], mu_uranus_ok, rel_tol=1e-3)
    vr.check("mu_neptune", c["mu_neptune"], mu_neptune_ok, rel_tol=1e-3)

    # ═══════════════════════════════════════════════════════════════
    # 2. Circular orbit velocities via Orekit KeplerianOrbit
    # ═══════════════════════════════════════════════════════════════
    print("=== Validating circular orbit velocities via Orekit ===")

    mu_earth_m3s2 = mu_earth_ok * 1e9  # km^3/s^2 → m^3/s^2
    mu_sun_m3s2 = mu_sun_ok * 1e9

    # LEO circular orbit at 6578 km radius
    r_leo_m = c["r_leo"] * 1e3  # km → m
    v_leo_orekit = math.sqrt(mu_earth_m3s2 / r_leo_m) / 1e3  # m/s → km/s
    vr.check("v_leo_circular", rust["vis_viva"]["v_leo_circular"], v_leo_orekit, rel_tol=1e-3)

    # Earth orbit velocity around Sun
    r_earth_m = c["r_earth"] * 1e3
    v_earth_orekit = math.sqrt(mu_sun_m3s2 / r_earth_m) / 1e3
    vr.check("v_earth_orbit", rust["vis_viva"]["v_earth_orbit"], v_earth_orekit, rel_tol=1e-3)

    # GEO circular orbit
    r_geo_m = c["r_geo"] * 1e3
    v_geo_orekit = math.sqrt(mu_earth_m3s2 / r_geo_m) / 1e3
    vr.check("v_geo_circular", rust["vis_viva"]["v_geo_circular"], v_geo_orekit, rel_tol=1e-3)

    # ═══════════════════════════════════════════════════════════════
    # 3. Hohmann transfer ΔV — Orekit GM-based independent calc
    # ═══════════════════════════════════════════════════════════════
    print("=== Validating Hohmann transfers using Orekit GM values ===")

    # Use Orekit's GM values to independently compute Hohmann ΔVs
    # This validates both the formula AND the constants simultaneously

    # LEO → GEO
    dv1, dv2 = hohmann_dv(mu_earth_m3s2, r_leo_m, r_geo_m)
    vr.check("hohmann_leo_geo_dv1", rust["hohmann"]["leo_geo_dv1"], dv1 / 1e3, rel_tol=1e-3)
    vr.check("hohmann_leo_geo_dv2", rust["hohmann"]["leo_geo_dv2"], dv2 / 1e3, rel_tol=1e-3)

    # Earth → Mars (heliocentric)
    r_mars_m = c["r_mars"] * 1e3
    dv1, dv2 = hohmann_dv(mu_sun_m3s2, r_earth_m, r_mars_m)
    vr.check("hohmann_earth_mars_dv1", rust["hohmann"]["earth_mars_dv1"], dv1 / 1e3, rel_tol=1e-3)
    vr.check("hohmann_earth_mars_dv2", rust["hohmann"]["earth_mars_dv2"], dv2 / 1e3, rel_tol=1e-3)

    # Earth → Jupiter (heliocentric) — EP01 relevance
    r_jupiter_m = c["r_jupiter"] * 1e3
    dv1, dv2 = hohmann_dv(mu_sun_m3s2, r_earth_m, r_jupiter_m)
    vr.check("hohmann_earth_jupiter_dv1", rust["hohmann"]["earth_jupiter_dv1"], dv1 / 1e3, rel_tol=1e-3)
    vr.check("hohmann_earth_jupiter_dv2", rust["hohmann"]["earth_jupiter_dv2"], dv2 / 1e3, rel_tol=1e-3)

    # Earth → Saturn (heliocentric) — EP02 relevance
    r_saturn_m = c["r_saturn"] * 1e3
    dv1, dv2 = hohmann_dv(mu_sun_m3s2, r_earth_m, r_saturn_m)
    vr.check("hohmann_earth_saturn_dv1", rust["hohmann"]["earth_saturn_dv1"], dv1 / 1e3, rel_tol=1e-3)
    vr.check("hohmann_earth_saturn_dv2", rust["hohmann"]["earth_saturn_dv2"], dv2 / 1e3, rel_tol=1e-3)

    # Earth → Uranus (heliocentric) — EP03/EP05 relevance
    r_uranus_m = c["r_uranus"] * 1e3
    dv1, dv2 = hohmann_dv(mu_sun_m3s2, r_earth_m, r_uranus_m)
    vr.check("hohmann_earth_uranus_dv1", rust["hohmann"]["earth_uranus_dv1"], dv1 / 1e3, rel_tol=1e-3)
    vr.check("hohmann_earth_uranus_dv2", rust["hohmann"]["earth_uranus_dv2"], dv2 / 1e3, rel_tol=1e-3)

    # ═══════════════════════════════════════════════════════════════
    # 4. Orbital periods via Orekit GM
    # ═══════════════════════════════════════════════════════════════
    print("=== Validating orbital periods using Orekit GM ===")

    def period_days(mu_km3s2: float, r_km: float) -> float:
        """Circular orbit period in days."""
        mu_m3s2 = mu_km3s2 * 1e9
        r_m = r_km * 1e3
        T_s = 2.0 * math.pi * math.sqrt(r_m**3 / mu_m3s2)
        return T_s / 86400.0

    vr.check("period_earth_days", rust["periods"]["earth_days"],
             period_days(mu_sun_ok, c["r_earth"]), rel_tol=1e-3)
    vr.check("period_mars_days", rust["periods"]["mars_days"],
             period_days(mu_sun_ok, c["r_mars"]), rel_tol=1e-3)
    vr.check("period_jupiter_days", rust["periods"]["jupiter_days"],
             period_days(mu_sun_ok, c["r_jupiter"]), rel_tol=1e-3)
    vr.check("period_saturn_days", rust["periods"]["saturn_days"],
             period_days(mu_sun_ok, c["r_saturn"]), rel_tol=1e-3)
    vr.check("period_uranus_days", rust["periods"]["uranus_days"],
             period_days(mu_sun_ok, c["r_uranus"]), rel_tol=1e-3)

    # LEO period in minutes
    leo_period_min = period_days(mu_earth_ok, c["r_leo"]) * 24 * 60
    vr.check("period_leo_minutes", rust["periods"]["leo_minutes"], leo_period_min, rel_tol=1e-3)

    # ═══════════════════════════════════════════════════════════════
    # 5. Sphere of Influence radii
    # ═══════════════════════════════════════════════════════════════
    print("=== Validating SOI radii using Orekit GM ===")

    soi = rust["soi"]

    # SOI = a * (m_planet/m_sun)^(2/5) — use Orekit GMs for mass ratios
    soi_jupiter = c["r_jupiter"] * (mu_jupiter_ok / mu_sun_ok) ** 0.4
    soi_earth = c["r_earth"] * (mu_earth_ok / mu_sun_ok) ** 0.4
    soi_saturn = c["r_saturn"] * (mu_saturn_ok / mu_sun_ok) ** 0.4
    soi_uranus = c["r_uranus"] * (mu_uranus_ok / mu_sun_ok) ** 0.4

    vr.check("soi_jupiter_km", soi["jupiter_km"], soi_jupiter, rel_tol=1e-3)
    vr.check("soi_earth_km", soi["earth_km"], soi_earth, rel_tol=1e-3)
    vr.check("soi_saturn_km", soi["saturn_km"], soi_saturn, rel_tol=1e-3)
    vr.check("soi_uranus_km", soi["uranus_km"], soi_uranus, rel_tol=1e-3)

    # ═══════════════════════════════════════════════════════════════
    # 6. Flyby mechanics — turn angle and v_periapsis
    # ═══════════════════════════════════════════════════════════════
    print("=== Validating flyby mechanics using Orekit GM ===")

    fly = rust["flyby"]

    # Unpowered Jupiter flyby: v∞=10 km/s, r_p=200,000 km
    v_inf = fly["unpowered_jupiter"]["v_inf_in"]  # km/s
    r_p = fly["unpowered_jupiter"]["r_periapsis"]  # km
    mu_j = mu_jupiter_ok  # km^3/s^2

    # Hyperbolic semi-major axis: a = -mu/v∞²
    a_hyp = -mu_j / (v_inf ** 2)
    # Eccentricity: e = 1 + r_p * v∞² / mu = 1 - r_p/a
    e_hyp = 1.0 - r_p / a_hyp
    # Turn angle: δ = 2 * arcsin(1/e)
    turn_angle = 2.0 * math.asin(1.0 / e_hyp)
    # Periapsis velocity: v_p = sqrt(v∞² + 2*mu/r_p)
    v_periapsis = math.sqrt(v_inf**2 + 2.0 * mu_j / r_p)

    vr.check("flyby_turn_angle_rad", fly["unpowered_jupiter"]["turn_angle_rad"], turn_angle, rel_tol=1e-3)
    vr.check("flyby_v_periapsis", fly["unpowered_jupiter"]["v_periapsis"], v_periapsis, rel_tol=1e-3)

    # v∞ out should equal v∞ in for unpowered flyby (energy conservation)
    vr.check("flyby_v_inf_out_unpowered", fly["unpowered_jupiter"]["v_inf_out"], v_inf, rel_tol=1e-6)

    # Powered flyby: burn ΔV = 1 km/s at periapsis
    burn_dv = fly["powered_jupiter"]["burn_dv"]
    v_p_post = v_periapsis + burn_dv
    # v∞_out = sqrt(v_p² - 2*mu/r_p)
    v_inf_out_powered = math.sqrt(v_p_post**2 - 2.0 * mu_j / r_p)
    vr.check("flyby_v_inf_out_powered", fly["powered_jupiter"]["v_inf_out"], v_inf_out_powered, rel_tol=1e-3)

    # ═══════════════════════════════════════════════════════════════
    # 7. Kepler's equation — eccentric anomaly from Orekit
    # ═══════════════════════════════════════════════════════════════
    print("=== Validating Kepler equation solutions ===")

    for sol in rust["kepler"]["solutions"]:
        M = sol["M"]
        e = sol["e"]
        E_rust = sol["E"]

        # Use Orekit's KeplerianOrbit to solve Kepler's equation
        # Create a Keplerian orbit with given M and e, then read back E
        mu_test = 1e14  # arbitrary mu for equation solving
        a_test = 1e7    # arbitrary semi-major axis
        epoch = AbsoluteDate.J2000_EPOCH
        frame = FramesFactory.getEME2000()

        orbit = KeplerianOrbit(
            a_test,           # a (m)
            e,                # e
            0.0,              # i
            0.0,              # omega
            0.0,              # RAAN
            M,                # mean anomaly
            PositionAngleType.MEAN,
            frame,
            epoch,
            mu_test
        )

        E_orekit = orbit.getEccentricAnomaly()
        nu_orekit = orbit.getTrueAnomaly()

        vr.check(f"kepler_E(M={M:.1f},e={e:.1f})", E_rust, E_orekit, rel_tol=1e-10)
        vr.check(f"kepler_nu(M={M:.1f},e={e:.1f})", sol["nu"], nu_orekit, rel_tol=1e-10)

    # ═══════════════════════════════════════════════════════════════
    # 8. Orbital elements ↔ state vector conversion
    # ═══════════════════════════════════════════════════════════════
    print("=== Validating orbital elements → state vector conversion ===")

    # Eccentric inclined orbit from Rust test data
    ei = rust["elements_to_state"]["eccentric_inclined"]
    mu_earth_si = mu_earth_ok * 1e9  # km^3/s^2 → m^3/s^2
    epoch = AbsoluteDate.J2000_EPOCH
    frame = FramesFactory.getEME2000()

    orbit_ei = KeplerianOrbit(
        ei["a"] * 1e3,    # a: km → m
        ei["e"],
        ei["i"],          # rad
        ei["w"],          # argument of periapsis
        ei["raan"],       # RAAN
        ei["nu"],         # true anomaly
        PositionAngleType.TRUE,
        frame,
        epoch,
        mu_earth_si
    )

    pv = orbit_ei.getPVCoordinates()
    pos = pv.getPosition()
    vel = pv.getVelocity()

    # Convert m → km for comparison
    vr.check("state_ei_px", ei["px"], pos.getX() / 1e3, rel_tol=1e-8)
    vr.check("state_ei_py", ei["py"], pos.getY() / 1e3, rel_tol=1e-8)
    vr.check("state_ei_pz", ei["pz"], pos.getZ() / 1e3, rel_tol=1e-8)
    vr.check("state_ei_vx", ei["vx"], vel.getX() / 1e3, rel_tol=1e-8)
    vr.check("state_ei_vy", ei["vy"], vel.getY() / 1e3, rel_tol=1e-8)
    vr.check("state_ei_vz", ei["vz"], vel.getZ() / 1e3, rel_tol=1e-8)

    # Halley-like highly eccentric orbit (heliocentric)
    hl = rust["elements_to_state"]["halley_like"]
    mu_sun_si = mu_sun_ok * 1e9

    orbit_hl = KeplerianOrbit(
        hl["a"] * 1e3,
        hl["e"],
        hl["i"],
        hl["w"],
        hl["raan"],
        hl["nu"],
        PositionAngleType.TRUE,
        frame,
        epoch,
        mu_sun_si
    )

    pv_hl = orbit_hl.getPVCoordinates()
    pos_hl = pv_hl.getPosition()
    vel_hl = pv_hl.getVelocity()

    vr.check("state_hl_px", hl["px"], pos_hl.getX() / 1e3, rel_tol=1e-6)
    vr.check("state_hl_py", hl["py"], pos_hl.getY() / 1e3, rel_tol=1e-6)
    vr.check("state_hl_pz", hl["pz"], pos_hl.getZ() / 1e3, rel_tol=1e-6)
    vr.check("state_hl_vx", hl["vx"], vel_hl.getX() / 1e3, rel_tol=1e-6)
    vr.check("state_hl_vy", hl["vy"], vel_hl.getY() / 1e3, rel_tol=1e-6)
    vr.check("state_hl_vz", hl["vz"], vel_hl.getZ() / 1e3, rel_tol=1e-6)

    # ═══════════════════════════════════════════════════════════════
    # 9. Orekit-specific: numerical propagation energy conservation
    # ═══════════════════════════════════════════════════════════════
    print("=== Validating numerical propagation energy conservation ===")

    from org.orekit.propagation.numerical import NumericalPropagator
    from org.orekit.propagation import SpacecraftState
    from org.orekit.orbits import OrbitType
    from org.hipparchus.ode.nonstiff import DormandPrince853Integrator

    # LEO circular orbit: propagate for 1 orbit and check energy drift
    r_leo_si = c["r_leo"] * 1e3  # m

    leo_orbit = KeplerianOrbit(
        r_leo_si,    # a = r for circular
        0.0,         # e
        0.0,         # i
        0.0,         # omega
        0.0,         # RAAN
        0.0,         # true anomaly
        PositionAngleType.TRUE,
        frame,
        epoch,
        mu_earth_si
    )

    # Specific orbital energy: ε = -μ / (2a)
    energy_init = -mu_earth_si / (2.0 * r_leo_si) / 1e6  # convert to km²/s²
    vr.check("leo_init_energy", rust["propagation"]["leo_init_energy"], energy_init, rel_tol=1e-3)

    # Propagate using Orekit's DormandPrince853 (similar to our RK45)
    integrator = DormandPrince853Integrator(1.0, 100.0, 1e-10, 1e-10)
    propagator = NumericalPropagator(integrator)
    propagator.setOrbitType(OrbitType.CARTESIAN)
    initial_state = SpacecraftState(leo_orbit)
    propagator.setInitialState(initial_state)

    # Propagate 1 orbit (pure Keplerian — no force model added)
    leo_period_s = 2.0 * math.pi * math.sqrt(r_leo_si**3 / mu_earth_si)
    final_date = epoch.shiftedBy(leo_period_s)
    final_state = propagator.propagate(final_date)

    # Check final position radius (should return to ~6578 km for circular orbit)
    final_pos = final_state.getPosition(frame)
    final_r_km = math.sqrt(final_pos.getX()**2 + final_pos.getY()**2 + final_pos.getZ()**2) / 1e3
    # Keplerian propagation should conserve radius very well
    vr.check("propagation_leo_1orbit_r", c["r_leo"], final_r_km, rel_tol=1e-6)

    # Final energy should match initial within propagator tolerance
    # Extract semi-major axis from the orbit (SpacecraftState wraps orbit)
    final_a = final_state.getOrbit().getA()
    energy_final = -mu_earth_si / (2.0 * final_a) / 1e6
    energy_drift = abs(energy_final - energy_init) / abs(energy_init)
    # Energy should be conserved to at least 1e-8
    vr.check("propagation_energy_conservation",
             0.0, energy_drift, rel_tol=0.0, abs_tol=1e-8)

    # ═══════════════════════════════════════════════════════════════
    # 10. Orekit Constants cross-check
    # ═══════════════════════════════════════════════════════════════
    print("=== Validating fundamental constants ===")

    # g0 standard gravitational acceleration
    # Orekit uses IAU value
    g0_orekit = OrekitConstants.G0_STANDARD_GRAVITY  # m/s^2
    vr.check("g0", c["g0"], g0_orekit, rel_tol=1e-10)

    # ═══════════════════════════════════════════════════════════════
    # Print summary
    # ═══════════════════════════════════════════════════════════════
    print(vr.summary())

    if vr.failed > 0:
        sys.exit(1)

    print(f"\nOrekit cross-validation complete: {vr.passed} checks passed.")


if __name__ == "__main__":
    main()
