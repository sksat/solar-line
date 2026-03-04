/**
 * Minimal HTML template engine for static report generation.
 * No external dependencies — pure string interpolation.
 */

import type { EpisodeReport, SiteManifest, TranscriptionPageData, TransferAnalysis, TransferDetailPage, VideoCard, DialogueQuote, ParameterExploration, ExplorationScenario, SourceCitation, OrbitalDiagram, OrbitDefinition, TransferArc, AnimationConfig, ScaleLegend, TimelineAnnotation, DiagramScenario, SummaryReport, ComparisonTable, ComparisonRow, EventTimeline, VerificationTable, BarChart, TimeSeriesChart, GlossaryTerm, SideViewDiagram, MarginGauge, MarginGaugeItem, InsetDiagram, Viewer3DEmbed } from "./report-types.ts";
import { NOMINAL_MASS_T, THRUST_MN, DAMAGED_THRUST_MN, G0_MS2, AU_KM } from "./kestrel.ts";

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

    // Multi-line display math: $$ on its own line opens a block
    if (line.trim() === "$$") {
      closeList();
      const mathLines: string[] = [];
      while (i + 1 < lines.length) {
        i++;
        if (lines[i].trim() === "$$") break;
        mathLines.push(lines[i]);
      }
      output.push(`<p>$$${mathLines.join(" ")}$$</p>`);
      continue;
    }

    // Empty line — close list if open, unless next non-empty line continues it
    if (line.trim() === "") {
      if (listType) {
        // Look ahead to see if the list continues after blank lines
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === "") j++;
        const nextLine = j < lines.length ? lines[j] : "";
        const listContinues =
          (listType === "ol" && /^\d+\.\s+/.test(nextLine)) ||
          (listType === "ul" && /^[-*]\s+/.test(nextLine));
        if (!listContinues) closeList();
      }
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const headingId = slugify(headingMatch[2]);
      output.push(`<h${level} id="${escapeHtml(headingId)}">${inlineFormat(headingMatch[2], inlineOpts)}</h${level}>`);
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

  return `<div class="table-wrap">${out.join("")}</div>`;
}

/**
 * Extract math expressions ($...$ and $$...$$) from text, replacing them with
 * placeholders that survive HTML escaping. Returns the modified text and a
 * restore function.
 */
function extractMath(text: string): { text: string; restore: (html: string) => string } {
  const mathPlaceholders: { key: string; math: string }[] = [];
  let idx = 0;
  // First, temporarily protect inline code (`...`) from math extraction
  const codeSlots: { key: string; code: string }[] = [];
  let result = text.replace(/`([^`]+)`/g, (match) => {
    const key = `\x00CSLOT${idx++}\x00`;
    codeSlots.push({ key, code: match });
    return key;
  });
  // Replace $$...$$ (display) first, then $...$ (inline)
  result = result.replace(/\$\$([^$]+?)\$\$/g, (_match, expr) => {
    const key = `\x00MATH${idx++}\x00`;
    mathPlaceholders.push({ key, math: `$$${expr}$$` });
    return key;
  });
  result = result.replace(/\$([^$\n]+?)\$/g, (_match, expr) => {
    const key = `\x00MATH${idx++}\x00`;
    mathPlaceholders.push({ key, math: `$${expr}$` });
    return key;
  });
  // Restore code slots back to original backtick form (for inlineFormat code regex)
  for (const { key, code } of codeSlots) {
    result = result.replace(key, code);
  }
  return {
    text: result,
    restore(html: string): string {
      let out = html;
      for (const { key, math } of mathPlaceholders) {
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
  --card-bg: #161b22;
  --muted: #8b949e;
  --link: #58a6ff;
  --text-primary: #c9d1d9;
  --text-secondary: #8b949e;
  --text-muted: #6e7681;
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
.dag-slider-wrap { display: flex; align-items: center; gap: 0.4rem; margin-left: 0.3rem; border-left: 1px solid var(--border); padding-left: 0.6rem; }
.dag-slider-label { font-size: 0.8em; color: var(--text-secondary); white-space: nowrap; }
.dag-temporal-slider { width: 140px; height: 4px; cursor: pointer; accent-color: var(--accent, #58a6ff); }
.dag-slider-info { font-size: 0.7em; color: var(--text-secondary); white-space: nowrap; min-width: 6em; }
@keyframes dagPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.15; } }
.dag-summary-bar { display: flex; gap: 0.5rem; align-items: center; padding: 0.3rem 0.5rem; font-size: 0.75em; border-bottom: 1px solid var(--border); background: var(--surface); }
.dag-summary-items { display: flex; gap: 0.8rem; flex-wrap: wrap; }
.dag-summary-item { white-space: nowrap; }
.dag-pathfind-status { font-size: 0.8em; padding: 0.4rem 0.8rem; border: 1px solid #58a6ff44; background: #58a6ff11; border-radius: 4px; margin-top: 0.3rem; color: #58a6ff; }
.dag-stale-ring { pointer-events: none; }
.table-wrap { overflow-x: auto; margin: 1rem 0; }
.table-wrap > table:not([class]) { width: 100%; border-collapse: collapse; font-size: 0.9em; }
.table-wrap > table:not([class]) th { color: #8b949e; font-weight: 600; font-size: 0.85em; padding: 0.5rem 0.6rem; border-bottom: 2px solid var(--border); text-align: left; white-space: nowrap; }
.table-wrap > table:not([class]) td { padding: 0.5rem 0.6rem; border-bottom: 1px solid var(--border); }
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
.verdict-summary-box {
  border-left: 4px solid var(--accent);
  background: var(--card-bg);
  padding: 0.6em 1em;
  margin: 0.5em 0 1em 0;
  border-radius: 0 4px 4px 0;
  font-size: 0.95em;
  line-height: 1.5;
}
.verdict-summary-box.verdict-box-plausible { border-left-color: var(--green); }
.verdict-summary-box.verdict-box-implausible { border-left-color: var(--red); }
.verdict-summary-box.verdict-box-indeterminate { border-left-color: var(--yellow); }
.verdict-summary-box.verdict-box-conditional { border-left-color: #8957e5; }
.verdict-summary-box.verdict-box-reference { border-left-color: #6e7681; }
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
.reproduction-command { margin-top: 0.5rem; font-size: 0.8em; }
.reproduction-command summary { cursor: pointer; color: #8b949e; }
.reproduction-command summary:hover { color: var(--accent); }
.reproduction-command pre { background: #161b22; padding: 0.5rem; border-radius: 4px; overflow-x: auto; }
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
.site-banner {
  background: #1c1f26; border: 1px solid var(--yellow); border-radius: 6px;
  padding: 0.6rem 1rem; margin-bottom: 1.5rem; font-size: 0.82em; color: #c9d1d9; line-height: 1.6;
}
.site-banner strong { color: var(--yellow); }
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
.calc-ep-tabs { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.5rem; border-bottom: 2px solid var(--border); padding-bottom: 0.25rem; }
.calc-ep-tab { background: transparent; border: 1px solid transparent; border-radius: 4px 4px 0 0; color: #8b949e; padding: 0.4rem 0.75rem; cursor: pointer; font-size: 0.9em; }
.calc-ep-tab:hover { color: var(--fg); background: var(--surface); }
.calc-ep-tab.active { color: var(--accent); border-color: var(--border); border-bottom-color: var(--bg); background: var(--bg); font-weight: 600; }
.calc-ep-panel { display: none; }
.calc-ep-panel.active { display: block; }
.calc-ep-panel .calc-preset-btn { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; color: var(--accent); padding: 0.3rem 0.75rem; cursor: pointer; font-size: 0.85em; margin: 0.25rem 0.25rem 0.25rem 0; }
.calc-ep-panel .calc-preset-btn:hover { background: var(--border); }
.calc-ep-route { color: #8b949e; font-size: 0.85em; margin: 0.25rem 0; }
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
.glossary-term { position: relative; border-bottom: 1px dotted var(--accent); cursor: help; }
.glossary-tip { display: none; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.85em; line-height: 1.4; color: var(--fg); width: max-content; max-width: 300px; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.4); pointer-events: none; white-space: normal; }
.glossary-term:hover .glossary-tip, .glossary-term:focus .glossary-tip { display: block; }
.dv-chart { margin: 1rem 0; overflow-x: auto; }
.dv-chart text { font-family: "SFMono-Regular", Consolas, monospace; font-size: 12px; }
.orbital-diagram { text-align: center; }
.orbital-diagram svg { max-width: 100%; height: auto; }
.diagram-description { text-align: left; font-size: 0.9rem; color: var(--muted); margin: 0.25rem 1rem 0.75rem; line-height: 1.5; }
.diagram-epoch { text-align: right; color: #888; margin: 0 1rem 0.5rem; }
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
.scenario-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: center;
  margin: 0.4rem auto;
  max-width: 480px;
}
.scenario-toggle {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--muted);
  padding: 0.25rem 0.6rem;
  cursor: pointer;
  font-size: 0.8em;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  text-decoration: line-through;
}
.scenario-toggle.active {
  color: var(--accent);
  border-color: var(--accent);
  text-decoration: none;
}
.scenario-toggle:hover { background: var(--border); }
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
/* Transfer leg highlighting */
.transfer-leg { cursor: pointer; transition: opacity 0.2s; }
.orbital-diagram.leg-active .transfer-leg { opacity: 0.2; }
.orbital-diagram.leg-active .transfer-leg.leg-highlight { opacity: 1; }
.orbital-diagram.leg-active .transfer-leg.leg-highlight path { stroke-width: 3 !important; }
.leg-tooltip {
  position: absolute; padding: 0.3rem 0.6rem; background: var(--bg); border: 1px solid var(--border);
  border-radius: 4px; font-size: 0.8em; color: var(--fg); pointer-events: none; white-space: nowrap;
  z-index: 10; transform: translate(-50%, -120%);
}
.leg-tooltip.locked { pointer-events: auto; }
.leg-tooltip a { color: var(--link); text-decoration: none; margin-left: 0.5em; }
.leg-tooltip a:hover { text-decoration: underline; }
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
.comparison-table td.row-label { font-weight: 600; color: var(--fg); white-space: nowrap; }
.comparison-table tr.highlight { background: var(--surface); }
.summary-section { margin: 2rem 0; }
.summary-section h2 { border-bottom: 1px solid var(--border); padding-bottom: 0.3rem; }
.stats-grid .stat-row { display: flex; flex-wrap: wrap; gap: 1rem; }
.stats-grid .stat-item { display: flex; align-items: center; gap: 0.4rem; }
.stats-grid .stat-number { font-size: 1.8rem; font-weight: 700; color: var(--accent); font-family: "SFMono-Regular", Consolas, monospace; }
.stats-grid .stat-label { font-size: 0.9em; color: #8b949e; }
.stats-grid .stat-count { font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.9em; }
.episode-card h3 { margin-top: 0; }
.episode-card .episode-meta { font-size: 0.9em; color: #8b949e; margin-top: 0.5rem; }
.summary-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.summary-card h3 { margin-top: 0; }
.summary-card p { font-size: 0.9em; color: #8b949e; margin-bottom: 0; }
.journey-overview { display: flex; flex-direction: column; gap: 0; margin: 0.5rem 0 1.5rem; }
.journey-leg { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.8rem 1rem; }
.journey-leg-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.journey-ep { font-weight: 700; font-size: 0.8em; color: var(--accent); min-width: 3.5em; }
.journey-route { font-weight: 600; color: #f0f6fc; }
.journey-margin { font-size: 0.75em; padding: 0.1em 0.5em; border-radius: 3px; color: #000; font-weight: 600; margin-left: auto; }
.journey-leg-metrics { display: flex; gap: 1rem; font-size: 0.85em; color: var(--muted); margin-top: 0.3rem; }
.journey-leg-note { font-size: 0.8em; color: var(--yellow); margin-top: 0.2rem; }
.journey-leg-stakes { font-size: 0.85em; color: var(--fg); margin-top: 0.3rem; line-height: 1.5; }
.journey-connector { text-align: center; color: var(--border); font-size: 0.8em; line-height: 1; padding: 0.15rem 0; }
@media (max-width: 600px) {
  .journey-leg-header { flex-direction: column; align-items: flex-start; gap: 0.2rem; }
  .journey-margin { margin-left: 0; }
  .journey-leg-metrics { flex-wrap: wrap; gap: 0.5rem; }
}
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
.scene-timeline { margin: 1.5rem 0; }
.scene-timeline h3 { color: var(--accent); margin-bottom: 0.8rem; font-size: 1.05em; }
.scene-timeline-track { position: relative; padding-left: 2rem; border-left: 2px solid var(--border); margin-left: 0.5rem; }
.scene-timeline-event { position: relative; margin-bottom: 1rem; display: flex; align-items: baseline; gap: 0.5rem; flex-wrap: wrap; }
.scene-timeline-marker { position: absolute; left: -2.35rem; top: 0.35rem; width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--bg); }
.scene-timeline-marker.marker-plausible { background: var(--green); }
.scene-timeline-marker.marker-implausible { background: var(--red); }
.scene-timeline-marker.marker-conditional { background: #8957e5; }
.scene-timeline-marker.marker-indeterminate { background: var(--yellow); }
.scene-timeline-marker.marker-reference { background: #6e7681; }
.scene-timeline-ts { font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.85em; color: #8b949e; min-width: 4em; }
.scene-timeline-ts a { color: #8b949e; }
.scene-timeline-ts a:hover { color: var(--accent); }
.scene-timeline-desc { flex: 1; }
.scene-timeline-desc a { color: var(--fg); text-decoration: none; }
.scene-timeline-desc a:hover { color: var(--accent); text-decoration: underline; }
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
.accuracy-high { color: var(--green); font-weight: 600; }
.accuracy-mid { color: var(--yellow); font-weight: 600; }
.accuracy-low { color: #ff6b6b; font-weight: 600; }
.meta-note { font-size: 0.85em; color: var(--muted); }
.layer-legend { background: var(--card-bg); }
.layer-legend h3 { margin-top: 0; font-size: 1rem; }
.layer-dl { margin: 0.5rem 0 0; }
.layer-dl dt { font-weight: 600; margin-top: 0.5rem; }
.layer-dl dd { margin: 0.2rem 0 0 1.5rem; color: var(--muted); font-size: 0.9em; }
.layer-badge { display: inline-block; padding: 0.1em 0.5em; border-radius: 3px; font-size: 0.75em; font-weight: 700; margin-right: 0.3em; vertical-align: middle; }
.layer-0 { background: var(--accent); color: #fff; }
.layer-3 { background: var(--green); color: #000; }
.layer-2 { background: var(--yellow); color: #000; }
.layer-1 { background: var(--muted); color: #fff; }
.script-table .scene-setting td { padding: 0.2em 0.5em; }
.script-table .stage-direction td { padding: 0.3em 0.5em; color: var(--muted); }
.script-table .line-id { font-size: 0.7em; color: var(--muted); white-space: nowrap; }
.tab-container { margin: 1rem 0; }
.tab-buttons { display: flex; gap: 0; border-bottom: 2px solid var(--border); margin-bottom: 0; flex-wrap: wrap; }
.tab-btn { background: none; border: none; padding: 0.5rem 1rem; cursor: pointer; color: var(--muted); font-size: 0.9rem; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color 0.2s, border-color 0.2s; }
.tab-btn:hover { color: var(--fg); }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
.tab-panel { display: none; padding-top: 0.5rem; overflow-x: auto; }
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
  .table-wrap > table:not([class]) { font-size: 0.8em; }
  .dialogue-table .speaker { font-size: 0.8em; }
  .video-card { flex: 1 1 100%; min-width: 0; }
  .orbital-animation-controls { flex-wrap: wrap; }
  .ep-nav-strip { gap: 0.3rem; padding: 0.5rem; }
  pre { font-size: 0.8em; padding: 0.75rem; }
}
.breadcrumb { margin-bottom: 1rem; font-size: 0.9rem; color: #8b949e; }
.breadcrumb a { color: var(--accent); }
.breadcrumb span:last-child { color: var(--fg); }
.detail-page-parent { margin-bottom: 1.5rem; font-size: 0.95rem; }
.detail-page-nav { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); }
.transfer-summary { border-left: 3px solid var(--accent); }
.transfer-summary .detail-link { font-weight: 600; }
.detail-badge { display: inline-block; background: #1f2937; color: #8b949e; font-size: 0.75rem; padding: 0.1em 0.5em; border-radius: 10px; margin-left: 0.3em; vertical-align: middle; }
.explorer-status { padding: 0.5rem 1rem; border-radius: 4px; background: #1f2937; color: #58a6ff; font-size: 0.9rem; }
.explorer-status.explorer-error { color: #f85149; background: #2d1518; }
.explorer-presets { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.preset-btn { background: #21262d; color: #c9d1d9; border: 1px solid #30363d; border-radius: 4px; padding: 0.4rem 0.8rem; cursor: pointer; font-size: 0.85rem; transition: border-color 0.15s; }
.preset-btn:hover { border-color: #58a6ff; color: #58a6ff; }
.explorer-query { width: 100%; background: #0d1117; color: #c9d1d9; border: 1px solid #30363d; border-radius: 4px; padding: 0.75rem; font-family: monospace; font-size: 0.9rem; resize: vertical; box-sizing: border-box; }
.explorer-query:focus { outline: none; border-color: #58a6ff; }
.explorer-input-wrap { display: flex; flex-direction: column; gap: 0.5rem; }
.explorer-actions { display: flex; gap: 0.5rem; }
.explorer-btn { background: #238636; color: #fff; border: 1px solid #2ea043; border-radius: 4px; padding: 0.4rem 1rem; cursor: pointer; font-size: 0.85rem; }
.explorer-btn:hover { background: #2ea043; }
.explorer-btn-secondary { background: #21262d; color: #c9d1d9; border-color: #30363d; }
.explorer-btn-secondary:hover { background: #30363d; }
.explorer-tables dt { font-weight: 600; margin-top: 0.5rem; }
.explorer-tables dd { margin-left: 1rem; color: #8b949e; font-size: 0.9rem; }
.explorer-table-wrap { overflow-x: auto; max-height: 500px; overflow-y: auto; }
.explorer-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.explorer-table th { background: #161b22; position: sticky; top: 0; padding: 0.4rem 0.6rem; border-bottom: 2px solid #30363d; text-align: left; white-space: nowrap; }
.explorer-table td { padding: 0.3rem 0.6rem; border-bottom: 1px solid #21262d; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.explorer-table tr:hover td { background: #161b22; }
.explorer-result-meta { color: #8b949e; font-size: 0.85rem; margin-bottom: 0.5rem; }
.explorer-empty { color: #8b949e; font-style: italic; }
.explorer-truncated { color: #d29922; font-size: 0.85rem; }
.null-val { color: #484f58; font-style: italic; }
.explorer-chart-area { margin: 1rem 0; }
`;

/** Wrap content in the common HTML layout */
export interface NavEpisode {
  episode: number;
  title: string;
  path: string;
}

export function layoutHtml(title: string, content: string, basePath: string = ".", summaryPages?: SiteManifest["summaryPages"], description?: string, episodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  const episodeNav = episodes && episodes.length > 0
    ? `<span class="nav-sep">|</span><span class="nav-dropdown"><button class="nav-dropdown-btn" aria-haspopup="true" aria-expanded="false">各話分析</button><span class="nav-dropdown-menu" role="menu">${episodes.map(ep => `<a href="${basePath}/${ep.path}" role="menuitem">第${ep.episode}話</a>`).join("")}</span></span>`
    : "";
  const summaryNav = summaryPages && summaryPages.length > 0
    ? `<span class="nav-sep">|</span><span class="nav-dropdown"><button class="nav-dropdown-btn" aria-haspopup="true" aria-expanded="false">総合分析</button><span class="nav-dropdown-menu" role="menu">${summaryPages.map(p => `<a href="${basePath}/${p.path}" role="menuitem">${escapeHtml(p.title)}</a>`).join("")}</span></span>`
    : "";
  const metaLinks = [
    ...(metaPages || []).map(p => `<a href="${basePath}/${p.path}">${escapeHtml(p.title)}</a>`),
    `<a href="${basePath}/transcriptions/index.html">文字起こし</a>`,
    `<a href="${basePath}/logs/index.html">セッションログ</a>`,
    `<a href="${basePath}/meta/tasks.html">タスク状況</a>`,
    `<a href="${basePath}/meta/adr/index.html">ADR</a>`,
    `<a href="${basePath}/meta/ideas/index.html">アイデア</a>`,
    `<a href="${basePath}/explorer/index.html">データ探索</a>`,
    `<a href="${basePath}/calculator/index.html">計算機</a>`,
  ];
  const metaNav = `<span class="nav-sep">|</span><span class="nav-dropdown"><button class="nav-dropdown-btn" aria-haspopup="true" aria-expanded="false">この考証について</button><span class="nav-dropdown-menu" role="menu">${metaLinks.join("")}</span></span>`;
  const fullTitle = `${escapeHtml(title)} — SOLAR LINE 考証`;
  const ogDescription = description
    ? escapeHtml(description)
    : "SFアニメ「SOLAR LINE」の軌道遷移をΔV計算で検証する考証プロジェクト";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${fullTitle}</title>
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${ogDescription}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="SOLAR LINE 考証">
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
<nav><a href="${basePath}/index.html">トップ</a>${episodeNav}${summaryNav}${metaNav}<span class="nav-sep">|</span><a href="https://github.com/sksat/solar-line" target="_blank" rel="noopener">GitHub</a></nav>
<div class="site-banner"><strong>⚠ ネタバレ注意:</strong> 本サイトはSFアニメ「SOLAR LINE」の内容を詳細に分析しています。未視聴の方はご注意ください。<br><strong>📝 AI生成コンテンツ:</strong> 本考証の大部分は AI（Claude Code 等）によって生成されています。内容の正確性については原作および引用元をご確認ください。</div>
${content}
<footer>SOLAR LINE 考証 — <a href="https://claude.ai/code">Claude Code</a> により生成 | <a href="https://github.com/sksat/solar-line">GitHub</a> | <a href="${basePath}/doc/solar_line_core/index.html">APIドキュメント</a></footer>
<script>document.addEventListener("DOMContentLoaded",function(){if(typeof renderMathInElement==="function"){renderMathInElement(document.body,{delimiters:[{left:"$$",right:"$$",display:true},{left:"$",right:"$",display:false}],throwOnError:false})}if(typeof hljs!=="undefined"){hljs.highlightAll()}if(typeof uPlot!=="undefined"){document.querySelectorAll(".uplot-chart").forEach(function(el){var dataEl=el.querySelector(".uplot-data");if(!dataEl)return;var cfg=JSON.parse(dataEl.textContent);var series=[{}];var data=[cfg.series[0].x];var bands=[];var dataIdx=1;cfg.series.forEach(function(s){series.push({label:s.label,stroke:s.color,width:2,dash:s.style==="dashed"?[6,3]:undefined});data.push(s.y);dataIdx++;if(s.yLow&&s.yHigh){var c=s.color;var alpha=c.startsWith("#")?c+"33":c.replace(/[\\d.]+\\)/,"0.15)");series.push({label:s.label+" (下限)",show:false,stroke:"transparent",fill:undefined});data.push(s.yHigh);var hiIdx=dataIdx;dataIdx++;series.push({label:s.label+" (上限)",show:false,stroke:"transparent",fill:undefined});data.push(s.yLow);var loIdx=dataIdx;dataIdx++;bands.push({series:[hiIdx,loIdx],fill:alpha})}});var regionPlugin=cfg.regions&&cfg.regions.length?{hooks:{drawSeries:[function(u){var ctx=u.ctx;cfg.regions.forEach(function(r){var x0=u.valToPos(r.from,"x",true);var x1=u.valToPos(r.to,"x",true);var left=Math.max(x0,u.bbox.left);var right=Math.min(x1,u.bbox.left+u.bbox.width);if(right<=left)return;ctx.save();ctx.fillStyle=r.color;ctx.fillRect(left,u.bbox.top,right-left,u.bbox.height);ctx.fillStyle="#aaa";ctx.font="10px sans-serif";ctx.textAlign="center";ctx.globalAlpha=0.7;ctx.fillText(r.label,(left+right)/2,u.bbox.top+12);ctx.restore()})}]}}:undefined;var thresholdPlugin=cfg.thresholds&&cfg.thresholds.length?{hooks:{draw:[function(u){var ctx=u.ctx;cfg.thresholds.forEach(function(t){var yPos=u.valToPos(t.value,"y",true);ctx.save();ctx.strokeStyle=t.color;ctx.lineWidth=1.5;if(t.style==="dashed")ctx.setLineDash([6,3]);ctx.beginPath();ctx.moveTo(u.bbox.left,yPos);ctx.lineTo(u.bbox.left+u.bbox.width,yPos);ctx.stroke();ctx.fillStyle=t.color;ctx.font="11px sans-serif";ctx.textAlign="right";ctx.fillText(t.label,u.bbox.left+u.bbox.width-4,yPos-4);ctx.restore()})}]}}:undefined;var plugins=[];if(regionPlugin)plugins.push(regionPlugin);if(thresholdPlugin)plugins.push(thresholdPlugin);var opts={width:cfg.width||600,height:cfg.height||300,plugins:plugins,axes:[{label:cfg.xLabel,stroke:"#aaa",grid:{stroke:"#333"}},{label:cfg.yLabel,stroke:"#aaa",grid:{stroke:"#333"}}],series:series,bands:bands.length?bands:undefined};var target=el.querySelector(".uplot-target");new uPlot(opts,data,target)})}});</script>
</body>
</html>`;
}

/** Render verdict badge inline */
function verdictBadge(verdict: string): string {
  const label = verdict === "plausible" ? "妥当" : verdict === "implausible" ? "非現実的" : verdict === "conditional" ? "条件付き" : verdict === "reference" ? "参考値" : "判定不能";
  return `<span class="verdict verdict-${verdict}">${label}</span>`;
}

/** Journey leg data for the overview visualization */
interface JourneyLeg {
  episode: number;
  from: string;
  to: string;
  distanceAU: string;
  duration: string;
  method: string;
  marginLevel: "comfortable" | "tight" | "critical";
  marginNote: string;
  narrativeStakes: string;
}

const JOURNEY_LEGS: JourneyLeg[] = [
  {
    episode: 1,
    from: "火星",
    to: "ガニメデ",
    distanceAU: "3.68",
    duration: "72h",
    method: "Brachistochrone",
    marginLevel: "tight",
    marginNote: "質量≤299t必須",
    narrativeStakes: "納期72時間——超過すれば契約違反で廃業。極限質量で全力加速、ペリジュピター捕獲に賭ける",
  },
  {
    episode: 2,
    from: "木星系",
    to: "エンケラドス",
    distanceAU: "4.4",
    duration: "87日",
    method: "トリム推力",
    marginLevel: "comfortable",
    marginNote: "巡航主体（全行程の70%）",
    narrativeStakes: "損傷した放射線シールドで木星放射線帯を脱出。長い巡航中に応急修理を重ねる",
  },
  {
    episode: 3,
    from: "エンケラドス",
    to: "タイタニア",
    distanceAU: "9.62",
    duration: "143h",
    method: "Brachistochrone",
    marginLevel: "tight",
    marginNote: "航法精度99.8%要求",
    narrativeStakes: "誘導ビーコンのない外縁航路。2つの航法系が不一致——人間の判断でコースを選ぶ",
  },
  {
    episode: 4,
    from: "タイタニア",
    to: "天王星脱出",
    distanceAU: "18.2",
    duration: "~30日",
    method: "65%推力",
    marginLevel: "critical",
    marginNote: "点火回数3-4回が限界",
    narrativeStakes: "プラズモイド直撃で被曝480mSv。エンジン損傷、推力65%に低下——帰れるのか",
  },
  {
    episode: 5,
    from: "天王星圏",
    to: "地球",
    distanceAU: "18.2",
    duration: "507h",
    method: "複合航路",
    marginLevel: "critical",
    marginNote: "ノズル余命26分（0.78%）",
    narrativeStakes: "磁気ノズル残寿命ギリギリの綱渡り。4回の点火で太陽系を横断し、LEO 400kmに帰還",
  },
];

/** Render the journey overview strip for the landing page */
export function renderJourneyOverview(): string {
  const marginColors: Record<JourneyLeg["marginLevel"], string> = {
    comfortable: "var(--green)",
    tight: "var(--yellow)",
    critical: "var(--red)",
  };
  const marginLabels: Record<JourneyLeg["marginLevel"], string> = {
    comfortable: "余裕あり",
    tight: "綱渡り",
    critical: "限界",
  };

  const legs = JOURNEY_LEGS.map(leg => {
    const color = marginColors[leg.marginLevel];
    const label = marginLabels[leg.marginLevel];
    const epSlug = `ep-${String(leg.episode).padStart(3, "0")}`;
    const epLink = `episodes/${epSlug}.html`;
    return `<div class="journey-leg">
<div class="journey-leg-header">
  <a href="${epLink}" class="journey-ep">第${leg.episode}話</a>
  <span class="journey-route">${escapeHtml(leg.from)} → ${escapeHtml(leg.to)}</span>
  <span class="journey-margin" style="background:${color}">${label}</span>
</div>
<div class="journey-leg-metrics">
  <span>${escapeHtml(leg.distanceAU)} AU</span>
  <span>${escapeHtml(leg.duration)}</span>
  <span>${escapeHtml(leg.method)}</span>
</div>
<div class="journey-leg-note">${escapeHtml(leg.marginNote)}</div>
<div class="journey-leg-stakes">${escapeHtml(leg.narrativeStakes)}</div>
</div>`;
  });

  const connectors = legs.map((leg, i) =>
    i < legs.length - 1 ? leg + `<div class="journey-connector" aria-hidden="true">▼</div>` : leg
  ).join("\n");

  return `
<h2>航路概要 — 全5話の旅程</h2>
<p style="color:var(--muted);font-size:0.9em;margin-bottom:1rem">火星から地球まで約35.9 AU・124日間。各区間のマージンと物語上の賭け金を一覧で示す。</p>
<div class="journey-overview">
${connectors}
</div>`;
}

/** Render a custom 404 page */
export function render404Page(summaryPages?: SiteManifest["summaryPages"], navEpisodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  const content = `
<section>
<h1>404 — ページが見つかりません</h1>
<p>お探しのページは存在しないか、移動された可能性があります。</p>
<p><a href="./index.html">トップページに戻る</a></p>
</section>`;
  return layoutHtml("404 ページが見つかりません", content, ".", summaryPages, undefined, navEpisodes, metaPages);
}

/** Render the site index page */
export function renderIndex(manifest: SiteManifest, navEpisodes?: NavEpisode[]): string {
  const totalTransfers = manifest.episodes.reduce((sum, ep) => sum + ep.transferCount, 0);

  // Project overview section
  const overview = `
<h1>SOLAR LINE 考証</h1>
<p>『<a href="https://www.nicovideo.jp/user/5844196/series/531506">良いソフトウェアトーク劇場</a>』のSFシリーズ長編「SOLAR LINE」（全5話・ゆえぴこ氏制作）に描かれた軌道遷移を宇宙力学的に検証するプロジェクト。</p>
<div class="card">
<h3>作品紹介</h3>
<p>「SOLAR LINE」は、小型貨物船ケストレル号の船長きりたんと船載AIケイが、火星から地球まで約35.9 AUの太陽系横断航路を駆け巡るSF物語です。作中では各遷移ごとにΔV（速度変化量）や加速度が具体的な数値で描かれています。</p>
<p>本サイトでは、作中に登場する全${totalTransfers}件の軌道遷移について、brachistochrone（最速降下線）航法、ホーマン遷移、重力アシストなどの実際の軌道力学に基づく計算を行い、描写の妥当性を検証しています。SF作品としての許容を前提に、物語内の数値・時間・距離が整合しているかを検証します。</p>
<p>航路: <strong>火星</strong> → <strong>ガニメデ</strong>（木星系） → <strong>エンケラドス</strong>（土星系） → <strong>タイタニア</strong>（天王星系） → <strong>地球</strong></p>
<details style="margin-top:0.5rem">
<summary style="cursor:pointer;color:var(--accent)">視聴リンク</summary>
<ul style="margin-top:0.3rem">
<li><a href="https://www.nicovideo.jp/user/5844196/series/531506" target="_blank" rel="noopener">ニコニコ動画（全5話）</a></li>
<li><a href="https://www.youtube.com/watch?v=CQ_OkDjEwRk" target="_blank" rel="noopener">YouTube Part 1</a> / <a href="https://www.youtube.com/watch?v=YXZWJLKD7Oo" target="_blank" rel="noopener">Part 2</a> / <a href="https://www.youtube.com/watch?v=l1jjXpv17-E" target="_blank" rel="noopener">Part 3</a> / <a href="https://www.youtube.com/watch?v=1cTmWjYSlTM" target="_blank" rel="noopener">Part 4</a> / <a href="https://www.youtube.com/watch?v=_trGXYRF8-4" target="_blank" rel="noopener">Part 5</a></li>
</ul>
</details>
</div>

<div class="card" style="font-size:0.9em">
<h3>判定バッジの見かた</h3>
<p>各軌道遷移には以下の判定が付与されます:</p>
<ul style="list-style:none;padding-left:0">
<li>${verdictBadge("plausible")} — 計算結果が作中描写と整合している</li>
<li>${verdictBadge("conditional")} — 特定の条件（推進剤量、エンジン出力等）を仮定すれば成立</li>
<li>${verdictBadge("reference")} — 作中で明示されていない参考計算値（直接比較不能）</li>
<li>${verdictBadge("implausible")} — 物理法則との明確な矛盾がある</li>
</ul>
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
    ? `\n<h2>総合分析</h2>\n<div class="summary-cards">\n${manifest.summaryPages.map(p =>
        `<div class="card summary-card">
<h3><a href="${p.path}">${escapeHtml(p.title)}</a></h3>
<p>${escapeHtml(p.summary)}</p>
</div>`
      ).join("\n")}\n</div>`
    : "";

  const metaList = manifest.metaPages && manifest.metaPages.length > 0
    ? manifest.metaPages.map(p =>
        `<li><a href="${p.path}">${escapeHtml(p.title)}</a></li>`
      ).join("\n")
    : "";

  // Conclusion summary — "What did we find?"
  const conclusionSection = `
<div class="card" style="border-left:4px solid var(--green);margin-top:1.5rem">
<h3>この考証の結論</h3>
<p>全${totalTransfers}件の軌道遷移を検証した結果、<strong>SOLAR LINE の軌道力学描写は高い整合性を持つ</strong>ことが分かりました。物理法則との明確な矛盾は0件。ΔV・所要時間・天体位置の数値は、brachistochrone航法やホーマン遷移の計算結果と概ね一致します。</p>
<p>最大のミステリーは<strong>公称質量48,000t</strong>——作中のすべての加速度・所要時間を再現するには質量が~300tでなければ計算が合わず、真の質量は公称値の1%以下と推定されます。これは「非現実的」ではなく、シリーズ全体を貫く謎として考証しています。</p>
<p>最もギリギリだったのは<strong>磁気ノズルの寿命</strong>——残り55時間38分に対し必要燃焼時間55時間12分、マージンわずか26分（0.78%）。全行程の成功確率は推定30〜46%です。</p>
</div>`;

  // Reading guide — recommended paths for different readers
  const readingGuide = `
<div class="card" style="font-size:0.9em">
<h3>読みかたガイド</h3>
<p>どこから読めばいいか迷ったら、以下を参考にしてください:</p>
<table class="scenario-table">
<tr><th>読者タイプ</th><th>おすすめルート</th></tr>
<tr><td><strong>まず全体像を知りたい</strong></td><td>→ このページの結論 → <a href="summary/cross-episode.html">クロスエピソード整合性分析</a></td></tr>
<tr><td><strong>アニメを観た順に読みたい</strong></td><td>→ <a href="episodes/ep-001.html">第1話</a> → <a href="episodes/ep-002.html">第2話</a> → … → <a href="episodes/ep-005.html">第5話</a>（各話に場面タイムラインと判定バッジ付き）</td></tr>
<tr><td><strong>軌道力学に興味がある</strong></td><td>→ <a href="summary/ship-kestrel.html">ケストレル号ドシエ</a> → <a href="summary/cross-episode.html">クロスエピソード分析</a> → 各話の個別遷移</td></tr>
<tr><td><strong>裏側の仕組みを知りたい</strong></td><td>→ <a href="summary/tech-overview.html">技術解説</a> → <a href="summary/ai-costs.html">AIコスト分析</a> → <a href="logs/index.html">セッションログ</a></td></tr>
</table>
</div>`;

  // Key findings — most interesting/surprising results
  const keyFindings = `
<h2>注目の分析結果</h2>
<div class="card">
<h4><a href="summary/ship-kestrel.html">質量ミステリー: 48,000t vs ~300t</a></h4>
<p>ケストレル号の公称質量48,000tでは、作中の加速度を再現するのに推力が~160倍不足する。全話の計算が整合する真の質量は~300t——公称値の1%以下。</p>
</div>
<div class="card">
<h4><a href="episodes/ep-005.html">ノズル寿命マージン0.78%: 第5話の綱渡り</a></h4>
<p>磁気ノズル残寿命55h38m vs 必要燃焼時間55h12m。マージンわずか26分。「ギリギリ」という台詞は計算上も正確でした。</p>
</div>
<div class="card">
<h4><a href="summary/communications.html">光速通信遅延の忠実な描写</a></h4>
<p>作中の通信描写はすべて光速遅延を正しく反映。NASAの深宇宙通信技術（DSOC）との比較でも整合する、作品のこだわりポイント。</p>
</div>`;

  // Journey overview — visual summary of the full route
  const journeyOverview = renderJourneyOverview();

  const content = `${overview}
${statsSection}
${journeyOverview}
${conclusionSection}
${readingGuide}

${keyFindings}

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

  return layoutHtml("トップ", content, ".", manifest.summaryPages, "SFアニメ「SOLAR LINE」の全5話に描かれた軌道遷移をΔV計算・加速度分析で検証する考証プロジェクト", navEpisodes, manifest.metaPages);
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
  // Cross-episode transfer refs like "ep01-transfer-02" — link to episode page with anchor
  const crossEpMatch = ref.match(/^ep(\d+)-transfer-\d+$/);
  if (crossEpMatch) {
    const epNum = parseInt(crossEpMatch[1], 10);
    const epSlug = `ep-${String(epNum).padStart(3, "0")}`;
    const url = `../episodes/${epSlug}.html#${ref}`;
    return `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`;
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

  const reproHtml = t.reproductionCommand
    ? `<details class="reproduction-command"><summary>再現コマンド</summary><pre><code>${escapeHtml(t.reproductionCommand)}</code></pre></details>`
    : "";

  const verdictSummaryHtml = t.verdictSummary
    ? `<div class="verdict-summary-box verdict-box-${t.verdict}">${escapeHtml(t.verdictSummary)}</div>`
    : "";

  const barChartsHtml = (t.barCharts ?? []).map(c => renderBarChartFromData(c)).join("\n");

  return `<div class="card" id="${escapeHtml(t.id)}">
<h3>${escapeHtml(t.description)} <span class="verdict ${verdictClass}">${verdictLabel(t.verdict)}</span></h3>
<p>第${t.episode}話 @ ${tsHtml}</p>
${verdictSummaryHtml}
${dvComparison}
${citationsHtml}
${assumptionsList}
${markdownToHtml(t.explanation)}
${barChartsHtml}
${sourcesHtml}
${reproHtml}
</div>`;
}

/** Render a compact summary card for a transfer that has a detail sub-page */
export function renderTransferSummaryCard(t: TransferAnalysis, detailUrl: string, explorationCount: number, videoCards?: VideoCard[]): string {
  const verdictClass = `verdict-${t.verdict}`;
  const dvLine = t.claimedDeltaV !== null && t.computedDeltaV !== null
    ? `作中のΔV: <strong>${t.claimedDeltaV.toFixed(2)} km/s</strong> | 計算値: <strong>${t.computedDeltaV.toFixed(2)} km/s</strong>`
    : t.computedDeltaV !== null
      ? `計算ΔV: <strong>${t.computedDeltaV.toFixed(2)} km/s</strong>`
      : "";
  const tsHtml = timestampLink(t.timestamp, videoCards);
  const explorationNote = explorationCount > 0
    ? `<span class="detail-badge">${explorationCount}件のパラメータ探索</span>`
    : "";

  const verdictSummaryHtml = t.verdictSummary
    ? `<div class="verdict-summary-box verdict-box-${t.verdict}">${escapeHtml(t.verdictSummary)}</div>`
    : "";

  return `<div class="card transfer-summary" id="${escapeHtml(t.id)}">
<h3>${escapeHtml(t.description)} <span class="verdict ${verdictClass}">${verdictLabel(t.verdict)}</span></h3>
<p>第${t.episode}話 @ ${tsHtml}</p>
${verdictSummaryHtml}
${dvLine ? `<p>${dvLine}</p>` : ""}
${markdownToHtml(t.explanation.split("\n")[0])}
<p><a href="${escapeHtml(detailUrl)}" class="detail-link">詳細分析を見る →</a> ${explorationNote}</p>
</div>`;
}

/** Render a transfer detail sub-page with breadcrumb navigation */
export function renderTransferDetailPage(
  report: EpisodeReport,
  detailPage: TransferDetailPage,
  transfers: TransferAnalysis[],
  explorations: ParameterExploration[],
  diagrams: OrbitalDiagram[],
  charts: TimeSeriesChart[],
  summaryPages?: SiteManifest["summaryPages"],
  navEpisodes?: NavEpisode[],
  metaPages?: SiteManifest["metaPages"],
): string {
  const epNum = String(report.episode).padStart(3, "0");
  const parentUrl = `../ep-${epNum}.html`;
  const pageTitle = detailPage.title ?? transfers.map(t => t.description).join(" / ");

  // Breadcrumb navigation
  const breadcrumb = `<nav class="breadcrumb">
<a href="../../index.html">トップ</a> &gt;
<a href="${parentUrl}">第${report.episode}話</a> &gt;
<span>${escapeHtml(pageTitle)}</span>
</nav>`;

  // Group explorations by transferId
  const explorationsByTransfer = new Map<string, ParameterExploration[]>();
  for (const exp of explorations) {
    const list = explorationsByTransfer.get(exp.transferId) ?? [];
    list.push(exp);
    explorationsByTransfer.set(exp.transferId, list);
  }

  // Render transfers with their explorations
  const transferCards = transfers.map((t) => {
    const inlineQuotes = t.evidenceQuoteIds && report.dialogueQuotes
      ? t.evidenceQuoteIds
          .map(id => report.dialogueQuotes!.find(q => q.id === id))
          .filter((q): q is DialogueQuote => q !== undefined)
      : [];
    const transferHtml = renderTransferCard(t, inlineQuotes, report.videoCards);
    const relatedExplorations = explorationsByTransfer.get(t.id) ?? [];
    const explorationHtml = relatedExplorations.map(renderExploration).join("\n");
    return transferHtml + explorationHtml;
  }).join("\n");

  // Render diagrams
  const diagramSection = diagrams.length > 0
    ? `<h2 id="section-diagrams">軌道遷移図</h2>\n${diagrams.map(renderOrbitalDiagram).join("\n")}`
    : "";

  // Render time-series charts
  const chartSection = charts.length > 0
    ? `<h2 id="section-timeseries">時系列グラフ</h2>\n${renderTimeSeriesCharts(charts)}`
    : "";

  const content = `
${breadcrumb}
<h1>${escapeHtml(pageTitle)}</h1>
<p class="detail-page-parent">← <a href="${parentUrl}">第${report.episode}話: ${escapeHtml(report.title)}</a> に戻る</p>

${diagramSection}

${chartSection}

<h2 id="section-transfers">分析</h2>
${transferCards}

<nav class="detail-page-nav">
<a href="${parentUrl}">← 第${report.episode}話に戻る</a>
</nav>`;

  const hasAnimatedDiagrams = diagrams.some(d => d.animation);
  const animScript = hasAnimatedDiagrams ? '\n<script src="../../orbital-animation.js"></script>' : "";

  return layoutHtml(
    `第${report.episode}話 — ${pageTitle}`,
    content + animScript,
    "../..",
    summaryPages,
    `第${report.episode}話の分析詳細: ${pageTitle}`,
    navEpisodes,
    metaPages,
  );
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
/** Parse a timestamp string (MM:SS or HH:MM:SS) to seconds.
 *  Also handles range formats like "02:22-04:09" or "00:00 - 19:20（全編）"
 *  by extracting and parsing just the first timestamp. */
export function parseTimestamp(ts: string): number {
  // Extract first MM:SS or HH:MM:SS pattern from the string
  const match = ts.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
  if (!match) return 0;
  const parts = match[1].split(":").map(Number);
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

/** Color mapping for transcription source types */
function accuracySourceColor(sourceType: string): string {
  if (sourceType.startsWith("whisper")) return "#2ea043";
  if (sourceType === "youtube-auto") return "#58a6ff";
  if (sourceType === "ocr") return "#d29922";
  return "var(--accent)";
}

/** Render a horizontal bar chart comparing transcription accuracy across sources */
function renderAccuracyChart(metrics: NonNullable<TranscriptionPageData["accuracyMetrics"]>): string {
  if (metrics.length === 0) return "";
  const barHeight = 28;
  const labelWidth = 140;
  const chartWidth = 500;
  const barAreaWidth = chartWidth - labelWidth - 70;
  const svgHeight = metrics.length * (barHeight + 8) + 10;

  const barsSvg = metrics.map((m, i) => {
    const y = i * (barHeight + 8) + 4;
    const pct = m.corpusCharacterAccuracy * 100;
    const width = Math.max(1, (pct / 100) * barAreaWidth);
    const color = accuracySourceColor(m.sourceType);
    const label = escapeHtml(m.sourceType);
    return `<text x="${labelWidth - 8}" y="${y + barHeight / 2 + 4}" fill="var(--fg)" text-anchor="end" font-size="12">${label}</text>
<rect x="${labelWidth}" y="${y}" width="${width}" height="${barHeight}" rx="3" fill="${color}" opacity="0.85"/>
<text x="${labelWidth + width + 6}" y="${y + barHeight / 2 + 4}" fill="var(--fg)" font-size="12" font-weight="600">${pct.toFixed(1)}%</text>`;
  }).join("\n");

  return `<div class="accuracy-chart" style="margin: 0.8rem 0;">
<h4 style="font-size: 0.9em; margin: 0 0 0.3rem 0; color: var(--text-primary);">文字起こし精度比較</h4>
<svg viewBox="0 0 ${chartWidth} ${svgHeight}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="文字起こし精度比較チャート">
${barsSvg}
</svg>
<p class="meta-note" style="margin: 0.2rem 0 0 0;">公式脚本に対するコーパスレベル文字一致率</p>
</div>`;
}

/** Render a horizontal bar chart showing pairwise inter-source agreement */
function renderAgreementChart(metrics: NonNullable<TranscriptionPageData["agreementMetrics"]>): string {
  if (metrics.length === 0) return "";
  const barHeight = 28;
  const labelWidth = 220;
  const chartWidth = 560;
  const barAreaWidth = chartWidth - labelWidth - 70;
  const svgHeight = metrics.length * (barHeight + 8) + 10;

  const barsSvg = metrics.map((m, i) => {
    const y = i * (barHeight + 8) + 4;
    const pct = m.agreement * 100;
    const width = Math.max(1, (pct / 100) * barAreaWidth);
    // Color based on agreement level: green ≥ 80%, yellow 60-80%, orange < 60%
    const color = pct >= 80 ? "#2ea043" : pct >= 60 ? "#d29922" : "#da3633";
    const label = escapeHtml(`${m.sourceA} ↔ ${m.sourceB}`);
    return `<text x="${labelWidth - 8}" y="${y + barHeight / 2 + 4}" fill="var(--fg)" text-anchor="end" font-size="11">${label}</text>
<rect x="${labelWidth}" y="${y}" width="${width}" height="${barHeight}" rx="3" fill="${color}" opacity="0.85"/>
<text x="${labelWidth + width + 6}" y="${y + barHeight / 2 + 4}" fill="var(--fg)" font-size="12" font-weight="600">${pct.toFixed(1)}%</text>`;
  }).join("\n");

  return `<div class="agreement-chart" style="margin: 0.8rem 0;">
<h4 style="font-size: 0.9em; margin: 0 0 0.3rem 0; color: var(--text-primary);">ソース間一致率</h4>
<svg viewBox="0 0 ${chartWidth} ${svgHeight}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ソース間一致率チャート">
${barsSvg}
</svg>
<p class="meta-note" style="margin: 0.2rem 0 0 0;">コーパスレベルの文字一致率（ペアワイズ比較）</p>
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
function hohmannArcPath(r1px: number, r2px: number, fromAngle: number, toAngle?: number): string {
  // Hohmann is half an ellipse: semi-major axis = (r1+r2)/2
  const a = (r1px + r2px) / 2;
  const b = Math.sqrt(r1px * r2px); // semi-minor for visual approximation
  const startX = r1px * Math.cos(fromAngle);
  const startY = -r1px * Math.sin(fromAngle);
  // When toAngle is provided, end at that angle on the arrival orbit;
  // otherwise fall back to the classic 180° offset
  const effectiveToAngle = toAngle ?? (fromAngle + Math.PI);
  const endX = r2px * Math.cos(effectiveToAngle);
  const endY = -r2px * Math.sin(effectiveToAngle);
  // Use SVG arc: large-arc-flag=1 for the long way around
  const sweepFlag = r2px >= r1px ? 1 : 0;
  return `M ${startX.toFixed(1)} ${startY.toFixed(1)} A ${a.toFixed(1)} ${b.toFixed(1)} 0 0 ${sweepFlag} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
}

/**
 * Generate an SVG path for a hyperbolic escape/capture arc.
 * Draws an open curve departing from the inner orbit.
 */
function hyperbolicArcPath(r1px: number, r2px: number, fromAngle: number, toAngle?: number): string {
  const startX = r1px * Math.cos(fromAngle);
  const startY = -r1px * Math.sin(fromAngle);
  // When toAngle is provided, end at that angle on the arrival orbit;
  // otherwise fall back to the classic ~63° offset
  const effectiveToAngle = toAngle ?? (fromAngle + Math.PI * 0.35);
  const endX = r2px * Math.cos(effectiveToAngle);
  const endY = -r2px * Math.sin(effectiveToAngle);
  // Control point: midway between start and end angles, at ~70% of total radial span
  const midR = (r1px + r2px) * 0.7;
  const midAngle = (fromAngle + effectiveToAngle) / 2;
  const cpX = midR * Math.cos(midAngle);
  const cpY = -midR * Math.sin(midAngle);
  return `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${cpX.toFixed(1)} ${cpY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
}

/**
 * Generate an SVG path for a brachistochrone (constant-thrust) transfer.
 * Drawn as a smooth Bezier arc with a distinct visual style (dashed in CSS).
 */
function brachistochroneArcPath(r1px: number, r2px: number, fromAngle: number, toAngle?: number): string {
  const startX = r1px * Math.cos(fromAngle);
  const startY = -r1px * Math.sin(fromAngle);
  // When toAngle is provided, end at that angle on the arrival orbit;
  // otherwise fall back to the classic ~90° offset
  const effectiveToAngle = toAngle ?? (fromAngle + Math.PI * 0.5);
  const endX = r2px * Math.cos(effectiveToAngle);
  const endY = -r2px * Math.sin(effectiveToAngle);
  // Control point: midway between start and end angles, at average radius
  const midAngle = (fromAngle + effectiveToAngle) / 2;
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
  const toAngle = toOrbit.angle;
  switch (style) {
    case "hohmann":
      return hohmannArcPath(fromPx, toPx, fromAngle, toAngle);
    case "hyperbolic":
      return hyperbolicArcPath(fromPx, toPx, fromAngle, toAngle);
    case "brachistochrone":
      return brachistochroneArcPath(fromPx, toPx, fromAngle, toAngle);
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
 * Validate that animated transfers within the same scenario do not have
 * overlapping time windows. A ship cannot be in two places at once —
 * each scenario's transfers must be sequentially non-overlapping.
 *
 * Returns an array of error messages (empty if valid).
 */
export function validateTransferOverlap(diagram: OrbitalDiagram): string[] {
  if (!diagram.animation) return [];

  const errors: string[] = [];
  // Group animated transfers by scenario
  const byScenario = new Map<string, { label: string; startTime: number; endTime: number }[]>();

  for (const t of diagram.transfers) {
    if (t.startTime === undefined || t.endTime === undefined) continue;
    const key = t.scenarioId ?? "__default__";
    if (!byScenario.has(key)) byScenario.set(key, []);
    byScenario.get(key)!.push({ label: t.label, startTime: t.startTime, endTime: t.endTime });
  }

  for (const [scenario, transfers] of byScenario) {
    // Sort by startTime for pairwise comparison
    const sorted = [...transfers].sort((a, b) => a.startTime - b.startTime);
    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i];
      const next = sorted[i + 1];
      // Overlap: next starts strictly before current ends
      if (next.startTime < curr.endTime) {
        const scenarioLabel = scenario === "__default__" ? "(no scenario)" : scenario;
        errors.push(
          `${diagram.id}: transfers overlap in scenario "${scenarioLabel}": ` +
          `"${curr.label}" [${curr.startTime}, ${curr.endTime}] overlaps with ` +
          `"${next.label}" [${next.startTime}, ${next.endTime}]`
        );
      }
    }
  }

  return errors;
}

/**
 * Render picture-in-picture inset sub-diagrams as SVG groups.
 * Each inset shows a zoomed-in local planetary system with orbits and transfers.
 * Returns SVG markup to be embedded within the parent diagram's <g>.
 */
export function renderInsetDiagrams(
  insets: InsetDiagram[],
  parentOrbitPxMap: Map<string, number>,
  parentOrbitMap: Map<string, OrbitDefinition>,
): string {
  if (insets.length === 0) return "";

  const insetSize = 120; // px width/height of each inset
  const insetPlotR = insetSize / 2 - 16; // margin for labels inside inset
  const padding = 8; // padding from SVG edge

  // Position each inset in its designated corner (relative to center 0,0 of parent 500×500)
  const positionMap: Record<InsetDiagram["position"], { x: number; y: number }> = {
    "top-left":     { x: -250 + padding, y: -250 + padding },
    "top-right":    { x: 250 - insetSize - padding, y: -250 + padding },
    "bottom-left":  { x: -250 + padding, y: 250 - insetSize - padding },
    "bottom-right": { x: 250 - insetSize - padding, y: 250 - insetSize - padding },
  };

  return insets.map(inset => {
    const pos = positionMap[inset.position];
    const insetCx = pos.x + insetSize / 2;
    const insetCy = pos.y + insetSize / 2;

    const mode = inset.scaleMode ?? "sqrt";
    const maxOrbitR = inset.viewRadius ?? Math.max(...inset.orbits.map(o => o.radius));

    // Build orbit lookup and pixel radii
    const insetOrbitMap = new Map(inset.orbits.map(o => [o.id, o]));
    const insetOrbitPxMap = new Map<string, number>();
    for (const orbit of inset.orbits) {
      insetOrbitPxMap.set(orbit.id, scaleRadius(orbit.radius, maxOrbitR, insetPlotR, mode, 6));
    }

    // Draw orbits
    const orbits = inset.orbits.map(orbit => {
      const r = insetOrbitPxMap.get(orbit.id)!;
      return `<circle cx="0" cy="0" r="${r.toFixed(1)}" fill="none" stroke="${orbit.color}" stroke-width="0.7" stroke-opacity="0.4" stroke-dasharray="3 1.5"/>`;
    }).join("\n      ");

    // Draw body dots and labels (only for orbits with angle)
    const labels = inset.orbits.filter(o => o.angle !== undefined).map(orbit => {
      const r = insetOrbitPxMap.get(orbit.id)!;
      const bx = r * Math.cos(orbit.angle!);
      const by = -r * Math.sin(orbit.angle!);
      // Short label: just the name without radius info
      const shortLabel = orbit.label.replace(/\s*\(.*\)/, "");
      const lx = (r + 8) * Math.cos(orbit.angle!);
      const ly = -(r + 8) * Math.sin(orbit.angle!);
      return `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="2.5" fill="${orbit.color}"/>
      <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="${orbit.color}" font-size="7" text-anchor="middle" dominant-baseline="middle">${escapeHtml(shortLabel)}</text>`;
    }).join("\n      ");

    // Draw transfer arcs
    const transfers = inset.transfers.map((t, idx) => {
      const fromOrbit = insetOrbitMap.get(t.fromOrbitId);
      const toOrbit = insetOrbitMap.get(t.toOrbitId);
      if (!fromOrbit || !toOrbit) return "";
      const fromPx = insetOrbitPxMap.get(t.fromOrbitId)!;
      const toPx = insetOrbitPxMap.get(t.toOrbitId)!;
      const pathD = transferArcPath(t.style, fromOrbit, toOrbit, fromPx, toPx);
      const dashArray = t.style === "brachistochrone" ? ' stroke-dasharray="5 3"' : "";
      const arrowId = `inset-arrow-${escapeHtml(inset.id)}-${idx}`;
      return `<path d="${pathD}" fill="none" stroke="${t.color}" stroke-width="1.5"${dashArray} marker-end="url(#${arrowId})"/>
      <marker id="${arrowId}" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><path d="M0,0 L6,2 L0,4" fill="${t.color}"/></marker>`;
    }).filter(s => s.length > 0).join("\n      ");

    // Center body
    const centerBody = `<circle cx="0" cy="0" r="4" fill="var(--yellow)"/>
      <text x="0" y="12" fill="var(--yellow)" font-size="7" text-anchor="middle">${escapeHtml(inset.centerLabel)}</text>`;

    // Title above inset
    const titleY = -insetSize / 2 - 4;
    const title = `<text x="0" y="${titleY}" fill="var(--fg)" font-size="8" text-anchor="middle" font-weight="bold">${escapeHtml(inset.title)}</text>`;

    // Connector line from inset center to the anchor orbit's body position in the parent
    let connector = "";
    const anchorOrbit = parentOrbitMap.get(inset.anchorOrbitId);
    const anchorPx = parentOrbitPxMap.get(inset.anchorOrbitId);
    if (anchorOrbit && anchorPx !== undefined && anchorOrbit.angle !== undefined) {
      const ax = anchorPx * Math.cos(anchorOrbit.angle);
      const ay = -anchorPx * Math.sin(anchorOrbit.angle);
      connector = `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${insetCx.toFixed(1)}" y2="${insetCy.toFixed(1)}" stroke="var(--fg)" stroke-width="0.5" stroke-opacity="0.3" stroke-dasharray="4 3"/>`;
    }

    // Unit label
    const unitLabel = inset.radiusUnit
      ? `<text x="${insetSize / 2 - 4}" y="${insetSize / 2 - 4}" fill="var(--fg)" font-size="6" text-anchor="end" fill-opacity="0.5">${escapeHtml(inset.radiusUnit)}</text>`
      : "";

    return `${connector}
    <g transform="translate(${insetCx.toFixed(1)}, ${insetCy.toFixed(1)})" class="orbital-inset" data-inset-id="${escapeHtml(inset.id)}">
      <rect x="${(-insetSize / 2).toFixed(1)}" y="${(-insetSize / 2).toFixed(1)}" width="${insetSize}" height="${insetSize}" rx="6" fill="var(--bg)" fill-opacity="0.85" stroke="var(--fg)" stroke-width="0.5" stroke-opacity="0.3"/>
      ${title}
      ${orbits}
      ${labels}
      ${transfers}
      ${centerBody}
      ${unitLabel}
    </g>`;
  }).join("\n    ");
}

/**
 * Render an orbital transfer diagram as inline SVG.
 * Top-down view of orbital system with concentric orbits and transfer arcs.
 */
export function renderOrbitalDiagram(diagram: OrbitalDiagram): string {
  // Validate no same-scenario transfer overlap (fail fast at build time)
  const overlapErrors = validateTransferOverlap(diagram);
  if (overlapErrors.length > 0) {
    throw new Error(`Transfer overlap in diagram ${diagram.id}:\n${overlapErrors.join("\n")}`);
  }

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

  // For animated diagrams, compute reference times for each orbit.
  // orbit.angle is correct at a specific animation time:
  // - For departure bodies: at the transfer's startTime
  // - For arrival bodies: at the transfer's endTime
  // The animation initialAngle = orbit.angle - meanMotion * refTime
  // so that at t=refTime, the animated position equals orbit.angle.
  const orbitRefTime = new Map<string, number>();
  if (isAnimated) {
    for (const t of diagram.transfers) {
      if (t.startTime === undefined || t.endTime === undefined) continue;
      // Departure body should be at orbit.angle at startTime
      if (!orbitRefTime.has(t.fromOrbitId)) {
        orbitRefTime.set(t.fromOrbitId, t.startTime);
      }
      // Arrival body should be at orbit.angle at endTime
      if (!orbitRefTime.has(t.toOrbitId)) {
        orbitRefTime.set(t.toOrbitId, t.endTime);
      }
    }
  }

  /**
   * Get the animated angle for an orbit at a given animation time.
   * Uses the reference-time-corrected initialAngle.
   */
  function animatedAngleAt(orbit: OrbitDefinition, time: number): number {
    const refTime = orbitRefTime.get(orbit.id) ?? 0;
    const mm = orbit.meanMotion ?? 0;
    const initialAngle = (orbit.angle ?? 0) - mm * refTime;
    return initialAngle + mm * time;
  }

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

  // Draw uncertainty ellipses
  let uncertaintyEllipsesSvg = "";
  if (diagram.uncertaintyEllipses && diagram.uncertaintyEllipses.length > 0) {
    uncertaintyEllipsesSvg = diagram.uncertaintyEllipses.map(ue => {
      const orbit = orbitMap.get(ue.orbitId);
      if (!orbit || orbit.angle === undefined) return "";
      const orbitR = orbitPxMap.get(ue.orbitId)!;
      const ecx = orbitR * Math.cos(orbit.angle);
      const ecy = -orbitR * Math.sin(orbit.angle);
      const rxPx = scaleRadius(ue.semiMajor, maxOrbitR, maxPlotR, mode);
      const ryPx = scaleRadius(ue.semiMinor, maxOrbitR, maxPlotR, mode);
      const rotDeg = ue.rotation ? (-ue.rotation * 180 / Math.PI) : 0;
      const labelSvg = ue.label
        ? `<text x="${ecx.toFixed(1)}" y="${(ecy - ryPx - 4).toFixed(1)}" fill="${ue.color.replace(/[\d.]+\)/, "0.8)")}" font-size="8" text-anchor="middle">${escapeHtml(ue.label)}</text>`
        : "";
      return `<ellipse cx="${ecx.toFixed(1)}" cy="${ecy.toFixed(1)}" rx="${rxPx.toFixed(1)}" ry="${ryPx.toFixed(1)}" fill="${ue.color}" stroke="${ue.color.replace(/[\d.]+\)/, "0.5)")}" stroke-width="1" stroke-dasharray="3 2" transform="rotate(${rotDeg.toFixed(1)} ${ecx.toFixed(1)} ${ecy.toFixed(1)})"/>
    ${labelSvg}`;
    }).filter(s => s.length > 0).join("\n    ");
  }

  // Draw trajectory variation overlays
  let trajectoryVarSvg = "";
  if (diagram.trajectoryVariations && diagram.trajectoryVariations.length > 0) {
    trajectoryVarSvg = diagram.trajectoryVariations.map(tv => {
      const baseTransfer = diagram.transfers.find(t => t.label === tv.baseTransferLabel);
      if (!baseTransfer) return "";
      const fromOrbit = orbitMap.get(baseTransfer.fromOrbitId);
      const toOrbit = orbitMap.get(baseTransfer.toOrbitId);
      if (!fromOrbit || !toOrbit) return "";
      const fromPx = orbitPxMap.get(baseTransfer.fromOrbitId)!;
      const toPx = orbitPxMap.get(baseTransfer.toOrbitId)!;
      // Generate two offset paths to form a variation band
      const basePath = transferArcPath(baseTransfer.style, fromOrbit, toOrbit, fromPx, toPx);
      const offsetPx = tv.spread * Math.abs(toPx - fromPx) * 0.3;
      // Create a filled region using two arcs offset in perpendicular direction
      const fromAngle = fromOrbit.angle ?? 0;
      const toAngle = toOrbit.angle ?? (fromAngle + (baseTransfer.style === "hohmann" ? Math.PI : Math.PI / 2));
      const midAngle = (fromAngle + toAngle) / 2;
      const perpX = -Math.sin(midAngle);
      const perpY = Math.cos(midAngle);
      const labelSvg = tv.label
        ? `<text x="${(offsetPx * perpX).toFixed(1)}" y="${(-offsetPx * perpY - 4).toFixed(1)}" fill="${tv.color.replace(/[\d.]+\)/, "0.6)")}" font-size="8" text-anchor="middle">${escapeHtml(tv.label)}</text>`
        : "";
      // Render as a thicker, semi-transparent copy of the base path
      return `<path d="${basePath}" fill="none" stroke="${tv.color}" stroke-width="${(offsetPx * 2).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>
    ${labelSvg}`;
    }).filter(s => s.length > 0).join("\n    ");
  }

  // Build scenario lookup for multi-pattern diagrams
  const hasScenarios = !!(diagram.scenarios && diagram.scenarios.length > 0);
  const primaryScenarioId = hasScenarios ? diagram.scenarios![0].id : undefined;

  // Draw transfer arcs + burn markers (grouped per transfer for leg highlighting)
  const transferGroups = diagram.transfers.map((t, idx) => {
    const fromOrbit = orbitMap.get(t.fromOrbitId);
    const toOrbit = orbitMap.get(t.toOrbitId);
    if (!fromOrbit || !toOrbit) return "";
    const fromPx = orbitPxMap.get(t.fromOrbitId)!;
    const toPx = orbitPxMap.get(t.toOrbitId)!;
    // For animated transfers, use the body's animated angle at transfer start/end
    // so the arc matches where bodies actually are during the animation.
    let arcFromOrbit = fromOrbit;
    let arcToOrbit = toOrbit;
    if (isAnimated && t.startTime !== undefined && t.endTime !== undefined) {
      const fromAngleAtStart = animatedAngleAt(fromOrbit, t.startTime);
      const toAngleAtEnd = animatedAngleAt(toOrbit, t.endTime);
      arcFromOrbit = { ...fromOrbit, angle: fromAngleAtStart };
      arcToOrbit = { ...toOrbit, angle: toAngleAtEnd };
    }
    const pathD = transferArcPath(t.style, arcFromOrbit, arcToOrbit, fromPx, toPx);
    const dashArray = t.style === "brachistochrone" ? ' stroke-dasharray="8 4"' : "";
    const arrowId = `arrow-${escapeHtml(t.fromOrbitId)}-${escapeHtml(t.toOrbitId)}-${idx}`;
    const transferPathAttr = isAnimated ? ` data-transfer-path="${escapeHtml(t.fromOrbitId)}-${escapeHtml(t.toOrbitId)}-${idx}"` : "";
    const scenarioAttr = t.scenarioId ? ` data-scenario="${escapeHtml(t.scenarioId)}"` : "";
    // Non-primary scenario arcs get reduced opacity and thinner stroke
    const isAlt = hasScenarios && t.scenarioId && t.scenarioId !== primaryScenarioId;
    const strokeW = isAlt ? "1.5" : "2";
    const opacity = isAlt ? ' stroke-opacity="0.6"' : "";
    const arcPath = `<path d="${pathD}" fill="none" stroke="${t.color}" stroke-width="${strokeW}"${dashArray}${opacity}${transferPathAttr}${scenarioAttr} marker-end="url(#${arrowId})"/>
    <marker id="${arrowId}" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="${t.color}"/></marker>`;

    // Burn markers for this transfer
    const burns = (t.burnMarkers ?? []).map(bm => {
      let r: number;
      if (bm.type === "acceleration") {
        r = fromPx;
      } else if (bm.type === "capture" || bm.type === "deceleration") {
        r = toPx;
      } else {
        r = (fromPx + toPx) / 2;
      }
      const mx = r * Math.cos(bm.angle);
      const my = -r * Math.sin(bm.angle);
      return `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="3" fill="var(--yellow)" stroke="var(--bg)" stroke-width="1"/>
    <text x="${(mx + 10).toFixed(1)}" y="${my.toFixed(1)}" fill="var(--yellow)" font-size="9" dominant-baseline="middle">${escapeHtml(bm.label)}</text>`;
    }).join("\n      ");

    // Episode number: explicit field or auto-detect from label (e.g. "EP1: ...", "EP05: ...")
    const epNum = t.episodeNumber ?? (() => { const m = t.label.match(/EP0?(\d+)/i); return m ? parseInt(m[1], 10) : null; })();
    const epAttr = epNum != null ? ` data-leg-episode="${epNum}"` : "";

    return `<g class="transfer-leg" data-leg-idx="${idx}" data-leg-label="${escapeHtml(t.label)}"${epAttr}>
      ${arcPath}
      ${burns}
    </g>`;
  }).join("\n    ");
  const transferPaths = transferGroups;
  const burnMarkersSvg = "";

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

  // Add uncertainty legend entries
  let uncertaintyLegendItems = "";
  if (diagram.uncertaintyEllipses && diagram.uncertaintyEllipses.length > 0) {
    const renderedEllipses = diagram.uncertaintyEllipses.filter(ue => {
      const orbit = orbitMap.get(ue.orbitId);
      return ue.label && orbit && orbit.angle !== undefined;
    });
    uncertaintyLegendItems = renderedEllipses
      .map((ue, i) => {
        const y = (legendRowCount + i) * 18;
        return `<ellipse cx="10" cy="${y + 6}" rx="10" ry="5" fill="${ue.color}" stroke="${ue.color.replace(/[\d.]+\)/, "0.5)")}" stroke-width="1" stroke-dasharray="2 1"/>
    <text x="24" y="${y + 10}" fill="var(--fg)" font-size="10">${escapeHtml(ue.label!)}</text>`;
      }).join("\n    ");
    legendRowCount += renderedEllipses.length;
  }
  if (diagram.trajectoryVariations && diagram.trajectoryVariations.length > 0) {
    const tvLegend = diagram.trajectoryVariations
      .filter(tv => tv.label)
      .map((tv, i) => {
        const y = (legendRowCount + i) * 18;
        return `<rect x="0" y="${y + 2}" width="20" height="8" fill="${tv.color}" rx="2"/>
    <text x="24" y="${y + 10}" fill="var(--fg)" font-size="10">${escapeHtml(tv.label!)}</text>`;
      }).join("\n    ");
    legendRowCount += diagram.trajectoryVariations.filter(tv => tv.label).length;
    uncertaintyLegendItems += (uncertaintyLegendItems ? "\n    " : "") + tvLegend;
  }
  legendItems += (legendItems ? "\n    " : "") + uncertaintyLegendItems;

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

    <!-- Uncertainty ellipses -->
    ${uncertaintyEllipsesSvg}

    <!-- Trajectory variation overlays -->
    ${trajectoryVarSvg}

    <!-- Transfer arcs -->
    ${transferPaths}

    <!-- Burn markers -->
    ${burnMarkersSvg}

    <!-- Timeline badges -->
    ${timelineBadges}

    <!-- Inset sub-diagrams (picture-in-picture) -->
    ${diagram.insets && diagram.insets.length > 0 ? renderInsetDiagrams(diagram.insets, orbitPxMap, orbitMap) : ""}
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
        .map(o => {
          const mm = o.meanMotion ?? 0;
          const refTime = orbitRefTime.get(o.id) ?? 0;
          return {
          id: o.id,
          initialAngle: o.angle! - mm * refTime,
          meanMotion: mm,
          radiusPx: orbitPxMap.get(o.id)!,
          color: o.color,
        };
        }),
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
  const epochHtml = diagram.epochAnnotation
    ? `\n<p class="diagram-epoch"><small>${escapeHtml(diagram.epochAnnotation)}</small></p>`
    : "";
  return `<div class="card orbital-diagram" id="${escapeHtml(diagram.id)}"${animAttr}>
<h4>${escapeHtml(diagram.title)}</h4>${descHtml}${epochHtml}
${svg}${animationHtml}${timelineBarHtml}
</div>`;
}

/** Render all orbital diagrams for an episode */
export function renderOrbitalDiagrams(diagrams: OrbitalDiagram[]): string {
  if (diagrams.length === 0) return "";
  return `<h2>軌道遷移図</h2>\n${diagrams.map(renderOrbitalDiagram).join("\n")}`;
}

/** Render a side-view (cross-section) diagram showing 3D geometry */
export function renderSideViewDiagram(diagram: SideViewDiagram): string {
  const size = 500;
  const cx = size / 2;
  const cy = size / 2;
  const centerR = diagram.centerRadius ?? 20;
  const centerColor = diagram.centerColor ?? "var(--yellow)";

  const svgParts: string[] = [];

  // Draw each element
  for (const el of diagram.elements) {
    const toRad = (d: number) => (d * Math.PI) / 180;
    switch (el.type) {
      case "plane": {
        // Draw a horizontal line through center representing a plane,
        // optionally tilted by angleDeg
        const angle = toRad(el.angleDeg ?? 0);
        const len = (el.length ?? 0.8) * cx;
        const x1 = -len * Math.cos(angle);
        const y1 = len * Math.sin(angle);
        const x2 = len * Math.cos(angle);
        const y2 = -len * Math.sin(angle);
        const dash = el.dashed ? ' stroke-dasharray="6 3"' : "";
        svgParts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${el.color}" stroke-width="1.5"${dash}/>`);
        // Label at the right end
        const lx = x2 + 8;
        const ly = y2;
        svgParts.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="${el.color}" font-size="10" dominant-baseline="middle">${escapeHtml(el.label)}</text>`);
        break;
      }
      case "axis": {
        // Draw a line from center outward at angleDeg
        const angle = toRad(el.angleDeg ?? 90);
        const len = (el.length ?? 0.6) * cx;
        const x2 = len * Math.cos(angle);
        const y2 = -len * Math.sin(angle);
        const dash = el.dashed ? ' stroke-dasharray="4 3"' : "";
        svgParts.push(`<line x1="0" y1="0" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${el.color}" stroke-width="1.5"${dash}/>`);
        // Arrowhead
        const aLen = 8;
        const aAngle = Math.atan2(-y2, x2);
        const ax1 = x2 - aLen * Math.cos(aAngle - 0.3);
        const ay1 = y2 + aLen * Math.sin(aAngle - 0.3);
        const ax2 = x2 - aLen * Math.cos(aAngle + 0.3);
        const ay2 = y2 + aLen * Math.sin(aAngle + 0.3);
        svgParts.push(`<polygon points="${x2.toFixed(1)},${y2.toFixed(1)} ${ax1.toFixed(1)},${ay1.toFixed(1)} ${ax2.toFixed(1)},${ay2.toFixed(1)}" fill="${el.color}"/>`);
        // Label beyond arrowhead
        const lx = x2 + 14 * Math.cos(angle);
        const ly = y2 - 14 * Math.sin(angle);
        svgParts.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="${el.color}" font-size="10" text-anchor="middle" dominant-baseline="middle">${escapeHtml(el.label)}</text>`);
        break;
      }
      case "ring": {
        // Draw an ellipse representing a ring system (viewed from the side = flattened)
        const r = el.radius ?? 60;
        const angle = toRad(el.angleDeg ?? 0);
        // Ring seen from the side: semi-major = r, semi-minor = r * |sin(tilt)|
        const semiMinor = Math.max(r * 0.08, r * Math.abs(Math.sin(angle)));
        const rotDeg = -(el.angleDeg ?? 0);
        const dash = el.dashed ? ' stroke-dasharray="3 2"' : "";
        svgParts.push(`<ellipse cx="0" cy="0" rx="${r}" ry="${semiMinor.toFixed(1)}" fill="none" stroke="${el.color}" stroke-width="1.5" transform="rotate(${rotDeg})"${dash}/>`);
        // Label
        svgParts.push(`<text x="${(r + 10).toFixed(1)}" y="${(-semiMinor - 4).toFixed(1)}" fill="${el.color}" font-size="9" text-anchor="start">${escapeHtml(el.label)}</text>`);
        break;
      }
      case "body": {
        // Draw a body at a position
        const angle = toRad(el.angleDeg ?? 0);
        const r = el.radius ?? 40;
        const bx = r * Math.cos(angle);
        const by = -r * Math.sin(angle);
        svgParts.push(`<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="4" fill="${el.color}"/>`);
        svgParts.push(`<text x="${(bx + 8).toFixed(1)}" y="${by.toFixed(1)}" fill="${el.color}" font-size="10" dominant-baseline="middle">${escapeHtml(el.label)}</text>`);
        break;
      }
      case "approach-vector": {
        // Draw an arrow coming from outside toward center
        const angle = toRad(el.angleDeg ?? 45);
        const len = (el.length ?? 0.7) * cx;
        const startR = len;
        const endR = centerR + 10;
        const x1 = startR * Math.cos(angle);
        const y1 = -startR * Math.sin(angle);
        const x2 = endR * Math.cos(angle);
        const y2 = -endR * Math.sin(angle);
        const dash = el.dashed ? ' stroke-dasharray="6 3"' : "";
        svgParts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${el.color}" stroke-width="2"${dash}/>`);
        // Arrowhead pointing toward center
        const aLen = 10;
        const aAngle = Math.atan2(y1 - y2, x1 - x2);
        const ax1 = x2 + aLen * Math.cos(aAngle - 0.35);
        const ay1 = y2 + aLen * Math.sin(aAngle - 0.35);
        const ax2 = x2 + aLen * Math.cos(aAngle + 0.35);
        const ay2 = y2 + aLen * Math.sin(aAngle + 0.35);
        svgParts.push(`<polygon points="${x2.toFixed(1)},${y2.toFixed(1)} ${ax1.toFixed(1)},${ay1.toFixed(1)} ${ax2.toFixed(1)},${ay2.toFixed(1)}" fill="${el.color}"/>`);
        // Label near start of vector
        const lx = x1 + 10 * Math.cos(angle + 0.3);
        const ly = y1 - 10 * Math.sin(angle + 0.3);
        svgParts.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="${el.color}" font-size="10" dominant-baseline="middle">${escapeHtml(el.label)}</text>`);
        break;
      }
      case "label": {
        // Free-floating label at a position
        const angle = toRad(el.angleDeg ?? 0);
        const r = el.radius ?? 100;
        const lx = r * Math.cos(angle);
        const ly = -r * Math.sin(angle);
        svgParts.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="${el.color}" font-size="10" text-anchor="middle" dominant-baseline="middle">${escapeHtml(el.label)}</text>`);
        break;
      }
    }
  }

  // Draw angle annotations
  const angleAnnotations = (diagram.angleAnnotations ?? []).map(ann => {
    const arcR = ann.arcRadius ?? 60;
    const fromRad = (ann.fromDeg * Math.PI) / 180;
    const toRad = (ann.toDeg * Math.PI) / 180;
    // SVG arc from fromDeg to toDeg
    const x1 = arcR * Math.cos(fromRad);
    const y1 = -arcR * Math.sin(fromRad);
    const x2 = arcR * Math.cos(toRad);
    const y2 = -arcR * Math.sin(toRad);
    const sweep = ann.toDeg > ann.fromDeg ? 0 : 1;
    const largeArc = Math.abs(ann.toDeg - ann.fromDeg) > 180 ? 1 : 0;
    // Label at midpoint of arc
    const midRad = ((ann.fromDeg + ann.toDeg) / 2 * Math.PI) / 180;
    const lx = (arcR + 14) * Math.cos(midRad);
    const ly = -(arcR + 14) * Math.sin(midRad);
    return `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${arcR},${arcR} 0 ${largeArc},${sweep} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${ann.color}" stroke-width="1.5"/>
    <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="${ann.color}" font-size="11" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${escapeHtml(ann.label)}</text>`;
  }).join("\n    ");

  const ariaLabel = `${diagram.title} — ${diagram.centerLabel}の側面図`;
  const descHtml = diagram.description
    ? `\n<p class="diagram-description">${escapeHtml(diagram.description)}</p>`
    : "";
  const svg = `<svg width="${size}" height="${size}" viewBox="${-cx} ${-cy} ${size} ${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(ariaLabel)}">
  <style>text { font-family: "SFMono-Regular", Consolas, monospace; }</style>
  <g>
    ${svgParts.join("\n    ")}

    <!-- Angle annotations -->
    ${angleAnnotations}

    <!-- Central body -->
    <circle cx="0" cy="0" r="${centerR}" fill="${centerColor}"/>
    <text x="0" y="${centerR + 14}" fill="${centerColor}" font-size="11" text-anchor="middle">${escapeHtml(diagram.centerLabel)}</text>
  </g>
</svg>`;

  return `<div class="card orbital-diagram" id="${escapeHtml(diagram.id)}">
<h4>${escapeHtml(diagram.title)}</h4>${descHtml}
${svg}
</div>`;
}

/** Render multiple side-view diagrams */
export function renderSideViewDiagrams(diagrams: SideViewDiagram[]): string {
  if (diagrams.length === 0) return "";
  return diagrams.map(renderSideViewDiagram).join("\n");
}

/** Episode-specific calculator presets — single source of truth for both
 *  server-side rendering (templates.ts) and client-side calculator (calculator.js).
 *  The full preset data is injected as inline JSON so calculator.js reads it from the DOM. */
interface CalcPresetParams { distanceAU: number; massT: number; timeH: number; thrustMN: number }
interface CalcPresetDef extends CalcPresetParams { key: string; label: string }
interface CalcEpConfig { defaults: CalcPresetParams; presets: CalcPresetDef[] }

const CALC_EPISODE_PRESETS: Record<number, CalcEpConfig> = {
  1: {
    defaults: { distanceAU: 3.68, massT: NOMINAL_MASS_T, timeH: 72, thrustMN: THRUST_MN },
    presets: [
      { key: "ep01_72h", label: "火星→ガニメデ 72h（作中描写）", distanceAU: 3.68, massT: NOMINAL_MASS_T, timeH: 72, thrustMN: THRUST_MN },
      { key: "ep01_150h", label: "通常ルート 150h", distanceAU: 3.68, massT: NOMINAL_MASS_T, timeH: 150, thrustMN: THRUST_MN },
      { key: "ep01_mass299", label: "質量 ≤299t（成立条件）", distanceAU: 3.68, massT: 299, timeH: 72, thrustMN: THRUST_MN },
      { key: "ep01_mass48", label: "質量 48t（48,000kg解釈）", distanceAU: 3.68, massT: 48, timeH: 72, thrustMN: THRUST_MN },
    ],
  },
  2: {
    defaults: { distanceAU: 4.32, massT: NOMINAL_MASS_T, timeH: 27, thrustMN: THRUST_MN },
    presets: [
      { key: "ep02_escape", label: "木星圏脱出 27h", distanceAU: 4.32, massT: NOMINAL_MASS_T, timeH: 27, thrustMN: THRUST_MN },
      { key: "ep02_trim1pct", label: "木星→土星 トリム推力1%", distanceAU: 7.68, massT: NOMINAL_MASS_T, timeH: 792, thrustMN: 0.098 },
      { key: "ep02_mass300", label: "木星圏脱出（300t仮定）", distanceAU: 4.32, massT: 300, timeH: 27, thrustMN: THRUST_MN },
    ],
  },
  3: {
    defaults: { distanceAU: 9.62, massT: NOMINAL_MASS_T, timeH: 143, thrustMN: THRUST_MN },
    presets: [
      { key: "ep03_143h", label: "エンケラドス→タイタニア 143h（作中描写）", distanceAU: 9.62, massT: NOMINAL_MASS_T, timeH: 143, thrustMN: THRUST_MN },
      { key: "ep03_mass452", label: "質量 ≤452t（成立条件）", distanceAU: 9.62, massT: 452, timeH: 143, thrustMN: THRUST_MN },
      { key: "ep03_mass300", label: "質量 300t（EP01と一致）", distanceAU: 9.62, massT: 300, timeH: 143, thrustMN: THRUST_MN },
    ],
  },
  4: {
    defaults: { distanceAU: 18.2, massT: NOMINAL_MASS_T, timeH: 2520, thrustMN: DAMAGED_THRUST_MN },
    presets: [
      { key: "ep04_damaged", label: "タイタニア→地球 65%推力（作中描写）", distanceAU: 18.2, massT: NOMINAL_MASS_T, timeH: 2520, thrustMN: DAMAGED_THRUST_MN },
      { key: "ep04_mass300", label: "質量 300t・65%推力", distanceAU: 18.2, massT: 300, timeH: 200, thrustMN: DAMAGED_THRUST_MN },
      { key: "ep04_full_thrust", label: "仮に100%推力の場合", distanceAU: 18.2, massT: NOMINAL_MASS_T, timeH: 2520, thrustMN: THRUST_MN },
    ],
  },
  5: {
    defaults: { distanceAU: 18.2, massT: NOMINAL_MASS_T, timeH: 507, thrustMN: DAMAGED_THRUST_MN },
    presets: [
      { key: "ep05_composite", label: "天王星→地球 507h 複合航路（作中描写）", distanceAU: 18.2, massT: NOMINAL_MASS_T, timeH: 507, thrustMN: DAMAGED_THRUST_MN },
      { key: "ep05_mass300", label: "質量 300t・65%推力", distanceAU: 18.2, massT: 300, timeH: 200, thrustMN: DAMAGED_THRUST_MN },
      { key: "ep05_direct", label: "直行ルート（フライバイなし）", distanceAU: 18.2, massT: 300, timeH: 507, thrustMN: DAMAGED_THRUST_MN },
      { key: "ep05_nozzle_limit", label: "ノズル寿命上限 55h38m", distanceAU: 18.2, massT: 300, timeH: 111, thrustMN: DAMAGED_THRUST_MN },
    ],
  },
};

/** Serialize preset data for injection into HTML as client-readable JSON */
function serializePresetsForClient(): string {
  const clientData: Record<number, { defaults: CalcPresetParams; presets: Record<string, CalcPresetDef> }> = {};
  for (const [epStr, config] of Object.entries(CALC_EPISODE_PRESETS)) {
    const ep = Number(epStr);
    const presetMap: Record<string, CalcPresetDef> = {};
    for (const p of config.presets) {
      presetMap[p.key] = p;
    }
    clientData[ep] = { defaults: config.defaults, presets: presetMap };
  }
  return JSON.stringify(clientData);
}

/** Render a glossary of technical terms */
export function renderGlossary(terms: GlossaryTerm[]): string {
  if (terms.length === 0) return "";
  const rows = terms.map(t => {
    const reading = t.reading ? ` <span style="color:var(--text-muted);font-size:0.85em">(${escapeHtml(t.reading)})</span>` : "";
    return `<tr><td><strong>${escapeHtml(t.term)}</strong>${reading}</td><td>${escapeHtml(t.definition)}</td></tr>`;
  }).join("\n");
  return `<div class="card" style="overflow-x:auto">
<table><thead><tr><th>用語</th><th>説明</th></tr></thead>
<tbody>
${rows}
</tbody></table></div>`;
}

/**
 * Wrap first occurrence of each glossary term in the given HTML with an inline
 * tooltip span.  Terms inside <code>, <pre>, <script>, <a>, <button>, <h1>–<h4>,
 * and the glossary table itself are skipped.  Only text nodes are scanned so
 * HTML attributes are never modified.
 *
 * Returns the HTML string with tooltip spans injected.
 */
export function wrapGlossaryTerms(html: string, terms: GlossaryTerm[]): string {
  if (terms.length === 0) return html;

  // Sort longest-first so "ツィオルコフスキーの式" matches before "ツィオルコフスキー"
  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length);

  // Tags whose text content should not be wrapped (includes svg to avoid injecting HTML into SVG)
  const skipTags = new Set(["code", "pre", "script", "a", "button", "h1", "h2", "h3", "h4", "th", "svg", "style"]);

  // Split HTML into tags and text segments
  const parts = html.split(/(<[^>]+>)/);
  let skipDepth = 0;
  const replaced = new Set<string>();

  return parts.map(part => {
    if (part.startsWith("<")) {
      // Track opening/closing of skip tags
      const closeMatch = part.match(/^<\/(\w+)/);
      const openMatch = part.match(/^<(\w+)/);
      if (closeMatch && skipTags.has(closeMatch[1].toLowerCase())) {
        skipDepth = Math.max(0, skipDepth - 1);
      } else if (openMatch && skipTags.has(openMatch[1].toLowerCase()) && !part.endsWith("/>")) {
        skipDepth++;
      }
      return part;
    }

    // Text node — skip if inside a protected element
    if (skipDepth > 0) return part;

    let result = part;
    for (const term of sorted) {
      if (replaced.has(term.term)) continue;

      // Escape regex special chars in the term
      const escaped = term.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped);
      if (regex.test(result)) {
        const definition = escapeHtml(term.definition);
        result = result.replace(regex, (match) =>
          `<span class="glossary-term" tabindex="0">${escapeHtml(match)}<span class="glossary-tip" role="tooltip">${definition}</span></span>`
        );
        replaced.add(term.term);
      }
    }
    return result;
  }).join("");
}

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
<script type="application/json" id="calc-presets-data">${serializePresetsForClient()}</script>
<script type="module" src="../calculator.js"></script>`;
}

/** Japanese labels for known English result column keys */
const resultKeyLabels: Record<string, string> = {
  accelMs2: "加速度 (m/s²)",
  accelG: "加速度 (G)",
  minTimeHours: "最短時間 (h)",
  reachable72hAU: "72h到達距離 (AU)",
  deltaVKms: "ΔV (km/s)",
  timeDays: "所要時間 (日)",
  transitDays: "航行時間 (日)",
  requiredAccelG: "必要加速度 (G)",
  requiredThrustMN: "必要推力 (MN)",
  feasibleAt300t: "300tで実現可",
  feasibleAt48000t: "48000tで実現可",
  accuracyPercent: "精度 (%)",
  errorKm: "誤差 (km)",
  marginKms: "マージン (km/s)",
  marginFraction: "マージン比",
  thrustRatio: "推力比",
  cFraction: "対光速比",
  heliocentricVKms: "日心速度 (km/s)",
  actualMSv: "被曝量 (mSv)",
  worstCaseMSv: "最悪値 (mSv)",
  acuteEffects: "急性症状",
  conclusion: "結論",
  source: "出典",
  difference_percent: "差異 (%)",
  v_at_20RJ_computed: "20RJ計算速度",
  v_at_20RJ_onscreen: "20RJ画面速度",
  ganymede_relative_v: "ガニメデ相対速度",
  v_escape: "脱出速度",
  isHyperbolic: "双曲線軌道",
  reachesSaturn: "土星到達",
  orbit_captured: "捕捉可能",
  consistentWith143h: "143h整合",
  solarEscapeVKms: "太陽脱出速度 (km/s)",
  escBurn: "脱出噴射",
  cruiseBurn: "巡航噴射",
  arrivalBurn: "到着噴射",
  midcourseBurn: "中間修正",
  totalBurns: "総噴射回数",
  brachistochrone: "ブラキストクローネ",
  transferTimeHoursAtAvgV: "平均速度での所要時間 (h)",
  errorVsMarginRatio: "誤差/マージン比",
  errorVsSOIPercent: "誤差/SOI比 (%)",
  correctionToOrbitalRatio: "修正/軌道比",
  nominalDeltaVMs: "公称ΔV (m/s)",
  enhancedDeltaVMs: "増強ΔV (m/s)",
  extremeDeltaVMs: "極端ΔV (m/s)",
  nominalForceN: "公称力 (N)",
  extremeForceN: "極端力 (N)",
  nominalMissDistanceKm: "公称ミス距離 (km)",
  extremeMissDistanceKm: "極端ミス距離 (km)",
  icrpAnnualLimitMSv: "ICRP年間限度 (mSv)",
  icrpEmergencyLimitMSv: "ICRP緊急限度 (mSv)",
  nasaCareerLimitMSv: "NASA生涯限度 (mSv)",
  realValueDeg: "実値 (°)",
  linearity_65_100: "線形性 65-100%",
  linearity_100_110: "線形性 100-110%",
  thrust65pct_MN: "推力65% (MN)",
  thrust100pct_MN: "推力100% (MN)",
  thrust110pct_MN: "推力110% (MN)",
  dvAvailable60sKms: "60s利用可能ΔV (km/s)",
  dvEscapeKms: "脱出ΔV (km/s)",
  v_perijove_before: "近木点前速度",
  v_perijove_after: "近木点後速度",
  v_perijove_1_5RJ: "1.5RJ近木点速度",
  v_escape_1_5RJ: "1.5RJ脱出速度",
  v_at_ganymede_orbit: "ガニメデ軌道速度",
  circCaptureFeasible: "円捕捉可能",
  minCaptureFeasible: "最小捕捉可能",
};

/** Collect the union of all result keys across scenarios, preserving insertion order */
function collectResultKeys(scenarios: ExplorationScenario[]): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const s of scenarios) {
    for (const k of Object.keys(s.results)) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }
  return keys;
}

/** Render a scenario table row using the given column keys */
function renderScenarioRow(s: ExplorationScenario, resultKeys: string[]): string {
  const cls = s.feasible ? "feasible" : "infeasible";
  const icon = s.feasible ? "✓" : "✗";
  const resultCells = resultKeys
    .map(k => {
      const v = s.results[k];
      if (v === undefined) return "<td></td>";
      return `<td>${typeof v === "number" ? formatNumericValue(v) : escapeHtml(String(v))}</td>`;
    })
    .join("");
  return `<tr class="${cls}"><td>${icon} ${escapeHtml(s.label)}</td><td>${s.variedValue.toLocaleString()} ${escapeHtml(s.variedUnit)}</td>${resultCells}<td>${escapeHtml(s.note)}</td></tr>`;
}

/** Render a parameter exploration section */
export function renderExploration(exp: ParameterExploration): string {
  const boundary = exp.boundaryCondition
    ? `<p class="boundary">${inlineFormat(exp.boundaryCondition)}</p>`
    : "";

  const resultKeys = collectResultKeys(exp.scenarios);

  const visibleScenarios = exp.scenarios.filter(s => !s.collapsedByDefault);
  const collapsedScenarios = exp.scenarios.filter(s => s.collapsedByDefault);

  const visibleRows = visibleScenarios.map(s => renderScenarioRow(s, resultKeys)).join("\n");
  const collapsedRows = collapsedScenarios.map(s => renderScenarioRow(s, resultKeys)).join("\n");

  const resultHeaders = resultKeys
    .map(k => `<th>${escapeHtml(resultKeyLabels[k] ?? k)}</th>`).join("");

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
<div class="exploration-summary">${markdownToHtml(exp.summary)}</div>
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

  // Build a set of transfer IDs that have been moved to detail sub-pages
  const detailPageTransferIds = new Set<string>();
  const transferToDetailSlug = new Map<string, string>();
  if (report.detailPages) {
    for (const dp of report.detailPages) {
      for (const tid of dp.transferIds) {
        detailPageTransferIds.add(tid);
        transferToDetailSlug.set(tid, dp.slug);
      }
    }
  }

  const epDir = `ep-${String(report.episode).padStart(3, "0")}`;

  // Render each transfer with its nested explorations and inline citations
  const cards = report.transfers.map((t) => {
    // If this transfer has a detail sub-page, render a summary card instead
    const detailSlug = transferToDetailSlug.get(t.id);
    if (detailSlug) {
      const explorationCount = (explorationsByTransfer.get(t.id) ?? []).length;
      return renderTransferSummaryCard(t, `${epDir}/${detailSlug}.html`, explorationCount, report.videoCards);
    }

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
  // Check if scene timeline will render (transfers with real timestamps)
  const hasSceneTimeline = report.transfers.some(t => !t.timestamp.includes("該当なし"));
  if (hasSceneTimeline) {
    tocItems.push('<li><a href="#section-scene-timeline">シーンタイムライン</a></li>');
  }
  if (report.diagrams && report.diagrams.length > 0) {
    tocItems.push('<li><a href="#section-diagrams">軌道遷移図</a></li>');
  }
  if (report.timeSeriesCharts && report.timeSeriesCharts.length > 0) {
    tocItems.push('<li><a href="#section-timeseries">時系列グラフ</a></li>');
  }
  if (report.marginGauges && report.marginGauges.length > 0) {
    tocItems.push('<li><a href="#section-margin-gauges">マージン分析</a></li>');
  }
  if (report.viewer3d) {
    tocItems.push('<li><a href="#section-3d-viewer">3D軌道ビューア</a></li>');
  }
  if (report.transfers.length > 0) {
    tocItems.push('<li><a href="#section-transfers">軌道遷移分析</a>');
    tocItems.push('<ul>');
    for (const t of report.transfers) {
      const badge = verdictBadge(t.verdict);
      const detailSlug = transferToDetailSlug.get(t.id);
      if (detailSlug) {
        tocItems.push(`<li><a href="${epDir}/${detailSlug}.html">${escapeHtml(t.description)}</a> ${badge} <span class="detail-badge">詳細ページ</span></li>`);
      } else {
        tocItems.push(`<li><a href="#${escapeHtml(t.id)}">${escapeHtml(t.description)}</a> ${badge}</li>`);
      }
    }
    tocItems.push('</ul></li>');
  }
  if (report.glossary && report.glossary.length > 0) {
    tocItems.push('<li><a href="#section-glossary">用語集</a></li>');
  }
  tocItems.push('<li><a href="#calculator">Brachistochrone 計算機</a></li>');
  const toc = tocItems.length > 0
    ? `<nav class="toc card"><h3>目次</h3><ul>${tocItems.join("\n")}</ul></nav>`
    : "";

  const dialogueSectionWithId = report.dialogueQuotes && report.dialogueQuotes.length > 0
    ? `<h2 id="section-dialogue">主要な台詞</h2>\n${report.dialogueQuotes.map(q => renderDialogueQuote(q, report.videoCards)).join("\n")}`
    : "";

  const sceneTimelineHtml = renderSceneTimeline(report.transfers, report.videoCards);

  const diagramSectionWithId = report.diagrams && report.diagrams.length > 0
    ? `<h2 id="section-diagrams">軌道遷移図</h2>\n${report.diagrams.map(renderOrbitalDiagram).join("\n")}`
    : "";

  const timeSeriesSectionWithId = report.timeSeriesCharts && report.timeSeriesCharts.length > 0
    ? `<h2 id="section-timeseries">時系列グラフ</h2>\n${renderTimeSeriesCharts(report.timeSeriesCharts)}`
    : "";

  const marginGaugeSectionWithId = report.marginGauges && report.marginGauges.length > 0
    ? `<h2 id="section-margin-gauges">マージン分析</h2>\n${renderMarginGauges(report.marginGauges)}`
    : "";

  const viewer3dSectionWithId = report.viewer3d
    ? `<h2 id="section-3d-viewer">3D軌道ビューア</h2>\n${renderViewer3D(report.viewer3d)}`
    : "";

  const content = `
<h1>第${report.episode}話: ${escapeHtml(report.title)}${provisionalBadge}</h1>
${videoSection}
${markdownToHtml(report.summary)}

${toc}

${dialogueSectionWithId}

${sceneTimelineHtml}

${dvChart}

${diagramSectionWithId}

${timeSeriesSectionWithId}

${marginGaugeSectionWithId}

${viewer3dSectionWithId}

<h2 id="section-transfers">軌道遷移分析</h2>
${report.transfers.length > 0 ? cards : "<p>分析された軌道遷移はまだありません。</p>"}

${unlinkedSection}

${report.glossary && report.glossary.length > 0 ? `<h2 id="section-glossary">用語集</h2>\n${renderGlossary(report.glossary)}` : ""}

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

  // Include 3D viewer scripts if episode has inline viewer
  const episodeViewer3dScript = report.viewer3d ? generateViewer3dScript("..") : "";

  // Inject inline glossary tooltips into content text
  const enrichedContent = report.glossary && report.glossary.length > 0
    ? wrapGlossaryTerms(content, report.glossary)
    : content;

  const desc = report.summary.length > 120 ? report.summary.substring(0, 120) + "…" : report.summary;
  return layoutHtml(`第${report.episode}話`, enrichedContent + episodeNav + animScript + episodeViewer3dScript, "..", summaryPages, desc, navEpisodes, metaPages);
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

  return `<div class="table-wrap"><table class="comparison-table">
<caption>${escapeHtml(table.caption)}</caption>
<thead><tr><th>パラメータ</th>${epHeaders}<th>整合性</th></tr></thead>
<tbody>
${rows}
</tbody>
</table></div>`;
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

/** Render a compact scene timeline mapping video timestamps to maneuvers and verdicts */
export function renderSceneTimeline(transfers: TransferAnalysis[], videoCards?: VideoCard[]): string {
  // Filter to transfers with real timestamps (not 該当なし / reference-only)
  const withTimestamps = transfers.filter(t => !t.timestamp.includes("該当なし"));
  if (withTimestamps.length === 0) return "";

  // Sort by parsed timestamp (ascending)
  const sorted = [...withTimestamps].sort((a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp));

  const events = sorted.map(t => {
    const tsDisplay = t.timestamp.match(/(\d{1,2}:\d{2}(?::\d{2})?(?:\s*-\s*\d{1,2}:\d{2}(?::\d{2})?)?)/)?.[0] ?? t.timestamp;
    const tsHtml = timestampLink(tsDisplay, videoCards);
    const badge = verdictBadge(t.verdict);
    return `<div class="scene-timeline-event">
<div class="scene-timeline-marker marker-${t.verdict}"></div>
<span class="scene-timeline-ts">${tsHtml}</span>
<span class="scene-timeline-desc"><a href="#${escapeHtml(t.id)}">${escapeHtml(t.description)}</a></span>
${badge}
</div>`;
  }).join("\n");

  return `<div class="scene-timeline" id="section-scene-timeline">
<h3>シーンタイムライン</h3>
<div class="scene-timeline-track">
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

/** Determine the color for a margin gauge based on the remaining margin percentage */
function marginGaugeColor(marginPercent: number): string {
  if (marginPercent < 5) return "#e74c3c";    // red — critical
  if (marginPercent < 20) return "#f39c12";   // yellow — tight
  return "#27ae60";                            // green — safe
}

/** Render a single margin gauge item as an SVG horizontal bar */
function renderMarginGaugeItem(item: MarginGaugeItem, y: number, barAreaWidth: number): string {
  const barHeight = 28;
  const labelWidth = 180;
  const { actual, limit, unit, higherIsBetter } = item;

  // Calculate the fill ratio and margin
  let fillRatio: number;
  let marginPercent: number;
  if (higherIsBetter) {
    // e.g. shield life: 14 min available vs 8 min needed → margin = (14-8)/14 = 43%
    fillRatio = limit > 0 ? Math.min(actual / limit, 1.5) : 0;
    marginPercent = actual > 0 ? ((actual - limit) / actual) * 100 : 0;
  } else {
    // e.g. radiation: 560 mSv actual vs 600 mSv limit → margin = (600-560)/600 = 6.7%
    fillRatio = limit > 0 ? Math.min(actual / limit, 1.5) : 0;
    marginPercent = limit > 0 ? ((limit - actual) / limit) * 100 : 0;
  }

  const color = marginGaugeColor(Math.max(0, marginPercent));
  const fillWidth = Math.max(1, fillRatio * barAreaWidth);
  const limitX = labelWidth + barAreaWidth; // limit mark is at 100%

  const truncatedLabel = truncateLabel(item.label, 22);
  const marginLabel = marginPercent >= 0
    ? `余裕 ${marginPercent.toFixed(1)}%`
    : `超過 ${Math.abs(marginPercent).toFixed(1)}%`;

  return `<g>
<text x="${labelWidth - 8}" y="${y + barHeight / 2 + 5}" fill="var(--fg)" text-anchor="end" font-size="12">${escapeHtml(truncatedLabel)}</text>
<rect x="${labelWidth}" y="${y}" width="${barAreaWidth}" height="${barHeight}" rx="3" fill="var(--bg-alt, #f5f5f5)" opacity="0.3"/>
<rect x="${labelWidth}" y="${y}" width="${Math.min(fillWidth, barAreaWidth)}" height="${barHeight}" rx="3" fill="${color}" opacity="0.85"/>
${fillWidth > barAreaWidth ? `<rect x="${labelWidth + barAreaWidth}" y="${y}" width="${Math.min(fillWidth - barAreaWidth, 30)}" height="${barHeight}" rx="3" fill="#e74c3c" opacity="0.5"/>` : ""}
<line x1="${limitX}" y1="${y - 2}" x2="${limitX}" y2="${y + barHeight + 2}" stroke="var(--fg)" stroke-width="2" stroke-dasharray="4,2"/>
<text x="${limitX + 4}" y="${y - 4}" fill="var(--fg)" font-size="9" opacity="0.7">上限 ${formatNumericValue(limit, 1)} ${escapeHtml(unit)}</text>
<text x="${labelWidth + Math.min(fillWidth, barAreaWidth) + 6}" y="${y + barHeight / 2 + 5}" fill="var(--fg)" font-size="11">${formatNumericValue(actual, 1)} ${escapeHtml(unit)} (${marginLabel})</text>
</g>`;
}

/** Render a margin gauge panel with multiple gauge items */
export function renderMarginGauge(gauge: MarginGauge): string {
  const barHeight = 28;
  const itemSpacing = 16;
  const chartWidth = 700;
  const labelWidth = 180;
  const barAreaWidth = chartWidth - labelWidth - 180; // leave room for value text
  const svgHeight = gauge.items.length * (barHeight + itemSpacing) + 20;

  const descHtml = gauge.description
    ? `<p class="diagram-description">${escapeHtml(gauge.description)}</p>`
    : "";

  const itemsSvg = gauge.items.map((item, i) => {
    const y = i * (barHeight + itemSpacing) + 10;
    return renderMarginGaugeItem(item, y, barAreaWidth);
  }).join("\n");

  return `<div class="card margin-gauge" id="${escapeHtml(gauge.id)}">
<h4>${escapeHtml(gauge.title)}</h4>${descHtml}
<svg viewBox="0 0 ${chartWidth} ${svgHeight}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(gauge.title)}">
${itemsSvg}
</svg>
</div>`;
}

/** Render multiple margin gauge panels */
export function renderMarginGauges(gauges: MarginGauge[]): string {
  if (gauges.length === 0) return "";
  return gauges.map(renderMarginGauge).join("\n");
}

/** Scene label mapping for 3D viewer buttons */
const VIEWER3D_SCENE_LABELS: Record<string, string> = {
  "full-route": "全航路",
  "saturn-ring": "土星リング",
  "uranus-approach": "天王星接近",
  "episode-1": "EP01: 火星→木星",
  "episode-2": "EP02: 木星→土星",
  "episode-3": "EP03: 土星→天王星",
  "episode-4": "EP04: 天王星→地球",
  "episode-5": "EP05: フライバイIF",
};

/** Render an inline 3D viewer embed container */
export function renderViewer3D(embed: Viewer3DEmbed): string {
  const height = embed.height ?? 500;
  const caption = embed.caption ? `<figcaption class="chart-caption">${escapeHtml(embed.caption)}</figcaption>` : "";
  const id = `viewer3d-${embed.scene}`;
  const scenes = embed.scenes && embed.scenes.length > 1 ? embed.scenes : [embed.scene];
  const scenesAttr = escapeHtml(JSON.stringify(scenes));
  const sceneButtons = scenes.length > 1
    ? `<div class="viewer3d-scene-buttons" style="display:flex;gap:8px;margin-bottom:8px;">${scenes.map(s =>
        `<button class="viewer3d-scene-btn${s === embed.scene ? " active" : ""}" data-scene="${escapeHtml(s)}" style="background:${s === embed.scene ? "#58a6ff" : "#21262d"};color:${s === embed.scene ? "#0d1117" : "#c9d1d9"};border:1px solid var(--border);padding:6px 14px;cursor:pointer;border-radius:4px;font-size:0.85em;font-weight:${s === embed.scene ? "bold" : "normal"};">${escapeHtml(VIEWER3D_SCENE_LABELS[s] ?? s)}</button>`
      ).join("")}</div>`
    : "";
  return `<figure class="viewer3d-figure">
${sceneButtons}
<div id="${escapeHtml(id)}" class="viewer3d-container" data-scene="${escapeHtml(embed.scene)}" data-scenes="${scenesAttr}" style="width:100%;height:${height}px;position:relative;background:#0d1117;border:1px solid var(--border);border-radius:8px;overflow:hidden;">
<div class="viewer3d-loading" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#58a6ff;">3Dビューア読み込み中...</div>
</div>
<div class="viewer3d-controls" style="display:none;padding:8px;background:var(--surface);border:1px solid var(--border);border-top:none;border-radius:0 0 8px 8px;align-items:center;gap:12px;">
<button class="viewer3d-play" aria-label="再生" style="background:#21262d;color:#c9d1d9;border:1px solid var(--border);width:36px;height:36px;cursor:pointer;border-radius:4px;font-size:1.1em;">&#x25b6;</button>
<input type="range" class="viewer3d-slider" min="0" max="1000" value="0" style="flex:1;accent-color:#58a6ff;" aria-label="タイムライン">
<span class="viewer3d-time" style="font-size:0.85em;color:#58a6ff;min-width:80px;text-align:right;font-variant-numeric:tabular-nums;">0日</span>
<span class="viewer3d-label" style="font-size:0.8em;color:#8b949e;min-width:200px;"></span>
<button class="viewer3d-speed" aria-label="再生速度" title="アニメーション速度の切替" style="background:#21262d;color:#58a6ff;border:1px solid var(--border);padding:4px 12px;cursor:pointer;border-radius:4px;font-size:0.85em;white-space:nowrap;">1×</button>
<button class="viewer3d-viewmode" aria-label="視点切替" title="慣性座標/宇宙船視点の切替" style="background:#21262d;color:#58a6ff;border:1px solid var(--border);padding:4px 12px;cursor:pointer;border-radius:4px;font-size:0.85em;white-space:nowrap;">慣性</button>
</div>
<div class="viewer3d-hint" style="font-size:0.8em;color:var(--text-secondary);margin-top:4px;">ドラッグ: 回転 ｜ スクロール: ズーム ｜ 右ドラッグ: 移動</div>
${caption}
</figure>`;
}

/** Generate the 3D viewer script block (importmap + module scripts) for a page.
 *  @param basePath - relative path to site root (e.g. ".." for /episodes/ or /summary/)
 */
function generateViewer3dScript(basePath: string): string {
  return `
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}</script>
<script type="module" src="${basePath}/orbital-3d-viewer.js"></script>
<script type="module">
import { initViewer, loadScene, loadTimeline, updateTimelineFrame, setTimelinePlaying, getTimelineCurrentDay, setViewMode, getViewMode, setAnimationSpeed, getAnimationSpeed, updateInfoPanel, setScenarioVisible } from "${basePath}/orbital-3d-viewer.js";
document.querySelectorAll(".viewer3d-container").forEach(async function(container) {
  var scene = container.dataset.scene;
  var resp = await fetch("${basePath}/data/calculations/3d_orbital_analysis.json");
  var analysisData = await resp.json();
  container.querySelector(".viewer3d-loading").remove();
  initViewer(container);
  var figure = container.closest(".viewer3d-figure");
  var ctrl = figure.querySelector(".viewer3d-controls");
  var playing = false;
  var currentTotalDays = 1;
  var currentTransfers = [];
  function getLabel(day) {
    for (var i = 0; i < currentTransfers.length; i++) {
      var t = currentTransfers[i];
      if (day >= t.startDay && day <= t.endDay) return t.label;
    }
    return "";
  }
  function switchScene(sceneName) {
    var sd = window.__prepareScene(sceneName, analysisData);
    if (!sd) return;
    container.dataset.scene = sceneName;
    loadScene(sd);
    playing = false;
    setTimelinePlaying(false);
    if (ctrl) {
      if (sd.timeline) {
        currentTotalDays = sd.timeline.totalDays;
        currentTransfers = sd.timeline.transfers || [];
        loadTimeline(sd.timeline);
        ctrl.style.display = "flex";
        ctrl.querySelector(".viewer3d-play").textContent = "\\u25b6";
        ctrl.querySelector(".viewer3d-slider").value = "0";
        ctrl.querySelector(".viewer3d-time").textContent = "0日";
        ctrl.querySelector(".viewer3d-label").textContent = "";
      } else {
        ctrl.style.display = "none";
      }
    }
    figure.querySelectorAll(".viewer3d-scene-btn").forEach(function(btn) {
      var isActive = btn.dataset.scene === sceneName;
      btn.style.background = isActive ? "#58a6ff" : "#21262d";
      btn.style.color = isActive ? "#0d1117" : "#c9d1d9";
      btn.style.fontWeight = isActive ? "bold" : "normal";
    });
  }
  figure.querySelectorAll(".viewer3d-scene-btn").forEach(function(btn) {
    btn.addEventListener("click", function() { switchScene(btn.dataset.scene); });
  });
  switchScene(scene);
  if (ctrl) {
    var playBtn = ctrl.querySelector(".viewer3d-play");
    var slider = ctrl.querySelector(".viewer3d-slider");
    var timeSpan = ctrl.querySelector(".viewer3d-time");
    var labelSpan = ctrl.querySelector(".viewer3d-label");
    window._onTimelineEnd = function() {
      playing = false;
      playBtn.textContent = "\\u25b6";
    };
    playBtn.addEventListener("click", function() {
      if (!playing && getTimelineCurrentDay() >= currentTotalDays) {
        updateTimelineFrame(0);
        slider.value = "0";
        timeSpan.textContent = "0日";
        if (labelSpan) labelSpan.textContent = "";
      }
      playing = !playing;
      setTimelinePlaying(playing);
      playBtn.textContent = playing ? "\\u23f8" : "\\u25b6";
    });
    function fmtDay(d) {
      if (d < 1) return Math.round(d * 24) + "時間";
      var dd = Math.floor(d), hh = Math.round((d - dd) * 24);
      return hh > 0 ? dd + "日" + hh + "時間" : dd + "日";
    }
    slider.addEventListener("input", function() {
      var frac = Number(slider.value) / 1000;
      updateTimelineFrame(frac * currentTotalDays);
      var day = getTimelineCurrentDay();
      timeSpan.textContent = fmtDay(day);
      if (labelSpan) labelSpan.textContent = getLabel(day);
    });
    (function tick() {
      if (playing) {
        var day = getTimelineCurrentDay();
        slider.value = String(Math.round((day / currentTotalDays) * 1000));
        timeSpan.textContent = fmtDay(day);
        if (labelSpan) labelSpan.textContent = getLabel(day);
      }
      requestAnimationFrame(tick);
    })();
  }
  var vmBtn = figure.querySelector(".viewer3d-viewmode");
  if (vmBtn) {
    vmBtn.addEventListener("click", function() {
      var cur = getViewMode();
      var next = cur === "inertial" ? "ship" : "inertial";
      setViewMode(next);
      vmBtn.textContent = next === "inertial" ? "慣性" : "宇宙船";
    });
  }
  var speedBtn = figure.querySelector(".viewer3d-speed");
  if (speedBtn) {
    var speeds = [0.5, 1, 2, 4];
    speedBtn.addEventListener("click", function() {
      var cur = getAnimationSpeed();
      var idx = speeds.indexOf(cur);
      var next = speeds[(idx + 1) % speeds.length];
      setAnimationSpeed(next);
      speedBtn.textContent = next + "×";
    });
  }
});
</script>
<script type="module">
// Scene preparation (matches orbital-3d-viewer-data.ts logic)
window.__prepareScene = function(sceneName, data) {
  var AU = 5;
  var PC = {mars:"#e05050",jupiter:"#e0a040",saturn:"#d4b896",uranus:"#7ec8e3",earth:"#4488ff",enceladus:"#ccddee",rhea:"#eab308",titan:"#d2a8ff",titania:"#aabbcc",miranda:"#3b82f6",oberon:"#f97316"};
  var EC = {1:"#ff6644",2:"#ffaa22",3:"#44cc88",4:"#4488ff",5:"#ff4444"};
  var PR = {mars:0.15,jupiter:0.4,saturn:0.35,uranus:0.25,earth:0.15,enceladus:0.08,rhea:0.08,titan:0.1,titania:0.08,miranda:0.06,oberon:0.08};
  var PL = {mars:"火星",jupiter:"木星",saturn:"土星",uranus:"天王星",earth:"地球"};
  var MK = {enceladus:238020,rhea:527108,titan:1221870,miranda:129390,titania:435910,oberon:583520};
  var MP = {enceladus:1.370218,rhea:4.518212,titan:15.945,titania:8.705872,miranda:1.413479,oberon:13.463};
  function mkMoon(n,l,a){var r=MK[n]/50000;return{name:n,x:r*Math.cos(a),y:r*Math.sin(a),z:0,color:PC[n],radius:PR[n]||0.08,orbitRadius:MK[n],label:l};}
  function mkOrbit(n,a){return{name:n,radiusScene:MK[n]/50000,initialAngle:a,meanMotionPerDay:2*Math.PI/MP[n],z:0};}
  var OR = {mars:1.524,jupiter:5.203,saturn:9.537,uranus:19.19,earth:1.0};
  var OP = {mars:686.97,jupiter:4332.59,saturn:10759.22,uranus:30688.5,earth:365.256};
  var fallbackAngles = [Math.PI*0.1,Math.PI*0.35,Math.PI*0.55,Math.PI*0.75,Math.PI*1.85];
  if (sceneName === "full-route") {
    var order = ["mars","jupiter","saturn","uranus","earth"];
    var msAngles = data.planetLongitudesAtMissionStart || {};
    var planets = order.map(function(name,i){
      var p = data.planetaryZHeightsAtEpoch[name];
      var r = (OR[name]||5)*AU;
      var a = (typeof msAngles[name] === "number") ? msAngles[name] : (p && typeof p.eclipticLongitudeRad === "number") ? p.eclipticLongitudeRad : fallbackAngles[i];
      return {name:name,x:r*Math.cos(a),y:r*Math.sin(a),z:(p?p.zHeightAU:0)*AU*3,color:PC[name],radius:PR[name]||0.15,label:PL[name]||name};
    });
    var firstJd = data.transfers[0].departure.jd;
    var lastJd = data.transfers[data.transfers.length-1].arrival.jd;
    var orbits = order.map(function(name,i){
      var p = data.planetaryZHeightsAtEpoch[name];
      var a = (typeof msAngles[name] === "number") ? msAngles[name] : (p && typeof p.eclipticLongitudeRad === "number") ? p.eclipticLongitudeRad : fallbackAngles[i];
      return {name:name,radiusScene:(OR[name]||5)*AU,initialAngle:a,meanMotionPerDay:2*Math.PI/(OP[name]||365),z:(p?p.zHeightAU:0)*AU*3};
    });
    function posAtDay(orb,day){var a=orb.initialAngle+orb.meanMotionPerDay*day;return [orb.radiusScene*Math.cos(a),orb.radiusScene*Math.sin(a),orb.z]}
    var orbMap={};orbits.forEach(function(o){orbMap[o.name]=o});
    var arcs = data.transfers.map(function(t){
      var depDay=t.departure.jd-firstJd,arrDay=t.arrival.jd-firstJd;
      var fo=orbMap[t.departure.planet],to2=orbMap[t.arrival.planet];
      var fp2=fo?posAtDay(fo,depDay):(function(){var p=planets.find(function(p){return p.name===t.departure.planet});return [p.x,p.y,p.z]})();
      var tp2=to2?posAtDay(to2,arrDay):(function(){var p=planets.find(function(p){return p.name===t.arrival.planet});return [p.x,p.y,p.z]})();
      return {from:t.departure.planet,to:t.arrival.planet,fromPos:fp2,toPos:tp2,episode:t.episode,color:EC[t.episode],label:t.leg};
    });
    var tl = data.transfers.map(function(t){return {startDay:t.departure.jd-firstJd,endDay:t.arrival.jd-firstJd,episode:t.episode,label:t.leg,from:t.departure.planet,to:t.arrival.planet}});
    var totalDays = lastJd - firstJd;
    var pk = [];
    for (var ti=0; ti<tl.length; ti++) {
      var ns = ti+1<tl.length ? tl[ti+1].startDay : totalDays;
      var gap = ns - tl[ti].endDay;
      if (gap > 0.01) {
        var pr2 = (PR[tl[ti].to]||0.15)*3;
        var no = Math.min(3,Math.max(2,gap*0.5));
        pk.push({planet:tl[ti].to,startDay:tl[ti].endDay,endDay:ns,radiusScene:pr2*2,angularVelocityPerDay:no*2*Math.PI/gap});
      }
    }
    var oc = order.map(function(name,i){var p=data.planetaryZHeightsAtEpoch[name];return{name:name,radiusScene:(OR[name]||5)*AU,color:PC[name]||"#ffffff",z:(p?p.zHeightAU:0)*AU*3}});
    var ts2=data.transfers.filter(function(t){return typeof t.outOfPlaneDistanceAU==="number"}).map(function(t){return{leg:t.leg,outOfPlaneDistanceAU:t.outOfPlaneDistanceAU,planeChangeFractionPercent:t.planeChangeFractionPercent||0}});
    return {type:"full-route",title:"",description:"",planets:planets,transferArcs:arcs,orbitCircles:oc,supportedViewModes:["inertial","ship"],eclipticPlane:{type:"ecliptic",normal:[0,0,1],z:0,color:"#334455",opacity:0.15,label:"黄道面"},timeline:{totalDays:totalDays,orbits:orbits,transfers:tl,parkingOrbits:pk.length>0?pk:undefined},transferSummary:ts2.length>0?ts2:undefined};
  }
  if (sceneName === "saturn-ring") {
    var ring = data.saturnRingAnalysis;
    var eM=mkMoon("enceladus","エンケラドス",Math.PI/4),rM=mkMoon("rhea","レア (IF)",Math.PI*0.6),tM=mkMoon("titan","タイタン (IF)",Math.PI*1.1);
    var eR=ring.enceladusOrbitKm/50000,rR=MK.rhea/50000,tR2=MK.titan/50000;
    return {type:"saturn-ring",title:"",description:"IF分析: エンケラドス（作中）・レア・タイタンの各衛星への捕獲軌道を比較。",supportedViewModes:["inertial","ship"],scenarios:[{id:"canonical",label:"作中航路 — エンケラドス捕獲（ΔV 0.61 km/s）"},{id:"rhea",label:"IF: レア捕獲（ΔV 0.88 km/s）",isCounterfactual:true,color:PC.rhea},{id:"titan",label:"IF: タイタン捕獲（ΔV 1.29 km/s）",isCounterfactual:true,color:PC.titan}],planets:[{name:"saturn",x:0,y:0,z:0,color:PC.saturn,radius:0.5,isCentral:true,label:"土星"},eM,rM,tM],transferArcs:[{from:"jupiter",to:"saturn",fromPos:[10,2,0],toPos:[0,0,0],episode:2,color:EC[2],label:"木星→土星 接近軌道",approachAngleDeg:ring.approachFromJupiter.approachAngleToDeg,scenarioId:"canonical"},{from:"saturn",to:"enceladus",fromPos:[eR*1.5,eR*0.3,0],toPos:[eM.x,eM.y,0],episode:2,color:"#3fb950",label:"エンケラドス捕獲（ΔV=0.61 km/s）",scenarioId:"canonical"},{from:"saturn",to:"rhea",fromPos:[rR*1.3,rR*0.5,0],toPos:[rM.x,rM.y,0],episode:2,color:PC.rhea,label:"IF: レア捕獲（ΔV=0.88 km/s）",scenarioId:"rhea",isCounterfactual:true},{from:"saturn",to:"titan",fromPos:[tR2*1.1,tR2*0.6,0],toPos:[tM.x,tM.y,0],episode:2,color:PC.titan,label:"IF: タイタン捕獲（ΔV=1.29 km/s）",scenarioId:"titan",isCounterfactual:true}],rings:[{innerRadius:ring.ringInnerKm,outerRadius:ring.ringOuterKm,normal:ring.ringPlaneNormal,color:"#c8a86e",opacity:0.3}],timeline:{totalDays:MP.enceladus*3,orbits:[mkOrbit("enceladus",Math.PI/4),mkOrbit("rhea",Math.PI*0.6),mkOrbit("titan",Math.PI*1.1)],transfers:[{startDay:0,endDay:MP.enceladus,episode:2,label:"木星→土星 接近",from:"jupiter",to:"saturn"}]}};
  }
  if (sceneName === "uranus-approach") {
    var u = data.uranusApproachAnalysis;
    var tiM=mkMoon("titania","タイタニア",Math.PI/4),miM=mkMoon("miranda","ミランダ (IF)",Math.PI*0.8),obM=mkMoon("oberon","オベロン (IF)",Math.PI*1.3);
    var tiR=u.titaniaOrbitKm/50000,miR=MK.miranda/50000,obR=MK.oberon/50000;
    return {type:"uranus-approach",title:"",description:"IF分析: タイタニア（作中）・ミランダ・オベロンの各衛星への捕獲軌道を比較。",supportedViewModes:["inertial","ship"],scenarios:[{id:"canonical",label:"作中航路 — タイタニア捕獲（ΔV 0.37 km/s）"},{id:"miranda",label:"IF: ミランダ捕獲（ΔV 0.21 km/s）",isCounterfactual:true,color:PC.miranda},{id:"oberon",label:"IF: オベロン捕獲（ΔV 0.43 km/s）",isCounterfactual:true,color:PC.oberon}],planets:[{name:"uranus",x:0,y:0,z:0,color:PC.uranus,radius:0.4,isCentral:true,label:"天王星"},tiM,miM,obM],transferArcs:[{from:"saturn",to:"uranus",fromPos:[10,3,0],toPos:[0,0,0],episode:3,color:EC[3],label:"土星→天王星 接近",approachAngleDeg:u.approachFromSaturn.angleToDeg,scenarioId:"canonical"},{from:"uranus",to:"titania",fromPos:[tiR*1.5,tiR*0.3,0],toPos:[tiM.x,tiM.y,0],episode:3,color:"#22c55e",label:"タイタニア捕獲（ΔV=0.37 km/s）",scenarioId:"canonical"},{from:"uranus",to:"miranda",fromPos:[miR*1.5,miR*0.5,0],toPos:[miM.x,miM.y,0],episode:3,color:PC.miranda,label:"IF: ミランダ捕獲（ΔV=0.21 km/s）",scenarioId:"miranda",isCounterfactual:true},{from:"uranus",to:"oberon",fromPos:[obR*1.3,obR*0.5,0],toPos:[obM.x,obM.y,0],episode:3,color:PC.oberon,label:"IF: オベロン捕獲（ΔV=0.43 km/s）",scenarioId:"oberon",isCounterfactual:true},{from:"uranus",to:"earth",fromPos:[0,0,0],toPos:[-8,-4,0],episode:5,color:EC[5],label:"天王星→地球 離脱",approachAngleDeg:u.approachFromUranus.angleToDeg,scenarioId:"canonical"}],rings:[{innerRadius:37850,outerRadius:u.ringOuterKm,normal:u.spinAxis,color:"#556677",opacity:0.2}],axes:[{type:"spin",direction:u.spinAxis,label:"天王星自転軸 (97.77°)",color:"#7ec8e3"}],planes:[{type:"equatorial",normal:u.spinAxis,tiltDeg:u.obliquityDeg,color:"#7ec8e3",opacity:0.12,label:"天王星赤道面"}],timeline:{totalDays:MP.titania*3,orbits:[mkOrbit("titania",Math.PI/4),mkOrbit("miranda",Math.PI*0.8),mkOrbit("oberon",Math.PI*1.3)],transfers:[{startDay:0,endDay:MP.titania,episode:3,label:"土星→天王星 接近",from:"saturn",to:"uranus"}]}};
  }
  // EP05 Jupiter flyby IF scene
  if (sceneName === "episode-5") {
    var vis5 = ["earth","jupiter","uranus"];
    var allP5 = ["mars","jupiter","saturn","uranus","earth"];
    var msA5 = data.planetLongitudesAtMissionStart || {};
    var ep5Planets = vis5.map(function(name){var r=(OR[name]||5)*AU;var idx=allP5.indexOf(name);var a=(typeof msA5[name]==="number")?msA5[name]:fallbackAngles[idx];return{name:name,x:r*Math.cos(a),y:r*Math.sin(a),z:0,color:PC[name],radius:PR[name]||0.15,label:PL[name]||name}});
    var ep5Orbits = vis5.map(function(name){var idx=allP5.indexOf(name);var a=(typeof msA5[name]==="number")?msA5[name]:fallbackAngles[idx];var mm=2*Math.PI/(OP[name]||365);return{name:name,radiusScene:(OR[name]||5)*AU,initialAngle:a,meanMotionPerDay:mm,z:0}});
    var ep5OrbMap={};ep5Orbits.forEach(function(o){ep5OrbMap[o.name]=o});
    function ep5Pos(orb,day){var a2=orb.initialAngle+orb.meanMotionPerDay*day;return[orb.radiusScene*Math.cos(a2),orb.radiusScene*Math.sin(a2),orb.z]}
    var leg1D=200/24,leg2D=307/24,dirD=398/24,totD=leg1D+leg2D;
    var uPos=ep5Pos(ep5OrbMap["uranus"],0),jPos=ep5Pos(ep5OrbMap["jupiter"],leg1D),ePosF=ep5Pos(ep5OrbMap["earth"],totD),ePosD=ep5Pos(ep5OrbMap["earth"],dirD);
    var ep5Oc=vis5.map(function(name){return{name:name,radiusScene:(OR[name]||5)*AU,color:PC[name]||"#ffffff",z:0}});
    return{type:"episode-5",title:"EP05: IF分析 — 木星フライバイ vs 直行ルート",description:"作中航路（赤/オレンジ: 木星フライバイ経由507h）と直行ルート（灰色: ノズル73分前に消失）を比較。",planets:ep5Planets,orbitCircles:ep5Oc,supportedViewModes:["inertial","ship"],scenarios:[{id:"flyby",label:"作中航路 — 507h（木星フライバイ, ノズル残26分）"},{id:"direct",label:"IF: 直行ルート — ノズル73分前に消失（帰還失敗）",isCounterfactual:true,color:"#888888"}],transferArcs:[{from:"uranus",to:"jupiter",fromPos:uPos,toPos:jPos,episode:5,color:EC[5],label:"天王星→木星 200h",scenarioId:"flyby"},{from:"jupiter",to:"earth",fromPos:jPos,toPos:ePosF,episode:5,color:"#ff8844",label:"木星→地球 307h（Oberth +3%）",scenarioId:"flyby"},{from:"uranus",to:"earth",fromPos:uPos,toPos:ePosD,episode:5,color:"#888888",label:"IF: 直行 398h（ノズル73分前に消失 ✕）",scenarioId:"direct",isCounterfactual:true}],eclipticPlane:{type:"ecliptic",normal:[0,0,1],z:0,color:"#334455",opacity:0.15,label:"黄道面"},timeline:{totalDays:totD,orbits:ep5Orbits,transfers:[{startDay:0,endDay:leg1D,episode:5,label:"天王星→木星",from:"uranus",to:"jupiter"},{startDay:leg1D,endDay:totD,episode:5,label:"木星→地球",from:"jupiter",to:"earth"}]}};
  }
  // Per-episode scenes
  var epMatch = sceneName.match(/^episode-(\d+)$/);
  if (epMatch) {
    var epNum = parseInt(epMatch[1],10);
    var epTransfer = data.transfers.find(function(t){return t.episode===epNum});
    if (!epTransfer) return null;
    var allP = ["mars","jupiter","saturn","uranus","earth"];
    var PL = {mars:"火星",jupiter:"木星",saturn:"土星",uranus:"天王星",earth:"地球"};
    var depP = epTransfer.departure.planet, arrP = epTransfer.arrival.planet;
    var depI = allP.indexOf(depP), arrI = allP.indexOf(arrP);
    var minI = Math.max(0,Math.min(depI,arrI)-1), maxI = Math.min(allP.length-1,Math.max(depI,arrI)+1);
    var vis = allP.slice(minI, maxI+1);
    var msA = data.planetLongitudesAtMissionStart || {};
    var fJd = data.transfers[0].departure.jd;
    var epPlanets = vis.map(function(name){
      var p = data.planetaryZHeightsAtEpoch[name];
      var r = (OR[name]||5)*AU;
      var idx = allP.indexOf(name);
      var a = (typeof msA[name]==="number") ? msA[name] : (p && typeof p.eclipticLongitudeRad==="number") ? p.eclipticLongitudeRad : fallbackAngles[idx];
      return {name:name,x:r*Math.cos(a),y:r*Math.sin(a),z:(p?p.zHeightAU:0)*AU*3,color:PC[name],radius:PR[name]||0.15,label:PL[name]||name};
    });
    var depDay = epTransfer.departure.jd - fJd;
    var arrDay = epTransfer.arrival.jd - fJd;
    var epOrbits = vis.map(function(name){
      var p = data.planetaryZHeightsAtEpoch[name];
      var idx = allP.indexOf(name);
      var a = (typeof msA[name]==="number") ? msA[name] : (p && typeof p.eclipticLongitudeRad==="number") ? p.eclipticLongitudeRad : fallbackAngles[idx];
      var mm = 2*Math.PI/(OP[name]||365);
      return {name:name,radiusScene:(OR[name]||5)*AU,initialAngle:a+mm*depDay,meanMotionPerDay:mm,z:(p?p.zHeightAU:0)*AU*3};
    });
    function epPosAtDay(orb,day){var a2=orb.initialAngle+orb.meanMotionPerDay*day;return [orb.radiusScene*Math.cos(a2),orb.radiusScene*Math.sin(a2),orb.z]}
    var epOrbMap={};epOrbits.forEach(function(o){epOrbMap[o.name]=o});
    var epFo = epOrbMap[depP], epTo = epOrbMap[arrP];
    var epFp = epFo ? epPosAtDay(epFo,0) : [epPlanets[0].x,epPlanets[0].y,epPlanets[0].z];
    var epTp = epTo ? epPosAtDay(epTo,arrDay-depDay) : [epPlanets[epPlanets.length-1].x,epPlanets[epPlanets.length-1].y,epPlanets[epPlanets.length-1].z];
    var epTotalDays = arrDay - depDay;
    var epOc = vis.map(function(name){var p=data.planetaryZHeightsAtEpoch[name];return{name:name,radiusScene:(OR[name]||5)*AU,color:PC[name]||"#ffffff",z:(p?p.zHeightAU:0)*AU*3}});
    return {type:"episode-"+epNum,title:"EP0"+epNum,description:"",planets:epPlanets,transferArcs:[{from:depP,to:arrP,fromPos:epFp,toPos:epTp,episode:epNum,color:EC[epNum],label:epTransfer.leg}],orbitCircles:epOc,supportedViewModes:["inertial","ship"],eclipticPlane:{type:"ecliptic",normal:[0,0,1],z:0,color:"#334455",opacity:0.15,label:"黄道面"},timeline:{totalDays:epTotalDays,orbits:epOrbits,transfers:[{startDay:0,endDay:epTotalDays,episode:epNum,label:epTransfer.leg,from:depP,to:arrP}]}};
  }
  return null;
};
</script>`;

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
    regions: chart.regions ?? [],
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

  return `<div class="comparison-table" style="overflow-x:auto">
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
    const barChartHtml = (section.barCharts ?? []).map(c => renderBarChartFromData(c)).join("\n");
    const timeSeriesHtml = section.timeSeriesCharts ? renderTimeSeriesCharts(section.timeSeriesCharts) : "";
    const customTableHtml = section.comparisonTable ? renderCustomComparisonTable(section.comparisonTable) : "";
    const sideViewHtml = section.sideViewDiagrams ? renderSideViewDiagrams(section.sideViewDiagrams) : "";
    const marginGaugeHtml = section.marginGauges ? renderMarginGauges(section.marginGauges) : "";
    const viewer3dHtml = section.viewer3d ? renderViewer3D(section.viewer3d) : "";
    const reproHtml = section.reproductionCommand
      ? `<details class="reproduction-command"><summary>再現コマンド</summary><pre><code>${escapeHtml(section.reproductionCommand)}</code></pre></details>`
      : "";
    return `<div class="summary-section" id="${escapeHtml(sectionId)}">
<h2>${escapeHtml(section.heading)}</h2>
${reproHtml}
${markdownToHtml(section.markdown, mdOpts)}
${diagramHtml}
${sideViewHtml}
${barChartHtml}
${timeSeriesHtml}
${marginGaugeHtml}
${viewer3dHtml}
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
  if (report.glossary && report.glossary.length > 0) {
    summaryTocItems.push('<li><a href="#section-glossary">用語集</a></li>');
  }
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
  const hasViewer3d = report.sections.some(s => s.viewer3d);
  const viewer3dScript = hasViewer3d ? generateViewer3dScript("..") : "";

  const glossarySection = report.glossary && report.glossary.length > 0
    ? `<h2 id="section-glossary">用語集</h2>\n${renderGlossary(report.glossary)}`
    : "";

  const content = `
<h1>${escapeHtml(report.title)}</h1>
${markdownToHtml(report.summary, mdOpts)}
${episodeNav}
${summaryToc}
${sections}
${glossarySection}`;

  // Inject inline glossary tooltips into content text
  const enrichedContent = report.glossary && report.glossary.length > 0
    ? wrapGlossaryTerms(content, report.glossary)
    : content;

  const desc = report.summary.length > 120 ? report.summary.substring(0, 120) + "…" : report.summary;
  return layoutHtml(report.title, enrichedContent + animScript + dagScript + viewer3dScript, "..", summaryPages, desc, navEpisodes, metaPages);
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
    case "script": return "公式脚本";
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
  const allSources: { label: string; count: number; unit?: string; model?: string }[] = [];
  if (data.scriptSource) {
    const scriptLineCount = data.scriptSource.scenes.reduce((sum, s) => sum + s.lines.length, 0);
    allSources.push({ label: sourceLabel("script"), count: scriptLineCount });
  }
  allSources.push(
    { label: sourceLabel(data.sourceInfo.source), count: data.lines.length, model: data.sourceInfo.whisperModel },
  );
  if (data.additionalSources) {
    for (const src of data.additionalSources) {
      allSources.push({ label: sourceLabel(src.source), count: src.lines.length, model: src.whisperModel });
    }
  }
  if (data.ocrData) {
    allSources.push({ label: "映像OCR", count: data.ocrData.frames.length, unit: "フレーム", model: data.ocrData.ocrEngine });
  }

  // Source info
  const sourceDetailCells = allSources.map(s => {
    let detail = `${s.label}（${s.count}${s.unit ?? "行"}）`;
    if (s.model) detail += `<br><span class="meta-note">モデル: ${escapeHtml(s.model)}</span>`;
    return detail;
  }).join("、");

  const sourceInfo = `
<div class="card">
<h2>ソース情報</h2>
<table class="meta-table">
<tr><th>エピソード</th><td>第${data.episode}話</td></tr>
<tr><th>字幕ソース</th><td>${sourceDetailCells}</td></tr>
<tr><th>言語</th><td>${escapeHtml(data.sourceInfo.language)}</td></tr>
<tr><th>動画ID</th><td>${escapeHtml(data.videoId)}</td></tr>
${data.dialogue ? `<tr><th>帰属台詞数</th><td>${data.dialogue.length}行</td></tr>` : ""}
${data.speakers ? `<tr><th>話者数</th><td>${data.speakers.length}人</td></tr>` : ""}
${data.scenes ? `<tr><th>シーン数</th><td>${data.scenes.length}</td></tr>` : ""}
${data.scriptSource ? `<tr><th>公式脚本</th><td><a href="${escapeHtml(data.scriptSource.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(data.scriptSource.author)}</a></td></tr>` : ""}
<tr><th>帰属状態</th><td>${data.dialogue ? "Phase 2 完了（話者帰属済み）" : "Phase 1 のみ（話者未帰属）"}</td></tr>
</table>
${data.accuracyMetrics && data.accuracyMetrics.length > 0 ? renderAccuracyChart(data.accuracyMetrics) : ""}
${data.agreementMetrics && data.agreementMetrics.length > 0 ? renderAgreementChart(data.agreementMetrics) : ""}
<p><a href="../episodes/ep-${String(data.episode).padStart(3, "0")}.html">← 第${data.episode}話の考証レポートに戻る</a></p>
</div>

<div class="card layer-legend">
<h3>データレイヤー</h3>
<p class="meta-note">文字起こしデータは${data.scriptSource ? "4" : "3"}層に分けて管理しています。各タブは異なる処理段階のデータを表示します。</p>
<dl class="layer-dl">${data.scriptSource ? `
<dt><span class="layer-badge layer-0">Layer 0</span> 公式脚本（原作者による権威的テキスト）</dt>
<dd>原作者が公開した脚本テキスト。台詞・ト書き・場面設定を含む最も権威的なソース。</dd>` : ""}
<dt><span class="layer-badge layer-3">Layer 3</span> 修正版（話者帰属済み）</dt>
<dd>文脈に基づいて話者を帰属し、テキストを修正したデータ。分析の基礎となる最終版。</dd>
<dt><span class="layer-badge layer-2">Layer 2</span> 前処理済み（抽出・結合済み）</dt>
<dd>生データからキュー結合・タイムスタンプ整列等の前処理を行ったデータ。話者情報なし。</dd>
<dt><span class="layer-badge layer-1">Layer 1</span> 生データ（未加工）</dt>
<dd>YouTube自動字幕やWhisperの出力をそのまま保存した未加工データ。git管理外のため、Layer 2が最も生に近い表示です。</dd>
</dl>${data.ocrData ? `
<p class="meta-note" style="margin-top:0.5em">映像OCRタブには、動画キーフレームからTesseractで抽出した字幕テキスト・HUD表示テキストを表示します。音声文字起こしとは異なるデータソースです。</p>` : ""}
</div>`;

  // Speaker registry table
  let speakerSection = "";
  if (data.speakers && data.speakers.length > 0) {
    const rows = data.speakers.map(s =>
      `<tr><td>${escapeHtml(s.nameJa)}</td><td>${escapeHtml(s.id)}</td><td>${s.notes ? escapeHtml(s.notes) : "—"}</td></tr>`
    ).join("\n");
    speakerSection = `
<h2>話者一覧</h2>
<div class="table-wrap"><table class="data-table">
<thead><tr><th>名前</th><th>ID</th><th>備考</th></tr></thead>
<tbody>
${rows}
</tbody>
</table></div>`;
  }

  // Build tab panels
  const tabs: { id: string; label: string; content: string }[] = [];

  // Tab 0: Official script (Layer 0) — if available
  if (data.scriptSource) {
    const scriptRows: string[] = [];
    for (const scene of data.scriptSource.scenes) {
      scriptRows.push(`<tr class="scene-header"><td colspan="3">${escapeHtml(scene.title)}</td></tr>`);
      scriptRows.push(`<tr class="scene-setting"><td colspan="3"><span class="meta-note">${escapeHtml(scene.setting)}</span></td></tr>`);
      for (const line of scene.lines) {
        if (line.isDirection) {
          scriptRows.push(`<tr class="stage-direction"><td colspan="3"><em>${escapeHtml(line.text)}</em></td></tr>`);
        } else {
          const speakerLabel = line.speaker ? escapeHtml(line.speaker) + (line.speakerNote ? `<span class="meta-note">（${escapeHtml(line.speakerNote)}）</span>` : "") : "";
          const textHtml = escapeHtml(line.text).replace(/\n/g, "<br>");
          scriptRows.push(`<tr><td class="speaker">${speakerLabel}</td><td>「${textHtml}」</td><td class="line-id">${escapeHtml(line.lineId)}</td></tr>`);
        }
      }
    }
    tabs.push({
      id: "script",
      label: "Layer 0: 公式脚本（原作者テキスト）",
      content: `<p class="meta-note">出典: <a href="${escapeHtml(data.scriptSource.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(data.scriptSource.sourceUrl)}</a>（${escapeHtml(data.scriptSource.author)}）</p>
<table class="data-table script-table">
<thead><tr><th>話者</th><th>台詞・ト書き</th><th>ID</th></tr></thead>
<tbody>
${scriptRows.join("\n")}
</tbody>
</table>`,
    });
  }

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
      label: "Layer 3: 修正版（話者帰属済み）",
      content: `<table class="data-table dialogue-table">
<thead><tr><th>時刻</th><th>話者</th><th>台詞</th><th>確度</th></tr></thead>
<tbody>
${rows.join("\n")}
</tbody>
</table>`,
    });
  }

  // Tab for primary preprocessed source (Layer 2)
  const primaryModelNote = data.sourceInfo.whisperModel ? ` [${data.sourceInfo.whisperModel}]` : "";
  tabs.push({
    id: "primary",
    label: `Layer 2: ${sourceLabel(data.sourceInfo.source)}${primaryModelNote}（前処理済み）`,
    content: renderRawLinesTable(data.lines),
  });

  // Tabs for additional sources (also Layer 2 — preprocessed from raw)
  if (data.additionalSources) {
    for (let i = 0; i < data.additionalSources.length; i++) {
      const src = data.additionalSources[i];
      const altModelNote = src.whisperModel ? ` [${src.whisperModel}]` : "";
      tabs.push({
        id: `alt-${i}`,
        label: `Layer 2: ${sourceLabel(src.source)}${altModelNote}（前処理済み）`,
        content: renderRawLinesTable(src.lines),
      });
    }
  }

  // Tab for OCR data (video frame text extraction)
  if (data.ocrData && data.ocrData.frames.length > 0) {
    tabs.push({
      id: "ocr",
      label: `映像OCR [${escapeHtml(data.ocrData.ocrEngine)}]`,
      content: renderOcrTable(data.ocrData.frames),
    });
  }

  // Build tabbed UI (or simple view if only one tab)
  let dialogueSection: string;
  if (tabs.length === 1) {
    dialogueSection = `<h2>${escapeHtml(tabs[0].label)}</h2>\n${tabs[0].content}`;
  } else {
    const tabButtons = tabs.map((t, i) =>
      `<button class="tab-btn${i === 0 ? " active" : ""}" role="tab" aria-selected="${i === 0 ? "true" : "false"}" aria-controls="tab-${t.id}" data-tab="${t.id}">${escapeHtml(t.label)}</button>`
    ).join("\n");
    const tabPanels = tabs.map((t, i) =>
      `<div class="tab-panel${i === 0 ? " active" : ""}" id="tab-${t.id}" role="tabpanel">\n${t.content}\n</div>`
    ).join("\n");
    dialogueSection = `
<h2>台詞データ</h2>
<div class="tab-container">
<div class="tab-buttons" role="tablist">
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
      btns.forEach(function(b){ b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
      panels.forEach(function(p){ p.classList.remove('active'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected','true');
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

/** Render an OCR frames table (video frame text extraction) */
function renderOcrTable(frames: { index: number; timestampSec: number; timestampFormatted: string; description: string; subtitleText: string; hudText: string }[]): string {
  const rows = frames.map(f => {
    const subHtml = f.subtitleText ? escapeHtml(f.subtitleText).replace(/\n/g, "<br>") : '<span class="meta-note">—</span>';
    const hudHtml = f.hudText ? `<code>${escapeHtml(f.hudText).replace(/\n/g, "<br>")}</code>` : '<span class="meta-note">—</span>';
    return `<tr><td class="ts">${escapeHtml(f.timestampFormatted)}</td><td class="meta-note">${escapeHtml(f.description)}</td><td>${subHtml}</td><td>${hudHtml}</td></tr>`;
  }).join("\n");
  return `<p class="meta-note">動画キーフレームからTesseractで抽出したテキスト。字幕はJPN（日本語）、HUDはENG（英語）モデルで認識。精度は限定的です。</p>
<table class="data-table ocr-table">
<thead><tr><th>時刻</th><th>シーン</th><th>字幕テキスト</th><th>HUDテキスト</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`;
}

/** Format accuracy percentage with color coding */
function accuracyBadge(value: number): string {
  const pct = (value * 100).toFixed(1);
  const cls = value >= 0.8 ? "accuracy-high" : value >= 0.6 ? "accuracy-mid" : "accuracy-low";
  return `<span class="${cls}">${pct}%</span>`;
}

/** Render the transcription index page */
export function renderTranscriptionIndex(transcriptions: TranscriptionPageData[], summaryPages?: SiteManifest["summaryPages"], navEpisodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  // Check if any episode has accuracy or agreement data
  const hasAccuracy = transcriptions.some(t => t.accuracyMetrics && t.accuracyMetrics.length > 0);
  const hasAgreement = transcriptions.some(t => t.agreementMetrics && t.agreementMetrics.length > 0);

  const rows = transcriptions.map(t => {
    const epTitle = t.title ?? `第${t.episode}話`;
    const link = `ep-${String(t.episode).padStart(3, "0")}.html`;
    const phase = t.dialogue ? "Phase 2 完了" : "Phase 1 のみ";
    const phaseClass = t.dialogue ? "phase-done" : "phase-partial";
    const sourceCount = 1 + (t.additionalSources?.length ?? 0);
    const sourceNames = [sourceLabel(t.sourceInfo.source), ...(t.additionalSources?.map(s => sourceLabel(s.source)) ?? [])].join("、");

    // Best accuracy (highest corpus accuracy among sources)
    let accuracyCell = "";
    if (hasAccuracy) {
      if (t.accuracyMetrics && t.accuracyMetrics.length > 0) {
        const best = t.accuracyMetrics.reduce((a, b) =>
          b.corpusCharacterAccuracy > a.corpusCharacterAccuracy ? b : a);
        accuracyCell = `<td>${accuracyBadge(best.corpusCharacterAccuracy)}</td>`;
      } else {
        accuracyCell = "<td>—</td>";
      }
    }

    // Average pairwise agreement
    let agreementCell = "";
    if (hasAgreement) {
      if (t.agreementMetrics && t.agreementMetrics.length > 0) {
        const avg = t.agreementMetrics.reduce((sum, m) => sum + m.agreement, 0) / t.agreementMetrics.length;
        agreementCell = `<td>${accuracyBadge(avg)}</td>`;
      } else {
        agreementCell = "<td>—</td>";
      }
    }

    return `<tr>
<td><a href="${link}">第${t.episode}話</a></td>
<td>${escapeHtml(epTitle)}</td>
<td>${sourceNames}${sourceCount > 1 ? ` (${sourceCount})` : ""}</td>
<td>${t.lines.length}</td>
<td>${t.dialogue ? t.dialogue.length : "—"}</td>
<td>${t.speakers ? t.speakers.length : "—"}</td>
${accuracyCell}${agreementCell}<td><span class="${phaseClass}">${phase}</span></td>
</tr>`;
  }).join("\n");

  const totalLines = transcriptions.reduce((sum, t) => sum + t.lines.length, 0);
  const totalDialogue = transcriptions.reduce((sum, t) => sum + (t.dialogue?.length ?? 0), 0);

  const accuracyHeader = hasAccuracy ? "<th>精度</th>" : "";
  const agreementHeader = hasAgreement ? "<th>ソース間一致</th>" : "";

  const content = `
<h1>文字起こしデータ</h1>
<p>各エピソードの字幕抽出・話者帰属データの一覧です。</p>
<div class="card">
<p>合計: ${transcriptions.length}エピソード / ${totalLines}抽出行 / ${totalDialogue}帰属台詞</p>
</div>

<div class="table-wrap"><table class="data-table">
<thead><tr><th>話数</th><th>タイトル</th><th>ソース</th><th>抽出行</th><th>帰属台詞</th><th>話者</th>${accuracyHeader}${agreementHeader}<th>状態</th></tr></thead>
<tbody>
${rows}
</tbody>
</table></div>
${hasAccuracy || hasAgreement ? `<div class="card" style="font-size:0.85em;margin-top:1rem">
<p><strong>精度</strong>: 公式脚本との文字一致率（最良ソース）。<strong>ソース間一致</strong>: 全ソースペア間の平均一致率。詳細は各話のページを参照。</p>
<p style="margin-top:0.3rem"><span class="accuracy-high">■</span> 80%以上 <span class="accuracy-mid">■</span> 60〜80% <span class="accuracy-low">■</span> 60%未満</p>
</div>` : ""}`;

  return layoutHtml("文字起こしデータ", content, "..", summaryPages, "SOLAR LINE 全エピソードの文字起こし・台詞データ一覧", navEpisodes, metaPages);
}

/** Task entry for dashboard rendering */
export interface TaskDashboardEntry {
  number: number;
  title: string;
  status: "DONE" | "TODO" | "IN_PROGRESS";
  summary: string | null;
}

/** Render the task status dashboard page */
export function renderTaskDashboard(tasks: TaskDashboardEntry[], summaryPages?: SiteManifest["summaryPages"], navEpisodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  const done = tasks.filter(t => t.status === "DONE").length;
  const todo = tasks.filter(t => t.status === "TODO").length;
  const inProgress = tasks.filter(t => t.status === "IN_PROGRESS").length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const statusLabel = (s: string): string =>
    s === "DONE" ? "完了" : s === "IN_PROGRESS" ? "進行中" : "未着手";
  const statusClass = (s: string): string =>
    s === "DONE" ? "verdict-plausible" : s === "IN_PROGRESS" ? "verdict-conditional" : "verdict-indeterminate";

  // Group: IN_PROGRESS first, then TODO, then DONE
  const sorted = [
    ...tasks.filter(t => t.status === "IN_PROGRESS"),
    ...tasks.filter(t => t.status === "TODO"),
    ...tasks.filter(t => t.status === "DONE"),
  ];

  const rows = sorted.map(t => {
    const badge = `<span class="verdict ${statusClass(t.status)}">${statusLabel(t.status)}</span>`;
    const summaryText = t.summary ? inlineFormat(t.summary) : "—";
    const taskLink = `tasks/${String(t.number).padStart(3, "0")}.html`;
    return `<tr>
<td>${t.number}</td>
<td><a href="${taskLink}">${escapeHtml(t.title)}</a></td>
<td>${badge}</td>
<td>${summaryText}</td>
</tr>`;
  }).join("\n");

  // Progress bar
  const barWidth = 300;
  const doneWidth = total > 0 ? Math.round((done / total) * barWidth) : 0;
  const ipWidth = total > 0 ? Math.round((inProgress / total) * barWidth) : 0;

  const content = `
<h1>タスク状況ダッシュボード</h1>
<p>プロジェクトの全タスクの進捗状況を自動集計したダッシュボードです。</p>

<div class="card">
<h3>進捗概要</h3>
<p>合計: ${total}タスク / 完了: ${done} / 進行中: ${inProgress} / 未着手: ${todo}</p>
<p>完了率: ${pct}%</p>
<svg width="${barWidth + 2}" height="26" style="display:block;margin:8px 0" role="img" aria-label="タスク進捗: 完了${done}件、進行中${inProgress}件、未着手${todo}件（${pct}%）">
<rect x="1" y="1" width="${barWidth}" height="24" rx="4" fill="#333" stroke="#555"/>
<rect x="1" y="1" width="${doneWidth}" height="24" rx="4" fill="#4caf50"/>
${ipWidth > 0 ? `<rect x="${1 + doneWidth}" y="1" width="${ipWidth}" height="24" fill="#ff9800"/>` : ""}
</svg>
<p style="font-size:0.85em;color:#aaa">
<span style="color:#4caf50">■</span> 完了
<span style="color:#ff9800;margin-left:8px">■</span> 進行中
<span style="color:#333;margin-left:8px">■</span> 未着手
</p>
</div>

<div class="table-wrap"><table class="data-table">
<thead><tr><th>#</th><th>タスク名</th><th>状態</th><th>概要</th></tr></thead>
<tbody>
${rows}
</tbody>
</table></div>`;

  return layoutHtml("タスク状況", content, "..", summaryPages, "SOLAR LINE 考証プロジェクトのタスク進捗ダッシュボード", navEpisodes, metaPages);
}

/** Render an individual task page with full markdown content */
export function renderTaskPage(task: TaskDashboardEntry, markdownContent: string, summaryPages?: SiteManifest["summaryPages"], navEpisodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  const statusLabel = task.status === "DONE" ? "完了" : task.status === "IN_PROGRESS" ? "進行中" : "未着手";
  const statusClass = task.status === "DONE" ? "verdict-plausible" : task.status === "IN_PROGRESS" ? "verdict-conditional" : "verdict-indeterminate";

  const content = `
<h1>Task ${task.number}: ${escapeHtml(task.title)}</h1>
<p><span class="verdict ${statusClass}">${statusLabel}</span> <a href="../tasks.html">← タスク一覧</a></p>
<div class="card">${markdownToHtml(markdownContent)}</div>`;

  return layoutHtml(`Task ${task.number}`, content, "../..", summaryPages, `Task ${task.number}: ${task.title}`, navEpisodes, metaPages);
}

/** ADR entry for rendering */
export interface ADRRenderEntry {
  number: number;
  title: string;
  status: string;
  content: string;
  slug: string;
}

/** Render the ADR index page */
export function renderADRIndex(adrs: ADRRenderEntry[], summaryPages?: SiteManifest["summaryPages"], navEpisodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  const statusBadge = (status: string): string => {
    const s = status.toLowerCase();
    const cls = s === "accepted" ? "verdict-plausible"
      : s === "proposed" ? "verdict-implausible"
      : s === "superseded" ? "verdict-indeterminate"
      : "verdict-conditional";
    return `<span class="verdict ${cls}">${escapeHtml(status)}</span>`;
  };

  const rows = adrs.map(a =>
    `<tr><td>ADR-${String(a.number).padStart(3, "0")}</td><td><a href="${a.slug}.html">${escapeHtml(a.title)}</a></td><td>${statusBadge(a.status)}</td></tr>`
  ).join("\n");

  const proposed = adrs.filter(a => a.status.toLowerCase() === "proposed");
  const proposedSection = proposed.length > 0
    ? `<div class="card" style="border-color: var(--yellow); margin-bottom: 1.5rem;">
<h3 style="color: var(--yellow); margin-top: 0;">承認待ちの提案 (${proposed.length}件)</h3>
<ul>${proposed.map(a => `<li><a href="${a.slug}.html">ADR-${String(a.number).padStart(3, "0")}: ${escapeHtml(a.title)}</a></li>`).join("")}</ul>
<p style="font-size: 0.85em; color: #8b949e;">プロジェクトオーナーの確認・承認を待っています。</p>
</div>`
    : "";

  const content = `
<h1>設計意思決定記録（ADR）</h1>
<p>プロジェクトの設計判断を記録した ADR 一覧です。各 ADR は特定の設計上の決定とその理由を文書化しています。</p>
${proposedSection}
<div class="table-wrap"><table class="data-table">
<thead><tr><th>番号</th><th>タイトル</th><th>状態</th></tr></thead>
<tbody>
${rows}
</tbody>
</table></div>`;

  return layoutHtml("ADR 一覧", content, "../..", summaryPages, "SOLAR LINE 考証プロジェクトの設計判断記録", navEpisodes, metaPages);
}

/** Render an individual ADR page */
export function renderADRPage(adr: ADRRenderEntry, summaryPages?: SiteManifest["summaryPages"], navEpisodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  const content = `
<p><a href="index.html">← ADR 一覧</a></p>
<div class="card">${markdownToHtml(adr.content)}</div>`;

  return layoutHtml(`ADR-${String(adr.number).padStart(3, "0")}`, content, "../..", summaryPages, adr.title, navEpisodes, metaPages);
}

/** Idea entry for rendering */
export interface IdeaRenderEntry {
  title: string;
  content: string;
  slug: string;
}

/** Render the ideas index page */
export function renderIdeasIndex(ideas: IdeaRenderEntry[], summaryPages?: SiteManifest["summaryPages"], navEpisodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  const rows = ideas.map(i =>
    `<tr><td><a href="${i.slug}.html">${escapeHtml(i.title)}</a></td></tr>`
  ).join("\n");

  const content = `
<h1>アイデア・メモ</h1>
<p>今後の分析や機能拡張のアイデアを記録したメモ一覧です。</p>
<div class="table-wrap"><table class="data-table">
<thead><tr><th>タイトル</th></tr></thead>
<tbody>
${rows}
</tbody>
</table></div>`;

  return layoutHtml("アイデア一覧", content, "../..", summaryPages, "SOLAR LINE 考証プロジェクトのアイデア・メモ一覧", navEpisodes, metaPages);
}

/** Render an individual idea page */
export function renderIdeaPage(idea: IdeaRenderEntry, summaryPages?: SiteManifest["summaryPages"], navEpisodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  const content = `
<p><a href="index.html">← アイデア一覧</a></p>
<div class="card">${markdownToHtml(idea.content)}</div>`;

  return layoutHtml(idea.title, content, "../..", summaryPages, idea.title, navEpisodes, metaPages);
}

/** Render the DuckDB-WASM data explorer page */
export function renderExplorerPage(summaryPages?: SiteManifest["summaryPages"], navEpisodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  const content = `
<h1>データエクスプローラー</h1>
<p>DuckDB-WASM を使用して、SOLAR LINE 考証の全データを SQL で探索できます。</p>

<div class="card">
<div id="explorer-status" class="explorer-status">初期化中…</div>
</div>

<div class="card">
<h3>プリセットクエリ</h3>
<div id="explorer-presets" class="explorer-presets"></div>
</div>

<div class="card">
<h3>SQL クエリ</h3>
<div class="explorer-input-wrap">
<textarea id="explorer-query" class="explorer-query" rows="4" aria-label="SQLクエリ入力" placeholder="SELECT * FROM transfers LIMIT 10">SELECT episode, id, description, computedDeltaV AS dv_km_s, verdict FROM transfers ORDER BY episode, id</textarea>
<div class="explorer-actions">
<button id="explorer-exec" class="explorer-btn">実行 (Ctrl+Enter)</button>
<button id="explorer-schema" class="explorer-btn explorer-btn-secondary">スキーマ表示</button>
</div>
</div>
</div>

<div class="card">
<h3>テーブル一覧</h3>
<dl class="explorer-tables">
<dt><code>transfers</code></dt>
<dd>全エピソードの軌道遷移データ（id, episode, description, computedDeltaV, verdict, param_* 等）</dd>
<dt><code>dialogue</code></dt>
<dd>話者帰属済みの台詞データ（episode, speakerName, text, startMs, endMs 等）</dd>
<dt><code>dag_nodes</code></dt>
<dd>分析依存グラフのノード（id, label, type, status）</dd>
<dt><code>dag_edges</code></dt>
<dd>分析依存グラフのエッジ（from, to）</dd>
</dl>
</div>

<div id="explorer-chart" class="explorer-chart-area"></div>
<div id="explorer-result" class="explorer-result"></div>

<meta name="base-path" content="..">
<script type="importmap">{"imports":{"apache-arrow":"https://cdn.jsdelivr.net/npm/apache-arrow@17.0.0/+esm"}}</script>
<script type="module" src="../duckdb-explorer.js"></script>`;

  return layoutHtml("データエクスプローラー", content, "..", summaryPages, "DuckDB-WASM によるデータ探索ツール", navEpisodes, metaPages);
}

/** Render the standalone brachistochrone calculator page */
export function renderCalculatorPage(summaryPages?: SiteManifest["summaryPages"], navEpisodes?: NavEpisode[], metaPages?: SiteManifest["metaPages"]): string {
  // Build all-episode presets grouped by episode
  const episodeTabs: string[] = [];
  const episodePanels: string[] = [];
  for (const [epStr, config] of Object.entries(CALC_EPISODE_PRESETS)) {
    const ep = Number(epStr);
    const epNames: Record<number, string> = {
      1: "火星→ガニメデ", 2: "木星圏→土星", 3: "エンケラドス→タイタニア",
      4: "タイタニア→地球", 5: "天王星→地球",
    };
    episodeTabs.push(`<button class="calc-ep-tab${ep === 1 ? " active" : ""}" data-ep="${ep}" aria-selected="${ep === 1}">第${ep}話</button>`);
    const buttons = config.presets
      .map(p => `<button data-preset="${escapeHtml(p.key)}" class="calc-preset-btn">${escapeHtml(p.label)}</button>`)
      .join("\n    ");
    episodePanels.push(`<div class="calc-ep-panel${ep === 1 ? " active" : ""}" data-ep="${ep}" role="tabpanel">
    <p class="calc-ep-route">${escapeHtml(epNames[ep] || `第${ep}話`)}</p>
    ${buttons}
  </div>`);
  }

  const content = `
<h1>Brachistochrone 計算機</h1>
<p>ケストレル号の各エピソードの軌道遷移パラメータを自由に変更し、必要な加速度と&Delta;Vへの影響をリアルタイムで探索できます。</p>

<div class="card">
<h2>モデルの前提条件</h2>
<p>Brachistochrone（最速降下線）遷移は、宇宙船が経路の前半で加速し、中間点で反転して後半で減速する航法パターンです。以下の前提を置いています：</p>
<ul>
<li><strong>直線経路</strong> — 出発地と目的地を結ぶ直線上を移動</li>
<li><strong>中間点反転</strong> — 距離の半分で加速→減速を切り替え</li>
<li><strong>一定推力</strong> — 燃料消費による質量変化を無視（D-He³核融合パルスエンジンの高比推力 $I_{sp} \\approx 10^6$ s により推進剤消費は微小）</li>
<li><strong>重力無視</strong> — 太陽・惑星の重力は考慮しない（長距離遷移での近似）</li>
<li><strong>静止→静止遷移</strong> — 出発・到着時の相対速度ゼロ</li>
</ul>
<p>基本式: 加速度 $a = \\frac{4d}{t^2}$、&Delta;V $= \\frac{4d}{t}$（$d$: 距離、$t$: 時間）</p>
</div>

<div class="calc-section card" id="calculator" data-episode="1">
<h2>パラメータ入力 <span class="calc-badge" id="calc-engine-badge">エンジン: JS</span></h2>

<div class="calc-controls">
  <div class="calc-control">
    <label for="calc-distance">距離 (AU)</label>
    <input type="range" id="calc-distance-range" min="0.5" max="50" step="0.01" value="3.68" aria-label="距離 (AU)">
    <input type="number" id="calc-distance" min="0.1" max="50" step="0.01" value="3.68">
  </div>
  <div class="calc-control">
    <label for="calc-mass">船質量 (t)</label>
    <input type="range" id="calc-mass-range" min="10" max="100000" step="10" value="${NOMINAL_MASS_T}" aria-label="船質量 (t)">
    <input type="number" id="calc-mass" min="1" max="1000000" step="1" value="${NOMINAL_MASS_T}">
  </div>
  <div class="calc-control">
    <label for="calc-time">遷移時間 (h)</label>
    <input type="range" id="calc-time-range" min="1" max="5000" step="1" value="72" aria-label="遷移時間 (h)">
    <input type="number" id="calc-time" min="1" max="10000" step="1" value="72">
  </div>
  <div class="calc-control">
    <label for="calc-thrust">推力 (MN)</label>
    <input type="range" id="calc-thrust-range" min="0.01" max="15" step="0.01" value="${THRUST_MN}" aria-label="推力 (MN)">
    <input type="number" id="calc-thrust" min="0.01" max="100" step="0.01" value="${THRUST_MN}">
    <span id="calc-thrust-val" class="calc-badge" style="font-size:0.85em">${THRUST_MN} MN</span>
  </div>
</div>

<h3>エピソード別プリセット</h3>
<div class="calc-ep-tabs" role="tablist">
  ${episodeTabs.join("\n  ")}
</div>
<div class="calc-ep-panels">
  ${episodePanels.join("\n  ")}
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

<div class="card">
<h2>エピソード間の比較</h2>
<p>各エピソードの「作中描写」パラメータでの brachistochrone 要件を一覧で比較します。</p>
<table>
<thead>
<tr><th>EP</th><th>区間</th><th>距離 (AU)</th><th>時間 (h)</th><th>必要加速度 (G)</th><th>必要&Delta;V (km/s)</th></tr>
</thead>
<tbody id="calc-comparison-body">
</tbody>
</table>
</div>

<script type="application/json" id="calc-presets-data">${serializePresetsForClient()}</script>
<script type="module" src="../calculator.js"></script>
<script>
// Episode tab switching
document.addEventListener("DOMContentLoaded", function() {
  var tabs = document.querySelectorAll(".calc-ep-tab");
  var panels = document.querySelectorAll(".calc-ep-panel");
  tabs.forEach(function(tab) {
    tab.addEventListener("click", function() {
      tabs.forEach(function(t) { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
      panels.forEach(function(p) { p.classList.remove("active"); });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      var ep = tab.getAttribute("data-ep");
      var panel = document.querySelector('.calc-ep-panel[data-ep="' + ep + '"]');
      if (panel) panel.classList.add("active");
      // Update calculator data-episode attribute for WASM path resolution
      var calcEl = document.getElementById("calculator");
      if (calcEl) calcEl.setAttribute("data-episode", ep);
    });
  });

  // Cross-episode comparison table
  var KM_PER_AU = ${AU_KM};
  var G_KMS2 = ${G0_MS2}e-3;
  var comparisons = [
    { ep: 1, route: "火星→ガニメデ", distAU: 3.68, timeH: 72 },
    { ep: 2, route: "木星圏脱出", distAU: 4.32, timeH: 27 },
    { ep: 3, route: "エンケラドス→タイタニア", distAU: 9.62, timeH: 143 },
    { ep: 4, route: "タイタニア→地球", distAU: 18.2, timeH: 2520 },
    { ep: 5, route: "天王星→地球（複合）", distAU: 18.2, timeH: 507 },
  ];
  var tbody = document.getElementById("calc-comparison-body");
  if (tbody) {
    comparisons.forEach(function(c) {
      var dKm = c.distAU * KM_PER_AU;
      var tSec = c.timeH * 3600;
      var accel = 4 * dKm / (tSec * tSec);
      var dv = 4 * dKm / tSec;
      var accelG = accel / G_KMS2;
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>" + c.ep + "</td><td>" + c.route + "</td><td>" + c.distAU.toFixed(2) + "</td><td>" + c.timeH + "</td><td>" + accelG.toFixed(2) + "</td><td>" + dv.toFixed(0) + "</td>";
      tbody.appendChild(tr);
    });
  }
});
</script>`;

  return layoutHtml("Brachistochrone 計算機", content, "..", summaryPages, "ケストレル号のbrachistochrone遷移パラメータを自由に探索できるインタラクティブ計算機", navEpisodes, metaPages);
}
