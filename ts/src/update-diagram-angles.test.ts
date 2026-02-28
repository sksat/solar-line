/**
 * Tests for epoch-consistent orbital diagram angles.
 *
 * Verifies that planet angles in diagram data files match
 * computed positions from the ephemeris timeline.
 */

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { computeTimeline } from "./timeline-analysis.ts";
import { calendarToJD, planetLongitude, type PlanetName } from "./ephemeris.ts";
import type { EpisodeReport, OrbitalDiagram, SummaryReport } from "./report-types.ts";
import { loadSummaryBySlug } from "./mdx-parser.ts";
import { parseEpisodeMarkdown } from "./episode-mdx-parser.ts";

const episodeDir = path.resolve(import.meta.dirname!, "..", "..", "reports", "data", "episodes");
const summaryDir = path.resolve(import.meta.dirname!, "..", "..", "reports", "data", "summary");
const timeline = computeTimeline(calendarToJD(2240, 1, 1));

function orbitIdToPlanet(orbitId: string): PlanetName | null {
  const map: Record<string, PlanetName> = {
    earth: "earth", mars: "mars", jupiter: "jupiter",
    saturn: "saturn", uranus: "uranus",
  };
  const key = orbitId.replace(/-orbit$/, "");
  return map[key] ?? null;
}

function readEpisodeReport(ep: number): EpisodeReport {
  const slug = `ep${String(ep).padStart(2, "0")}`;
  const mdPath = path.join(episodeDir, `${slug}.md`);
  if (fs.existsSync(mdPath)) {
    return parseEpisodeMarkdown(fs.readFileSync(mdPath, "utf-8"));
  }
  const jsonPath = path.join(episodeDir, `${slug}.json`);
  return JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
}

function getHeliocentricDiagrams(ep: number): OrbitalDiagram[] {
  const report = readEpisodeReport(ep);
  return (report.diagrams ?? []).filter((d) => d.centerLabel === "太陽");
}

describe("epoch-consistent planet positions in episode diagrams", () => {
  it("EP01: Mars at departure JD, Jupiter at arrival JD", () => {
    const event = timeline.events.find((e) => e.episode === 1)!;
    const diagrams = getHeliocentricDiagrams(1);
    assert.ok(diagrams.length >= 1, "EP01 should have heliocentric diagrams");

    for (const diagram of diagrams) {
      const marsOrbit = diagram.orbits.find((o) => o.id === "mars");
      const jupOrbit = diagram.orbits.find((o) => o.id === "jupiter");

      if (marsOrbit?.angle !== undefined) {
        const expected = planetLongitude("mars", event.departureJD);
        assert.ok(
          Math.abs(marsOrbit.angle - expected) < 0.01,
          `Mars angle ${marsOrbit.angle} should be ≈ ${expected.toFixed(4)} (departure)`,
        );
      }

      if (jupOrbit?.angle !== undefined) {
        const expected = planetLongitude("jupiter", event.arrivalJD);
        assert.ok(
          Math.abs(jupOrbit.angle - expected) < 0.01,
          `Jupiter angle ${jupOrbit.angle} should be ≈ ${expected.toFixed(4)} (arrival)`,
        );
      }
    }
  });

  it("EP02: Jupiter at departure JD, Saturn at arrival JD", () => {
    const event = timeline.events.find((e) => e.episode === 2)!;
    const diagrams = getHeliocentricDiagrams(2);

    for (const diagram of diagrams) {
      const jupOrbit = diagram.orbits.find((o) => o.id === "jupiter");
      const satOrbit = diagram.orbits.find((o) => o.id === "saturn");

      if (jupOrbit?.angle !== undefined) {
        const expected = planetLongitude("jupiter", event.departureJD);
        assert.ok(
          Math.abs(jupOrbit.angle - expected) < 0.01,
          `Jupiter angle ${jupOrbit.angle} should be ≈ ${expected.toFixed(4)} (departure)`,
        );
      }

      if (satOrbit?.angle !== undefined) {
        const expected = planetLongitude("saturn", event.arrivalJD);
        assert.ok(
          Math.abs(satOrbit.angle - expected) < 0.01,
          `Saturn angle ${satOrbit.angle} should be ≈ ${expected.toFixed(4)} (arrival)`,
        );
      }
    }
  });

  it("EP03: Saturn at departure JD, Uranus at arrival JD", () => {
    const event = timeline.events.find((e) => e.episode === 3)!;
    const diagrams = getHeliocentricDiagrams(3);

    for (const diagram of diagrams) {
      const satOrbit = diagram.orbits.find((o) => o.id === "saturn");
      const uraOrbit = diagram.orbits.find((o) => o.id === "uranus");

      if (satOrbit?.angle !== undefined) {
        const expected = planetLongitude("saturn", event.departureJD);
        assert.ok(
          Math.abs(satOrbit.angle - expected) < 0.01,
          `Saturn angle ${satOrbit.angle} should be ≈ ${expected.toFixed(4)} (departure)`,
        );
      }

      if (uraOrbit?.angle !== undefined) {
        const expected = planetLongitude("uranus", event.arrivalJD);
        assert.ok(
          Math.abs(uraOrbit.angle - expected) < 0.01,
          `Uranus angle ${uraOrbit.angle} should be ≈ ${expected.toFixed(4)} (arrival)`,
        );
      }
    }
  });
});

describe("epoch-consistent positions in cross-episode diagram", () => {
  const summary: SummaryReport = loadSummaryBySlug(summaryDir, "cross-episode");

  function findFullRouteDiagram(): OrbitalDiagram | null {
    for (const section of summary.sections) {
      for (const d of section.orbitalDiagrams ?? []) {
        if (d.id === "full-route-diagram") return d;
      }
    }
    return null;
  }

  it("full-route-diagram exists", () => {
    assert.ok(findFullRouteDiagram(), "cross-episode.json should have full-route-diagram");
  });

  it("planet angles match their interaction epochs", () => {
    const diagram = findFullRouteDiagram()!;

    // Mars at EP01 departure
    const marsOrbit = diagram.orbits.find((o) => o.id === "mars");
    const ep01 = timeline.events.find((e) => e.episode === 1)!;
    if (marsOrbit?.angle !== undefined) {
      const expected = planetLongitude("mars", ep01.departureJD);
      assert.ok(
        Math.abs(marsOrbit.angle - expected) < 0.01,
        `Mars: ${marsOrbit.angle} ≈ ${expected.toFixed(4)}`,
      );
    }

    // Jupiter at EP01 arrival
    const jupOrbit = diagram.orbits.find((o) => o.id === "jupiter");
    if (jupOrbit?.angle !== undefined) {
      const expected = planetLongitude("jupiter", ep01.arrivalJD);
      assert.ok(
        Math.abs(jupOrbit.angle - expected) < 0.01,
        `Jupiter: ${jupOrbit.angle} ≈ ${expected.toFixed(4)}`,
      );
    }

    // Saturn at EP02 arrival
    const satOrbit = diagram.orbits.find((o) => o.id === "saturn");
    const ep02 = timeline.events.find((e) => e.episode === 2)!;
    if (satOrbit?.angle !== undefined) {
      const expected = planetLongitude("saturn", ep02.arrivalJD);
      assert.ok(
        Math.abs(satOrbit.angle - expected) < 0.01,
        `Saturn: ${satOrbit.angle} ≈ ${expected.toFixed(4)}`,
      );
    }

    // Earth at EP04 arrival
    const earthOrbit = diagram.orbits.find((o) => o.id === "earth");
    const ep04 = timeline.events.find((e) => e.episode === 4)!;
    if (earthOrbit?.angle !== undefined) {
      const expected = planetLongitude("earth", ep04.arrivalJD);
      assert.ok(
        Math.abs(earthOrbit.angle - expected) < 0.01,
        `Earth: ${earthOrbit.angle} ≈ ${expected.toFixed(4)}`,
      );
    }
  });

  it("has epoch annotation", () => {
    const diagram = findFullRouteDiagram()!;
    assert.ok(diagram.epochAnnotation, "should have epochAnnotation");
    assert.match(diagram.epochAnnotation!, /^想定年代:/);
  });
});

describe("epoch annotations on heliocentric diagrams", () => {
  for (let ep = 1; ep <= 5; ep++) {
    it(`EP${String(ep).padStart(2, "0")} heliocentric diagrams have epoch annotations`, () => {
      const diagrams = getHeliocentricDiagrams(ep);
      for (const diagram of diagrams) {
        assert.ok(
          diagram.epochAnnotation,
          `${diagram.id} should have epochAnnotation`,
        );
        assert.match(diagram.epochAnnotation!, /^想定年代: \d{4}-\d{2}-\d{2}～\d{4}-\d{2}-\d{2}/);
      }
    });
  }
});

describe("EP04 custom epoch annotation is preserved", () => {
  it("EP04 heliocentric diagram has custom parenthetical suffix", () => {
    const diagrams = getHeliocentricDiagrams(4);
    assert.ok(diagrams.length >= 1, "EP04 should have heliocentric diagrams");
    const diagram = diagrams[0];
    assert.ok(diagram.epochAnnotation, "EP04 should have epochAnnotation");
    // EP04's annotation shows the 48kt/105-day reference scenario, not the actual 507h route
    assert.ok(
      diagram.epochAnnotation!.includes("（"),
      "EP04 should have a custom parenthetical suffix",
    );
    assert.ok(
      diagram.epochAnnotation!.includes("brachistochrone"),
      "EP04 annotation should reference brachistochrone scenario",
    );
    // Departure date should match timeline
    const event = timeline.events.find((e) => e.episode === 4)!;
    assert.ok(
      diagram.epochAnnotation!.includes(event.departureDate),
      `EP04 annotation should contain departure date ${event.departureDate}`,
    );
  });
});

describe("burn marker angles aligned with planet positions", () => {
  it("EP01 acceleration burn near Mars longitude", () => {
    const event = timeline.events.find((e) => e.episode === 1)!;
    const diagrams = getHeliocentricDiagrams(1);
    const marsLon = planetLongitude("mars", event.departureJD);

    for (const diagram of diagrams) {
      for (const transfer of diagram.transfers) {
        if (!transfer.burnMarkers) continue;
        const accelBurn = transfer.burnMarkers.find((b) => b.type === "acceleration");
        if (accelBurn) {
          assert.ok(
            Math.abs(accelBurn.angle - marsLon) < 0.1,
            `EP01 acceleration burn angle ${accelBurn.angle} should be near Mars ${marsLon.toFixed(3)}`,
          );
        }
      }
    }
  });

  it("cross-episode EP2 capture burn near Saturn arrival longitude", () => {
    const ep02 = timeline.events.find((e) => e.episode === 2)!;
    const satLon = planetLongitude("saturn", ep02.arrivalJD);
    const diagram = loadSummaryBySlug(summaryDir, "cross-episode");

    for (const section of diagram.sections) {
      for (const d of section.orbitalDiagrams ?? []) {
        if (d.id !== "full-route-diagram") continue;
        const ep2Transfer = d.transfers.find((t) =>
          t.fromOrbitId === "jupiter" && t.toOrbitId === "saturn",
        );
        if (ep2Transfer?.burnMarkers) {
          const capture = ep2Transfer.burnMarkers.find((b) => b.type === "capture");
          if (capture) {
            assert.ok(
              Math.abs(capture.angle - satLon) < 0.1,
              `EP2 capture burn angle ${capture.angle} should be near Saturn ${satLon.toFixed(3)}`,
            );
          }
        }
      }
    }
  });
});

// --- Task 205: Animated body arrival alignment for real diagrams ---

import { renderOrbitalDiagram } from "./templates.ts";

/**
 * Extract animation JSON from rendered HTML.
 */
function extractAnimJson(html: string): {
  durationSeconds: number;
  orbits: Array<{ id: string; initialAngle: number; meanMotion: number; radiusPx: number }>;
  transfers: Array<{ fromOrbitId: string; toOrbitId: string; startTime: number; endTime: number; pathId: string }>;
} | null {
  const m = html.match(/<script type="application\/json" class="orbital-animation-data">([\s\S]*?)<\/script>/);
  if (!m) return null;
  return JSON.parse(m[1]);
}

/** Extract path endpoint coordinates */
function extractEndpoint(html: string, pathId: string): { x: number; y: number } | null {
  const pathRegex = new RegExp(`<path[^>]*data-transfer-path="${pathId}"[^>]*>`);
  const elemMatch = html.match(pathRegex);
  if (!elemMatch) return null;
  const dMatch = elemMatch[0].match(/d="([^"]+)"/);
  if (!dMatch) return null;
  const d = dMatch[1];
  const quadMatch = d.match(/Q\s+[\d.e+-]+\s+[\d.e+-]+\s+([\d.e+-]+)\s+([\d.e+-]+)/);
  if (quadMatch) return { x: parseFloat(quadMatch[1]), y: parseFloat(quadMatch[2]) };
  const arcMatch = d.match(/A\s+[\d.e+-]+\s+[\d.e+-]+\s+[\d.e+-]+\s+[\d.e+-]+\s+[\d.e+-]+\s+([\d.e+-]+)\s+([\d.e+-]+)/);
  if (arcMatch) return { x: parseFloat(arcMatch[1]), y: parseFloat(arcMatch[2]) };
  return null;
}

describe("Task 205: animated arrival alignment in episode diagrams", () => {
  for (let ep = 1; ep <= 5; ep++) {
    it(`EP${String(ep).padStart(2, "0")} animated diagrams: arrival bodies align at t=endTime`, () => {
      const report = readEpisodeReport(ep);
      const animatedDiagrams = (report.diagrams ?? []).filter(d => d.animation);

      for (const diagram of animatedDiagrams) {
        const html = renderOrbitalDiagram(diagram);
        const animData = extractAnimJson(html);
        if (!animData) continue;

        for (const transfer of animData.transfers) {
          const toOrbit = animData.orbits.find(o => o.id === transfer.toOrbitId);
          if (!toOrbit || toOrbit.meanMotion === 0) continue;

          // Compute animated position at t=endTime
          const animAngle = toOrbit.initialAngle + toOrbit.meanMotion * transfer.endTime;
          const r = toOrbit.radiusPx;
          const animX = r * Math.cos(animAngle);
          const animY = -r * Math.sin(animAngle);

          const endpoint = extractEndpoint(html, transfer.pathId);
          if (!endpoint) continue;

          const dist = Math.sqrt((endpoint.x - animX) ** 2 + (endpoint.y - animY) ** 2);
          assert.ok(
            dist < 5,
            `${diagram.id}: ${transfer.fromOrbitId}→${transfer.toOrbitId} arrival body at t=${transfer.endTime} ` +
            `should match arc endpoint. distance=${dist.toFixed(1)}px`,
          );
        }
      }
    });
  }

  it("cross-episode full-route diagram: arrival bodies align at t=endTime", () => {
    const summary = loadSummaryBySlug(summaryDir, "cross-episode");
    for (const section of summary.sections) {
      for (const diagram of section.orbitalDiagrams ?? []) {
        if (!diagram.animation) continue;
        const html = renderOrbitalDiagram(diagram);
        const animData = extractAnimJson(html);
        if (!animData) continue;

        for (const transfer of animData.transfers) {
          const toOrbit = animData.orbits.find(o => o.id === transfer.toOrbitId);
          if (!toOrbit || toOrbit.meanMotion === 0) continue;

          const animAngle = toOrbit.initialAngle + toOrbit.meanMotion * transfer.endTime;
          const r = toOrbit.radiusPx;
          const animX = r * Math.cos(animAngle);
          const animY = -r * Math.sin(animAngle);

          const endpoint = extractEndpoint(html, transfer.pathId);
          if (!endpoint) continue;

          const dist = Math.sqrt((endpoint.x - animX) ** 2 + (endpoint.y - animY) ** 2);
          assert.ok(
            dist < 5,
            `${diagram.id}: ${transfer.fromOrbitId}→${transfer.toOrbitId} arrival alignment ` +
            `distance=${dist.toFixed(1)}px (should be <5)`,
          );
        }
      }
    }
  });

  it("cross-episode: EP(N) arrival position ≈ EP(N+1) departure position", () => {
    const summary = loadSummaryBySlug(summaryDir, "cross-episode");
    let fullRoute: OrbitalDiagram | undefined;
    for (const section of summary.sections) {
      for (const d of section.orbitalDiagrams ?? []) {
        if (d.id === "full-route-diagram") fullRoute = d;
      }
    }
    if (!fullRoute?.animation) return;

    const html = renderOrbitalDiagram(fullRoute);
    const animData = extractAnimJson(html);
    if (!animData) return;

    // Sort transfers by startTime to get sequential legs
    const sortedTransfers = [...animData.transfers].sort((a, b) => a.startTime - b.startTime);

    for (let i = 0; i < sortedTransfers.length - 1; i++) {
      const leg1 = sortedTransfers[i];
      const leg2 = sortedTransfers[i + 1];

      // Check if leg1's arrival orbit is leg2's departure orbit (intermediate body)
      if (leg1.toOrbitId !== leg2.fromOrbitId) continue;

      const body = animData.orbits.find(o => o.id === leg1.toOrbitId);
      if (!body || body.meanMotion === 0) continue;

      // Body position at leg1 arrival
      const arrAngle = body.initialAngle + body.meanMotion * leg1.endTime;
      // Body position at leg2 departure
      const depAngle = body.initialAngle + body.meanMotion * leg2.startTime;

      // Arrival endpoint of leg 1
      const endpoint1 = extractEndpoint(html, leg1.pathId);
      if (!endpoint1) continue;

      // Start point of leg 2 (M x y)
      const pathElem = html.match(new RegExp(`<path[^>]*data-transfer-path="${leg2.pathId}"[^>]*>`));
      if (!pathElem) continue;
      const mMatch = pathElem[0].match(/d="M\s+([\d.e+-]+)\s+([\d.e+-]+)/);
      if (!mMatch) continue;
      const startX = parseFloat(mMatch[1]);
      const startY = parseFloat(mMatch[2]);

      // The animated body positions should be consistent
      const r = body.radiusPx;
      const arrX = r * Math.cos(arrAngle);
      const arrY = -r * Math.sin(arrAngle);
      const depX = r * Math.cos(depAngle);
      const depY = -r * Math.sin(depAngle);

      // Arrival body position should match leg1 arc endpoint
      const arrDist = Math.sqrt((endpoint1.x - arrX) ** 2 + (endpoint1.y - arrY) ** 2);
      assert.ok(
        arrDist < 5,
        `Leg ${i}: ${leg1.toOrbitId} arrival alignment distance=${arrDist.toFixed(1)}px`,
      );

      // Departure body position should match leg2 arc start
      const depDist = Math.sqrt((startX - depX) ** 2 + (startY - depY) ** 2);
      assert.ok(
        depDist < 5,
        `Leg ${i+1}: ${leg2.fromOrbitId} departure alignment distance=${depDist.toFixed(1)}px`,
      );
    }
  });
});
