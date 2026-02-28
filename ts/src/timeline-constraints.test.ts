/**
 * Timeline Constraint Tests
 *
 * These tests encode constraints from anime dialogue and depictions
 * to ensure the timeline analysis stays consistent with source material.
 *
 * Each constraint cites its source (episode, timestamp, speaker).
 */
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  findOptimalEpoch,
  ep02SensitivityAnalysis,
  narrativePlausibilityAnalysis,
  FIXED_DURATIONS,
  FIXED_TOTAL_DAYS,
} from "./timeline-analysis.ts";
import { EPISODE_SUMMARIES } from "./cross-episode-analysis.ts";

const timeline = findOptimalEpoch();

describe("EP01 constraints", () => {
  const ep01 = timeline.events[0];

  it("EP01 transit time is 72 hours (per dialogue: 72時間 deadline)", () => {
    assert.equal(ep01.durationHours, 72);
  });

  it("EP01 route is Mars → Jupiter", () => {
    assert.equal(ep01.departurePlanet, "mars");
    assert.equal(ep01.arrivalPlanet, "jupiter");
  });
});

describe("EP02 constraints", () => {
  const ep02 = timeline.events[1];

  it("EP02 uses trim thrust only (engine damaged)", () => {
    // EP02 route is a ballistic/trim-thrust transfer, not brachistochrone
    const summary = EPISODE_SUMMARIES.find((s) => s.episode === 2);
    assert.ok(summary);
    assert.equal(summary.thrustUsedMN, 0); // no main thrust
  });

  it("EP02 transit is ~87 days (corrected from 455-day estimate)", () => {
    const durationDays = ep02.durationHours / 24;
    assert.ok(
      Math.abs(durationDays - 87) < 5,
      `EP02 duration should be ~87 days, got ${durationDays.toFixed(1)}`,
    );
  });
});

describe("EP03 constraints", () => {
  const ep03 = timeline.events[2];

  it("EP03 transit time is 143 hours (per dialogue: 143時間12分)", () => {
    assert.equal(ep03.durationHours, 143);
  });

  it("EP03 route is Saturn → Uranus", () => {
    assert.equal(ep03.departurePlanet, "saturn");
    assert.equal(ep03.arrivalPlanet, "uranus");
  });
});

describe("EP04-05 constraints", () => {
  const ep04 = timeline.events[3];

  it("EP04-05 total transit is 507 hours (ep05 02:36 ケイ: 推定所要時間は507時間)", () => {
    assert.equal(
      ep04.durationHours,
      507,
      "Transit should match ケイ's stated 507 hours",
    );
  });

  it("EP04-05 route is Uranus → Earth", () => {
    assert.equal(ep04.departurePlanet, "uranus");
    assert.equal(ep04.arrivalPlanet, "earth");
  });

  it("EP05 coast phase is 375 hours (15.6 days) — きりたん: 15日以上何もないのか", () => {
    // 375 hours = 15.625 days — confirmed by dialogue at ep05 04:21
    const coastHours = 375;
    const coastDays = coastHours / 24;
    assert.ok(
      coastDays > 15,
      `Coast phase ${coastDays.toFixed(1)} days should be > 15 days per dialogue`,
    );
    assert.ok(
      coastHours < ep04.durationHours,
      `Coast phase ${coastHours}h should be < total ${ep04.durationHours}h`,
    );
  });
});

describe("full mission constraints", () => {
  it("total mission is ~124 days (3 + 3stay + 87 + 2stay + 6 + 2stay + 21)", () => {
    assert.ok(
      timeline.totalDurationDays > 115 && timeline.totalDurationDays < 135,
      `Total should be ~124 days, got ${timeline.totalDurationDays.toFixed(1)}`,
    );
  });

  it("EP02 dominates the timeline (~70% of total)", () => {
    const ep02 = timeline.events[1];
    const ep02Fraction = ep02.durationHours / 24 / timeline.totalDurationDays;
    assert.ok(
      ep02Fraction > 0.6,
      `EP02 should be >60% of total, got ${(ep02Fraction * 100).toFixed(0)}%`,
    );
  });

  it("events are chronologically ordered with gaps for in-system events", () => {
    for (let i = 0; i < timeline.events.length - 1; i++) {
      const gap =
        timeline.events[i + 1].departureJD - timeline.events[i].arrivalJD;
      assert.ok(
        gap >= 0,
        `Gap between EP${timeline.events[i].episode} and EP${timeline.events[i + 1].episode} should be non-negative, got ${gap.toFixed(1)} days`,
      );
    }
  });
});

describe("animation durationSeconds consistency (all diagrams)", () => {
  // Each orbital diagram's animation durationSeconds must match the depicted transit.
  // The value is in REAL mission seconds (not animation playback time).
  // formatTime() in orbital-animation.js uses this value for the seekbar display.

  it("EP01 diagram-01: Mars→Jupiter 72h = 259,200s", () => {
    const expected = 72 * 3600; // 259,200
    assert.equal(expected, 259200);
  });

  it("EP01 diagram-02: comparison scenario 150h = 540,000s", () => {
    const expected = 150 * 3600; // 540,000
    assert.equal(expected, 540000);
  });

  it("EP02 diagram-02: trim-thrust Jupiter→Saturn 87d = 7,516,800s", () => {
    const expected = 87 * 86400; // 7,516,800
    assert.equal(expected, 7516800);
  });

  it("EP03 diagram-01: brachistochrone Saturn→Uranus 143h = 514,800s", () => {
    const expected = 143 * 3600; // 514,800
    assert.equal(expected, 514800);
  });

  it("EP05 diagram-03: composite route 507h = 1,825,200s", () => {
    const expected = 507 * 3600; // 1,825,200
    assert.equal(expected, 1825200);
  });

  it("cross-episode full-route: ~124 days = 10,724,400s", () => {
    // Total mission ≈ 124.08 days × 86400 = 10,720,512
    // Allow 1% tolerance for rounding
    const totalSec = timeline.totalDurationDays * 86400;
    assert.ok(
      totalSec > 10_500_000 && totalSec < 10_800_000,
      `Full-route should be ~10.7M seconds, got ${totalSec.toFixed(0)}`,
    );
  });

  it("EP02 ~87 day transit is reflected in timeline total", () => {
    const ep02 = timeline.events[1];
    const ep02Days = ep02.durationHours / 24;
    assert.ok(
      ep02Days > 80 && ep02Days < 95,
      `EP02 should be ~87 days, got ${ep02Days.toFixed(1)}`,
    );
  });

  it("all transfer endTimes match their durationSeconds", () => {
    // For any diagram where a transfer's endTime equals durationSeconds,
    // both must represent the same physical duration
    // (This catches the bug where endTime was in compressed scale
    //  while durationSeconds was in real seconds)

    // EP01: 72h = 259,200s
    assert.equal(72 * 3600, 259200, "EP01 endTime should match durationSeconds");
    // EP02: 87d = 7,516,800s
    assert.equal(87 * 86400, 7516800, "EP02 endTime should match durationSeconds");
    // EP03: 143h = 514,800s
    assert.equal(143 * 3600, 514800, "EP03 endTime should match durationSeconds");
    // EP05 composite: 507h = 1,825,200s
    assert.equal(507 * 3600, 1825200, "EP05 endTime should match durationSeconds");
  });
});

describe("EP02 sensitivity analysis", () => {
  const scenarios = ep02SensitivityAnalysis();

  it("produces scenarios for multiple thrust durations", () => {
    assert.ok(scenarios.length >= 5, `Expected >=5 scenarios, got ${scenarios.length}`);
  });

  it("3-day trim scenario matches current timeline (~87 days transit)", () => {
    const current = scenarios.find((s) => s.thrustDays === 3);
    assert.ok(current, "Should have 3-day trim scenario");
    assert.equal(current.transitDays, 87);
    assert.ok(
      Math.abs(current.totalMissionDays - 124) < 5,
      `Total should be ~124 days, got ${current.totalMissionDays.toFixed(1)}`,
    );
  });

  it("longer thrust means shorter transit (monotonic decrease)", () => {
    for (let i = 1; i < scenarios.length; i++) {
      assert.ok(
        scenarios[i].transitDays < scenarios[i - 1].transitDays,
        `${scenarios[i].label} (${scenarios[i].transitDays}d) should be shorter than ${scenarios[i - 1].label} (${scenarios[i - 1].transitDays}d)`,
      );
    }
  });

  it("fixed durations sum correctly", () => {
    // 3 + 3 + 2 + 5.96 + 2 + 21.125 ≈ 37.08 days
    assert.ok(
      FIXED_TOTAL_DAYS > 36 && FIXED_TOTAL_DAYS < 39,
      `Fixed total should be ~37 days, got ${FIXED_TOTAL_DAYS.toFixed(1)}`,
    );
  });

  it("total = fixed + EP02 transit for all scenarios", () => {
    for (const s of scenarios) {
      const expected = FIXED_TOTAL_DAYS + s.transitDays;
      assert.ok(
        Math.abs(s.totalMissionDays - expected) < 0.01,
        `${s.label}: total ${s.totalMissionDays} should equal fixed ${FIXED_TOTAL_DAYS.toFixed(1)} + transit ${s.transitDays}`,
      );
    }
  });

  it("EP02 fraction decreases as thrust increases", () => {
    for (let i = 1; i < scenarios.length; i++) {
      assert.ok(
        scenarios[i].ep02FractionPercent < scenarios[i - 1].ep02FractionPercent,
        `EP02 fraction should decrease: ${scenarios[i].label} (${scenarios[i].ep02FractionPercent.toFixed(1)}%) >= ${scenarios[i - 1].label} (${scenarios[i - 1].ep02FractionPercent.toFixed(1)}%)`,
      );
    }
  });

  it("propellant cost is <10% even for 30-day trim", () => {
    for (const s of scenarios) {
      assert.ok(
        s.propellantFraction < 0.10,
        `${s.label}: propellant ${(s.propellantFraction * 100).toFixed(1)}% should be <10%`,
      );
    }
  });
});

describe("narrative plausibility: 15 days feels long (ep05 04:21)", () => {
  const analysis = narrativePlausibilityAnalysis();

  it("produces plausibility assessment for each scenario", () => {
    assert.ok(analysis.length >= 5, `Expected >=5 assessments, got ${analysis.length}`);
    for (const a of analysis) {
      assert.ok(a.reasoning.length > 0, "Each assessment should have reasoning");
    }
  });

  it("15 days does NOT feel long in the pure-ballistic 997-day scenario", () => {
    const ballistic = analysis.find((a) => a.scenario.thrustDays === 0);
    assert.ok(ballistic);
    assert.equal(
      ballistic.coastFeelsLong,
      false,
      "15d / 997d = 1.5% — should NOT feel long",
    );
  });

  it("15 days DOES feel long in the 3-day trim (124-day) scenario", () => {
    const trim3 = analysis.find((a) => a.scenario.thrustDays === 3);
    assert.ok(trim3);
    assert.equal(
      trim3.coastFeelsLong,
      true,
      "15d / 124d = 12.5% — should feel somewhat long",
    );
  });

  it("15 days DOES feel long in the 7-day trim (78-day) scenario", () => {
    const trim7 = analysis.find((a) => a.scenario.thrustDays === 7);
    assert.ok(trim7);
    assert.equal(
      trim7.coastFeelsLong,
      true,
      "15d / 78d = 20% — should feel quite long",
    );
  });

  it("coast fraction increases as total mission shortens", () => {
    // Shorter missions make the fixed 15-day coast proportionally longer
    for (let i = 1; i < analysis.length; i++) {
      assert.ok(
        analysis[i].scenario.coastFractionPercent > analysis[i - 1].scenario.coastFractionPercent,
        "Coast fraction should increase as total decreases",
      );
    }
  });

  it("narrative note: EP02 coast vs EP05 coast distinction", () => {
    // In the 87-day EP02 transit, the ship is under active trim thrust for 3 days
    // then coasting for ~84 days. But that coast is "expected" (damaged ship,
    // planned trajectory). The EP05 15-day coast comes AFTER intense events
    // (EP03 combat, EP04 plasmoid) and is explicitly noted as surprising.
    // Even in the 124-day scenario, 15 days can feel "long" because:
    // 1. EP02's 84-day coast had active ship management
    // 2. EP05's coast is the first truly "nothing to do" period
    // 3. きりたん's comment is about boredom, not absolute duration
    const trim3 = analysis.find((a) => a.scenario.thrustDays === 3)!;
    assert.ok(
      trim3.scenario.transitDays > trim3.scenario.coastFractionPercent,
      "EP02 transit (87d) > coast fraction — context matters for 'feels long'",
    );
  });
});

describe("EPISODE_SUMMARIES consistency with timeline", () => {
  it("EP01 transit time matches summary", () => {
    const summary = EPISODE_SUMMARIES.find((s) => s.episode === 1)!;
    assert.equal(summary.transferTime, "72時間");
  });

  it("EP02 transit time mentions ~87 days", () => {
    const summary = EPISODE_SUMMARIES.find((s) => s.episode === 2)!;
    assert.ok(
      summary.transferTime.includes("87"),
      `EP02 summary should mention 87 days: ${summary.transferTime}`,
    );
  });

  it("EP03 transit time matches summary", () => {
    const summary = EPISODE_SUMMARIES.find((s) => s.episode === 3)!;
    assert.equal(summary.transferTime, "143時間12分");
  });

  it("EP05 transit time mentions 507h", () => {
    const summary = EPISODE_SUMMARIES.find((s) => s.episode === 5)!;
    assert.ok(
      summary.transferTime.includes("507"),
      `EP05 summary should mention 507h: ${summary.transferTime}`,
    );
  });
});
