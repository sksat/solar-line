/**
 * Static site generator for SOLAR LINE 考証 reports.
 * Reads JSON data + markdown logs from reports/ and outputs static HTML to dist/.
 *
 * Usage: node --experimental-strip-types src/build.ts [--out-dir <path>] [--data-dir <path>]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { EpisodeReport, SiteManifest, SummaryReport, TranscriptionPageData, TransferDetailPage, VerdictCounts, DialogueQuote } from "./report-types.ts";
import type { EpisodeLines } from "./dialogue-extraction-types.ts";
import type { EpisodeDialogue, DialogueLine } from "./subtitle-types.ts";
import { parseSummaryMarkdown } from "./mdx-parser.ts";
import {
  renderIndex,
  renderEpisode,
  renderTransferDetailPage,
  renderLogsIndex,
  renderLogPage,
  renderSummaryPage,
  renderTranscriptionPage,
  renderTranscriptionIndex,
  renderTaskDashboard,
  renderTaskPage,
  renderADRIndex,
  renderADRPage,
  renderIdeasIndex,
  renderIdeaPage,
  renderExplorerPage,
  type NavEpisode,
} from "./templates.ts";
import { generateExplorerData } from "./generate-explorer-data.ts";

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

/** Convert milliseconds to MM:SS or HH:MM:SS timestamp string */
function msToTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Build a lineId → DialogueLine lookup from dialogue data */
function buildDialogueLookup(dialogue: DialogueLine[]): Map<string, DialogueLine> {
  const map = new Map<string, DialogueLine>();
  for (const line of dialogue) {
    if (line.lineId) map.set(line.lineId, line);
  }
  return map;
}

/** Resolve dialogueLineId references in an episode report's quotes.
 *  Warns on broken references but does not modify the quote's inline data
 *  (speaker/text/timestamp remain as authored — the reference is for validation). */
export function resolveDialogueReferences(
  report: EpisodeReport,
  dialogueData: EpisodeDialogue | null,
): string[] {
  const warnings: string[] = [];
  if (!report.dialogueQuotes || !dialogueData) return warnings;

  const lookup = buildDialogueLookup(dialogueData.dialogue);

  for (const quote of report.dialogueQuotes) {
    if (!quote.dialogueLineId) continue;

    const line = lookup.get(quote.dialogueLineId);
    if (!line) {
      warnings.push(
        `ep${String(report.episode).padStart(2, "0")}.json: quote "${quote.id}" references missing lineId "${quote.dialogueLineId}"`,
      );
    }
  }

  return warnings;
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
    if (!report) continue;

    // Load dialogue data and validate references
    const epNum = String(report.episode).padStart(2, "0");
    const dialogueData = readJsonFile<EpisodeDialogue>(
      path.join(episodesDir, `ep${epNum}_dialogue.json`),
    );
    const warnings = resolveDialogueReferences(report, dialogueData);
    for (const w of warnings) {
      console.warn(`⚠️  ${w}`);
    }

    episodes.push(report);
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

/** Discover summary report files in data/summary/ (supports both .json and .md formats).
 *  If both .json and .md exist for the same slug, throws an error to prevent ambiguity. */
export function discoverSummaries(dataDir: string): SummaryReport[] {
  const summaryDir = path.join(dataDir, "data", "summary");
  if (!fs.existsSync(summaryDir)) return [];

  const jsonFiles = fs.readdirSync(summaryDir).filter(f => f.endsWith(".json")).sort();
  const mdFiles = fs.readdirSync(summaryDir).filter(f => f.endsWith(".md")).sort();

  // Check for slug conflicts (same basename in both .json and .md)
  const jsonSlugs = new Set(jsonFiles.map(f => f.replace(/\.json$/, "")));
  const mdSlugs = new Set(mdFiles.map(f => f.replace(/\.md$/, "")));
  for (const slug of mdSlugs) {
    if (jsonSlugs.has(slug)) {
      throw new Error(
        `Duplicate summary report: both ${slug}.json and ${slug}.md exist. ` +
        `Remove one to resolve the conflict.`,
      );
    }
  }

  const summaries: SummaryReport[] = [];

  // Load JSON reports
  for (const file of jsonFiles) {
    const report = readJsonFile<SummaryReport>(path.join(summaryDir, file));
    if (report) summaries.push(report);
  }

  // Load Markdown reports
  for (const file of mdFiles) {
    try {
      const content = fs.readFileSync(path.join(summaryDir, file), "utf-8");
      const report = parseSummaryMarkdown(content);
      summaries.push(report);
    } catch (e) {
      console.error(`Error parsing ${file}: ${(e as Error).message}`);
    }
  }

  // Sort by slug for deterministic order
  summaries.sort((a, b) => a.slug.localeCompare(b.slug));
  return summaries;
}

/** Speaker registry entry from epXX_speakers.json */
interface SpeakerEntry {
  id: string;
  nameJa: string;
  nameEn?: string;
  aliases: string[];
  notes?: string;
}

/** Speakers file schema */
interface SpeakersFile {
  schemaVersion: number;
  episode: number;
  videoId: string;
  speakers: SpeakerEntry[];
}

/** Discover transcription data by reading lines, dialogue, and speakers files */
export function discoverTranscriptions(dataDir: string): TranscriptionPageData[] {
  const episodesDir = path.join(dataDir, "data", "episodes");
  if (!fs.existsSync(episodesDir)) return [];

  const files = fs.readdirSync(episodesDir)
    .filter(f => /^ep\d+_lines\.json$/.test(f))
    .sort();

  const transcriptions: TranscriptionPageData[] = [];
  for (const file of files) {
    const epNum = file.match(/^ep(\d+)_lines\.json$/)![1];
    const lines = readJsonFile<EpisodeLines>(path.join(episodesDir, file));
    if (!lines) continue;

    const dialogue = readJsonFile<EpisodeDialogue>(path.join(episodesDir, `ep${epNum}_dialogue.json`));
    const speakersFile = readJsonFile<SpeakersFile>(path.join(episodesDir, `ep${epNum}_speakers.json`));

    // Discover additional sources (e.g. ep01_lines_whisper.json)
    const additionalSources: TranscriptionPageData["additionalSources"] = [];
    const altPattern = new RegExp(`^ep${epNum}_lines_(\\w+)\\.json$`);
    const altFiles = fs.readdirSync(episodesDir).filter(f => altPattern.test(f)).sort();
    for (const altFile of altFiles) {
      const altLines = readJsonFile<EpisodeLines>(path.join(episodesDir, altFile));
      if (!altLines) continue;
      // Skip if same source type and hash as primary
      if (altLines.sourceSubtitle.source === lines.sourceSubtitle.source
          && altLines.sourceSubtitle.rawContentHash === lines.sourceSubtitle.rawContentHash) continue;
      additionalSources.push({
        source: altLines.sourceSubtitle.source,
        language: altLines.sourceSubtitle.language,
        ...(altLines.sourceSubtitle.whisperModel ? { whisperModel: altLines.sourceSubtitle.whisperModel } : {}),
        lines: altLines.lines.map(l => ({
          lineId: l.lineId,
          startMs: l.startMs,
          endMs: l.endMs,
          text: l.text,
          mergeReasons: l.mergeReasons,
        })),
      });
    }

    transcriptions.push({
      episode: lines.episode,
      videoId: lines.videoId,
      sourceInfo: {
        source: lines.sourceSubtitle.source,
        language: lines.sourceSubtitle.language,
        ...(lines.sourceSubtitle.whisperModel ? { whisperModel: lines.sourceSubtitle.whisperModel } : {}),
      },
      lines: lines.lines.map(l => ({
        lineId: l.lineId,
        startMs: l.startMs,
        endMs: l.endMs,
        text: l.text,
        mergeReasons: l.mergeReasons,
      })),
      dialogue: dialogue ? dialogue.dialogue.map(d => ({
        lineId: d.lineId,
        speakerId: d.speakerId,
        speakerName: d.speakerName,
        text: d.text,
        startMs: d.startMs,
        endMs: d.endMs,
        confidence: d.confidence,
        sceneId: d.sceneId,
      })) : null,
      speakers: speakersFile ? speakersFile.speakers.map(s => ({
        id: s.id,
        nameJa: s.nameJa,
        notes: s.notes,
      })) : null,
      scenes: dialogue ? dialogue.scenes.map(s => ({
        id: s.id,
        startMs: s.startMs,
        endMs: s.endMs,
        description: s.description,
      })) : null,
      title: dialogue ? dialogue.title : null,
      additionalSources: additionalSources.length > 0 ? additionalSources : undefined,
    });
  }
  return transcriptions;
}

/** A task entry parsed from current_tasks/*.md */
export interface TaskEntry {
  /** Task number (e.g. 1, 96, 128) */
  number: number;
  /** Task title from first heading */
  title: string;
  /** Status: DONE, TODO, or IN_PROGRESS */
  status: "DONE" | "TODO" | "IN_PROGRESS";
  /** First paragraph after status as summary (if any) */
  summary: string | null;
}

/** Parse a task markdown file into a TaskEntry */
export function parseTaskFile(filename: string, content: string): TaskEntry | null {
  const numMatch = filename.match(/^(\d+)/);
  if (!numMatch) return null;
  const num = parseInt(numMatch[1], 10);

  const lines = content.split("\n");

  // Extract title from first heading
  const titleLine = lines.find(l => /^#\s+/.test(l));
  const title = titleLine ? titleLine.replace(/^#+\s*Task\s+\d+:\s*/, "").replace(/^#+\s*/, "").trim() : filename;

  // Extract status
  const statusLine = lines.find(l => /Status:\s*(DONE|TODO|IN_PROGRESS)/i.test(l));
  const statusMatch = statusLine?.match(/Status:\s*(DONE|TODO|IN_PROGRESS)/i);
  const status = (statusMatch?.[1]?.toUpperCase() ?? "TODO") as TaskEntry["status"];

  // Extract summary: first content paragraph after status heading
  let summary: string | null = null;
  let pastStatus = false;
  for (const line of lines) {
    if (/Status:/i.test(line)) { pastStatus = true; continue; }
    if (!pastStatus) continue;
    if (line.trim() === "") continue;
    if (line.startsWith("#")) break;
    summary = line.trim();
    break;
  }

  return { number: num, title, status, summary };
}

/** Discover task files from current_tasks/ directory */
export function discoverTasks(projectRoot: string): TaskEntry[] {
  const tasksDir = path.join(projectRoot, "current_tasks");
  if (!fs.existsSync(tasksDir)) return [];

  const files = fs.readdirSync(tasksDir)
    .filter(f => /^\d+.*\.md$/.test(f))
    .sort();

  const tasks: TaskEntry[] = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(tasksDir, file), "utf-8");
    const task = parseTaskFile(file, content);
    if (task) tasks.push(task);
  }
  return tasks;
}

/** An ADR entry parsed from adr/*.md */
export interface ADREntry {
  /** ADR number (e.g. 1, 14) */
  number: number;
  /** ADR title */
  title: string;
  /** Status: Accepted, Superseded, Proposed, etc. */
  status: string;
  /** Full markdown content */
  content: string;
  /** Filename without extension */
  slug: string;
}

/** Parse an ADR markdown file */
export function parseADRFile(filename: string, content: string): ADREntry | null {
  const numMatch = filename.match(/^(\d+)/);
  if (!numMatch) return null;
  const num = parseInt(numMatch[1], 10);
  if (num === 0) return null; // skip template

  const lines = content.split("\n");
  const titleLine = lines.find(l => /^#\s+/.test(l));
  const title = titleLine ? titleLine.replace(/^#+\s*/, "").trim() : filename;

  // Extract status
  let status = "Unknown";
  let inStatusSection = false;
  for (const line of lines) {
    if (/^##\s+Status/i.test(line)) { inStatusSection = true; continue; }
    if (inStatusSection && line.startsWith("##")) break;
    if (inStatusSection && line.trim()) {
      status = line.trim();
      break;
    }
  }

  return {
    number: num,
    title,
    status,
    content,
    slug: filename.replace(/\.md$/, ""),
  };
}

/** Discover ADR files from adr/ directory */
export function discoverADRs(projectRoot: string): ADREntry[] {
  const adrDir = path.join(projectRoot, "adr");
  if (!fs.existsSync(adrDir)) return [];

  const files = fs.readdirSync(adrDir)
    .filter(f => /^\d+.*\.md$/.test(f))
    .sort();

  const adrs: ADREntry[] = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(adrDir, file), "utf-8");
    const adr = parseADRFile(file, content);
    if (adr) adrs.push(adr);
  }
  return adrs;
}

/** An idea entry parsed from ideas/*.md */
export interface IdeaEntry {
  /** Idea title from first heading */
  title: string;
  /** Full markdown content */
  content: string;
  /** Filename without extension */
  slug: string;
}

/** Discover idea files from ideas/ directory */
export function discoverIdeas(projectRoot: string): IdeaEntry[] {
  const ideasDir = path.join(projectRoot, "ideas");
  if (!fs.existsSync(ideasDir)) return [];

  const files = fs.readdirSync(ideasDir)
    .filter(f => f.endsWith(".md"))
    .sort();

  return files.map(file => {
    const content = fs.readFileSync(path.join(ideasDir, file), "utf-8");
    const lines = content.split("\n");
    const titleLine = lines.find(l => /^#\s+/.test(l));
    const title = titleLine ? titleLine.replace(/^#+\s*/, "").trim() : file.replace(/\.md$/, "");
    return { title, content, slug: file.replace(/\.md$/, "") };
  });
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
export function buildManifest(episodes: EpisodeReport[], logs: LogEntry[], summaries: SummaryReport[] = [], transcriptions: TranscriptionPageData[] = []): SiteManifest {
  const episodeVerdicts = episodes.map(ep => countVerdicts(ep));
  return {
    title: "SOLAR LINE 考証",
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
    summaryPages: summaries.filter(s => s.category !== "meta").length > 0
      ? summaries.filter(s => s.category !== "meta").map(s => ({
          title: s.title,
          slug: s.slug,
          path: `summary/${s.slug}.html`,
        }))
      : undefined,
    metaPages: summaries.filter(s => s.category === "meta").length > 0
      ? summaries.filter(s => s.category === "meta").map(s => ({
          title: s.title,
          slug: s.slug,
          path: `summary/${s.slug}.html`,
        }))
      : undefined,
    transcriptionPages: transcriptions.length > 0 ? transcriptions.map(t => ({
      episode: t.episode,
      lineCount: t.lines.length,
      hasDialogue: t.dialogue !== null,
      path: `transcriptions/ep-${String(t.episode).padStart(3, "0")}.html`,
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
  const transcriptions = discoverTranscriptions(dataDir);
  const manifest = buildManifest(episodes, logs, summaries, transcriptions);

  // Build nav episodes list for header dropdown
  const navEpisodes: NavEpisode[] = manifest.episodes.map(ep => ({
    episode: ep.episode,
    title: ep.title,
    path: ep.path,
  }));

  // Ensure output directories
  ensureDir(path.join(outDir, "episodes"));
  ensureDir(path.join(outDir, "logs"));
  if (summaries.length > 0) {
    ensureDir(path.join(outDir, "summary"));
  }

  // Generate index page
  fs.writeFileSync(path.join(outDir, "index.html"), renderIndex(manifest, navEpisodes));

  // Generate episode pages (and detail sub-pages for nested reports)
  for (const ep of episodes) {
    const filename = `ep-${String(ep.episode).padStart(3, "0")}.html`;
    fs.writeFileSync(path.join(outDir, "episodes", filename), renderEpisode(ep, manifest.summaryPages, episodes.length, navEpisodes, manifest.metaPages));

    // Generate detail sub-pages for episodes with detailPages
    if (ep.detailPages && ep.detailPages.length > 0) {
      const epDir = path.join(outDir, "episodes", `ep-${String(ep.episode).padStart(3, "0")}`);
      ensureDir(epDir);

      for (const dp of ep.detailPages) {
        const transfers = ep.transfers.filter(t => dp.transferIds.includes(t.id));
        const explorations = (ep.explorations ?? []).filter(e => dp.transferIds.includes(e.transferId));
        const diagrams = dp.diagramIds
          ? (ep.diagrams ?? []).filter(d => dp.diagramIds!.includes(d.id))
          : [];
        const charts = dp.chartIds
          ? (ep.timeSeriesCharts ?? []).filter(c => dp.chartIds!.includes(c.id))
          : [];

        fs.writeFileSync(
          path.join(epDir, `${dp.slug}.html`),
          renderTransferDetailPage(ep, dp, transfers, explorations, diagrams, charts, manifest.summaryPages, navEpisodes, manifest.metaPages),
        );
      }
    }
  }

  // Generate summary pages (with episode nav strip and auto-linking)
  for (const summary of summaries) {
    fs.writeFileSync(
      path.join(outDir, "summary", `${summary.slug}.html`),
      renderSummaryPage(summary, manifest.summaryPages, manifest.episodes, navEpisodes, manifest.metaPages),
    );
  }

  // Generate log pages
  const logManifest = manifest.logs;
  fs.writeFileSync(path.join(outDir, "logs", "index.html"), renderLogsIndex(logManifest, manifest.summaryPages, navEpisodes, manifest.metaPages));
  for (const log of logs) {
    fs.writeFileSync(
      path.join(outDir, "logs", `${log.filename}.html`),
      renderLogPage(log.filename, log.date, log.content, manifest.summaryPages, navEpisodes, manifest.metaPages),
    );
  }

  // Generate transcription pages
  if (transcriptions.length > 0) {
    ensureDir(path.join(outDir, "transcriptions"));
    fs.writeFileSync(
      path.join(outDir, "transcriptions", "index.html"),
      renderTranscriptionIndex(transcriptions, manifest.summaryPages, navEpisodes, manifest.metaPages),
    );
    for (const tr of transcriptions) {
      const filename = `ep-${String(tr.episode).padStart(3, "0")}.html`;
      fs.writeFileSync(
        path.join(outDir, "transcriptions", filename),
        renderTranscriptionPage(tr, manifest.summaryPages, navEpisodes, manifest.metaPages),
      );
    }
  }

  // Generate task dashboard and individual task pages
  const projectRoot = path.resolve(dataDir, "..");
  const tasks = discoverTasks(projectRoot);
  if (tasks.length > 0) {
    ensureDir(path.join(outDir, "meta"));
    ensureDir(path.join(outDir, "meta", "tasks"));
    fs.writeFileSync(
      path.join(outDir, "meta", "tasks.html"),
      renderTaskDashboard(tasks, manifest.summaryPages, navEpisodes, manifest.metaPages),
    );
    // Individual task pages (full markdown content)
    const tasksDir = path.join(projectRoot, "current_tasks");
    for (const task of tasks) {
      const taskFiles = fs.readdirSync(tasksDir).filter(f => f.startsWith(String(task.number).padStart(3, "0")));
      if (taskFiles.length > 0) {
        const content = fs.readFileSync(path.join(tasksDir, taskFiles[0]), "utf-8");
        fs.writeFileSync(
          path.join(outDir, "meta", "tasks", `${String(task.number).padStart(3, "0")}.html`),
          renderTaskPage(task, content, manifest.summaryPages, navEpisodes, manifest.metaPages),
        );
      }
    }
  }

  // Generate ADR pages
  const adrs = discoverADRs(projectRoot);
  if (adrs.length > 0) {
    ensureDir(path.join(outDir, "meta", "adr"));
    fs.writeFileSync(
      path.join(outDir, "meta", "adr", "index.html"),
      renderADRIndex(adrs, manifest.summaryPages, navEpisodes, manifest.metaPages),
    );
    for (const adr of adrs) {
      fs.writeFileSync(
        path.join(outDir, "meta", "adr", `${adr.slug}.html`),
        renderADRPage(adr, manifest.summaryPages, navEpisodes, manifest.metaPages),
      );
    }
  }

  // Generate ideas pages
  const ideas = discoverIdeas(projectRoot);
  if (ideas.length > 0) {
    ensureDir(path.join(outDir, "meta", "ideas"));
    fs.writeFileSync(
      path.join(outDir, "meta", "ideas", "index.html"),
      renderIdeasIndex(ideas, manifest.summaryPages, navEpisodes, manifest.metaPages),
    );
    for (const idea of ideas) {
      fs.writeFileSync(
        path.join(outDir, "meta", "ideas", `${idea.slug}.html`),
        renderIdeaPage(idea, manifest.summaryPages, navEpisodes, manifest.metaPages),
      );
    }
  }

  // Generate data explorer page and data
  ensureDir(path.join(outDir, "explorer"));
  fs.writeFileSync(
    path.join(outDir, "explorer", "index.html"),
    renderExplorerPage(manifest.summaryPages, navEpisodes, manifest.metaPages),
  );
  const explorerData = generateExplorerData(dataDir);
  fs.writeFileSync(path.join(outDir, "explorer-data.json"), JSON.stringify(explorerData));

  // Copy DuckDB explorer JS
  const explorerSrc = path.resolve(path.dirname(import.meta.filename ?? ""), "duckdb-explorer.js");
  if (fs.existsSync(explorerSrc)) {
    fs.copyFileSync(explorerSrc, path.join(outDir, "duckdb-explorer.js"));
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

  // Copy DAG viewer JS and state data for interactive visualization
  const dagViewerSrc = path.resolve(path.dirname(import.meta.filename ?? ""), "dag-viewer.js");
  if (fs.existsSync(dagViewerSrc)) {
    fs.copyFileSync(dagViewerSrc, path.join(outDir, "dag-viewer.js"));
  }
  const dagStateSrc = path.resolve(path.dirname(import.meta.filename ?? ""), "../../dag/state.json");
  if (fs.existsSync(dagStateSrc)) {
    fs.copyFileSync(dagStateSrc, path.join(outDir, "dag-state.json"));
  }
  // Copy DAG snapshots for historical viewer
  const dagSnapshotDir = path.resolve(path.dirname(import.meta.filename ?? ""), "../../dag/log/snapshots");
  if (fs.existsSync(dagSnapshotDir)) {
    const snapshotOutDir = path.join(outDir, "dag-snapshots");
    fs.mkdirSync(snapshotOutDir, { recursive: true });
    for (const f of fs.readdirSync(dagSnapshotDir)) {
      fs.copyFileSync(path.join(dagSnapshotDir, f), path.join(snapshotOutDir, f));
    }
  }

  // Copy rustdoc if available
  const rustdocCandidates = [
    path.join(dataDir, "..", "target", "doc"),          // from reports/../target/doc
    path.resolve(path.dirname(import.meta.filename ?? ""), "..", "..", "target", "doc"), // from ts/../../target/doc
  ];
  const rustdocDir = rustdocCandidates.find(d => fs.existsSync(d) && fs.existsSync(path.join(d, "solar_line_core")));
  if (rustdocDir) {
    const docOutDir = path.join(outDir, "doc");
    // Copy entire rustdoc output recursively
    function copyDirRecursive(src: string, dest: string): void {
      ensureDir(dest);
      for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          copyDirRecursive(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }
    copyDirRecursive(rustdocDir, docOutDir);
  }

  const totalTransfers = episodes.reduce((sum, ep) => sum + ep.transfers.length, 0);
  const docStatus = rustdocDir ? " + rustdoc" : "";
  const devDocs = [
    tasks.length > 0 ? `${tasks.length} tasks` : "",
    adrs.length > 0 ? `${adrs.length} ADRs` : "",
    ideas.length > 0 ? `${ideas.length} ideas` : "",
  ].filter(Boolean).join(", ");
  const devDocsStatus = devDocs ? ` + dev(${devDocs})` : "";
  console.log(
    `Built: ${episodes.length} episodes, ${totalTransfers} transfers, ${summaries.length} summaries, ${transcriptions.length} transcriptions, ${logs.length} logs${devDocsStatus}${docStatus} → ${outDir}`,
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
