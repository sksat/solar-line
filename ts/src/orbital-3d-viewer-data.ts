/**
 * Data transformation for 3D orbital viewer.
 * Pure functions converting 3d_orbital_analysis.json data into scene-ready structures.
 * No Three.js dependency — this module runs in Node.js for testing.
 */

// ── Types ──

export interface PlanetData {
  name: string;
  /** X position in scene units */
  x: number;
  /** Y position in scene units (mapped from ecliptic latitude) */
  y: number;
  /** Z position in scene units (mapped from ecliptic z-height) */
  z: number;
  /** Display color */
  color: string;
  /** Display radius in scene units */
  radius: number;
  /** If true, this is the central body of the scene */
  isCentral?: boolean;
  /** Orbit radius in km (for moons in local scenes) */
  orbitRadius?: number;
  /** Display label */
  label?: string;
}

export interface TransferArcData {
  from: string;
  to: string;
  /** Departure position [x, y, z] */
  fromPos: [number, number, number];
  /** Arrival position [x, y, z] */
  toPos: [number, number, number];
  /** Episode number */
  episode: number;
  /** Display color */
  color: string;
  /** Label */
  label?: string;
  /** Approach angle in degrees (for local scenes) */
  approachAngleDeg?: number;
}

export interface RingData {
  innerRadius: number;
  outerRadius: number;
  /** Normal vector [x, y, z] */
  normal: [number, number, number];
  color: string;
  opacity: number;
}

export interface AxisData {
  type: "spin" | "orbital";
  /** Direction unit vector [x, y, z] */
  direction: [number, number, number];
  label: string;
  color: string;
}

export interface PlaneData {
  type: "ecliptic" | "equatorial" | "ring";
  /** Normal vector [x, y, z] */
  normal: [number, number, number];
  /** Tilt in degrees (for display) */
  tiltDeg?: number;
  color: string;
  opacity: number;
  label?: string;
  z?: number;
}

export interface SceneData {
  type: "full-route" | "saturn-ring" | "uranus-approach";
  title: string;
  description: string;
  planets: PlanetData[];
  transferArcs: TransferArcData[];
  eclipticPlane?: PlaneData;
  rings?: RingData[];
  axes?: AxisData[];
  planes?: PlaneData[];
}

// ── Constants ──

/** Conversion factor: 1 AU = this many scene units */
export const AU_TO_SCENE = 5;

/** Planet display colors */
const PLANET_COLORS: Record<string, string> = {
  mars: "#e05050",
  jupiter: "#e0a040",
  saturn: "#d4b896",
  uranus: "#7ec8e3",
  earth: "#4488ff",
  enceladus: "#ccddee",
  titania: "#aabbcc",
};

/** Episode transfer colors */
const EPISODE_COLORS: Record<number, string> = {
  1: "#ff6644",
  2: "#ffaa22",
  3: "#44cc88",
  4: "#4488ff",
  5: "#ff4444",
};

/** Planet display radii in scene units */
const PLANET_RADII: Record<string, number> = {
  mars: 0.15,
  jupiter: 0.4,
  saturn: 0.35,
  uranus: 0.25,
  earth: 0.15,
  enceladus: 0.08,
  titania: 0.08,
};

// ── Heliocentric orbital radii (AU) for x/y positioning ──

const ORBIT_RADII_AU: Record<string, number> = {
  mars: 1.524,
  jupiter: 5.203,
  saturn: 9.537,
  uranus: 19.19,
  earth: 1.0,
};

// ── Helper functions ──

/** Convert AU z-height to scene z coordinate */
function zFromAU(zAU: number): number {
  // Exaggerate z by 10× for visibility (real inclinations are small)
  return zAU * AU_TO_SCENE * 10;
}

/**
 * Approximate planet x,y from orbital radius and ecliptic longitude.
 * Uses the latitude from the 3D data to estimate longitude position.
 */
function planetXY(
  planet: string,
  latDeg: number,
  index: number,
): { x: number; y: number } {
  const r = (ORBIT_RADII_AU[planet] ?? 5) * AU_TO_SCENE;
  // Space planets around the orbit so they're visible
  // Use longitude angles that spread them across the scene
  const angles = [
    Math.PI * 0.1,   // Mars: ~18°
    Math.PI * 0.35,  // Jupiter: ~63°
    Math.PI * 0.55,  // Saturn: ~99°
    Math.PI * 0.75,  // Uranus: ~135°
    Math.PI * 1.85,  // Earth: ~333°
  ];
  const angle = angles[index] ?? (index * Math.PI * 0.4);
  return {
    x: r * Math.cos(angle),
    y: r * Math.sin(angle),
  };
}

// ── Scene preparation functions ──

/** Prepare full solar-system route scene showing all 4 transfer legs with z-height */
export function prepareFullRouteScene(data: {
  transfers: Array<{
    leg: string;
    episode: number;
    departure: { planet: string; zHeightAU: number; latitudeDeg: number };
    arrival: { planet: string; zHeightAU: number; latitudeDeg: number };
  }>;
  planetaryZHeightsAtEpoch: Record<
    string,
    { planet: string; zHeightAU: number; latitudeDeg: number }
  >;
}): SceneData {
  const planetOrder = ["mars", "jupiter", "saturn", "uranus", "earth"];
  const planets: PlanetData[] = planetOrder.map((name, i) => {
    const pData = data.planetaryZHeightsAtEpoch[name];
    const { x, y } = planetXY(name, pData?.latitudeDeg ?? 0, i);
    return {
      name,
      x,
      y,
      z: zFromAU(pData?.zHeightAU ?? 0),
      color: PLANET_COLORS[name] ?? "#ffffff",
      radius: PLANET_RADII[name] ?? 0.15,
      label: name.charAt(0).toUpperCase() + name.slice(1),
    };
  });

  const transferArcs: TransferArcData[] = data.transfers.map((t) => {
    const fromPlanet = planets.find((p) => p.name === t.departure.planet)!;
    const toPlanet = planets.find((p) => p.name === t.arrival.planet)!;
    return {
      from: t.departure.planet,
      to: t.arrival.planet,
      fromPos: [fromPlanet.x, fromPlanet.y, fromPlanet.z],
      toPos: [toPlanet.x, toPlanet.y, toPlanet.z],
      episode: t.episode,
      color: EPISODE_COLORS[t.episode] ?? "#ffffff",
      label: t.leg,
    };
  });

  return {
    type: "full-route",
    title: "ケストレル号全航路 — 3D黄道面ビュー",
    description:
      "太陽系横断4レグの軌道遷移を3Dで表示。Z軸（黄道面からの高さ）を10倍誇張して表示。",
    planets,
    transferArcs,
    eclipticPlane: {
      type: "ecliptic",
      normal: [0, 0, 1],
      z: 0,
      color: "#334455",
      opacity: 0.15,
      label: "黄道面",
    },
  };
}

/** Prepare Saturn ring crossing scene (local Saturn-centric view) */
export function prepareSaturnScene(data: {
  saturnRingAnalysis: {
    ringPlaneNormal: [number, number, number];
    ringInnerKm: number;
    ringOuterKm: number;
    enceladusOrbitKm: number;
    approachFromJupiter: {
      approachAngleToDeg: number;
    };
  };
}): SceneData {
  const ring = data.saturnRingAnalysis;
  return {
    type: "saturn-ring",
    title: "土星リング面交差 — 3Dビュー",
    description:
      "木星からの接近軌道と土星リング面の関係。接近角9.3°（リング面にほぼ平行）。",
    planets: [
      {
        name: "saturn",
        x: 0,
        y: 0,
        z: 0,
        color: PLANET_COLORS.saturn,
        radius: 0.5,
        isCentral: true,
        label: "土星",
      },
      {
        name: "enceladus",
        x: 0,
        y: 0,
        z: 0,
        color: PLANET_COLORS.enceladus,
        radius: 0.08,
        orbitRadius: ring.enceladusOrbitKm,
        label: "エンケラドス",
      },
    ],
    transferArcs: [
      {
        from: "jupiter",
        to: "saturn",
        fromPos: [10, 2, 0],
        toPos: [0, 0, 0],
        episode: 2,
        color: EPISODE_COLORS[2],
        label: "木星→土星 接近軌道",
        approachAngleDeg: ring.approachFromJupiter.approachAngleToDeg,
      },
    ],
    rings: [
      {
        innerRadius: ring.ringInnerKm,
        outerRadius: ring.ringOuterKm,
        normal: ring.ringPlaneNormal as [number, number, number],
        color: "#c8a86e",
        opacity: 0.3,
      },
    ],
  };
}

/** Prepare Uranus approach scene (local Uranus-centric view) */
export function prepareUranusScene(data: {
  uranusApproachAnalysis: {
    spinAxis: [number, number, number];
    obliquityDeg: number;
    titaniaOrbitKm: number;
    ringOuterKm: number;
    approachFromSaturn: { angleToDeg: number };
    approachFromUranus: { angleToDeg: number };
  };
}): SceneData {
  const u = data.uranusApproachAnalysis;
  // Equatorial plane normal = spin axis
  const spinAxis = u.spinAxis as [number, number, number];
  return {
    type: "uranus-approach",
    title: "天王星接近 — 3Dビュー",
    description:
      "天王星の97.77°軸傾斜と赤道面の関係。土星からの接近角25.3°、地球への離脱角14.3°。",
    planets: [
      {
        name: "uranus",
        x: 0,
        y: 0,
        z: 0,
        color: PLANET_COLORS.uranus,
        radius: 0.4,
        isCentral: true,
        label: "天王星",
      },
      {
        name: "titania",
        x: 0,
        y: 0,
        z: 0,
        color: PLANET_COLORS.titania,
        radius: 0.08,
        orbitRadius: u.titaniaOrbitKm,
        label: "タイタニア",
      },
    ],
    transferArcs: [
      {
        from: "saturn",
        to: "uranus",
        fromPos: [10, 3, 0],
        toPos: [0, 0, 0],
        episode: 3,
        color: EPISODE_COLORS[3],
        label: "土星→天王星 接近",
        approachAngleDeg: u.approachFromSaturn.angleToDeg,
      },
      {
        from: "uranus",
        to: "earth",
        fromPos: [0, 0, 0],
        toPos: [-8, -4, 0],
        episode: 5,
        color: EPISODE_COLORS[5],
        label: "天王星→地球 離脱",
        approachAngleDeg: u.approachFromUranus.angleToDeg,
      },
    ],
    rings: [
      {
        innerRadius: 37850, // Uranus ring inner ~6 ring
        outerRadius: u.ringOuterKm,
        normal: spinAxis,
        color: "#556677",
        opacity: 0.2,
      },
    ],
    axes: [
      {
        type: "spin",
        direction: spinAxis,
        label: "天王星自転軸 (97.77°)",
        color: "#7ec8e3",
      },
    ],
    planes: [
      {
        type: "equatorial",
        normal: spinAxis,
        tiltDeg: u.obliquityDeg,
        color: "#7ec8e3",
        opacity: 0.12,
        label: "天王星赤道面",
      },
    ],
  };
}
