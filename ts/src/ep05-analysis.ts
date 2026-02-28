/**
 * Episode 5 Analysis: Uranus→Earth — Series Finale "SOLAR LINE"
 *
 * SOLAR LINE Part5 END depicts Kestrel's journey from Titania (Uranus)
 * to Earth — completing the "new Solar Line" route established in ep04.
 *
 * Key constraints from ep04 (carried forward):
 * - Ship severely damaged: 65% thrust (6.37 MN), 78% thermal margin
 * - Engine nozzle coil degraded: remaining lifetime 55h38m (塑性変形/creep)
 * - Radiation exposure: 480 mSv cumulative (near ICRP emergency limit)
 * - Shield: coil system 2 only
 * - Destination: Earth LEO 400km — "new Solar Line"
 *
 * EP05 confirmed route (4 burns):
 * 1. Uranus escape + cruise acceleration → 1500 km/s
 * 2. Jupiter powered flyby (Oberth effect ~3%)
 * 3. Mars deceleration
 * 4. Earth LEO insertion → nozzle destroyed on completion
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
  JUPITER_RADIUS,
} from "./orbital.ts";
import { KESTREL, AU_KM } from "./kestrel.ts";
export { KESTREL };

/**
 * Episode 5 parameters.
 * Confirmed from ep05 dialogue (Whisper STT + attribution).
 */
export const EP05_PARAMS = {
  /** Thrust fraction — 65% from ep04 damage, unchanged in ep05 */
  thrustFraction: 0.65,
  /** Actual burn count in ep05: 4 (Uranus escape, Jupiter flyby, Mars decel, Earth insertion) */
  actualBurnCount: 4,
  /** Available burns from ep04 — 3-4 remaining minus departure burn */
  remainingBurnsAfterDeparture: { min: 2, max: 3 },
  /** Thermal margin — carried from ep04 */
  thermalMarginFraction: 0.78,
  /** Cumulative radiation (mSv) — from ep04 */
  cumulativeRadiationMSv: 480,
  /** ICRP emergency exposure limit (mSv) */
  icrpEmergencyLimitMSv: 500,
  /** NASA career exposure limit (mSv) */
  nasaCareerLimitMSv: 600,
  /** Nozzle remaining lifetime (seconds) — ep05 12:56 ケイ: 55h38m */
  nozzleLifetimeSec: 55 * 3600 + 38 * 60,
  /** Required burn time for Earth orbit insertion (seconds) — ep05 12:56 ケイ: 55h12m */
  requiredBurnTimeSec: 55 * 3600 + 12 * 60,
  /** Cruise velocity (km/s) — ep05 03:22 ケイ */
  cruiseVelocityKms: 1500,
  /** Final velocity (km/s) — ep05 11:58 ケイ */
  finalVelocityKms: 2100,
  /** Total estimated transit time (hours) — ep05 02:36 ケイ */
  transitTimeHours: 507,
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

// ─── Nozzle Lifespan Analysis ───

/**
 * Analyze the critical nozzle lifespan constraint — the dramatic climax of EP05.
 *
 * The magnetic nozzle is undergoing 塑性変形 (plastic/creep deformation) and has a finite
 * remaining lifetime. The margin between available lifetime and required burn time
 * is the tightest constraint in the entire series.
 *
 * Source: ep05 12:56 — ケイ: "ノズル寿命は残り55時間38分。対して地球軌道投入までに
 * 必要な燃焼時間は55時間12分。マージンは26分しかありません"
 */
export function nozzleLifespanAnalysis() {
  const lifetimeSec = EP05_PARAMS.nozzleLifetimeSec;
  const requiredSec = EP05_PARAMS.requiredBurnTimeSec;
  const marginSec = lifetimeSec - requiredSec;
  const marginMinutes = marginSec / 60;
  const marginFraction = marginSec / lifetimeSec;

  // Cross-check: does the stated margin match?
  // ケイ says "マージンは26分" — let's verify
  const statedMarginMinutes = 26;
  const computedMarginMinutes = marginMinutes;
  const marginConsistency = Math.abs(computedMarginMinutes - statedMarginMinutes) < 1;

  // Sensitivity: how much burn time variation can we tolerate?
  const sensitivityScenarios = [
    { label: "計画通り (55h12m)", burnTimeSec: requiredSec, marginSec: lifetimeSec - requiredSec },
    { label: "5%増加 (57h58m)", burnTimeSec: requiredSec * 1.05, marginSec: lifetimeSec - requiredSec * 1.05 },
    { label: "3%増加 (56h51m)", burnTimeSec: requiredSec * 1.03, marginSec: lifetimeSec - requiredSec * 1.03 },
    { label: "1%増加 (55h45m)", burnTimeSec: requiredSec * 1.01, marginSec: lifetimeSec - requiredSec * 1.01 },
    { label: "5%減少 (52h24m)", burnTimeSec: requiredSec * 0.95, marginSec: lifetimeSec - requiredSec * 0.95 },
  ];

  // Series margin comparison
  const seriesMargins = [
    { episode: 2, constraint: "太陽脱出速度", margin: 0.53, unit: "km/s", note: "v_helio 18.99 vs v_esc 18.46" },
    { episode: 3, constraint: "航法精度", margin: 1.23, unit: "°", note: "0.2%以内のコース維持が必要" },
    { episode: 4, constraint: "シールドマージン", margin: 43, unit: "%", note: "6分/14分" },
    { episode: 5, constraint: "ノズル寿命マージン", margin: marginFraction * 100, unit: "%", note: `${marginMinutes.toFixed(0)}分/${(lifetimeSec / 3600).toFixed(0)}h` },
  ];

  return {
    nozzleLifetimeSec: lifetimeSec,
    nozzleLifetimeHours: lifetimeSec / 3600,
    requiredBurnTimeSec: requiredSec,
    requiredBurnTimeHours: requiredSec / 3600,
    marginSec,
    marginMinutes: computedMarginMinutes,
    marginFraction,
    marginPercent: marginFraction * 100,
    statedMarginMinutes,
    marginConsistency,
    sensitivityScenarios,
    seriesMargins,
    nozzleDestroyed: true, // ep05 22:58: "磁気ノズルが消失しました"
  };
}

// ─── Oberth Effect Analysis ───

/**
 * Analyze the Oberth effect at Jupiter powered flyby.
 *
 * At 1500 km/s cruise velocity, Jupiter's gravity well is relatively shallow,
 * so the Oberth gain is modest. The show claims ~3% efficiency improvement.
 *
 * The Oberth effect works because burning at periapsis (deep in a gravity well)
 * where kinetic energy is highest produces a larger change in specific orbital
 * energy than the same burn in free space.
 *
 * v_periapsis = sqrt(v_inf² + 2μ/r_p)
 * After burn dv: v_inf_after = sqrt((v_peri + dv)² - 2μ/r_p)
 * Oberth gain = (v_inf_after - v_inf) - dv
 *
 * Source: ep05 03:22 — ケイ: "オーベルト効果によるエネルギー効率向上はおよそ3%程度"
 */
export function oberthEffectAnalysis() {
  const muJupiter = MU.JUPITER;
  const rJ = JUPITER_RADIUS; // 71,492 km
  const vInf = EP05_PARAMS.cruiseVelocityKms; // 1500 km/s

  // Compute Oberth efficiency for various periapsis distances and burn magnitudes
  const periapsisScenarios = [
    { label: "1 RJ (71,492 km)", rPeriKm: rJ },
    { label: "2 RJ (142,984 km)", rPeriKm: rJ * 2 },
    { label: "3 RJ (214,476 km)", rPeriKm: rJ * 3 },
    { label: "5 RJ (357,460 km)", rPeriKm: rJ * 5 },
    { label: "10 RJ (714,920 km)", rPeriKm: rJ * 10 },
  ];

  // Burn magnitudes to explore
  const burnScenarios = [10, 30, 50, 100, 200]; // km/s

  // Compute efficiency matrix
  const efficiencyMatrix = periapsisScenarios.map(peri => {
    const results = burnScenarios.map(burnDv => {
      const vPeri = Math.sqrt(vInf ** 2 + 2 * muJupiter / peri.rPeriKm);
      const vPeriAfter = vPeri + burnDv;
      const vInfAfterSq = vPeriAfter ** 2 - 2 * muJupiter / peri.rPeriKm;
      const vInfAfter = vInfAfterSq > 0 ? Math.sqrt(vInfAfterSq) : 0;
      const deltaVInf = vInfAfter - vInf;
      const efficiency = burnDv > 0 ? (deltaVInf / burnDv) - 1 : 0;
      const gainKms = deltaVInf - burnDv;

      return {
        burnDvKms: burnDv,
        vPeriKms: vPeri,
        vInfAfterKms: vInfAfter,
        deltaVInfKms: deltaVInf,
        gainKms,
        efficiencyPercent: efficiency * 100,
      };
    });
    return {
      ...peri,
      vEscAtPeri: escapeVelocity(muJupiter, peri.rPeriKm),
      results,
    };
  });

  // Why Oberth velocity gain is small at 1500 km/s:
  // Jupiter escape velocity at surface ≈ 59.5 km/s
  // At 1500 km/s, v_peri = sqrt(1500² + 59.5²) ≈ 1501.2 km/s
  // The gravity well contribution is <4% of v_peri → Oberth amplification ≪ 1%
  const vEscJupiterSurface = escapeVelocity(muJupiter, rJ);
  const gravityWellFraction = vEscJupiterSurface / vInf;

  // Best-case Oberth velocity efficiency (1 RJ, 200 km/s burn)
  const bestCaseVelocityEfficiency = efficiencyMatrix[0].results[efficiencyMatrix[0].results.length - 1].efficiencyPercent;

  // Energy-based interpretation: ΔE_kinetic ratio at periapsis vs free space
  // For a burn dv at velocity v: ΔE = m·v·dv + ½m·dv²
  // At periapsis vs free space: ratio = (v_peri + dv/2) / (v_inf + dv/2)
  // This is also small (~0.08%) because v_peri ≈ v_inf at these speeds
  const bestPeri = efficiencyMatrix[0]; // 1 RJ
  const bestBurn = bestPeri.results[2]; // 50 km/s burn
  const energyRatio = (bestBurn.vPeriKms + bestBurn.burnDvKms / 2) / (vInf + bestBurn.burnDvKms / 2);
  const energyEfficiencyPercent = (energyRatio - 1) * 100;

  // Interpretation of the 3% claim:
  // The classical Oberth velocity gain at 1500 km/s is ≪1%, and energy gain is similar.
  // ケイ's "エネルギー効率向上はおよそ3%程度" likely refers to one of:
  // 1. Fuel/propellant savings across the total mission budget (not per-burn efficiency)
  // 2. A composite effect including gravity assist + Oberth over the full flyby
  // 3. The burn occurring at a lower velocity phase (during deceleration into Jupiter's well)
  //
  // The key narrative point is that even a small gain matters when the nozzle margin is
  // only 26 minutes out of 55h38m (0.78%). A 3% propellant saving from the Jupiter flyby
  // burn would save ~99 minutes of burn time — significantly more than the margin.
  //
  // The show's claim is plausible as a narrative-level approximation,
  // though the strict Oberth velocity gain at 1500 km/s is much smaller.
  const nozzleMarginMinutes = 26;
  const requiredBurnMinutes = EP05_PARAMS.requiredBurnTimeSec / 60;
  const threePercentBurnSavingMinutes = requiredBurnMinutes * 0.03;
  const burnSavingExceedsMargin = threePercentBurnSavingMinutes > nozzleMarginMinutes;

  return {
    vInfKms: vInf,
    muJupiter,
    jupiterRadiusKm: rJ,
    vEscJupiterSurfaceKms: vEscJupiterSurface,
    gravityWellFraction,
    gravityWellPercent: gravityWellFraction * 100,
    efficiencyMatrix,
    bestCaseVelocityEfficiencyPercent: bestCaseVelocityEfficiency,
    energyEfficiencyPercent,
    claimedEfficiencyPercent: 3,
    threePercentBurnSavingMinutes,
    burnSavingExceedsMargin,
    // The strict Oberth velocity/energy gain is ≪3% at 1500 km/s.
    // But the 3% claim is narratively plausible as a mission-level approximation
    // (composite gravity assist + Oberth + flyby geometry optimization).
    interpretation: "mission-level-composite" as const,
  };
}

// ─── Navigation Accuracy Analysis ───

/**
 * Analyze the autonomous stellar navigation accuracy claim:
 * "自律航法のみで天王星から飛んできて20km" — ケイ (16:18)
 *
 * After traversing 18.2 AU (2,722,861,977 km) from Uranus to Earth using only
 * stellar observation (no ground station support), Kestrel achieved 20 km
 * positional accuracy. This analysis quantifies how extraordinary this is.
 *
 * Source: ep05 16:18 — ケイ: "自律航法のみで天王星から飛んできて20kmです。
 *         研究者が聞いたら泣くと思いますよ"
 */
export function navigationAccuracyAnalysis() {
  const distanceKm = UE_DISTANCE_SCENARIOS.closest; // 18.2 AU
  const positionErrorKm = 20;

  // Angular accuracy: atan(error / distance)
  const angularAccuracyRad = Math.atan(positionErrorKm / distanceKm);
  const angularAccuracyDeg = angularAccuracyRad * (180 / Math.PI);
  const angularAccuracyArcsec = angularAccuracyDeg * 3600;
  const angularAccuracyNrad = angularAccuracyRad * 1e9;

  // Relative precision
  const relativePrecision = positionErrorKm / distanceKm;

  // EP03 comparison: 1.23° navigation crisis
  const ep03AngleDeg = 1.23;
  const ep03AngleRad = ep03AngleDeg * (Math.PI / 180);
  const ep03ErrorKm = 14_360_000; // stated in EP03
  const ep05VsEp03AngleRatio = ep03AngleRad / angularAccuracyRad;

  // Real-world comparisons
  const comparisons = {
    newHorizonsPluto: {
      label: "New Horizons 冥王星フライバイ (2015, DSN支援)",
      distanceKm: 33 * AU_KM, // ~33 AU
      errorKm: 184,
      autonomous: false,
      angularAccuracyRad: Math.atan(184 / (33 * AU_KM)),
    },
    newHorizonsStellar: {
      label: "New Horizons 自律恒星航法テスト (2025)",
      distanceKm: 58 * AU_KM, // ~58 AU
      errorKm: 6_600_000,
      autonomous: true,
      angularAccuracyRad: Math.atan(6_600_000 / (58 * AU_KM)),
    },
    dsnDDOR: {
      label: "DSN DDOR角度精度",
      angularAccuracyNrad: 100, // ~100 nrad operational
    },
  };

  const vsNewHorizonsPluto = comparisons.newHorizonsPluto.errorKm / positionErrorKm;
  const vsNewHorizonsStellar = comparisons.newHorizonsStellar.errorKm / positionErrorKm;
  const vsDsnDDOR = comparisons.dsnDDOR.angularAccuracyNrad / angularAccuracyNrad;

  // Hubble angular resolution comparison (~0.05 arcsec)
  const hubbleArcsec = 0.05;
  const vsHubble = hubbleArcsec / angularAccuracyArcsec;

  // Human eye angular resolution (~60 arcsec)
  const humanEyeArcsec = 60;
  const vsHumanEye = humanEyeArcsec / angularAccuracyArcsec;

  return {
    distanceKm,
    distanceAU: distanceInAU(distanceKm),
    positionErrorKm,
    angularAccuracyRad,
    angularAccuracyDeg,
    angularAccuracyArcsec,
    angularAccuracyNrad,
    relativePrecision,
    ep03Comparison: {
      angleDeg: ep03AngleDeg,
      angleRad: ep03AngleRad,
      errorKm: ep03ErrorKm,
      ep05VsEp03Ratio: ep05VsEp03AngleRatio,
    },
    realWorldComparisons: comparisons,
    vsNewHorizonsPluto,
    vsNewHorizonsStellar,
    vsDsnDDOR,
    vsHubble,
    vsHumanEye,
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
  const nozzle = nozzleLifespanAnalysis();
  const oberth = oberthEffectAnalysis();
  const navAccuracy = navigationAccuracyAnalysis();

  return {
    hohmann,
    brachistochroneByMass: brachByMass,
    earthApproach: approach,
    burnBudget,
    fullRoute: route,
    earthCapture: capture,
    nozzleLifespan: nozzle,
    oberthEffect: oberth,
    navigationAccuracy: navAccuracy,
    preliminary: false,
  };
}
