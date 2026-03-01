/**
 * Transcription accuracy comparison: official script vs VTT / Whisper.
 *
 * Because line segmentation differs drastically between sources (script: 229 lines,
 * VTT: 87, Whisper: 419 for EP01), we compare at two levels:
 *
 * 1. **Corpus-level**: Concatenate all text from each source, compute normalised
 *    character edit distance. This gives an overall accuracy metric.
 *
 * 2. **Line-level alignment**: Greedily align script lines to ASR segments using
 *    text similarity of temporally overlapping windows. Report per-line accuracy.
 */

import type { EpisodeLines, ExtractedLine, MergeConfig } from "./dialogue-extraction-types.ts";

// ---------------------------------------------------------------------------
// OCR data types
// ---------------------------------------------------------------------------

/** A single frame from video OCR extraction */
export interface OcrFrame {
  index: number;
  timestampSec: number;
  timestampFormatted: string;
  description: string;
  filename: string;
  subtitleText: string | null;
  hudText: string | null;
}

/** Complete OCR extraction data for one episode */
export interface OcrFileData {
  episode: number;
  sourceType: string;
  ocrEngine: string;
  ocrLanguages: { subtitle: string; hud: string };
  preprocessingMethod: string;
  framesDir: string;
  extractedAt: string;
  frames: OcrFrame[];
  summary: { totalFrames: number; framesWithSubtitle: number; framesWithHud: number };
}

// ---------------------------------------------------------------------------
// OCR → EpisodeLines conversion
// ---------------------------------------------------------------------------

/**
 * Convert OCR frame data into EpisodeLines format for accuracy comparison.
 *
 * Each frame with non-empty subtitleText becomes one ExtractedLine.
 * Timestamps are derived from the frame's timestampSec.
 */
export function ocrToEpisodeLines(ocrData: OcrFileData): EpisodeLines {
  const lines: ExtractedLine[] = [];
  const videoIds: Record<number, string> = {
    1: "CQ_OkDjEwRk", 2: "YXZWJLKD7Oo", 3: "l1jjXpv17-E",
    4: "1cTmWjYSlTM", 5: "_trGXYRF8-4",
  };

  for (const frame of ocrData.frames) {
    if (!frame.subtitleText || frame.subtitleText.trim().length === 0) continue;
    const epStr = String(ocrData.episode).padStart(2, "0");
    const idxStr = String(lines.length + 1).padStart(3, "0");
    lines.push({
      lineId: `ep${epStr}-ocr-${idxStr}`,
      startMs: frame.timestampSec * 1000,
      endMs: frame.timestampSec * 1000 + 5000, // assume ~5s display per frame
      text: frame.subtitleText,
      rawEntryIds: [frame.filename],
      mergeReasons: [],
    });
  }

  // Compute a simple hash of the OCR content for the rawContentHash field
  const contentForHash = ocrData.frames.map(f => f.subtitleText || "").join("|");
  let hash = 0;
  for (let i = 0; i < contentForHash.length; i++) {
    hash = ((hash << 5) - hash + contentForHash.charCodeAt(i)) | 0;
  }

  return {
    schemaVersion: 1,
    videoId: videoIds[ocrData.episode] || "unknown",
    episode: ocrData.episode,
    sourceSubtitle: {
      language: ocrData.ocrLanguages.subtitle,
      source: "video-ocr",
      rawContentHash: `ocr-${Math.abs(hash).toString(16)}`,
    },
    lines,
    extractedAt: ocrData.extractedAt,
    mergeConfig: { maxGapMs: 0, minCueDurationMs: 0 },
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of comparing a single script line to its best-matching ASR segment(s) */
export interface LineComparisonResult {
  /** Script line ID (e.g. "ep01-sl-001") */
  scriptLineId: string;
  /** Speaker from script (null for stage directions) */
  speaker: string | null;
  /** Script text (ground truth) */
  scriptText: string;
  /** Best-matching ASR text (concatenated from one or more segments) */
  matchedText: string;
  /** Matched ASR line IDs */
  matchedLineIds: string[];
  /** Normalised character edit distance (0 = perfect, 1 = completely different) */
  normalizedEditDistance: number;
  /** Character accuracy = 1 - normalizedEditDistance */
  characterAccuracy: number;
}

/** Aggregate accuracy report for one source comparison */
export interface AccuracyReport {
  /** Episode number */
  episode: number;
  /** Source being compared against the script */
  sourceType: string;
  /** Number of script dialogue lines (stage directions excluded) */
  scriptDialogueLines: number;
  /** Number of matched lines */
  matchedLines: number;
  /** Corpus-level normalised edit distance */
  corpusNormalizedEditDistance: number;
  /** Corpus-level character accuracy */
  corpusCharacterAccuracy: number;
  /** Mean per-line character accuracy (over matched lines) */
  meanLineCharacterAccuracy: number;
  /** Median per-line character accuracy */
  medianLineCharacterAccuracy: number;
  /** Per-line comparison results */
  lineResults: LineComparisonResult[];
}

// ---------------------------------------------------------------------------
// Script file type (subset needed for comparison)
// ---------------------------------------------------------------------------

export interface ScriptLine {
  lineId: string;
  speaker: string | null;
  text: string;
  isDirection?: boolean;
}

export interface ScriptScene {
  sceneId: string;
  lines: ScriptLine[];
}

export interface ScriptFileData {
  episode: number;
  scenes: ScriptScene[];
}

// ---------------------------------------------------------------------------
// Levenshtein edit distance
// ---------------------------------------------------------------------------

/**
 * Compute Levenshtein edit distance between two strings.
 * Uses O(min(m,n)) space with the two-row optimisation.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ensure a is the shorter string for space efficiency
  if (a.length > b.length) [a, b] = [b, a];

  const m = a.length;
  const n = b.length;
  let prev = new Array(m + 1);
  let curr = new Array(m + 1);

  for (let i = 0; i <= m; i++) prev[i] = i;

  for (let j = 1; j <= n; j++) {
    curr[0] = j;
    for (let i = 1; i <= m; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(
        prev[i] + 1,      // deletion
        curr[i - 1] + 1,  // insertion
        prev[i - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[m];
}

/**
 * Normalised edit distance: distance / max(len(a), len(b)).
 * Returns 0 for identical strings, 1 for completely different.
 */
export function normalizedEditDistance(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 0;
  const dist = levenshteinDistance(a, b);
  return dist / Math.max(a.length, b.length);
}

// ---------------------------------------------------------------------------
// Text normalisation for comparison
// ---------------------------------------------------------------------------

/**
 * Normalise text for fair comparison: remove whitespace, newlines, and
 * some punctuation differences that don't affect meaning.
 */
export function normalizeForComparison(text: string): string {
  return text
    .replace(/\s+/g, "")      // remove all whitespace
    .replace(/[…。、！？「」（）\u3000]/g, "") // remove punctuation
    .replace(/\.\.\./g, "");   // remove ellipsis
}

// ---------------------------------------------------------------------------
// Corpus-level comparison
// ---------------------------------------------------------------------------

/**
 * Extract all dialogue text from a script file, concatenated in order.
 * Stage directions are excluded.
 */
export function extractScriptDialogue(script: ScriptFileData): ScriptLine[] {
  const lines: ScriptLine[] = [];
  for (const scene of script.scenes) {
    for (const line of scene.lines) {
      if (line.isDirection !== true) {
        lines.push(line);
      }
    }
  }
  return lines;
}

/**
 * Compute corpus-level accuracy by concatenating all text and comparing.
 */
export function corpusAccuracy(scriptText: string, asrText: string): number {
  const normScript = normalizeForComparison(scriptText);
  const normAsr = normalizeForComparison(asrText);
  const ned = normalizedEditDistance(normScript, normAsr);
  return 1 - ned;
}

// ---------------------------------------------------------------------------
// Line-level alignment and comparison
// ---------------------------------------------------------------------------

/**
 * Find the best matching window of ASR lines for a given script line.
 * Uses a sliding window of 1-3 consecutive ASR lines, picking the window
 * with lowest normalised edit distance to the script line.
 */
export function findBestMatch(
  scriptLine: ScriptLine,
  asrLines: ExtractedLine[],
  usedIndices: Set<number>
): { matchedText: string; matchedLineIds: string[]; matchedIndices: number[]; ned: number } {
  const normScript = normalizeForComparison(scriptLine.text);
  if (normScript.length === 0) {
    return { matchedText: "", matchedLineIds: [], matchedIndices: [], ned: 0 };
  }

  let bestNed = Infinity;
  let bestResult = { matchedText: "", matchedLineIds: [] as string[], matchedIndices: [] as number[], ned: 1 };

  // Try window sizes 1-5
  const maxWindow = Math.min(5, asrLines.length);
  for (let windowSize = 1; windowSize <= maxWindow; windowSize++) {
    for (let start = 0; start <= asrLines.length - windowSize; start++) {
      // Skip if any line in window is already used
      let anyUsed = false;
      for (let k = start; k < start + windowSize; k++) {
        if (usedIndices.has(k)) { anyUsed = true; break; }
      }
      if (anyUsed) continue;

      const windowLines = asrLines.slice(start, start + windowSize);
      const windowText = windowLines.map(l => l.text).join("");
      const normWindow = normalizeForComparison(windowText);
      const ned = normalizedEditDistance(normScript, normWindow);

      if (ned < bestNed) {
        bestNed = ned;
        bestResult = {
          matchedText: windowText,
          matchedLineIds: windowLines.map(l => l.lineId),
          matchedIndices: Array.from({ length: windowSize }, (_, i) => start + i),
          ned,
        };
      }
    }
  }

  return bestResult;
}

/**
 * Compare a script against an ASR source, producing per-line and aggregate metrics.
 */
export function compareTranscriptions(
  script: ScriptFileData,
  asrData: EpisodeLines
): AccuracyReport {
  const dialogueLines = extractScriptDialogue(script);
  const asrLines = asrData.lines;

  // Corpus-level: concatenate all text
  const scriptFullText = dialogueLines.map(l => l.text).join("");
  const asrFullText = asrLines.map(l => l.text).join("");
  const normScriptFull = normalizeForComparison(scriptFullText);
  const normAsrFull = normalizeForComparison(asrFullText);
  const corpusNed = normalizedEditDistance(normScriptFull, normAsrFull);

  // Line-level: greedy sequential alignment
  const usedIndices = new Set<number>();
  const lineResults: LineComparisonResult[] = [];

  for (const scriptLine of dialogueLines) {
    const match = findBestMatch(scriptLine, asrLines, usedIndices);

    // Mark matched indices as used
    for (const idx of match.matchedIndices) {
      usedIndices.add(idx);
    }

    lineResults.push({
      scriptLineId: scriptLine.lineId,
      speaker: scriptLine.speaker,
      scriptText: scriptLine.text,
      matchedText: match.matchedText,
      matchedLineIds: match.matchedLineIds,
      normalizedEditDistance: match.ned,
      characterAccuracy: 1 - match.ned,
    });
  }

  // Aggregate line-level metrics
  const accuracies = lineResults.map(r => r.characterAccuracy);
  const sorted = [...accuracies].sort((a, b) => a - b);
  const median = sorted.length > 0
    ? (sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)])
    : 0;

  return {
    episode: script.episode,
    sourceType: asrData.sourceSubtitle.source === "whisper"
      ? `whisper-${asrData.sourceSubtitle.whisperModel || "unknown"}`
      : asrData.sourceSubtitle.source,
    scriptDialogueLines: dialogueLines.length,
    matchedLines: lineResults.filter(r => r.matchedLineIds.length > 0).length,
    corpusNormalizedEditDistance: corpusNed,
    corpusCharacterAccuracy: 1 - corpusNed,
    meanLineCharacterAccuracy: accuracies.length > 0
      ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length
      : 0,
    medianLineCharacterAccuracy: median,
    lineResults,
  };
}
