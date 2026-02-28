/**
 * MDX-like Markdown parser for SOLAR LINE summary reports.
 *
 * Converts Markdown files with YAML frontmatter and component directives
 * into SummaryReport objects compatible with the existing build pipeline.
 *
 * Format:
 * ---
 * slug: ai-costs
 * title: AI コスト分析
 * summary: Brief description...
 * category: meta
 * ---
 *
 * ## Section Heading
 *
 * Prose in real Markdown...
 *
 * ```chart:bar
 * caption: ΔV比較
 * unit: km/s
 * bars:
 *   - label: EP01
 *     value: 12.5
 * ```
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type {
  SummaryReport,
  SummarySection,
  BarChart,
  BarChartItem,
  TimeSeriesChart,
  TimeSeriesDatum,
  TimeSeriesThreshold,
  OrbitalDiagram,
  SideViewDiagram,
  EventTimeline,
  ComparisonTable,
  VerificationTable,
  GlossaryTerm,
  MarginGauge,
} from "./report-types.ts";

/** Frontmatter fields for a summary report */
export interface SummaryFrontmatter {
  slug: string;
  title: string;
  summary: string;
  category?: "analysis" | "meta";
}

/** A parsed component directive from a fenced code block */
export interface ComponentDirective {
  /** Component type, e.g. "bar", "timeseries", "orbital-diagram" */
  type: string;
  /** Raw YAML or JSON content inside the fenced block */
  rawContent: string;
}

/** Parse YAML frontmatter from a Markdown string. Returns frontmatter + remaining body. */
export function parseFrontmatter(input: string): { frontmatter: SummaryFrontmatter; body: string } {
  const trimmed = input.replace(/^\uFEFF/, ""); // strip BOM
  if (!trimmed.startsWith("---")) {
    throw new Error("Missing YAML frontmatter: file must start with ---");
  }

  const endIndex = trimmed.indexOf("\n---", 3);
  if (endIndex === -1) {
    throw new Error("Unclosed YAML frontmatter: missing closing ---");
  }

  const yamlBlock = trimmed.slice(4, endIndex); // skip opening "---\n"
  const body = trimmed.slice(endIndex + 4); // skip closing "\n---"

  const frontmatter = parseSimpleYaml(yamlBlock) as Record<string, string>;

  // Validate required fields
  if (!frontmatter.slug) throw new Error("Frontmatter missing required field: slug");
  if (!frontmatter.title) throw new Error("Frontmatter missing required field: title");
  if (!frontmatter.summary) throw new Error("Frontmatter missing required field: summary");

  if (frontmatter.category && frontmatter.category !== "analysis" && frontmatter.category !== "meta") {
    throw new Error(`Invalid category: "${frontmatter.category}" (must be "analysis" or "meta")`);
  }

  return {
    frontmatter: {
      slug: frontmatter.slug,
      title: frontmatter.title,
      summary: frontmatter.summary,
      category: frontmatter.category as SummaryFrontmatter["category"],
    },
    body,
  };
}

/** Parse simple flat YAML (key: value pairs, no nesting). Good enough for frontmatter. */
export function parseSimpleYaml(yaml: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;
    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/** Split Markdown body into sections delimited by ## headings. */
export function splitSections(body: string): { heading: string; content: string }[] {
  const lines = body.split("\n");
  const sections: { heading: string; content: string; lines: string[] }[] = [];
  let current: { heading: string; lines: string[] } | null = null;

  for (const line of lines) {
    // Only h2 (##) starts a new section. h3+ stays within current section.
    const h2Match = line.match(/^## (.+)$/);
    if (h2Match) {
      if (current) {
        sections.push({ heading: current.heading, content: current.lines.join("\n").trim(), lines: current.lines });
      }
      current = { heading: h2Match[1].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
    // Lines before the first ## heading are ignored (preamble)
  }

  if (current) {
    sections.push({ heading: current.heading, content: current.lines.join("\n").trim(), lines: current.lines });
  }

  return sections.map(s => ({ heading: s.heading, content: s.content }));
}

/**
 * Extract component directives from section content and return
 * the remaining markdown with directives removed.
 */
export function extractDirectives(content: string): {
  markdown: string;
  directives: ComponentDirective[];
} {
  const directives: ComponentDirective[] = [];
  // Match fenced code blocks with component-type language tags
  // Supported patterns: ```chart:bar, ```component:orbital-diagram, ```timeline, ```table:comparison, etc.
  const fenceRegex = /^```(chart|component|timeline|table|timeseries|dag-viewer|glossary|sideview|margin-gauge):?(\S*)\s*\n([\s\S]*?)^```\s*$/gm;

  const markdown = content.replace(fenceRegex, (_match, prefix: string, suffix: string, inner: string) => {
    const type = suffix || prefix;
    directives.push({ type, rawContent: inner.trim() });
    return ""; // Remove the directive block from markdown
  });

  return { markdown: markdown.trim(), directives };
}

/** Parse a YAML bar chart directive into a BarChart object */
export function parseBarChartDirective(raw: string): BarChart {
  // Parse the YAML-like content
  const lines = raw.split("\n");
  let caption = "";
  let unit = "";
  let logScale = false;
  const bars: BarChartItem[] = [];
  let currentBar: Partial<BarChartItem> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("caption:")) {
      caption = trimmed.slice(8).trim();
    } else if (trimmed.startsWith("unit:")) {
      unit = trimmed.slice(5).trim();
    } else if (trimmed.startsWith("logScale:")) {
      logScale = trimmed.slice(9).trim() === "true";
    } else if (trimmed === "bars:") {
      // Start of bars array
    } else if (trimmed.startsWith("- label:")) {
      if (currentBar && currentBar.label) {
        bars.push({ label: currentBar.label, value: currentBar.value ?? 0, color: currentBar.color, annotation: currentBar.annotation });
      }
      currentBar = { label: trimmed.slice(8).trim() };
    } else if (currentBar && trimmed.startsWith("value:")) {
      currentBar.value = parseFloat(trimmed.slice(6).trim());
    } else if (currentBar && trimmed.startsWith("color:")) {
      currentBar.color = trimmed.slice(6).trim().replace(/^["']|["']$/g, "");
    } else if (currentBar && trimmed.startsWith("annotation:")) {
      currentBar.annotation = trimmed.slice(11).trim().replace(/^["']|["']$/g, "");
    }
  }
  if (currentBar && currentBar.label) {
    bars.push({ label: currentBar.label, value: currentBar.value ?? 0, color: currentBar.color, annotation: currentBar.annotation });
  }

  return { caption, unit, logScale: logScale || undefined, bars };
}

/** Parse a JSON component directive (for complex components like orbital diagrams) */
export function parseJsonDirective<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    throw new Error(`Invalid JSON in component directive: ${(e as Error).message}`);
  }
}

/**
 * Process extracted directives and attach them to a SummarySection.
 * Returns a partial section with the component fields populated.
 */
export function applyDirectives(directives: ComponentDirective[]): Partial<SummarySection> {
  const result: Partial<SummarySection> = {};

  for (const d of directives) {
    switch (d.type) {
      case "bar":
        result.barChart = parseBarChartDirective(d.rawContent);
        break;
      case "timeseries": {
        const chart = parseJsonDirective<TimeSeriesChart>(d.rawContent);
        if (!result.timeSeriesCharts) result.timeSeriesCharts = [];
        result.timeSeriesCharts.push(chart);
        break;
      }
      case "orbital-diagram": {
        const diagram = parseJsonDirective<OrbitalDiagram>(d.rawContent);
        if (!result.orbitalDiagrams) result.orbitalDiagrams = [];
        result.orbitalDiagrams.push(diagram);
        break;
      }
      case "timeline": {
        result.eventTimeline = parseJsonDirective<EventTimeline>(d.rawContent);
        break;
      }
      case "comparison": {
        result.comparisonTable = parseJsonDirective<SummarySection["comparisonTable"]>(d.rawContent);
        break;
      }
      case "verification": {
        result.verificationTable = parseJsonDirective<VerificationTable>(d.rawContent);
        break;
      }
      case "episode": {
        result.table = parseJsonDirective<ComparisonTable>(d.rawContent);
        break;
      }
      case "dag-viewer": {
        result.dagViewer = true;
        break;
      }
      case "sideview": {
        const diagram = parseJsonDirective<SideViewDiagram>(d.rawContent);
        if (!result.sideViewDiagrams) result.sideViewDiagrams = [];
        result.sideViewDiagrams.push(diagram);
        break;
      }
      case "margin-gauge": {
        const gauge = parseJsonDirective<MarginGauge>(d.rawContent);
        if (!result.marginGauges) result.marginGauges = [];
        result.marginGauges.push(gauge);
        break;
      }
      case "glossary": {
        // Glossary is stored temporarily; parseSummaryMarkdown lifts it to report level
        (result as Record<string, unknown>)._glossary = parseJsonDirective<GlossaryTerm[]>(d.rawContent);
        break;
      }
      default:
        throw new Error(`Unknown component directive type: "${d.type}"`);
    }
  }

  return result;
}

/**
 * Parse a complete Markdown file into a SummaryReport.
 * This is the main entry point for the MDX parser.
 */
export function parseSummaryMarkdown(input: string): SummaryReport {
  const { frontmatter, body } = parseFrontmatter(input);
  const rawSections = splitSections(body);

  if (rawSections.length === 0) {
    throw new Error("No sections found. Use ## headings to define sections.");
  }

  let glossary: GlossaryTerm[] | undefined;

  const sections: SummarySection[] = [];
  for (const raw of rawSections) {
    const { markdown, directives } = extractDirectives(raw.content);
    const componentFields = applyDirectives(directives);

    // Lift glossary from section level to report level
    const fields = componentFields as Record<string, unknown>;
    if (fields._glossary) {
      glossary = fields._glossary as GlossaryTerm[];
      delete fields._glossary;
    }

    // Skip sections that are empty after glossary extraction
    if (!markdown && Object.keys(fields).length === 0) continue;

    sections.push({
      heading: raw.heading,
      markdown,
      ...componentFields,
    });
  }

  return {
    slug: frontmatter.slug,
    title: frontmatter.title,
    summary: frontmatter.summary,
    category: frontmatter.category,
    sections,
    glossary,
  };
}

/**
 * Load a summary report by slug from a directory, trying .md then .json.
 * Throws if neither file exists.
 */
export function loadSummaryBySlug(summaryDir: string, slug: string): SummaryReport {
  const mdPath = path.join(summaryDir, `${slug}.md`);
  if (fs.existsSync(mdPath)) {
    return parseSummaryMarkdown(fs.readFileSync(mdPath, "utf-8"));
  }
  const jsonPath = path.join(summaryDir, `${slug}.json`);
  if (fs.existsSync(jsonPath)) {
    return JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as SummaryReport;
  }
  throw new Error(`Summary report not found: ${slug} (tried ${mdPath} and ${jsonPath})`);
}
