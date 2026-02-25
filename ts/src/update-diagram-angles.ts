/**
 * Update orbital diagram planet angles in episode and summary report JSON files
 * to reflect computed planetary positions from the ephemeris.
 *
 * Handles:
 * - Episode reports (ep01-ep05): per-episode diagrams
 * - Cross-episode summary: full-route diagram with all 4 transfer legs
 * - Epoch annotations: adds assumed in-story date to heliocentric diagrams
 * - Arrival vs departure positions: arrival planet uses arrivalJD
 *
 * Usage: npm run update-diagram-angles [-- --data-dir <path>]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { computeTimeline, type TimelineEvent } from "./timeline-analysis.ts";
import { calendarToJD, planetLongitude, jdToDateString, type PlanetName } from "./ephemeris.ts";
import type { EpisodeReport, OrbitalDiagram, SummaryReport, TransferArc } from "./report-types.ts";
import { loadSummaryBySlug } from "./mdx-parser.ts";

const args = process.argv.slice(2);
let dataDir = path.resolve("..", "reports", "data", "episodes");
let summaryDir = path.resolve("..", "reports", "data", "summary");

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--data-dir" && args[i + 1]) {
    dataDir = path.resolve(args[++i]);
  }
  if (args[i] === "--summary-dir" && args[i + 1]) {
    summaryDir = path.resolve(args[++i]);
  }
}

// Compute timeline anchored at 2240 (representative epoch)
const timeline = computeTimeline(calendarToJD(2240, 1, 1));

/** Map orbit ID to PlanetName for angle lookup */
function orbitIdToPlanet(orbitId: string): PlanetName | null {
  const directMap: Record<string, PlanetName> = {
    earth: "earth",
    mars: "mars",
    jupiter: "jupiter",
    saturn: "saturn",
    uranus: "uranus",
    neptune: "neptune",
    venus: "venus",
    mercury: "mercury",
  };

  if (orbitId in directMap) return directMap[orbitId];

  // With -orbit suffix (ep05 style)
  const withoutSuffix = orbitId.replace(/-orbit$/, "");
  if (withoutSuffix in directMap) return directMap[withoutSuffix];

  return null;
}

/** Get the relevant timeline event for an episode diagram */
function getEventForDiagram(diagramId: string): TimelineEvent | null {
  const epMatch = diagramId.match(/^ep(\d{2})/);
  if (!epMatch) return null;
  const ep = parseInt(epMatch[1], 10);
  // EP05 is a continuation of EP04 (same route segment), use EP04's event
  const lookupEp = ep === 5 ? 4 : ep;
  return timeline.events.find((e) => e.episode === lookupEp) ?? null;
}

/**
 * Determine if an orbit is the arrival planet for the given transfer event.
 * The arrival planet position should be computed at arrivalJD, not departureJD.
 */
function isArrivalPlanet(planet: PlanetName, event: TimelineEvent): boolean {
  return planet === event.arrivalPlanet;
}

/**
 * Determine if an orbit is the departure planet for the given transfer event.
 */
function isDeparturePlanet(planet: PlanetName, event: TimelineEvent): boolean {
  return planet === event.departurePlanet;
}

/**
 * Compute the appropriate JD for a planet's position in a diagram.
 * - Departure planet: use departureJD
 * - Arrival planet: use arrivalJD
 * - Other reference planets: use departureJD (snapshot at journey start)
 */
function getAngleForPlanet(planet: PlanetName, event: TimelineEvent): number {
  const jd = isArrivalPlanet(planet, event) ? event.arrivalJD : event.departureJD;
  return planetLongitude(planet, jd);
}

function setAngle(
  diagramId: string,
  orbitId: string,
  orbit: { angle?: number },
  newAngle: number,
): boolean {
  const rounded = parseFloat(newAngle.toFixed(4));
  if (orbit.angle !== undefined && Math.abs(rounded - orbit.angle) < 0.001) {
    return false;
  }
  const oldAngle = orbit.angle;
  orbit.angle = rounded;
  console.log(
    `  ${diagramId} / ${orbitId}: ${oldAngle?.toFixed(3) ?? "unset"} → ${rounded.toFixed(3)} rad (${(rounded * 180 / Math.PI).toFixed(1)}°)`,
  );
  return true;
}

/** Update angles in a heliocentric episode diagram */
function updateEpisodeDiagramAngles(diagram: OrbitalDiagram): boolean {
  const event = getEventForDiagram(diagram.id);
  if (!event) return false;

  // Only update heliocentric diagrams (centerLabel is 太陽)
  if (diagram.centerLabel !== "太陽") return false;

  let updated = false;
  for (const orbit of diagram.orbits) {
    if (orbit.angle === undefined) continue;

    const planet = orbitIdToPlanet(orbit.id);
    if (!planet) continue;

    const newAngle = getAngleForPlanet(planet, event);
    if (setAngle(diagram.id, orbit.id, orbit, newAngle)) {
      updated = true;
    }
  }

  // Update BurnMarker angles based on planet positions
  for (const transfer of diagram.transfers) {
    const fromPlanet = orbitIdToPlanet(transfer.fromOrbitId);
    const toPlanet = orbitIdToPlanet(transfer.toOrbitId);
    if (transfer.burnMarkers) {
      for (const burn of transfer.burnMarkers) {
        if (burn.type === "acceleration" && fromPlanet) {
          // Acceleration burn at departure planet position
          const depAngle = planetLongitude(fromPlanet, event.departureJD);
          if (setAngle(diagram.id, `burn:${burn.label}`, burn, depAngle)) {
            updated = true;
          }
        } else if ((burn.type === "deceleration" || burn.type === "capture") && toPlanet) {
          // Deceleration/capture burn at arrival planet position
          const arrAngle = planetLongitude(toPlanet, event.arrivalJD);
          if (setAngle(diagram.id, `burn:${burn.label}`, burn, arrAngle)) {
            updated = true;
          }
        }
        // midcourse burns are not tied to a planet — leave unchanged
      }
    }
  }

  // Set epoch annotation
  const epochStr = `想定年代: ${event.departureDate}～${event.arrivalDate}`;
  if (diagram.epochAnnotation !== epochStr) {
    console.log(`  ${diagram.id} epochAnnotation: "${epochStr}"`);
    diagram.epochAnnotation = epochStr;
    updated = true;
  }

  return updated;
}

/** Update the cross-episode full-route diagram using all timeline events */
function updateCrossEpisodeDiagram(diagram: OrbitalDiagram): boolean {
  if (diagram.id !== "full-route-diagram") return false;
  if (diagram.centerLabel !== "太陽") return false;

  const events = timeline.events;
  if (events.length === 0) return false;

  let updated = false;

  // For the full-route diagram, each planet should be shown at its position
  // when it is first relevant (departure from or arrival at that body).
  // Build a map: planet → JD when the ship interacts with it.
  const planetJDMap = new Map<PlanetName, number>();

  for (const event of events) {
    // Departure planet at departure time (first interaction takes priority)
    if (!planetJDMap.has(event.departurePlanet)) {
      planetJDMap.set(event.departurePlanet, event.departureJD);
    }
    // Arrival planet at arrival time
    if (!planetJDMap.has(event.arrivalPlanet)) {
      planetJDMap.set(event.arrivalPlanet, event.arrivalJD);
    }
  }

  // Update orbit angles
  for (const orbit of diagram.orbits) {
    if (orbit.angle === undefined) continue;

    const planet = orbitIdToPlanet(orbit.id);
    if (!planet) continue;

    const jd = planetJDMap.get(planet);
    if (jd === undefined) continue;

    const newAngle = planetLongitude(planet, jd);
    if (setAngle(diagram.id, orbit.id, orbit, newAngle)) {
      updated = true;
    }
  }

  // Update BurnMarker angles for each transfer leg
  // Map transfer labels to timeline events by matching from/to orbit IDs
  for (const transfer of diagram.transfers) {
    const fromPlanet = orbitIdToPlanet(transfer.fromOrbitId);
    const toPlanet = orbitIdToPlanet(transfer.toOrbitId);

    // Find the matching timeline event
    const matchingEvent = events.find(
      (e) => e.departurePlanet === fromPlanet && e.arrivalPlanet === toPlanet,
    );

    if (matchingEvent && transfer.burnMarkers) {
      for (const burn of transfer.burnMarkers) {
        if (burn.type === "acceleration" && fromPlanet) {
          const depAngle = planetLongitude(fromPlanet, matchingEvent.departureJD);
          if (setAngle(diagram.id, `burn:${burn.label}`, burn, depAngle)) {
            updated = true;
          }
        } else if ((burn.type === "deceleration" || burn.type === "capture") && toPlanet) {
          const arrAngle = planetLongitude(toPlanet, matchingEvent.arrivalJD);
          if (setAngle(diagram.id, `burn:${burn.label}`, burn, arrAngle)) {
            updated = true;
          }
        }
      }
    }
  }

  // Set epoch annotation spanning the full journey
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];
  const epochStr = `想定年代: ${firstEvent.departureDate}～${lastEvent.arrivalDate} (全${timeline.totalDurationDays.toFixed(0)}日間)`;
  if (diagram.epochAnnotation !== epochStr) {
    console.log(`  ${diagram.id} epochAnnotation: "${epochStr}"`);
    diagram.epochAnnotation = epochStr;
    updated = true;
  }

  return updated;
}

// ---- Process episode reports ----
console.log("=== Episode Reports ===");
for (let ep = 1; ep <= 5; ep++) {
  const slug = `ep${String(ep).padStart(2, "0")}`;
  // Skip MDX episodes — diagram angles are in the diagrams: directive
  if (fs.existsSync(path.join(dataDir, `${slug}.md`))) {
    console.log(`Skipping ${slug}.md (MDX format, edit diagrams: directive manually)`);
    continue;
  }
  const filename = `${slug}.json`;
  const filepath = path.join(dataDir, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`Skipping ${filename} (not found)`);
    continue;
  }

  const report: EpisodeReport = JSON.parse(fs.readFileSync(filepath, "utf-8"));
  if (!report.diagrams || report.diagrams.length === 0) {
    console.log(`Skipping ${filename} (no diagrams)`);
    continue;
  }

  console.log(`Processing ${filename}...`);
  let fileUpdated = false;

  for (const diagram of report.diagrams) {
    if (updateEpisodeDiagramAngles(diagram)) {
      fileUpdated = true;
    }
  }

  if (fileUpdated) {
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2) + "\n");
    console.log(`  Updated ${filename}`);
  } else {
    console.log(`  No changes needed for ${filename}`);
  }
}

// ---- Process cross-episode summary ----
console.log("\n=== Cross-Episode Summary ===");
const crossEpisodeJsonPath = path.join(summaryDir, "cross-episode.json");
const crossEpisodeMdPath = path.join(summaryDir, "cross-episode.md");

if (fs.existsSync(crossEpisodeJsonPath)) {
  // JSON format: read, modify, write back
  const summary: SummaryReport = JSON.parse(fs.readFileSync(crossEpisodeJsonPath, "utf-8"));
  let fileUpdated = false;

  for (const section of summary.sections) {
    if (section.orbitalDiagrams) {
      for (const diagram of section.orbitalDiagrams) {
        if (updateCrossEpisodeDiagram(diagram)) {
          fileUpdated = true;
        }
      }
    }
  }

  if (fileUpdated) {
    fs.writeFileSync(crossEpisodeJsonPath, JSON.stringify(summary, null, 2) + "\n");
    console.log(`  Updated cross-episode.json`);
  } else {
    console.log(`  No changes needed for cross-episode.json`);
  }
} else if (fs.existsSync(crossEpisodeMdPath)) {
  // MDX format: parse to get diagrams, modify, then replace JSON blocks in raw content
  const summary = loadSummaryBySlug(summaryDir, "cross-episode");
  let fileUpdated = false;

  for (const section of summary.sections) {
    if (section.orbitalDiagrams) {
      for (const diagram of section.orbitalDiagrams) {
        if (updateCrossEpisodeDiagram(diagram)) {
          fileUpdated = true;
        }
      }
    }
  }

  if (fileUpdated) {
    // Replace orbital-diagram JSON blocks in the raw MDX file
    let mdContent = fs.readFileSync(crossEpisodeMdPath, "utf-8");
    const diagramRegex = /```component:orbital-diagram\n([\s\S]*?)```/g;
    let diagramIndex = 0;
    const allDiagrams: OrbitalDiagram[] = [];
    for (const section of summary.sections) {
      if (section.orbitalDiagrams) allDiagrams.push(...section.orbitalDiagrams);
    }
    mdContent = mdContent.replace(diagramRegex, (_match, _inner) => {
      const diagram = allDiagrams[diagramIndex++];
      return "```component:orbital-diagram\n" + JSON.stringify(diagram, null, 2) + "\n```";
    });
    fs.writeFileSync(crossEpisodeMdPath, mdContent);
    console.log(`  Updated cross-episode.md`);
  } else {
    console.log(`  No changes needed for cross-episode.md`);
  }
} else {
  console.log(`Skipping cross-episode (not found)`);
}

console.log("\nDone. Planet angles and epoch annotations updated to match computed timeline.");
console.log(`Timeline: ${timeline.events[0].departureDate} → ${timeline.events[timeline.events.length - 1].arrivalDate} (${timeline.totalDurationDays.toFixed(0)} days)`);
