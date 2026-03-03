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

export interface TimelineTransfer {
  /** Start time in days from mission start */
  startDay: number;
  /** End time in days from mission start */
  endDay: number;
  /** Episode number */
  episode: number;
  /** Label */
  label: string;
  /** Departure planet name */
  from: string;
  /** Arrival planet name */
  to: string;
}

export interface TimelineOrbit {
  /** Planet name */
  name: string;
  /** Orbital radius in scene units */
  radiusScene: number;
  /** Initial angle at mission start (radians) */
  initialAngle: number;
  /** Mean angular velocity (radians per day) */
  meanMotionPerDay: number;
  /** Z position in scene units */
  z: number;
}

/** Ship parking orbit at a destination between transfer legs */
export interface ParkingOrbit {
  /** Planet name the ship orbits */
  planet: string;
  /** Start day of parking orbit */
  startDay: number;
  /** End day of parking orbit */
  endDay: number;
  /** Orbital radius in scene units (visual only, not physical) */
  radiusScene: number;
  /** Angular velocity in radians per day (visual orbit speed) */
  angularVelocityPerDay: number;
}

export interface TimelineData {
  /** Total mission duration in days */
  totalDays: number;
  /** Planet orbits for animation */
  orbits: TimelineOrbit[];
  /** Transfer legs with start/end times */
  transfers: TimelineTransfer[];
  /** Ship parking orbits between transfer legs */
  parkingOrbits?: ParkingOrbit[];
}

export interface OrbitCircleData {
  /** Planet name */
  name: string;
  /** Radius in scene units */
  radiusScene: number;
  /** Display color */
  color: string;
  /** Z offset in scene units */
  z: number;
}

export type ViewMode = "inertial" | "ship";

/** Per-transfer 3D analysis summary (for info panel) */
export interface TransferSummaryItem {
  leg: string;
  outOfPlaneDistanceAU: number;
  planeChangeFractionPercent: number;
}

export interface SceneData {
  type: "full-route" | "saturn-ring" | "uranus-approach" | `episode-${number}`;
  title: string;
  description: string;
  planets: PlanetData[];
  transferArcs: TransferArcData[];
  eclipticPlane?: PlaneData;
  rings?: RingData[];
  axes?: AxisData[];
  planes?: PlaneData[];
  /** Orbital path circles for planets */
  orbitCircles?: OrbitCircleData[];
  /** Available view modes */
  supportedViewModes?: ViewMode[];
  /** Timeline data for animation */
  timeline?: TimelineData;
  /** Per-transfer 3D analysis summary for info panel */
  transferSummary?: TransferSummaryItem[];
}

// ── Constants ──

/** Conversion factor: 1 AU = this many scene units */
export const AU_TO_SCENE = 5;

/** Conversion factor for local scenes: 1 scene unit = this many km */
export const LOCAL_SCENE_SCALE = 50_000;

/** Moon orbital periods in days */
const MOON_PERIODS_DAYS: Record<string, number> = {
  enceladus: 1.370218,
  titania: 8.705872,
};

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

/** Orbital periods in days (sidereal) */
const ORBITAL_PERIODS_DAYS: Record<string, number> = {
  mars: 686.97,
  jupiter: 4332.59,
  saturn: 10759.22,
  uranus: 30688.5,
  earth: 365.256,
};

/** Mean motion in radians per day */
export function meanMotionPerDay(planet: string): number {
  const period = ORBITAL_PERIODS_DAYS[planet];
  if (!period) return 0;
  return (2 * Math.PI) / period;
}

// ── Geometry helpers (pure math, no Three.js dependency) ──
// These functions work with [x, y, z] tuples in Three.js Y-up convention:
//   X, Z = ecliptic plane;  Y = ecliptic height

type Vec3 = [number, number, number];

/**
 * Compute a Bezier control point for a heliocentric transfer arc.
 * Places the control at the angular midpoint (around the Sun at origin)
 * at the average orbital radius, with a small Y bump for depth.
 */
export function arcControlPoint(from: Vec3, to: Vec3): Vec3 {
  const fromAngle = Math.atan2(from[2], from[0]);
  const toAngle = Math.atan2(to[2], to[0]);

  let dAngle = toAngle - fromAngle;
  if (dAngle > Math.PI) dAngle -= 2 * Math.PI;
  if (dAngle < -Math.PI) dAngle += 2 * Math.PI;
  const midAngle = fromAngle + dAngle * 0.5;

  const fromR = Math.sqrt(from[0] * from[0] + from[2] * from[2]);
  const toR = Math.sqrt(to[0] * to[0] + to[2] * to[2]);
  const midR = (fromR + toR) / 2;

  const cx = midR * Math.cos(midAngle);
  const cz = midR * Math.sin(midAngle);

  const midY = (from[1] + to[1]) / 2;
  const dist = Math.sqrt(
    (to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2 + (to[2] - from[2]) ** 2,
  );
  const yBump = dist * 0.08;

  return [cx, midY + yBump, cz];
}

/**
 * Compute a Bezier control point for local (planet-centric) scenes.
 * Offsets the midpoint laterally (perpendicular to approach direction)
 * to suggest a flyby trajectory.
 */
export function arcControlPointLocal(from: Vec3, to: Vec3): Vec3 {
  const mid: Vec3 = [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
    (from[2] + to[2]) / 2,
  ];
  const dist = Math.sqrt(
    (to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2 + (to[2] - from[2]) ** 2,
  );

  // Approach direction
  const ax = (to[0] - from[0]) / dist;
  const ay = (to[1] - from[1]) / dist;
  const az = (to[2] - from[2]) / dist;

  // Lateral = cross(approach, Y-up)
  // cross([ax,ay,az], [0,1,0]) = [az, 0, -ax] (unnormalized; normalize)
  const lx = az;
  const lz = -ax;
  const lLen = Math.sqrt(lx * lx + lz * lz) || 1;

  mid[0] += (lx / lLen) * dist * 0.2;
  mid[2] += (lz / lLen) * dist * 0.2;
  mid[1] += dist * 0.08;

  return mid;
}

/**
 * Offset a point away from a planet center along the transfer direction.
 * Returns a new position displaced by 1.5× the display radius.
 */
export function offsetFromPlanet(
  point: Vec3,
  otherPoint: Vec3,
  planetName: string,
  sceneType: string,
): Vec3 {
  const isLocal = sceneType !== "full-route";
  const baseRadius = PLANET_RADII[planetName] ?? 0.15;
  const displayRadius = isLocal ? baseRadius : baseRadius * 3;
  const offset = displayRadius * 1.5;

  const dx = otherPoint[0] - point[0];
  const dy = otherPoint[1] - point[1];
  const dz = otherPoint[2] - point[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

  return [
    point[0] + (dx / dist) * offset,
    point[1] + (dy / dist) * offset,
    point[2] + (dz / dist) * offset,
  ];
}

// ── Helper functions ──

/** Convert AU z-height to scene z coordinate */
function zFromAU(zAU: number): number {
  // Exaggerate z by 3× for visibility without distorting orbital planes
  return zAU * AU_TO_SCENE * 3;
}

/** Fallback angles when ecliptic longitudes are not provided */
const FALLBACK_ANGLES = [
  Math.PI * 0.1,   // Mars: ~18°
  Math.PI * 0.35,  // Jupiter: ~63°
  Math.PI * 0.55,  // Saturn: ~99°
  Math.PI * 0.75,  // Uranus: ~135°
  Math.PI * 1.85,  // Earth: ~333°
];

/**
 * Compute planet x,y from orbital radius and ecliptic longitude.
 * Uses eclipticLongitudeRad from 3D analysis data when available,
 * falls back to visual layout angles.
 */
function planetXY(
  planet: string,
  eclipticLongitudeRad: number | undefined,
  index: number,
): { x: number; y: number; angle: number } {
  const r = (ORBIT_RADII_AU[planet] ?? 5) * AU_TO_SCENE;
  const angle = eclipticLongitudeRad ?? FALLBACK_ANGLES[index] ?? (index * Math.PI * 0.4);
  return {
    x: r * Math.cos(angle),
    y: r * Math.sin(angle),
    angle,
  };
}

/**
 * Compute planet XYZ position at a given time offset from mission start.
 * Returns [x, y, z] in scene coordinates.
 */
export function planetPositionAtTime(
  orbit: TimelineOrbit,
  daysSinceStart: number,
): [number, number, number] {
  const angle = orbit.initialAngle + orbit.meanMotionPerDay * daysSinceStart;
  const x = orbit.radiusScene * Math.cos(angle);
  const y = orbit.radiusScene * Math.sin(angle);
  return [x, y, orbit.z];
}

/**
 * Format days into human-readable Japanese string.
 */
export function formatDaysJa(days: number): string {
  if (days < 1) {
    const hours = Math.round(days * 24);
    return `${hours}時間`;
  }
  if (days < 30) {
    const d = Math.floor(days);
    const h = Math.round((days - d) * 24);
    if (h === 0) return `${d}日`;
    return `${d}日${h}時間`;
  }
  return `${Math.round(days)}日`;
}

// ── Scene preparation functions ──

/** Prepare full solar-system route scene showing all 4 transfer legs with z-height */
export function prepareFullRouteScene(data: {
  transfers: Array<{
    leg: string;
    episode: number;
    departure: { planet: string; jd: number; zHeightAU: number; latitudeDeg: number };
    arrival: { planet: string; jd: number; zHeightAU: number; latitudeDeg: number };
    outOfPlaneDistanceAU?: number;
    planeChangeFractionPercent?: number;
  }>;
  planetaryZHeightsAtEpoch: Record<
    string,
    { planet: string; zHeightAU: number; latitudeDeg: number; eclipticLongitudeRad?: number }
  >;
  /** Ecliptic longitudes at mission start (common epoch) for animation initial angles.
   * When provided, overrides eclipticLongitudeRad for animation timing accuracy. */
  planetLongitudesAtMissionStart?: Record<string, number>;
}): SceneData {
  const planetOrder = ["mars", "jupiter", "saturn", "uranus", "earth"];

  // Use mission-start longitudes if available; fall back to per-event longitudes
  const missionStartAngles = data.planetLongitudesAtMissionStart;

  const planets: PlanetData[] = planetOrder.map((name, i) => {
    const pData = data.planetaryZHeightsAtEpoch[name];
    // For initial display, use mission-start angle (matches animation day 0)
    const startLon = missionStartAngles?.[name] ?? pData?.eclipticLongitudeRad;
    const { x, y } = planetXY(name, startLon, i);
    return {
      name,
      x,
      y,
      z: zFromAU(pData?.zHeightAU ?? 0),
      color: PLANET_COLORS[name] ?? "#ffffff",
      radius: PLANET_RADII[name] ?? 0.15,
      label: PLANET_LABELS[name] ?? name,
    };
  });

  // Build timeline data from transfer JD dates (needed for arc positioning)
  const firstJd = data.transfers[0]?.departure.jd ?? 0;
  const lastJd =
    data.transfers[data.transfers.length - 1]?.arrival.jd ?? firstJd;
  const totalDays = lastJd - firstJd;

  const timelineOrbits: TimelineOrbit[] = planetOrder.map((name, i) => {
    const pData = data.planetaryZHeightsAtEpoch[name];
    // initialAngle from mission-start for correct animation propagation
    const startLon = missionStartAngles?.[name] ?? pData?.eclipticLongitudeRad;
    const { angle } = planetXY(name, startLon, i);
    return {
      name,
      radiusScene: (ORBIT_RADII_AU[name] ?? 5) * AU_TO_SCENE,
      initialAngle: angle,
      meanMotionPerDay: meanMotionPerDay(name),
      z: zFromAU(pData?.zHeightAU ?? 0),
    };
  });

  // Transfer arcs: use planet positions at actual departure/arrival times
  const transferArcs: TransferArcData[] = data.transfers.map((t) => {
    const depDay = t.departure.jd - firstJd;
    const arrDay = t.arrival.jd - firstJd;
    const fromOrbit = timelineOrbits.find((o) => o.name === t.departure.planet);
    const toOrbit = timelineOrbits.find((o) => o.name === t.arrival.planet);
    let fromPos: [number, number, number];
    let toPos: [number, number, number];
    if (fromOrbit) {
      fromPos = planetPositionAtTime(fromOrbit, depDay);
    } else {
      const fp = planets.find((p) => p.name === t.departure.planet)!;
      fromPos = [fp.x, fp.y, fp.z];
    }
    if (toOrbit) {
      toPos = planetPositionAtTime(toOrbit, arrDay);
    } else {
      const tp = planets.find((p) => p.name === t.arrival.planet)!;
      toPos = [tp.x, tp.y, tp.z];
    }
    return {
      from: t.departure.planet,
      to: t.arrival.planet,
      fromPos,
      toPos,
      episode: t.episode,
      color: EPISODE_COLORS[t.episode] ?? "#ffffff",
      label: t.leg,
    };
  });

  const timelineTransfers: TimelineTransfer[] = data.transfers.map((t) => ({
    startDay: t.departure.jd - firstJd,
    endDay: t.arrival.jd - firstJd,
    episode: t.episode,
    label: t.leg,
    from: t.departure.planet,
    to: t.arrival.planet,
  }));

  // Generate parking orbits between transfer legs and after final arrival
  const parkingOrbits: ParkingOrbit[] = [];
  for (let i = 0; i < timelineTransfers.length; i++) {
    const t = timelineTransfers[i];
    const nextStart = i + 1 < timelineTransfers.length
      ? timelineTransfers[i + 1].startDay
      : totalDays;
    const gap = nextStart - t.endDay;
    if (gap > 0.01) {
      // Planet display radius * 3 (full-route scale) * 2 for visible orbit
      const planetRadius = (PLANET_RADII[t.to] ?? 0.15) * 3;
      const orbitRadius = planetRadius * 2;
      // Angular velocity: complete 2-3 orbits during the parking period
      const numOrbits = Math.min(3, Math.max(2, gap * 0.5));
      parkingOrbits.push({
        planet: t.to,
        startDay: t.endDay,
        endDay: nextStart,
        radiusScene: orbitRadius,
        angularVelocityPerDay: (numOrbits * 2 * Math.PI) / gap,
      });
    }
  }

  const timeline: TimelineData = {
    totalDays,
    orbits: timelineOrbits,
    transfers: timelineTransfers,
    parkingOrbits: parkingOrbits.length > 0 ? parkingOrbits : undefined,
  };

  // Orbit circles for planetary paths
  const orbitCircles: OrbitCircleData[] = planetOrder.map((name, i) => {
    const pData = data.planetaryZHeightsAtEpoch[name];
    return {
      name,
      radiusScene: (ORBIT_RADII_AU[name] ?? 5) * AU_TO_SCENE,
      color: PLANET_COLORS[name] ?? "#ffffff",
      z: zFromAU(pData?.zHeightAU ?? 0),
    };
  });

  // Build transfer summary for info panel
  const transferSummary: TransferSummaryItem[] = data.transfers
    .filter((t) => t.outOfPlaneDistanceAU !== undefined)
    .map((t) => ({
      leg: t.leg,
      outOfPlaneDistanceAU: t.outOfPlaneDistanceAU!,
      planeChangeFractionPercent: t.planeChangeFractionPercent ?? 0,
    }));

  return {
    type: "full-route",
    title: "ケストレル号全航路 — 3D黄道面ビュー",
    description:
      "太陽系横断4レグの軌道遷移を3Dで表示。Z軸（黄道面からの高さ）を3倍誇張して表示。",
    planets,
    transferArcs,
    orbitCircles,
    supportedViewModes: ["inertial", "ship"],
    eclipticPlane: {
      type: "ecliptic",
      normal: [0, 0, 1],
      z: 0,
      color: "#334455",
      opacity: 0.15,
      label: "黄道面",
    },
    timeline,
    transferSummary: transferSummary.length > 0 ? transferSummary : undefined,
  };
}

const EPISODE_TITLES: Record<number, string> = {
  1: "EP01: 火星→木星（ガニメデ）72h brachistochrone",
  2: "EP02: 木星→土星 87日 trim-thrust遷移",
  3: "EP03: 土星→天王星 143h brachistochrone",
  4: "EP04: 天王星→地球 507h複合航路",
};

/** Episode labels */
const PLANET_LABELS: Record<string, string> = {
  mars: "火星",
  jupiter: "木星",
  saturn: "土星",
  uranus: "天王星",
  earth: "地球",
};

/**
 * Prepare a per-episode scene showing only the transfer for that episode.
 * Uses the same data as prepareFullRouteScene but filters to one transfer leg.
 * Falls back to full-route scene if the episode has no matching transfer.
 */
export function prepareEpisodeScene(data: {
  transfers: Array<{
    leg: string;
    episode: number;
    departure: { planet: string; jd: number; zHeightAU: number; latitudeDeg: number; eclipticLongitudeRad?: number };
    arrival: { planet: string; jd: number; zHeightAU: number; latitudeDeg: number; eclipticLongitudeRad?: number };
    outOfPlaneDistanceAU?: number;
    planeChangeFractionPercent?: number;
  }>;
  planetaryZHeightsAtEpoch: Record<
    string,
    { planet: string; zHeightAU: number; latitudeDeg: number; eclipticLongitudeRad?: number }
  >;
  planetLongitudesAtMissionStart?: Record<string, number>;
}, episode: number): SceneData {
  // Find the transfer for this episode
  const transfer = data.transfers.find(t => t.episode === episode);
  if (!transfer) {
    // Fallback to full route
    return prepareFullRouteScene(data);
  }

  // Determine which planets to show: departure, arrival, plus neighbors for context
  const depPlanet = transfer.departure.planet;
  const arrPlanet = transfer.arrival.planet;
  const allPlanets = ["mars", "jupiter", "saturn", "uranus", "earth"];
  const depIdx = allPlanets.indexOf(depPlanet);
  const arrIdx = allPlanets.indexOf(arrPlanet);
  // Show planets between departure and arrival, plus one on each side for context
  const minIdx = Math.max(0, Math.min(depIdx, arrIdx) - 1);
  const maxIdx = Math.min(allPlanets.length - 1, Math.max(depIdx, arrIdx) + 1);
  const visiblePlanets = allPlanets.slice(minIdx, maxIdx + 1);

  const missionStartAngles = data.planetLongitudesAtMissionStart;
  const firstJd = data.transfers[0]?.departure.jd ?? 0;

  const planets: PlanetData[] = visiblePlanets.map((name, i) => {
    const pData = data.planetaryZHeightsAtEpoch[name];
    const startLon = missionStartAngles?.[name] ?? pData?.eclipticLongitudeRad;
    const { x, y } = planetXY(name, startLon, allPlanets.indexOf(name));
    return {
      name,
      x,
      y,
      z: zFromAU(pData?.zHeightAU ?? 0),
      color: PLANET_COLORS[name] ?? "#ffffff",
      radius: PLANET_RADII[name] ?? 0.15,
      label: PLANET_LABELS[name] ?? name,
    };
  });

  // Timeline orbits for visible planets
  const timelineOrbits: TimelineOrbit[] = visiblePlanets.map((name) => {
    const pData = data.planetaryZHeightsAtEpoch[name];
    const startLon = missionStartAngles?.[name] ?? pData?.eclipticLongitudeRad;
    const { angle } = planetXY(name, startLon, allPlanets.indexOf(name));
    return {
      name,
      radiusScene: (ORBIT_RADII_AU[name] ?? 5) * AU_TO_SCENE,
      initialAngle: angle,
      meanMotionPerDay: meanMotionPerDay(name),
      z: zFromAU(pData?.zHeightAU ?? 0),
    };
  });

  // Transfer arc
  const depDay = transfer.departure.jd - firstJd;
  const arrDay = transfer.arrival.jd - firstJd;
  const fromOrbit = timelineOrbits.find(o => o.name === depPlanet);
  const toOrbit = timelineOrbits.find(o => o.name === arrPlanet);
  const fromPos: [number, number, number] = fromOrbit
    ? planetPositionAtTime(fromOrbit, depDay)
    : [planets.find(p => p.name === depPlanet)!.x, planets.find(p => p.name === depPlanet)!.y, planets.find(p => p.name === depPlanet)!.z];
  const toPos: [number, number, number] = toOrbit
    ? planetPositionAtTime(toOrbit, arrDay)
    : [planets.find(p => p.name === arrPlanet)!.x, planets.find(p => p.name === arrPlanet)!.y, planets.find(p => p.name === arrPlanet)!.z];

  const transferArcs: TransferArcData[] = [{
    from: depPlanet,
    to: arrPlanet,
    fromPos,
    toPos,
    episode,
    color: EPISODE_COLORS[episode] ?? "#ffffff",
    label: transfer.leg,
  }];

  const totalDays = arrDay - depDay;
  const timelineTransfers: TimelineTransfer[] = [{
    startDay: 0,
    endDay: totalDays,
    episode,
    label: transfer.leg,
    from: depPlanet,
    to: arrPlanet,
  }];

  // Adjust timeline orbits so day=0 corresponds to the episode's departure
  const adjustedOrbits: TimelineOrbit[] = timelineOrbits.map(o => ({
    ...o,
    // Advance initial angle by depDay to set day 0 at episode departure
    initialAngle: o.initialAngle + o.meanMotionPerDay * depDay,
  }));

  const timeline: TimelineData = {
    totalDays,
    orbits: adjustedOrbits,
    transfers: timelineTransfers,
  };

  const orbitCircles: OrbitCircleData[] = visiblePlanets.map((name) => {
    const pData = data.planetaryZHeightsAtEpoch[name];
    return {
      name,
      radiusScene: (ORBIT_RADII_AU[name] ?? 5) * AU_TO_SCENE,
      color: PLANET_COLORS[name] ?? "#ffffff",
      z: zFromAU(pData?.zHeightAU ?? 0),
    };
  });

  const summary: TransferSummaryItem[] = transfer.outOfPlaneDistanceAU !== undefined
    ? [{ leg: transfer.leg, outOfPlaneDistanceAU: transfer.outOfPlaneDistanceAU!, planeChangeFractionPercent: transfer.planeChangeFractionPercent ?? 0 }]
    : [];

  return {
    type: `episode-${episode}`,
    title: EPISODE_TITLES[episode] ?? `EP0${episode}`,
    description: `${PLANET_LABELS[depPlanet] ?? depPlanet}から${PLANET_LABELS[arrPlanet] ?? arrPlanet}への遷移を3Dで表示。`,
    planets,
    transferArcs,
    orbitCircles,
    supportedViewModes: ["inertial", "ship"],
    eclipticPlane: {
      type: "ecliptic",
      normal: [0, 0, 1],
      z: 0,
      color: "#334455",
      opacity: 0.15,
      label: "黄道面",
    },
    timeline,
    transferSummary: summary.length > 0 ? summary : undefined,
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
    supportedViewModes: ["inertial", "ship"],
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
      (() => {
        const moonAngle = Math.PI / 4; // 45° for visual separation
        const sceneR = ring.enceladusOrbitKm / LOCAL_SCENE_SCALE;
        return {
          name: "enceladus",
          x: sceneR * Math.cos(moonAngle),
          y: sceneR * Math.sin(moonAngle),
          z: 0,
          color: PLANET_COLORS.enceladus,
          radius: 0.08,
          orbitRadius: ring.enceladusOrbitKm,
          label: "エンケラドス",
        };
      })(),
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
    timeline: {
      totalDays: MOON_PERIODS_DAYS.enceladus * 3,
      orbits: [
        {
          name: "enceladus",
          radiusScene: ring.enceladusOrbitKm / LOCAL_SCENE_SCALE,
          initialAngle: Math.PI / 4,
          meanMotionPerDay: (2 * Math.PI) / MOON_PERIODS_DAYS.enceladus,
          z: 0,
        },
      ],
      transfers: [
        {
          startDay: 0,
          endDay: MOON_PERIODS_DAYS.enceladus,
          episode: 2,
          label: "木星→土星 接近",
          from: "jupiter",
          to: "saturn",
        },
      ],
    },
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
    supportedViewModes: ["inertial", "ship"],
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
      (() => {
        const moonAngle = Math.PI / 4; // 45° for visual separation
        const sceneR = u.titaniaOrbitKm / LOCAL_SCENE_SCALE;
        return {
          name: "titania",
          x: sceneR * Math.cos(moonAngle),
          y: sceneR * Math.sin(moonAngle),
          z: 0,
          color: PLANET_COLORS.titania,
          radius: 0.08,
          orbitRadius: u.titaniaOrbitKm,
          label: "タイタニア",
        };
      })(),
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
    timeline: {
      totalDays: MOON_PERIODS_DAYS.titania * 3,
      orbits: [
        {
          name: "titania",
          radiusScene: u.titaniaOrbitKm / LOCAL_SCENE_SCALE,
          initialAngle: Math.PI / 4,
          meanMotionPerDay: (2 * Math.PI) / MOON_PERIODS_DAYS.titania,
          z: 0,
        },
      ],
      transfers: [
        {
          startDay: 0,
          endDay: MOON_PERIODS_DAYS.titania,
          episode: 3,
          label: "土星→天王星 接近",
          from: "saturn",
          to: "uranus",
        },
      ],
    },
  };
}
