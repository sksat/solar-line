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
  /** Reference to DialogueLine.lineId in the dialogue data file.
   *  When present, speaker/text/timestamp can be resolved at build time
   *  from the canonical dialogue source (epXX_dialogue.json). */
  dialogueLineId?: string;
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
  sourceType: "worldbuilding-doc" | "episode-dialogue" | "episode-visual" | "external-reference" | "cross-episode";
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
  /** Key computed results (values may be numeric or formatted strings) */
  results: Record<string, number | string>;
  /** Is this scenario feasible for the depicted transfer? */
  feasible: boolean;
  /** Brief note on this scenario */
  note: string;
  /** If true, this scenario is collapsed by default (e.g. too implausible to show prominently) */
  collapsedByDefault?: boolean;
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
  verdict: "plausible" | "implausible" | "indeterminate" | "conditional" | "reference";
  /** Detailed explanation of the verdict */
  explanation: string;
  /** Orbital parameters used */
  parameters: {
    mu?: number;
    departureRadius?: number;
    arrivalRadius?: number;
    eccentricity?: number;
    [key: string]: number | undefined;
  };
  /** IDs of DialogueQuotes that serve as evidence for this analysis */
  evidenceQuoteIds?: string[];
  /** Source citations for parameters used in this analysis */
  sources?: SourceCitation[];
  /** Command to reproduce the numerical analysis, e.g. "npm run recalculate -- --episode 1" */
  reproductionCommand?: string;
  /** One-sentence plain-language verdict summary for non-expert readers */
  verdictSummary?: string;
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
  /** Mean angular motion in rad/s for animation. If omitted, body stays fixed during animation. */
  meanMotion?: number;
}

/** Burn type for visual styling in animated diagrams */
export type BurnType = "acceleration" | "deceleration" | "midcourse" | "capture";

/** A burn marker on a transfer arc */
export interface BurnMarker {
  /** Angle in radians where the burn occurs (static position) */
  angle: number;
  /** Label for the burn, e.g. "ΔV₁ = 2.3 km/s" */
  label: string;
  /** Burn start time in seconds from the parent transfer's startTime. For animated diagrams. */
  startTime?: number;
  /** Burn end time in seconds from the parent transfer's startTime. For animated diagrams. */
  endTime?: number;
  /** Burn type — determines plume color and visual style in animation */
  type?: BurnType;
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
  /** Start time in seconds from animation epoch (t=0). Used for animated diagrams. */
  startTime?: number;
  /** End time in seconds from animation epoch. Used for animated diagrams. */
  endTime?: number;
  /** Scenario ID for multi-pattern diagrams. Groups arcs into named scenarios. */
  scenarioId?: string;
  /** Episode number for this transfer. Used to link leg tooltips to episode pages. */
  episodeNumber?: number;
}

/** A named scenario in a multi-pattern orbital diagram */
export interface DiagramScenario {
  /** Unique ID matching TransferArc.scenarioId */
  id: string;
  /** Display label, e.g. "作中航路（507h, 木星フライバイ）" */
  label: string;
}

/** Animation configuration for an orbital diagram */
export interface AnimationConfig {
  /** Total animation duration in real-world seconds (e.g. transfer duration) */
  durationSeconds: number;
}

/** A reference distance for the scale legend */
export interface ScaleReference {
  /** Distance value in the diagram's radius unit (e.g. AU) */
  value: number;
  /** Display label, e.g. "1 AU" */
  label: string;
}

/** Scale legend showing distance markers and scale mode disclaimer */
export interface ScaleLegend {
  /** Scale mode label, e.g. "√スケール（模式図）" */
  label: string;
  /** Reference distances to draw as concentric circles */
  referenceDistances: ScaleReference[];
}

/** A timeline waypoint annotation on an orbital diagram */
export interface TimelineAnnotation {
  /** Mission elapsed time in seconds from journey start */
  missionTime: number;
  /** Display label, e.g. "T+72h ガニメデ到着" */
  label: string;
  /** Short badge text for on-diagram marker, e.g. "①" */
  badge: string;
  /** Orbit ID where this waypoint occurs (for spatial positioning) */
  orbitId: string;
}

/** An uncertainty ellipse rendered on an orbital diagram */
export interface UncertaintyEllipse {
  /** Orbit ID where the ellipse is centered */
  orbitId: string;
  /** Semi-major axis of ellipse in same units as orbit radius */
  semiMajor: number;
  /** Semi-minor axis of ellipse in same units as orbit radius */
  semiMinor: number;
  /** Rotation angle of the ellipse in radians (default: 0) */
  rotation?: number;
  /** CSS color with alpha, e.g. "rgba(255, 100, 0, 0.2)" */
  color: string;
  /** Label for the uncertainty region, e.g. "1.23° 航法誤差" */
  label?: string;
}

/** A trajectory variation overlay showing parameter sensitivity */
export interface TrajectoryVariation {
  /** Transfer arc to overlay variations on (must match a TransferArc in the same diagram) */
  baseTransferLabel: string;
  /** CSS color with alpha for the variation band */
  color: string;
  /** Label for the variation, e.g. "質量 ±10% による航路変動" */
  label?: string;
  /** Variation magnitude as fraction of base arc curvature (0-1). Controls the width of the variation band. */
  spread: number;
}

/** A labeled element in a side-view diagram */
export interface SideViewElement {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** CSS color */
  color: string;
  /** Position: angle in degrees from horizontal (for angular elements) or absolute position */
  angleDeg?: number;
  /** Position: distance from center (arbitrary units, auto-scaled) */
  radius?: number;
  /** Element type */
  type: "plane" | "axis" | "ring" | "body" | "approach-vector" | "label";
  /** If true, draw as dashed */
  dashed?: boolean;
  /** Length as fraction of diagram size (0-1) for lines/axes */
  length?: number;
}

/** A side-view (cross-section) diagram showing 3D geometry from a lateral perspective */
export interface SideViewDiagram {
  /** Unique identifier */
  id: string;
  /** Diagram title */
  title: string;
  /** Description explaining the diagram */
  description?: string;
  /** Central body label */
  centerLabel: string;
  /** Central body color */
  centerColor?: string;
  /** Central body radius in pixels */
  centerRadius?: number;
  /** Elements to draw */
  elements: SideViewElement[];
  /** Angle annotations: pairs of elements showing the angle between them */
  angleAnnotations?: {
    /** Label for the angle, e.g. "23.9°" */
    label: string;
    /** Angle value in degrees */
    angleDeg: number;
    /** CSS color for the annotation arc */
    color: string;
    /** Starting angle of the arc (degrees from horizontal) */
    fromDeg: number;
    /** Ending angle of the arc (degrees from horizontal) */
    toDeg: number;
    /** Radius of the annotation arc in pixels */
    arcRadius?: number;
  }[];
}

/** An orbital transfer diagram rendered as inline SVG */
export interface OrbitalDiagram {
  /** Unique identifier, e.g. "ep01-diagram-01" */
  id: string;
  /** Diagram title */
  title: string;
  /** Description explaining the analysis purpose, key observations, and conclusions */
  description?: string;
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
  /** Animation configuration. If present, diagram renders with interactive time slider. */
  animation?: AnimationConfig;
  /** Scale legend with reference distance rings and mode label */
  scaleLegend?: ScaleLegend;
  /** Timeline waypoint annotations (rendered as bottom bar + on-diagram badges) */
  timelineAnnotations?: TimelineAnnotation[];
  /** Named scenarios for multi-pattern diagrams. When present, transfers are grouped by scenarioId. */
  scenarios?: DiagramScenario[];
  /** Epoch annotation showing the assumed in-story date, e.g. "想定年代: 2240-06-15" */
  epochAnnotation?: string;
  /** Uncertainty ellipses rendered at orbit positions */
  uncertaintyEllipses?: UncertaintyEllipse[];
  /** Trajectory variation overlays showing parameter sensitivity */
  trajectoryVariations?: TrajectoryVariation[];
}

/** Specifies which transfers should be rendered as separate detail sub-pages */
export interface TransferDetailPage {
  /** Slug for the sub-page URL, e.g. "transfer-02" → episodes/ep-005/transfer-02.html */
  slug: string;
  /** IDs of TransferAnalysis entries to include on this sub-page */
  transferIds: string[];
  /** IDs of OrbitalDiagram entries to include on this sub-page (optional) */
  diagramIds?: string[];
  /** IDs of TimeSeriesChart entries to include on this sub-page (optional) */
  chartIds?: string[];
  /** Optional page title override (defaults to transfer description) */
  title?: string;
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
  /** Interactive time-series charts (rendered via uPlot) */
  timeSeriesCharts?: TimeSeriesChart[];
  /** Detail sub-pages for long analyses; when set, matched transfers render as summary cards on the main page */
  detailPages?: TransferDetailPage[];
  /** Glossary of technical terms used in this report */
  glossary?: GlossaryTerm[];
  /** Margin gauges showing parameter proximity to limits */
  marginGauges?: MarginGauge[];
}

/** A technical term definition for the glossary */
export interface GlossaryTerm {
  /** The term (e.g. "ΔV", "brachistochrone") */
  term: string;
  /** Reading/pronunciation hint (optional, e.g. "デルタブイ") */
  reading?: string;
  /** Japanese definition */
  definition: string;
}

/** A row in a cross-episode comparison table */
export interface ComparisonRow {
  /** Metric label (e.g. "船の質量") */
  metric: string;
  /** Values per episode, keyed by episode number */
  values: Record<number, string>;
  /** Consistency status */
  status: "ok" | "warn" | "conflict";
  /** Brief note explaining the consistency finding */
  note: string;
}

/** A comparison table for cross-episode analysis */
export interface ComparisonTable {
  /** Table caption/title */
  caption: string;
  /** Episode numbers that appear as columns */
  episodes: number[];
  /** Rows of the comparison */
  rows: ComparisonRow[];
}

/** A bar chart for visualizing numerical comparisons */
export interface BarChart {
  /** Chart title */
  caption: string;
  /** Unit label for the value axis (e.g., "km/s", "時間", "%") */
  unit: string;
  /** Whether to use logarithmic scale */
  logScale?: boolean;
  /** Bars to display */
  bars: BarChartItem[];
}

export interface BarChartItem {
  /** Bar label */
  label: string;
  /** Numerical value */
  value: number;
  /** Optional color override (CSS color) */
  color?: string;
  /** Optional annotation text shown next to the bar */
  annotation?: string;
}

/** A time-series chart rendered via uPlot */
export interface TimeSeriesChart {
  /** Unique identifier */
  id: string;
  /** Chart title */
  title: string;
  /** Description explaining what the chart shows */
  description?: string;
  /** X-axis label (e.g. "経過時間 (h)", "ミッション時刻 (日)") */
  xLabel: string;
  /** Y-axis label (e.g. "推力 (MN)", "速度 (km/s)") */
  yLabel: string;
  /** Data series to plot */
  series: TimeSeriesDatum[];
  /** Optional threshold/limit lines */
  thresholds?: TimeSeriesThreshold[];
  /** Chart width in pixels (default: 600) */
  width?: number;
  /** Chart height in pixels (default: 300) */
  height?: number;
  /** Optional vertical region bands (e.g. episode shading) */
  regions?: TimeSeriesRegion[];
}

/** A vertical region band on a time-series chart (e.g. episode shading) */
export interface TimeSeriesRegion {
  /** Start X value */
  from: number;
  /** End X value */
  to: number;
  /** Label shown inside the region */
  label: string;
  /** CSS color with alpha (e.g. "rgba(88,166,255,0.12)") */
  color: string;
}

/** A single data series in a time-series chart */
export interface TimeSeriesDatum {
  /** Series label shown in legend */
  label: string;
  /** CSS color for this series */
  color: string;
  /** X values (time axis) */
  x: number[];
  /** Y values */
  y: number[];
  /** Line style */
  style?: "solid" | "dashed";
  /** Lower bound of error band (same length as y). When set with yHigh, renders a shaded region. */
  yLow?: number[];
  /** Upper bound of error band (same length as y). When set with yLow, renders a shaded region. */
  yHigh?: number[];
  /** Source of uncertainty: measurement, parameter, or model approximation */
  errorSource?: "measurement" | "parameter" | "model";
}

/** A horizontal threshold/limit line on a time-series chart */
export interface TimeSeriesThreshold {
  /** Threshold value on Y axis */
  value: number;
  /** Label for the threshold line */
  label: string;
  /** CSS color */
  color: string;
  /** Line style */
  style?: "solid" | "dashed";
}

/** An event in a ship/system timeline */
export interface TimelineEvent {
  /** Episode number where this event occurs */
  episode: number;
  /** Timestamp within the episode (MM:SS or HH:MM:SS) */
  timestamp?: string;
  /** Short event label */
  label: string;
  /** Detailed description */
  description: string;
  /** State changes caused by this event (e.g. "推力: 9.8 → 6.37 MN") */
  stateChanges?: string[];
  /** Evidence quote ID from episode report */
  evidenceQuoteId?: string;
}

/** A chronological event timeline for a ship or system */
export interface EventTimeline {
  /** Timeline title */
  caption: string;
  /** Ordered list of events */
  events: TimelineEvent[];
}

/** Verification status for a scientific claim */
export type VerificationStatus = "verified" | "approximate" | "unverified" | "discrepancy";

/** A row in a science verification table */
export interface VerificationRow {
  /** The claim being verified */
  claim: string;
  /** Episode number */
  episode: number;
  /** Value depicted in the anime */
  depicted: string;
  /** Reference value from real-world data */
  reference: string;
  /** Source of the reference value */
  source: string;
  /** Accuracy percentage (e.g. 99.5), null if not quantifiable */
  accuracyPercent: number | null;
  /** Verification status */
  status: VerificationStatus;
}

/** A verification table comparing depicted vs real-world values */
export interface VerificationTable {
  /** Table caption */
  caption: string;
  /** Rows of verifications */
  rows: VerificationRow[];
}

/** A single gauge item showing actual vs limit for a critical parameter */
export interface MarginGaugeItem {
  /** Label for this parameter */
  label: string;
  /** Actual value achieved */
  actual: number;
  /** Limit value (threshold) */
  limit: number;
  /** Unit of measurement */
  unit: string;
  /** Whether higher actual is better (default: false = lower is better, i.e. staying under the limit) */
  higherIsBetter?: boolean;
}

/** A margin gauge panel showing how close parameters are to their limits */
export interface MarginGauge {
  /** Unique ID for the gauge panel */
  id: string;
  /** Title of the gauge panel */
  title: string;
  /** Optional description */
  description?: string;
  /** Individual gauge items */
  items: MarginGaugeItem[];
}

/** A section in a summary report */
export interface SummarySection {
  /** Section heading */
  heading: string;
  /** Section body in Markdown */
  markdown: string;
  /** Optional comparison table */
  table?: ComparisonTable;
  /** Optional orbital diagrams rendered within this section */
  orbitalDiagrams?: OrbitalDiagram[];
  /** Optional event timeline */
  eventTimeline?: EventTimeline;
  /** Optional verification table */
  verificationTable?: VerificationTable;
  /** If true, render an interactive DAG viewer in this section */
  dagViewer?: boolean;
  /** Optional bar chart */
  barChart?: BarChart;
  /** Optional side-view (cross-section) diagrams */
  sideViewDiagrams?: SideViewDiagram[];
  /** Optional time-series charts (rendered via uPlot) */
  timeSeriesCharts?: TimeSeriesChart[];
  /** Optional comparison table with custom headers (for non-episode tables) */
  comparisonTable?: {
    caption: string;
    headers: string[];
    rows: { label: string; values: string[]; highlight?: boolean }[];
  };
  /** Optional margin gauges showing parameter proximity to limits */
  marginGauges?: MarginGauge[];
  /** Command to reproduce the numerical analysis for this section */
  reproductionCommand?: string;
}

/** A cross-episode or summary report page */
export interface SummaryReport {
  /** URL slug, e.g. "cross-episode" */
  slug: string;
  /** Page title */
  title: string;
  /** Brief summary of the page content */
  summary: string;
  /** Navigation category: "analysis" (総合分析) or "meta" (この考証について).
   *  Defaults to "analysis" if not specified. */
  category?: "analysis" | "meta";
  /** Structured sections */
  sections: SummarySection[];
  /** Glossary of technical terms used in this report */
  glossary?: GlossaryTerm[];
}

/** Verdict count breakdown */
export interface VerdictCounts {
  plausible: number;
  implausible: number;
  conditional: number;
  indeterminate: number;
  reference: number;
}

/** Per-episode transcription page data — assembled from lines, dialogue, and speakers files */
export interface TranscriptionPageData {
  /** Episode number */
  episode: number;
  /** Video ID (YouTube or Niconico) */
  videoId: string;
  /** Source subtitle info */
  sourceInfo: {
    source: "youtube-auto" | "youtube-manual" | "manual" | "whisper" | "video-ocr";
    language: string;
    /** Whisper model size (only for source="whisper") */
    whisperModel?: string;
  };
  /** Phase 1 extracted lines (always present) */
  lines: {
    lineId: string;
    startMs: number;
    endMs: number;
    text: string;
    mergeReasons: string[];
  }[];
  /** Phase 2 attributed dialogue (null if Phase 2 not done) */
  dialogue: {
    /** Stable unique ID for cross-referencing from reports */
    lineId?: string;
    speakerId: string;
    speakerName: string;
    text: string;
    startMs: number;
    endMs: number;
    confidence: "verified" | "inferred" | "uncertain";
    sceneId: string;
  }[] | null;
  /** Speaker registry (null if Phase 2 not done) */
  speakers: {
    id: string;
    nameJa: string;
    notes?: string;
  }[] | null;
  /** Scene structure (null if Phase 2 not done) */
  scenes: {
    id: string;
    startMs: number;
    endMs: number;
    description: string;
  }[] | null;
  /** Episode title from dialogue file (null if Phase 2 not done) */
  title: string | null;
  /** Additional raw sources (e.g. Whisper when primary is VTT, or VTT when primary is Whisper) */
  additionalSources?: {
    source: "youtube-auto" | "youtube-manual" | "manual" | "whisper" | "video-ocr";
    language: string;
    /** Whisper model size (only for source="whisper") */
    whisperModel?: string;
    lines: {
      lineId: string;
      startMs: number;
      endMs: number;
      text: string;
      mergeReasons: string[];
    }[];
  }[];
  /** Transcription accuracy metrics (computed against official script, if available) */
  accuracyMetrics?: {
    sourceType: string;
    corpusCharacterAccuracy: number;
    meanLineCharacterAccuracy: number;
    medianLineCharacterAccuracy: number;
  }[];
  /** Pairwise inter-source agreement metrics (available for all episodes) */
  agreementMetrics?: {
    sourceA: string;
    sourceB: string;
    agreement: number;
  }[];
  /** Video OCR data (frame-by-frame subtitle + HUD text extracted via Tesseract) */
  ocrData?: {
    ocrEngine: string;
    frames: {
      index: number;
      timestampSec: number;
      timestampFormatted: string;
      description: string;
      subtitleText: string;
      hudText: string;
    }[];
  };
  /** Official script source (Layer 0 — authoritative text from creator) */
  scriptSource?: {
    sourceUrl: string;
    author: string;
    scenes: {
      sceneId: string;
      title: string;
      setting: string;
      lines: {
        lineId: string;
        speaker: string | null;
        speakerNote: string | null;
        text: string;
        isDirection?: boolean;
      }[];
    }[];
  };
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
    /** Brief summary of the episode */
    summary?: string;
    /** Verdict breakdown for this episode's transfers */
    verdicts?: VerdictCounts;
    /** Relative path to the episode page */
    path: string;
  }[];
  /** Total verdict counts across all episodes */
  totalVerdicts?: VerdictCounts;
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
  /** List of summary/cross-episode pages (analysis category) */
  summaryPages?: {
    /** Page title */
    title: string;
    /** URL slug */
    slug: string;
    /** Brief summary of the page content */
    summary: string;
    /** Relative path to the page */
    path: string;
  }[];
  /** List of meta pages under「この考証について」(meta category) */
  metaPages?: {
    /** Page title */
    title: string;
    /** URL slug */
    slug: string;
    /** Relative path to the page */
    path: string;
  }[];
  /** List of transcription pages */
  transcriptionPages?: {
    /** Episode number */
    episode: number;
    /** Line count (Phase 1) */
    lineCount: number;
    /** Whether Phase 2 attribution is done */
    hasDialogue: boolean;
    /** Relative path to the transcription page */
    path: string;
  }[];
}
