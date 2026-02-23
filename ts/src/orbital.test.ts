import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { visViva, hohmannTransferDv, MU } from "./orbital.ts";

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
