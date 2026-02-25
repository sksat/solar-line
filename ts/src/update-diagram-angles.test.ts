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
  const filename = `ep${String(ep).padStart(2, "0")}.json`;
  return JSON.parse(fs.readFileSync(path.join(episodeDir, filename), "utf-8"));
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
