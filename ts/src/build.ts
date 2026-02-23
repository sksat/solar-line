/**
 * Static site generator for SOLAR LINE 考察 reports.
 * Reads JSON data + markdown logs from reports/ and outputs static HTML to dist/.
 *
 * Usage: node --experimental-strip-types src/build.ts [--out-dir <path>] [--data-dir <path>]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { EpisodeReport, SiteManifest } from "./report-types.ts";
import {
  renderIndex,
  renderEpisode,
  renderLogsIndex,
  renderLogPage,
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

/** Generate the site manifest from discovered data */
export function buildManifest(episodes: EpisodeReport[], logs: LogEntry[]): SiteManifest {
  return {
    title: "SOLAR LINE 考察",
    generatedAt: new Date().toISOString(),
    episodes: episodes.map(ep => ({
      episode: ep.episode,
      title: ep.title,
      transferCount: ep.transfers.length,
      path: `episodes/ep-${String(ep.episode).padStart(3, "0")}.html`,
    })),
    logs: logs.map(log => ({
      filename: log.filename,
      date: log.date,
      description: log.description,
      path: `logs/${log.filename}.html`,
    })),
  };
}

/** Run the full build pipeline */
export function build(config: BuildConfig): void {
  const { dataDir, outDir } = config;

  // Discover content
  const episodes = discoverEpisodes(dataDir);
  const logs = discoverLogs(dataDir);
  const manifest = buildManifest(episodes, logs);

  // Ensure output directories
  ensureDir(path.join(outDir, "episodes"));
  ensureDir(path.join(outDir, "logs"));

  // Generate index page
  fs.writeFileSync(path.join(outDir, "index.html"), renderIndex(manifest));

  // Generate episode pages
  for (const ep of episodes) {
    const filename = `ep-${String(ep.episode).padStart(3, "0")}.html`;
    fs.writeFileSync(path.join(outDir, "episodes", filename), renderEpisode(ep));
  }

  // Generate log pages
  const logManifest = manifest.logs;
  fs.writeFileSync(path.join(outDir, "logs", "index.html"), renderLogsIndex(logManifest));
  for (const log of logs) {
    fs.writeFileSync(
      path.join(outDir, "logs", `${log.filename}.html`),
      renderLogPage(log.filename, log.date, log.content),
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
      }
    }
  }

  // Copy calculator JS for interactive episode pages
  const calcSrc = path.resolve(path.dirname(import.meta.filename ?? ""), "calculator.js");
  if (fs.existsSync(calcSrc)) {
    fs.copyFileSync(calcSrc, path.join(outDir, "calculator.js"));
  }

  const totalTransfers = episodes.reduce((sum, ep) => sum + ep.transfers.length, 0);
  console.log(
    `Built: ${episodes.length} episodes, ${totalTransfers} transfers, ${logs.length} logs → ${outDir}`,
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
