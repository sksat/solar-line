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
import { validateEpisodeLines } from "./dialogue-extraction.ts";
import type { ExtractedLine, EpisodeLines, MergeReason } from "./dialogue-extraction-types.ts";
import {
  DEFAULT_MERGE_CONFIG,
  EXTRACTION_SCHEMA_VERSION,
} from "./dialogue-extraction-types.ts";
import type { RawSubtitleFile, RawSubtitleEntry } from "./subtitle-types.ts";

/**
 * Extract lines from Whisper segments with minimal merging.
 *
 * Whisper segments are already sentence-level, so we only merge:
 * - Segments with zero or negative gap (overlapping timestamps)
 * - Very short segments (< 2 chars) that are likely fragments
 */
function extractWhisperLines(
  entries: RawSubtitleEntry[],
  episodeSlug: string,
): ExtractedLine[] {
  const nonEmpty = entries.filter((e) => e.text.trim().length > 0);
  if (nonEmpty.length === 0) return [];

  const lines: ExtractedLine[] = [];
  let lineNum = 1;

  let currentIds: string[] = [nonEmpty[0].id];
  let currentText = nonEmpty[0].text.trim();
  let currentStart = nonEmpty[0].startMs;
  let currentEnd = nonEmpty[0].endMs;
  let currentReasons: MergeReason[] = [];

  for (let i = 1; i < nonEmpty.length; i++) {
    const next = nonEmpty[i];
    const gap = next.startMs - currentEnd;
    const nextText = next.text.trim();

    // Merge only when: zero/negative gap AND current segment is very short (fragment)
    const isFragment = currentText.length < 3;
    const isOverlap = gap <= 0;
    const shouldMerge = isOverlap && isFragment;

    if (shouldMerge) {
      currentText = currentText + nextText;
      currentEnd = Math.max(currentEnd, next.endMs);
      currentIds.push(next.id);
      if (!currentReasons.includes("small_gap")) {
        currentReasons.push("small_gap");
      }
    } else {
      // Emit the accumulated line
      lines.push({
        lineId: `${episodeSlug}-line-${String(lineNum).padStart(3, "0")}`,
        startMs: currentStart,
        endMs: currentEnd,
        text: currentText,
        rawEntryIds: currentIds,
        mergeReasons: currentReasons,
      });
      lineNum++;

      currentIds = [next.id];
      currentText = nextText;
      currentStart = next.startMs;
      currentEnd = next.endMs;
      currentReasons = [];
    }
  }

  // Emit the last accumulated line
  lines.push({
    lineId: `${episodeSlug}-line-${String(lineNum).padStart(3, "0")}`,
    startMs: currentStart,
    endMs: currentEnd,
    text: currentText,
    rawEntryIds: currentIds,
    mergeReasons: currentReasons,
  });

  return lines;
}

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
