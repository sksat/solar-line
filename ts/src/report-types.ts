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

/** A source citation for a parameter or claim used in analysis */
export interface SourceCitation {
  /** The parameter or claim being cited (e.g. "船の質量: 約48000 t") */
  claim: string;
  /** Source type */
  sourceType: "worldbuilding-doc" | "episode-dialogue" | "episode-visual" | "external-reference";
  /** Source URL or identifier (e.g. note.com URL, video ID with timestamp) */
  sourceRef: string;
  /** Human-readable description of the source */
  sourceLabel: string;
}

/** A single scenario in a parameter exploration */
export interface ExplorationScenario {
  /** Label for this scenario (e.g. "質量 48t 解釈") */
  label: string;
  /** The varied parameter and its value */
  variedParam: string;
  variedValue: number;
  /** Unit for the varied parameter */
  variedUnit: string;
  /** Key computed results */
  results: Record<string, number>;
  /** Is this scenario feasible for the depicted transfer? */
  feasible: boolean;
  /** Brief note on this scenario */
  note: string;
}

/** Multi-parameter exploration for a transfer analysis */
export interface ParameterExploration {
  /** Unique ID, e.g. "ep01-exploration-01" */
  id: string;
  /** ID of the TransferAnalysis this explores */
  transferId: string;
  /** What question does this exploration answer? */
  question: string;
  /** Algebraic boundary condition (e.g. "mass ≤ 299t for 72h feasibility") */
  boundaryCondition?: string;
  /** Individual scenarios */
  scenarios: ExplorationScenario[];
  /** Summary of findings */
  summary: string;
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
  /** ΔV computed by our analysis (km/s), null if not expressible as single scalar */
  computedDeltaV: number | null;
  /** Assumptions made for this analysis */
  assumptions: string[];
  /** Verdict: plausible, implausible, indeterminate, or conditional */
  verdict: "plausible" | "implausible" | "indeterminate" | "conditional";
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
  /** Source citations for parameters used in this analysis */
  sources?: SourceCitation[];
}

/** A single orbit in an orbital diagram */
export interface OrbitDefinition {
  /** Stable identifier, e.g. "mars" or "ganymede" */
  id: string;
  /** Display label, e.g. "火星" */
  label: string;
  /** Orbital radius in AU (heliocentric) or km (body-centric) */
  radius: number;
  /** Display color */
  color: string;
  /** Position angle in radians (0 = +X, counterclockwise). If omitted, body dot is not drawn. */
  angle?: number;
}

/** A burn marker on a transfer arc */
export interface BurnMarker {
  /** Angle in radians where the burn occurs */
  angle: number;
  /** Label for the burn, e.g. "ΔV₁ = 2.3 km/s" */
  label: string;
}

/** A transfer arc connecting two orbits */
export interface TransferArc {
  /** Display label, e.g. "ホーマン遷移" */
  label: string;
  /** ID of the departure orbit */
  fromOrbitId: string;
  /** ID of the arrival orbit */
  toOrbitId: string;
  /** Display color */
  color: string;
  /** Transfer type — determines SVG rendering style */
  style: "hohmann" | "hyperbolic" | "brachistochrone";
  /** Optional burn markers along the arc */
  burnMarkers?: BurnMarker[];
}

/** An orbital transfer diagram rendered as inline SVG */
export interface OrbitalDiagram {
  /** Unique identifier, e.g. "ep01-diagram-01" */
  id: string;
  /** Diagram title */
  title: string;
  /** Label for the central body, e.g. "太陽" or "木星" */
  centerLabel: string;
  /** Scale mode for mapping orbital radii to pixel radii */
  scaleMode?: "linear" | "sqrt" | "log";
  /** Orbit definitions */
  orbits: OrbitDefinition[];
  /** Transfer arcs between orbits */
  transfers: TransferArc[];
  /** Maximum radius to display (same unit as orbit radii). Auto-calculated if omitted. */
  viewRadius?: number;
  /** Unit for radius values, e.g. "AU" or "km" */
  radiusUnit?: string;
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
  /** Multi-parameter explorations linked to transfers */
  explorations?: ParameterExploration[];
  /** Orbital transfer diagrams */
  diagrams?: OrbitalDiagram[];
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
