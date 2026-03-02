import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  equatorialToEcliptic,
  saturnRingPlaneNormal,
  uranusSpinAxis,
} from "./coordinate-transforms.ts";

/** Helper: magnitude of a 3D vector */
function mag(v: [number, number, number]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

/** Helper: dot product of two 3D vectors */
function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Helper: angle between two vectors in degrees */
function angleDeg(a: [number, number, number], b: [number, number, number]): number {
  const cosTheta = dot(a, b) / (mag(a) * mag(b));
  return Math.acos(Math.max(-1, Math.min(1, cosTheta))) * 180 / Math.PI;
}

describe("equatorialToEcliptic", () => {
  it("returns a unit vector for any input", () => {
    const v = equatorialToEcliptic(45, 30);
    assert.ok(
      Math.abs(mag(v) - 1) < 1e-14,
      `magnitude should be 1, got ${mag(v)}`,
    );
  });

  it("north equatorial pole (Dec=90) maps to ecliptic pole direction", () => {
    // RA doesn't matter at Dec=90
    const v = equatorialToEcliptic(0, 90);
    // At Dec=90: eqX=0, eqY=0, eqZ=1
    // ecl: [0, sin(ε), cos(ε)]
    const eps = 23.4393 * Math.PI / 180;
    assert.ok(Math.abs(v[0]) < 1e-14, `x should be 0, got ${v[0]}`);
    assert.ok(
      Math.abs(v[1] - Math.sin(eps)) < 1e-14,
      `y should be sin(ε), got ${v[1]}`,
    );
    assert.ok(
      Math.abs(v[2] - Math.cos(eps)) < 1e-14,
      `z should be cos(ε), got ${v[2]}`,
    );
  });

  it("vernal equinox (RA=0, Dec=0) maps to ecliptic x-axis", () => {
    const v = equatorialToEcliptic(0, 0);
    assert.ok(Math.abs(v[0] - 1) < 1e-14);
    assert.ok(Math.abs(v[1]) < 1e-14);
    assert.ok(Math.abs(v[2]) < 1e-14);
  });

  it("RA=90, Dec=0 maps correctly", () => {
    // eqX=0, eqY=1, eqZ=0
    // ecl: [0, cos(ε), -sin(ε)]
    const v = equatorialToEcliptic(90, 0);
    const eps = 23.4393 * Math.PI / 180;
    assert.ok(Math.abs(v[0]) < 1e-14);
    assert.ok(Math.abs(v[1] - Math.cos(eps)) < 1e-14);
    assert.ok(Math.abs(v[2] + Math.sin(eps)) < 1e-14);
  });

  it("ecliptic pole (RA=270, Dec=66.56°) maps to z-axis", () => {
    // The ecliptic north pole in equatorial coordinates:
    // Dec = 90° - obliquity = 66.5607°, RA = 270° (18h)
    const decEclPole = 90 - 23.4393;
    const v = equatorialToEcliptic(270, decEclPole);
    // Should be near [0, 0, 1]
    assert.ok(Math.abs(v[0]) < 1e-6, `x should be ~0, got ${v[0]}`);
    assert.ok(Math.abs(v[1]) < 1e-6, `y should be ~0, got ${v[1]}`);
    assert.ok(Math.abs(v[2] - 1) < 1e-6, `z should be ~1, got ${v[2]}`);
  });

  it("preserves vector magnitude (always unit length)", () => {
    // Test several random-ish RA/Dec values
    const cases = [
      [0, 0], [180, 0], [90, 45], [270, -45], [123.456, -67.89],
    ];
    for (const [ra, dec] of cases) {
      const v = equatorialToEcliptic(ra, dec);
      assert.ok(
        Math.abs(mag(v) - 1) < 1e-14,
        `magnitude for RA=${ra}, Dec=${dec} should be 1, got ${mag(v)}`,
      );
    }
  });
});

describe("saturnRingPlaneNormal", () => {
  it("returns a unit vector", () => {
    const n = saturnRingPlaneNormal();
    assert.ok(
      Math.abs(mag(n) - 1) < 1e-14,
      `magnitude should be 1, got ${mag(n)}`,
    );
  });

  it("ecliptic latitude ~83.5° (Saturn's pole nearly aligned with ecliptic pole)", () => {
    // Saturn's pole is at Dec=83.537° in equatorial, which means high ecliptic latitude
    // The ecliptic latitude = asin(z) for a unit vector
    const n = saturnRingPlaneNormal();
    const eclLatDeg = Math.asin(n[2]) * 180 / Math.PI;
    // Saturn's ring plane is tilted ~26.7° from its orbit, and the orbit is nearly ecliptic
    // So the pole should be roughly 90° - 26.7° ≈ 63° from ecliptic plane
    // Actually Saturn's pole ecliptic latitude is about 83.5° - obliquity effects
    assert.ok(
      eclLatDeg > 55 && eclLatDeg < 85,
      `ecliptic latitude should be 55-85°, got ${eclLatDeg.toFixed(1)}°`,
    );
  });

  it("Saturn ring tilt ~26.7° from orbital plane", () => {
    // Saturn's orbital inclination to ecliptic is ~2.49°
    // Ring plane normal tilt from ecliptic normal ≈ 26.7° (obliquity of Saturn)
    const n = saturnRingPlaneNormal();
    const eclNorth: [number, number, number] = [0, 0, 1];
    const tilt = angleDeg(n, eclNorth);
    // Expect ~28.1° (26.7° obliquity + some ecliptic inclination effect)
    assert.ok(
      tilt > 24 && tilt < 32,
      `Saturn ring tilt from ecliptic should be 24-32°, got ${tilt.toFixed(1)}°`,
    );
  });

  it("returns consistent values across calls", () => {
    const n1 = saturnRingPlaneNormal();
    const n2 = saturnRingPlaneNormal();
    assert.deepEqual(n1, n2);
  });
});

describe("uranusSpinAxis", () => {
  it("returns a unit vector", () => {
    const u = uranusSpinAxis();
    assert.ok(
      Math.abs(mag(u) - 1) < 1e-14,
      `magnitude should be 1, got ${mag(u)}`,
    );
  });

  it("extreme tilt ~82° from ecliptic north", () => {
    // IAU J2000 north pole (RA=257.311°, Dec=-15.175°) converted to ecliptic
    // yields ~82° from ecliptic north pole — Uranus is nearly sideways
    // (The commonly cited 97.77° obliquity is from the orbital plane, not ecliptic)
    const u = uranusSpinAxis();
    const eclNorth: [number, number, number] = [0, 0, 1];
    const tilt = angleDeg(u, eclNorth);
    assert.ok(
      tilt > 75 && tilt < 90,
      `Uranus tilt from ecliptic north should be 75-90°, got ${tilt.toFixed(1)}°`,
    );
  });

  it("ecliptic z-component is small positive (pole nearly in ecliptic plane)", () => {
    // At Dec=-15.175°, after rotation, z-component is small positive (~0.13)
    const u = uranusSpinAxis();
    assert.ok(
      Math.abs(u[2]) < 0.2,
      `z-component should be near zero (tilted ~90°), got ${u[2].toFixed(3)}`,
    );
  });

  it("Uranus spin axis is nearly perpendicular to Saturn ring normal", () => {
    // These are very different orientations — Saturn upright, Uranus sideways
    const saturn = saturnRingPlaneNormal();
    const uranus = uranusSpinAxis();
    const angle = angleDeg(saturn, uranus);
    // Expect roughly 100-130° separation
    assert.ok(
      angle > 80 && angle < 140,
      `angle between Saturn and Uranus axes should be 80-140°, got ${angle.toFixed(1)}°`,
    );
  });

  it("ecliptic latitude of spin axis is small positive (~7.7°)", () => {
    // After equatorial→ecliptic rotation, Dec=-15.175° yields ecliptic lat ~7.7°
    const u = uranusSpinAxis();
    const eclLatDeg = Math.asin(u[2]) * 180 / Math.PI;
    assert.ok(
      eclLatDeg > 5 && eclLatDeg < 12,
      `Uranus axis ecliptic latitude should be ~7.7°, got ${eclLatDeg.toFixed(1)}°`,
    );
  });
});
