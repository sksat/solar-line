/**
 * Fusion Power Budget Analysis Tests (Task 370).
 *
 * TDD tests for D-He³ fusion power budget calculations.
 * Verifies jet power, fusion power, waste heat, and fuel burn rates
 * across Kestrel's operating regimes.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  jetPowerW,
  exhaustVelocityMs,
  massFlowRateKgS,
  fusionPowerW,
  wasteHeatW,
  fuelBurnRateKgS,
  perEpisodePowerBudget,
  DHE3_ENERGY_PER_REACTION_J,
  DHE3_ENERGY_PER_KG_J,
  type PowerBudgetEntry,
} from "./fusion-power-budget.ts";

import { KESTREL, EXHAUST_VELOCITY_KMS } from "./kestrel.ts";

const G0 = 9.80665;
const VE_MS = KESTREL.ispS * G0; // exhaust velocity in m/s

describe("fusion-power-budget", () => {
  describe("exhaust velocity", () => {
    it("computes exhaust velocity from Isp", () => {
      const ve = exhaustVelocityMs(KESTREL.ispS);
      assert.ok(
        Math.abs(ve - VE_MS) < 1,
        `exhaust velocity should be ~${VE_MS} m/s, got ${ve}`,
      );
    });

    it("matches EXHAUST_VELOCITY_KMS constant", () => {
      const ve = exhaustVelocityMs(KESTREL.ispS);
      const expectedKms = EXHAUST_VELOCITY_KMS * 1000;
      assert.ok(
        Math.abs(ve - expectedKms) < 1,
        `should match kestrel.ts constant`,
      );
    });
  });

  describe("jet power", () => {
    it("computes jet power as P = F*ve/2", () => {
      const p = jetPowerW(KESTREL.thrustN, KESTREL.ispS);
      // P = 9.8e6 * 9.80665e6 / 2 = ~48.05 TW
      const expectedTW = 48.05;
      const actualTW = p / 1e12;
      assert.ok(
        Math.abs(actualTW - expectedTW) < 0.5,
        `jet power should be ~${expectedTW} TW, got ${actualTW.toFixed(2)} TW`,
      );
    });

    it("scales linearly with thrust", () => {
      const pFull = jetPowerW(KESTREL.thrustN, KESTREL.ispS);
      const pDamaged = jetPowerW(KESTREL.damagedThrustN, KESTREL.ispS);
      const ratio = pDamaged / pFull;
      assert.ok(
        Math.abs(ratio - 0.65) < 0.01,
        `damaged/full ratio should be 0.65, got ${ratio.toFixed(3)}`,
      );
    });

    it("at emergency thrust exceeds nominal", () => {
      const pNom = jetPowerW(KESTREL.thrustN, KESTREL.ispS);
      const pEmerg = jetPowerW(KESTREL.peakThrustN, KESTREL.ispS);
      assert.ok(pEmerg > pNom, "emergency thrust should produce more jet power");
      const ratio = pEmerg / pNom;
      assert.ok(
        Math.abs(ratio - 10.7 / 9.8) < 0.01,
        `ratio should be 10.7/9.8`,
      );
    });
  });

  describe("mass flow rate", () => {
    it("computes mass flow rate as F/ve", () => {
      const mdot = massFlowRateKgS(KESTREL.thrustN, KESTREL.ispS);
      // F/ve = 9.8e6 / 9.80665e6 = ~0.9993 kg/s
      assert.ok(
        Math.abs(mdot - 1.0) < 0.01,
        `mass flow rate should be ~1.0 kg/s, got ${mdot.toFixed(4)}`,
      );
    });

    it("scales linearly with thrust at fixed Isp", () => {
      const mdotFull = massFlowRateKgS(KESTREL.thrustN, KESTREL.ispS);
      const mdotDamaged = massFlowRateKgS(KESTREL.damagedThrustN, KESTREL.ispS);
      const ratio = mdotDamaged / mdotFull;
      assert.ok(
        Math.abs(ratio - 0.65) < 0.01,
        `damaged/full ratio should be 0.65`,
      );
    });
  });

  describe("D-He³ fusion parameters", () => {
    it("reaction energy is 18.3 MeV", () => {
      const mev = DHE3_ENERGY_PER_REACTION_J / 1.602176634e-13;
      assert.ok(
        Math.abs(mev - 18.3) < 0.1,
        `reaction energy should be ~18.3 MeV, got ${mev.toFixed(1)}`,
      );
    });

    it("specific energy is consistent with reaction energy and reactant mass", () => {
      // D (2.014 u) + He-3 (3.016 u) = 5.030 u per reaction
      // E/m = 18.3 MeV / (5.030 u × 1.6605e-27 kg/u)
      const u = 1.6605390666e-27; // kg
      const reactantMass = 5.030 * u;
      const expectedJ = DHE3_ENERGY_PER_REACTION_J / reactantMass;
      assert.ok(
        Math.abs(DHE3_ENERGY_PER_KG_J / expectedJ - 1) < 0.01,
        `specific energy should be consistent`,
      );
    });
  });

  describe("fusion power and waste heat", () => {
    it("fusion power exceeds jet power", () => {
      const pJet = jetPowerW(KESTREL.thrustN, KESTREL.ispS);
      const pFusion = fusionPowerW(KESTREL.thrustN, KESTREL.ispS, 0.3);
      assert.ok(
        pFusion > pJet,
        "fusion power should be greater than jet power",
      );
    });

    it("fusion power = jet power / efficiency", () => {
      const eta = 0.3;
      const pJet = jetPowerW(KESTREL.thrustN, KESTREL.ispS);
      const pFusion = fusionPowerW(KESTREL.thrustN, KESTREL.ispS, eta);
      assert.ok(
        Math.abs(pFusion - pJet / eta) < 1e6,
        `fusion power should be jet power / eta`,
      );
    });

    it("waste heat = fusion power - jet power", () => {
      const eta = 0.3;
      const pJet = jetPowerW(KESTREL.thrustN, KESTREL.ispS);
      const pFusion = fusionPowerW(KESTREL.thrustN, KESTREL.ispS, eta);
      const pWaste = wasteHeatW(KESTREL.thrustN, KESTREL.ispS, eta);
      assert.ok(
        Math.abs(pWaste - (pFusion - pJet)) < 1e6,
        `waste heat = fusion power - jet power`,
      );
    });

    it("waste heat fraction decreases with higher efficiency", () => {
      const pWaste30 = wasteHeatW(KESTREL.thrustN, KESTREL.ispS, 0.3);
      const pWaste50 = wasteHeatW(KESTREL.thrustN, KESTREL.ispS, 0.5);
      assert.ok(pWaste50 < pWaste30, "higher efficiency → less waste heat");
    });
  });

  describe("fuel burn rate", () => {
    it("fuel burn rate is consistent with fusion power and specific energy", () => {
      const eta = 0.3;
      const pFusion = fusionPowerW(KESTREL.thrustN, KESTREL.ispS, eta);
      const fuelRate = fuelBurnRateKgS(KESTREL.thrustN, KESTREL.ispS, eta);
      // P_fusion = fuel_rate × specific_energy
      const expectedRate = pFusion / DHE3_ENERGY_PER_KG_J;
      assert.ok(
        Math.abs(fuelRate / expectedRate - 1) < 0.01,
        `fuel burn rate should be P_fusion / E_specific`,
      );
    });

    it("fuel burn rate is much less than propellant mass flow", () => {
      const mdot = massFlowRateKgS(KESTREL.thrustN, KESTREL.ispS);
      const fuelRate = fuelBurnRateKgS(KESTREL.thrustN, KESTREL.ispS, 0.3);
      // Mass flow ≈ 1 kg/s, fuel burn is much smaller for fusion
      assert.ok(
        fuelRate < mdot,
        "fuel burn rate should be less than propellant mass flow",
      );
    });
  });

  describe("per-episode power budget", () => {
    it("returns entries for all 5 episodes", () => {
      const entries = perEpisodePowerBudget();
      assert.strictEqual(entries.length, 5);
    });

    it("EP01 uses full thrust", () => {
      const entries = perEpisodePowerBudget();
      const ep01 = entries.find((e) => e.episode === 1)!;
      assert.strictEqual(ep01.thrustN, KESTREL.thrustN);
      assert.strictEqual(ep01.label, "100%");
    });

    it("EP02 has minimal thrust (trim only)", () => {
      const entries = perEpisodePowerBudget();
      const ep02 = entries.find((e) => e.episode === 2)!;
      assert.ok(ep02.thrustN < KESTREL.thrustN, "EP02 is trim-only");
      assert.strictEqual(ep02.label, "トリム");
    });

    it("EP03 uses full thrust (post-repair)", () => {
      const entries = perEpisodePowerBudget();
      const ep03 = entries.find((e) => e.episode === 3)!;
      assert.strictEqual(ep03.thrustN, KESTREL.thrustN);
    });

    it("EP04 and EP05 use 65% thrust", () => {
      const entries = perEpisodePowerBudget();
      const ep04 = entries.find((e) => e.episode === 4)!;
      const ep05 = entries.find((e) => e.episode === 5)!;
      assert.strictEqual(ep04.thrustN, KESTREL.damagedThrustN);
      assert.strictEqual(ep05.thrustN, KESTREL.damagedThrustN);
      assert.strictEqual(ep04.label, "65%");
      assert.strictEqual(ep05.label, "65%");
    });

    it("jet power decreases from EP01→EP04 (damage)", () => {
      const entries = perEpisodePowerBudget();
      const ep01 = entries.find((e) => e.episode === 1)!;
      const ep04 = entries.find((e) => e.episode === 4)!;
      assert.ok(ep04.jetPowerTW < ep01.jetPowerTW);
    });

    it("waste heat at 65% is less than at 100%", () => {
      const entries = perEpisodePowerBudget();
      const ep01 = entries.find((e) => e.episode === 1)!;
      const ep04 = entries.find((e) => e.episode === 4)!;
      assert.ok(ep04.wasteHeatTW < ep01.wasteHeatTW);
    });

    it("all entries have positive values", () => {
      const entries = perEpisodePowerBudget();
      for (const e of entries) {
        assert.ok(e.jetPowerTW >= 0, `EP${e.episode} jetPowerTW >= 0`);
        assert.ok(e.fusionPowerTW >= 0, `EP${e.episode} fusionPowerTW >= 0`);
        assert.ok(e.wasteHeatTW >= 0, `EP${e.episode} wasteHeatTW >= 0`);
        assert.ok(e.fuelBurnRateKgS >= 0, `EP${e.episode} fuelBurnRateKgS >= 0`);
      }
    });
  });
});
