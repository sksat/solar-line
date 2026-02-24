import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  KESTREL_SPECS,
  buildDamageTimeline,
  buildThrustTable,
  generateShipKestrelReport,
} from "./ship-kestrel-analysis.ts";

describe("KESTREL_SPECS", () => {
  it("has correct baseline values", () => {
    assert.equal(KESTREL_SPECS.nominalThrustMN, 9.8);
    assert.equal(KESTREL_SPECS.emergencyThrustMN, 10.7);
    assert.equal(KESTREL_SPECS.statedMassT, 48_000);
    assert.equal(KESTREL_SPECS.lengthM, 42.8);
    assert.equal(KESTREL_SPECS.fuel, "D-He³（重水素-ヘリウム3）核融合パルス");
  });
});

describe("buildDamageTimeline", () => {
  const timeline = buildDamageTimeline();

  it("has a caption", () => {
    assert.ok(timeline.caption.length > 0);
  });

  it("contains events from multiple episodes", () => {
    const episodes = new Set(timeline.events.map((e) => e.episode));
    assert.ok(episodes.has(1), "should have EP1 events");
    assert.ok(episodes.has(2), "should have EP2 events");
    assert.ok(episodes.has(3), "should have EP3 events");
    assert.ok(episodes.has(4), "should have EP4 events");
    assert.ok(episodes.has(5), "should have EP5 events");
  });

  it("events are in chronological order (non-decreasing episode)", () => {
    for (let i = 1; i < timeline.events.length; i++) {
      assert.ok(
        timeline.events[i].episode >= timeline.events[i - 1].episode,
        `event ${i} (ep${timeline.events[i].episode}) should come after event ${i - 1} (ep${timeline.events[i - 1].episode})`
      );
    }
  });

  it("each event has required fields", () => {
    for (const event of timeline.events) {
      assert.ok(event.label.length > 0, "label should not be empty");
      assert.ok(event.description.length > 0, "description should not be empty");
      assert.ok(event.episode >= 1 && event.episode <= 5, "episode should be 1-5");
    }
  });

  it("includes key damage events", () => {
    const labels = timeline.events.map((e) => e.label);
    assert.ok(labels.some((l) => l.includes("冷媒漏洩")), "should include coolant leak");
    assert.ok(labels.some((l) => l.includes("フレーム応力")), "should include frame stress");
    assert.ok(labels.some((l) => l.includes("プラズモイド")), "should include plasmoid");
    assert.ok(labels.some((l) => l.includes("修理")), "should include repair");
  });

  it("events with stateChanges have non-empty arrays", () => {
    for (const event of timeline.events) {
      if (event.stateChanges) {
        assert.ok(event.stateChanges.length > 0, `${event.label} stateChanges should not be empty`);
      }
    }
  });
});

describe("buildThrustTable", () => {
  const table = buildThrustTable();

  it("has a caption", () => {
    assert.ok(table.caption.length > 0);
  });

  it("covers all 5 episodes", () => {
    assert.deepEqual(table.episodes, [1, 2, 3, 4, 5]);
  });

  it("has rows with values for all episodes", () => {
    for (const row of table.rows) {
      for (const ep of table.episodes) {
        assert.ok(row.values[ep] !== undefined, `${row.metric} should have value for ep${ep}`);
      }
    }
  });

  it("flags mass discrepancy as conflict", () => {
    const massRow = table.rows.find((r) => r.metric.includes("公称質量"));
    assert.ok(massRow, "should have a nominal mass row");
    assert.equal(massRow!.status, "conflict");
  });
});

describe("generateShipKestrelReport", () => {
  const report = generateShipKestrelReport();

  it("has correct slug", () => {
    assert.equal(report.slug, "ship-kestrel");
  });

  it("has title in Japanese", () => {
    assert.ok(report.title.includes("ケストレル"));
  });

  it("has a non-empty summary", () => {
    assert.ok(report.summary.length > 0);
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

  it("has a section with eventTimeline", () => {
    const withTimeline = report.sections.filter((s) => s.eventTimeline);
    assert.ok(withTimeline.length >= 1, "should have at least one section with eventTimeline");
  });

  it("has a section with comparison table", () => {
    const withTable = report.sections.filter((s) => s.table);
    assert.ok(withTable.length >= 1, "should have at least one section with comparison table");
  });

  it("section headings are unique", () => {
    const headings = report.sections.map((s) => s.heading);
    assert.equal(headings.length, new Set(headings).size, "all headings should be unique");
  });
});
