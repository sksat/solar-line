#!/usr/bin/env node
/**
 * Process raw Whisper JSON output into subtitle.json and quality.json.
 *
 * Usage:
 *   npm run process-whisper -- <whisper.json> --video-id <id> [--out-dir raw_data/whisper]
 *
 * This is the post-processing step that run-whisper.ts does after calling the
 * whisper CLI. Use this when you've already run whisper separately.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildWhisperSubtitleFile,
  generateQualityReport,
  DEFAULT_QUALITY_THRESHOLDS,
} from "./whisper.ts";
import { validateRawSubtitleFile } from "./subtitle.ts";

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    console.log(
      "Usage: process-whisper <whisper.json> --video-id <id> [--out-dir raw_data/whisper]"
    );
    process.exit(0);
  }

  const jsonFile = args[0];
  const videoId = getArg(args, "--video-id") ?? "";
  const outDir = getArg(args, "--out-dir") ?? "raw_data/whisper";

  if (!jsonFile || !videoId) {
    console.error("Error: <whisper.json> and --video-id are required");
    process.exit(1);
  }

  mkdirSync(outDir, { recursive: true });
  const rawJson = readFileSync(jsonFile, "utf-8");
  const whisperOutput = JSON.parse(rawJson);

  // Generate quality report
  const qualityReport = generateQualityReport(whisperOutput);
  const qualityPath = resolve(outDir, `${videoId}_quality.json`);
  writeFileSync(qualityPath, JSON.stringify(qualityReport, null, 2));
  console.log(`Quality report: ${qualityPath}`);
  console.log(
    `  Segments: ${qualityReport.reliableSegments}/${qualityReport.totalSegments} reliable`
  );
  console.log(`  Avg log prob: ${qualityReport.avgLogProb.toFixed(3)}`);
  console.log(
    `  Avg no-speech prob: ${qualityReport.avgNoSpeechProb.toFixed(3)}`
  );
  console.log(`  Detected language: ${qualityReport.detectedLanguage}`);

  // Build RawSubtitleFile
  const subtitleFile = buildWhisperSubtitleFile({
    videoId,
    rawJson,
    thresholds: DEFAULT_QUALITY_THRESHOLDS,
  });

  // Validate
  const errors = validateRawSubtitleFile(subtitleFile);
  if (errors.length > 0) {
    console.warn("Validation warnings:");
    for (const err of errors) {
      console.warn(`  - ${err}`);
    }
  }

  const subtitlePath = resolve(outDir, `${videoId}_subtitle.json`);
  writeFileSync(subtitlePath, JSON.stringify(subtitleFile, null, 2));
  console.log(
    `Subtitle file: ${subtitlePath} (${subtitleFile.entries.length} entries)`
  );
}

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

main();
