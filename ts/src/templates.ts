/**
 * Minimal HTML template engine for static report generation.
 * No external dependencies — pure string interpolation.
 */

import type { EpisodeReport, SiteManifest, TranscriptionPageData, TransferAnalysis, VideoCard, DialogueQuote, ParameterExploration, ExplorationScenario, SourceCitation, OrbitalDiagram, OrbitDefinition, TransferArc, AnimationConfig, ScaleLegend, TimelineAnnotation, DiagramScenario, SummaryReport, ComparisonTable, ComparisonRow, EventTimeline, VerificationTable, BarChart, TimeSeriesChart } from "./report-types.ts";

/** Escape HTML special characters */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Minimal Markdown to HTML converter.
 * Supports: headings (#), paragraphs, bold (**), inline code (`),
 * unordered lists (- ), ordered lists (1. ), and code blocks (```).
 * This is intentionally minimal — not a full Markdown parser.
 */
export interface MarkdownOptions {
  /** Auto-link 第N話 references to episode pages */
  autoLinkEpisodes?: boolean;
  /** Base path for episode links (default: "../episodes") */
  episodeBasePath?: string;
}

export function markdownToHtml(md: string, options?: MarkdownOptions): string {
  const lines = md.split("\n");
  const output: string[] = [];
  let inCodeBlock = false;
  let listType: "ul" | "ol" | null = null;
  const inlineOpts = options?.autoLinkEpisodes ? { autoLinkEpisodes: true, episodeBasePath: options.episodeBasePath } : undefined;

  function closeList(): void {
    if (listType) { output.push(`</${listType}>`); listType = null; }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        output.push("</code></pre>");
        inCodeBlock = false;
      } else {
        closeList();
        const lang = line.slice(3).trim();
        const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : "";
        output.push(`<pre><code${langClass}>`);
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      output.push(escapeHtml(line));
      continue;
    }

    // Display math block ($$...$$ on its own line) — pass through for KaTeX
    if (line.trim().startsWith("$$") && line.trim().endsWith("$$") && line.trim().length > 4) {
      closeList();
      output.push(`<p>${line.trim()}</p>`);
      continue;
    }

    // Empty line — close list if open
    if (line.trim() === "") {
      closeList();
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      output.push(`<h${level}>${inlineFormat(headingMatch[2], inlineOpts)}</h${level}>`);
      continue;
    }

    // Unordered list items
    if (line.match(/^[-*]\s+/)) {
      if (listType !== "ul") { closeList(); output.push("<ul>"); listType = "ul"; }
      output.push(`<li>${inlineFormat(line.replace(/^[-*]\s+/, ""), inlineOpts)}</li>`);
      continue;
    }

    // Ordered list items
    if (line.match(/^\d+\.\s+/)) {
      if (listType !== "ol") { closeList(); output.push("<ol>"); listType = "ol"; }
      output.push(`<li>${inlineFormat(line.replace(/^\d+\.\s+/, ""), inlineOpts)}</li>`);
      continue;
    }

    // Markdown table: detect header row (|...|...|)
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      closeList();
      const tableLines: string[] = [line];
      // Collect remaining table lines
      while (i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (next.startsWith("|") && next.endsWith("|")) {
          tableLines.push(lines[++i]);
        } else {
          break;
        }
      }
      output.push(renderMarkdownTable(tableLines, inlineOpts));
      continue;
    }

    // Paragraph
    closeList();
    output.push(`<p>${inlineFormat(line, inlineOpts)}</p>`);
  }

  closeList();
  if (inCodeBlock) output.push("</code></pre>");

  return output.join("\n");
}

/** Parse a markdown table (|...|...|) into HTML <table> */
function renderMarkdownTable(lines: string[], inlineOpts?: { autoLinkEpisodes: boolean; episodeBasePath?: string }): string {
  function parseCells(row: string): string[] {
    return row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());
  }

  function isSeparator(row: string): boolean {
    return /^\|[\s:|-]+\|$/.test(row.trim());
  }

  const out: string[] = ["<table>"];

  // Determine if second line is a separator (header row pattern)
  const hasHeader = lines.length >= 2 && isSeparator(lines[1]);
  const startIdx = hasHeader ? 2 : 0;

  if (hasHeader) {
    const headers = parseCells(lines[0]);
    out.push("<thead><tr>");
    for (const h of headers) {
      out.push(`<th>${inlineFormat(h, inlineOpts)}</th>`);
    }
    out.push("</tr></thead>");
  }

  out.push("<tbody>");
  for (let j = startIdx; j < lines.length; j++) {
    if (isSeparator(lines[j])) continue;
    const cells = parseCells(lines[j]);
    out.push("<tr>");
    for (const c of cells) {
      out.push(`<td>${inlineFormat(c, inlineOpts)}</td>`);
    }
    out.push("</tr>");
  }
  out.push("</tbody></table>");

  return out.join("");
}

/**
 * Extract math expressions ($...$ and $$...$$) from text, replacing them with
 * placeholders that survive HTML escaping. Returns the modified text and a
 * restore function.
 */
function extractMath(text: string): { text: string; restore: (html: string) => string } {
  const placeholders: { key: string; math: string }[] = [];
  let idx = 0;
  // Replace $$...$$ (display) first, then $...$ (inline)
  let result = text.replace(/\$\$([^$]+?)\$\$/g, (_match, expr) => {
    const key = `\x00MATH${idx++}\x00`;
    placeholders.push({ key, math: `$$${expr}$$` });
    return key;
  });
  result = result.replace(/\$([^$\n]+?)\$/g, (_match, expr) => {
    const key = `\x00MATH${idx++}\x00`;
    placeholders.push({ key, math: `$${expr}$` });
    return key;
  });
  return {
    text: result,
    restore(html: string): string {
      let out = html;
      for (const { key, math } of placeholders) {
        out = out.replace(key, math);
      }
      return out;
    },
  };
}

/** Apply inline formatting: bold, inline code, links */
function inlineFormat(text: string, options?: { autoLinkEpisodes?: boolean; episodeBasePath?: string }): string {
  // Extract math before escaping so delimiters pass through to KaTeX auto-render
  const { text: safeText, restore } = extractMath(text);
  let result = escapeHtml(safeText);
  // Inline code (must come before bold to avoid conflicts)
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Bold
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Links [text](url) — only after escaping so we restore the brackets
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Auto-link episode references (第N話) — skip inside <code> and <a> tags
  if (options?.autoLinkEpisodes) {
    result = autoLinkEpisodeRefs(result, options.episodeBasePath ?? "../episodes");
  }
  // Restore math expressions
  result = restore(result);
  return result;
}

/**
 * Auto-link 第N話 references to episode pages.
 * Skips references already inside <a> or <code> tags.
 */
export function autoLinkEpisodeRefs(html: string, basePath: string): string {
  // Split on tags to avoid linking inside <a> or <code>
  const parts = html.split(/(<[^>]+>)/);
  let insideA = false;
  let insideCode = false;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith("<")) {
      if (/<a[\s>]/i.test(part)) insideA = true;
      else if (/<\/a>/i.test(part)) insideA = false;
      else if (/<code[\s>]|<code>/i.test(part)) insideCode = true;
      else if (/<\/code>/i.test(part)) insideCode = false;
      continue;
    }
    if (insideA || insideCode) continue;
    // Match 第N話 where N is 1-9 (our episodes are 1-5, but allow up to 9)
    parts[i] = part.replace(/第([1-9])話/g, (_match, n) => {
      const ep = parseInt(n, 10);
      const filename = `ep-${String(ep).padStart(3, "0")}.html`;
      return `<a href="${basePath}/${filename}" class="ep-autolink">第${n}話</a>`;
    });
  }
  return parts.join("");
}

/** CSS styles for all report pages */
export const REPORT_CSS = `
:root {
  --bg: #0d1117;
  --fg: #c9d1d9;
  --accent: #58a6ff;
  --surface: #161b22;
  --border: #30363d;
  --green: #3fb950;
  --red: #f85149;
  --yellow: #d29922;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.6;
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
h1, h2, h3, h4 { color: #f0f6fc; margin: 1.5rem 0 0.5rem; overflow-wrap: break-word; }
h1 { font-size: 1.8rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
pre {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1rem;
  overflow-x: auto;
  margin: 1rem 0;
}
pre code.hljs { background: transparent; padding: 0; }
.dag-viewer-container { width: 100%; min-height: 500px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; position: relative; background: var(--surface); }
.dag-viewer-container svg { width: 100%; height: 100%; }
.dag-node { cursor: pointer; }
.dag-node:hover circle, .dag-node:hover rect { stroke-width: 3; filter: brightness(1.2); }
.dag-tooltip { position: absolute; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 0.75rem; font-size: 0.85em; max-width: 350px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); pointer-events: none; z-index: 10; }
.dag-tooltip h4 { margin: 0 0 0.3rem; font-size: 0.95em; }
.dag-tooltip .dag-type { font-size: 0.8em; opacity: 0.7; }
.dag-tooltip .dag-status { display: inline-block; padding: 0.1em 0.4em; border-radius: 3px; font-size: 0.8em; }
.dag-legend { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.5rem; font-size: 0.8em; padding: 0.5rem; }
.dag-legend-item { display: flex; align-items: center; gap: 0.3rem; }
.dag-legend-item .swatch { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--border); }
.dag-filter-bar { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; padding: 0.5rem; border-bottom: 1px solid var(--border); background: var(--surface); }
.dag-filter-btn { background: transparent; border: 1px solid var(--border); border-radius: 4px; padding: 0.25rem 0.6rem; font-size: 0.8em; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
.dag-filter-btn:hover { background: var(--border); color: var(--text-primary); }
.dag-filter-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.dag-node-count { margin-left: auto; font-size: 0.75em; color: var(--text-secondary); }
.dag-snapshot-select { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 0.2rem 0.4rem; font-size: 0.75em; color: var(--text-secondary); cursor: pointer; }
.bar-chart-container { margin: 1rem 0; overflow-x: auto; }
.bar-chart-container figure { margin: 0; }
.chart-caption { font-size: 0.9em; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary); }
code { font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.9em; }
p code { background: var(--surface); padding: 0.2em 0.4em; border-radius: 3px; }
ul, ol { padding-left: 1.5rem; margin: 0.5rem 0; }
li { margin: 0.25rem 0; }
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1rem 1.5rem;
  margin: 1rem 0;
  overflow-wrap: break-word;
  word-break: break-word;
  overflow-x: auto;
}
.verdict {
  display: inline-block;
  padding: 0.2em 0.6em;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.85em;
}
.verdict-plausible { background: var(--green); color: #000; }
.verdict-implausible { background: var(--red); color: #fff; }
.verdict-indeterminate { background: var(--yellow); color: #000; }
.verdict-conditional { background: #8957e5; color: #fff; }
.verdict-reference { background: #6e7681; color: #fff; }
.sources-list { font-size: 0.85em; color: #8b949e; margin-top: 0.5rem; }
.sources-list dt { font-weight: 600; color: var(--fg); margin-top: 0.3rem; }
.sources-list dd { margin-left: 1rem; }
.exploration { margin: 1rem 0; }
.exploration h4 { color: var(--accent); word-break: break-word; }
.exploration .boundary { font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.85em; color: var(--yellow); margin: 0.5rem 0; overflow-wrap: break-word; }
.scenario-table { width: 100%; border-collapse: collapse; font-size: 0.9em; margin: 0.5rem 0; table-layout: auto; }
.scenario-table th { color: #8b949e; font-weight: normal; font-size: 0.85em; padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--border); text-align: left; }
.scenario-table td { padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--border); word-break: break-word; overflow-wrap: break-word; }
.scenario-table .feasible { color: var(--green); }
.scenario-table .infeasible { color: var(--red); }
.collapsed-scenarios { margin-top: 0.5rem; }
.collapsed-scenarios summary { cursor: pointer; color: #8b949e; font-size: 0.85em; }
.collapsed-scenarios summary:hover { color: var(--accent); }
nav { margin-bottom: 2rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem 0; }
nav a { padding: 0.3rem 0.6rem; border-radius: 4px; white-space: nowrap; }
nav a:hover { background: var(--surface); text-decoration: none; }
nav .nav-sep { color: var(--border); margin: 0 0.1rem; user-select: none; }
.nav-dropdown { position: relative; display: inline-block; }
.nav-dropdown-btn {
  background: none; border: none; color: var(--accent); cursor: pointer;
  font: inherit; padding: 0.3rem 0.6rem; border-radius: 4px; white-space: nowrap;
}
.nav-dropdown-btn:hover { background: var(--surface); }
.nav-dropdown-btn::after { content: " \u25BE"; font-size: 0.7em; }
.nav-dropdown-menu {
  display: none; position: absolute; top: 100%; left: 0; z-index: 100;
  background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
  padding: 0.4rem 0; min-width: 220px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.nav-dropdown:hover .nav-dropdown-menu,
.nav-dropdown:focus-within .nav-dropdown-menu { display: block; }
.nav-dropdown-menu a {
  display: block; padding: 0.4rem 0.8rem; border-radius: 0; font-size: 0.9em;
}
.nav-dropdown-menu a:hover { background: var(--border); }
.ep-nav-strip { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin: 1rem 0; padding: 0.75rem 1rem; }
.ep-nav-label { font-weight: 600; color: #8b949e; font-size: 0.85em; margin-right: 0.25rem; }
.ep-nav-chip {
  display: inline-flex; align-items: center; gap: 0.3rem;
  padding: 0.25rem 0.6rem; border-radius: 1rem;
  background: var(--bg); border: 1px solid var(--border);
  font-size: 0.85em; color: var(--accent); transition: border-color 0.15s;
}
.ep-nav-chip:hover { border-color: var(--accent); text-decoration: none; }
.ep-nav-title { color: #8b949e; font-size: 0.85em; }
a.ep-autolink { border-bottom: 1px dotted var(--accent); }
a.ep-autolink:hover { text-decoration: none; border-bottom-style: solid; }
footer {
  margin-top: 3rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  font-size: 0.85em;
  color: #8b949e;
}
.calc-section { margin-top: 2rem; }
.calc-controls { display: grid; gap: 0.75rem; margin: 1rem 0; }
.calc-control { display: grid; grid-template-columns: 120px 1fr 100px; gap: 0.5rem; align-items: center; }
.calc-control label { font-weight: 600; color: #f0f6fc; }
.calc-control input[type="range"] {
  width: 100%;
  accent-color: var(--accent);
}
.calc-control input[type="number"] {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--fg);
  padding: 0.25rem 0.5rem;
  font-size: 0.9em;
  width: 100%;
}
.calc-presets { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.75rem 0; }
.calc-presets button {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--accent);
  padding: 0.3rem 0.75rem;
  cursor: pointer;
  font-size: 0.85em;
}
.calc-presets button:hover { background: var(--border); }
.calc-results { margin: 1rem 0; }
.calc-results table { width: 100%; border-collapse: collapse; }
.calc-results th, .calc-results td {
  padding: 0.4rem 0.75rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
}
.calc-results th { color: #8b949e; font-weight: normal; font-size: 0.85em; }
.calc-results td { color: var(--fg); font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.9em; }
.calc-results .result-gap { color: var(--red); font-weight: 600; }
.calc-badge { font-size: 0.75em; color: #8b949e; float: right; }
.calc-assumptions { font-size: 0.8em; color: #8b949e; margin-top: 0.5rem; }
.video-cards { display: flex; flex-wrap: wrap; gap: 1rem; margin: 1rem 0; }
.video-card { flex: 1 1 400px; min-width: 300px; }
.video-card iframe {
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 1px solid var(--border);
  border-radius: 6px;
}
.video-card .video-caption { font-size: 0.85em; color: #8b949e; margin-top: 0.25rem; }
.dialogue-quote {
  border-left: 3px solid var(--accent);
  padding: 0.4rem 0.75rem;
  margin: 0.5rem 0;
  font-size: 0.95em;
}
.dialogue-quote .speaker { color: var(--accent); font-weight: 600; }
.dialogue-quote .timestamp { color: #8b949e; font-size: 0.85em; margin-left: 0.5rem; }
.evidence-citations { font-size: 0.9em; color: #8b949e; margin: 0.5rem 0; border-left: 2px solid var(--border); padding-left: 0.75rem; }
.inline-citation { display: inline; }
.inline-citation .timestamp { font-size: 0.85em; color: #8b949e; }
.dv-chart { margin: 1rem 0; overflow-x: auto; }
.dv-chart text { font-family: "SFMono-Regular", Consolas, monospace; font-size: 12px; }
.orbital-diagram { text-align: center; }
.orbital-diagram svg { max-width: 100%; height: auto; }
.diagram-description { text-align: left; font-size: 0.9rem; color: #555; margin: 0.25rem 1rem 0.75rem; line-height: 1.5; }
.uplot-chart { overflow-x: auto; }
.uplot-chart .uplot-target { margin: 0 auto; }
.uplot-chart .u-legend { font-size: 0.85rem; }
.orbital-animation-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem auto;
  max-width: 480px;
  font-size: 0.85em;
}
.orbital-animation-controls input[type="range"] {
  flex: 1;
  accent-color: var(--accent);
}
.orbital-animation-controls button {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--accent);
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: 0.85em;
  min-width: 2rem;
}
.orbital-animation-controls button:hover { background: var(--border); }
.orbital-animation-controls .time-display {
  font-family: "SFMono-Regular", Consolas, monospace;
  color: var(--fg);
  min-width: 5rem;
  text-align: right;
}
.ship-marker { filter: drop-shadow(0 0 3px rgba(255,255,255,0.6)); }
.burn-plume { pointer-events: none; }
.burn-label-text { pointer-events: none; font-family: "SFMono-Regular", Consolas, monospace; }
.scale-ref { pointer-events: none; }
.timeline-badge { pointer-events: none; }
.timeline-bar {
  position: relative; height: 3.5rem; margin: 0.5rem auto 0; border-top: 1px solid var(--border);
}
.timeline-bar .timeline-item {
  position: absolute; top: 0.3rem; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; font-size: 0.7em; line-height: 1.3;
}
.timeline-bar .timeline-badge-label { font-weight: 600; color: var(--yellow); }
.timeline-bar .timeline-label { color: #8b949e; white-space: nowrap; }
.comparison-table { width: 100%; border-collapse: collapse; font-size: 0.9em; margin: 1rem 0; }
.comparison-table caption { text-align: left; font-weight: 600; color: #f0f6fc; margin-bottom: 0.5rem; font-size: 1em; }
.comparison-table th { color: #8b949e; font-weight: normal; font-size: 0.85em; padding: 0.5rem 0.6rem; border-bottom: 1px solid var(--border); text-align: left; }
.comparison-table td { padding: 0.5rem 0.6rem; border-bottom: 1px solid var(--border); }
.comparison-table td.numeric { text-align: right; font-family: "SFMono-Regular", Consolas, monospace; }
.comparison-table td.note { color: #8b949e; font-size: 0.85em; }
.comparison-table tr.status-ok td:first-child { border-left: 3px solid var(--green); }
.comparison-table tr.status-warn td:first-child { border-left: 3px solid var(--yellow); }
.comparison-table tr.status-conflict td:first-child { border-left: 3px solid var(--red); }
.summary-section { margin: 2rem 0; }
.summary-section h2 { border-bottom: 1px solid var(--border); padding-bottom: 0.3rem; }
.stats-grid .stat-row { display: flex; flex-wrap: wrap; gap: 1rem; }
.stats-grid .stat-item { display: flex; align-items: center; gap: 0.4rem; }
.stats-grid .stat-number { font-size: 1.8rem; font-weight: 700; color: var(--accent); font-family: "SFMono-Regular", Consolas, monospace; }
.stats-grid .stat-label { font-size: 0.9em; color: #8b949e; }
.stats-grid .stat-count { font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.9em; }
.episode-card h3 { margin-top: 0; }
.episode-card .episode-meta { font-size: 0.9em; color: #8b949e; margin-top: 0.5rem; }
.toc { font-size: 0.9em; }
.toc h3 { margin: 0 0 0.5rem; font-size: 1em; }
.toc ul { list-style: none; padding-left: 0; }
.toc ul ul { padding-left: 1.2rem; }
.toc li { margin: 0.2rem 0; }
.event-timeline { margin: 1.5rem 0; }
.event-timeline h4 { color: var(--accent); margin-bottom: 1rem; }
.timeline-track { position: relative; padding-left: 2rem; border-left: 2px solid var(--border); margin-left: 0.5rem; }
.timeline-event { position: relative; margin-bottom: 1.5rem; }
.timeline-marker {
  position: absolute;
  left: -2.35rem;
  top: 0.3rem;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--bg);
}
.timeline-label { font-weight: 600; color: #f0f6fc; }
.timeline-timestamp { color: #8b949e; font-size: 0.85em; }
.timeline-description { color: var(--fg); font-size: 0.9em; margin-top: 0.2rem; }
.state-changes { font-size: 0.85em; color: var(--yellow); margin-top: 0.3rem; list-style: none; padding-left: 0; }
.state-changes li::before { content: "→ "; color: #8b949e; }
.verification-table-container { overflow-x: auto; margin: 1rem 0; }
.verification-table { width: 100%; border-collapse: collapse; font-size: 0.85em; }
.verification-table caption { text-align: left; font-weight: 600; color: #f0f6fc; margin-bottom: 0.5rem; font-size: 1em; }
.verification-table th { color: #8b949e; font-weight: normal; font-size: 0.85em; padding: 0.5rem 0.5rem; border-bottom: 1px solid var(--border); text-align: left; white-space: nowrap; }
.verification-table td { padding: 0.5rem 0.5rem; border-bottom: 1px solid var(--border); }
.verification-table td.numeric { text-align: right; font-family: "SFMono-Regular", Consolas, monospace; }
.verification-table td.source-cell { font-size: 0.85em; color: #8b949e; }
.verification-badge {
  display: inline-block;
  padding: 0.15em 0.5em;
  border-radius: 3px;
  font-size: 0.85em;
  font-weight: 600;
  white-space: nowrap;
}
.status-verified .verification-badge, .verification-badge.status-verified { background: var(--green); color: #000; }
.status-approximate .verification-badge, .verification-badge.status-approximate { background: var(--yellow); color: #000; }
.status-unverified .verification-badge, .verification-badge.status-unverified { background: #8b949e; color: #000; }
.status-discrepancy .verification-badge, .verification-badge.status-discrepancy { background: var(--red); color: #fff; }
.katex-display { overflow-x: auto; overflow-y: hidden; padding: 0.5rem 0; }
.katex { font-size: 1.1em; }
/* Transcription pages */
.meta-table { border-collapse: collapse; margin: 0.5rem 0; }
.meta-table th { text-align: left; padding: 0.3rem 1rem 0.3rem 0; color: #8b949e; font-weight: normal; }
.meta-table td { padding: 0.3rem 0; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.9em; margin: 1rem 0; }
.data-table th { color: #8b949e; font-weight: 600; padding: 0.5rem; border-bottom: 2px solid var(--border); text-align: left; }
.data-table td { padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--border); }
.data-table .ts { white-space: nowrap; font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.85em; color: #8b949e; }
.data-table .speaker { white-space: nowrap; font-weight: 600; }
.scene-header td { background: var(--surface); font-weight: 600; color: var(--accent); padding: 0.6rem 0.5rem !important; border-bottom: 2px solid var(--border); }
.confidence { display: inline-block; padding: 0.1em 0.4em; border-radius: 3px; font-size: 0.8em; }
.confidence-verified { background: var(--green); color: #000; }
.confidence-inferred { background: var(--yellow); color: #000; }
.confidence-uncertain { background: var(--red); color: #fff; }
.phase-done { color: var(--green); font-weight: 600; }
.phase-partial { color: var(--yellow); font-weight: 600; }
.tab-container { margin: 1rem 0; }
.tab-buttons { display: flex; gap: 0; border-bottom: 2px solid var(--border); margin-bottom: 0; flex-wrap: wrap; }
.tab-btn { background: none; border: none; padding: 0.5rem 1rem; cursor: pointer; color: var(--muted); font-size: 0.9rem; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color 0.2s, border-color 0.2s; }
.tab-btn:hover { color: var(--fg); }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
.tab-panel { display: none; padding-top: 0.5rem; }
.tab-panel.active { display: block; }
@media (max-width: 600px) {
  body { padding: 1rem 0.5rem; }
  h1 { font-size: 1.4rem; }
  h2 { font-size: 1.2rem; }
  .card { padding: 0.75rem; }
  .calc-control { grid-template-columns: 1fr; gap: 0.25rem; }
  .comparison-table { font-size: 0.8em; }
  .comparison-table td, .comparison-table th { padding: 0.3rem; }
  .scenario-table { font-size: 0.8em; }
  .stats-grid .stat-number { font-size: 1.4rem; }
  .verification-table { font-size: 0.75em; }
  .timeline-track { padding-left: 1.5rem; }
  .data-table { font-size: 0.75em; }
  .dialogue-table .speaker { font-size: 0.8em; }
  .video-card { flex: 1 1 100%; min-width: 0; }
  .orbital-animation-controls { flex-wrap: wrap; }
  .ep-nav-strip { gap: 0.3rem; padding: 0.5rem; }
  pre { font-size: 0.8em; padding: 0.75rem; }
}
`;

/** Wrap content in the common HTML layout */
export interface NavEpisode {
  episode: number;
  title: string;
  path: string;
}

export function layoutHtml(title: string, content: string, basePath: string = ".", summaryPages?: SiteManifest["summaryPages"], description?: string, episodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  const episodeNav = episodes && episodes.length > 0
    ? `<span class="nav-sep">|</span><span class="nav-dropdown"><button class="nav-dropdown-btn">各話分析</button><span class="nav-dropdown-menu">${episodes.map(ep => `<a href="${basePath}/${ep.path}">第${ep.episode}話</a>`).join("")}</span></span>`
    : "";
  const summaryNav = summaryPages && summaryPages.length > 0
    ? `<span class="nav-sep">|</span><span class="nav-dropdown"><button class="nav-dropdown-btn">総合分析</button><span class="nav-dropdown-menu">${summaryPages.map(p => `<a href="${basePath}/${p.path}">${escapeHtml(p.title)}</a>`).join("")}</span></span>`
    : "";
  const metaLinks = [
    ...(metaPages || []).map(p => `<a href="${basePath}/${p.path}">${escapeHtml(p.title)}</a>`),
    `<a href="${basePath}/transcriptions/index.html">文字起こし</a>`,
    `<a href="${basePath}/logs/index.html">セッションログ</a>`,
  ];
  const metaNav = `<span class="nav-sep">|</span><span class="nav-dropdown"><button class="nav-dropdown-btn">この考証について</button><span class="nav-dropdown-menu">${metaLinks.join("")}</span></span>`;
  const fullTitle = `${escapeHtml(title)} — SOLAR LINE 考察`;
  const ogDescription = description
    ? escapeHtml(description)
    : "SFアニメ「SOLAR LINE」の軌道遷移をΔV計算で検証する考察プロジェクト";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${fullTitle}</title>
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${ogDescription}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="SOLAR LINE 考察">
<meta name="description" content="${ogDescription}">
<style>${REPORT_CSS}</style>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css" crossorigin="anonymous">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js" crossorigin="anonymous"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/contrib/auto-render.min.js" crossorigin="anonymous"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/styles/github-dark.min.css" crossorigin="anonymous">
<script defer src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/highlight.min.js" crossorigin="anonymous"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/uplot@1.6.32/dist/uPlot.min.css" crossorigin="anonymous">
<script defer src="https://cdn.jsdelivr.net/npm/uplot@1.6.32/dist/uPlot.iife.min.js" crossorigin="anonymous"></script>
</head>
<body>
<nav><a href="${basePath}/index.html">トップ</a>${episodeNav}${summaryNav}${metaNav}</nav>
${content}
<footer>SOLAR LINE 考察 — <a href="https://claude.ai/code">Claude Code</a> により生成 | <a href="https://github.com/sksat/solar-line">GitHub</a> | <a href="${basePath}/doc/solar_line_core/index.html">API Docs</a></footer>
<script>document.addEventListener("DOMContentLoaded",function(){if(typeof renderMathInElement==="function"){renderMathInElement(document.body,{delimiters:[{left:"$$",right:"$$",display:true},{left:"$",right:"$",display:false}],throwOnError:false})}if(typeof hljs!=="undefined"){hljs.highlightAll()}if(typeof uPlot!=="undefined"){document.querySelectorAll(".uplot-chart").forEach(function(el){var dataEl=el.querySelector(".uplot-data");if(!dataEl)return;var cfg=JSON.parse(dataEl.textContent);var series=[{}];cfg.series.forEach(function(s){series.push({label:s.label,stroke:s.color,width:2,dash:s.style==="dashed"?[6,3]:undefined})});var data=[cfg.series[0].x];cfg.series.forEach(function(s){data.push(s.y)});var thresholdPlugin=cfg.thresholds&&cfg.thresholds.length?{hooks:{draw:[function(u){var ctx=u.ctx;cfg.thresholds.forEach(function(t){var yPos=u.valToPos(t.value,"y",true);ctx.save();ctx.strokeStyle=t.color;ctx.lineWidth=1.5;if(t.style==="dashed")ctx.setLineDash([6,3]);ctx.beginPath();ctx.moveTo(u.bbox.left,yPos);ctx.lineTo(u.bbox.left+u.bbox.width,yPos);ctx.stroke();ctx.fillStyle=t.color;ctx.font="11px sans-serif";ctx.textAlign="right";ctx.fillText(t.label,u.bbox.left+u.bbox.width-4,yPos-4);ctx.restore()})}]}}:undefined;var plugins=thresholdPlugin?[thresholdPlugin]:[];var opts={width:cfg.width||600,height:cfg.height||300,plugins:plugins,axes:[{label:cfg.xLabel,stroke:"#aaa",grid:{stroke:"#333"}},{label:cfg.yLabel,stroke:"#aaa",grid:{stroke:"#333"}}],series:series};var target=el.querySelector(".uplot-target");new uPlot(opts,data,target)})}});</script>
</body>
</html>`;
}

/** Render verdict badge inline */
function verdictBadge(verdict: string): string {
  const label = verdict === "plausible" ? "妥当" : verdict === "implausible" ? "非現実的" : verdict === "conditional" ? "条件付き" : verdict === "reference" ? "参考値" : "判定不能";
  return `<span class="verdict verdict-${verdict}">${label}</span>`;
}

/** Render the site index page */
export function renderIndex(manifest: SiteManifest, navEpisodes?: NavEpisode[]): string {
  const totalTransfers = manifest.episodes.reduce((sum, ep) => sum + ep.transferCount, 0);

  // Project overview section
  const overview = `
<h1>SOLAR LINE 考察</h1>
<p>『<a href="https://www.nicovideo.jp/user/5844196/series/531506">良いソフトウェアトーク劇場</a>』のSFシリーズ長編「SOLAR LINE」に描かれた軌道遷移を宇宙力学的に検証するプロジェクト。</p>
<div class="card">
<p>ゆえぴこ氏の「SOLAR LINE」は、主人公きりたんが小型貨物船ケストレルで太陽系を駆け巡る物語です。本サイトでは、作中で描かれた各軌道遷移について、実際の軌道力学に基づくΔV計算・加速度分析を行い、描写の妥当性を考察しています。</p>
<p>航路: <strong>火星</strong> → <strong>ガニメデ</strong>（木星系） → <strong>エンケラドス</strong>（土星系） → <strong>タイタニア</strong>（天王星系） → <strong>地球</strong>（約35.9 AU）</p>
</div>`;

  // Stats section
  const tv = manifest.totalVerdicts;
  const statsSection = tv ? `
<h2>分析概要</h2>
<div class="card stats-grid">
<div class="stat-row">
  <div class="stat-item"><span class="stat-number">${manifest.episodes.length}</span><span class="stat-label">エピソード</span></div>
  <div class="stat-item"><span class="stat-number">${totalTransfers}</span><span class="stat-label">軌道遷移</span></div>
</div>
<div class="stat-row" style="margin-top:0.75rem">
  <div class="stat-item">${verdictBadge("plausible")} <span class="stat-count">${tv.plausible}</span></div>
  <div class="stat-item">${verdictBadge("conditional")} <span class="stat-count">${tv.conditional}</span></div>
  <div class="stat-item">${verdictBadge("reference")} <span class="stat-count">${tv.reference}</span></div>
  <div class="stat-item">${verdictBadge("implausible")} <span class="stat-count">${tv.implausible}</span></div>
</div>
</div>` : "";

  // Episode cards
  const episodeCards = manifest.episodes.length > 0
    ? manifest.episodes.map(ep => {
        const verdictSummary = ep.verdicts
          ? [
              ep.verdicts.plausible > 0 ? `${verdictBadge("plausible")} ${ep.verdicts.plausible}` : "",
              ep.verdicts.conditional > 0 ? `${verdictBadge("conditional")} ${ep.verdicts.conditional}` : "",
              ep.verdicts.reference > 0 ? `${verdictBadge("reference")} ${ep.verdicts.reference}` : "",
              ep.verdicts.implausible > 0 ? `${verdictBadge("implausible")} ${ep.verdicts.implausible}` : "",
            ].filter(Boolean).join(" ")
          : "";
        const summaryLine = ep.summary ? `<p>${escapeHtml(ep.summary)}</p>` : "";
        return `<div class="card episode-card">
<h3><a href="${ep.path}">第${ep.episode}話: ${escapeHtml(ep.title)}</a></h3>
${summaryLine}
<p class="episode-meta">${ep.transferCount}件の軌道遷移 ${verdictSummary}</p>
</div>`;
      }).join("\n")
    : "<p>エピソードレポートはまだありません。</p>";

  const summaryList = manifest.summaryPages && manifest.summaryPages.length > 0
    ? `\n<h2>総合分析</h2>\n<ul>\n${manifest.summaryPages.map(p =>
        `<li><a href="${p.path}">${escapeHtml(p.title)}</a></li>`
      ).join("\n")}\n</ul>`
    : "";

  const metaList = manifest.metaPages && manifest.metaPages.length > 0
    ? manifest.metaPages.map(p =>
        `<li><a href="${p.path}">${escapeHtml(p.title)}</a></li>`
      ).join("\n")
    : "";

  const content = `${overview}
${statsSection}

<h2>エピソードレポート</h2>
${episodeCards}
${summaryList}

<h2>この考証について</h2>
<ul>
${metaList}
<li><a href="transcriptions/index.html">文字起こしデータ</a></li>
<li><a href="logs/index.html">セッションログ</a></li>
</ul>
<p><em>生成日時: ${escapeHtml(manifest.generatedAt)}</em></p>`;

  return layoutHtml("トップ", content, ".", manifest.summaryPages, "SFアニメ「SOLAR LINE」の全5話に描かれた軌道遷移をΔV計算・加速度分析で検証する考察プロジェクト", navEpisodes, manifest.metaPages);
}

/** Map verdict to Japanese label */
function verdictLabel(v: TransferAnalysis["verdict"]): string {
  switch (v) {
    case "plausible": return "妥当";
    case "implausible": return "非現実的";
    case "conditional": return "条件付き";
    case "indeterminate": return "判定不能";
    case "reference": return "参考値";
  }
}

/** Render a source reference as a link if it looks like a URL or Niconico ID */
function renderSourceRef(ref: string, label: string): string {
  if (/^https?:\/\//.test(ref)) {
    return `<a href="${escapeHtml(ref)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
  }
  // Niconico video refs like "sm45280425 01:14" — link to the video
  const nicoMatch = ref.match(/^(sm\d+)/);
  if (nicoMatch) {
    const nicoUrl = `https://www.nicovideo.jp/watch/${nicoMatch[1]}`;
    return `<a href="${escapeHtml(nicoUrl)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
  }
  // NASA JPL or other plain-text refs
  return escapeHtml(label);
}

/** Render source citations */
function renderSources(sources: SourceCitation[]): string {
  if (sources.length === 0) return "";
  const items = sources.map(s =>
    `<dt>${escapeHtml(s.claim)}</dt><dd>${renderSourceRef(s.sourceRef, s.sourceLabel)}</dd>`
  ).join("\n");
  return `<dl class="sources-list"><dt style="color:var(--accent);margin-bottom:0.2rem">出典</dt>${items}</dl>`;
}

/** Render inline citations from evidence quotes */
function renderInlineCitations(quotes: DialogueQuote[], videoCards?: VideoCard[]): string {
  if (quotes.length === 0) return "";
  const citations = quotes.map(q => {
    const tsHtml = timestampLink(q.timestamp, videoCards);
    return `<span class="inline-citation">${escapeHtml(q.speaker)}「${escapeHtml(q.text)}」<span class="timestamp">(${tsHtml})</span></span>`;
  }).join("　");
  return `<p class="evidence-citations">${citations}</p>`;
}

/** Render a single transfer analysis card */
export function renderTransferCard(t: TransferAnalysis, inlineQuotes?: DialogueQuote[], videoCards?: VideoCard[]): string {
  const verdictClass = `verdict-${t.verdict}`;
  const dvComparison = t.claimedDeltaV !== null && t.computedDeltaV !== null
    ? `<p>作中のΔV: <strong>${t.claimedDeltaV.toFixed(2)} km/s</strong> | 計算値: <strong>${t.computedDeltaV.toFixed(2)} km/s</strong></p>`
    : t.computedDeltaV !== null
      ? `<p>計算ΔV: <strong>${t.computedDeltaV.toFixed(2)} km/s</strong>（作中で明示されず）</p>`
      : `<p>（ΔVは単一のスカラー値として表現不可 — 詳細は下記分析を参照）</p>`;

  const citationsHtml = inlineQuotes && inlineQuotes.length > 0
    ? renderInlineCitations(inlineQuotes, videoCards)
    : "";

  const assumptionsList = t.assumptions.length > 0
    ? `<h4>前提条件</h4>\n<ul>${t.assumptions.map(a => `<li>${escapeHtml(a)}</li>`).join("\n")}</ul>`
    : "";

  const sourcesHtml = t.sources && t.sources.length > 0 ? renderSources(t.sources) : "";
  const tsHtml = timestampLink(t.timestamp, videoCards);

  return `<div class="card" id="${escapeHtml(t.id)}">
<h3>${escapeHtml(t.description)} <span class="verdict ${verdictClass}">${verdictLabel(t.verdict)}</span></h3>
<p>第${t.episode}話 @ ${tsHtml}</p>
${dvComparison}
${citationsHtml}
${assumptionsList}
${markdownToHtml(t.explanation)}
${sourcesHtml}
</div>`;
}

/** Allowed embed hosts for video cards (security whitelist) */
const EMBED_HOSTS: Record<VideoCard["provider"], string> = {
  youtube: "https://www.youtube-nocookie.com/embed/",
  niconico: "https://embed.nicovideo.jp/watch/",
};

/** Render a video embed card */
export function renderVideoCard(card: VideoCard): string {
  const baseUrl = EMBED_HOSTS[card.provider];
  const startParam = card.startSec ? (card.provider === "youtube" ? `?start=${card.startSec}` : `?from=${card.startSec}`) : "";
  const src = `${baseUrl}${encodeURIComponent(card.id)}${startParam}`;
  const title = card.title ? escapeHtml(card.title) : `${card.provider} embed`;
  const caption = card.caption ? `<p class="video-caption">${escapeHtml(card.caption)}</p>` : "";

  return `<div class="video-card">
<iframe src="${src}" title="${title}" allowfullscreen loading="lazy"></iframe>
${caption}
</div>`;
}

/** Render a set of video cards */
export function renderVideoCards(cards: VideoCard[]): string {
  if (cards.length === 0) return "";
  return `<div class="video-cards">\n${cards.map(renderVideoCard).join("\n")}\n</div>`;
}

/** Render a single dialogue quote */
/** Parse a timestamp string (MM:SS or HH:MM:SS) to seconds */
export function parseTimestamp(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

/** Build a video URL with timestamp for the first YouTube video card */
export function timestampLink(ts: string, videoCards?: VideoCard[]): string {
  const escaped = escapeHtml(ts);
  if (!videoCards || videoCards.length === 0) return `(${escaped})`;
  const yt = videoCards.find(v => v.provider === "youtube");
  if (yt) {
    const secs = parseTimestamp(ts);
    return `<a href="https://www.youtube.com/watch?v=${encodeURIComponent(yt.id)}&t=${secs}" target="_blank" rel="noopener">${escaped}</a>`;
  }
  const nico = videoCards.find(v => v.provider === "niconico");
  if (nico) {
    const secs = parseTimestamp(ts);
    return `<a href="https://www.nicovideo.jp/watch/${encodeURIComponent(nico.id)}?from=${secs}" target="_blank" rel="noopener">${escaped}</a>`;
  }
  return `(${escaped})`;
}

export function renderDialogueQuote(q: DialogueQuote, videoCards?: VideoCard[]): string {
  const tsHtml = timestampLink(q.timestamp, videoCards);
  return `<div class="dialogue-quote" id="${escapeHtml(q.id)}">
<span class="speaker">${escapeHtml(q.speaker)}</span>「${escapeHtml(q.text)}」<span class="timestamp">(${tsHtml})</span>
</div>`;
}

/** Render a list of dialogue quotes as a section */
export function renderDialogueQuotes(quotes: DialogueQuote[], videoCards?: VideoCard[]): string {
  if (quotes.length === 0) return "";
  return `<h2>主要な台詞</h2>\n${quotes.map(q => renderDialogueQuote(q, videoCards)).join("\n")}`;
}

/**
 * Render a horizontal bar chart as inline SVG.
 * Each bar has a label, value, and optional color.
 * Values are scaled relative to the maximum value.
 */
/** Truncate a label to fit within SVG text constraints */
function truncateLabel(label: string, maxChars: number): string {
  if (label.length <= maxChars) return label;
  return label.slice(0, maxChars - 1) + "…";
}

/** Format a numeric value for display: locale-formatted with comma separators
 *  for moderate numbers, exponential notation only for very large/small values. */
export function formatNumericValue(v: number, decimals: number = 2): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return v.toExponential(decimals);
  if (abs >= 1) return v.toLocaleString("en", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  if (abs === 0) return "0." + "0".repeat(decimals);
  // Small decimals: use fixed unless extremely small
  if (abs < 1e-4) return v.toExponential(decimals);
  return v.toFixed(decimals);
}

export function renderBarChart(
  title: string,
  bars: { label: string; value: number; color?: string }[],
  unit: string = "",
): string {
  if (bars.length === 0) return "";
  const maxVal = Math.max(...bars.map(b => b.value));
  const barHeight = 24;
  const labelWidth = 160;
  const chartWidth = 600;
  const barAreaWidth = chartWidth - labelWidth - 80;
  const svgHeight = bars.length * (barHeight + 8) + 30;

  const barsSvg = bars.map((b, i) => {
    const y = i * (barHeight + 8) + 20;
    const width = maxVal > 0 ? Math.max(1, (b.value / maxVal) * barAreaWidth) : 0;
    const color = b.color || "var(--accent)";
    const displayVal = formatNumericValue(b.value);
    const truncatedLabel = truncateLabel(b.label, 20);
    return `<text x="${labelWidth - 8}" y="${y + barHeight / 2 + 4}" fill="var(--fg)" text-anchor="end" font-size="11">${escapeHtml(truncatedLabel)}</text>
<rect x="${labelWidth}" y="${y}" width="${width}" height="${barHeight}" rx="3" fill="${color}" opacity="0.85"/>
<text x="${labelWidth + width + 6}" y="${y + barHeight / 2 + 4}" fill="var(--fg)" font-size="11">${displayVal} ${escapeHtml(unit)}</text>`;
  }).join("\n");

  return `<div class="dv-chart card">
<h4>${escapeHtml(title)}</h4>
<svg viewBox="0 0 ${chartWidth} ${svgHeight}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(title)}">
${barsSvg}
</svg>
</div>`;
}

/**
 * Scale a radius value to pixel space using the given scale mode.
 * Returns a value in [minPx, maxPx].
 */
function scaleRadius(
  value: number,
  maxValue: number,
  maxPx: number,
  mode: "linear" | "sqrt" | "log",
  minPx: number = 20,
): number {
  if (maxValue <= 0 || value <= 0) return minPx;
  let ratio: number;
  switch (mode) {
    case "linear":
      ratio = value / maxValue;
      break;
    case "sqrt":
      ratio = Math.sqrt(value / maxValue);
      break;
    case "log":
      ratio = Math.log(1 + value) / Math.log(1 + maxValue);
      break;
  }
  return minPx + ratio * (maxPx - minPx);
}

/**
 * Generate an SVG path for a Hohmann transfer ellipse arc between two circular orbits.
 * Draws a half-ellipse from departure angle to arrival (180° transfer).
 */
function hohmannArcPath(r1px: number, r2px: number, fromAngle: number): string {
  // Hohmann is half an ellipse: semi-major axis = (r1+r2)/2
  const a = (r1px + r2px) / 2;
  const b = Math.sqrt(r1px * r2px); // semi-minor for visual approximation
  // Start at departure orbit, end 180° later at arrival orbit
  const startX = r1px * Math.cos(fromAngle);
  const startY = -r1px * Math.sin(fromAngle);
  const endX = -r1px * Math.cos(fromAngle) * (r2px / r1px);
  const endY = r1px * Math.sin(fromAngle) * (r2px / r1px);
  // Use SVG arc: large-arc-flag=1 for the long way around
  const sweepFlag = r2px >= r1px ? 1 : 0;
  return `M ${startX.toFixed(1)} ${startY.toFixed(1)} A ${a.toFixed(1)} ${b.toFixed(1)} 0 0 ${sweepFlag} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
}

/**
 * Generate an SVG path for a hyperbolic escape/capture arc.
 * Draws an open curve departing from the inner orbit.
 */
function hyperbolicArcPath(r1px: number, r2px: number, fromAngle: number): string {
  const startX = r1px * Math.cos(fromAngle);
  const startY = -r1px * Math.sin(fromAngle);
  // End point at the outer orbit, offset by ~60° (schematic)
  const endAngle = fromAngle + Math.PI * 0.35;
  const endX = r2px * Math.cos(endAngle);
  const endY = -r2px * Math.sin(endAngle);
  // Control point for the open curve
  const midR = (r1px + r2px) * 0.7;
  const midAngle = fromAngle + Math.PI * 0.15;
  const cpX = midR * Math.cos(midAngle);
  const cpY = -midR * Math.sin(midAngle);
  return `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${cpX.toFixed(1)} ${cpY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
}

/**
 * Generate an SVG path for a brachistochrone (constant-thrust) transfer.
 * Drawn as a smooth Bezier arc with a distinct visual style (dashed in CSS).
 */
function brachistochroneArcPath(r1px: number, r2px: number, fromAngle: number): string {
  const startX = r1px * Math.cos(fromAngle);
  const startY = -r1px * Math.sin(fromAngle);
  // End at arrival orbit, roughly 90° ahead
  const endAngle = fromAngle + Math.PI * 0.5;
  const endX = r2px * Math.cos(endAngle);
  const endY = -r2px * Math.sin(endAngle);
  // Midpoint "flip" marker position
  const midAngle = fromAngle + Math.PI * 0.25;
  const midR = (r1px + r2px) / 2;
  const cpX = midR * Math.cos(midAngle);
  const cpY = -midR * Math.sin(midAngle);
  return `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${cpX.toFixed(1)} ${cpY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
}

/** Generate SVG path for a transfer arc */
function transferArcPath(
  style: TransferArc["style"],
  fromOrbit: OrbitDefinition,
  toOrbit: OrbitDefinition,
  fromPx: number,
  toPx: number,
): string {
  const fromAngle = fromOrbit.angle ?? 0;
  switch (style) {
    case "hohmann":
      return hohmannArcPath(fromPx, toPx, fromAngle);
    case "hyperbolic":
      return hyperbolicArcPath(fromPx, toPx, fromAngle);
    case "brachistochrone":
      return brachistochroneArcPath(fromPx, toPx, fromAngle);
  }
}

/** Style label for the legend */
function transferStyleLabel(style: TransferArc["style"]): string {
  switch (style) {
    case "hohmann": return "ホーマン遷移";
    case "hyperbolic": return "双曲線軌道";
    case "brachistochrone": return "Brachistochrone（模式図）";
  }
}

/**
 * Render an orbital transfer diagram as inline SVG.
 * Top-down view of orbital system with concentric orbits and transfer arcs.
 */
export function renderOrbitalDiagram(diagram: OrbitalDiagram): string {
  const size = 500;
  const cx = size / 2;
  const cy = size / 2;
  const maxPlotR = size / 2 - 50; // leave margin for labels
  const mode = diagram.scaleMode ?? "sqrt";

  // Determine the maximum radius for scaling
  const maxOrbitR = diagram.viewRadius ?? Math.max(...diagram.orbits.map(o => o.radius));

  // Build orbit ID → definition lookup
  const orbitMap = new Map(diagram.orbits.map(o => [o.id, o]));

  // Compute pixel radii for each orbit
  const orbitPxMap = new Map<string, number>();
  for (const orbit of diagram.orbits) {
    orbitPxMap.set(orbit.id, scaleRadius(orbit.radius, maxOrbitR, maxPlotR, mode));
  }

  // Draw orbit circles
  const orbitCircles = diagram.orbits.map(orbit => {
    const r = orbitPxMap.get(orbit.id)!;
    return `<circle cx="0" cy="0" r="${r.toFixed(1)}" fill="none" stroke="${orbit.color}" stroke-width="1" stroke-opacity="0.4" stroke-dasharray="4 2"/>`;
  }).join("\n    ");

  const isAnimated = !!diagram.animation;

  // Draw orbit labels and optional body dots
  const orbitLabels = diagram.orbits.map(orbit => {
    const r = orbitPxMap.get(orbit.id)!;
    const parts: string[] = [];
    const orbitIdAttr = isAnimated ? ` data-orbit-id="${escapeHtml(orbit.id)}"` : "";
    if (orbit.angle !== undefined) {
      // Draw body dot at specified angle
      const bx = r * Math.cos(orbit.angle);
      const by = -r * Math.sin(orbit.angle);
      parts.push(`<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="4" fill="${orbit.color}"${orbitIdAttr}/>`);
      // Label next to the dot
      const lx = (r + 12) * Math.cos(orbit.angle);
      const ly = -(r + 12) * Math.sin(orbit.angle);
      parts.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="${orbit.color}" font-size="11" text-anchor="middle" dominant-baseline="middle"${orbitIdAttr}>${escapeHtml(orbit.label)}</text>`);
    } else {
      // Label at top of orbit
      parts.push(`<text x="0" y="${(-r - 8).toFixed(1)}" fill="${orbit.color}" font-size="10" text-anchor="middle">${escapeHtml(orbit.label)}</text>`);
    }
    return parts.join("\n    ");
  }).join("\n    ");

  // Build scenario lookup for multi-pattern diagrams
  const hasScenarios = !!(diagram.scenarios && diagram.scenarios.length > 0);
  const primaryScenarioId = hasScenarios ? diagram.scenarios![0].id : undefined;

  // Draw transfer arcs
  const transferPaths = diagram.transfers.map((t, idx) => {
    const fromOrbit = orbitMap.get(t.fromOrbitId);
    const toOrbit = orbitMap.get(t.toOrbitId);
    if (!fromOrbit || !toOrbit) return "";
    const fromPx = orbitPxMap.get(t.fromOrbitId)!;
    const toPx = orbitPxMap.get(t.toOrbitId)!;
    const pathD = transferArcPath(t.style, fromOrbit, toOrbit, fromPx, toPx);
    const dashArray = t.style === "brachistochrone" ? ' stroke-dasharray="8 4"' : "";
    const arrowId = `arrow-${escapeHtml(t.fromOrbitId)}-${escapeHtml(t.toOrbitId)}-${idx}`;
    const transferPathAttr = isAnimated ? ` data-transfer-path="${escapeHtml(t.fromOrbitId)}-${escapeHtml(t.toOrbitId)}-${idx}"` : "";
    const scenarioAttr = t.scenarioId ? ` data-scenario="${escapeHtml(t.scenarioId)}"` : "";
    // Non-primary scenario arcs get reduced opacity and thinner stroke
    const isAlt = hasScenarios && t.scenarioId && t.scenarioId !== primaryScenarioId;
    const strokeW = isAlt ? "1.5" : "2";
    const opacity = isAlt ? ' stroke-opacity="0.6"' : "";
    return `<path d="${pathD}" fill="none" stroke="${t.color}" stroke-width="${strokeW}"${dashArray}${opacity}${transferPathAttr}${scenarioAttr} marker-end="url(#${arrowId})"/>
    <marker id="${arrowId}" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="${t.color}"/></marker>`;
  }).join("\n    ");

  // Draw burn markers
  const burnMarkersSvg = diagram.transfers.flatMap(t => {
    if (!t.burnMarkers) return [];
    const fromOrbit = orbitMap.get(t.fromOrbitId);
    const toOrbit = orbitMap.get(t.toOrbitId);
    if (!fromOrbit || !toOrbit) return [];
    const fromPx = orbitPxMap.get(t.fromOrbitId)!;
    const toPx = orbitPxMap.get(t.toOrbitId)!;
    return t.burnMarkers.map(bm => {
      // Place marker at interpolated radius at specified angle
      const r = (fromPx + toPx) / 2;
      const mx = r * Math.cos(bm.angle);
      const my = -r * Math.sin(bm.angle);
      return `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="3" fill="var(--yellow)" stroke="var(--bg)" stroke-width="1"/>
    <text x="${(mx + 10).toFixed(1)}" y="${my.toFixed(1)}" fill="var(--yellow)" font-size="9" dominant-baseline="middle">${escapeHtml(bm.label)}</text>`;
    });
  }).join("\n    ");

  // Draw scale reference circles (if scaleLegend provided)
  let scaleRefCircles = "";
  if (diagram.scaleLegend && diagram.scaleLegend.referenceDistances.length > 0) {
    scaleRefCircles = diagram.scaleLegend.referenceDistances.map(ref => {
      const r = scaleRadius(ref.value, maxOrbitR, maxPlotR, mode);
      return `<circle class="scale-ref" cx="0" cy="0" r="${r.toFixed(1)}" fill="none" stroke="var(--fg)" stroke-width="0.5" stroke-opacity="0.15" stroke-dasharray="2 4"/>
    <text class="scale-ref" x="${(r + 2).toFixed(1)}" y="-2" fill="var(--fg)" font-size="8" fill-opacity="0.4">${escapeHtml(ref.label)}</text>`;
    }).join("\n    ");
  }

  // Draw timeline annotation badges on diagram (if provided)
  let timelineBadges = "";
  const annotations = diagram.timelineAnnotations ?? [];
  if (annotations.length > 0) {
    timelineBadges = annotations.map(ann => {
      const orbit = orbitMap.get(ann.orbitId);
      if (!orbit) return "";
      const r = orbitPxMap.get(ann.orbitId)!;
      const angle = orbit.angle ?? 0;
      // Place badge slightly outside the orbit
      const badgeR = r + 20;
      const bx = badgeR * Math.cos(angle);
      const by = -badgeR * Math.sin(angle);
      return `<text class="timeline-badge" x="${bx.toFixed(1)}" y="${by.toFixed(1)}" fill="var(--fg)" font-size="9" text-anchor="middle" dominant-baseline="middle">${escapeHtml(ann.badge)}</text>`;
    }).filter(s => s.length > 0).join("\n    ");
  }

  // Build legend — scenario-based when multi-pattern, style-based otherwise
  let legendItems: string;
  let legendRowCount: number;
  if (hasScenarios) {
    // Multi-pattern: show scenario labels with representative arc colors
    legendItems = diagram.scenarios!.map((sc, i) => {
      const y = i * 18;
      const repr = diagram.transfers.find(t => t.scenarioId === sc.id);
      const color = repr?.color ?? "var(--fg)";
      const dash = repr?.style === "brachistochrone" ? ' stroke-dasharray="6 3"' : "";
      const isAlt = i > 0;
      const sw = isAlt ? "1.5" : "2";
      const op = isAlt ? ' stroke-opacity="0.6"' : "";
      return `<line x1="0" y1="${y + 6}" x2="20" y2="${y + 6}" stroke="${color}" stroke-width="${sw}"${dash}${op}/>
    <text x="24" y="${y + 10}" fill="var(--fg)" font-size="10">${escapeHtml(sc.label)}</text>`;
    }).join("\n    ");
    legendRowCount = diagram.scenarios!.length;
  } else {
    const styles = [...new Set(diagram.transfers.map(t => t.style))];
    legendItems = styles.map((s, i) => {
      const y = i * 18;
      const dash = s === "brachistochrone" ? ' stroke-dasharray="6 3"' : "";
      const color = diagram.transfers.find(t => t.style === s)?.color ?? "var(--fg)";
      return `<line x1="0" y1="${y + 6}" x2="20" y2="${y + 6}" stroke="${color}" stroke-width="2"${dash}/>
    <text x="24" y="${y + 10}" fill="var(--fg)" font-size="10">${transferStyleLabel(s)}</text>`;
    }).join("\n    ");
    legendRowCount = styles.length;
  }

  // Scale mode label appended to legend
  let scaleLabelItem = "";
  let scaleLabelHeight = 0;
  if (diagram.scaleLegend) {
    const yOff = legendRowCount * 18;
    scaleLabelItem = `<text x="0" y="${yOff + 14}" fill="var(--fg)" font-size="9" fill-opacity="0.6">${escapeHtml(diagram.scaleLegend.label)}</text>`;
    scaleLabelHeight = 20;
  }

  const legendHeight = legendRowCount * 18 + 4 + scaleLabelHeight;

  const ariaLabel = `${diagram.title} — ${diagram.centerLabel}中心の軌道図`;
  const svg = `<svg width="${size}" height="${size + legendHeight + 10}" viewBox="${-cx} ${-cy} ${size} ${size + legendHeight + 10}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(ariaLabel)}">
  <style>text { font-family: "SFMono-Regular", Consolas, monospace; }</style>
  <g>
    <!-- Scale reference circles -->
    ${scaleRefCircles}

    <!-- Central body -->
    <circle cx="0" cy="0" r="6" fill="var(--yellow)"/>
    <text x="0" y="18" fill="var(--yellow)" font-size="11" text-anchor="middle">${escapeHtml(diagram.centerLabel)}</text>

    <!-- Orbits -->
    ${orbitCircles}

    <!-- Labels & body positions -->
    ${orbitLabels}

    <!-- Transfer arcs -->
    ${transferPaths}

    <!-- Burn markers -->
    ${burnMarkersSvg}

    <!-- Timeline badges -->
    ${timelineBadges}
  </g>

  <!-- Legend -->
  <g transform="translate(${-cx + 10}, ${cy + 10})">
    ${legendItems}
    ${scaleLabelItem}
  </g>
</svg>`;

  // Build animation data and controls if animated
  let animationHtml = "";
  if (diagram.animation) {
    const animData = {
      durationSeconds: diagram.animation.durationSeconds,
      orbits: diagram.orbits
        .filter(o => o.angle !== undefined)
        .map(o => ({
          id: o.id,
          initialAngle: o.angle!,
          meanMotion: o.meanMotion ?? 0,
          radiusPx: orbitPxMap.get(o.id)!,
          color: o.color,
        })),
      scenarios: diagram.scenarios?.map(s => ({ id: s.id, label: s.label })),
      transfers: diagram.transfers
        .map((t, idx) => ({ t, idx }))
        .filter(({ t }) => t.startTime !== undefined && t.endTime !== undefined)
        .map(({ t, idx }) => ({
          fromOrbitId: t.fromOrbitId,
          toOrbitId: t.toOrbitId,
          startTime: t.startTime!,
          endTime: t.endTime!,
          color: t.color,
          style: t.style,
          scenarioId: t.scenarioId,
          pathId: `${t.fromOrbitId}-${t.toOrbitId}-${idx}`,
          burns: (t.burnMarkers ?? [])
            .filter(bm => bm.startTime !== undefined && bm.endTime !== undefined)
            .map(bm => ({
              startTime: bm.startTime!,
              endTime: bm.endTime!,
              type: bm.type ?? "acceleration",
              label: bm.label,
            })),
        })),
    };
    animationHtml = `
<script type="application/json" class="orbital-animation-data">${JSON.stringify(animData)}</script>
<div class="orbital-animation-controls" role="group" aria-label="アニメーション操作">
  <button class="anim-play" title="再生/一時停止" aria-label="再生">▶</button>
  <input type="range" class="anim-slider" min="0" max="1000" value="0" step="1" aria-label="アニメーション時間" aria-valuemin="0" aria-valuemax="1000" aria-valuenow="0">
  <span class="time-display" aria-live="polite">0h</span>
</div>`;
  }

  // Build timeline bar (if annotations provided)
  let timelineBarHtml = "";
  if (annotations.length > 0) {
    const maxTime = Math.max(...annotations.map(a => a.missionTime));
    const barWidth = size; // match SVG width
    const items = annotations.map(ann => {
      const pct = maxTime > 0 ? (ann.missionTime / maxTime) * 100 : 0;
      return `<div class="timeline-item" style="left: ${pct.toFixed(1)}%">
<span class="timeline-badge-label">${escapeHtml(ann.badge)}</span>
<span class="timeline-label">${escapeHtml(ann.label)}</span>
</div>`;
    }).join("\n");
    timelineBarHtml = `<div class="timeline-bar" style="max-width: ${barWidth}px" role="list" aria-label="航路タイムライン">
${items}
</div>`;
  }

  const animAttr = diagram.animation ? ' data-animated="true"' : "";
  const descHtml = diagram.description
    ? `\n<p class="diagram-description">${escapeHtml(diagram.description)}</p>`
    : "";
  return `<div class="card orbital-diagram" id="${escapeHtml(diagram.id)}"${animAttr}>
<h4>${escapeHtml(diagram.title)}</h4>${descHtml}
${svg}${animationHtml}${timelineBarHtml}
</div>`;
}

/** Render all orbital diagrams for an episode */
export function renderOrbitalDiagrams(diagrams: OrbitalDiagram[]): string {
  if (diagrams.length === 0) return "";
  return `<h2>軌道遷移図</h2>\n${diagrams.map(renderOrbitalDiagram).join("\n")}`;
}

/** Episode-specific calculator defaults (must match calculator.js EPISODE_PRESETS) */
interface CalcPresetDef { key: string; label: string }
interface CalcEpConfig { defaults: { distanceAU: number; massT: number; timeH: number; thrustMN: number }; presets: CalcPresetDef[] }

const CALC_EPISODE_PRESETS: Record<number, CalcEpConfig> = {
  1: {
    defaults: { distanceAU: 3.68, massT: 48000, timeH: 72, thrustMN: 9.8 },
    presets: [
      { key: "ep01_72h", label: "火星→ガニメデ 72h（作中描写）" },
      { key: "ep01_150h", label: "通常ルート 150h" },
      { key: "ep01_mass299", label: "質量 ≤299t（成立条件）" },
      { key: "ep01_mass48", label: "質量 48t（48,000kg解釈）" },
    ],
  },
  2: {
    defaults: { distanceAU: 4.32, massT: 48000, timeH: 27, thrustMN: 9.8 },
    presets: [
      { key: "ep02_escape", label: "木星圏脱出 27h" },
      { key: "ep02_trim1pct", label: "木星→土星 トリム推力1%" },
      { key: "ep02_mass300", label: "木星圏脱出（300t仮定）" },
    ],
  },
  3: {
    defaults: { distanceAU: 9.62, massT: 48000, timeH: 143, thrustMN: 9.8 },
    presets: [
      { key: "ep03_143h", label: "エンケラドス→タイタニア 143h（作中描写）" },
      { key: "ep03_mass452", label: "質量 ≤452t（成立条件）" },
      { key: "ep03_mass300", label: "質量 300t（EP01と一致）" },
    ],
  },
  4: {
    defaults: { distanceAU: 18.2, massT: 48000, timeH: 2520, thrustMN: 6.37 },
    presets: [
      { key: "ep04_damaged", label: "タイタニア→地球 65%推力（作中描写）" },
      { key: "ep04_mass300", label: "質量 300t・65%推力" },
      { key: "ep04_full_thrust", label: "仮に100%推力の場合" },
    ],
  },
  5: {
    defaults: { distanceAU: 18.2, massT: 48000, timeH: 507, thrustMN: 6.37 },
    presets: [
      { key: "ep05_composite", label: "天王星→地球 507h 複合航路（作中描写）" },
      { key: "ep05_mass300", label: "質量 300t・65%推力" },
      { key: "ep05_direct", label: "直行ルート（フライバイなし）" },
      { key: "ep05_nozzle_limit", label: "ノズル寿命上限 55h38m" },
    ],
  },
};

/** Render the interactive brachistochrone calculator widget */
export function renderCalculator(episode?: number): string {
  const ep = episode && CALC_EPISODE_PRESETS[episode] ? episode : 1;
  const epConfig = CALC_EPISODE_PRESETS[ep];
  const d = epConfig.defaults;

  const presetButtons = epConfig.presets
    .map(p => `  <button data-preset="${escapeHtml(p.key)}">${escapeHtml(p.label)}</button>`)
    .join("\n");

  const distMax = Math.max(25, Math.ceil(d.distanceAU * 2));
  const timeMax = Math.max(500, Math.ceil(d.timeH * 2));

  return `<div class="calc-section card" id="calculator" data-episode="${ep}">
<h2>Brachistochrone 計算機 <span class="calc-badge" id="calc-engine-badge">エンジン: JS</span></h2>
<p>距離・船質量・遷移時間・推力を変えて、必要な加速度と&Delta;Vへの影響を探索できます。</p>
<p class="calc-assumptions" id="calc-assumptions">前提: 直線経路、中間点で加速反転減速、一定推力、重力無視、静止→静止遷移。</p>

<div class="calc-controls">
  <div class="calc-control">
    <label for="calc-distance">距離 (AU)</label>
    <input type="range" id="calc-distance-range" min="0.5" max="${distMax}" step="0.01" value="${d.distanceAU}" aria-label="距離 (AU)" aria-describedby="calc-assumptions">
    <input type="number" id="calc-distance" min="0.1" max="50" step="0.01" value="${d.distanceAU}" aria-describedby="calc-assumptions">
  </div>
  <div class="calc-control">
    <label for="calc-mass">船質量 (t)</label>
    <input type="range" id="calc-mass-range" min="10" max="100000" step="10" value="${d.massT}" aria-label="船質量 (t)" aria-describedby="calc-assumptions">
    <input type="number" id="calc-mass" min="1" max="1000000" step="1" value="${d.massT}" aria-describedby="calc-assumptions">
  </div>
  <div class="calc-control">
    <label for="calc-time">遷移時間 (h)</label>
    <input type="range" id="calc-time-range" min="1" max="${timeMax}" step="1" value="${d.timeH}" aria-label="遷移時間 (h)" aria-describedby="calc-assumptions">
    <input type="number" id="calc-time" min="1" max="10000" step="1" value="${d.timeH}" aria-describedby="calc-assumptions">
  </div>
  <div class="calc-control">
    <label for="calc-thrust">推力 (MN)</label>
    <input type="range" id="calc-thrust-range" min="0.01" max="15" step="0.01" value="${d.thrustMN}" aria-label="推力 (MN)" aria-describedby="calc-assumptions">
    <input type="number" id="calc-thrust" min="0.01" max="100" step="0.01" value="${d.thrustMN}" aria-describedby="calc-assumptions">
    <span id="calc-thrust-val" class="calc-badge" style="font-size:0.85em">${d.thrustMN} MN</span>
  </div>
</div>

<div class="calc-presets">
${presetButtons}
</div>

<div class="calc-results" aria-live="polite">
<table>
  <tr><th colspan="2">遷移の要件</th><th colspan="2">船の性能 (ケストレル号)</th></tr>
  <tr>
    <td>必要加速度</td><td id="res-req-accel">—</td>
    <td>船の加速度</td><td id="res-ship-accel">—</td>
  </tr>
  <tr>
    <td>必要&Delta;V</td><td id="res-req-dv">—</td>
    <td>船の&Delta;V余力</td><td id="res-ship-dv">—</td>
  </tr>
  <tr>
    <td>距離</td><td><span id="calc-distance-val">—</span></td>
    <td>到達可能距離</td><td id="res-ship-reach">—</td>
  </tr>
  <tr>
    <td>加速度ギャップ</td><td class="result-gap" id="res-accel-ratio">—</td>
    <td>&Delta;Vギャップ</td><td class="result-gap" id="res-dv-ratio">—</td>
  </tr>
</table>
<p style="margin-top:0.75rem">判定: <span id="res-verdict" class="verdict verdict-indeterminate">—</span></p>
</div>
</div>
<script type="module" src="../calculator.js"></script>`;
}

/** Render a scenario table row */
function renderScenarioRow(s: ExplorationScenario): string {
  const cls = s.feasible ? "feasible" : "infeasible";
  const icon = s.feasible ? "✓" : "✗";
  const resultCells = Object.entries(s.results)
    .map(([_k, v]) => `<td>${typeof v === "number" ? formatNumericValue(v) : escapeHtml(String(v))}</td>`)
    .join("");
  return `<tr class="${cls}"><td>${icon} ${escapeHtml(s.label)}</td><td>${s.variedValue.toLocaleString()} ${escapeHtml(s.variedUnit)}</td>${resultCells}<td>${escapeHtml(s.note)}</td></tr>`;
}

/** Render a parameter exploration section */
export function renderExploration(exp: ParameterExploration): string {
  const boundary = exp.boundaryCondition
    ? `<p class="boundary">${inlineFormat(exp.boundaryCondition)}</p>`
    : "";

  const visibleScenarios = exp.scenarios.filter(s => !s.collapsedByDefault);
  const collapsedScenarios = exp.scenarios.filter(s => s.collapsedByDefault);

  const visibleRows = visibleScenarios.map(renderScenarioRow).join("\n");
  const collapsedRows = collapsedScenarios.map(renderScenarioRow).join("\n");

  const resultHeaders = exp.scenarios.length > 0
    ? Object.keys(exp.scenarios[0].results).map(k => `<th>${escapeHtml(k)}</th>`).join("")
    : "";

  const tableHead = `<thead><tr><th>シナリオ</th><th>パラメータ</th>${resultHeaders}<th>備考</th></tr></thead>`;

  const collapsedSection = collapsedRows
    ? `\n<details class="collapsed-scenarios"><summary>他のシナリオを表示</summary>\n<table class="scenario-table">\n${tableHead}\n<tbody>${collapsedRows}</tbody>\n</table>\n</details>`
    : "";

  return `<div class="card exploration" id="${escapeHtml(exp.id)}">
<h4>${escapeHtml(exp.question)}</h4>
${boundary}
<table class="scenario-table">
${tableHead}
<tbody>${visibleRows}</tbody>
</table>${collapsedSection}
<p>${escapeHtml(exp.summary)}</p>
</div>`;
}

/** Render all explorations for an episode */
export function renderExplorations(explorations: ParameterExploration[]): string {
  if (explorations.length === 0) return "";
  return `<h2>パラメータ探索</h2>\n<p>描写が成立する条件を多角的に分析します。</p>\n${explorations.map(renderExploration).join("\n")}`;
}

/** Build a ΔV summary chart from transfer data */
function buildDvChart(transfers: TransferAnalysis[]): string {
  const chartBars = transfers
    .filter((t): t is TransferAnalysis & { computedDeltaV: number } => t.computedDeltaV != null && t.computedDeltaV > 0)
    .map(t => ({
      label: t.description,
      value: t.computedDeltaV,
      color: t.verdict === "plausible" ? "var(--green)" : t.verdict === "implausible" ? "var(--red)" : t.verdict === "conditional" ? "#8957e5" : "var(--yellow)",
    }));
  return renderBarChart("ΔV 比較", chartBars, "km/s");
}

/** Render a full episode report page */
export function renderEpisode(report: EpisodeReport, summaryPages?: SiteManifest["summaryPages"], totalEpisodes?: number, navEpisodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  const videoSection = report.videoCards && report.videoCards.length > 0
    ? renderVideoCards(report.videoCards)
    : "";

  // Group explorations by transferId for nested rendering
  const explorationsByTransfer = new Map<string, ParameterExploration[]>();
  const unlinkedExplorations: ParameterExploration[] = [];
  if (report.explorations) {
    for (const exp of report.explorations) {
      const transferExists = report.transfers.some(t => t.id === exp.transferId);
      if (transferExists) {
        const list = explorationsByTransfer.get(exp.transferId) ?? [];
        list.push(exp);
        explorationsByTransfer.set(exp.transferId, list);
      } else {
        unlinkedExplorations.push(exp);
      }
    }
  }

  // Render each transfer with its nested explorations and inline citations
  const cards = report.transfers.map((t) => {
    // Resolve inline citations from evidenceQuoteIds
    const inlineQuotes = t.evidenceQuoteIds && report.dialogueQuotes
      ? t.evidenceQuoteIds
          .map(id => report.dialogueQuotes!.find(q => q.id === id))
          .filter((q): q is DialogueQuote => q !== undefined)
      : [];

    const transferHtml = renderTransferCard(t, inlineQuotes, report.videoCards);

    // Render nested explorations for this transfer
    const relatedExplorations = explorationsByTransfer.get(t.id) ?? [];
    const explorationHtml = relatedExplorations.map(renderExploration).join("\n");

    return transferHtml + explorationHtml;
  }).join("\n");

  const dvChart = buildDvChart(report.transfers);

  // Render any explorations not linked to a specific transfer
  const unlinkedSection = unlinkedExplorations.length > 0
    ? `<h2>その他のパラメータ探索</h2>\n${unlinkedExplorations.map(renderExploration).join("\n")}`
    : "";

  const calculator = renderCalculator(report.episode);

  const isProvisional = report.summary.includes("暫定");
  const provisionalBadge = isProvisional
    ? ' <span class="verdict verdict-indeterminate" style="font-size:0.6em;vertical-align:middle">暫定分析</span>'
    : "";

  // Build table of contents
  const tocItems: string[] = [];
  if (report.dialogueQuotes && report.dialogueQuotes.length > 0) {
    tocItems.push('<li><a href="#section-dialogue">主要な台詞</a></li>');
  }
  if (report.diagrams && report.diagrams.length > 0) {
    tocItems.push('<li><a href="#section-diagrams">軌道遷移図</a></li>');
  }
  if (report.timeSeriesCharts && report.timeSeriesCharts.length > 0) {
    tocItems.push('<li><a href="#section-timeseries">時系列グラフ</a></li>');
  }
  if (report.transfers.length > 0) {
    tocItems.push('<li><a href="#section-transfers">軌道遷移分析</a></li>');
    tocItems.push('<ul>');
    for (const t of report.transfers) {
      const badge = verdictBadge(t.verdict);
      tocItems.push(`<li><a href="#${escapeHtml(t.id)}">${escapeHtml(t.description)}</a> ${badge}</li>`);
    }
    tocItems.push('</ul>');
  }
  tocItems.push('<li><a href="#calculator">Brachistochrone 計算機</a></li>');
  const toc = tocItems.length > 0
    ? `<nav class="toc card"><h3>目次</h3><ul>${tocItems.join("\n")}</ul></nav>`
    : "";

  const dialogueSectionWithId = report.dialogueQuotes && report.dialogueQuotes.length > 0
    ? `<h2 id="section-dialogue">主要な台詞</h2>\n${report.dialogueQuotes.map(q => renderDialogueQuote(q, report.videoCards)).join("\n")}`
    : "";

  const diagramSectionWithId = report.diagrams && report.diagrams.length > 0
    ? `<h2 id="section-diagrams">軌道遷移図</h2>\n${report.diagrams.map(renderOrbitalDiagram).join("\n")}`
    : "";

  const timeSeriesSectionWithId = report.timeSeriesCharts && report.timeSeriesCharts.length > 0
    ? `<h2 id="section-timeseries">時系列グラフ</h2>\n${renderTimeSeriesCharts(report.timeSeriesCharts)}`
    : "";

  const content = `
<h1>第${report.episode}話: ${escapeHtml(report.title)}${provisionalBadge}</h1>
${videoSection}
${markdownToHtml(report.summary)}

${toc}

${dialogueSectionWithId}

${dvChart}

${diagramSectionWithId}

${timeSeriesSectionWithId}

<h2 id="section-transfers">軌道遷移分析</h2>
${report.transfers.length > 0 ? cards : "<p>分析された軌道遷移はまだありません。</p>"}

${unlinkedSection}

${calculator}`;

  // Build prev/next episode navigation
  const total = totalEpisodes ?? 0;
  let episodeNav = "";
  if (total > 1) {
    const prevLink = report.episode > 1
      ? `<a href="ep-${String(report.episode - 1).padStart(3, "0")}.html">← 第${report.episode - 1}話</a>`
      : `<span></span>`;
    const nextLink = report.episode < total
      ? `<a href="ep-${String(report.episode + 1).padStart(3, "0")}.html">第${report.episode + 1}話 →</a>`
      : `<span></span>`;
    episodeNav = `\n<nav style="display:flex;justify-content:space-between;margin-top:2rem;padding-top:1rem;border-top:1px solid var(--border)">${prevLink} <a href="../index.html">トップ</a> ${nextLink}</nav>`;
  }

  // Include animation script if any diagram is animated
  const hasAnimatedDiagrams = report.diagrams?.some(d => d.animation) ?? false;
  const animScript = hasAnimatedDiagrams ? '\n<script src="../orbital-animation.js"></script>' : "";

  const desc = report.summary.length > 120 ? report.summary.substring(0, 120) + "…" : report.summary;
  return layoutHtml(`第${report.episode}話`, content + episodeNav + animScript, "..", summaryPages, desc, navEpisodes, metaPages);
}

/** Render the session logs index page */
export function renderLogsIndex(logs: SiteManifest["logs"], summaryPages?: SiteManifest["summaryPages"], navEpisodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  const logList = logs.length > 0
    ? logs.map(log =>
        `<li><a href="${log.filename}.html">${escapeHtml(log.date)}</a> — ${escapeHtml(log.description)}</li>`
      ).join("\n")
    : "<li>セッションログはまだありません。</li>";

  const content = `
<h1>セッションログ</h1>
<p>分析プロセスにおける Claude Code セッションのログ。</p>
<ul>
${logList}
</ul>`;

  return layoutHtml("セッションログ", content, "..", summaryPages, undefined, navEpisodes, metaPages);
}

/** Render a single session log page */
export function renderLogPage(filename: string, date: string, markdownContent: string, summaryPages?: SiteManifest["summaryPages"], navEpisodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  const htmlContent = markdownToHtml(markdownContent);
  const content = `
<h1>セッションログ: ${escapeHtml(date)}</h1>
<div class="card">
${htmlContent}
</div>`;

  return layoutHtml(`ログ ${date}`, content, "..", summaryPages, undefined, navEpisodes, metaPages);
}

/** Render a comparison table */
export function renderComparisonTable(table: ComparisonTable): string {
  const epHeaders = table.episodes.map(ep => `<th>第${ep}話</th>`).join("");
  const rows = table.rows.map(row => {
    const cells = table.episodes.map(ep => {
      const val = row.values[ep] ?? "—";
      // Only apply numeric class if value looks like a number/measurement
      const isNumeric = /^[\d.,≤≥~≈<>]+(\s*(km\/s|MN|AU|t|%|mSv|日|年))?$/.test(val.trim()) || val === "—";
      const cls = isNumeric ? ' class="numeric"' : '';
      return `<td${cls}>${inlineFormat(val)}</td>`;
    }).join("");
    return `<tr class="status-${row.status}"><td>${inlineFormat(row.metric)}</td>${cells}<td class="note">${escapeHtml(row.note)}</td></tr>`;
  }).join("\n");

  return `<table class="comparison-table">
<caption>${escapeHtml(table.caption)}</caption>
<thead><tr><th>パラメータ</th>${epHeaders}<th>整合性</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`;
}

/** Render an event timeline as a vertical timeline visualization */
export function renderEventTimeline(timeline: EventTimeline): string {
  const events = timeline.events.map(event => {
    const stateChanges = event.stateChanges?.length
      ? `<ul class="state-changes">${event.stateChanges.map(c => `<li>${escapeHtml(c)}</li>`).join("")}</ul>`
      : "";
    const ts = event.timestamp ? ` <span class="timeline-timestamp">(${escapeHtml(event.timestamp)})</span>` : "";
    return `<div class="timeline-event" data-episode="${event.episode}">
<div class="timeline-marker"></div>
<div class="timeline-content">
<div class="timeline-label"><strong>第${event.episode}話</strong>${ts} ${escapeHtml(event.label)}</div>
<div class="timeline-description">${escapeHtml(event.description)}</div>
${stateChanges}
</div>
</div>`;
  }).join("\n");
  return `<div class="event-timeline">
<h4>${escapeHtml(timeline.caption)}</h4>
<div class="timeline-track">
${events}
</div>
</div>`;
}

/** Map verification status to Japanese label and CSS class */
function verificationStatusInfo(status: string): { label: string; cssClass: string } {
  switch (status) {
    case "verified": return { label: "検証済", cssClass: "status-verified" };
    case "approximate": return { label: "近似一致", cssClass: "status-approximate" };
    case "unverified": return { label: "未検証", cssClass: "status-unverified" };
    case "discrepancy": return { label: "不一致", cssClass: "status-discrepancy" };
    default: return { label: status, cssClass: "" };
  }
}

/** Render a verification table comparing depicted vs real-world values */
export function renderVerificationTable(table: VerificationTable): string {
  const rows = table.rows.map(row => {
    const { label, cssClass } = verificationStatusInfo(row.status);
    const accuracy = row.accuracyPercent !== null ? `${row.accuracyPercent.toFixed(1)}%` : "—";
    return `<tr class="${cssClass}">
<td>${escapeHtml(row.claim)}</td>
<td class="numeric">第${row.episode}話</td>
<td>${escapeHtml(row.depicted)}</td>
<td>${inlineFormat(row.reference)}</td>
<td class="numeric">${accuracy}</td>
<td><span class="verification-badge ${cssClass}">${label}</span></td>
<td class="source-cell">${inlineFormat(row.source)}</td>
</tr>`;
  }).join("\n");
  return `<div class="verification-table-container">
<table class="verification-table">
<caption>${escapeHtml(table.caption)}</caption>
<thead>
<tr>
<th>検証項目</th>
<th>話数</th>
<th>作中値</th>
<th>実測/文献値</th>
<th>精度</th>
<th>判定</th>
<th>出典</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>
</div>`;
}

/** Render a bar chart from a BarChart data object (delegates to renderBarChart) */
function renderBarChartFromData(chart: BarChart): string {
  return renderBarChart(chart.caption, chart.bars.map(b => ({
    label: b.label,
    value: b.value,
    color: b.color,
  })), chart.unit);
}

/** Render a time-series chart container with embedded JSON data for uPlot */
export function renderTimeSeriesChart(chart: TimeSeriesChart): string {
  const descHtml = chart.description
    ? `<p class="diagram-description">${escapeHtml(chart.description)}</p>`
    : "";
  const jsonData = JSON.stringify({
    xLabel: chart.xLabel,
    yLabel: chart.yLabel,
    series: chart.series,
    thresholds: chart.thresholds ?? [],
    width: chart.width ?? 600,
    height: chart.height ?? 300,
  });
  return `<div class="card uplot-chart" id="${escapeHtml(chart.id)}">
<h4>${escapeHtml(chart.title)}</h4>${descHtml}
<script type="application/json" class="uplot-data">${jsonData}</script>
<div class="uplot-target"></div>
</div>`;
}

/** Render multiple time-series charts */
export function renderTimeSeriesCharts(charts: TimeSeriesChart[]): string {
  if (charts.length === 0) return "";
  return charts.map(renderTimeSeriesChart).join("\n");
}

/** Render a custom comparison table (non-episode headers) */
export function renderCustomComparisonTable(table: { caption: string; headers: string[]; rows: { label: string; values: string[]; highlight?: boolean }[] }): string {
  const headerCells = table.headers.map(h => `<th>${escapeHtml(h)}</th>`).join("");
  const bodyRows = table.rows.map(row => {
    const cls = row.highlight ? ' class="highlight"' : "";
    const cells = row.values.map(v => `<td>${escapeHtml(v)}</td>`).join("");
    return `<tr${cls}><td class="row-label">${escapeHtml(row.label)}</td>${cells}</tr>`;
  }).join("\n");

  return `<div class="comparison-table">
<table>
<caption>${escapeHtml(table.caption)}</caption>
<thead><tr><th></th>${headerCells}</tr></thead>
<tbody>
${bodyRows}
</tbody>
</table>
</div>`;
}

/** Generate a URL-safe slug from a heading string */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s　]+/g, "-")
    .replace(/[^\w\u3000-\u9fff\u30a0-\u30ff\u3040-\u309f-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Render episode navigation strip for summary pages */
export function renderEpisodeNav(episodes: SiteManifest["episodes"], basePath: string = "../episodes"): string {
  if (episodes.length === 0) return "";
  const cards = episodes.map(ep => {
    const href = `${basePath}/ep-${String(ep.episode).padStart(3, "0")}.html`;
    return `<a href="${href}" class="ep-nav-chip">第${ep.episode}話<span class="ep-nav-title">${escapeHtml(ep.title.replace(/^SOLAR LINE Part\s*\d+\s*(END\s*)?[—–-]\s*/, ""))}</span></a>`;
  }).join("");
  return `<nav class="ep-nav-strip card"><span class="ep-nav-label">エピソード:</span>${cards}</nav>`;
}

/** Render a summary report page */
export function renderSummaryPage(report: SummaryReport, summaryPages?: SiteManifest["summaryPages"], episodes?: SiteManifest["episodes"], navEpisodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  const mdOpts: MarkdownOptions = { autoLinkEpisodes: true, episodeBasePath: "../episodes" };
  const sections = report.sections.map(section => {
    const sectionId = slugify(section.heading);
    const tableHtml = section.table ? renderComparisonTable(section.table) : "";
    const diagramHtml = section.orbitalDiagrams ? renderOrbitalDiagrams(section.orbitalDiagrams) : "";
    const timelineHtml = section.eventTimeline ? renderEventTimeline(section.eventTimeline) : "";
    const verificationHtml = section.verificationTable ? renderVerificationTable(section.verificationTable) : "";
    const dagHtml = section.dagViewer ? '<div id="dag-viewer" class="dag-viewer-container"></div>' : "";
    const barChartHtml = section.barChart ? renderBarChartFromData(section.barChart) : "";
    const timeSeriesHtml = section.timeSeriesCharts ? renderTimeSeriesCharts(section.timeSeriesCharts) : "";
    const customTableHtml = section.comparisonTable ? renderCustomComparisonTable(section.comparisonTable) : "";
    return `<div class="summary-section" id="${escapeHtml(sectionId)}">
<h2>${escapeHtml(section.heading)}</h2>
${markdownToHtml(section.markdown, mdOpts)}
${diagramHtml}
${barChartHtml}
${timeSeriesHtml}
${timelineHtml}
${verificationHtml}
${tableHtml}
${customTableHtml}
${dagHtml}
</div>`;
  }).join("\n");

  // Build TOC for summary page
  const summaryTocItems = report.sections.map(section => {
    const sectionId = slugify(section.heading);
    return `<li><a href="#${escapeHtml(sectionId)}">${escapeHtml(section.heading)}</a></li>`;
  });
  const summaryToc = summaryTocItems.length > 1
    ? `<nav class="toc card"><h3>目次</h3><ul>${summaryTocItems.join("\n")}</ul></nav>`
    : "";

  // Episode navigation strip
  const episodeNav = episodes ? renderEpisodeNav(episodes) : "";

  // Include animation script if any section has animated diagrams
  const hasAnimatedDiagrams = report.sections.some(
    s => s.orbitalDiagrams?.some(d => d.animation) ?? false
  );
  const animScript = hasAnimatedDiagrams ? '\n<script src="../orbital-animation.js"></script>' : "";
  const hasDagViewer = report.sections.some(s => s.dagViewer);
  const dagScript = hasDagViewer ? '\n<script src="../dag-viewer.js"></script>' : "";

  const content = `
<h1>${escapeHtml(report.title)}</h1>
${markdownToHtml(report.summary, mdOpts)}
${episodeNav}
${summaryToc}
${sections}`;

  const desc = report.summary.length > 120 ? report.summary.substring(0, 120) + "…" : report.summary;
  return layoutHtml(report.title, content + animScript + dagScript, "..", summaryPages, desc, navEpisodes, metaPages);
}

// ---------------------------------------------------------------------------
// Transcription pages
// ---------------------------------------------------------------------------

/** Format milliseconds to MM:SS or HH:MM:SS */
export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) return `${hours}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

/** Map source type to Japanese label */
function sourceLabel(source: string): string {
  switch (source) {
    case "youtube-auto": return "YouTube 自動字幕";
    case "youtube-manual": return "YouTube 手動字幕";
    case "manual": return "手動入力";
    case "whisper": return "Whisper STT";
    default: return source;
  }
}

/** Map confidence to Japanese badge */
function confidenceBadge(confidence: string): string {
  switch (confidence) {
    case "verified": return '<span class="confidence confidence-verified">確認済み</span>';
    case "inferred": return '<span class="confidence confidence-inferred">推定</span>';
    case "uncertain": return '<span class="confidence confidence-uncertain">不確定</span>';
    default: return escapeHtml(confidence);
  }
}

/** Render a single transcription page for one episode */
export function renderTranscriptionPage(data: TranscriptionPageData, summaryPages?: SiteManifest["summaryPages"], navEpisodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  const epTitle = data.title ?? `第${data.episode}話`;
  const heading = `文字起こし — ${escapeHtml(epTitle)}`;

  // Collect all available sources for the source info card
  const allSources = [{ label: sourceLabel(data.sourceInfo.source), count: data.lines.length }];
  if (data.additionalSources) {
    for (const src of data.additionalSources) {
      allSources.push({ label: sourceLabel(src.source), count: src.lines.length });
    }
  }

  // Source info
  const sourceInfo = `
<div class="card">
<h2>ソース情報</h2>
<table class="meta-table">
<tr><th>エピソード</th><td>第${data.episode}話</td></tr>
<tr><th>字幕ソース</th><td>${allSources.map(s => `${s.label}（${s.count}行）`).join("、")}</td></tr>
<tr><th>言語</th><td>${escapeHtml(data.sourceInfo.language)}</td></tr>
<tr><th>動画ID</th><td>${escapeHtml(data.videoId)}</td></tr>
${data.dialogue ? `<tr><th>帰属台詞数</th><td>${data.dialogue.length}行</td></tr>` : ""}
${data.speakers ? `<tr><th>話者数</th><td>${data.speakers.length}人</td></tr>` : ""}
${data.scenes ? `<tr><th>シーン数</th><td>${data.scenes.length}</td></tr>` : ""}
<tr><th>帰属状態</th><td>${data.dialogue ? "Phase 2 完了（話者帰属済み）" : "Phase 1 のみ（話者未帰属）"}</td></tr>
</table>
<p><a href="../episodes/ep-${String(data.episode).padStart(3, "0")}.html">← 第${data.episode}話の考察レポートに戻る</a></p>
</div>`;

  // Speaker registry table
  let speakerSection = "";
  if (data.speakers && data.speakers.length > 0) {
    const rows = data.speakers.map(s =>
      `<tr><td>${escapeHtml(s.nameJa)}</td><td>${escapeHtml(s.id)}</td><td>${s.notes ? escapeHtml(s.notes) : "—"}</td></tr>`
    ).join("\n");
    speakerSection = `
<h2>話者一覧</h2>
<table class="data-table">
<thead><tr><th>名前</th><th>ID</th><th>備考</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`;
  }

  // Build tab panels
  const tabs: { id: string; label: string; content: string }[] = [];

  // Tab 1: Corrected dialogue (Phase 2) — if available
  if (data.dialogue && data.scenes) {
    const sceneMap = new Map(data.scenes.map(s => [s.id, s]));
    let currentScene = "";
    const rows: string[] = [];
    for (const d of data.dialogue) {
      if (d.sceneId !== currentScene) {
        currentScene = d.sceneId;
        const scene = sceneMap.get(d.sceneId);
        const sceneDesc = scene ? escapeHtml(scene.description) : d.sceneId;
        const sceneTime = scene ? formatTimestamp(scene.startMs) : "";
        rows.push(`<tr class="scene-header"><td colspan="4">${sceneDesc}${sceneTime ? ` (${sceneTime}〜)` : ""}</td></tr>`);
      }
      rows.push(
        `<tr><td class="ts">${formatTimestamp(d.startMs)}</td><td class="speaker">${escapeHtml(d.speakerName)}</td><td>${escapeHtml(d.text)}</td><td>${confidenceBadge(d.confidence)}</td></tr>`
      );
    }
    tabs.push({
      id: "corrected",
      label: "修正版（話者帰属済み）",
      content: `<table class="data-table dialogue-table">
<thead><tr><th>時刻</th><th>話者</th><th>台詞</th><th>確度</th></tr></thead>
<tbody>
${rows.join("\n")}
</tbody>
</table>`,
    });
  }

  // Tab for primary raw source
  tabs.push({
    id: "primary",
    label: `${sourceLabel(data.sourceInfo.source)}（生データ）`,
    content: renderRawLinesTable(data.lines),
  });

  // Tabs for additional sources
  if (data.additionalSources) {
    for (let i = 0; i < data.additionalSources.length; i++) {
      const src = data.additionalSources[i];
      tabs.push({
        id: `alt-${i}`,
        label: `${sourceLabel(src.source)}（生データ）`,
        content: renderRawLinesTable(src.lines),
      });
    }
  }

  // Build tabbed UI (or simple view if only one tab)
  let dialogueSection: string;
  if (tabs.length === 1) {
    dialogueSection = `<h2>${escapeHtml(tabs[0].label)}</h2>\n${tabs[0].content}`;
  } else {
    const tabButtons = tabs.map((t, i) =>
      `<button class="tab-btn${i === 0 ? " active" : ""}" data-tab="${t.id}">${escapeHtml(t.label)}</button>`
    ).join("\n");
    const tabPanels = tabs.map((t, i) =>
      `<div class="tab-panel${i === 0 ? " active" : ""}" id="tab-${t.id}">\n${t.content}\n</div>`
    ).join("\n");
    dialogueSection = `
<h2>台詞データ</h2>
<div class="tab-container">
<div class="tab-buttons">
${tabButtons}
</div>
${tabPanels}
</div>
<script>
(function(){
  var btns = document.querySelectorAll('.tab-btn');
  var panels = document.querySelectorAll('.tab-panel');
  btns.forEach(function(btn){
    btn.addEventListener('click', function(){
      btns.forEach(function(b){ b.classList.remove('active'); });
      panels.forEach(function(p){ p.classList.remove('active'); });
      btn.classList.add('active');
      var panel = document.getElementById('tab-' + btn.getAttribute('data-tab'));
      if(panel) panel.classList.add('active');
    });
  });
})();
</script>`;
  }

  const content = `
<h1>${heading}</h1>
${sourceInfo}
${speakerSection}
${dialogueSection}`;

  return layoutHtml(`文字起こし 第${data.episode}話`, content, "..", summaryPages, `第${data.episode}話の文字起こし・台詞データ`, navEpisodes, metaPages);
}

/** Render a raw lines table (Phase 1 extracted lines) */
function renderRawLinesTable(lines: { lineId: string; startMs: number; endMs: number; text: string; mergeReasons: string[] }[]): string {
  const rows = lines.map(l =>
    `<tr><td class="ts">${formatTimestamp(l.startMs)}</td><td>${escapeHtml(l.text)}</td><td>${l.mergeReasons.length > 0 ? escapeHtml(l.mergeReasons.join(", ")) : "—"}</td></tr>`
  ).join("\n");
  return `<table class="data-table lines-table">
<thead><tr><th>時刻</th><th>テキスト</th><th>結合理由</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`;
}

/** Render the transcription index page */
export function renderTranscriptionIndex(transcriptions: TranscriptionPageData[], summaryPages?: SiteManifest["summaryPages"], navEpisodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  const rows = transcriptions.map(t => {
    const epTitle = t.title ?? `第${t.episode}話`;
    const link = `ep-${String(t.episode).padStart(3, "0")}.html`;
    const phase = t.dialogue ? "Phase 2 完了" : "Phase 1 のみ";
    const phaseClass = t.dialogue ? "phase-done" : "phase-partial";
    const sourceCount = 1 + (t.additionalSources?.length ?? 0);
    const sourceNames = [sourceLabel(t.sourceInfo.source), ...(t.additionalSources?.map(s => sourceLabel(s.source)) ?? [])].join("、");
    return `<tr>
<td><a href="${link}">第${t.episode}話</a></td>
<td>${escapeHtml(epTitle)}</td>
<td>${sourceNames}${sourceCount > 1 ? ` (${sourceCount})` : ""}</td>
<td>${t.lines.length}</td>
<td>${t.dialogue ? t.dialogue.length : "—"}</td>
<td>${t.speakers ? t.speakers.length : "—"}</td>
<td><span class="${phaseClass}">${phase}</span></td>
</tr>`;
  }).join("\n");

  const totalLines = transcriptions.reduce((sum, t) => sum + t.lines.length, 0);
  const totalDialogue = transcriptions.reduce((sum, t) => sum + (t.dialogue?.length ?? 0), 0);

  const content = `
<h1>文字起こしデータ</h1>
<p>各エピソードの字幕抽出・話者帰属データの一覧です。</p>
<div class="card">
<p>合計: ${transcriptions.length}エピソード / ${totalLines}抽出行 / ${totalDialogue}帰属台詞</p>
</div>

<table class="data-table">
<thead><tr><th>話数</th><th>タイトル</th><th>ソース</th><th>抽出行</th><th>帰属台詞</th><th>話者</th><th>状態</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`;

  return layoutHtml("文字起こしデータ", content, "..", summaryPages, "SOLAR LINE 全エピソードの文字起こし・台詞データ一覧", navEpisodes, metaPages);
}
