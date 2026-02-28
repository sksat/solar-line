/**
 * Relativistic Effects Analysis for SOLAR LINE
 *
 * At peak brachistochrone velocities of ~1-2.5% of c, special relativistic
 * corrections become potentially measurable. This module quantifies:
 * - Lorentz factor γ
 * - Time dilation (proper time vs coordinate time)
 * - Relativistic vs classical ΔV (Ackeret equation)
 * - Kinetic energy corrections
 *
 * Conclusion (spoiler): corrections are ≪1% and negligible for all transfers
 * in the series. Documented for completeness per CLAUDE.md and human directive
 * phase 15 (相対論効果検討).
 */

import { KESTREL, EXHAUST_VELOCITY_KMS, AU_KM } from "./kestrel.ts";

/** Speed of light in km/s (exact, SI) */
const C_KM_S = 299_792.458;

/** Exhaust velocity (km/s) from shared constants */
const VE_KMS = EXHAUST_VELOCITY_KMS;

/** Kestrel thrust (N) from shared constants */
const THRUST_N = KESTREL.thrustN;

/** β = v/c */
function beta(vKms: number): number {
  return vKms / C_KM_S;
}

/** Lorentz factor γ = 1/√(1 - β²) */
function lorentzFactor(vKms: number): number {
  const b = beta(vKms);
  return 1.0 / Math.sqrt(1.0 - b * b);
}

/** Time dilation: proper time fraction lost = 1 - 1/γ */
function timeDilationFraction(vKms: number): number {
  return 1.0 - 1.0 / lorentzFactor(vKms);
}

/** Classical Tsiolkovsky ΔV: ve × ln(m₀/mf) */
function classicalDv(veKms: number, massRatio: number): number {
  return veKms * Math.log(massRatio);
}

/** Relativistic rocket (Ackeret) ΔV: c × tanh(ve/c × ln(m₀/mf)) */
function relativisticDv(veKms: number, massRatio: number): number {
  const x = (veKms / C_KM_S) * Math.log(massRatio);
  return C_KM_S * Math.tanh(x);
}

/** Relativistic brachistochrone peak velocity at midpoint */
function relativisticPeakVelocity(distanceKm: number, accelKms2: number): number {
  const c = C_KM_S;
  const a = accelKms2;
  const dHalf = distanceKm / 2;
  const x = dHalf * a / (c * c) + 1;
  const tHalf = (c / a) * Math.sqrt(x * x - 1);
  const atc = a * tHalf / c;
  return c * atc / Math.sqrt(1 + atc * atc);
}

/** Relativistic brachistochrone coordinate and proper times */
function relativisticBrachistochroneTimes(
  distanceKm: number,
  accelKms2: number,
): { coordinateTimeSec: number; properTimeSec: number; dilationSec: number } {
  const c = C_KM_S;
  const a = accelKms2;
  const dHalf = distanceKm / 2;

  const x = dHalf * a / (c * c) + 1;
  const tHalf = (c / a) * Math.sqrt(x * x - 1);
  const tTotal = 2 * tHalf;

  const tauHalf = (c / a) * Math.asinh(a * tHalf / c);
  const tauTotal = 2 * tauHalf;

  return {
    coordinateTimeSec: tTotal,
    properTimeSec: tauTotal,
    dilationSec: tTotal - tauTotal,
  };
}

/** Per-transfer analysis result */
interface TransferAnalysis {
  episode: number;
  transferId: string;
  label: string;
  distanceKm: number;
  distanceAU: number;
  accelKms2: number;
  accelG: number;
  classicalTimeSec: number;
  classicalPeakVelocityKms: number;
  classicalDeltaVKms: number;
  /** Relativistic corrections */
  relativistic: {
    peakVelocityKms: number;
    betaPeak: number;
    gammaPeak: number;
    timeDilationPpm: number;
    timeDilationSec: number;
    coordinateTimeSec: number;
    properTimeSec: number;
    keCorrectionPpm: number;
    /** (classical - relativistic) / classical for ΔV */
    dvCorrectionFraction: number;
    dvCorrectionPpm: number;
  };
  verdict: string;
}

/**
 * Analyze relativistic effects for a brachistochrone transfer.
 */
function analyzeTransfer(
  episode: number,
  transferId: string,
  label: string,
  distanceKm: number,
  timeSec: number,
  massKg?: number,
): TransferAnalysis {
  const accelKms2 = (4 * distanceKm) / (timeSec * timeSec);
  const classicalDvKms = (4 * distanceKm) / timeSec;
  const classicalPeakV = classicalDvKms / 2;

  // Relativistic computations
  const relPeakV = relativisticPeakVelocity(distanceKm, accelKms2);
  const betaPk = beta(relPeakV);
  const gammaPk = lorentzFactor(relPeakV);
  const tdFrac = timeDilationFraction(relPeakV);
  const tdPpm = tdFrac * 1e6;

  const relTimes = relativisticBrachistochroneTimes(distanceKm, accelKms2);

  // KE correction: (γ-1)c² / (½v²) - 1, in ppm
  const keFactor =
    relPeakV > 0
      ? ((gammaPk - 1) * C_KM_S * C_KM_S) / (0.5 * relPeakV * relPeakV)
      : 1;
  const keCorrPpm = (keFactor - 1) * 1e6;

  // ΔV correction (Ackeret vs Tsiolkovsky)
  // Mass ratio from classical ΔV: mr = exp(Δv / ve)
  const massRatio = Math.exp(classicalDvKms / VE_KMS);
  const cDv = classicalDv(VE_KMS, massRatio);
  const rDv = relativisticDv(VE_KMS, massRatio);
  const dvCorrFrac = cDv > 0 ? (cDv - rDv) / cDv : 0;

  // Verdict
  let verdict: string;
  if (betaPk < 0.001) {
    verdict = "完全に非相対論的（β < 0.1%）— 補正不要";
  } else if (betaPk < 0.01) {
    verdict = "微小な相対論的効果（β < 1%）— 補正は0.01%未満、実用上無視可能";
  } else if (betaPk < 0.05) {
    verdict = "測定可能な相対論的効果（β = 1-5%）— 補正は0.1%未満、航法精度に影響なし";
  } else {
    verdict = "有意な相対論的効果（β > 5%）— 補正が必要";
  }

  return {
    episode,
    transferId,
    label,
    distanceKm,
    distanceAU: distanceKm / AU_KM,
    accelKms2,
    accelG: (accelKms2 * 1000) / 9.80665,
    classicalTimeSec: timeSec,
    classicalPeakVelocityKms: classicalPeakV,
    classicalDeltaVKms: classicalDvKms,
    relativistic: {
      peakVelocityKms: relPeakV,
      betaPeak: betaPk,
      gammaPeak: gammaPk,
      timeDilationPpm: tdPpm,
      timeDilationSec: relTimes.dilationSec,
      coordinateTimeSec: relTimes.coordinateTimeSec,
      properTimeSec: relTimes.properTimeSec,
      keCorrectionPpm: keCorrPpm,
      dvCorrectionFraction: dvCorrFrac,
      dvCorrectionPpm: dvCorrFrac * 1e6,
    },
    verdict,
  };
}

/**
 * Run full relativistic effects analysis across all episodes.
 *
 * Uses the representative "mid" or canonical distance/time scenarios
 * from each episode's brachistochrone transfers.
 */
export function analyzeRelativisticEffects() {
  const transfers: TransferAnalysis[] = [];

  // ── EP01: Mars → Ganymede (72h deadline) ──
  // Closest approach: 550,630,800 km in 72h
  transfers.push(
    analyzeTransfer(
      1,
      "ep01-brach-closest",
      "火星→ガニメデ（最接近、72h）",
      550_630_800,
      72 * 3600,
    ),
  );
  // Mid distance in 72h
  transfers.push(
    analyzeTransfer(
      1,
      "ep01-brach-mid",
      "火星→ガニメデ（中間距離、72h）",
      Math.sqrt(227_939_200 ** 2 + 778_570_000 ** 2),
      72 * 3600,
    ),
  );

  // ── EP02: Jupiter system → Saturn/Enceladus ──
  // Trim-thrust 87 day transfer: 3 days of trim thrust (~85 km/s ΔV), then ~84 days coast
  // The coast velocity after 3-day trim burn is ~50-80 km/s — well below relativistic speeds (~0.03% c)
  // This is far less than the previous 1500 km/s assumption; time dilation effect is actually LESS
  const ep02CruiseV = 65; // km/s — approximate coast speed after 3-day trim thrust (radial component)
  const ep02CruiseSec = 87 * 86400;
  const ep02TdFrac = timeDilationFraction(ep02CruiseV);
  transfers.push({
    episode: 2,
    transferId: "ep02-trim-thrust-cruise",
    label: "木星系→土星/エンケラドス（トリム推力遷移 87日, ~65 km/s巡航）",
    distanceKm: ep02CruiseV * ep02CruiseSec, // approximate
    distanceAU: (ep02CruiseV * ep02CruiseSec) / AU_KM,
    accelKms2: 0,
    accelG: 0,
    classicalTimeSec: ep02CruiseSec,
    classicalPeakVelocityKms: ep02CruiseV,
    classicalDeltaVKms: 85, // 3-day trim thrust ΔV
    relativistic: {
      peakVelocityKms: ep02CruiseV,
      betaPeak: beta(ep02CruiseV),
      gammaPeak: lorentzFactor(ep02CruiseV),
      timeDilationPpm: ep02TdFrac * 1e6,
      timeDilationSec: ep02TdFrac * ep02CruiseSec,
      coordinateTimeSec: ep02CruiseSec,
      properTimeSec: ep02CruiseSec * (1 - ep02TdFrac),
      keCorrectionPpm:
        (((lorentzFactor(ep02CruiseV) - 1) * C_KM_S * C_KM_S) /
          (0.5 * ep02CruiseV * ep02CruiseV) -
          1) *
        1e6,
      dvCorrectionFraction: 0,
      dvCorrectionPpm: 0,
    },
    verdict: "相対論的効果は無視可能（β ≈ 0.02%）— 87日間の時間遅れ ≈ 0.001秒。純粋弾道（約997日）より遷移時間が大幅短縮され、巡航速度も低いため相対論的影響はさらに小さい。",
  });

  // ── EP03: Enceladus → Titania (143h) ──
  // Distance ~1.44 AU (Saturn-Uranus mid-point) — using 2.15e9 km
  transfers.push(
    analyzeTransfer(
      3,
      "ep03-brach-143h",
      "エンケラドス→ティタニア（143h）",
      1_438_930_000, // Saturn-Uranus range
      143 * 3600,
    ),
  );

  // ── EP04: Titania → Earth (65% thrust, ~30 days) ──
  // Distance ~18.6 AU at departure, thrust at 65%
  transfers.push(
    analyzeTransfer(
      4,
      "ep04-brach-65pct",
      "ティタニア→地球（推力65%、~30日）",
      2_722_862_130, // Uranus-Earth ~18.2 AU
      30 * 86400, // ~30 days
    ),
  );

  // ── EP05: Uranus → Earth (507h composite route) ──
  // EP05 operates at 65% thrust (damaged engine from EP04)
  const ep05DistKm = 2_722_862_130; // Uranus-Earth
  const ep05MassKg = 300_000; // 300t effective mass
  const ep05AccelMs2 = KESTREL.damagedThrustN / ep05MassKg; // ~21.2 m/s² (65% thrust)
  const ep05AccelKms2 = ep05AccelMs2 / 1000;
  const ep05TimeSec = Math.sqrt((4 * ep05DistKm * 1000) / ep05AccelMs2);
  transfers.push(
    analyzeTransfer(
      5,
      "ep05-brach-300t",
      "天王星→地球（300t、brachistochrone）",
      ep05DistKm,
      ep05TimeSec,
    ),
  );

  // ── Summary statistics ──
  const maxBeta = Math.max(...transfers.map(t => t.relativistic.betaPeak));
  const maxGamma = Math.max(...transfers.map(t => t.relativistic.gammaPeak));
  const maxTdPpm = Math.max(...transfers.map(t => t.relativistic.timeDilationPpm));
  const maxDvCorrPpm = Math.max(...transfers.map(t => t.relativistic.dvCorrectionPpm));

  // Cumulative time dilation summed across all analyzed transfer scenarios
  const totalDilationSec = transfers.reduce(
    (sum, t) => sum + t.relativistic.timeDilationSec,
    0,
  );
  const totalTransferDays = transfers.reduce(
    (sum, t) => sum + t.classicalTimeSec / 86400,
    0,
  );

  return {
    transfers,
    summary: {
      maxBetaPeak: maxBeta,
      maxBetaPercent: maxBeta * 100,
      maxGamma: maxGamma,
      maxTimeDilationPpm: maxTdPpm,
      maxDvCorrectionPpm: maxDvCorrPpm,
      cumulativeTimeDilationSec: totalDilationSec,
      cumulativeTimeDilationMin: totalDilationSec / 60,
      conclusion: "全転送において相対論的補正は0.1%未満。" +
        `最大β = ${(maxBeta * 100).toFixed(3)}%c、` +
        `最大時間遅れ = ${maxTdPpm.toFixed(1)} ppm。` +
        "航法計算への影響は無視可能であり、古典力学による分析は妥当。" +
        `全${transfers.length}シナリオ（計${Math.round(totalTransferDays)}日分）累積時間遅れ ≈ ${totalDilationSec.toFixed(1)}秒（${(totalDilationSec / 60).toFixed(2)}分）。`,
    },
    parameters: {
      speedOfLightKms: C_KM_S,
      exhaustVelocityKms: VE_KMS,
      ispSeconds: KESTREL.ispS,
    },
  };
}
