import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  getMissionPhases,
  getEpisodeRegions,
  generateDistanceTrack,
  generateDeltaVTrack,
  generateNozzleTrack,
  generateRadiationTrack,
  buildDistanceChart,
  buildDeltaVChart,
  buildNozzleChart,
  buildRadiationChart,
  buildAllMissionTimelineCharts,
} from "./mission-timeline.ts";

describe("getMissionPhases", () => {
  const phases = getMissionPhases();

  it("returns 5 phases (one per episode)", () => {
    assert.equal(phases.length, 5);
  });

  it("covers episodes 1-5", () => {
    assert.deepEqual(
      phases.map((p) => p.episode),
      [1, 2, 3, 4, 5],
    );
  });

  it("phases are in chronological order", () => {
    for (let i = 0; i < phases.length - 1; i++) {
      assert.ok(
        phases[i].startDay <= phases[i + 1].startDay,
        `Phase ${i} should start before phase ${i + 1}`,
      );
    }
  });

  it("EP01 is 3 days (72 hours)", () => {
    const ep01 = phases[0];
    assert.equal(ep01.endDay - ep01.startDay, 3);
  });

  it("EP02 is ~87 days", () => {
    const ep02 = phases[1];
    assert.equal(ep02.endDay - ep02.startDay, 87);
  });

  it("EP04 plasmoid delivers 480 mSv radiation", () => {
    const ep04 = phases[3];
    assert.equal(ep04.radiationMSv, 480);
  });
});

describe("getEpisodeRegions", () => {
  const regions = getEpisodeRegions();

  it("returns 5 regions", () => {
    assert.equal(regions.length, 5);
  });

  it("each region has label, from, to, color", () => {
    for (const r of regions) {
      assert.ok(typeof r.from === "number");
      assert.ok(typeof r.to === "number");
      assert.ok(typeof r.label === "string");
      assert.ok(typeof r.color === "string");
      assert.ok(r.to > r.from, `Region ${r.label}: to should be > from`);
    }
  });

  it("labels match EP01-EP05", () => {
    assert.deepEqual(
      regions.map((r) => r.label),
      ["EP01", "EP02", "EP03", "EP04", "EP05"],
    );
  });
});

describe("generateDistanceTrack", () => {
  const track = generateDistanceTrack();

  it("x and y arrays have same length", () => {
    assert.equal(track.x.length, track.y.length);
  });

  it("starts near Mars (~1.5 AU)", () => {
    assert.ok(
      Math.abs(track.y[0] - 1.52) < 0.1,
      `Start distance should be ~1.52 AU, got ${track.y[0]}`,
    );
  });

  it("ends near Earth (~1.0 AU)", () => {
    const lastY = track.y[track.y.length - 1];
    assert.ok(
      Math.abs(lastY - 1.0) < 0.1,
      `End distance should be ~1.0 AU, got ${lastY}`,
    );
  });

  it("peaks near Uranus (~19.2 AU)", () => {
    const maxY = Math.max(...track.y);
    assert.ok(
      Math.abs(maxY - 19.19) < 0.5,
      `Peak distance should be ~19.19 AU, got ${maxY}`,
    );
  });

  it("x values are monotonically increasing", () => {
    for (let i = 1; i < track.x.length; i++) {
      assert.ok(
        track.x[i] >= track.x[i - 1],
        `x[${i}]=${track.x[i]} should be >= x[${i - 1}]=${track.x[i - 1]}`,
      );
    }
  });
});

describe("generateDeltaVTrack", () => {
  const track = generateDeltaVTrack();

  it("x and y arrays have same length", () => {
    assert.equal(track.x.length, track.y.length);
  });

  it("starts at 0 km/s", () => {
    assert.equal(track.y[0], 0);
  });

  it("y values are monotonically non-decreasing (ΔV only accumulates)", () => {
    for (let i = 1; i < track.y.length; i++) {
      assert.ok(
        track.y[i] >= track.y[i - 1],
        `y[${i}]=${track.y[i]} should be >= y[${i - 1}]=${track.y[i - 1]}`,
      );
    }
  });

  it("total accumulated ΔV is ~34,954 km/s", () => {
    const finalDV = track.y[track.y.length - 1];
    assert.ok(
      Math.abs(finalDV - 34954) < 100,
      `Final ΔV should be ~34,954 km/s, got ${finalDV}`,
    );
  });

  it("EP01 contributes ~8,497 km/s", () => {
    // Find the first point after day 3
    const ep01End = track.y[track.x.findIndex((x) => x >= 3)];
    assert.ok(
      Math.abs(ep01End - 8497) < 10,
      `EP01 ΔV should be ~8,497 km/s, got ${ep01End}`,
    );
  });
});

describe("generateNozzleTrack", () => {
  const track = generateNozzleTrack();

  it("x and y arrays have same length", () => {
    assert.equal(track.x.length, track.y.length);
  });

  it("original nozzle starts at 100h", () => {
    assert.equal(track.y[0], 100);
  });

  it("after EP01, original nozzle has 28h remaining", () => {
    const afterEP01 = track.y[track.x.findIndex((x) => x >= 3)];
    assert.equal(afterEP01, 28);
  });

  it("new nozzle installed at EP03 start (~199h)", () => {
    const atEP03Start = track.y[track.x.findIndex((x) => x >= 95)];
    assert.ok(
      atEP03Start > 190 && atEP03Start < 210,
      `New nozzle should be ~199h, got ${atEP03Start}`,
    );
  });

  it("ends with ~0.43h (26 min) remaining", () => {
    const finalLife = track.y[track.y.length - 1];
    assert.ok(
      Math.abs(finalLife - 0.43) < 0.1,
      `Final nozzle life should be ~0.43h, got ${finalLife}`,
    );
  });
});

describe("generateRadiationTrack", () => {
  const track = generateRadiationTrack();

  it("x and y arrays have same length", () => {
    assert.equal(track.x.length, track.y.length);
  });

  it("starts at 0 mSv", () => {
    assert.equal(track.y[0], 0);
  });

  it("has a sharp jump at plasmoid encounter (~day 105)", () => {
    const beforeIdx = track.x.findIndex((x) => x >= 105);
    const afterIdx = beforeIdx + 1;
    const jump = track.y[afterIdx] - track.y[beforeIdx];
    assert.ok(
      Math.abs(jump - 480) < 5,
      `Plasmoid jump should be ~480 mSv, got ${jump}`,
    );
  });

  it("final dose is below NASA lifetime limit (600 mSv)", () => {
    const finalDose = track.y[track.y.length - 1];
    assert.ok(finalDose < 600, `Final dose ${finalDose} should be < 600 mSv`);
  });

  it("final dose is above ICRP emergency limit (500 mSv)", () => {
    const finalDose = track.y[track.y.length - 1];
    assert.ok(
      finalDose > 500,
      `Final dose ${finalDose} should be > 500 mSv (exceeds ICRP emergency)`,
    );
  });
});

describe("build chart functions", () => {
  it("buildDistanceChart returns valid TimeSeriesChart", () => {
    const chart = buildDistanceChart();
    assert.equal(chart.id, "mission-distance-timeline");
    assert.ok(chart.series.length > 0);
    assert.ok(chart.regions && chart.regions.length === 5);
  });

  it("buildDeltaVChart returns valid TimeSeriesChart", () => {
    const chart = buildDeltaVChart();
    assert.equal(chart.id, "mission-deltav-timeline");
    assert.ok(chart.series.length > 0);
    assert.ok(chart.regions && chart.regions.length === 5);
  });

  it("buildNozzleChart returns valid TimeSeriesChart with threshold at 0", () => {
    const chart = buildNozzleChart();
    assert.equal(chart.id, "mission-nozzle-timeline");
    assert.ok(chart.thresholds && chart.thresholds.some((t) => t.value === 0));
  });

  it("buildRadiationChart returns ICRP and NASA thresholds", () => {
    const chart = buildRadiationChart();
    assert.equal(chart.id, "mission-radiation-timeline");
    assert.ok(chart.thresholds && chart.thresholds.length >= 2);
    assert.ok(chart.thresholds.some((t) => t.value === 500));
    assert.ok(chart.thresholds.some((t) => t.value === 600));
  });

  it("buildAllMissionTimelineCharts returns 4 charts", () => {
    const charts = buildAllMissionTimelineCharts();
    assert.equal(charts.length, 4);
  });
});

describe("TimeSeriesRegion in charts", () => {
  const charts = buildAllMissionTimelineCharts();

  it("all charts have regions", () => {
    for (const chart of charts) {
      assert.ok(
        chart.regions && chart.regions.length > 0,
        `Chart ${chart.id} should have regions`,
      );
    }
  });

  it("regions have valid from/to/label/color", () => {
    for (const chart of charts) {
      for (const region of chart.regions!) {
        assert.ok(typeof region.from === "number");
        assert.ok(typeof region.to === "number");
        assert.ok(region.to > region.from);
        assert.ok(region.label.length > 0);
        assert.ok(region.color.startsWith("rgba("));
      }
    }
  });
});
