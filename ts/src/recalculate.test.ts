/**
 * Tests for the recalculate pipeline.
 *
 * Verifies that all analysis functions produce valid output and that
 * the reproduction command infrastructure works correctly.
 */

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { analyzeEpisode1 } from "./ep01-analysis.ts";
import { analyzeEpisode2 } from "./ep02-analysis.ts";
import { analyzeEpisode3 } from "./ep03-analysis.ts";
import { analyzeEpisode4 } from "./ep04-analysis.ts";
import { analyzeEpisode5 } from "./ep05-analysis.ts";
import { generateCrossEpisodeReport } from "./cross-episode-analysis.ts";
import { generateShipKestrelReport } from "./ship-kestrel-analysis.ts";
import { analyze3DOrbital } from "./orbital-3d-analysis.ts";
import { generateTranscriptionAccuracyReport } from "./transcription-accuracy-report.ts";

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

  it("3D orbital analysis produces valid output with transfers and ring analysis", () => {
    const result = analyze3DOrbital();
    assert.ok(result, "analyze3DOrbital returned falsy");
    assert.ok(typeof result === "object", "result not an object");
    assert.ok(result.generatedAt, "missing generatedAt");
    assert.ok(Array.isArray(result.transfers), "missing transfers array");
    assert.ok(result.transfers.length === 4, `expected 4 transfer legs, got ${result.transfers.length}`);
    assert.ok(result.saturnRingAnalysis, "missing saturnRingAnalysis");
    assert.ok(result.uranusApproachAnalysis, "missing uranusApproachAnalysis");
    assert.ok(typeof result.maxPlaneChangeFractionPercent === "number", "missing maxPlaneChangeFractionPercent");
    assert.ok(result.maxPlaneChangeFractionPercent > 0 && result.maxPlaneChangeFractionPercent < 10,
      `maxPlaneChangeFractionPercent ${result.maxPlaneChangeFractionPercent} out of range`);
  });

  it("transcription accuracy report produces valid output with episodes and agreements", () => {
    const result = generateTranscriptionAccuracyReport();
    assert.ok(result, "generateTranscriptionAccuracyReport returned falsy");
    assert.ok(result.generatedAt, "missing generatedAt");
    assert.ok(Array.isArray(result.episodes), "missing episodes array");
    // At least EP01 has script data
    assert.ok(result.episodes.length >= 1, "no episodes with script data");
    for (const ep of result.episodes) {
      assert.ok(ep.episode > 0 && ep.episode <= 5, `invalid episode number ${ep.episode}`);
      assert.ok(ep.scriptDialogueLines > 0, `EP${ep.episode} has no script dialogue lines`);
      assert.ok(ep.comparisons.length > 0, `EP${ep.episode} has no comparisons`);
      for (const c of ep.comparisons) {
        assert.ok(c.corpusCharacterAccuracy > 0 && c.corpusCharacterAccuracy <= 1,
          `EP${ep.episode} ${c.sourceType} corpus accuracy out of range: ${c.corpusCharacterAccuracy}`);
      }
    }
    assert.ok(Array.isArray(result.agreements), "missing agreements array");
  });

  it("recalculate.ts references 3D orbital and transcription accuracy", () => {
    const recalcSrc = fs.readFileSync(
      path.join(import.meta.dirname!, "recalculate.ts"), "utf-8",
    );
    assert.ok(
      recalcSrc.includes("analyze3DOrbital"),
      "recalculate.ts should import analyze3DOrbital",
    );
    assert.ok(
      recalcSrc.includes("3d_orbital_analysis.json"),
      "recalculate.ts should write 3d_orbital_analysis.json",
    );
    assert.ok(
      recalcSrc.includes("generateTranscriptionAccuracyReport"),
      "recalculate.ts should import generateTranscriptionAccuracyReport",
    );
    assert.ok(
      recalcSrc.includes("transcription_accuracy.json"),
      "recalculate.ts should write transcription_accuracy.json",
    );
  });

  it("EP03 analysis contains key domain-specific keys", () => {
    const r = analyzeEpisode3();
    const keys = Object.keys(r);
    for (const k of ["brachistochrone", "navCrisis", "cruiseVelocity", "massFeasibility", "moonComparison"]) {
      assert.ok(keys.includes(k), `EP03 missing key: ${k}`);
    }
  });

  it("EP04 analysis contains key domain-specific keys", () => {
    const r = analyzeEpisode4();
    const keys = Object.keys(r);
    for (const k of ["plasmoid", "fleetIntercept", "damageAssessment", "plasmoidMomentum"]) {
      assert.ok(keys.includes(k), `EP04 missing key: ${k}`);
    }
  });

  it("EP05 analysis contains key domain-specific keys", () => {
    const r = analyzeEpisode5();
    const keys = Object.keys(r);
    for (const k of ["fullRoute", "nozzleLifespan", "oberthEffect", "burnBudget", "earthCapture"]) {
      assert.ok(keys.includes(k), `EP05 missing key: ${k}`);
    }
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
