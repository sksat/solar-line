/**
 * MDX-like Markdown parser for SOLAR LINE episode reports.
 *
 * Converts episode Markdown files with YAML frontmatter and JSON directives
 * into EpisodeReport objects compatible with the existing build pipeline.
 *
 * This is intentionally a SEPARATE parser from mdx-parser.ts (summary reports).
 * Episode reports have different structure: transfer-keyed sections, explorations,
 * video cards, dialogue quotes, etc.
 *
 * Format:
 * ---
 * episode: 1
 * title: "SOLAR LINE Part 1 — 火星からガニメデへ"
 * summary: "きりたんが小型貨物船ケストレルで..."
 * ---
 *
 * ```video-cards:
 * [{ "provider": "youtube", "id": "CQ_OkDjEwRk" }]
 * ```
 *
 * ```dialogue-quotes:
 * [{ "id": "ep01-quote-01", ... }]
 * ```
 *
 * ## ep01-transfer-01
 *
 * ```transfer:
 * { "id": "ep01-transfer-01", ... }
 * ```
 *
 * Explanation prose in Markdown...
 */

import type {
  EpisodeReport,
  VideoCard,
  DialogueQuote,
  TransferAnalysis,
  ParameterExploration,
  OrbitalDiagram,
  TimeSeriesChart,
  TransferDetailPage,
  GlossaryTerm,
} from "./report-types.ts";

/** Frontmatter fields for an episode report */
export interface EpisodeFrontmatter {
  episode: number;
  title: string;
  summary: string;
}

/** A directive extracted from a fenced code block */
export interface EpisodeDirective {
  type: string;
  rawContent: string;
}

/** Parse episode frontmatter. Returns frontmatter + remaining body. */
export function parseEpisodeFrontmatter(input: string): { frontmatter: EpisodeFrontmatter; body: string } {
  const trimmed = input.replace(/^\uFEFF/, ""); // strip BOM
  if (!trimmed.startsWith("---")) {
    throw new Error("Missing YAML frontmatter: file must start with ---");
  }

  const endIndex = trimmed.indexOf("\n---", 3);
  if (endIndex === -1) {
    throw new Error("Unclosed YAML frontmatter: missing closing ---");
  }

  const yamlBlock = trimmed.slice(4, endIndex);
  const body = trimmed.slice(endIndex + 4);

  const fields = parseSimpleYaml(yamlBlock);

  if (!fields.episode) throw new Error("Frontmatter missing required field: episode");
  if (!fields.title) throw new Error("Frontmatter missing required field: title");
  if (!fields.summary) throw new Error("Frontmatter missing required field: summary");

  const episode = parseInt(fields.episode, 10);
  if (isNaN(episode)) throw new Error(`Invalid episode number: "${fields.episode}"`);

  return {
    frontmatter: {
      episode,
      title: fields.title,
      summary: fields.summary,
    },
    body,
  };
}

/** Parse simple flat YAML (key: value pairs, no nesting). */
function parseSimpleYaml(yaml: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;
    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/**
 * Extract episode-specific directives from content and return remaining markdown.
 *
 * Supported directive types:
 * - video-cards: VideoCard[]
 * - dialogue-quotes: DialogueQuote[]
 * - transfer: TransferAnalysis (partial — merged with section prose)
 * - exploration: ParameterExploration
 * - diagrams: OrbitalDiagram[]
 * - timeseries-charts: TimeSeriesChart[]
 * - detail-pages: TransferDetailPage[]
 * - glossary: GlossaryTerm[]
 */
export function extractEpisodeDirectives(content: string): {
  markdown: string;
  directives: EpisodeDirective[];
} {
  const directives: EpisodeDirective[] = [];
  const fenceRegex = /^```(video-cards|dialogue-quotes|transfer|exploration|diagrams|timeseries-charts|detail-pages|glossary):?\s*\n([\s\S]*?)^```\s*$/gm;

  const markdown = content.replace(fenceRegex, (_match, type: string, inner: string) => {
    directives.push({ type, rawContent: inner.trim() });
    return "";
  });

  return { markdown: markdown.trim(), directives };
}

/**
 * Parse a complete episode Markdown file into an EpisodeReport.
 *
 * Processing steps:
 * 1. Parse frontmatter → episode, title, summary
 * 2. Split body into preamble (before first ##) and sections (## headings)
 * 3. Extract directives from preamble → video-cards, dialogue-quotes, diagrams, etc.
 * 4. For each section:
 *    - Extract transfer directive → TransferAnalysis fields
 *    - Remaining markdown → TransferAnalysis.explanation
 *    - Extract exploration directives → ParameterExploration[]
 * 5. Assemble EpisodeReport
 */
export function parseEpisodeMarkdown(input: string): EpisodeReport {
  const { frontmatter, body } = parseEpisodeFrontmatter(input);

  // Split into preamble and sections
  const { preamble, sections } = splitEpisodeSections(body);

  // Parse preamble directives (report-level arrays)
  let videoCards: VideoCard[] | undefined;
  let dialogueQuotes: DialogueQuote[] | undefined;
  let diagrams: OrbitalDiagram[] | undefined;
  let timeSeriesCharts: TimeSeriesChart[] | undefined;
  let detailPages: TransferDetailPage[] | undefined;
  let glossary: GlossaryTerm[] | undefined;

  const { directives: preambleDirectives } = extractEpisodeDirectives(preamble);
  for (const d of preambleDirectives) {
    applyReportDirective(d);
  }

  // Parse sections → transfers + explorations
  const transfers: TransferAnalysis[] = [];
  const explorations: ParameterExploration[] = [];

  for (const section of sections) {
    const { markdown, directives } = extractEpisodeDirectives(section.content);

    // Extract transfer and exploration directives
    let transferData: Partial<TransferAnalysis> | undefined;
    const sectionExplorations: ParameterExploration[] = [];

    for (const d of directives) {
      switch (d.type) {
        case "transfer":
          transferData = JSON.parse(d.rawContent) as Partial<TransferAnalysis>;
          break;
        case "exploration":
          sectionExplorations.push(JSON.parse(d.rawContent) as ParameterExploration);
          break;
        default:
          // Report-level directives can also appear in sections
          applyReportDirective(d);
          break;
      }
    }

    if (transferData) {
      // The section markdown (minus directives) becomes the explanation
      const explanation = markdown.trim();
      const transfer: TransferAnalysis = {
        id: transferData.id!,
        episode: transferData.episode ?? frontmatter.episode,
        description: transferData.description ?? section.heading,
        timestamp: transferData.timestamp ?? "該当なし",
        claimedDeltaV: transferData.claimedDeltaV ?? null,
        computedDeltaV: transferData.computedDeltaV ?? null,
        assumptions: transferData.assumptions ?? [],
        verdict: transferData.verdict ?? "reference",
        explanation: explanation || transferData.explanation || "",
        parameters: transferData.parameters ?? {},
        sources: transferData.sources ?? [],
        ...(transferData.evidenceQuoteIds && { evidenceQuoteIds: transferData.evidenceQuoteIds }),
        ...(transferData.reproductionCommand && { reproductionCommand: transferData.reproductionCommand }),
        ...(transferData.verdictSummary && { verdictSummary: transferData.verdictSummary }),
      };
      transfers.push(transfer);
      explorations.push(...sectionExplorations);
    }
  }

  if (transfers.length === 0) {
    throw new Error("No transfers found in episode markdown. Each ## section must contain a ```transfer: directive.");
  }

  const report: EpisodeReport = {
    episode: frontmatter.episode,
    title: frontmatter.title,
    summary: frontmatter.summary,
    transfers,
    ...(videoCards && { videoCards }),
    ...(dialogueQuotes && { dialogueQuotes }),
    ...(explorations.length > 0 && { explorations }),
    ...(diagrams && { diagrams }),
    ...(timeSeriesCharts && { timeSeriesCharts }),
    ...(detailPages && { detailPages }),
    ...(glossary && { glossary }),
  };

  return report;

  function applyReportDirective(d: EpisodeDirective): void {
    switch (d.type) {
      case "video-cards":
        videoCards = JSON.parse(d.rawContent) as VideoCard[];
        break;
      case "dialogue-quotes":
        dialogueQuotes = JSON.parse(d.rawContent) as DialogueQuote[];
        break;
      case "diagrams":
        diagrams = JSON.parse(d.rawContent) as OrbitalDiagram[];
        break;
      case "timeseries-charts":
        timeSeriesCharts = JSON.parse(d.rawContent) as TimeSeriesChart[];
        break;
      case "detail-pages":
        detailPages = JSON.parse(d.rawContent) as TransferDetailPage[];
        break;
      case "glossary":
        glossary = JSON.parse(d.rawContent) as GlossaryTerm[];
        break;
    }
  }
}

/** Split body into preamble (before first ##) and ## sections */
function splitEpisodeSections(body: string): {
  preamble: string;
  sections: { heading: string; content: string }[];
} {
  const lines = body.split("\n");
  const preambleLines: string[] = [];
  const sections: { heading: string; lines: string[] }[] = [];
  let current: { heading: string; lines: string[] } | null = null;

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/);
    if (h2Match) {
      if (current) {
        sections.push(current);
      }
      current = { heading: h2Match[1].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      preambleLines.push(line);
    }
  }

  if (current) {
    sections.push(current);
  }

  return {
    preamble: preambleLines.join("\n"),
    sections: sections.map(s => ({
      heading: s.heading,
      content: s.lines.join("\n"),
    })),
  };
}
