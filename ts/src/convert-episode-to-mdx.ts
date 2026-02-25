/**
 * One-shot script to convert an episode JSON report to MDX format.
 * Usage: node --experimental-strip-types src/convert-episode-to-mdx.ts <episode-number>
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { EpisodeReport } from "./report-types.ts";

const epNum = parseInt(process.argv[2], 10);
if (isNaN(epNum) || epNum < 1 || epNum > 5) {
  console.error("Usage: convert-episode-to-mdx.ts <episode-number: 1-5>");
  process.exit(1);
}

const epPad = String(epNum).padStart(2, "0");
const jsonPath = path.resolve(import.meta.dirname ?? ".", "..", "..", "reports", "data", "episodes", `ep${epPad}.json`);
const mdPath = jsonPath.replace(/\.json$/, ".md");

if (!fs.existsSync(jsonPath)) {
  console.error(`Not found: ${jsonPath}`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as EpisodeReport;

const lines: string[] = [];

// Frontmatter
lines.push("---");
lines.push(`episode: ${report.episode}`);
lines.push(`title: "${report.title.replace(/"/g, '\\"')}"`);
lines.push(`summary: "${report.summary.replace(/"/g, '\\"')}"`);
lines.push("---");
lines.push("");

// Video cards
if (report.videoCards && report.videoCards.length > 0) {
  lines.push("```video-cards:");
  lines.push(JSON.stringify(report.videoCards, null, 2));
  lines.push("```");
  lines.push("");
}

// Dialogue quotes
if (report.dialogueQuotes && report.dialogueQuotes.length > 0) {
  lines.push("```dialogue-quotes:");
  lines.push(JSON.stringify(report.dialogueQuotes, null, 2));
  lines.push("```");
  lines.push("");
}

// Diagrams (report-level)
if (report.diagrams && report.diagrams.length > 0) {
  lines.push("```diagrams:");
  lines.push(JSON.stringify(report.diagrams, null, 2));
  lines.push("```");
  lines.push("");
}

// Time-series charts (report-level)
if (report.timeSeriesCharts && report.timeSeriesCharts.length > 0) {
  lines.push("```timeseries-charts:");
  lines.push(JSON.stringify(report.timeSeriesCharts, null, 2));
  lines.push("```");
  lines.push("");
}

// Detail pages
if (report.detailPages && report.detailPages.length > 0) {
  lines.push("```detail-pages:");
  lines.push(JSON.stringify(report.detailPages, null, 2));
  lines.push("```");
  lines.push("");
}

// Transfers (each as a ## section)
for (const t of report.transfers) {
  lines.push(`## ${t.id}`);
  lines.push("");

  // Transfer JSON (everything except explanation)
  const transferJson: Record<string, unknown> = {
    id: t.id,
    episode: t.episode,
    description: t.description,
    timestamp: t.timestamp,
    claimedDeltaV: t.claimedDeltaV,
    computedDeltaV: t.computedDeltaV,
    assumptions: t.assumptions,
    verdict: t.verdict,
    parameters: t.parameters,
    sources: t.sources,
  };
  if (t.evidenceQuoteIds) transferJson.evidenceQuoteIds = t.evidenceQuoteIds;
  if (t.reproductionCommand) transferJson.reproductionCommand = t.reproductionCommand;
  if (t.verdictSummary) transferJson.verdictSummary = t.verdictSummary;

  lines.push("```transfer:");
  lines.push(JSON.stringify(transferJson, null, 2));
  lines.push("```");
  lines.push("");

  // Explanation as prose markdown
  if (t.explanation) {
    // Replace literal \n in JSON string with actual newlines
    lines.push(t.explanation);
    lines.push("");
  }

  // Explorations linked to this transfer
  const transferExplorations = (report.explorations ?? []).filter(e => e.transferId === t.id);
  for (const exp of transferExplorations) {
    lines.push("```exploration:");
    lines.push(JSON.stringify(exp, null, 2));
    lines.push("```");
    lines.push("");
  }
}

// Glossary (at the end)
if (report.glossary && report.glossary.length > 0) {
  lines.push("```glossary:");
  lines.push(JSON.stringify(report.glossary, null, 2));
  lines.push("```");
  lines.push("");
}

fs.writeFileSync(mdPath, lines.join("\n"), "utf-8");
console.log(`Converted: ${jsonPath} → ${mdPath}`);
console.log(`Lines: ${lines.length}`);
