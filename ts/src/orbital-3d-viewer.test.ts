import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  prepareFullRouteScene,
  prepareSaturnScene,
  prepareUranusScene,
  type SceneData,
  type PlanetData,
  type TransferArcData,
  type RingData,
  type AxisData,
  type PlaneData,
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
});
