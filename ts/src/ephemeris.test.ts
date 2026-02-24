import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  J2000_JD,
  calendarToJD,
  jdToDateString,
  planetPosition,
  planetLongitude,
  phaseAngle,
  synodicPeriod,
  hohmannPhaseAngle,
  hohmannTransferTime,
  nextHohmannWindow,
  elapsedDays,
  elapsedHours,
} from "./ephemeris.ts";

const AU_KM = 149_597_870.7;
const SECONDS_PER_DAY = 86400;
const DEG = Math.PI / 180;

describe("calendarToJD", () => {
  it("returns correct JD for J2000 epoch", () => {
    const jd = calendarToJD(2000, 1, 1.5);
    assert.ok(Math.abs(jd - J2000_JD) < 1e-6);
  });

  it("returns correct JD for known dates", () => {
    const jd = calendarToJD(1999, 12, 31);
    assert.ok(Math.abs(jd - 2_451_543.5) < 1e-6);
  });

  it("round-trips with jdToDateString", () => {
    const testDates: [number, number, number][] = [
      [2000, 1, 1],
      [2024, 6, 15],
      [2200, 3, 21],
    ];
    for (const [y, m, d] of testDates) {
      const jd = calendarToJD(y, m, d);
      const str = jdToDateString(jd);
      const expected = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      assert.equal(str, expected);
    }
  });
});

describe("planetPosition", () => {
  it("computes Earth at ~1 AU from Sun at J2000", () => {
    const pos = planetPosition("earth", J2000_JD);
    const distAU = pos.distance / AU_KM;
    assert.ok(
      Math.abs(distAU - 1.0) < 0.02,
      `Earth dist = ${distAU} AU, expected ~1.0`,
    );
  });

  it("computes Mars at ~1.52 AU from Sun at J2000", () => {
    const pos = planetPosition("mars", J2000_JD);
    const distAU = pos.distance / AU_KM;
    assert.ok(
      Math.abs(distAU - 1.524) < 0.15,
      `Mars dist = ${distAU} AU`,
    );
  });

  it("computes Jupiter at ~5.2 AU from Sun at J2000", () => {
    const pos = planetPosition("jupiter", J2000_JD);
    const distAU = pos.distance / AU_KM;
    assert.ok(
      Math.abs(distAU - 5.2) < 0.3,
      `Jupiter dist = ${distAU} AU`,
    );
  });

  it("computes Saturn at ~9.5 AU from Sun", () => {
    const pos = planetPosition("saturn", J2000_JD);
    const distAU = pos.distance / AU_KM;
    assert.ok(
      Math.abs(distAU - 9.54) < 0.5,
      `Saturn dist = ${distAU} AU`,
    );
  });

  it("computes Uranus at ~19.2 AU from Sun", () => {
    const pos = planetPosition("uranus", J2000_JD);
    const distAU = pos.distance / AU_KM;
    assert.ok(
      Math.abs(distAU - 19.2) < 1.0,
      `Uranus dist = ${distAU} AU`,
    );
  });

  it("returns consistent x, y, longitude, and distance", () => {
    const pos = planetPosition("earth", J2000_JD);
    const computedDist = Math.sqrt(pos.x ** 2 + pos.y ** 2);
    assert.ok(
      Math.abs(computedDist - pos.distance) / pos.distance < 1e-10,
    );
    let computedLon = Math.atan2(pos.y, pos.x);
    if (computedLon < 0) computedLon += 2 * Math.PI;
    assert.ok(Math.abs(computedLon - pos.longitude) < 1e-10);
  });

  it("computes all planets without errors", () => {
    const planets = [
      "mercury",
      "venus",
      "earth",
      "mars",
      "jupiter",
      "saturn",
      "uranus",
      "neptune",
    ] as const;
    for (const planet of planets) {
      const pos = planetPosition(planet, J2000_JD);
      assert.ok(pos.distance > 0, `${planet} distance > 0`);
      assert.ok(Number.isFinite(pos.distance), `${planet} distance is finite`);
    }
  });
});

describe("orbital period consistency", () => {
  it("Earth returns to same longitude after ~365.25 days", () => {
    const lon0 = planetLongitude("earth", J2000_JD);
    const lon1 = planetLongitude("earth", J2000_JD + 365.25);
    const diff = Math.abs(lon1 - lon0);
    const wrapped = diff > Math.PI ? 2 * Math.PI - diff : diff;
    assert.ok(
      wrapped < 2 * DEG,
      `Earth longitude diff = ${(wrapped / DEG).toFixed(1)}°`,
    );
  });

  it("Mars returns to same longitude after ~687 days", () => {
    const lon0 = planetLongitude("mars", J2000_JD);
    const lon1 = planetLongitude("mars", J2000_JD + 686.97);
    const diff = Math.abs(lon1 - lon0);
    const wrapped = diff > Math.PI ? 2 * Math.PI - diff : diff;
    assert.ok(wrapped < 3 * DEG);
  });

  it("Jupiter returns to same longitude after ~4333 days", () => {
    const lon0 = planetLongitude("jupiter", J2000_JD);
    const lon1 = planetLongitude("jupiter", J2000_JD + 4332.59);
    const diff = Math.abs(lon1 - lon0);
    const wrapped = diff > Math.PI ? 2 * Math.PI - diff : diff;
    assert.ok(wrapped < 5 * DEG);
  });
});

describe("phaseAngle", () => {
  it("is antisymmetric", () => {
    const ab = phaseAngle("earth", "mars", J2000_JD);
    const ba = phaseAngle("mars", "earth", J2000_JD);
    assert.ok(Math.abs(ab + ba) < 1e-10);
  });
});

describe("synodicPeriod", () => {
  it("Earth-Mars synodic period is ~780 days", () => {
    const days = synodicPeriod("earth", "mars") / SECONDS_PER_DAY;
    assert.ok(
      Math.abs(days - 780) < 10,
      `synodic = ${days.toFixed(1)} days`,
    );
  });

  it("Earth-Jupiter synodic period is ~399 days", () => {
    const days = synodicPeriod("earth", "jupiter") / SECONDS_PER_DAY;
    assert.ok(
      Math.abs(days - 398.88) < 5,
      `synodic = ${days.toFixed(1)} days`,
    );
  });

  it("is symmetric", () => {
    const ab = synodicPeriod("earth", "mars");
    const ba = synodicPeriod("mars", "earth");
    assert.ok(Math.abs(ab - ba) < 1e-6);
  });
});

describe("hohmannPhaseAngle", () => {
  it("Earth-Mars Hohmann phase angle is ~44.4°", () => {
    const deg = (hohmannPhaseAngle("earth", "mars") * 180) / Math.PI;
    assert.ok(
      Math.abs(deg - 44.4) < 2,
      `phase = ${deg.toFixed(1)}°`,
    );
  });
});

describe("hohmannTransferTime", () => {
  it("Earth-Mars Hohmann transfer is ~259 days", () => {
    const days = hohmannTransferTime("earth", "mars") / SECONDS_PER_DAY;
    assert.ok(
      Math.abs(days - 259) < 5,
      `transfer = ${days.toFixed(0)} days`,
    );
  });

  it("Earth-Jupiter Hohmann transfer is ~997 days", () => {
    const days = hohmannTransferTime("earth", "jupiter") / SECONDS_PER_DAY;
    assert.ok(
      Math.abs(days - 997) < 20,
      `transfer = ${days.toFixed(0)} days`,
    );
  });
});

describe("nextHohmannWindow", () => {
  it("finds a window within one synodic period", () => {
    const window = nextHohmannWindow("earth", "mars", J2000_JD);
    assert.ok(window !== null, "Should find a window");
    if (window !== null) {
      const synodicDays = synodicPeriod("earth", "mars") / SECONDS_PER_DAY;
      assert.ok(window - J2000_JD < synodicDays * 1.2);
    }
  });
});

describe("elapsed time", () => {
  it("computes days correctly", () => {
    assert.ok(
      Math.abs(elapsedDays(J2000_JD, J2000_JD + 30) - 30) < 1e-10,
    );
  });

  it("computes hours correctly", () => {
    assert.ok(
      Math.abs(elapsedHours(J2000_JD, J2000_JD + 1) - 24) < 1e-10,
    );
  });
});
