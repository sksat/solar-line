/**
 * Subtitle parsing and validation utilities.
 *
 * Supports VTT (WebVTT) and SRT formats — the two formats yt-dlp produces.
 * All times are stored as integer milliseconds for precision.
 */

import { createHash } from "node:crypto";
import type {
  RawSubtitleEntry,
  RawSubtitleFile,
  EpisodeDialogue,
} from "./subtitle-types.ts";
import { SUBTITLE_SCHEMA_VERSION } from "./subtitle-types.ts";

// ---------------------------------------------------------------------------
// Timestamp parsing
// ---------------------------------------------------------------------------

/**
 * Parse a VTT/SRT timestamp string into milliseconds.
 * Accepts: "HH:MM:SS.mmm", "MM:SS.mmm", "HH:MM:SS,mmm"
 */
export function parseTimestampMs(ts: string): number {
  // Normalize SRT comma to dot
  const normalized = ts.trim().replace(",", ".");

  // Try HH:MM:SS.mmm
  const full = normalized.match(/^(\d+):(\d{2}):(\d{2})\.(\d{1,3})$/);
  if (full) {
    const h = parseInt(full[1], 10);
    const m = parseInt(full[2], 10);
    const s = parseInt(full[3], 10);
    const ms = parseInt(full[4].padEnd(3, "0"), 10);
    return h * 3600000 + m * 60000 + s * 1000 + ms;
  }

  // Try MM:SS.mmm
  const short = normalized.match(/^(\d+):(\d{2})\.(\d{1,3})$/);
  if (short) {
    const m = parseInt(short[1], 10);
    const s = parseInt(short[2], 10);
    const ms = parseInt(short[3].padEnd(3, "0"), 10);
    return m * 60000 + s * 1000 + ms;
  }

  throw new Error(`Invalid timestamp format: "${ts}"`);
}

// ---------------------------------------------------------------------------
// VTT tag stripping
// ---------------------------------------------------------------------------

/** Remove WebVTT formatting tags (e.g. <c>, <b>, <i>, <u>) */
export function stripVttTags(text: string): string {
  return text.replace(/<\/?[^>]+>/g, "");
}

// ---------------------------------------------------------------------------
// VTT parser
// ---------------------------------------------------------------------------

/** Parse WebVTT content into RawSubtitleEntry[] */
export function parseVtt(content: string): RawSubtitleEntry[] {
  const entries: RawSubtitleEntry[] = [];
  const lines = content.split(/\r?\n/);

  let i = 0;
  // Skip the WEBVTT header
  while (i < lines.length && !lines[i].startsWith("WEBVTT")) {
    i++;
  }
  if (i < lines.length) i++; // skip the WEBVTT line

  let cueIndex = 0;

  while (i < lines.length) {
    // Skip blank lines
    if (lines[i].trim() === "") {
      i++;
      continue;
    }

    // Check if this line is a timestamp line
    const tsMatch = lines[i].match(
      /^(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/
    );

    if (tsMatch) {
      const startMs = parseTimestampMs(tsMatch[1]);
      const endMs = parseTimestampMs(tsMatch[2]);

      // Collect text lines until blank line or end
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== "") {
        textLines.push(lines[i]);
        i++;
      }

      const text = stripVttTags(textLines.join("\n"));
      if (text.length > 0) {
        entries.push({ id: `cue-${cueIndex}`, startMs, endMs, text });
        cueIndex++;
      }
    } else {
      // Could be a cue ID line or other metadata — skip
      i++;
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// SRT parser
// ---------------------------------------------------------------------------

/** Parse SRT content into RawSubtitleEntry[] */
export function parseSrt(content: string): RawSubtitleEntry[] {
  if (content.trim() === "") return [];

  const entries: RawSubtitleEntry[] = [];
  const blocks = content.trim().split(/\n\s*\n/);

  let cueIndex = 0;

  for (const block of blocks) {
    const lines = block.trim().split(/\r?\n/);
    if (lines.length < 2) continue;

    // Find the timestamp line (could be line 0 or line 1 depending on whether index is present)
    let tsLineIdx = 0;
    if (lines[0].match(/^\d+$/) && lines.length >= 2) {
      tsLineIdx = 1;
    }

    const tsMatch = lines[tsLineIdx].match(
      /^(\d{2}:\d{2}:\d{2}[.,]\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}[.,]\d{3})/
    );
    if (!tsMatch) continue;

    const startMs = parseTimestampMs(tsMatch[1]);
    const endMs = parseTimestampMs(tsMatch[2]);
    const textLines = lines.slice(tsLineIdx + 1);
    const text = textLines.join("\n").trim();

    if (text.length > 0) {
      entries.push({ id: `cue-${cueIndex}`, startMs, endMs, text });
      cueIndex++;
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// RawSubtitleFile builder
// ---------------------------------------------------------------------------

/** Build a RawSubtitleFile from parsed entries and metadata */
export function buildRawSubtitleFile(params: {
  videoId: string;
  language: string;
  source: RawSubtitleFile["source"];
  rawContent: string;
  entries: RawSubtitleEntry[];
}): RawSubtitleFile {
  const hash = createHash("sha256").update(params.rawContent).digest("hex");

  return {
    schemaVersion: SUBTITLE_SCHEMA_VERSION,
    videoId: params.videoId,
    language: params.language,
    source: params.source,
    fetchedAt: new Date().toISOString(),
    rawContentHash: hash,
    entries: params.entries,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Validate a RawSubtitleFile, returning an array of error messages */
export function validateRawSubtitleFile(data: RawSubtitleFile): string[] {
  const errors: string[] = [];

  if (!data.videoId) {
    errors.push("videoId is required");
  }
  if (!data.language) {
    errors.push("language is required");
  }

  for (let i = 0; i < data.entries.length; i++) {
    const entry = data.entries[i];
    if (entry.endMs <= entry.startMs) {
      errors.push(
        `Entry ${entry.id}: endMs (${entry.endMs}) must be greater than startMs (${entry.startMs})`
      );
    }
    if (i > 0 && entry.startMs < data.entries[i - 1].startMs) {
      errors.push(
        `Entry ${entry.id}: not in chronological order (startMs=${entry.startMs} < previous startMs=${data.entries[i - 1].startMs})`
      );
    }
  }

  return errors;
}

/** Validate an EpisodeDialogue, returning an array of error messages */
export function validateEpisodeDialogue(data: EpisodeDialogue): string[] {
  const errors: string[] = [];

  const speakerIds = new Set(data.speakers.map((s) => s.id));
  const sceneIds = new Set(data.scenes.map((s) => s.id));

  // Check for overlapping scenes
  const sortedScenes = [...data.scenes].sort((a, b) => a.startMs - b.startMs);
  for (let i = 1; i < sortedScenes.length; i++) {
    if (sortedScenes[i].startMs < sortedScenes[i - 1].endMs) {
      errors.push(
        `Scene ${sortedScenes[i].id} overlaps with ${sortedScenes[i - 1].id}`
      );
    }
  }

  // Validate dialogue lines
  for (const line of data.dialogue) {
    if (!speakerIds.has(line.speakerId)) {
      errors.push(
        `Dialogue line at ${line.startMs}ms: unknown speaker "${line.speakerId}"`
      );
    }
    if (!sceneIds.has(line.sceneId)) {
      errors.push(
        `Dialogue line at ${line.startMs}ms: unknown scene "${line.sceneId}"`
      );
    }
  }

  return errors;
}
