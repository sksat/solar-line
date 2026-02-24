/**
 * Whisper STT output parser for the subtitle pipeline.
 *
 * Converts OpenAI Whisper JSON output to RawSubtitleEntry[] compatible
 * with the existing VTT/SRT pipeline.
 *
 * Whisper is used as an alternative subtitle source for VOICEROID content,
 * where YouTube auto-generated VTT subtitles are unreliable.
 */

import { createHash } from "node:crypto";
import type { RawSubtitleEntry, RawSubtitleFile } from "./subtitle-types.ts";
import { SUBTITLE_SCHEMA_VERSION } from "./subtitle-types.ts";

// ---------------------------------------------------------------------------
// Whisper JSON types (subset of Whisper's output format)
// ---------------------------------------------------------------------------

/** A single word-level token from Whisper */
export interface WhisperWord {
  word: string;
  start: number;
  end: number;
  probability: number;
}

/** A single segment from Whisper's JSON output */
export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
  words?: WhisperWord[];
}

/** Whisper's complete JSON output */
export interface WhisperOutput {
  text: string;
  segments: WhisperSegment[];
  language: string;
}

// ---------------------------------------------------------------------------
// Quality metrics
// ---------------------------------------------------------------------------

/** Per-segment quality assessment */
export interface SegmentQuality {
  segmentId: number;
  avgLogProb: number;
  noSpeechProb: number;
  compressionRatio: number;
  /** true if segment likely contains reliable transcription */
  isReliable: boolean;
}

/** Thresholds for segment quality filtering */
export interface QualityThresholds {
  /** Minimum avg_logprob for reliable segments (more negative = worse). Default: -1.0 */
  minAvgLogProb: number;
  /** Maximum no_speech_prob for reliable segments. Default: 0.6 */
  maxNoSpeechProb: number;
  /** Maximum compression_ratio for reliable segments. Default: 2.4 */
  maxCompressionRatio: number;
}

export const DEFAULT_QUALITY_THRESHOLDS: QualityThresholds = {
  minAvgLogProb: -1.0,
  maxNoSpeechProb: 0.6,
  maxCompressionRatio: 2.4,
};

/**
 * Assess quality of a Whisper segment.
 *
 * Whisper segments with high no_speech_prob, very negative avg_logprob,
 * or high compression_ratio are likely hallucinations or noise.
 */
export function assessSegmentQuality(
  segment: WhisperSegment,
  thresholds: QualityThresholds = DEFAULT_QUALITY_THRESHOLDS
): SegmentQuality {
  const isReliable =
    segment.avg_logprob >= thresholds.minAvgLogProb &&
    segment.no_speech_prob <= thresholds.maxNoSpeechProb &&
    segment.compression_ratio <= thresholds.maxCompressionRatio;

  return {
    segmentId: segment.id,
    avgLogProb: segment.avg_logprob,
    noSpeechProb: segment.no_speech_prob,
    compressionRatio: segment.compression_ratio,
    isReliable,
  };
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse Whisper JSON output into RawSubtitleEntry[].
 *
 * Each Whisper segment becomes one entry. Segments are filtered by quality
 * thresholds to remove likely hallucinations.
 */
export function parseWhisperJson(
  json: WhisperOutput,
  thresholds: QualityThresholds = DEFAULT_QUALITY_THRESHOLDS
): RawSubtitleEntry[] {
  const entries: RawSubtitleEntry[] = [];
  const sorted = [...json.segments].sort((a, b) => a.start - b.start);

  for (const segment of sorted) {
    const text = segment.text.trim();
    if (text.length === 0) continue;

    const quality = assessSegmentQuality(segment, thresholds);
    if (!quality.isReliable) continue;

    const startMs = Math.round(segment.start * 1000);
    const endMs = Math.round(segment.end * 1000);

    if (endMs <= startMs) continue;

    entries.push({
      id: `whisper-${segment.id}`,
      startMs,
      endMs,
      text,
    });
  }

  return entries;
}

/**
 * Parse Whisper JSON and build a RawSubtitleFile.
 */
export function buildWhisperSubtitleFile(params: {
  videoId: string;
  rawJson: string;
  thresholds?: QualityThresholds;
}): RawSubtitleFile {
  const json: WhisperOutput = JSON.parse(params.rawJson);
  const entries = parseWhisperJson(json, params.thresholds);
  const hash = createHash("sha256").update(params.rawJson).digest("hex");

  return {
    schemaVersion: SUBTITLE_SCHEMA_VERSION,
    videoId: params.videoId,
    language: json.language || "ja",
    source: "whisper",
    fetchedAt: new Date().toISOString(),
    rawContentHash: hash,
    entries,
  };
}

// ---------------------------------------------------------------------------
// Quality report
// ---------------------------------------------------------------------------

/** Summary statistics for Whisper transcription quality */
export interface WhisperQualityReport {
  totalSegments: number;
  reliableSegments: number;
  filteredSegments: number;
  avgLogProb: number;
  avgNoSpeechProb: number;
  detectedLanguage: string;
  totalDurationMs: number;
}

/**
 * Generate a quality report for a Whisper transcription.
 */
export function generateQualityReport(
  json: WhisperOutput,
  thresholds: QualityThresholds = DEFAULT_QUALITY_THRESHOLDS
): WhisperQualityReport {
  const qualities = json.segments.map((s) =>
    assessSegmentQuality(s, thresholds)
  );
  const reliable = qualities.filter((q) => q.isReliable);

  const avgLogProb =
    json.segments.length > 0
      ? json.segments.reduce((sum, s) => sum + s.avg_logprob, 0) /
        json.segments.length
      : 0;

  const avgNoSpeechProb =
    json.segments.length > 0
      ? json.segments.reduce((sum, s) => sum + s.no_speech_prob, 0) /
        json.segments.length
      : 0;

  const totalDurationMs =
    json.segments.length > 0
      ? Math.round(
          Math.max(...json.segments.map((s) => s.end)) * 1000 -
            Math.min(...json.segments.map((s) => s.start)) * 1000
        )
      : 0;

  return {
    totalSegments: json.segments.length,
    reliableSegments: reliable.length,
    filteredSegments: json.segments.length - reliable.length,
    avgLogProb,
    avgNoSpeechProb,
    detectedLanguage: json.language,
    totalDurationMs,
  };
}
