/**
 * Tests for cross-episode consistency analysis.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SHIP_SPECS,
  EPISODE_SUMMARIES,
  buildShipSpecsTable,
  buildRouteContinuityTable,
  buildAccuracyTable,
  buildDeltaVScalingTable,
  buildTimelineTable,
  generateCrossEpisodeReport,
} from "./cross-episode-analysis.ts";

describe("SHIP_SPECS", () => {
  it("has correct nominal thrust", () => {
    assert.equal(SHIP_SPECS.thrustMN, 9.8);
  });

  it("has correct damaged thrust at 65%", () => {
    assert.ok(
      Math.abs(SHIP_SPECS.damagedThrustMN - SHIP_SPECS.thrustMN * 0.65) < 0.01,
    );
  });

  it("has correct nominal mass", () => {
    assert.equal(SHIP_SPECS.nominalMassT, 48_000);
  });

  it("emergency thrust exceeds nominal thrust", () => {
    assert.ok(SHIP_SPECS.emergencyThrustMN > SHIP_SPECS.thrustMN,
      `emergency ${SHIP_SPECS.emergencyThrustMN} should > nominal ${SHIP_SPECS.thrustMN}`);
  });

  it("damaged thrust is between 0 and nominal", () => {
    assert.ok(SHIP_SPECS.damagedThrustMN > 0);
    assert.ok(SHIP_SPECS.damagedThrustMN < SHIP_SPECS.thrustMN);
  });
});

describe("EPISODE_SUMMARIES", () => {
  it("has 5 episodes", () => {
    assert.equal(EPISODE_SUMMARIES.length, 5);
  });

  it("episodes are in order", () => {
    for (let i = 0; i < EPISODE_SUMMARIES.length; i++) {
      assert.equal(EPISODE_SUMMARIES[i].episode, i + 1);
    }
  });

  it("route continuity: each arrival matches next departure location", () => {
    // EP1 arrives at Jupiter system, EP2 departs from Jupiter system
    assert.ok(EPISODE_SUMMARIES[0].arrivalBody.includes("木星"));
    assert.ok(EPISODE_SUMMARIES[1].departureBody.includes("木星"));

    // EP2 arrives at Saturn system, EP3 departs from Saturn system
    assert.ok(EPISODE_SUMMARIES[1].arrivalBody.includes("土星"));
    assert.ok(EPISODE_SUMMARIES[2].departureBody.includes("土星"));

    // EP3 arrives at Uranus system, EP4 departs from Uranus system
    assert.ok(EPISODE_SUMMARIES[2].arrivalBody.includes("天王星"));
    assert.ok(EPISODE_SUMMARIES[3].departureBody.includes("天王星"));
  });

  it("mass boundaries are consistent (ep03 > ep01 due to longer time)", () => {
    const ep01 = EPISODE_SUMMARIES[0];
    const ep03 = EPISODE_SUMMARIES[2];
    assert.ok(ep01.massBoundaryT !== null);
    assert.ok(ep03.massBoundaryT !== null);
    assert.ok(ep03.massBoundaryT! > ep01.massBoundaryT!,
      `ep03 mass boundary (${ep03.massBoundaryT}) should be > ep01 (${ep01.massBoundaryT})`);
  });

  it("ep02 is ballistic (no brachistochrone ΔV)", () => {
    assert.equal(EPISODE_SUMMARIES[1].brachistochroneDeltaV, null);
  });

  it("brachistochrone ΔV scaling is correct between ep01 and ep03", () => {
    const ep01 = EPISODE_SUMMARIES[0];
    const ep03 = EPISODE_SUMMARIES[2];
    assert.ok(ep01.brachistochroneDeltaV !== null);
    assert.ok(ep03.brachistochroneDeltaV !== null);
    // EP03 has more ΔV than EP01
    assert.ok(ep03.brachistochroneDeltaV! > ep01.brachistochroneDeltaV!);
  });

  it("EP04 and EP05 both arrive at Earth", () => {
    assert.ok(EPISODE_SUMMARIES[3].arrivalBody.includes("地球"));
    assert.ok(EPISODE_SUMMARIES[4].arrivalBody.includes("地球"));
  });

  it("all episodes have non-empty route strings", () => {
    for (const ep of EPISODE_SUMMARIES) {
      assert.ok(ep.route.length > 0, `EP${ep.episode} route is empty`);
      assert.ok(ep.route.includes("→"), `EP${ep.episode} route should contain →`);
    }
  });

  it("damaged thrust episodes (EP04, EP05) use lower thrust than EP01/EP03", () => {
    const ep01 = EPISODE_SUMMARIES[0];
    const ep04 = EPISODE_SUMMARIES[3];
    const ep05 = EPISODE_SUMMARIES[4];
    assert.ok(ep04.thrustUsedMN < ep01.thrustUsedMN,
      `EP04 thrust ${ep04.thrustUsedMN} should be < EP01 ${ep01.thrustUsedMN}`);
    assert.ok(ep05.thrustUsedMN < ep01.thrustUsedMN,
      `EP05 thrust ${ep05.thrustUsedMN} should be < EP01 ${ep01.thrustUsedMN}`);
  });
});

describe("buildShipSpecsTable", () => {
  const table = buildShipSpecsTable();

  it("has correct episodes", () => {
    assert.deepEqual(table.episodes, [1, 2, 3, 4, 5]);
  });

  it("has at least 3 rows", () => {
    assert.ok(table.rows.length >= 3);
  });

  it("each row has values for all episodes", () => {
    for (const row of table.rows) {
      for (const ep of table.episodes) {
        assert.ok(row.values[ep] !== undefined,
          `row "${row.metric}" missing value for episode ${ep}`);
      }
    }
  });

  it("has valid status values", () => {
    for (const row of table.rows) {
      assert.ok(["ok", "warn", "conflict"].includes(row.status),
        `row "${row.metric}" has invalid status "${row.status}"`);
    }
  });
});

describe("buildRouteContinuityTable", () => {
  const table = buildRouteContinuityTable();

  it("includes departure and arrival rows", () => {
    const metrics = table.rows.map(r => r.metric);
    assert.ok(metrics.includes("出発地"));
    assert.ok(metrics.includes("到着地"));
  });

  it("all rows have ok status (route is continuous)", () => {
    for (const row of table.rows) {
      assert.equal(row.status, "ok", `row "${row.metric}" should be ok`);
    }
  });
});

describe("buildAccuracyTable", () => {
  const table = buildAccuracyTable();

  it("has accuracy and limits rows", () => {
    const metrics = table.rows.map(r => r.metric);
    assert.ok(metrics.some(m => m.includes("実データ")),
      "should have real-data comparison row");
    assert.ok(metrics.some(m => m.includes("物理限界")),
      "should have physics limits row");
  });

  it("all rows have ok status", () => {
    for (const row of table.rows) {
      assert.equal(row.status, "ok",
        `accuracy row "${row.metric}" should be ok`);
    }
  });
});

describe("buildTimelineTable", () => {
  const table = buildTimelineTable();

  it("has rows for EP01 through EP04", () => {
    const allMetrics = table.rows.map(r => r.metric).join(" ");
    assert.ok(allMetrics.includes("EP1"), "should reference EP1");
    assert.ok(allMetrics.includes("EP2"), "should reference EP2");
    assert.ok(allMetrics.includes("EP3"), "should reference EP3");
  });

  it("all rows have valid status values", () => {
    for (const row of table.rows) {
      assert.ok(["ok", "warn", "conflict"].includes(row.status),
        `timeline row "${row.metric}" has invalid status "${row.status}"`);
    }
  });
});

describe("buildDeltaVScalingTable", () => {
  const table = buildDeltaVScalingTable();

  it("includes distance and ΔV rows", () => {
    const metrics = table.rows.map(r => r.metric);
    assert.ok(metrics.some(m => m.includes("距離")));
    assert.ok(metrics.some(m => m.includes("ΔV")));
  });
});

describe("generateCrossEpisodeReport", () => {
  const report = generateCrossEpisodeReport();

  it("has correct slug", () => {
    assert.equal(report.slug, "cross-episode");
  });

  it("has Japanese title", () => {
    assert.ok(report.title.length > 0);
    // Should contain Japanese characters
    assert.ok(/[\u3000-\u9fff]/.test(report.title));
  });

  it("has a summary", () => {
    assert.ok(report.summary.length > 0);
  });

  it("has at least 5 sections", () => {
    assert.ok(report.sections.length >= 5,
      `expected >= 5 sections, got ${report.sections.length}`);
  });

  it("each section has heading and markdown", () => {
    for (const section of report.sections) {
      assert.ok(section.heading.length > 0, "section missing heading");
      assert.ok(section.markdown.length > 0, "section missing markdown");
    }
  });

  it("has comparison tables in relevant sections", () => {
    const tablesCount = report.sections.filter(s => s.table).length;
    assert.ok(tablesCount >= 3,
      `expected >= 3 sections with tables, got ${tablesCount}`);
  });
});
