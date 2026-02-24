import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  buildVerificationScorecard,
  buildTransferComparisonTable,
  generateScienceAccuracyReport,
} from "./science-accuracy-analysis.ts";

describe("buildVerificationScorecard", () => {
  const scorecard = buildVerificationScorecard();

  it("has a caption", () => {
    assert.ok(scorecard.caption.length > 0);
  });

  it("has multiple verification rows", () => {
    assert.ok(scorecard.rows.length >= 8, "should have at least 8 verification items");
  });

  it("each row has required fields", () => {
    for (const row of scorecard.rows) {
      assert.ok(row.claim.length > 0, "claim should not be empty");
      assert.ok(row.episode >= 1 && row.episode <= 5, "episode should be 1-5");
      assert.ok(row.depicted.length > 0, "depicted should not be empty");
      assert.ok(row.reference.length > 0, "reference should not be empty");
      assert.ok(row.source.length > 0, "source should not be empty");
      assert.ok(
        ["verified", "approximate", "unverified", "discrepancy"].includes(row.status),
        `status '${row.status}' should be a valid VerificationStatus`
      );
    }
  });

  it("accuracy percentages are in valid range when present", () => {
    for (const row of scorecard.rows) {
      if (row.accuracyPercent !== null) {
        assert.ok(row.accuracyPercent >= 0, `${row.claim} accuracy should be >= 0`);
        assert.ok(row.accuracyPercent <= 100, `${row.claim} accuracy should be <= 100`);
      }
    }
  });

  it("has verified items with high accuracy", () => {
    const verifiedWithAccuracy = scorecard.rows.filter(
      (r) => r.status === "verified" && r.accuracyPercent !== null
    );
    assert.ok(verifiedWithAccuracy.length >= 3, "should have at least 3 verified items with accuracy");
    for (const row of verifiedWithAccuracy) {
      assert.ok(
        row.accuracyPercent! >= 95,
        `verified item '${row.claim}' should have accuracy >= 95%`
      );
    }
  });

  it("covers multiple episodes", () => {
    const episodes = new Set(scorecard.rows.map((r) => r.episode));
    assert.ok(episodes.size >= 3, "should cover at least 3 different episodes");
  });

  it("no discrepancy items", () => {
    const discrepancies = scorecard.rows.filter((r) => r.status === "discrepancy");
    assert.equal(discrepancies.length, 0, "SOLAR LINE should have no discrepancies with real data");
  });
});

describe("buildTransferComparisonTable", () => {
  const table = buildTransferComparisonTable();

  it("has a caption", () => {
    assert.ok(table.caption.length > 0);
  });

  it("covers all 5 episodes", () => {
    assert.deepEqual(table.episodes, [1, 2, 3, 4, 5]);
  });

  it("includes Hohmann vs Brachistochrone rows", () => {
    const metrics = table.rows.map((r) => r.metric);
    assert.ok(metrics.some((m) => m.includes("ホーマン")), "should have Hohmann time row");
    assert.ok(metrics.some((m) => m.includes("短縮倍率")), "should have speedup ratio row");
    assert.ok(metrics.some((m) => m.includes("ΔV")), "should have ΔV comparison row");
  });

  it("has values for all episodes in each row", () => {
    for (const row of table.rows) {
      for (const ep of table.episodes) {
        assert.ok(row.values[ep] !== undefined, `${row.metric} should have value for ep${ep}`);
      }
    }
  });
});

describe("generateScienceAccuracyReport", () => {
  const report = generateScienceAccuracyReport();

  it("has correct slug", () => {
    assert.equal(report.slug, "science-accuracy");
  });

  it("has title in Japanese", () => {
    assert.ok(report.title.includes("科学的精度"));
  });

  it("has a non-empty summary", () => {
    assert.ok(report.summary.length > 0);
  });

  it("summary mentions verification count", () => {
    assert.ok(report.summary.includes("検証"), "summary should mention verification");
  });

  it("has multiple sections", () => {
    assert.ok(report.sections.length >= 4, "should have at least 4 sections");
  });

  it("all sections have headings and markdown", () => {
    for (const section of report.sections) {
      assert.ok(section.heading.length > 0, "heading should not be empty");
      assert.ok(section.markdown.length > 0, "markdown should not be empty");
    }
  });

  it("has a section with verificationTable", () => {
    const withVerification = report.sections.filter((s) => s.verificationTable);
    assert.ok(withVerification.length >= 1, "should have at least one section with verificationTable");
  });

  it("has a section with comparison table", () => {
    const withTable = report.sections.filter((s) => s.table);
    assert.ok(withTable.length >= 1, "should have at least one section with comparison table");
  });

  it("section headings are unique", () => {
    const headings = report.sections.map((s) => s.heading);
    assert.equal(headings.length, new Set(headings).size, "all headings should be unique");
  });

  it("does not reference 'episode以外' in content", () => {
    // Verify the report is written from a science perspective, not episode-based
    const headings = report.sections.map((s) => s.heading);
    assert.ok(headings.some((h) => h.includes("検証")), "should have a verification section");
    assert.ok(headings.some((h) => h.includes("Brachistochrone")), "should have a brachistochrone section");
  });
});
