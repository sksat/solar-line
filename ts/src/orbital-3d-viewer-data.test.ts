/**
 * Tests for orbital-3d-viewer-data.ts utility functions.
 */

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  meanMotionPerDay,
  planetPositionAtTime,
  formatDaysJa,
  prepareFullRouteScene,
  prepareSaturnScene,
  prepareUranusScene,
  arcControlPoint,
  arcControlPointLocal,
  offsetFromPlanet,
  LOCAL_SCENE_SCALE,
  AU_TO_SCENE,
} from "./orbital-3d-viewer-data.ts";
import type { TimelineOrbit } from "./orbital-3d-viewer-data.ts";

// ---------------------------------------------------------------------------
// meanMotionPerDay
// ---------------------------------------------------------------------------

describe("meanMotionPerDay", () => {
  it("returns 2π/365.256 for Earth", () => {
    const mm = meanMotionPerDay("earth");
    const expected = (2 * Math.PI) / 365.256;
    assert.ok(
      Math.abs(mm - expected) < 1e-10,
      `Earth mean motion: ${mm}, expected ${expected}`,
    );
  });

  it("returns smaller mean motion for outer planets", () => {
    const mmMars = meanMotionPerDay("mars");
    const mmJupiter = meanMotionPerDay("jupiter");
    const mmSaturn = meanMotionPerDay("saturn");
    assert.ok(mmMars > mmJupiter);
    assert.ok(mmJupiter > mmSaturn);
  });

  it("returns 0 for unknown planet", () => {
    assert.equal(meanMotionPerDay("pluto"), 0);
  });

  it("returns positive values for all known planets", () => {
    for (const p of ["mars", "jupiter", "saturn", "uranus", "earth"]) {
      assert.ok(meanMotionPerDay(p) > 0, `${p} should have positive mean motion`);
    }
  });
});

// ---------------------------------------------------------------------------
// planetPositionAtTime
// ---------------------------------------------------------------------------

describe("planetPositionAtTime", () => {
  const orbit: TimelineOrbit = {
    name: "mars",
    radiusScene: 7.62, // 1.524 AU * 5
    initialAngle: 0,
    meanMotionPerDay: (2 * Math.PI) / 686.97,
    z: 0.1,
  };

  it("returns initial position at time 0", () => {
    const [x, y, z] = planetPositionAtTime(orbit, 0);
    assert.ok(Math.abs(x - orbit.radiusScene) < 1e-10);
    assert.ok(Math.abs(y - 0) < 1e-10);
    assert.equal(z, 0.1);
  });

  it("returns opposite position after half orbit", () => {
    const halfPeriod = 686.97 / 2;
    const [x, y] = planetPositionAtTime(orbit, halfPeriod);
    assert.ok(Math.abs(x - (-orbit.radiusScene)) < 0.01, `x=${x} should be ~${-orbit.radiusScene}`);
    assert.ok(Math.abs(y) < 0.01, `y=${y} should be ~0`);
  });

  it("returns same position after full orbit", () => {
    const period = 686.97;
    const [x, y] = planetPositionAtTime(orbit, period);
    assert.ok(Math.abs(x - orbit.radiusScene) < 0.01);
    assert.ok(Math.abs(y) < 0.01);
  });

  it("preserves z coordinate regardless of time", () => {
    const [, , z1] = planetPositionAtTime(orbit, 0);
    const [, , z2] = planetPositionAtTime(orbit, 100);
    const [, , z3] = planetPositionAtTime(orbit, 500);
    assert.equal(z1, orbit.z);
    assert.equal(z2, orbit.z);
    assert.equal(z3, orbit.z);
  });

  it("respects non-zero initial angle", () => {
    const offsetOrbit: TimelineOrbit = {
      ...orbit,
      initialAngle: Math.PI / 2, // Start at 90°
    };
    const [x, y] = planetPositionAtTime(offsetOrbit, 0);
    assert.ok(Math.abs(x) < 0.01, `x should be ~0 at 90°`);
    assert.ok(Math.abs(y - orbit.radiusScene) < 0.01, `y should be ~radius at 90°`);
  });
});

// ---------------------------------------------------------------------------
// formatDaysJa
// ---------------------------------------------------------------------------

describe("formatDaysJa", () => {
  it("formats sub-day as hours", () => {
    assert.equal(formatDaysJa(0.5), "12時間");
  });

  it("formats 1 day exactly", () => {
    assert.equal(formatDaysJa(1.0), "1日");
  });

  it("formats days with hours", () => {
    assert.equal(formatDaysJa(3.5), "3日12時間");
  });

  it("formats whole days without hours suffix", () => {
    assert.equal(formatDaysJa(7.0), "7日");
  });

  it("formats 30+ days as rounded days", () => {
    assert.equal(formatDaysJa(45.7), "46日");
  });

  it("handles zero hours in under-30-day range", () => {
    // 2.0 days → "2日" (no hours)
    assert.equal(formatDaysJa(2.0), "2日");
  });

  it("formats very small fractions as hours", () => {
    // 0.0417 days ≈ 1 hour
    assert.equal(formatDaysJa(1 / 24), "1時間");
  });
});

// ---------------------------------------------------------------------------
// prepareFullRouteScene
// ---------------------------------------------------------------------------

describe("prepareFullRouteScene", () => {
  const minimalInput = {
    transfers: [
      {
        leg: "EP01 Mars→Jupiter",
        episode: 1,
        departure: { planet: "mars", jd: 2460000, zHeightAU: 0.01, latitudeDeg: 1.0 },
        arrival: { planet: "jupiter", jd: 2460003, zHeightAU: 0.02, latitudeDeg: 1.5 },
      },
    ],
    planetaryZHeightsAtEpoch: {
      mars: { planet: "mars", zHeightAU: 0.01, latitudeDeg: 1.0 },
      jupiter: { planet: "jupiter", zHeightAU: 0.02, latitudeDeg: 1.5 },
      saturn: { planet: "saturn", zHeightAU: 0.03, latitudeDeg: 2.0 },
      uranus: { planet: "uranus", zHeightAU: 0.04, latitudeDeg: 0.5 },
      earth: { planet: "earth", zHeightAU: 0.0, latitudeDeg: 0.0 },
    },
  };

  it("returns scene with type full-route", () => {
    const scene = prepareFullRouteScene(minimalInput);
    assert.equal(scene.type, "full-route");
  });

  it("includes all 5 planets", () => {
    const scene = prepareFullRouteScene(minimalInput);
    assert.equal(scene.planets.length, 5);
    const names = scene.planets.map(p => p.name);
    assert.ok(names.includes("mars"));
    assert.ok(names.includes("earth"));
  });

  it("includes transfer arcs matching input", () => {
    const scene = prepareFullRouteScene(minimalInput);
    assert.equal(scene.transferArcs.length, 1);
  });

  it("includes orbit circles for all 5 planets", () => {
    const scene = prepareFullRouteScene(minimalInput);
    assert.ok(scene.orbitCircles, "should have orbit circles");
    assert.equal(scene.orbitCircles!.length, 5);
    const names = scene.orbitCircles!.map(c => c.name);
    assert.ok(names.includes("mars"));
    assert.ok(names.includes("jupiter"));
    assert.ok(names.includes("saturn"));
    assert.ok(names.includes("uranus"));
    assert.ok(names.includes("earth"));
  });

  it("orbit circle radii increase from inner to outer planets", () => {
    const scene = prepareFullRouteScene(minimalInput);
    const circles = scene.orbitCircles!;
    const earth = circles.find(c => c.name === "earth")!;
    const mars = circles.find(c => c.name === "mars")!;
    const jupiter = circles.find(c => c.name === "jupiter")!;
    const saturn = circles.find(c => c.name === "saturn")!;
    const uranus = circles.find(c => c.name === "uranus")!;
    assert.ok(earth.radiusScene < mars.radiusScene);
    assert.ok(mars.radiusScene < jupiter.radiusScene);
    assert.ok(jupiter.radiusScene < saturn.radiusScene);
    assert.ok(saturn.radiusScene < uranus.radiusScene);
  });

  it("supports both inertial and ship view modes", () => {
    const scene = prepareFullRouteScene(minimalInput);
    assert.ok(scene.supportedViewModes, "should have supported view modes");
    assert.ok(scene.supportedViewModes!.includes("inertial"));
    assert.ok(scene.supportedViewModes!.includes("ship"));
  });

  it("z-heights produce reasonable visual elevation angles", () => {
    // With real-ish z-heights, ensure the visual elevation angle is < 10°
    const inputWithRealisticZ = {
      ...minimalInput,
      planetaryZHeightsAtEpoch: {
        mars: { planet: "mars", zHeightAU: 0.027, latitudeDeg: 1.0 },
        jupiter: { planet: "jupiter", zHeightAU: -0.043, latitudeDeg: -0.5 },
        saturn: { planet: "saturn", zHeightAU: 0.319, latitudeDeg: 2.0 },
        uranus: { planet: "uranus", zHeightAU: 0.244, latitudeDeg: 0.7 },
        earth: { planet: "earth", zHeightAU: 0.0, latitudeDeg: 0.0 },
      },
    };
    const scene = prepareFullRouteScene(inputWithRealisticZ);
    const saturn = scene.planets.find(p => p.name === "saturn")!;
    const saturnR = Math.sqrt(saturn.x ** 2 + saturn.y ** 2);
    const elevAngleDeg = Math.abs(Math.atan2(saturn.z, saturnR)) * (180 / Math.PI);
    // Saturn real inclination is ~2.5° — exaggerated should not exceed 10°
    assert.ok(
      elevAngleDeg < 10,
      `Saturn visual elevation ${elevAngleDeg.toFixed(1)}° exceeds 10° limit`,
    );
  });

  it("orbit circle radii match AU_TO_SCENE scaling", () => {
    const scene = prepareFullRouteScene(minimalInput);
    const earth = scene.orbitCircles!.find(c => c.name === "earth")!;
    // Earth = 1.0 AU → 1.0 * AU_TO_SCENE scene units
    assert.ok(
      Math.abs(earth.radiusScene - 1.0 * AU_TO_SCENE) < 0.01,
      `Earth orbit radius should be ${1.0 * AU_TO_SCENE}, got ${earth.radiusScene}`,
    );
  });

  it("uses eclipticLongitudeRad for initial planet angles when provided", () => {
    const marsLon = 1.5; // ~86°
    const jupiterLon = 3.0; // ~172°
    const inputWithLongitudes = {
      transfers: [
        {
          leg: "EP01 Mars→Jupiter",
          episode: 1,
          departure: { planet: "mars", jd: 2460000, zHeightAU: 0.01, latitudeDeg: 1.0 },
          arrival: { planet: "jupiter", jd: 2460003, zHeightAU: 0.02, latitudeDeg: 1.5 },
        },
      ],
      planetaryZHeightsAtEpoch: {
        mars: { planet: "mars", zHeightAU: 0.01, latitudeDeg: 1.0, eclipticLongitudeRad: marsLon },
        jupiter: { planet: "jupiter", zHeightAU: 0.02, latitudeDeg: 1.5, eclipticLongitudeRad: jupiterLon },
        saturn: { planet: "saturn", zHeightAU: 0.03, latitudeDeg: 2.0, eclipticLongitudeRad: 4.0 },
        uranus: { planet: "uranus", zHeightAU: 0.04, latitudeDeg: 0.5, eclipticLongitudeRad: 5.0 },
        earth: { planet: "earth", zHeightAU: 0.0, latitudeDeg: 0.0, eclipticLongitudeRad: 0.5 },
      },
    };
    const scene = prepareFullRouteScene(inputWithLongitudes);
    const mars = scene.planets.find(p => p.name === "mars")!;
    const marsR = Math.sqrt(mars.x ** 2 + mars.y ** 2);
    const marsAngle = Math.atan2(mars.y, mars.x);
    // The initial angle should match eclipticLongitudeRad (1.5 rad)
    const angleDiff = Math.abs(((marsAngle - marsLon + Math.PI) % (2 * Math.PI)) - Math.PI);
    assert.ok(
      angleDiff < 0.01,
      `Mars angle should be ~${marsLon.toFixed(2)} rad, got ${marsAngle.toFixed(2)} rad`,
    );
    // Timeline orbit initial angle should also match
    const marsOrbit = scene.timeline!.orbits.find(o => o.name === "mars")!;
    assert.ok(
      Math.abs(marsOrbit.initialAngle - marsLon) < 0.01,
      `Mars orbit initialAngle should be ~${marsLon}, got ${marsOrbit.initialAngle}`,
    );
  });

  it("transfer arc endpoints match planet positions at departure/arrival times", () => {
    // With a 3-day transfer, planets should have moved from initial positions
    const longTransferInput = {
      transfers: [
        {
          leg: "EP01 Mars→Jupiter",
          episode: 1,
          departure: { planet: "mars", jd: 2460000, zHeightAU: 0.01, latitudeDeg: 1.0 },
          arrival: { planet: "jupiter", jd: 2460100, zHeightAU: 0.02, latitudeDeg: 1.5 },
        },
      ],
      planetaryZHeightsAtEpoch: minimalInput.planetaryZHeightsAtEpoch,
    };
    const scene = prepareFullRouteScene(longTransferInput);
    const arc = scene.transferArcs[0];

    // The arc departure should match Mars at day 0 (start of mission)
    const marsOrbit = scene.timeline!.orbits.find(o => o.name === "mars")!;
    const [mx0, my0, mz0] = planetPositionAtTime(marsOrbit, 0);
    assert.ok(
      Math.abs(arc.fromPos[0] - mx0) < 0.01 &&
      Math.abs(arc.fromPos[1] - my0) < 0.01,
      `Arc departure should match Mars at day 0`,
    );

    // The arc arrival should match Jupiter at day 100 (not day 0!)
    const jupOrbit = scene.timeline!.orbits.find(o => o.name === "jupiter")!;
    const [jx100, jy100] = planetPositionAtTime(jupOrbit, 100);
    const [jx0, jy0] = planetPositionAtTime(jupOrbit, 0);
    // Jupiter moves ~0.92°/day → in 100 days ~92° → significant displacement
    assert.ok(
      Math.abs(jx100 - jx0) > 0.1,
      `Jupiter should have moved significantly in 100 days (dx=${Math.abs(jx100 - jx0).toFixed(3)})`,
    );
    assert.ok(
      Math.abs(arc.toPos[0] - jx100) < 0.01 &&
      Math.abs(arc.toPos[1] - jy100) < 0.01,
      `Arc arrival should match Jupiter at day 100, not day 0`,
    );
  });

  it("includes transferSummary when outOfPlaneDistanceAU is provided", () => {
    const inputWithAnalysis = {
      transfers: [
        {
          leg: "Mars→Jupiter (72h brachistochrone)",
          episode: 1,
          departure: { planet: "mars", jd: 2460000, zHeightAU: 0.01, latitudeDeg: 1.0 },
          arrival: { planet: "jupiter", jd: 2460003, zHeightAU: 0.02, latitudeDeg: 1.5 },
          outOfPlaneDistanceAU: 0.0699,
          planeChangeFractionPercent: 0.468,
        },
      ],
      planetaryZHeightsAtEpoch: minimalInput.planetaryZHeightsAtEpoch,
    };
    const scene = prepareFullRouteScene(inputWithAnalysis);
    assert.ok(scene.transferSummary, "should have transferSummary");
    assert.equal(scene.transferSummary!.length, 1);
    assert.equal(scene.transferSummary![0].leg, "Mars→Jupiter (72h brachistochrone)");
    assert.ok(Math.abs(scene.transferSummary![0].outOfPlaneDistanceAU - 0.0699) < 0.001);
    assert.ok(Math.abs(scene.transferSummary![0].planeChangeFractionPercent - 0.468) < 0.01);
  });

  it("omits transferSummary when no analysis data present", () => {
    const scene = prepareFullRouteScene(minimalInput);
    assert.equal(scene.transferSummary, undefined);
  });
});

// ---------------------------------------------------------------------------
// prepareSaturnScene
// ---------------------------------------------------------------------------

describe("prepareSaturnScene", () => {
  const saturnInput = {
    saturnRingAnalysis: {
      ringPlaneNormal: [0, 0.45, 0.89] as [number, number, number],
      ringInnerKm: 66_900,
      ringOuterKm: 140_180,
      enceladusOrbitKm: 238_020,
      approachFromJupiter: { approachAngleToDeg: 25 },
    },
  };

  it("returns scene with type saturn-ring", () => {
    const scene = prepareSaturnScene(saturnInput);
    assert.equal(scene.type, "saturn-ring");
  });

  it("includes Saturn as primary body", () => {
    const scene = prepareSaturnScene(saturnInput);
    assert.ok(scene.planets.some(p => p.name === "saturn"));
  });

  it("includes ring data", () => {
    const scene = prepareSaturnScene(saturnInput);
    assert.ok(scene.rings && scene.rings.length > 0);
  });

  it("Enceladus is NOT at the same position as Saturn", () => {
    const scene = prepareSaturnScene(saturnInput);
    const saturn = scene.planets.find(p => p.name === "saturn")!;
    const enceladus = scene.planets.find(p => p.name === "enceladus")!;
    const dx = enceladus.x - saturn.x;
    const dy = enceladus.y - saturn.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    assert.ok(
      dist > 0.1,
      `Enceladus should be visually separated from Saturn (dist=${dist.toFixed(3)})`,
    );
  });

  it("supports inertial and ship view modes", () => {
    const scene = prepareSaturnScene(saturnInput);
    assert.ok(scene.supportedViewModes);
    assert.ok(scene.supportedViewModes!.includes("inertial"));
    assert.ok(scene.supportedViewModes!.includes("ship"));
  });

  it("has timeline with Enceladus orbit for animation", () => {
    const scene = prepareSaturnScene(saturnInput);
    assert.ok(scene.timeline, "Saturn scene should have timeline");
    assert.equal(scene.timeline!.orbits.length, 1);
    assert.equal(scene.timeline!.orbits[0].name, "enceladus");
    assert.ok(scene.timeline!.orbits[0].meanMotionPerDay > 4,
      "Enceladus should orbit fast (~4.59 rad/day)");
  });

  it("Enceladus position is at orbitRadius distance from Saturn", () => {
    const scene = prepareSaturnScene(saturnInput);
    const saturn = scene.planets.find(p => p.name === "saturn")!;
    const enceladus = scene.planets.find(p => p.name === "enceladus")!;
    const dx = enceladus.x - saturn.x;
    const dy = enceladus.y - saturn.y;
    const dz = enceladus.z - saturn.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    // 238,020 km / 50,000 = 4.76 scene units
    const expectedDist = 238_020 / LOCAL_SCENE_SCALE;
    assert.ok(
      Math.abs(dist - expectedDist) < 0.1,
      `Enceladus distance from Saturn should be ~${expectedDist.toFixed(2)}, got ${dist.toFixed(2)}`,
    );
  });

  it("timeline transfers have from/to planet names", () => {
    const scene = prepareSaturnScene(saturnInput);
    const transfers = scene.timeline!.transfers;
    assert.strictEqual(transfers[0].from, "jupiter");
    assert.strictEqual(transfers[0].to, "saturn");
  });
});

// ---------------------------------------------------------------------------
// prepareUranusScene
// ---------------------------------------------------------------------------

describe("prepareUranusScene", () => {
  const uranusInput = {
    uranusApproachAnalysis: {
      spinAxis: [0.97, 0, 0.24] as [number, number, number],
      obliquityDeg: 97.77,
      titaniaOrbitKm: 436_300,
      ringOuterKm: 51_149,
      approachFromSaturn: { angleToDeg: 25.3 },
      approachFromUranus: { angleToDeg: 14.3 },
    },
  };

  it("returns scene with type uranus-approach", () => {
    const scene = prepareUranusScene(uranusInput);
    assert.equal(scene.type, "uranus-approach");
  });

  it("includes Uranus as primary body", () => {
    const scene = prepareUranusScene(uranusInput);
    assert.ok(scene.planets.some(p => p.name === "uranus"));
  });

  it("Titania is NOT at the same position as Uranus", () => {
    const scene = prepareUranusScene(uranusInput);
    const uranus = scene.planets.find(p => p.name === "uranus")!;
    const titania = scene.planets.find(p => p.name === "titania")!;
    const dx = titania.x - uranus.x;
    const dy = titania.y - uranus.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    assert.ok(
      dist > 0.1,
      `Titania should be visually separated from Uranus (dist=${dist.toFixed(3)})`,
    );
  });

  it("has timeline with Titania orbit for animation", () => {
    const scene = prepareUranusScene(uranusInput);
    assert.ok(scene.timeline, "Uranus scene should have timeline");
    assert.equal(scene.timeline!.orbits.length, 1);
    assert.equal(scene.timeline!.orbits[0].name, "titania");
    assert.ok(scene.timeline!.orbits[0].meanMotionPerDay > 0.7,
      "Titania should orbit (~0.72 rad/day)");
  });

  it("Titania position is at orbitRadius distance from Uranus", () => {
    const scene = prepareUranusScene(uranusInput);
    const uranus = scene.planets.find(p => p.name === "uranus")!;
    const titania = scene.planets.find(p => p.name === "titania")!;
    const dx = titania.x - uranus.x;
    const dy = titania.y - uranus.y;
    const dz = titania.z - uranus.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    // 436,300 km / 50,000 = 8.726 scene units
    const expectedDist = 436_300 / LOCAL_SCENE_SCALE;
    assert.ok(
      Math.abs(dist - expectedDist) < 0.1,
      `Titania distance from Uranus should be ~${expectedDist.toFixed(2)}, got ${dist.toFixed(2)}`,
    );
  });

  it("supports inertial and ship view modes", () => {
    const scene = prepareUranusScene(uranusInput);
    assert.ok(scene.supportedViewModes);
    assert.ok(scene.supportedViewModes!.includes("inertial"));
    assert.ok(scene.supportedViewModes!.includes("ship"));
  });

  it("timeline transfers have from/to planet names", () => {
    const scene = prepareUranusScene(uranusInput);
    const transfers = scene.timeline!.transfers;
    assert.strictEqual(transfers[0].from, "saturn");
    assert.strictEqual(transfers[0].to, "uranus");
  });
});

// ---------------------------------------------------------------------------
// Constants and cross-cutting checks
// ---------------------------------------------------------------------------

describe("3D viewer constants", () => {
  it("LOCAL_SCENE_SCALE is 50,000 km per scene unit", () => {
    assert.equal(LOCAL_SCENE_SCALE, 50_000);
  });

  it("AU_TO_SCENE is 5 scene units per AU", () => {
    assert.equal(AU_TO_SCENE, 5);
  });
});

describe("orbit circle z-heights match planet z-heights", () => {
  const input = {
    transfers: [
      {
        leg: "EP01 Mars→Jupiter",
        episode: 1,
        departure: { planet: "mars", jd: 2460000, zHeightAU: 0.027, latitudeDeg: 1.0 },
        arrival: { planet: "jupiter", jd: 2460003, zHeightAU: -0.043, latitudeDeg: -0.5 },
      },
    ],
    planetaryZHeightsAtEpoch: {
      mars: { planet: "mars", zHeightAU: 0.027, latitudeDeg: 1.0 },
      jupiter: { planet: "jupiter", zHeightAU: -0.043, latitudeDeg: -0.5 },
      saturn: { planet: "saturn", zHeightAU: 0.319, latitudeDeg: 2.0 },
      uranus: { planet: "uranus", zHeightAU: 0.244, latitudeDeg: 0.7 },
      earth: { planet: "earth", zHeightAU: 0.0, latitudeDeg: 0.0 },
    },
  };

  it("each orbit circle z matches its planet z", () => {
    const scene = prepareFullRouteScene(input);
    for (const circle of scene.orbitCircles!) {
      const planet = scene.planets.find(p => p.name === circle.name)!;
      assert.ok(
        Math.abs(circle.z - planet.z) < 0.01,
        `${circle.name} orbit z=${circle.z.toFixed(3)} should match planet z=${planet.z.toFixed(3)}`,
      );
    }
  });

  it("planet animated positions at arrival day match expected arrival longitudes", () => {
    // Mars at mission start: longitude 1.431 rad
    // Jupiter arrival is at day 3: Jupiter should be at its own longitude at that JD
    // The initialAngle should be set from mission-start longitudes,
    // and meanMotion propagation should bring planets to correct arrival positions.
    const marsStartLon = 1.431;  // Mars at departure (day 0)
    const jupStartLon = 1.375;   // Jupiter at mission start (day 0), NOT at arrival
    const satStartLon = 2.860;   // Saturn at mission start
    const uranStartLon = 2.670;  // Uranus at mission start
    const earthStartLon = 2.510; // Earth at mission start
    const multiTransferInput = {
      transfers: [
        {
          leg: "Mars→Jupiter",
          episode: 1,
          departure: { planet: "mars", jd: 2460000, zHeightAU: 0.01, latitudeDeg: 1.0 },
          arrival: { planet: "jupiter", jd: 2460003, zHeightAU: -0.04, latitudeDeg: -0.5 },
        },
        {
          leg: "Jupiter→Saturn",
          episode: 2,
          departure: { planet: "jupiter", jd: 2460006, zHeightAU: -0.04, latitudeDeg: -0.5 },
          arrival: { planet: "saturn", jd: 2460093, zHeightAU: 0.32, latitudeDeg: 2.0 },
        },
      ],
      planetaryZHeightsAtEpoch: {
        mars: { planet: "mars", zHeightAU: 0.01, latitudeDeg: 1.0, eclipticLongitudeRad: marsStartLon },
        jupiter: { planet: "jupiter", zHeightAU: -0.04, latitudeDeg: -0.5, eclipticLongitudeRad: jupStartLon },
        saturn: { planet: "saturn", zHeightAU: 0.32, latitudeDeg: 2.0, eclipticLongitudeRad: satStartLon },
        uranus: { planet: "uranus", zHeightAU: 0.24, latitudeDeg: 0.7, eclipticLongitudeRad: uranStartLon },
        earth: { planet: "earth", zHeightAU: 0.0, latitudeDeg: 0.0, eclipticLongitudeRad: earthStartLon },
      },
    };
    const scene = prepareFullRouteScene(multiTransferInput);

    // At day 0, all planets should be at their mission-start longitudes
    for (const orbit of scene.timeline!.orbits) {
      const [x, y] = planetPositionAtTime(orbit, 0);
      const angle = Math.atan2(y, x);
      const expectedLon = (multiTransferInput.planetaryZHeightsAtEpoch as Record<string, { eclipticLongitudeRad?: number }>)[orbit.name]?.eclipticLongitudeRad ?? 0;
      let diff = Math.abs(angle - expectedLon);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      assert.ok(
        diff < 0.01,
        `${orbit.name} at day 0: angle=${angle.toFixed(4)} should match mission-start longitude=${expectedLon.toFixed(4)} (diff=${diff.toFixed(4)})`,
      );
    }

    // At Jupiter arrival (day 3), Jupiter animated position should be at
    // jupStartLon + 3 * meanMotion, which is Jupiter's correct arrival position
    const jupOrbit = scene.timeline!.orbits.find(o => o.name === "jupiter")!;
    const [jx3, jy3] = planetPositionAtTime(jupOrbit, 3);
    const jupAngleAtDay3 = Math.atan2(jy3, jx3);
    const expectedJupDay3 = jupStartLon + 3 * meanMotionPerDay("jupiter");
    let jupDiff = Math.abs(jupAngleAtDay3 - expectedJupDay3);
    if (jupDiff > Math.PI) jupDiff = 2 * Math.PI - jupDiff;
    assert.ok(
      jupDiff < 0.001,
      `Jupiter at day 3: angle=${jupAngleAtDay3.toFixed(4)} should be ${expectedJupDay3.toFixed(4)}`,
    );

    // The arc endpoint (toPos) for EP01 should match Jupiter's animated position at day 3
    const ep01Arc = scene.transferArcs[0];
    const arcToAngle = Math.atan2(ep01Arc.toPos[1], ep01Arc.toPos[0]);
    let arcJupDiff = Math.abs(arcToAngle - jupAngleAtDay3);
    if (arcJupDiff > Math.PI) arcJupDiff = 2 * Math.PI - arcJupDiff;
    assert.ok(
      arcJupDiff < 0.01,
      `EP01 arc arrival angle=${arcToAngle.toFixed(4)} should match Jupiter animated angle=${jupAngleAtDay3.toFixed(4)}`,
    );
  });

  it("timeline transfers have from/to planet names", () => {
    const scene = prepareFullRouteScene(input);
    const transfers = scene.timeline!.transfers;
    assert.strictEqual(transfers.length, 1);
    assert.strictEqual(transfers[0].from, "mars");
    assert.strictEqual(transfers[0].to, "jupiter");
  });

  it("planetLongitudesAtMissionStart takes precedence over eclipticLongitudeRad", () => {
    const inputWithBoth = {
      ...input,
      planetaryZHeightsAtEpoch: {
        mars: { planet: "mars", zHeightAU: 0.027, latitudeDeg: 1.0, eclipticLongitudeRad: 1.0 },
        jupiter: { planet: "jupiter", zHeightAU: -0.043, latitudeDeg: -0.5, eclipticLongitudeRad: 2.0 },
        saturn: { planet: "saturn", zHeightAU: 0.319, latitudeDeg: 2.0, eclipticLongitudeRad: 3.0 },
        uranus: { planet: "uranus", zHeightAU: 0.244, latitudeDeg: 0.7, eclipticLongitudeRad: 4.0 },
        earth: { planet: "earth", zHeightAU: 0.0, latitudeDeg: 0.0, eclipticLongitudeRad: 5.0 },
      },
      planetLongitudesAtMissionStart: {
        mars: 0.5, jupiter: 1.5, saturn: 2.5, uranus: 3.5, earth: 4.5,
      },
    };
    const scene = prepareFullRouteScene(inputWithBoth);
    // Mars planet should be at mission-start angle 0.5, not eclipticLongitudeRad 1.0
    const mars = scene.planets.find(p => p.name === "mars")!;
    const marsAngle = Math.atan2(mars.y, mars.x);
    let diff = Math.abs(marsAngle - 0.5);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    assert.ok(diff < 0.01, `Mars angle ${marsAngle.toFixed(3)} should be ~0.5 (missionStart), not ~1.0 (eclipticLon)`);
    // Orbit initialAngle should also be from mission-start
    const marsOrbit = scene.timeline!.orbits.find(o => o.name === "mars")!;
    let orbitDiff = Math.abs(marsOrbit.initialAngle - 0.5);
    if (orbitDiff > Math.PI) orbitDiff = 2 * Math.PI - orbitDiff;
    assert.ok(orbitDiff < 0.01, `Mars orbit initialAngle ${marsOrbit.initialAngle.toFixed(3)} should be ~0.5`);
  });

  it("generates parking orbits between transfer gaps", () => {
    // Create input with two transfers separated by a gap
    const gapInput = {
      transfers: [
        {
          leg: "Mars→Jupiter",
          episode: 1,
          departure: { planet: "mars", jd: 2460000, zHeightAU: 0.01, latitudeDeg: 1.0 },
          arrival: { planet: "jupiter", jd: 2460003, zHeightAU: -0.04, latitudeDeg: -0.5 },
        },
        {
          leg: "Jupiter→Saturn",
          episode: 2,
          departure: { planet: "jupiter", jd: 2460010, zHeightAU: -0.04, latitudeDeg: -0.5 },
          arrival: { planet: "saturn", jd: 2460100, zHeightAU: 0.32, latitudeDeg: 2.0 },
        },
      ],
      planetaryZHeightsAtEpoch: input.planetaryZHeightsAtEpoch,
    };
    const scene = prepareFullRouteScene(gapInput);
    const parking = scene.timeline!.parkingOrbits;
    assert.ok(parking, "should have parking orbits");
    // totalDays = 100 = last arrival, so only 1 gap: at Jupiter (day 3 to day 10)
    assert.strictEqual(parking!.length, 1, "1 parking orbit: at Jupiter between legs");
    assert.strictEqual(parking![0].planet, "jupiter");
    assert.strictEqual(parking![0].startDay, 3);
    assert.strictEqual(parking![0].endDay, 10);
    assert.ok(parking![0].radiusScene > 0, "radius should be positive");
    assert.ok(parking![0].angularVelocityPerDay > 0, "angular velocity should be positive");
  });

  it("parking orbit radius is 2× planet display radius (full-route 3× scale)", () => {
    const gapInput = {
      transfers: [
        {
          leg: "Mars→Jupiter",
          episode: 1,
          departure: { planet: "mars", jd: 2460000, zHeightAU: 0.01, latitudeDeg: 1.0 },
          arrival: { planet: "jupiter", jd: 2460003, zHeightAU: -0.04, latitudeDeg: -0.5 },
        },
        {
          leg: "Jupiter→Saturn",
          episode: 2,
          departure: { planet: "jupiter", jd: 2460010, zHeightAU: -0.04, latitudeDeg: -0.5 },
          arrival: { planet: "saturn", jd: 2460100, zHeightAU: 0.32, latitudeDeg: 2.0 },
        },
      ],
      planetaryZHeightsAtEpoch: input.planetaryZHeightsAtEpoch,
    };
    const scene = prepareFullRouteScene(gapInput);
    const jupParking = scene.timeline!.parkingOrbits![0];
    // Jupiter display radius = 0.4, full-route scale 3× = 1.2, orbit = 2× = 2.4
    assert.ok(Math.abs(jupParking.radiusScene - 2.4) < 0.01,
      `Jupiter parking radius ${jupParking.radiusScene} should be 2.4`);
  });

  it("no parking orbits when transfers are back-to-back", () => {
    // Single transfer, totalDays = endDay → no gap at end
    const scene = prepareFullRouteScene(input);
    // With 1 transfer and totalDays = endDay, there's no gap
    assert.ok(
      !scene.timeline!.parkingOrbits || scene.timeline!.parkingOrbits.length === 0,
      "No parking orbits when no gaps between transfers",
    );
  });

  it("transfer arc endpoints are at different ecliptic-plane angles for curved arc rendering", () => {
    const scene = prepareFullRouteScene(input);
    for (const arc of scene.transferArcs) {
      const fromAngle = Math.atan2(arc.fromPos[1], arc.fromPos[0]);
      const toAngle = Math.atan2(arc.toPos[1], arc.toPos[0]);
      // Arcs between different planets should have different ecliptic-plane angles
      // (needed by arcControlPoint in the viewer to compute in-plane curvature)
      assert.ok(
        Math.abs(fromAngle - toAngle) > 0.01,
        `${arc.from}→${arc.to}: fromAngle=${fromAngle.toFixed(3)} and toAngle=${toAngle.toFixed(3)} should differ`,
      );
    }
  });

  it("transfer arc endpoints are not at the origin (non-degenerate)", () => {
    const scene = prepareFullRouteScene(input);
    for (const arc of scene.transferArcs) {
      const fromR = Math.sqrt(arc.fromPos[0] ** 2 + arc.fromPos[1] ** 2);
      const toR = Math.sqrt(arc.toPos[0] ** 2 + arc.toPos[1] ** 2);
      assert.ok(fromR > 1, `${arc.from} fromPos radius ${fromR.toFixed(2)} should be > 1 scene unit`);
      assert.ok(toR > 1, `${arc.to} toPos radius ${toR.toFixed(2)} should be > 1 scene unit`);
    }
  });
});

// ---------------------------------------------------------------------------
// Geometry helpers (arcControlPoint, arcControlPointLocal, offsetFromPlanet)
// ---------------------------------------------------------------------------

describe("arcControlPoint", () => {
  it("places control point at angular midpoint between two positions", () => {
    // Two points at 0° and 90° in the XZ ecliptic plane, both at radius 10
    const from: [number, number, number] = [10, 0, 0];  // angle 0°
    const to: [number, number, number] = [0, 0, 10];    // angle 90°
    const ctrl = arcControlPoint(from, to);
    // Angular midpoint = 45°, radius = 10
    const expectedX = 10 * Math.cos(Math.PI / 4);
    const expectedZ = 10 * Math.sin(Math.PI / 4);
    assert.ok(Math.abs(ctrl[0] - expectedX) < 0.1, `x=${ctrl[0].toFixed(2)} should be ~${expectedX.toFixed(2)}`);
    assert.ok(Math.abs(ctrl[2] - expectedZ) < 0.1, `z=${ctrl[2].toFixed(2)} should be ~${expectedZ.toFixed(2)}`);
  });

  it("averages radii when from and to have different orbital distances", () => {
    // Mars orbit (~7.6 scene) to Jupiter orbit (~26 scene)
    const from: [number, number, number] = [7.6, 0, 0];
    const to: [number, number, number] = [26, 0, 0.01]; // tiny z offset for different angle
    const ctrl = arcControlPoint(from, to);
    const ctrlR = Math.sqrt(ctrl[0] * ctrl[0] + ctrl[2] * ctrl[2]);
    const expectedR = (7.6 + 26) / 2;
    assert.ok(Math.abs(ctrlR - expectedR) < 1, `radius=${ctrlR.toFixed(1)} should be ~${expectedR.toFixed(1)}`);
  });

  it("handles angle wrapping across ±π boundary", () => {
    // from at ~170°, to at ~-170° (should go through 180°, not 0°)
    const fromAngle = 170 * Math.PI / 180;
    const toAngle = -170 * Math.PI / 180;
    const from: [number, number, number] = [10 * Math.cos(fromAngle), 0, 10 * Math.sin(fromAngle)];
    const to: [number, number, number] = [10 * Math.cos(toAngle), 0, 10 * Math.sin(toAngle)];
    const ctrl = arcControlPoint(from, to);
    const ctrlAngle = Math.atan2(ctrl[2], ctrl[0]);
    // Midpoint should be near ±180° (either +π or -π)
    assert.ok(Math.abs(Math.abs(ctrlAngle) - Math.PI) < 0.2,
      `ctrl angle=${(ctrlAngle * 180 / Math.PI).toFixed(1)}° should be near ±180°`);
  });

  it("adds a small Y bump above the midpoint height", () => {
    const from: [number, number, number] = [10, 1, 0];
    const to: [number, number, number] = [0, 3, 10];
    const ctrl = arcControlPoint(from, to);
    const midY = (1 + 3) / 2;
    assert.ok(ctrl[1] > midY, `y=${ctrl[1].toFixed(2)} should be > midY=${midY}`);
  });
});

describe("arcControlPointLocal", () => {
  it("places control point at lateral offset from chord midpoint", () => {
    const from: [number, number, number] = [10, 0, 0];
    const to: [number, number, number] = [0, 0, 0];
    const ctrl = arcControlPointLocal(from, to);
    // Midpoint = [5, 0, 0]; lateral should be perpendicular to approach dir
    // Approach dir = [-1, 0, 0], cross with Y-up [0,1,0] = [0, 0, 1]
    // So lateral offset should be in Z direction
    assert.ok(Math.abs(ctrl[2]) > 0.1, `z=${ctrl[2].toFixed(2)} should have lateral offset`);
  });

  it("adds a small Y bump", () => {
    const from: [number, number, number] = [10, 0, 0];
    const to: [number, number, number] = [0, 0, 0];
    const ctrl = arcControlPointLocal(from, to);
    assert.ok(ctrl[1] > 0, `y=${ctrl[1].toFixed(2)} should be > 0 (Y bump)`);
  });

  it("lateral offset is ~20% of chord distance", () => {
    const from: [number, number, number] = [10, 0, 0];
    const to: [number, number, number] = [0, 0, 0];
    const dist = 10;
    const ctrl = arcControlPointLocal(from, to);
    // Lateral offset should be dist * 0.2 = 2.0
    assert.ok(Math.abs(ctrl[2] - dist * 0.2) < 0.5,
      `lateral offset ${ctrl[2].toFixed(2)} should be ~${(dist * 0.2).toFixed(1)}`);
  });
});

describe("offsetFromPlanet", () => {
  it("displaces point away from planet center toward other point", () => {
    const point: [number, number, number] = [5, 0, 0];
    const other: [number, number, number] = [10, 0, 0];
    const result = offsetFromPlanet(point, other, "mars", "full-route");
    // Mars radius=0.15, full-route scale 3×, so displayRadius=0.45, offset=0.675
    assert.ok(result[0] > point[0], `x=${result[0].toFixed(3)} should be > ${point[0]} (displaced toward other)`);
    assert.ok(result[0] < other[0], `x=${result[0].toFixed(3)} should be < ${other[0]}`);
  });

  it("uses larger display radius in full-route mode (3× scale)", () => {
    const point: [number, number, number] = [5, 0, 0];
    const other: [number, number, number] = [10, 0, 0];
    const fullRoute = offsetFromPlanet(point, other, "mars", "full-route");
    const local = offsetFromPlanet(point, other, "mars", "saturn-ring");
    // full-route offset should be 3× larger than local
    const fullDist = fullRoute[0] - point[0];
    const localDist = local[0] - point[0];
    assert.ok(Math.abs(fullDist / localDist - 3) < 0.01,
      `full-route offset ${fullDist.toFixed(3)} should be 3× local ${localDist.toFixed(3)}`);
  });

  it("returns default radius for unknown planet", () => {
    const point: [number, number, number] = [5, 0, 0];
    const other: [number, number, number] = [10, 0, 0];
    // Should not throw, just use default 0.15
    const result = offsetFromPlanet(point, other, "pluto", "full-route");
    assert.ok(result[0] > point[0]);
  });
});

// ---------------------------------------------------------------------------
// Real data arrival alignment (uses 3d_orbital_analysis.json)
// ---------------------------------------------------------------------------

describe("arrival alignment with real analysis data", () => {
  // Load the actual 3D analysis JSON
  const analysisPath = new URL(
    "../../reports/data/calculations/3d_orbital_analysis.json",
    import.meta.url,
  );
  const analysis = JSON.parse(readFileSync(analysisPath, "utf-8"));

  it("mission-start longitudes produce correct planet positions at each arrival JD", () => {
    const scene = prepareFullRouteScene(analysis);
    const firstJd = analysis.transfers[0].departure.jd;

    for (const transfer of analysis.transfers) {
      const arrivalPlanet = transfer.arrival.planet;
      const arrDay = transfer.arrival.jd - firstJd;
      const orbit = scene.timeline!.orbits.find(o => o.name === arrivalPlanet)!;
      const [ax, ay] = planetPositionAtTime(orbit, arrDay);
      const animatedAngle = Math.atan2(ay, ax);

      // The expected angle is the planet's ecliptic longitude at arrival JD
      const expectedAngle = transfer.arrival.eclipticLongitudeRad;

      // Compare angles (handle wrapping)
      let diff = Math.abs(animatedAngle - expectedAngle);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;

      // Allow up to 0.1 rad (~6°) — constant mean motion approximation has inherent error
      // vs. true ephemeris (due to orbital eccentricity). ~3° for Earth over 124 days.
      assert.ok(
        diff < 0.1,
        `${arrivalPlanet} at day ${arrDay.toFixed(1)}: animated angle=${animatedAngle.toFixed(4)} ` +
        `vs expected=${expectedAngle.toFixed(4)}, diff=${diff.toFixed(4)} rad (${(diff * 180 / Math.PI).toFixed(1)}°)`,
      );
    }
  });

  it("arc toPos angle matches animated planet position at arrival day", () => {
    const scene = prepareFullRouteScene(analysis);
    const firstJd = analysis.transfers[0].departure.jd;

    for (let i = 0; i < scene.transferArcs.length; i++) {
      const arc = scene.transferArcs[i];
      const transfer = analysis.transfers[i];
      const arrDay = transfer.arrival.jd - firstJd;
      const orbit = scene.timeline!.orbits.find(o => o.name === arc.to)!;
      const [ax, ay] = planetPositionAtTime(orbit, arrDay);
      const animatedAngle = Math.atan2(ay, ax);
      const arcAngle = Math.atan2(arc.toPos[1], arc.toPos[0]);

      // Arc endpoint and animated planet should be at the same angle
      let diff = Math.abs(arcAngle - animatedAngle);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      assert.ok(
        diff < 0.01,
        `${arc.from}→${arc.to}: arc toPos angle=${arcAngle.toFixed(4)} ` +
        `vs animated=${animatedAngle.toFixed(4)}, diff=${diff.toFixed(4)} rad`,
      );
    }
  });

  it("timeline transfers have from/to matching analysis transfer planets", () => {
    const scene = prepareFullRouteScene(analysis);
    const transfers = scene.timeline!.transfers;
    assert.strictEqual(transfers.length, analysis.transfers.length);
    for (let i = 0; i < transfers.length; i++) {
      assert.strictEqual(transfers[i].from, analysis.transfers[i].departure.planet,
        `Transfer ${i} from should be ${analysis.transfers[i].departure.planet}`);
      assert.strictEqual(transfers[i].to, analysis.transfers[i].arrival.planet,
        `Transfer ${i} to should be ${analysis.transfers[i].arrival.planet}`);
    }
  });
});
