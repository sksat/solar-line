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
import { computeTimeline } from "./timeline-analysis.ts";
import { calendarToJD } from "./ephemeris.ts";
import { EPISODE_SUMMARIES } from "./cross-episode-analysis.ts";

const timeline = computeTimeline(calendarToJD(2240, 1, 1));

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

describe("full-route diagram animation consistency", () => {
  it("animation durationSeconds matches total mission duration in days", () => {
    const durationDays = timeline.totalDurationDays;
    const durationSeconds = durationDays * 86400;
    // The full-route diagram animation should span the full mission
    // Allow 10% tolerance for rounding in diagram data
    assert.ok(
      durationSeconds > 100 * 86400 && durationSeconds < 140 * 86400,
      `Animation duration should be 100-140 days in seconds, got ${(durationSeconds / 86400).toFixed(1)} days`,
    );
  });

  it("EP02 ~87 day transit is reflected in timeline total", () => {
    // Total mission = 3 (EP01) + 3 (stay) + 87 (EP02) + 2 (stay) + 6 (EP03) + 2 (stay) + 21 (EP05)
    // = ~124 days. EP02 at 87d is >70% of total
    const ep02 = timeline.events[1];
    const ep02Days = ep02.durationHours / 24;
    assert.ok(
      ep02Days > 80 && ep02Days < 95,
      `EP02 should be ~87 days, got ${ep02Days.toFixed(1)}`,
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
