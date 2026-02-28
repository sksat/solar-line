#!/usr/bin/env python3
"""
Cross-validation of EP02 trim-thrust transfer analysis.

Independent scipy implementation of the same 2D heliocentric orbit
propagation with low thrust, comparing against the TypeScript RK4 results.

The TS implementation uses fixed-step RK4 (dt=60s thrust, dt=600s coast).
This script uses scipy's solve_ivp with DOP853 adaptive integrator.

Strategy: Use the TS-computed optimal thrust angles and validate that the
same initial conditions produce the same transfer times with an independent
integrator. This validates the propagation (the critical piece) without
re-running the angle optimization (which is a discrete scan, not integrator-
dependent).

Usage: python3 cross_validation/validate_trim_thrust.py
"""

import math
import sys

import numpy as np
from scipy.integrate import solve_ivp

# ═══════════════════════════════════════════════════════════════════════
# Constants (same values as TypeScript implementation)
# ═══════════════════════════════════════════════════════════════════════

MU_SUN = 1.32712440041e11       # km³/s²  (NASA JPL DE440/441)
MU_JUPITER = 1.26686534e8       # km³/s²
JUPITER_RADIUS = 71492          # km
R_JUPITER = 778_570_000         # km  (heliocentric orbit radius)
R_SATURN = 1_433_530_000        # km  (heliocentric orbit radius)
G0 = 9.80665                    # m/s²

# Ship parameters
THRUST_N = 98_000       # 1% of 9.8 MN
MASS_KG = 300_000       # EP01-derived feasible mass
ISP_S = 1_000_000       # specific impulse
ACCEL_KMS2 = THRUST_N / MASS_KG / 1000  # km/s²

# Jupiter escape: v = 10.3 km/s at 50 RJ
V_JUPITER_KMS = 10.3
ALT_KM = 50 * JUPITER_RADIUS
V_ESC = math.sqrt(2 * MU_JUPITER / ALT_KM)
V_INF = math.sqrt(V_JUPITER_KMS**2 - V_ESC**2)

# Orbital velocities
V_JUPITER_ORB = math.sqrt(MU_SUN / R_JUPITER)  # ~13.056 km/s
V_SATURN_ORB = math.sqrt(MU_SUN / R_SATURN)    # ~9.622 km/s


def simulate_trim_transfer(
    thrust_days: float,
    alpha_deg: float,
    beta_deg: float,
    max_days: float = 500,
) -> dict | None:
    """
    Simulate a 2D heliocentric trim-thrust transfer from Jupiter to Saturn.

    Uses scipy's solve_ivp with DOP853 adaptive integrator as an independent
    reference implementation.

    State: [x, y, vx, vy] in km, km/s.
    Ship starts at Jupiter's orbital radius on +x axis.
    Jupiter moves in +y direction (tangential).
    """
    alpha = math.radians(alpha_deg)
    beta = math.radians(beta_deg)
    thrust_sec = thrust_days * 86400
    max_sec = max_days * 86400

    # Initial state: ship at Jupiter orbit, prograde is +y
    y0_state = [
        R_JUPITER,                                   # x
        0.0,                                         # y
        V_INF * math.sin(alpha),                     # vx (radial)
        V_JUPITER_ORB + V_INF * math.cos(alpha),     # vy (tangential)
    ]

    def derivatives(t, state):
        x, y, vx, vy = state
        r = math.sqrt(x * x + y * y)
        r3 = r ** 3

        # Gravity
        ax = -MU_SUN * x / r3
        ay = -MU_SUN * y / r3

        # Thrust (if still in thrust phase)
        if t < thrust_sec:
            r_hat_x, r_hat_y = x / r, y / r
            t_hat_x, t_hat_y = -r_hat_y, r_hat_x
            cos_b, sin_b = math.cos(beta), math.sin(beta)
            ax += ACCEL_KMS2 * (cos_b * t_hat_x + sin_b * r_hat_x)
            ay += ACCEL_KMS2 * (cos_b * t_hat_y + sin_b * r_hat_y)

        return [vx, vy, ax, ay]

    def saturn_crossing(t, state):
        return math.sqrt(state[0]**2 + state[1]**2) - R_SATURN

    saturn_crossing.terminal = True
    saturn_crossing.direction = 1  # Only detect outward crossing

    sol = solve_ivp(
        derivatives,
        [0, max_sec],
        y0_state,
        method="DOP853",
        events=[saturn_crossing],
        rtol=1e-10,
        atol=1e-12,
        max_step=3600,  # 1-hour max step (larger than TS for speed)
    )

    if sol.t_events[0].size > 0:
        t_cross = sol.t_events[0][0]
        state_cross = sol.y_events[0][0]
        return {
            "transferDays": t_cross / 86400,
            "arrivalState": list(state_cross),
        }

    return None


def compute_arrival_quantities(arrival_state):
    """Compute arrival speed, radial/tangential components, v_inf."""
    x, y, vx, vy = arrival_state
    r = math.sqrt(x * x + y * y)
    speed = math.sqrt(vx * vx + vy * vy)
    r_hat = [x / r, y / r]
    vr = vx * r_hat[0] + vy * r_hat[1]
    vt = -vx * r_hat[1] + vy * r_hat[0]
    v_inf = math.sqrt(vr**2 + (vt - V_SATURN_ORB)**2)
    return speed, vr, vt, v_inf


# ═══════════════════════════════════════════════════════════════════════
# TypeScript reference values (from trimThrustTransferAnalysis())
# Using TS-computed optimal thrust angles for each scenario.
# ═══════════════════════════════════════════════════════════════════════

TS_RESULTS = [
    {"thrustDays": 0, "transferDays": 996.819, "deltaVKms": 0,
     "arrivalSpeedKms": 13.465, "vInfAtSaturnKms": 9.211,
     "thrustAngleDeg": 0, "maxDays": 1500},
    {"thrustDays": 1, "transferDays": 225.764, "deltaVKms": 28.224,
     "arrivalSpeedKms": 39.253, "vInfAtSaturnKms": 36.455,
     "thrustAngleDeg": 67, "maxDays": 500},
    {"thrustDays": 3, "transferDays": 86.806, "deltaVKms": 84.672,
     "arrivalSpeedKms": 91.584, "vInfAtSaturnKms": 90.246,
     "thrustAngleDeg": 80.5, "maxDays": 500},
    {"thrustDays": 5, "transferDays": 54.764, "deltaVKms": 141.120,
     "arrivalSpeedKms": 146.732, "vInfAtSaturnKms": 145.868,
     "thrustAngleDeg": 84, "maxDays": 500},
    {"thrustDays": 7, "transferDays": 41.125, "deltaVKms": 197.568,
     "arrivalSpeedKms": 202.450, "vInfAtSaturnKms": 201.846,
     "thrustAngleDeg": 86, "maxDays": 500},
]


def main():
    print("=" * 70)
    print("EP02 Trim-Thrust Transfer Cross-Validation")
    print("TypeScript RK4 (fixed-step) vs Python scipy DOP853 (adaptive)")
    print("=" * 70)
    print()

    # Verify initial conditions
    print(f"  V_INF (Jupiter escape):   {V_INF:.6f} km/s")
    print(f"  Jupiter orbital V:        {V_JUPITER_ORB:.6f} km/s")
    print(f"  Saturn orbital V:         {V_SATURN_ORB:.6f} km/s")
    print(f"  Trim thrust accel:        {ACCEL_KMS2:.10f} km/s²")
    print(f"  Thrust:                   {THRUST_N} N, Mass: {MASS_KG} kg")
    print()

    failures = 0
    total = 0

    for ts_ref in TS_RESULTS:
        td = ts_ref["thrustDays"]
        ts_beta = ts_ref["thrustAngleDeg"]
        ts_transfer_days = ts_ref["transferDays"]
        ts_speed = ts_ref["arrivalSpeedKms"]
        ts_v_inf = ts_ref["vInfAtSaturnKms"]
        max_days = ts_ref["maxDays"]
        total += 1

        print(f"--- {td}-day thrust (beta={ts_beta}°) ---")

        # Simulate with same angle as TS
        result = simulate_trim_transfer(td, 32, ts_beta, max_days)

        if result is None:
            print("  FAIL: transfer did not reach Saturn")
            failures += 1
            continue

        py_transfer_days = result["transferDays"]
        speed, vr, vt, v_inf = compute_arrival_quantities(result["arrivalState"])

        # Report
        rel_err_time = abs(py_transfer_days - ts_transfer_days) / ts_transfer_days
        rel_err_vinf = abs(v_inf - ts_v_inf) / max(ts_v_inf, 0.01)
        rel_err_speed = abs(speed - ts_speed) / max(ts_speed, 0.01)

        print(f"  Transfer time:  TS={ts_transfer_days:.3f}d  Python={py_transfer_days:.3f}d  "
              f"diff={abs(py_transfer_days - ts_transfer_days):.4f}d  "
              f"({rel_err_time * 100:.4f}%)")
        print(f"  Arrival speed:  TS={ts_speed:.3f}  Python={speed:.3f} km/s  "
              f"({rel_err_speed * 100:.4f}%)")
        print(f"  v_inf@Saturn:   TS={ts_v_inf:.3f}  Python={v_inf:.3f} km/s  "
              f"({rel_err_vinf * 100:.4f}%)")

        # Assertions — transfer time within 1%
        ok = True
        if rel_err_time > 0.01:
            print(f"  FAIL: transfer time relative error {rel_err_time:.6f} > 1%")
            failures += 1
            ok = False

        # Arrival speed within 1%
        if rel_err_speed > 0.01:
            print(f"  FAIL: arrival speed relative error {rel_err_speed:.6f} > 1%")
            failures += 1
            ok = False

        # v_inf within 2% (more sensitive to exact crossing position)
        if rel_err_vinf > 0.02:
            print(f"  FAIL: v_inf relative error {rel_err_vinf:.6f} > 2%")
            failures += 1
            ok = False

        if ok:
            print(f"  OK")
        print()

    # Final summary
    print("=" * 70)
    if failures == 0:
        print(f"ALL {total} scenarios PASS — TS RK4 and Python DOP853 agree")
        print("The EP02 trim-thrust analysis (455→87 day correction) is validated.")
    else:
        print(f"FAILURES: {failures}/{total} scenarios failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
