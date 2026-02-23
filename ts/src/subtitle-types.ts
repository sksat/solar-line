/**
 * Data types for subtitle collection and dialogue attribution.
 *
 * Two-tier model:
 *   1. Raw subtitles — extracted from YouTube via yt-dlp, gitignored
 *   2. Attributed dialogue — reviewed by human/AI, committed to repo
 *
 * Design reviewed by Codex (nice-friend consultation, 2026-02-23).
 */

// ---------------------------------------------------------------------------
// Schema version — bump when breaking changes are made
// ---------------------------------------------------------------------------
export const SUBTITLE_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Raw subtitle types (gitignored, stored in raw_data/)
// ---------------------------------------------------------------------------

/** A single raw subtitle cue as extracted from VTT/SRT */
export interface RawSubtitleEntry {
  /** Stable ID within the file, e.g. index or cue id */
  id: string;
  /** Start time in milliseconds */
  startMs: number;
  /** End time in milliseconds */
  endMs: number;
  /** Raw text content (may contain formatting tags) */
  text: string;
}

/** Metadata + entries from a single subtitle track extraction */
export interface RawSubtitleFile {
  schemaVersion: number;
  /** YouTube video ID */
  videoId: string;
  /** BCP 47 language code, e.g. "ja", "en" */
  language: string;
  /** How the subtitles were obtained */
  source: "youtube-auto" | "youtube-manual" | "manual";
  /** ISO 8601 timestamp of when subtitles were fetched */
  fetchedAt: string;
  /** SHA-256 hash of the raw subtitle file content before parsing */
  rawContentHash: string;
  /** Subtitle entries in chronological order */
  entries: RawSubtitleEntry[];
}

// ---------------------------------------------------------------------------
// Canonical speaker registry
// ---------------------------------------------------------------------------

/** A character who speaks in the series */
export interface Speaker {
  /** Canonical ID, e.g. "yukari", "maki" */
  id: string;
  /** Display name (Japanese) */
  nameJa: string;
  /** Display name (English), optional */
  nameEn?: string;
  /** Known aliases in subtitles */
  aliases: string[];
}

// ---------------------------------------------------------------------------
// Orbital-mechanics term mentions
// ---------------------------------------------------------------------------

/** An orbital mechanics concept mentioned in dialogue */
export interface OrbitalMention {
  /** Concept category */
  concept:
    | "delta_v"
    | "hohmann"
    | "orbit"
    | "gravity_assist"
    | "thrust"
    | "orbital_period"
    | "other";
  /** Character offsets within the dialogue text: [start, end) */
  textSpan: [number, number];
  /** Extracted numeric value, if present (e.g. ΔV in km/s) */
  normalizedValue?: number;
  /** Unit of the normalized value, if applicable */
  unit?: string;
}

// ---------------------------------------------------------------------------
// Attributed dialogue types (committed to repo)
// ---------------------------------------------------------------------------

/** A single attributed dialogue line */
export interface DialogueLine {
  /** Canonical speaker ID (references Speaker.id) */
  speakerId: string;
  /** Display name for convenience */
  speakerName: string;
  /** Dialogue text (cleaned) */
  text: string;
  /** Start time in milliseconds */
  startMs: number;
  /** End time in milliseconds */
  endMs: number;
  /** Scene this line belongs to */
  sceneId: string;
  /** Confidence of speaker attribution */
  confidence: "verified" | "inferred" | "uncertain";
  /** Raw entry IDs that were merged into this line */
  rawEntryIds: string[];
  /** References to TransferAnalysis IDs related to this line, if any */
  transferRefs: string[];
  /** Orbital mechanics terms mentioned in this line */
  mentions: OrbitalMention[];
}

/** A scene break within an episode */
export interface SceneBreak {
  /** Scene ID, e.g. "ep01-scene-03" */
  id: string;
  /** Start time in milliseconds */
  startMs: number;
  /** End time in milliseconds (equals next scene start or episode end) */
  endMs: number;
  /** Brief description of the scene */
  description: string;
}

/** Complete attributed dialogue data for one episode */
export interface EpisodeDialogue {
  schemaVersion: number;
  /** YouTube video ID */
  videoId: string;
  /** Episode number */
  episode: number;
  /** Episode title */
  title: string;
  /** Source URL */
  sourceUrl: string;
  /** BCP 47 language code */
  language: string;
  /** Speaker registry for this episode */
  speakers: Speaker[];
  /** Scene structure */
  scenes: SceneBreak[];
  /** Attributed dialogue lines in chronological order */
  dialogue: DialogueLine[];
  /** How attribution was performed */
  attributionNotes: string;
  /** Who reviewed the attribution */
  reviewedBy: string;
  /** ISO 8601 timestamp of review */
  reviewedAt: string;
  /** SHA-256 hash of the raw subtitle content this was derived from */
  rawContentHash: string;
}

// ---------------------------------------------------------------------------
// yt-dlp collection config
// ---------------------------------------------------------------------------

/** Configuration for a single subtitle collection run */
export interface CollectionConfig {
  /** YouTube video ID */
  videoId: string;
  /** Language codes to attempt, in order of preference */
  languages: string[];
  /** Output directory for raw subtitle files */
  outputDir: string;
}
