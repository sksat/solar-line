/**
 * Shared ship constants consistency tests (Task 220).
 *
 * Verifies that the shared KESTREL constants match expected values
 * and that all derived constants are consistent.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  KESTREL,
  EXHAUST_VELOCITY_KMS,
  THRUST_MN,
  NOMINAL_MASS_T,
  AU_KM,
} from "./kestrel.ts";
import { KESTREL as KESTREL_EP01 } from "./ep01-analysis.ts";
import { KESTREL as KESTREL_EP02 } from "./ep02-analysis.ts";
import { KESTREL as KESTREL_EP03 } from "./ep03-analysis.ts";
import { KESTREL as KESTREL_EP04 } from "./ep04-analysis.ts";
import { KESTREL as KESTREL_EP05 } from "./ep05-analysis.ts";
import { SHIP_SPECS } from "./cross-episode-analysis.ts";
import { KESTREL_SPECS } from "./ship-kestrel-analysis.ts";

describe("KESTREL shared constants", () => {
  it("core parameters match worldbuilding doc", () => {
    assert.equal(KESTREL.massKg, 48_000_000);
    assert.equal(KESTREL.thrustN, 9_800_000);
    assert.equal(KESTREL.peakThrustN, 10_700_000);
    assert.equal(KESTREL.damagedThrustN, 6_370_000);
    assert.equal(KESTREL.damagedThrustPercent, 65);
    assert.equal(KESTREL.ispS, 1_000_000);
    assert.equal(KESTREL.lengthM, 42.8);
    assert.equal(KESTREL.engine, "TSF-43R Orion Micropulser");
    assert.equal(KESTREL.fuel, "D-He³");
  });

  it("derived constants are correct", () => {
    const expectedVe = 1_000_000 * 9.80665 / 1000;
    assert.ok(
      Math.abs(EXHAUST_VELOCITY_KMS - expectedVe) < 0.001,
      `exhaust velocity: expected ${expectedVe}, got ${EXHAUST_VELOCITY_KMS}`,
    );
    assert.equal(THRUST_MN, 9.8);
    assert.equal(NOMINAL_MASS_T, 48_000);
  });

  it("AU_KM matches IAU 2012 definition", () => {
    assert.equal(AU_KM, 149_597_870.7);
  });
});

describe("KESTREL consistency across episode modules", () => {
  it("EP01 extends KESTREL base with cargo field", () => {
    assert.equal(KESTREL_EP01.massKg, KESTREL.massKg);
    assert.equal(KESTREL_EP01.thrustN, KESTREL.thrustN);
    assert.equal(KESTREL_EP01.peakThrustN, KESTREL.peakThrustN);
    assert.equal(KESTREL_EP01.cargoKg, 42_300);
  });

  it("EP02 re-exports KESTREL unchanged", () => {
    assert.equal(KESTREL_EP02.massKg, KESTREL.massKg);
    assert.equal(KESTREL_EP02.thrustN, KESTREL.thrustN);
    assert.equal(KESTREL_EP02.peakThrustN, KESTREL.peakThrustN);
  });

  it("EP03 re-exports KESTREL unchanged", () => {
    assert.equal(KESTREL_EP03.massKg, KESTREL.massKg);
    assert.equal(KESTREL_EP03.thrustN, KESTREL.thrustN);
    assert.equal(KESTREL_EP03.peakThrustN, KESTREL.peakThrustN);
  });

  it("EP04-05 include damaged thrust", () => {
    assert.equal(KESTREL_EP04.damagedThrustN, KESTREL.damagedThrustN);
    assert.equal(KESTREL_EP05.damagedThrustN, KESTREL.damagedThrustN);
    assert.equal(KESTREL_EP04.damagedThrustN, 6_370_000);
  });

  it("damaged thrust is 65% of normal", () => {
    const expected = KESTREL.thrustN * 0.65;
    assert.ok(
      Math.abs(KESTREL.damagedThrustN - expected) < 10_000,
      `damaged ${KESTREL.damagedThrustN} ≈ 65% of ${KESTREL.thrustN} (${expected})`,
    );
  });
});

describe("KESTREL consistency with report modules", () => {
  it("SHIP_SPECS derives from KESTREL", () => {
    assert.equal(SHIP_SPECS.nominalMassT, NOMINAL_MASS_T);
    assert.equal(SHIP_SPECS.thrustMN, THRUST_MN);
    assert.equal(SHIP_SPECS.emergencyThrustMN, KESTREL.peakThrustN / 1_000_000);
    assert.equal(SHIP_SPECS.damagedThrustPercent, KESTREL.damagedThrustPercent);
    assert.equal(SHIP_SPECS.damagedThrustMN, KESTREL.damagedThrustN / 1_000_000);
    assert.equal(SHIP_SPECS.engine, KESTREL.engine);
    assert.equal(SHIP_SPECS.fuel, KESTREL.fuel);
    assert.equal(SHIP_SPECS.lengthM, KESTREL.lengthM);
  });

  it("KESTREL_SPECS derives from KESTREL", () => {
    assert.equal(KESTREL_SPECS.nominalThrustMN, THRUST_MN);
    assert.equal(KESTREL_SPECS.emergencyThrustMN, KESTREL.peakThrustN / 1_000_000);
    assert.equal(KESTREL_SPECS.statedMassT, NOMINAL_MASS_T);
    assert.equal(KESTREL_SPECS.lengthM, KESTREL.lengthM);
    assert.equal(KESTREL_SPECS.engine, KESTREL.engine);
  });
});
