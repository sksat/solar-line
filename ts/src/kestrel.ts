/**
 * Shared ship parameters: ケストレル号 (Kestrel)
 *
 * Single source of truth for ship specifications used across all episode
 * analyses. Episode-specific parameters (cargo, damage state) are defined
 * in their respective analysis modules.
 *
 * Source: worldbuilding document (note.com/yuepicos)
 */

/** Core ship parameters — constant across all episodes */
export const KESTREL = {
  /** Maximum mass at standard load (kg) — worldbuilding doc */
  massKg: 48_000_000,
  /** Normal thrust (N) — worldbuilding doc */
  thrustN: 9_800_000,
  /** Peak thrust (N) — emergency "full burn" — worldbuilding doc */
  peakThrustN: 10_700_000,
  /** Damaged thrust at 65% output (N) — ep04 dialogue ~17:29 "出力は65%に設定" */
  damagedThrustN: 6_370_000,
  /** Damaged thrust percentage — ep04 dialogue */
  damagedThrustPercent: 65,
  /** Engine model */
  engine: "TSF-43R Orion Micropulser" as const,
  /** Fuel type */
  fuel: "D-He³" as const,
  /** Ship length (m) */
  lengthM: 42.8,
  /** Specific impulse (s) */
  ispS: 1_000_000,
} as const;

/** Derived constants */
/** Exhaust velocity (km/s) = Isp × g₀ / 1000 */
export const EXHAUST_VELOCITY_KMS = KESTREL.ispS * 9.80665 / 1000; // ≈ 9806.65 km/s

/** Normal thrust in MN for report/display use */
export const THRUST_MN = KESTREL.thrustN / 1_000_000; // 9.8

/** Damaged thrust in MN (65% output) for report/display use */
export const DAMAGED_THRUST_MN = KESTREL.damagedThrustN / 1_000_000; // 6.37

/** Nominal mass in tonnes for report/display use */
export const NOMINAL_MASS_T = KESTREL.massKg / 1_000; // 48,000

/** 1 AU in km (IAU 2012 exact definition) */
export const AU_KM = 149_597_870.7;
