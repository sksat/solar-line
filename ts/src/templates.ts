/**
 * Minimal HTML template engine for static report generation.
 * No external dependencies — pure string interpolation.
 */

import type { EpisodeReport, SiteManifest, TransferAnalysis, VideoCard, DialogueQuote, ParameterExploration, ExplorationScenario, SourceCitation, OrbitalDiagram, OrbitDefinition, TransferArc, AnimationConfig } from "./report-types.ts";

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
  min-width: 4rem;
  text-align: right;
}
.ship-marker { filter: drop-shadow(0 0 3px rgba(255,255,255,0.6)); }
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
<nav><a href="${basePath}/index.html">トップ</a> <a href="${basePath}/logs/index.html">セッションログ</a></nav>
${content}
<footer>SOLAR LINE 考察 — <a href="https://claude.ai/code">Claude Code</a> により生成</footer>
</body>
</html>`;
}

/** Render the site index page */
export function renderIndex(manifest: SiteManifest): string {
  const episodeList = manifest.episodes.length > 0
    ? manifest.episodes.map(ep =>
        `<li><a href="${ep.path}">第${ep.episode}話: ${escapeHtml(ep.title)}</a>（${ep.transferCount}件の軌道遷移）</li>`
      ).join("\n")
    : "<li>エピソードレポートはまだありません。</li>";

  const content = `
<h1>SOLAR LINE 考察</h1>
<p>SOLAR LINE に描かれた軌道遷移の宇宙力学的分析。</p>

<h2>エピソードレポート</h2>
<ul>
${episodeList}
</ul>

<h2>セッションログ</h2>
<p><a href="logs/index.html">すべてのセッションログを見る →</a></p>
<p><em>生成日時: ${escapeHtml(manifest.generatedAt)}</em></p>`;

  return layoutHtml("トップ", content);
}

/** Map verdict to Japanese label */
function verdictLabel(v: TransferAnalysis["verdict"]): string {
  switch (v) {
    case "plausible": return "妥当";
    case "implausible": return "非現実的";
    case "conditional": return "条件付き";
    case "indeterminate": return "判定不能";
  }
}

/** Render source citations */
function renderSources(sources: SourceCitation[]): string {
  if (sources.length === 0) return "";
  const items = sources.map(s =>
    `<dt>${escapeHtml(s.claim)}</dt><dd>${escapeHtml(s.sourceLabel)}</dd>`
  ).join("\n");
  return `<dl class="sources-list"><dt style="color:var(--accent);margin-bottom:0.2rem">出典</dt>${items}</dl>`;
}

/** Render inline citations from evidence quotes */
function renderInlineCitations(quotes: DialogueQuote[]): string {
  if (quotes.length === 0) return "";
  const citations = quotes.map(q =>
    `<span class="inline-citation">${escapeHtml(q.speaker)}「${escapeHtml(q.text)}」<span class="timestamp">(${escapeHtml(q.timestamp)})</span></span>`
  ).join("　");
  return `<p class="evidence-citations">${citations}</p>`;
}

/** Render a single transfer analysis card */
export function renderTransferCard(t: TransferAnalysis, inlineQuotes?: DialogueQuote[]): string {
  const verdictClass = `verdict-${t.verdict}`;
  const dvComparison = t.claimedDeltaV !== null && t.computedDeltaV !== null
    ? `<p>作中のΔV: <strong>${t.claimedDeltaV.toFixed(2)} km/s</strong> | 計算値: <strong>${t.computedDeltaV.toFixed(2)} km/s</strong></p>`
    : t.computedDeltaV !== null
      ? `<p>計算ΔV: <strong>${t.computedDeltaV.toFixed(2)} km/s</strong>（作中で明示されず）</p>`
      : `<p>（ΔVは単一のスカラー値として表現不可 — 詳細は下記分析を参照）</p>`;

  const citationsHtml = inlineQuotes && inlineQuotes.length > 0
    ? renderInlineCitations(inlineQuotes)
    : "";

  const assumptionsList = t.assumptions.length > 0
    ? `<h4>前提条件</h4>\n<ul>${t.assumptions.map(a => `<li>${escapeHtml(a)}</li>`).join("\n")}</ul>`
    : "";

  const sourcesHtml = t.sources && t.sources.length > 0 ? renderSources(t.sources) : "";

  return `<div class="card" id="${escapeHtml(t.id)}">
<h3>${escapeHtml(t.description)} <span class="verdict ${verdictClass}">${verdictLabel(t.verdict)}</span></h3>
<p>第${t.episode}話 @ ${escapeHtml(t.timestamp)}</p>
${dvComparison}
${citationsHtml}
${assumptionsList}
<p>${escapeHtml(t.explanation)}</p>
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
export function renderDialogueQuote(q: DialogueQuote): string {
  return `<div class="dialogue-quote" id="${escapeHtml(q.id)}">
<span class="speaker">${escapeHtml(q.speaker)}</span>「${escapeHtml(q.text)}」<span class="timestamp">(${escapeHtml(q.timestamp)})</span>
</div>`;
}

/** Render a list of dialogue quotes as a section */
export function renderDialogueQuotes(quotes: DialogueQuote[]): string {
  if (quotes.length === 0) return "";
  return `<h2>主要な台詞</h2>\n${quotes.map(renderDialogueQuote).join("\n")}`;
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
    const displayVal = b.value >= 1000 ? b.value.toExponential(2) : b.value.toFixed(2);
    const truncatedLabel = truncateLabel(b.label, 20);
    return `<text x="${labelWidth - 8}" y="${y + barHeight / 2 + 4}" fill="var(--fg)" text-anchor="end" font-size="11">${escapeHtml(truncatedLabel)}</text>
<rect x="${labelWidth}" y="${y}" width="${width}" height="${barHeight}" rx="3" fill="${color}" opacity="0.85"/>
<text x="${labelWidth + width + 6}" y="${y + barHeight / 2 + 4}" fill="var(--fg)" font-size="11">${displayVal} ${escapeHtml(unit)}</text>`;
  }).join("\n");

  return `<div class="dv-chart card">
<h4>${escapeHtml(title)}</h4>
<svg viewBox="0 0 ${chartWidth} ${svgHeight}" width="100%" xmlns="http://www.w3.org/2000/svg">
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

  // Draw transfer arcs
  const transferPaths = diagram.transfers.map(t => {
    const fromOrbit = orbitMap.get(t.fromOrbitId);
    const toOrbit = orbitMap.get(t.toOrbitId);
    if (!fromOrbit || !toOrbit) return "";
    const fromPx = orbitPxMap.get(t.fromOrbitId)!;
    const toPx = orbitPxMap.get(t.toOrbitId)!;
    const pathD = transferArcPath(t.style, fromOrbit, toOrbit, fromPx, toPx);
    const dashArray = t.style === "brachistochrone" ? ' stroke-dasharray="8 4"' : "";
    const arrowId = `arrow-${escapeHtml(t.fromOrbitId)}-${escapeHtml(t.toOrbitId)}`;
    const transferPathAttr = isAnimated ? ` data-transfer-path="${escapeHtml(t.fromOrbitId)}-${escapeHtml(t.toOrbitId)}"` : "";
    return `<path d="${pathD}" fill="none" stroke="${t.color}" stroke-width="2"${dashArray}${transferPathAttr} marker-end="url(#${arrowId})"/>
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

  // Build legend
  const styles = [...new Set(diagram.transfers.map(t => t.style))];
  const legendItems = styles.map((s, i) => {
    const y = i * 18;
    const dash = s === "brachistochrone" ? ' stroke-dasharray="6 3"' : "";
    const color = diagram.transfers.find(t => t.style === s)?.color ?? "var(--fg)";
    return `<line x1="0" y1="${y + 6}" x2="20" y2="${y + 6}" stroke="${color}" stroke-width="2"${dash}/>
    <text x="24" y="${y + 10}" fill="var(--fg)" font-size="10">${transferStyleLabel(s)}</text>`;
  }).join("\n    ");

  const legendHeight = styles.length * 18 + 4;

  const svg = `<svg width="${size}" height="${size + legendHeight + 10}" viewBox="${-cx} ${-cy} ${size} ${size + legendHeight + 10}" xmlns="http://www.w3.org/2000/svg">
  <style>text { font-family: "SFMono-Regular", Consolas, monospace; }</style>
  <g>
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
  </g>

  <!-- Legend -->
  <g transform="translate(${-cx + 10}, ${cy + 10})">
    ${legendItems}
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
      transfers: diagram.transfers
        .filter(t => t.startTime !== undefined && t.endTime !== undefined)
        .map(t => ({
          fromOrbitId: t.fromOrbitId,
          toOrbitId: t.toOrbitId,
          startTime: t.startTime!,
          endTime: t.endTime!,
          color: t.color,
          pathId: `${t.fromOrbitId}-${t.toOrbitId}`,
        })),
    };
    animationHtml = `
<script type="application/json" class="orbital-animation-data">${JSON.stringify(animData)}</script>
<div class="orbital-animation-controls">
  <button class="anim-play" title="再生/一時停止">▶</button>
  <input type="range" class="anim-slider" min="0" max="1000" value="0" step="1">
  <span class="time-display">0h</span>
</div>`;
  }

  const animAttr = diagram.animation ? ' data-animated="true"' : "";
  return `<div class="card orbital-diagram" id="${escapeHtml(diagram.id)}"${animAttr}>
<h4>${escapeHtml(diagram.title)}</h4>
${svg}${animationHtml}
</div>`;
}

/** Render all orbital diagrams for an episode */
export function renderOrbitalDiagrams(diagrams: OrbitalDiagram[]): string {
  if (diagrams.length === 0) return "";
  return `<h2>軌道遷移図</h2>\n${diagrams.map(renderOrbitalDiagram).join("\n")}`;
}

/** Render the interactive brachistochrone calculator widget */
export function renderCalculator(): string {
  return `<div class="calc-section card" id="calculator">
<h2>Brachistochrone 計算機 <span class="calc-badge" id="calc-engine-badge">エンジン: JS</span></h2>
<p>距離・船質量・遷移時間を変えて、必要な加速度と&Delta;Vへの影響を探索できます。</p>
<p class="calc-assumptions">前提: 直線経路、中間点で加速反転減速、一定推力、重力無視、静止→静止遷移。</p>

<div class="calc-controls">
  <div class="calc-control">
    <label for="calc-distance">距離</label>
    <input type="range" id="calc-distance-range" min="0.5" max="10" step="0.01" value="3.68">
    <input type="number" id="calc-distance" min="0.1" max="50" step="0.01" value="3.68">
  </div>
  <div class="calc-control">
    <label for="calc-mass">船質量</label>
    <input type="range" id="calc-mass-range" min="10" max="100000" step="10" value="48000">
    <input type="number" id="calc-mass" min="1" max="1000000" step="1" value="48000">
  </div>
  <div class="calc-control">
    <label for="calc-time">遷移時間</label>
    <input type="range" id="calc-time-range" min="1" max="500" step="1" value="72">
    <input type="number" id="calc-time" min="1" max="10000" step="1" value="72">
  </div>
</div>

<div class="calc-presets">
  <button id="preset-ep01_canonical">第1話 基準値 (48,000t, 72h)</button>
  <button id="preset-ep01_150h">通常ルート (150h)</button>
  <button id="preset-mass_48t">質量 = 48 t の場合</button>
  <button id="preset-mass_4800t">質量 = 4,800 t の場合</button>
</div>

<div class="calc-results">
<table>
  <tr><th colspan="2">遷移の要件</th><th colspan="2">船の性能 (ケストレル号, 9.8 MN)</th></tr>
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
    .map(([_k, v]) => `<td>${typeof v === "number" ? (v >= 1000 ? v.toExponential(2) : v.toFixed(2)) : v}</td>`)
    .join("");
  return `<tr class="${cls}"><td>${icon} ${escapeHtml(s.label)}</td><td>${s.variedValue.toLocaleString()} ${escapeHtml(s.variedUnit)}</td>${resultCells}<td>${escapeHtml(s.note)}</td></tr>`;
}

/** Render a parameter exploration section */
export function renderExploration(exp: ParameterExploration): string {
  const boundary = exp.boundaryCondition
    ? `<p class="boundary">${escapeHtml(exp.boundaryCondition)}</p>`
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
    .filter(t => t.computedDeltaV > 0)
    .map(t => ({
      label: t.description,
      value: t.computedDeltaV,
      color: t.verdict === "plausible" ? "var(--green)" : t.verdict === "implausible" ? "var(--red)" : t.verdict === "conditional" ? "#8957e5" : "var(--yellow)",
    }));
  return renderBarChart("ΔV 比較", chartBars, "km/s");
}

/** Render a full episode report page */
export function renderEpisode(report: EpisodeReport): string {
  const videoSection = report.videoCards && report.videoCards.length > 0
    ? renderVideoCards(report.videoCards)
    : "";
  const dialogueSection = report.dialogueQuotes && report.dialogueQuotes.length > 0
    ? renderDialogueQuotes(report.dialogueQuotes)
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

    const transferHtml = renderTransferCard(t, inlineQuotes);

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

  const diagramSection = report.diagrams && report.diagrams.length > 0
    ? renderOrbitalDiagrams(report.diagrams)
    : "";
  const calculator = renderCalculator();

  const content = `
<h1>第${report.episode}話: ${escapeHtml(report.title)}</h1>
${videoSection}
<p>${escapeHtml(report.summary)}</p>

${dialogueSection}

${dvChart}

${diagramSection}

<h2>軌道遷移分析</h2>
${report.transfers.length > 0 ? cards : "<p>分析された軌道遷移はまだありません。</p>"}

${unlinkedSection}

${calculator}`;

  // Include animation script if any diagram is animated
  const hasAnimatedDiagrams = report.diagrams?.some(d => d.animation) ?? false;
  const animScript = hasAnimatedDiagrams ? '\n<script src="../orbital-animation.js"></script>' : "";

  return layoutHtml(`第${report.episode}話`, content + animScript, "..");
}

/** Render the session logs index page */
export function renderLogsIndex(logs: SiteManifest["logs"]): string {
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

  return layoutHtml("セッションログ", content, "..");
}

/** Render a single session log page */
export function renderLogPage(filename: string, date: string, markdownContent: string): string {
  const htmlContent = markdownToHtml(markdownContent);
  const content = `
<h1>セッションログ: ${escapeHtml(date)}</h1>
<div class="card">
${htmlContent}
</div>`;

  return layoutHtml(`ログ ${date}`, content, "..");
}
