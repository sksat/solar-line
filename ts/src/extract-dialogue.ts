#!/usr/bin/env node
/**
 * Phase 1 CLI: Extract dialogue lines from raw subtitle files.
 *
 * Usage:
 *   npm run extract-dialogue -- <vtt-file> --episode <num> --video-id <id> [--out-dir <dir>]
 *
 * Reads a VTT file, merges split cues, and writes epXX_lines.json.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";
import { parseVtt, stripVttTags } from "./subtitle.ts";
import { extractLines, validateEpisodeLines, deduplicateRollingText } from "./dialogue-extraction.ts";
import type { EpisodeLines } from "./dialogue-extraction-types.ts";
import {
  DEFAULT_MERGE_CONFIG,
  EXTRACTION_SCHEMA_VERSION,
} from "./dialogue-extraction-types.ts";

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    console.log(
      "Usage: extract-dialogue <vtt-file> --episode <num> --video-id <id> [--out-dir <dir>] [--max-gap-ms <ms>]"
    );
    process.exit(0);
  }

  const vttFile = args[0];
  const episode = parseInt(getArg(args, "--episode") ?? "", 10);
  const videoId = getArg(args, "--video-id") ?? "";
  const outDir =
    getArg(args, "--out-dir") ?? join(process.cwd(), "reports", "data", "episodes");
  const maxGapMs = parseInt(
    getArg(args, "--max-gap-ms") ?? String(DEFAULT_MERGE_CONFIG.maxGapMs),
    10
  );

  if (!vttFile || isNaN(episode) || !videoId) {
    console.error(
      "Error: --episode <num> and --video-id <id> are required"
    );
    process.exit(1);
  }

  // Read and parse VTT
  const rawContent = readFileSync(vttFile, "utf-8");
  const rawHash = createHash("sha256").update(rawContent).digest("hex");
  const entries = parseVtt(rawContent);

  console.log(`Parsed ${entries.length} raw cues from ${basename(vttFile)}`);

  // Filter out auto-generated clearing cues (10ms duration, whitespace only)
  const meaningful = entries.filter((e) => {
    const duration = e.endMs - e.startMs;
    const text = stripVttTags(e.text).trim();
    // Skip very short clearing cues and empty text
    return duration > 50 && text.length > 0;
  });

  console.log(
    `After filtering clearing cues: ${meaningful.length} meaningful cues`
  );

  // Handle rolling text deduplication for auto-generated subs
  // Auto-gen subs repeat the previous cue's text at the start of the next
  const deduplicated = deduplicateRollingText(meaningful);
  console.log(`After deduplicating rolling text: ${deduplicated.length} cues`);

  // Extract and merge lines
  const mergeConfig = { ...DEFAULT_MERGE_CONFIG, maxGapMs };
  const episodeSlug = `ep${String(episode).padStart(2, "0")}`;
  const lines = extractLines(deduplicated, episodeSlug, mergeConfig);

  console.log(`Extracted ${lines.length} dialogue lines`);

  // Build output
  const episodeLines: EpisodeLines = {
    schemaVersion: EXTRACTION_SCHEMA_VERSION,
    videoId,
    episode,
    sourceSubtitle: {
      language: "ja",
      source: "youtube-auto",
      rawContentHash: rawHash,
    },
    lines,
    extractedAt: new Date().toISOString(),
    mergeConfig,
  };

  // Validate
  const errors = validateEpisodeLines(episodeLines);
  if (errors.length > 0) {
    console.error("Validation errors:");
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  // Write output
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `${episodeSlug}_lines.json`);
  writeFileSync(outFile, JSON.stringify(episodeLines, null, 2) + "\n");
  console.log(`Wrote ${outFile}`);
}

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

main();
