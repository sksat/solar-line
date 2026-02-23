#!/usr/bin/env node
/**
 * collect-subtitles.ts — Fetch YouTube subtitles via yt-dlp and store as JSON.
 *
 * Usage:
 *   node --experimental-strip-types src/collect-subtitles.ts <videoId> [--lang ja,en] [--out-dir raw_data/subtitles]
 *
 * Requires yt-dlp to be installed and in PATH.
 * Output goes to raw_data/ (gitignored).
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { parseVtt, parseSrt, buildRawSubtitleFile, validateRawSubtitleFile } from "./subtitle.ts";
import type { RawSubtitleFile } from "./subtitle-types.ts";

/** Check if yt-dlp is available */
function checkYtDlp(): boolean {
  try {
    execFileSync("yt-dlp", ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/** Fetch subtitles for a video using yt-dlp, returns path to downloaded file */
function fetchSubtitles(
  videoId: string,
  language: string,
  tmpDir: string,
): { filePath: string; source: "youtube-auto" | "youtube-manual" } | null {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const outTemplate = path.join(tmpDir, `${videoId}.${language}`);

  // Try manual subtitles first
  try {
    execFileSync("yt-dlp", [
      "--write-sub",
      "--sub-lang", language,
      "--sub-format", "vtt",
      "--skip-download",
      "-o", outTemplate,
      url,
    ], { stdio: "pipe" });

    const vttPath = `${outTemplate}.${language}.vtt`;
    if (fs.existsSync(vttPath)) {
      return { filePath: vttPath, source: "youtube-manual" };
    }
  } catch {
    // Manual subtitles not available, try auto
  }

  // Try auto-generated subtitles
  try {
    execFileSync("yt-dlp", [
      "--write-auto-sub",
      "--sub-lang", language,
      "--sub-format", "vtt",
      "--skip-download",
      "-o", outTemplate,
      url,
    ], { stdio: "pipe" });

    const vttPath = `${outTemplate}.${language}.vtt`;
    if (fs.existsSync(vttPath)) {
      return { filePath: vttPath, source: "youtube-auto" };
    }
  } catch {
    // Auto subtitles not available either
  }

  return null;
}

/** Main collection pipeline for a single video */
export function collectSubtitles(params: {
  videoId: string;
  languages: string[];
  outputDir: string;
}): RawSubtitleFile[] {
  const { videoId, languages, outputDir } = params;
  const results: RawSubtitleFile[] = [];

  // Create temp dir for yt-dlp output
  const tmpDir = fs.mkdtempSync(path.join(outputDir, ".tmp-"));

  try {
    for (const lang of languages) {
      console.log(`Fetching subtitles for ${videoId} [${lang}]...`);

      const result = fetchSubtitles(videoId, lang, tmpDir);
      if (!result) {
        console.log(`  No subtitles found for language: ${lang}`);
        continue;
      }

      const rawContent = fs.readFileSync(result.filePath, "utf-8");
      const ext = path.extname(result.filePath).toLowerCase();
      const entries = ext === ".srt" ? parseSrt(rawContent) : parseVtt(rawContent);

      const subtitleFile = buildRawSubtitleFile({
        videoId,
        language: lang,
        source: result.source,
        rawContent,
        entries,
      });

      // Validate
      const errors = validateRawSubtitleFile(subtitleFile);
      if (errors.length > 0) {
        console.warn(`  Validation warnings for ${lang}:`, errors);
      }

      // Write JSON output
      const outPath = path.join(outputDir, `${videoId}_${lang}.json`);
      fs.writeFileSync(outPath, JSON.stringify(subtitleFile, null, 2));
      console.log(`  Saved: ${outPath} (${entries.length} cues, source: ${result.source})`);

      results.push(subtitleFile);
    }
  } finally {
    // Clean up temp dir
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  return results;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    console.log(`Usage: collect-subtitles <videoId> [options]

Options:
  --lang <codes>    Comma-separated language codes (default: ja,en)
  --out-dir <dir>   Output directory (default: raw_data/subtitles)
  --help            Show this help
`);
    process.exit(args.includes("--help") ? 0 : 1);
  }

  if (!checkYtDlp()) {
    console.error("Error: yt-dlp is not installed or not in PATH.");
    console.error("Install it: pip install yt-dlp");
    process.exit(1);
  }

  const videoId = args[0];
  const langIdx = args.indexOf("--lang");
  const languages = langIdx >= 0 ? args[langIdx + 1].split(",") : ["ja", "en"];
  const outIdx = args.indexOf("--out-dir");
  const outputDir = outIdx >= 0 ? args[outIdx + 1] : "raw_data/subtitles";

  fs.mkdirSync(outputDir, { recursive: true });

  const results = collectSubtitles({ videoId, languages, outputDir });
  console.log(`\nDone. Collected ${results.length} subtitle file(s).`);
}

// Run main only when executed directly
const isMain = process.argv[1]?.endsWith("collect-subtitles.ts");
if (isMain) {
  main();
}
