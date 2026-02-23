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
  MOON: 4.9048695e3,
  MARS: 4.28283714e4,
  JUPITER: 1.26686534e8,
  SATURN: 3.7931187e7,
  URANUS: 5.793939e6,
} as const;

/** Mean orbital radii (semi-major axes) around the Sun (km) — NASA fact sheets */
export const ORBIT_RADIUS = {
  EARTH: 149_598_023,
  MARS: 227_939_200,
  JUPITER: 778_570_000,
  SATURN: 1_433_530_000,
  URANUS: 2_872_460_000,
} as const;

/** Ganymede orbital radius around Jupiter (km) — NASA fact sheet */
export const GANYMEDE_ORBIT_RADIUS = 1_070_400;

/** Jupiter equatorial radius (km) — NASA fact sheet */
export const JUPITER_RADIUS = 71_492;

/** Saturn equatorial radius (km) — NASA fact sheet */
export const SATURN_RADIUS = 60_268;

/** Enceladus orbital radius around Saturn (km) — NASA fact sheet */
export const ENCELADUS_ORBIT_RADIUS = 238_020;

/** Uranus equatorial radius (km) — NASA fact sheet */
export const URANUS_RADIUS = 25_559;

/** Titania orbital radius around Uranus (km) — NASA fact sheet */
export const TITANIA_ORBIT_RADIUS = 435_910;

/** Earth equatorial radius (km) — NASA fact sheet */
export const EARTH_RADIUS = 6_371;

/** Moon orbital radius around Earth (km) — NASA fact sheet (semi-major axis) */
export const MOON_ORBIT_RADIUS = 384_400;

/** Low Earth Orbit altitude (km) — typical ISS-like orbit */
export const LEO_ALTITUDE = 400;

/**
 * Escape velocity at a given distance from a body.
 * v_esc = sqrt(2 * mu / r)
 */
export function escapeVelocity(mu: number, r: number): number {
  return Math.sqrt((2 * mu) / r);
}

/**
 * Circular orbital velocity at distance r.
 * v_circ = sqrt(mu / r)
 */
export function circularVelocity(mu: number, r: number): number {
  return Math.sqrt(mu / r);
}

/**
 * Hyperbolic excess velocity given speed and escape velocity.
 * v_inf = sqrt(v² - v_esc²)
 * Returns 0 if v < v_esc (bound orbit).
 */
export function hyperbolicExcess(v: number, vEsc: number): number {
  if (v <= vEsc) return 0;
  return Math.sqrt(v * v - vEsc * vEsc);
}

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
