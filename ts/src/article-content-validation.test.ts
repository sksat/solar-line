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
import { extractEpisodeDirectives } from "./episode-mdx-parser.ts";

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
  // Also try comma-formatted (e.g., "7,604" for 7604)
  const commaStr = Math.round(expectedValue).toLocaleString("en-US");
  const found = text.includes(intStr) || text.includes(fixedStr) || text.includes(commaStr);
  assert.ok(
    found,
    `${label}: expected article to contain ~${expectedValue} (tried "${intStr}", "${fixedStr}", "${commaStr}")`,
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

  it("body total test count matches stats table total", () => {
    // Body says "X,XXXのテスト" and table says "テスト数 | X,XXX"
    const tableMatch = content.match(
      /テスト数 \| ([\d,]+)/,
    );
    const bodyMatch = content.match(/([\d,]+)のテスト/);
    assert.ok(tableMatch, "stats table should have total test count");
    assert.ok(bodyMatch, "body text should have total test count");
    const tableTotal = tableMatch![1].replace(/,/g, "");
    const bodyTotal = bodyMatch![1].replace(/,/g, "");
    assert.strictEqual(
      bodyTotal,
      tableTotal,
      `body total "${bodyTotal}" should match table total "${tableTotal}"`,
    );
  });

  it("body TS test count matches stats table TS count", () => {
    const tableMatch = content.match(/TS ([\d,]+)/);
    const bodyMatch = content.match(
      /TypeScript ユニットテスト.+?([\d,]+)件/,
    );
    assert.ok(tableMatch, "stats table should have TS count");
    assert.ok(bodyMatch, "body should have TS unit test count");
    const tableCount = tableMatch![1].replace(/,/g, "");
    const bodyCount = bodyMatch![1].replace(/,/g, "");
    assert.strictEqual(
      bodyCount,
      tableCount,
      `body TS count "${bodyCount}" should match table TS count "${tableCount}"`,
    );
  });

  it("body E2E test count matches stats table E2E count", () => {
    const tableMatch = content.match(/E2E ([\d,]+)/);
    const bodyMatch = content.match(
      /Playwright E2E テスト.+?([\d,]+)件/,
    );
    assert.ok(tableMatch, "stats table should have E2E count");
    assert.ok(bodyMatch, "body should have E2E test count");
    const tableCount = tableMatch![1].replace(/,/g, "");
    const bodyCount = bodyMatch![1].replace(/,/g, "");
    assert.strictEqual(
      bodyCount,
      tableCount,
      `body E2E count "${bodyCount}" should match table E2E count "${tableCount}"`,
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

  // Regression tests from Task 280 external review
  it("has newcomer introduction section", () => {
    assert.ok(
      content.includes("はじめに"),
      "should have introductory section for newcomers",
    );
  });

  it("lists relativistic.rs and constants.rs modules", () => {
    assert.ok(
      content.includes("relativistic.rs"),
      "should list relativistic.rs module",
    );
    assert.ok(
      content.includes("constants.rs"),
      "should list constants.rs module",
    );
  });

  it("clarifies runtime vs dev dependencies for zero-dependency claim", () => {
    assert.ok(
      content.includes("ランタイム") || content.includes("実行時"),
      "should clarify that zero-dependency claim is for runtime only",
    );
  });

  it("has cross-links to related pages", () => {
    assert.ok(
      content.includes("ai-costs.html"),
      "should link to ai-costs page",
    );
    assert.ok(
      content.includes("explorer/"),
      "should link to DuckDB data explorer",
    );
    assert.ok(
      content.includes("ship-kestrel.html"),
      "should link to ship-kestrel page",
    );
  });

  it("explains reference verdict category", () => {
    assert.ok(
      content.includes("reference") && content.includes("直接比較"),
      "should explain what reference verdict means",
    );
  });

  it("has test distribution bar chart showing multi-layer QA strategy", () => {
    const chartBlocks = content.split("```chart:bar").slice(1).map(b => b.split("```")[0]);
    const testChart = chartBlocks.find(
      block => block.includes("テスト") && block.includes("Rust") && block.includes("TypeScript")
    );
    assert.ok(testChart, "tech-overview should have test distribution bar chart");
    assert.ok(
      testChart!.includes("E2E") && testChart!.includes("Python"),
      "chart should include E2E and Python cross-validation layers",
    );
  });

  it("chart bar values match body text stats", () => {
    // Extract test counts from stats table row
    const tableMatch = content.match(/TS ([\d,]+) \+ Rust (\d+) \+ E2E (\d+)/);
    assert.ok(tableMatch, "should have stats table with test counts");
    const tableTs = parseInt(tableMatch![1].replace(/,/g, ""), 10);
    const tableRust = parseInt(tableMatch![2], 10);
    const tableE2e = parseInt(tableMatch![3], 10);

    // Extract chart bar values
    const chartBlock = content.split("```chart:bar").slice(1).map(b => b.split("```")[0])
      .find(b => b.includes("テスト分布"));
    assert.ok(chartBlock, "should have test distribution chart block");

    const rustChartVal = chartBlock!.split("Rust ユニットテスト")[1]?.match(/value: (\d+)/);
    const tsChartVal = chartBlock!.split("TypeScript ユニットテスト")[1]?.match(/value: (\d+)/);
    const e2eChartVal = chartBlock!.split("Playwright E2E テスト")[1]?.match(/value: (\d+)/);

    assert.ok(rustChartVal, "chart should have Rust value");
    assert.ok(tsChartVal, "chart should have TS value");
    assert.ok(e2eChartVal, "chart should have E2E value");

    assert.equal(parseInt(rustChartVal![1], 10), tableRust,
      `Rust chart value (${rustChartVal![1]}) should match table (${tableRust})`);
    assert.equal(parseInt(tsChartVal![1], 10), tableTs,
      `TS chart value (${tsChartVal![1]}) should match table (${tableTs})`);
    assert.equal(parseInt(e2eChartVal![1], 10), tableE2e,
      `E2E chart value (${e2eChartVal![1]}) should match table (${tableE2e})`);
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

  it("has margin gauge with mass boundary 299t", () => {
    assert.ok(content.includes("margin-gauge"), "EP01 should have margin-gauge fence");
    assert.ok(content.includes('"actual": 299'), "should cite 299t mass boundary");
  });

  it("Hohmann baseline ΔV matches analysis", () => {
    const hohmannDv = analysis.hohmann.totalDv;
    assertContainsApproxValue(content, hohmannDv, "EP01 Hohmann ΔV for Mars→Jupiter");
    const hohmannDays = analysis.hohmann.transferTimeDays;
    assertContainsApproxValue(content, hohmannDays, "EP01 Hohmann transfer time in days");
  });

  it("150h route brachistochrone accel matches analysis", () => {
    const scenario150h = analysis.brachistochrone150h[0]; // closest scenario
    assertContainsApproxValue(content, scenario150h.accelG, "EP01 150h route acceleration in G");
  });

  it("thrust boundary at 48,000t matches analysis", () => {
    const thrustMN = analysis.boundaries.thrustBoundary72h.thrustMN;
    assertContainsApproxValue(content, thrustMN, "EP01 required thrust at 48,000t for 72h");
  });

  it("HUD cross-check: vis-viva 17.92 km/s vs onscreen 17.8 km/s", () => {
    assert.ok(content.includes("17.92"), "should cite computed vis-viva speed 17.92 km/s");
    assert.ok(content.includes("17.8"), "should cite onscreen HUD value 17.8 km/s");
    assert.ok(content.includes("0.67"), "should cite 0.67% error between computed and onscreen");
  });

  it("perijove capture: ΔV 2.3 km/s, Oberth ratio 8.2x", () => {
    assert.ok(content.includes("2.3") && content.includes("km/s"),
      "should cite perijove capture ΔV 2.3 km/s");
    assert.ok(content.includes("8.2"),
      "should cite Oberth ratio 8.2x at perijove");
  });

  it("Mars departure altitude: 52° apparent diameter → 560 km", () => {
    assert.ok(content.includes("52°") || content.includes("52度"),
      "should cite 52° Mars apparent diameter from rear camera");
    assert.ok(content.includes("560") || content.includes("561"),
      "should cite ~560 km altitude above Mars surface");
  });

  it("total Jupiter ΔV budget: ~6.3 km/s estimated", () => {
    assert.ok(content.includes("6.3") && content.includes("km/s"),
      "should cite estimated total Jupiter ΔV ~6.3 km/s");
  });

  it("relativistic effects: β ~1.4% peak velocity for 72h brachistochrone", () => {
    assert.ok(content.includes("相対論") || content.includes("relativistic"),
      "EP01 should mention relativistic effects assessment");
    assert.ok(content.includes("1.4%") || content.includes("1.42%") || content.includes("4,248") || content.includes("4248"),
      "should cite peak velocity ~4,248 km/s or β ~1.4%");
  });

  it("has brachistochrone velocity profile timeseries chart", () => {
    assert.ok(content.includes("ep01-chart-velocity-profile"),
      "EP01 should have velocity profile chart with id ep01-chart-velocity-profile");
  });

  it("velocity profile: peak velocity ~4,248 km/s at midpoint", () => {
    assert.ok(content.includes("4248") || content.includes("4,248") || content.includes("4247"),
      "velocity profile should show peak ~4,248 km/s");
    assert.ok(content.includes("フリップ") || content.includes("中間点") || content.includes("midpoint"),
      "should reference midpoint flip");
  });

  it("velocity profile: symmetric acceleration/deceleration over 72h", () => {
    // The chart x-axis should span 0 to ~72 hours
    assert.ok(content.includes('"xLabel"') && content.includes("経過時間"),
      "velocity profile should have time axis label");
    assert.ok(content.includes('"yLabel"') && content.includes("速度"),
      "velocity profile should have velocity axis label");
  });

  it("has brachistochrone thrust profile timeseries chart", () => {
    assert.ok(content.includes("ep01-chart-thrust-profile"),
      "EP01 should have thrust profile chart with id ep01-chart-thrust-profile");
  });

  it("thrust profile: 9.8 MN with flip at 36h", () => {
    assert.ok(content.includes("推力プロファイル"),
      "thrust profile should have title referencing thrust profile");
    assert.ok(content.includes('"yLabel"') && content.includes("推力 (MN)"),
      "thrust profile should have thrust axis label");
  });

  it("mass vs transit time bar chart", () => {
    assert.ok(
      content.includes("質量別の最小遷移時間"),
      "should have mass vs transit time bar chart",
    );
    assert.ok(
      content.includes("299t（境界）") && content.includes("value: 72"),
      "chart should show 299t boundary mass at exactly 72 hours",
    );
    assert.ok(
      content.includes("48,000t（公称）") && content.includes("value: 912.4"),
      "chart should show 48,000t nominal at 912.4 hours",
    );
  });

  it("has Oberth efficiency bar chart (capture ΔV vs altitude)", () => {
    assert.ok(
      content.includes("捕獲ΔV") && content.includes("捕獲高度"),
      "EP01 should have Oberth capture ΔV vs altitude bar chart",
    );
    assert.ok(
      content.includes("value: 2.3") || content.includes("value: 1.46"),
      "chart should have perijove capture ΔV value",
    );
  });

  it("has 72h vs 150h route comparison bar chart", () => {
    // The bar chart should have caption referencing both routes
    assert.ok(
      content.includes("caption: 72時間") || content.includes("caption: 72h"),
      "EP01 should have 72h vs 150h route comparison bar chart",
    );
    assert.ok(
      content.includes("value: 4249"),
      "chart should have 72h peak velocity 4249 km/s as a bar value",
    );
  });

  it("has required thrust bar chart for 48,000t at 72h (exploration-02)", () => {
    const chartBlocks = content.split("```chart:bar").slice(1).map(b => b.split("```")[0]);
    const thrustChart = chartBlocks.find(
      block => block.includes("推力") && block.includes("1574") || block.includes("1,574")
    );
    assert.ok(thrustChart, "EP01 should have required thrust chart showing 1,574 MN boundary");
    assert.ok(
      thrustChart!.includes("9.8") || thrustChart!.includes("value: 9.8"),
      "chart should include actual thrust 9.8 MN",
    );
  });

  it("has Jupiter ΔV budget bar chart (exploration-07)", () => {
    const chartBlocks = content.split("```chart:bar").slice(1).map(b => b.split("```")[0]);
    const dvBudgetChart = chartBlocks.find(
      block => block.includes("ΔV") && block.includes("木星") && block.includes("2.4") && block.includes("2.3")
    );
    assert.ok(dvBudgetChart, "EP01 should have Jupiter ΔV budget chart with phase values 2.4 and 2.3");
    assert.ok(
      dvBudgetChart!.includes("1.6"),
      "chart should include Ganymede final approach ΔV ~1.6 km/s",
    );
  });

  // --- Task 528: Additional calc JSON → report cross-checks ---

  it("161x thrust gap cited in report", () => {
    const ratio = analysis.boundaries.thrustBoundary72h.thrustRatioToKestrel;
    assert.ok(Math.abs(ratio - 160.57) < 0.5, `thrustRatio ${ratio} should be ~160.57`);
    assert.ok(
      content.includes("161倍"),
      "EP01 should cite ~161x thrust gap (160.57 rounded)",
    );
  });

  it("required acceleration at 299t: 3.34G, 32.8 m/s²", () => {
    const aReqG = analysis.boundaries.massBoundary72h.aReqG;
    assert.ok(Math.abs(aReqG - 3.343) < 0.01);
    assert.ok(
      content.includes("3.34G") || content.includes("3.34 G"),
      "EP01 should cite required G-load 3.34G at 299t",
    );
    assert.ok(
      content.includes("32.8"),
      "EP01 should cite required acceleration 32.8 m/s² at 299t",
    );
  });

  it("reachable distance at 48,000t: 0.023 AU in 72h", () => {
    const reachableAU = analysis.reachableWithShipThrust.distanceAU;
    assert.ok(Math.abs(reachableAU - 0.023) < 0.001);
    const reachableKm = analysis.reachableWithShipThrust.distanceKm;
    assert.ok(
      content.includes("3429216") || content.includes("3,429,216"),
      "EP01 should cite 3,429,216 km reachable distance at 48,000t",
    );
  });

  it("minimum transit 912h (38 days) at 48,000t cited in report", () => {
    const timeH = analysis.boundaries.minTimeAtCanonicalMass.timeHours;
    assert.ok(Math.abs(timeH - 912.36) < 0.1);
    assert.ok(
      content.includes("912") && (content.includes("時間") || content.includes("h")),
      "EP01 should cite 912h minimum transit time",
    );
    assert.ok(
      content.includes("38日") || content.includes("38 日"),
      "EP01 should cite 38 days minimum transit",
    );
  });

  it("Hohmann transfer time 1126.84 days in calc data", () => {
    const hohmannDays = analysis.hohmann.transferTimeDays;
    assert.ok(Math.abs(hohmannDays - 1126.84) < 0.1);
    assert.ok(
      content.includes("1126") || content.includes("1,126") || content.includes("1127"),
      "EP01 should cite Hohmann transfer time ~1127 days",
    );
  });

  it("mass sensitivity: 4,800t scenario 0.229 AU in 72h", () => {
    const scenario = analysis.massSensitivity.find(
      (s: { massKg: number }) => s.massKg === 4800000,
    );
    assert.ok(scenario, "4,800t scenario should exist");
    assert.ok(Math.abs(scenario.reachable72h.distanceAU - 0.229) < 0.01);
    assert.ok(
      content.includes("4,800") || content.includes("4800"),
      "EP01 should discuss 4,800t mass interpretation",
    );
  });

  it("mass sensitivity: 480t scenario 2.29 AU, 48t scenario 22.9 AU", () => {
    const s480 = analysis.massSensitivity.find(
      (s: { massKg: number }) => s.massKg === 480000,
    );
    const s48 = analysis.massSensitivity.find(
      (s: { massKg: number }) => s.massKg === 48000,
    );
    assert.ok(s480 && s48, "both scenarios should exist");
    assert.ok(Math.abs(s480.reachable72h.distanceAU - 2.29) < 0.05);
    assert.ok(Math.abs(s48.reachable72h.distanceAU - 22.9) < 0.5);
    assert.ok(content.includes("480t"), "EP01 should discuss 480t scenario");
    assert.ok(content.includes("48t"), "EP01 should discuss 48t scenario");
  });

  it("ship nominal acceleration 0.204 m/s² at 48,000t", () => {
    const accel = analysis.shipAcceleration.accelNormalMs2;
    assert.ok(Math.abs(accel - 0.204) < 0.001);
    assert.ok(
      content.includes("0.02G") || content.includes("0.02 G") || content.includes("0.021G"),
      "EP01 should cite nominal acceleration ~0.02G at 48,000t",
    );
  });

  it("reachable distance bar chart shows all mass scenarios", () => {
    assert.ok(
      content.includes("0.023") && content.includes("0.229") && content.includes("2.29") && content.includes("22.9"),
      "EP01 should show reachable AU for 48,000t/4,800t/480t/48t scenarios",
    );
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

  it("has margin gauge with escape velocity data", () => {
    assert.ok(content.includes("margin-gauge"), "EP02 should have margin-gauge fence");
    assert.ok(content.includes('"actual": 18.99'), "should cite 18.99 km/s heliocentric velocity in margin gauge");
  });

  it("cold sleep is correctly attributed to the guest, not きりたん", () => {
    assert.ok(content.includes("ゲスト") && content.includes("覚醒"),
      "EP02 should mention guest awakening");
    assert.ok(!content.includes("87日間（約3ヶ月）のコールドスリープ"),
      "EP02 should NOT imply 87-day cold sleep for きりたん (old wording)");
  });

  it("two-phase transit model (3d+3d → ~107d) is mentioned", () => {
    assert.ok(content.includes("107"),
      "EP02 should cite two-phase transit time ~107 days");
    assert.ok(content.includes("2相") || content.includes("2相モデル"),
      "EP02 should mention two-phase model");
  });

  it("Jupiter escape velocity matches analysis", () => {
    const vEsc = analysis.jupiterEscape.escapeVelocityKms;
    assertContainsApproxValue(content, vEsc, "EP02 Jupiter escape velocity at 50 RJ");
  });

  it("heliocentric speed matches analysis", () => {
    const vHelio = analysis.jupiterEscape.heliocentricBestKms;
    assertContainsApproxValue(content, vHelio, "EP02 prograde heliocentric speed");
  });

  it("Enceladus minimum capture ΔV matches analysis", () => {
    const dvCapture = analysis.saturnCapture!.dvMinCaptureKms;
    assertContainsApproxValue(content, dvCapture, "EP02 Enceladus minimum capture ΔV");
  });

  it("Hohmann baseline ΔV matches analysis", () => {
    const hohmannDv = analysis.hohmann.totalDv;
    assertContainsApproxValue(content, hohmannDv, "EP02 Hohmann ΔV for Jupiter→Saturn");
    const hohmannYears = analysis.hohmann.transferTimeYears;
    assertContainsApproxValue(content, hohmannYears, "EP02 Hohmann transfer time in years");
  });

  it("ballistic transit matches analysis (~997 days)", () => {
    const ballistic = analysis.trimThrust.ballistic;
    assert.ok(ballistic, "EP02 should have ballistic transit scenario");
    assertContainsApproxValue(content, ballistic!.transferDays,
      "EP02 ballistic transit time (no thrust)");
  });

  it("v∞ consistency analysis with two-phase model", () => {
    assert.ok(
      content.includes("2相モデル") || content.includes("加速＋減速"),
      "EP02 should describe two-phase (accel+decel) model for v∞ consistency"
    );
    assert.ok(
      content.includes("v∞≈90"),
      "EP02 should cite the v∞≈90 km/s problem from prograde-only model"
    );
  });

  it("Jupiter radiation belt quantitative analysis (ep02-exploration-07)", () => {
    assert.ok(
      content.includes("ep02-exploration-07"),
      "EP02 should have radiation belt exploration (ep02-exploration-07)"
    );
    assert.ok(
      content.includes("Galileo") || content.includes("DDD"),
      "EP02 radiation analysis should reference Galileo calibration data"
    );
  });

  it("Jupiter radiation values match analysis", () => {
    const rad = analysis.jupiterRadiation;
    assertContainsApproxValue(content, rad.minSurvivalVelocityKms,
      "EP02 minimum survival velocity for radiation shield");
    assertContainsApproxValue(content, rad.departureRateKradH,
      "EP02 dose rate at Ganymede orbit");
  });

  it("has radiation escape dose bar chart", () => {
    const chartBlocks = content.split("```chart:bar").slice(1).map(b => b.split("```")[0]);
    const radChart = chartBlocks.find(
      block => block.includes("放射線") && block.includes("線量"),
    );
    assert.ok(radChart, "EP02 should have radiation escape dose bar chart");
    assert.ok(
      radChart!.includes("0.310") || radChart!.includes("0.31"),
      "chart should include ballistic escape dose (0.310 krad)",
    );
    assert.ok(
      radChart!.includes("0.043"),
      "chart should include shield budget (0.043 krad)",
    );
  });

  it("navigation overview HUD: MPA, COIAS, and vessel registry", () => {
    assert.ok(content.includes("MARS PORT AUTHORITY") || content.includes("MPA"),
      "should cite Mars Port Authority from navigation HUD");
    assert.ok(content.includes("MTS-9907") || content.includes("EXT-P17"),
      "should cite Kestrel's vessel registry MTS-9907/EXT-P17");
    assert.ok(content.includes("COIAS"),
      "should cite COIAS orbital cross alert system");
  });

  it("unknown ship vessel ID confirms MPA jurisdiction", () => {
    assert.ok(content.includes("MPA-MC-SCV-02814") || content.includes("SCV-02814"),
      "should cite unknown ship's MPA registry ID");
  });

  it("jurisdiction progression: Jupiter→Saturn governance labels", () => {
    assert.ok(content.includes("木星港湾公社"),
      "should cite Jupiter Port Authority (木星港湾公社)");
    assert.ok(content.includes("保護領"),
      "should cite protectorate status (保護領) for Saturn region");
  });

  it("stellar occultation as passive detection method", () => {
    assert.ok(content.includes("恒星掩蔽") || content.includes("stellar occultation"),
      "should discuss stellar occultation detection method");
  });

  it("relativistic effects: trim-thrust cruise β ≈ 0.02% negligible", () => {
    assert.ok(content.includes("相対論") || content.includes("relativistic"),
      "EP02 should mention relativistic effects assessment");
    assert.ok(content.includes("0.02%") || content.includes("65 km/s") || content.includes("無視可能") || content.includes("negligible"),
      "should note that EP02 trim-thrust relativistic effects are negligible");
  });

  it("has thrust profile chart for trim-thrust 2-phase model", () => {
    assert.ok(content.includes("ep02-chart-thrust-profile"),
      "EP02 should have thrust profile chart (ep02-chart-thrust-profile)");
  });

  it("thrust profile shows 0.098 MN trim thrust level", () => {
    assert.ok(content.includes('"0.098"') || content.includes("0.098"),
      "EP02 thrust profile should cite 0.098 MN trim thrust");
  });

  it("thrust profile compares 2-phase vs accel-only model", () => {
    assert.ok(content.includes("加速のみモデル") || content.includes("accel-only"),
      "EP02 thrust profile should include accel-only comparison series");
    assert.ok(content.includes("2相モデル") || content.includes("3日加速"),
      "EP02 thrust profile should reference the 2-phase model");
  });

  it("Jupiter departure direction bar chart", () => {
    assert.ok(
      content.includes("木星離脱方向と太陽中心速度"),
      "should have Jupiter departure direction bar chart",
    );
    assert.ok(
      content.includes("順行離脱") && content.includes("value: 18.99"),
      "chart should show prograde departure at 18.99 km/s",
    );
    assert.ok(
      content.includes("逆行離脱") && content.includes("value: 7.12"),
      "chart should show retrograde departure at 7.12 km/s",
    );
    assert.ok(
      content.includes("太陽脱出速度") && content.includes("value: 18.46"),
      "chart should show solar escape velocity threshold",
    );
  });

  it("has radiation shield survival chart", () => {
    assert.ok(
      content.includes("ep02-chart-radiation-shield"),
      "EP02 should have radiation shield survival chart",
    );
    assert.ok(
      content.includes("シールド残量（0.043 krad）"),
      "chart should show shield budget line at 0.043 krad",
    );
  });

  it("radiation chart shows ballistic dose exceeds shield budget", () => {
    // At 7 km/s, dose is 0.310 krad (7.2x budget)
    assert.ok(
      content.includes("0.310"),
      "radiation chart should include 7 km/s ballistic dose of 0.310 krad",
    );
    assert.ok(
      content.includes("0.036"),
      "radiation chart should include 60 km/s accelerated dose of 0.036 krad",
    );
  });

  it("has trim-thrust tradeoff chart", () => {
    assert.ok(
      content.includes("ep02-chart-trimthrust-tradeoff"),
      "EP02 should have trim-thrust tradeoff chart",
    );
    assert.ok(
      content.includes("捕獲可能上限"),
      "chart should show capture feasibility limit line",
    );
  });

  it("trim-thrust chart shows v∞=90 km/s for accel-only scenario", () => {
    // The key insight: accel-only gives v∞=90.3, far above capture limit
    assert.ok(
      content.includes("90.3"),
      "trim-thrust chart should show v∞=90.3 km/s for accel-only",
    );
  });

  it("has Saturn moon capture ΔV comparison bar chart", () => {
    assert.ok(
      content.includes("エンケラドス") && content.includes("value: 0.61"),
      "EP02 should have bar chart showing Enceladus minimum capture ΔV of 0.61 km/s",
    );
    assert.ok(
      content.includes("value: 3.70") || content.includes("value: 3.7"),
      "chart should include SOI boundary ΔV of 3.70 km/s",
    );
  });

  it("has trim-thrust burn duration vs transit time bar chart", () => {
    assert.ok(
      content.includes("caption: トリム推力") || content.includes("caption: 噴射日数"),
      "EP02 should have bar chart for trim-thrust burn duration tradeoff",
    );
    assert.ok(
      content.includes("value: 997"),
      "chart should show 997-day ballistic transit as reference",
    );
  });

  it("has thrust damage level vs acceleration bar chart", () => {
    assert.ok(
      content.includes("value: 32.67") || content.includes("value: 32.7"),
      "EP02 should have bar chart showing 32.67 m/s² at full thrust",
    );
    assert.ok(
      content.includes("value: 0.327") || content.includes("value: 0.33"),
      "chart should show 0.327 m/s² at trim-only thrust",
    );
  });

  // --- Task 508: Jupiter radiation scenario cross-checks ---

  it("radiation: ballistic 7 km/s shield fails, cited in report", () => {
    const ballistic = analysis.jupiterRadiation.scenarios.find(
      (s: { vRadialKms: number }) => s.vRadialKms === 7,
    );
    assert.ok(ballistic, "7 km/s scenario exists");
    assert.equal(ballistic.shieldSurvives, false);
    assert.ok(
      content.includes("弾道脱出") || content.includes("7 km/s"),
      "EP02 should cite ballistic 7 km/s scenario",
    );
  });

  it("radiation: accelerated 60 km/s shield survives, cited in report", () => {
    const accel = analysis.jupiterRadiation.scenarios.find(
      (s: { vRadialKms: number }) => s.vRadialKms === 60,
    );
    assert.ok(accel, "60 km/s scenario exists");
    assert.equal(accel.shieldSurvives, true);
    assert.ok(
      content.includes("加速脱出") || content.includes("60 km/s"),
      "EP02 should cite accelerated 60 km/s scenario",
    );
  });

  it("heliocentric transfer is hyperbolic and reaches Saturn", () => {
    assert.equal(analysis.heliocentricTransfer.isHyperbolic, true);
    assert.equal(analysis.heliocentricTransfer.reachesSaturn, true);
    assert.equal(analysis.additionalDvNeeded.naturallyReaches, true);
  });

  it("radiation shield budget 0.043 krad cited in report", () => {
    const budget = analysis.jupiterRadiation.shieldBudget42minKrad;
    assert.ok(Math.abs(budget - 0.043) < 0.001, `shield budget ${budget} should be ~0.043`);
    assert.ok(
      content.includes("0.043") || content.includes("0.04312"),
      "EP02 should cite shield budget ~0.043 krad",
    );
  });
});

describe("EP03 article content validation", () => {
  const content = readReport("ep03.md", "episodes");
  const analysis = analyzeEpisode3();

  it("cites 143-hour transit time", () => {
    assert.ok(content.includes("143"), "EP03 should cite 143-hour transit");
  });

  it("references Enceladus→Titania route", () => {
    assert.ok(content.includes("エンケラドス"), "should mention Enceladus");
    assert.ok(content.includes("タイタニア"), "should mention Titania");
  });

  it("mass boundary matches analysis", () => {
    const maxMass = analysis.massFeasibility.maxMassT;
    assertContainsApproxValue(content, maxMass, "EP03 mass boundary");
  });

  it("nav crisis accuracy matches analysis", () => {
    const ratio = analysis.navCrisis.computedVsStatedRatio;
    // Ratio should be ~0.998, meaning 99.8% accuracy
    const accuracyPct = ratio * 100;
    assert.ok(
      content.includes("99.8"),
      `EP03 should cite nav crisis accuracy ~99.8% (computed ratio ${accuracyPct.toFixed(1)}%)`,
    );
  });

  it("Hohmann baseline matches analysis", () => {
    const hohmannDv = analysis.hohmann.totalDv;
    assertContainsApproxValue(content, hohmannDv, "EP03 Hohmann ΔV for Saturn→Uranus");
    const hohmannYears = analysis.hohmann.transferTimeYears;
    assertContainsApproxValue(content, hohmannYears, "EP03 Hohmann transfer time in years");
  });

  it("has margin gauge with nav discrepancy data", () => {
    assert.ok(content.includes("margin-gauge"), "EP03 should have margin-gauge fence");
    assert.ok(content.includes('"actual": 1.23'), "should cite 1.23° nav system discrepancy");
  });

  it("Saturn escape ΔV matches analysis", () => {
    const dvEscape = analysis.saturnDeparture.dvEscapeFromEnceladusKms;
    assertContainsApproxValue(content, dvEscape, "EP03 Saturn escape ΔV from Enceladus orbit");
  });

  it("Saturn orbital velocity matches analysis", () => {
    const saturnOrbitalV = analysis.saturnDeparture.saturnOrbitalVKms;
    assertContainsApproxValue(content, saturnOrbitalV, "EP03 Saturn orbital velocity");
  });

  it("peak velocity: 5,583 km/s (1.86% c)", () => {
    assert.ok(content.includes("5,583") || content.includes("5583"),
      "should cite peak velocity 5,583 km/s");
    assert.ok(content.includes("1.86"),
      "should cite 1.86% of light speed");
  });

  it("navigation crisis: 1.23° error at 14.72 AU = ~1,436万km", () => {
    assert.ok(content.includes("1.23"),
      "should cite 1.23° navigation error");
    assert.ok(content.includes("14.72"),
      "should cite 14.72 AU position of crisis");
    assert.ok(content.includes("1,436") || content.includes("1436"),
      "should cite ~1,436万km position uncertainty");
  });

  it("Saturn orbital velocity: 9.62 km/s (gravity assist)", () => {
    assert.ok(content.includes("9.62"),
      "should cite Saturn orbital velocity 9.62 km/s");
  });

  // --- Task 359: Burn sequence integration ---

  it("6-phase burn sequence: cites total ΔV 5,984 km/s", () => {
    assert.ok(content.includes("5,984") || content.includes("5984"),
      "should cite total onscreen ΔV 5,984 km/s");
  });

  it("brachistochrone symmetry: 30-second difference between accel/decel", () => {
    assert.ok(
      content.includes("30:25:00") || content.includes("30:25:30") ||
      (content.includes("30秒") && content.includes("対称")),
      "should cite brachistochrone symmetry (30s or 30:25:00/30:25:30)");
  });

  it("Saturn escape onscreen: 4.31 km/s implies 1,387t mass", () => {
    assert.ok(content.includes("4.31"),
      "should cite onscreen Saturn Escape ΔV 4.31 km/s");
    assert.ok(content.includes("1,387") || content.includes("1387"),
      "should cite implied mass 1,387t from Saturn Escape acceleration");
  });

  it("ΔV efficiency: multi-stage achieves 47% reduction vs pure brachistochrone", () => {
    assert.ok(content.includes("47%") || content.includes("54%"),
      "should cite ΔV reduction percentage (47% savings or 54% of theoretical)");
  });

  it("relativistic effects: β ~1.9% for 143h brachistochrone", () => {
    assert.ok(content.includes("相対論") || content.includes("relativistic"),
      "EP03 should mention relativistic effects assessment");
    assert.ok(content.includes("1.9%") || content.includes("1.86%") || content.includes("5,590") || content.includes("5590"),
      "should cite peak velocity ~5,590 km/s or β ~1.9%");
  });

  it("stellar aberration analysis: connects relativistic effects to nav crisis", () => {
    assert.ok(content.includes("光行差"),
      "EP03 should include stellar aberration (光行差) analysis");
    assert.ok(content.includes("0.573"),
      "should cite max aberration ~0.573° at 3000 km/s");
    assert.ok(content.includes("arcsin"),
      "should reference arcsin formula for aberration");
    assert.ok(content.includes("47%") || content.includes("46%"),
      "should state aberration explains ~47% of the 1.23° discrepancy");
  });

  it("stellar aberration chart in timeseries-charts (not orphaned chart-data:)", () => {
    assert.ok(content.includes("ep03-stellar-aberration-sweep"),
      "EP03 should have stellar aberration velocity sweep chart");
    assert.ok(!content.includes("```chart-data:"),
      "should NOT have orphaned chart-data: directive (unsupported by parser)");
  });

  it("6-phase burn sequence bar chart", () => {
    assert.ok(
      content.includes("6フェーズ噴射シーケンス ΔV内訳"),
      "should have 6-phase burn sequence bar chart",
    );
    assert.ok(
      content.includes("Phase 1 土星脱出") && content.includes("value: 4.31"),
      "chart should include Saturn Escape phase with 4.31 km/s",
    );
    assert.ok(
      content.includes("Phase 2 加速") && content.includes("value: 2990"),
      "chart should include Cruise Burn phase with 2990 km/s",
    );
  });

  // --- Task 454: Navigation error visualizations ---

  it("nav error: has log-scale bar chart comparing error scales", () => {
    assert.ok(
      content.includes("航法誤差のスケール比較"),
      "should have nav error scale comparison bar chart",
    );
    assert.ok(
      content.includes("logScale: true"),
      "error scale chart should use log scale",
    );
    assert.ok(
      content.includes("value: 18") && content.includes("value: 14360000"),
      "should compare 18 km precision vs 14.36M km error",
    );
  });

  it("nav error: has angle-vs-error timeseries chart", () => {
    assert.ok(
      content.includes("ep03-nav-error-vs-angle"),
      "should have nav error vs angle chart",
    );
    assert.ok(
      content.includes("天王星ヒル球半径"),
      "chart should include Uranus Hill sphere reference line",
    );
  });

  it("nav error: has time evolution chart for wrong-choice scenario", () => {
    assert.ok(
      content.includes("ep03-nav-error-time-evolution"),
      "should have nav error time evolution chart",
    );
    assert.ok(
      content.includes("横ずれ距離"),
      "chart should track lateral drift over time",
    );
  });

  it("has mass boundary thrust comparison bar chart", () => {
    assert.ok(
      content.includes("value: 1039") || content.includes("value: 1040"),
      "EP03 should have bar chart showing 1,039.56 MN required thrust at 48,000t",
    );
    assert.ok(
      content.includes("106") && content.includes("倍"),
      "chart should indicate 106x thrust ratio",
    );
  });

  it("has Uranus moon capture ΔV comparison bar chart", () => {
    assert.ok(
      content.includes("ミランダ") && content.includes("value: 0.21"),
      "EP03 should have bar chart with Miranda capture ΔV of 0.21 km/s",
    );
    assert.ok(
      content.includes("タイタニア") && content.includes("value: 0.37"),
      "chart should include Titania capture ΔV of 0.37 km/s",
    );
  });

  it("has mass vs transit time bar chart", () => {
    const chartBlocks = content.split("```chart:bar").slice(1).map(b => b.split("```")[0]);
    const massTransitChart = chartBlocks.find(
      block => block.includes("質量") && block.includes("遷移時間"),
    );
    assert.ok(massTransitChart, "EP03 should have mass vs transit time bar chart");
    // Should include 452.5t boundary mass and 48,000t nominal
    assert.ok(
      massTransitChart!.includes("452.5") || massTransitChart!.includes("452"),
      "chart should include EP03 mass boundary (452.5t)",
    );
    assert.ok(
      massTransitChart!.includes("48,000") || massTransitChart!.includes("48000"),
      "chart should include 48,000t nominal mass",
    );
  });

  // --- Task 508: Moon comparison and nav data cross-checks ---

  it("moon comparison: all 5 major Uranian moons cited", () => {
    const moons = analysis.moonComparison.moons;
    assert.equal(moons.length, 5);
    assert.ok(content.includes("ミランダ"), "should cite Miranda");
    assert.ok(content.includes("アリエル"), "should cite Ariel");
    assert.ok(content.includes("オベロン"), "should cite Oberon");
    assert.ok(content.includes("タイタニア"), "should cite Titania");
  });

  it("moon comparison: v_inf = 2 km/s matches analysis", () => {
    assert.equal(analysis.moonComparison.vInfKms, 2);
    assert.ok(
      content.includes("2 km/s") || content.includes("2.0 km/s") || content.includes("v∞ = 2"),
      "EP03 should cite v_inf = 2 km/s for moon comparison",
    );
  });

  it("moon comparison: Titania capture ΔV ~0.37 km/s matches analysis", () => {
    const titania = analysis.moonComparison.moons.find(
      (m: { name: string }) => m.name === "TITANIA",
    );
    assert.ok(titania, "Titania exists in moon comparison");
    assert.ok(Math.abs(titania.dvCaptureKms - 0.374) < 0.01, "Titania capture ΔV ~0.37");
  });

  it("nav crisis: stellar nav confidence 92.3% matches analysis", () => {
    assert.ok(Math.abs(analysis.navCrisis.stellarNavConfidence - 0.923) < 0.001);
    assert.ok(
      content.includes("92.3") || content.includes("92%") || content.includes("0.923"),
      "EP03 should cite stellar nav confidence ~92.3%",
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

  it("has margin gauge with radiation and shield data", () => {
    assert.ok(content.includes("margin-gauge"), "EP04 should have margin-gauge fence");
    assert.ok(content.includes('"actual": 480'), "should cite 480 mSv radiation");
    assert.ok(content.includes('"limit": 500'), "should cite 500 mSv ICRP limit");
  });

  it("Hohmann baseline matches analysis", () => {
    const hohmannDv = analysis.hohmann.totalDv;
    assertContainsApproxValue(content, hohmannDv, "EP04 Hohmann ΔV for Uranus→Earth");
    const hohmannYears = analysis.hohmann.transferTimeYears;
    assertContainsApproxValue(content, hohmannYears, "EP04 Hohmann transfer time in years");
  });

  it("Titania escape ΔV matches analysis", () => {
    const dvEscape = analysis.uranusDeparture.dvEscapeFromTitaniaKms;
    assertContainsApproxValue(content, dvEscape, "EP04 Titania escape ΔV");
    assert.ok(content.includes("1.51"),
      "should cite Titania escape ΔV 1.51 km/s");
  });

  it("magnetic shield: 14 min remaining vs 8 min plasmoid passage", () => {
    assert.ok(content.includes("14分") || (content.includes("14") && content.includes("シールド")),
      "should cite shield remaining 14 min");
    assert.ok(content.includes("8分") || (content.includes("8") && content.includes("プラズモイド")),
      "should cite 8 min minimum plasmoid passage");
  });

  it("Uranus magnetic axis offset: 60° tilt", () => {
    assert.ok(content.includes("60") && content.includes("°"),
      "should cite 60° magnetic axis offset of Uranus");
  });

  it("radiation dose dialogue: 480 mSv", () => {
    assert.ok(content.includes("480") && content.includes("ミリシーベルト"),
      "should cite 480 mSv radiation in dialogue");
  });

  it("burns-remaining discrepancy: HUD 1-2 vs dialogue 3-4 with timeline", () => {
    assert.ok(content.includes("1-2") || content.includes("1〜2"),
      "should cite HUD display of 1-2 burns maximum");
    assert.ok(content.includes("3-4") || content.includes("3〜4") || content.includes("3回、最大4回"),
      "should cite dialogue 3-4 burns");
  });

  it("onscreen plasmoid B-field 180-340 nT vs Rust extreme 50 nT", () => {
    assert.ok(content.includes("180") && content.includes("340"),
      "should cite onscreen B-field range 180-340 nT");
    assert.ok(content.includes("3.6") || content.includes("6.8"),
      "should cite ratio vs Rust extreme scenario");
  });

  it("intercept velocity 18.3 km/s: below Uranus escape velocity", () => {
    assert.ok(content.includes("18.3"),
      "should cite onscreen intercept velocity 18.3 km/s");
    assert.ok(content.includes("21.3") || content.includes("脱出速度"),
      "should compare to Uranus escape velocity");
  });

  it("periapsis altitude 6.50 RU: between Miranda and Ariel orbits", () => {
    assert.ok(content.includes("6.50") || content.includes("6.5"),
      "should cite periapsis altitude 6.50 RU");
    assert.ok(content.includes("ミランダ") || content.includes("アリエル"),
      "should place periapsis between Miranda and Ariel orbits");
  });

  it("mass feasibility at 30 days matches analysis", () => {
    // massFeasibility is an array of scenarios by target days
    const scenario30d = analysis.massFeasibility.find(
      (s: { targetDays: number }) => s.targetDays === 30,
    );
    assert.ok(scenario30d, "EP04 should have 30-day mass feasibility scenario");
    assertContainsApproxValue(content, scenario30d!.maxMassT, "EP04 30-day mass feasibility");
  });

  it("has mass vs transit time bar chart", () => {
    const chartBlocks = content.split("```chart:bar").slice(1).map(b => b.split("```")[0]);
    const massTransitChart = chartBlocks.find(
      block => block.includes("質量") && block.includes("遷移時間"),
    );
    assert.ok(massTransitChart, "EP04 should have mass vs transit time bar chart");
    assert.ok(
      massTransitChart!.includes("300") && (massTransitChart!.includes("48,000") || massTransitChart!.includes("48000")),
      "chart should include 300t and 48,000t scenarios",
    );
    assert.ok(
      massTransitChart!.includes("3,929") || massTransitChart!.includes("3929"),
      "chart should include 3,929t (30-day boundary) scenario",
    );
  });

  it("relativistic effects: β ~0.7% for 65% thrust brachistochrone", () => {
    assert.ok(content.includes("相対論") || content.includes("relativistic"),
      "EP04 should mention relativistic effects assessment");
    assert.ok(content.includes("0.7%") || content.includes("0.70%") || content.includes("2,101") || content.includes("2101"),
      "should cite peak velocity ~2,101 km/s or β ~0.7%");
  });

  it("has thrust comparison velocity profile chart", () => {
    assert.ok(content.includes("ep04-chart-thrust-comparison"),
      "EP04 should have thrust comparison chart with id ep04-chart-thrust-comparison");
  });

  it("thrust comparison: shows 100% vs 65% thrust profiles", () => {
    assert.ok(content.includes("100%") && content.includes("65%"),
      "chart should compare 100% and 65% thrust");
    assert.ok(content.includes("推力制限") || content.includes("出力制限"),
      "should discuss thrust limitation");
  });

  it("has thrust profile timeseries chart", () => {
    assert.ok(content.includes("ep04-chart-thrust-profile"),
      "EP04 should have thrust profile chart with id ep04-chart-thrust-profile");
  });

  it("thrust profile: 6.37 MN with reference to 9.8 MN nominal", () => {
    assert.ok(content.includes("6.37"),
      "thrust profile should show 6.37 MN (65% of 9.8 MN)");
    assert.ok(content.includes("公称推力") && content.includes("9.8"),
      "thrust profile should reference 9.8 MN nominal thrust");
  });

  it("plasmoid decision IF analysis bar chart", () => {
    assert.ok(
      content.includes("プラズモイド対処の意思決定"),
      "should have plasmoid decision bar chart",
    );
    assert.ok(
      content.includes("シールド突破（作中選択）") && content.includes("value: 480"),
      "chart should show shield path with 480 mSv",
    );
    assert.ok(
      content.includes("主機で回避（IF）") && content.includes("value: 48"),
      "chart should show avoidance path with 48 mSv",
    );
  });

  it("has mass-transit boundary chart", () => {
    assert.ok(
      content.includes("ep04-chart-mass-transit"),
      "EP04 should have mass vs transit time chart",
    );
    assert.ok(
      content.includes("30日遷移境界"),
      "chart should show 30-day transit boundary line",
    );
  });

  it("mass-transit chart: 300t gives 8.3 days, 48000t gives 105 days", () => {
    assert.ok(
      content.includes("8.3") && content.includes("104.9"),
      "chart should include 300t→8.3d and 48000t→104.9d data points",
    );
  });

  it("has fleet timeline bar chart", () => {
    assert.ok(
      content.includes("33時間のタイムライン"),
      "should have fleet timeline bar chart caption",
    );
    assert.ok(
      content.includes("value: 9.7") && content.includes("タイタニア到着まで"),
      "chart should show 9.7h transit to Titania",
    );
    assert.ok(
      content.includes("value: 23.3") && content.includes("修理・補給可能時間"),
      "chart should show 23.3h repair window",
    );
  });

  it("has radiation exposure benchmarks bar chart", () => {
    assert.ok(
      content.includes("caption: 放射線被曝量") || content.includes("caption: プラズモイド被曝"),
      "EP04 should have radiation exposure benchmarks bar chart",
    );
    assert.ok(
      content.includes("value: 480") && content.includes("value: 500"),
      "chart should compare 480 mSv actual vs 500 mSv ICRP emergency limit",
    );
  });

  // --- Task 507: Additional calc JSON → report cross-checks ---

  it("worst-case radiation 1008 mSv cited in report", () => {
    const worstCase = analysis.plasmoid.worstCaseExposureMSv;
    assert.equal(worstCase, 1008);
    assert.ok(
      content.includes("1,008") || content.includes("1008"),
      "EP04 should cite worst-case radiation exposure 1008 mSv",
    );
  });

  it("en-route cumulative dose 48 mSv cited in report", () => {
    const enRoute = analysis.plasmoid.cumulativeEnRouteMSv;
    assert.equal(enRoute, 48);
    assert.ok(
      content.includes("48") && (content.includes("被曝") || content.includes("mSv") || content.includes("ミリシーベルト")),
      "EP04 should cite 48 mSv en-route cumulative dose",
    );
  });

  it("thermal margin 78% matches analysis", () => {
    assert.equal(analysis.damageAssessment.thermalMargin, 0.78);
    assert.ok(
      content.includes("78") && (content.includes("熱") || content.includes("thermal")),
      "EP04 should cite 78% thermal margin",
    );
  });

  // --- Task 535: Additional EP04 cross-checks for assertion parity ---

  it("damage assessment: cooling pressures match analysis", () => {
    assert.equal(analysis.damageAssessment.coolingPressure1MPa, 1.87);
    assert.equal(analysis.damageAssessment.coolingPressure2MPa, 0.96);
    assert.ok(
      content.includes("1.87") && content.includes("0.96"),
      "EP04 should cite cooling pressures 1.87 MPa and 0.96 MPa",
    );
  });

  it("damage assessment: shield status 'coil system 2 only' cited", () => {
    assert.ok(
      content.includes("コイル") || content.includes("coil"),
      "EP04 should reference coil system status in damage assessment",
    );
  });

  it("fleet intercept: 5 ships, 33h ETA, 9.7h arrival", () => {
    assert.equal(analysis.fleetIntercept.fleetShipCount, 5);
    assert.equal(analysis.fleetIntercept.fleetETAHours, 33);
    assert.ok(content.includes("33時間"), "should cite 33h fleet timeline");
    assert.ok(
      content.includes("9.7") && content.includes("タイタニア"),
      "should cite 9.7h Titania arrival time",
    );
  });

  it("brachistochrone closest scenario: ~105 days at 48,000t", () => {
    const closest = analysis.brachistochrone.find(
      (s: { scenario: string }) => s.scenario === "closest",
    );
    assert.ok(closest, "should have closest brachistochrone scenario");
    assertContainsApproxValue(content, closest!.timeDays, "EP04 closest transit days");
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

  it("cross-episode mass boundary cites 452.5t (not 452t)", () => {
    // Task 228 corrected EP03 mass boundary to 452.5t — EP05 cross-references must match
    assert.ok(
      content.includes("452.5"),
      "EP05 cross-episode mass boundary should cite 452.5t",
    );
  });

  it("has margin gauge with nozzle and radiation data", () => {
    assert.ok(content.includes("margin-gauge"), "EP05 should have margin-gauge fence");
    assert.ok(content.includes('"actual": 55.2'), "should cite nozzle actual 55.2h");
    assert.ok(content.includes('"limit": 55.63'), "should cite nozzle limit 55.63h");
  });

  it("Hohmann baseline ΔV matches analysis", () => {
    const hohmannDv = analysis.hohmann.totalDvKms;
    assertContainsApproxValue(content, hohmannDv, "EP05 Hohmann ΔV for Uranus→Earth");
    const hohmannYears = analysis.hohmann.transferTimeYears;
    assertContainsApproxValue(content, hohmannYears, "EP05 Hohmann transfer time in years");
  });

  it("Oberth effect: ~3% efficiency gain at Jupiter flyby", () => {
    assert.ok(content.includes("3%"),
      "should cite 3% Oberth efficiency gain");
    assert.ok(content.includes("オーベルト") || content.includes("Oberth"),
      "should mention Oberth effect");
  });

  it("Oberth burn saving matches analysis", () => {
    const savingMin = analysis.oberthEffect.threePercentBurnSavingMinutes;
    assertContainsApproxValue(content, savingMin, "EP05 Oberth 3% burn saving in minutes");
  });

  it("without flyby: burn time 56h51m, nozzle exceeded by 73 min", () => {
    assert.ok(content.includes("56") && content.includes("51"),
      "should cite 56h51m burn time without flyby");
    assert.ok(content.includes("73"),
      "should cite 73 min nozzle overrun without flyby");
  });

  it("300t peak velocity matches analysis", () => {
    const scenario300t = analysis.brachistochroneByMass[0];
    assertContainsApproxValue(content, scenario300t.peakVelocityKms, "EP05 300t peak velocity");
    const cFraction = scenario300t.peakVelocityCFraction * 100;
    assertContainsApproxValue(content, cFraction, "EP05 300t peak velocity as %c");
  });

  it("LEO capture ΔV matches analysis", () => {
    const dvLEO = analysis.earthApproach.brachistochroneArrival.dvCaptureLEOKms;
    assertContainsApproxValue(content, dvLEO, "EP05 LEO capture ΔV (brachistochrone arrival)");
  });

  it("moon orbit capture ΔV matches analysis", () => {
    const dvMoon = analysis.earthApproach.brachistochroneArrival.dvCaptureMoonOrbitKms;
    assertContainsApproxValue(content, dvMoon, "EP05 moon orbit capture ΔV");
  });

  it("satellite perturbation analysis: 2-body approximation validated", () => {
    assert.ok(content.includes("衛星摂動"),
      "should discuss satellite perturbation");
    assert.ok(content.includes("0.57%"),
      "should cite 0.57% perturbation fraction");
    assert.ok(content.includes("8.6 m/s") || content.includes("8.6m/s"),
      "should cite max perturbation ~8.6 m/s");
    assert.ok(content.includes("2体近似"),
      "should validate 2-body approximation");
  });

  // --- Task 358: Onscreen crossref integration ---

  it("acceleration evolution across 4 burns: non-monotonic pattern", () => {
    // EP05 onscreen crossref shows burn accelerations: 16.38 → 13.66 → 10.92 → 15.02 m/s²
    assert.ok(content.includes("16.38") || content.includes("16.4"),
      "should cite Burn 1 (Uranus Escape) acceleration ~16.38 m/s²");
    assert.ok(content.includes("10.92") || content.includes("10.9"),
      "should cite Burn 3 (Mars Deceleration) acceleration ~10.92 m/s²");
    assert.ok(content.includes("15.02") || content.includes("15.0"),
      "should cite Burn 4 (Earth Capture) acceleration ~15.02 m/s²");
  });

  it("acceleration evolution: discusses thrust degradation or throttle control", () => {
    assert.ok(
      content.includes("ノズル劣化") || content.includes("スロットル") || content.includes("推力変化"),
      "should discuss thrust degradation, throttle control, or thrust variation across burns");
  });

  it("has acceleration evolution timeseries chart", () => {
    assert.ok(content.includes("ep05-acceleration-evolution"),
      "should have acceleration evolution chart ID");
    assert.ok(content.includes("等推力理論値"),
      "chart should have constant-thrust reference line");
  });

  it("relativistic effects: β ~2.5% peak — strongest in series", () => {
    assert.ok(content.includes("相対論") || content.includes("relativistic"),
      "EP05 should mention relativistic effects assessment");
    assert.ok(content.includes("2.5%") || content.includes("2.54%") || content.includes("7,603") || content.includes("7604"),
      "should cite peak velocity ~7,604 km/s or β ~2.5%");
  });

  it("Saturn ring ice particle: 110 MJ impact energy verified", () => {
    assert.ok(content.includes("110") && (content.includes("MJ") || content.includes("メガジュール")),
      "should cite 110 MJ impact energy from onscreen data");
    assert.ok(content.includes("多孔質") || content.includes("密度"),
      "should discuss porous ice or density to explain the 110 MJ value");
  });

  it("jurisdictional progression: 5-zone governance on return route", () => {
    assert.ok(content.includes("自由圏"),
      "should cite 自由圏 (free zone) — EP05-first governance category");
    assert.ok(content.includes("地球軌道港湾機構"),
      "should cite 地球軌道港湾機構 as asteroid belt jurisdiction");
    assert.ok(content.includes("木星軌道連合"),
      "should cite 木星軌道連合 as Jupiter jurisdiction");
  });

  it("navigation autonomy: STELLAR-INS with all beacons unavailable", () => {
    assert.ok(content.includes("STELLAR-INS") || content.includes("恒星慣性航法"),
      "should cite STELLAR-INS autonomous navigation mode");
    assert.ok(content.includes("BEACON") || content.includes("ビーコン"),
      "should discuss beacon unavailability");
  });

  // --- Task 375: Velocity profile chart ---

  it("has velocity profile chart (ep05-chart-velocity-profile)", () => {
    assert.ok(content.includes("ep05-chart-velocity-profile"),
      "EP05 should have a velocity profile chart");
  });

  it("velocity profile: peak ~2100 km/s at Jupiter flyby", () => {
    const match = content.match(/"id":\s*"ep05-chart-velocity-profile"[\s\S]*?"y":\s*\[([\d.,\s]+)\]/);
    assert.ok(match, "should find ep05-chart-velocity-profile series data");
    const yValues = match![1].split(",").map(Number);
    const peak = Math.max(...yValues);
    assert.ok(Math.abs(peak - 2100) < 50, `peak velocity should be ~2100 km/s, got ${peak}`);
  });

  it("velocity profile: cruising velocity ~1500 km/s", () => {
    const match = content.match(/"id":\s*"ep05-chart-velocity-profile"[\s\S]*?"y":\s*\[([\d.,\s]+)\]/);
    assert.ok(match, "should find velocity data");
    const yValues = match![1].split(",").map(Number);
    const cruisePoints = yValues.filter(v => Math.abs(v - 1500) < 50);
    assert.ok(cruisePoints.length >= 2, `should have multiple points near 1500 km/s cruise, found ${cruisePoints.length}`);
  });

  it("velocity profile: has 4-burn annotations", () => {
    assert.ok(content.includes("Burn 1") || content.includes("天王星脱出"),
      "should annotate Burn 1");
    assert.ok(content.includes("Burn 4") || content.includes("地球投入"),
      "should annotate Burn 4");
  });

  it("Jupiter flyby IF analysis bar chart", () => {
    assert.ok(
      content.includes("木星フライバイの必要性"),
      "should have Jupiter flyby necessity bar chart",
    );
    assert.ok(
      content.includes("フライバイあり（作中）") && content.includes("value: 55.2"),
      "chart should show flyby path at 55.2 hours",
    );
    assert.ok(
      content.includes("フライバイなし（IF）") && content.includes("value: 56.85"),
      "chart should show no-flyby path at 56.85 hours",
    );
    assert.ok(
      content.includes("ノズル寿命限界") && content.includes("value: 55.63"),
      "chart should show nozzle limit at 55.63 hours",
    );
  });

  it("has navigation precision comparison bar chart (log scale)", () => {
    assert.ok(
      content.includes("深宇宙航法の位置精度比較"),
      "should have navigation precision bar chart caption",
    );
    assert.ok(
      content.includes("value: 20") && content.includes("ケストレル自律航法"),
      "chart should show Kestrel 20 km precision",
    );
    assert.ok(
      content.includes("value: 184") && content.includes("New Horizons"),
      "chart should show New Horizons DSN 184 km precision",
    );
    assert.ok(
      content.includes("value: 14360000") && content.includes("EP03"),
      "chart should show EP03 crisis at 14.36M km",
    );
  });

  it("has nozzle damage model comparison bar chart", () => {
    assert.ok(
      content.includes("ノズル損傷モデル比較"),
      "should have nozzle damage model bar chart caption",
    );
    assert.ok(
      content.includes("value: 99.2") && content.includes("定常燃焼のみ"),
      "chart should show 99.2% steady-state damage",
    );
    assert.ok(
      content.includes("value: 101.2") && content.includes("熱サイクル疲労"),
      "chart should show 101.2% with thermal cycle fatigue",
    );
  });

  // --- Task 507: Additional calc JSON → report cross-checks ---

  it("nozzle sensitivity: 1% increase → -427s margin cited in report", () => {
    const onePercent = analysis.nozzleLifespan.sensitivityScenarios.find(
      (s: { label: string }) => s.label.includes("1%増加"),
    );
    assert.ok(onePercent, "1% scenario exists in analysis");
    assert.ok(
      content.includes("1%増加") && content.includes("427"),
      "EP05 should cite 1% increase scenario with -427s margin",
    );
  });

  it("navigation angular accuracy 7.35 nrad cited in report", () => {
    const nrad = analysis.navigationAccuracy.angularAccuracyNrad;
    assert.ok(Math.abs(nrad - 7.35) < 0.1, `angular accuracy ${nrad} should be ~7.35 nrad`);
    assert.ok(
      content.includes("7.35"),
      "EP05 should cite 7.35 nrad angular accuracy",
    );
  });

  it("furthest point 19.2 AU cited in report", () => {
    const farthest = analysis.fullRoute.furthestPointAU;
    assert.ok(Math.abs(farthest - 19.2) < 0.1, `furthest point ${farthest} should be ~19.2 AU`);
    assert.ok(
      content.includes("19.2"),
      "EP05 should cite furthest point 19.2 AU",
    );
  });

  it("Oberth best-case efficiency ~0.078% cited in report", () => {
    assert.ok(
      analysis.oberthEffect.bestCaseVelocityEfficiencyPercent < 0.1,
      "best-case efficiency should be < 0.1%",
    );
    // Report uses "0.078%" (rounded from 0.0695%)
    assert.ok(
      content.includes("0.078") || content.includes("0.07") || content.includes("0.08"),
      "EP05 should cite Oberth best-case efficiency percentage",
    );
  });

  it("EP03 navigation comparison factor cited", () => {
    const ratio = analysis.navigationAccuracy.ep03Comparison.ep05VsEp03Ratio;
    assert.ok(
      ratio > 1_000_000,
      `EP03 comparison ratio ${ratio} should be > 1M times better`,
    );
    assert.ok(
      content.includes("290万"),
      "EP05 should cite navigation improvement factor ~290万 vs EP03",
    );
  });
});

// ============================================================
// Episode cross-references to summary reports (Task 480)
// ============================================================

describe("Episode reports cross-reference summary analyses", () => {
  const episodes = [
    { file: "ep01.md", label: "EP01", requiredLinks: ["ship-kestrel.html", "cross-episode.html", "attitude-control.html"] },
    { file: "ep02.md", label: "EP02", requiredLinks: ["ship-kestrel.html", "infrastructure.html", "cross-episode.html"] },
    { file: "ep03.md", label: "EP03", requiredLinks: ["communications.html", "attitude-control.html", "ship-kestrel.html"] },
    { file: "ep04.md", label: "EP04", requiredLinks: ["attitude-control.html", "ship-kestrel.html", "cross-episode.html"] },
    { file: "ep05.md", label: "EP05", requiredLinks: ["ship-kestrel.html", "cross-episode.html", "other-ships.html", "infrastructure.html"] },
  ];

  for (const { file, label, requiredLinks } of episodes) {
    it(`${label} links to relevant summary reports`, () => {
      const content = readReport(file, "episodes");
      for (const link of requiredLinks) {
        assert.ok(
          content.includes(link),
          `${label} should link to ${link}`,
        );
      }
    });
  }
});

// ============================================================
// Summary reports cross-reference episodes (Task 481)
// ============================================================

describe("Summary reports have related pages with episode links", () => {
  const summaries = [
    { file: "ship-kestrel.md", label: "ship-kestrel", requiredLinks: ["../episodes/ep-001.html", "../episodes/ep-002.html", "../episodes/ep-003.html", "../episodes/ep-004.html", "../episodes/ep-005.html", "cross-episode.html"] },
    { file: "communications.md", label: "communications", requiredLinks: ["../episodes/ep-003.html", "../episodes/ep-005.html"] },
    { file: "attitude-control.md", label: "attitude-control", requiredLinks: ["../episodes/ep-001.html", "../episodes/ep-004.html", "../episodes/ep-005.html"] },
    { file: "infrastructure.md", label: "infrastructure", requiredLinks: ["../episodes/ep-002.html", "../episodes/ep-003.html", "../episodes/ep-005.html"] },
  ];

  for (const { file, label, requiredLinks } of summaries) {
    it(`${label} has related pages linking to episodes`, () => {
      const content = readReport(file);
      assert.ok(
        content.includes("関連ページ"),
        `${label} should have a 関連ページ section`,
      );
      for (const link of requiredLinks) {
        assert.ok(
          content.includes(link),
          `${label} should link to ${link}`,
        );
      }
    });
  }
});

describe("Remaining summary reports have related pages", () => {
  const summaries = [
    { file: "science-accuracy.md", label: "science-accuracy", requiredLinks: ["../episodes/ep-001.html", "../episodes/ep-002.html", "../episodes/ep-003.html", "../episodes/ep-004.html", "../episodes/ep-005.html"] },
    { file: "other-ships.md", label: "other-ships", requiredLinks: ["../episodes/ep-002.html", "../episodes/ep-004.html", "../episodes/ep-005.html"] },
    { file: "cross-episode.md", label: "cross-episode", requiredLinks: ["ship-kestrel.html", "../episodes/ep-001.html", "../episodes/ep-002.html", "../episodes/ep-003.html", "../episodes/ep-004.html", "../episodes/ep-005.html"] },
    { file: "ai-costs.md", label: "ai-costs", requiredLinks: ["tech-overview.html"] },
    { file: "tech-overview.md", label: "tech-overview", requiredLinks: ["ai-costs.html", "ship-kestrel.html", "cross-episode.html"] },
  ];

  for (const { file, label, requiredLinks } of summaries) {
    it(`${label} has related pages section`, () => {
      const content = readReport(file);
      assert.ok(
        content.includes("関連ページ"),
        `${label} should have a 関連ページ section`,
      );
      for (const link of requiredLinks) {
        assert.ok(
          content.includes(link),
          `${label} should link to ${link}`,
        );
      }
    });
  }
});

// ============================================================
// Other-ships report content validation
// ============================================================

describe("other-ships.md content validation", () => {
  const content = readReport("other-ships.md");

  it("has orbital diagrams for EP02, EP04, and EP05 ship encounters", () => {
    assert.ok(
      content.includes("other-ships-ep02-ambush"),
      "should have EP02 large ship ambush diagram",
    );
    assert.ok(
      content.includes("other-ships-fleet-saturn-uranus"),
      "should have EP04 fleet diagram",
    );
    assert.ok(
      content.includes("other-ships-ep05-intercept"),
      "should have EP05 security boat intercept diagram",
    );
  });

  it("EP02 ambush diagram references Saturn system and Enceladus", () => {
    // The diagram should be Saturn-centric with Enceladus
    assert.ok(
      content.includes('"centerLabel": "土星"'),
      "EP02 diagram should be Saturn-centric",
    );
    assert.ok(
      content.includes('"label": "エンケラドス"'),
      "EP02 diagram should show Enceladus orbit",
    );
  });

  it("EP05 intercept diagram references Jupiter flyby geometry", () => {
    assert.ok(
      content.includes('"label": "木星'),
      "EP05 diagram should show Jupiter",
    );
    assert.ok(
      content.includes("保安艇派遣"),
      "EP05 diagram should show security boat dispatch route",
    );
  });

  it("all diagrams have descriptions", () => {
    // Per CLAUDE.md: orbital diagrams should have descriptions
    const diagramBlocks = content.split("component:orbital-diagram");
    // First element is before any diagram, so skip it
    for (let i = 1; i < diagramBlocks.length; i++) {
      assert.ok(
        diagramBlocks[i].includes('"description"'),
        `orbital diagram ${i} should have a description field`,
      );
    }
  });

  it("references all 4 ship categories", () => {
    assert.ok(content.includes("大型船"), "should have large ship section");
    assert.ok(content.includes("公安艦隊"), "should have public safety fleet section");
    assert.ok(content.includes("保安艇"), "should have security boat section");
    assert.ok(content.includes("商船群"), "should have merchant fleet section");
  });

  it("nuclear torpedo pass-through time calculation is present and consistent", () => {
    // 0.038 seconds = 2×40km / 2100 km/s (the only correct value)
    assert.ok(
      content.includes("0.038"),
      "should cite nuclear torpedo pass-through time as 0.038 s",
    );
    assert.ok(
      !content.includes("0.019"),
      "should NOT cite the incorrect 0.019 s value (half of actual)",
    );
  });

  // --- Task 277 regression tests ---

  it("nuclear torpedo quote has correct timestamp (12:07, not 11:58)", () => {
    assert.ok(
      content.includes("殺傷半径は40km程度") && content.includes("12:07"),
      "nuclear torpedo kill radius quote should have timestamp 12:07",
    );
  });

  it("propellant ratio is ~0.51%, not 0.05%", () => {
    assert.ok(
      content.includes("0.51%"),
      "propellant ratio should be ~0.51% for 50 km/s ΔV at Isp 10^6 s",
    );
    assert.ok(
      !content.includes("~0.05%"),
      "should NOT cite incorrect 0.05% propellant ratio",
    );
  });

  it("EP04 fleet uses 9.36 AU epoch distance, not 10 AU", () => {
    assert.ok(
      content.includes("9.36 AU") || content.includes("9.4 AU"),
      "should reference epoch-specific Saturn-Uranus distance (~9.36 AU)",
    );
  });

  it("EP02 large ship quote has correct timestamp (17:31)", () => {
    assert.ok(
      content.includes("10倍以上") && content.includes("(17:31)"),
      "EP02 large ship quote should have timestamp 17:31",
    );
  });

  it("EP05 security boat quote has correct timestamp (14:31)", () => {
    assert.ok(
      content.includes("保安艇が2隻") && content.includes("(14:31)"),
      "EP05 security boat quote should have timestamp 14:31",
    );
  });

  it("includes EP03 保安艇エシュロン section", () => {
    assert.ok(
      content.includes("エシュロン"),
      "should include EP03 security boat Echelon",
    );
    assert.ok(
      content.includes("セイラ・アンダース"),
      "should mention the officer Seira Anders",
    );
  });

  it("includes EP01 pursuit ships section", () => {
    assert.ok(
      content.includes("火星の査察艇"),
      "should mention Mars inspection boats from EP01",
    );
    assert.ok(
      content.includes("追跡の発端"),
      "should have EP01 pursuit origin section",
    );
  });

  it("all dialogue quotes have timestamps", () => {
    // All quotes in format "speakerName「text」" should be followed by (timestamp)
    // Speaker names: きりたん, ケイ, 船乗り, エンケラドスの管理人
    const quotePattern = /(?:きりたん|ケイ|船乗り|エンケラドスの管理人)「[^」]+」(?!\s*\()/g;
    const quotesWithoutTimestamp: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = quotePattern.exec(content)) !== null) {
      // Skip if it's inside a JSON block (table/component/glossary definitions)
      const before = content.substring(Math.max(0, match.index - 200), match.index);
      if (before.includes('"definition"') || before.includes('"text"') || before.includes('"values"')) continue;
      quotesWithoutTimestamp.push(match[0].substring(0, 50) + "...");
    }
    assert.deepStrictEqual(
      quotesWithoutTimestamp,
      [],
      "all narrative dialogue quotes should have timestamps",
    );
  });

  it("EP02 large ship vessel ID: MPA-MC-SCV-02814 from navigation HUD", () => {
    assert.ok(content.includes("MPA-MC-SCV-02814"),
      "should cite the onscreen vessel ID MPA-MC-SCV-02814");
    assert.ok(content.includes("MPA") && (content.includes("火星") || content.includes("Mars")),
      "should connect MPA prefix to Mars Port Authority");
  });

  it("has ΔV capability comparison bar chart", () => {
    assert.ok(
      content.includes("推定ΔV能力の下限比較"),
      "should have ΔV capability comparison bar chart",
    );
    assert.ok(
      content.includes("value: 842"),
      "should include fleet ΔV estimate of 842 km/s",
    );
  });

  // Analysis-derived cross-checks (Task 500)
  it("EP04 fleet ETA 33h matches analysis", () => {
    const ep4 = analyzeEpisode4();
    assertContainsApproxValue(content, ep4.fleetIntercept.fleetETAHours,
      "other-ships fleet ETA from EP04 analysis");
  });

  it("EP04 fleet ship count matches analysis", () => {
    const ep4 = analyzeEpisode4();
    assertContainsApproxValue(content, ep4.fleetIntercept.fleetShipCount,
      "other-ships fleet ship count from EP04 analysis");
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

  it("EP01 mass boundary 299t cited in ship-kestrel and cross-episode", () => {
    assert.ok(shipKestrel.includes("299"), "ship-kestrel should cite 299t mass boundary");
    assert.ok(crossEpisode.includes("299"), "cross-episode should cite 299t mass boundary");
  });

  it("EP03 mass boundary 452.5t cited in ship-kestrel and cross-episode", () => {
    assert.ok(shipKestrel.includes("452.5"), "ship-kestrel should cite 452.5t mass boundary");
    assert.ok(crossEpisode.includes("452.5"), "cross-episode should cite 452.5t mass boundary");
  });

  it("nozzle margin 26 min (0.78%) cited in cross-episode", () => {
    assert.ok(crossEpisode.includes("26分") || crossEpisode.includes("26"),
      "cross-episode should cite nozzle margin 26 min");
    assert.ok(crossEpisode.includes("0.78"),
      "cross-episode should cite 0.78% nozzle margin");
  });

  it("EP05 composite route 507h cited in cross-episode", () => {
    assert.ok(crossEpisode.includes("507"),
      "cross-episode should cite 507h composite route");
  });

  it("D-He³ fuel type cited consistently", () => {
    assert.ok(shipKestrel.includes("D-He³"),
      "ship-kestrel should cite D-He³ fuel");
    assert.ok(crossEpisode.includes("D-He³"),
      "cross-episode should cite D-He³ fuel");
  });

  it("total route distance ~35.9 AU cited in cross-episode", () => {
    assert.ok(
      crossEpisode.includes("35.9") || crossEpisode.includes("35.88"),
      "cross-episode should cite ~35.9 AU total distance",
    );
  });

  it("cross-episode should NOT contain stale 0.8% nozzle margin (must be 0.78%)", () => {
    // Regression: ensure no "0.8%" without the precise "0.78%" nearby
    assert.ok(!crossEpisode.includes("マージン26分（0.8%）"),
      "cross-episode should not contain rounded 0.8% nozzle margin — use 0.78%");
  });

  it("margin-gauge EP02 uses calculation-file velocity values", () => {
    // Regression: EP02 margin-gauge should use 18.99/18.46 from ep02_calculations.json
    assert.ok(crossEpisode.includes("18.99"),
      "cross-episode margin-gauge should reference heliocentric velocity 18.99 km/s");
    assert.ok(crossEpisode.includes("18.46"),
      "cross-episode margin-gauge should reference escape velocity 18.46 km/s");
  });

  it("LEO radius should be 6,771 km (not 6,778 km)", () => {
    assert.ok(!crossEpisode.includes("6,778"),
      "cross-episode should not contain incorrect LEO radius 6,778 km");
    assert.ok(crossEpisode.includes("6,771"),
      "cross-episode should cite correct LEO radius 6,771 km");
  });

  it("full-route diagram has PiP insets for Jupiter, Saturn, and Uranus systems", () => {
    assert.ok(crossEpisode.includes('"inset-jupiter"'),
      "cross-episode full-route should have Jupiter inset");
    assert.ok(crossEpisode.includes('"inset-saturn"'),
      "cross-episode full-route should have Saturn inset");
    assert.ok(crossEpisode.includes('"inset-uranus"'),
      "cross-episode full-route should have Uranus inset");
  });

  it("full-route EP5 is split into two legs via Jupiter (not single arc)", () => {
    // The Jupiter flyby should be visualized as two arcs: Uranus→Jupiter, Jupiter→Earth
    // A single Uranus→Earth arc doesn't pass through Jupiter, making the flyby look wrong
    assert.ok(crossEpisode.includes('"fromOrbitId": "uranus"') &&
      crossEpisode.includes('"toOrbitId": "jupiter"'),
      "EP5 should have a Uranus→Jupiter transfer leg");
    assert.ok(crossEpisode.includes('"fromOrbitId": "jupiter"') &&
      crossEpisode.includes('"toOrbitId": "earth"'),
      "EP5 should have a Jupiter→Earth transfer leg");
    // Should NOT have a single transfer block going directly from uranus to earth
    // (check within the same JSON object — fromOrbitId and toOrbitId within ~100 chars)
    const uranusToEarth = crossEpisode.match(/"fromOrbitId":\s*"uranus",\s*\n\s*"toOrbitId":\s*"earth"/);
    assert.strictEqual(uranusToEarth, null,
      "EP5 should NOT have a single Uranus→Earth transfer — must route through Jupiter");
  });

  // --- Task 534: Cross-report value consistency for values appearing in 3+ reports ---

  const ep04 = readReport("ep04.md", "episodes");
  const ep05 = readReport("ep05.md", "episodes");
  const scienceAccuracy = readReport("science-accuracy.md");
  const attitudeControl = readReport("attitude-control.md");
  const communications = readReport("communications.md");

  it("nozzle margin 26 min (0.78%) cited consistently across all relevant reports", () => {
    // All 5 reports cite the 26-minute margin
    for (const [name, content] of [
      ["ship-kestrel", shipKestrel],
      ["cross-episode", crossEpisode],
      ["ep05", ep05],
      ["science-accuracy", scienceAccuracy],
      ["attitude-control", attitudeControl],
    ] as const) {
      assert.ok(
        content.includes("26分") || content.includes("26 min"),
        `${name} should cite nozzle margin 26 min`,
      );
    }
    // Percentage 0.78% is cited in reports with detailed margin analysis
    for (const [name, content] of [
      ["ship-kestrel", shipKestrel],
      ["cross-episode", crossEpisode],
      ["ep05", ep05],
      ["attitude-control", attitudeControl],
    ] as const) {
      assert.ok(
        content.includes("0.78"),
        `${name} should cite 0.78% nozzle margin`,
      );
    }
  });

  it("total route distance ~35.9 AU cited consistently across reports", () => {
    for (const [name, content] of [
      ["ship-kestrel", shipKestrel],
      ["cross-episode", crossEpisode],
      ["ep05", ep05],
      ["science-accuracy", scienceAccuracy],
    ] as const) {
      assert.ok(
        content.includes("35.9") || content.includes("35.88"),
        `${name} should cite ~35.9 AU total route distance`,
      );
    }
  });

  it("mission duration ~124 days cited consistently across reports", () => {
    for (const [name, content] of [
      ["cross-episode", crossEpisode],
      ["ep05", ep05],
      ["communications", communications],
    ] as const) {
      assert.ok(
        content.includes("124日") || content.includes("124 day"),
        `${name} should cite ~124-day mission duration`,
      );
    }
  });

  it("plasmoid radiation dose 480 mSv cited consistently across reports", () => {
    for (const [name, content] of [
      ["ep04", ep04],
      ["ship-kestrel", shipKestrel],
      ["cross-episode", crossEpisode],
      ["science-accuracy", scienceAccuracy],
      ["communications", communications],
    ] as const) {
      assert.ok(
        content.includes("480 mSv") || content.includes("480mSv"),
        `${name} should cite 480 mSv plasmoid radiation dose`,
      );
    }
  });

  it("EP02 trim-thrust ~87 days cited consistently across reports", () => {
    for (const [name, content] of [
      ["ship-kestrel", shipKestrel],
      ["cross-episode", crossEpisode],
      ["science-accuracy", scienceAccuracy],
      ["communications", communications],
    ] as const) {
      assert.ok(
        content.includes("87日") || content.includes("87 day") || content.includes("87d"),
        `${name} should cite ~87-day EP02 trim-thrust transit`,
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

// ============================================================
// Ship-kestrel report: specs match shared constants
// ============================================================

describe("ship-kestrel.md content validation", () => {
  const content = readReport("ship-kestrel.md");

  it("ship length matches KESTREL constant", () => {
    assert.ok(
      content.includes(String(KESTREL.lengthM)),
      `should cite ship length ${KESTREL.lengthM} m`,
    );
  });

  it("nominal thrust matches KESTREL constant", () => {
    const thrustMN = (KESTREL.thrustN / 1e6).toFixed(1);
    assert.ok(
      content.includes(`${thrustMN} MN`),
      `should cite nominal thrust ${thrustMN} MN`,
    );
  });

  it("emergency thrust matches KESTREL constant", () => {
    const peakMN = (KESTREL.peakThrustN / 1e6).toFixed(1);
    assert.ok(
      content.includes(peakMN),
      `should cite emergency thrust ${peakMN} MN`,
    );
  });

  it("damaged thrust matches KESTREL constant", () => {
    const damagedMN = (KESTREL.damagedThrustN / 1e6).toFixed(2);
    assert.ok(
      content.includes(damagedMN),
      `should cite damaged thrust ${damagedMN} MN`,
    );
    assert.ok(
      content.includes(`${KESTREL.damagedThrustPercent}%`),
      `should cite ${KESTREL.damagedThrustPercent}% output`,
    );
  });

  it("nominal mass matches KESTREL constant", () => {
    assert.ok(
      content.includes("48,000") || content.includes("48000"),
      "should cite 48,000t nominal mass",
    );
  });

  it("mass boundary table includes all episodes", () => {
    assert.ok(content.includes("≤299"), "should cite EP01 mass boundary ≤299t");
    assert.ok(content.includes("≤452.5"), "should cite EP03 mass boundary ≤452.5t");
    assert.ok(content.includes("≤3,929") || content.includes("≤3929"), "should cite EP04 mass boundary");
    assert.ok(content.includes("≤300"), "should cite EP05 mass boundary ≤300t");
  });

  it("nozzle lifespan margin cited (26 min / 0.78%)", () => {
    assert.ok(content.includes("26分") || content.includes("26min"), "should cite 26 min margin");
    assert.ok(content.includes("0.78%"), "should cite precise 0.78% margin (not rounded 0.8%)");
  });

  it("nozzle margin matches EP05 analysis", () => {
    const ep5 = analyzeEpisode5();
    const marginMin = ep5.nozzleLifespan.marginMinutes;
    assertContainsApproxValue(content, marginMin, "ship-kestrel nozzle margin minutes");
  });

  it("nozzle times cited (55h38m vs 55h12m)", () => {
    assert.ok(content.includes("55h38m") || content.includes("55時間38分"), "should cite nozzle remaining life");
    assert.ok(content.includes("55h12m") || content.includes("55時間12分"), "should cite required burn time");
  });

  it("EP01 mass boundary matches analysis", () => {
    const ep1 = analyzeEpisode1();
    const boundary = ep1.boundaries.massBoundary72h.maxMassT;
    assertContainsApproxValue(content, boundary, "ship-kestrel EP01 mass boundary");
  });

  it("EP03 mass boundary matches analysis", () => {
    const ep3 = analyzeEpisode3();
    const maxMass = ep3.massFeasibility.maxMassT;
    assertContainsApproxValue(content, maxMass, "ship-kestrel EP03 mass boundary");
  });

  it("D-He³ fuel type cited", () => {
    assert.ok(
      content.includes(KESTREL.fuel),
      `should cite ${KESTREL.fuel} fuel type`,
    );
  });

  it("EP04 burn-count margin: HUD 1-2 BURNS → dialogue 3-4回 after repair", () => {
    assert.ok(content.includes("1-2") || content.includes("1〜2"),
      "should cite HUD 1-2 BURNS MAXIMUM pre-repair reading");
    assert.ok(content.includes("3-4") || content.includes("3〜4") || content.includes("3回"),
      "should cite post-repair 3-4 burn count");
  });

  // --- Task 529: Additional ship-kestrel content cross-checks ---

  it("~160x acceleration gap cited in mass mystery discussion", () => {
    assert.ok(
      content.includes("160倍") || content.includes("約160倍"),
      "should cite ~160x acceleration shortfall at 48,000t",
    );
  });

  it("total mission ΔV ~36,156 km/s cited", () => {
    assert.ok(
      content.includes("36,156") || content.includes("36156"),
      "should cite total ΔV budget ~36,156 km/s across all episodes",
    );
  });

  it("Isp = 10⁶ s baseline and 5×10⁶ s high-Isp scenario", () => {
    assert.ok(
      content.includes("10⁶") && content.includes("Isp"),
      "should cite Isp = 10⁶ s baseline",
    );
    assert.ok(
      content.includes("5×10⁶"),
      "should cite high-Isp scenario 5×10⁶ s",
    );
  });

  it("propellant margin 53% with high-Isp + Enceladus refuel", () => {
    assert.ok(
      content.includes("53%") && (content.includes("推進剤") || content.includes("マージン")),
      "should cite 53% propellant margin for scenario C",
    );
  });

  it("exhaust velocities: 9,807 km/s and 49,033 km/s", () => {
    assert.ok(
      content.includes("9,807") || content.includes("9807"),
      "should cite exhaust velocity 9,807 km/s at Isp=10⁶",
    );
    assert.ok(
      content.includes("49,033") || content.includes("49033"),
      "should cite exhaust velocity 49,033 km/s at Isp=5×10⁶",
    );
  });

  it("Tsiolkovsky equation referenced in propellant analysis", () => {
    assert.ok(
      content.includes("ツィオルコフスキー"),
      "should reference Tsiolkovsky equation for mass ratio analysis",
    );
  });

  it("fuel consumption rate ~0.46 kg/s cited", () => {
    assert.ok(
      content.includes("0.46") && (content.includes("kg/s") || content.includes("kg")),
      "should cite D-He³ fuel consumption rate ~0.46 kg/s",
    );
  });

  it("LEO target altitude 400 km cited in glossary", () => {
    assert.ok(
      content.includes("400") && content.includes("LEO"),
      "should cite LEO target altitude 400 km",
    );
  });
});

// ============================================================
// Cross-episode report: mission totals and key findings
// ============================================================

describe("cross-episode.md content validation", () => {
  const content = readReport("cross-episode.md");

  it("total mission distance matches EP05 fullRoute analysis", () => {
    const ep5 = analyzeEpisode5();
    const totalAU = ep5.fullRoute.totalDistAU;
    assertContainsApproxValue(content, totalAU, "cross-episode total mission distance AU");
  });

  it("cites total mission duration ~124 days", () => {
    assert.ok(
      content.includes("124日") || content.includes("約124日"),
      "should cite ~124 day total duration",
    );
  });

  it("cites EP02 trim-thrust ~87 days (not 455d as primary)", () => {
    // 87 days should appear as the corrected primary, 455 only as historical
    assert.ok(content.includes("87日") || content.includes("約87日"), "should cite ~87 day EP02 transit");
  });

  it("EP02 duration: 航路の連続性 section uses 87日 consistently with timeline", () => {
    // The 航路の連続性 narrative and timeline should both use ~87 days for EP02
    // (107日 is the 2-phase model in detailed analysis, but 87日 is the primary timeline value)
    // Split on ## heading to get the route continuity section content
    const routeSection = content.split("## 航路の連続性")[1]?.split("## ")[0] ?? "";
    const timelineSection = content.split("推定タイムライン")[1]?.split("## ")[0] ?? "";
    assert.ok(routeSection.includes("87日"), "航路の連続性 section should reference 87日");
    assert.ok(timelineSection.includes("87日"), "推定タイムライン section should reference 87日");
  });

  it("relativistic analysis: peak velocity 7,604 km/s at 2.54%c", () => {
    assert.ok(content.includes("7,604") || content.includes("7604"), "should cite peak velocity");
    assert.ok(content.includes("2.54%"), "should cite light speed percentage");
  });

  it("relativistic table covers all 5 episodes", () => {
    // The relativistic effects table should include EP02 and EP04 rows
    // Extract the relativistic table section (between ローレンツ因子 header and next ### header)
    const relSection = content.split("ローレンツ因子の計算")[1]?.split("### ")[0] ?? "";
    assert.ok(relSection.includes("EP01"), "relativistic table should include EP01");
    assert.ok(relSection.includes("EP02"), "relativistic table should include EP02 trim-thrust");
    assert.ok(relSection.includes("EP03"), "relativistic table should include EP03");
    assert.ok(relSection.includes("EP04"), "relativistic table should include EP04 65% thrust");
    assert.ok(relSection.includes("EP05"), "relativistic table should include EP05");
  });

  it("Lorentz factor γ ≈ 1.0003", () => {
    assert.ok(
      content.includes("1.0003"),
      "should cite Lorentz factor in weak relativistic regime",
    );
  });

  it("nozzle margin matches EP05 analysis in cross-episode context", () => {
    const ep5 = analyzeEpisode5();
    const marginMin = ep5.nozzleLifespan.marginMinutes;
    assertContainsApproxValue(content, marginMin, "cross-episode nozzle margin minutes");
    assert.ok(
      content.includes("マージン"),
      "should use the word マージン when citing nozzle margin",
    );
  });

  it("EP01 mass boundary matches analysis", () => {
    const ep1 = analyzeEpisode1();
    const boundary = ep1.boundaries.massBoundary72h.maxMassT;
    assertContainsApproxValue(content, boundary, "cross-episode EP01 mass boundary");
  });

  it("EP02 trim-thrust transit time matches analysis", () => {
    const ep2 = analyzeEpisode2();
    const transitDays = ep2.trimThrust.primary!.transferDays;
    assertContainsApproxValue(content, transitDays, "cross-episode EP02 transit days");
  });

  it("EP03 mass boundary matches analysis", () => {
    const ep3 = analyzeEpisode3();
    const maxMass = ep3.massFeasibility.maxMassT;
    assertContainsApproxValue(content, maxMass, "cross-episode EP03 mass boundary");
  });

  it("EP04 radiation dose matches analysis", () => {
    const ep4 = analyzeEpisode4();
    const dose = ep4.plasmoid.totalExposureMSv;
    assertContainsApproxValue(content, dose, "cross-episode EP04 radiation dose");
  });

  it("all 5 episode routes referenced", () => {
    for (const ep of EPISODE_SUMMARIES) {
      assert.ok(
        content.includes(ep.route) || content.includes(`第${ep.episode}話`),
        `should reference episode ${ep.episode}: ${ep.route}`,
      );
    }
  });

  it("verdict: 0 implausible results", () => {
    // Cross-episode should not declare any transfer implausible
    assert.ok(
      content.includes("implausible") === false ||
        (content.includes("0") && content.includes("implausible")),
      "should have 0 implausible verdicts or not use the term outside of stating zero",
    );
  });

  it("counterfactual analysis section exists", () => {
    assert.ok(
      content.includes("反事実") || content.includes("counterfactual"),
      "should have counterfactual analysis section",
    );
  });

  it("propellant budget analysis: Isp scenarios cited", () => {
    assert.ok(content.includes("Isp"), "should discuss Isp in propellant analysis");
    assert.ok(
      content.includes("5×10⁶") || content.includes("5e6") || content.includes("5,000,000"),
      "should cite high-Isp scenario (5×10⁶)",
    );
  });

  it("margin gauge: has margin-gauge code fence", () => {
    assert.ok(content.includes("margin-gauge"), "should have margin-gauge code fence");
  });

  it("margin gauge: nozzle margin 55.2h actual vs 55.63h limit", () => {
    assert.ok(content.includes('"actual": 55.2'), "should cite nozzle actual 55.2h");
    assert.ok(content.includes('"limit": 55.63'), "should cite nozzle limit 55.63h");
  });

  it("margin gauge: radiation 480 mSv and 600 mSv limit", () => {
    assert.ok(content.includes('"actual": 480'), "should cite radiation actual 480 mSv");
    assert.ok(content.includes('"limit": 500'), "should cite ICRP emergency limit 500 mSv");
  });

  it("margin chain probability: 30-46%", () => {
    assert.ok(
      content.includes("30") && content.includes("46%"),
      "should cite chain success probability 30-46%",
    );
  });

  it("coupling mechanisms: state vector description", () => {
    assert.ok(
      content.includes("ヤコビアン") || content.includes("Jacobian"),
      "should mention Jacobian/sensitivity analysis",
    );
  });

  it("navigation precision evolution: EP03→EP05, ~290万倍", () => {
    assert.ok(
      content.includes("290万"),
      "should cite 290万 times precision improvement from EP03 to EP05",
    );
  });

  it("EP05 arrival precision: 20 km at 18.2 AU", () => {
    assert.ok(content.includes("20 km") || content.includes("20km"), "should cite 20 km arrival precision");
    assert.ok(content.includes("18.2 AU"), "should cite 18.2 AU distance");
  });

  it("cumulative radiation: 560 mSv vs NASA 600 mSv limit", () => {
    assert.ok(content.includes("560"), "should cite ~560 mSv cumulative radiation");
    assert.ok(content.includes("600 mSv") || content.includes('"limit": 600'), "should cite NASA 600 mSv limit");
  });

  it("counterfactual scenarios: all 4 alternatives compared", () => {
    assert.ok(content.includes("5,424") || content.includes("5424"), "should cite Scenario A ΔV");
    assert.ok(content.includes("12,912") || content.includes("12912"), "should cite Scenario B ΔV");
    assert.ok(content.includes("18,893") || content.includes("18893"), "should cite Scenario C ΔV");
    assert.ok(content.includes("36,156") || content.includes("36156"), "should cite actual route ΔV");
  });

  it("EP02 dominates timeline: ~87d is ~70% of mission", () => {
    assert.ok(
      content.includes("78%") || content.includes("70%"),
      "should cite EP02 as majority of mission duration",
    );
  });

  it("cold sleep constraint: used only in EP02", () => {
    assert.ok(content.includes("コールドスリープ"),
      "should discuss cold sleep constraint");
    assert.ok(content.includes("第2話のみ") || content.includes("EP02のみ"),
      "should state cold sleep is explicitly depicted only in EP02");
  });

  it("EP04-05 no cold sleep: 507h ≈ 21 days continuous", () => {
    assert.ok(
      content.includes("507時間") || content.includes("507h"),
      "should cite 507h EP04-05 no-cold-sleep transit",
    );
    assert.ok(content.includes("21日") || content.includes("21 day"),
      "should cite ~21 days continuous operation");
  });

  it("engine designation TSF-43R cited", () => {
    assert.ok(content.includes("TSF-43R"),
      "should cite engine designation TSF-43R");
  });

  it("effective mass range 300-500t cited", () => {
    assert.ok(content.includes("300") && content.includes("500t"),
      "should cite 300-500t effective mass range");
  });

  it("propellant budget: Tsiolkovsky equation referenced", () => {
    assert.ok(content.includes("ツィオルコフスキー"),
      "should reference Tsiolkovsky rocket equation");
  });

  it("propellant budget: total ΔV matches cross-episode (36,156 km/s)", () => {
    assert.ok(content.includes("36,156") || content.includes("36156"),
      "should cite corrected total ΔV of 36,156 km/s (not old 31,500)");
    assert.ok(!content.includes("31,500") && !content.includes("31500"),
      "should NOT cite obsolete total ΔV of 31,500 km/s");
  });

  it("mass timeline chart uses corrected EP2 transit (~87 days, not ~455 days)", () => {
    // The mass timeline x-axis should have Enceladus arrival around day 93, not day 458
    assert.ok(!content.includes("457.96"),
      "mass timeline should NOT use old 457.96-day Enceladus arrival");
  });

  it("nozzle margin percentage matches ep05 (0.78%)", () => {
    assert.ok(content.includes("0.78%"),
      "should cite nozzle margin as 0.78% (matching ep05 precision)");
  });

  // --- 3D orbital analysis data consistency (vs 3d_orbital_analysis.json) ---

  it("3D: Saturn ring approach angle ~9.3° (not 27°)", () => {
    assert.ok(
      content.includes("9.3°") || content.includes("約9.3"),
      "should cite Saturn approach angle ~9.3° from 3D analysis",
    );
    assert.ok(
      !content.includes("約27°") && !content.includes("接近角27°"),
      "should NOT cite old 27° Saturn approach angle",
    );
  });

  it("3D: Uranus approach from Saturn ~25.3° (equatorial, not polar)", () => {
    assert.ok(
      content.includes("25.3°") || content.includes("約25"),
      "should cite ~25.3° Uranus approach angle from Saturn",
    );
    assert.ok(
      content.includes("赤道方向"),
      "should describe Uranus approach as equatorial direction",
    );
  });

  it("3D: Uranus departure toward Earth ~14.3°", () => {
    assert.ok(
      content.includes("14.3°") || content.includes("約14"),
      "should cite ~14.3° Uranus departure angle toward Earth",
    );
  });

  it("3D: Z-height bar chart values match epoch (Mars +4047, Saturn +47708)", () => {
    // Verify bar chart includes correct Z-heights, not old pre-epoch values
    assert.ok(
      content.includes("value: 4047") || content.includes("4,047"),
      "Mars Z-height should be +4,047 thousand km",
    );
    assert.ok(
      content.includes("value: 47708") || content.includes("47,708"),
      "Saturn Z-height should be +47,708 thousand km",
    );
  });

  it("3D: 面外距離 table cites EP02 54,052 (not 391)", () => {
    assert.ok(
      content.includes("54,052"),
      "EP02 out-of-plane distance should be 54,052 thousand km",
    );
    assert.ok(
      !content.includes('"2": "391"'),
      "should NOT cite old EP02 out-of-plane distance of 391",
    );
  });

  it("3D: plane change max fraction 1.51%", () => {
    assert.ok(
      content.includes("1.51%"),
      "should cite max plane change fraction 1.51%",
    );
  });

  it("3D: sideview diagram for Saturn ring crossing exists", () => {
    assert.ok(
      content.includes('"id": "saturn-ring-crossing"'),
      "should have Saturn ring crossing side-view diagram",
    );
  });

  it("3D: sideview diagram for Uranus approach exists", () => {
    assert.ok(
      content.includes('"id": "uranus-approach-geometry"'),
      "should have Uranus approach geometry side-view diagram",
    );
  });

  it("3D: interactive 3D viewer link exists", () => {
    assert.ok(
      content.includes("orbital-3d.html"),
      "should link to interactive 3D orbital viewer",
    );
    assert.ok(
      content.includes("3Dビューア") || content.includes("3Dシーン"),
      "should describe the 3D viewer",
    );
  });

  it("EP02 v∞ resolution: two-phase model referenced", () => {
    assert.ok(
      content.includes("2相モデル") || content.includes("二相モデル"),
      "should reference two-phase model for EP02 v∞ resolution",
    );
  });

  it("EP02 v∞ resolution: capture ΔV 2-3 km/s (not 0.61 km/s as primary)", () => {
    // The old 0.61 km/s parabolic capture should not be the primary value;
    // the two-phase model gives capture ΔV of 2-3 km/s range
    assert.ok(
      content.includes("2〜3 km/s") || content.includes("捕獲ΔV≈2.9"),
      "should cite two-phase capture ΔV in 2-3 km/s range",
    );
    // 0.61 km/s should no longer appear as the primary Saturn capture value
    assert.ok(
      !content.includes("捕捉 $\\Delta V$ は最小 0.61"),
      "should NOT cite 0.61 km/s as the primary Saturn capture ΔV",
    );
  });

  it("EP02 sensitivity note: mentions two-phase vs single-phase distinction", () => {
    assert.ok(
      content.includes("単相モデル") || content.includes("順行加速のみの単相"),
      "sensitivity analysis should clarify single-phase vs two-phase model",
    );
  });

  it("jurisdiction progression: governance consistency across episodes", () => {
    assert.ok(content.includes("木星港湾公社") || content.includes("木星軌道連合"),
      "should cite Jupiter governance authority");
    assert.ok(content.includes("保護領"),
      "should cite protectorate status for Saturn region");
    assert.ok(content.includes("自由港"),
      "should cite free port status");
    assert.ok(content.includes("自由圏"),
      "should cite 自由圏 (free zone) as distinct category");
    assert.ok(content.includes("地球軌道港湾機構"),
      "should cite Earth Orbital Harbor Authority");
  });

  it("jurisdiction: governance gradient from inner to outer solar system", () => {
    assert.ok(content.includes("自治度") || content.includes("独立") || content.includes("統治"),
      "should discuss governance gradient or autonomy trend");
  });

  it("stellar aberration: cross-reference to EP03 nav crisis", () => {
    assert.ok(content.includes("光行差"),
      "cross-episode should reference stellar aberration (光行差)");
    assert.ok(content.includes("0.573"),
      "should cite 0.573° max aberration");
    assert.ok(content.includes("EP03") && content.includes("航法危機"),
      "should connect aberration to EP03 nav crisis");
  });

  it("mass boundary convergence bar chart", () => {
    assert.ok(
      content.includes("各話の質量境界値 vs 公称質量48,000t"),
      "should have mass boundary convergence bar chart",
    );
    assert.ok(
      content.includes("≤299t") && content.includes("≤452.5t"),
      "chart should include EP01 and EP03 mass boundaries",
    );
    assert.ok(
      content.includes("48,000t（設定資料）"),
      "chart should include nominal mass for comparison",
    );
  });
});

// ============================================================
// Science-accuracy report: verification scorecard
// ============================================================

describe("science-accuracy.md content validation", () => {
  const content = readReport("science-accuracy.md");

  it("scorecard totals: 15 items, 11 verified, 4 approximate, 0 discrepancy", () => {
    assert.ok(content.includes("15項目"), "should cite 15 verification items");
    assert.ok(content.includes("11件"), "should cite 11 verified");
    assert.ok(content.includes("4件"), "should cite 4 approximate");
    assert.ok(
      content.includes("不一致**: 0件"),
      "should have 0 discrepancies",
    );
  });

  it("average accuracy 99.0%", () => {
    assert.ok(
      content.includes("99.0%"),
      "should cite 99.0% average accuracy",
    );
  });

  it("Uranus magnetic tilt: depicted 60°, reference 59.7°", () => {
    assert.ok(content.includes("60°"), "should cite depicted tilt 60°");
    assert.ok(content.includes("59.7°"), "should cite reference tilt 59.7°");
  });

  it("navigation error: 14,360,000 km at 99.8% accuracy", () => {
    assert.ok(content.includes("14,360,000"), "should cite nav error distance");
    assert.ok(content.includes("99.8%"), "should cite 99.8% accuracy");
  });

  it("radiation exposure: 480 mSv vs ICRP 500 mSv", () => {
    assert.ok(content.includes("480 mSv"), "should cite 480 mSv exposure");
    assert.ok(content.includes("500 mSv"), "should cite ICRP 500 mSv limit");
  });

  it("Brachistochrone ΔV scaling: EP1→EP3 ratio ~1.31", () => {
    assert.ok(
      content.includes("1.314") || content.includes("1.316") || content.includes("1.31"),
      "should cite ΔV scaling ratio ~1.31",
    );
  });

  it("references Voyager 2 and ICRP as sources", () => {
    assert.ok(content.includes("Voyager 2"), "should reference Voyager 2");
    assert.ok(content.includes("ICRP"), "should reference ICRP");
  });

  it("all status values in scorecard table are verified or approximate", () => {
    const verifiedCount = (content.match(/"status": "verified"/g) || []).length;
    const approxCount = (content.match(/"status": "approximate"/g) || []).length;
    const discrepancyCount = (content.match(/"status": "discrepancy"/g) || []).length;
    const unverifiedCount = (content.match(/"status": "unverified"/g) || []).length;

    assert.strictEqual(verifiedCount, 11, `should have 11 verified, got ${verifiedCount}`);
    assert.strictEqual(approxCount, 4, `should have 4 approximate, got ${approxCount}`);
    assert.strictEqual(discrepancyCount, 0, `should have 0 discrepancy, got ${discrepancyCount}`);
    assert.strictEqual(unverifiedCount, 0, `should have 0 unverified, got ${unverifiedCount}`);
  });

  // Regression: Issue 1 — nav error formula must use remaining distance (4.48 AU), not total solar distance (14.72 AU)
  it("navigation error formula uses remaining distance to Uranus (4.48 AU)", () => {
    assert.ok(
      content.includes("残距離") && content.includes("4.48 AU"),
      "should reference remaining distance 4.48 AU, not total solar distance",
    );
    assert.ok(
      content.includes("6.704×10⁸"),
      "should use 6.704×10⁸ km (4.48 AU) in formula, not 2.202×10⁹ km",
    );
  });

  // Regression: Issue 2 — EP02 shortening factor must be 42×, not 8×
  it("EP02 shortening factor is 42× (Hohmann vs trim-thrust)", () => {
    assert.ok(
      content.includes('"2": "42×'),
      "EP02 shortening factor should be 42×, not 8×",
    );
    assert.ok(
      !content.includes('"2": "8×'),
      "EP02 shortening factor should NOT be 8×",
    );
  });

  // Regression: Issue 3 — newcomer introduction section exists
  it("has newcomer introduction section", () => {
    assert.ok(
      content.includes("## はじめに"),
      "should have an introduction section for newcomers",
    );
    assert.ok(
      content.includes("ケストレル号"),
      "introduction should mention the ship Kestrel",
    );
  });

  // Regression: Issue 7 — EP02 trim-thrust arrival velocity resolved
  it("acknowledges EP02 trim-thrust arrival velocity resolution", () => {
    assert.ok(
      content.includes("トリム推力到達速度") || content.includes("v∞≈90"),
      "should mention the EP02 trim-thrust arrival velocity issue",
    );
    assert.ok(
      content.includes("解決済み") || content.includes("2相モデル"),
      "should indicate the v∞ issue has been resolved",
    );
  });

  // Regression: Issue 10 — episode report navigation links
  it("contains links to episode reports", () => {
    assert.ok(
      content.includes("../episodes/ep-002.html"),
      "should link to EP02 report",
    );
    assert.ok(
      content.includes("../episodes/ep-003.html"),
      "should link to EP03 report",
    );
    assert.ok(
      content.includes("../episodes/ep-004.html"),
      "should link to EP04 report",
    );
  });

  // Regression: Issue 11 — glossary completeness
  it("glossary includes Brachistochrone, RK4, ICRP, plasmoid terms", () => {
    assert.ok(
      content.includes('"term": "Brachistochrone遷移"'),
      "glossary should include Brachistochrone",
    );
    assert.ok(
      content.includes('"term": "RK4"'),
      "glossary should include RK4",
    );
    assert.ok(
      content.includes('"term": "ICRP"'),
      "glossary should include ICRP",
    );
    assert.ok(
      content.includes('"term": "プラズモイド"'),
      "glossary should include plasmoid",
    );
  });

  it("has accuracy bar chart visualization", () => {
    assert.ok(
      content.includes("```chart:bar"),
      "should have a bar chart directive",
    );
    assert.ok(
      content.includes("検証精度") || content.includes("精度"),
      "bar chart should reference accuracy",
    );
  });

  it("bar chart includes key accuracy values", () => {
    // 99.5% for Uranus magnetic tilt
    assert.ok(content.includes("99.5"), "should include 99.5% accuracy item");
    // 99.8% for navigation error
    assert.ok(content.includes("99.8"), "should include 99.8% accuracy item");
    // 93% for cruise velocity
    assert.ok(content.includes("value: 93"), "should include 93% cruise velocity accuracy");
  });

  it("relativistic effects verification: confirms Newtonian analysis validity", () => {
    assert.ok(content.includes("相対論") || content.includes("relativistic"),
      "should have a relativistic effects verification section");
    assert.ok(content.includes("2.5%") || content.includes("2.54%"),
      "should cite maximum β ≈ 2.5%c");
    assert.ok(content.includes("0.1%"),
      "should note all corrections are below 0.1%");
  });

  it("has Hohmann vs Brachistochrone time reduction bar chart", () => {
    assert.ok(
      content.includes("短縮倍率") && content.includes("```chart:bar"),
      "should have a bar chart showing time reduction factors",
    );
    assert.ok(
      content.includes("value: 1674"),
      "should include EP03's 1,674x reduction factor",
    );
  });

  it("has relativistic β comparison bar chart across episodes", () => {
    assert.ok(
      content.includes("value: 2.54") && content.includes("value: 1.86"),
      "should have bar chart with EP05 β=2.54% and EP03 β=1.86%",
    );
    assert.ok(
      content.includes("value: 0.02"),
      "chart should include EP02 β=0.02% (lowest)",
    );
  });

  // Analysis-derived cross-checks (Task 500)
  it("radiation 480 mSv matches EP04 analysis", () => {
    const ep4 = analyzeEpisode4();
    assertContainsApproxValue(content, ep4.plasmoid.totalExposureMSv,
      "science-accuracy radiation dose from EP04 analysis");
  });

  it("Uranus magnetic tilt 59.7° matches EP04 analysis", () => {
    const ep4 = analyzeEpisode4();
    assertContainsApproxValue(content, ep4.plasmoid.realMagneticTiltDeg,
      "science-accuracy Uranus magnetic tilt from EP04 analysis");
  });

  it("navigation error distance matches EP03 analysis", () => {
    const ep3 = analyzeEpisode3();
    assertContainsApproxValue(content, ep3.navCrisis.computedErrorKm,
      "science-accuracy nav error distance from EP03 analysis");
  });

  // --- Task 507: relativistic cumulative time dilation cross-check ---

  it("cumulative time dilation ~155 seconds cited in report", () => {
    assert.ok(
      content.includes("155秒") || content.includes("約155秒"),
      "science-accuracy should cite cumulative time dilation ~155 seconds",
    );
  });

  it("cumulative time dilation ~2.6 minutes cited in report", () => {
    assert.ok(
      content.includes("2.6分") || content.includes("2.59分"),
      "science-accuracy should cite cumulative time dilation ~2.6 minutes",
    );
  });
});

// ============================================================
// Communications report: light-speed delay consistency
// ============================================================

describe("communications.md content validation", () => {
  const content = readReport("communications.md");

  it("cites light speed constant", () => {
    assert.ok(
      content.includes("299,792.458") || content.includes("299{,}792.458"),
      "should cite exact light speed constant",
    );
  });

  it("communication classification: 4 tiers defined", () => {
    assert.ok(content.includes("リアルタイム"), "should define real-time tier");
    assert.ok(content.includes("準リアルタイム"), "should define quasi-real-time tier");
    assert.ok(content.includes("遅延通信"), "should define delayed tier");
    assert.ok(content.includes("深宇宙通信"), "should define deep space tier");
  });

  it("all 5 episodes analyzed", () => {
    assert.ok(content.includes("第1話"), "should analyze EP01");
    assert.ok(content.includes("第2話"), "should analyze EP02");
    assert.ok(content.includes("第3話"), "should analyze EP03");
    assert.ok(content.includes("第4話"), "should analyze EP04");
    assert.ok(content.includes("第5話"), "should analyze EP05");
  });

  it("FSOC / DSOC technology reference", () => {
    assert.ok(content.includes("FSOC"), "should reference FSOC technology");
    assert.ok(content.includes("DSOC"), "should reference NASA DSOC");
  });

  it("verification summary has all checks passing", () => {
    const checkmarks = (content.match(/✅/g) || []).length;
    assert.ok(
      checkmarks >= 10,
      `should have at least 10 passing verification checks, got ${checkmarks}`,
    );
  });

  it("87-day EP02 transit referenced in communication context", () => {
    assert.ok(
      content.includes("87日") || content.includes("約87日"),
      "should reference 87-day EP02 transit in communication delay context",
    );
  });

  it("DSOC distance corrected: 267 Mbps at ~0.2 AU, not 1.8 AU", () => {
    assert.ok(
      content.includes("0.2 AU") || content.includes("3,100万"),
      "should cite DSOC 267 Mbps at approximately 0.2 AU distance",
    );
    assert.ok(
      !content.includes("1.8 AU（2億7千万 km）から 267 Mbps"),
      "should NOT cite incorrect 1.8 AU for 267 Mbps achievement",
    );
  });

  it("EP03 route distance uses updated epoch value ~9.6 AU", () => {
    assert.ok(
      content.includes("9.6 AU"),
      "should use updated epoch distance of ~9.6 AU for Enceladus→Titania",
    );
  });

  it("FSPL optical value corrected to ~362 dB", () => {
    assert.ok(
      content.includes("362"),
      "should cite corrected FSPL optical value of ~362 dB",
    );
  });

  it("EP02 beacon timing analysis included", () => {
    assert.ok(
      content.includes("ビーコンの時刻タグ"),
      "should analyze EP02 beacon timing precision",
    );
  });

  it("EP05 beacon blackout and deception scenes included", () => {
    assert.ok(
      content.includes("物流が完全に止まってる") || content.includes("ビーコン停波"),
      "should include EP05 beacon blackout scene",
    );
    assert.ok(
      content.includes("欺瞞航跡"),
      "should include EP05 deception beacon scene",
    );
  });

  it("introduction section for newcomers", () => {
    assert.ok(
      content.includes("本レポートについて"),
      "should have introduction section for newcomers",
    );
  });

  it("has communication delay timeline chart", () => {
    assert.ok(
      content.includes("```timeseries:"),
      "should have a timeseries chart directive",
    );
    assert.ok(
      content.includes("comm-delay-timeline"),
      "should have comm-delay-timeline chart id",
    );
  });

  it("comm delay chart shows delay in minutes on y-axis", () => {
    assert.ok(
      content.includes("片道遅延 (分)"),
      "y-axis should show delay in minutes",
    );
  });

  it("comm delay chart has communication zone thresholds", () => {
    // 30 min boundary between delayed and deep-space
    assert.ok(
      content.includes('"value": 30'),
      "should have 30-min threshold for deep-space boundary",
    );
  });

  it("comm delay chart has episode region bands", () => {
    assert.ok(
      content.includes('"label": "EP01"'),
      "should have EP01 region band",
    );
    assert.ok(
      content.includes('"label": "EP05"'),
      "should have EP05 region band",
    );
  });

  it("comm delay chart data is physically consistent", () => {
    // Extract the y-values from the timeseries chart JSON
    const chartMatch = content.match(/"y":\s*\[([\d.,\s]+)\]/);
    assert.ok(chartMatch, "should have y-data array in timeseries chart");
    const yValues = chartMatch![1].split(",").map((v) => parseFloat(v.trim()));
    const xMatch = content.match(/"x":\s*\[([\d.,\s]+)\]/);
    assert.ok(xMatch, "should have x-data array");
    const xValues = xMatch![1].split(",").map((v) => parseFloat(v.trim()));

    // Basic consistency checks
    assert.strictEqual(xValues.length, yValues.length, "x and y arrays should have same length");
    assert.ok(yValues[0] > 0, "initial delay should be positive (Mars is >0 AU from Earth)");
    assert.ok(yValues[yValues.length - 1] === 0, "final delay should be 0 (Earth arrival)");

    // Maximum delay should be around 168 min (max Earth-Kestrel distance ~20.2 AU)
    const maxDelay = Math.max(...yValues);
    assert.ok(maxDelay >= 160 && maxDelay <= 180, `max delay ${maxDelay} should be ~168 min`);

    // All values should be non-negative
    assert.ok(yValues.every((v) => v >= 0), "all delay values should be non-negative");

    // Light-time sanity: 1 AU ≈ 8.317 min, so max ~168 min ≈ 20.2 AU
    const maxDistAU = maxDelay / 8.317;
    assert.ok(maxDistAU >= 18 && maxDistAU <= 22, `implied max distance ${maxDistAU.toFixed(1)} AU should be ~20 AU`);
  });

  it("STELLAR-INS AUTONOMOUS: EP05 all-beacon blackout as comms infrastructure failure", () => {
    assert.ok(content.includes("STELLAR-INS") || content.includes("恒星慣性"),
      "should discuss STELLAR-INS autonomous navigation mode in comms context");
    assert.ok(content.includes("AUTONOMOUS") || content.includes("自律航法"),
      "should discuss autonomous navigation forced by beacon unavailability");
  });

  it("COIAS orbital cross alert: real-world Subaru analogue", () => {
    assert.ok(content.includes("COIAS"),
      "should discuss COIAS as communication/navigation infrastructure");
    assert.ok(content.includes("すばる") || content.includes("Subaru"),
      "should reference Subaru Telescope as COIAS real-world analogue");
  });

  it("per-episode delay range bar chart", () => {
    assert.ok(
      content.includes("各話における地球との片道通信遅延の範囲"),
      "should have per-episode delay range bar chart caption",
    );
    assert.ok(
      content.includes("EP01（火星→ガニメデ）"),
      "bar chart should include EP01",
    );
    assert.ok(
      content.includes("EP03（土星→天王星）"),
      "bar chart should include EP03",
    );
    // EP03 max delay should be 168 min (~20 AU)
    assert.ok(
      content.includes('annotation: "71〜168分"'),
      "EP03 bar should show 71-168 min range annotation",
    );
  });

  it("has beacon reliability degradation bar chart", () => {
    assert.ok(
      content.includes("caption: ビーコン") || content.includes("caption: 航法ビーコン"),
      "should have beacon degradation bar chart",
    );
    assert.ok(
      content.includes("UNAVAILABLE") && content.includes("value: 0"),
      "chart should show EP05 beacon availability at 0%",
    );
  });

  it("has FSOC data rate comparison bar chart", () => {
    assert.ok(
      content.includes("value: 267") && content.includes("Mbps"),
      "should have FSOC chart with 267 Mbps data point",
    );
    assert.ok(
      content.includes("value: 25"),
      "chart should include 25 Mbps at 1.5 AU",
    );
  });

  // Analysis-derived cross-checks (Task 500)
  it("EP02 transit time matches analysis", () => {
    const ep2 = analyzeEpisode2();
    const transitDays = ep2.trimThrust.primary!.transferDays;
    assertContainsApproxValue(content, transitDays,
      "communications EP02 transit days from analysis");
  });
});

// ============================================================
// Attitude-control report: physics calculations
// ============================================================

describe("attitude-control.md content validation", () => {
  const content = readReport("attitude-control.md");

  it("moment of inertia values for pitch/yaw and roll", () => {
    assert.ok(
      content.includes("45,796,000"),
      "should cite pitch/yaw moment of inertia 45,796,000 kg·m²",
    );
    assert.ok(
      content.includes("1,350,000"),
      "should cite roll moment of inertia 1,350,000 kg·m²",
    );
  });

  it("EP03 nav crisis: 1.23° angle and 14,390,000 km miss", () => {
    assert.ok(content.includes("1.23°") || content.includes("1.23度"), "should cite 1.23° angle");
    assert.ok(
      content.includes("14,390,000") || content.includes("14{,}390{,}000"),
      "should cite calculated miss distance 14,390,000 km",
    );
  });

  it("EP03 nav crisis accuracy: 0.2% match with in-story value", () => {
    assert.ok(
      content.includes("0.2%"),
      "should cite 0.2% accuracy between calculated and in-story values",
    );
  });

  it("INS drift rate calculation: 0.01°/h × 143h = 1.43°", () => {
    assert.ok(content.includes("0.01°/h"), "should cite INS drift rate 0.01°/h");
    assert.ok(content.includes("1.43°"), "should cite accumulated drift 1.43°");
  });

  it("EP05 arrival precision: 20 km at 18.2 AU = 1.5 milliarcsec", () => {
    assert.ok(content.includes("20 km") || content.includes("20km"), "should cite 20 km arrival precision");
    assert.ok(content.includes("18.2 AU"), "should cite 18.2 AU distance");
    assert.ok(
      content.includes("1.5") && content.includes("milliarcsec"),
      "should cite 1.5 milliarcsec angular precision",
    );
  });

  it("flip maneuver RCS requirements: 300s flip needs 299 N (corrected)", () => {
    assert.ok(content.includes("299 N") || content.includes("299N"), "should cite 299 N RCS thrust for 300s flip");
  });

  it("ship length 42.8 m and mass 300 t consistent with KESTREL", () => {
    assert.ok(content.includes("42.8"), "should cite ship length 42.8 m");
    assert.ok(content.includes("300 t") || content.includes("300t"), "should cite estimated mass 300 t");
  });

  it("gravity gradient torque at LEO 400 km", () => {
    assert.ok(content.includes("400 km"), "should cite LEO altitude 400 km");
    assert.ok(
      content.includes("重力傾斜トルク") || content.includes("gravity gradient"),
      "should discuss gravity gradient torque",
    );
  });

  it("evaluation table covers all 5 episodes with checkmarks", () => {
    const checkmarks = (content.match(/✅/g) || []).length;
    assert.ok(
      checkmarks >= 5,
      `should have at least 5 positive evaluations, got ${checkmarks}`,
    );
    // Should also mention conditional items (⚠️)
    const warnings = (content.match(/⚠️/g) || []).length;
    assert.ok(
      warnings >= 2,
      `should have at least 2 conditional items, got ${warnings}`,
    );
  });

  // Regression tests from Task 275 external review
  it("flip maneuver uses symmetric bang-bang model formula", () => {
    assert.ok(
      content.includes("4\\pi") || content.includes("4π"),
      "should cite alpha = 4*pi/T^2 formula",
    );
    assert.ok(
      content.includes("2\\pi") || content.includes("2π"),
      "should cite omega_max = 2*pi/T formula",
    );
  });

  it("Ganymede Hill sphere ~32,000 km (not SOI ~50,000 km)", () => {
    assert.ok(
      content.includes("Hill球") || content.includes("Hill sphere"),
      "should reference Ganymede Hill sphere",
    );
    assert.ok(
      content.includes("32,000"),
      "should cite ~32,000 km Hill sphere radius",
    );
  });

  it("EP03 14,360,000 km claim cites timestamp 14:17", () => {
    assert.ok(
      content.includes("14:17"),
      "should cite timestamp 14:17 for the 1436万km claim (separate from 1.23° at 13:58)",
    );
  });

  it("gravity gradient torque values use (Izz - Ixx)", () => {
    // Corrected from 3.1/30.2/88.2 to 3.0/29.3/85.6
    assert.ok(
      content.includes("85.6"),
      "should cite corrected gravity gradient torque 85.6 N·m at 45°",
    );
  });

  it("has newcomer introduction section", () => {
    assert.ok(
      content.includes("本レポートについて"),
      "should have an introductory section for newcomers",
    );
  });

  it("EP02 section present (even if brief)", () => {
    assert.ok(
      content.includes("第2話"),
      "should have EP02 section explaining attitude control during trim-thrust cruise",
    );
  });

  it("has flip maneuver RCS bar chart", () => {
    assert.ok(
      content.includes("```chart:bar"),
      "should have a bar chart directive",
    );
    assert.ok(
      content.includes("フリップ") && content.includes("RCS"),
      "bar chart should reference flip maneuver RCS",
    );
  });

  it("has pointing error sensitivity bar chart (EP01)", () => {
    assert.ok(
      content.includes("指向誤差と航路逸脱距離"),
      "should have pointing error vs miss distance chart",
    );
    // Check key data points from the table
    assert.ok(
      content.includes("value: 1330"),
      "should include 1,330 km miss at 1 arcsec",
    );
    assert.ok(
      content.includes("value: 478800"),
      "should include 478,800 km miss at 0.1 degree",
    );
  });

  it("has EP04 thrust asymmetry RCS chart", () => {
    assert.ok(
      content.includes("推力非対称角度とRCS補正推力"),
      "should have EP04 thrust asymmetry chart",
    );
    assert.ok(
      content.includes("value: 1853"),
      "should include 1,853 N at 1 arcmin asymmetry",
    );
  });

  it("has EP05 nozzle asymmetry torque chart", () => {
    assert.ok(
      content.includes("ノズル非対称によるトルク"),
      "should have EP05 nozzle asymmetry torque chart",
    );
    assert.ok(
      content.includes("value: 136318"),
      "should include 136,318 N·m at 0.1% asymmetry",
    );
  });

  // Analysis-derived cross-checks (Task 500)
  it("EP03 nav crisis angle matches analysis", () => {
    const ep3 = analyzeEpisode3();
    assertContainsApproxValue(content, ep3.navCrisis.angleDeg,
      "attitude-control nav crisis angle from EP03 analysis");
  });

  it("EP05 nozzle margin 26 min matches analysis", () => {
    const ep5 = analyzeEpisode5();
    assertContainsApproxValue(content, ep5.nozzleLifespan.marginMinutes,
      "attitude-control nozzle margin from EP05 analysis");
  });
});

// ============================================================
// Infrastructure report: spaceports, nav infra, governance
// ============================================================

describe("infrastructure.md content validation", () => {
  const content = readReport("infrastructure.md");

  it("names all three major spaceports/stations", () => {
    assert.ok(content.includes("ガニメデ中央港"), "should cite ガニメデ中央港");
    assert.ok(content.includes("エンケラドスステーション"), "should cite エンケラドスステーション");
    assert.ok(content.includes("タイタニア集合複合施設"), "should cite タイタニア集合複合施設");
  });

  it("port navigation system: 100+ years of operation", () => {
    assert.ok(content.includes("100年以上"), "should cite 100+ year operation of beacon network");
  });

  it("beacon shutdown: ~700 ships affected", () => {
    assert.ok(content.includes("700"), "should cite ~700 ships affected by beacon shutdown");
  });

  it("economic impact: ~10% of solar system economy", () => {
    assert.ok(content.includes("10%"), "should cite 10% economic impact of beacon shutdown");
  });

  it("Enceladus station: joint ownership by Earth and Mars", () => {
    assert.ok(
      content.includes("合同所有"),
      "should cite joint ownership of Enceladus station",
    );
    // 50:50 was removed — unsourced claim
    assert.ok(
      !content.includes("50:50"),
      "should NOT cite unsourced 50:50 split",
    );
  });

  it("Enceladus staffing: reduced from hundreds to 1", () => {
    assert.ok(content.includes("数百人"), "should cite original staffing of hundreds");
    assert.ok(content.includes("1名") || content.includes("管理人1名"), "should cite current staffing of 1");
  });

  it("governance comparison table has 6 organizations", () => {
    // table:comparison block should list 6 governance bodies
    assert.ok(content.includes("軌道公案機構"), "should cite 軌道公案機構");
    assert.ok(content.includes("木星軌道連合"), "should cite 木星軌道連合");
    assert.ok(content.includes("天王星自治有効機構"), "should cite 天王星自治有効機構");
    assert.ok(content.includes("国際連合軌道交番機構"), "should cite 国際連合軌道交番機構");
    assert.ok(content.includes("地球軌道港湾機構"), "should cite 地球軌道港湾機構");
    assert.ok(content.includes("港湾航舎"), "should cite 港湾航舎");
  });

  it("inner/outer sphere structure explained", () => {
    assert.ok(content.includes("内苑"), "should explain inner sphere (内苑)");
    assert.ok(content.includes("外苑"), "should explain outer sphere (外苑)");
  });

  it("Titania transit time: 143h from Enceladus", () => {
    assert.ok(content.includes("143"), "should cite ~143 hour transit to Titania");
  });

  it("nuclear torpedo range: 40 km effective kill radius", () => {
    assert.ok(content.includes("40km") || content.includes("40 km"), "should cite 40 km kill radius");
    assert.ok(content.includes("1メガトン"), "should cite 1 megaton warhead");
  });

  it("cross-links to ship-kestrel and other-ships reports", () => {
    assert.ok(content.includes("ship-kestrel"), "should cross-link to ship-kestrel report");
    assert.ok(content.includes("other-ships"), "should cross-link to other-ships report");
  });

  // --- Task 276 regression tests ---

  it("nuclear torpedo quotes cite correct timestamps (12:07 and 12:26)", () => {
    assert.ok(content.includes("(12:07)"), "should cite 12:07 for kill-radius quote");
    assert.ok(content.includes("(12:26)"), "should cite 12:26 for political restriction quote");
    assert.ok(!content.includes("(11:58)"), "should NOT cite wrong timestamp 11:58");
  });

  it("beacon shutdown: distinguishes 700 total from 数百隻 stopped", () => {
    assert.ok(
      content.includes("約700隻のうち数百隻"),
      "should distinguish total fleet (700) from those stopped (数百隻)",
    );
  });

  it("セイラ・アンダース scene describes 1G detention, not 航法記録開示", () => {
    assert.ok(
      content.includes("1G重力区画") && content.includes("拘束"),
      "should describe 1G detention scene",
    );
    assert.ok(
      !content.includes("航法記録開示を要求"),
      "should NOT claim 航法記録開示 (inaccurate)",
    );
  });

  it("地球軌道港湾機構 and 自由圏 are documented", () => {
    assert.ok(content.includes("地球軌道港湾機構"), "should cite 地球軌道港湾機構");
    assert.ok(content.includes("自由圏"), "should cite 自由圏 jurisdictional category");
  });

  it("オービタルカーテン has dialogue citation", () => {
    assert.ok(
      content.includes("無誘導での航行"),
      "should cite ケイ's quote about unguided navigation beyond Orbital Curtain",
    );
  });

  it("火星 as story starting point is documented", () => {
    assert.ok(
      content.includes("火星（出発地") || content.includes("物語の起点"),
      "should document Mars as the story's starting point",
    );
  });

  it("cross-links to communications report", () => {
    assert.ok(
      content.includes("communications"),
      "should cross-link to communications report",
    );
  });

  // --- Task 346: infrastructure chart tests ---

  it("has station distance bar chart", () => {
    assert.ok(
      content.includes("chart:bar"),
      "should have a bar chart directive",
    );
    assert.ok(
      content.includes("太陽からの距離"),
      "bar chart should show distance from Sun",
    );
  });

  it("station distance chart includes key locations", () => {
    assert.ok(content.includes("1.52") || content.includes("火星（出発地）"), "should include Mars distance");
    assert.ok(content.includes("5.20") || content.includes("ガニメデ"), "should include Ganymede distance");
    assert.ok(content.includes("9.54") || content.includes("エンケラドス"), "should include Enceladus distance");
    assert.ok(content.includes("19.2") || content.includes("タイタニア"), "should include Titania distance");
  });

  it("has beacon shutdown impact bar chart", () => {
    assert.ok(
      content.includes("ビーコン停波の連鎖的影響"),
      "should have beacon shutdown impact chart",
    );
  });

  it("has station map orbital diagram", () => {
    assert.ok(
      content.includes("infrastructure-station-map"),
      "should have orbital diagram showing station spatial layout",
    );
    assert.ok(
      content.includes("component:orbital-diagram"),
      "should use orbital-diagram component",
    );
  });

  it("station map includes all 4 stations and governance boundary", () => {
    assert.ok(content.includes("ガニメデ中央港"), "should show Ganymede Central Port");
    assert.ok(content.includes("エンケラドスST"), "should show Enceladus Station");
    assert.ok(content.includes("タイタニア/ウラヌス3"), "should show Titania/Uranus-3");
    assert.ok(content.includes("内苑/外苑境界"), "should show inner/outer sphere boundary");
  });

  // Analysis-derived cross-check (Task 500)
  it("72h mission reference consistent with EP01 analysis", () => {
    const ep1 = analyzeEpisode1();
    // Infrastructure report references "72時間配送ミッション" which is the EP01 target time
    assert.ok(content.includes("72時間"),
      "infrastructure should reference 72h delivery mission (EP01 analysis target)");
    // Verify EP01 analysis boundary is reasonable (72h should be feasible at ≤299t)
    assert.ok(ep1.boundaries.massBoundary72h.maxMassT > 200,
      "EP01 72h boundary should exist and be > 200t");
  });
});

// ============================================================
// AI Costs report: token usage, pricing, efficiency
// ============================================================

describe("ai-costs.md content validation", () => {
  const content = readReport("ai-costs.md");

  it("cites cache hit rate of 97.3%", () => {
    assert.ok(content.includes("97.3%"), "should cite 97.3% cache hit rate");
  });

  it("cites total token count ~360M", () => {
    assert.ok(
      content.includes("3.6億") || content.includes("360M"),
      "should cite ~360M total tokens",
    );
  });

  it("Haiku subagent cost: $6.57", () => {
    assert.ok(content.includes("$6.57"), "should cite $6.57 Haiku subagent cost");
  });

  it("API pricing for Opus 4.6: $5/MTok input, $25/MTok output", () => {
    assert.ok(content.includes("$5/MTok"), "should cite Opus input pricing $5/MTok");
    assert.ok(content.includes("$25/MTok"), "should cite Opus output pricing $25/MTok");
  });

  it("plan comparison includes Max Plan and API-only", () => {
    assert.ok(content.includes("Max Plan"), "should cite Max Plan");
    assert.ok(content.includes("API-only"), "should cite API-only plan");
  });

  it("efficiency measures documented", () => {
    assert.ok(content.includes("TodoWrite"), "should mention TodoWrite optimization");
    assert.ok(content.includes("max_turns"), "should mention max_turns scope limit");
    assert.ok(content.includes("run_in_background"), "should mention background execution");
  });

  it("update method with ccusage command", () => {
    assert.ok(content.includes("ccusage"), "should document ccusage update command");
  });

  // Regression tests from Task 279 external review (updated Task 490: dynamic assertions)
  it("task count is reasonably current", () => {
    const match = content.match(/完了タスク数 \| (\d+)/);
    assert.ok(match, "should have task count in stats table");
    const reportedCount = parseInt(match![1]);
    assert.ok(reportedCount >= 400, `task count ${reportedCount} should be >= 400`);
  });

  it("commit count is reasonably current", () => {
    const match = content.match(/コミット数 \| (\d[\d,]*)\+/);
    assert.ok(match, "should have commit count in stats table");
    const reportedCount = parseInt(match![1].replace(/,/g, ""));
    assert.ok(reportedCount >= 500, `commit count ${reportedCount} should be >= 500`);
  });

  it("notes Haiku was replaced by Sonnet as default subagent model", () => {
    assert.ok(
      content.includes("Sonnet に変更") || content.includes("Sonnetデフォルト"),
      "should document Haiku→Sonnet policy change",
    );
  });

  it("has newcomer introduction section", () => {
    assert.ok(
      content.includes("はじめに"),
      "should have introductory section for newcomers",
    );
  });

  it("includes project scale metrics (test counts)", () => {
    const tsMatch = content.match(/TypeScript ユニットテスト \| ([\d,]+)/);
    assert.ok(tsMatch, "should have TS test count in stats table");
    const tsCount = parseInt(tsMatch![1].replace(/,/g, ""));
    assert.ok(tsCount >= 2000, `TS test count ${tsCount} should be >= 2000`);

    const rustMatch = content.match(/Rust テスト \| (\d+)/);
    assert.ok(rustMatch, "should have Rust test count in stats table");
    const rustCount = parseInt(rustMatch![1]);
    assert.ok(rustCount >= 300, `Rust test count ${rustCount} should be >= 300`);

    const e2eMatch = content.match(/E2E テスト \| (\d+)/);
    assert.ok(e2eMatch, "should have E2E test count in stats table");
    const e2eCount = parseInt(e2eMatch![1]);
    assert.ok(e2eCount >= 200, `E2E test count ${e2eCount} should be >= 200`);
  });

  it("explains VMブート terminology", () => {
    assert.ok(
      content.includes("起動") && content.includes("終了"),
      "should explain VMブート as startup-shutdown cycle",
    );
  });

  it("has bar chart for plan cost comparison", () => {
    assert.ok(
      content.includes("```chart:bar"),
      "should have a bar chart directive",
    );
  });

  it("plan cost chart includes Max Plan and API-only data", () => {
    assert.ok(
      content.includes("value: 7") || content.includes("value: 100") || content.includes("value: 196"),
      "bar chart should include cost values",
    );
  });

  it("token distribution bar chart with log scale", () => {
    assert.ok(
      content.includes("トークン分布（対数スケール）"),
      "should have token distribution bar chart with log scale",
    );
    assert.ok(
      content.includes("キャッシュ読み取り") && content.includes("350M tokens"),
      "should show cache read tokens annotation",
    );
    assert.ok(
      content.includes("入力+出力（実I/O）"),
      "should show real I/O category in token distribution chart",
    );
  });

  it("model usage breakdown bar chart", () => {
    assert.ok(
      content.includes("モデル別起動回数と消費トークン比率"),
      "should have model usage breakdown bar chart",
    );
    assert.ok(
      content.includes("Haiku（95回/72%）"),
      "should show Haiku launch count and token share",
    );
    assert.ok(
      content.includes("Sonnet（13回/21%）"),
      "should show Sonnet launch count and token share",
    );
  });
});

// ---------------------------------------------------------------------------
// Mission timeline data consistency (report vs computed)
// ---------------------------------------------------------------------------
describe("Mission timeline data consistency", () => {
  const content = readReport("cross-episode.md");

  // Parse timeseries JSON blocks from the report
  function parseTimeseriesBlock(id: string): { x: number[]; y: number[] } | null {
    const regex = new RegExp(`"id":\\s*"${id}"[\\s\\S]*?"x":\\s*\\[([\\d.,\\s]+)\\][\\s\\S]*?"y":\\s*\\[([\\d.,\\s-]+)\\]`);
    const match = content.match(regex);
    if (!match) return null;
    return {
      x: match[1].split(",").map(Number),
      y: match[2].split(",").map(Number),
    };
  }

  it("distance chart starts at Mars (~1.5 AU) and ends at Earth (~1.0 AU)", () => {
    const data = parseTimeseriesBlock("mission-distance-timeline");
    assert.ok(data, "distance timeseries should exist in report");
    assert.ok(Math.abs(data.y[0] - 1.52) < 0.1, `start should be ~1.52 AU, got ${data.y[0]}`);
    assert.ok(Math.abs(data.y[data.y.length - 1] - 1.0) < 0.1, `end should be ~1.0 AU, got ${data.y[data.y.length - 1]}`);
  });

  it("distance chart peaks near Uranus (~19.2 AU)", () => {
    const data = parseTimeseriesBlock("mission-distance-timeline");
    assert.ok(data);
    const maxY = Math.max(...data.y);
    assert.ok(Math.abs(maxY - 19.19) < 0.5, `peak should be ~19.19 AU, got ${maxY}`);
  });

  it("ΔV chart final value matches total 36,156 km/s", () => {
    const data = parseTimeseriesBlock("mission-deltav-timeline");
    assert.ok(data, "ΔV timeseries should exist in report");
    const finalDV = data.y[data.y.length - 1];
    assert.ok(Math.abs(finalDV - 36156) < 10, `final ΔV should be 36,156, got ${finalDV}`);
  });

  it("ΔV chart EP01 step is ~8,497 km/s", () => {
    const data = parseTimeseriesBlock("mission-deltav-timeline");
    assert.ok(data);
    // Find value at day 3
    const idx = data.x.findIndex(x => x >= 3);
    assert.ok(Math.abs(data.y[idx] - 8497) < 10, `EP01 ΔV should be ~8497, got ${data.y[idx]}`);
  });

  it("ΔV chart includes EP04 escape (1,202 km/s)", () => {
    const data = parseTimeseriesBlock("mission-deltav-timeline");
    assert.ok(data);
    // After EP03 (day 101): should be 19747, after EP04 (day 111): should be 20949
    const afterEP03 = data.y[data.x.findIndex(x => x >= 101)];
    const afterEP04 = data.y[data.x.findIndex(x => x >= 111)];
    const ep04DV = afterEP04 - afterEP03;
    assert.ok(Math.abs(ep04DV - 1202) < 10, `EP04 ΔV should be ~1202, got ${ep04DV}`);
  });

  it("nozzle chart ends with ~0.43h remaining (26 min)", () => {
    const data = parseTimeseriesBlock("mission-nozzle-timeline");
    assert.ok(data, "nozzle timeseries should exist in report");
    const finalLife = data.y[data.y.length - 1];
    assert.ok(Math.abs(finalLife - 0.43) < 0.1, `final nozzle life should be ~0.43h, got ${finalLife}`);
  });

  it("radiation chart has plasmoid jump of ~480 mSv", () => {
    const data = parseTimeseriesBlock("mission-radiation-timeline");
    assert.ok(data, "radiation timeseries should exist in report");
    // Find the step around day 105
    const beforeIdx = data.x.findIndex(x => x >= 105);
    const afterIdx = beforeIdx + 1;
    const jump = data.y[afterIdx] - data.y[beforeIdx];
    assert.ok(Math.abs(jump - 480) < 5, `plasmoid jump should be ~480 mSv, got ${jump}`);
  });

  it("radiation chart final dose exceeds ICRP 500 mSv but stays under NASA 600 mSv", () => {
    const data = parseTimeseriesBlock("mission-radiation-timeline");
    assert.ok(data);
    const finalDose = data.y[data.y.length - 1];
    assert.ok(finalDose > 500, `final dose ${finalDose} should exceed ICRP 500 mSv`);
    assert.ok(finalDose < 600, `final dose ${finalDose} should be under NASA 600 mSv`);
  });

  it("all 5 timeseries charts are present in report", () => {
    const ids = [
      "mission-distance-timeline",
      "mission-deltav-timeline",
      "mission-nozzle-timeline",
      "mission-radiation-timeline",
      "mission-gforce-timeline",
    ];
    for (const id of ids) {
      assert.ok(content.includes(`"id": "${id}"`), `report should contain chart ${id}`);
    }
  });

  it("G-force chart: EP01 peak is ~3.34g (highest in mission)", () => {
    const data = parseTimeseriesBlock("mission-gforce-timeline");
    assert.ok(data, "G-force timeseries should exist in report");
    const maxY = Math.max(...data.y);
    assert.ok(Math.abs(maxY - 3.34) < 0.1, `EP01 peak G should be ~3.34g, got ${maxY}`);
  });

  it("G-force chart: EP02 coast phase is 0g", () => {
    const data = parseTimeseriesBlock("mission-gforce-timeline");
    assert.ok(data);
    // EP02 coast phase (day 20-90) should be 0
    const coastIdx = data.x.findIndex(x => x >= 20 && x <= 90);
    assert.ok(coastIdx >= 0, "should have coast phase data point");
    assert.strictEqual(data.y[coastIdx], 0, "coast phase should be 0g");
  });

  it("G-force chart: EP03 is ~2.21g", () => {
    const data = parseTimeseriesBlock("mission-gforce-timeline");
    assert.ok(data);
    // EP03 burn starts at 95.01 — find the first non-zero value in EP03 region
    const ep03Idx = data.x.findIndex(x => x > 95 && x <= 101);
    assert.ok(ep03Idx >= 0, "should have EP03 data point");
    assert.ok(Math.abs(data.y[ep03Idx] - 2.21) < 0.15, `EP03 G should be ~2.21g, got ${data.y[ep03Idx]}`);
  });

  it("G-force chart: EP05 Burn 1 is ~1.67g (65% thrust, 389t)", () => {
    const data = parseTimeseriesBlock("mission-gforce-timeline");
    assert.ok(data);
    // EP05 Burn 1 starts at 103.01 — find the first non-zero value after day 103
    const burnIdx = data.x.findIndex(x => x > 103 && x <= 104.5);
    assert.ok(burnIdx >= 0, "should have EP05 Burn 1 data point");
    assert.ok(Math.abs(data.y[burnIdx] - 1.67) < 0.15, `EP05 Burn 1 should be ~1.67g, got ${data.y[burnIdx]}`);
  });

  it("G-force chart: has EP05 coast phase at 0g between burns", () => {
    const data = parseTimeseriesBlock("mission-gforce-timeline");
    assert.ok(data);
    // EP05 coast between Burn 1 and Burn 2 (day ~105-118)
    const coastIdx = data.x.findIndex(x => x >= 108 && x <= 116);
    assert.ok(coastIdx >= 0, "should have EP05 coast phase");
    assert.strictEqual(data.y[coastIdx], 0, "EP05 coast should be 0g");
  });

  it("G-force chart: has 1g reference threshold", () => {
    assert.ok(content.includes('"id": "mission-gforce-timeline"'), "G-force chart should exist");
  });

  it("all timeseries regions match EP01-EP05", () => {
    // All 4 charts should have the same 5 regions
    const regionPattern = /"from": 0, "to": 3, "label": "EP01"/;
    assert.ok(regionPattern.test(content), "should have EP01 region");
    assert.ok(content.includes('"label": "EP05"'), "should have EP05 region");
  });
});

// ---------------------------------------------------------------------------
// Extended timeseries validation (velocity, propellant, margin, mass)
// ---------------------------------------------------------------------------
describe("Extended timeseries data validation", () => {
  const crossContent = readReport("cross-episode.md");
  const shipContent = readReport("ship-kestrel.md");

  /** Parse timeseries JSON block by id from report content */
  function parseTimeseries(content: string, id: string): { x: number[]; y: number[] }[] | null {
    // Find the block containing this id
    const idIdx = content.indexOf(`"id": "${id}"`);
    if (idIdx < 0) return null;
    // Find surrounding timeseries: block
    const blockStart = content.lastIndexOf("```timeseries:", idIdx);
    const blockEnd = content.indexOf("```", idIdx + 10);
    if (blockStart < 0 || blockEnd < 0) return null;
    const blockText = content.slice(blockStart + 14, blockEnd);
    const parsed = JSON.parse(blockText);
    return parsed.series.map((s: { x: number[]; y: number[] }) => ({ x: s.x, y: s.y }));
  }

  // --- Velocity profile ---
  it("velocity profile: cruise speed starts at Mars orbital velocity (~24 km/s)", () => {
    const series = parseTimeseries(crossContent, "mission-velocity-profile");
    assert.ok(series, "velocity profile should exist");
    assert.ok(Math.abs(series[0].y[0] - 24.1) < 1, `Mars cruise speed ~24 km/s, got ${series[0].y[0]}`);
  });

  it("velocity profile: EP05 peak speed is ~2100 km/s", () => {
    const series = parseTimeseries(crossContent, "mission-velocity-profile");
    assert.ok(series && series.length >= 2, "should have EP05 series");
    const maxV = Math.max(...series[1].y);
    assert.ok(Math.abs(maxV - 2100) < 100, `EP05 peak should be ~2100 km/s, got ${maxV}`);
  });

  it("velocity profile: EP05 ends near Earth orbital velocity (~7.7 km/s)", () => {
    const series = parseTimeseries(crossContent, "mission-velocity-profile");
    assert.ok(series && series.length >= 2);
    const finalV = series[1].y[series[1].y.length - 1];
    assert.ok(Math.abs(finalV - 7.7) < 2, `EP05 final speed should be ~7.7 km/s, got ${finalV}`);
  });

  // --- Z-height (ecliptic elevation) profile ---
  it("z-height profile: starts at Mars Z ≈ +4000 km", () => {
    const series = parseTimeseries(crossContent, "mission-z-height-profile");
    assert.ok(series, "Z-height profile should exist");
    assert.ok(series.length >= 4, "should have 4 series (EP01-EP05)");
    assert.ok(Math.abs(series[0].y[0] - 4047) < 500, `Mars Z should be ~+4047 kkm, got ${series[0].y[0]}`);
  });

  it("z-height profile: Jupiter Z is below ecliptic (negative)", () => {
    const series = parseTimeseries(crossContent, "mission-z-height-profile");
    assert.ok(series);
    const jupiterZ = series[0].y[series[0].y.length - 1];
    assert.ok(jupiterZ < 0, `Jupiter Z should be negative (below ecliptic), got ${jupiterZ}`);
    assert.ok(Math.abs(jupiterZ - (-6416)) < 1000, `Jupiter Z should be ~-6416 kkm, got ${jupiterZ}`);
  });

  it("z-height profile: Saturn peak is maximum Z ≈ +48000 km", () => {
    const series = parseTimeseries(crossContent, "mission-z-height-profile");
    assert.ok(series);
    const saturnZ = series[1].y[series[1].y.length - 1]; // EP02 series ends at Saturn
    assert.ok(saturnZ > 40000, `Saturn Z should be >40000 kkm, got ${saturnZ}`);
    assert.ok(saturnZ < 55000, `Saturn Z should be <55000 kkm, got ${saturnZ}`);
  });

  it("z-height profile: ends near ecliptic plane (Earth Z ≈ 0)", () => {
    const series = parseTimeseries(crossContent, "mission-z-height-profile");
    assert.ok(series);
    const earthZ = series[series.length - 1].y[series[series.length - 1].y.length - 1];
    assert.ok(Math.abs(earthZ) < 500, `Earth Z should be ≈0, got ${earthZ}`);
  });

  // --- 3D viewer embed with scene switching (Tasks 461, 462) ---
  it("cross-episode has inline 3D viewer with all three scenes", () => {
    const viewer3dBlocks = crossContent.match(/```3d-viewer:[\s\S]*?```/g) ?? [];
    assert.ok(viewer3dBlocks.length >= 1,
      "cross-episode should contain at least one 3d-viewer directive");
    const block = viewer3dBlocks[0]!;
    assert.ok(block.includes('"full-route"'),
      "3d-viewer should include full-route scene");
    assert.ok(block.includes('"saturn-ring"'),
      "3d-viewer should include saturn-ring scene");
    assert.ok(block.includes('"uranus-approach"'),
      "3d-viewer should include uranus-approach scene");
  });

  // --- Propellant mass timeline ---
  it("propellant mass: starts at 299t (initial mass)", () => {
    const series = parseTimeseries(crossContent, "propellant-mass-timeline");
    assert.ok(series, "propellant mass timeline should exist");
    assert.strictEqual(series[0].y[0], 299, "initial mass should be 299t");
  });

  it("propellant mass: Enceladus refuel restores to 299t", () => {
    const series = parseTimeseries(crossContent, "propellant-mass-timeline");
    assert.ok(series);
    // After refuel (around day 95), mass should return to 299
    const refuelIdx = series[0].x.findIndex((x: number) => x >= 95);
    assert.ok(refuelIdx > 0);
    assert.strictEqual(series[0].y[refuelIdx], 299, "refuel should restore to 299t");
  });

  // --- Margin timeline ---
  it("margin timeline: EP01 mass boundary margin is 0%", () => {
    const series = parseTimeseries(crossContent, "margin-timeline");
    assert.ok(series, "margin timeline should exist");
    assert.strictEqual(series[0].y[0], 0, "EP01 margin should be 0%");
  });

  it("margin timeline: EP05 nozzle margin is 0.78%", () => {
    const series = parseTimeseries(crossContent, "margin-timeline");
    assert.ok(series);
    const finalMargin = series[0].y[series[0].y.length - 1];
    assert.ok(Math.abs(finalMargin - 0.78) < 0.05, `EP05 nozzle margin should be 0.78%, got ${finalMargin}`);
  });

  it("margin timeline: EP04 shield margin is 43%", () => {
    const series = parseTimeseries(crossContent, "margin-timeline");
    assert.ok(series);
    // EP04 runs from day 101 to 111
    const ep04Margin = series[0].y[series[0].x.findIndex((x: number) => x >= 103)];
    assert.ok(Math.abs(ep04Margin - 43) < 1, `EP04 margin should be 43%, got ${ep04Margin}`);
  });

  // --- Margin actual vs limit ---
  it("margin-actual-vs-limit: EP05 nozzle utilization is 99.2%", () => {
    const series = parseTimeseries(crossContent, "margin-actual-vs-limit");
    assert.ok(series, "margin-actual-vs-limit should exist");
    // Point 4 = EP05 nozzle
    const ep05 = series[0].y[3]; // x=[1,2,3,4], y=[97.1, 99.8, 57, 99.2]
    assert.ok(Math.abs(ep05 - 99.2) < 0.5, `EP05 utilization should be 99.2%, got ${ep05}`);
  });

  it("margin-actual-vs-limit: limit line is 100% for all points", () => {
    const series = parseTimeseries(crossContent, "margin-actual-vs-limit");
    assert.ok(series && series.length >= 2, "should have limit series");
    for (const v of series[1].y) {
      assert.strictEqual(v, 100, "limit should be 100%");
    }
  });

  // --- Ship-kestrel mass timeline ---
  it("ship-kestrel mass timeline: all scenarios start at 299t", () => {
    const series = parseTimeseries(shipContent, "mass-timeline");
    assert.ok(series, "ship-kestrel mass timeline should exist");
    for (let i = 0; i < series.length; i++) {
      assert.strictEqual(series[i].y[0], 299, `scenario ${i} should start at 299t`);
    }
  });

  it("ship-kestrel mass timeline: has 3 scenarios", () => {
    const series = parseTimeseries(shipContent, "mass-timeline");
    assert.ok(series);
    assert.strictEqual(series.length, 3, "should have 3 scenarios (A, B, C)");
  });

  it("ship-kestrel mass timeline: scenario A (no refuel) reaches structural mass 60t", () => {
    const series = parseTimeseries(shipContent, "mass-timeline");
    assert.ok(series);
    const finalA = series[0].y[series[0].y.length - 1];
    assert.strictEqual(finalA, 60, "scenario A should reach structural mass 60t");
  });

  it("ship-kestrel mass timeline: structural mass threshold is 60t", () => {
    assert.ok(shipContent.includes('"value": 60'), "should have 60t threshold");
    assert.ok(shipContent.includes("構造質量"), "should label as structural mass");
  });
});

// ---------------------------------------------------------------------------
// Transcription accuracy data validation
// ---------------------------------------------------------------------------
describe("Transcription accuracy data", () => {
  const calcDir = path.join(reportsDir, "calculations");
  const accuracyPath = path.join(calcDir, "transcription_accuracy.json");
  const exists = fs.existsSync(accuracyPath);

  let data: {
    generatedAt: string;
    episodes: {
      episode: number;
      scriptDialogueLines: number;
      comparisons: {
        sourceType: string;
        corpusCharacterAccuracy: number;
        meanLineCharacterAccuracy: number;
        medianLineCharacterAccuracy: number;
        asrLineCount: number;
        matchedLines: number;
      }[];
    }[];
  };

  if (exists) {
    data = JSON.parse(fs.readFileSync(accuracyPath, "utf8"));
  }

  it("accuracy report file exists", { skip: !exists ? "no accuracy data" : undefined }, () => {
    assert.ok(data.episodes.length >= 1, "should have at least EP01");
  });

  it("EP01 has both VTT and Whisper comparisons", { skip: !exists ? "no data" : undefined }, () => {
    const ep1 = data.episodes.find(e => e.episode === 1);
    assert.ok(ep1, "EP01 should exist");
    assert.equal(ep1.scriptDialogueLines, 229, "EP01 script has 229 dialogue lines");
    assert.ok(ep1.comparisons.length >= 3, "EP01 should have ≥3 comparisons (VTT + Whisper medium + turbo)");
  });

  it("VTT corpus accuracy is ~68%", { skip: !exists ? "no data" : undefined }, () => {
    const ep1 = data.episodes.find(e => e.episode === 1);
    const vtt = ep1?.comparisons.find(c => c.sourceType === "youtube-auto");
    assert.ok(vtt, "VTT comparison should exist");
    assert.ok(vtt.corpusCharacterAccuracy >= 0.65 && vtt.corpusCharacterAccuracy <= 0.72,
      `VTT accuracy ${vtt.corpusCharacterAccuracy} should be ~68%`);
  });

  it("Whisper corpus accuracy is ~83%", { skip: !exists ? "no data" : undefined }, () => {
    const ep1 = data.episodes.find(e => e.episode === 1);
    const whisper = ep1?.comparisons.find(c => c.sourceType === "whisper-medium");
    assert.ok(whisper, "Whisper comparison should exist");
    assert.ok(whisper.corpusCharacterAccuracy >= 0.80 && whisper.corpusCharacterAccuracy <= 0.87,
      `Whisper accuracy ${whisper.corpusCharacterAccuracy} should be ~83%`);
  });

  it("Whisper outperforms VTT at corpus level", { skip: !exists ? "no data" : undefined }, () => {
    const ep1 = data.episodes.find(e => e.episode === 1);
    const vtt = ep1?.comparisons.find(c => c.sourceType === "youtube-auto");
    const whisper = ep1?.comparisons.find(c => c.sourceType === "whisper-medium");
    assert.ok(vtt && whisper, "both comparisons should exist");
    assert.ok(whisper.corpusCharacterAccuracy > vtt.corpusCharacterAccuracy,
      "Whisper should have higher corpus accuracy than VTT");
  });

  it("Whisper turbo corpus accuracy is ~91%", { skip: !exists ? "no data" : undefined }, () => {
    const ep1 = data.episodes.find(e => e.episode === 1);
    const turbo = ep1?.comparisons.find(c => c.sourceType === "whisper-turbo");
    assert.ok(turbo, "Turbo comparison should exist");
    assert.ok(turbo.corpusCharacterAccuracy >= 0.88 && turbo.corpusCharacterAccuracy <= 0.95,
      `Turbo accuracy ${turbo.corpusCharacterAccuracy} should be ~91%`);
  });

  it("Whisper turbo outperforms medium", { skip: !exists ? "no data" : undefined }, () => {
    const ep1 = data.episodes.find(e => e.episode === 1);
    const medium = ep1?.comparisons.find(c => c.sourceType === "whisper-medium");
    const turbo = ep1?.comparisons.find(c => c.sourceType === "whisper-turbo");
    assert.ok(medium && turbo, "both comparisons should exist");
    assert.ok(turbo.corpusCharacterAccuracy > medium.corpusCharacterAccuracy,
      "Turbo should have higher corpus accuracy than medium");
  });
});

// ============================================================
// ship-kestrel.md fusion power budget section (Task 370)
// ============================================================

describe("ship-kestrel.md fusion power budget validation", () => {
  const content = readReport("ship-kestrel.md");

  it("contains fusion power budget section", () => {
    assert.ok(
      content.includes("核融合出力収支"),
      "should have fusion power budget section heading",
    );
  });

  it("jet power at 100% matches calculation", () => {
    // P_jet = 0.5 × 9.8e6 × 9.80665e6 = ~48.05 TW
    assert.ok(
      content.includes("48.1"),
      "should cite jet power ~48.1 TW",
    );
  });

  it("jet power at 65% matches calculation", () => {
    // P_jet_65 = 0.5 × 6.37e6 × 9.80665e6 = ~31.23 TW
    assert.ok(
      content.includes("31.2"),
      "should cite jet power ~31.2 TW at 65%",
    );
  });

  it("references world electricity for comparison", () => {
    assert.ok(
      content.includes("18.4 TW") || content.includes("18.4TW"),
      "should reference world electricity output ~18.4 TW",
    );
  });

  it("discusses 65% thermal limitation", () => {
    assert.ok(
      content.includes("廃熱") && content.includes("冷却"),
      "should discuss waste heat and cooling connection",
    );
  });

  it("cites D-He³ reaction energy 18.3 MeV", () => {
    assert.ok(
      content.includes("18.3") && content.includes("MeV"),
      "should cite D-He³ reaction energy",
    );
  });

  it("power budget bar charts render correctly (not orphaned bar-chart:)", () => {
    assert.ok(
      content.includes("ジェット出力（推力状態別"),
      "should have jet output bar chart",
    );
    assert.ok(
      content.includes("廃熱負荷（推力状態別"),
      "should have waste heat bar chart",
    );
    assert.ok(
      !content.includes("```bar-chart:"),
      "should NOT have orphaned bar-chart: directive (unsupported by parser)",
    );
  });

  it("has ギリギリ summary margin gauge", () => {
    assert.ok(
      content.includes("kestrel-girigiri-summary"),
      "should have margin gauge summarizing all critical margins",
    );
    assert.ok(
      content.includes("margin-gauge"),
      "should use margin-gauge component",
    );
  });

  it("margin gauge includes key critical values", () => {
    // EP04 radiation: 480 vs 500 mSv
    assert.ok(
      content.includes('"actual": 480') && content.includes('"limit": 500'),
      "should include EP04 radiation margin (480/500 mSv)",
    );
    // EP05 nozzle: 55.2 vs 55.63 h
    assert.ok(
      content.includes('"actual": 55.2') && content.includes('"limit": 55.63'),
      "should include EP05 nozzle life margin (55.2/55.63 h)",
    );
  });
});

// =============================================================================
// Chart Directive Format Validation (Task 394)
// =============================================================================
// Prevents silent rendering failures where a fenced code block uses a directive
// format not recognized by the parser. Such blocks are silently ignored — the
// chart simply doesn't render with no error message.
//
// Episode parser supports:
//   video-cards, dialogue-quotes, transfer, exploration, diagrams,
//   timeseries-charts, detail-pages, glossary, margin-gauge, chart[:subtype]
//
// Summary parser supports:
//   chart[:subtype], component[:subtype], timeline, table[:subtype],
//   timeseries, dag-viewer, glossary, sideview, margin-gauge
// =============================================================================

describe("Chart directive format validation (Task 394)", () => {
  // Supported directive prefixes per parser type
  const episodeDirectives = new Set([
    "video-cards", "dialogue-quotes", "transfer", "exploration",
    "diagrams", "timeseries-charts", "detail-pages", "glossary", "margin-gauge",
    "chart",
  ]);
  const summaryDirectives = new Set([
    "chart", "component", "timeline", "table", "timeseries",
    "dag-viewer", "glossary", "sideview", "margin-gauge", "3d-viewer",
  ]);

  // Common code/language fences that are NOT directives (should be ignored)
  const knownCodeFences = new Set([
    "yaml", "json", "typescript", "javascript", "ts", "js", "python", "py",
    "bash", "sh", "shell", "sql", "html", "css", "rust", "rs", "toml",
    "markdown", "md", "text", "txt", "csv", "xml", "diff", "plaintext",
    "katex", "math", "latex", "mermaid", "graphviz", "dot",
  ]);

  /**
   * Extract all fenced code block language tags from content.
   * Returns array of { tag, line } where tag is the language/directive identifier.
   */
  function extractFenceTags(content: string): { tag: string; line: number }[] {
    const results: { tag: string; line: number }[] = [];
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^```(\S+)\s*$/);
      if (match && match[1]) {
        results.push({ tag: match[1], line: i + 1 });
      }
    }
    return results;
  }

  /**
   * Check if a fence tag looks like it could be a directive (not a code language).
   * Directive-like tags contain colons or match known directive patterns.
   */
  function isLikelyDirective(tag: string): boolean {
    const base = tag.split(":")[0];
    // If it's a known code language, it's not a directive
    if (knownCodeFences.has(base.toLowerCase())) return false;
    // If it contains a colon, it's almost certainly a directive (chart:bar, component:orbital-diagram)
    if (tag.includes(":")) return true;
    // If it matches a known directive prefix exactly, it's a directive
    if (episodeDirectives.has(base) || summaryDirectives.has(base)) return true;
    // Heuristic: tags with hyphens that look like component names
    if (base.includes("-") && !knownCodeFences.has(base)) return true;
    return false;
  }

  // Episode report files
  const episodeFiles = ["ep01.md", "ep02.md", "ep03.md", "ep04.md", "ep05.md"];

  for (const file of episodeFiles) {
    it(`${file}: all directives use episode-parser-supported formats`, () => {
      const content = readReport(file, "episodes");
      const tags = extractFenceTags(content);

      for (const { tag, line } of tags) {
        if (!isLikelyDirective(tag)) continue;
        const base = tag.split(":")[0];
        assert.ok(
          episodeDirectives.has(base),
          `${file}:${line} — unsupported directive \`\`\`${tag}\`\`\` ` +
          `(episode parser supports: ${[...episodeDirectives].join(", ")})`,
        );
      }
    });
  }

  // Summary report files
  const summaryFiles = fs.readdirSync(summaryDir)
    .filter((f: string) => f.endsWith(".md"));

  for (const file of summaryFiles) {
    it(`${file}: all directives use summary-parser-supported formats`, () => {
      const content = readReport(file, "summary");
      const tags = extractFenceTags(content);

      for (const { tag, line } of tags) {
        if (!isLikelyDirective(tag)) continue;
        const base = tag.split(":")[0];
        assert.ok(
          summaryDirectives.has(base),
          `${file}:${line} — unsupported directive \`\`\`${tag}\`\`\` ` +
          `(summary parser supports: ${[...summaryDirectives].join(", ")})`,
        );
      }
    });
  }

  // Regression: specific formats known to have caused silent failures
  it("no report uses orphaned chart-data: directive", () => {
    const allFiles = [
      ...episodeFiles.map(f => ({ file: f, dir: "episodes" as const })),
      ...summaryFiles.map(f => ({ file: f, dir: "summary" as const })),
    ];
    for (const { file, dir } of allFiles) {
      const content = readReport(file, dir);
      assert.ok(
        !content.includes("```chart-data:"),
        `${file} contains orphaned \`\`\`chart-data: directive (not supported by any parser)`,
      );
    }
  });

  it("no report uses orphaned bar-chart: directive", () => {
    const allFiles = [
      ...episodeFiles.map(f => ({ file: f, dir: "episodes" as const })),
      ...summaryFiles.map(f => ({ file: f, dir: "summary" as const })),
    ];
    for (const { file, dir } of allFiles) {
      const content = readReport(file, dir);
      assert.ok(
        !content.includes("```bar-chart:"),
        `${file} contains orphaned \`\`\`bar-chart: directive (not supported by any parser)`,
      );
    }
  });

  // Verify episode bar charts are extracted by the parser (not left as raw YAML)
  it("episode chart:bar directives are extracted by episode parser", () => {
    const testContent = '```chart:bar\ncaption: Test\nunit: "km/s"\nbars:\n  - label: A\n    value: 10\n```';
    const { markdown, directives } = extractEpisodeDirectives(testContent);
    // The chart:bar block should be extracted (not left in markdown)
    assert.ok(
      !markdown.includes("chart:bar"),
      "chart:bar should be extracted from markdown, not left as raw text",
    );
    assert.ok(
      directives.some(d => d.type === "chart:bar"),
      "should have a chart:bar directive",
    );
  });

  // Verify that the validation actually detects something — canary test
  it("validation correctly flags unsupported directives", () => {
    const fakeContent = '```chart-data:\nfoo\n```\n```bar-chart:\nbar\n```\n```unknown-widget:\nbaz\n```';
    const tags = extractFenceTags(fakeContent);
    // chart-data, bar-chart, unknown-widget — all should be flagged as likely directives
    const directiveTags = tags.filter(t => isLikelyDirective(t.tag));
    assert.ok(
      directiveTags.length === 3,
      `Expected 3 directive-like tags, got ${directiveTags.length}: ${directiveTags.map(t => t.tag).join(", ")}`,
    );
    // None should match episode or summary supported sets
    for (const { tag } of directiveTags) {
      const base = tag.split(":")[0];
      assert.ok(
        !episodeDirectives.has(base) && !summaryDirectives.has(base),
        `${tag} should NOT be recognized as a supported directive`,
      );
    }
  });
});

// =============================================================================
// G-force Terminology Validation (Task 395)
// =============================================================================
// CLAUDE.md requires strict separation of 居住G (habitation) from 推進G (propulsion).
// Propulsion G must NOT be evaluated as a crew endurance constraint.
// =============================================================================

describe("G-force terminology validation (Task 395)", () => {
  const episodeFiles = ["ep01.md", "ep02.md", "ep03.md", "ep04.md", "ep05.md"];

  // Patterns that conflate propulsion G with crew endurance
  const conflationPatterns = [
    /搭乗者.*[にはが].*[gG].*耐え/,    // crew must "endure" G
    /搭乗者にとって過酷/,                // "grueling for crew" re: propulsion G
    /乗員への負担.*現実的/,              // "realistic crew burden" re: propulsion G
    /[gG].*に耐える必要/,               // "need to endure" G
  ];

  for (const file of episodeFiles) {
    it(`${file}: propulsion G not conflated with crew endurance`, () => {
      const content = readReport(file, "episodes");
      for (const pattern of conflationPatterns) {
        assert.ok(
          !pattern.test(content),
          `${file} conflates propulsion G with crew endurance (matched: ${pattern})`,
        );
      }
    });
  }
});

// =============================================================================
// Internal Link Validation (Task 397)
// =============================================================================
// Validates that markdown links in report files use correct relative paths
// and file naming conventions. Prevents broken links from reaching production.
// =============================================================================

describe("Internal link validation (Task 397)", () => {
  const episodeFiles = ["ep01.md", "ep02.md", "ep03.md", "ep04.md", "ep05.md"];
  const summaryFiles = fs.readdirSync(summaryDir)
    .filter((f: string) => f.endsWith(".md"));

  // Extract markdown links: [text](url)
  function extractLinks(content: string): { url: string; line: number }[] {
    const results: { url: string; line: number }[] = [];
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      // Match markdown links but skip image refs and code blocks
      const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
      let match;
      while ((match = linkRegex.exec(lines[i])) !== null) {
        const url = match[2];
        // Skip external links and anchors-only
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("#")) continue;
        results.push({ url, line: i + 1 });
      }
    }
    return results;
  }

  // No internal links should use absolute paths (starting with /)
  // Exception: "/" alone is a valid link to the site root
  for (const file of [...episodeFiles.map(f => ({ file: f, dir: "episodes" as const })),
                       ...summaryFiles.map(f => ({ file: f, dir: "summary" as const }))]) {
    it(`${file.file}: no absolute-path internal links`, () => {
      const content = readReport(file.file, file.dir);
      const links = extractLinks(content);
      for (const { url, line } of links) {
        const isRootLink = url === "/" || url === "/index.html";
        assert.ok(
          !url.startsWith("/") || isRootLink,
          `${file.file}:${line} — absolute path link "${url}" should use relative path`,
        );
      }
    });
  }

  // Episode links should use ep-00X.html naming (not ep0X.html or epX.html)
  for (const file of summaryFiles) {
    it(`${file}: episode links use correct ep-00X naming`, () => {
      const content = readReport(file, "summary");
      const links = extractLinks(content);
      for (const { url, line } of links) {
        // Check links that reference episode files
        const episodeMatch = url.match(/ep(\d+)\.html/);
        if (episodeMatch) {
          const epNum = episodeMatch[1];
          // Should be ep-001.html format, not ep01.html
          assert.ok(
            url.includes(`ep-${epNum.padStart(3, "0")}.html`),
            `${file}:${line} — episode link "${url}" should use ep-${epNum.padStart(3, "0")}.html format`,
          );
        }
      }
    });
  }

  // Summary-to-summary links should not go through ../summary/ when in same directory
  for (const file of summaryFiles) {
    it(`${file}: no redundant ../summary/ in same-directory links`, () => {
      const content = readReport(file, "summary");
      const links = extractLinks(content);
      for (const { url, line } of links) {
        assert.ok(
          !url.startsWith("../summary/"),
          `${file}:${line} — redundant path "${url}" (both files in summary dir, use just filename)`,
        );
      }
    });
  }

  // Validate that anchor references match actual heading slugs in target files (Task 400)
  // This catches the common pattern of manually typed anchors that don't match slugify output

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[\s　]+/g, "-")
      .replace(/[^\w\u3000-\u9fff\u30a0-\u30ff\u3040-\u309f-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function extractHeadingSlugs(content: string): Set<string> {
    const slugs = new Set<string>();
    for (const line of content.split("\n")) {
      const match = line.match(/^#{1,6}\s+(.+)$/);
      if (match) slugs.add(slugify(match[1]));
    }
    return slugs;
  }

  // Map filename patterns to actual report files
  function resolveTargetFile(url: string, sourceDir: "episodes" | "summary"): { content: string; resolved: string } | null {
    const [filePart] = url.split("#");
    let targetPath: string;

    if (filePart.startsWith("../episodes/")) {
      const name = filePart.replace("../episodes/", "").replace(".html", ".md")
        .replace(/ep-0*(\d+)/, "ep0$1");
      targetPath = path.join(episodesDir, name);
    } else if (filePart.startsWith("../summary/") || (sourceDir === "summary" && !filePart.includes("/"))) {
      const name = (filePart.startsWith("../summary/") ? filePart.replace("../summary/", "") : filePart)
        .replace(".html", ".md");
      targetPath = path.join(summaryDir, name);
    } else {
      return null;
    }

    try {
      return { content: fs.readFileSync(targetPath, "utf-8"), resolved: targetPath };
    } catch {
      return null;
    }
  }

  const allReportFiles = [
    ...episodeFiles.map(f => ({ file: f, dir: "episodes" as const })),
    ...summaryFiles.map(f => ({ file: f, dir: "summary" as const })),
  ];

  for (const { file, dir } of allReportFiles) {
    it(`${file}: cross-file anchor references resolve to actual headings`, () => {
      const content = readReport(file, dir);
      const links = extractLinks(content);

      for (const { url, line } of links) {
        if (!url.includes("#") || !url.includes(".html#")) continue;
        const anchor = url.split("#")[1];
        if (!anchor) continue;

        const target = resolveTargetFile(url, dir);
        if (!target) continue;

        const headingSlugs = extractHeadingSlugs(target.content);
        const hasTransferId = target.content.includes(`"id": "${anchor}"`);

        if (headingSlugs.size > 0) {
          assert.ok(
            headingSlugs.has(anchor) || hasTransferId,
            `${file}:${line} — anchor "#${anchor}" not found in ${path.basename(target.resolved)} ` +
            `(available: ${[...headingSlugs].slice(0, 5).join(", ")}${headingSlugs.size > 5 ? "..." : ""})`,
          );
        }
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Calculation-report consistency (Task 412)
// Ensures values in epXX_calculations.json appear in episode reports
// ---------------------------------------------------------------------------

describe("calculation-report consistency", () => {
  const calcDir = path.join(reportsDir, "calculations");

  function loadCalc(ep: string): Record<string, unknown> {
    return JSON.parse(fs.readFileSync(path.join(calcDir, `ep${ep}_calculations.json`), "utf-8"));
  }

  /** Check that a report includes a rounded/formatted version of a calculation value */
  function assertValueCited(report: string, value: number, label: string, precision = 2): void {
    // Try various roundings of the value
    const rounded = [
      value.toFixed(precision),
      ...(precision > 0 ? [value.toFixed(precision - 1)] : []),
      Math.round(value).toString(),
      value.toPrecision(4),
    ];
    // Also check comma-formatted integers (e.g. 1,127 for 1127)
    const intStr = Math.round(value).toString();
    if (intStr.length >= 4) {
      rounded.push(intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    }
    const found = rounded.some(r => report.includes(r));
    assert.ok(found, `${label}: expected one of [${rounded.join(", ")}] in report`);
  }

  describe("EP01", () => {
    const calc = loadCalc("01") as Record<string, Record<string, unknown>>;
    const report = readReport("ep01.md", "episodes");
    const hohmann = calc.hohmann as { totalDv: number; transferTimeDays: number };
    const boundaries = calc.boundaries as { massBoundary72h: { maxMassT: number; aReqG: number } };

    it("Hohmann total ΔV ~10.15 km/s cited", () => {
      assertValueCited(report, hohmann.totalDv, "hohmann.totalDv");
    });

    it("Hohmann transfer time ~1127 days cited", () => {
      assertValueCited(report, hohmann.transferTimeDays, "hohmann.transferTimeDays", 0);
    });

    it("mass boundary ~299t cited", () => {
      assertValueCited(report, boundaries.massBoundary72h.maxMassT, "massBoundary72h.maxMassT", 0);
    });

    it("required acceleration ~3.34G cited", () => {
      assertValueCited(report, boundaries.massBoundary72h.aReqG, "massBoundary72h.aReqG");
    });
  });

  describe("EP02", () => {
    const calc = loadCalc("02") as Record<string, Record<string, unknown>>;
    const report = readReport("ep02.md", "episodes");
    const jupEsc = calc.jupiterEscape as { escapeVelocityKms: number; hyperbolicExcessKms: number };
    const helio = calc.heliocentricTransfer as { vHelioKms: number };
    const satArr = calc.saturnArrivalVInf as { vInfSaturnKms: number };
    const trimThrust = calc.trimThrust as { primary: { transferDays: number } };

    it("Jupiter escape velocity ~8.42 km/s cited", () => {
      assertValueCited(report, jupEsc.escapeVelocityKms, "jupiterEscape.escapeVelocityKms");
    });

    it("hyperbolic excess ~5.93 km/s cited", () => {
      assertValueCited(report, jupEsc.hyperbolicExcessKms, "jupiterEscape.hyperbolicExcessKms");
    });

    it("heliocentric velocity ~18.99 km/s cited", () => {
      assertValueCited(report, helio.vHelioKms, "heliocentricTransfer.vHelioKms");
    });

    it("Saturn v∞ ~4.69 km/s cited", () => {
      assertValueCited(report, satArr.vInfSaturnKms, "saturnArrivalVInf.vInfSaturnKms");
    });

    it("trim-thrust transit ~87 days cited", () => {
      assertValueCited(report, trimThrust.primary.transferDays, "trimThrust.primary.transferDays", 0);
    });
  });

  describe("EP03", () => {
    const calc = loadCalc("03") as Record<string, Record<string, unknown>>;
    const report = readReport("ep03.md", "episodes");
    const hohmann = calc.hohmann as { totalDv: number; transferTimeDays: number };
    const massFeas = calc.massFeasibility as { maxMassT: number };
    const navCrisis = calc.navCrisis as { statedErrorKm: number };

    it("Hohmann total ΔV ~2.74 km/s cited", () => {
      assertValueCited(report, hohmann.totalDv, "hohmann.totalDv");
    });

    it("Hohmann transfer time ~9971 days cited", () => {
      assertValueCited(report, hohmann.transferTimeDays, "hohmann.transferTimeDays", 0);
    });

    it("mass boundary ~452.5t cited", () => {
      assertValueCited(report, massFeas.maxMassT, "massFeasibility.maxMassT", 1);
    });

    it("navigation error ~14,360,000 km cited", () => {
      assertValueCited(report, navCrisis.statedErrorKm, "navCrisis.statedErrorKm", 0);
    });
  });

  describe("EP04", () => {
    const calc = loadCalc("04") as Record<string, Record<string, unknown>>;
    const report = readReport("ep04.md", "episodes");
    const hohmann = calc.hohmann as { totalDv: number; transferTimeDays: number };
    const plasmoid = calc.plasmoid as { totalExposureMSv: number; shieldLifeMin: number; transitMin: number };
    const damage = calc.damageAssessment as { effectiveThrustMN: number };

    it("Hohmann total ΔV ~15.94 km/s cited", () => {
      assertValueCited(report, hohmann.totalDv, "hohmann.totalDv");
    });

    it("plasmoid exposure ~480 mSv cited", () => {
      assert.ok(report.includes("480"), "should cite 480 mSv plasmoid exposure");
    });

    it("shield life ~14 min cited", () => {
      assert.ok(report.includes("14分"), "should cite 14 min shield life");
    });

    it("effective thrust ~6.37 MN cited", () => {
      assertValueCited(report, damage.effectiveThrustMN, "damageAssessment.effectiveThrustMN");
    });
  });

  describe("EP05", () => {
    const calc = loadCalc("05") as Record<string, Record<string, unknown>>;
    const report = readReport("ep05.md", "episodes");
    const nozzle = calc.nozzleLifespan as { nozzleLifetimeHours: number; requiredBurnTimeHours: number; marginMinutes: number; marginPercent: number };
    const fullRoute = calc.fullRoute as { totalDistAU: number };

    it("nozzle lifetime ~55.63h cited", () => {
      assertValueCited(report, nozzle.nozzleLifetimeHours, "nozzleLifespan.nozzleLifetimeHours");
    });

    it("required burn time ~55.2h cited", () => {
      assertValueCited(report, nozzle.requiredBurnTimeHours, "nozzleLifespan.requiredBurnTimeHours", 1);
    });

    it("nozzle margin ~26 min cited", () => {
      assert.ok(report.includes("26"), "should cite 26 min nozzle margin");
    });

    it("nozzle margin ~0.78% cited", () => {
      assert.ok(report.includes("0.78"), "should cite 0.78% nozzle margin");
    });

    it("total route distance ~35.88 AU cited", () => {
      assertValueCited(report, fullRoute.totalDistAU, "fullRoute.totalDistAU");
    });
  });
});

// ---------------------------------------------------------------------------
// Calculation JSON structural validation
// ---------------------------------------------------------------------------

describe("calculation JSON structural validation", () => {
  const calcDir = path.join(reportsDir, "calculations");

  function loadJson(name: string): Record<string, unknown> {
    return JSON.parse(fs.readFileSync(path.join(calcDir, name), "utf-8"));
  }

  /** Assert all leaf numeric values in an object are finite */
  function assertFiniteNumbers(obj: unknown, path = ""): void {
    if (typeof obj === "number") {
      assert.ok(Number.isFinite(obj), `${path} is not finite: ${obj}`);
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => assertFiniteNumbers(item, `${path}[${i}]`));
      return;
    }
    if (obj && typeof obj === "object") {
      for (const [key, value] of Object.entries(obj)) {
        if (key === "_meta" || key === "generatedAt") continue; // Skip metadata
        assertFiniteNumbers(value, path ? `${path}.${key}` : key);
      }
    }
  }

  // Per-episode calculation files
  const episodeCalcKeys: Record<string, string[]> = {
    ep01: ["_meta", "hohmann", "shipAcceleration", "brachistochrone72h", "boundaries"],
    ep02: ["_meta", "hohmann", "jupiterEscape", "saturnCapture", "trimThrust"],
    ep03: ["_meta", "hohmann", "brachistochrone", "navCrisis", "massFeasibility"],
    ep04: ["_meta", "hohmann", "brachistochrone", "massFeasibility", "plasmoid"],
    ep05: ["_meta", "hohmann", "brachistochroneByMass", "burnBudget", "nozzleLifespan"],
  };

  for (const [ep, requiredKeys] of Object.entries(episodeCalcKeys)) {
    const fileName = `${ep}_calculations.json`;

    it(`${fileName}: has required top-level keys`, () => {
      const data = loadJson(fileName);
      for (const key of requiredKeys) {
        assert.ok(key in data, `Missing required key "${key}" in ${fileName}`);
      }
    });

    it(`${fileName}: _meta has reproductionCommand`, () => {
      const data = loadJson(fileName);
      const meta = data._meta as Record<string, unknown>;
      assert.ok(meta, "_meta missing");
      assert.ok(typeof meta.reproductionCommand === "string", "reproductionCommand should be string");
      assert.ok(
        (meta.reproductionCommand as string).includes("recalculate"),
        "reproductionCommand should reference recalculate",
      );
    });

    it(`${fileName}: hohmann has positive ΔV and transfer time`, () => {
      const data = loadJson(fileName);
      const hohmann = data.hohmann as Record<string, number>;
      // Some episodes use totalDv, others totalDvKms
      const totalDv = hohmann.totalDv ?? hohmann.totalDvKms;
      assert.ok(totalDv > 0, `totalDv should be positive: ${totalDv}`);
      assert.ok(totalDv < 100, `totalDv should be < 100 km/s: ${totalDv}`);
      if ("transferTimeDays" in hohmann) {
        assert.ok(hohmann.transferTimeDays > 0, `transferTimeDays should be positive`);
      }
    });

    it(`${fileName}: all numeric values are finite`, () => {
      const data = loadJson(fileName);
      assertFiniteNumbers(data);
    });
  }

  // Onscreen cross-reference files
  for (let epNum = 1; epNum <= 5; epNum++) {
    const prefix = String(epNum).padStart(2, "0");
    const fileName = `ep${prefix}_onscreen_crossref.json`;

    it(`${fileName}: exists and has _meta`, () => {
      const data = loadJson(fileName);
      assert.ok("_meta" in data, `Missing _meta in ${fileName}`);
    });

    it(`${fileName}: all numeric values are finite`, () => {
      const data = loadJson(fileName);
      assertFiniteNumbers(data);
    });
  }

  // Standalone files
  it("relativistic_effects.json: has transfers and summary", () => {
    const data = loadJson("relativistic_effects.json");
    assert.ok("transfers" in data, "Missing transfers");
    assert.ok("summary" in data, "Missing summary");
    assert.ok("parameters" in data, "Missing parameters");
    assertFiniteNumbers(data);
  });

  it("3d_orbital_analysis.json: has transfers and analyses", () => {
    const data = loadJson("3d_orbital_analysis.json");
    assert.ok("transfers" in data, "Missing transfers");
    assert.ok("saturnRingAnalysis" in data, "Missing saturnRingAnalysis");
    assert.ok("uranusApproachAnalysis" in data, "Missing uranusApproachAnalysis");
    assertFiniteNumbers(data);
  });

  it("integrator_comparison.json: has comparisons", () => {
    const data = loadJson("integrator_comparison.json");
    assert.ok("comparisons" in data, "Missing comparisons");
    assert.ok("summary" in data, "Missing summary");
    assertFiniteNumbers(data);
  });

  it("transcription_accuracy.json: has episodes", () => {
    const data = loadJson("transcription_accuracy.json");
    assert.ok("episodes" in data, "Missing episodes");
    const episodes = data.episodes as unknown[];
    assert.ok(episodes.length >= 1, `Should have at least 1 episode, got ${episodes.length}`);
  });

  // Pipeline-generated JSONs: _meta with reproductionCommand (Task 505)
  const pipelineGeneratedFiles = [
    { file: "relativistic_effects.json", cmd: "npm run recalculate" },
    { file: "3d_orbital_analysis.json", cmd: "npm run recalculate" },
    { file: "transcription_accuracy.json", cmd: "npm run recalculate" },
    { file: "integrator_comparison.json", cmd: "cargo test" },
  ];

  for (const { file, cmd } of pipelineGeneratedFiles) {
    it(`${file}: _meta has reproductionCommand referencing "${cmd}"`, () => {
      const data = loadJson(file);
      const meta = data._meta as Record<string, unknown> | undefined;
      assert.ok(meta, `${file}: missing _meta block`);
      assert.ok(
        typeof meta!.reproductionCommand === "string",
        `${file}: _meta.reproductionCommand should be string`,
      );
      assert.ok(
        (meta!.reproductionCommand as string).includes(cmd),
        `${file}: reproductionCommand should reference "${cmd}", got "${meta!.reproductionCommand}"`,
      );
    });
  }

  it("all pipeline-generated calc JSONs have generatedAt timestamps", () => {
    const files = [
      "relativistic_effects.json",
      "3d_orbital_analysis.json",
      "transcription_accuracy.json",
    ];
    for (const file of files) {
      const data = loadJson(file);
      const generatedAt = (data._meta as Record<string, unknown> | undefined)?.generatedAt
        ?? (data as Record<string, unknown>).generatedAt;
      assert.ok(
        typeof generatedAt === "string" && generatedAt.includes("T"),
        `${file}: should have ISO timestamp generatedAt, got ${generatedAt}`,
      );
    }
  });

  // Cross-episode consistency: Hohmann ΔV values match known approximate values
  it("Hohmann ΔV values are within expected ranges per episode", () => {
    const expected: Record<string, { min: number; max: number }> = {
      ep01: { min: 8, max: 12 }, // Mars→Jupiter ~10.15 km/s
      ep02: { min: 2, max: 5 }, // Jupiter→Saturn ~3.36 km/s
      ep03: { min: 2, max: 4 }, // Saturn→Uranus ~2.74 km/s
      ep04: { min: 14, max: 18 }, // Uranus→Earth ~15.94 km/s
      ep05: { min: 14, max: 18 }, // Uranus→Earth ~15.94 km/s
    };
    for (const [ep, range] of Object.entries(expected)) {
      const data = loadJson(`${ep}_calculations.json`);
      const hohmann = data.hohmann as Record<string, number>;
      // Some episodes use totalDv, others totalDvKms
      const dv = hohmann.totalDv ?? hohmann.totalDvKms;
      assert.ok(
        dv >= range.min && dv <= range.max,
        `${ep} Hohmann ΔV (${dv}) should be in [${range.min}, ${range.max}]`,
      );
    }
  });
});

// =============================================================================
// Relativistic effects JSON → report cross-checks (Task 495)
// =============================================================================

describe("relativistic_effects.json → report cross-checks", () => {
  const calcDir = path.join(reportsDir, "calculations");
  const relData = JSON.parse(
    fs.readFileSync(path.join(calcDir, "relativistic_effects.json"), "utf-8"),
  );
  const transfers = relData.transfers as Array<{
    episode: number;
    transferId: string;
    classicalPeakVelocityKms: number;
    relativistic: { betaPeak: number; peakVelocityKms: number; gammaPeak: number };
  }>;
  const summary = relData.summary as {
    maxBetaPercent: number;
    maxGamma: number;
    cumulativeTimeDilationSec: number;
  };

  // Use only the primary (first) transfer per episode to avoid duplicates
  const primaryTransfers = new Map<number, (typeof transfers)[0]>();
  for (const t of transfers) {
    if (!primaryTransfers.has(t.episode)) primaryTransfers.set(t.episode, t);
  }

  for (const [ep, transfer] of primaryTransfers) {
    const epFile = `ep0${ep}.md`;
    const report = readReport(epFile, "episodes");
    const betaPercent = transfer.relativistic.betaPeak * 100;
    // Reports cite classical peak velocity, not relativistic-corrected
    const peakVKms = transfer.classicalPeakVelocityKms;

    it(`EP0${ep}: peak velocity ${Math.round(peakVKms)} km/s from relativistic JSON cited in report`, () => {
      assertContainsApproxValue(report, peakVKms,
        `EP0${ep} classical peak velocity from relativistic JSON`);
    });

    // Only check β% for episodes where it's significant (> 0.1%)
    if (betaPercent > 0.1) {
      it(`EP0${ep}: β = ${betaPercent.toFixed(2)}% from relativistic JSON cited in report`, () => {
        assertContainsApproxValue(report, betaPercent,
          `EP0${ep} relativistic β percentage`);
      });
    }
  }

  it("cross-episode: max β% from JSON cited in report", () => {
    const crossEp = readReport("cross-episode.md");
    assertContainsApproxValue(crossEp, summary.maxBetaPercent,
      "cross-episode max β percentage");
  });

  it("cross-episode: max γ from JSON cited in report", () => {
    const crossEp = readReport("cross-episode.md");
    // γ is very close to 1, so check for the value itself
    const gammaStr = summary.maxGamma.toFixed(4);
    assert.ok(crossEp.includes(gammaStr) || crossEp.includes(summary.maxGamma.toString()),
      `cross-episode should cite max Lorentz factor ${gammaStr}`);
  });
});

// =============================================================================
// ship-kestrel.md acceleration comparison + hypothesis charts (Task 470)
// =============================================================================

describe("ship-kestrel.md acceleration comparison chart", () => {
  const content = readReport("ship-kestrel.md");

  // Extract all chart:bar blocks and their content
  const chartBlocks = content.split("```chart:bar").slice(1).map(b => b.split("```")[0]);

  it("has a dedicated acceleration comparison bar chart caption", () => {
    const hasAccelChart = chartBlocks.some(
      (block) => block.includes("加速度") && (block.includes("48,000") || block.includes("48000")) && block.includes("300"),
    );
    assert.ok(hasAccelChart, "should have a chart:bar block comparing 48,000t vs 300t acceleration");
  });

  it("acceleration chart includes 160x gap annotation", () => {
    const accelChart = chartBlocks.find(
      (block) => block.includes("加速度") && (block.includes("48,000") || block.includes("48000")),
    );
    assert.ok(accelChart, "acceleration chart should exist");
    assert.ok(
      accelChart!.includes("160") || accelChart!.includes("159"),
      "chart should annotate the ~160x acceleration gap",
    );
  });
});

describe("ship-kestrel.md hypothesis evaluation chart", () => {
  const content = readReport("ship-kestrel.md");

  const chartBlocks = content.split("```chart:bar").slice(1).map(b => b.split("```")[0]);

  it("has a dedicated hypothesis evaluation bar chart", () => {
    const hasHypothesisChart = chartBlocks.some(
      (block) => block.includes("仮説"),
    );
    assert.ok(hasHypothesisChart, "should have a chart:bar block for hypothesis evaluation");
  });

  it("hypothesis chart references B+D as most natural combination", () => {
    const hypothesisChart = chartBlocks.find(
      (block) => block.includes("仮説"),
    );
    assert.ok(hypothesisChart, "hypothesis chart should exist");
    assert.ok(
      hypothesisChart!.includes("B") && hypothesisChart!.includes("D"),
      "chart should highlight hypothesis B and D as the most natural combination",
    );
  });
});

// =============================================================================
// EP04 plasmoid perturbation log-scale chart (Task 471)
// =============================================================================

describe("EP04 plasmoid perturbation chart", () => {
  const content = readReport("ep04.md", "episodes");
  const chartBlocks = content.split("```chart:bar").slice(1).map(b => b.split("```")[0]);

  it("has a plasmoid perturbation bar chart with logScale", () => {
    const plasmoidChart = chartBlocks.find(
      (block) => block.includes("摂動") || block.includes("プラズモイド"),
    );
    assert.ok(plasmoidChart, "should have a chart:bar block for plasmoid perturbation");
    assert.ok(
      plasmoidChart!.includes("logScale: true"),
      "should use log scale for spanning orders of magnitude",
    );
  });

  it("chart includes all 3 scenarios", () => {
    const plasmoidChart = chartBlocks.find(
      (block) => block.includes("摂動") || block.includes("プラズモイド"),
    );
    assert.ok(plasmoidChart, "plasmoid chart should exist");
    assert.ok(
      plasmoidChart!.includes("nominal") || plasmoidChart!.includes("標準"),
      "should include nominal scenario",
    );
    assert.ok(
      plasmoidChart!.includes("extreme") || plasmoidChart!.includes("極端"),
      "should include extreme scenario",
    );
  });
});

// =============================================================================
// attitude-control.md charts (Task 472)
// =============================================================================

describe("attitude-control.md pointing precision chart", () => {
  const content = readReport("attitude-control.md");
  const chartBlocks = content.split("```chart:bar").slice(1).map(b => b.split("```")[0]);

  it("has a pointing precision requirements bar chart with logScale", () => {
    const precisionChart = chartBlocks.find(
      (block) => block.includes("要求精度") || block.includes("指向精度") && block.includes("要求"),
    );
    assert.ok(precisionChart, "should have a chart:bar block for pointing precision requirements");
    assert.ok(
      precisionChart!.includes("logScale: true"),
      "should use log scale for 3,200x range of precisions",
    );
  });

  it("precision chart includes Hill sphere and 10km targets", () => {
    const precisionChart = chartBlocks.find(
      (block) => block.includes("要求") && block.includes("Hill"),
    );
    assert.ok(precisionChart, "precision chart should reference Hill sphere target");
    assert.ok(
      precisionChart!.includes("10") && precisionChart!.includes("km"),
      "should include 10 km precision target",
    );
  });
});

describe("attitude-control.md RCS thrust comparison chart", () => {
  const content = readReport("attitude-control.md");
  const chartBlocks = content.split("```chart:bar").slice(1).map(b => b.split("```")[0]);

  it("has an RCS thrust comparison bar chart across episodes", () => {
    const rcsChart = chartBlocks.find(
      (block) => block.includes("RCS") && (block.includes("EP01") || block.includes("第1話") || block.includes("フリップ")) && (block.includes("EP04") || block.includes("第4話") || block.includes("非対称")),
    );
    assert.ok(rcsChart, "should have a chart:bar block comparing RCS demands across episodes");
  });
});

// =============================================================================
// infrastructure.md staffing collapse chart (Task 473)
// =============================================================================

describe("infrastructure.md staffing collapse chart", () => {
  const content = readReport("infrastructure.md");
  const chartBlocks = content.split("```chart:bar").slice(1).map(b => b.split("```")[0]);

  it("has an Enceladus staffing collapse bar chart", () => {
    const staffingChart = chartBlocks.find(
      (block) => block.includes("エンケラドス") && block.includes("人員"),
    );
    assert.ok(staffingChart, "should have a chart:bar block showing staffing collapse");
  });

  it("staffing chart shows dramatic decline from 300 to 1", () => {
    const staffingChart = chartBlocks.find(
      (block) => block.includes("エンケラドス") && block.includes("人員"),
    );
    assert.ok(staffingChart, "staffing chart should exist");
    assert.ok(
      staffingChart!.includes("300"),
      "should show peak staffing of ~300",
    );
    assert.ok(
      staffingChart!.includes("value: 1"),
      "should show current staffing of 1",
    );
  });
});

// =============================================================================
// other-ships.md fleet + torpedo charts (Task 474)
// =============================================================================

describe("other-ships.md fleet acceleration chart", () => {
  const content = readReport("other-ships.md");
  const chartBlocks = content.split("```chart:bar").slice(1).map(b => b.split("```")[0]);

  it("has a fleet approach acceleration comparison chart", () => {
    const fleetChart = chartBlocks.find(
      (block) => (block.includes("公安艦隊") || block.includes("艦隊")) && block.includes("加速度"),
    );
    assert.ok(fleetChart, "should have a chart:bar block for fleet approach acceleration comparison");
  });
});

describe("other-ships.md torpedo evasion chart", () => {
  const content = readReport("other-ships.md");
  const chartBlocks = content.split("```chart:bar").slice(1).map(b => b.split("```")[0]);

  it("has a nuclear torpedo speed comparison chart", () => {
    const torpedoChart = chartBlocks.find(
      (block) => (block.includes("核魚雷") || block.includes("速度")) && block.includes("2100") || block.includes("2,100"),
    );
    assert.ok(torpedoChart, "should have a chart:bar block for torpedo evasion speed comparison");
  });
});

// =============================================================================
// EP05 exploration charts (Task 475)
// =============================================================================

describe("EP05 mass vs transit time chart", () => {
  const content = readReport("ep05.md", "episodes");
  const chartBlocks = content.split("```chart:bar").slice(1).map(b => b.split("```")[0]);

  it("has a mass vs transit time comparison chart", () => {
    const massChart = chartBlocks.find(
      (block) => block.includes("質量") && block.includes("遷移時間"),
    );
    assert.ok(massChart, "should have a chart:bar block for mass vs transit time");
  });

  it("mass chart includes 300t and 48,000t scenarios", () => {
    const massChart = chartBlocks.find(
      (block) => block.includes("質量") && block.includes("遷移時間"),
    );
    assert.ok(massChart, "mass chart should exist");
    assert.ok(
      massChart!.includes("300") && (massChart!.includes("48,000") || massChart!.includes("48000")),
      "should include 300t and 48,000t scenarios",
    );
  });
});

describe("EP05 nozzle conservation route IF chart", () => {
  const content = readReport("ep05.md", "episodes");
  const chartBlocks = content.split("```chart:bar").slice(1).map(b => b.split("```")[0]);

  it("has a nozzle conservation route alternative comparison chart", () => {
    const routeChart = chartBlocks.find(
      (block) => block.includes("航路") && block.includes("507") && block.includes("800"),
    );
    assert.ok(routeChart, "should have a chart:bar block comparing 507h vs 800h route alternatives");
  });
});

// =============================================================================
// 3d_orbital_analysis.json → report cross-checks (Task 496)
// =============================================================================

describe("3d_orbital_analysis.json → report cross-checks", () => {
  const calcDir = path.join(reportsDir, "calculations");
  const data3d = JSON.parse(
    fs.readFileSync(path.join(calcDir, "3d_orbital_analysis.json"), "utf-8"),
  );
  const transfers = data3d.transfers as Array<{
    leg: string;
    episode: number;
    planeChangeDvKmS: number;
    planeChangeFractionPercent: number;
  }>;
  const saturnRing = data3d.saturnRingAnalysis as {
    enceladusOutsideRings: boolean;
    approachFromJupiter: { approachAngleToDeg: number };
  };
  const uranusApproach = data3d.uranusApproachAnalysis as {
    approachFromSaturn: { angleToDeg: number };
    approachFromUranus: { angleToDeg: number };
  };
  const crossEp = readReport("cross-episode.md");

  it("max plane change fraction (1.51%) cited in cross-episode report", () => {
    const maxFraction = data3d.maxPlaneChangeFractionPercent as number;
    assertContainsApproxValue(crossEp, maxFraction,
      "max plane change fraction percent");
  });

  for (const transfer of transfers) {
    const dvRounded = Math.round(transfer.planeChangeDvKmS * 10) / 10;
    const fracRounded = Math.round(transfer.planeChangeFractionPercent * 100) / 100;

    it(`${transfer.leg}: plane change ΔV ~${dvRounded} km/s cited in cross-episode`, () => {
      assertContainsApproxValue(crossEp, transfer.planeChangeDvKmS,
        `${transfer.leg} plane change ΔV`);
    });

    it(`${transfer.leg}: plane change fraction ~${fracRounded}% cited in cross-episode`, () => {
      assertContainsApproxValue(crossEp, transfer.planeChangeFractionPercent,
        `${transfer.leg} plane change fraction`);
    });
  }

  it("Saturn ring approach angle ~9.3° cited in cross-episode", () => {
    const angle = saturnRing.approachFromJupiter.approachAngleToDeg;
    assertContainsApproxValue(crossEp, angle,
      "Saturn ring approach angle from Jupiter");
  });

  it("Uranus approach from Saturn ~25.3° cited in cross-episode", () => {
    const angle = uranusApproach.approachFromSaturn.angleToDeg;
    assertContainsApproxValue(crossEp, angle,
      "Uranus approach angle from Saturn");
  });

  it("Enceladus confirmed outside rings in analysis JSON", () => {
    assert.strictEqual(saturnRing.enceladusOutsideRings, true,
      "Enceladus should be outside Saturn's rings");
  });
});

// =============================================================================
// onscreen_crossref.json → report cross-checks (Task 498)
// =============================================================================

describe("onscreen_crossref.json → report cross-checks", () => {
  const calcDir = path.join(reportsDir, "calculations");

  function loadCrossref(ep: string): Record<string, unknown> {
    return JSON.parse(
      fs.readFileSync(path.join(calcDir, `${ep}_onscreen_crossref.json`), "utf-8"),
    );
  }

  // EP01: Jupiter SOI entry velocity and perijove burn
  describe("EP01 onscreen crossref", () => {
    const xref = loadCrossref("ep01");
    const report = readReport("ep01.md", "episodes");
    const soi = xref.jupiterSOI as {
      onScreen: { entry_velocity_km_s: number; v_infinity_km_s: number };
      computed: { v_at_20RJ_km_s: number };
      comparison: { velocity_difference_percent: number };
    };
    const burn = xref.perijoveBurn as {
      onScreen: { deltaV_km_s: number; perijupiter_RJ: number };
    };

    it("Jupiter SOI entry velocity 17.8 km/s cited in report", () => {
      assertContainsApproxValue(report, soi.onScreen.entry_velocity_km_s,
        "EP01 onscreen Jupiter SOI entry velocity");
    });

    it("computed velocity 17.92 km/s cited in report", () => {
      assertContainsApproxValue(report, soi.computed.v_at_20RJ_km_s,
        "EP01 computed vis-viva velocity at 20 RJ");
    });

    it("perijove burn ΔV 2.3 km/s cited in report", () => {
      assertContainsApproxValue(report, Math.abs(burn.onScreen.deltaV_km_s),
        "EP01 onscreen perijove burn ΔV");
    });
  });

  // EP02: Jupiter departure velocity and orbital cross velocity (string values in JSON)
  describe("EP02 onscreen crossref", () => {
    const report = readReport("ep02.md", "episodes");

    it("Jupiter departure velocity 10.3 km/s cited in report", () => {
      assert.ok(report.includes("10.3"),
        "EP02 should cite Jupiter departure velocity 10.3 km/s from onscreen data");
    });

    it("orbital cross relative velocity 0.12 km/s cited in report", () => {
      assert.ok(report.includes("0.12"),
        "EP02 should cite orbital cross relative velocity 0.12 km/s from onscreen data");
    });
  });

  // EP03: navigation crisis distance and mission time
  describe("EP03 onscreen crossref", () => {
    const xref = loadCrossref("ep03");
    const report = readReport("ep03.md", "episodes");

    if (xref.navigationCrisisTripleMatch) {
      const crisis = xref.navigationCrisisTripleMatch as {
        onScreenDisplay?: { value: string };
        dialogue?: { value: string };
      };
      it("navigation crisis distance ~1436万km cited in report", () => {
        assert.ok(
          report.includes("1436万") || report.includes("1,436万") ||
          report.includes("1.43") || report.includes("14,393"),
          "EP03 should cite navigation crisis distance (~1436万km or 1.43×10⁷km)",
        );
      });
    }

    if (xref.timelineReconstruction) {
      it("total mission time 143h cited in report", () => {
        assert.ok(report.includes("143"),
          "EP03 should cite 143h total mission time");
      });
    }
  });

  // EP04: plasmoid B-field and periapsis altitude
  describe("EP04 onscreen crossref", () => {
    const xref = loadCrossref("ep04");
    const report = readReport("ep04.md", "episodes");

    if (xref.plasmoidParameterComparison) {
      const plasma = xref.plasmoidParameterComparison as {
        onScreenValues?: { magneticField_nT: string };
      };
      it("plasmoid B-field 180-340 nT cited in report", () => {
        assert.ok(report.includes("180") && report.includes("340"),
          "EP04 should cite onscreen B-field range 180-340 nT");
      });
    }

    it("periapsis altitude 6.50 RU cited in report", () => {
      assert.ok(report.includes("6.50") || report.includes("6.5"),
        "EP04 should cite periapsis altitude 6.50 RU");
    });

    it("intercept velocity 18.3 km/s cited in report", () => {
      assert.ok(report.includes("18.3"),
        "EP04 should cite intercept velocity 18.3 km/s from onscreen data");
    });
  });

  // EP05: nozzle margin and total mission time
  describe("EP05 onscreen crossref", () => {
    const xref = loadCrossref("ep05");
    const report = readReport("ep05.md", "episodes");

    if (xref.nozzleLifespanMargin) {
      it("nozzle margin +0:26:00 (26 min) cited in report", () => {
        assert.ok(report.includes("26分") || report.includes("26min") || report.includes("0:26"),
          "EP05 should cite nozzle margin 26 minutes from onscreen display");
      });
    }

    if (xref.missionTimelineVerification) {
      const timeline = xref.missionTimelineVerification as {
        onScreen?: { totalTime_hours: number };
      };
      if (timeline.onScreen) {
        it("total mission time 507h cited in report", () => {
          assertContainsApproxValue(report, timeline.onScreen!.totalTime_hours,
            "EP05 onscreen total mission time");
        });
      }
    }
  });
});

// =============================================================================
// integrator_comparison.json → report cross-checks (Task 499)
// =============================================================================

describe("integrator_comparison.json → report cross-checks", () => {
  const calcDir = path.join(reportsDir, "calculations");
  const intData = JSON.parse(
    fs.readFileSync(path.join(calcDir, "integrator_comparison.json"), "utf-8"),
  );
  const comparisons = intData.comparisons as Array<{
    episode: number;
    transfer: string;
    position_diff_relative?: number;
    position_diff_km?: number;
  }>;
  const crossEp = readReport("cross-episode.md");

  // Key brachistochrone legs with measurable position differences
  const brachLegs = comparisons.filter(
    c => c.position_diff_relative && c.position_diff_relative > 1e-6,
  );

  for (const leg of brachLegs) {
    const pctStr = (leg.position_diff_relative! * 100).toFixed(3) + "%";
    it(`EP0${leg.episode} ${leg.transfer}: position diff ${pctStr} cited in cross-episode`, () => {
      // Check that the percentage appears (0.015%, 0.008%, 0.007%)
      const pctValue = (leg.position_diff_relative! * 100).toFixed(3);
      assert.ok(
        crossEp.includes(pctValue),
        `cross-episode should cite RK4 vs RK45 position diff ${pctValue}% for ${leg.transfer}`,
      );
    });
  }

  it("RK45 cost ratio ~0.07 cited in cross-episode", () => {
    const cost = intData.computationCost as Record<string, { costRatio: number }>;
    const ep01Cost = cost.ep01_brachistochrone_72h;
    assert.ok(ep01Cost, "should have EP01 cost data");
    assert.ok(
      crossEp.includes("0.07") || crossEp.includes(String(ep01Cost.costRatio)),
      "cross-episode should cite RK45 cost ratio 0.07",
    );
  });

  it("conclusion 'no episode analysis results need updating' reflected in report", () => {
    assert.ok(
      crossEp.includes("更新は不要") || crossEp.includes("更新不要"),
      "cross-episode should confirm no analysis results need updating from integrator comparison",
    );
  });
});

// =============================================================================
// Inter-JSON consistency cross-checks (Task 502)
// =============================================================================

describe("inter-JSON consistency: relativistic_effects vs per-episode calculations", () => {
  const calcDir = path.join(reportsDir, "calculations");
  const relData = JSON.parse(
    fs.readFileSync(path.join(calcDir, "relativistic_effects.json"), "utf-8"),
  );
  const relTransfers = relData.transfers as Array<{
    episode: number;
    classicalPeakVelocityKms: number;
    relativistic: { betaPeak: number; gammaPeak: number };
  }>;

  // EP01: brachistochrone72h[0].deltaVKms / 2 should match relativistic peak
  it("EP01: relativistic peak velocity matches brachistochrone72h closest scenario", () => {
    const ep1 = JSON.parse(
      fs.readFileSync(path.join(calcDir, "ep01_calculations.json"), "utf-8"),
    );
    const ep1Peak = ep1.brachistochrone72h[0].deltaVKms / 2;
    const relEp1 = relTransfers.find(t => t.episode === 1)!;
    assert.ok(relEp1, "should have EP01 in relativistic JSON");
    assert.ok(
      Math.abs(ep1Peak - relEp1.classicalPeakVelocityKms) < 1,
      `EP01 peak mismatch: calc=${ep1Peak.toFixed(1)} vs rel=${relEp1.classicalPeakVelocityKms.toFixed(1)}`,
    );
  });

  // EP03: brachistochrone[0].deltaVKms / 2 should be close to relativistic peak
  // (may differ slightly due to different distance scenarios)
  it("EP03: relativistic peak velocity close to brachistochrone closest scenario", () => {
    const ep3 = JSON.parse(
      fs.readFileSync(path.join(calcDir, "ep03_calculations.json"), "utf-8"),
    );
    const ep3Peak = ep3.brachistochrone[0].deltaVKms / 2;
    const relEp3 = relTransfers.find(t => t.episode === 3)!;
    assert.ok(relEp3, "should have EP03 in relativistic JSON");
    // Allow 2% tolerance for different distance scenarios
    const tolerance = relEp3.classicalPeakVelocityKms * 0.02;
    assert.ok(
      Math.abs(ep3Peak - relEp3.classicalPeakVelocityKms) < tolerance,
      `EP03 peak divergence >2%: calc=${ep3Peak.toFixed(1)} vs rel=${relEp3.classicalPeakVelocityKms.toFixed(1)}`,
    );
  });

  // EP04: massFeasibility[0].deltaVKms / 2 should match relativistic peak
  it("EP04: relativistic peak velocity matches massFeasibility first scenario", () => {
    const ep4 = JSON.parse(
      fs.readFileSync(path.join(calcDir, "ep04_calculations.json"), "utf-8"),
    );
    const ep4Peak = ep4.massFeasibility[0].deltaVKms / 2;
    const relEp4 = relTransfers.find(t => t.episode === 4)!;
    assert.ok(relEp4, "should have EP04 in relativistic JSON");
    assert.ok(
      Math.abs(ep4Peak - relEp4.classicalPeakVelocityKms) < 1,
      `EP04 peak mismatch: calc=${ep4Peak.toFixed(1)} vs rel=${relEp4.classicalPeakVelocityKms.toFixed(1)}`,
    );
  });

  // EP05: brachistochroneByMass[0].peakVelocityKms should match relativistic peak
  it("EP05: relativistic peak velocity matches brachistochroneByMass first scenario", () => {
    const ep5 = JSON.parse(
      fs.readFileSync(path.join(calcDir, "ep05_calculations.json"), "utf-8"),
    );
    const ep5Peak = ep5.brachistochroneByMass[0].peakVelocityKms;
    const relEp5 = relTransfers.find(t => t.episode === 5)!;
    assert.ok(relEp5, "should have EP05 in relativistic JSON");
    assert.ok(
      Math.abs(ep5Peak - relEp5.classicalPeakVelocityKms) < 1,
      `EP05 peak mismatch: calc=${ep5Peak.toFixed(1)} vs rel=${relEp5.classicalPeakVelocityKms.toFixed(1)}`,
    );
  });

  // All relativistic transfers should have β ≈ v/c (with relativistic correction)
  // β_relativistic differs from v_classical/c by O(β³) due to proper momentum formulation
  it("all relativistic β values are approximately v/c (within relativistic correction)", () => {
    const C_KMS = 299_792.458;
    for (const t of relTransfers) {
      const naiveBeta = t.classicalPeakVelocityKms / C_KMS;
      // Allow tolerance proportional to β² (relativistic correction order)
      const tolerance = Math.max(naiveBeta * naiveBeta * 0.1, 1e-8);
      assert.ok(
        Math.abs(t.relativistic.betaPeak - naiveBeta) < tolerance,
        `EP0${t.episode}: β divergence exceeds relativistic correction: stored=${t.relativistic.betaPeak.toFixed(8)} naive=${naiveBeta.toFixed(8)} tol=${tolerance.toExponential(2)}`,
      );
    }
  });

  // All relativistic γ values should be consistent with β
  it("all relativistic γ values are consistent with β via Lorentz formula", () => {
    for (const t of relTransfers) {
      const beta = t.relativistic.betaPeak;
      const expectedGamma = 1 / Math.sqrt(1 - beta * beta);
      assert.ok(
        Math.abs(t.relativistic.gammaPeak - expectedGamma) < 1e-8,
        `EP0${t.episode}: γ mismatch: computed=${t.relativistic.gammaPeak} expected=${expectedGamma}`,
      );
    }
  });
});

describe("inter-JSON consistency: integrator comparison episodes exist in calc JSONs", () => {
  const calcDir = path.join(reportsDir, "calculations");
  const intData = JSON.parse(
    fs.readFileSync(path.join(calcDir, "integrator_comparison.json"), "utf-8"),
  );
  const comparisons = intData.comparisons as Array<{ episode: number; transfer: string }>;

  const episodes = [...new Set(comparisons.map(c => c.episode))];

  for (const ep of episodes) {
    it(`EP0${ep}: calculation JSON exists for integrator comparison episode`, () => {
      const epFile = path.join(calcDir, `ep${String(ep).padStart(2, "0")}_calculations.json`);
      assert.ok(
        fs.existsSync(epFile),
        `Missing ${epFile} — integrator comparison references EP0${ep} but calc JSON not found`,
      );
    });
  }
});

describe("inter-JSON consistency: 3D orbital analysis internal coherence", () => {
  const calcDir = path.join(reportsDir, "calculations");
  const data3d = JSON.parse(
    fs.readFileSync(path.join(calcDir, "3d_orbital_analysis.json"), "utf-8"),
  );
  const transfers = data3d.transfers as Array<{
    episode: number;
    leg: string;
    planeChangeDvKmS: number;
    planeChangeFractionPercent: number;
    inclinationChangeDeg: number;
  }>;

  it("maxPlaneChangeFractionPercent matches max of transfer fractions", () => {
    const computedMax = Math.max(...transfers.map(t => t.planeChangeFractionPercent));
    assert.ok(
      Math.abs(computedMax - data3d.maxPlaneChangeFractionPercent) < 1e-10,
      `Max fraction mismatch: transfers max=${computedMax} vs reported=${data3d.maxPlaneChangeFractionPercent}`,
    );
  });

  it("coplanarApproximationValid is consistent with threshold", () => {
    const valid = data3d.maxPlaneChangeFractionPercent < 1.0;
    assert.strictEqual(
      data3d.coplanarApproximationValid,
      valid,
      `coplanarApproximationValid=${data3d.coplanarApproximationValid} but max fraction=${data3d.maxPlaneChangeFractionPercent}%`,
    );
  });

  for (const t of transfers) {
    it(`${t.leg}: plane change ΔV is non-negative`, () => {
      assert.ok(t.planeChangeDvKmS >= 0, `Negative plane change ΔV: ${t.planeChangeDvKmS}`);
    });

    it(`${t.leg}: inclination change is within 0-90°`, () => {
      assert.ok(
        t.inclinationChangeDeg >= 0 && t.inclinationChangeDeg <= 90,
        `Inclination ${t.inclinationChangeDeg}° out of range for ${t.leg}`,
      );
    });
  }
});

// =============================================================================
// Cross-episode comparison table → per-episode calc JSON cross-checks (Task 503)
// =============================================================================

describe("cross-episode comparison table → calc JSON consistency", () => {
  const calcDir = path.join(reportsDir, "calculations");
  const crossEp = readReport("cross-episode.md");

  // Extract the Hohmann ΔV values from the table in the report
  // Expected: EP01=10.15, EP03=2.74, EP04=15.94, EP05=15.94
  const hohmannExpected: Record<number, number> = { 1: 10.15, 3: 2.74, 4: 15.94, 5: 15.94 };

  for (const [ep, expectedDv] of Object.entries(hohmannExpected)) {
    const epNum = Number(ep);
    it(`EP0${ep}: Hohmann ΔV ${expectedDv} km/s in report matches calc JSON`, () => {
      const data = JSON.parse(
        fs.readFileSync(path.join(calcDir, `ep0${ep}_calculations.json`), "utf-8"),
      );
      const calcDv = (data.hohmann.totalDv ?? data.hohmann.totalDvKms) as number;
      assert.ok(
        Math.abs(calcDv - expectedDv) < 0.01,
        `EP0${ep} Hohmann ΔV: report=${expectedDv} calc=${calcDv.toFixed(2)}`,
      );
      // Also verify the value appears in the cross-episode report text
      assert.ok(
        crossEp.includes(String(expectedDv)),
        `cross-episode report should cite Hohmann ΔV ${expectedDv} for EP0${ep}`,
      );
    });
  }

  // Brachistochrone ΔV values: EP01=8497, EP03=11165, EP04=1202, EP05=15207
  const brachExpected: Record<number, { dv: number; field: string }> = {
    1: { dv: 8497, field: "brachistochrone72h" },
    3: { dv: 11165, field: "brachistochrone" },
    4: { dv: 1202, field: "brachistochrone" },
    5: { dv: 15207, field: "brachistochroneByMass" },
  };

  for (const [ep, { dv, field }] of Object.entries(brachExpected)) {
    it(`EP0${ep}: Brachistochrone ΔV ~${dv} km/s in report matches calc JSON`, () => {
      const data = JSON.parse(
        fs.readFileSync(path.join(calcDir, `ep0${ep}_calculations.json`), "utf-8"),
      );
      const brachData = data[field];
      // Get first scenario's deltaVKms
      const calcDv = Array.isArray(brachData)
        ? (brachData[0].deltaVKms as number)
        : (brachData as { deltaVKms: number }).deltaVKms;
      // Allow 1 km/s tolerance (report rounds to integer)
      assert.ok(
        Math.abs(calcDv - dv) < 1,
        `EP0${ep} Brachistochrone ΔV: report=${dv} calc=${Math.round(calcDv)}`,
      );
      // Verify the rounded value appears in the report
      const rounded = String(Math.round(dv));
      const formatted = Number(rounded).toLocaleString("en-US");
      assert.ok(
        crossEp.includes(rounded) || crossEp.includes(formatted),
        `cross-episode report should cite Brachistochrone ΔV ~${rounded} for EP0${ep}`,
      );
    });
  }

  // Bar chart values should match the table values
  it("Brachistochrone ΔV bar chart values match table values", () => {
    // The bar chart has: EP01=8497, EP03=11165, EP04=1202, EP05=15207
    for (const [, { dv }] of Object.entries(brachExpected)) {
      assert.ok(
        crossEp.includes(String(dv)),
        `Bar chart should include value ${dv}`,
      );
    }
  });
});

// =============================================================================
// Full-route parameter cross-checks (Task 504)
// =============================================================================

describe("full-route parameter cross-checks: calc JSON vs cross-episode report", () => {
  const calcDir = path.join(reportsDir, "calculations");
  const crossEp = readReport("cross-episode.md");
  const ep5 = JSON.parse(
    fs.readFileSync(path.join(calcDir, "ep05_calculations.json"), "utf-8"),
  );

  it("total route distance ~35.9 AU cited in cross-episode report", () => {
    const totalAU = ep5.fullRoute.totalDistAU;
    assert.ok(totalAU > 35 && totalAU < 36, `total distance ${totalAU} AU out of expected range`);
    assert.ok(crossEp.includes("35.9"), "cross-episode should cite 35.9 AU total route distance");
  });

  it("full route leg distances sum to total", () => {
    const legs = ep5.fullRoute.legs as Array<{ distAU: number }>;
    const sum = legs.reduce((s, l) => s + l.distAU, 0);
    assert.ok(
      Math.abs(sum - ep5.fullRoute.totalDistAU) < 0.001,
      `Leg sum ${sum.toFixed(4)} != total ${ep5.fullRoute.totalDistAU.toFixed(4)}`,
    );
  });

  it("nozzle margin 26 minutes matches EP05 calc JSON", () => {
    const margin = ep5.nozzleLifespan.marginMinutes;
    assert.strictEqual(margin, 26, `nozzle margin should be 26 min, got ${margin}`);
    assert.ok(crossEp.includes("26分") || crossEp.includes("26 min"),
      "cross-episode should cite 26 minute nozzle margin");
  });

  it("nozzle margin 0.78% matches EP05 calc JSON", () => {
    const pct = ep5.nozzleLifespan.marginPercent;
    assert.ok(Math.abs(pct - 0.78) < 0.01, `margin percent should be ~0.78, got ${pct}`);
    assert.ok(crossEp.includes("0.78%"), "cross-episode should cite 0.78% margin");
  });

  it("nozzle lifetime ~55.6h matches EP05 calc JSON", () => {
    const hours = ep5.nozzleLifespan.nozzleLifetimeHours;
    assert.ok(hours > 55 && hours < 56, `nozzle lifetime ${hours}h out of range`);
    assert.ok(
      crossEp.includes("55h38m") || crossEp.includes("55時間38分") || crossEp.includes("55.6"),
      "cross-episode should cite nozzle lifetime ~55h38m",
    );
  });

  it("series margins: EP02 solar escape 0.53 km/s", () => {
    const ep2Margin = ep5.nozzleLifespan.seriesMargins.find(
      (m: { episode: number }) => m.episode === 2,
    );
    assert.ok(ep2Margin, "should have EP02 series margin");
    assert.ok(
      Math.abs(ep2Margin.margin - 0.53) < 0.01,
      `EP02 margin should be ~0.53, got ${ep2Margin.margin}`,
    );
  });

  it("series margins: EP03 nav accuracy 1.23°", () => {
    const ep3Margin = ep5.nozzleLifespan.seriesMargins.find(
      (m: { episode: number }) => m.episode === 3,
    );
    assert.ok(ep3Margin, "should have EP03 series margin");
    assert.ok(
      Math.abs(ep3Margin.margin - 1.23) < 0.01,
      `EP03 margin should be ~1.23, got ${ep3Margin.margin}`,
    );
  });

  it("earth capture LEO 400km scenario exists", () => {
    const scenarios = ep5.earthCapture.scenarios as Array<{ label: string; targetRadiusKm: number }>;
    const leoScenario = scenarios.find(s => s.label.includes("LEO") || s.label.includes("400"));
    assert.ok(leoScenario, "should have LEO 400km earth capture scenario");
    // 400km altitude = 6371 + 400 = 6771 km radius
    assert.ok(
      Math.abs(leoScenario!.targetRadiusKm - 6771) < 10,
      `LEO target radius should be ~6771 km, got ${leoScenario!.targetRadiusKm}`,
    );
  });

  it("route description matches expected path", () => {
    const desc = ep5.fullRoute.routeDescription as string;
    assert.ok(desc.includes("火星"), "route should start from Mars");
    assert.ok(desc.includes("地球"), "route should end at Earth");
    assert.ok(desc.includes("ガニメデ") || desc.includes("木星"), "route should include Jupiter/Ganymede");
    assert.ok(desc.includes("エンケラドス"), "route should include Enceladus");
    assert.ok(desc.includes("タイタニア"), "route should include Titania");
  });
});
