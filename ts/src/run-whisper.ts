/**
 * CLI script: Run Whisper STT on audio and produce subtitle pipeline output.
 *
 * Usage:
 *   npm run whisper -- <audio-file> --video-id <id> [--model medium] [--language ja] [--out-dir raw_data/whisper]
 *
 * Requires: OpenAI Whisper installed (`pip install openai-whisper`)
 *
 * Outputs:
 *   - <out-dir>/<videoId>_whisper.json (raw Whisper output)
 *   - <out-dir>/<videoId>_subtitle.json (RawSubtitleFile for pipeline)
 *   - <out-dir>/<videoId>_quality.json (quality report)
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import {
  buildWhisperSubtitleFile,
  generateQualityReport,
  DEFAULT_QUALITY_THRESHOLDS,
} from "./whisper.ts";
import { validateRawSubtitleFile } from "./subtitle.ts";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  audioFile: string;
  videoId: string;
  model: string;
  language: string;
  outDir: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  let audioFile = "";
  let videoId = "";
  let model = "medium";
  let language = "ja";
  let outDir = "raw_data/whisper";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--video-id":
        videoId = args[++i];
        break;
      case "--model":
        model = args[++i];
        break;
      case "--language":
        language = args[++i];
        break;
      case "--out-dir":
        outDir = args[++i];
        break;
      default:
        if (!args[i].startsWith("--") && !audioFile) {
          audioFile = args[i];
        }
    }
  }

  if (!audioFile) {
    console.error("Error: audio file path is required");
    console.error(
      "Usage: npm run whisper -- <audio-file> --video-id <id> [--model medium] [--language ja]"
    );
    process.exit(1);
  }

  if (!videoId) {
    // Try to extract from filename: ep05_sm45987761.wav → sm45987761
    const base = basename(audioFile).replace(/\.[^.]+$/, "");
    const match = base.match(/sm\d+/);
    if (match) {
      videoId = match[0];
      console.log(`Inferred video ID from filename: ${videoId}`);
    } else {
      console.error("Error: --video-id is required");
      process.exit(1);
    }
  }

  return { audioFile: resolve(audioFile), videoId, model, language, outDir };
}

// ---------------------------------------------------------------------------
// Whisper execution
// ---------------------------------------------------------------------------

function runWhisper(
  audioFile: string,
  outDir: string,
  model: string,
  language: string
): string {
  const whisperOutDir = resolve(outDir, "whisper_raw");
  mkdirSync(whisperOutDir, { recursive: true });

  console.log(`Running Whisper (model: ${model}, language: ${language})...`);
  console.log(`Input: ${audioFile}`);
  console.log(`Output directory: ${whisperOutDir}`);

  const args = [
    audioFile,
    "--model",
    model,
    "--language",
    language,
    "--output_format",
    "json",
    "--output_dir",
    whisperOutDir,
  ];

  try {
    execFileSync("whisper", args, {
      stdio: "inherit",
      timeout: 30 * 60 * 1000, // 30 minute timeout
    });
  } catch (error) {
    console.error("Whisper execution failed:", error);
    process.exit(1);
  }

  // Find the output JSON file
  const audioBasename = basename(audioFile).replace(/\.[^.]+$/, "");
  const jsonPath = resolve(whisperOutDir, `${audioBasename}.json`);
  if (!existsSync(jsonPath)) {
    console.error(`Expected Whisper output not found: ${jsonPath}`);
    process.exit(1);
  }

  return jsonPath;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const args = parseArgs(process.argv);

  if (!existsSync(args.audioFile)) {
    console.error(`Audio file not found: ${args.audioFile}`);
    process.exit(1);
  }

  mkdirSync(args.outDir, { recursive: true });

  // Step 1: Run Whisper
  const whisperJsonPath = runWhisper(
    args.audioFile,
    args.outDir,
    args.model,
    args.language
  );
  const rawJson = readFileSync(whisperJsonPath, "utf-8");

  // Copy raw Whisper JSON to output dir
  const rawOutputPath = resolve(args.outDir, `${args.videoId}_whisper.json`);
  writeFileSync(rawOutputPath, rawJson);
  console.log(`Raw Whisper output: ${rawOutputPath}`);

  // Step 2: Generate quality report
  const whisperOutput = JSON.parse(rawJson);
  const qualityReport = generateQualityReport(whisperOutput);
  const qualityPath = resolve(args.outDir, `${args.videoId}_quality.json`);
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

  // Step 3: Build RawSubtitleFile
  const subtitleFile = buildWhisperSubtitleFile({
    videoId: args.videoId,
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

  const subtitlePath = resolve(args.outDir, `${args.videoId}_subtitle.json`);
  writeFileSync(subtitlePath, JSON.stringify(subtitleFile, null, 2));
  console.log(`Subtitle file: ${subtitlePath} (${subtitleFile.entries.length} entries)`);
}

main();
