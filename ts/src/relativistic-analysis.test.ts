import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { analyzeRelativisticEffects } from "./relativistic-analysis.ts";

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

  it("EP02 ballistic cruise should have β ≈ 0.005 (0.5%c)", () => {
    const ep02 = result.transfers.find(t => t.transferId === "ep02-ballistic-cruise");
    assert.ok(ep02, "EP02 cruise not found");
    assert.ok(
      Math.abs(ep02.relativistic.betaPeak - 0.005) < 0.001,
      `EP02 β = ${ep02.relativistic.betaPeak}`,
    );
    // Time dilation at 0.5%c over 455 days:
    // β²/2 ≈ 1.25e-5 → loss ≈ 455 × 86400 × 1.25e-5 ≈ 492s (~8 min)
    assert.ok(
      ep02.relativistic.timeDilationSec > 400 && ep02.relativistic.timeDilationSec < 600,
      `EP02 time dilation = ${ep02.relativistic.timeDilationSec}s (expected ~492s)`,
    );
  });

  it("summary should report max β < 5% and max ΔV correction < 1%", () => {
    assert.ok(result.summary.maxBetaPercent < 5, `max β = ${result.summary.maxBetaPercent}%`);
    // Highest ΔV correction is EP05 at 300t: ~1317 ppm (~0.13%)
    assert.ok(
      result.summary.maxDvCorrectionPpm < 10000,
      `max ΔV corr = ${result.summary.maxDvCorrectionPpm} ppm`,
    );
  });

  it("cumulative time dilation should be < 15 minutes over entire journey", () => {
    // 455d cruise at 1500 km/s dominates (~8 min), plus brachistochrone phases
    assert.ok(
      result.summary.cumulativeTimeDilationMin < 15,
      `cumulative dilation = ${result.summary.cumulativeTimeDilationMin.toFixed(2)} min`,
    );
    // Should be at least a few minutes
    assert.ok(
      result.summary.cumulativeTimeDilationMin > 5,
      `cumulative dilation = ${result.summary.cumulativeTimeDilationMin.toFixed(2)} min (expected > 5 min)`,
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
});
