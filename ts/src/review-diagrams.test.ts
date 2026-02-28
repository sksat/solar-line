/**
 * Tests for the review-diagrams script (Task 255).
 *
 * Validates that the diagram review script can load and summarize all diagrams.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { parseEpisodeMarkdown } from "./episode-mdx-parser.ts";
import type { OrbitalDiagram } from "./report-types.ts";

const REPORTS_DIR = path.resolve(import.meta.dirname ?? ".", "..", "..", "reports");
const EPISODES_DIR = path.join(REPORTS_DIR, "data", "episodes");

function loadAllDiagrams(): Array<{ episode: string; diagram: OrbitalDiagram }> {
  const results: Array<{ episode: string; diagram: OrbitalDiagram }> = [];
  const files = fs.readdirSync(EPISODES_DIR).filter(f => /^ep\d{2}\.md$/.test(f)).sort();
  for (const file of files) {
    const ep = file.replace(".md", "");
    const content = fs.readFileSync(path.join(EPISODES_DIR, file), "utf-8");
    const report = parseEpisodeMarkdown(content);
    for (const diagram of report.diagrams ?? []) {
      results.push({ episode: ep, diagram });
    }
  }
  return results;
}

describe("review-diagrams: diagram inventory", () => {
  const allDiagrams = loadAllDiagrams();

  it("loads diagrams from all 5 episodes", () => {
    const episodes = new Set(allDiagrams.map(d => d.episode));
    assert.ok(episodes.has("ep01"), "should have EP01 diagrams");
    assert.ok(episodes.has("ep02"), "should have EP02 diagrams");
    assert.ok(episodes.has("ep03"), "should have EP03 diagrams");
    assert.ok(episodes.has("ep04"), "should have EP04 diagrams");
    assert.ok(episodes.has("ep05"), "should have EP05 diagrams");
  });

  it("has at least 15 diagrams total", () => {
    assert.ok(allDiagrams.length >= 15, `Expected ≥15 diagrams, got ${allDiagrams.length}`);
  });

  it("every diagram has an id, title, and at least one orbit", () => {
    for (const { episode, diagram } of allDiagrams) {
      assert.ok(diagram.id, `${episode}: diagram missing id`);
      assert.ok(diagram.title, `${episode} ${diagram.id}: diagram missing title`);
      assert.ok(diagram.orbits.length > 0, `${episode} ${diagram.id}: diagram has no orbits`);
    }
  });

  it("every diagram has at least one transfer", () => {
    for (const { episode, diagram } of allDiagrams) {
      assert.ok(
        diagram.transfers.length > 0,
        `${episode} ${diagram.id}: diagram has no transfers`
      );
    }
  });

  it("every diagram has a description", () => {
    for (const { episode, diagram } of allDiagrams) {
      assert.ok(
        diagram.description && diagram.description.length > 20,
        `${episode} ${diagram.id}: diagram missing or short description`
      );
    }
  });
});

describe("review-diagrams: animation completeness", () => {
  const allDiagrams = loadAllDiagrams();
  const animated = allDiagrams.filter(d => d.diagram.animation);

  it("at least 10 diagrams are animated", () => {
    assert.ok(animated.length >= 10, `Expected ≥10 animated diagrams, got ${animated.length}`);
  });

  it("animated diagrams have durationSeconds > 0", () => {
    for (const { episode, diagram } of animated) {
      assert.ok(
        diagram.animation!.durationSeconds > 0,
        `${episode} ${diagram.id}: animation durationSeconds must be > 0`
      );
    }
  });

  it("animated diagrams have at least one timed transfer", () => {
    for (const { episode, diagram } of animated) {
      const timedTransfers = diagram.transfers.filter(
        t => t.startTime !== undefined && t.endTime !== undefined
      );
      assert.ok(
        timedTransfers.length > 0,
        `${episode} ${diagram.id}: animated diagram has no timed transfers`
      );
    }
  });
});
