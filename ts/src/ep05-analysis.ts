/**
 * Episode 5 Analysis: Uranus→Earth — Series Finale "SOLAR LINE"
 *
 * SOLAR LINE Part5 END depicts Kestrel's journey from Titania (Uranus)
 * to Earth — completing the "new Solar Line" route established in ep04.
 *
 * NOTE: This is a PRELIMINARY analysis. Episode 5 subtitle data is not yet
 * available (video uploaded 2026-02-24 to Niconico only). Dialogue-dependent
 * parameters are marked with [PENDING]. Analysis will be updated when VTT
 * subtitles become available.
 *
 * Key constraints from ep04 (carried forward):
 * - Ship severely damaged: 65% thrust (6.37 MN), 78% thermal margin
 * - Engine nozzle coil degraded: 3-4 burns remaining
 * - Radiation exposure: 480 mSv cumulative (near ICRP emergency limit)
 * - Shield: coil system 2 only
 * - Destination: Earth — "new Solar Line"
 *
 * This episode likely covers:
 * - Mid-course corrections during the Uranus→Earth brachistochrone
 * - Earth approach and capture
 * - Resolution of the Kestrel's journey
 *
 * Source: sm45987761 (Niconico)
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
  visViva,
  MU,
  ORBIT_RADIUS,
  EARTH_RADIUS,
  MOON_ORBIT_RADIUS,
  LEO_ALTITUDE,
  TITANIA_ORBIT_RADIUS,
} from "./orbital.ts";

/** 1 AU in km */
const AU_KM = 149_597_870.7;

/** Ship parameters — same Kestrel, still damaged from ep04 */
export const KESTREL = {
  /** Maximum mass at standard load (kg) — worldbuilding doc */
  massKg: 48_000_000,
  /** Normal thrust (N) — worldbuilding doc */
  thrustN: 9_800_000,
  /** Peak thrust (N) — emergency "full burn" — worldbuilding doc */
  peakThrustN: 10_700_000,
  /** Damaged thrust at 65% output (N) — ep04 dialogue ~17:29 */
  damagedThrustN: 6_370_000,
} as const;

/**
 * Episode 5 parameters.
 * [PENDING] markers indicate values that need subtitle confirmation.
 * Values without [PENDING] are carried from ep04 or derived from physics.
 */
export const EP05_PARAMS = {
  /** Thrust fraction — carried from ep04 [PENDING: may change in ep05] */
  thrustFraction: 0.65,
  /** Available burns from ep04 — 3-4 remaining minus departure burn */
  remainingBurnsAfterDeparture: { min: 2, max: 3 },
  /** Thermal margin — carried from ep04 [PENDING] */
  thermalMarginFraction: 0.78,
  /** Cumulative radiation (mSv) — from ep04 [PENDING: may increase] */
  cumulativeRadiationMSv: 480,
  /** ICRP emergency exposure limit (mSv) */
  icrpEmergencyLimitMSv: 500,
  /** NASA career exposure limit (mSv) */
  nasaCareerLimitMSv: 600,
} as const;

export function distanceInAU(km: number): number {
  return km / AU_KM;
}

// ─── Transfer 1: Hohmann Baseline Uranus→Earth (reference from ep04) ───

/**
 * Classical minimum-energy Hohmann transfer from Uranus to Earth.
 * Same as ep04 computation — repeated here for ep05 report self-containment.
 */
export function hohmannBaseline() {
  const r1 = ORBIT_RADIUS.EARTH;
  const r2 = ORBIT_RADIUS.URANUS;
  const aTransfer = (r1 + r2) / 2;
  const transferTimeSec = orbitalPeriod(MU.SUN, aTransfer) / 2;
  const transferTimeDays = transferTimeSec / 86400;
  const transferTimeYears = transferTimeDays / 365.25;

  const [dvInner, dvOuter] = hohmannTransferDv(MU.SUN, r1, r2);

  return {
    departureDvKms: dvOuter,
    arrivalDvKms: dvInner,
    totalDvKms: dvInner + dvOuter,
    transferTimeSec,
    transferTimeDays,
    transferTimeYears,
    semiMajorAxisKm: aTransfer,
    semiMajorAxisAU: distanceInAU(aTransfer),
  };
}

// ─── Transfer 2: Brachistochrone Transfer Scenarios ───

/** Distance scenarios for Uranus→Earth */
export const UE_DISTANCE_SCENARIOS = {
  closest: ORBIT_RADIUS.URANUS - ORBIT_RADIUS.EARTH,
  mid: Math.sqrt(ORBIT_RADIUS.URANUS ** 2 + ORBIT_RADIUS.EARTH ** 2),
  farthest: ORBIT_RADIUS.URANUS + ORBIT_RADIUS.EARTH,
} as const;

/**
 * Brachistochrone transfer for multiple mass scenarios.
 * This is the key analysis: what mass makes the trip feasible?
 */
export function brachistochroneByMass() {
  const thrust = KESTREL.damagedThrustN;
  const distKm = UE_DISTANCE_SCENARIOS.closest;
  const distM = distKm * 1000;

  const massScenarios = [
    { label: "300t（ep01境界値相当）", massKg: 300_000 },
    { label: "500t（ep03境界値相当）", massKg: 500_000 },
    { label: "1,000t", massKg: 1_000_000 },
    { label: "3,929t（ep04 30日境界）", massKg: 3_929_000 },
    { label: "48,000t（公称質量）", massKg: 48_000_000 },
  ];

  return massScenarios.map(s => {
    const accelMs2 = thrust / s.massKg;
    const timeSec = Math.sqrt((4 * distM) / accelMs2);
    const dvKms = brachistochroneDeltaV(distKm, timeSec);
    const peakVelocityKms = dvKms / 2;

    return {
      ...s,
      distanceKm: distKm,
      distanceAU: distanceInAU(distKm),
      accelMs2,
      accelG: accelMs2 / 9.80665,
      deltaVKms: dvKms,
      peakVelocityKms,
      peakVelocityCFraction: peakVelocityKms / 299_792.458,
      timeSec,
      timeHours: timeSec / 3600,
      timeDays: timeSec / 86400,
    };
  });
}

// ─── Transfer 3: Earth Approach Velocity ───

/**
 * Compute Earth approach velocity (v_infinity) for different transfer profiles.
 * After a brachistochrone deceleration, the ship should ideally arrive with
 * near-zero v_inf. But with limited burns, the approach may be faster.
 */
export function earthApproachAnalysis() {
  const vEscEarthAtSOI = escapeVelocity(MU.EARTH, 924_000);
  const vCircEarth = circularVelocity(MU.SUN, ORBIT_RADIUS.EARTH);
  const vEscSunAtEarth = escapeVelocity(MU.SUN, ORBIT_RADIUS.EARTH);

  // Hohmann arrival velocity at Earth's orbit (from Uranus)
  const r1 = ORBIT_RADIUS.EARTH;
  const r2 = ORBIT_RADIUS.URANUS;
  const aTransfer = (r1 + r2) / 2;
  const vArrivalHohmann = visViva(MU.SUN, r1, aTransfer);
  const vInfHohmann = Math.abs(vArrivalHohmann - vCircEarth);

  // Earth capture: from v_inf, what ΔV is needed for orbit insertion?
  const rLEO = EARTH_RADIUS + LEO_ALTITUDE;
  const rMoonOrbit = MOON_ORBIT_RADIUS;

  // For Hohmann arrival v_inf:
  const vHypLEOHohmann = Math.sqrt(vInfHohmann ** 2 + 2 * MU.EARTH / rLEO);
  const vCircLEO = circularVelocity(MU.EARTH, rLEO);
  const dvCaptureLEOHohmann = vHypLEOHohmann - vCircLEO;

  // For capture at Moon orbit distance:
  const vHypMoonOrbitHohmann = Math.sqrt(vInfHohmann ** 2 + 2 * MU.EARTH / rMoonOrbit);
  const vCircMoonOrbit = circularVelocity(MU.EARTH, rMoonOrbit);
  const dvCaptureMoonOrbitHohmann = vHypMoonOrbitHohmann - vCircMoonOrbit;

  return {
    vCircEarthKms: vCircEarth,
    vEscSunAtEarthKms: vEscSunAtEarth,
    vEscEarthAtSOIKms: vEscEarthAtSOI,
    hohmannArrival: {
      vArrivalKms: vArrivalHohmann,
      vInfKms: vInfHohmann,
      dvCaptureLEOKms: dvCaptureLEOHohmann,
      dvCaptureMoonOrbitKms: dvCaptureMoonOrbitHohmann,
    },
    brachistochroneArrival: {
      note: "Ideal brachistochrone arrives with v_inf ≈ 0 (deceleration phase cancels approach velocity). Capture ΔV is minimal.",
      dvCaptureLEOKms: circularVelocity(MU.EARTH, rLEO),
      dvCaptureMoonOrbitKms: circularVelocity(MU.EARTH, rMoonOrbit),
    },
    earthSOIRadiusKm: 924_000,
    leoAltitudeKm: LEO_ALTITUDE,
    leoRadiusKm: rLEO,
    moonOrbitRadiusKm: rMoonOrbit,
  };
}

// ─── Transfer 4: Burn Budget Analysis ───

/**
 * Analyze remaining burn budget for the entire Uranus→Earth journey.
 * ep04 stated 3-4 burns remaining. Departure uses 1. Remaining: 2-3.
 *
 * Burns needed for Uranus→Earth:
 * 1. Uranus departure (escape from Titania orbit) — DONE in ep04
 * 2. Brachistochrone midpoint flip (turnaround)
 * 3. Earth approach deceleration
 * 4. (Optional) Course correction / Earth capture
 */
export function burnBudgetAnalysis() {
  const totalBurns = EP05_PARAMS.remainingBurnsAfterDeparture;
  const thrustN = KESTREL.damagedThrustN;
  const thermalMargin = EP05_PARAMS.thermalMarginFraction;

  // For brachistochrone: need at least 2 burns (accel + decel)
  // For Earth capture: need 1 more burn
  const minBurnsForBrachistochrone = 2;
  const minBurnsForCapture = 1;
  const totalMinBurns = minBurnsForBrachistochrone + minBurnsForCapture;

  // Can we afford all burns?
  const canCompleteBrachistochrone = totalBurns.min >= minBurnsForBrachistochrone;
  const canCompleteCapture = totalBurns.max >= totalMinBurns;
  const hasCorrectionMargin = totalBurns.max > totalMinBurns;

  // Thermal considerations: each burn reduces thermal margin further
  // At 78% margin and 65% thrust, engine stress per burn is significant
  const estimatedThermalLossPerBurn = 0.05; // rough estimate
  const thermalAfterAllBurns = thermalMargin - estimatedThermalLossPerBurn * totalMinBurns;

  return {
    burnsAvailable: totalBurns,
    brachistochrone: {
      burnsNeeded: minBurnsForBrachistochrone,
      feasible: canCompleteBrachistochrone,
    },
    earthCapture: {
      burnsNeeded: minBurnsForCapture,
      feasible: canCompleteCapture,
    },
    totalMinBurnsNeeded: totalMinBurns,
    hasCorrectionMargin,
    thermalAnalysis: {
      initialMargin: thermalMargin,
      estimatedLossPerBurn: estimatedThermalLossPerBurn,
      estimatedFinalMargin: thermalAfterAllBurns,
      thermalRisk: thermalAfterAllBurns < 0.5 ? "high" : thermalAfterAllBurns < 0.7 ? "moderate" : "low",
    },
    radiationBudget: {
      currentMSv: EP05_PARAMS.cumulativeRadiationMSv,
      icrpLimitMSv: EP05_PARAMS.icrpEmergencyLimitMSv,
      nasaLimitMSv: EP05_PARAMS.nasaCareerLimitMSv,
      remainingToICRPMSv: EP05_PARAMS.icrpEmergencyLimitMSv - EP05_PARAMS.cumulativeRadiationMSv,
      remainingToNASAMSv: EP05_PARAMS.nasaCareerLimitMSv - EP05_PARAMS.cumulativeRadiationMSv,
    },
  };
}

// ─── Transfer 5: Complete Route Summary ───

/**
 * Summarize the full Solar Line route across all 5 episodes.
 */
export function fullRouteSummary() {
  // Total heliocentric distance traveled (approximate)
  const legs = [
    { ep: 1, from: "火星", to: "ガニメデ", distAU: distanceInAU(ORBIT_RADIUS.JUPITER - ORBIT_RADIUS.MARS), method: "brachistochrone" },
    { ep: 2, from: "木星圏", to: "エンケラドス", distAU: distanceInAU(ORBIT_RADIUS.SATURN - ORBIT_RADIUS.JUPITER), method: "ballistic" },
    { ep: 3, from: "エンケラドス", to: "タイタニア", distAU: distanceInAU(ORBIT_RADIUS.URANUS - ORBIT_RADIUS.SATURN), method: "brachistochrone" },
    { ep: "4-5", from: "タイタニア", to: "地球", distAU: distanceInAU(ORBIT_RADIUS.URANUS - ORBIT_RADIUS.EARTH), method: "brachistochrone" },
  ];

  const totalDistAU = legs.reduce((sum, l) => sum + l.distAU, 0);

  // Furthest point from Sun: Uranus orbit
  const furthestAU = distanceInAU(ORBIT_RADIUS.URANUS);

  return {
    legs,
    totalDistAU,
    furthestPointAU: furthestAU,
    routeDescription: "火星 → ガニメデ → 木星脱出 → エンケラドス → タイタニア → 地球",
    isRoundTrip: false,
    startBody: "火星",
    endBody: "地球",
  };
}

// ─── Earth Capture Scenarios ───

/**
 * Detailed Earth capture analysis with multiple approach strategies.
 */
export function earthCaptureScenarios() {
  const rLEO = EARTH_RADIUS + LEO_ALTITUDE;
  const rGEO = EARTH_RADIUS + 35_786; // GEO altitude
  const rMoon = MOON_ORBIT_RADIUS;

  // For brachistochrone arrival (v_inf ≈ 0), capture is straightforward
  const scenarios = [
    {
      label: "LEO直接投入（高度400km）",
      targetRadiusKm: rLEO,
      vCircKms: circularVelocity(MU.EARTH, rLEO),
      note: "最も効率的だが精密な減速が必要",
    },
    {
      label: "GEO投入（高度35,786km）",
      targetRadiusKm: rGEO,
      vCircKms: circularVelocity(MU.EARTH, rGEO),
      note: "静止軌道 — 減速要件が低い",
    },
    {
      label: "月軌道捕捉（384,400km）",
      targetRadiusKm: rMoon,
      vCircKms: circularVelocity(MU.EARTH, rMoon),
      note: "最も低いΔV — 月のアシストも可能",
    },
  ];

  // v_inf scenarios: what if brachistochrone deceleration is incomplete?
  const vInfScenarios = [0, 1, 3, 5, 10]; // km/s
  const captureTable = vInfScenarios.map(vInf => {
    const captures = scenarios.map(s => {
      const vHyp = Math.sqrt(vInf ** 2 + 2 * MU.EARTH / s.targetRadiusKm);
      const dvCapture = vHyp - s.vCircKms;
      return {
        target: s.label,
        dvCaptureKms: dvCapture,
      };
    });
    return { vInfKms: vInf, captures };
  });

  return {
    scenarios,
    captureTable,
    earthEscapeVelocityAtLEOKms: escapeVelocity(MU.EARTH, rLEO),
    earthEscapeVelocityAtMoonOrbitKms: escapeVelocity(MU.EARTH, rMoon),
  };
}

// ─── Full Analysis ───

/**
 * Full Episode 5 analysis combining all transfers.
 */
export function analyzeEpisode5() {
  const hohmann = hohmannBaseline();
  const brachByMass = brachistochroneByMass();
  const approach = earthApproachAnalysis();
  const burnBudget = burnBudgetAnalysis();
  const route = fullRouteSummary();
  const capture = earthCaptureScenarios();

  return {
    hohmann,
    brachistochroneByMass: brachByMass,
    earthApproach: approach,
    burnBudget,
    fullRoute: route,
    earthCapture: capture,
    preliminary: true,
  };
}
