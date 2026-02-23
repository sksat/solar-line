/**
 * Data types for the SOLAR LINE report pipeline.
 * These define the JSON contract for analysis results and session logs.
 */

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
}

/** Per-episode report data */
export interface EpisodeReport {
  /** Episode number */
  episode: number;
  /** Episode title */
  title: string;
  /** Brief summary of the episode's orbital mechanics content */
  summary: string;
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
