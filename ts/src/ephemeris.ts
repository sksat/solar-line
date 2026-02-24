/**
 * Planetary ephemeris for SOLAR LINE analysis.
 *
 * Pure TypeScript implementation of mean Keplerian element propagation.
 * Uses the same JPL data as the Rust solar-line-core ephemeris module.
 *
 * Accuracy: ~1° for outer planets over century timescales.
 */

import { MU, ORBIT_RADIUS, orbitalPeriod } from "./orbital.ts";

/** J2000.0 epoch as Julian Date */
export const J2000_JD = 2_451_545.0;

/** Seconds per day */
const SECONDS_PER_DAY = 86400;

/** AU in km */
const AU_KM = 149_597_870.7;

/** Julian century in days */
const JULIAN_CENTURY_DAYS = 36525;

/** Planet identifiers */
export type PlanetName =
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

/** Mean Keplerian elements at J2000 with secular rates */
interface MeanElements {
  a0: number; // AU
  aDot: number; // AU/century
  e0: number;
  eDot: number; // per century
  i0: number; // degrees
  iDot: number; // degrees/century
  l0: number; // degrees (mean longitude)
  lDot: number; // degrees/century
  wBar0: number; // degrees (longitude of perihelion)
  wBarDot: number; // degrees/century
  omega0: number; // degrees (longitude of ascending node)
  omegaDot: number; // degrees/century
}

/** Mean Keplerian elements for all planets (JPL Standish & Williams) */
const ELEMENTS: Record<PlanetName, MeanElements> = {
  mercury: {
    a0: 0.387_098_31,
    aDot: 0.0,
    e0: 0.205_630_69,
    eDot: 0.000_020_04,
    i0: 7.004_86,
    iDot: -0.005_93,
    l0: 252.250_84,
    lDot: 149_472.674_11,
    wBar0: 77.456_45,
    wBarDot: 0.159_29,
    omega0: 48.330_67,
    omegaDot: -0.125_34,
  },
  venus: {
    a0: 0.723_329_56,
    aDot: 0.0,
    e0: 0.006_773_23,
    eDot: -0.000_047_64,
    i0: 3.394_71,
    iDot: -0.008_67,
    l0: 181.979_73,
    lDot: 58_517.815_39,
    wBar0: 131.563_70,
    wBarDot: 0.002_68,
    omega0: 76.679_92,
    omegaDot: -0.278_01,
  },
  earth: {
    a0: 1.000_002_61,
    aDot: 0.000_005_62,
    e0: 0.016_708_57,
    eDot: -0.000_042_04,
    i0: -0.000_15,
    iDot: -0.013_37,
    l0: 100.464_57,
    lDot: 35_999.372_44,
    wBar0: 102.937_35,
    wBarDot: 0.323_29,
    omega0: 0.0,
    omegaDot: 0.0,
  },
  mars: {
    a0: 1.523_662_31,
    aDot: -0.000_073_28,
    e0: 0.093_412_33,
    eDot: 0.000_090_48,
    i0: 1.850_26,
    iDot: -0.006_75,
    l0: -4.553_43,
    lDot: 19_140.299_34,
    wBar0: -23.943_62,
    wBarDot: 0.445_41,
    omega0: 49.558_09,
    omegaDot: -0.291_08,
  },
  jupiter: {
    a0: 5.202_603_91,
    aDot: 0.000_016_63,
    e0: 0.048_497_64,
    eDot: 0.000_163_41,
    i0: 1.303_30,
    iDot: -0.001_98,
    l0: 34.396_44,
    lDot: 3_034.905_67,
    wBar0: 14.728_47,
    wBarDot: 0.215_36,
    omega0: 100.464_44,
    omegaDot: 0.176_56,
  },
  saturn: {
    a0: 9.554_909_16,
    aDot: -0.000_213_89,
    e0: 0.055_508_62,
    eDot: -0.000_346_61,
    i0: 2.488_68,
    iDot: 0.007_74,
    l0: 49.954_24,
    lDot: 1_222.113_71,
    wBar0: 92.598_87,
    wBarDot: -0.418_97,
    omega0: 113.665_24,
    omegaDot: -0.250_60,
  },
  uranus: {
    a0: 19.218_446_10,
    aDot: -0.000_202_57,
    e0: 0.046_295_11,
    eDot: -0.000_030_26,
    i0: 0.773_20,
    iDot: 0.000_74,
    l0: 313.238_18,
    lDot: 428.481_03,
    wBar0: 170.954_27,
    wBarDot: 0.403_17,
    omega0: 74.016_92,
    omegaDot: 0.042_40,
  },
  neptune: {
    a0: 30.110_386_88,
    aDot: 0.000_069_47,
    e0: 0.008_989_22,
    eDot: 0.000_006_06,
    i0: 1.769_17,
    iDot: -0.005_42,
    l0: -55.120_02,
    lDot: 218.456_52,
    wBar0: 44.964_76,
    wBarDot: -0.326_36,
    omega0: 131.784_06,
    omegaDot: -0.006_51,
  },
};

/** Normalize angle to [0, 2π) */
function normalizeRadians(rad: number): number {
  const TAU = 2 * Math.PI;
  let v = rad % TAU;
  if (v < 0) v += TAU;
  return v;
}

/** Normalize angle to (-π, π] */
function normalizeSignedRadians(rad: number): number {
  const TAU = 2 * Math.PI;
  let v = rad % TAU;
  if (v > Math.PI) v -= TAU;
  else if (v <= -Math.PI) v += TAU;
  return v;
}

/** Solve Kepler's equation M = E - e·sin(E) via Newton-Raphson */
function solveKepler(M: number, e: number): number {
  const m = normalizeRadians(M);
  let E = e < 0.8 ? m + e * Math.sin(m) : Math.PI;

  for (let i = 0; i < 50; i++) {
    const f = E - e * Math.sin(E) - m;
    const fPrime = 1 - e * Math.cos(E);
    const delta = f / fPrime;
    E -= delta;
    if (Math.abs(delta) < 1e-14) break;
  }
  return E;
}

/** Convert eccentric anomaly to true anomaly */
function eccentricToTrue(E: number, e: number): number {
  const halfNu = Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2);
  return normalizeRadians(2 * Math.atan(halfNu));
}

/** Planet position result */
export interface PlanetPosition {
  /** Ecliptic longitude (radians, 0 = vernal equinox) */
  longitude: number;
  /** Ecliptic latitude (radians, 0 = ecliptic plane) */
  latitude: number;
  /** Heliocentric distance (km) */
  distance: number;
  /** X coordinate in ecliptic frame (km) */
  x: number;
  /** Y coordinate in ecliptic frame (km) */
  y: number;
  /** Z coordinate in ecliptic frame (km, positive = ecliptic north) */
  z: number;
  /** Orbital inclination at epoch (radians) */
  inclination: number;
}

/** Convert calendar date to Julian Date */
export function calendarToJD(year: number, month: number, day: number): number {
  const [y, m] =
    month <= 2 ? [year - 1, month + 12] : [year, month];

  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);

  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    b -
    1524.5
  );
}

/** Convert Julian Date to calendar date string YYYY-MM-DD */
export function jdToDateString(jd: number): string {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;

  let a: number;
  if (z < 2_299_161) {
    a = z;
  } else {
    const alpha = Math.floor((z - 1_867_216.25) / 36_524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }

  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);

  const day = b - d - Math.floor(30.6001 * e) + f;
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;

  const dayInt = Math.floor(day);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(dayInt).padStart(2, "0")}`;
}

/** Compute heliocentric position of a planet at a given Julian Date */
export function planetPosition(planet: PlanetName, jd: number): PlanetPosition {
  const elem = ELEMENTS[planet];
  const t = (jd - J2000_JD) / JULIAN_CENTURY_DAYS;

  const aAU = elem.a0 + elem.aDot * t;
  const e = elem.e0 + elem.eDot * t;
  const iDeg = elem.i0 + elem.iDot * t;
  const lDeg = elem.l0 + elem.lDot * t;
  const wBarDeg = elem.wBar0 + elem.wBarDot * t;
  const omegaDeg = elem.omega0 + elem.omegaDot * t;

  // Convert angles to radians
  const iRad = iDeg * (Math.PI / 180);
  const omegaRad = omegaDeg * (Math.PI / 180);

  // Mean anomaly M = L - ω̃
  const mRad = normalizeRadians((lDeg - wBarDeg) * (Math.PI / 180));

  // Argument of perihelion ω = ω̃ - Ω
  const wRad = (wBarDeg - omegaDeg) * (Math.PI / 180);

  // Solve Kepler
  const eClamped = Math.max(0, Math.min(e, 0.999));
  const E = solveKepler(mRad, eClamped);
  const trueAnomaly = eccentricToTrue(E, eClamped);

  // Distance
  const aKm = aAU * AU_KM;
  const rKm = (aKm * (1 - e * e)) / (1 + e * Math.cos(trueAnomaly));

  // Argument of latitude u = ω + ν
  const u = wRad + trueAnomaly;

  // Position in orbital plane
  const xOrb = rKm * Math.cos(u);
  const yOrb = rKm * Math.sin(u);

  // Rotate to ecliptic frame
  const cosOmega = Math.cos(omegaRad);
  const sinOmega = Math.sin(omegaRad);
  const cosI = Math.cos(iRad);
  const sinI = Math.sin(iRad);

  const x = cosOmega * xOrb - sinOmega * cosI * yOrb;
  const y = sinOmega * xOrb + cosOmega * cosI * yOrb;
  const z = sinI * yOrb;

  // Ecliptic longitude and latitude from 3D coordinates
  const longitude = normalizeRadians(Math.atan2(y, x));
  const latitude = Math.asin(z / rKm);

  return {
    longitude,
    latitude,
    distance: rKm,
    x,
    y,
    z,
    inclination: iRad,
  };
}

/** Compute ecliptic longitude of a planet at Julian Date (radians) */
export function planetLongitude(planet: PlanetName, jd: number): number {
  return planetPosition(planet, jd).longitude;
}

/** Phase angle from planet1 to planet2, normalized to (-π, π] */
export function phaseAngle(
  planet1: PlanetName,
  planet2: PlanetName,
  jd: number,
): number {
  return normalizeSignedRadians(
    planetLongitude(planet2, jd) - planetLongitude(planet1, jd),
  );
}

/** Semi-major axis for a planet (km) */
function planetSMA(planet: PlanetName): number {
  const map: Record<PlanetName, number> = {
    mercury: 57_909_050,
    venus: 108_208_000,
    earth: ORBIT_RADIUS.EARTH,
    mars: ORBIT_RADIUS.MARS,
    jupiter: ORBIT_RADIUS.JUPITER,
    saturn: ORBIT_RADIUS.SATURN,
    uranus: ORBIT_RADIUS.URANUS,
    neptune: 4_495_060_000,
  };
  return map[planet];
}

/** Synodic period between two planets (seconds) */
export function synodicPeriod(
  planet1: PlanetName,
  planet2: PlanetName,
): number {
  const t1 = orbitalPeriod(MU.SUN, planetSMA(planet1));
  const t2 = orbitalPeriod(MU.SUN, planetSMA(planet2));
  return 1 / Math.abs(1 / t1 - 1 / t2);
}

/** Required phase angle for a Hohmann transfer (radians) */
export function hohmannPhaseAngle(
  departure: PlanetName,
  arrival: PlanetName,
): number {
  const r1 = planetSMA(departure);
  const r2 = planetSMA(arrival);
  const aTransfer = (r1 + r2) / 2;
  const tTransfer = Math.PI * Math.sqrt(aTransfer ** 3 / MU.SUN);
  const n2 = Math.sqrt(MU.SUN / r2 ** 3);
  const thetaTravel = n2 * tTransfer;
  return normalizeRadians(Math.PI - thetaTravel);
}

/** Hohmann transfer time (seconds) */
export function hohmannTransferTime(
  departure: PlanetName,
  arrival: PlanetName,
): number {
  const r1 = planetSMA(departure);
  const r2 = planetSMA(arrival);
  const aTransfer = (r1 + r2) / 2;
  return Math.PI * Math.sqrt(aTransfer ** 3 / MU.SUN);
}

/**
 * Find the next Hohmann launch window after a given Julian Date.
 * Returns the JD of the window, or null if not found.
 */
export function nextHohmannWindow(
  departure: PlanetName,
  arrival: PlanetName,
  afterJD: number,
): number | null {
  const required = hohmannPhaseAngle(departure, arrival);
  const synodic = synodicPeriod(departure, arrival);
  const searchDays = (synodic / SECONDS_PER_DAY) * 1.2;
  const step = 0.1;

  let bestJD = afterJD;
  let bestDiff = Infinity;

  for (let jd = afterJD; jd < afterJD + searchDays; jd += step) {
    const current = phaseAngle(departure, arrival, jd);
    const diff = Math.abs(normalizeSignedRadians(current - required));
    if (diff < bestDiff) {
      bestDiff = diff;
      bestJD = jd;
    }
  }

  // Bisection refinement
  let lo = bestJD - step;
  let hi = bestJD + step;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const diffLo = normalizeSignedRadians(
      phaseAngle(departure, arrival, lo) - required,
    );
    const diffMid = normalizeSignedRadians(
      phaseAngle(departure, arrival, mid) - required,
    );
    if (diffLo * diffMid <= 0) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  const resultJD = (lo + hi) / 2;
  const finalDiff = Math.abs(
    normalizeSignedRadians(phaseAngle(departure, arrival, resultJD) - required),
  );

  return finalDiff < (0.1 * Math.PI) / 180 ? resultJD : null;
}

/** Elapsed time between two JDs in days */
export function elapsedDays(jd1: number, jd2: number): number {
  return jd2 - jd1;
}

/** Elapsed time between two JDs in hours */
export function elapsedHours(jd1: number, jd2: number): number {
  return (jd2 - jd1) * 24;
}
