import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  computeTimeline,
  diagramAngles,
  findOptimalEpoch,
} from "./timeline-analysis.ts";
import { calendarToJD, planetPosition } from "./ephemeris.ts";

describe("computeTimeline", () => {
  const searchJD = calendarToJD(2240, 1, 1);
  const timeline = computeTimeline(searchJD);

  it("returns 4 events covering EP01-EP04", () => {
    assert.equal(timeline.events.length, 4);
    assert.equal(timeline.events[0].episode, 1);
    assert.equal(timeline.events[1].episode, 2);
    assert.equal(timeline.events[2].episode, 3);
    assert.equal(timeline.events[3].episode, 4);
  });

  it("events are chronologically ordered", () => {
    for (let i = 0; i < timeline.events.length - 1; i++) {
      assert.ok(
        timeline.events[i].arrivalJD <= timeline.events[i + 1].departureJD,
        `Event ${i} arrival should be before event ${i + 1} departure`,
      );
    }
  });

  it("EP01 departs Mars and arrives Jupiter", () => {
    assert.equal(timeline.events[0].departurePlanet, "mars");
    assert.equal(timeline.events[0].arrivalPlanet, "jupiter");
  });

  it("EP02 departs Jupiter and arrives Saturn", () => {
    assert.equal(timeline.events[1].departurePlanet, "jupiter");
    assert.equal(timeline.events[1].arrivalPlanet, "saturn");
  });

  it("EP03 departs Saturn and arrives Uranus", () => {
    assert.equal(timeline.events[2].departurePlanet, "saturn");
    assert.equal(timeline.events[2].arrivalPlanet, "uranus");
  });

  it("EP04 departs Uranus and arrives Earth", () => {
    assert.equal(timeline.events[3].departurePlanet, "uranus");
    assert.equal(timeline.events[3].arrivalPlanet, "earth");
  });

  it("EP01 duration is 72 hours", () => {
    assert.equal(timeline.events[0].durationHours, 72);
  });

  it("EP02 duration is ~87 days (trim-thrust corrected)", () => {
    assert.equal(timeline.events[1].durationHours, 87 * 24);
  });

  it("EP03 duration is 143 hours", () => {
    assert.equal(timeline.events[2].durationHours, 143);
  });

  it("total journey is 90-200 days (corrected from 400-600)", () => {
    assert.ok(
      timeline.totalDurationDays > 90,
      `total = ${timeline.totalDurationDays.toFixed(0)} days (expected > 90)`,
    );
    assert.ok(
      timeline.totalDurationDays < 200,
      `total = ${timeline.totalDurationDays.toFixed(0)} days (expected < 200)`,
    );
  });

  it("all dates are valid YYYY-MM-DD strings", () => {
    for (const event of timeline.events) {
      assert.match(event.departureDate, /^\d{4}-\d{2}-\d{2}$/);
      assert.match(event.arrivalDate, /^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("all longitudes are in [0, 2π)", () => {
    for (const event of timeline.events) {
      assert.ok(event.departureLongitude >= 0);
      assert.ok(event.departureLongitude < 2 * Math.PI);
      assert.ok(event.arrivalLongitude >= 0);
      assert.ok(event.arrivalLongitude < 2 * Math.PI);
    }
  });

  it("phase angles are in (-π, π]", () => {
    for (const event of timeline.events) {
      assert.ok(event.phaseAngleAtDeparture > -Math.PI);
      assert.ok(event.phaseAngleAtDeparture <= Math.PI);
    }
  });
});

describe("diagramAngles", () => {
  const searchJD = calendarToJD(2240, 1, 1);
  const timeline = computeTimeline(searchJD);

  it("returns angles for all relevant planets", () => {
    const angles = diagramAngles(timeline.events[0]);
    assert.ok("mars" in angles);
    assert.ok("jupiter" in angles);
    assert.ok("saturn" in angles);
    assert.ok("uranus" in angles);
    assert.ok("earth" in angles);
  });

  it("each planet has departure and arrival angles", () => {
    const angles = diagramAngles(timeline.events[0]);
    for (const planet of Object.keys(angles)) {
      assert.ok("departure" in angles[planet]);
      assert.ok("arrival" in angles[planet]);
      assert.ok(angles[planet].departure >= 0);
      assert.ok(angles[planet].departure < 2 * Math.PI);
    }
  });
});

describe("findOptimalEpoch", () => {
  const optimal = findOptimalEpoch();

  it("returns a valid timeline", () => {
    assert.equal(optimal.events.length, 4);
    assert.ok(optimal.totalDurationDays > 0);
  });

  it("EP03 Saturn-Uranus distance is within 15% of minimum (~9.6 AU)", () => {
    const ep03 = optimal.events[2];
    const satPos = planetPosition("saturn", ep03.departureJD);
    const uraPos = planetPosition("uranus", ep03.departureJD);
    const dx = satPos.x - uraPos.x;
    const dy = satPos.y - uraPos.y;
    const dz = satPos.z - uraPos.z;
    const distKm = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const distAU = distKm / 149_597_870.7;
    // Minimum Saturn-Uranus distance ≈ 9.6 AU (at conjunction)
    // Optimal epoch should find a configuration within 15% of this
    assert.ok(
      distAU < 11.1,
      `Saturn-Uranus distance ${distAU.toFixed(2)} AU should be < 11.1 AU (within 15% of minimum)`,
    );
    assert.ok(
      distAU > 8.5,
      `Saturn-Uranus distance ${distAU.toFixed(2)} AU should be > 8.5 AU`,
    );
  });

  it("EP03 phase angle magnitude is < 15°", () => {
    const ep03 = optimal.events[2];
    const satLon = planetPosition("saturn", ep03.departureJD).longitude;
    const uraLon = planetPosition("uranus", ep03.departureJD).longitude;
    let phaseDeg = ((uraLon - satLon) * 180) / Math.PI;
    // Normalize to (-180, 180]
    while (phaseDeg > 180) phaseDeg -= 360;
    while (phaseDeg <= -180) phaseDeg += 360;
    assert.ok(
      Math.abs(phaseDeg) < 15,
      `Phase angle ${phaseDeg.toFixed(1)}° should be within ±15° of conjunction`,
    );
  });

  it("Mars-Jupiter distance at EP01 is reasonable (3-5 AU)", () => {
    const ep01 = optimal.events[0];
    const marsPos = planetPosition("mars", ep01.departureJD);
    const jupPos = planetPosition("jupiter", ep01.departureJD);
    const dx = marsPos.x - jupPos.x;
    const dy = marsPos.y - jupPos.y;
    const dz = marsPos.z - jupPos.z;
    const distAU = Math.sqrt(dx * dx + dy * dy + dz * dz) / 149_597_870.7;
    assert.ok(
      distAU < 5,
      `Mars-Jupiter distance ${distAU.toFixed(2)} AU should be < 5 AU`,
    );
    assert.ok(
      distAU > 3,
      `Mars-Jupiter distance ${distAU.toFixed(2)} AU should be > 3 AU`,
    );
  });
});

describe("timeline across different epochs", () => {
  it("produces valid timelines from different starting dates", () => {
    const epochs = [
      calendarToJD(2200, 1, 1),
      calendarToJD(2250, 1, 1),
      calendarToJD(2280, 1, 1),
    ];

    for (const epoch of epochs) {
      const tl = computeTimeline(epoch);
      assert.equal(tl.events.length, 4);
      assert.ok(tl.totalDurationDays > 0);
      assert.ok(tl.totalDurationDays < 1000);
    }
  });
});
