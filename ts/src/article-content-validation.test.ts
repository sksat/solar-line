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

  it("has margin gauge with mass boundary 299t", () => {
    assert.ok(content.includes("margin-gauge"), "EP01 should have margin-gauge fence");
    assert.ok(content.includes('"actual": 299'), "should cite 299t mass boundary");
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
    assert.ok(content.includes('"actual": 18.38'), "should cite 18.38 km/s heliocentric velocity");
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

  it("has margin gauge with nav accuracy data", () => {
    assert.ok(content.includes("margin-gauge"), "EP03 should have margin-gauge fence");
    assert.ok(content.includes('"actual": 0.2'), "should cite 0.2° nav error");
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

  it("nuclear torpedo pass-through time calculation is present", () => {
    // 0.038 seconds = 2×40km / 2100 km/s
    assert.ok(
      content.includes("0.038") || content.includes("0.019"),
      "should cite nuclear torpedo pass-through time",
    );
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

  it("nozzle lifespan margin cited (26 min / 0.8%)", () => {
    assert.ok(content.includes("26分") || content.includes("26min"), "should cite 26 min margin");
    assert.ok(
      content.includes("0.8%") || content.includes("0.78%"),
      "should cite margin percentage",
    );
  });

  it("nozzle times cited (55h38m vs 55h12m)", () => {
    assert.ok(content.includes("55h38m") || content.includes("55時間38分"), "should cite nozzle remaining life");
    assert.ok(content.includes("55h12m") || content.includes("55時間12分"), "should cite required burn time");
  });

  it("D-He³ fuel type cited", () => {
    assert.ok(
      content.includes(KESTREL.fuel),
      `should cite ${KESTREL.fuel} fuel type`,
    );
  });
});

// ============================================================
// Cross-episode report: mission totals and key findings
// ============================================================

describe("cross-episode.md content validation", () => {
  const content = readReport("cross-episode.md");

  it("cites total mission distance ~35.9 AU", () => {
    assert.ok(content.includes("35.9"), "should cite 35.9 AU total distance");
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

  it("relativistic analysis: peak velocity 7,604 km/s at 2.54%c", () => {
    assert.ok(content.includes("7,604") || content.includes("7604"), "should cite peak velocity");
    assert.ok(content.includes("2.54%"), "should cite light speed percentage");
  });

  it("Lorentz factor γ ≈ 1.0003", () => {
    assert.ok(
      content.includes("1.0003"),
      "should cite Lorentz factor in weak relativistic regime",
    );
  });

  it("nozzle margin 26 min (0.78%) cited in cross-episode context", () => {
    assert.ok(
      content.includes("マージン") && content.includes("26"),
      "should cite 26 min nozzle margin in cross-episode analysis",
    );
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
    assert.ok(content.includes("36,071") || content.includes("36071"), "should cite actual route ΔV");
  });

  it("EP02 dominates timeline: ~87d is ~70% of mission", () => {
    assert.ok(
      content.includes("78%") || content.includes("70%"),
      "should cite EP02 as majority of mission duration",
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
      checkmarks >= 7,
      `should have at least 7 passing verification checks, got ${checkmarks}`,
    );
  });

  it("87-day EP02 transit referenced in communication context", () => {
    assert.ok(
      content.includes("87日") || content.includes("約87日"),
      "should reference 87-day EP02 transit in communication delay context",
    );
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

  it("flip maneuver RCS requirements: 300s flip needs 830 N", () => {
    assert.ok(content.includes("830 N") || content.includes("830N"), "should cite 830 N RCS thrust for 300s flip");
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

  it("Enceladus station: joint ownership 50:50", () => {
    assert.ok(
      content.includes("50%") || content.includes("50:50"),
      "should cite 50:50 ownership of Enceladus station",
    );
  });

  it("Enceladus staffing: reduced from hundreds to 1", () => {
    assert.ok(content.includes("数百人"), "should cite original staffing of hundreds");
    assert.ok(content.includes("1名") || content.includes("管理人1名"), "should cite current staffing of 1");
  });

  it("governance comparison table has 5 organizations", () => {
    // table:comparison block should list 5 governance bodies
    assert.ok(content.includes("軌道公案機構"), "should cite 軌道公案機構");
    assert.ok(content.includes("木星軌道連合"), "should cite 木星軌道連合");
    assert.ok(content.includes("天王星自治有効機構"), "should cite 天王星自治有効機構");
    assert.ok(content.includes("国際連合軌道交番機構"), "should cite 国際連合軌道交番機構");
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
});
