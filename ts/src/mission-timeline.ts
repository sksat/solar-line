/**
 * Mission Timeline Data Generation
 *
 * Computes multi-track time-series data spanning the full SOLAR LINE mission
 * (~124 days). Used for the cross-episode visual timeline visualization.
 *
 * Tracks:
 *   1. Distance from Sun (AU)
 *   2. Accumulated ΔV (km/s)
 *   3. Nozzle remaining life (h)
 *   4. Radiation dose (mSv)
 *
 * Data sources: timeline-analysis.ts, episode analysis modules, EPISODE_SUMMARIES
 */

import type { TimeSeriesChart, TimeSeriesRegion } from "./report-types.ts";

const AU_KM = 149_597_870.7;

/** Semi-major axes in AU for interpolation */
const BODY_AU: Record<string, number> = {
  mars: 227_939_200 / AU_KM, // 1.524
  jupiter: 778_570_000 / AU_KM, // 5.203
  saturn: 1_433_530_000 / AU_KM, // 9.583
  uranus: 2_872_460_000 / AU_KM, // 19.19
  earth: 149_598_023 / AU_KM, // 1.000
};

/**
 * Mission phase definition with timing and physical parameters.
 * Times are in days from mission start (T+0 = Mars departure).
 */
export interface MissionPhase {
  episode: number;
  label: string;
  startDay: number;
  endDay: number;
  departureBody: string;
  arrivalBody: string;
  deltaV: number; // km/s used during this phase
  nozzleBurnHours: number; // hours of nozzle burn time consumed
  radiationMSv: number; // radiation dose received during this phase
  color: string; // color for region band
}

/**
 * Canonical mission phases derived from episode analyses.
 *
 * Timeline (2241-09-05 to 2242-01-07, ~124 days):
 *   EP01: Day 0-3      Mars → Ganymede (72h brachistochrone)
 *   Stay: Day 3-6      Jupiter system events
 *   EP02: Day 6-93     Jupiter → Saturn/Enceladus (~87 days, trim thrust)
 *   Stay: Day 93-95    Saturn system events
 *   EP03: Day 95-101   Enceladus → Titania (143h brachistochrone)
 *   Stay: Day 101-103  Uranus system events (plasmoid encounter)
 *   EP04-05: Day 103-124  Titania → Earth (507h composite route @300t)
 */
export function getMissionPhases(): MissionPhase[] {
  return [
    {
      episode: 1,
      label: "EP01",
      startDay: 0,
      endDay: 3,
      departureBody: "mars",
      arrivalBody: "jupiter",
      deltaV: 8497,
      nozzleBurnHours: 72, // full brachistochrone burn
      radiationMSv: 0,
      color: "rgba(88,166,255,0.12)",
    },
    {
      episode: 2,
      label: "EP02",
      startDay: 6,
      endDay: 93,
      departureBody: "jupiter",
      arrivalBody: "saturn",
      deltaV: 85, // trim thrust only (~0.86% propellant)
      nozzleBurnHours: 0, // engine damaged, no continuous burn
      radiationMSv: 0,
      color: "rgba(63,185,80,0.12)",
    },
    {
      episode: 3,
      label: "EP03",
      startDay: 95,
      endDay: 101,
      departureBody: "saturn",
      arrivalBody: "uranus",
      deltaV: 11165,
      nozzleBurnHours: 143, // full brachistochrone burn (143h 12m)
      radiationMSv: 0,
      color: "rgba(255,102,0,0.12)",
    },
    {
      episode: 4,
      label: "EP04",
      startDay: 103,
      endDay: 111, // plasmoid encounter ~EP04, Uranus escape burn
      departureBody: "uranus",
      arrivalBody: "uranus", // departs Uranus at end of EP04
      deltaV: 1202, // Uranus escape ΔV @48,000t
      nozzleBurnHours: 0, // low-thrust escape, minimal nozzle usage
      radiationMSv: 480, // plasmoid 480 mSv
      color: "rgba(248,81,73,0.12)",
    },
    {
      episode: 5,
      label: "EP05",
      startDay: 111,
      endDay: 124, // 507h ≈ 21 days from Uranus departure
      departureBody: "uranus",
      arrivalBody: "earth",
      deltaV: 15207,
      nozzleBurnHours: 55.2, // ~55h12m nozzle burn (out of 55h38m remaining)
      radiationMSv: 0,
      color: "rgba(248,81,73,0.12)",
    },
  ];
}

/** Episode region bands for chart background shading */
export function getEpisodeRegions(): TimeSeriesRegion[] {
  const phases = getMissionPhases();
  return phases.map((p) => ({
    from: p.startDay,
    to: p.endDay,
    label: p.label,
    color: p.color,
  }));
}

/**
 * Linear interpolation of heliocentric distance during a transfer.
 * For brachistochrone, the actual trajectory curves, but linear
 * approximation is sufficient for the visualization scale.
 */
function interpolateDistance(
  startAU: number,
  endAU: number,
  fraction: number,
): number {
  return startAU + (endAU - startAU) * fraction;
}

/**
 * Generate the distance-from-Sun track.
 * Returns x (days) and y (AU) arrays.
 */
export function generateDistanceTrack(): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];
  const phases = getMissionPhases();

  // Mars departure
  x.push(0);
  y.push(BODY_AU.mars);

  // EP01: Mars → Jupiter (3 days)
  for (let d = 0.5; d <= 3; d += 0.5) {
    x.push(d);
    y.push(interpolateDistance(BODY_AU.mars, BODY_AU.jupiter, d / 3));
  }

  // Jupiter stay (days 3-6)
  x.push(6);
  y.push(BODY_AU.jupiter);

  // EP02: Jupiter → Saturn (~87 days, mostly ballistic)
  // Distance increases gradually as the ship moves outward
  const ep02Points = [10, 20, 30, 40, 50, 60, 70, 80, 90, 93];
  for (const d of ep02Points) {
    const frac = (d - 6) / (93 - 6);
    x.push(d);
    y.push(interpolateDistance(BODY_AU.jupiter, BODY_AU.saturn, frac));
  }

  // Saturn stay (days 93-95)
  x.push(95);
  y.push(BODY_AU.saturn);

  // EP03: Saturn → Uranus (6 days)
  for (let d = 96; d <= 101; d += 1) {
    x.push(d);
    y.push(
      interpolateDistance(
        BODY_AU.saturn,
        BODY_AU.uranus,
        (d - 95) / (101 - 95),
      ),
    );
  }

  // Uranus stay (days 101-103) + EP04 planning (103-111)
  x.push(103);
  y.push(BODY_AU.uranus);
  x.push(111);
  y.push(BODY_AU.uranus);

  // EP05: Uranus → Earth (21 days)
  const ep05Points = [113, 115, 117, 119, 121, 123, 124];
  for (const d of ep05Points) {
    const frac = (d - 111) / (124 - 111);
    x.push(d);
    y.push(interpolateDistance(BODY_AU.uranus, BODY_AU.earth, frac));
  }

  return { x, y };
}

/**
 * Generate the accumulated ΔV track.
 * ΔV increases in steps during burn phases.
 */
export function generateDeltaVTrack(): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];
  let cumDV = 0;

  // Start
  x.push(0);
  y.push(0);

  // EP01: 8497 km/s over 72h (brachistochrone — linear accumulation)
  x.push(0.01);
  y.push(0);
  x.push(3);
  y.push(8497);
  cumDV = 8497;

  // Jupiter stay
  x.push(6);
  y.push(cumDV);

  // EP02: trim thrust ~85 km/s over first 3 days of the 87-day transfer
  x.push(6.01);
  y.push(cumDV);
  x.push(9);
  y.push(cumDV + 85);
  cumDV += 85;

  // Coast to Saturn
  x.push(93);
  y.push(cumDV);

  // Saturn stay
  x.push(95);
  y.push(cumDV);

  // EP03: 11165 km/s over 143h
  x.push(95.01);
  y.push(cumDV);
  x.push(101);
  y.push(cumDV + 11165);
  cumDV += 11165;

  // EP04: Uranus escape burn (1202 km/s @48,000t)
  x.push(103);
  y.push(cumDV);
  x.push(103.01);
  y.push(cumDV);
  x.push(111);
  y.push(cumDV + 1202);
  cumDV += 1202;

  // EP05: 15207 km/s composite route (507h total, ~55h burn time)
  // Burns: escape, Jupiter flyby boost, deceleration, Earth insertion
  const ep05Burns = [
    { startDay: 111, endDay: 112, dv: 6000 }, // escape burn
    { startDay: 117, endDay: 117.5, dv: 600 }, // Jupiter flyby boost
    { startDay: 121, endDay: 123, dv: 7000 }, // main deceleration
    { startDay: 123.5, endDay: 124, dv: 1607 }, // Earth insertion
  ];

  for (const burn of ep05Burns) {
    x.push(burn.startDay);
    y.push(cumDV);
    x.push(burn.endDay);
    y.push(cumDV + burn.dv);
    cumDV += burn.dv;
  }

  return { x, y };
}

/**
 * Generate the nozzle remaining life track.
 * Starts at 55h38m (EP03 post-repair), decreases during burns.
 *
 * Nozzle was replaced/repaired at EP03 start.
 * EP01-EP02 used the original nozzle (consumed 72h of burn time).
 * After EP03 repair, the new nozzle has different specifications.
 *
 * For the full mission view, we show EP01 original nozzle burn,
 * then the EP03-EP05 nozzle from repair onward.
 */
export function generateNozzleTrack(): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];

  // Nozzle life tracking across full mission
  // Original nozzle: assumed ~100h rated life
  const originalNozzleLife = 100; // hours (estimated)

  // EP01: 72h of burn → 28h remaining
  x.push(0);
  y.push(originalNozzleLife);
  x.push(3);
  y.push(originalNozzleLife - 72);

  // EP02: engine damaged, no continuous burn, nozzle unchanged
  x.push(6);
  y.push(originalNozzleLife - 72);
  x.push(93);
  y.push(originalNozzleLife - 72);

  // EP03 repair: new nozzle installed, rated at ~200h
  // But after EP03's 143h burn, only 55h38m remains
  const postRepairNozzle = 143 + 55.63; // ≈ 198.63h total
  x.push(95);
  y.push(postRepairNozzle);
  x.push(101);
  y.push(postRepairNozzle - 143); // 55.63h remaining

  // Uranus stay
  x.push(103);
  y.push(55.63);
  x.push(111);
  y.push(55.63);

  // EP05: ~55h12m of burn time consumed → 26 min remaining
  // Burns distributed across the composite route
  x.push(112);
  y.push(55.63 - 20); // after escape burn
  x.push(117.5);
  y.push(55.63 - 25); // after flyby boost
  x.push(123);
  y.push(55.63 - 50); // after main deceleration
  x.push(124);
  y.push(55.63 - 55.2); // 0.43h = 26 min remaining

  return { x, y };
}

/**
 * Generate the radiation dose track.
 * Jumps during EP04 plasmoid encounter.
 */
export function generateRadiationTrack(): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];

  // Baseline space radiation: ~0.5-1 mSv/day in interplanetary space
  const dailyRate = 0.7; // mSv/day (approximate)

  // Background accumulation
  x.push(0);
  y.push(0);

  // Gradual background through EP01-EP03
  x.push(3);
  y.push(3 * dailyRate);
  x.push(93);
  y.push(93 * dailyRate);
  x.push(101);
  y.push(101 * dailyRate);
  x.push(103);
  y.push(103 * dailyRate);

  // EP04: plasmoid encounter → sudden +480 mSv
  const prePlasmoid = 105 * dailyRate;
  x.push(105);
  y.push(prePlasmoid);
  x.push(105.01);
  y.push(prePlasmoid + 480);

  // Continue with background
  x.push(111);
  y.push(prePlasmoid + 480 + 6 * dailyRate);
  x.push(124);
  y.push(prePlasmoid + 480 + 19 * dailyRate);

  return { x, y };
}

/**
 * Build the multi-track mission timeline chart: Distance from Sun
 */
export function buildDistanceChart(): TimeSeriesChart {
  const dist = generateDistanceTrack();
  return {
    id: "mission-distance-timeline",
    title: "太陽からの距離（全ミッション）",
    description:
      "約124日間の全ミッションにわたるケストレル号の太陽中心距離を示す。火星（1.5 AU）から天王星（19.2 AU）まで外側に移動した後、地球（1.0 AU）に帰還する様子が読み取れる。EP02の約87日間のトリム推力遷移（5→10 AU）が最も緩やかな勾配を示し、EP05の帰還航路（19→1 AU）が最も急峻。各話の時間帯を背景色で区分している。",
    xLabel: "ミッション経過 (日)",
    yLabel: "太陽中心距離 (AU)",
    width: 700,
    height: 300,
    series: [
      {
        label: "太陽中心距離",
        color: "#ffa657",
        x: dist.x,
        y: dist.y,
      },
    ],
    thresholds: [
      {
        value: 1.0,
        label: "地球軌道 (1.0 AU)",
        color: "#4488ff",
        style: "dashed",
      },
    ],
    regions: getEpisodeRegions(),
  };
}

/**
 * Build the multi-track mission timeline chart: Accumulated ΔV
 */
export function buildDeltaVChart(): TimeSeriesChart {
  const dv = generateDeltaVTrack();
  return {
    id: "mission-deltav-timeline",
    title: "累積ΔV（全ミッション）",
    description:
      "全ミッションにわたるΔVの累積推移。EP01（8,497 km/s）、EP03（11,165 km/s）、EP04（1,202 km/s）、EP05（15,207 km/s）で階段状に増加する。EP02はトリム推力のみ（85 km/s）で、全体の寄与はごくわずか。最終的な累積ΔVは約36,156 km/s（光速の約12.1%）に達する。各話の時間帯を背景色で区分している。",
    xLabel: "ミッション経過 (日)",
    yLabel: "累積 ΔV (km/s)",
    width: 700,
    height: 300,
    series: [
      {
        label: "累積 ΔV",
        color: "#58a6ff",
        x: dv.x,
        y: dv.y,
      },
    ],
    regions: getEpisodeRegions(),
  };
}

/**
 * Build the multi-track mission timeline chart: Nozzle Remaining Life
 */
export function buildNozzleChart(): TimeSeriesChart {
  const nozzle = generateNozzleTrack();
  return {
    id: "mission-nozzle-timeline",
    title: "ノズル残寿命（全ミッション）",
    description:
      "ノズルの残り使用可能時間の推移。EP01でオリジナルノズルの寿命を72時間消費。EP03開始時にノズル交換・修復が行われ、新ノズル（約199h寿命）に換装。EP03で143時間使用し残り55h38m。EP05の帰還航路で約55h12m使用し、最終的にわずか26分（0.43h）の残寿命となる。このギリギリのマージン（0.78%）は物語の緊張感を支える重要な要素。",
    xLabel: "ミッション経過 (日)",
    yLabel: "ノズル残寿命 (h)",
    width: 700,
    height: 300,
    series: [
      {
        label: "ノズル残寿命",
        color: "#f0883e",
        x: nozzle.x,
        y: nozzle.y,
      },
    ],
    thresholds: [
      {
        value: 0,
        label: "寿命限界",
        color: "#ff4444",
        style: "dashed",
      },
    ],
    regions: getEpisodeRegions(),
  };
}

/**
 * Build the multi-track mission timeline chart: Radiation Dose
 */
export function buildRadiationChart(): TimeSeriesChart {
  const rad = generateRadiationTrack();
  return {
    id: "mission-radiation-timeline",
    title: "累積放射線被曝量（全ミッション）",
    description:
      "全ミッションにわたる放射線被曝の累積推移。EP04（Day 105付近）でのプラズモイド遭遇により一気に480 mSvが加算され、ICRP緊急時上限500 mSvに迫る。宇宙空間での日常被曝（約0.7 mSv/日）は背景として一様に蓄積。最終的な累積被曝量は約560 mSv前後で、NASA生涯上限600 mSvに対して約40 mSvの余裕。",
    xLabel: "ミッション経過 (日)",
    yLabel: "累積被曝量 (mSv)",
    width: 700,
    height: 300,
    series: [
      {
        label: "累積被曝量",
        color: "#da3633",
        x: rad.x,
        y: rad.y,
      },
    ],
    thresholds: [
      {
        value: 500,
        label: "ICRP緊急時上限 (500 mSv)",
        color: "#f85149",
        style: "dashed",
      },
      {
        value: 600,
        label: "NASA生涯上限 (600 mSv)",
        color: "#ff6b6b",
        style: "dashed",
      },
    ],
    regions: getEpisodeRegions(),
  };
}

/**
 * Generate all mission timeline charts.
 */
export function buildAllMissionTimelineCharts(): TimeSeriesChart[] {
  return [
    buildDistanceChart(),
    buildDeltaVChart(),
    buildNozzleChart(),
    buildRadiationChart(),
  ];
}
