/**
 * Episode 1 Analysis: Mars → Ganymede Transfer
 *
 * SOLAR LINE Part 1 depicts Kestrel transporting cargo from Mars to
 * Jupiter's moon Ganymede within a 72-hour deadline. The "normal" route
 * takes ~150 hours. This module computes orbital mechanics baselines
 * and evaluates the plausibility of the depicted transfer.
 *
 * Source: sm45280425 (Niconico), worldbuilding doc (note.com/yuepicos)
 */

import {
  hohmannTransferDv,
  orbitalPeriod,
  brachistochroneAccel,
  brachistochroneDeltaV,
  MU,
  ORBIT_RADIUS,
  GANYMEDE_ORBIT_RADIUS,
} from "./orbital.ts";
import { KESTREL as KESTREL_BASE, AU_KM } from "./kestrel.ts";

/** Ship parameters — shared base + EP01-specific fields */
export const KESTREL = {
  ...KESTREL_BASE,
  /** Cargo mass this trip (kg) */
  cargoKg: 42_300,
} as const;

/** Contract parameters from Episode 1 */
export const EP01_CONTRACT = {
  /** Deadline in seconds (72 hours) */
  deadlineSec: 72 * 3600,
  /** Normal route time in seconds (~150 hours) */
  normalTimeSec: 150 * 3600,
} as const;

/**
 * Mars-Jupiter distance scenarios (km).
 * Computed from heliocentric orbital radii.
 */
export const DISTANCE_SCENARIOS = {
  /** Near opposition: Jupiter orbital radius - Mars orbital radius */
  closest: ORBIT_RADIUS.JUPITER - ORBIT_RADIUS.MARS,
  /** Quadrature-like: sqrt(r_mars² + r_jupiter²) — 90° angle */
  mid: Math.sqrt(ORBIT_RADIUS.MARS ** 2 + ORBIT_RADIUS.JUPITER ** 2),
  /** Near conjunction: Jupiter orbital radius + Mars orbital radius */
  farthest: ORBIT_RADIUS.JUPITER + ORBIT_RADIUS.MARS,
} as const;

/** Convert distance scenarios to AU for readability */
export function distanceInAU(km: number): number {
  return km / AU_KM;
}

/**
 * Transfer 1: Hohmann transfer baseline (Mars orbit → Jupiter orbit).
 * This is the classical minimum-energy impulsive transfer.
 */
export function hohmannBaseline() {
  const [dv1, dv2] = hohmannTransferDv(
    MU.SUN,
    ORBIT_RADIUS.MARS,
    ORBIT_RADIUS.JUPITER,
  );
  const aTransfer = (ORBIT_RADIUS.MARS + ORBIT_RADIUS.JUPITER) / 2;
  const transferTimeSec = orbitalPeriod(MU.SUN, aTransfer) / 2;
  const transferTimeDays = transferTimeSec / 86400;

  return {
    departureDv: dv1,
    arrivalDv: dv2,
    totalDv: dv1 + dv2,
    transferTimeSec,
    transferTimeDays,
  };
}

/**
 * Transfer 2: Ship acceleration capability.
 * Given mass and thrust, what acceleration and ΔV budget does Kestrel have?
 */
export function shipAcceleration(massKg: number = KESTREL.massKg) {
  const accelNormal = KESTREL.thrustN / massKg; // m/s²
  const accelPeak = KESTREL.peakThrustN / massKg; // m/s²

  // ΔV achievable in 72 hours of continuous burn (no fuel depletion)
  const dvNormal72h = accelNormal * EP01_CONTRACT.deadlineSec; // m/s
  const dvPeak72h = accelPeak * EP01_CONTRACT.deadlineSec; // m/s

  return {
    accelNormalMs2: accelNormal,
    accelPeakMs2: accelPeak,
    accelNormalG: accelNormal / 9.80665,
    accelPeakG: accelPeak / 9.80665,
    dvNormal72hMs: dvNormal72h,
    dvPeak72hMs: dvPeak72h,
    dvNormal72hKms: dvNormal72h / 1000,
    dvPeak72hKms: dvPeak72h / 1000,
  };
}

/**
 * Transfer 3: Brachistochrone requirements for each distance scenario.
 * What acceleration and ΔV would be needed to cover the distance in the given time?
 */
export function brachistochroneRequirements(timeSec: number) {
  return Object.entries(DISTANCE_SCENARIOS).map(([name, distKm]) => {
    const accelKms2 = brachistochroneAccel(distKm, timeSec);
    const accelMs2 = accelKms2 * 1000;
    const dvKms = brachistochroneDeltaV(distKm, timeSec);

    return {
      scenario: name,
      distanceKm: distKm,
      distanceAU: distanceInAU(distKm),
      accelMs2,
      accelG: accelMs2 / 9.80665,
      deltaVKms: dvKms,
      deltaVMs: dvKms * 1000,
    };
  });
}

/**
 * Transfer 4: Brachistochrone distance reachable with ship's actual thrust.
 * How far can Kestrel actually go in 72 hours with constant acceleration?
 */
export function reachableDistance(timeSec: number = EP01_CONTRACT.deadlineSec) {
  const accelKms2 = (KESTREL.thrustN / KESTREL.massKg) / 1000; // km/s²
  // Brachistochrone: d = a * t² / 4
  const distKm = (accelKms2 * timeSec * timeSec) / 4;
  return {
    distanceKm: distKm,
    distanceAU: distanceInAU(distKm),
  };
}

/**
 * Mass interpretation sensitivity: what if 48000t means 48 tonnes (dry mass)?
 * Re-analyze acceleration with different mass interpretations.
 */
export function massSensitivity() {
  const interpretations = [
    { label: "48,000 t (48M kg) — as stated", massKg: 48_000_000 },
    { label: "4,800 t (4.8M kg) — possible typo", massKg: 4_800_000 },
    { label: "480 t (480K kg) — small freighter", massKg: 480_000 },
    { label: "48 t (48K kg) — very light", massKg: 48_000 },
  ];

  return interpretations.map(({ label, massKg }) => {
    const accel = shipAcceleration(massKg);
    const reach = (() => {
      const accelKms2 = (KESTREL.thrustN / massKg) / 1000;
      const t = EP01_CONTRACT.deadlineSec;
      const distKm = (accelKms2 * t * t) / 4;
      return { distanceKm: distKm, distanceAU: distanceInAU(distKm) };
    })();

    return {
      label,
      massKg,
      ...accel,
      reachable72h: reach,
    };
  });
}

/**
 * Boundary analysis: what is the maximum ship mass that makes a
 * brachistochrone transfer feasible in the given time?
 *
 * From brachistochrone: a_req = 4d / t²
 * From Newton: a = F / m → m_max = F / a_req = F * t² / (4d)
 */
export function maxFeasibleMass(
  distanceKm: number,
  timeSec: number,
  thrustN: number = KESTREL.thrustN,
) {
  const distanceM = distanceKm * 1000;
  const aReqMs2 = (4 * distanceM) / (timeSec * timeSec);
  const maxMassKg = thrustN / aReqMs2;
  return {
    aReqMs2,
    aReqG: aReqMs2 / 9.80665,
    maxMassKg,
    maxMassT: maxMassKg / 1000,
  };
}

/**
 * Boundary analysis: what thrust is needed for a given mass and transfer?
 *
 * F_req = m * a_req = m * 4d / t²
 */
export function requiredThrust(
  distanceKm: number,
  timeSec: number,
  massKg: number = KESTREL.massKg,
) {
  const distanceM = distanceKm * 1000;
  const aReqMs2 = (4 * distanceM) / (timeSec * timeSec);
  const thrustN = massKg * aReqMs2;
  return {
    aReqMs2,
    aReqG: aReqMs2 / 9.80665,
    thrustN,
    thrustMN: thrustN / 1e6,
    thrustRatioToKestrel: thrustN / KESTREL.thrustN,
  };
}

/**
 * Boundary analysis: minimum transfer time for given mass and thrust.
 *
 * t_min = sqrt(4d * m / F) = sqrt(4d / a)
 */
export function minimumTransferTime(
  distanceKm: number,
  massKg: number = KESTREL.massKg,
  thrustN: number = KESTREL.thrustN,
) {
  const distanceM = distanceKm * 1000;
  const accelMs2 = thrustN / massKg;
  const tSec = Math.sqrt((4 * distanceM) / accelMs2);
  return {
    accelMs2,
    accelG: accelMs2 / 9.80665,
    timeSec: tSec,
    timeHours: tSec / 3600,
    timeDays: tSec / 86400,
  };
}

/**
 * Full Episode 1 analysis combining all transfers.
 */
export function analyzeEpisode1() {
  const hohmann = hohmannBaseline();
  const shipAccel = shipAcceleration();
  const req72h = brachistochroneRequirements(EP01_CONTRACT.deadlineSec);
  const req150h = brachistochroneRequirements(EP01_CONTRACT.normalTimeSec);
  const reachable = reachableDistance();
  const massSens = massSensitivity();

  // Boundary analyses for closest-approach scenario
  const closestDist = DISTANCE_SCENARIOS.closest;
  const massBoundary72h = maxFeasibleMass(closestDist, EP01_CONTRACT.deadlineSec);
  const thrustBoundary72h = requiredThrust(closestDist, EP01_CONTRACT.deadlineSec);
  const minTime48kt = minimumTransferTime(closestDist);
  const minTime299t = minimumTransferTime(closestDist, 299_000);

  return {
    hohmann,
    shipAcceleration: shipAccel,
    brachistochrone72h: req72h,
    brachistochrone150h: req150h,
    reachableWithShipThrust: reachable,
    massSensitivity: massSens,
    boundaries: {
      massBoundary72h,
      thrustBoundary72h,
      minTimeAtCanonicalMass: minTime48kt,
      minTimeAt299t: minTime299t,
    },
  };
}
