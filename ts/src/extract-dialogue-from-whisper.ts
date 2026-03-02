#!/usr/bin/env node
/**
 * Phase 1 CLI: Extract dialogue lines from Whisper subtitle.json files.
 *
 * Usage:
 *   npm run extract-dialogue-whisper -- <subtitle.json> --episode <num> [--out-dir <dir>]
 *
 * Whisper segments are already semantically complete utterances, unlike VTT
 * auto-generated subtitles which split mid-sentence. Therefore we use a
 * lighter merge strategy: only merge adjacent segments with zero gap that
 * appear to be continuations (very short, or overlapping timestamps).
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { validateEpisodeLines, extractWhisperLines } from "./dialogue-extraction.ts";
import type { EpisodeLines } from "./dialogue-extraction-types.ts";
import {
  DEFAULT_MERGE_CONFIG,
  EXTRACTION_SCHEMA_VERSION,
} from "./dialogue-extraction-types.ts";
import type { RawSubtitleFile } from "./subtitle-types.ts";

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    console.log(
      "Usage: extract-dialogue-whisper <subtitle.json> --episode <num> [--out-dir <dir>] [--whisper-model <model>]"
    );
    process.exit(0);
  }

  const jsonFile = args[0];
  const episode = parseInt(getArg(args, "--episode") ?? "", 10);
  const outDir =
    getArg(args, "--out-dir") ?? join(process.cwd(), "raw_data", "whisper");
  const whisperModel = getArg(args, "--whisper-model");

  if (!jsonFile || isNaN(episode)) {
    console.error("Error: <subtitle.json> and --episode <num> are required");
    process.exit(1);
  }

  // Read and parse subtitle.json
  const rawContent = readFileSync(jsonFile, "utf-8");
  const subtitleFile: RawSubtitleFile = JSON.parse(rawContent);

  console.log(
    `Read ${subtitleFile.entries.length} entries from ${basename(jsonFile)} (source: ${subtitleFile.source})`
  );

  // Extract lines with Whisper-specific minimal merge
  const episodeSlug = `ep${String(episode).padStart(2, "0")}`;
  const lines = extractWhisperLines(subtitleFile.entries, episodeSlug);

  console.log(`Extracted ${lines.length} dialogue lines`);

  // Build output
  const episodeLines: EpisodeLines = {
    schemaVersion: EXTRACTION_SCHEMA_VERSION,
    videoId: subtitleFile.videoId,
    episode,
    sourceSubtitle: {
      language: subtitleFile.language,
      source: subtitleFile.source as EpisodeLines["sourceSubtitle"]["source"],
      rawContentHash: subtitleFile.rawContentHash,
      ...(whisperModel ? { whisperModel } : {}),
    },
    lines,
    extractedAt: new Date().toISOString(),
    mergeConfig: DEFAULT_MERGE_CONFIG,
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
