/**
 * Vis-viva equation: v = sqrt(μ * (2/r - 1/a))
 *
 * @param mu Gravitational parameter (km³/s²)
 * @param r Current orbital radius (km)
 * @param a Semi-major axis (km)
 * @returns Orbital velocity (km/s)
 */
export function visViva(mu: number, r: number, a: number): number {
  return Math.sqrt(mu * (2 / r - 1 / a));
}

/**
 * Calculate ΔV for a Hohmann transfer between two circular orbits.
 *
 * @param mu Gravitational parameter (km³/s²)
 * @param r1 Radius of inner circular orbit (km)
 * @param r2 Radius of outer circular orbit (km)
 * @returns [dv1, dv2] ΔV at departure and arrival (km/s)
 */
export function hohmannTransferDv(
  mu: number,
  r1: number,
  r2: number,
): [number, number] {
  const aTransfer = (r1 + r2) / 2;

  const vCircular1 = Math.sqrt(mu / r1);
  const vTransfer1 = visViva(mu, r1, aTransfer);
  const dv1 = Math.abs(vTransfer1 - vCircular1);

  const vCircular2 = Math.sqrt(mu / r2);
  const vTransfer2 = visViva(mu, r2, aTransfer);
  const dv2 = Math.abs(vCircular2 - vTransfer2);

  return [dv1, dv2];
}

/** Gravitational parameters (km³/s²) — NASA JPL DE440/DE441 */
export const MU = {
  SUN: 1.32712440041e11,
  EARTH: 3.986004418e5,
  MARS: 4.28283714e4,
  JUPITER: 1.26686534e8,
} as const;

/** Mean orbital radii (semi-major axes) around the Sun (km) — NASA fact sheets */
export const ORBIT_RADIUS = {
  MARS: 227_939_200,
  JUPITER: 778_570_000,
} as const;

/** Ganymede orbital radius around Jupiter (km) — NASA fact sheet */
export const GANYMEDE_ORBIT_RADIUS = 1_070_400;

/**
 * Orbital period: T = 2π * sqrt(a³/μ)
 *
 * @param mu Gravitational parameter (km³/s²)
 * @param a Semi-major axis (km)
 * @returns Period in seconds
 */
export function orbitalPeriod(mu: number, a: number): number {
  return 2 * Math.PI * Math.sqrt(a ** 3 / mu);
}

/**
 * Required constant acceleration for a brachistochrone (flip-at-midpoint) transfer.
 * Assumes straight-line, accelerate for half the distance then decelerate.
 *
 * a_required = 4 * d / t²
 *
 * @param distance Distance in km
 * @param time Transfer time in seconds
 * @returns Required acceleration in km/s²
 */
export function brachistochroneAccel(distance: number, time: number): number {
  return (4 * distance) / (time * time);
}

/**
 * ΔV for a brachistochrone transfer (constant thrust, flip at midpoint).
 * ΔV = a * t = 2 * sqrt(d * a_req) = 2 * d / (t/2) simplified: ΔV = 2*d/t ... no.
 * ΔV = a_required * t where a_required = 4d/t²
 * So ΔV = 4d/t
 *
 * @param distance Distance in km
 * @param time Transfer time in seconds
 * @returns ΔV in km/s
 */
export function brachistochroneDeltaV(distance: number, time: number): number {
  return (4 * distance) / time;
}
