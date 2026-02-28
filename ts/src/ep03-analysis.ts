/**
 * Episode 3 Analysis: Saturn (Enceladus) → Uranus (Titania)
 *
 * SOLAR LINE Part 3 depicts Kestrel departing from Enceladus (Saturn system)
 * on an outer-system route (外縁航路) to the Titania Terminal Complex at Uranus.
 *
 * Key constraints:
 * - Small cargo ship designed for inner-system routes, NOT outer-system
 * - Transfer time: 143h 12m (~6 days) — dialogue ~3:11
 * - Saturn gravity assist for initial cruise acceleration — dialogue ~3:18
 * - Beyond "Orbital Curtain": no guidance beacons, background stellar + inertial nav only
 * - 2 course correction burns planned en route — dialogue ~3:48
 * - Final error margin: ±18 km — dialogue ~3:50
 * - 30% of outer route ships become "lost" (遭難) — dialogue ~3:58
 * - Navigation crisis at 14.72 AU: stellar vs inertial nav disagree by 1.23° — dialogue ~14:00
 * - Speed at crisis: ~3000 km/s cruise — dialogue ~14:04 (ASR unreliable: could be 30 km/s)
 * - 1.23° error = ~14.36 million km at Uranus distance — dialogue ~14:17
 * - Decision window: ~10 minutes — dialogue ~15:45
 * - Uranus approach at 25 RU — dialogue ~16:33
 * - Kiritan chooses inertial navigation (惑星航法) course — dialogue ~16:19
 *
 * Source: sm45588149 (Niconico), l1jjXpv17-E (YouTube)
 * Worldbuilding: note.com/yuepicos/n/n4da939fc40ed
 */

import {
  hohmannTransferDv,
  orbitalPeriod,
  brachistochroneAccel,
  brachistochroneDeltaV,
  escapeVelocity,
  circularVelocity,
  MU,
  ORBIT_RADIUS,
  SATURN_RADIUS,
  ENCELADUS_ORBIT_RADIUS,
  URANUS_RADIUS,
  TITANIA_ORBIT_RADIUS,
  URANUS_MOON_ORBITS,
} from "./orbital.ts";
import { KESTREL, AU_KM } from "./kestrel.ts";
export { KESTREL };

/** Episode 3 orbital parameters from dialogue */
export const EP03_PARAMS = {
  /** Transfer time (sec) — dialogue ~3:11 "143時間12分" */
  transferTimeSec: (143 * 3600) + (12 * 60),
  /** Transfer time in hours */
  transferTimeHours: 143 + 12 / 60,
  /** Number of course correction burns — dialogue ~3:48 */
  correctionBurns: 2,
  /** Final error margin required (km) — dialogue ~3:50 "±18km" */
  errorMarginKm: 18,
  /** Loss rate for outer-system routes — dialogue ~3:58 "3割" */
  outerRouteLossRate: 0.3,
  /** Position at nav crisis (AU) — dialogue ~14:00 "14.72 AU" */
  crisisPositionAU: 14.72,
  /** Navigation disagreement angle (degrees) — dialogue ~14:06 "1.23°" */
  navDisagreementDeg: 1.23,
  /** Error at Uranus due to nav disagreement (km) — dialogue ~14:17 "1436万km" */
  errorAtUranusKm: 14_360_000,
  /** Decision window (sec) — dialogue ~15:45 "約10分" */
  decisionWindowSec: 10 * 60,
  /** Uranus approach distance in Uranus radii — dialogue ~16:33 "25RU" */
  approachRU: 25,
  /** Saturn DSN last calibration (sec before crisis) — dialogue ~15:11 "約21分前" */
  lastDsnCalibrationSec: 21 * 60,
  /** Stellar nav confidence — dialogue ~14:38 "92.3%" */
  stellarNavConfidence: 0.923,
  /** Inertial nav confidence — dialogue ~15:08 "91.7%" */
  inertialNavConfidence: 0.917,
} as const;

export function distanceInAU(km: number): number {
  return km / AU_KM;
}

// ─── Transfer 1: Hohmann Baseline Saturn→Uranus ───

/**
 * Classical minimum-energy Hohmann transfer from Saturn's orbit to Uranus's orbit.
 * Provides the theoretical baseline for comparison.
 */
export function hohmannBaseline() {
  const [dv1, dv2] = hohmannTransferDv(
    MU.SUN,
    ORBIT_RADIUS.SATURN,
    ORBIT_RADIUS.URANUS,
  );
  const aTransfer = (ORBIT_RADIUS.SATURN + ORBIT_RADIUS.URANUS) / 2;
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

// ─── Transfer 2: Saturn Gravity Assist Departure ───

/**
 * Analyze the Saturn gravity assist departure from Enceladus.
 * The ship first escapes Saturn's gravity well, then gets a boost
 * from Saturn's orbital velocity.
 */
export function saturnDeparture() {
  // Escape velocity from Enceladus orbit radius around Saturn
  const vEscSaturn = escapeVelocity(MU.SATURN, ENCELADUS_ORBIT_RADIUS);
  // Circular velocity at Enceladus orbit
  const vCircEnceladus = circularVelocity(MU.SATURN, ENCELADUS_ORBIT_RADIUS);

  // Saturn's heliocentric orbital velocity
  const saturnOrbitalV = circularVelocity(MU.SUN, ORBIT_RADIUS.SATURN);

  // For the ship to escape Saturn, needs at least v_esc
  // ΔV from Enceladus orbit: v_escape - v_circ_enceladus
  const dvEscapeFromEnceladus = vEscSaturn - vCircEnceladus;

  // With gravity assist, Saturn's own orbital velocity adds to heliocentric velocity
  // Best case: prograde departure adds Saturn's velocity
  return {
    vEscSaturnKms: vEscSaturn,
    vCircEnceladusKms: vCircEnceladus,
    dvEscapeFromEnceladusKms: dvEscapeFromEnceladus,
    saturnOrbitalVKms: saturnOrbitalV,
  };
}

// ─── Transfer 3: Brachistochrone Saturn→Uranus ───

/**
 * Saturn→Uranus distance scenarios.
 */
export const SU_DISTANCE_SCENARIOS = {
  /** Near opposition: Uranus radius - Saturn radius */
  closest: ORBIT_RADIUS.URANUS - ORBIT_RADIUS.SATURN,
  /** Quadrature: sqrt(r_S² + r_U²) */
  mid: Math.sqrt(ORBIT_RADIUS.SATURN ** 2 + ORBIT_RADIUS.URANUS ** 2),
  /** Near conjunction: Uranus radius + Saturn radius */
  farthest: ORBIT_RADIUS.SATURN + ORBIT_RADIUS.URANUS,
} as const;

/**
 * Brachistochrone transfer analysis for Saturn→Uranus at the claimed 143h 12m.
 * Compute required acceleration and ΔV for each distance scenario.
 */
export function brachistochroneAnalysis(timeSec: number = EP03_PARAMS.transferTimeSec) {
  return Object.entries(SU_DISTANCE_SCENARIOS).map(([name, distKm]) => {
    const accelKms2 = brachistochroneAccel(distKm, timeSec);
    const accelMs2 = accelKms2 * 1000;
    const dvKms = brachistochroneDeltaV(distKm, timeSec);

    // Required thrust for Kestrel at 48,000t
    const requiredThrustN = accelMs2 * KESTREL.massKg;
    const thrustRatio = requiredThrustN / KESTREL.thrustN;

    return {
      scenario: name,
      distanceKm: distKm,
      distanceAU: distanceInAU(distKm),
      accelMs2,
      accelG: accelMs2 / 9.80665,
      deltaVKms: dvKms,
      requiredThrustN,
      requiredThrustMN: requiredThrustN / 1e6,
      thrustRatio,
    };
  });
}

/**
 * Maximum feasible mass for the claimed brachistochrone transfer.
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
 * Minimum transfer time for given mass and thrust.
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

// ─── Transfer 4: Navigation Crisis Analysis ───

/**
 * Navigation error analysis at 14.72 AU.
 *
 * Two navigation systems disagree by 1.23°.
 * One points to Uranus, the other to outer solar system.
 * Compute the positional error this creates at Uranus distance.
 */
export function navigationCrisisAnalysis() {
  const positionKm = EP03_PARAMS.crisisPositionAU * AU_KM;
  const angleDeg = EP03_PARAMS.navDisagreementDeg;
  const angleRad = angleDeg * Math.PI / 180;

  // Remaining distance to Uranus from 14.72 AU
  const uranusDistKm = ORBIT_RADIUS.URANUS;
  const uranusDistAU = distanceInAU(uranusDistKm);
  const remainingDistAU = uranusDistAU - EP03_PARAMS.crisisPositionAU;
  const remainingDistKm = remainingDistAU * AU_KM;

  // Positional error at Uranus distance
  // Using small angle: error ≈ remaining_dist × tan(θ)
  // For 1.23°: tan(1.23°) ≈ 0.02147
  const errorAtUranusKm = remainingDistKm * Math.tan(angleRad);

  // Compare with stated 1436万km
  const statedErrorKm = EP03_PARAMS.errorAtUranusKm;

  // Uranus sphere of influence radius (Hill sphere)
  // r_SOI ≈ a_U × (m_U/m_Sun)^(2/5)
  const uranusSOIKm = ORBIT_RADIUS.URANUS * Math.pow(MU.URANUS / MU.SUN, 2 / 5);

  // Is the error larger than Uranus's SOI?
  const errorVsSOI = errorAtUranusKm / uranusSOIKm;

  // ±18 km error margin vs the 14.36 million km potential miss
  const errorMagnitudeRatio = statedErrorKm / EP03_PARAMS.errorMarginKm;

  return {
    positionAU: EP03_PARAMS.crisisPositionAU,
    positionKm,
    angleDeg,
    angleRad,
    remainingDistAU,
    remainingDistKm,
    computedErrorKm: errorAtUranusKm,
    statedErrorKm,
    computedVsStatedRatio: errorAtUranusKm / statedErrorKm,
    uranusSOIKm,
    errorVsSOI,
    errorMarginKm: EP03_PARAMS.errorMarginKm,
    errorMagnitudeRatio,
    stellarNavConfidence: EP03_PARAMS.stellarNavConfidence,
    inertialNavConfidence: EP03_PARAMS.inertialNavConfidence,
  };
}

// ─── Transfer 5: Uranus Capture at Titania ───

/**
 * Uranus capture analysis.
 * Ship approaches at 25 RU and must enter orbit to reach Titania.
 */
export function uranusCaptureAnalysis(approachVInfKms: number) {
  const rApproach = EP03_PARAMS.approachRU * URANUS_RADIUS;
  const rCapture = TITANIA_ORBIT_RADIUS;

  // Escape velocity at Titania orbit
  const vEscAtTitania = escapeVelocity(MU.URANUS, rCapture);
  const vCircAtTitania = circularVelocity(MU.URANUS, rCapture);

  // Escape velocity at 25 RU approach
  const vEscAt25RU = escapeVelocity(MU.URANUS, rApproach);

  // Hyperbolic approach velocity at periapsis (assuming periapsis at Titania orbit)
  const vPeri = Math.sqrt(approachVInfKms ** 2 + vEscAtTitania ** 2);

  // ΔV to capture into circular orbit at Titania
  const dvCapture = vPeri - vCircAtTitania;

  // ΔV to just become bound
  const dvMinCapture = vPeri - vEscAtTitania;

  // Titania orbital info
  const titaniaPeriod = orbitalPeriod(MU.URANUS, rCapture);

  return {
    approachRU: EP03_PARAMS.approachRU,
    approachKm: rApproach,
    rCaptureKm: rCapture,
    approachVInfKms,
    vEscAtTitaniaKms: vEscAtTitania,
    vCircAtTitaniaKms: vCircAtTitania,
    vEscAt25RUKms: vEscAt25RU,
    vPeriKms: vPeri,
    dvCircularCaptureKms: dvCapture,
    dvMinCaptureKms: dvMinCapture,
    titaniaPeriodHours: titaniaPeriod / 3600,
    titaniaPeriodDays: titaniaPeriod / 86400,
  };
}

// ─── Cruise Velocity Analysis ───

/**
 * Analyze the cruise velocity mentioned in dialogue (~3000 km/s).
 * ASR often garbles numbers, so consider alternatives: 30 km/s, 300 km/s, 3000 km/s.
 *
 * Cross-check with brachistochrone ΔV at claimed transfer time.
 */
export function cruiseVelocityAnalysis() {
  const closestDist = SU_DISTANCE_SCENARIOS.closest;
  const timeSec = EP03_PARAMS.transferTimeSec;

  // Brachistochrone: peak velocity = ΔV/2 (at midpoint)
  // Actually for brachistochrone: v_peak = a * (t/2) = ΔV/2
  const dvKms = brachistochroneDeltaV(closestDist, timeSec);
  const peakVKms = dvKms / 2;

  // Average velocity = distance / time
  const avgVKms = closestDist / timeSec;

  // Heliocentric velocity at 14.72 AU for various orbit types
  const solarVEscAt14AU = escapeVelocity(MU.SUN, EP03_PARAMS.crisisPositionAU * AU_KM);
  const solarVCircAt14AU = circularVelocity(MU.SUN, EP03_PARAMS.crisisPositionAU * AU_KM);

  // Saturn orbital velocity for reference
  const saturnOrbitalV = circularVelocity(MU.SUN, ORBIT_RADIUS.SATURN);
  // Uranus orbital velocity
  const uranusOrbitalV = circularVelocity(MU.SUN, ORBIT_RADIUS.URANUS);

  return {
    // ASR candidates
    candidates: [
      { label: "30 km/s", vKms: 30 },
      { label: "300 km/s", vKms: 300 },
      { label: "3000 km/s", vKms: 3000 },
    ],
    brachistochrone: {
      closestDistKm: closestDist,
      deltaVKms: dvKms,
      peakVelocityKms: peakVKms,
      averageVelocityKms: avgVKms,
    },
    heliocentric: {
      solarVEscAt14AUKms: solarVEscAt14AU,
      solarVCircAt14AUKms: solarVCircAt14AU,
      saturnOrbitalVKms: saturnOrbitalV,
      uranusOrbitalVKms: uranusOrbitalV,
    },
  };
}

// ─── Transfer 5b: Moon Comparison (IF analysis) ───

/**
 * Compare capture ΔV for different Uranian moons.
 *
 * Assumes a low v_inf after brachistochrone deceleration (default 2.0 km/s).
 * For each moon, computes:
 * - dv_capture: burn to become gravitationally bound (parabolic capture at moon's orbital radius)
 * - dv_orbit_insertion: burn to circularize at moon's orbital radius
 * - orbital period of the moon
 *
 * Source: NASA Uranian satellite fact sheet for orbital radii;
 *         mu_Uranus = 5,793,939 km³/s² from orbital.ts
 */
export function uranianMoonComparison(vInfKms: number = 2.0) {
  const moons = Object.entries(URANUS_MOON_ORBITS).map(([name, radiusKm]) => {
    const vEsc = escapeVelocity(MU.URANUS, radiusKm);
    const vCirc = circularVelocity(MU.URANUS, radiusKm);
    const vHyp = Math.sqrt(vInfKms ** 2 + vEsc ** 2);
    const dvCapture = vHyp - vEsc; // minimum capture (become bound)
    const dvOrbitInsertion = vHyp - vCirc; // circularize at moon's orbit
    const periodSec = orbitalPeriod(MU.URANUS, radiusKm);

    return {
      name,
      orbitalRadiusKm: radiusKm,
      vEscKms: vEsc,
      vCircKms: vCirc,
      vHypKms: vHyp,
      dvCaptureKms: dvCapture,
      dvOrbitInsertionKms: dvOrbitInsertion,
      periodDays: periodSec / 86400,
    };
  });

  return {
    vInfKms,
    muUranusKm3s2: MU.URANUS,
    moons,
  };
}

// ─── Full Analysis ───

/**
 * Full Episode 3 analysis combining all transfers.
 */
export function analyzeEpisode3() {
  const hohmann = hohmannBaseline();
  const departure = saturnDeparture();
  const brach = brachistochroneAnalysis();
  const navCrisis = navigationCrisisAnalysis();
  const cruiseV = cruiseVelocityAnalysis();

  // Estimate approach v_inf at Uranus based on brachistochrone scenario
  // For closest distance scenario: ship arrives with roughly v_peak velocity
  // relative to Uranus
  const closestBrach = brach.find(b => b.scenario === "closest")!;
  const avgV = closestBrach.deltaVKms / 2;
  // v_inf at Uranus ≈ average velocity - Uranus orbital velocity (rough)
  const uranusOrbitalV = circularVelocity(MU.SUN, ORBIT_RADIUS.URANUS);
  // The ship needs to match Uranus's orbit; excess is v_inf
  const estimatedVInf = Math.abs(avgV - uranusOrbitalV);
  const capture = uranusCaptureAnalysis(estimatedVInf);

  // Mass feasibility for closest scenario
  const massFeasibility = maxFeasibleMass(
    SU_DISTANCE_SCENARIOS.closest,
    EP03_PARAMS.transferTimeSec,
  );
  const minTransferTime = minimumTransferTime(SU_DISTANCE_SCENARIOS.closest);

  // Moon comparison IF analysis: low v_inf scenario (post-deceleration approach)
  // Assumes ~2 km/s residual velocity after brachistochrone deceleration
  const moonComparison = uranianMoonComparison(2.0);

  return {
    hohmann,
    saturnDeparture: departure,
    brachistochrone: brach,
    navCrisis,
    cruiseVelocity: cruiseV,
    uranusCapture: capture,
    massFeasibility,
    minTransferTime,
    moonComparison,
  };
}
