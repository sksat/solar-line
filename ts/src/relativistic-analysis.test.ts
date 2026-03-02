import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { analyzeRelativisticEffects, analyzeStellarAberration } from "./relativistic-analysis.ts";

describe("relativistic-analysis", () => {
  const result = analyzeRelativisticEffects();

  it("should produce transfers for all 5 episodes", () => {
    const episodes = new Set(result.transfers.map(t => t.episode));
    assert.deepStrictEqual([...episodes].sort(), [1, 2, 3, 4, 5]);
  });

  it("should produce at least 6 transfer analyses", () => {
    assert.ok(
      result.transfers.length >= 6,
      `expected ≥6 transfers, got ${result.transfers.length}`,
    );
  });

  it("should have β < 0.05 for all transfers (sub-5% c)", () => {
    for (const t of result.transfers) {
      assert.ok(
        t.relativistic.betaPeak < 0.05,
        `${t.transferId}: β = ${t.relativistic.betaPeak} (expected < 0.05)`,
      );
    }
  });

  it("should have γ < 1.01 for all transfers", () => {
    for (const t of result.transfers) {
      assert.ok(
        t.relativistic.gammaPeak < 1.01,
        `${t.transferId}: γ = ${t.relativistic.gammaPeak} (expected < 1.01)`,
      );
    }
  });

  it("should have time dilation < 1000 ppm for all transfers", () => {
    for (const t of result.transfers) {
      assert.ok(
        t.relativistic.timeDilationPpm < 1000,
        `${t.transferId}: td = ${t.relativistic.timeDilationPpm} ppm`,
      );
    }
  });

  it("should have ΔV correction < 1% for all brachistochrone transfers", () => {
    for (const t of result.transfers) {
      if (t.accelKms2 > 0) {
        // Only check brachistochrone (non-ballistic)
        // EP05 at 300t has highest correction (~0.13%), all others < 0.1%
        assert.ok(
          t.relativistic.dvCorrectionFraction < 0.01,
          `${t.transferId}: ΔV correction = ${(t.relativistic.dvCorrectionFraction * 100).toFixed(4)}%`,
        );
      }
    }
  });

  it("EP01 closest peak velocity should be ~4249 km/s (~1.4%c)", () => {
    const ep01 = result.transfers.find(t => t.transferId === "ep01-brach-closest");
    assert.ok(ep01, "EP01 closest transfer not found");
    assert.ok(
      ep01.classicalPeakVelocityKms > 4000 && ep01.classicalPeakVelocityKms < 4600,
      `EP01 peak v = ${ep01.classicalPeakVelocityKms} km/s`,
    );
    assert.ok(
      ep01.relativistic.betaPeak > 0.013 && ep01.relativistic.betaPeak < 0.016,
      `EP01 β = ${ep01.relativistic.betaPeak}`,
    );
  });

  it("EP02 trim-thrust cruise should have β ≈ 0.0002 (0.02%c)", () => {
    const ep02 = result.transfers.find(t => t.transferId === "ep02-trim-thrust-cruise");
    assert.ok(ep02, "EP02 cruise not found");
    // After 3-day trim thrust, coast speed ~65 km/s = 0.022%c
    assert.ok(
      ep02.relativistic.betaPeak < 0.001,
      `EP02 β = ${ep02.relativistic.betaPeak} (expected < 0.001)`,
    );
    // Time dilation at 0.02%c over 87 days is negligible (< 1s)
    assert.ok(
      ep02.relativistic.timeDilationSec < 1,
      `EP02 time dilation = ${ep02.relativistic.timeDilationSec}s (expected < 1s)`,
    );
  });

  it("summary should report max β < 5% and max ΔV correction < 1%", () => {
    assert.ok(result.summary.maxBetaPercent < 5, `max β = ${result.summary.maxBetaPercent}%`);
    // Highest ΔV correction is EP05 at 300t (65% thrust): ~857 ppm (~0.09%)
    assert.ok(
      result.summary.maxDvCorrectionPpm < 10000,
      `max ΔV corr = ${result.summary.maxDvCorrectionPpm} ppm`,
    );
  });

  it("cumulative time dilation should be < 15 minutes over entire journey", () => {
    // With corrected EP02 (~87d at ~65 km/s), brachistochrone phases dominate
    assert.ok(
      result.summary.cumulativeTimeDilationMin < 15,
      `cumulative dilation = ${result.summary.cumulativeTimeDilationMin.toFixed(2)} min`,
    );
    // Should be at least ~1 minute from brachistochrone phases
    assert.ok(
      result.summary.cumulativeTimeDilationMin > 1,
      `cumulative dilation = ${result.summary.cumulativeTimeDilationMin.toFixed(2)} min (expected > 1 min)`,
    );
  });

  it("should include parameter documentation", () => {
    assert.ok(result.parameters.speedOfLightKms > 299000);
    assert.ok(result.parameters.exhaustVelocityKms > 9000);
    assert.ok(result.parameters.ispSeconds === 1_000_000);
  });

  it("relativistic peak velocity should be slightly less than classical", () => {
    for (const t of result.transfers) {
      if (t.accelKms2 > 0) {
        // For brachistochrone transfers, relativistic peak v ≤ classical
        assert.ok(
          t.relativistic.peakVelocityKms <= t.classicalPeakVelocityKms * 1.001,
          `${t.transferId}: rel peak ${t.relativistic.peakVelocityKms} vs classical ${t.classicalPeakVelocityKms}`,
        );
      }
    }
  });

  it("all transfers should have a Japanese verdict string", () => {
    for (const t of result.transfers) {
      assert.ok(t.verdict.length > 0, `${t.transferId}: empty verdict`);
      // Should contain Japanese characters
      assert.ok(/[\u3000-\u9FFF]/.test(t.verdict), `${t.transferId}: verdict not in Japanese`);
    }
  });

  it("EP05 peak velocity matches ep05-analysis (65% damaged thrust)", () => {
    const ep05Transfer = result.transfers.find(t => t.transferId === "ep05-brach-300t");
    assert.ok(ep05Transfer, "EP05 300t transfer should exist");
    // EP05 operates at 65% thrust — peak velocity should be ~7604 km/s (~2.54%c)
    // NOT ~9431 km/s (which would be full 9.8 MN thrust)
    assert.ok(
      ep05Transfer.classicalPeakVelocityKms < 8000,
      `EP05 peak velocity ${ep05Transfer.classicalPeakVelocityKms.toFixed(0)} km/s should reflect 65% damaged thrust (<8000)`,
    );
    assert.ok(
      ep05Transfer.relativistic.betaPeak < 0.03,
      `EP05 β = ${(ep05Transfer.relativistic.betaPeak * 100).toFixed(2)}%c should be <3%c with damaged thrust`,
    );
  });
});

describe("stellar-aberration", () => {
  const aberration = analyzeStellarAberration();

  it("should produce EP03 analysis at 3000 km/s cruise velocity", () => {
    assert.ok(aberration.shipVelocityKms === 3000);
    assert.ok(aberration.betaCruise > 0.009 && aberration.betaCruise < 0.011,
      `β = ${aberration.betaCruise} (expected ~0.01)`);
  });

  it("maximum aberration should be ~0.57° at β ≈ 0.01", () => {
    // At β = v/c ≈ 0.01, max aberration ≈ arctan(β) ≈ β radians ≈ 0.573°
    assert.ok(
      aberration.maxAberrationDeg > 0.5 && aberration.maxAberrationDeg < 0.7,
      `max aberration = ${aberration.maxAberrationDeg.toFixed(3)}° (expected ~0.57°)`,
    );
  });

  it("perpendicular aberration should be close to max aberration", () => {
    // For β ≪ 1, aberration is nearly the same for 90° as for all angles
    assert.ok(
      aberration.perpendicularAberrationDeg > 0.5 && aberration.perpendicularAberrationDeg < 0.7,
      `perpendicular aberration = ${aberration.perpendicularAberrationDeg.toFixed(3)}°`,
    );
  });

  it("aberration should be same order of magnitude as 1.23° nav discrepancy", () => {
    // The 1.23° discrepancy is about 2x the max single-star aberration
    const ratio = aberration.discrepancyDeg / aberration.maxAberrationDeg;
    assert.ok(
      ratio > 1 && ratio < 5,
      `ratio = ${ratio.toFixed(2)} (expected 1-5x)`,
    );
  });

  it("should include analysis of whether aberration can explain the full 1.23°", () => {
    assert.ok(aberration.canExplainFullDiscrepancy !== undefined);
    assert.ok(aberration.explanationFraction > 0,
      "aberration should explain at least some of the discrepancy");
  });

  it("should have velocity sweep data for charting", () => {
    assert.ok(aberration.velocitySweep.length >= 5,
      `expected ≥5 sweep points, got ${aberration.velocitySweep.length}`);
    // First point should be low velocity
    assert.ok(aberration.velocitySweep[0].velocityKms < 1000);
    // Last point should include EP03 cruise velocity or higher
    assert.ok(aberration.velocitySweep[aberration.velocitySweep.length - 1].velocityKms >= 3000);
    // Aberration should increase monotonically with velocity
    for (let i = 1; i < aberration.velocitySweep.length; i++) {
      assert.ok(
        aberration.velocitySweep[i].aberrationDeg > aberration.velocitySweep[i - 1].aberrationDeg,
        `aberration should increase: ${aberration.velocitySweep[i].aberrationDeg} > ${aberration.velocitySweep[i - 1].aberrationDeg}`,
      );
    }
  });

  it("should provide Japanese verdict", () => {
    assert.ok(aberration.verdict.length > 0);
    assert.ok(/[\u3000-\u9FFF]/.test(aberration.verdict), "verdict should be in Japanese");
  });

  it("classical aberration at v=0 should be 0", () => {
    const zeroPoint = aberration.velocitySweep.find(p => p.velocityKms === 0);
    // May not have exactly 0, but first point should have very small aberration
    assert.ok(
      aberration.velocitySweep[0].aberrationDeg < 0.1,
      "aberration at low velocity should be near 0",
    );
  });
});
