/**
 * Data types for the SOLAR LINE report pipeline.
 * These define the JSON contract for analysis results and session logs.
 */

/** Video embed card for YouTube or Niconico */
export interface VideoCard {
  /** Video platform */
  provider: "youtube" | "niconico";
  /** Platform-specific video ID (e.g. "dQw4w9WgXcQ" or "sm45280425") */
  id: string;
  /** Optional display title */
  title?: string;
  /** Optional start time in seconds */
  startSec?: number;
  /** Optional caption shown below the embed */
  caption?: string;
}

/** A dialogue quote from the episode, used as evidence in analysis */
export interface DialogueQuote {
  /** Unique identifier, e.g. "ep01-quote-01" */
  id: string;
  /** Speaker name (e.g. "きりたん") */
  speaker: string;
  /** The quoted text */
  text: string;
  /** Timestamp in the episode (MM:SS or HH:MM:SS) */
  timestamp: string;
}

/** A single orbital transfer analysis */
export interface TransferAnalysis {
  /** Unique identifier, e.g. "ep01-transfer-01" */
  id: string;
  /** Episode number */
  episode: number;
  /** Human-readable description of the transfer */
  description: string;
  /** Timestamp in the episode (MM:SS or HH:MM:SS) */
  timestamp: string;
  /** ΔV claimed in the anime (km/s), null if not explicitly stated */
  claimedDeltaV: number | null;
  /** ΔV computed by our analysis (km/s) */
  computedDeltaV: number;
  /** Assumptions made for this analysis */
  assumptions: string[];
  /** Verdict: plausible, implausible, or indeterminate */
  verdict: "plausible" | "implausible" | "indeterminate";
  /** Detailed explanation of the verdict */
  explanation: string;
  /** Orbital parameters used */
  parameters: {
    mu: number;
    departureRadius?: number;
    arrivalRadius?: number;
    eccentricity?: number;
    [key: string]: number | undefined;
  };
  /** IDs of DialogueQuotes that serve as evidence for this analysis */
  evidenceQuoteIds?: string[];
}

/** Per-episode report data */
export interface EpisodeReport {
  /** Episode number */
  episode: number;
  /** Episode title */
  title: string;
  /** Brief summary of the episode's orbital mechanics content */
  summary: string;
  /** Video embeds shown at the top of the report */
  videoCards?: VideoCard[];
  /** Key dialogue quotes from this episode */
  dialogueQuotes?: DialogueQuote[];
  /** All transfer analyses for this episode */
  transfers: TransferAnalysis[];
}

/** Site-wide manifest listing all available reports */
export interface SiteManifest {
  /** Project title */
  title: string;
  /** Generation timestamp (ISO 8601) */
  generatedAt: string;
  /** List of episode reports */
  episodes: {
    episode: number;
    title: string;
    transferCount: number;
    /** Relative path to the episode page */
    path: string;
  }[];
  /** List of session logs */
  logs: {
    /** Log filename */
    filename: string;
    /** Date of the session */
    date: string;
    /** Brief description */
    description: string;
    /** Relative path to the log page */
    path: string;
  }[];
}
