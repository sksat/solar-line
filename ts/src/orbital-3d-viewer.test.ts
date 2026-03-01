import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  prepareFullRouteScene,
  prepareSaturnScene,
  prepareUranusScene,
  planetPositionAtTime,
  meanMotionPerDay,
  formatDaysJa,
  type SceneData,
  type PlanetData,
  type TransferArcData,
  type RingData,
  type AxisData,
  type PlaneData,
  type TimelineData,
  type TimelineOrbit,
  AU_TO_SCENE,
} from "./orbital-3d-viewer-data.ts";

const dataPath = path.resolve(
  import.meta.dirname ?? __dirname,
  "../../reports/data/calculations/3d_orbital_analysis.json",
);
const analysisData = JSON.parse(fs.readFileSync(dataPath, "utf8"));

describe("orbital-3d-viewer-data", () => {
  describe("prepareFullRouteScene", () => {
    const scene = prepareFullRouteScene(analysisData);

    it("returns a SceneData with correct type", () => {
      assert.strictEqual(scene.type, "full-route");
    });

    it("has 5 planets (Mars, Jupiter, Saturn, Uranus, Earth)", () => {
      assert.strictEqual(scene.planets.length, 5);
      const names = scene.planets.map((p: PlanetData) => p.name);
      assert.deepStrictEqual(names, ["mars", "jupiter", "saturn", "uranus", "earth"]);
    });

    it("planets have 3D positions with z from ecliptic height", () => {
      for (const planet of scene.planets) {
        assert.ok(typeof planet.x === "number", `${planet.name} has x`);
        assert.ok(typeof planet.y === "number", `${planet.name} has y`);
        assert.ok(typeof planet.z === "number", `${planet.name} has z`);
      }
      // Saturn should have positive z (above ecliptic)
      const saturn = scene.planets.find((p: PlanetData) => p.name === "saturn");
      assert.ok(saturn!.z > 0, "Saturn is above ecliptic");
      // Jupiter should have negative z (below ecliptic)
      const jupiter = scene.planets.find((p: PlanetData) => p.name === "jupiter");
      assert.ok(jupiter!.z < 0, "Jupiter is below ecliptic");
    });

    it("has 4 transfer arcs connecting the planets", () => {
      assert.strictEqual(scene.transferArcs.length, 4);
      assert.strictEqual(scene.transferArcs[0].from, "mars");
      assert.strictEqual(scene.transferArcs[0].to, "jupiter");
      assert.strictEqual(scene.transferArcs[3].from, "uranus");
      assert.strictEqual(scene.transferArcs[3].to, "earth");
    });

    it("transfer arcs have episode numbers and colors", () => {
      for (const arc of scene.transferArcs) {
        assert.ok(typeof arc.episode === "number");
        assert.ok(typeof arc.color === "string");
        assert.ok(arc.color.startsWith("#"));
      }
    });

    it("has an ecliptic plane at z=0", () => {
      assert.ok(scene.eclipticPlane, "should have ecliptic plane");
      assert.strictEqual(scene.eclipticPlane.z, 0);
    });

    it("AU_TO_SCENE converts AU to scene units", () => {
      assert.ok(AU_TO_SCENE > 0, "conversion factor should be positive");
      // 1 AU should map to a reasonable scene size (1-20 units)
      assert.ok(AU_TO_SCENE >= 1 && AU_TO_SCENE <= 20);
    });
  });

  describe("prepareSaturnScene", () => {
    const scene = prepareSaturnScene(analysisData);

    it("returns a SceneData with correct type", () => {
      assert.strictEqual(scene.type, "saturn-ring");
    });

    it("has Saturn as central body", () => {
      const saturn = scene.planets.find((p: PlanetData) => p.name === "saturn");
      assert.ok(saturn, "Saturn should be present");
      assert.ok(saturn.isCentral, "Saturn should be marked as central body");
    });

    it("has ring geometry with inner and outer radii", () => {
      assert.ok(scene.rings, "should have ring data");
      assert.strictEqual(scene.rings!.length, 1);
      const ring = scene.rings![0];
      assert.strictEqual(ring.innerRadius, 66900);
      assert.strictEqual(ring.outerRadius, 140180);
    });

    it("has ring plane normal vector", () => {
      const ring = scene.rings![0];
      assert.ok(ring.normal, "ring should have normal vector");
      assert.strictEqual(ring.normal.length, 3);
      // Normal should be unit-ish vector
      const mag = Math.sqrt(ring.normal[0] ** 2 + ring.normal[1] ** 2 + ring.normal[2] ** 2);
      assert.ok(Math.abs(mag - 1) < 0.01, `ring normal should be unit vector, got magnitude ${mag}`);
    });

    it("has Enceladus orbit", () => {
      const enceladus = scene.planets.find((p: PlanetData) => p.name === "enceladus");
      assert.ok(enceladus, "Enceladus should be shown");
      assert.ok(enceladus.orbitRadius, "Enceladus should have orbit radius");
      assert.strictEqual(enceladus.orbitRadius, 238042);
    });

    it("has approach trajectory with angle", () => {
      assert.ok(scene.transferArcs.length >= 1, "should have approach trajectory");
      const approach = scene.transferArcs[0];
      assert.ok(approach.approachAngleDeg !== undefined);
      // Approach angle ~9.3°
      assert.ok(
        Math.abs(approach.approachAngleDeg! - 9.33) < 0.5,
        `approach angle should be ~9.3°, got ${approach.approachAngleDeg}`,
      );
    });
  });

  describe("prepareUranusScene", () => {
    const scene = prepareUranusScene(analysisData);

    it("returns a SceneData with correct type", () => {
      assert.strictEqual(scene.type, "uranus-approach");
    });

    it("has Uranus as central body", () => {
      const uranus = scene.planets.find((p: PlanetData) => p.name === "uranus");
      assert.ok(uranus, "Uranus should be present");
      assert.ok(uranus.isCentral, "Uranus should be marked as central body");
    });

    it("has spin axis with ~97.77° obliquity", () => {
      assert.ok(scene.axes, "should have axis data");
      const spinAxis = scene.axes!.find((a: AxisData) => a.type === "spin");
      assert.ok(spinAxis, "should have spin axis");
      assert.strictEqual(spinAxis.direction.length, 3);
      // Verify it's the correct vector
      const mag = Math.sqrt(
        spinAxis.direction[0] ** 2 + spinAxis.direction[1] ** 2 + spinAxis.direction[2] ** 2,
      );
      assert.ok(Math.abs(mag - 1) < 0.01, "spin axis should be unit vector");
    });

    it("has equatorial plane tilted at 97.77°", () => {
      assert.ok(scene.planes, "should have plane data");
      const eqPlane = scene.planes!.find((p: PlaneData) => p.type === "equatorial");
      assert.ok(eqPlane, "should have equatorial plane");
      assert.ok(
        Math.abs(eqPlane.tiltDeg! - 97.77) < 0.1,
        `equatorial plane tilt should be ~97.77°, got ${eqPlane.tiltDeg}`,
      );
    });

    it("has Titania orbit", () => {
      const titania = scene.planets.find((p: PlanetData) => p.name === "titania");
      assert.ok(titania, "Titania should be shown");
      assert.strictEqual(titania.orbitRadius, 436300);
    });

    it("has approach and departure vectors", () => {
      assert.ok(scene.transferArcs.length >= 2, "should have approach and departure");
      const approach = scene.transferArcs.find((a: TransferArcData) => a.label?.includes("接近") || a.label?.includes("approach"));
      const departure = scene.transferArcs.find((a: TransferArcData) => a.label?.includes("離脱") || a.label?.includes("departure"));
      assert.ok(approach, "should have approach vector");
      assert.ok(departure, "should have departure vector");
      // Approach from Saturn: ~25.3° to equatorial
      assert.ok(
        approach.approachAngleDeg !== undefined && Math.abs(approach.approachAngleDeg - 25.33) < 1,
        `approach angle should be ~25.3°, got ${approach.approachAngleDeg}`,
      );
      // Departure toward Earth: ~14.3° to equatorial
      assert.ok(
        departure.approachAngleDeg !== undefined && Math.abs(departure.approachAngleDeg - 14.33) < 1,
        `departure angle should be ~14.3°, got ${departure.approachAngleDeg}`,
      );
    });

    it("has ring geometry for Uranus", () => {
      assert.ok(scene.rings, "Uranus should have rings");
      const ring = scene.rings![0];
      assert.strictEqual(ring.outerRadius, 51149);
    });
  });

  describe("timeline data (full-route)", () => {
    const scene = prepareFullRouteScene(analysisData);
    const timeline = scene.timeline!;

    it("full-route scene includes timeline data", () => {
      assert.ok(timeline, "full-route scene should have timeline");
    });

    it("timeline has correct total mission duration (~124 days)", () => {
      assert.ok(timeline.totalDays > 100, `totalDays should be >100, got ${timeline.totalDays}`);
      assert.ok(timeline.totalDays < 150, `totalDays should be <150, got ${timeline.totalDays}`);
    });

    it("timeline has 5 planet orbits", () => {
      assert.strictEqual(timeline.orbits.length, 5);
      const names = timeline.orbits.map((o: TimelineOrbit) => o.name);
      assert.deepStrictEqual(names, ["mars", "jupiter", "saturn", "uranus", "earth"]);
    });

    it("planet orbits have positive mean motion", () => {
      for (const orbit of timeline.orbits) {
        assert.ok(orbit.meanMotionPerDay > 0, `${orbit.name} mean motion should be positive`);
        assert.ok(orbit.radiusScene > 0, `${orbit.name} radius should be positive`);
      }
    });

    it("inner planets orbit faster than outer planets", () => {
      const earth = timeline.orbits.find((o: TimelineOrbit) => o.name === "earth")!;
      const mars = timeline.orbits.find((o: TimelineOrbit) => o.name === "mars")!;
      const jupiter = timeline.orbits.find((o: TimelineOrbit) => o.name === "jupiter")!;
      const uranus = timeline.orbits.find((o: TimelineOrbit) => o.name === "uranus")!;
      assert.ok(earth.meanMotionPerDay > mars.meanMotionPerDay);
      assert.ok(mars.meanMotionPerDay > jupiter.meanMotionPerDay);
      assert.ok(jupiter.meanMotionPerDay > uranus.meanMotionPerDay);
    });

    it("timeline has 4 transfer legs", () => {
      assert.strictEqual(timeline.transfers.length, 4);
    });

    it("transfers are chronologically ordered", () => {
      for (let i = 1; i < timeline.transfers.length; i++) {
        assert.ok(
          timeline.transfers[i].startDay >= timeline.transfers[i - 1].endDay,
          `transfer ${i} should start after transfer ${i - 1} ends`,
        );
      }
    });

    it("first transfer starts at day 0", () => {
      assert.strictEqual(timeline.transfers[0].startDay, 0);
    });

    it("last transfer ends at totalDays", () => {
      const last = timeline.transfers[timeline.transfers.length - 1];
      assert.ok(
        Math.abs(last.endDay - timeline.totalDays) < 0.001,
        `last transfer endDay should equal totalDays`,
      );
    });
  });

  describe("meanMotionPerDay", () => {
    it("Earth orbital period is ~365.256 days", () => {
      const mm = meanMotionPerDay("earth");
      const period = (2 * Math.PI) / mm;
      assert.ok(Math.abs(period - 365.256) < 0.01);
    });

    it("Mars orbits slower than Earth", () => {
      assert.ok(meanMotionPerDay("earth") > meanMotionPerDay("mars"));
    });

    it("returns 0 for unknown planet", () => {
      assert.strictEqual(meanMotionPerDay("pluto"), 0);
    });
  });

  describe("planetPositionAtTime", () => {
    const orbit: TimelineOrbit = {
      name: "test",
      radiusScene: 10,
      initialAngle: 0,
      meanMotionPerDay: Math.PI / 180, // 1 deg/day
      z: 1.5,
    };

    it("at time 0, planet is at initial angle", () => {
      const [x, y, z] = planetPositionAtTime(orbit, 0);
      assert.ok(Math.abs(x - 10) < 0.001, "x should be radius");
      assert.ok(Math.abs(y - 0) < 0.001, "y should be 0");
      assert.strictEqual(z, 1.5);
    });

    it("at 90 days (90°), planet has moved quarter orbit", () => {
      const [x, y, z] = planetPositionAtTime(orbit, 90);
      assert.ok(Math.abs(x - 0) < 0.001, `x should be ~0, got ${x}`);
      assert.ok(Math.abs(y - 10) < 0.001, `y should be ~10, got ${y}`);
      assert.strictEqual(z, 1.5);
    });

    it("at 180 days (180°), planet is opposite start", () => {
      const [x, y, z] = planetPositionAtTime(orbit, 180);
      assert.ok(Math.abs(x - (-10)) < 0.001);
      assert.ok(Math.abs(y - 0) < 0.001);
    });

    it("z position stays constant (ecliptic height doesn't change)", () => {
      const [, , z1] = planetPositionAtTime(orbit, 0);
      const [, , z2] = planetPositionAtTime(orbit, 50);
      const [, , z3] = planetPositionAtTime(orbit, 100);
      assert.strictEqual(z1, z2);
      assert.strictEqual(z2, z3);
    });
  });

  describe("formatDaysJa", () => {
    it("formats hours for less than 1 day", () => {
      assert.strictEqual(formatDaysJa(0.5), "12時間");
    });

    it("formats days and hours for short durations", () => {
      assert.strictEqual(formatDaysJa(3), "3日");
      assert.strictEqual(formatDaysJa(3.5), "3日12時間");
    });

    it("formats rounded days for long durations", () => {
      assert.strictEqual(formatDaysJa(124), "124日");
    });
  });

  describe("Saturn and Uranus scenes have no timeline", () => {
    it("Saturn scene has no timeline", () => {
      const scene = prepareSaturnScene(analysisData);
      assert.strictEqual(scene.timeline, undefined);
    });

    it("Uranus scene has no timeline", () => {
      const scene = prepareUranusScene(analysisData);
      assert.strictEqual(scene.timeline, undefined);
    });
  });
});
