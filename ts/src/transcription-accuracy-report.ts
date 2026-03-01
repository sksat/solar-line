#!/usr/bin/env node
/**
 * Generate transcription accuracy comparison reports.
 *
 * Compares official script (Layer 0) against VTT and Whisper sources for each
 * episode that has script data. Outputs JSON report files.
 *
 * Usage: node --experimental-strip-types src/transcription-accuracy-report.ts
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compareTranscriptions,
  extractScriptDialogue,
  type ScriptFileData,
  type AccuracyReport,
} from "./transcription-accuracy.ts";
import type { EpisodeLines } from "./dialogue-extraction-types.ts";

const __filename_local = fileURLToPath(import.meta.url);
const __dirname_local = dirname(__filename_local);

const dataDir = join(__dirname_local, "..", "..", "reports", "data", "episodes");
const outputDir = join(__dirname_local, "..", "..", "reports", "data", "calculations");

interface FullAccuracyReport {
  generatedAt: string;
  episodes: EpisodeAccuracyReport[];
}

interface EpisodeAccuracyReport {
  episode: number;
  scriptDialogueLines: number;
  comparisons: ComparisonSummary[];
}

interface ComparisonSummary {
  sourceType: string;
  asrLineCount: number;
  corpusCharacterAccuracy: number;
  meanLineCharacterAccuracy: number;
  medianLineCharacterAccuracy: number;
  matchedLines: number;
  /** Sample of worst-performing lines (top 5 by edit distance) */
  worstLines: {
    scriptLineId: string;
    speaker: string | null;
    scriptText: string;
    matchedText: string;
    characterAccuracy: number;
  }[];
}

function generateReport(): FullAccuracyReport {
  const episodes: EpisodeAccuracyReport[] = [];

  // Find all episodes with script data
  const scriptFiles = readdirSync(dataDir)
    .filter(f => /^ep\d+_script\.json$/.test(f))
    .sort();

  for (const scriptFile of scriptFiles) {
    const epNum = scriptFile.match(/^ep(\d+)/)![1];
    const script: ScriptFileData = JSON.parse(readFileSync(join(dataDir, scriptFile), "utf8"));
    const dialogueLines = extractScriptDialogue(script);

    const comparisons: ComparisonSummary[] = [];

    // Find all line sources for this episode
    const lineFiles = readdirSync(dataDir)
      .filter(f => new RegExp(`^ep${epNum}_lines(_\\w+)?\\.json$`).test(f))
      .sort();

    for (const lineFile of lineFiles) {
      const asrData: EpisodeLines = JSON.parse(readFileSync(join(dataDir, lineFile), "utf8"));
      const report = compareTranscriptions(script, asrData);

      // Pick worst 5 lines
      const sorted = [...report.lineResults].sort((a, b) => a.characterAccuracy - b.characterAccuracy);
      const worstLines = sorted.slice(0, 5).map(r => ({
        scriptLineId: r.scriptLineId,
        speaker: r.speaker,
        scriptText: r.scriptText,
        matchedText: r.matchedText,
        characterAccuracy: Math.round(r.characterAccuracy * 1000) / 1000,
      }));

      comparisons.push({
        sourceType: report.sourceType,
        asrLineCount: asrData.lines.length,
        corpusCharacterAccuracy: Math.round(report.corpusCharacterAccuracy * 1000) / 1000,
        meanLineCharacterAccuracy: Math.round(report.meanLineCharacterAccuracy * 1000) / 1000,
        medianLineCharacterAccuracy: Math.round(report.medianLineCharacterAccuracy * 1000) / 1000,
        matchedLines: report.matchedLines,
        worstLines,
      });

      console.log(`EP${epNum} vs ${report.sourceType}:`);
      console.log(`  Corpus accuracy: ${(report.corpusCharacterAccuracy * 100).toFixed(1)}%`);
      console.log(`  Mean line accuracy: ${(report.meanLineCharacterAccuracy * 100).toFixed(1)}%`);
      console.log(`  Median line accuracy: ${(report.medianLineCharacterAccuracy * 100).toFixed(1)}%`);
      console.log(`  Lines: ${asrData.lines.length} ASR vs ${dialogueLines.length} script`);
    }

    episodes.push({
      episode: parseInt(epNum),
      scriptDialogueLines: dialogueLines.length,
      comparisons,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    episodes,
  };
}

// Main
const report = generateReport();
const outputPath = join(outputDir, "transcription_accuracy.json");
writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
console.log(`\nReport written to ${outputPath}`);
