/**
 * Article Content Validation Tests (Task 231).
 *
 * Validates that the PROSE content in MDX report files is consistent
 * with source data (calculations, transcriptions, git metadata).
 *
 * This is distinct from:
 * - Playwright E2E tests: verify web page rendering (layout, links, components)
 * - report-data-validation.test.ts: verify structural/referential integrity of data
 * - episode-summary-consistency.test.ts: verify TS constants ↔ TS analysis functions
 *
 * These tests verify that the ARTICLE TEXT (what the reader sees) cites correct
 * values. When analysis changes, these tests fail — forcing article updates.
 *
 * TDD approach: write assertions for what the article SHOULD say, then
 * edit the article to satisfy them.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

import { analyzeEpisode1 } from "./ep01-analysis.ts";
import { analyzeEpisode2 } from "./ep02-analysis.ts";
import { analyzeEpisode3 } from "./ep03-analysis.ts";
import { analyzeEpisode4 } from "./ep04-analysis.ts";
import { analyzeEpisode5 } from "./ep05-analysis.ts";
import { SHIP_SPECS, EPISODE_SUMMARIES } from "./cross-episode-analysis.ts";
import { KESTREL } from "./kestrel.ts";

// --- Paths ---

const reportsDir = path.resolve(import.meta.dirname!, "../../reports/data");
const summaryDir = path.join(reportsDir, "summary");
const episodesDir = path.join(reportsDir, "episodes");
const tasksDir = path.resolve(import.meta.dirname!, "../../current_tasks");

function readReport(filename: string, subdir: "summary" | "episodes" = "summary"): string {
  const dir = subdir === "episodes" ? episodesDir : summaryDir;
  return fs.readFileSync(path.join(dir, filename), "utf-8");
}

/** Count files matching a pattern in a directory. */
function countFiles(dir: string, filter: (name: string) => boolean): number {
  return fs.readdirSync(dir).filter(filter).length;
}

/** Assert that the text contains a value within ±tolerance. */
function assertContainsApproxValue(
  text: string,
  expectedValue: number,
  label: string,
  tolerance = 0.02, // 2% default
): void {
  // For integer-like values, look for exact match
  const intStr = Math.round(expectedValue).toString();
  const fixedStr = expectedValue.toFixed(1);
  const found = text.includes(intStr) || text.includes(fixedStr);
  assert.ok(
    found,
    `${label}: expected article to contain ~${expectedValue} (tried "${intStr}" and "${fixedStr}")`,
  );
}

// ============================================================
// Tech-overview stats freshness
// ============================================================

describe("tech-overview.md content validation", () => {
  const content = readReport("tech-overview.md");

  it("completed task count is reasonably close to current_tasks directory", () => {
    const actualCount = countFiles(tasksDir, (f) => f.endsWith(".md"));
    const match = content.match(/\| 完了タスク \| (\d+)/);
    assert.ok(match, "stats table should have task count row");
    const reportedCount = parseInt(match![1]);
    // Allow the report to lag behind by up to 5 tasks (new tasks may be created
    // before the report is updated), but it should never exceed the actual count
    assert.ok(
      reportedCount <= actualCount && reportedCount >= actualCount - 5,
      `reported task count ${reportedCount} should be within 5 of actual ${actualCount}`,
    );
  });

  it("Rust test count in body text matches stats table", () => {
    // Body text and stats table should agree on Rust test count
    const tableMatch = content.match(/Rust (\d[\d,]*)/);
    const bodyMatch = content.match(/(\d+)のユニットテスト/);
    assert.ok(tableMatch, "stats table should mention Rust test count");
    assert.ok(bodyMatch, "body text should mention unit test count");
    const tableCount = tableMatch![1].replace(/,/g, "");
    const bodyCount = bodyMatch![1];
    assert.strictEqual(
      bodyCount,
      tableCount,
      `body text "${bodyCount}" should match table "${tableCount}" for Rust test count`,
    );
  });

  it("body task count matches stats table task count", () => {
    const tableMatch = content.match(/\| 完了タスク \| (\d+)/);
    assert.ok(tableMatch, "stats table should have task count");
    const tableCount = tableMatch![1];
    assert.ok(
      content.includes(`${tableCount}の完了タスクファイル`),
      `body text should reference ${tableCount} completed tasks`,
    );
  });

  it("total test count in header equals sum of components", () => {
    // Parse "2,322（TS 1,819 + Rust 377 + E2E 126、0 failures）" pattern
    const match = content.match(
      /テスト数 \| ([\d,]+)（TS ([\d,]+) \+ Rust ([\d,]+) \+ E2E ([\d,]+)/,
    );
    assert.ok(match, "stats table should have test breakdown");
    const total = parseInt(match![1].replace(/,/g, ""));
    const ts = parseInt(match![2].replace(/,/g, ""));
    const rust = parseInt(match![3].replace(/,/g, ""));
    const e2e = parseInt(match![4].replace(/,/g, ""));
    assert.strictEqual(
      total,
      ts + rust + e2e,
      `total ${total} should equal TS ${ts} + Rust ${rust} + E2E ${e2e} = ${ts + rust + e2e}`,
    );
  });

  it("mentions all three integrator types in comparison", () => {
    assert.ok(content.includes("RK4"), "should mention RK4");
    assert.ok(
      content.includes("Dormand-Prince") || content.includes("RK45"),
      "should mention RK45/Dormand-Prince",
    );
    assert.ok(
      content.includes("Störmer-Verlet") || content.includes("シンプレクティック"),
      "should mention Störmer-Verlet/symplectic",
    );
  });

  it("integrator comparison table has correct thrust support info", () => {
    // Störmer-Verlet is ballistic only (no thrust)
    // RK4 and RK45 support thrust
    assert.ok(
      content.includes("弾道のみ"),
      "Störmer-Verlet should be marked as ballistic only",
    );
  });

  it("DAG viewer description mentions WASM", () => {
    // DAG viewer should note Rust/WASM backing
    assert.ok(
      content.includes("WASM") && content.includes("DAG"),
      "DAG section should mention WASM-backed analysis",
    );
  });
});

// ============================================================
// Episode report: key numerical values match analysis
// ============================================================

describe("EP01 article content validation", () => {
  const content = readReport("ep01.md", "episodes");
  const analysis = analyzeEpisode1();

  it("cites 72-hour transit time", () => {
    assert.ok(content.includes("72"), "EP01 should cite 72-hour transit time");
  });

  it("mass boundary value matches analysis", () => {
    const boundary = analysis.boundaries.massBoundary72h.maxMassT;
    assertContainsApproxValue(content, boundary, "EP01 mass boundary");
  });

  it("brachistochrone ΔV matches analysis", () => {
    const dv = analysis.brachistochrone72h[0].deltaVKms;
    assertContainsApproxValue(content, dv, "EP01 brachistochrone ΔV");
  });

  it("references Mars→Ganymede route", () => {
    assert.ok(content.includes("火星"), "should mention Mars");
    assert.ok(content.includes("ガニメデ"), "should mention Ganymede");
  });
});

describe("EP02 article content validation", () => {
  const content = readReport("ep02.md", "episodes");
  const analysis = analyzeEpisode2();

  it("primary transit time is ~87 days, not 455", () => {
    // The corrected primary should reference ~87 days
    const primary = analysis.trimThrust.primary;
    assert.ok(primary, "EP02 should have primary trim-thrust result");
    const days = Math.round(primary!.transferDays);
    assert.ok(
      content.includes(String(days)) || content.includes("87"),
      `EP02 should cite ~${days} day transfer time`,
    );
  });

  it("references Jupiter escape and Saturn approach", () => {
    assert.ok(content.includes("木星"), "should mention Jupiter");
    assert.ok(content.includes("土星") || content.includes("エンケラドス"),
      "should mention Saturn or Enceladus");
  });
});

describe("EP03 article content validation", () => {
  const content = readReport("ep03.md", "episodes");

  it("cites 143-hour transit time", () => {
    assert.ok(content.includes("143"), "EP03 should cite 143-hour transit");
  });

  it("references Enceladus→Titania route", () => {
    assert.ok(content.includes("エンケラドス"), "should mention Enceladus");
    assert.ok(content.includes("タイタニア"), "should mention Titania");
  });

  it("mass boundary value is 452.5t", () => {
    // Task 228 corrected this from 452 to 452.5
    assert.ok(
      content.includes("452.5"),
      "EP03 mass boundary should be 452.5t (not 452)",
    );
  });
});

describe("EP04 article content validation", () => {
  const content = readReport("ep04.md", "episodes");
  const analysis = analyzeEpisode4();

  it("references 65% damaged thrust", () => {
    assert.ok(
      content.includes("65") && content.includes("%"),
      "EP04 should reference 65% thrust",
    );
  });

  it("plasmoid exposure value matches analysis", () => {
    const exposure = analysis.plasmoid.totalExposureMSv;
    assertContainsApproxValue(content, exposure, "EP04 plasmoid exposure mSv");
  });

  it("references Titania→Earth route", () => {
    assert.ok(content.includes("タイタニア"), "should mention Titania");
    assert.ok(content.includes("地球"), "should mention Earth");
  });
});

describe("EP05 article content validation", () => {
  const content = readReport("ep05.md", "episodes");
  const analysis = analyzeEpisode5();

  it("cites 507-hour composite route", () => {
    assert.ok(content.includes("507"), "EP05 should cite 507-hour composite route");
  });

  it("nozzle margin matches analysis", () => {
    const marginMin = analysis.nozzleLifespan.marginMinutes;
    assertContainsApproxValue(content, marginMin, "EP05 nozzle margin minutes");
  });

  it("references LEO 400km", () => {
    assert.ok(
      content.includes("400") && (content.includes("LEO") || content.includes("低軌道")),
      "EP05 should reference LEO 400km",
    );
  });

  it("references Uranus→Earth route", () => {
    assert.ok(
      content.includes("天王星") || content.includes("Uranus"),
      "should mention Uranus",
    );
    assert.ok(content.includes("地球"), "should mention Earth");
  });
});

// ============================================================
// Cross-report consistency: same values in multiple reports
// ============================================================

describe("cross-report value consistency", () => {
  const shipKestrel = readReport("ship-kestrel.md");
  const crossEpisode = readReport("cross-episode.md");
  const techOverview = readReport("tech-overview.md");

  it("nominal thrust (9.8 MN) cited consistently in ship/analysis reports", () => {
    const thrustStr = SHIP_SPECS.thrustMN.toFixed(1);
    for (const [name, content] of [
      ["ship-kestrel", shipKestrel],
      ["cross-episode", crossEpisode],
    ]) {
      assert.ok(
        content.includes(thrustStr) || content.includes("9.8"),
        `${name} should reference ${thrustStr} MN thrust`,
      );
    }
  });

  it("nominal mass (48,000t) cited consistently", () => {
    for (const [name, content] of [
      ["ship-kestrel", shipKestrel],
      ["cross-episode", crossEpisode],
    ]) {
      assert.ok(
        content.includes("48,000") || content.includes("48000"),
        `${name} should reference 48,000t nominal mass`,
      );
    }
  });

  it("damaged thrust (6.37 MN / 65%) cited consistently in relevant reports", () => {
    for (const [name, content] of [
      ["ship-kestrel", shipKestrel],
    ]) {
      assert.ok(
        content.includes("6.37"),
        `${name} should reference 6.37 MN damaged thrust`,
      );
      assert.ok(
        content.includes("65%") || content.includes("65％"),
        `${name} should reference 65% damaged thrust`,
      );
    }
  });

  it("24 orbital transfers cited in tech-overview", () => {
    assert.ok(
      techOverview.includes("24"),
      "tech-overview should cite 24 orbital transfers",
    );
  });

  it("KESTREL constants match SHIP_SPECS", () => {
    // Verify that the shared constants module stays in sync
    assert.strictEqual(
      KESTREL.thrustN / 1e6,
      SHIP_SPECS.thrustMN,
      "KESTREL.thrustN should match SHIP_SPECS.thrustMN",
    );
    assert.strictEqual(
      KESTREL.massKg / 1000,
      SHIP_SPECS.nominalMassT,
      "KESTREL.massKg should match SHIP_SPECS.nominalMassT",
    );
  });

  it("episode count is 5 across all summary reports", () => {
    assert.strictEqual(EPISODE_SUMMARIES.length, 5, "should have 5 episode summaries");
    for (const [name, content] of [
      ["tech-overview", techOverview],
      ["cross-episode", crossEpisode],
    ]) {
      assert.ok(
        content.includes("全5話") || content.includes("5話"),
        `${name} should reference 全5話`,
      );
    }
  });
});

// ============================================================
// Verdict counts in tech-overview match analysis
// ============================================================

describe("verdict summary consistency", () => {
  const techOverview = readReport("tech-overview.md");

  it("verdict counts add up to 24 transfers", () => {
    // Parse verdict table: plausible, conditional, reference, implausible
    const plausibleMatch = techOverview.match(/plausible.*\| (\d+)/);
    const conditionalMatch = techOverview.match(/conditional.*\| (\d+)/);
    const referenceMatch = techOverview.match(/reference.*\| (\d+)/);
    const implausibleMatch = techOverview.match(/implausible.*\| (\d+)/);

    assert.ok(plausibleMatch, "should have plausible count");
    assert.ok(conditionalMatch, "should have conditional count");
    assert.ok(referenceMatch, "should have reference count");
    assert.ok(implausibleMatch, "should have implausible count");

    const total =
      parseInt(plausibleMatch![1]) +
      parseInt(conditionalMatch![1]) +
      parseInt(referenceMatch![1]) +
      parseInt(implausibleMatch![1]);

    assert.strictEqual(total, 24, `verdict counts should total 24, got ${total}`);
  });

  it("zero implausible verdicts", () => {
    const match = techOverview.match(/implausible.*\| (\d+)/);
    assert.ok(match, "should have implausible row");
    assert.strictEqual(parseInt(match![1]), 0, "should have 0 implausible verdicts");
  });
});
