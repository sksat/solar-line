/**
 * Coordinate transform utilities for 3D orbital analysis.
 *
 * Pure math functions for converting between equatorial (J2000) and ecliptic
 * coordinate systems, plus IAU pole direction lookups for planetary systems.
 */

/** Earth's obliquity (J2000), in radians */
const OBLIQUITY_RAD = 23.4393 * Math.PI / 180;

/**
 * Convert equatorial (RA, Dec) coordinates to ecliptic Cartesian unit vector.
 *
 * Uses the standard rotation matrix around the x-axis by obliquity ε:
 *   x_ecl = x_eq
 *   y_ecl = y_eq cos ε + z_eq sin ε
 *   z_ecl = -y_eq sin ε + z_eq cos ε
 */
export function equatorialToEcliptic(
  raDeg: number,
  decDeg: number,
): [number, number, number] {
  const ra = raDeg * Math.PI / 180;
  const dec = decDeg * Math.PI / 180;

  const eqX = Math.cos(dec) * Math.cos(ra);
  const eqY = Math.cos(dec) * Math.sin(ra);
  const eqZ = Math.sin(dec);

  return [
    eqX,
    eqY * Math.cos(OBLIQUITY_RAD) + eqZ * Math.sin(OBLIQUITY_RAD),
    -eqY * Math.sin(OBLIQUITY_RAD) + eqZ * Math.cos(OBLIQUITY_RAD),
  ];
}

/** Normalize a 3D vector to unit length */
function normalize(v: [number, number, number]): [number, number, number] {
  const mag = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return [v[0] / mag, v[1] / mag, v[2] / mag];
}

/**
 * Saturn's ring plane normal in ecliptic coordinates.
 * IAU J2000 pole: RA = 40.589°, Dec = 83.537°
 */
export function saturnRingPlaneNormal(): [number, number, number] {
  return normalize(equatorialToEcliptic(40.589, 83.537));
}

/**
 * Uranus spin axis in ecliptic coordinates.
 * IAU J2000 pole: RA = 257.311°, Dec = -15.175°
 */
export function uranusSpinAxis(): [number, number, number] {
  return normalize(equatorialToEcliptic(257.311, -15.175));
}
