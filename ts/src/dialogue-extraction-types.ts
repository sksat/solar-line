/**
 * Types for Phase 1 of the dialogue pipeline: automated extraction.
 *
 * Phase 1 extracts clean dialogue lines from raw subtitles (merging split
 * cues, cleaning formatting) WITHOUT any speaker attribution.
 *
 * Output: epXX_lines.json — consumed by Phase 2 (speaker attribution).
 *
 * Design reviewed by Codex (nice-friend consultation, 2026-02-23).
 */

// ---------------------------------------------------------------------------
// Merge reasoning (auditability)
// ---------------------------------------------------------------------------

/** Why two adjacent cues were merged */
export type MergeReason =
  | "no_terminal_punctuation" // Previous cue lacks 。！？
  | "continuation_marker" // Previous cue ends with 、…「
  | "continuation_start" // Next cue starts with 」, punctuation, connective
  | "small_gap" // Gap between cues < threshold
  | "same_text_continuation"; // Duplicate/overlapping text continuation

// ---------------------------------------------------------------------------
// Extracted line (Phase 1 output)
// ---------------------------------------------------------------------------

/** A single extracted dialogue line — no speaker info */
export interface ExtractedLine {
  /** Stable ID, e.g. "ep01-line-001" */
  lineId: string;
  /** Start time in milliseconds (from first merged cue) */
  startMs: number;
  /** End time in milliseconds (from last merged cue) */
  endMs: number;
  /** Cleaned dialogue text */
  text: string;
  /** IDs of raw subtitle cues that were merged into this line */
  rawEntryIds: string[];
  /** Why cues were merged (empty if single cue) */
  mergeReasons: MergeReason[];
}

// ---------------------------------------------------------------------------
// Episode lines file (epXX_lines.json)
// ---------------------------------------------------------------------------

/** Complete Phase 1 output for one episode */
export interface EpisodeLines {
  /** Schema version for forward compatibility */
  schemaVersion: number;
  /** Video ID (YouTube or Niconico) */
  videoId: string;
  /** Episode number */
  episode: number;
  /** Source subtitle info */
  sourceSubtitle: {
    /** Language code of the subtitle track used */
    language: string;
    /** How subtitles were obtained */
    source: "youtube-auto" | "youtube-manual" | "manual" | "whisper";
    /** SHA-256 hash of the raw subtitle content */
    rawContentHash: string;
    /** Whisper model size used (only for source="whisper") */
    whisperModel?: string;
    /** Whisper thresholds used for quality filtering */
    whisperThresholds?: {
      noSpeechProb: number;
      avgLogprob: number;
      compressionRatio: number;
    };
  };
  /** Extracted lines in chronological order */
  lines: ExtractedLine[];
  /** ISO 8601 timestamp of extraction */
  extractedAt: string;
  /** Merge configuration used */
  mergeConfig: MergeConfig;
}

// ---------------------------------------------------------------------------
// Merge configuration
// ---------------------------------------------------------------------------

/** Configuration for the cue merging algorithm */
export interface MergeConfig {
  /** Maximum gap in ms between cues to consider merging (default: 300) */
  maxGapMs: number;
  /** Minimum cue duration in ms to keep (shorter cues merged eagerly) */
  minCueDurationMs: number;
}

/** Default merge configuration — conservative, precision over recall */
export const DEFAULT_MERGE_CONFIG: MergeConfig = {
  maxGapMs: 300,
  minCueDurationMs: 100,
};

export const EXTRACTION_SCHEMA_VERSION = 1;
