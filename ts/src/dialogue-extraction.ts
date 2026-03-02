/**
 * Phase 1: Automated dialogue extraction from raw subtitles.
 *
 * Merges split cues, cleans formatting, and produces clean dialogue lines
 * WITHOUT any speaker attribution. Speaker assignment is Phase 2.
 *
 * Output: ExtractedLine[] → epXX_lines.json
 */

import type { RawSubtitleEntry } from "./subtitle-types.ts";
import type {
  ExtractedLine,
  EpisodeLines,
  MergeConfig,
  MergeReason,
} from "./dialogue-extraction-types.ts";
import { stripVttTags } from "./subtitle.ts";

// ---------------------------------------------------------------------------
// Japanese punctuation patterns
// ---------------------------------------------------------------------------

/** Terminal punctuation — indicates end of utterance */
const TERMINAL_PUNCT = /[。！？!?]$/;

/** Continuation markers at end of cue — likely continues into next */
const CONTINUATION_END = /[、…「（\(]$/;

/** Continuation markers at start of cue — likely continues from previous */
const CONTINUATION_START = /^[」）\)]/;

// ---------------------------------------------------------------------------
// Merge decision
// ---------------------------------------------------------------------------

export interface MergeDecision {
  shouldMerge: boolean;
  reasons: MergeReason[];
}

/**
 * Determine whether two adjacent cues should be merged.
 *
 * Uses deterministic, scored rules for auditability.
 * Conservative: precision over recall (bad merges hurt more than missed ones).
 */
export function shouldMergeCues(
  prev: RawSubtitleEntry,
  next: RawSubtitleEntry,
  config: MergeConfig
): MergeDecision {
  const gap = next.startMs - prev.endMs;
  const reasons: MergeReason[] = [];

  // Never merge across large gaps (likely scene break)
  if (gap > config.maxGapMs) {
    return { shouldMerge: false, reasons: [] };
  }

  // Don't merge if previous cue ends with terminal punctuation
  const prevText = prev.text.trim();
  if (TERMINAL_PUNCT.test(prevText)) {
    return { shouldMerge: false, reasons: [] };
  }

  // Check merge signals
  if (CONTINUATION_END.test(prevText)) {
    reasons.push("continuation_marker");
  }

  const nextText = next.text.trim();
  if (CONTINUATION_START.test(nextText)) {
    reasons.push("continuation_start");
  }

  if (!TERMINAL_PUNCT.test(prevText)) {
    reasons.push("no_terminal_punctuation");
  }

  if (gap < config.maxGapMs) {
    reasons.push("small_gap");
  }

  // Merge if we found at least one reason beyond just small_gap
  // (no_terminal_punctuation + small_gap is sufficient)
  const shouldMerge = reasons.length >= 2;

  return { shouldMerge, reasons: shouldMerge ? reasons : [] };
}

// ---------------------------------------------------------------------------
// Text merging
// ---------------------------------------------------------------------------

/**
 * Merge two cue texts, handling auto-generated subtitle duplication.
 *
 * Auto-generated subs sometimes repeat the previous cue's text at the
 * start of the next cue. This detects and removes the overlap.
 */
export function mergeCueTexts(prevText: string, nextText: string): string {
  const a = prevText.trim();
  const b = nextText.trim();

  // Check if next text starts with previous text (auto-sub duplication)
  if (b.startsWith(a)) {
    return b;
  }

  return a + b;
}

// ---------------------------------------------------------------------------
// Main extraction
// ---------------------------------------------------------------------------

/**
 * Extract dialogue lines from raw subtitle entries.
 *
 * Merges split cues using deterministic heuristics.
 * Assigns sequential line IDs with episode prefix.
 */
export function extractLines(
  entries: RawSubtitleEntry[],
  episodeSlug: string,
  config: MergeConfig
): ExtractedLine[] {
  // Filter out empty cues
  const nonEmpty = entries.filter((e) => e.text.trim().length > 0);
  if (nonEmpty.length === 0) return [];

  const lines: ExtractedLine[] = [];
  let lineNum = 1;

  // Current accumulator for merging
  let currentIds: string[] = [nonEmpty[0].id];
  let currentText = nonEmpty[0].text.trim();
  let currentStart = nonEmpty[0].startMs;
  let currentEnd = nonEmpty[0].endMs;
  let currentReasons: MergeReason[] = [];

  for (let i = 1; i < nonEmpty.length; i++) {
    const prev = nonEmpty[i - 1];
    const next = nonEmpty[i];
    const decision = shouldMergeCues(
      // Use a synthetic "prev" with accumulated text for punctuation checks
      { ...prev, text: currentText },
      next,
      config
    );

    if (decision.shouldMerge) {
      currentText = mergeCueTexts(currentText, next.text.trim());
      currentEnd = next.endMs;
      currentIds.push(next.id);
      // Accumulate unique reasons
      for (const r of decision.reasons) {
        if (!currentReasons.includes(r)) {
          currentReasons.push(r);
        }
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

      // Reset accumulator
      currentIds = [next.id];
      currentText = next.text.trim();
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

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Validate an EpisodeLines object, returning error messages */
export function validateEpisodeLines(data: EpisodeLines): string[] {
  const errors: string[] = [];

  if (!data.videoId) {
    errors.push("videoId is required");
  }

  // Check for duplicate line IDs
  const seenIds = new Set<string>();
  for (const line of data.lines) {
    if (seenIds.has(line.lineId)) {
      errors.push(`Line ${line.lineId}: duplicate lineId`);
    }
    seenIds.add(line.lineId);
  }

  // Check chronological order
  for (let i = 1; i < data.lines.length; i++) {
    if (data.lines[i].startMs < data.lines[i - 1].startMs) {
      errors.push(
        `Line ${data.lines[i].lineId}: not in chronological order ` +
          `(startMs=${data.lines[i].startMs} < previous startMs=${data.lines[i - 1].startMs})`
      );
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Rolling text deduplication (auto-generated subtitle preprocessing)
// ---------------------------------------------------------------------------

/**
 * Deduplicate rolling text in auto-generated subtitles.
 *
 * Pattern: auto-gen subs show two lines — the previous cue's text on top
 * and the new text on bottom. We extract only the new text from each cue.
 */
export function deduplicateRollingText(
  entries: RawSubtitleEntry[],
): RawSubtitleEntry[] {
  if (entries.length === 0) return [];

  const result: RawSubtitleEntry[] = [];

  for (let i = 0; i < entries.length; i++) {
    const text = stripVttTags(entries[i].text).trim();
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    if (lines.length === 0) continue;

    // For auto-gen subs with rolling text:
    // If the cue has 2 lines, the first line is likely carried from previous cue
    // Check if first line matches previous cue's text
    if (lines.length >= 2 && i > 0) {
      const prevText = stripVttTags(entries[i - 1].text).trim();
      const prevLines = prevText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      const prevLastLine = prevLines[prevLines.length - 1] ?? "";

      // If the first line of current cue matches previous cue's last line,
      // keep only the new (second) line
      if (lines[0] === prevLastLine || prevText.includes(lines[0])) {
        const newText = lines.slice(1).join("\n");
        if (newText.trim().length > 0) {
          result.push({
            id: entries[i].id,
            startMs: entries[i].startMs,
            endMs: entries[i].endMs,
            text: newText,
          });
        }
        continue;
      }
    }

    // Single-line cue or no dedup match — keep the last line
    // (For single line cues, the text is the new utterance)
    result.push({
      id: entries[i].id,
      startMs: entries[i].startMs,
      endMs: entries[i].endMs,
      text: lines[lines.length - 1],
    });
  }

  return result;
}
