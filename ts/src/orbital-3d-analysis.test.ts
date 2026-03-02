/**
 * Tests for 3D orbital analysis output (Task 451).
 *
 * Since orbital-3d-analysis.ts is a script that runs main() on import,
 * these tests validate the generated JSON output for structural integrity,
 * physics consistency, and expected value ranges.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AU_KM } from "./kestrel.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, "..", "..", "reports", "data", "calculations", "3d_orbital_analysis.json");
const data = JSON.parse(readFileSync(outputPath, "utf-8"));

describe("3D orbital analysis: structure", () => {
  it("has required top-level fields", () => {
    assert.ok(data.generatedAt, "has generatedAt");
    assert.ok(data.description, "has description");
    assert.ok(typeof data.coplanarApproximationValid === "boolean", "has coplanarApproximationValid");
    assert.ok(typeof data.maxPlaneChangeFractionPercent === "number", "has maxPlaneChangeFractionPercent");
    assert.ok(Array.isArray(data.transfers), "has transfers array");
    assert.ok(data.saturnRingAnalysis, "has saturnRingAnalysis");
    assert.ok(data.uranusApproachAnalysis, "has uranusApproachAnalysis");
    assert.ok(data.planetaryZHeightsAtEpoch, "has planetaryZHeightsAtEpoch");
  });

  it("has 4 transfer legs matching episodes 1-4", () => {
    assert.equal(data.transfers.length, 4, "4 transfer legs");
    assert.equal(data.transfers[0].episode, 1);
    assert.equal(data.transfers[1].episode, 2);
    assert.equal(data.transfers[2].episode, 3);
    assert.equal(data.transfers[3].episode, 4);
  });

  it("has z-heights for all 5 key planets", () => {
    const planets = ["mars", "jupiter", "saturn", "uranus", "earth"];
    for (const p of planets) {
      assert.ok(data.planetaryZHeightsAtEpoch[p], `has ${p}`);
      assert.ok(typeof data.planetaryZHeightsAtEpoch[p].zHeightKm === "number", `${p} has zHeightKm`);
      assert.ok(typeof data.planetaryZHeightsAtEpoch[p].latitudeDeg === "number", `${p} has latitudeDeg`);
    }
  });
});

describe("3D orbital analysis: transfer legs", () => {
  it("each transfer has required fields", () => {
    for (const t of data.transfers) {
      assert.ok(t.leg, "has leg label");
      assert.ok(t.departure, "has departure");
      assert.ok(t.arrival, "has arrival");
      assert.ok(typeof t.outOfPlaneDistanceKm === "number", "has outOfPlaneDistanceKm");
      assert.ok(typeof t.inclinationChangeDeg === "number", "has inclinationChangeDeg");
      assert.ok(typeof t.planeChangeDvKmS === "number", "has planeChangeDvKmS");
      assert.ok(typeof t.planeChangeFractionPercent === "number", "has planeChangeFractionPercent");
    }
  });

  it("out-of-plane distances are positive", () => {
    for (const t of data.transfers) {
      assert.ok(t.outOfPlaneDistanceKm >= 0, `${t.leg}: outOfPlane=${t.outOfPlaneDistanceKm}`);
    }
  });

  it("inclination changes are physically reasonable (< 10°)", () => {
    for (const t of data.transfers) {
      assert.ok(
        t.inclinationChangeDeg >= 0 && t.inclinationChangeDeg < 10,
        `${t.leg}: inclination change=${t.inclinationChangeDeg}° (should be < 10° for planetary orbits)`,
      );
    }
  });

  it("plane change ΔV is non-negative", () => {
    for (const t of data.transfers) {
      assert.ok(t.planeChangeDvKmS >= 0, `${t.leg}: planeChangeDv=${t.planeChangeDvKmS}`);
    }
  });

  it("plane change fraction is small (< 5% for most transfers)", () => {
    for (const t of data.transfers) {
      assert.ok(
        t.planeChangeFractionPercent < 5,
        `${t.leg}: planeChangeFraction=${t.planeChangeFractionPercent}%`,
      );
    }
  });

  it("zHeightAU is consistent with zHeightKm / AU_KM", () => {
    for (const t of data.transfers) {
      const expectedAU = t.departure.zHeightKm / AU_KM;
      assert.ok(
        Math.abs(t.departure.zHeightAU - expectedAU) < 1e-10,
        `${t.leg} departure: zHeightAU=${t.departure.zHeightAU} vs km/AU_KM=${expectedAU}`,
      );
    }
  });

  it("EP01 Mars→Jupiter has transfer label", () => {
    assert.ok(data.transfers[0].leg.includes("Mars→Jupiter"));
    assert.equal(data.transfers[0].departure.planet, "mars");
    assert.equal(data.transfers[0].arrival.planet, "jupiter");
  });

  it("EP03 Saturn→Uranus has highest inclination change", () => {
    const ep03 = data.transfers[2];
    assert.ok(ep03.leg.includes("Saturn→Uranus"));
    // Saturn (i≈2.49°) to Uranus (i≈0.77°) has largest Δi among our transfers
    const maxDeltaI = Math.max(...data.transfers.map((t: { inclinationChangeDeg: number }) => t.inclinationChangeDeg));
    assert.equal(ep03.inclinationChangeDeg, maxDeltaI, "EP03 has largest inclination change");
  });
});

describe("3D orbital analysis: Saturn ring analysis", () => {
  const saturn = data.saturnRingAnalysis;

  it("ring plane normal is a unit vector", () => {
    const [nx, ny, nz] = saturn.ringPlaneNormal;
    const mag = Math.sqrt(nx * nx + ny * ny + nz * nz);
    assert.ok(Math.abs(mag - 1.0) < 0.01, `ring normal magnitude=${mag}`);
  });

  it("ring dimensions are physically correct", () => {
    assert.equal(saturn.ringInnerKm, 66_900, "inner ring ≈ 66,900 km");
    assert.equal(saturn.ringOuterKm, 140_180, "outer ring ≈ 140,180 km");
  });

  it("Enceladus orbits outside the rings", () => {
    assert.equal(saturn.enceladusOrbitKm, 238_042, "Enceladus at 238,042 km");
    assert.ok(saturn.enceladusOutsideRings, "Enceladus > ring outer radius");
    assert.ok(saturn.enceladusOrbitKm > saturn.ringOuterKm);
  });

  it("approach angle is physically reasonable", () => {
    const angle = saturn.approachFromJupiter.approachAngleToDeg;
    assert.ok(angle >= 0 && angle <= 90, `approach angle=${angle}°`);
  });

  it("shallow approach gives correct Japanese description", () => {
    const angle = saturn.approachFromJupiter.approachAngleToDeg;
    if (angle <= 30) {
      assert.ok(
        saturn.approachFromJupiter.description.includes("浅い角度"),
        `shallow angle should have '浅い角度' description`,
      );
    }
  });
});

describe("3D orbital analysis: Uranus approach", () => {
  const uranus = data.uranusApproachAnalysis;

  it("Uranus obliquity ≈ 97.77°", () => {
    assert.equal(uranus.obliquityDeg, 97.77);
  });

  it("spin axis is a unit vector", () => {
    const [sx, sy, sz] = uranus.spinAxis;
    const mag = Math.sqrt(sx * sx + sy * sy + sz * sz);
    assert.ok(Math.abs(mag - 1.0) < 0.01, `spin axis magnitude=${mag}`);
  });

  it("Titania orbit and ring dimensions are correct", () => {
    assert.equal(uranus.titaniaOrbitKm, 436_300);
    assert.equal(uranus.ringOuterKm, 51_149);
    assert.ok(uranus.titaniaOrbitKm > uranus.ringOuterKm, "Titania orbits outside rings");
  });

  it("approach angles are in valid range", () => {
    const a1 = uranus.approachFromSaturn.angleToDeg;
    const a2 = uranus.approachFromUranus.angleToDeg;
    assert.ok(a1 >= -90 && a1 <= 90, `from Saturn angle=${a1}°`);
    assert.ok(a2 >= -90 && a2 <= 90, `from Uranus angle=${a2}°`);
  });

  it("polar/equatorial classification is consistent", () => {
    const a = uranus.approachFromSaturn;
    if (Math.abs(a.angleToDeg) < 30) {
      assert.ok(a.isEquatorial, "equatorial approach expected for angle < 30°");
    }
    if (Math.abs(a.angleToDeg) > 60) {
      assert.ok(a.isPolar === false, "should not be both polar and equatorial");
    }
  });
});

describe("3D orbital analysis: planetary z-heights", () => {
  it("Earth has near-zero ecliptic z-height (defines ecliptic)", () => {
    const earth = data.planetaryZHeightsAtEpoch.earth;
    // Earth's orbit defines the ecliptic, so z should be very small
    assert.ok(
      Math.abs(earth.zHeightKm) < 100_000,
      `Earth z=${earth.zHeightKm} km (should be near zero)`,
    );
  });

  it("Mars z-height is non-zero (inclined orbit)", () => {
    const mars = data.planetaryZHeightsAtEpoch.mars;
    // Mars inclination 1.85° → z-height should be several million km
    assert.ok(
      Math.abs(mars.zHeightKm) > 100_000,
      `Mars z=${mars.zHeightKm} km (should be non-trivial)`,
    );
  });

  it("latitudes are in valid range (-90° to 90°)", () => {
    for (const [name, p] of Object.entries(data.planetaryZHeightsAtEpoch) as [string, { latitudeDeg: number }][]) {
      assert.ok(
        p.latitudeDeg >= -90 && p.latitudeDeg <= 90,
        `${name} latitude=${p.latitudeDeg}°`,
      );
    }
  });

  it("inclinations match known values within tolerance", () => {
    // Mars: 1.85°, Jupiter: 1.30°, Saturn: 2.49°, Uranus: 0.77°
    const mars = data.planetaryZHeightsAtEpoch.mars;
    assert.ok(
      Math.abs(mars.inclinationDeg - 1.85) < 0.1,
      `Mars inclination=${mars.inclinationDeg}°, expected ~1.85°`,
    );
    const jupiter = data.planetaryZHeightsAtEpoch.jupiter;
    assert.ok(
      Math.abs(jupiter.inclinationDeg - 1.30) < 0.1,
      `Jupiter inclination=${jupiter.inclinationDeg}°, expected ~1.30°`,
    );
    const saturn = data.planetaryZHeightsAtEpoch.saturn;
    assert.ok(
      Math.abs(saturn.inclinationDeg - 2.49) < 0.1,
      `Saturn inclination=${saturn.inclinationDeg}°, expected ~2.49°`,
    );
    const uranus = data.planetaryZHeightsAtEpoch.uranus;
    assert.ok(
      Math.abs(uranus.inclinationDeg - 0.77) < 0.1,
      `Uranus inclination=${uranus.inclinationDeg}°, expected ~0.77°`,
    );
  });

  it("dates are in the SOLAR LINE epoch (2214-2215)", () => {
    for (const [name, p] of Object.entries(data.planetaryZHeightsAtEpoch) as [string, { date: string }][]) {
      assert.ok(
        p.date.startsWith("2214") || p.date.startsWith("2215"),
        `${name} date=${p.date} (should be 2214 or 2215)`,
      );
    }
  });
});

describe("3D orbital analysis: coplanar approximation", () => {
  it("maxPlaneChangeFractionPercent matches transfer data", () => {
    const maxFromTransfers = Math.max(
      ...data.transfers.map((t: { planeChangeFractionPercent: number }) => t.planeChangeFractionPercent),
    );
    assert.ok(
      Math.abs(data.maxPlaneChangeFractionPercent - maxFromTransfers) < 1e-10,
      `max fraction: top-level=${data.maxPlaneChangeFractionPercent} vs computed=${maxFromTransfers}`,
    );
  });

  it("coplanarApproximationValid is consistent with fraction threshold", () => {
    const expected = data.maxPlaneChangeFractionPercent < 1.0;
    assert.equal(data.coplanarApproximationValid, expected);
  });
});
