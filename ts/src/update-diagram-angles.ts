/**
 * Update orbital diagram planet angles in episode report JSON files
 * to reflect computed planetary positions from the ephemeris.
 *
 * Usage: node --experimental-strip-types src/update-diagram-angles.ts [--data-dir <path>]
 *
 * This reads the episode JSON files, computes planet longitudes at
 * the timeline dates, and updates the angle fields in the diagrams.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { computeTimeline, diagramAngles, type TimelineEvent } from "./timeline-analysis.ts";
import { calendarToJD, planetLongitude, type PlanetName } from "./ephemeris.ts";
import type { EpisodeReport, OrbitalDiagram } from "./report-types.ts";

const args = process.argv.slice(2);
let dataDir = path.resolve("..", "reports", "data", "episodes");

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--data-dir" && args[i + 1]) {
    dataDir = path.resolve(args[++i]);
  }
}

// Compute timeline anchored at 2240 (representative epoch)
const timeline = computeTimeline(calendarToJD(2240, 1, 1));

/** Map orbit ID to PlanetName for angle lookup */
function orbitIdToPlanet(orbitId: string): PlanetName | null {
  // Direct planet names
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

/** Get the relevant timeline event for a diagram */
function getEventForDiagram(diagramId: string): TimelineEvent | null {
  const epMatch = diagramId.match(/^ep(\d{2})/);
  if (!epMatch) return null;
  const ep = parseInt(epMatch[1], 10);
  // EP05 is a continuation of EP04 (same route segment), use EP04's event
  const lookupEp = ep === 5 ? 4 : ep;
  return timeline.events.find((e) => e.episode === lookupEp) ?? null;
}

/** Update angles in a heliocentric diagram */
function updateDiagramAngles(diagram: OrbitalDiagram): boolean {
  const event = getEventForDiagram(diagram.id);
  if (!event) return false;

  // Only update heliocentric diagrams (centerLabel is 太陽)
  if (diagram.centerLabel !== "太陽") return false;

  let updated = false;
  for (const orbit of diagram.orbits) {
    if (orbit.angle === undefined) continue;

    const planet = orbitIdToPlanet(orbit.id);
    if (!planet) continue;

    // Use departure JD for the planet position
    const newAngle = planetLongitude(planet, event.departureJD);
    if (Math.abs(newAngle - orbit.angle) > 0.001) {
      console.log(
        `  ${diagram.id} / ${orbit.id}: ${orbit.angle.toFixed(3)} → ${newAngle.toFixed(3)} rad (${(newAngle * 180 / Math.PI).toFixed(1)}°)`,
      );
      orbit.angle = parseFloat(newAngle.toFixed(4));
      updated = true;
    }
  }

  return updated;
}

// Process each episode report
for (let ep = 1; ep <= 5; ep++) {
  const filename = `ep${String(ep).padStart(2, "0")}.json`;
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
    if (updateDiagramAngles(diagram)) {
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

console.log("\nDone. Planet angles updated to match computed timeline.");
