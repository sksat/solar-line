/**
 * Per-analysis reproduction tests (Task 133).
 *
 * Each test pins the exact output of a specific orbital mechanics analysis.
 * When preconditions change (constants, formulas, parameters), these tests
 * fail — signaling that the analysis must be re-examined, not just the test
 * updated. Think of them as "golden file" tests for analysis results.
 *
 * Tolerance: 1e-6 relative error for floating-point comparisons.
 * This catches genuine calculation changes while tolerating platform-level
 * floating-point variation.
 *
 * Reproduction: npm run test:analyses
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { analyzeEpisode1 } from "./ep01-analysis.ts";
import { analyzeEpisode2 } from "./ep02-analysis.ts";
import { analyzeEpisode3 } from "./ep03-analysis.ts";
import { analyzeEpisode4 } from "./ep04-analysis.ts";
import { analyzeEpisode5 } from "./ep05-analysis.ts";
import { analyzeRelativisticEffects } from "./relativistic-analysis.ts";
import {
  KESTREL,
  C_KMS,
  EXHAUST_VELOCITY_KMS,
  THRUST_MN,
  DAMAGED_THRUST_MN,
  NOMINAL_MASS_T,
} from "./kestrel.ts";

// --- Helpers ---

/** Assert that actual ≈ expected within relative tolerance. */
function assertClose(actual: number, expected: number, label: string, relTol = 1e-6): void {
  if (expected === 0) {
    assert.ok(Math.abs(actual) < 1e-12, `${label}: expected 0, got ${actual}`);
    return;
  }
  const relErr = Math.abs((actual - expected) / expected);
  assert.ok(
    relErr < relTol,
    `${label}: expected ${expected}, got ${actual} (relErr=${relErr.toExponential(3)})`,
  );
}

// ============================================================
// EP01: Mars → Ganymede
// ============================================================

describe("EP01 reproduction: Hohmann baseline Mars→Jupiter", () => {
  const r = analyzeEpisode1();
  const h = r.hohmann;

  it("departure ΔV = 5.8830 km/s", () => {
    assertClose(h.departureDv, 5.883049112579144, "departureDv");
  });

  it("arrival ΔV = 4.2693 km/s", () => {
    assertClose(h.arrivalDv, 4.269269453120785, "arrivalDv");
  });

  it("total ΔV = 10.1523 km/s", () => {
    assertClose(h.totalDv, 10.152318565699929, "totalDv");
  });

  it("transfer time = 1126.84 days", () => {
    assertClose(h.transferTimeDays, 1126.8391906198874, "transferTimeDays");
  });
});

describe("EP01 reproduction: 72h brachistochrone Mars→Ganymede", () => {
  const r = analyzeEpisode1();
  const b = r.brachistochrone72h;

  it("closest: accel = 32.783 m/s², ΔV = 8497.4 km/s", () => {
    assertClose(b[0].accelMs2, 32.78313614540466, "closest.accelMs2");
    assertClose(b[0].deltaVKms, 8497.388888888889, "closest.deltaVKms");
    assertClose(b[0].distanceKm, 550630800, "closest.distanceKm");
  });

  it("mid: accel = 48.300 m/s², ΔV = 12519.3 km/s", () => {
    assertClose(b[1].accelMs2, 48.29976568920827, "mid.accelMs2");
    assertClose(b[1].deltaVKms, 12519.299266642784, "mid.deltaVKms");
  });

  it("farthest: accel = 59.925 m/s², ΔV = 15532.5 km/s", () => {
    assertClose(b[2].accelMs2, 59.92495903825636, "farthest.accelMs2");
    assertClose(b[2].deltaVKms, 15532.54938271605, "farthest.deltaVKms");
  });
});

describe("EP01 reproduction: mass boundary ≤299t", () => {
  const r = analyzeEpisode1();
  const mb = r.boundaries.massBoundary72h;

  it("max mass = 298.93 t for 72h at closest approach", () => {
    assertClose(mb.maxMassKg, 298934.18239589944, "maxMassKg");
    assertClose(mb.maxMassT, 298.9341823958994, "maxMassT");
  });

  it("required accel = 32.783 m/s² (3.34g)", () => {
    assertClose(mb.aReqMs2, 32.78313614540466, "aReqMs2");
    assertClose(mb.aReqG, 3.3429495439731878, "aReqG");
  });
});

describe("EP01 reproduction: ship acceleration at canonical mass", () => {
  const r = analyzeEpisode1();
  const s = r.shipAcceleration;

  it("normal accel = 0.2042 m/s² (0.0208g)", () => {
    assertClose(s.accelNormalMs2, 0.20416666666666666, "accelNormalMs2");
    assertClose(s.accelNormalG, 0.020819206014966035, "accelNormalG");
  });

  it("ΔV in 72h = 52.92 km/s", () => {
    assertClose(s.dvNormal72hKms, 52.92, "dvNormal72hKms");
  });
});

describe("EP01 reproduction: minimum transfer time", () => {
  const r = analyzeEpisode1();

  it("at 48,000t: min time = 912.36 h (38.0 days)", () => {
    assertClose(r.boundaries.minTimeAtCanonicalMass.timeHours, 912.3580869985011, "timeHours");
    assertClose(r.boundaries.minTimeAtCanonicalMass.timeDays, 38.01492029160421, "timeDays");
  });

  it("at 299t: min time = 72.008 h (confirms boundary)", () => {
    assertClose(r.boundaries.minTimeAt299t.timeHours, 72.00792583611859, "timeHours");
  });
});

describe("EP01 reproduction: 150h brachistochrone (normal route)", () => {
  const r = analyzeEpisode1();
  const b150 = r.brachistochrone150h;

  it("closest: accel = 7.553 m/s² (0.770g), ΔV = 4078.7 km/s", () => {
    assertClose(b150[0].accelMs2, 7.553234567901234, "closestAccel");
    assertClose(b150[0].accelG, 0.7702155749314226, "closestAccelG");
    assertClose(b150[0].deltaVKms, 4078.7466666666664, "closestDeltaV");
  });

  it("farthest: accel = 13.807 m/s² (1.408g), ΔV = 7455.6 km/s", () => {
    assertClose(b150[2].accelMs2, 13.806710562414265, "farthestAccel");
    assertClose(b150[2].accelG, 1.4078926608387436, "farthestAccelG");
    assertClose(b150[2].deltaVKms, 7455.6237037037035, "farthestDeltaV");
  });

  it("all 3 scenarios use same distances as 72h brachistochrone", () => {
    const b72 = r.brachistochrone72h;
    for (let i = 0; i < 3; i++) {
      assertClose(b150[i].distanceKm, b72[i].distanceKm, `scenario ${i} distance`);
    }
  });
});

describe("EP01 reproduction: reachable distance at canonical mass", () => {
  const r = analyzeEpisode1();
  const reach = r.reachableWithShipThrust;

  it("48,000t in 72h reaches only 3,429 km (0.023 AU)", () => {
    assertClose(reach.distanceKm, 3429215.9999999995, "distanceKm");
    assertClose(reach.distanceAU, 0.02292289311307691, "distanceAU");
  });

  it("reachable distance is ~161x less than Mars→Ganymede", () => {
    const marsGanymedeKm = r.brachistochrone72h[0].distanceKm;
    const ratio = marsGanymedeKm / reach.distanceKm;
    assert.ok(ratio > 160, `ratio ${ratio.toFixed(1)} should be > 160`);
    assert.ok(ratio < 162, `ratio ${ratio.toFixed(1)} should be < 162`);
  });
});

describe("EP01 reproduction: mass sensitivity", () => {
  const r = analyzeEpisode1();
  const ms = r.massSensitivity;

  it("4 mass scenarios computed", () => {
    assert.equal(ms.length, 4);
    assert.equal(ms[0].massKg, 48_000_000);
    assert.equal(ms[1].massKg, 4_800_000);
    assert.equal(ms[2].massKg, 480_000);
    assert.equal(ms[3].massKg, 48_000);
  });

  it("480t: accel ~2.08g, reachable 2.29 AU (covers Mars→Ganymede)", () => {
    assertClose(ms[2].accelNormalG, 2.081920601496604, "480t accelG");
    assertClose(ms[2].reachable72h.distanceAU, 2.292289311307691, "480t reachable AU");
  });

  it("48t: accel ~20.8g, reachable 22.9 AU (far exceeds distance)", () => {
    assertClose(ms[3].accelNormalG, 20.819206014966035, "48t accelG");
    assertClose(ms[3].reachable72h.distanceAU, 22.92289311307691, "48t reachable AU");
  });
});

describe("EP01 reproduction: thrust boundary at 48,000t", () => {
  const r = analyzeEpisode1();
  const tb = r.boundaries.thrustBoundary72h;

  it("required thrust = 1574 MN (161x Kestrel's 9.8 MN)", () => {
    assertClose(tb.thrustMN, 1573.5905349794239, "thrustMN");
    assertClose(tb.thrustRatioToKestrel, 160.57046275300243, "thrustRatio");
  });

  it("required accel = 32.78 m/s² (same as brachistochrone 72h)", () => {
    assertClose(tb.aReqMs2, r.brachistochrone72h[0].accelMs2, "accel consistency");
    assertClose(tb.aReqG, 3.3429495439731878, "aReqG");
  });
});

// ============================================================
// EP02: Jupiter Escape → Saturn/Enceladus
// ============================================================

describe("EP02 reproduction: Hohmann baseline Jupiter→Saturn", () => {
  const r = analyzeEpisode2();
  const h = r.hohmann;

  it("total ΔV = 3.357 km/s", () => {
    assertClose(h.totalDv, 3.3567656029406425, "totalDv");
  });

  it("transfer time = 10.05 years", () => {
    assertClose(h.transferTimeYears, 10.051994184639682, "transferTimeYears");
  });
});

describe("EP02 reproduction: Jupiter escape at 50 RJ", () => {
  const r = analyzeEpisode2();
  const j = r.jupiterEscape;

  it("escape velocity at 50 RJ = 8.419 km/s", () => {
    assertClose(j.escapeVelocityKms, 8.419116120684334, "escapeVelocityKms");
  });

  it("hyperbolic excess = 5.934 km/s", () => {
    assertClose(j.hyperbolicExcessKms, 5.933673714186953, "hyperbolicExcessKms");
  });

  it("is unbound (v > v_esc)", () => {
    assert.strictEqual(j.isUnbound, true);
  });

  it("heliocentric best = 18.990 km/s", () => {
    assertClose(j.heliocentricBestKms, 18.98957880618646, "heliocentricBestKms");
  });
});

describe("EP02 reproduction: heliocentric transfer orbit", () => {
  const r = analyzeEpisode2();
  const t = r.heliocentricTransfer;

  it("is hyperbolic (escapes solar system)", () => {
    assert.strictEqual(t.isHyperbolic, true);
  });

  it("reaches Saturn naturally", () => {
    assert.strictEqual(t.reachesSaturn, true);
  });

  it("average-velocity transit estimate = 455.3 days (known to be inaccurate)", () => {
    // NOTE: This is the legacy average-velocity-over-radial-distance estimate.
    // Proper 2D orbit propagation shows ~997 days for pure ballistic.
    // The trim-thrust analysis provides the corrected primary scenario (~87 days).
    assertClose(t.estimatedTransitDays!, 455.2612162741054, "estimatedTransitDays");
  });

  it("v_inf at Saturn = 4.691 km/s", () => {
    assertClose(t.vInfAtSaturnKms, 4.690712210177551, "vInfAtSaturnKms");
  });
});

describe("EP02 reproduction: Saturn capture at Enceladus orbit", () => {
  const r = analyzeEpisode2();
  const c = r.saturnCapture!;

  it("ΔV for circular capture = 5.835 km/s", () => {
    assertClose(c.dvCircularCaptureKms, 5.834910164161439, "dvCircularCaptureKms");
  });

  it("ΔV for minimum capture = 0.606 km/s", () => {
    assertClose(c.dvMinCaptureKms, 0.605944308170848, "dvMinCaptureKms");
  });

  it("v_esc at capture = 17.853 km/s", () => {
    assertClose(c.vEscAtCaptureKms, 17.85280614270892, "vEscAtCaptureKms");
  });
});

describe("EP02 reproduction: Enceladus orbital info", () => {
  const r = analyzeEpisode2();
  const e = r.enceladusInfo;

  it("orbital velocity = 12.624 km/s", () => {
    assertClose(e.orbitalVelocityKms, 12.62384028671833, "orbitalVelocityKms");
  });

  it("orbital period = 32.91 hours", () => {
    assertClose(e.orbitalPeriodHours, 32.907836215003556, "orbitalPeriodHours");
  });
});

describe("EP02 reproduction: trim-thrust transfer (corrected)", () => {
  const r = analyzeEpisode2();
  const tt = r.trimThrust;

  it("ballistic transfer ~997 days (not 455)", () => {
    const ballistic = tt.ballistic!;
    // Pure ballistic with optimal departure angle takes ~997 days
    // (the old 455-day estimate was a calculation error)
    assert.ok(ballistic.transferDays > 900, `ballistic should be >900d, got ${ballistic.transferDays}`);
    assert.ok(ballistic.transferDays < 1100, `ballistic should be <1100d, got ${ballistic.transferDays}`);
  });

  it("3-day trim thrust → ~87 days (primary scenario)", () => {
    const primary = tt.primary!;
    assert.ok(primary.transferDays > 70, `should be >70d, got ${primary.transferDays}`);
    assert.ok(primary.transferDays < 100, `should be <100d, got ${primary.transferDays}`);
    assert.ok(primary.propellantFraction < 0.02, "propellant fraction <2%");
  });

  it("7-day trim thrust → ~41 days (fast variant)", () => {
    const fast = tt.fast!;
    assert.ok(fast.transferDays > 30, `should be >30d, got ${fast.transferDays}`);
    assert.ok(fast.transferDays < 55, `should be <55d, got ${fast.transferDays}`);
    assert.ok(fast.propellantFraction < 0.03, "propellant fraction <3%");
  });

  it("transfer time decreases monotonically with thrust duration", () => {
    const scenarios = tt.allScenarios;
    for (let i = 1; i < scenarios.length; i++) {
      assert.ok(
        scenarios[i].transferDays < scenarios[i - 1].transferDays,
        `${scenarios[i].thrustDays}d should be faster than ${scenarios[i - 1].thrustDays}d`,
      );
    }
  });

  it("correction note documents the methodology change", () => {
    assert.ok(tt.correctionNote.includes("455"));
    assert.ok(tt.correctionNote.includes("1000"));
    assert.ok(tt.correctionNote.includes("トリムのみ"));
  });
});

describe("EP02 reproduction: arrival consistency scenarios", () => {
  const r = analyzeEpisode2();
  const ac = r.arrivalConsistency;

  it("prograde-only: ~87 days, v∞ ≈ 90 km/s (capture impractical)", () => {
    assert.ok(ac.progradeOnly, "progradeOnly scenario exists");
    assertClose(ac.progradeOnly!.transferDays, 86.806, "progradeOnly transferDays", 0.001);
    assertClose(ac.progradeOnly!.vInfKms, 90.246, "progradeOnly v∞", 0.001);
    assert.ok(ac.progradeOnly!.captureDeltaVKms > 70, "capture ΔV >> Saturn orbital velocity");
  });

  it("ballistic: ~997 days, v∞ ≈ 9.2 km/s (capturable)", () => {
    assert.ok(ac.ballistic, "ballistic scenario exists");
    assertClose(ac.ballistic!.transferDays, 996.819, "ballistic transferDays", 0.001);
    assertClose(ac.ballistic!.vInfKms, 9.211, "ballistic v∞", 0.001);
    assertClose(ac.ballistic!.captureDeltaVKms, 2.236, "ballistic capture ΔV", 0.001);
  });

  it("best efficiency: 1.5d+1.5d → ~166 days, v∞ ≈ 10.5 km/s", () => {
    assert.ok(ac.bestEfficiency, "bestEfficiency scenario exists");
    assertClose(ac.bestEfficiency!.transferDays, 166.403, "bestEff transferDays", 0.001);
    assertClose(ac.bestEfficiency!.vInfKms, 10.512, "bestEff v∞", 0.001);
    assert.ok(ac.bestEfficiency!.propellantFraction < 0.01, "< 1% propellant");
  });

  it("two-phase scenarios: 12 computed, transfer time decreases with more thrust", () => {
    assert.equal(ac.allTwoPhase.length, 12);
    // First scenario (3d accel, 0d decel) should be fastest
    assert.ok(ac.allTwoPhase[0].transferDays < 100, "fastest two-phase < 100d");
    // Last scenario should have the most deceleration
    const last = ac.allTwoPhase[ac.allTwoPhase.length - 1];
    assert.ok(last.decelDays > 0, "last scenario has deceleration");
  });

  it("balanced accel/decel (equal days) achieves capturable v∞ ≈ 10 km/s", () => {
    // The key v∞ resolution: balanced two-phase gives capturable v∞
    const balanced = ac.allTwoPhase.filter(
      (s: { accelDays: number; decelDays: number }) => s.accelDays === s.decelDays,
    );
    assert.ok(balanced.length >= 3, `at least 3 balanced scenarios, got ${balanced.length}`);
    for (const s of balanced) {
      assert.ok(
        s.vInfAtSaturnKms < 15,
        `balanced ${s.accelDays}d+${s.decelDays}d: v∞ ${s.vInfAtSaturnKms} should be < 15 km/s (capturable)`,
      );
    }
  });
});

describe("EP02 reproduction: Jupiter radiation analysis", () => {
  const r = analyzeEpisode2();
  const rad = r.jupiterRadiation;

  it("shield budget = 0.04312 krad (42 min at departure rate)", () => {
    assertClose(rad.shieldBudget42minKrad, 0.04312, "shieldBudget", 0.001);
  });

  it("min survival velocity ≈ 50.4 km/s", () => {
    assertClose(rad.minSurvivalVelocityKms, 50.4, "minSurvivalV", 0.01);
  });

  it("ballistic 7 km/s: dose 0.310 krad, shield fails", () => {
    const s = rad.scenarios[0];
    assertClose(s.accumulatedDoseKrad, 0.310441, "dose", 0.001);
    assert.equal(s.shieldSurvives, false);
    assertClose(s.doseFractionOfBudget, 7.199, "doseFraction", 0.01);
  });

  it("accelerated 60 km/s: dose 0.036 krad, shield survives", () => {
    const s = rad.scenarios[1];
    assertClose(s.accumulatedDoseKrad, 0.036218, "dose", 0.001);
    assert.equal(s.shieldSurvives, true);
    assertClose(s.doseFractionOfBudget, 0.84, "doseFraction", 0.01);
  });
});

describe("EP02 reproduction: brachistochrone 30-day and 90-day", () => {
  const r = analyzeEpisode2();

  it("30d closest: accel = 0.390 m/s², ΔV = 1011 km/s", () => {
    assertClose(r.brachistochrone30d[0].accelMs2, 0.38994627343392774, "30d accel");
    assertClose(r.brachistochrone30d[0].deltaVKms, 1010.7407407407408, "30d deltaV");
  });

  it("90d closest: accel = 0.043 m/s², ΔV = 337 km/s", () => {
    assertClose(r.brachistochrone90d[0].accelMs2, 0.04332736371488086, "90d accel");
    assertClose(r.brachistochrone90d[0].deltaVKms, 336.91358024691357, "90d deltaV");
  });

  it("all timeframes use same closest distance (654,960,000 km)", () => {
    assertClose(r.brachistochrone30d[0].distanceKm, 654960000, "30d distance");
    assertClose(r.brachistochrone90d[0].distanceKm, 654960000, "90d distance");
  });
});

describe("EP02 reproduction: damaged thrust scenarios", () => {
  const r = analyzeEpisode2();
  const dt = r.damagedThrust;

  it("4 scenarios: 100%, 50%, 25%, trim (1%)", () => {
    assert.equal(dt.length, 4);
    assertClose(dt[0].fraction, 1.0, "full thrust fraction");
    assertClose(dt[1].fraction, 0.5, "half thrust fraction");
    assertClose(dt[2].fraction, 0.25, "quarter thrust fraction");
    assertClose(dt[3].fraction, 0.01, "trim fraction");
  });

  it("full thrust: 3.28 days closest, 50% thrust: 4.64 days", () => {
    assertClose(dt[0].minTimeClosestDays, 3.277715322822493, "fullThrust days");
    assertClose(dt[1].minTimeClosestDays, 4.635389463133676, "halfThrust days");
  });

  it("trim-only (1%): 32.8 days (consistent with ~87d total for 3d trim + coast)", () => {
    assertClose(dt[3].minTimeClosestDays, 32.777153228224925, "trimOnly days");
    assertClose(dt[3].accelG, 0.033310729623945656, "trimOnly accelG");
  });
});

describe("EP02 reproduction: additional ΔV needed", () => {
  const r = analyzeEpisode2();

  it("naturally reaches Saturn on hyperbolic orbit (no additional ΔV)", () => {
    assert.equal(r.additionalDvNeeded.naturallyReaches, true);
    assert.equal(r.additionalDvNeeded.isHyperbolic, true);
    assert.equal(r.additionalDvNeeded.additionalDvKms, 0);
  });
});

describe("EP02 reproduction: Saturn arrival V-infinity", () => {
  const r = analyzeEpisode2();
  const sv = r.saturnArrivalVInf;

  it("reaches Saturn on hyperbolic trajectory with V∞ = 4.691 km/s", () => {
    assert.equal(sv.reachesSaturn, true);
    assert.equal(sv.isHyperbolic, true);
    assertClose(sv.vInfSaturnKms, 4.690712153879481, "vInfSaturn");
  });

  it("estimated transit = 455.3 days (1.25 years)", () => {
    assertClose(sv.estimatedTransitDays, 455.2612176238103, "transitDays");
    assertClose(sv.estimatedTransitYears, 1.2464372830220678, "transitYears");
  });
});

// ============================================================
// EP03: Enceladus → Titania
// ============================================================

describe("EP03 reproduction: Hohmann baseline Saturn→Uranus", () => {
  const r = analyzeEpisode3();
  const h = r.hohmann;

  it("total ΔV = 2.743 km/s", () => {
    assertClose(h.totalDv, 2.742753923015945, "totalDv");
  });

  it("transfer time = 27.3 years", () => {
    assertClose(h.transferTimeYears, 27.299495445193088, "transferTimeYears");
  });
});

describe("EP03 reproduction: 143h brachistochrone Enceladus→Titania", () => {
  const r = analyzeEpisode3();
  const b = r.brachistochrone;

  it("closest: accel = 21.658 m/s² (2.21g), thrust ratio = 106x", () => {
    assertClose(b[0].accelMs2, 21.657514860396844, "closest.accelMs2");
    assertClose(b[0].accelG, 2.2084519035957078, "closest.accelG");
    assertClose(b[0].thrustRatio, 106.07762380602536, "closest.thrustRatio");
  });

  it("closest: ΔV = 11164.9 km/s", () => {
    assertClose(b[0].deltaVKms, 11164.882060831782, "closest.deltaVKms");
  });

  it("closest: distance = 1,438,930,000 km (9.62 AU)", () => {
    assertClose(b[0].distanceKm, 1438930000, "closest.distanceKm");
    assertClose(b[0].distanceAU, 9.618652947845735, "closest.distanceAU");
  });
});

describe("EP03 reproduction: navigation crisis analysis", () => {
  const r = analyzeEpisode3();
  const n = r.navCrisis;

  it("computed error = 14,393,613 km (stated: 14,360,000 km)", () => {
    assertClose(n.computedErrorKm, 14393613.130911691, "computedErrorKm");
    assert.strictEqual(n.statedErrorKm, 14360000);
  });

  it("computed vs stated ratio = 1.0023 (0.23% match)", () => {
    assertClose(n.computedVsStatedRatio, 1.0023407472779728, "ratio");
  });

  it("Uranus SOI = 51,793,935 km", () => {
    assertClose(n.uranusSOIKm, 51793934.52653752, "uranusSOIKm");
  });
});

describe("EP03 reproduction: Uranus/Titania capture", () => {
  const r = analyzeEpisode3();
  const u = r.uranusCapture;

  it("ΔV min capture = 5570.5 km/s", () => {
    assertClose(u.dvMinCaptureKms, 5570.490344691267, "dvMinCaptureKms");
  });

  it("Titania orbital period = 8.695 days", () => {
    assertClose(u.titaniaPeriodDays, 8.695096669430317, "titaniaPeriodDays");
  });
});

describe("EP03 reproduction: Uranian moon comparison (IF analysis)", () => {
  const r = analyzeEpisode3();
  const mc = r.moonComparison;

  it("uses v_inf = 2.0 km/s", () => {
    assert.strictEqual(mc.vInfKms, 2.0);
  });

  it("Titania capture ΔV ≈ 0.37 km/s (matches report)", () => {
    const titania = mc.moons.find(m => m.name === "TITANIA")!;
    assertClose(titania.dvCaptureKms, 0.37, "dvCaptureKms", 0.02);
  });

  it("Titania orbit insertion ΔV ≈ 1.88 km/s (matches report)", () => {
    const titania = mc.moons.find(m => m.name === "TITANIA")!;
    assertClose(titania.dvOrbitInsertionKms, 1.88, "dvOrbitInsertionKms", 0.01);
  });

  it("Miranda has smallest capture ΔV but largest orbit insertion ΔV", () => {
    const miranda = mc.moons.find(m => m.name === "MIRANDA")!;
    const oberon = mc.moons.find(m => m.name === "OBERON")!;
    assert.ok(miranda.dvCaptureKms < oberon.dvCaptureKms, "Miranda capture < Oberon capture");
    assert.ok(miranda.dvOrbitInsertionKms > oberon.dvOrbitInsertionKms, "Miranda insertion > Oberon insertion");
  });

  it("all 5 major Uranian moons are included", () => {
    assert.strictEqual(mc.moons.length, 5);
    const names = mc.moons.map(m => m.name);
    assert.ok(names.includes("MIRANDA"), "includes Miranda");
    assert.ok(names.includes("ARIEL"), "includes Ariel");
    assert.ok(names.includes("UMBRIEL"), "includes Umbriel");
    assert.ok(names.includes("TITANIA"), "includes Titania");
    assert.ok(names.includes("OBERON"), "includes Oberon");
  });
});

describe("EP03 reproduction: mass feasibility", () => {
  const r = analyzeEpisode3();
  const m = r.massFeasibility;

  it("max mass for 143h at closest = 452.5 t", () => {
    assertClose(m.maxMassKg, 452498.8237648809, "maxMassKg");
    assertClose(m.maxMassT, 452.4988237648809, "maxMassT");
  });
});

describe("EP03 reproduction: Saturn departure", () => {
  const r = analyzeEpisode3();
  const sd = r.saturnDeparture;

  it("Saturn escape velocity = 17.853 km/s", () => {
    assertClose(sd.vEscSaturnKms, 17.852810964650672, "vEscSaturn");
  });

  it("Enceladus circular velocity = 12.624 km/s", () => {
    assertClose(sd.vCircEnceladusKms, 12.62384369634604, "vCircEnceladus");
  });

  it("escape ΔV from Enceladus orbit = 5.229 km/s", () => {
    assertClose(sd.dvEscapeFromEnceladusKms, 5.228967268304633, "dvEscape");
  });
});

describe("EP03 reproduction: cruise velocity analysis", () => {
  const r = analyzeEpisode3();
  const cv = r.cruiseVelocity;

  it("brachistochrone peak = 5582.4 km/s, average = 2791.2 km/s", () => {
    assertClose(cv.brachistochrone.peakVelocityKms, 5582.441030415891, "peakV");
    assertClose(cv.brachistochrone.averageVelocityKms, 2791.2205152079455, "avgV");
  });

  it("brachistochrone ΔV = 11164.9 km/s (consistent with earlier test)", () => {
    assertClose(cv.brachistochrone.deltaVKms, 11164.882060831782, "deltaV");
  });

  it("heliocentric: solar escape at 14 AU = 10.98 km/s", () => {
    assertClose(cv.heliocentric.solarVEscAt14AUKms, 10.978783068791758, "solarVEsc");
  });

  it("heliocentric: Saturn orbital = 9.62 km/s, Uranus orbital = 6.80 km/s", () => {
    assertClose(cv.heliocentric.saturnOrbitalVKms, 9.62171356727013, "saturnOrbitV");
    assertClose(cv.heliocentric.uranusOrbitalVKms, 6.797180803702068, "uranusOrbitV");
  });
});

describe("EP03 reproduction: navigation confidence", () => {
  const r = analyzeEpisode3();
  const nc = r.navCrisis;

  it("stellar nav confidence = 0.923", () => {
    assertClose(nc.stellarNavConfidence, 0.923, "stellarNavConfidence");
  });

  it("inertial nav confidence = 0.917", () => {
    assertClose(nc.inertialNavConfidence, 0.917, "inertialNavConfidence");
  });

  it("error margin = 18 km", () => {
    assert.strictEqual(nc.errorMarginKm, 18);
  });
});

describe("EP03 reproduction: min transfer time at canonical mass", () => {
  const r = analyzeEpisode3();
  const mt = r.minTransferTime;

  it("at 48,000t: 1474.9 h (61.5 days)", () => {
    assertClose(mt.timeHours, 1474.8739649190604, "timeHours");
    assertClose(mt.timeDays, 61.45308187162752, "timeDays");
  });

  it("same accel as EP01 canonical mass (0.204 m/s²)", () => {
    assertClose(mt.accelMs2, 0.20416666666666666, "accelMs2");
    assertClose(mt.accelG, 0.020819206014966035, "accelG");
  });
});

describe("EP03 reproduction: extended Uranus capture fields", () => {
  const r = analyzeEpisode3();
  const u = r.uranusCapture;

  it("approach at 25 RU (638,975 km)", () => {
    assert.equal(u.approachRU, 25);
    assertClose(u.approachKm, 638975, "approachKm");
  });

  it("vEsc at Titania orbit = 5.156 km/s, vCirc = 3.646 km/s", () => {
    assertClose(u.vEscAtTitaniaKms, 5.1558887876319845, "vEscAtTitania");
    assertClose(u.vCircAtTitaniaKms, 3.6457639247782634, "vCircAtTitania");
  });

  it("circular capture ΔV = 5572.0 km/s", () => {
    assertClose(u.dvCircularCaptureKms, 5572.00046955412, "dvCircularCapture");
  });
});

describe("EP03 reproduction: nav crisis position and error", () => {
  const r = analyzeEpisode3();
  const nc = r.navCrisis;

  it("position at 14.72 AU, remaining 4.48 AU to Uranus", () => {
    assertClose(nc.positionAU, 14.72, "positionAU");
    assertClose(nc.remainingDistAU, 4.481209125231219, "remainingDistAU");
  });

  it("error vs Uranus SOI = 27.8%", () => {
    assertClose(nc.errorVsSOI, 0.2779015199846784, "errorVsSOI");
  });

  it("error magnitude ratio = 797,778x (error >> target precision)", () => {
    assertClose(nc.errorMagnitudeRatio, 797777.7777777778, "errorMagnitudeRatio");
  });
});

describe("EP03 reproduction: cruise velocity candidates", () => {
  const r = analyzeEpisode3();
  const cv = r.cruiseVelocity;

  it("3 candidate velocities: 30, 300, 3000 km/s", () => {
    assert.equal(cv.candidates.length, 3);
    assert.equal(cv.candidates[0].vKms, 30);
    assert.equal(cv.candidates[1].vKms, 300);
    assert.equal(cv.candidates[2].vKms, 3000);
  });

  it("heliocentric solar circular at 14 AU = 7.763 km/s", () => {
    assertClose(cv.heliocentric.solarVCircAt14AUKms, 7.763171957118706, "solarVCircAt14AU");
  });
});

// ============================================================
// EP04: Titania → Earth departure
// ============================================================

describe("EP04 reproduction: Hohmann baseline Uranus→Earth", () => {
  const r = analyzeEpisode4();
  const h = r.hohmann;

  it("total ΔV = 15.940 km/s", () => {
    assertClose(h.totalDv, 15.939879332799249, "totalDv");
  });

  it("transfer time = 16.05 years", () => {
    assertClose(h.transferTimeYears, 16.05089644132546, "transferTimeYears");
  });
});

describe("EP04 reproduction: brachistochrone at 65% thrust", () => {
  const r = analyzeEpisode4();
  const b = r.brachistochrone;

  it("closest: time = 104.85 days, ΔV = 1202.2 km/s", () => {
    assertClose(b[0].timeDays, 104.85278478245696, "closest.timeDays");
    assertClose(b[0].deltaVKms, 1202.2420303156514, "closest.deltaVKms");
  });

  it("closest: accel = 0.1327 m/s² (0.0135g, 65% of 9.8MN/48kt)", () => {
    assertClose(b[0].accelMs2, 0.13270833333333334, "closest.accelMs2");
    assertClose(b[0].accelG, 0.013532483909727925, "closest.accelG");
  });

  it("distance closest = 2,722,861,977 km (18.20 AU)", () => {
    assertClose(b[0].distanceKm, 2722861977, "closest.distanceKm");
    assertClose(b[0].distanceAU, 18.2012081071686, "closest.distanceAU");
  });
});

describe("EP04 reproduction: plasmoid analysis", () => {
  const r = analyzeEpisode4();
  const p = r.plasmoid;

  it("shield life = 14 min, transit = 8 min, margin = 6 min (43%)", () => {
    assert.strictEqual(p.shieldLifeMin, 14);
    assert.strictEqual(p.transitMin, 8);
    assert.strictEqual(p.marginMin, 6);
    assertClose(p.marginFraction, 0.42857142857142855, "marginFraction");
  });

  it("total radiation exposure = 480 mSv", () => {
    assert.strictEqual(p.totalExposureMSv, 480);
  });

  it("Uranus magnetic tilt accuracy = 99.50%", () => {
    assertClose(p.tiltAccuracyPercent, 99.49748743718594, "tiltAccuracyPercent");
  });
});

describe("EP04 reproduction: fleet intercept", () => {
  const r = analyzeEpisode4();
  const f = r.fleetIntercept;

  it("fleet ETA = 33 h, available time = 23.3 h", () => {
    assert.strictEqual(f.fleetETAHours, 33);
    assertClose(f.availableTimeHours, 23.3, "availableTimeHours");
  });
});

describe("EP04 reproduction: damage assessment", () => {
  const r = analyzeEpisode4();
  const d = r.damageAssessment;

  it("65% thrust = 6.37 MN", () => {
    assertClose(d.effectiveThrustMN, 6.37, "effectiveThrustMN");
    assertClose(d.thrustFraction, 0.65, "thrustFraction");
  });

  it("thermal margin = 78%", () => {
    assertClose(d.thermalMargin, 0.78, "thermalMargin");
  });
});

describe("EP04 reproduction: mass feasibility scenarios", () => {
  const r = analyzeEpisode4();
  const mf = r.massFeasibility;

  it("30-day transfer: max mass = 3929 t", () => {
    assertClose(mf[0].maxMassT, 3929.3779891803897, "30d.maxMassT");
    assertClose(mf[0].deltaVKms, 4201.94749537037, "30d.deltaVKms");
  });

  it("365-day transfer: max mass = 581,657 t", () => {
    assertClose(mf[4].maxMassT, 581657.091787286, "365d.maxMassT");
    assertClose(mf[4].deltaVKms, 345.365547564688, "365d.deltaVKms");
  });
});

describe("EP04 reproduction: Uranus departure parameters", () => {
  const r = analyzeEpisode4();
  const ud = r.uranusDeparture;

  it("Titania escape ΔV = 1.510 km/s", () => {
    assertClose(ud.dvEscapeFromTitaniaKms, 1.5101248628537212, "dvEscapeFromTitania");
  });

  it("escape velocity at Titania orbit = 5.156 km/s", () => {
    assertClose(ud.vEscUranusKms, 5.1558887876319845, "vEscUranus");
  });

  it("Titania circular velocity = 3.646 km/s", () => {
    assertClose(ud.vCircTitaniaKms, 3.6457639247782634, "vCircTitania");
  });

  it("accel at full mass = 0.1327 m/s² (consistent with brachistochrone)", () => {
    assertClose(ud.accelAtFullMassMs2, 0.13270833333333334, "accelAtFullMass");
    // Should match EP04 brachistochrone closest accel
    assertClose(ud.accelAtFullMassMs2, r.brachistochrone[0].accelMs2, "accel consistency");
  });
});

describe("EP04 reproduction: plasmoid momentum perturbation", () => {
  const r = analyzeEpisode4();
  const pm = r.plasmoidMomentum;

  it("3 scenarios: nominal, enhanced, extreme", () => {
    assert.equal(pm.length, 3);
    assert.equal(pm[0].label, "nominal");
    assert.equal(pm[1].label, "enhanced");
    assert.equal(pm[2].label, "extreme");
  });

  it("nominal: velocity perturbation negligible (< 1e-12 m/s)", () => {
    assert.ok(
      pm[0].velocityPerturbationMs < 1e-12,
      `nominal velocity perturbation ${pm[0].velocityPerturbationMs} should be < 1e-12 m/s`,
    );
  });

  it("all scenarios: correction-to-orbital ratio << 1 (negligible)", () => {
    for (const s of pm) {
      assert.ok(
        s.correctionToOrbitalRatio < 1e-8,
        `${s.label}: correction ratio ${s.correctionToOrbitalRatio} should be << 1`,
      );
    }
  });

  it("extreme scenario force is highest", () => {
    const forces = pm.map((s: { forceN: number }) => s.forceN);
    assert.ok(forces[2] > forces[1], "extreme > enhanced");
    assert.ok(forces[1] > forces[0], "enhanced > nominal");
  });
});

describe("EP04 reproduction: fleet intercept scenarios", () => {
  const r = analyzeEpisode4();
  const f = r.fleetIntercept;

  it("arrival time at Titania = 9.7 hours", () => {
    assertClose(f.arrivalTimeHours, 9.7, "arrivalTimeHours");
  });

  it("5 fleet ships", () => {
    assert.strictEqual(f.fleetShipCount, 5);
  });

  it("fleet scenarios include Saturn-Uranus distance", () => {
    const suScenario = f.scenarios.find(
      (s: { label: string }) => s.label.includes("Saturn-Uranus"),
    );
    assert.ok(suScenario, "Saturn-Uranus scenario exists");
    assertClose(suScenario.distKm, 1438930000, "Saturn-Uranus distance");
  });
});

describe("EP04 reproduction: Hohmann departure/arrival ΔV", () => {
  const r = analyzeEpisode4();
  const h = r.hohmann;

  it("departure ΔV = 4.658 km/s, arrival ΔV = 11.281 km/s", () => {
    assertClose(h.departureDv, 4.658453824517666, "departureDv");
    assertClose(h.arrivalDv, 11.281425508281583, "arrivalDv");
  });

  it("semi-major axis = 1,511,029,012 km", () => {
    assertClose(h.semiMajorAxisKm, 1511029011.5, "semiMajorAxis");
    assertClose(h.transferTimeDays, 5862.589925194124, "transferTimeDays");
  });
});

describe("EP04 reproduction: mass feasibility 60d/90d/180d", () => {
  const r = analyzeEpisode4();
  const mf = r.massFeasibility;

  it("60-day: max mass = 15,718 t, accel = 0.405 m/s²", () => {
    assertClose(mf[1].maxMassT, 15717.511956721559, "60d maxMassT");
    assertClose(mf[1].accelMs2, 0.4052804297232224, "60d accelMs2");
  });

  it("90-day: max mass = 35,364 t, accel = 0.180 m/s²", () => {
    assertClose(mf[2].maxMassT, 35364.401902623504, "90d maxMassT");
    assertClose(mf[2].accelMs2, 0.1801246354325433, "90d accelMs2");
  });

  it("180-day: max mass = 141,458 t, accel = 0.045 m/s²", () => {
    assertClose(mf[3].maxMassT, 141457.60761049401, "180d maxMassT");
    assertClose(mf[3].accelMs2, 0.04503115885813583, "180d accelMs2");
  });
});

describe("EP04 reproduction: brachistochrone mid/farthest", () => {
  const r = analyzeEpisode4();
  const b = r.brachistochrone;

  it("mid: 107.8 days, ΔV = 1236 km/s", () => {
    assertClose(b[1].timeDays, 107.76760720596103, "mid timeDays");
    assertClose(b[1].deltaVKms, 1235.6633842235494, "mid deltaVKms");
  });

  it("farthest: 110.5 days, ΔV = 1267 km/s", () => {
    assertClose(b[2].timeDays, 110.463437773413, "farthest timeDays");
    assertClose(b[2].deltaVKms, 1266.5737775099535, "farthest deltaVKms");
  });
});

// ============================================================
// EP05: Uranus → Earth arrival
// ============================================================

describe("EP05 reproduction: Hohmann baseline Uranus→Earth", () => {
  const r = analyzeEpisode5();
  const h = r.hohmann;

  it("total ΔV = 15.940 km/s (same as EP04)", () => {
    assertClose(h.totalDvKms, 15.939879332799249, "totalDvKms");
  });

  it("transfer time = 16.05 years", () => {
    assertClose(h.transferTimeYears, 16.05089644132546, "transferTimeYears");
  });
});

describe("EP05 reproduction: brachistochrone by mass", () => {
  const r = analyzeEpisode5();
  const bm = r.brachistochroneByMass;

  it("300t: 8.29 days, peak 7604 km/s, ΔV = 15207 km/s", () => {
    assertClose(bm[0].timeDays, 8.289340473100166, "300t.timeDays");
    assertClose(bm[0].peakVelocityKms, 7603.646229165321, "300t.peakVelocityKms");
    assertClose(bm[0].deltaVKms, 15207.292458330641, "300t.deltaVKms");
  });

  it("500t: 10.70 days, ΔV = 11780 km/s", () => {
    assertClose(bm[1].timeDays, 10.701492534453351, "500t.timeDays");
    assertClose(bm[1].deltaVKms, 11779.518086404045, "500t.deltaVKms");
  });

  it("48,000t: 104.85 days (matches EP04 closest)", () => {
    assertClose(bm[4].timeDays, 104.85278478245696, "48kt.timeDays");
    assertClose(bm[4].deltaVKms, 1202.2420303156514, "48kt.deltaVKms");
  });
});

describe("EP05 reproduction: Earth capture scenarios", () => {
  const r = analyzeEpisode5();
  const ec = r.earthCapture;

  it("LEO circular velocity = 7.673 km/s", () => {
    assertClose(ec.scenarios[0].vCircKms, 7.672598648385013, "leoVCirc");
  });

  it("Moon orbit circular velocity = 1.018 km/s", () => {
    assertClose(ec.scenarios[2].vCircKms, 1.0183034106336974, "moonVCirc");
  });

  it("capture table: v_inf=0, LEO ΔV = 3.178 km/s", () => {
    assertClose(ec.captureTable[0].captures[0].dvCaptureKms, 3.178094418806549, "v0LeoDv");
  });

  it("capture table: v_inf=10, LEO ΔV = 7.083 km/s", () => {
    assertClose(ec.captureTable[4].captures[0].dvCaptureKms, 7.083333719256113, "v10LeoDv");
  });
});

describe("EP05 reproduction: Earth escape velocities and extended capture", () => {
  const r = analyzeEpisode5();
  const ec = r.earthCapture;

  it("Earth escape velocity at LEO = 10.851 km/s", () => {
    assertClose(ec.earthEscapeVelocityAtLEOKms, 10.850693067191562, "escLEO");
  });

  it("Earth escape velocity at Moon orbit = 1.440 km/s", () => {
    assertClose(ec.earthEscapeVelocityAtMoonOrbitKms, 1.4400984939289538, "escMoon");
  });

  it("GEO circular velocity = 3.075 km/s", () => {
    assertClose(ec.scenarios[1].vCircKms, 3.0749215415063538, "geoVCirc");
  });

  it("capture table: v_inf=1, LEO ΔV = 3.224 km/s", () => {
    assertClose(ec.captureTable[1].captures[0].dvCaptureKms, 3.224076993222341, "v1LeoDv");
  });

  it("capture table: v_inf=5, all 3 targets", () => {
    const row = ec.captureTable[3];
    assert.equal(row.vInfKms, 5);
    assertClose(row.captures[0].dvCaptureKms, 4.274683052420365, "v5LeoDv");
    assertClose(row.captures[1].dvCaptureKms, 3.551562063909087, "v5GeoDv");
    assertClose(row.captures[2].dvCaptureKms, 4.184953614751119, "v5MoonDv");
  });

  it("capture ΔV increases monotonically with vInf (LEO target)", () => {
    const leoDvs = ec.captureTable.map(
      (row: { captures: Array<{ dvCaptureKms: number }> }) => row.captures[0].dvCaptureKms,
    );
    for (let i = 1; i < leoDvs.length; i++) {
      assert.ok(leoDvs[i] > leoDvs[i - 1],
        `LEO ΔV should increase: v[${i}]=${leoDvs[i].toFixed(3)} > v[${i - 1}]=${leoDvs[i - 1].toFixed(3)}`);
    }
  });
});

describe("EP05 reproduction: nozzle lifespan", () => {
  const r = analyzeEpisode5();
  const n = r.nozzleLifespan;

  it("lifetime = 55.633 h (200,280 s)", () => {
    assertClose(n.nozzleLifetimeSec, 200280, "lifetimeSec");
    assertClose(n.nozzleLifetimeHours, 55.63333333333333, "lifetimeHours");
  });

  it("required burn = 55.2 h (198,720 s)", () => {
    assertClose(n.requiredBurnTimeSec, 198720, "burnTimeSec");
    assertClose(n.requiredBurnTimeHours, 55.2, "burnTimeHours");
  });

  it("margin = 26 min (0.779%)", () => {
    assert.strictEqual(n.marginMinutes, 26);
    assertClose(n.marginPercent, 0.7789095266626722, "marginPercent");
    assert.strictEqual(n.marginConsistency, true);
  });

  it("nozzle destroyed = true", () => {
    assert.strictEqual(n.nozzleDestroyed, true);
  });

  it("sensitivity: 1% increase → negative margin", () => {
    const s = n.sensitivityScenarios.find(
      (s: { label: string }) => s.label === "1%増加 (55h45m)",
    );
    assert.ok(s);
    assert.ok(s.marginSec < 0, `1% increase margin should be negative: ${s.marginSec}`);
  });
});

describe("EP05 reproduction: Oberth effect at Jupiter", () => {
  const r = analyzeEpisode5();
  const o = r.oberthEffect;

  it("v_inf = 1500 km/s", () => {
    assert.strictEqual(o.vInfKms, 1500);
  });

  it("best-case velocity efficiency < 0.1%", () => {
    assertClose(o.bestCaseVelocityEfficiencyPercent, 0.0694615010899069, "bestCaseEfficiency");
  });

  it("gravity well fraction at 1500 km/s ≈ 4.0%", () => {
    assertClose(o.gravityWellPercent, 3.9688094003552483, "gravityWellPercent");
  });

  it("interpretation = mission-level-composite", () => {
    assert.strictEqual(o.interpretation, "mission-level-composite");
  });

  it("burn saving exceeds nozzle margin", () => {
    assert.strictEqual(o.burnSavingExceedsMargin, true);
  });
});

describe("EP05 reproduction: Oberth efficiency matrix", () => {
  const r = analyzeEpisode5();
  const o = r.oberthEffect;
  const em = o.efficiencyMatrix;

  it("5 radii from 1 RJ to 10 RJ, each with 5 burn scenarios", () => {
    assert.equal(em.length, 5);
    assert.ok(em[0].label.includes("1 RJ"), "first is 1 RJ");
    assert.ok(em[4].label.includes("10 RJ"), "last is 10 RJ");
    for (const row of em) {
      assert.equal(row.results.length, 5);
    }
  });

  it("best case: 1 RJ, 10 km/s → 0.078% efficiency", () => {
    const best = em[0].results[0];
    assertClose(best.burnDvKms, 10, "burnDv");
    assertClose(best.efficiencyPercent, 0.07820468330692609, "efficiency");
    assertClose(best.gainKms, 0.007820468330692165, "gainKms");
  });

  it("worst case: 10 RJ, 200 km/s → 0.0069% efficiency", () => {
    const worst = em[4].results[4];
    assertClose(worst.burnDvKms, 200, "burnDv");
    assertClose(worst.efficiencyPercent, 0.0069488662784333854, "efficiency");
  });

  it("efficiency decreases with higher periapsis radius (weaker Oberth)", () => {
    // Compare 1 RJ vs 10 RJ at same burn (100 km/s)
    const eff1RJ = em[0].results[3].efficiencyPercent;
    const eff10RJ = em[4].results[3].efficiencyPercent;
    assert.ok(eff1RJ > eff10RJ, `1 RJ (${eff1RJ}%) > 10 RJ (${eff10RJ}%)`);
    // Factor ~10x difference (Oberth scales as sqrt(r))
    assert.ok(eff1RJ / eff10RJ > 9, "~10x difference between 1 and 10 RJ");
  });

  it("energy efficiency percent = 0.0774%", () => {
    assertClose(o.energyEfficiencyPercent, 0.07743565743707492, "energyEfficiency");
  });
});

describe("EP05 reproduction: full route summary", () => {
  const r = analyzeEpisode5();
  const fr = r.fullRoute;

  it("total distance = 35.879 AU", () => {
    assertClose(fr.totalDistAU, 35.87873779141965, "totalDistAU");
  });

  it("furthest point = 19.201 AU", () => {
    assertClose(fr.furthestPointAU, 19.20120912523122, "furthestPointAU");
  });

  it("4 legs: Mars→Ganymede→Enceladus→Titania→Earth", () => {
    assert.strictEqual(fr.legs.length, 4);
    assert.strictEqual(fr.startBody, "火星");
    assert.strictEqual(fr.endBody, "地球");
  });
});

describe("EP05 reproduction: burn budget", () => {
  const r = analyzeEpisode5();
  const bb = r.burnBudget;

  it("burns available: 2-3", () => {
    assert.strictEqual(bb.burnsAvailable.min, 2);
    assert.strictEqual(bb.burnsAvailable.max, 3);
  });

  it("brachistochrone feasible with 2 burns", () => {
    assert.strictEqual(bb.brachistochrone.burnsNeeded, 2);
    assert.strictEqual(bb.brachistochrone.feasible, true);
  });

  it("radiation: 480 mSv current, 20 mSv to ICRP limit", () => {
    assert.strictEqual(bb.radiationBudget.currentMSv, 480);
    assert.strictEqual(bb.radiationBudget.remainingToICRPMSv, 20);
  });
});

describe("EP05 reproduction: navigation accuracy", () => {
  const r = analyzeEpisode5();
  const nav = r.navigationAccuracy;

  it("distance = 18.2 AU (2,722,861,977 km)", () => {
    assertClose(nav.distanceAU, 18.201, "distanceAU", 0.01);
  });

  it("angular accuracy ≈ 7.35 nrad (0.00152 arcsec)", () => {
    assertClose(nav.angularAccuracyNrad, 7.345, "angularAccuracyNrad", 0.01);
    assertClose(nav.angularAccuracyArcsec, 0.001515, "angularAccuracyArcsec", 0.01);
  });

  it("relative precision ≈ 7.35 × 10⁻⁹", () => {
    assert.ok(nav.relativePrecision < 1e-8, "relativePrecision should be < 1e-8");
    assert.ok(nav.relativePrecision > 1e-10, "relativePrecision should be > 1e-10");
  });

  it("EP03 comparison: ~2.9 million times better", () => {
    assert.ok(nav.ep03Comparison.ep05VsEp03Ratio > 2_500_000, "should be >2.5M times better than EP03");
    assert.ok(nav.ep03Comparison.ep05VsEp03Ratio < 3_500_000, "should be <3.5M times better than EP03");
  });

  it("better than New Horizons Pluto (184 km with DSN)", () => {
    assert.ok(nav.vsNewHorizonsPluto > 5, "should be >5x better than New Horizons Pluto");
    assertClose(nav.vsNewHorizonsPluto, 9.2, "vsNewHorizonsPluto", 0.1);
  });

  it("far better than New Horizons autonomous stellar nav (~6.6M km)", () => {
    assert.ok(nav.vsNewHorizonsStellar > 100_000, "should be >100,000x better");
  });
});

describe("EP05 reproduction: Earth approach analysis", () => {
  const r = analyzeEpisode5();
  const ea = r.earthApproach;

  it("Earth circular velocity = 29.785 km/s", () => {
    assertClose(ea.vCircEarthKms, 29.784676672948645, "vCircEarth");
  });

  it("solar escape at Earth orbit = 42.122 km/s", () => {
    assertClose(ea.vEscSunAtEarthKms, 42.12189370178153, "vEscSunAtEarth");
  });

  it("Hohmann arrival: v∞ = 11.281 km/s, LEO capture ΔV = 7.980 km/s", () => {
    assertClose(ea.hohmannArrival.vInfKms, 11.281425508281583, "hohmannVInf");
    assertClose(ea.hohmannArrival.dvCaptureLEOKms, 7.980135986090377, "hohmannCaptureLEO");
  });

  it("brachistochrone arrival: LEO capture ΔV = 7.673 km/s (v∞≈0)", () => {
    assertClose(ea.brachistochroneArrival.dvCaptureLEOKms, 7.672598648385013, "brachCaptureLEO");
  });
});

describe("EP05 reproduction: burn budget thermal analysis", () => {
  const r = analyzeEpisode5();
  const bb = r.burnBudget;

  it("total min burns = 3, no correction margin", () => {
    assert.equal(bb.totalMinBurnsNeeded, 3);
    assert.equal(bb.hasCorrectionMargin, false);
  });

  it("thermal: initial margin 78%, loss 5%/burn, final 63%, risk moderate", () => {
    assertClose(bb.thermalAnalysis.initialMargin, 0.78, "initialMargin");
    assertClose(bb.thermalAnalysis.estimatedLossPerBurn, 0.05, "lossPerBurn");
    assertClose(bb.thermalAnalysis.estimatedFinalMargin, 0.63, "finalMargin");
    assert.equal(bb.thermalAnalysis.thermalRisk, "moderate");
  });

  it("earth capture: 1 burn needed, feasible", () => {
    assert.equal(bb.earthCapture.burnsNeeded, 1);
    assert.equal(bb.earthCapture.feasible, true);
  });
});

describe("EP05 reproduction: missing brachistochrone mass scenarios", () => {
  const r = analyzeEpisode5();
  const bm = r.brachistochroneByMass;

  it("1,000t: 15.1 days, peak 4165 km/s (1.39%c)", () => {
    assertClose(bm[2].timeDays, 15.134195879858355, "1000t timeDays");
    assertClose(bm[2].peakVelocityKms, 4164.6885590029415, "1000t peakV");
    assertClose(bm[2].peakVelocityCFraction, 0.01389190570965912, "1000t cFrac");
  });

  it("3,929t (EP04 30-day boundary): 30.0 days, peak 2101 km/s", () => {
    assertClose(bm[3].timeDays, 29.998557030125, "3929t timeDays");
    assertClose(bm[3].peakVelocityKms, 2101.074807273586, "3929t peakV");
    assertClose(bm[3].deltaVKms, 4202.149614547172, "3929t deltaV");
  });
});

describe("EP05 reproduction: nozzle series margins", () => {
  const r = analyzeEpisode5();
  const nl = r.nozzleLifespan;

  it("series margins: EP02 = 0.53 km/s, EP03 = 1.23°, EP04 = 43%, EP05 = 0.78%", () => {
    const sm = nl.seriesMargins;
    assert.equal(sm.length, 4);
    assertClose(sm[0].margin, 0.53, "EP02 margin");
    assertClose(sm[1].margin, 1.23, "EP03 margin");
    assertClose(sm[2].margin, 43, "EP04 margin");
    assertClose(sm[3].margin, 0.7789095266626722, "EP05 margin");
  });

  it("sensitivity: 5% increase → -8376s, 3% increase → -4402s", () => {
    const sens = nl.sensitivityScenarios;
    const s5 = sens.find((s: { label: string }) => s.label.includes("5%増加"));
    const s3 = sens.find((s: { label: string }) => s.label.includes("3%増加"));
    assert.ok(s5, "5% increase scenario exists");
    assert.ok(s3, "3% increase scenario exists");
    assertClose(s5!.marginSec, -8376, "5% increase margin");
    assertClose(s3!.marginSec, -4401.6, "3% increase margin", 0.001);
  });

  it("sensitivity: 5% decrease → +11496s (healthy margin)", () => {
    const sens = nl.sensitivityScenarios;
    const sd = sens.find((s: { label: string }) => s.label.includes("5%減少"));
    assert.ok(sd, "5% decrease scenario exists");
    assertClose(sd!.marginSec, 11496, "5% decrease margin");
  });
});

describe("EP05 reproduction: analysis status flag", () => {
  const r = analyzeEpisode5();

  it("preliminary = false (analysis finalized)", () => {
    assert.equal(r.preliminary, false);
  });
});

// ============================================================
// Cross-episode consistency checks
// ============================================================

describe("Cross-episode reproduction: consistent parameters", () => {
  const r1 = analyzeEpisode1();
  const r4 = analyzeEpisode4();
  const r5 = analyzeEpisode5();

  it("EP04 and EP05 share the same Hohmann baseline", () => {
    assertClose(r4.hohmann.totalDv, r5.hohmann.totalDvKms, "totalDv EP04 vs EP05");
    assertClose(r4.hohmann.transferTimeYears, r5.hohmann.transferTimeYears, "years EP04 vs EP05");
  });

  it("EP04 closest brachistochrone matches EP05 48kt scenario", () => {
    assertClose(r4.brachistochrone[0].timeDays, r5.brachistochroneByMass[4].timeDays, "timeDays");
    assertClose(r4.brachistochrone[0].deltaVKms, r5.brachistochroneByMass[4].deltaVKms, "deltaVKms");
  });

  it("ship acceleration consistent across episodes", () => {
    // EP01 and EP03 use the same canonical mass/thrust
    const ep01Accel = r1.shipAcceleration.accelNormalMs2;
    const ep04Accel = r4.brachistochrone[0].accelMs2; // 65% thrust / 48kt
    assertClose(ep04Accel / ep01Accel, 0.65, "EP04 65% thrust ratio");
  });
});

// ============================================================
// Cross-episode: constants consistency (kestrel.ts ↔ relativistic analysis)
// ============================================================

describe("Cross-episode: constants consistency", () => {
  const rel = analyzeRelativisticEffects();

  it("relativistic analysis Isp matches KESTREL.ispS", () => {
    assert.equal(rel.parameters.ispSeconds, KESTREL.ispS);
  });

  it("relativistic analysis speed of light matches C_KMS", () => {
    assertClose(rel.parameters.speedOfLightKms, C_KMS, "speedOfLight");
  });

  it("relativistic analysis exhaust velocity matches EXHAUST_VELOCITY_KMS", () => {
    assertClose(rel.parameters.exhaustVelocityKms, EXHAUST_VELOCITY_KMS, "exhaustVelocity");
  });

  it("EP04 damage assessment thrust matches DAMAGED_THRUST_MN", () => {
    const r4 = analyzeEpisode4();
    assertClose(r4.damageAssessment.effectiveThrustMN, DAMAGED_THRUST_MN, "damagedThrust");
  });

  it("EP04 damage assessment normal thrust matches THRUST_MN", () => {
    const r4 = analyzeEpisode4();
    assertClose(r4.damageAssessment.normalThrustMN, THRUST_MN, "normalThrust");
  });
});

// ============================================================
// Cross-episode: EP04→EP05 damage linkage
// ============================================================

describe("Cross-episode: EP04→EP05 damage linkage", () => {
  const r4 = analyzeEpisode4();
  const r5 = analyzeEpisode5();

  it("EP04 thrust fraction 0.65 matches EP05 assumption", () => {
    // EP05 uses 65% thrust from EP04 damage — verify consistency
    assertClose(r4.damageAssessment.thrustFraction, 0.65, "thrustFraction");
    // EP05 brachistochroneByMass at 48kt should use same acceleration as EP04
    assertClose(
      r5.brachistochroneByMass[4].accelMs2,
      r4.brachistochrone[0].accelMs2,
      "48kt accel EP04 vs EP05",
    );
  });

  it("EP04 radiation exposure 480 mSv carries into EP05 burn budget", () => {
    assert.equal(r4.damageAssessment.totalExposureMSv, 480);
    assert.equal(r5.burnBudget.radiationBudget.currentMSv, 480);
    assert.equal(r4.damageAssessment.totalExposureMSv, r5.burnBudget.radiationBudget.currentMSv);
  });

  it("EP05 remaining radiation to ICRP limit is consistent", () => {
    const budget = r5.burnBudget.radiationBudget;
    assertClose(
      budget.remainingToICRPMSv,
      budget.icrpLimitMSv - budget.currentMSv,
      "ICRP remaining",
    );
  });

  it("EP04 plasmoid shield margin 43% matches nozzle seriesMargins", () => {
    // The plasmoid margin fraction should be ~0.4286 (6/14)
    assertClose(r4.plasmoid.marginFraction, 6 / 14, "marginFraction");
    // EP05 nozzle seriesMargins EP04 entry should show 43%
    const ep4Margin = r5.nozzleLifespan.seriesMargins.find(
      (m: { episode: number }) => m.episode === 4,
    );
    assert.ok(ep4Margin, "EP04 series margin entry exists in EP05 nozzle data");
    assertClose(ep4Margin.margin, 43, "EP04 shield margin %", 0.01);
  });
});

// ============================================================
// Cross-episode: nozzle sensitivity scenarios
// ============================================================

describe("Cross-episode: nozzle sensitivity scenarios", () => {
  const r5 = analyzeEpisode5();
  const scenarios = r5.nozzleLifespan.sensitivityScenarios;

  it("plan scenario (55h12m) has positive margin", () => {
    const plan = scenarios[0]; // 計画通り
    assert.ok(plan.marginSec > 0, `plan margin ${plan.marginSec}s should be > 0`);
    assertClose(plan.marginSec, 1560, "plan margin seconds");
  });

  it("1% burn increase scenario has negative margin (nozzle fails)", () => {
    const onePercent = scenarios.find(
      (s: { label: string }) => s.label.includes("1%増加"),
    );
    assert.ok(onePercent, "1% increase scenario exists");
    assert.ok(onePercent.marginSec < 0, `1% increase margin ${onePercent.marginSec}s should be < 0`);
  });

  it("5% decrease scenario has largest positive margin", () => {
    const decrease = scenarios.find(
      (s: { label: string }) => s.label.includes("5%減少"),
    );
    assert.ok(decrease, "5% decrease scenario exists");
    assert.ok(decrease.marginSec > 10000, `5% decrease margin ${decrease.marginSec}s should be > 10000`);
  });
});

// ============================================================
// Cross-episode: relativistic cumulative consistency
// ============================================================

describe("Cross-episode: relativistic cumulative consistency", () => {
  const rel = analyzeRelativisticEffects();

  it("cumulative time dilation ≈ sum of per-transfer values", () => {
    const sum = rel.transfers.reduce(
      (acc: number, t: { relativistic: { timeDilationSec: number } }) =>
        acc + t.relativistic.timeDilationSec,
      0,
    );
    assertClose(rel.summary.cumulativeTimeDilationSec, sum, "cumulative vs sum");
  });

  it("cumulativeTimeDilationMin = cumulativeTimeDilationSec / 60", () => {
    assertClose(
      rel.summary.cumulativeTimeDilationMin,
      rel.summary.cumulativeTimeDilationSec / 60,
      "sec to min conversion",
    );
  });

  it("EP05 contributes the most time dilation", () => {
    const ep05 = rel.transfers.find(
      (t: { transferId: string }) => t.transferId === "ep05-brach-300t",
    );
    assert.ok(ep05, "EP05 transfer exists");
    const maxTd = Math.max(
      ...rel.transfers.map(
        (t: { relativistic: { timeDilationSec: number } }) => t.relativistic.timeDilationSec,
      ),
    );
    assertClose(ep05.relativistic.timeDilationSec, maxTd, "EP05 is max");
  });
});

// ============================================================
// Cross-episode: Oberth effect consistency
// ============================================================

describe("Cross-episode: Oberth effect at Jupiter", () => {
  const r5 = analyzeEpisode5();
  const oberth = r5.oberthEffect;

  it("best-case efficiency << claimed 3%", () => {
    assert.ok(
      oberth.bestCaseVelocityEfficiencyPercent < 0.1,
      `best-case ${oberth.bestCaseVelocityEfficiencyPercent}% should be << 3%`,
    );
    assert.ok(
      oberth.bestCaseVelocityEfficiencyPercent < oberth.claimedEfficiencyPercent,
      "best-case should be less than claimed",
    );
  });

  it("burn saving exceeds nozzle margin", () => {
    assert.equal(oberth.burnSavingExceedsMargin, true);
    // 3% burn saving should be > 26 min nozzle margin
    assert.ok(oberth.threePercentBurnSavingMinutes > 26, "burn saving > 26 min nozzle margin");
  });

  it("v_inf = 1500 km/s consistent with EP05 brachistochrone peak", () => {
    // EP05 300t brachistochrone peak velocity ~7604 km/s (much faster, so 1500 km/s is a
    // conservative v_inf for flyby analysis — the ship's actual speed at Jupiter would depend
    // on trajectory, but should be well above 1500)
    const peak300t = r5.brachistochroneByMass[0].peakVelocityKms;
    assert.ok(
      oberth.vInfKms < peak300t,
      `v_inf ${oberth.vInfKms} should be < peak velocity ${peak300t}`,
    );
  });
});

// ============================================================
// Cross-episode: full route and furthest point
// ============================================================

describe("Cross-episode: full route consistency", () => {
  const r5 = analyzeEpisode5();

  it("furthest point ~19.2 AU is near Uranus semi-major axis", () => {
    // Uranus semi-major axis ~19.19 AU — ship's furthest point should be close
    assertClose(r5.fullRoute.furthestPointAU, 19.2, "furthestPoint vs Uranus", 0.01);
  });

  it("full route has exactly 4 legs", () => {
    assert.equal(r5.fullRoute.legs.length, 4);
  });

  it("EP04 damage assessment carries forward consistently", () => {
    // EP04 damage: 65% thrust, 480 mSv radiation
    // EP05 uses these as constraints — verify the chain
    const r4 = analyzeEpisode4();
    const thrustN = r4.damageAssessment.effectiveThrustN;
    const massKg = KESTREL.massKg;
    const expectedAccel = thrustN / massKg;
    assertClose(
      r5.brachistochroneByMass[4].accelMs2,
      expectedAccel,
      "EP05 48kt accel from EP04 damaged thrust",
    );
  });
});

// ============================================================
// Cross-integrator validation (integrator_comparison.json)
// Pins RK4 vs RK45 vs Störmer-Verlet agreement from Rust tests
// ============================================================

const calcDir = path.join(import.meta.dirname, "..", "..", "reports", "data", "calculations");
const intComp = JSON.parse(fs.readFileSync(path.join(calcDir, "integrator_comparison.json"), "utf-8"));
const comparisons: Array<Record<string, unknown>> = intComp.comparisons;

describe("Integrator comparison: EP01 brachistochrone", () => {
  const ep1Brach = comparisons.find(
    (c) => c.episode === 1 && (c.transfer as string).includes("72h"),
  )!;
  const ep1Flip = comparisons.find(
    (c) => c.episode === 1 && (c.transfer as string).includes("flip"),
  )!;

  it("position diff = 0.015% (1.54e-4 relative)", () => {
    assertClose(ep1Brach.position_diff_relative as number, 1.54e-4, "ep01 posDiffRel", 0.01);
    assertClose(ep1Brach.position_diff_km as number, 84962, "ep01 posDiffKm");
  });

  it("speed diff at flip = 0.656 km/s (1.53e-4 relative)", () => {
    assertClose(ep1Flip.speed_diff_km_s as number, 0.656, "ep01 speedDiffFlip");
    assertClose(ep1Flip.speed_diff_relative as number, 1.53e-4, "ep01 speedDiffRel", 0.01);
    assertClose(ep1Flip.rk4_speed_at_flip_km_s as number, 4272.1, "rk4FlipSpeed", 1e-4);
    assertClose(ep1Flip.rk45_speed_at_flip_km_s as number, 4272.7, "rk45FlipSpeed", 1e-4);
  });
});

describe("Integrator comparison: EP02 trim-thrust", () => {
  const ep2RK = comparisons.find(
    (c) => c.episode === 2 && (c.transfer as string).includes("Trim-thrust"),
  )!;
  const ep2SV = comparisons.find(
    (c) => c.episode === 2 && (c.transfer as string).includes("Störmer-Verlet"),
  )!;

  it("RK4/RK45 machine precision agreement (3.01e-15)", () => {
    assertClose(ep2RK.position_diff_relative as number, 3.01e-15, "ep02 machinePrec", 0.01);
    assert.equal(ep2RK.speed_diff_km_s, 0.0);
  });

  it("Störmer-Verlet energy drift = 2.53e-9 (bounded)", () => {
    assertClose(ep2SV.symplectic_energy_drift as number, 2.53e-9, "svEnergyDrift", 0.01);
    assertClose(ep2SV.position_diff_relative as number, 3.52e-10, "svPosDiff", 0.01);
  });

  it("all integrators agree on Saturn final distance", () => {
    const ep2All = comparisons.find(
      (c) => c.episode === 2 && (c.transfer as string).includes("All integrators"),
    )!;
    assert.equal(ep2All.rk4_final_r_km, ep2All.rk45_final_r_km);
    assert.equal(ep2All.rk4_final_r_km, ep2All.sv_final_r_km);
    assertClose(ep2All.saturn_orbit_ratio as number, 0.877, "saturnOrbitRatio");
  });
});

describe("Integrator comparison: EP03 brachistochrone", () => {
  const ep3Brach = comparisons.find(
    (c) => c.episode === 3 && (c.transfer as string).includes("Brachistochrone"),
  )!;

  it("position diff = 0.008% (7.76e-5 relative)", () => {
    assertClose(ep3Brach.position_diff_relative as number, 7.76e-5, "ep03 posDiffRel", 0.01);
    assertClose(ep3Brach.position_diff_km as number, 111616, "ep03 posDiffKm");
    assertClose(ep3Brach.speed_diff_km_s as number, 0.433, "ep03 speedDiff");
  });
});

describe("Integrator comparison: EP05 deceleration", () => {
  const ep5Decel = comparisons.find(
    (c) => c.episode === 5 && (c.transfer as string).includes("Main deceleration"),
  )!;

  it("main decel: position diff = 0.007% (6.68e-5 relative)", () => {
    assertClose(ep5Decel.position_diff_relative as number, 6.68e-5, "ep05 posDiffRel", 0.01);
    assertClose(ep5Decel.position_diff_km as number, 12625, "ep05 posDiffKm");
    assertClose(ep5Decel.speed_diff_km_s as number, 0.202, "ep05 speedDiff");
  });

  it("RK45 cost ratio = 0.07 (15× cheaper)", () => {
    const cost = intComp.computationCost.ep01_brachistochrone_72h;
    assertClose(cost.costRatio, 0.07, "rk45CostRatio");
    assertClose(cost.rk4_evals, 17280, "rk4Evals");
    assertClose(cost.rk45_evals, 1134, "rk45Evals");
    assert.ok(
      cost.rk4_evals / cost.rk45_evals > 10,
      `RK4/RK45 eval ratio ${cost.rk4_evals / cost.rk45_evals} should be >10`,
    );
  });
});

describe("Integrator comparison: cross-episode consistency", () => {
  it("all episode position diffs < 0.02% relative", () => {
    const brachComps = comparisons.filter(
      (c) => typeof c.position_diff_relative === "number" && (c.position_diff_relative as number) > 0,
    );
    assert.ok(brachComps.length >= 3, `expected ≥3 comparisons with position_diff, got ${brachComps.length}`);
    for (const comp of brachComps) {
      const relDiff = comp.position_diff_relative as number;
      assert.ok(
        relDiff < 2e-4,
        `${comp.transfer}: position diff ${relDiff} exceeds 0.02% threshold`,
      );
    }
  });
});

// ============================================================
// Onscreen crossref reproduction (ep*_onscreen_crossref.json)
// Pins on-screen display vs computed orbital mechanics values
// ============================================================

function loadCrossref(ep: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(calcDir, `${ep}_onscreen_crossref.json`), "utf-8"));
}

describe("Onscreen crossref: EP01 Jupiter SOI entry", () => {
  const cr = loadCrossref("ep01") as Record<string, Record<string, Record<string, number>>>;

  it("vis-viva velocity at 20 RJ = 17.92 km/s (on-screen 17.8, 0.67% diff)", () => {
    assertClose(cr.jupiterSOI.computed.v_at_20RJ_km_s, 17.92, "v20RJ");
    assertClose(cr.jupiterSOI.comparison.velocity_difference_km_s, 0.12, "vDiffKms");
    assertClose(cr.jupiterSOI.comparison.velocity_difference_percent, 0.67, "vDiffPct");
  });

  it("Ganymede approach: computed v=12.48 km/s, relative v=1.60 km/s", () => {
    assertClose(cr.ganymedeApproach.computed.v_at_ganymede_orbit_km_s, 12.48, "vGanOrbit");
    assertClose(cr.ganymedeApproach.computed.ganymede_orbital_velocity_km_s, 10.88, "vGanOrbital");
    assertClose(cr.ganymedeApproach.computed.relative_velocity_km_s, 1.60, "vRelGanymede");
  });
});

describe("Onscreen crossref: EP03 brachistochrone symmetry", () => {
  const cr = loadCrossref("ep03") as Record<string, Record<string, number>>;

  it("cruise/capture burn duration ratio = 1.000274 (30s in ~109500s)", () => {
    assertClose(cr.brachistochroneSymmetry.cruiseBurnDuration_s, 109500, "cruiseDur");
    assertClose(cr.brachistochroneSymmetry.capturePrepDuration_s, 109530, "captureDur");
    assertClose(cr.brachistochroneSymmetry.difference_s, 30, "durDiff");
    assertClose(cr.brachistochroneSymmetry.ratio, 1.000274, "symmetryRatio");
  });

  it("total ΔV = 5984.54 km/s (5984.31 main + 0.23 RCS)", () => {
    assertClose(cr.burnSequenceCrossReference.totalDeltaV_km_s, 5984.54, "totalDv");
    assertClose(cr.burnSequenceCrossReference.mainBurnsDeltaV_km_s, 5984.31, "mainDv");
    assertClose(cr.burnSequenceCrossReference.rcsTrimsDeltaV_km_s, 0.23, "rcsDv");
  });
});

describe("Onscreen crossref: EP05 burn sequence accelerations", () => {
  const cr = loadCrossref("ep05") as Record<string, unknown>;
  const burns = (cr.routeBurnVerification as Record<string, unknown>).burns as Array<Record<string, Record<string, number>>>;

  it("4 burns: 16.38, 13.66, 10.92, 15.02 m/s² (non-monotonic pattern)", () => {
    assert.equal(burns.length, 4);
    assertClose(burns[0].computed.acceleration_ms2, 16.38, "burn1Accel");
    assertClose(burns[1].computed.acceleration_ms2, 13.66, "burn2Accel");
    assertClose(burns[2].computed.acceleration_ms2, 10.92, "burn3Accel");
    assertClose(burns[3].computed.acceleration_ms2, 15.02, "burn4Accel");
  });

  it("total burn time = 80.633 hours (290280 s)", () => {
    const total = (cr.routeBurnVerification as Record<string, Record<string, number>>).totalBurnVerification;
    assertClose(total.onScreen_hours, 80.633, "totalBurnHrs");
    assertClose(total.computed_s, 290280, "totalBurnSec");
  });

  it("coast fraction 84.1% of 507h mission", () => {
    const timeline = (cr.missionTimelineVerification as Record<string, Record<string, number>>).coastFraction;
    assertClose(timeline.coastPercent, 84.1, "coastPct");
    assertClose(timeline.totalCoast_hours, 426.367, "totalCoast");
    assertClose(timeline.totalBurn_hours, 80.633, "totalBurn");
  });
});

describe("Onscreen crossref: EP05 ice particle impact", () => {
  const cr = loadCrossref("ep05") as Record<string, unknown>;
  const ice = cr.saturnRingIceParticle as Record<string, Record<string, Record<string, number>>>;

  it("solid ice sphere KE = 540.1 MJ (vs on-screen 110 MJ, 4.9× factor)", () => {
    assertClose(ice.physicsVerification.assumption1_solidIceSphere.kineticEnergy_MJ, 540.1, "solidIceKE");
    assertClose(ice.physicsVerification.particleSizeFor110MJ.requiredDiameter_cm, 0.585, "reqDiameter");
  });
});

describe("Onscreen crossref: EP05 nozzle margin", () => {
  const cr = loadCrossref("ep05") as Record<string, unknown>;
  const nozzle = cr.nozzleLifespanMargin as Record<string, Record<string, number>>;

  it("on-screen +0:26:00 matches analysis 26 min (0.78%)", () => {
    assertClose(nozzle.onScreen.marginMinutes, 26, "onScreenMargin");
    assertClose(nozzle.existingAnalysis.marginMinutes, 26, "analysisMargin");
    assertClose(nozzle.existingAnalysis.marginPercent, 0.78, "marginPct");
    assertClose(nozzle.existingAnalysis.nozzleLifetime_hours, 55.633, "nozzleLife");
    assertClose(nozzle.existingAnalysis.requiredBurnTime_hours, 55.200, "reqBurnTime");
  });
});

// ============================================================
// 3D orbital analysis reproduction (3d_orbital_analysis.json)
// Pins ecliptic z-heights, plane changes, approach geometry
// ============================================================

const orbital3d = JSON.parse(fs.readFileSync(path.join(calcDir, "3d_orbital_analysis.json"), "utf-8"));
const transfers3d: Array<Record<string, unknown>> = orbital3d.transfers;

describe("3D orbital: transfer plane change fractions", () => {
  it("max plane change = EP03 Saturn→Uranus at 1.51%", () => {
    assertClose(orbital3d.maxPlaneChangeFractionPercent, 1.510119325764719, "maxPlaneChange");
    const ep3 = transfers3d.find((t) => (t.leg as string).includes("Saturn→Uranus"))!;
    assertClose(ep3.planeChangeFractionPercent as number, 1.510119325764719, "ep03PlaneChange");
  });

  it("all 4 transfers have plane change < 2%", () => {
    assert.equal(transfers3d.length, 4);
    for (const t of transfers3d) {
      const pct = t.planeChangeFractionPercent as number;
      assert.ok(pct < 2, `${t.leg}: plane change ${pct}% exceeds 2%`);
    }
  });
});

describe("3D orbital: planetary z-heights at epoch", () => {
  const heights = orbital3d.planetaryZHeightsAtEpoch;

  it("Saturn z-height = 47,708,410 km (highest, 0.319 AU)", () => {
    assertClose(heights.saturn.zHeightKm, 47708409.62265145, "saturnZKm");
    assertClose(heights.saturn.zHeightAU, 0.3189110205874839, "saturnZAU");
    assertClose(heights.saturn.latitudeDeg, 1.95006593534866, "saturnLat");
  });

  it("Earth z-height = -30,511 km (essentially zero, -0.0002 AU)", () => {
    assertClose(heights.earth.zHeightKm, -30510.850005525346, "earthZKm");
    assertClose(heights.earth.zHeightAU, -0.0002039524350363989, "earthZAU");
    assert.ok(
      Math.abs(heights.earth.zHeightAU) < 0.001,
      `Earth z-height ${heights.earth.zHeightAU} AU should be ~0`,
    );
  });
});

describe("3D orbital: Saturn ring approach geometry", () => {
  const ring = orbital3d.saturnRingAnalysis;

  it("approach angle 9.33° (shallow, nearly ring-plane parallel)", () => {
    assertClose(ring.approachFromJupiter.approachAngleToDeg, 9.32676353025429, "ringApproachAngle");
    assert.ok(ring.approachFromJupiter.approachAngleToDeg < 15, "approach should be shallow (<15°)");
  });

  it("Enceladus orbit outside rings", () => {
    assert.equal(ring.enceladusOutsideRings, true);
    assertClose(ring.enceladusOrbitKm, 238042, "enceladusOrbit");
    assert.ok(ring.enceladusOrbitKm > ring.ringOuterKm, "Enceladus should be outside ring outer edge");
  });
});

describe("3D orbital: Uranus approach geometry", () => {
  const uranus = orbital3d.uranusApproachAnalysis;

  it("obliquity 97.77°, equatorial approach at 25.33°", () => {
    assertClose(uranus.obliquityDeg, 97.77, "uranusObliquity");
    assertClose(uranus.approachFromSaturn.angleToDeg, 25.328576629202104, "approachAngle");
    assert.equal(uranus.approachFromSaturn.isEquatorial, true);
    assert.equal(uranus.approachFromSaturn.isPolar, false);
  });
});
