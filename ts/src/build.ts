/**
 * Static site generator for SOLAR LINE 考察 reports.
 * Reads JSON data + markdown logs from reports/ and outputs static HTML to dist/.
 *
 * Usage: node --experimental-strip-types src/build.ts [--out-dir <path>] [--data-dir <path>]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { EpisodeReport, SiteManifest, SummaryReport, VerdictCounts } from "./report-types.ts";
import {
  renderIndex,
  renderEpisode,
  renderLogsIndex,
  renderLogPage,
  renderSummaryPage,
} from "./templates.ts";

export interface BuildConfig {
  /** Directory containing reports/data/ and reports/logs/ */
  dataDir: string;
  /** Output directory for generated HTML */
  outDir: string;
}

/** Read and parse a JSON file, returning null if it doesn't exist */
function readJsonFile<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/** Recursively create a directory */
function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

/** Discover episode JSON files in data/episodes/ */
export function discoverEpisodes(dataDir: string): EpisodeReport[] {
  const episodesDir = path.join(dataDir, "data", "episodes");
  if (!fs.existsSync(episodesDir)) return [];

  const files = fs.readdirSync(episodesDir)
    .filter(f => /^ep\d+\.json$/.test(f))
    .sort();

  const episodes: EpisodeReport[] = [];
  for (const file of files) {
    const report = readJsonFile<EpisodeReport>(path.join(episodesDir, file));
    if (report) episodes.push(report);
  }
  return episodes;
}

/** Session log metadata */
export interface LogEntry {
  filename: string;
  date: string;
  description: string;
  content: string;
}

/** Discover markdown log files in logs/ */
export function discoverLogs(dataDir: string): LogEntry[] {
  const logsDir = path.join(dataDir, "logs");
  if (!fs.existsSync(logsDir)) return [];

  const files = fs.readdirSync(logsDir)
    .filter(f => f.endsWith(".md"))
    .sort();

  return files.map(file => {
    const content = fs.readFileSync(path.join(logsDir, file), "utf-8");
    const basename = file.replace(/\.md$/, "");
    // Extract date from filename if it matches YYYY-MM-DD pattern
    const dateMatch = basename.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : basename;
    // First line as description (strip leading #)
    const firstLine = content.split("\n").find(l => l.trim() !== "") ?? basename;
    const description = firstLine.replace(/^#+\s*/, "");
    return { filename: basename, date, description, content };
  });
}

/** Discover summary JSON files in data/summary/ */
export function discoverSummaries(dataDir: string): SummaryReport[] {
  const summaryDir = path.join(dataDir, "data", "summary");
  if (!fs.existsSync(summaryDir)) return [];

  const files = fs.readdirSync(summaryDir)
    .filter(f => f.endsWith(".json"))
    .sort();

  const summaries: SummaryReport[] = [];
  for (const file of files) {
    const report = readJsonFile<SummaryReport>(path.join(summaryDir, file));
    if (report) summaries.push(report);
  }
  return summaries;
}

/** Count verdict types in an episode's transfers */
export function countVerdicts(ep: EpisodeReport): VerdictCounts {
  const counts: VerdictCounts = { plausible: 0, implausible: 0, conditional: 0, indeterminate: 0, reference: 0 };
  for (const t of ep.transfers) {
    counts[t.verdict]++;
  }
  return counts;
}

/** Sum multiple VerdictCounts */
function sumVerdicts(all: VerdictCounts[]): VerdictCounts {
  const total: VerdictCounts = { plausible: 0, implausible: 0, conditional: 0, indeterminate: 0, reference: 0 };
  for (const v of all) {
    total.plausible += v.plausible;
    total.implausible += v.implausible;
    total.conditional += v.conditional;
    total.indeterminate += v.indeterminate;
    total.reference += v.reference;
  }
  return total;
}

/** Generate the site manifest from discovered data */
export function buildManifest(episodes: EpisodeReport[], logs: LogEntry[], summaries: SummaryReport[] = []): SiteManifest {
  const episodeVerdicts = episodes.map(ep => countVerdicts(ep));
  return {
    title: "SOLAR LINE 考察",
    generatedAt: new Date().toISOString(),
    episodes: episodes.map((ep, i) => ({
      episode: ep.episode,
      title: ep.title,
      transferCount: ep.transfers.length,
      summary: ep.summary,
      verdicts: episodeVerdicts[i],
      path: `episodes/ep-${String(ep.episode).padStart(3, "0")}.html`,
    })),
    totalVerdicts: episodeVerdicts.length > 0 ? sumVerdicts(episodeVerdicts) : undefined,
    logs: logs.map(log => ({
      filename: log.filename,
      date: log.date,
      description: log.description,
      path: `logs/${log.filename}.html`,
    })),
    summaryPages: summaries.length > 0 ? summaries.map(s => ({
      title: s.title,
      slug: s.slug,
      path: `summary/${s.slug}.html`,
    })) : undefined,
  };
}

/** Run the full build pipeline */
export function build(config: BuildConfig): void {
  const { dataDir, outDir } = config;

  // Discover content
  const episodes = discoverEpisodes(dataDir);
  const logs = discoverLogs(dataDir);
  const summaries = discoverSummaries(dataDir);
  const manifest = buildManifest(episodes, logs, summaries);

  // Ensure output directories
  ensureDir(path.join(outDir, "episodes"));
  ensureDir(path.join(outDir, "logs"));
  if (summaries.length > 0) {
    ensureDir(path.join(outDir, "summary"));
  }

  // Generate index page
  fs.writeFileSync(path.join(outDir, "index.html"), renderIndex(manifest));

  // Generate episode pages
  for (const ep of episodes) {
    const filename = `ep-${String(ep.episode).padStart(3, "0")}.html`;
    fs.writeFileSync(path.join(outDir, "episodes", filename), renderEpisode(ep, manifest.summaryPages, episodes.length));
  }

  // Generate summary pages (with episode nav strip and auto-linking)
  for (const summary of summaries) {
    fs.writeFileSync(
      path.join(outDir, "summary", `${summary.slug}.html`),
      renderSummaryPage(summary, manifest.summaryPages, manifest.episodes),
    );
  }

  // Generate log pages
  const logManifest = manifest.logs;
  fs.writeFileSync(path.join(outDir, "logs", "index.html"), renderLogsIndex(logManifest, manifest.summaryPages));
  for (const log of logs) {
    fs.writeFileSync(
      path.join(outDir, "logs", `${log.filename}.html`),
      renderLogPage(log.filename, log.date, log.content, manifest.summaryPages),
    );
  }

  // Write manifest JSON (useful for WASM-interactive pages later)
  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  // .nojekyll tells GitHub Pages to skip Jekyll processing (needed for WASM files)
  fs.writeFileSync(path.join(outDir, ".nojekyll"), "");

  // Copy WASM files if available (for interactive calculator)
  // Try multiple candidate locations for the wasm-pack output
  const wasmCandidates = [
    path.join(dataDir, "..", "ts", "pkg"),  // from repo root: reports/../ts/pkg
    path.join(dataDir, "..", "pkg"),         // legacy path
    path.resolve(path.dirname(import.meta.filename ?? ""), "..", "pkg"), // relative to this file: ts/pkg
  ];
  const wasmPkgDir = wasmCandidates.find(d => fs.existsSync(d));
  const wasmOutDir = path.join(outDir, "wasm");
  if (wasmPkgDir) {
    ensureDir(wasmOutDir);
    const wasmFiles = ["solar_line_wasm_bg.wasm", "solar_line_wasm.js", "solar_line_wasm.d.ts"];
    for (const wf of wasmFiles) {
      const src = path.join(wasmPkgDir, wf);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(wasmOutDir, wf));
      } else {
        console.warn(`⚠️  WASM file missing: ${wf} — calculator will use JS fallback`);
      }
    }
  } else {
    console.warn("⚠️  WASM package directory not found — calculator will use JS fallback");
  }

  // Copy calculator JS for interactive episode pages
  const calcSrc = path.resolve(path.dirname(import.meta.filename ?? ""), "calculator.js");
  if (fs.existsSync(calcSrc)) {
    fs.copyFileSync(calcSrc, path.join(outDir, "calculator.js"));
  }

  // Copy orbital animation JS for interactive diagrams
  const animSrc = path.resolve(path.dirname(import.meta.filename ?? ""), "orbital-animation.js");
  if (fs.existsSync(animSrc)) {
    fs.copyFileSync(animSrc, path.join(outDir, "orbital-animation.js"));
  }

  const totalTransfers = episodes.reduce((sum, ep) => sum + ep.transfers.length, 0);
  console.log(
    `Built: ${episodes.length} episodes, ${totalTransfers} transfers, ${summaries.length} summaries, ${logs.length} logs → ${outDir}`,
  );
}

// CLI entry point
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename ?? "")) {
  const args = process.argv.slice(2);
  let outDir = path.resolve("dist");
  let dataDir = path.resolve("..", "reports");

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--out-dir" && args[i + 1]) { outDir = path.resolve(args[++i]); }
    if (args[i] === "--data-dir" && args[i + 1]) { dataDir = path.resolve(args[++i]); }
  }

  build({ dataDir, outDir });
}
