/**
 * Tests for Episode 3 analysis: Saturn (Enceladus) → Uranus (Titania).
 *
 * These tests verify the orbital mechanics calculations for Episode 3
 * and ensure the analysis produces physically meaningful results.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hohmannBaseline,
  saturnDeparture,
  brachistochroneAnalysis,
  navigationCrisisAnalysis,
  uranusCaptureAnalysis,
  cruiseVelocityAnalysis,
  maxFeasibleMass,
  minimumTransferTime,
  analyzeEpisode3,
  EP03_PARAMS,
  SU_DISTANCE_SCENARIOS,
} from "./ep03-analysis.ts";

describe("Episode 3: Saturn→Uranus Analysis", () => {
  describe("Hohmann baseline Saturn→Uranus", () => {
    it("should compute reasonable ΔV values", () => {
      const h = hohmannBaseline();
      assert.ok(h.totalDv > 1.5, `totalDv ${h.totalDv} should be > 1.5`);
      assert.ok(h.totalDv < 4.0, `totalDv ${h.totalDv} should be < 4.0`);
    });

    it("should compute transfer time of ~27 years", () => {
      const h = hohmannBaseline();
      assert.ok(h.transferTimeYears > 24, `years ${h.transferTimeYears} should be > 24`);
      assert.ok(h.transferTimeYears < 32, `years ${h.transferTimeYears} should be < 32`);
    });

    it("departure and arrival ΔV should both be positive", () => {
      const h = hohmannBaseline();
      assert.ok(h.departureDv > 0);
      assert.ok(h.arrivalDv > 0);
    });
  });

  describe("Saturn departure from Enceladus", () => {
    it("should compute escape velocity from Saturn at Enceladus orbit", () => {
      const dep = saturnDeparture();
      assert.ok(dep.vEscSaturnKms > 15, `vEsc ${dep.vEscSaturnKms} should be > 15`);
      assert.ok(dep.vEscSaturnKms < 20, `vEsc ${dep.vEscSaturnKms} should be < 20`);
    });

    it("should compute circular velocity at Enceladus", () => {
      const dep = saturnDeparture();
      assert.ok(dep.vCircEnceladusKms > 10);
      assert.ok(dep.vCircEnceladusKms < 15);
    });

    it("escape ΔV from Enceladus orbit should be reasonable", () => {
      const dep = saturnDeparture();
      assert.ok(dep.dvEscapeFromEnceladusKms > 3);
      assert.ok(dep.dvEscapeFromEnceladusKms < 8);
    });

    it("Saturn orbital velocity should be ~9.7 km/s", () => {
      const dep = saturnDeparture();
      assert.ok(dep.saturnOrbitalVKms > 9);
      assert.ok(dep.saturnOrbitalVKms < 10.5);
    });
  });

  describe("Brachistochrone Saturn→Uranus at 143h 12m", () => {
    it("should return 3 distance scenarios", () => {
      const brach = brachistochroneAnalysis();
      assert.equal(brach.length, 3);
    });

    it("closest scenario should require enormous ΔV", () => {
      const brach = brachistochroneAnalysis();
      const closest = brach.find(b => b.scenario === "closest")!;
      assert.ok(closest.deltaVKms > 1000, `ΔV ${closest.deltaVKms} should be > 1000`);
    });

    it("thrust ratio should be much greater than 1 at 48,000t", () => {
      const brach = brachistochroneAnalysis();
      const closest = brach.find(b => b.scenario === "closest")!;
      assert.ok(closest.thrustRatio > 100, `ratio ${closest.thrustRatio} should be > 100`);
    });

    it("distances should be in expected range", () => {
      assert.ok(SU_DISTANCE_SCENARIOS.closest > 1.3e9);
      assert.ok(SU_DISTANCE_SCENARIOS.closest < 1.5e9);
      assert.ok(SU_DISTANCE_SCENARIOS.farthest > 4e9);
      assert.ok(SU_DISTANCE_SCENARIOS.farthest < 4.5e9);
    });
  });

  describe("Navigation crisis analysis", () => {
    it("should compute error at Uranus consistent with stated value", () => {
      const nav = navigationCrisisAnalysis();
      assert.ok(nav.computedErrorKm > 1_000_000);
      assert.ok(nav.computedErrorKm < 50_000_000);
    });

    it("computed error should match stated error within 1%", () => {
      const nav = navigationCrisisAnalysis();
      assert.ok(
        Math.abs(nav.computedVsStatedRatio - 1.0) < 0.01,
        `ratio ${nav.computedVsStatedRatio} should be within 1% of 1.0`,
      );
    });

    it("Uranus SOI should be reasonable", () => {
      const nav = navigationCrisisAnalysis();
      assert.ok(nav.uranusSOIKm > 30_000_000);
      assert.ok(nav.uranusSOIKm < 100_000_000);
    });

    it("error magnitude ratio should show navigation is critical", () => {
      const nav = navigationCrisisAnalysis();
      assert.ok(nav.errorMagnitudeRatio > 100_000);
    });

    it("remaining distance should be positive", () => {
      const nav = navigationCrisisAnalysis();
      assert.ok(nav.remainingDistAU > 0);
      assert.ok(nav.remainingDistAU < 10);
    });

    it("confidence values should be close to each other", () => {
      const nav = navigationCrisisAnalysis();
      const diff = Math.abs(nav.stellarNavConfidence - nav.inertialNavConfidence);
      assert.ok(diff < 0.02, `confidence diff ${diff} should be < 0.02`);
    });
  });

  describe("Uranus capture at Titania", () => {
    it("should compute escape velocity at Titania orbit", () => {
      const cap = uranusCaptureAnalysis(5);
      assert.ok(cap.vEscAtTitaniaKms > 3);
      assert.ok(cap.vEscAtTitaniaKms < 8);
    });

    it("should compute circular velocity at Titania orbit", () => {
      const cap = uranusCaptureAnalysis(5);
      assert.ok(cap.vCircAtTitaniaKms > 2);
      assert.ok(cap.vCircAtTitaniaKms < 6);
    });

    it("capture ΔV should be positive for nonzero v_inf", () => {
      const cap = uranusCaptureAnalysis(2);
      assert.ok(cap.dvMinCaptureKms > 0);
      assert.ok(cap.dvCircularCaptureKms > cap.dvMinCaptureKms);
    });

    it("Titania period should be ~8-9 days", () => {
      const cap = uranusCaptureAnalysis(1);
      assert.ok(cap.titaniaPeriodDays > 7);
      assert.ok(cap.titaniaPeriodDays < 10);
    });
  });

  describe("Cruise velocity analysis", () => {
    it("should provide three ASR candidates", () => {
      const cv = cruiseVelocityAnalysis();
      assert.equal(cv.candidates.length, 3);
    });

    it("brachistochrone average velocity should be very high", () => {
      const cv = cruiseVelocityAnalysis();
      assert.ok(cv.brachistochrone.averageVelocityKms > 2000);
    });

    it("solar escape velocity at 14 AU should be ~11 km/s", () => {
      const cv = cruiseVelocityAnalysis();
      assert.ok(cv.heliocentric.solarVEscAt14AUKms > 9);
      assert.ok(cv.heliocentric.solarVEscAt14AUKms < 13);
    });
  });

  describe("Mass feasibility", () => {
    it("should compute max mass for given transfer", () => {
      const mf = maxFeasibleMass(
        SU_DISTANCE_SCENARIOS.closest,
        EP03_PARAMS.transferTimeSec,
      );
      assert.ok(mf.maxMassKg > 0);
      assert.ok(mf.maxMassT < 1000, `max mass ${mf.maxMassT}t should be < 1000`);
      assert.ok(mf.maxMassT > 100, `max mass ${mf.maxMassT}t should be > 100`);
    });
  });

  describe("Minimum transfer time", () => {
    it("should compute realistic minimum transfer time at 48,000t", () => {
      const mt = minimumTransferTime(SU_DISTANCE_SCENARIOS.closest);
      assert.ok(mt.timeDays > 50, `time ${mt.timeDays} days should be > 50`);
      assert.ok(mt.timeDays < 100, `time ${mt.timeDays} days should be < 100`);
    });
  });

  describe("Full analysis integration", () => {
    it("should compute all transfers without errors", () => {
      const analysis = analyzeEpisode3();
      assert.ok(analysis.hohmann);
      assert.ok(analysis.saturnDeparture);
      assert.ok(analysis.brachistochrone);
      assert.ok(analysis.navCrisis);
      assert.ok(analysis.cruiseVelocity);
      assert.ok(analysis.uranusCapture);
      assert.ok(analysis.massFeasibility);
      assert.ok(analysis.minTransferTime);
    });

    it("should show 143h 12m is far faster than Hohmann", () => {
      const analysis = analyzeEpisode3();
      const hohmannHours = analysis.hohmann.transferTimeDays * 24;
      assert.ok(hohmannHours > EP03_PARAMS.transferTimeHours * 100);
    });
  });
});
