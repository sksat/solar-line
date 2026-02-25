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
import { analyzeEpisode1 } from "./ep01-analysis.ts";
import { analyzeEpisode2 } from "./ep02-analysis.ts";
import { analyzeEpisode3 } from "./ep03-analysis.ts";
import { analyzeEpisode4 } from "./ep04-analysis.ts";
import { analyzeEpisode5 } from "./ep05-analysis.ts";

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

  it("transit time = 455.3 days", () => {
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
