/**
 * Episode 4 Analysis: Titania (Uranus) → Earth — "New Solar Line"
 *
 * SOLAR LINE Part 4 depicts Kestrel's heavily damaged approach to Titania,
 * a plasmoid encounter in the Uranus magnetosphere, and finally the departure
 * from Titania toward Earth — a completely new "Solar Line" route that operates
 * outside Earth's navigation beacon infrastructure.
 *
 * Key constraints:
 * - Ship severely damaged: coolant at 63%, frame cracks (#3, #6, #7, #8)
 * - Engine nozzle coil degraded: estimated 3-4 burns remaining
 * - Cooling capacity loss in 12h, Titania arrival in 9h42m — dialogue ~0:07
 * - Orbital insertion at Titania requires deceleration burn — dialogue ~0:25
 * - Plasmoid encounter: 8 min transit, 14 min shield life — dialogue ~2:39
 * - Uranus magnetic axis tilted 60° from rotation axis — dialogue ~2:39
 * - Radiation exposure: peak 12.6 cSv/min, cumulative 480 mSv — dialogue ~10:17
 * - Departure thrust at 65%, estimated 6.3 MN — dialogue ~17:29
 * - Destination: Earth — "new Solar Line" — dialogue ~16:12
 * - Earth fleet: 5+ ships from Saturn direction, 33h away — dialogue ~13:11
 *
 * Source: sm45851569 (Niconico), 1cTmWjYSlTM (YouTube)
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
  URANUS_RADIUS,
  TITANIA_ORBIT_RADIUS,
} from "./orbital.ts";
import { KESTREL, AU_KM } from "./kestrel.ts";
export { KESTREL };

/** Episode 4 orbital parameters from dialogue */
export const EP04_PARAMS = {
  /** Time remaining to Titania (sec) — dialogue ~0:07 "残り9時間42分" */
  titaniaRemainingTimeSec: (9 * 3600) + (42 * 60),
  /** Coolant capacity loss deadline (sec) — dialogue ~0:07 "12時間以内" */
  coolantDeadlineSec: 12 * 3600,
  /** Magnetic shield remaining life (sec) — dialogue ~2:39 "14分" */
  shieldLifeSec: 14 * 60,
  /** Plasmoid transit minimum duration (sec) — dialogue ~2:39 "8分" */
  plasmoidTransitSec: 8 * 60,
  /** Uranus magnetic axis tilt from rotation axis (degrees) — dialogue ~2:39 "60°" */
  magneticAxisTiltDeg: 60,
  /** External radiation peak (cSv/min) — dialogue ~4:26 "12.6cSv" */
  peakRadiationCSvMin: 12.6,
  /** Cumulative exposure to Titania (mSv) — dialogue ~6:32 "48mSv" */
  cumulativeExposureMSv: 48,
  /** Total exposure at Titania (mSv) — dialogue ~10:17 "480mSv" */
  totalExposureMSv: 480,
  /** Departure thrust fraction — dialogue ~17:29 "65%" */
  thrustFraction: 0.65,
  /** Estimated departure thrust (N) — dialogue ~17:29 "6.3MN" */
  departureThrustN: 6_300_000,
  /** Available engine burns — dialogue ~17:16 "3回最大4回" */
  availableBurns: { min: 3, max: 4 },
  /** Cooling system primary loop pressure (MPa) — dialogue ~17:16 */
  coolingPressure1MPa: 1.87,
  /** Cooling system secondary loop pressure (MPa) — dialogue ~17:16 */
  coolingPressure2MPa: 0.96,
  /** Thermal margin fraction — dialogue ~17:16 "78%" */
  thermalMarginFraction: 0.78,
  /** Earth fleet ETA (sec) — dialogue ~13:31 "33時間" */
  fleetETASec: 33 * 3600,
  /** Earth fleet ship count — dialogue ~13:11 "少なくとも5隻" */
  fleetShipCount: 5,
} as const;

export function distanceInAU(km: number): number {
  return km / AU_KM;
}

// ─── Transfer 1: Hohmann Baseline Uranus→Earth ───

/**
 * Classical minimum-energy Hohmann transfer from Uranus's orbit to Earth's orbit.
 * Inward transfer (r1 > r2).
 */
export function hohmannBaseline() {
  const r1 = ORBIT_RADIUS.URANUS;
  const r2 = ORBIT_RADIUS.EARTH;
  const aTransfer = (r1 + r2) / 2;
  const transferTimeSec = orbitalPeriod(MU.SUN, aTransfer) / 2;
  const transferTimeDays = transferTimeSec / 86400;
  const transferTimeYears = transferTimeDays / 365.25;

  // For inward transfer: departure burn lowers perihelion to Earth's orbit
  const [dv1, dv2] = hohmannTransferDv(MU.SUN, r2, r1);
  // dv1 is at inner orbit (Earth), dv2 is at outer orbit (Uranus)
  // For Uranus departure: we need the burn at the outer orbit

  return {
    departureDv: dv2,
    arrivalDv: dv1,
    totalDv: dv1 + dv2,
    transferTimeSec,
    transferTimeDays,
    transferTimeYears,
    semiMajorAxisKm: aTransfer,
  };
}

// ─── Transfer 2: Uranus Departure from Titania ───

/**
 * Analyze departure from Titania orbit to escape Uranus.
 * Ship is damaged: thrust limited to 65% (6.3 MN).
 */
export function uranusDeparture() {
  const vEscUranus = escapeVelocity(MU.URANUS, TITANIA_ORBIT_RADIUS);
  const vCircTitania = circularVelocity(MU.URANUS, TITANIA_ORBIT_RADIUS);

  // ΔV to escape from Titania orbit
  const dvEscapeFromTitania = vEscUranus - vCircTitania;

  // Uranus heliocentric orbital velocity
  const uranusOrbitalV = circularVelocity(MU.SUN, ORBIT_RADIUS.URANUS);

  // Acceleration at damaged thrust
  const accelAtFullMass = KESTREL.damagedThrustN / KESTREL.massKg;

  return {
    vEscUranusKms: vEscUranus,
    vCircTitaniaKms: vCircTitania,
    dvEscapeFromTitaniaKms: dvEscapeFromTitania,
    uranusOrbitalVKms: uranusOrbitalV,
    accelAtFullMassMs2: accelAtFullMass,
    accelAtFullMassG: accelAtFullMass / 9.80665,
  };
}

// ─── Transfer 3: Brachistochrone Uranus→Earth ───

/**
 * Uranus→Earth distance scenarios.
 */
export const UE_DISTANCE_SCENARIOS = {
  /** Near opposition: Uranus radius - Earth radius */
  closest: ORBIT_RADIUS.URANUS - ORBIT_RADIUS.EARTH,
  /** Quadrature: sqrt(r_U² + r_E²) */
  mid: Math.sqrt(ORBIT_RADIUS.URANUS ** 2 + ORBIT_RADIUS.EARTH ** 2),
  /** Near conjunction: Uranus radius + Earth radius */
  farthest: ORBIT_RADIUS.URANUS + ORBIT_RADIUS.EARTH,
} as const;

/**
 * Brachistochrone transfer analysis for Uranus→Earth.
 * Compute required time and ΔV for each distance scenario at 65% thrust.
 */
export function brachistochroneAnalysis() {
  const thrust = KESTREL.damagedThrustN;

  return Object.entries(UE_DISTANCE_SCENARIOS).map(([name, distKm]) => {
    const distM = distKm * 1000;

    // At 48,000t with 6.3 MN:
    const accelMs2 = thrust / KESTREL.massKg;
    // Brachistochrone time: t = sqrt(4d/a)
    const timeSec = Math.sqrt((4 * distM) / accelMs2);
    const dvKms = brachistochroneDeltaV(distKm, timeSec);
    const accelKms2 = brachistochroneAccel(distKm, timeSec);

    return {
      scenario: name,
      distanceKm: distKm,
      distanceAU: distanceInAU(distKm),
      accelMs2,
      accelG: accelMs2 / 9.80665,
      deltaVKms: dvKms,
      timeSec,
      timeHours: timeSec / 3600,
      timeDays: timeSec / 86400,
    };
  });
}

/**
 * Brachistochrone at feasible mass (boundary analysis).
 * What mass makes the Uranus→Earth trip feasible within reasonable timeframes?
 */
export function massFeasibilityAnalysis(distanceKm: number, thrustN: number = KESTREL.damagedThrustN) {
  // Target times to analyze
  const targetDays = [30, 60, 90, 180, 365];

  return targetDays.map(days => {
    const timeSec = days * 86400;
    const accelKms2 = brachistochroneAccel(distanceKm, timeSec);
    const accelMs2 = accelKms2 * 1000;
    const maxMassKg = thrustN / accelMs2;
    const dvKms = brachistochroneDeltaV(distanceKm, timeSec);

    return {
      targetDays: days,
      timeSec,
      accelMs2,
      accelG: accelMs2 / 9.80665,
      maxMassKg,
      maxMassT: maxMassKg / 1000,
      deltaVKms: dvKms,
    };
  });
}

// ─── Transfer 4: Plasmoid Encounter Analysis ───

/**
 * Analyze the plasmoid encounter in Uranus magnetosphere.
 * Real science: Uranus's magnetic axis is tilted ~59.7° from its rotation axis
 * (Voyager 2 data). This creates unpredictable magnetosphere dynamics.
 */
export function plasmoidAnalysis() {
  const shieldLifeSec = EP04_PARAMS.shieldLifeSec;
  const transitSec = EP04_PARAMS.plasmoidTransitSec;
  const marginSec = shieldLifeSec - transitSec;

  // Radiation exposure during transit
  const peakRadMsvMin = EP04_PARAMS.peakRadiationCSvMin * 10; // cSv → mSv
  const worstCaseExposureMSv = peakRadMsvMin * (transitSec / 60);

  // Actual Uranus magnetic tilt (Voyager 2): 59.7°
  const realTiltDeg = 59.7;
  const statedTiltDeg = EP04_PARAMS.magneticAxisTiltDeg;

  return {
    shieldLifeSec,
    shieldLifeMin: shieldLifeSec / 60,
    transitSec,
    transitMin: transitSec / 60,
    marginSec,
    marginMin: marginSec / 60,
    marginFraction: marginSec / shieldLifeSec,
    peakRadiationMsvMin: peakRadMsvMin,
    worstCaseExposureMSv,
    totalExposureMSv: EP04_PARAMS.totalExposureMSv,
    cumulativeEnRouteMSv: EP04_PARAMS.cumulativeExposureMSv,
    statedMagneticTiltDeg: statedTiltDeg,
    realMagneticTiltDeg: realTiltDeg,
    tiltAccuracyPercent: (1 - Math.abs(statedTiltDeg - realTiltDeg) / realTiltDeg) * 100,
  };
}

// ─── Transfer 5: Earth Fleet Intercept Analysis ───

/**
 * Analyze the approaching Earth fleet from Saturn orbit direction.
 * 5+ ships, 33 hours out.
 */
export function fleetInterceptAnalysis() {
  const fleetETASec = EP04_PARAMS.fleetETASec;

  // If fleet departs from Saturn orbit, distance to Uranus:
  const saturnUranusDistClosest = ORBIT_RADIUS.URANUS - ORBIT_RADIUS.SATURN;
  const saturnUranusDistFarthest = ORBIT_RADIUS.URANUS + ORBIT_RADIUS.SATURN;

  // Average speed needed to cover closest distance in 33h
  // (fleet must have been en route longer — 33h is remaining time)
  // If fleet uses Hohmann from Saturn to Uranus, transfer time ~27 years
  // So they must use high-thrust approach
  const avgSpeedClosestKms = saturnUranusDistClosest / fleetETASec;
  const avgSpeedFarthestKms = saturnUranusDistFarthest / fleetETASec;

  // These are not necessarily their total trip time — 33h is remaining distance
  // At various remaining distances, compute average velocity
  const remainingDistScenarios = [
    { label: "100 million km", distKm: 100_000_000 },
    { label: "500 million km", distKm: 500_000_000 },
    { label: "Saturn-Uranus closest", distKm: saturnUranusDistClosest },
  ];

  const scenarios = remainingDistScenarios.map(s => ({
    ...s,
    avgSpeedKms: s.distKm / fleetETASec,
    avgSpeedCFraction: (s.distKm / fleetETASec) / 299_792.458,
  }));

  // Time pressure for Kestrel: must depart Titania before fleet arrives
  // If 9h42m to arrive + repair/refuel time + departure, is 33h enough?
  const arrivalTimeSec = EP04_PARAMS.titaniaRemainingTimeSec;
  const availableTimeSec = fleetETASec - arrivalTimeSec;

  return {
    fleetETASec,
    fleetETAHours: fleetETASec / 3600,
    fleetShipCount: EP04_PARAMS.fleetShipCount,
    arrivalTimeSec,
    arrivalTimeHours: arrivalTimeSec / 3600,
    availableTimeSec,
    availableTimeHours: availableTimeSec / 3600,
    scenarios,
  };
}

// ─── Damage Assessment ───

/**
 * Compile ship damage state for analysis context.
 */
export function damageAssessment() {
  return {
    thrustFraction: EP04_PARAMS.thrustFraction,
    effectiveThrustN: KESTREL.damagedThrustN,
    effectiveThrustMN: KESTREL.damagedThrustN / 1e6,
    normalThrustMN: KESTREL.thrustN / 1e6,
    availableBurns: EP04_PARAMS.availableBurns,
    thermalMargin: EP04_PARAMS.thermalMarginFraction,
    coolingPressure1MPa: EP04_PARAMS.coolingPressure1MPa,
    coolingPressure2MPa: EP04_PARAMS.coolingPressure2MPa,
    totalExposureMSv: EP04_PARAMS.totalExposureMSv,
    shieldStatus: "coil system 2 only",
  };
}

// ─── Transfer 4b: Plasmoid Momentum Perturbation ───

/** Proton mass (kg) for hydrogen plasma density */
const PROTON_MASS_KG = 1.672_621_924e-27;

/** Permeability of free space (H/m) */
const MU_0 = 1.256_637_062e-6;

/**
 * Plasmoid perturbation scenario parameters.
 * Based on DiBraccio & Gershman (2019) Voyager 2 observations.
 */
export const PLASMOID_SCENARIOS = {
  /** Typical magnetotail conditions: B ~2 nT, n ~0.05 cm⁻³, v ~150 km/s */
  nominal: { label: "nominal", bTesla: 2.0e-9, nPerCm3: 0.05, vKmS: 150 },
  /** Compressed plasmoid: B ~15 nT, n ~0.5 cm⁻³, v ~250 km/s */
  enhanced: { label: "enhanced", bTesla: 15.0e-9, nPerCm3: 0.5, vKmS: 250 },
  /** Reconnection-driven fast plasmoid: B ~50 nT, n ~5 cm⁻³, v ~500 km/s */
  extreme: { label: "extreme", bTesla: 50.0e-9, nPerCm3: 5.0, vKmS: 500 },
} as const;

/** Kestrel effective cross-section for plasmoid interaction (m²).
 *  Magnetic shield standoff radius ~50 m → π × 50² ≈ 7854 m² */
const SHIELD_CROSS_SECTION_M2 = Math.PI * 50 * 50;

export interface PlasmoidPerturbationResult {
  label: string;
  magneticPressurePa: number;
  ramPressurePa: number;
  totalPressurePa: number;
  forceN: number;
  impulseNs: number;
  velocityPerturbationMs: number;
  missDistanceKm: number;
  correctionDvMs: number;
  /** Ratio of correction ΔV to typical orbital velocity (~5 km/s) */
  correctionToOrbitalRatio: number;
}

/**
 * Compute plasmoid momentum perturbation for a given scenario.
 *
 * Key physics:
 * - Magnetic pressure: B²/(2μ₀)
 * - Ram pressure: 0.5 × ρ × v²
 * - Force = (P_mag + P_ram) × cross-section
 * - Impulse = Force × transit time
 * - ΔV = Impulse / ship mass
 */
export function plasmoidPerturbation(
  bTesla: number,
  nPerCm3: number,
  vKmS: number,
  transitS: number = EP04_PARAMS.plasmoidTransitSec,
  shipMassKg: number = KESTREL.massKg,
  remainingTravelS: number = EP04_PARAMS.titaniaRemainingTimeSec,
): Omit<PlasmoidPerturbationResult, 'label'> {
  const nPerM3 = nPerCm3 * 1e6;
  const vMs = vKmS * 1000;
  const rhoKgM3 = nPerM3 * PROTON_MASS_KG;

  const pMag = bTesla * bTesla / (2 * MU_0);
  const pRam = 0.5 * rhoKgM3 * vMs * vMs;
  const pTotal = pMag + pRam;

  const force = pTotal * SHIELD_CROSS_SECTION_M2;
  const impulse = force * transitS;
  const dv = impulse / shipMassKg;

  const missKm = (dv * remainingTravelS) / 1000;
  const correctionDv = dv;
  const orbitalVMs = 5000;

  return {
    magneticPressurePa: pMag,
    ramPressurePa: pRam,
    totalPressurePa: pTotal,
    forceN: force,
    impulseNs: impulse,
    velocityPerturbationMs: dv,
    missDistanceKm: missKm,
    correctionDvMs: correctionDv,
    correctionToOrbitalRatio: correctionDv / orbitalVMs,
  };
}

/**
 * Full plasmoid perturbation analysis across all scenarios.
 *
 * Key finding: Momentum perturbation is negligible for a 48,000 t ship.
 * Radiation (480 mSv) is biologically dangerous, but mechanical trajectory
 * deflection requires effectively zero course-correction ΔV.
 */
export function plasmoidPerturbationAnalysis(): PlasmoidPerturbationResult[] {
  return Object.values(PLASMOID_SCENARIOS).map(scenario => ({
    label: scenario.label,
    ...plasmoidPerturbation(scenario.bTesla, scenario.nPerCm3, scenario.vKmS),
  }));
}

// ─── Full Analysis ───

/**
 * Full Episode 4 analysis combining all transfers.
 */
export function analyzeEpisode4() {
  const hohmann = hohmannBaseline();
  const departure = uranusDeparture();
  const brach = brachistochroneAnalysis();
  const massFeasibility = massFeasibilityAnalysis(UE_DISTANCE_SCENARIOS.closest);
  const plasmoid = plasmoidAnalysis();
  const plasmoidMomentum = plasmoidPerturbationAnalysis();
  const fleet = fleetInterceptAnalysis();
  const damage = damageAssessment();

  return {
    hohmann,
    uranusDeparture: departure,
    brachistochrone: brach,
    massFeasibility,
    plasmoid,
    plasmoidMomentum,
    fleetIntercept: fleet,
    damageAssessment: damage,
  };
}
