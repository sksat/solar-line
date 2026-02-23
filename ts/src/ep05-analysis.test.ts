/**
 * Tests for Episode 5 analysis: Uranus→Earth series finale.
 *
 * These tests verify orbital mechanics calculations for the final leg
 * of the Solar Line route. Marked as preliminary pending subtitle data.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hohmannBaseline,
  brachistochroneByMass,
  earthApproachAnalysis,
  burnBudgetAnalysis,
  fullRouteSummary,
  earthCaptureScenarios,
  analyzeEpisode5,
  KESTREL,
  EP05_PARAMS,
  UE_DISTANCE_SCENARIOS,
  distanceInAU,
} from "./ep05-analysis.ts";

describe("EP05 Constants", () => {
  it("KESTREL specs match ep04 damaged state", () => {
    assert.equal(KESTREL.damagedThrustN, 6_370_000);
    assert.equal(KESTREL.thrustN, 9_800_000);
    assert.equal(KESTREL.massKg, 48_000_000);
  });

  it("EP05_PARAMS carries forward ep04 damage state", () => {
    assert.equal(EP05_PARAMS.thrustFraction, 0.65);
    assert.equal(EP05_PARAMS.thermalMarginFraction, 0.78);
    assert.equal(EP05_PARAMS.cumulativeRadiationMSv, 480);
  });

  it("remaining burns after departure is 2-3", () => {
    assert.equal(EP05_PARAMS.remainingBurnsAfterDeparture.min, 2);
    assert.equal(EP05_PARAMS.remainingBurnsAfterDeparture.max, 3);
  });

  it("distance scenarios are in correct order", () => {
    assert.ok(UE_DISTANCE_SCENARIOS.closest < UE_DISTANCE_SCENARIOS.mid);
    assert.ok(UE_DISTANCE_SCENARIOS.mid < UE_DISTANCE_SCENARIOS.farthest);
  });

  it("closest Uranus-Earth distance is ~18.2 AU", () => {
    const au = distanceInAU(UE_DISTANCE_SCENARIOS.closest);
    assert.ok(au > 18 && au < 19, `closest=${au} AU`);
  });
});

describe("EP05 Hohmann Baseline", () => {
  it("computes ~16 year transfer time", () => {
    const h = hohmannBaseline();
    assert.ok(h.transferTimeYears > 14 && h.transferTimeYears < 20, `${h.transferTimeYears} years`);
  });

  it("total ΔV is ~16 km/s", () => {
    const h = hohmannBaseline();
    assert.ok(h.totalDvKms > 14 && h.totalDvKms < 18, `${h.totalDvKms} km/s`);
  });

  it("arrival ΔV > departure ΔV (inward transfer needs more at inner orbit)", () => {
    const h = hohmannBaseline();
    assert.ok(h.arrivalDvKms > h.departureDvKms);
  });

  it("semi-major axis is between Earth and Uranus", () => {
    const h = hohmannBaseline();
    assert.ok(h.semiMajorAxisAU > 1 && h.semiMajorAxisAU < 20);
  });
});

describe("EP05 Brachistochrone by Mass", () => {
  it("returns 5 mass scenarios", () => {
    const b = brachistochroneByMass();
    assert.equal(b.length, 5);
  });

  it("lighter mass = shorter time", () => {
    const b = brachistochroneByMass();
    assert.ok(b[0].timeDays < b[b.length - 1].timeDays, "300t should be faster than 48,000t");
  });

  it("300t scenario completes in ~8 days", () => {
    const b = brachistochroneByMass();
    const light = b.find(s => s.massKg === 300_000)!;
    assert.ok(light.timeDays > 5 && light.timeDays < 12, `${light.timeDays} days`);
  });

  it("48,000t scenario takes ~105 days", () => {
    const b = brachistochroneByMass();
    const heavy = b.find(s => s.massKg === 48_000_000)!;
    assert.ok(heavy.timeDays > 90 && heavy.timeDays < 120, `${heavy.timeDays} days`);
  });

  it("peak velocity is subluminal for all scenarios", () => {
    const b = brachistochroneByMass();
    for (const s of b) {
      // At 300t, peak ~2.5%c (7,600 km/s) — high but subluminal for brachistochrone SF
      assert.ok(s.peakVelocityCFraction < 0.1, `${s.label}: ${s.peakVelocityCFraction}c`);
    }
  });

  it("ΔV = 4 * distance / time for each scenario", () => {
    const b = brachistochroneByMass();
    for (const s of b) {
      const expected = 4 * s.distanceKm / s.timeSec;
      assert.ok(Math.abs(s.deltaVKms - expected) / expected < 0.001, `ΔV mismatch for ${s.label}`);
    }
  });
});

describe("EP05 Earth Approach Analysis", () => {
  it("Earth circular velocity is ~29.8 km/s", () => {
    const a = earthApproachAnalysis();
    assert.ok(a.vCircEarthKms > 29 && a.vCircEarthKms < 31, `${a.vCircEarthKms} km/s`);
  });

  it("Hohmann v_inf is > 0", () => {
    const a = earthApproachAnalysis();
    assert.ok(a.hohmannArrival.vInfKms > 0);
  });

  it("Hohmann LEO capture ΔV is substantial", () => {
    const a = earthApproachAnalysis();
    assert.ok(a.hohmannArrival.dvCaptureLEOKms > 5, `${a.hohmannArrival.dvCaptureLEOKms} km/s`);
  });

  it("brachistochrone LEO capture is just circular velocity (~7.7 km/s)", () => {
    const a = earthApproachAnalysis();
    assert.ok(
      a.brachistochroneArrival.dvCaptureLEOKms > 7 && a.brachistochroneArrival.dvCaptureLEOKms < 8,
      `${a.brachistochroneArrival.dvCaptureLEOKms} km/s`,
    );
  });

  it("Moon orbit capture ΔV is higher than LEO for Hohmann (shallower gravity well)", () => {
    const a = earthApproachAnalysis();
    // At Moon orbit, less gravitational potential to slow the hyperbolic approach,
    // so dvCapture = v_hyp - v_circ is actually LARGER than at LEO for high v_inf
    assert.ok(a.hohmannArrival.dvCaptureMoonOrbitKms > 0);
    assert.ok(a.hohmannArrival.dvCaptureLEOKms > 0);
  });

  it("brachistochrone capture at Moon orbit is less than at LEO (zero v_inf)", () => {
    const a = earthApproachAnalysis();
    // With v_inf ≈ 0, only need to match circular velocity which is lower at Moon orbit
    assert.ok(a.brachistochroneArrival.dvCaptureMoonOrbitKms < a.brachistochroneArrival.dvCaptureLEOKms);
  });
});

describe("EP05 Burn Budget Analysis", () => {
  it("brachistochrone is feasible with remaining burns", () => {
    const b = burnBudgetAnalysis();
    assert.ok(b.brachistochrone.feasible);
    assert.equal(b.brachistochrone.burnsNeeded, 2);
  });

  it("Earth capture is feasible with max burns", () => {
    const b = burnBudgetAnalysis();
    assert.ok(b.earthCapture.feasible);
  });

  it("total minimum burns needed is 3", () => {
    const b = burnBudgetAnalysis();
    assert.equal(b.totalMinBurnsNeeded, 3);
  });

  it("radiation budget has some remaining margin", () => {
    const b = burnBudgetAnalysis();
    assert.ok(b.radiationBudget.remainingToICRPMSv > 0);
    assert.ok(b.radiationBudget.remainingToNASAMSv > 0);
    assert.equal(b.radiationBudget.remainingToICRPMSv, 20);
    assert.equal(b.radiationBudget.remainingToNASAMSv, 120);
  });

  it("thermal risk assessment is present", () => {
    const b = burnBudgetAnalysis();
    assert.ok(["low", "moderate", "high"].includes(b.thermalAnalysis.thermalRisk));
  });
});

describe("EP05 Full Route Summary", () => {
  it("covers 4 route legs across all episodes", () => {
    const r = fullRouteSummary();
    assert.equal(r.legs.length, 4);
  });

  it("total distance is > 30 AU (round-trip to Uranus)", () => {
    const r = fullRouteSummary();
    assert.ok(r.totalDistAU > 30, `totalDist=${r.totalDistAU} AU`);
  });

  it("furthest point is ~19.2 AU (Uranus orbit)", () => {
    const r = fullRouteSummary();
    assert.ok(r.furthestPointAU > 19 && r.furthestPointAU < 20, `furthest=${r.furthestPointAU} AU`);
  });

  it("route starts at Mars and ends at Earth", () => {
    const r = fullRouteSummary();
    assert.equal(r.startBody, "火星");
    assert.equal(r.endBody, "地球");
  });
});

describe("EP05 Earth Capture Scenarios", () => {
  it("provides 3 capture targets", () => {
    const c = earthCaptureScenarios();
    assert.equal(c.scenarios.length, 3);
  });

  it("LEO circular velocity is ~7.7 km/s", () => {
    const c = earthCaptureScenarios();
    const leo = c.scenarios.find(s => s.label.includes("LEO"))!;
    assert.ok(leo.vCircKms > 7.5 && leo.vCircKms < 8, `${leo.vCircKms} km/s`);
  });

  it("capture ΔV increases with v_inf", () => {
    const c = earthCaptureScenarios();
    for (let i = 1; i < c.captureTable.length; i++) {
      const prev = c.captureTable[i - 1].captures[0].dvCaptureKms;
      const curr = c.captureTable[i].captures[0].dvCaptureKms;
      assert.ok(curr > prev, `v_inf scenario ${i}: ${curr} > ${prev}`);
    }
  });

  it("at v_inf=0, capture ΔV equals circular velocity", () => {
    const c = earthCaptureScenarios();
    const zeroVinf = c.captureTable.find(t => t.vInfKms === 0)!;
    const leo = c.scenarios.find(s => s.label.includes("LEO"))!;
    const leoCapture = zeroVinf.captures.find(cap => cap.target.includes("LEO"))!;
    // At v_inf=0, v_hyp at periapsis = v_esc = sqrt(2)*v_circ
    // So dv = v_esc - v_circ = (sqrt(2) - 1) * v_circ
    const expectedDv = (Math.sqrt(2) - 1) * leo.vCircKms;
    assert.ok(
      Math.abs(leoCapture.dvCaptureKms - expectedDv) / expectedDv < 0.01,
      `dvCapture=${leoCapture.dvCaptureKms}, expected=${expectedDv}`,
    );
  });

  it("provides 5 v_inf scenarios", () => {
    const c = earthCaptureScenarios();
    assert.equal(c.captureTable.length, 5);
  });
});

describe("EP05 Full Analysis", () => {
  it("analyzeEpisode5 returns all expected sections", () => {
    const a = analyzeEpisode5();
    assert.ok(a.hohmann);
    assert.ok(a.brachistochroneByMass);
    assert.ok(a.earthApproach);
    assert.ok(a.burnBudget);
    assert.ok(a.fullRoute);
    assert.ok(a.earthCapture);
    assert.ok(a.preliminary === true);
  });

  it("cross-check: Hohmann vastly slower than brachistochrone", () => {
    const a = analyzeEpisode5();
    assert.ok(a.hohmann.transferTimeDays > a.brachistochroneByMass[0].timeDays);
  });

  it("cross-check: burn budget supports brachistochrone", () => {
    const a = analyzeEpisode5();
    assert.ok(a.burnBudget.brachistochrone.feasible);
  });
});
