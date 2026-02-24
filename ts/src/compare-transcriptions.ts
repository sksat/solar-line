#!/usr/bin/env node
/**
 * Compare Whisper vs YouTube VTT transcriptions for quality assessment.
 *
 * Usage:
 *   npm run compare-transcriptions -- --whisper-dir raw_data/whisper --vtt-dir raw_data/subtitles
 *
 * Compares line counts, total text length, and provides side-by-side samples.
 */

import { readFileSync, existsSync } from "node:fs";
import type { RawSubtitleFile } from "./subtitle-types.ts";
import type { EpisodeLines } from "./dialogue-extraction-types.ts";

interface EpisodeComparison {
  episode: number;
  whisper: { lineCount: number; totalChars: number; avgCharsPerLine: number } | null;
  vtt: { lineCount: number; totalChars: number; avgCharsPerLine: number } | null;
  whisperQuality: { reliableSegments: number; totalSegments: number; avgLogProb: number } | null;
}

const EPISODES = [
  { ep: 1, ytId: "CQ_OkDjEwRk" },
  { ep: 2, ytId: "YXZWJLKD7Oo" },
  { ep: 3, ytId: "l1jjXpv17-E" },
  { ep: 4, ytId: "1cTmWjYSlTM" },
  { ep: 5, ytId: "sm45987761" },
];

function readLinesFile(path: string): EpisodeLines | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function readQualityFile(path: string): { reliableSegments: number; totalSegments: number; avgLogProb: number } | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function main(): void {
  const args = process.argv.slice(2);
  const whisperDir = getArg(args, "--whisper-dir") ?? "raw_data/whisper";
  const vttLinesDir = getArg(args, "--vtt-lines-dir") ?? "reports/data/episodes";

  console.log("=== Whisper vs YouTube VTT Transcription Comparison ===\n");

  const comparisons: EpisodeComparison[] = [];

  for (const { ep, ytId } of EPISODES) {
    const epSlug = `ep${String(ep).padStart(2, "0")}`;

    // Whisper lines
    const whisperLinesPath = `${whisperDir}/${epSlug}_lines.json`;
    const whisperLines = readLinesFile(whisperLinesPath);

    // VTT lines (existing in reports/data/episodes/)
    const vttLinesPath = `${vttLinesDir}/${epSlug}_lines.json`;
    const vttLines = readLinesFile(vttLinesPath);

    // Quality report
    const qualityPath = `${whisperDir}/${ytId}_quality.json`;
    const quality = readQualityFile(qualityPath);

    const comp: EpisodeComparison = {
      episode: ep,
      whisper: whisperLines
        ? {
            lineCount: whisperLines.lines.length,
            totalChars: whisperLines.lines.reduce((sum, l) => sum + l.text.length, 0),
            avgCharsPerLine: Math.round(
              whisperLines.lines.reduce((sum, l) => sum + l.text.length, 0) / whisperLines.lines.length
            ),
          }
        : null,
      vtt:
        vttLines && vttLines.sourceSubtitle.source !== "whisper"
          ? {
              lineCount: vttLines.lines.length,
              totalChars: vttLines.lines.reduce((sum, l) => sum + l.text.length, 0),
              avgCharsPerLine: Math.round(
                vttLines.lines.reduce((sum, l) => sum + l.text.length, 0) / vttLines.lines.length
              ),
            }
          : null,
      whisperQuality: quality,
    };

    comparisons.push(comp);
  }

  // Print table
  console.log(
    "EP | Whisper Lines | VTT Lines | Whisper Chars | VTT Chars | Quality (reliable/total) | Avg LogProb"
  );
  console.log("-".repeat(100));

  for (const c of comparisons) {
    const wLines = c.whisper ? String(c.whisper.lineCount).padStart(5) : "  N/A";
    const vLines = c.vtt ? String(c.vtt.lineCount).padStart(5) : "  N/A";
    const wChars = c.whisper ? String(c.whisper.totalChars).padStart(6) : "   N/A";
    const vChars = c.vtt ? String(c.vtt.totalChars).padStart(6) : "   N/A";
    const quality = c.whisperQuality
      ? `${c.whisperQuality.reliableSegments}/${c.whisperQuality.totalSegments}`.padStart(8)
      : "     N/A";
    const logProb = c.whisperQuality
      ? c.whisperQuality.avgLogProb.toFixed(3).padStart(7)
      : "    N/A";

    console.log(
      `${String(c.episode).padStart(2)} | ${wLines}         | ${vLines}     | ${wChars}        | ${vChars}   | ${quality}                | ${logProb}`
    );
  }

  console.log("\nNote: EP05 VTT shows N/A because its source is Whisper (no YouTube VTT available).");
}

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

main();
