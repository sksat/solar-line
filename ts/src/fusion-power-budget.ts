/**
 * D-He³ Fusion Power Budget Analysis (Task 370).
 *
 * Quantifies the power requirements, waste heat, and fuel consumption
 * for Kestrel's D-He³ fusion pulse drive across all operating regimes.
 *
 * Key physics:
 * - Jet power: P_jet = ½ F v_e (kinetic power in exhaust)
 * - Fusion power: P_fusion = P_jet / η (η = thrust efficiency)
 * - Waste heat: P_waste = P_fusion - P_jet = P_jet × (1/η - 1)
 * - Fuel burn rate: ṁ_fuel = P_fusion / E_specific
 *
 * D-He³ reaction: ³He + D → ⁴He(3.6 MeV) + p(14.7 MeV) = 18.3 MeV total
 */

import { KESTREL } from "./kestrel.ts";

const G0 = 9.80665; // m/s²

// ── D-He³ fusion constants ──────────────────────────────────────────

/** Energy per D-He³ reaction (J). 18.3 MeV × 1.602e-19 J/eV × 1e6 */
export const DHE3_ENERGY_PER_REACTION_J = 18.3e6 * 1.602176634e-19; // ~2.932e-12 J

/** Reactant mass per reaction: D(2.014 u) + He-3(3.016 u) = 5.030 u */
const REACTANT_MASS_KG = 5.030 * 1.6605390666e-27; // ~8.353e-27 kg

/** Specific energy of D-He³ fusion (J/kg of reactant consumed) */
export const DHE3_ENERGY_PER_KG_J = DHE3_ENERGY_PER_REACTION_J / REACTANT_MASS_KG;
// ~3.51e14 J/kg

// ── Core functions ──────────────────────────────────────────────────

/** Exhaust velocity (m/s) from specific impulse (s). */
export function exhaustVelocityMs(ispS: number): number {
  return ispS * G0;
}

/** Jet power (W) = ½ × thrust × exhaust velocity. */
export function jetPowerW(thrustN: number, ispS: number): number {
  return 0.5 * thrustN * exhaustVelocityMs(ispS);
}

/** Propellant mass flow rate (kg/s) = thrust / exhaust velocity. */
export function massFlowRateKgS(thrustN: number, ispS: number): number {
  return thrustN / exhaustVelocityMs(ispS);
}

/**
 * Total fusion power (W) required to produce the given jet power.
 * @param eta - thrust efficiency (fraction of fusion energy → jet kinetic energy)
 */
export function fusionPowerW(thrustN: number, ispS: number, eta: number): number {
  return jetPowerW(thrustN, ispS) / eta;
}

/** Waste heat (W) = fusion power - jet power. */
export function wasteHeatW(thrustN: number, ispS: number, eta: number): number {
  return fusionPowerW(thrustN, ispS, eta) - jetPowerW(thrustN, ispS);
}

/** D-He³ fuel burn rate (kg/s) = fusion power / specific energy. */
export function fuelBurnRateKgS(thrustN: number, ispS: number, eta: number): number {
  return fusionPowerW(thrustN, ispS, eta) / DHE3_ENERGY_PER_KG_J;
}

// ── Per-episode analysis ────────────────────────────────────────────

/** Power budget for a single episode's operating regime. */
export interface PowerBudgetEntry {
  episode: number;
  label: string;
  thrustN: number;
  jetPowerTW: number;
  fusionPowerTW: number;
  wasteHeatTW: number;
  massFlowKgS: number;
  fuelBurnRateKgS: number;
}

/**
 * Default thrust efficiency estimate for D-He³ ICF pulse drive.
 * Project Daedalus (BIS 1978) estimated ~30% for ICF pellet ignition.
 * Higher values (50-70%) are theoretically possible with advanced
 * magnetic nozzle confinement — which Kestrel's "磁気ノズル" suggests.
 * We use 30% as a conservative baseline.
 */
const DEFAULT_ETA = 0.30;

/** Trim thrust estimate (N) — EP02 dialogue implies very low thrust. */
const TRIM_THRUST_N = 50_000; // ~50 kN (attitude/trim thrusters)

/**
 * Compute power budget for each episode's primary operating regime.
 * @param eta - thrust efficiency (default: 0.30 = Project Daedalus baseline)
 */
export function perEpisodePowerBudget(eta: number = DEFAULT_ETA): PowerBudgetEntry[] {
  const ispS = KESTREL.ispS;

  const regimes: Array<{ episode: number; label: string; thrustN: number }> = [
    { episode: 1, label: "100%", thrustN: KESTREL.thrustN },
    { episode: 2, label: "トリム", thrustN: TRIM_THRUST_N },
    { episode: 3, label: "100%", thrustN: KESTREL.thrustN },
    { episode: 4, label: "65%", thrustN: KESTREL.damagedThrustN },
    { episode: 5, label: "65%", thrustN: KESTREL.damagedThrustN },
  ];

  return regimes.map(({ episode, label, thrustN }) => ({
    episode,
    label,
    thrustN,
    jetPowerTW: jetPowerW(thrustN, ispS) / 1e12,
    fusionPowerTW: fusionPowerW(thrustN, ispS, eta) / 1e12,
    wasteHeatTW: wasteHeatW(thrustN, ispS, eta) / 1e12,
    massFlowKgS: massFlowRateKgS(thrustN, ispS),
    fuelBurnRateKgS: fuelBurnRateKgS(thrustN, ispS, eta),
  }));
}

/**
 * World reference point: 2023 global electricity production ≈ 18.4 TW.
 * Used for reader-friendly comparisons.
 */
export const WORLD_ELECTRICITY_TW = 18.4;
