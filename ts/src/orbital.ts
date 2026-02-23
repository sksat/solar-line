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
} as const;
