/**
 * Tests for Episode 4 analysis: Titania (Uranus) → Earth.
 *
 * These tests verify the orbital mechanics calculations for the
 * "new Solar Line" route and the plasmoid encounter in Uranus magnetosphere.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hohmannBaseline,
  uranusDeparture,
  brachistochroneAnalysis,
  massFeasibilityAnalysis,
  plasmoidAnalysis,
  plasmoidPerturbationAnalysis,
  fleetInterceptAnalysis,
  damageAssessment,
  analyzeEpisode4,
  KESTREL,
  EP04_PARAMS,
  UE_DISTANCE_SCENARIOS,
  distanceInAU,
} from "./ep04-analysis.ts";

describe("EP04 Constants", () => {
  it("KESTREL damaged thrust is 65% of normal", () => {
    const expected = KESTREL.thrustN * 0.65;
    assert.ok(
      Math.abs(KESTREL.damagedThrustN - expected) < 10000,
      `damagedThrust=${KESTREL.damagedThrustN}, expected ~${expected}`,
    );
  });

  it("EP04_PARAMS has correct time conversions", () => {
    assert.equal(EP04_PARAMS.titaniaRemainingTimeSec, 9 * 3600 + 42 * 60);
    assert.equal(EP04_PARAMS.coolantDeadlineSec, 12 * 3600);
    assert.equal(EP04_PARAMS.fleetETASec, 33 * 3600);
  });

  it("distance scenarios are in correct order", () => {
    assert.ok(UE_DISTANCE_SCENARIOS.closest < UE_DISTANCE_SCENARIOS.mid);
    assert.ok(UE_DISTANCE_SCENARIOS.mid < UE_DISTANCE_SCENARIOS.farthest);
  });

  it("closest Uranus-Earth distance is ~18.2 AU", () => {
    const au = distanceInAU(UE_DISTANCE_SCENARIOS.closest);
    assert.ok(au > 18 && au < 19, `closest=${au} AU, expected ~18.2`);
  });
});

describe("EP04 Hohmann Baseline: Uranus → Earth", () => {
  it("computes ~16 year transfer time", () => {
    const h = hohmannBaseline();
    assert.ok(
      h.transferTimeYears > 14 && h.transferTimeYears < 20,
      `transferTime=${h.transferTimeYears} years`,
    );
  });

  it("total ΔV is ~16 km/s for this large orbit ratio", () => {
    const h = hohmannBaseline();
    assert.ok(h.totalDv > 14 && h.totalDv < 18, `totalDv=${h.totalDv} km/s`);
    assert.ok(h.departureDv > 0);
    assert.ok(h.arrivalDv > 0);
  });

  it("arrival ΔV > departure ΔV (inward transfer)", () => {
    const h = hohmannBaseline();
    assert.ok(
      h.arrivalDv > h.departureDv,
      `arrival=${h.arrivalDv} > departure=${h.departureDv}`,
    );
  });

  it("transfer time >> any reasonable ship travel time", () => {
    const h = hohmannBaseline();
    assert.ok(h.transferTimeDays > 5000, `${h.transferTimeDays} days`);
  });
});

describe("EP04 Uranus Departure from Titania", () => {
  it("escape velocity from Titania orbit is ~5 km/s", () => {
    const d = uranusDeparture();
    assert.ok(
      d.vEscUranusKms > 4 && d.vEscUranusKms < 6,
      `vEsc=${d.vEscUranusKms} km/s`,
    );
  });

  it("circular velocity at Titania is ~3.6 km/s", () => {
    const d = uranusDeparture();
    assert.ok(
      d.vCircTitaniaKms > 3 && d.vCircTitaniaKms < 4.5,
      `vCirc=${d.vCircTitaniaKms} km/s`,
    );
  });

  it("ΔV to escape from Titania orbit is ~1.5 km/s", () => {
    const d = uranusDeparture();
    assert.ok(
      d.dvEscapeFromTitaniaKms > 1 && d.dvEscapeFromTitaniaKms < 2,
      `dvEscape=${d.dvEscapeFromTitaniaKms} km/s`,
    );
  });

  it("Uranus orbital velocity is ~6.8 km/s", () => {
    const d = uranusDeparture();
    assert.ok(
      d.uranusOrbitalVKms > 6 && d.uranusOrbitalVKms < 7.5,
      `uranusV=${d.uranusOrbitalVKms} km/s`,
    );
  });

  it("acceleration at full mass with damaged thrust is ~0.13 m/s²", () => {
    const d = uranusDeparture();
    assert.ok(
      Math.abs(d.accelAtFullMassMs2 - 0.133) < 0.01,
      `accel=${d.accelAtFullMassMs2} m/s²`,
    );
  });
});

describe("EP04 Brachistochrone Analysis", () => {
  it("returns 3 distance scenarios", () => {
    const b = brachistochroneAnalysis();
    assert.equal(b.length, 3);
  });

  it("at 48,000t and 6.37 MN, acceleration is ~0.133 m/s²", () => {
    const b = brachistochroneAnalysis();
    const closest = b.find(s => s.scenario === "closest")!;
    assert.ok(
      Math.abs(closest.accelMs2 - 0.133) < 0.01,
      `accel=${closest.accelMs2} m/s²`,
    );
    assert.ok(closest.accelG < 0.02, `accelG=${closest.accelG}`);
  });

  it("at 48,000t, closest trip takes ~105 days", () => {
    const b = brachistochroneAnalysis();
    const closest = b.find(s => s.scenario === "closest")!;
    assert.ok(
      closest.timeDays > 90 && closest.timeDays < 120,
      `timeDays=${closest.timeDays}`,
    );
  });

  it("ΔV scales with distance scenario", () => {
    const b = brachistochroneAnalysis();
    const closest = b.find(s => s.scenario === "closest")!;
    const farthest = b.find(s => s.scenario === "farthest")!;
    assert.ok(farthest.deltaVKms > closest.deltaVKms);
  });

  it("ΔV is ~1200 km/s at closest distance", () => {
    const b = brachistochroneAnalysis();
    const closest = b.find(s => s.scenario === "closest")!;
    assert.ok(
      closest.deltaVKms > 1000 && closest.deltaVKms < 1400,
      `deltaV=${closest.deltaVKms} km/s`,
    );
  });
});

describe("EP04 Mass Feasibility", () => {
  it("lighter mass enables shorter trips", () => {
    const m = massFeasibilityAnalysis(UE_DISTANCE_SCENARIOS.closest);
    const day30 = m.find(s => s.targetDays === 30)!;
    const day365 = m.find(s => s.targetDays === 365)!;
    assert.ok(day30.maxMassT < day365.maxMassT);
    assert.ok(day30.deltaVKms > day365.deltaVKms);
  });

  it("provides results for all target durations", () => {
    const m = massFeasibilityAnalysis(UE_DISTANCE_SCENARIOS.closest);
    assert.equal(m.length, 5);
    assert.deepEqual(m.map(s => s.targetDays), [30, 60, 90, 180, 365]);
  });

  it("mass boundary is consistent with physics: thrust / accel = mass", () => {
    const m = massFeasibilityAnalysis(UE_DISTANCE_SCENARIOS.closest);
    for (const s of m) {
      const expectedMass = KESTREL.damagedThrustN / s.accelMs2;
      assert.ok(
        Math.abs(s.maxMassKg - expectedMass) / expectedMass < 0.001,
        `mass=${s.maxMassKg} vs expected=${expectedMass}`,
      );
    }
  });

  it("30-day trip mass boundary is ~3,929 t", () => {
    const m = massFeasibilityAnalysis(UE_DISTANCE_SCENARIOS.closest);
    const day30 = m.find(s => s.targetDays === 30)!;
    assert.ok(
      day30.maxMassT > 3500 && day30.maxMassT < 4500,
      `maxMass30d=${day30.maxMassT} t`,
    );
  });
});

describe("EP04 Plasmoid Analysis", () => {
  it("shield margin is 6 minutes", () => {
    const p = plasmoidAnalysis();
    assert.equal(p.marginMin, 6);
    assert.equal(p.marginSec, 360);
  });

  it("margin fraction is ~43%", () => {
    const p = plasmoidAnalysis();
    assert.ok(
      Math.abs(p.marginFraction - 6 / 14) < 0.01,
      `marginFraction=${p.marginFraction}`,
    );
  });

  it("stated tilt matches real Uranus value within 1%", () => {
    const p = plasmoidAnalysis();
    assert.ok(
      p.tiltAccuracyPercent > 99,
      `tiltAccuracy=${p.tiltAccuracyPercent}%`,
    );
  });

  it("worst case exposure is ~1008 mSv", () => {
    const p = plasmoidAnalysis();
    assert.ok(
      Math.abs(p.worstCaseExposureMSv - 1008) < 1,
      `worstCase=${p.worstCaseExposureMSv} mSv`,
    );
  });

  it("actual cumulative is lower than worst case", () => {
    const p = plasmoidAnalysis();
    assert.ok(
      p.totalExposureMSv < p.worstCaseExposureMSv,
      `actual=${p.totalExposureMSv} < worst=${p.worstCaseExposureMSv}`,
    );
  });
});

describe("EP04 Fleet Intercept Analysis", () => {
  it("fleet arrives in 33 hours", () => {
    const f = fleetInterceptAnalysis();
    assert.equal(f.fleetETAHours, 33);
  });

  it("available time after Kestrel arrival is ~23.3 hours", () => {
    const f = fleetInterceptAnalysis();
    assert.ok(
      Math.abs(f.availableTimeHours - 23.3) < 0.1,
      `availableTime=${f.availableTimeHours} h`,
    );
  });

  it("fleet scenarios have subluminal speeds", () => {
    const f = fleetInterceptAnalysis();
    for (const s of f.scenarios) {
      assert.ok(s.avgSpeedKms > 0);
      assert.ok(
        s.avgSpeedCFraction < 0.1,
        `${s.label}: ${s.avgSpeedCFraction}c`,
      );
    }
  });
});

describe("EP04 Damage Assessment", () => {
  it("effective thrust is 6.37 MN", () => {
    const d = damageAssessment();
    assert.ok(
      Math.abs(d.effectiveThrustMN - 6.37) < 0.01,
      `thrust=${d.effectiveThrustMN} MN`,
    );
  });

  it("thermal margin is 78%", () => {
    const d = damageAssessment();
    assert.equal(d.thermalMargin, 0.78);
  });

  it("available burns: 3-4", () => {
    const d = damageAssessment();
    assert.equal(d.availableBurns.min, 3);
    assert.equal(d.availableBurns.max, 4);
  });
});

describe("EP04 Plasmoid Momentum Perturbation", () => {
  it("returns 3 scenarios", () => {
    const results = plasmoidPerturbationAnalysis();
    assert.equal(results.length, 3);
    assert.equal(results[0].label, "nominal");
    assert.equal(results[1].label, "enhanced");
    assert.equal(results[2].label, "extreme");
  });

  it("nominal scenario has negligible velocity perturbation", () => {
    const results = plasmoidPerturbationAnalysis();
    const nominal = results.find(r => r.label === "nominal")!;
    assert.ok(
      nominal.velocityPerturbationMs < 1e-3,
      `nominal Δv = ${nominal.velocityPerturbationMs} m/s (should be < 0.001)`,
    );
  });

  it("even extreme scenario is negligible for 48,000t ship", () => {
    const results = plasmoidPerturbationAnalysis();
    const extreme = results.find(r => r.label === "extreme")!;
    assert.ok(
      extreme.velocityPerturbationMs < 0.1,
      `extreme Δv = ${extreme.velocityPerturbationMs} m/s (should be < 0.1)`,
    );
  });

  it("correction ΔV is negligible compared to orbital velocity", () => {
    const results = plasmoidPerturbationAnalysis();
    for (const r of results) {
      assert.ok(
        r.correctionToOrbitalRatio < 1e-6,
        `${r.label}: correction/orbital = ${r.correctionToOrbitalRatio}`,
      );
    }
  });

  it("perturbation scales with scenario severity", () => {
    const results = plasmoidPerturbationAnalysis();
    const nominal = results.find(r => r.label === "nominal")!;
    const enhanced = results.find(r => r.label === "enhanced")!;
    const extreme = results.find(r => r.label === "extreme")!;
    assert.ok(extreme.forceN > enhanced.forceN);
    assert.ok(enhanced.forceN > nominal.forceN);
  });

  it("miss distance is proportional to velocity perturbation", () => {
    const results = plasmoidPerturbationAnalysis();
    for (const r of results) {
      const expectedMiss = (r.velocityPerturbationMs * EP04_PARAMS.titaniaRemainingTimeSec) / 1000;
      assert.ok(
        Math.abs(r.missDistanceKm - expectedMiss) < 1e-10,
        `${r.label}: miss=${r.missDistanceKm} vs expected=${expectedMiss}`,
      );
    }
  });
});

describe("EP04 Full Analysis", () => {
  it("analyzeEpisode4 returns all expected sections", () => {
    const a = analyzeEpisode4();
    assert.ok(a.hohmann);
    assert.ok(a.uranusDeparture);
    assert.ok(a.brachistochrone);
    assert.ok(a.massFeasibility);
    assert.ok(a.plasmoid);
    assert.ok(a.plasmoidMomentum);
    assert.ok(a.fleetIntercept);
    assert.ok(a.damageAssessment);
  });

  it("cross-check: departure ΔV is achievable", () => {
    const a = analyzeEpisode4();
    assert.ok(
      a.uranusDeparture.dvEscapeFromTitaniaKms < 10,
      `escape ΔV=${a.uranusDeparture.dvEscapeFromTitaniaKms} km/s is reasonable`,
    );
  });

  it("cross-check: Hohmann transfer vastly slower than brachistochrone", () => {
    const a = analyzeEpisode4();
    assert.ok(
      a.hohmann.transferTimeDays > a.brachistochrone[0].timeDays,
      `Hohmann=${a.hohmann.transferTimeDays} days >> Brach=${a.brachistochrone[0].timeDays} days`,
    );
  });

  it("analysis is internally consistent", () => {
    const a = analyzeEpisode4();
    assert.equal(a.damageAssessment.thrustFraction, EP04_PARAMS.thrustFraction);
    assert.ok(a.fleetIntercept.fleetETASec > a.fleetIntercept.arrivalTimeSec);
  });
});
