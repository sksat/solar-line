/**
 * Episode 2 Analysis: Jupiter Escape → Saturn (Enceladus)
 *
 * SOLAR LINE Part 2 depicts Kestrel escaping Jupiter's sphere of influence
 * with a damaged ship and reaching Saturn's moon Enceladus for emergency repairs.
 * The ship then encounters a large unknown vessel near Saturn.
 *
 * Key constraints:
 * - Ship is damaged: coolant leak, structural frame at 114% stress, no full burns
 * - Jupiter-centric velocity 10.3 km/s at altitude 50 RJ
 * - Radiation shield limited to ~42 minutes
 * - Navigation through Io plasma torus for stealth
 * - "Outer orbit" insertion window with no correction burns allowed
 *
 * Source: sm45407401 (Niconico), YXZWJLKD7Oo (YouTube)
 * Worldbuilding: note.com/yuepicos/n/n4da939fc40ed
 */

import {
  hohmannTransferDv,
  orbitalPeriod,
  brachistochroneAccel,
  brachistochroneDeltaV,
  escapeVelocity,
  circularVelocity,
  hyperbolicExcess,
  MU,
  ORBIT_RADIUS,
  JUPITER_RADIUS,
  SATURN_RADIUS,
  ENCELADUS_ORBIT_RADIUS,
} from "./orbital.ts";

/** 1 AU in km */
const AU_KM = 149_597_870.7;

/** Ship parameters — same Kestrel from Episode 1 */
export const KESTREL = {
  /** Maximum mass at standard load (kg) — worldbuilding doc */
  massKg: 48_000_000,
  /** Normal thrust (N) — worldbuilding doc */
  thrustN: 9_800_000,
  /** Peak thrust (N) — emergency "full burn" — worldbuilding doc */
  peakThrustN: 10_700_000,
} as const;

/** Episode 2 orbital parameters from dialogue */
export const EP02_PARAMS = {
  /** Jupiter-centric velocity at 50 RJ (km/s) — dialogue ~9:08 */
  jupiterVelocityKms: 10.3,
  /** Altitude in Jupiter radii — dialogue ~9:08 */
  altitudeRJ: 50,
  /** Altitude in km */
  altitudeKm: 50 * JUPITER_RADIUS,
  /** Radiation shield remaining time (sec) — dialogue ~7:44 */
  shieldTimeSec: 42 * 60,
  /** Coolant repair completion time (sec) — dialogue ~9:28 */
  coolantRepairTimeSec: 37 * 3600,
  /** Transfer window countdown (sec) — dialogue ~16:07 */
  transferWindowSec: 5 * 3600,
  /** Unknown vessel mass (kg) — dialogue ~17:11 "50万t" */
  unknownVesselMassKg: 500_000_000,
  /** Relative velocity to unknown vessel (km/s) — dialogue ~16:38 */
  unknownVesselRelVKms: 0.12,
  /** Distance to unknown vessel (km) — dialogue ~17:11 */
  unknownVesselDistKm: 3,
} as const;

/**
 * Jupiter-Saturn distance scenarios (km).
 * Computed from heliocentric orbital radii.
 */
export const JS_DISTANCE_SCENARIOS = {
  /** Near opposition: Saturn radius - Jupiter radius */
  closest: ORBIT_RADIUS.SATURN - ORBIT_RADIUS.JUPITER,
  /** Quadrature-like: sqrt(r_J² + r_S²) */
  mid: Math.sqrt(ORBIT_RADIUS.JUPITER ** 2 + ORBIT_RADIUS.SATURN ** 2),
  /** Near conjunction: Saturn radius + Jupiter radius */
  farthest: ORBIT_RADIUS.SATURN + ORBIT_RADIUS.JUPITER,
} as const;

export function distanceInAU(km: number): number {
  return km / AU_KM;
}

// ─── Transfer 1: Hohmann Baseline Jupiter→Saturn ───

/**
 * Classical minimum-energy Hohmann transfer from Jupiter's orbit to Saturn's orbit.
 * This provides the theoretical baseline for comparison.
 */
export function hohmannBaseline() {
  const [dv1, dv2] = hohmannTransferDv(
    MU.SUN,
    ORBIT_RADIUS.JUPITER,
    ORBIT_RADIUS.SATURN,
  );
  const aTransfer = (ORBIT_RADIUS.JUPITER + ORBIT_RADIUS.SATURN) / 2;
  const transferTimeSec = orbitalPeriod(MU.SUN, aTransfer) / 2;
  const transferTimeDays = transferTimeSec / 86400;
  const transferTimeYears = transferTimeDays / 365.25;

  return {
    departureDv: dv1,
    arrivalDv: dv2,
    totalDv: dv1 + dv2,
    transferTimeSec,
    transferTimeDays,
    transferTimeYears,
  };
}

// ─── Transfer 2: Jupiter Escape Analysis ───

/**
 * Analyze whether 10.3 km/s at 50 RJ is sufficient to escape Jupiter's gravity.
 * v_esc = sqrt(2 * mu_J / r)
 * v_inf = sqrt(v² - v_esc²) if v > v_esc
 */
export function jupiterEscapeAnalysis() {
  const r = EP02_PARAMS.altitudeKm;
  const v = EP02_PARAMS.jupiterVelocityKms;
  const vEsc = escapeVelocity(MU.JUPITER, r);
  const vInf = hyperbolicExcess(v, vEsc);
  const isUnbound = v > vEsc;

  // Jupiter's orbital velocity around the Sun
  const jupiterOrbitalV = circularVelocity(MU.SUN, ORBIT_RADIUS.JUPITER);

  // Heliocentric velocity depends on departure direction
  // Best case: v_inf adds to Jupiter's orbital velocity
  // Worst case: v_inf subtracts from Jupiter's orbital velocity
  const heliocentricBest = jupiterOrbitalV + vInf;
  const heliocentricWorst = jupiterOrbitalV - vInf;

  // Saturn's orbital velocity
  const saturnOrbitalV = circularVelocity(MU.SUN, ORBIT_RADIUS.SATURN);

  return {
    altitudeKm: r,
    altitudeRJ: EP02_PARAMS.altitudeRJ,
    velocityKms: v,
    escapeVelocityKms: vEsc,
    hyperbolicExcessKms: vInf,
    isUnbound,
    jupiterOrbitalVKms: jupiterOrbitalV,
    heliocentricBestKms: heliocentricBest,
    heliocentricWorstKms: heliocentricWorst,
    saturnOrbitalVKms: saturnOrbitalV,
  };
}

// ─── Transfer 3: Jupiter→Saturn Brachistochrone ───

/**
 * Brachistochrone requirements for Jupiter→Saturn transfer at various distances.
 * Given ship damage, also compute with reduced thrust scenarios.
 */
export function brachistochroneRequirements(timeSec: number) {
  return Object.entries(JS_DISTANCE_SCENARIOS).map(([name, distKm]) => {
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
    };
  });
}

// ─── Transfer 4: Saturn Capture & Enceladus Approach ───

/**
 * Saturn capture analysis.
 * What ΔV is needed to enter Saturn orbit from a hyperbolic approach?
 *
 * Assume ship arrives at Saturn's SOI with some heliocentric excess velocity.
 * The capture burn must slow down enough to enter a bound orbit.
 */
export function saturnCaptureAnalysis(approachVInfKms: number) {
  // Capture at Enceladus orbit radius — a favorable scenario
  const rCapture = ENCELADUS_ORBIT_RADIUS;
  const vEscAtCapture = escapeVelocity(MU.SATURN, rCapture);
  const vCircAtCapture = circularVelocity(MU.SATURN, rCapture);

  // Hyperbolic approach velocity at periapsis (Enceladus orbit):
  // v_peri = sqrt(v_inf² + v_esc²)
  const vPeri = Math.sqrt(approachVInfKms ** 2 + vEscAtCapture ** 2);

  // ΔV to capture into circular orbit at Enceladus
  const dvCapture = vPeri - vCircAtCapture;

  // ΔV to just become bound (reduce to exactly escape velocity)
  const dvMinCapture = vPeri - vEscAtCapture;

  return {
    rCaptureKm: rCapture,
    approachVInfKms,
    vEscAtCaptureKms: vEscAtCapture,
    vCircAtCaptureKms: vCircAtCapture,
    vPeriKms: vPeri,
    dvCircularCaptureKms: dvCapture,
    dvMinCaptureKms: dvMinCapture,
  };
}

/**
 * Enceladus orbital parameters for context.
 */
export function enceladusOrbitalInfo() {
  const vCirc = circularVelocity(MU.SATURN, ENCELADUS_ORBIT_RADIUS);
  const period = orbitalPeriod(MU.SATURN, ENCELADUS_ORBIT_RADIUS);

  return {
    orbitalRadiusKm: ENCELADUS_ORBIT_RADIUS,
    orbitalVelocityKms: vCirc,
    orbitalPeriodSec: period,
    orbitalPeriodHours: period / 3600,
  };
}

// ─── Boundary Analysis Functions ───

/**
 * Heliocentric transfer analysis: given Jupiter departure v_inf,
 * compute the heliocentric orbit and see if it naturally reaches Saturn.
 *
 * For a prograde departure from Jupiter with v_inf:
 * v_helio = v_Jupiter + v_inf (best case, prograde)
 *
 * The orbit can be:
 * - Elliptic (bound): if v_helio < v_esc_sun → has a finite apoapsis
 * - Hyperbolic (unbound): if v_helio ≥ v_esc_sun → escapes the solar system
 *   A hyperbolic orbit passes through Saturn's orbit on its way out.
 *
 * a = 1 / (2/r - v²/μ)   (negative for hyperbolic)
 */
export function heliocentricTransferOrbit(vInfKms: number) {
  const rJ = ORBIT_RADIUS.JUPITER;
  const vJ = circularVelocity(MU.SUN, rJ);
  const vEscSun = escapeVelocity(MU.SUN, rJ);

  // Prograde departure: v_helio = v_J + v_inf
  const vHelio = vJ + vInfKms;

  // Is the heliocentric orbit hyperbolic (solar escape)?
  const isHyperbolic = vHelio >= vEscSun;

  // Semi-major axis from vis-viva (negative for hyperbolic)
  const a = 1 / (2 / rJ - (vHelio * vHelio) / MU.SUN);

  // Solar hyperbolic excess velocity
  const solarVInf = isHyperbolic
    ? Math.sqrt(vHelio * vHelio - vEscSun * vEscSun)
    : 0;

  if (isHyperbolic) {
    // Hyperbolic orbit: will pass through Saturn's distance on the way out
    // Velocity at Saturn's orbit: v_at_rS = sqrt(v_inf² + 2*mu/rS)
    // (vis-viva with negative a gives same result)
    const rS = ORBIT_RADIUS.SATURN;
    const vAtSaturn = Math.sqrt(solarVInf * solarVInf + 2 * MU.SUN / rS);
    const saturnOrbV = circularVelocity(MU.SUN, rS);

    // Time to reach Saturn from Jupiter on a hyperbolic trajectory
    // For rough estimate: use average velocity
    const avgV = (vHelio + vAtSaturn) / 2;
    const dist = rS - rJ;
    const estTransitTimeSec = dist / avgV;

    return {
      vHelioKms: vHelio,
      vEscSunKms: vEscSun,
      semiMajorAxisKm: a,
      isHyperbolic: true as const,
      solarVInfKms: solarVInf,
      reachesSaturn: true,
      // Velocity at Saturn's orbit
      arrivalVKms: vAtSaturn,
      saturnOrbitalVKms: saturnOrbV,
      // v_inf relative to Saturn
      vInfAtSaturnKms: Math.abs(vAtSaturn - saturnOrbV),
      estimatedTransitDays: estTransitTimeSec / 86400,
      estimatedTransitYears: estTransitTimeSec / (86400 * 365.25),
    };
  } else {
    // Elliptic orbit
    const e = 1 - rJ / a;
    const rApo = a * (1 + e);
    const reachesSaturn = rApo >= ORBIT_RADIUS.SATURN;
    const period = orbitalPeriod(MU.SUN, a);
    const transferTimeSec = period / 2;

    return {
      vHelioKms: vHelio,
      vEscSunKms: vEscSun,
      semiMajorAxisKm: a,
      isHyperbolic: false as const,
      solarVInfKms: 0,
      eccentricity: e,
      apoapsisKm: rApo,
      apoapsisAU: rApo / AU_KM,
      reachesSaturn,
      transferTimeDays: transferTimeSec / 86400,
      transferTimeYears: transferTimeSec / (86400 * 365.25),
      arrivalVKms: reachesSaturn
        ? Math.sqrt(MU.SUN * (2 / ORBIT_RADIUS.SATURN - 1 / a))
        : 0,
      saturnOrbitalVKms: circularVelocity(MU.SUN, ORBIT_RADIUS.SATURN),
      vInfAtSaturnKms: reachesSaturn
        ? Math.abs(
            Math.sqrt(MU.SUN * (2 / ORBIT_RADIUS.SATURN - 1 / a)) -
              circularVelocity(MU.SUN, ORBIT_RADIUS.SATURN),
          )
        : 0,
    };
  }
}

/**
 * Compute v_inf at Saturn arrival given heliocentric orbit.
 * v_inf_saturn = |v_arrival - v_saturn_orbital|
 */
export function saturnArrivalVInf(vInfJupiterKms: number) {
  const transfer = heliocentricTransferOrbit(vInfJupiterKms);
  if (!transfer.reachesSaturn) {
    return { reachesSaturn: false as const, vInfSaturnKms: 0 };
  }

  return {
    reachesSaturn: true as const,
    vInfSaturnKms: transfer.vInfAtSaturnKms,
    isHyperbolic: transfer.isHyperbolic,
    ...(transfer.isHyperbolic
      ? {
          estimatedTransitDays: transfer.estimatedTransitDays,
          estimatedTransitYears: transfer.estimatedTransitYears,
        }
      : {
          transferDays: transfer.transferTimeDays,
          transferYears: transfer.transferTimeYears,
        }),
  };
}

/**
 * What additional heliocentric ΔV (from Kestrel's engines) is needed to reach Saturn,
 * given the Jupiter departure v_inf?
 *
 * If the natural transfer orbit doesn't reach Saturn, compute the shortfall.
 */
export function additionalDvToReachSaturn(vInfJupiterKms: number) {
  const transfer = heliocentricTransferOrbit(vInfJupiterKms);
  const rJ = ORBIT_RADIUS.JUPITER;
  const rS = ORBIT_RADIUS.SATURN;

  if (transfer.reachesSaturn) {
    return {
      additionalDvKms: 0,
      naturallyReaches: true,
      isHyperbolic: transfer.isHyperbolic,
    };
  }

  // Need to compute what heliocentric velocity at Jupiter gives an orbit reaching Saturn
  // For rApo = rS: a = (rJ + rS) / 2, e = (rS - rJ) / (rS + rJ)
  // v_needed = sqrt(MU.SUN * (2/rJ - 1/a))
  const aNeeded = (rJ + rS) / 2;
  const vNeeded = Math.sqrt(MU.SUN * (2 / rJ - 1 / aNeeded));
  const vCurrent = transfer.vHelioKms;
  const dvNeeded = vNeeded - vCurrent;

  return {
    additionalDvKms: dvNeeded,
    naturallyReaches: false,
    isHyperbolic: false,
    currentVHelioKms: vCurrent,
    neededVHelioKms: vNeeded,
    apoapsisAU: !transfer.isHyperbolic ? transfer.apoapsisAU : undefined,
  };
}

/**
 * Maximum feasible mass for a given brachistochrone transfer (same as ep01).
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
 * Minimum transfer time for given mass and thrust (same as ep01).
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
 * Damaged thrust scenarios.
 * Ship's cooling is compromised — assume thrust is limited to some fraction.
 */
export function damagedThrustScenarios() {
  const thrustLevels = [
    { label: "通常推力（9.8 MN）", fraction: 1.0 },
    { label: "50%推力（4.9 MN）", fraction: 0.5 },
    { label: "25%推力（2.45 MN）", fraction: 0.25 },
    { label: "トリムのみ（推定1%、98 kN）", fraction: 0.01 },
  ];

  // Use Episode 1's feasible mass (~300t) for meaningful analysis
  const massKg = 300_000;
  const closestDist = JS_DISTANCE_SCENARIOS.closest;

  return thrustLevels.map(({ label, fraction }) => {
    const thrustN = KESTREL.thrustN * fraction;
    const accelMs2 = thrustN / massKg;
    const minTime = minimumTransferTime(closestDist, massKg, thrustN);

    return {
      label,
      fraction,
      thrustN,
      thrustMN: thrustN / 1e6,
      accelMs2,
      accelG: accelMs2 / 9.80665,
      minTimeClosestHours: minTime.timeHours,
      minTimeClosestDays: minTime.timeDays,
    };
  });
}

/**
 * Full Episode 2 analysis combining all transfers.
 */
export function analyzeEpisode2() {
  const hohmann = hohmannBaseline();
  const escape = jupiterEscapeAnalysis();
  const enceladusInfo = enceladusOrbitalInfo();

  // Heliocentric transfer with natural v_inf
  const transfer = heliocentricTransferOrbit(escape.hyperbolicExcessKms);
  const saturnVInf = saturnArrivalVInf(escape.hyperbolicExcessKms);
  const additionalDv = additionalDvToReachSaturn(escape.hyperbolicExcessKms);

  // Saturn capture if it reaches
  const saturnCapture = saturnVInf.reachesSaturn
    ? saturnCaptureAnalysis(saturnVInf.vInfSaturnKms)
    : null;

  // Brachistochrone requirements for various timescales
  const brach30d = brachistochroneRequirements(30 * 86400);
  const brach90d = brachistochroneRequirements(90 * 86400);

  // Damaged thrust analysis
  const damagedThrust = damagedThrustScenarios();

  return {
    hohmann,
    jupiterEscape: escape,
    heliocentricTransfer: transfer,
    saturnArrivalVInf: saturnVInf,
    additionalDvNeeded: additionalDv,
    saturnCapture,
    enceladusInfo,
    brachistochrone30d: brach30d,
    brachistochrone90d: brach90d,
    damagedThrust,
  };
}
