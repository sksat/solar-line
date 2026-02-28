/**
 * Diagram review script for agent consumption (Task 255).
 *
 * Extracts all orbital diagrams from episode reports and produces a
 * structured text summary. Agents can read this output to review
 * diagram correctness without needing to render SVGs.
 *
 * Usage: npm run review-diagrams
 * Output: stdout text summary suitable for agent review
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseEpisodeMarkdown } from "./episode-mdx-parser.ts";
import type { OrbitalDiagram, OrbitDefinition, TransferArc } from "./report-types.ts";

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

function formatOrbit(o: OrbitDefinition): string {
  const parts = [
    `  ${o.id}: "${o.label}" r=${o.radius} ${o.color}`,
  ];
  if (o.angle !== undefined) parts.push(`angle=${o.angle.toFixed(3)} rad`);
  if (o.meanMotion) parts.push(`meanMotion=${o.meanMotion}`);
  if (o.angle !== undefined && !o.meanMotion) parts.push("⚠ STATIC (no meanMotion)");
  return parts.join(" ");
}

function formatTransfer(t: TransferArc, orbitMap: Map<string, OrbitDefinition>): string {
  const from = orbitMap.get(t.fromOrbitId);
  const to = orbitMap.get(t.toOrbitId);
  const fromR = from?.radius ?? "?";
  const toR = to?.radius ?? "?";
  const direction = from && to ? (to.radius > from.radius ? "↑ outward" : to.radius < from.radius ? "↓ inward" : "→ same") : "?";
  const parts = [
    `  "${t.label}" [${t.style}]`,
    `    ${t.fromOrbitId} (r=${fromR}) → ${t.toOrbitId} (r=${toR}) ${direction}`,
  ];
  if (t.scenarioId) parts.push(`    scenario: ${t.scenarioId}`);
  if (t.startTime !== undefined && t.endTime !== undefined) {
    parts.push(`    time: ${t.startTime}s → ${t.endTime}s (${((t.endTime - t.startTime) / 3600).toFixed(1)}h)`);
  }
  if (t.burnMarkers?.length) {
    for (const bm of t.burnMarkers) {
      parts.push(`    burn: "${bm.label}" at ${bm.angle.toFixed(2)} rad [${bm.type ?? "unknown"}]`);
    }
  }
  return parts.join("\n");
}

function reviewDiagram(episode: string, diagram: OrbitalDiagram): string {
  const lines: string[] = [];
  const orbitMap = new Map(diagram.orbits.map(o => [o.id, o]));

  lines.push(`## ${episode} / ${diagram.id}: ${diagram.title}`);
  if (diagram.description) {
    lines.push(`  Description: ${diagram.description.slice(0, 120)}...`);
  }
  lines.push(`  Center: ${diagram.centerLabel ?? "(none)"}, Scale: ${diagram.scaleMode ?? "linear"}, Unit: ${diagram.radiusUnit ?? "(none)"}`);
  if (diagram.epochAnnotation) lines.push(`  Epoch: ${diagram.epochAnnotation}`);
  lines.push(`  Animated: ${diagram.animation ? `yes (${diagram.animation.durationSeconds}s = ${(diagram.animation.durationSeconds / 3600).toFixed(1)}h)` : "no"}`);

  // Orbits
  lines.push(`  Orbits (${diagram.orbits.length}):`);
  const sorted = [...diagram.orbits].sort((a, b) => a.radius - b.radius);
  for (const orbit of sorted) {
    lines.push(formatOrbit(orbit));
  }

  // Transfers
  lines.push(`  Transfers (${diagram.transfers.length}):`);
  for (const transfer of diagram.transfers) {
    lines.push(formatTransfer(transfer, orbitMap));
  }

  // Scenarios
  if (diagram.scenarios?.length) {
    lines.push(`  Scenarios: ${diagram.scenarios.map(s => `${s.id}="${s.label}"`).join(", ")}`);
  }

  // Checks
  const issues: string[] = [];

  // Check: all real bodies with angle should have meanMotion in animated diagrams
  if (diagram.animation) {
    const referenceIds = new Set(["perijove", "perijove-point", "approach-point", "escape-point",
      "approach-25ru", "nav-crisis", "rings-inner", "rings-outer", "uranus-surface",
      "leo", "geo", "earth-soi"]);
    const staticBodies = diagram.orbits.filter(
      o => o.angle !== undefined && !referenceIds.has(o.id) && (!o.meanMotion || o.meanMotion === 0)
    );
    if (staticBodies.length > 0) {
      issues.push(`⚠ Static bodies in animated diagram: ${staticBodies.map(o => o.id).join(", ")}`);
    }
  }

  // Check: escape transfers should go outward
  for (const t of diagram.transfers) {
    if (t.label.includes("脱出")) {
      const from = orbitMap.get(t.fromOrbitId);
      const to = orbitMap.get(t.toOrbitId);
      if (from && to && to.radius < from.radius) {
        issues.push(`⚠ Escape transfer "${t.label}" goes inward (${t.fromOrbitId} r=${from.radius} → ${t.toOrbitId} r=${to.radius})`);
      }
    }
  }

  // Check: transfer orbit references exist
  for (const t of diagram.transfers) {
    if (!orbitMap.has(t.fromOrbitId)) {
      issues.push(`⚠ Transfer "${t.label}" references unknown fromOrbitId "${t.fromOrbitId}"`);
    }
    if (!orbitMap.has(t.toOrbitId)) {
      issues.push(`⚠ Transfer "${t.label}" references unknown toOrbitId "${t.toOrbitId}"`);
    }
  }

  // Check: animated transfers should have time ranges
  if (diagram.animation) {
    for (const t of diagram.transfers) {
      if (t.startTime === undefined || t.endTime === undefined) {
        issues.push(`⚠ Animated transfer "${t.label}" missing startTime/endTime`);
      }
    }
  }

  if (issues.length > 0) {
    lines.push(`  Issues (${issues.length}):`);
    for (const issue of issues) {
      lines.push(`    ${issue}`);
    }
  } else {
    lines.push(`  Issues: none`);
  }

  return lines.join("\n");
}

// Main
const allDiagrams = loadAllDiagrams();
console.log(`# Orbital Diagram Review`);
console.log(`# Generated: ${new Date().toISOString()}`);
console.log(`# Total: ${allDiagrams.length} diagrams across ${new Set(allDiagrams.map(d => d.episode)).size} episodes\n`);

let totalIssues = 0;
for (const { episode, diagram } of allDiagrams) {
  const review = reviewDiagram(episode, diagram);
  console.log(review);
  console.log();
  // Count issues
  const issueCount = (review.match(/⚠/g) || []).length;
  totalIssues += issueCount;
}

console.log(`# Summary: ${allDiagrams.length} diagrams, ${totalIssues} issue(s)`);
if (totalIssues > 0) {
  process.exit(1);
}
