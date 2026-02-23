/**
 * Minimal HTML template engine for static report generation.
 * No external dependencies — pure string interpolation.
 */

import type { EpisodeReport, SiteManifest, TransferAnalysis } from "./report-types.ts";

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
 * unordered lists (- ), and code blocks (```).
 * This is intentionally minimal — not a full Markdown parser.
 */
export function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const output: string[] = [];
  let inCodeBlock = false;
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        output.push("</code></pre>");
        inCodeBlock = false;
      } else {
        if (inList) { output.push("</ul>"); inList = false; }
        output.push("<pre><code>");
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      output.push(escapeHtml(line));
      continue;
    }

    // Empty line — close list if open
    if (line.trim() === "") {
      if (inList) { output.push("</ul>"); inList = false; }
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (inList) { output.push("</ul>"); inList = false; }
      const level = headingMatch[1].length;
      output.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Unordered list items
    if (line.match(/^[-*]\s+/)) {
      if (!inList) { output.push("<ul>"); inList = true; }
      output.push(`<li>${inlineFormat(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    // Paragraph
    if (inList) { output.push("</ul>"); inList = false; }
    output.push(`<p>${inlineFormat(line)}</p>`);
  }

  if (inList) output.push("</ul>");
  if (inCodeBlock) output.push("</code></pre>");

  return output.join("\n");
}

/** Apply inline formatting: bold, inline code */
function inlineFormat(text: string): string {
  let result = escapeHtml(text);
  // Inline code (must come before bold to avoid conflicts)
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Bold
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return result;
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
h1, h2, h3, h4 { color: #f0f6fc; margin: 1.5rem 0 0.5rem; }
h1 { font-size: 1.8rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
pre {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1rem;
  overflow-x: auto;
  margin: 1rem 0;
}
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
nav { margin-bottom: 2rem; }
nav a { margin-right: 1rem; }
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
`;

/** Wrap content in the common HTML layout */
export function layoutHtml(title: string, content: string, basePath: string = "."): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — SOLAR LINE 考察</title>
<style>${REPORT_CSS}</style>
</head>
<body>
<nav><a href="${basePath}/index.html">Top</a> <a href="${basePath}/logs/index.html">Session Logs</a></nav>
${content}
<footer>SOLAR LINE 考察 — Generated by <a href="https://claude.ai/code">Claude Code</a></footer>
</body>
</html>`;
}

/** Render the site index page */
export function renderIndex(manifest: SiteManifest): string {
  const episodeList = manifest.episodes.length > 0
    ? manifest.episodes.map(ep =>
        `<li><a href="${ep.path}">Episode ${ep.episode}: ${escapeHtml(ep.title)}</a> (${ep.transferCount} transfers)</li>`
      ).join("\n")
    : "<li>No episode reports yet.</li>";

  const content = `
<h1>SOLAR LINE 考察</h1>
<p>Astrodynamics analysis of orbital transfers depicted in SOLAR LINE.</p>

<h2>Episode Reports</h2>
<ul>
${episodeList}
</ul>

<h2>Session Logs</h2>
<p><a href="logs/index.html">View all session logs →</a></p>
<p><em>Generated: ${escapeHtml(manifest.generatedAt)}</em></p>`;

  return layoutHtml("Top", content);
}

/** Render a single transfer analysis card */
export function renderTransferCard(t: TransferAnalysis): string {
  const verdictClass = `verdict-${t.verdict}`;
  const dvComparison = t.claimedDeltaV !== null
    ? `<p>Claimed ΔV: <strong>${t.claimedDeltaV.toFixed(2)} km/s</strong> | Computed ΔV: <strong>${t.computedDeltaV.toFixed(2)} km/s</strong></p>`
    : `<p>Computed ΔV: <strong>${t.computedDeltaV.toFixed(2)} km/s</strong> (no explicit claim in episode)</p>`;

  const assumptionsList = t.assumptions.length > 0
    ? `<h4>Assumptions</h4>\n<ul>${t.assumptions.map(a => `<li>${escapeHtml(a)}</li>`).join("\n")}</ul>`
    : "";

  return `<div class="card" id="${escapeHtml(t.id)}">
<h3>${escapeHtml(t.description)} <span class="verdict ${verdictClass}">${t.verdict}</span></h3>
<p>Episode ${t.episode} @ ${escapeHtml(t.timestamp)}</p>
${dvComparison}
${assumptionsList}
<p>${escapeHtml(t.explanation)}</p>
</div>`;
}

/** Render the interactive brachistochrone calculator widget */
export function renderCalculator(): string {
  return `<div class="calc-section card" id="calculator">
<h2>Interactive Brachistochrone Calculator <span class="calc-badge" id="calc-engine-badge">Engine: JS</span></h2>
<p>Explore how distance, ship mass, and transfer time affect the required acceleration and &Delta;V.</p>
<p class="calc-assumptions">Assumptions: straight-line path, accelerate-flip-decelerate at midpoint, constant thrust, no gravity, rest-to-rest transfer.</p>

<div class="calc-controls">
  <div class="calc-control">
    <label for="calc-distance">Distance</label>
    <input type="range" id="calc-distance-range" min="0.5" max="10" step="0.01" value="3.68">
    <input type="number" id="calc-distance" min="0.1" max="50" step="0.01" value="3.68">
  </div>
  <div class="calc-control">
    <label for="calc-mass">Ship mass</label>
    <input type="range" id="calc-mass-range" min="10" max="100000" step="10" value="48000">
    <input type="number" id="calc-mass" min="1" max="1000000" step="1" value="48000">
  </div>
  <div class="calc-control">
    <label for="calc-time">Transfer time</label>
    <input type="range" id="calc-time-range" min="1" max="500" step="1" value="72">
    <input type="number" id="calc-time" min="1" max="10000" step="1" value="72">
  </div>
</div>

<div class="calc-presets">
  <button id="preset-ep01_canonical">Ep.1 canonical (48,000t, 72h)</button>
  <button id="preset-ep01_150h">Normal route (150h)</button>
  <button id="preset-mass_48t">If mass = 48 t</button>
  <button id="preset-mass_4800t">If mass = 4,800 t</button>
</div>

<div class="calc-results">
<table>
  <tr><th colspan="2">Transfer Requirements</th><th colspan="2">Ship Capability (Kestrel, 9.8 MN)</th></tr>
  <tr>
    <td>Required accel</td><td id="res-req-accel">—</td>
    <td>Ship accel</td><td id="res-ship-accel">—</td>
  </tr>
  <tr>
    <td>Required &Delta;V</td><td id="res-req-dv">—</td>
    <td>Ship &Delta;V budget</td><td id="res-ship-dv">—</td>
  </tr>
  <tr>
    <td>Distance</td><td><span id="calc-distance-val">—</span></td>
    <td>Reachable distance</td><td id="res-ship-reach">—</td>
  </tr>
  <tr>
    <td>Accel gap</td><td class="result-gap" id="res-accel-ratio">—</td>
    <td>&Delta;V gap</td><td class="result-gap" id="res-dv-ratio">—</td>
  </tr>
</table>
<p style="margin-top:0.75rem">Verdict: <span id="res-verdict" class="verdict verdict-indeterminate">—</span></p>
</div>
</div>
<script type="module" src="../calculator.js"></script>`;
}

/** Render a full episode report page */
export function renderEpisode(report: EpisodeReport): string {
  const cards = report.transfers.map(renderTransferCard).join("\n");
  const calculator = renderCalculator();

  const content = `
<h1>Episode ${report.episode}: ${escapeHtml(report.title)}</h1>
<p>${escapeHtml(report.summary)}</p>

<h2>Orbital Transfer Analysis</h2>
${report.transfers.length > 0 ? cards : "<p>No transfers analyzed yet.</p>"}

${calculator}`;

  return layoutHtml(`Episode ${report.episode}`, content, "..");
}

/** Render the session logs index page */
export function renderLogsIndex(logs: SiteManifest["logs"]): string {
  const logList = logs.length > 0
    ? logs.map(log =>
        `<li><a href="${log.filename}.html">${escapeHtml(log.date)}</a> — ${escapeHtml(log.description)}</li>`
      ).join("\n")
    : "<li>No session logs yet.</li>";

  const content = `
<h1>Session Logs</h1>
<p>Claude Code session logs from the analysis process.</p>
<ul>
${logList}
</ul>`;

  return layoutHtml("Session Logs", content, "..");
}

/** Render a single session log page */
export function renderLogPage(filename: string, date: string, markdownContent: string): string {
  const htmlContent = markdownToHtml(markdownContent);
  const content = `
<h1>Session Log: ${escapeHtml(date)}</h1>
<div class="card">
${htmlContent}
</div>`;

  return layoutHtml(`Log ${date}`, content, "..");
}
