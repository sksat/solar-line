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
});
