import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  visViva,
  hohmannTransferDv,
  escapeVelocity,
  circularVelocity,
  hyperbolicExcess,
  orbitalPeriod,
  brachistochroneAccel,
  brachistochroneDeltaV,
  MU,
  ORBIT_RADIUS,
  EARTH_RADIUS,
  LEO_ALTITUDE,
} from "./orbital.ts";

describe("visViva", () => {
  it("returns circular orbit velocity when r == a", () => {
    const r = 6_778; // ~400km altitude LEO
    const v = visViva(MU.EARTH, r, r);
    const expected = Math.sqrt(MU.EARTH / r);
    assert.ok(
      Math.abs(v - expected) < 1e-10,
      `v=${v}, expected=${expected}`,
    );
  });
});

describe("hohmannTransferDv", () => {
  it("calculates LEO to GEO transfer correctly", () => {
    const r1 = 6_578; // ~200 km altitude
    const r2 = 42_164; // GEO

    const [dv1, dv2] = hohmannTransferDv(MU.EARTH, r1, r2);
    const totalDv = dv1 + dv2;

    // Expected total ΔV for LEO-GEO Hohmann is approximately 3.935 km/s
    assert.ok(
      Math.abs(totalDv - 3.935) < 0.05,
      `total ΔV = ${totalDv} km/s, expected ~3.935 km/s`,
    );
  });

  it("calculates Earth to Mars heliocentric transfer", () => {
    const rEarth = 149_597_870.7; // 1 AU
    const rMars = 227_939_200; // ~1.524 AU

    const [dv1, dv2] = hohmannTransferDv(MU.SUN, rEarth, rMars);

    assert.ok(
      Math.abs(dv1 - 2.94) < 0.1,
      `departure ΔV = ${dv1} km/s, expected ~2.94 km/s`,
    );
    assert.ok(
      Math.abs(dv2 - 2.65) < 0.1,
      `arrival ΔV = ${dv2} km/s, expected ~2.65 km/s`,
    );
  });
});

describe("escapeVelocity", () => {
  it("Earth surface escape velocity is ~11.2 km/s", () => {
    const vEsc = escapeVelocity(MU.EARTH, EARTH_RADIUS);
    assert.ok(
      Math.abs(vEsc - 11.186) < 0.1,
      `Earth escape velocity = ${vEsc} km/s, expected ~11.186 km/s`,
    );
  });

  it("equals sqrt(2) times circular velocity", () => {
    const r = EARTH_RADIUS + LEO_ALTITUDE;
    const vEsc = escapeVelocity(MU.EARTH, r);
    const vCirc = circularVelocity(MU.EARTH, r);
    assert.ok(
      Math.abs(vEsc / vCirc - Math.SQRT2) < 1e-10,
      `v_esc/v_circ should be sqrt(2), got ${vEsc / vCirc}`,
    );
  });

  it("Jupiter surface escape velocity is ~59.5 km/s", () => {
    const vEsc = escapeVelocity(MU.JUPITER, 71_492);
    assert.ok(
      Math.abs(vEsc - 59.5) < 1.0,
      `Jupiter escape velocity = ${vEsc} km/s, expected ~59.5 km/s`,
    );
  });
});

describe("circularVelocity", () => {
  it("LEO circular velocity is ~7.67 km/s", () => {
    const r = EARTH_RADIUS + LEO_ALTITUDE;
    const vCirc = circularVelocity(MU.EARTH, r);
    assert.ok(
      Math.abs(vCirc - 7.67) < 0.1,
      `LEO circular velocity = ${vCirc} km/s, expected ~7.67 km/s`,
    );
  });

  it("Earth heliocentric circular velocity is ~29.8 km/s", () => {
    const vCirc = circularVelocity(MU.SUN, ORBIT_RADIUS.EARTH);
    assert.ok(
      Math.abs(vCirc - 29.78) < 0.1,
      `Earth orbital velocity = ${vCirc} km/s, expected ~29.78 km/s`,
    );
  });

  it("matches visViva for circular orbit (r == a)", () => {
    const r = EARTH_RADIUS + LEO_ALTITUDE;
    const vCirc = circularVelocity(MU.EARTH, r);
    const vVV = visViva(MU.EARTH, r, r);
    assert.ok(
      Math.abs(vCirc - vVV) < 1e-10,
      `circularVelocity and visViva should agree for circular orbit`,
    );
  });
});

describe("hyperbolicExcess", () => {
  it("returns 0 when speed equals escape velocity (bound orbit)", () => {
    const vEsc = escapeVelocity(MU.EARTH, EARTH_RADIUS + LEO_ALTITUDE);
    assert.strictEqual(hyperbolicExcess(vEsc, vEsc), 0);
  });

  it("returns 0 when speed is below escape velocity", () => {
    assert.strictEqual(hyperbolicExcess(5.0, 11.0), 0);
  });

  it("computes v∞ correctly for known values", () => {
    // v=13, v_esc=5 → v∞=sqrt(169-25)=sqrt(144)=12
    const vInf = hyperbolicExcess(13, 5);
    assert.ok(
      Math.abs(vInf - 12) < 1e-10,
      `v∞ should be 12, got ${vInf}`,
    );
  });

  it("v∞ from LEO with 15 km/s gives realistic excess", () => {
    const vEsc = escapeVelocity(MU.EARTH, EARTH_RADIUS + LEO_ALTITUDE);
    const vInf = hyperbolicExcess(15, vEsc);
    // v∞ = sqrt(15² - vEsc²) ≈ sqrt(225 - 125) ≈ 10 km/s
    assert.ok(vInf > 8 && vInf < 12, `v∞ should be ~10 km/s, got ${vInf}`);
  });
});

describe("orbitalPeriod", () => {
  it("Earth orbital period is ~365.25 days", () => {
    const T = orbitalPeriod(MU.SUN, ORBIT_RADIUS.EARTH);
    const days = T / 86400;
    assert.ok(
      Math.abs(days - 365.25) < 0.5,
      `Earth period = ${days} days, expected ~365.25 days`,
    );
  });

  it("ISS orbital period is ~92 minutes", () => {
    const T = orbitalPeriod(MU.EARTH, EARTH_RADIUS + LEO_ALTITUDE);
    const minutes = T / 60;
    assert.ok(
      Math.abs(minutes - 92.5) < 1,
      `ISS period = ${minutes} min, expected ~92.5 min`,
    );
  });

  it("GEO period is ~24 hours", () => {
    const T = orbitalPeriod(MU.EARTH, 42_164);
    const hours = T / 3600;
    assert.ok(
      Math.abs(hours - 24) < 0.1,
      `GEO period = ${hours} hours, expected ~24 hours`,
    );
  });

  it("Jupiter period is ~11.86 years", () => {
    const T = orbitalPeriod(MU.SUN, ORBIT_RADIUS.JUPITER);
    const years = T / (86400 * 365.25);
    assert.ok(
      Math.abs(years - 11.86) < 0.1,
      `Jupiter period = ${years} years, expected ~11.86 years`,
    );
  });
});

describe("brachistochroneAccel", () => {
  it("Mars distance in 72 hours gives sub-G acceleration", () => {
    // Mars closest approach ~55M km, 72h = 259200s
    const dist = 55_000_000; // km
    const time = 72 * 3600; // s
    const accel = brachistochroneAccel(dist, time);
    const g = accel / 9.81e-3; // convert km/s² to g
    // a = 4*55e6 / 259200² ≈ 3.27e-3 km/s² ≈ 0.33G
    assert.ok(
      Math.abs(g - 0.334) < 0.01,
      `accel should be ~0.33G, got ${g.toFixed(3)}G`,
    );
  });

  it("satisfies a = 4d/t²", () => {
    const d = 1_000_000;
    const t = 100_000;
    const accel = brachistochroneAccel(d, t);
    const expected = (4 * d) / (t * t);
    assert.ok(Math.abs(accel - expected) < 1e-15);
  });

  it("doubling time quarters acceleration", () => {
    const d = 1_000_000;
    const a1 = brachistochroneAccel(d, 1000);
    const a2 = brachistochroneAccel(d, 2000);
    assert.ok(
      Math.abs(a1 / a2 - 4) < 1e-10,
      `doubling time should quarter accel, ratio = ${a1 / a2}`,
    );
  });
});

describe("brachistochroneDeltaV", () => {
  it("satisfies ΔV = 4d/t", () => {
    const d = 1_000_000;
    const t = 100_000;
    const dv = brachistochroneDeltaV(d, t);
    assert.ok(Math.abs(dv - (4 * d) / t) < 1e-15);
  });

  it("equals accel * time", () => {
    const d = 500_000;
    const t = 50_000;
    const accel = brachistochroneAccel(d, t);
    const dv = brachistochroneDeltaV(d, t);
    assert.ok(
      Math.abs(dv - accel * t) < 1e-10,
      `ΔV should equal a*t, got ΔV=${dv}, a*t=${accel * t}`,
    );
  });

  it("Mars brachistochrone 72h gives ~850 km/s ΔV", () => {
    const dist = 55_000_000;
    const time = 72 * 3600;
    const dv = brachistochroneDeltaV(dist, time);
    assert.ok(
      Math.abs(dv - 849) < 10,
      `EP01-like ΔV should be ~849 km/s, got ${dv.toFixed(1)} km/s`,
    );
  });

  it("doubling time halves ΔV", () => {
    const d = 1_000_000;
    const dv1 = brachistochroneDeltaV(d, 1000);
    const dv2 = brachistochroneDeltaV(d, 2000);
    assert.ok(
      Math.abs(dv1 / dv2 - 2) < 1e-10,
      `doubling time should halve ΔV, ratio = ${dv1 / dv2}`,
    );
  });
});
