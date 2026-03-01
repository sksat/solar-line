/**
 * Tests for Episode 2 analysis: Jupiter Escape → Saturn (Enceladus).
 *
 * These tests verify the orbital mechanics calculations for Episode 2
 * and ensure the analysis produces physically meaningful results.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hohmannBaseline,
  jupiterEscapeAnalysis,
  brachistochroneRequirements,
  saturnCaptureAnalysis,
  enceladusOrbitalInfo,
  heliocentricTransferOrbit,
  saturnArrivalVInf,
  additionalDvToReachSaturn,
  maxFeasibleMass,
  minimumTransferTime,
  damagedThrustScenarios,
  analyzeEpisode2,
  arrivalVelocityConsistencyAnalysis,
  EP02_PARAMS,
  JS_DISTANCE_SCENARIOS,
  distanceInAU,
} from "./ep02-analysis.ts";
import {
  escapeVelocity,
  circularVelocity,
  hyperbolicExcess,
  MU,
  ORBIT_RADIUS,
  JUPITER_RADIUS,
  ENCELADUS_ORBIT_RADIUS,
} from "./orbital.ts";

describe("orbital.ts new functions", () => {
  it("escapeVelocity: Earth surface ≈ 11.2 km/s", () => {
    const vEsc = escapeVelocity(MU.EARTH, 6371);
    assert.ok(
      Math.abs(vEsc - 11.2) < 0.2,
      `v_esc=${vEsc}, expected ~11.2`,
    );
  });

  it("circularVelocity: Earth at 1 AU ≈ 29.8 km/s", () => {
    const v = circularVelocity(MU.SUN, 149_597_870.7);
    assert.ok(
      Math.abs(v - 29.78) < 0.2,
      `v_circ=${v}, expected ~29.78`,
    );
  });

  it("hyperbolicExcess: v > v_esc gives positive result", () => {
    const vInf = hyperbolicExcess(13.0, 11.2);
    // sqrt(13² - 11.2²) = sqrt(169 - 125.44) = sqrt(43.56) ≈ 6.6
    assert.ok(
      Math.abs(vInf - 6.6) < 0.1,
      `v_inf=${vInf}, expected ~6.6`,
    );
  });

  it("hyperbolicExcess: v < v_esc returns 0", () => {
    const vInf = hyperbolicExcess(5.0, 11.2);
    assert.equal(vInf, 0);
  });

  it("MU.SATURN is defined", () => {
    assert.ok(MU.SATURN > 3e7 && MU.SATURN < 4e7);
  });

  it("ORBIT_RADIUS.SATURN ≈ 1.43 billion km", () => {
    assert.ok(
      ORBIT_RADIUS.SATURN > 1.4e9 && ORBIT_RADIUS.SATURN < 1.5e9,
    );
  });

  it("ORBIT_RADIUS.URANUS ≈ 2.87 billion km", () => {
    assert.ok(
      ORBIT_RADIUS.URANUS > 2.8e9 && ORBIT_RADIUS.URANUS < 3e9,
    );
  });

  it("ENCELADUS_ORBIT_RADIUS ≈ 238,000 km", () => {
    assert.ok(
      ENCELADUS_ORBIT_RADIUS > 230_000 && ENCELADUS_ORBIT_RADIUS < 250_000,
    );
  });
});

describe("Episode 2: Hohmann baseline Jupiter→Saturn", () => {
  it("total ΔV ≈ 3.4 km/s", () => {
    const h = hohmannBaseline();
    assert.ok(
      h.totalDv > 2.5 && h.totalDv < 4.5,
      `totalDv=${h.totalDv}, expected ~3.4 km/s`,
    );
  });

  it("transfer time ≈ 10 years", () => {
    const h = hohmannBaseline();
    assert.ok(
      h.transferTimeYears > 8 && h.transferTimeYears < 12,
      `years=${h.transferTimeYears}, expected ~10`,
    );
  });

  it("departure ΔV > arrival ΔV (inner to outer)", () => {
    const h = hohmannBaseline();
    assert.ok(h.departureDv > h.arrivalDv);
  });
});

describe("Episode 2: Jupiter escape analysis", () => {
  it("escape velocity at 50 RJ ≈ 8.4 km/s", () => {
    const esc = jupiterEscapeAnalysis();
    assert.ok(
      Math.abs(esc.escapeVelocityKms - 8.42) < 0.2,
      `v_esc=${esc.escapeVelocityKms}, expected ~8.42`,
    );
  });

  it("10.3 km/s at 50 RJ is unbound (exceeds escape velocity)", () => {
    const esc = jupiterEscapeAnalysis();
    assert.equal(esc.isUnbound, true);
  });

  it("hyperbolic excess ≈ 5.9 km/s", () => {
    const esc = jupiterEscapeAnalysis();
    assert.ok(
      Math.abs(esc.hyperbolicExcessKms - 5.9) < 0.5,
      `v_inf=${esc.hyperbolicExcessKms}, expected ~5.9`,
    );
  });

  it("altitude is 50 RJ = ~3,574,600 km", () => {
    const esc = jupiterEscapeAnalysis();
    assert.ok(
      Math.abs(esc.altitudeKm - 3_574_600) < 1000,
      `altitude=${esc.altitudeKm}`,
    );
  });

  it("Jupiter orbital velocity ≈ 13.1 km/s", () => {
    const esc = jupiterEscapeAnalysis();
    assert.ok(
      Math.abs(esc.jupiterOrbitalVKms - 13.07) < 0.2,
      `v_J=${esc.jupiterOrbitalVKms}, expected ~13.07`,
    );
  });
});

describe("Episode 2: heliocentric transfer orbit", () => {
  it("with v_inf ≈ 5.9 km/s prograde, orbit is solar-hyperbolic", () => {
    // v_J (~13.06) + v_inf (~5.9) = ~18.96 > v_esc_sun (~18.47)
    // So the ship is actually escaping the solar system!
    const esc = jupiterEscapeAnalysis();
    const t = heliocentricTransferOrbit(esc.hyperbolicExcessKms);
    assert.equal(t.isHyperbolic, true);
    assert.equal(t.reachesSaturn, true);
  });

  it("solar escape velocity at Jupiter ≈ 18.5 km/s", () => {
    const t = heliocentricTransferOrbit(5.9);
    assert.ok(
      Math.abs(t.vEscSunKms - 18.47) < 0.2,
      `v_esc_sun=${t.vEscSunKms}, expected ~18.47`,
    );
  });

  it("with small v_inf (3 km/s), orbit is elliptic and may not reach Saturn", () => {
    const t = heliocentricTransferOrbit(3);
    // v_J + 3 = ~16.06 < v_esc_sun (~18.47), so elliptic
    assert.equal(t.isHyperbolic, false);
  });

  it("hyperbolic orbit has positive solar v_inf", () => {
    const t = heliocentricTransferOrbit(5.9);
    if (t.isHyperbolic) {
      assert.ok(t.solarVInfKms > 0);
    }
  });
});

describe("Episode 2: Saturn capture", () => {
  it("capture at Enceladus orbit requires ΔV > 0", () => {
    const cap = saturnCaptureAnalysis(5.0);
    assert.ok(cap.dvCircularCaptureKms > 0);
    assert.ok(cap.dvMinCaptureKms > 0);
  });

  it("higher v_inf requires more ΔV to capture", () => {
    const cap1 = saturnCaptureAnalysis(3.0);
    const cap2 = saturnCaptureAnalysis(6.0);
    assert.ok(cap2.dvCircularCaptureKms > cap1.dvCircularCaptureKms);
  });

  it("escape velocity at Enceladus orbit is reasonable", () => {
    const cap = saturnCaptureAnalysis(5.0);
    // v_esc at ~238,000 km from Saturn should be ~17-18 km/s
    assert.ok(
      cap.vEscAtCaptureKms > 15 && cap.vEscAtCaptureKms < 20,
      `v_esc=${cap.vEscAtCaptureKms}`,
    );
  });
});

describe("Episode 2: Enceladus orbital info", () => {
  it("orbital period ≈ 33 hours (1.37 days)", () => {
    const info = enceladusOrbitalInfo();
    assert.ok(
      Math.abs(info.orbitalPeriodHours - 33) < 2,
      `period=${info.orbitalPeriodHours}h, expected ~33`,
    );
  });

  it("orbital velocity ≈ 12.6 km/s", () => {
    const info = enceladusOrbitalInfo();
    assert.ok(
      Math.abs(info.orbitalVelocityKms - 12.6) < 1,
      `v=${info.orbitalVelocityKms}, expected ~12.6`,
    );
  });
});

describe("Episode 2: brachistochrone J→S requirements", () => {
  it("30-day transfer at closest distance requires measurable acceleration", () => {
    const reqs = brachistochroneRequirements(30 * 86400);
    const closest = reqs.find((r) => r.scenario === "closest")!;
    // J-S closest ~655M km in 30 days: a = 4d/t² ≈ 0.39 m/s² ≈ 0.04g
    assert.ok(closest.accelMs2 > 0.1, `accel=${closest.accelMs2} m/s², expected > 0.1`);
  });

  it("closest distance ≈ 4.4 AU", () => {
    const distAU = distanceInAU(JS_DISTANCE_SCENARIOS.closest);
    assert.ok(
      Math.abs(distAU - 4.38) < 0.5,
      `dist=${distAU} AU, expected ~4.38`,
    );
  });

  it("farthest distance ≈ 14.8 AU", () => {
    const distAU = distanceInAU(JS_DISTANCE_SCENARIOS.farthest);
    assert.ok(
      Math.abs(distAU - 14.79) < 0.5,
      `dist=${distAU} AU, expected ~14.79`,
    );
  });
});

describe("Episode 2: damaged thrust scenarios", () => {
  it("returns 4 thrust levels", () => {
    const scenarios = damagedThrustScenarios();
    assert.equal(scenarios.length, 4);
  });

  it("lower thrust means longer minimum transfer time", () => {
    const scenarios = damagedThrustScenarios();
    for (let i = 1; i < scenarios.length; i++) {
      assert.ok(
        scenarios[i].minTimeClosestDays > scenarios[i - 1].minTimeClosestDays,
        `${scenarios[i].label} should take longer than ${scenarios[i - 1].label}`,
      );
    }
  });

  it("trim-only thrust takes over a month", () => {
    const scenarios = damagedThrustScenarios();
    const trimOnly = scenarios[scenarios.length - 1];
    // At 300t with 1% thrust (98 kN): a ≈ 0.33 m/s², ~33 days for closest
    assert.ok(
      trimOnly.minTimeClosestDays > 20,
      `trim-only takes ${trimOnly.minTimeClosestDays} days, expected > 20`,
    );
  });
});

describe("Episode 2: boundary analysis", () => {
  it("maxFeasibleMass: closest approach, 30 days", () => {
    const result = maxFeasibleMass(
      JS_DISTANCE_SCENARIOS.closest,
      30 * 86400,
    );
    // Large mass is feasible because J-S closest is ~655M km and 30 days is generous
    assert.ok(result.maxMassT > 0, `maxMassT=${result.maxMassT}`);
  });

  it("minimumTransferTime: 300t ship, closest approach", () => {
    const result = minimumTransferTime(
      JS_DISTANCE_SCENARIOS.closest,
      300_000,
    );
    // 300t with 9.8 MN: a ≈ 32.7 m/s², ~3.3 days for ~655M km
    assert.ok(
      result.timeDays > 1 && result.timeDays < 30,
      `timeDays=${result.timeDays}`,
    );
  });
});

describe("Episode 2: full analysis", () => {
  it("analyzeEpisode2 returns all sections", () => {
    const result = analyzeEpisode2();
    assert.ok(result.hohmann);
    assert.ok(result.jupiterEscape);
    assert.ok(result.heliocentricTransfer);
    assert.ok(result.saturnArrivalVInf);
    assert.ok(result.additionalDvNeeded);
    assert.ok(result.enceladusInfo);
    assert.ok(result.brachistochrone30d);
    assert.ok(result.brachistochrone90d);
    assert.ok(result.damagedThrust);
  });

  it("Jupiter escape confirms 10.3 km/s is unbound", () => {
    const result = analyzeEpisode2();
    assert.equal(result.jupiterEscape.isUnbound, true);
  });

  it("arrival consistency analysis is included", () => {
    const result = analyzeEpisode2();
    assert.ok(result.arrivalConsistency);
    assert.ok(result.arrivalConsistency.progradeOnly);
    assert.ok(result.arrivalConsistency.ballistic);
    assert.ok(result.arrivalConsistency.allTwoPhase.length > 0);
  });
});

describe("Episode 2: arrival velocity consistency", () => {
  it("prograde-only 3-day model has v∞ >> 10 km/s (uncapturable without further burns)", () => {
    const result = arrivalVelocityConsistencyAnalysis();
    assert.ok(result.progradeOnly, "prograde-only result should exist");
    assert.ok(result.progradeOnly!.vInfKms > 50,
      `prograde v∞ should be >> 50 km/s, got ${result.progradeOnly!.vInfKms.toFixed(1)}`);
    assert.ok(result.progradeOnly!.captureDeltaVKms > 30,
      "capture ΔV should be very high for prograde-only");
  });

  it("ballistic has moderate v∞ ≈ 9 km/s (natural from Jupiter escape state)", () => {
    const result = arrivalVelocityConsistencyAnalysis();
    assert.ok(result.ballistic);
    assert.ok(result.ballistic!.vInfKms > 5 && result.ballistic!.vInfKms < 15,
      `ballistic v∞ should be 5-15 km/s, got ${result.ballistic!.vInfKms.toFixed(1)}`);
    assert.ok(result.ballistic!.captureDeltaVKms < 5,
      "ballistic capture ΔV should be manageable");
  });

  it("balanced two-phase (1.5d+1.5d) reduces v∞ to ~10 km/s", () => {
    const result = arrivalVelocityConsistencyAnalysis();
    const balanced = result.allTwoPhase.find(
      (r) => r.accelDays === 1.5 && r.decelDays === 1.5
    );
    assert.ok(balanced, "1.5d+1.5d scenario should exist");
    assert.ok(balanced!.vInfAtSaturnKms < 15,
      `balanced v∞ should be < 15 km/s, got ${balanced!.vInfAtSaturnKms.toFixed(1)}`);
    assert.ok(balanced!.captureMinDeltaVKms < 5,
      "capture ΔV should be < 5 km/s for balanced scenario");
  });

  it("3d+3d two-phase achieves ~107 day transit with moderate v∞", () => {
    const result = arrivalVelocityConsistencyAnalysis();
    const accel3decel3 = result.allTwoPhase.find(
      (r) => r.accelDays === 3 && r.decelDays === 3
    );
    assert.ok(accel3decel3, "3d+3d scenario should exist");
    assert.ok(accel3decel3!.transferDays > 90 && accel3decel3!.transferDays < 130,
      `3d+3d transit should be ~107 days, got ${accel3decel3!.transferDays.toFixed(0)}`);
    assert.ok(accel3decel3!.vInfAtSaturnKms < 15,
      `3d+3d v∞ should be moderate, got ${accel3decel3!.vInfAtSaturnKms.toFixed(1)}`);
  });

  it("extended two-phase scenarios include higher thrust budgets (5d+5d, 7d+7d)", () => {
    const result = arrivalVelocityConsistencyAnalysis();
    const s5 = result.allTwoPhase.find(r => r.accelDays === 5 && r.decelDays === 5);
    const s7 = result.allTwoPhase.find(r => r.accelDays === 7 && r.decelDays === 7);
    assert.ok(s5, "5d+5d scenario should exist");
    assert.ok(s7, "7d+7d scenario should exist");
    // All balanced two-phase scenarios should have capturable v∞ (~10 km/s)
    assert.ok(s5!.vInfAtSaturnKms < 15,
      `5d+5d v∞ should be moderate, got ${s5!.vInfAtSaturnKms.toFixed(1)}`);
    assert.ok(s7!.vInfAtSaturnKms < 15,
      `7d+7d v∞ should be moderate, got ${s7!.vInfAtSaturnKms.toFixed(1)}`);
    // 3d+3d is the optimal balanced split — more thrust days don't help because
    // extra deceleration extends coast time more than extra acceleration shortens it
    assert.ok(s5!.transferDays > 100,
      `5d+5d should be ~113 days (not shorter than 3d+3d), got ${s5!.transferDays.toFixed(0)}`);
  });

  it("propellant fraction is negligible at Isp=10⁶ s for all scenarios", () => {
    const result = arrivalVelocityConsistencyAnalysis();
    for (const s of result.allTwoPhase) {
      assert.ok(s.totalWithCapturePropFraction < 0.10,
        `propellant should be < 10%, got ${(s.totalWithCapturePropFraction * 100).toFixed(1)}% ` +
        `for ${s.accelDays}d+${s.decelDays}d`);
    }
  });

  it("summary describes the v∞ inconsistency resolution", () => {
    const result = arrivalVelocityConsistencyAnalysis();
    assert.ok(result.summary.includes("トリムのみ"));
    assert.ok(result.summary.includes("v∞"));
    assert.ok(result.summary.includes("Isp"));
  });
});
