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
  computeSourceAgreement,
  extractScriptDialogue,
  ocrToEpisodeLines,
  type ScriptFileData,
  type AccuracyReport,
  type OcrFileData,
} from "./transcription-accuracy.ts";
import type { EpisodeLines } from "./dialogue-extraction-types.ts";

const __filename_local = fileURLToPath(import.meta.url);
const __dirname_local = dirname(__filename_local);

const dataDir = join(__dirname_local, "..", "..", "reports", "data", "episodes");
const outputDir = join(__dirname_local, "..", "..", "reports", "data", "calculations");

interface FullAccuracyReport {
  generatedAt: string;
  episodes: EpisodeAccuracyReport[];
  /** Pairwise inter-source agreement for all episodes (regardless of script availability) */
  agreements: EpisodeAgreementReport[];
}

interface EpisodeAgreementReport {
  episode: number;
  /** Pairwise agreement metrics between sources */
  pairs: {
    sourceA: string;
    sourceB: string;
    agreement: number;
  }[];
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

    // Also check for OCR data
    const ocrFile = join(dataDir, `ep${epNum}_ocr.json`);
    if (existsSync(ocrFile)) {
      const ocrData: OcrFileData = JSON.parse(readFileSync(ocrFile, "utf8"));
      const ocrLines = ocrToEpisodeLines(ocrData);
      const report = compareTranscriptions(script, ocrLines);

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
        asrLineCount: ocrLines.lines.length,
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
      console.log(`  Lines: ${ocrLines.lines.length} OCR frames vs ${dialogueLines.length} script`);
    }

    episodes.push({
      episode: parseInt(epNum),
      scriptDialogueLines: dialogueLines.length,
      comparisons,
    });
  }

  // -----------------------------------------------------------------------
  // Generate pairwise inter-source agreement for ALL episodes (1-5)
  // -----------------------------------------------------------------------
  const agreements: EpisodeAgreementReport[] = [];

  for (let ep = 1; ep <= 5; ep++) {
    const epStr = String(ep).padStart(2, "0");

    // Collect all EpisodeLines sources for this episode
    const allLineFiles = readdirSync(dataDir)
      .filter(f => new RegExp(`^ep${epStr}_lines(_\\w+)?\\.json$`).test(f))
      .sort();

    const sources: { label: string; data: EpisodeLines }[] = [];
    const seenLabels = new Set<string>();
    for (const f of allLineFiles) {
      const data: EpisodeLines = JSON.parse(readFileSync(join(dataDir, f), "utf8"));
      const label = data.sourceSubtitle.source === "whisper"
        ? `whisper-${(data.sourceSubtitle as unknown as { whisperModel?: string }).whisperModel || "unknown"}`
        : data.sourceSubtitle.source;
      // Skip duplicate sources (e.g. EP05 has both lines.json and lines_whisper.json as whisper-medium)
      if (seenLabels.has(label)) continue;
      seenLabels.add(label);
      sources.push({ label, data });
    }

    // Compute pairwise agreements
    const pairs: EpisodeAgreementReport["pairs"] = [];
    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const result = computeSourceAgreement(sources[i].data, sources[j].data);
        pairs.push({
          sourceA: result.sourceA,
          sourceB: result.sourceB,
          agreement: result.agreement,
        });
        console.log(`EP${epStr} ${result.sourceA}↔${result.sourceB}: ${(result.agreement * 100).toFixed(1)}%`);
      }
    }

    if (pairs.length > 0) {
      agreements.push({ episode: ep, pairs });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    episodes,
    agreements,
  };
}

// Main
const report = generateReport();
const outputPath = join(outputDir, "transcription_accuracy.json");
writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
console.log(`\nReport written to ${outputPath}`);
