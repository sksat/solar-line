/**
 * Recalculate all numerical analyses and regenerate derived report data.
 *
 * Usage:
 *   npm run recalculate                              # EP01-05 calculations + stamp episode JSONs
 *   npm run recalculate -- --episode 1               # EP01 only
 *   npm run recalculate -- --regenerate-summaries    # Also regenerate summary reports
 *   npm run recalculate -- --dry-run                 # Show what would be computed without writing
 *
 * This script orchestrates:
 * 1. Per-episode orbital mechanics analyses (EP01-05) → calculations/*.json
 * 2. Reproduction command stamping on episode report transfers
 * 3. (Optional) Summary report regeneration (cross-episode, ship-kestrel)
 *
 * Note: Summary reports may contain manual edits beyond what the generator produces.
 * Use --regenerate-summaries only when you want to reset them to generator output.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { analyzeEpisode1 } from "./ep01-analysis.ts";
import { analyzeEpisode2 } from "./ep02-analysis.ts";
import { analyzeEpisode3 } from "./ep03-analysis.ts";
import { analyzeEpisode4 } from "./ep04-analysis.ts";
import { analyzeEpisode5 } from "./ep05-analysis.ts";
import { generateCrossEpisodeReport } from "./cross-episode-analysis.ts";
import { generateShipKestrelReport } from "./ship-kestrel-analysis.ts";
import type { EpisodeReport } from "./report-types.ts";

// --- CLI argument parsing ---
const args = process.argv.slice(2);

let episodeFilter: number | null = null;
let regenerateSummaries = false;
let dryRun = false;
let calcDir = path.resolve("..", "reports", "data", "calculations");
let summaryDir = path.resolve("..", "reports", "data", "summary");
let episodesDir = path.resolve("..", "reports", "data", "episodes");

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--episode" && args[i + 1]) {
    episodeFilter = parseInt(args[++i], 10);
  } else if (args[i] === "--regenerate-summaries") {
    regenerateSummaries = true;
  } else if (args[i] === "--dry-run") {
    dryRun = true;
  } else if (args[i] === "--calc-dir" && args[i + 1]) {
    calcDir = path.resolve(args[++i]);
  } else if (args[i] === "--summary-dir" && args[i + 1]) {
    summaryDir = path.resolve(args[++i]);
  } else if (args[i] === "--episodes-dir" && args[i + 1]) {
    episodesDir = path.resolve(args[++i]);
  }
}

// --- Helpers ---
interface AnalysisResult {
  episode: number;
  label: string;
  data: unknown;
  durationMs: number;
}

function writeJson(filepath: string, data: unknown): void {
  if (dryRun) {
    console.log(`  [dry-run] Would write: ${filepath}`);
    return;
  }
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + "\n");
  console.log(`  Written: ${filepath}`);
}

function timeExec<T>(label: string, fn: () => T): { result: T; durationMs: number } {
  const start = performance.now();
  const result = fn();
  const durationMs = Math.round(performance.now() - start);
  return { result, durationMs };
}

// --- Episode analyses ---
const episodeAnalyzers: Array<{ episode: number; label: string; fn: () => unknown }> = [
  { episode: 1, label: "EP01 Mars→Ganymede", fn: analyzeEpisode1 },
  { episode: 2, label: "EP02 Jupiter→Saturn/Enceladus", fn: analyzeEpisode2 },
  { episode: 3, label: "EP03 Enceladus→Titania", fn: analyzeEpisode3 },
  { episode: 4, label: "EP04 Titania→Earth departure", fn: analyzeEpisode4 },
  { episode: 5, label: "EP05 Uranus→Earth arrival", fn: analyzeEpisode5 },
];

// --- Main ---
console.log("=== SOLAR LINE 数値分析一括更新 ===\n");

const results: AnalysisResult[] = [];
const totalStart = performance.now();

// 1. Per-episode analyses → calculations/*.json
{
  const analyzers = episodeFilter
    ? episodeAnalyzers.filter(a => a.episode === episodeFilter)
    : episodeAnalyzers;

  if (analyzers.length === 0) {
    console.error(`Episode ${episodeFilter} not found (valid: 1-5)`);
    process.exit(1);
  }

  console.log("--- Per-Episode Analyses ---");
  for (const { episode, label, fn } of analyzers) {
    process.stdout.write(`  ${label}...`);
    const { result: data, durationMs } = timeExec(label, fn);
    results.push({ episode, label, data, durationMs });
    console.log(` done (${durationMs}ms)`);

    const filename = `ep${String(episode).padStart(2, "0")}_calculations.json`;
    writeJson(path.join(calcDir, filename), {
      _meta: {
        generatedAt: new Date().toISOString(),
        reproductionCommand: `npm run recalculate -- --episode ${episode}`,
        durationMs,
      },
      ...data as Record<string, unknown>,
    });
  }
  console.log();
}

// 2. Stamp per-analysis reproduction commands on episode report transfers
// Each transfer gets a specific test command instead of the blanket recalculate.
// Format: compute + verify commands for each analysis.
{
  /** Map transfer IDs to per-analysis test patterns in analysis-reproduction.test.ts */
  const transferTestPatterns: Record<string, string> = {
    // EP01
    "ep01-transfer-01": "EP01 reproduction: Hohmann baseline",
    "ep01-transfer-02": "EP01 reproduction: 72h brachistochrone",
    "ep01-transfer-03": "EP01 reproduction: 72h brachistochrone",
    "ep01-transfer-04": "EP01 reproduction: mass boundary",
    // EP02
    "ep02-transfer-01": "EP02 reproduction: Hohmann baseline",
    "ep02-transfer-02": "EP02 reproduction: Jupiter escape",
    "ep02-transfer-03": "EP02 reproduction: heliocentric transfer",
    "ep02-transfer-04": "EP02 reproduction: Saturn capture",
    "ep02-transfer-05": "EP02 reproduction: Enceladus orbital",
    // EP03
    "ep03-transfer-01": "EP03 reproduction: Hohmann baseline",
    "ep03-transfer-02": "EP03 reproduction: Hohmann baseline",
    "ep03-transfer-03": "EP03 reproduction: 143h brachistochrone",
    "ep03-transfer-04": "EP03 reproduction: navigation crisis",
    "ep03-transfer-05": "EP03 reproduction: Uranus/Titania capture",
    // EP04
    "ep04-transfer-01": "EP04 reproduction: Hohmann baseline",
    "ep04-transfer-02": "EP04 reproduction: plasmoid analysis",
    "ep04-transfer-03": "EP04 reproduction: brachistochrone at 65",
    "ep04-transfer-04": "EP04 reproduction: fleet intercept",
    "ep04-transfer-05": "EP04 reproduction: damage assessment",
    // EP05
    "ep05-transfer-01": "EP05 reproduction: Hohmann baseline",
    "ep05-transfer-02": "EP05 reproduction: brachistochrone by mass",
    "ep05-transfer-03": "EP05 reproduction: Earth capture",
    "ep05-transfer-04": "EP05 reproduction: nozzle lifespan",
    "ep05-transfer-05": "EP05 reproduction: Oberth effect",
  };

  const episodes = episodeFilter ? [episodeFilter] : [1, 2, 3, 4, 5];
  console.log("--- Stamp Per-Analysis Reproduction Commands ---");
  for (const ep of episodes) {
    const slug = `ep${String(ep).padStart(2, "0")}`;
    // Skip MDX episodes — reproduction commands are already in the transfer directives
    if (fs.existsSync(path.join(episodesDir, `${slug}.md`))) {
      console.log(`  ${slug}.md (MDX format, skipping stamp)`);
      continue;
    }
    const filename = `${slug}.json`;
    const filepath = path.join(episodesDir, filename);
    if (!fs.existsSync(filepath)) continue;

    const report: EpisodeReport = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    let changed = false;

    for (const t of report.transfers ?? []) {
      const pattern = transferTestPatterns[t.id];
      const cmd = pattern
        ? `npm run recalculate -- --episode ${ep}\nnpm run test:analyses -- --test-name-pattern "${pattern}"`
        : `npm run recalculate -- --episode ${ep}\nnpm run test:analyses -- --test-name-pattern "EP${String(ep).padStart(2, "0")}"`;
      if (t.reproductionCommand !== cmd) {
        t.reproductionCommand = cmd;
        changed = true;
      }
    }

    if (changed && !dryRun) {
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2) + "\n");
      console.log(`  Stamped ${filename}`);
    } else if (changed) {
      console.log(`  [dry-run] Would stamp ${filename}`);
    } else {
      console.log(`  ${filename} already up-to-date`);
    }
  }
  console.log();
}

// 3. Summary report regeneration (only with --regenerate-summaries)
if (regenerateSummaries && !episodeFilter) {
  console.log("--- Summary Reports (regenerating from code) ---");

  // Check if MDX files exist (they take priority over generated JSON)
  const crossMdPath = path.join(summaryDir, "cross-episode.md");
  const shipMdPath = path.join(summaryDir, "ship-kestrel.md");

  if (fs.existsSync(crossMdPath)) {
    console.log("  Cross-episode: skipped (MDX file exists — edit .md directly)");
  } else {
    process.stdout.write("  Cross-episode analysis...");
    const { result: crossReport, durationMs: crossMs } = timeExec("cross-episode", generateCrossEpisodeReport);
    console.log(` done (${crossMs}ms)`);
    writeJson(path.join(summaryDir, "cross-episode.json"), crossReport);
  }

  if (fs.existsSync(shipMdPath)) {
    console.log("  Ship Kestrel: skipped (MDX file exists — edit .md directly)");
  } else {
    process.stdout.write("  Ship Kestrel dossier...");
    const { result: shipReport, durationMs: shipMs } = timeExec("ship-kestrel", generateShipKestrelReport);
    console.log(` done (${shipMs}ms)`);
    writeJson(path.join(summaryDir, "ship-kestrel.json"), shipReport);
  }

  console.log();
} else if (!regenerateSummaries && !episodeFilter) {
  console.log("--- Summary Reports ---");
  console.log("  Skipped (use --regenerate-summaries to regenerate)");
  console.log();
}

// --- Final summary ---
const totalMs = Math.round(performance.now() - totalStart);
console.log("=== Complete ===");
console.log(`Total time: ${totalMs}ms`);
if (results.length > 0) {
  console.log(`Episodes computed: ${results.map(r => `EP${String(r.episode).padStart(2, "0")}`).join(", ")}`);
}
if (dryRun) {
  console.log("(dry-run mode — no files were written)");
}
