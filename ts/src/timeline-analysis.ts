/**
 * Timeline analysis for SOLAR LINE episodes.
 *
 * Computes consistent solar system dates for each transfer across all episodes
 * by finding planetary configurations that make each transfer feasible.
 *
 * The story depicts a sequential journey:
 *   EP01: Mars → Ganymede (72h)
 *   EP02: Jupiter sphere → Saturn/Enceladus (~87 days with trim thrust)
 *   EP03: Enceladus → Titania (143h)
 *   EP04-05: Titania → Earth
 *
 * We find dates where the planetary positions allow each transfer.
 */

import {
  type PlanetName,
  J2000_JD,
  calendarToJD,
  jdToDateString,
  planetPosition,
  planetLongitude,
  phaseAngle,
  hohmannPhaseAngle,
  hohmannTransferTime,
  nextHohmannWindow,
  elapsedDays,
  elapsedHours,
} from "./ephemeris.ts";
import { ORBIT_RADIUS, MU, brachistochroneAccel } from "./orbital.ts";

/** Timeline event for a single transfer */
export interface TimelineEvent {
  /** Episode number */
  episode: number;
  /** Transfer ID (e.g. "ep01-transfer-01") */
  transferId: string;
  /** Brief description */
  description: string;
  /** Departure Julian Date */
  departureJD: number;
  /** Departure date string */
  departureDate: string;
  /** Arrival Julian Date */
  arrivalJD: number;
  /** Arrival date string */
  arrivalDate: string;
  /** Transfer duration in hours */
  durationHours: number;
  /** Departure planet/body */
  departurePlanet: PlanetName;
  /** Arrival planet/body */
  arrivalPlanet: PlanetName;
  /** Departure planet longitude (radians) at departure time */
  departureLongitude: number;
  /** Arrival planet longitude (radians) at arrival time */
  arrivalLongitude: number;
  /** Phase angle at departure (radians) */
  phaseAngleAtDeparture: number;
  /** Notes about this timeline event */
  notes: string;
}

/** Complete timeline across all episodes */
export interface StoryTimeline {
  /** Search epoch description */
  searchEpoch: string;
  /** Timeline events in chronological order */
  events: TimelineEvent[];
  /** Total journey duration in days */
  totalDurationDays: number;
  /** Consistency notes */
  consistencyNotes: string[];
}

/**
 * EP01: Mars → Jupiter/Ganymede
 * Brachistochrone transfer, 72h depicted, 150h "normal" route.
 * We use this as our first timeline anchor: find a date when Mars and Jupiter
 * are positioned to allow a fast transfer.
 *
 * For brachistochrone, the phase angle is less constrained than Hohmann since
 * the ship can steer, but we still need reasonable proximity.
 */
function findEP01Departure(searchStartJD: number): TimelineEvent {
  // For brachistochrone, Mars-Jupiter distance determines feasibility.
  // Look for a period when Mars and Jupiter are within 90° (closest approach range).
  // The actual distance varies: opposition ≈ 4.2 AU, conjunction ≈ 6.4 AU.
  // 72h brachistochrone is more feasible at closer distances.

  const step = 1.0; // days
  const searchDays = 800; // > synodic period of Mars-Jupiter (~816 days)
  let bestJD = searchStartJD;
  let bestDist = Infinity;

  for (let jd = searchStartJD; jd < searchStartJD + searchDays; jd += step) {
    const marsPos = planetPosition("mars", jd);
    const jupPos = planetPosition("jupiter", jd);
    const dx = marsPos.x - jupPos.x;
    const dy = marsPos.y - jupPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) {
      bestDist = dist;
      bestJD = jd;
    }
  }

  // Refine to 0.01-day precision
  let lo = bestJD - 5;
  let hi = bestJD + 5;
  for (let i = 0; i < 30; i++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    const d1 = (() => {
      const mp = planetPosition("mars", m1);
      const jp = planetPosition("jupiter", m1);
      return Math.sqrt((mp.x - jp.x) ** 2 + (mp.y - jp.y) ** 2);
    })();
    const d2 = (() => {
      const mp = planetPosition("mars", m2);
      const jp = planetPosition("jupiter", m2);
      return Math.sqrt((mp.x - jp.x) ** 2 + (mp.y - jp.y) ** 2);
    })();
    if (d1 < d2) {
      hi = m2;
    } else {
      lo = m1;
    }
  }

  const departureJD = (lo + hi) / 2;
  const durationHours = 72;
  const arrivalJD = departureJD + durationHours / 24;

  const marsLon = planetLongitude("mars", departureJD);
  const jupLon = planetLongitude("jupiter", arrivalJD);
  const phase = phaseAngle("mars", "jupiter", departureJD);

  const marsPos = planetPosition("mars", departureJD);
  const jupPos = planetPosition("jupiter", departureJD);
  const distKm = Math.sqrt(
    (marsPos.x - jupPos.x) ** 2 + (marsPos.y - jupPos.y) ** 2,
  );

  return {
    episode: 1,
    transferId: "ep01-transfer-03",
    description: "Mars → Ganymede (brachistochrone, 72h deadline)",
    departureJD,
    departureDate: jdToDateString(departureJD),
    arrivalJD,
    arrivalDate: jdToDateString(arrivalJD),
    durationHours,
    departurePlanet: "mars",
    arrivalPlanet: "jupiter",
    departureLongitude: marsLon,
    arrivalLongitude: jupLon,
    phaseAngleAtDeparture: phase,
    notes: `火星-木星最接近付近 (距離: ${(distKm / 149_597_870.7).toFixed(2)} AU)`,
  };
}

/**
 * EP02: Jupiter sphere → Saturn/Enceladus
 * With trim thrust (1% capacity, ~3 days), transfer takes ~87 days.
 *
 * Previous estimate of ~455 days was based on average-velocity over radial distance,
 * which doesn't account for orbital curvature. Proper 2D orbit propagation shows:
 * - Pure ballistic: ~997 days (not 455)
 * - 3-day trim thrust: ~87 days (primary scenario)
 * - 7-day trim thrust: ~41 days (fast variant)
 *
 * The dialogue says "トリムのみ" (trim only), which is the canonical justification
 * for the thrust-assisted transfer. Propellant cost is negligible (~0.86%).
 */
function findEP02Arrival(ep01ArrivalJD: number): TimelineEvent {
  // After some time at Jupiter (assume a few days for the episode events)
  const jupiterStayDays = 3; // story events at Jupiter
  const departureJD = ep01ArrivalJD + jupiterStayDays;

  // ~87 days with 3-day trim thrust (corrected from flawed 455-day estimate)
  const transferDays = 87;
  const arrivalJD = departureJD + transferDays;

  const jupLon = planetLongitude("jupiter", departureJD);
  const satLon = planetLongitude("saturn", arrivalJD);
  const phase = phaseAngle("jupiter", "saturn", departureJD);

  return {
    episode: 2,
    transferId: "ep02-transfer-03",
    description:
      "木星圏脱出 → 土星/エンケラドス (トリム推力3日 + 弾道巡航, ~87日)",
    departureJD,
    departureDate: jdToDateString(departureJD),
    arrivalJD,
    arrivalDate: jdToDateString(arrivalJD),
    durationHours: transferDays * 24,
    departurePlanet: "jupiter",
    arrivalPlanet: "saturn",
    departureLongitude: jupLon,
    arrivalLongitude: satLon,
    phaseAngleAtDeparture: phase,
    notes:
      "トリム推力（1%出力）3日間で軌道エネルギーを付加後、弾道巡航。推進剤消費 ~0.86%。" +
      "旧推定値の455日は平均速度近似の計算誤差（正しい弾道値は~997日）。",
  };
}

/**
 * EP03: Enceladus (Saturn) → Titania (Uranus)
 * Brachistochrone, 143h depicted
 */
function findEP03Transfer(ep02ArrivalJD: number): TimelineEvent {
  // A few days at Saturn for story events
  const saturnStayDays = 2;
  const departureJD = ep02ArrivalJD + saturnStayDays;

  const durationHours = 143;
  const arrivalJD = departureJD + durationHours / 24;

  const satLon = planetLongitude("saturn", departureJD);
  const uraLon = planetLongitude("uranus", arrivalJD);
  const phase = phaseAngle("saturn", "uranus", departureJD);

  const satPos = planetPosition("saturn", departureJD);
  const uraPos = planetPosition("uranus", arrivalJD);
  const distKm = Math.sqrt(
    (satPos.x - uraPos.x) ** 2 + (satPos.y - uraPos.y) ** 2,
  );

  return {
    episode: 3,
    transferId: "ep03-transfer-03",
    description:
      "エンケラドス (土星) → ティタニア (天王星), brachistochrone 143h",
    departureJD,
    departureDate: jdToDateString(departureJD),
    arrivalJD,
    arrivalDate: jdToDateString(arrivalJD),
    durationHours,
    departurePlanet: "saturn",
    arrivalPlanet: "uranus",
    departureLongitude: satLon,
    arrivalLongitude: uraLon,
    phaseAngleAtDeparture: phase,
    notes: `土星-天王星距離: ${(distKm / 149_597_870.7).toFixed(2)} AU`,
  };
}

/**
 * EP04-05: Titania (Uranus) → Earth
 * Brachistochrone transfer, duration depends on mass assumption
 */
function findEP04Transfer(ep03ArrivalJD: number): TimelineEvent {
  // Events at Uranus: plasmoid encounter, fleet intercept, etc.
  const uranusStayDays = 2;
  const departureJD = ep03ArrivalJD + uranusStayDays;

  // At 300t: ~8.3 days; at 48,000t: ~105 days. Use ~8 days for the story pace
  const durationDays = 8.3;
  const durationHours = durationDays * 24;
  const arrivalJD = departureJD + durationDays;

  const uraLon = planetLongitude("uranus", departureJD);
  const earthLon = planetLongitude("earth", arrivalJD);
  const phase = phaseAngle("uranus", "earth", departureJD);

  const uraPos = planetPosition("uranus", departureJD);
  const earthPos = planetPosition("earth", arrivalJD);
  const distKm = Math.sqrt(
    (uraPos.x - earthPos.x) ** 2 + (uraPos.y - earthPos.y) ** 2,
  );

  return {
    episode: 4,
    transferId: "ep04-transfer-03",
    description:
      "ティタニア (天王星) → 地球, brachistochrone",
    departureJD,
    departureDate: jdToDateString(departureJD),
    arrivalJD,
    arrivalDate: jdToDateString(arrivalJD),
    durationHours,
    departurePlanet: "uranus",
    arrivalPlanet: "earth",
    departureLongitude: uraLon,
    arrivalLongitude: earthLon,
    phaseAngleAtDeparture: phase,
    notes: `天王星-地球距離: ${(distKm / 149_597_870.7).toFixed(2)} AU`,
  };
}

/**
 * Compute the full story timeline, searching forward from a given date.
 *
 * The timeline is anchored by EP01 (Mars-Jupiter closest approach).
 * For this SF series, we search for plausible configurations that
 * approximate the depicted timeline.
 */
export function computeTimeline(searchStartJD: number): StoryTimeline {
  const ep01 = findEP01Departure(searchStartJD);
  const ep02 = findEP02Arrival(ep01.arrivalJD);
  const ep03 = findEP03Transfer(ep02.arrivalJD);
  const ep04 = findEP04Transfer(ep03.arrivalJD);

  const events = [ep01, ep02, ep03, ep04];
  const totalDurationDays = elapsedDays(ep01.departureJD, ep04.arrivalJD);

  // Consistency checks
  const consistencyNotes: string[] = [];

  // Check Saturn-Uranus distance for EP03 feasibility
  const satPos = planetPosition("saturn", ep03.departureJD);
  const uraPos = planetPosition("uranus", ep03.arrivalJD);
  const satUraDist = Math.sqrt(
    (satPos.x - uraPos.x) ** 2 + (satPos.y - uraPos.y) ** 2,
  );
  const satUraAU = satUraDist / 149_597_870.7;
  const avgSatUraAU = (ORBIT_RADIUS.URANUS - ORBIT_RADIUS.SATURN) / 149_597_870.7;
  if (satUraAU < avgSatUraAU * 0.8) {
    consistencyNotes.push(
      `EP03: 土星-天王星距離 ${satUraAU.toFixed(1)} AU は平均 ${avgSatUraAU.toFixed(1)} AU より近い — 惑星配置として好都合`,
    );
  }

  // Check total journey time
  if (totalDurationDays > 100) {
    consistencyNotes.push(
      `全行程: ${totalDurationDays.toFixed(0)} 日 — EP02のトリム推力遷移(~87日)が主要因`,
    );
  }

  return {
    searchEpoch: jdToDateString(searchStartJD),
    events,
    totalDurationDays,
    consistencyNotes,
  };
}

/**
 * Search multiple epochs for the best timeline configuration.
 * Returns timelines for several Mars-Jupiter opposition epochs.
 */
export function searchMultipleEpochs(): StoryTimeline[] {
  // Mars-Jupiter oppositions occur roughly every 2.24 years (~816 days).
  // Search from 2200 to 2300 (reasonable SF timeframe)
  const startJD = calendarToJD(2200, 1, 1);
  const endJD = calendarToJD(2300, 1, 1);
  const step = 400; // days, roughly half a synodic period

  const timelines: StoryTimeline[] = [];

  for (let jd = startJD; jd < endJD; jd += step) {
    const tl = computeTimeline(jd);
    timelines.push(tl);
  }

  return timelines;
}

/**
 * Compute angular positions for orbital diagram at a specific timeline event.
 * Returns angles for all relevant planets at both departure and arrival.
 */
export function diagramAngles(
  event: TimelineEvent,
): Record<string, { departure: number; arrival: number }> {
  const planets: PlanetName[] = [
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "earth",
  ];
  const result: Record<string, { departure: number; arrival: number }> = {};

  for (const planet of planets) {
    result[planet] = {
      departure: planetLongitude(planet, event.departureJD),
      arrival: planetLongitude(planet, event.arrivalJD),
    };
  }

  return result;
}
