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

// ─── Trim-Thrust Transfer Simulation ───

/** Trim thrust parameters */
export const TRIM_THRUST = {
  /** Trim thrust fraction of nominal (estimated 1%) */
  fraction: 0.01,
  /** Trim thrust in Newtons */
  thrustN: KESTREL.thrustN * 0.01,
  /** Ship mass (kg) — EP01-derived feasible mass */
  massKg: 300_000,
  /** Acceleration (km/s²) */
  get accelKms2() {
    return this.thrustN / this.massKg / 1000;
  },
  /** Specific impulse (s) */
  isp: 1_000_000,
} as const;

/** Result of a single trim-thrust transfer simulation */
export interface TrimThrustResult {
  /** Thrust duration (days) */
  thrustDays: number;
  /** Total transfer time to reach Saturn's orbital radius (days) */
  transferDays: number;
  /** Total ΔV applied (km/s) */
  deltaVKms: number;
  /** Propellant mass fraction */
  propellantFraction: number;
  /** Heliocentric speed at Saturn orbital radius crossing (km/s) */
  arrivalSpeedKms: number;
  /** Radial speed component at arrival (km/s) */
  arrivalRadialSpeedKms: number;
  /** Tangential speed component at arrival (km/s) */
  arrivalTangentialSpeedKms: number;
  /** v_inf relative to Saturn (km/s) — approximate */
  vInfAtSaturnKms: number;
  /** Optimal thrust angle from tangential (degrees) */
  thrustAngleDeg: number;
}

/**
 * RK4 integration step for 2D heliocentric orbit with optional thrust.
 *
 * State: [x, y, vx, vy] (km, km/s)
 * Thrust acceleration vector in km/s²
 */
function rk4Step(
  state: [number, number, number, number],
  dt: number,
  thrustAccel: [number, number],
): [number, number, number, number] {
  const mu = MU.SUN;

  function deriv(
    s: [number, number, number, number],
  ): [number, number, number, number] {
    const [x, y, vx, vy] = s;
    const r = Math.sqrt(x * x + y * y);
    const r3 = r * r * r;
    return [vx, vy, -mu * x / r3 + thrustAccel[0], -mu * y / r3 + thrustAccel[1]];
  }

  const k1 = deriv(state);
  const s2: [number, number, number, number] = [
    state[0] + k1[0] * dt / 2,
    state[1] + k1[1] * dt / 2,
    state[2] + k1[2] * dt / 2,
    state[3] + k1[3] * dt / 2,
  ];
  const k2 = deriv(s2);
  const s3: [number, number, number, number] = [
    state[0] + k2[0] * dt / 2,
    state[1] + k2[1] * dt / 2,
    state[2] + k2[2] * dt / 2,
    state[3] + k2[3] * dt / 2,
  ];
  const k3 = deriv(s3);
  const s4: [number, number, number, number] = [
    state[0] + k3[0] * dt,
    state[1] + k3[1] * dt,
    state[2] + k3[2] * dt,
    state[3] + k3[3] * dt,
  ];
  const k4 = deriv(s4);

  return [
    state[0] + (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) * dt / 6,
    state[1] + (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) * dt / 6,
    state[2] + (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]) * dt / 6,
    state[3] + (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]) * dt / 6,
  ];
}

/**
 * Simulate a trim-thrust transfer from Jupiter to Saturn's orbital radius.
 *
 * The ship departs Jupiter's orbit with v_inf directed at angle alphaDeg
 * from the prograde (tangential) direction. Trim thrust is applied for
 * thrustDays at angle betaDeg from the local tangential direction
 * (positive = toward radial outward), then coasts ballistically.
 *
 * @param thrustDays Number of days to apply trim thrust (0 = pure ballistic)
 * @param alphaDeg v_inf departure angle from prograde (degrees)
 * @param betaDeg Thrust direction angle from tangential (degrees, 90 = radial out)
 * @param maxDays Maximum simulation time (days)
 * @returns Transfer time in days, or null if Saturn radius not reached
 */
function simulateTrimTransfer(
  thrustDays: number,
  alphaDeg: number,
  betaDeg: number,
  maxDays: number = 500,
): { transferDays: number; arrivalState: [number, number, number, number] } | null {
  const rJ = ORBIT_RADIUS.JUPITER;
  const rS = ORBIT_RADIUS.SATURN;
  const vJ = circularVelocity(MU.SUN, rJ);
  const vInf = jupiterEscapeAnalysis().hyperbolicExcessKms;
  const accel = TRIM_THRUST.thrustN / TRIM_THRUST.massKg / 1000; // km/s²

  const alpha = (alphaDeg * Math.PI) / 180;
  const beta = (betaDeg * Math.PI) / 180;

  // Initial state: ship at Jupiter's orbital radius on +x axis
  // Jupiter moves in +y direction (tangential)
  // v_inf decomposed: cos(alpha) = tangential, sin(alpha) = radial outward
  let state: [number, number, number, number] = [
    rJ,
    0,
    vInf * Math.sin(alpha), // radial component
    vJ + vInf * Math.cos(alpha), // tangential component
  ];

  const thrustSec = thrustDays * 86400;
  const maxSec = maxDays * 86400;
  const dtThrust = 60; // 1-minute steps during thrust
  const dtCoast = 600; // 10-minute steps during coast

  let t = 0;

  while (t < maxSec) {
    const [x, y] = state;
    const r = Math.sqrt(x * x + y * y);

    if (r >= rS) {
      return { transferDays: t / 86400, arrivalState: state };
    }

    let thrustVec: [number, number] = [0, 0];
    let dt: number;

    if (t < thrustSec) {
      // Compute local radial and tangential unit vectors
      const rHat: [number, number] = [x / r, y / r];
      const tHat: [number, number] = [-rHat[1], rHat[0]];

      // Thrust direction: beta from tangential toward radial outward
      thrustVec = [
        accel * (Math.cos(beta) * tHat[0] + Math.sin(beta) * rHat[0]),
        accel * (Math.cos(beta) * tHat[1] + Math.sin(beta) * rHat[1]),
      ];
      dt = dtThrust;
    } else {
      dt = dtCoast;
    }

    state = rk4Step(state, dt, thrustVec);
    t += dt;
  }

  return null;
}

/**
 * Find the optimal thrust angle (beta) for a given thrust duration
 * that minimizes transfer time to Saturn's orbital radius.
 */
function optimizeThrustAngle(
  thrustDays: number,
  alphaDeg: number = 32,
): { bestBetaDeg: number; bestTransferDays: number } {
  let bestBeta = 0;
  let bestTime = Infinity;

  // Scan beta from -90° to +90° in 2° steps
  for (let beta = -90; beta <= 90; beta += 2) {
    const result = simulateTrimTransfer(thrustDays, alphaDeg, beta);
    if (result && result.transferDays < bestTime) {
      bestTime = result.transferDays;
      bestBeta = beta;
    }
  }

  // Refine with 0.5° steps around the best
  for (let beta = bestBeta - 2; beta <= bestBeta + 2; beta += 0.5) {
    const result = simulateTrimTransfer(thrustDays, 32, beta);
    if (result && result.transferDays < bestTime) {
      bestTime = result.transferDays;
      bestBeta = beta;
    }
  }

  return { bestBetaDeg: bestBeta, bestTransferDays: bestTime };
}

/**
 * Comprehensive trim-thrust transfer analysis.
 *
 * Corrects the previous average-velocity approximation (which gave ~455 days)
 * with proper 2D numerical orbit propagation. Key finding: pure ballistic
 * transfer takes ~1000 days (the curved path is much longer than the radial
 * distance). Trim thrust at 1% capacity dramatically shortens this.
 */
export function trimThrustTransferAnalysis(): TrimThrustResult[] {
  const vInf = jupiterEscapeAnalysis().hyperbolicExcessKms;
  const accel = TRIM_THRUST.thrustN / TRIM_THRUST.massKg / 1000; // km/s²
  const saturnOrbV = circularVelocity(MU.SUN, ORBIT_RADIUS.SATURN);
  const g0 = 9.80665 / 1000; // km/s²
  const exhaustV = TRIM_THRUST.isp * g0; // km/s

  const thrustDaysToTest = [0, 1, 3, 5, 7, 14, 30];
  const results: TrimThrustResult[] = [];

  for (const thrustDays of thrustDaysToTest) {
    if (thrustDays === 0) {
      // Pure ballistic: use optimal departure angle
      const result = simulateTrimTransfer(0, 32, 0, 1500);
      if (result) {
        const [x, y, vx, vy] = result.arrivalState;
        const r = Math.sqrt(x * x + y * y);
        const speed = Math.sqrt(vx * vx + vy * vy);
        const rHat: [number, number] = [x / r, y / r];
        const vr = vx * rHat[0] + vy * rHat[1];
        const vt = -vx * rHat[1] + vy * rHat[0];
        results.push({
          thrustDays: 0,
          transferDays: result.transferDays,
          deltaVKms: 0,
          propellantFraction: 0,
          arrivalSpeedKms: speed,
          arrivalRadialSpeedKms: vr,
          arrivalTangentialSpeedKms: vt,
          vInfAtSaturnKms: Math.sqrt((vr) ** 2 + (vt - saturnOrbV) ** 2),
          thrustAngleDeg: 0,
        });
      }
      continue;
    }

    const { bestBetaDeg, bestTransferDays } = optimizeThrustAngle(thrustDays);
    const result = simulateTrimTransfer(thrustDays, 32, bestBetaDeg);

    if (result) {
      const dv = accel * thrustDays * 86400;
      const propFrac = 1 - Math.exp(-dv / exhaustV);

      const [x, y, vx, vy] = result.arrivalState;
      const r = Math.sqrt(x * x + y * y);
      const speed = Math.sqrt(vx * vx + vy * vy);
      const rHat: [number, number] = [x / r, y / r];
      const vr = vx * rHat[0] + vy * rHat[1];
      const vt = -vx * rHat[1] + vy * rHat[0];

      results.push({
        thrustDays,
        transferDays: bestTransferDays,
        deltaVKms: dv,
        propellantFraction: propFrac,
        arrivalSpeedKms: speed,
        arrivalRadialSpeedKms: vr,
        arrivalTangentialSpeedKms: vt,
        vInfAtSaturnKms: Math.sqrt((vr) ** 2 + (vt - saturnOrbV) ** 2),
        thrustAngleDeg: bestBetaDeg,
      });
    }
  }

  return results;
}

/**
 * Primary EP02 transfer scenario: 3-day trim thrust.
 * This replaces the flawed 455-day average-velocity estimate.
 */
export function primaryTransferScenario() {
  const allResults = trimThrustTransferAnalysis();
  const primary = allResults.find((r) => r.thrustDays === 3);
  const ballistic = allResults.find((r) => r.thrustDays === 0);
  const fast = allResults.find((r) => r.thrustDays === 7);

  return {
    primary,
    ballistic,
    fast,
    allScenarios: allResults,
    correctionNote:
      "Previous estimate of ~455 days used average-velocity over radial distance, " +
      "which does not account for orbital curvature. Proper 2D orbit propagation " +
      "shows pure ballistic transfer takes ~1000 days. Trim thrust (台詞: 'トリムのみ') " +
      "at 1% capacity dramatically shortens transfer with negligible propellant cost.",
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

  // Trim-thrust transfer analysis (corrects previous 455-day estimate)
  const trimThrust = primaryTransferScenario();

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
    trimThrust,
  };
}
