/**
 * Tests for orbital-3d-viewer-data.ts utility functions.
 */

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  meanMotionPerDay,
  planetPositionAtTime,
  formatDaysJa,
  prepareFullRouteScene,
  prepareSaturnScene,
  prepareUranusScene,
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

  it("orbit circle radii match AU_TO_SCENE scaling", () => {
    const scene = prepareFullRouteScene(minimalInput);
    const earth = scene.orbitCircles!.find(c => c.name === "earth")!;
    // Earth = 1.0 AU → 1.0 * AU_TO_SCENE scene units
    assert.ok(
      Math.abs(earth.radiusScene - 1.0 * AU_TO_SCENE) < 0.01,
      `Earth orbit radius should be ${1.0 * AU_TO_SCENE}, got ${earth.radiusScene}`,
    );
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
});
