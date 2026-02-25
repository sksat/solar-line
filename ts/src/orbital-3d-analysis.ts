/**
 * 3D Orbital Analysis for SOLAR LINE.
 *
 * Extends 2D coplanar analysis with:
 * - Ecliptic z-heights and out-of-plane distances for each transfer
 * - Saturn ring plane crossing analysis (EP02)
 * - Uranus axial tilt approach geometry (EP03/EP04)
 * - Inclination change ΔV penalties per episode
 *
 * Output: reports/data/calculations/3d_orbital_analysis.json
 *
 * Usage:
 *   npm run analyze-3d
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { calendarToJD, jdToDateString, planetPosition, type PlanetName } from "./ephemeris.ts";

const AU_KM = 149_597_870.7;

// ── Saturn ring system constants ─────────────────────────────────

const SATURN_RING_INNER_KM = 66_900;
const SATURN_RING_OUTER_KM = 140_180;
const ENCELADUS_ORBITAL_RADIUS_KM = 238_042;

// ── Uranus system constants ──────────────────────────────────────

const URANUS_OBLIQUITY_DEG = 97.77;
const TITANIA_ORBITAL_RADIUS_KM = 436_300;
const URANUS_RING_OUTER_KM = 51_149;

// ── IAU pole directions ──────────────────────────────────────────

function equatorialToEcliptic(raDeg: number, decDeg: number): [number, number, number] {
  const eps = 23.4393 * Math.PI / 180; // Earth's obliquity
  const ra = raDeg * Math.PI / 180;
  const dec = decDeg * Math.PI / 180;

  const eqX = Math.cos(dec) * Math.cos(ra);
  const eqY = Math.cos(dec) * Math.sin(ra);
  const eqZ = Math.sin(dec);

  return [
    eqX,
    eqY * Math.cos(eps) + eqZ * Math.sin(eps),
    -eqY * Math.sin(eps) + eqZ * Math.cos(eps),
  ];
}

function saturnRingPlaneNormal(): [number, number, number] {
  // IAU J2000 pole: RA=40.589°, Dec=83.537°
  const [x, y, z] = equatorialToEcliptic(40.589, 83.537);
  const mag = Math.sqrt(x * x + y * y + z * z);
  return [x / mag, y / mag, z / mag];
}

function uranusSpinAxis(): [number, number, number] {
  // IAU J2000 pole: RA=257.311°, Dec=-15.175°
  const [x, y, z] = equatorialToEcliptic(257.311, -15.175);
  const mag = Math.sqrt(x * x + y * y + z * z);
  return [x / mag, y / mag, z / mag];
}

// ── SOLAR LINE timeline (from memory/episode-details.md) ─────────

interface TransferLeg {
  episode: number;
  label: string;
  departure: PlanetName;
  arrival: PlanetName;
  departureJD: number;
  arrivalJD: number;
  transferVelocityKmS: number; // approximate average transfer velocity
}

// Key dates from the SOLAR LINE 2241-2242 timeline
// Source: cross-episode.md full-route timeline + per-episode epochAnnotation
const DEPARTURE_MARS = calendarToJD(2241, 9, 5);
const ARRIVAL_JUPITER = calendarToJD(2241, 9, 8); // +72h
const DEPARTURE_JUPITER = calendarToJD(2241, 9, 11); // 3 days at Jupiter system
const ARRIVAL_SATURN = calendarToJD(2242, 12, 10); // ~455 days ballistic from Jupiter
const DEPARTURE_SATURN = calendarToJD(2242, 12, 12); // 2 days at Enceladus
const ARRIVAL_URANUS = calendarToJD(2242, 12, 17); // +143h (~6 days)
const DEPARTURE_URANUS = calendarToJD(2242, 12, 19); // 2 days at Titania
const ARRIVAL_EARTH = calendarToJD(2242, 12, 28); // 507h composite route (~21 days)

// Transfer velocities: brachistochrone ΔV/2 (peak velocity) from calculation files
// These are used to compute absolute plane-change ΔV costs.
// The fraction (planeChangeDv / totalDv) equals sin(Δi/2) and is velocity-independent.
const LEGS: TransferLeg[] = [
  {
    episode: 1,
    label: "Mars→Jupiter (72h brachistochrone)",
    departure: "mars",
    arrival: "jupiter",
    departureJD: DEPARTURE_MARS,
    arrivalJD: ARRIVAL_JUPITER,
    transferVelocityKmS: 4249, // ΔV/2 from ep01_calculations.json closest 72h: 8497/2
  },
  {
    episode: 2,
    label: "Jupiter→Saturn (455d ballistic)",
    departure: "jupiter",
    arrival: "saturn",
    departureJD: DEPARTURE_JUPITER,
    arrivalJD: ARRIVAL_SATURN,
    transferVelocityKmS: 17, // avg heliocentric: (18.99+14.31)/2 from ep02_calculations.json
  },
  {
    episode: 3,
    label: "Saturn→Uranus (143h brachistochrone)",
    departure: "saturn",
    arrival: "uranus",
    departureJD: DEPARTURE_SATURN,
    arrivalJD: ARRIVAL_URANUS,
    transferVelocityKmS: 5582, // ΔV/2 from ep03_calculations.json closest: 11165/2
  },
  {
    episode: 4,
    label: "Uranus→Earth (507h composite)",
    departure: "uranus",
    arrival: "earth",
    departureJD: DEPARTURE_URANUS,
    arrivalJD: ARRIVAL_EARTH,
    transferVelocityKmS: 5890, // ΔV/2 from ep05_calculations.json 500t scenario: 11780/2
  },
];

// ── Analysis functions ───────────────────────────────────────────

interface ZHeightAnalysis {
  planet: string;
  jd: number;
  date: string;
  zHeightKm: number;
  zHeightAU: number;
  latitudeDeg: number;
  inclinationDeg: number;
}

function analyzeZHeight(planet: PlanetName, jd: number): ZHeightAnalysis {
  const pos = planetPosition(planet, jd);
  return {
    planet,
    jd,
    date: jdToDateString(jd),
    zHeightKm: pos.z,
    zHeightAU: pos.z / AU_KM,
    latitudeDeg: pos.latitude * (180 / Math.PI),
    inclinationDeg: pos.inclination * (180 / Math.PI),
  };
}

interface TransferAnalysis3D {
  leg: string;
  episode: number;
  departure: ZHeightAnalysis;
  arrival: ZHeightAnalysis;
  outOfPlaneDistanceKm: number;
  outOfPlaneDistanceAU: number;
  inclinationChangeDeg: number;
  planeChangeDvKmS: number;
  planeChangeFractionPercent: number;
}

function analyzeTransfer3D(leg: TransferLeg): TransferAnalysis3D {
  const dep = analyzeZHeight(leg.departure, leg.departureJD);
  const arr = analyzeZHeight(leg.arrival, leg.arrivalJD);

  const outOfPlane = Math.abs(arr.zHeightKm - dep.zHeightKm);
  const deltaI = Math.abs(arr.inclinationDeg - dep.inclinationDeg) * (Math.PI / 180);
  const planeChangeDv = 2 * leg.transferVelocityKmS * Math.abs(Math.sin(deltaI / 2));

  // Fraction = planeChangeDv / totalDv = sin(Δi/2) — velocity-independent
  const totalDv = 2 * leg.transferVelocityKmS; // brachistochrone ΔV ≈ 2 * peak_velocity
  const fractionPercent = totalDv > 0 ? (planeChangeDv / totalDv) * 100 : 0;

  return {
    leg: leg.label,
    episode: leg.episode,
    departure: dep,
    arrival: arr,
    outOfPlaneDistanceKm: outOfPlane,
    outOfPlaneDistanceAU: outOfPlane / AU_KM,
    inclinationChangeDeg: deltaI * (180 / Math.PI),
    planeChangeDvKmS: planeChangeDv,
    planeChangeFractionPercent: fractionPercent,
  };
}

interface SaturnRingAnalysis {
  ringPlaneNormal: [number, number, number];
  ringInnerKm: number;
  ringOuterKm: number;
  enceladusOrbitKm: number;
  enceladusOutsideRings: boolean;
  saturnZHeightAtArrival: ZHeightAnalysis;
  approachFromJupiter: {
    approachAngleToDeg: number;
    description: string;
  };
}

function analyzeSaturnRings(): SaturnRingAnalysis {
  const normal = saturnRingPlaneNormal();
  const saturnPos = analyzeZHeight("saturn", ARRIVAL_SATURN);

  // Approach direction from Jupiter (approximate)
  const jupPos = planetPosition("jupiter", DEPARTURE_JUPITER);
  const satPos = planetPosition("saturn", ARRIVAL_SATURN);
  const dx = satPos.x - jupPos.x;
  const dy = satPos.y - jupPos.y;
  const dz = satPos.z - jupPos.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const approachDir = [dx / dist, dy / dist, dz / dist];

  // Angle between approach direction and ring plane
  const dotNormal =
    approachDir[0] * normal[0] +
    approachDir[1] * normal[1] +
    approachDir[2] * normal[2];
  const approachAngle = Math.asin(Math.min(1, Math.abs(dotNormal))) * (180 / Math.PI);

  return {
    ringPlaneNormal: normal,
    ringInnerKm: SATURN_RING_INNER_KM,
    ringOuterKm: SATURN_RING_OUTER_KM,
    enceladusOrbitKm: ENCELADUS_ORBITAL_RADIUS_KM,
    enceladusOutsideRings: ENCELADUS_ORBITAL_RADIUS_KM > SATURN_RING_OUTER_KM,
    saturnZHeightAtArrival: saturnPos,
    approachFromJupiter: {
      approachAngleToDeg: approachAngle,
      description:
        approachAngle > 60
          ? "急角度（リング面にほぼ垂直）"
          : approachAngle > 30
            ? "中程度の角度"
            : "浅い角度（リング面にほぼ平行）",
    },
  };
}

interface UranusApproachAnalysis {
  spinAxis: [number, number, number];
  obliquityDeg: number;
  titaniaOrbitKm: number;
  ringOuterKm: number;
  approachFromSaturn: {
    angleToDeg: number;
    isPolar: boolean;
    isEquatorial: boolean;
    description: string;
  };
  approachFromUranus: {
    angleToDeg: number;
    isPolar: boolean;
    isEquatorial: boolean;
    description: string;
  };
}

function analyzeUranusApproach(): UranusApproachAnalysis {
  const spin = uranusSpinAxis();

  // Approach from Saturn (EP03)
  const satPos = planetPosition("saturn", DEPARTURE_SATURN);
  const uraPos = planetPosition("uranus", ARRIVAL_URANUS);
  const dx1 = uraPos.x - satPos.x;
  const dy1 = uraPos.y - satPos.y;
  const dz1 = uraPos.z - satPos.z;
  const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1 + dz1 * dz1);
  const approach1 = [dx1 / dist1, dy1 / dist1, dz1 / dist1];

  const dot1 = Math.abs(approach1[0] * spin[0] + approach1[1] * spin[1] + approach1[2] * spin[2]);
  const angleToAxis1 = Math.acos(Math.min(1, dot1)) * (180 / Math.PI);
  const angleToEq1 = 90 - angleToAxis1;

  // Departure toward Earth (EP04)
  const earthPos = planetPosition("earth", ARRIVAL_EARTH);
  const dx2 = earthPos.x - uraPos.x;
  const dy2 = earthPos.y - uraPos.y;
  const dz2 = earthPos.z - uraPos.z;
  const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2 + dz2 * dz2);
  const approach2 = [dx2 / dist2, dy2 / dist2, dz2 / dist2];

  const dot2 = Math.abs(approach2[0] * spin[0] + approach2[1] * spin[1] + approach2[2] * spin[2]);
  const angleToAxis2 = Math.acos(Math.min(1, dot2)) * (180 / Math.PI);
  const angleToEq2 = 90 - angleToAxis2;

  function describeApproach(angleToEq: number): string {
    if (Math.abs(angleToEq) > 60) return "極方向からの接近（天王星赤道面にほぼ垂直）";
    if (Math.abs(angleToEq) > 30) return "中緯度からの接近";
    return "赤道方向からの接近（天王星赤道面にほぼ平行）";
  }

  return {
    spinAxis: spin,
    obliquityDeg: URANUS_OBLIQUITY_DEG,
    titaniaOrbitKm: TITANIA_ORBITAL_RADIUS_KM,
    ringOuterKm: URANUS_RING_OUTER_KM,
    approachFromSaturn: {
      angleToDeg: angleToEq1,
      isPolar: angleToAxis1 < 30,
      isEquatorial: Math.abs(angleToEq1) < 30,
      description: describeApproach(angleToEq1),
    },
    approachFromUranus: {
      angleToDeg: angleToEq2,
      isPolar: angleToAxis2 < 30,
      isEquatorial: Math.abs(angleToEq2) < 30,
      description: describeApproach(angleToEq2),
    },
  };
}

// ── Main ─────────────────────────────────────────────────────────

function main() {
  console.log("=== 3D Orbital Analysis for SOLAR LINE ===\n");

  // 1. Per-transfer 3D analysis
  const transfers = LEGS.map(analyzeTransfer3D);

  console.log("Transfer 3D Analysis:");
  for (const t of transfers) {
    console.log(`  EP${String(t.episode).padStart(2, "0")}: ${t.leg}`);
    console.log(
      `    Out-of-plane: ${t.outOfPlaneDistanceKm.toFixed(0)} km (${t.outOfPlaneDistanceAU.toFixed(4)} AU)`,
    );
    console.log(
      `    Inclination change: ${t.inclinationChangeDeg.toFixed(3)}°`,
    );
    console.log(
      `    Plane change ΔV: ${t.planeChangeDvKmS.toFixed(3)} km/s (${t.planeChangeFractionPercent.toFixed(3)}% of transfer ΔV)`,
    );
    console.log(
      `    Departure z: ${t.departure.zHeightKm.toFixed(0)} km, Arrival z: ${t.arrival.zHeightKm.toFixed(0)} km`,
    );
  }

  // 2. Saturn ring analysis
  console.log("\nSaturn Ring Analysis:");
  const saturn = analyzeSaturnRings();
  console.log(
    `  Ring plane normal: [${saturn.ringPlaneNormal.map((n) => n.toFixed(4)).join(", ")}]`,
  );
  console.log(
    `  Enceladus at ${saturn.enceladusOrbitKm} km — ${saturn.enceladusOutsideRings ? "outside" : "INSIDE"} rings`,
  );
  console.log(
    `  Approach angle to ring plane: ${saturn.approachFromJupiter.approachAngleToDeg.toFixed(1)}°`,
  );
  console.log(`  ${saturn.approachFromJupiter.description}`);

  // 3. Uranus approach analysis
  console.log("\nUranus Approach Analysis:");
  const uranus = analyzeUranusApproach();
  console.log(`  Obliquity: ${uranus.obliquityDeg}°`);
  console.log(
    `  Spin axis: [${uranus.spinAxis.map((n) => n.toFixed(4)).join(", ")}]`,
  );
  console.log(
    `  From Saturn: ${uranus.approachFromSaturn.angleToDeg.toFixed(1)}° to equatorial — ${uranus.approachFromSaturn.description}`,
  );
  console.log(
    `  Toward Earth: ${uranus.approachFromUranus.angleToDeg.toFixed(1)}° to equatorial — ${uranus.approachFromUranus.description}`,
  );

  // 4. Summary: are 2D approximations valid?
  console.log("\n=== Coplanar Approximation Validity ===");
  const maxPlaneChangeFraction = Math.max(
    ...transfers.map((t) => t.planeChangeFractionPercent),
  );
  console.log(
    `  Max plane change ΔV fraction: ${maxPlaneChangeFraction.toFixed(4)}%`,
  );
  if (maxPlaneChangeFraction < 1.0) {
    console.log(
      "  ✓ Coplanar approximation is valid — plane change ΔV < 1% of transfer ΔV for all legs",
    );
  } else {
    console.log(
      "  ⚠ Coplanar approximation may introduce errors > 1% for some legs",
    );
  }

  // Write output
  const output = {
    generatedAt: new Date().toISOString(),
    description: "3D orbital analysis for SOLAR LINE — ecliptic z-heights, ring crossings, approach geometry",
    coplanarApproximationValid: maxPlaneChangeFraction < 1.0,
    maxPlaneChangeFractionPercent: maxPlaneChangeFraction,
    transfers,
    saturnRingAnalysis: saturn,
    uranusApproachAnalysis: uranus,
    planetaryZHeightsAtEpoch: {
      mars: analyzeZHeight("mars", DEPARTURE_MARS),
      jupiter: analyzeZHeight("jupiter", ARRIVAL_JUPITER),
      saturn: analyzeZHeight("saturn", ARRIVAL_SATURN),
      uranus: analyzeZHeight("uranus", ARRIVAL_URANUS),
      earth: analyzeZHeight("earth", ARRIVAL_EARTH),
    },
  };

  const outDir = path.resolve(
    import.meta.dirname ?? ".",
    "..",
    "..",
    "reports",
    "data",
    "calculations",
  );
  const outFile = path.join(outDir, "3d_orbital_analysis.json");

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nOutput written to: ${outFile}`);
}

main();
