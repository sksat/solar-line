/**
 * Tests for the recalculate pipeline.
 *
 * Verifies that all analysis functions produce valid output and that
 * the reproduction command infrastructure works correctly.
 */

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { analyzeEpisode1 } from "./ep01-analysis.ts";
import { analyzeEpisode2 } from "./ep02-analysis.ts";
import { analyzeEpisode3 } from "./ep03-analysis.ts";
import { analyzeEpisode4 } from "./ep04-analysis.ts";
import { analyzeEpisode5 } from "./ep05-analysis.ts";
import { generateCrossEpisodeReport } from "./cross-episode-analysis.ts";
import { generateShipKestrelReport } from "./ship-kestrel-analysis.ts";

describe("recalculate pipeline", () => {
  it("all episode analyses produce non-empty results", () => {
    const analyzers = [
      { ep: 1, fn: analyzeEpisode1 },
      { ep: 2, fn: analyzeEpisode2 },
      { ep: 3, fn: analyzeEpisode3 },
      { ep: 4, fn: analyzeEpisode4 },
      { ep: 5, fn: analyzeEpisode5 },
    ];

    for (const { ep, fn } of analyzers) {
      const result = fn();
      assert.ok(result, `EP${ep} analysis returned falsy`);
      assert.ok(typeof result === "object", `EP${ep} analysis not an object`);
      const keys = Object.keys(result);
      assert.ok(keys.length > 0, `EP${ep} analysis has no keys`);
    }
  });

  it("all episodes include hohmann baseline with positive total ΔV", () => {
    const results = [
      { ep: 1, r: analyzeEpisode1() },
      { ep: 2, r: analyzeEpisode2() },
      { ep: 3, r: analyzeEpisode3() },
      { ep: 4, r: analyzeEpisode4() },
      { ep: 5, r: analyzeEpisode5() },
    ];

    for (const { ep, r } of results) {
      assert.ok(r.hohmann, `EP${ep} missing hohmann`);
      // Field name varies: totalDv (EP01-04) or totalDvKms (EP05)
      const totalDv = (r.hohmann as Record<string, unknown>).totalDv
        ?? (r.hohmann as Record<string, unknown>).totalDvKms;
      assert.ok(typeof totalDv === "number", `EP${ep} hohmann totalDv not a number`);
      assert.ok((totalDv as number) > 0, `EP${ep} hohmann totalDv <= 0`);
    }
  });

  it("cross-episode report has reproductionCommand on all sections", () => {
    const report = generateCrossEpisodeReport();
    assert.ok(report.sections.length > 0, "no sections");
    for (const section of report.sections) {
      assert.ok(
        section.reproductionCommand,
        `section "${section.heading}" missing reproductionCommand`,
      );
      assert.ok(
        section.reproductionCommand.includes("npm run recalculate"),
        `section "${section.heading}" reproductionCommand does not reference recalculate`,
      );
    }
  });

  it("ship-kestrel report has reproductionCommand on all sections", () => {
    const report = generateShipKestrelReport();
    assert.ok(report.sections.length > 0, "no sections");
    for (const section of report.sections) {
      assert.ok(
        section.reproductionCommand,
        `section "${section.heading}" missing reproductionCommand`,
      );
    }
  });

  it("analyses are deterministic (same results on re-run)", () => {
    const r1 = analyzeEpisode1();
    const r2 = analyzeEpisode1();
    assert.deepStrictEqual(r1, r2);
  });

  it("all hohmann ΔVs are physically reasonable (0-100 km/s)", () => {
    const results = [
      { ep: 1, r: analyzeEpisode1() },
      { ep: 2, r: analyzeEpisode2() },
      { ep: 3, r: analyzeEpisode3() },
      { ep: 4, r: analyzeEpisode4() },
      { ep: 5, r: analyzeEpisode5() },
    ];

    for (const { ep, r } of results) {
      const h = r.hohmann as Record<string, unknown>;
      const totalDv = (h.totalDv ?? h.totalDvKms) as number;
      assert.ok(
        totalDv > 0 && totalDv < 100,
        `EP${ep} hohmann totalDv ${totalDv} out of range`,
      );
    }
  });
});
