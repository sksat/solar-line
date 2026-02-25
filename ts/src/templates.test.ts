import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  escapeHtml,
  markdownToHtml,
  layoutHtml,
  renderIndex,
  renderEpisode,
  renderTransferCard,
  renderTransferSummaryCard,
  renderTransferDetailPage,
  renderCalculator,
  renderVideoCard,
  renderVideoCards,
  renderDialogueQuote,
  renderDialogueQuotes,
  renderBarChart,
  renderExploration,
  renderLogsIndex,
  renderLogPage,
  renderOrbitalDiagram,
  renderOrbitalDiagrams,
  renderComparisonTable,
  renderSummaryPage,
  renderEventTimeline,
  renderVerificationTable,
  formatNumericValue,
  autoLinkEpisodeRefs,
  renderEpisodeNav,
  renderTranscriptionPage,
  renderTranscriptionIndex,
  renderTaskDashboard,
  formatTimestamp,
  parseTimestamp,
  timestampLink,
  renderTimeSeriesChart,
  renderTimeSeriesCharts,
  renderExplorerPage,
  renderADRIndex,
  REPORT_CSS,
  renderGlossary,
  wrapGlossaryTerms,
} from "./templates.ts";
import type { ADRRenderEntry } from "./templates.ts";
import type { EpisodeReport, SiteManifest, TranscriptionPageData, TransferAnalysis, TransferDetailPage, VideoCard, DialogueQuote, ParameterExploration, OrbitalDiagram, AnimationConfig, ScaleLegend, TimelineAnnotation, ComparisonTable, SummaryReport, VerdictCounts, EventTimeline, VerificationTable, TimeSeriesChart, GlossaryTerm } from "./report-types.ts";

// --- escapeHtml ---

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    assert.equal(escapeHtml('<script>alert("xss")</script>'), "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
  });

  it("escapes ampersands and single quotes", () => {
    assert.equal(escapeHtml("A & B's"), "A &amp; B&#39;s");
  });

  it("returns empty string unchanged", () => {
    assert.equal(escapeHtml(""), "");
  });

  it("leaves safe text unchanged", () => {
    assert.equal(escapeHtml("Hello World 123"), "Hello World 123");
  });
});

// --- markdownToHtml ---

describe("markdownToHtml", () => {
  it("converts headings", () => {
    const html = markdownToHtml("# Title\n## Subtitle");
    assert.ok(html.includes("<h1>Title</h1>"));
    assert.ok(html.includes("<h2>Subtitle</h2>"));
  });

  it("converts paragraphs", () => {
    const html = markdownToHtml("Hello world");
    assert.ok(html.includes("<p>Hello world</p>"));
  });

  it("converts bold text", () => {
    const html = markdownToHtml("This is **bold** text");
    assert.ok(html.includes("<strong>bold</strong>"));
  });

  it("converts inline code", () => {
    const html = markdownToHtml("Use `foo()` here");
    assert.ok(html.includes("<code>foo()</code>"));
  });

  it("converts unordered lists", () => {
    const html = markdownToHtml("- item 1\n- item 2");
    assert.ok(html.includes("<ul>"));
    assert.ok(html.includes("<li>item 1</li>"));
    assert.ok(html.includes("<li>item 2</li>"));
    assert.ok(html.includes("</ul>"));
  });

  it("converts code blocks", () => {
    const html = markdownToHtml("```\nconst x = 1;\n```");
    assert.ok(html.includes("<pre><code>"));
    assert.ok(html.includes("const x = 1;"));
    assert.ok(html.includes("</code></pre>"));
  });

  it("escapes HTML in code blocks", () => {
    const html = markdownToHtml("```\n<div>test</div>\n```");
    assert.ok(html.includes("&lt;div&gt;test&lt;/div&gt;"));
  });

  it("extracts language class from fenced code blocks", () => {
    const html = markdownToHtml("```typescript\nconst x = 1;\n```");
    assert.ok(html.includes('<code class="language-typescript">'));
    assert.ok(html.includes("const x = 1;"));
  });

  it("handles code blocks without language tag", () => {
    const html = markdownToHtml("```\nplain text\n```");
    assert.ok(html.includes("<pre><code>"));
    assert.ok(!html.includes('class="language-'));
  });

  it("escapes language tag in code blocks", () => {
    const html = markdownToHtml('```foo<script>\nalert(1)\n```');
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  });

  it("handles empty input", () => {
    assert.equal(markdownToHtml(""), "");
  });

  it("converts ordered lists", () => {
    const html = markdownToHtml("1. first\n2. second\n3. third");
    assert.ok(html.includes("<ol>"));
    assert.ok(html.includes("<li>first</li>"));
    assert.ok(html.includes("<li>second</li>"));
    assert.ok(html.includes("<li>third</li>"));
    assert.ok(html.includes("</ol>"));
  });

  it("does not mix ordered and unordered lists", () => {
    const html = markdownToHtml("- bullet\n\n1. numbered");
    assert.ok(html.includes("<ul>"));
    assert.ok(html.includes("<li>bullet</li>"));
    assert.ok(html.includes("</ul>"));
    assert.ok(html.includes("<ol>"));
    assert.ok(html.includes("<li>numbered</li>"));
    assert.ok(html.includes("</ol>"));
  });

  it("closes ordered list on empty line", () => {
    const html = markdownToHtml("1. item\n\nParagraph");
    assert.ok(html.includes("</ol>"));
    assert.ok(html.includes("<p>Paragraph</p>"));
  });

  it("closes ordered list before heading", () => {
    const html = markdownToHtml("1. item\n## Heading");
    assert.ok(html.includes("</ol>"));
    assert.ok(html.includes("<h2>Heading</h2>"));
  });

  it("handles inline formatting in ordered list items", () => {
    const html = markdownToHtml("1. this is **bold** and `code`");
    assert.ok(html.includes("<strong>bold</strong>"));
    assert.ok(html.includes("<code>code</code>"));
  });

  it("switches from unordered to ordered list", () => {
    const html = markdownToHtml("- bullet\n1. numbered");
    assert.ok(html.includes("</ul>"));
    assert.ok(html.includes("<ol>"));
  });

  it("switches from ordered to unordered list", () => {
    const html = markdownToHtml("1. numbered\n- bullet");
    assert.ok(html.includes("</ol>"));
    assert.ok(html.includes("<ul>"));
  });
  it("preserves inline math $...$ delimiters through HTML escaping", () => {
    const html = markdownToHtml("The formula $E = mc^2$ is famous");
    assert.ok(html.includes("$E = mc^2$"), "inline math should be preserved");
    assert.ok(!html.includes("&amp;"), "math content should not be HTML-escaped");
  });

  it("preserves display math $$...$$ on standalone line", () => {
    const html = markdownToHtml("$$\\Delta V = \\sqrt{\\frac{2\\mu}{r}}$$");
    assert.ok(html.includes("$$\\Delta V = \\sqrt{\\frac{2\\mu}{r}}$$"), "display math should be preserved");
  });

  it("preserves inline math in paragraphs with other formatting", () => {
    const html = markdownToHtml("When **thrust** $F \\geq 9.8$ MN");
    assert.ok(html.includes("<strong>thrust</strong>"));
    assert.ok(html.includes("$F \\geq 9.8$"));
  });

  it("preserves math in list items", () => {
    const html = markdownToHtml("- velocity $v = 13.06$ km/s");
    assert.ok(html.includes("$v = 13.06$"));
    assert.ok(html.includes("<li>"));
  });

  it("preserves math in headings", () => {
    const html = markdownToHtml("## The $\\Delta V$ Budget");
    assert.ok(html.includes("$\\Delta V$"));
    assert.ok(html.includes("<h2>"));
  });

  it("does not treat single $ as math delimiter", () => {
    const html = markdownToHtml("Price is $100 or $200");
    // No matching pair across the text that makes sense — but $100 or $ alone should work
    assert.ok(html.includes("$100 or $"));
  });

  it("handles multiple inline math expressions", () => {
    const html = markdownToHtml("$a = 1$ and $b = 2$");
    assert.ok(html.includes("$a = 1$"));
    assert.ok(html.includes("$b = 2$"));
  });

  it("does not extract math from inside code blocks", () => {
    const html = markdownToHtml("```\n$x = 1$\n```");
    // Inside code blocks, $ should be escaped
    assert.ok(html.includes("<pre><code>"));
  });

  it("converts markdown table with header", () => {
    const md = "| Name | Value |\n| --- | --- |\n| foo | 42 |\n| bar | 99 |";
    const html = markdownToHtml(md);
    assert.ok(html.includes("<table>"), "should produce <table>");
    assert.ok(html.includes("<thead>"), "should have thead");
    assert.ok(html.includes("<th>Name</th>"), "should have header cell");
    assert.ok(html.includes("<th>Value</th>"), "should have header cell");
    assert.ok(html.includes("<td>foo</td>"), "should have data cell");
    assert.ok(html.includes("<td>42</td>"), "should have data cell");
    assert.ok(html.includes("<td>bar</td>"));
    assert.ok(html.includes("<td>99</td>"));
    assert.ok(!html.includes("|"), "should not contain raw pipe characters");
  });

  it("converts markdown table without header separator", () => {
    const md = "| a | b |\n| c | d |";
    const html = markdownToHtml(md);
    assert.ok(html.includes("<table>"));
    assert.ok(!html.includes("<thead>"), "no separator means no thead");
    assert.ok(html.includes("<td>a</td>"));
    assert.ok(html.includes("<td>d</td>"));
  });

  it("applies inline formatting inside table cells", () => {
    const md = "| Header |\n| --- |\n| **bold** `code` |";
    const html = markdownToHtml(md);
    assert.ok(html.includes("<strong>bold</strong>"));
    assert.ok(html.includes("<code>code</code>"));
  });

  it("handles table followed by paragraph", () => {
    const md = "| a | b |\n| - | - |\n| 1 | 2 |\n\nParagraph after table.";
    const html = markdownToHtml(md);
    assert.ok(html.includes("<table>"));
    assert.ok(html.includes("</table>"));
    assert.ok(html.includes("<p>Paragraph after table.</p>"));
  });

  it("handles math inside table cells", () => {
    const md = "| Param | Formula |\n| --- | --- |\n| ΔV | $v = \\sqrt{2}$ |";
    const html = markdownToHtml(md);
    assert.ok(html.includes("<table>"));
    assert.ok(html.includes("$v = \\sqrt{2}$"), "math should be preserved in cells");
  });

  // --- Math rendering regression tests (Task 132) ---

  it("preserves trailing-space math like $expr = $", () => {
    const html = markdownToHtml("$9.62/3.68 = $ **2.61倍**");
    assert.ok(html.includes("$9.62/3.68 = $"), "trailing-space math should be preserved");
    assert.ok(html.includes("<strong>2.61倍</strong>"), "bold after math should render");
  });

  it("handles adjacent math-then-bold without space", () => {
    const html = markdownToHtml("$\\Delta V$比: $11{,}165/8{,}497 = $ **1.31倍**");
    assert.ok(html.includes("$\\Delta V$"), "first inline math");
    assert.ok(html.includes("$11{,}165/8{,}497 = $"), "second inline math with comma braces");
    assert.ok(html.includes("<strong>1.31倍</strong>"), "bold after math");
  });

  it("handles sequential $= $ patterns without cross-matching", () => {
    const html = markdownToHtml("$= $ 距離比 $= 2.61/1.99 = $ **1.31**");
    // Should produce two separate math expressions, not one giant span
    assert.ok(html.includes("$= $"), "first math expression");
    assert.ok(html.includes("$= 2.61/1.99 = $"), "second math expression");
    assert.ok(html.includes("距離比"), "Japanese text between math should be present");
  });

  it("preserves math with nested frac braces", () => {
    const html = markdownToHtml("$\\frac{F \\cdot t^2}{4d} \\approx 299$");
    assert.ok(html.includes("$\\frac{F \\cdot t^2}{4d} \\approx 299$"));
  });

  it("preserves math with sqrt and parentheses", () => {
    const html = markdownToHtml("$\\sqrt{\\mu/(R+h)} \\approx 7.67$ km/s");
    assert.ok(html.includes("$\\sqrt{\\mu/(R+h)} \\approx 7.67$"));
  });

  it("preserves math with thousands separator {,}", () => {
    const html = markdownToHtml("$m \\leq 3{,}929$ t");
    assert.ok(html.includes("$m \\leq 3{,}929$"));
  });

  it("preserves math with \\text{} command", () => {
    const html = markdownToHtml("$v_{\\text{esc}} = 2.74$ km/s");
    assert.ok(html.includes("$v_{\\text{esc}} = 2.74$"));
  });

  it("preserves display math with complex expression", () => {
    const html = markdownToHtml("$$\\Delta V = \\sqrt{\\frac{2\\mu}{r_1}} \\left(1 - \\sqrt{\\frac{r_1}{r_1 + r_2}}\\right)$$");
    assert.ok(html.includes("$$\\Delta V = \\sqrt{\\frac{2\\mu}{r_1}}"), "complex display math should be preserved");
  });

  it("preserves multiple display math blocks separated by text", () => {
    const html = markdownToHtml("$$a = b$$\n\nSome text\n\n$$c = d$$");
    assert.ok(html.includes("$$a = b$$"), "first display math");
    assert.ok(html.includes("$$c = d$$"), "second display math");
    assert.ok(html.includes("Some text"), "text between");
  });

  it("handles multi-line display math ($$...\\n...\\n...$$)", () => {
    // Display math that spans multiple lines
    const html = markdownToHtml("$$\n\\Delta V = \\sqrt{2}\n$$");
    // Should contain the math content for KaTeX to render
    assert.ok(html.includes("\\Delta V = \\sqrt{2}"), "multi-line display math content should be present");
  });

  it("does not match $ in inline code as math delimiter", () => {
    const html = markdownToHtml("Use `$variable` in your code and $x = 1$ for math");
    assert.ok(html.includes("<code>$variable</code>"), "inline code with $ preserved");
    assert.ok(html.includes("$x = 1$"), "math after code preserved");
  });

  it("handles math immediately after Japanese text", () => {
    const html = markdownToHtml("推力$F = 9.8 \\times 10^6$Nで加速");
    assert.ok(html.includes("$F = 9.8 \\times 10^6$"), "math adjacent to Japanese text");
  });

  it("preserves math with subscript/superscript notation", () => {
    const html = markdownToHtml("$v_1 = 13.06$ km/s, $a_{max} = 0.032$ m/s²");
    assert.ok(html.includes("$v_1 = 13.06$"), "subscript math");
    assert.ok(html.includes("$a_{max} = 0.032$"), "complex subscript math");
  });

  it("preserves math with inequality operators that could be HTML", () => {
    const html = markdownToHtml("$F \\geq 9.8$ MN and $v < 10^3$ km/s");
    assert.ok(html.includes("$F \\geq 9.8$"), "geq preserved");
    assert.ok(html.includes("$v < 10^3$"), "less-than in math preserved (not HTML-escaped)");
  });

  it("does not HTML-escape content inside math delimiters", () => {
    const html = markdownToHtml("$a < b$ and $c > d$");
    assert.ok(!html.includes("&lt;"), "< inside math should NOT be HTML-escaped");
    assert.ok(!html.includes("&gt;"), "> inside math should NOT be HTML-escaped");
  });

  it("handles display math with aligned environment", () => {
    const html = markdownToHtml("$$\\begin{aligned} a &= b \\\\ c &= d \\end{aligned}$$");
    assert.ok(html.includes("\\begin{aligned}"), "aligned environment preserved");
    assert.ok(html.includes("\\end{aligned}"), "aligned close preserved");
  });
});

// --- layoutHtml ---

describe("layoutHtml", () => {
  it("wraps content in full HTML document", () => {
    const html = layoutHtml("Test Page", "<p>Hello</p>");
    assert.ok(html.includes("<!DOCTYPE html>"));
    assert.ok(html.includes("<html lang=\"ja\">"));
    assert.ok(html.includes("Test Page — SOLAR LINE 考察"));
    assert.ok(html.includes("<p>Hello</p>"));
  });

  it("includes navigation links", () => {
    const html = layoutHtml("Test", "<p>x</p>", "..");
    assert.ok(html.includes('../index.html'));
    assert.ok(html.includes('../logs/index.html'));
  });

  it("escapes title", () => {
    const html = layoutHtml("Test <script>", "<p>ok</p>");
    assert.ok(html.includes("Test &lt;script&gt;"));
  });

  it("includes KaTeX CDN assets", () => {
    const html = layoutHtml("Test", "<p>ok</p>");
    assert.ok(html.includes("katex.min.css"), "should include KaTeX CSS");
    assert.ok(html.includes("katex.min.js"), "should include KaTeX JS");
    assert.ok(html.includes("auto-render.min.js"), "should include auto-render");
    assert.ok(html.includes("renderMathInElement"), "should include auto-render initialization");
  });

  it("includes AI disclaimer and spoiler warning banner", () => {
    const html = layoutHtml("Test", "<p>ok</p>");
    assert.ok(html.includes("site-banner"), "should include site-banner CSS class");
    assert.ok(html.includes("ネタバレ注意"), "should include spoiler warning");
    assert.ok(html.includes("AI生成コンテンツ"), "should include AI-generated notice");
    // Banner div should appear between nav and content
    const navIdx = html.indexOf("<nav");
    const bannerIdx = html.indexOf('<div class="site-banner"');
    const contentIdx = html.indexOf("<p>ok</p>");
    assert.ok(bannerIdx > 0, "banner div should exist");
    assert.ok(navIdx < bannerIdx, "banner should appear after nav");
    assert.ok(bannerIdx < contentIdx, "banner should appear before content");
  });

  it("inline JS contains valid regex syntax for uPlot color alpha replacement", () => {
    // Regression test: backslashes in regex inside template literals must be double-escaped.
    // Without this, /[\d.]+\)/ becomes /[d.]+)/ in the HTML output, causing a browser JS error.
    const html = layoutHtml("Test", "<p>ok</p>");
    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
    assert.ok(scriptMatch, "should have inline script");
    const script = scriptMatch![1];
    // The regex /[\d.]+\)/ should appear literally in the output (with backslash-d and backslash-paren)
    assert.ok(script.includes("[\\d.]+\\)"), "inline JS regex should have escaped \\d and \\) for valid browser regex");
    assert.ok(!script.includes("[d.]+)"), "inline JS regex must NOT have unescaped [d.]+) which is invalid");
  });
});

// --- renderTransferCard ---

const sampleTransfer: TransferAnalysis = {
  id: "ep01-transfer-01",
  episode: 1,
  description: "Earth to Mars Hohmann Transfer",
  timestamp: "05:30",
  claimedDeltaV: 5.6,
  computedDeltaV: 5.59,
  assumptions: ["Circular orbits", "Coplanar transfer"],
  verdict: "plausible",
  explanation: "The depicted ΔV closely matches Hohmann transfer requirements.",
  parameters: { mu: 1.327e11, departureRadius: 149598023, arrivalRadius: 227939366 },
};

describe("renderTransferCard", () => {
  it("renders transfer details", () => {
    const html = renderTransferCard(sampleTransfer);
    assert.ok(html.includes("Earth to Mars Hohmann Transfer"));
    assert.ok(html.includes("妥当"));
    assert.ok(html.includes("verdict-plausible"));
    assert.ok(html.includes("5.60"));
    assert.ok(html.includes("5.59"));
  });

  it("handles null claimed ΔV", () => {
    const t = { ...sampleTransfer, claimedDeltaV: null };
    const html = renderTransferCard(t);
    assert.ok(html.includes("作中で明示されず"));
    assert.ok(!html.includes("作中のΔV"));
  });

  it("renders assumptions list", () => {
    const html = renderTransferCard(sampleTransfer);
    assert.ok(html.includes("Circular orbits"));
    assert.ok(html.includes("Coplanar transfer"));
  });

  it("uses correct verdict CSS class", () => {
    const implausible = { ...sampleTransfer, verdict: "implausible" as const };
    const html = renderTransferCard(implausible);
    assert.ok(html.includes("verdict-implausible"));
  });

  it("renders transfer without mu parameter", () => {
    const t: TransferAnalysis = {
      ...sampleTransfer,
      parameters: { thrust: 9800000, mass: 48000000 },
    };
    const html = renderTransferCard(t);
    assert.ok(html.includes("Earth to Mars Hohmann Transfer"));
    assert.ok(html.includes('class="card"'));
  });
});

// --- renderIndex ---

const sampleManifest: SiteManifest = {
  title: "SOLAR LINE 考察",
  generatedAt: "2026-02-23T00:00:00.000Z",
  episodes: [
    { episode: 1, title: "Departure", transferCount: 2, path: "episodes/ep-001.html" },
  ],
  logs: [
    { filename: "2026-02-23-session", date: "2026-02-23", description: "Initial analysis", path: "logs/2026-02-23-session.html" },
  ],
};

describe("renderIndex", () => {
  it("renders episode list", () => {
    const html = renderIndex(sampleManifest);
    assert.ok(html.includes("第1話: Departure"));
    assert.ok(html.includes("2件の軌道遷移"));
    assert.ok(html.includes("episodes/ep-001.html"));
  });

  it("renders empty state when no episodes", () => {
    const empty = { ...sampleManifest, episodes: [] };
    const html = renderIndex(empty);
    assert.ok(html.includes("エピソードレポートはまだありません。"));
  });

  it("includes generation timestamp", () => {
    const html = renderIndex(sampleManifest);
    assert.ok(html.includes("2026-02-23T00:00:00.000Z"));
  });
});

// --- renderEpisode ---

const sampleEpisodeReport: EpisodeReport = {
  episode: 1,
  title: "Departure",
  summary: "The crew departs Earth orbit.",
  transfers: [sampleTransfer],
};

describe("renderEpisode", () => {
  it("renders episode title and summary", () => {
    const html = renderEpisode(sampleEpisodeReport);
    assert.ok(html.includes("第1話: Departure"));
    assert.ok(html.includes("The crew departs Earth orbit."));
  });

  it("includes transfer cards", () => {
    const html = renderEpisode(sampleEpisodeReport);
    assert.ok(html.includes("Earth to Mars Hohmann Transfer"));
  });

  it("shows empty state when no transfers", () => {
    const empty = { ...sampleEpisodeReport, transfers: [] };
    const html = renderEpisode(empty);
    assert.ok(html.includes("分析された軌道遷移はまだありません。"));
  });

  it("uses parent basePath for navigation", () => {
    const html = renderEpisode(sampleEpisodeReport);
    assert.ok(html.includes("../index.html"));
  });

  it("includes OGP description from episode summary", () => {
    const html = renderEpisode(sampleEpisodeReport);
    assert.ok(html.includes('<meta property="og:description"'));
    assert.ok(html.includes("The crew departs Earth orbit."));
  });
});

// --- renderCalculator ---

describe("renderCalculator", () => {
  it("renders calculator container with id", () => {
    const html = renderCalculator();
    assert.ok(html.includes('id="calculator"'));
  });

  it("includes distance, mass, and time controls", () => {
    const html = renderCalculator();
    assert.ok(html.includes('id="calc-distance"'));
    assert.ok(html.includes('id="calc-mass"'));
    assert.ok(html.includes('id="calc-time"'));
  });

  it("includes range sliders paired with number inputs", () => {
    const html = renderCalculator();
    assert.ok(html.includes('id="calc-distance-range"'));
    assert.ok(html.includes('id="calc-mass-range"'));
    assert.ok(html.includes('id="calc-time-range"'));
    assert.ok(html.includes('id="calc-thrust-range"'));
    assert.ok(html.includes('id="calc-thrust"'));
  });

  it("includes episode-specific preset buttons", () => {
    // Default (no episode) → EP01 presets
    const html = renderCalculator();
    assert.ok(html.includes('data-preset="ep01_72h"'));
    assert.ok(html.includes('data-preset="ep01_150h"'));
    assert.ok(html.includes("火星→ガニメデ 72h"));
  });

  it("renders EP03 presets when episode=3", () => {
    const html = renderCalculator(3);
    assert.ok(html.includes('data-preset="ep03_143h"'));
    assert.ok(html.includes("エンケラドス→タイタニア 143h"));
    assert.ok(html.includes('data-episode="3"'));
    // Should use EP03 defaults
    assert.ok(html.includes('value="9.62"'));
    assert.ok(html.includes('value="143"'));
  });

  it("renders EP05 presets with damaged thrust default", () => {
    const html = renderCalculator(5);
    assert.ok(html.includes('data-preset="ep05_composite"'));
    assert.ok(html.includes('value="6.37"'));
    assert.ok(html.includes("ノズル寿命上限"));
  });

  it("includes result placeholders", () => {
    const html = renderCalculator();
    assert.ok(html.includes('id="res-req-accel"'));
    assert.ok(html.includes('id="res-req-dv"'));
    assert.ok(html.includes('id="res-ship-accel"'));
    assert.ok(html.includes('id="res-ship-dv"'));
    assert.ok(html.includes('id="res-verdict"'));
  });

  it("includes assumptions disclaimer", () => {
    const html = renderCalculator();
    assert.ok(html.includes("直線経路"));
    assert.ok(html.includes("重力無視"));
  });

  it("references calculator.js script", () => {
    const html = renderCalculator();
    assert.ok(html.includes('src="../calculator.js"'));
  });

  it("includes engine badge", () => {
    const html = renderCalculator();
    assert.ok(html.includes('id="calc-engine-badge"'));
  });
});

describe("renderEpisode includes calculator", () => {
  it("embeds the calculator widget", () => {
    const html = renderEpisode(sampleEpisodeReport);
    assert.ok(html.includes('id="calculator"'));
    assert.ok(html.includes("calculator.js"));
  });
});

// --- renderVideoCard ---

const sampleYouTubeCard: VideoCard = {
  provider: "youtube",
  id: "dQw4w9WgXcQ",
  title: "テスト動画",
  caption: "YouTube版",
};

const sampleNiconicoCard: VideoCard = {
  provider: "niconico",
  id: "sm45280425",
  title: "SOLAR LINE Part 1",
  caption: "ニコニコ動画（オリジナル）",
};

describe("renderVideoCard", () => {
  it("renders YouTube iframe with correct embed URL", () => {
    const html = renderVideoCard(sampleYouTubeCard);
    assert.ok(html.includes("youtube-nocookie.com/embed/dQw4w9WgXcQ"));
    assert.ok(html.includes("iframe"));
    assert.ok(html.includes("allowfullscreen"));
  });

  it("renders Niconico iframe with correct embed URL", () => {
    const html = renderVideoCard(sampleNiconicoCard);
    assert.ok(html.includes("embed.nicovideo.jp/watch/sm45280425"));
    assert.ok(html.includes("iframe"));
  });

  it("includes caption when provided", () => {
    const html = renderVideoCard(sampleYouTubeCard);
    assert.ok(html.includes("YouTube版"));
    assert.ok(html.includes("video-caption"));
  });

  it("omits caption when not provided", () => {
    const card: VideoCard = { provider: "youtube", id: "test123" };
    const html = renderVideoCard(card);
    assert.ok(!html.includes("video-caption"));
  });

  it("includes start time parameter for YouTube", () => {
    const card: VideoCard = { provider: "youtube", id: "abc", startSec: 120 };
    const html = renderVideoCard(card);
    assert.ok(html.includes("?start=120"));
  });

  it("includes start time parameter for Niconico", () => {
    const card: VideoCard = { provider: "niconico", id: "sm123", startSec: 60 };
    const html = renderVideoCard(card);
    assert.ok(html.includes("?from=60"));
  });

  it("encodes video ID to prevent injection", () => {
    const card: VideoCard = { provider: "youtube", id: "test<script>" };
    const html = renderVideoCard(card);
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("test%3Cscript%3E"));
  });
});

describe("renderVideoCards", () => {
  it("wraps cards in video-cards container", () => {
    const html = renderVideoCards([sampleYouTubeCard, sampleNiconicoCard]);
    assert.ok(html.includes("video-cards"));
    assert.ok(html.includes("youtube-nocookie.com"));
    assert.ok(html.includes("embed.nicovideo.jp"));
  });

  it("returns empty string for empty array", () => {
    assert.equal(renderVideoCards([]), "");
  });
});

// --- renderDialogueQuote ---

const sampleQuote: DialogueQuote = {
  id: "ep01-quote-01",
  speaker: "きりたん",
  text: "72時間以内に届けてほしい",
  timestamp: "02:15",
};

describe("renderDialogueQuote", () => {
  it("renders speaker name and quote text", () => {
    const html = renderDialogueQuote(sampleQuote);
    assert.ok(html.includes("きりたん"));
    assert.ok(html.includes("72時間以内に届けてほしい"));
  });

  it("renders timestamp", () => {
    const html = renderDialogueQuote(sampleQuote);
    assert.ok(html.includes("02:15"));
  });

  it("includes quote ID for linking", () => {
    const html = renderDialogueQuote(sampleQuote);
    assert.ok(html.includes('id="ep01-quote-01"'));
  });

  it("uses Japanese bracket format", () => {
    const html = renderDialogueQuote(sampleQuote);
    assert.ok(html.includes("「72時間以内に届けてほしい」"));
  });

  it("escapes HTML in quote text", () => {
    const q: DialogueQuote = { id: "q1", speaker: "A", text: '<script>alert("xss")</script>', timestamp: "00:00" };
    const html = renderDialogueQuote(q);
    assert.ok(!html.includes("<script>"));
  });
});

describe("renderDialogueQuotes", () => {
  it("renders section heading and quotes", () => {
    const html = renderDialogueQuotes([sampleQuote]);
    assert.ok(html.includes("主要な台詞"));
    assert.ok(html.includes("きりたん"));
  });

  it("returns empty string for empty array", () => {
    assert.equal(renderDialogueQuotes([]), "");
  });
});

// --- parseTimestamp ---

describe("parseTimestamp", () => {
  it("parses MM:SS format", () => {
    assert.equal(parseTimestamp("02:15"), 135);
  });

  it("parses HH:MM:SS format", () => {
    assert.equal(parseTimestamp("1:02:15"), 3735);
  });

  it("returns 0 for invalid input", () => {
    assert.equal(parseTimestamp(""), 0);
  });

  it("extracts first timestamp from range format (no spaces)", () => {
    assert.equal(parseTimestamp("02:22-04:09"), 142);
  });

  it("extracts first timestamp from range format (with spaces)", () => {
    assert.equal(parseTimestamp("00:00 - 19:20（全編）"), 0);
  });

  it("extracts first timestamp from range with description", () => {
    assert.equal(parseTimestamp("02:50-23:21（航路計画〜ノズル消失〜「この船はもう飛べません」）"), 170);
  });

  it("extracts first timestamp from range with spaces and description", () => {
    assert.equal(parseTimestamp("09:08 - 13:45"), 548);
  });

  it("handles non-timestamp text gracefully", () => {
    assert.equal(parseTimestamp("該当なし（参考計算）"), 0);
  });
});

// --- timestampLink ---

describe("timestampLink", () => {
  it("returns plain text when no video cards provided", () => {
    const result = timestampLink("10:05");
    assert.equal(result, "(10:05)");
  });

  it("returns plain text when video cards array is empty", () => {
    const result = timestampLink("10:05", []);
    assert.equal(result, "(10:05)");
  });

  it("generates YouTube link with seconds", () => {
    const cards: VideoCard[] = [{ provider: "youtube", id: "CQ_OkDjEwRk" }];
    const result = timestampLink("10:05", cards);
    assert.ok(result.includes("youtube.com/watch?v=CQ_OkDjEwRk&t=605"));
    assert.ok(result.includes("10:05"));
    assert.ok(result.includes("<a "));
  });

  it("generates Niconico link when no YouTube available", () => {
    const cards: VideoCard[] = [{ provider: "niconico", id: "sm45280425" }];
    const result = timestampLink("05:30", cards);
    assert.ok(result.includes("nicovideo.jp/watch/sm45280425?from=330"));
    assert.ok(result.includes("05:30"));
  });

  it("prefers YouTube over Niconico", () => {
    const cards: VideoCard[] = [
      { provider: "niconico", id: "sm12345" },
      { provider: "youtube", id: "abc123" },
    ];
    const result = timestampLink("01:00", cards);
    assert.ok(result.includes("youtube.com"));
    assert.ok(!result.includes("nicovideo.jp"));
  });

  it("handles range timestamps without producing NaN (YouTube)", () => {
    const cards: VideoCard[] = [{ provider: "youtube", id: "CQ_OkDjEwRk" }];
    const result = timestampLink("00:00 - 19:20（全編）", cards);
    assert.ok(!result.includes("NaN"), `Expected no NaN in: ${result}`);
    assert.ok(result.includes("&t=0"));
  });

  it("handles range timestamps without producing NaN (Niconico)", () => {
    const cards: VideoCard[] = [{ provider: "niconico", id: "sm45987761" }];
    const result = timestampLink("02:22-04:09（航路ブリーフィング〜天王星脱出）", cards);
    assert.ok(!result.includes("NaN"), `Expected no NaN in: ${result}`);
    assert.ok(result.includes("?from=142"));
  });

  it("handles non-timestamp text without producing NaN", () => {
    const cards: VideoCard[] = [{ provider: "youtube", id: "test" }];
    const result = timestampLink("該当なし（参考計算）", cards);
    assert.ok(!result.includes("NaN"), `Expected no NaN in: ${result}`);
  });
});

describe("renderDialogueQuote with video links", () => {
  it("renders timestamp as video link when video cards provided", () => {
    const cards: VideoCard[] = [{ provider: "youtube", id: "CQ_OkDjEwRk" }];
    const html = renderDialogueQuote(sampleQuote, cards);
    assert.ok(html.includes("youtube.com/watch?v=CQ_OkDjEwRk&t=135"));
    assert.ok(html.includes("02:15"));
  });

  it("renders plain timestamp when no video cards", () => {
    const html = renderDialogueQuote(sampleQuote);
    assert.ok(html.includes("(02:15)"));
    assert.ok(!html.includes("youtube.com"));
  });
});

// --- renderBarChart ---

describe("renderBarChart", () => {
  it("renders SVG with bars", () => {
    const html = renderBarChart("テストチャート", [
      { label: "A", value: 100 },
      { label: "B", value: 50 },
    ], "km/s");
    assert.ok(html.includes("<svg"));
    assert.ok(html.includes("</svg>"));
    assert.ok(html.includes("テストチャート"));
    assert.ok(html.includes("km/s"));
  });

  it("returns empty string for empty bars", () => {
    assert.equal(renderBarChart("Empty", []), "");
  });

  it("uses custom colors when provided", () => {
    const html = renderBarChart("Chart", [
      { label: "Green", value: 10, color: "var(--green)" },
    ]);
    assert.ok(html.includes("var(--green)"));
  });

  it("scales bars relative to maximum", () => {
    const html = renderBarChart("Chart", [
      { label: "Big", value: 1000 },
      { label: "Small", value: 100 },
    ]);
    // Both should be present
    assert.ok(html.includes("Big"));
    assert.ok(html.includes("Small"));
  });
});

// --- renderEpisode with video cards and dialogue ---

describe("renderEpisode with enrichments", () => {
  it("includes video cards when provided", () => {
    const report: EpisodeReport = {
      ...sampleEpisodeReport,
      videoCards: [sampleNiconicoCard],
    };
    const html = renderEpisode(report);
    assert.ok(html.includes("embed.nicovideo.jp"));
    assert.ok(html.includes("video-cards"));
  });

  it("includes dialogue quotes when provided", () => {
    const report: EpisodeReport = {
      ...sampleEpisodeReport,
      dialogueQuotes: [sampleQuote],
    };
    const html = renderEpisode(report);
    assert.ok(html.includes("主要な台詞"));
    assert.ok(html.includes("きりたん"));
  });

  it("renders ΔV comparison chart", () => {
    const html = renderEpisode(sampleEpisodeReport);
    assert.ok(html.includes("ΔV 比較"));
    assert.ok(html.includes("<svg"));
  });

  it("renders inline citations for evidence quotes", () => {
    const report: EpisodeReport = {
      episode: 1,
      title: "Test",
      summary: "Test",
      dialogueQuotes: [sampleQuote],
      transfers: [{
        ...sampleTransfer,
        evidenceQuoteIds: ["ep01-quote-01"],
      }],
    };
    const html = renderEpisode(report);
    // Should render inline citation, not separate "根拠となる台詞" box
    assert.ok(!html.includes("根拠となる台詞"));
    assert.ok(html.includes("evidence-citations"));
    assert.ok(html.includes("きりたん"));
    assert.ok(html.includes("72時間以内に届けてほしい"));
  });
});

// --- renderLogsIndex ---

describe("renderLogsIndex", () => {
  it("renders log entries", () => {
    const html = renderLogsIndex(sampleManifest.logs);
    assert.ok(html.includes("2026-02-23"));
    assert.ok(html.includes("Initial analysis"));
  });

  it("renders empty state", () => {
    const html = renderLogsIndex([]);
    assert.ok(html.includes("セッションログはまだありません。"));
  });
});

// --- renderLogPage ---

describe("renderLogPage", () => {
  it("renders markdown content as HTML", () => {
    const html = renderLogPage("2026-02-23-session", "2026-02-23", "# Session Log\n\nDid some analysis.");
    assert.ok(html.includes("<h1>Session Log</h1>"));
    assert.ok(html.includes("Did some analysis."));
  });

  it("wraps in layout with log title", () => {
    const html = renderLogPage("test", "2026-02-23", "content");
    assert.ok(html.includes("セッションログ: 2026-02-23"));
  });
});

// --- renderOrbitalDiagram ---

const sampleDiagram: OrbitalDiagram = {
  id: "ep01-diagram-01",
  title: "火星→ガニメデ ブラキストクローネ遷移",
  centerLabel: "太陽",
  scaleMode: "sqrt",
  radiusUnit: "AU",
  orbits: [
    { id: "mars", label: "火星", radius: 1.524, color: "#f85149", angle: 0 },
    { id: "jupiter", label: "木星", radius: 5.203, color: "#d29922", angle: Math.PI * 0.6 },
  ],
  transfers: [
    {
      label: "ブラキストクローネ遷移",
      fromOrbitId: "mars",
      toOrbitId: "jupiter",
      color: "#58a6ff",
      style: "brachistochrone",
      burnMarkers: [{ angle: Math.PI * 0.25, label: "加速反転" }],
    },
  ],
};

describe("renderOrbitalDiagram", () => {
  it("renders SVG with diagram ID", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    assert.ok(html.includes('id="ep01-diagram-01"'));
    assert.ok(html.includes("<svg"));
    assert.ok(html.includes("</svg>"));
  });

  it("renders diagram title", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    assert.ok(html.includes("火星→ガニメデ ブラキストクローネ遷移"));
  });

  it("renders description when present", () => {
    const diagram: OrbitalDiagram = {
      ...sampleDiagram,
      description: "火星軌道から木星軌道への遷移を示す",
    };
    const html = renderOrbitalDiagram(diagram);
    assert.ok(html.includes('class="diagram-description"'));
    assert.ok(html.includes("火星軌道から木星軌道への遷移を示す"));
  });

  it("omits description when not present", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    assert.ok(!html.includes("diagram-description"));
  });

  it("renders center body label", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    assert.ok(html.includes("太陽"));
  });

  it("renders orbit circles for all orbits", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    // Should have circle elements for each orbit (dashed)
    const circleMatches = html.match(/<circle.*?stroke-dasharray="4 2"/g);
    assert.ok(circleMatches);
    assert.equal(circleMatches.length, 2);
  });

  it("renders orbit labels", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    assert.ok(html.includes("火星"));
    assert.ok(html.includes("木星"));
  });

  it("renders body dots when angle is specified", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    // Mars has angle=0, Jupiter has angle=π*0.6 — both should have filled dots
    const filledCircles = html.match(/<circle.*?fill="#[a-f0-9]+"/gi);
    assert.ok(filledCircles);
    assert.ok(filledCircles.length >= 2); // at least the two body dots
  });

  it("renders transfer arc with correct style", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    // Brachistochrone should have dashed stroke
    assert.ok(html.includes('stroke-dasharray="8 4"'));
    // Should have a path element
    assert.ok(html.includes("<path"));
  });

  it("renders burn markers", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    assert.ok(html.includes("加速反転"));
  });

  it("renders legend", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    assert.ok(html.includes("Brachistochrone（模式図）"));
  });

  it("renders Hohmann transfer without dashed stroke", () => {
    const diagram: OrbitalDiagram = {
      ...sampleDiagram,
      id: "test-hohmann",
      transfers: [{
        label: "ホーマン遷移",
        fromOrbitId: "mars",
        toOrbitId: "jupiter",
        color: "#58a6ff",
        style: "hohmann",
      }],
    };
    const html = renderOrbitalDiagram(diagram);
    assert.ok(html.includes("<path"));
    // Hohmann should NOT have dashed stroke
    assert.ok(!html.includes('stroke-dasharray="8 4"'));
    assert.ok(html.includes("ホーマン遷移"));
  });

  it("renders hyperbolic transfer", () => {
    const diagram: OrbitalDiagram = {
      ...sampleDiagram,
      id: "test-hyperbolic",
      transfers: [{
        label: "双曲線脱出",
        fromOrbitId: "mars",
        toOrbitId: "jupiter",
        color: "#3fb950",
        style: "hyperbolic",
      }],
    };
    const html = renderOrbitalDiagram(diagram);
    assert.ok(html.includes("双曲線軌道"));
    assert.ok(html.includes("<path"));
  });

  it("handles orbits without angles (labels at top)", () => {
    const diagram: OrbitalDiagram = {
      id: "test-no-angle",
      title: "テスト",
      centerLabel: "太陽",
      orbits: [
        { id: "earth", label: "地球", radius: 1.0, color: "#58a6ff" },
      ],
      transfers: [],
    };
    const html = renderOrbitalDiagram(diagram);
    assert.ok(html.includes("地球"));
  });

  it("escapes HTML in labels", () => {
    const diagram: OrbitalDiagram = {
      id: "test-escape",
      title: '<script>alert("xss")</script>',
      centerLabel: "太陽",
      orbits: [],
      transfers: [],
    };
    const html = renderOrbitalDiagram(diagram);
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  });

  it("defaults to sqrt scale mode", () => {
    const diagram: OrbitalDiagram = {
      id: "test-default-scale",
      title: "テスト",
      centerLabel: "太陽",
      orbits: [
        { id: "inner", label: "内", radius: 1.0, color: "#fff" },
        { id: "outer", label: "外", radius: 10.0, color: "#fff" },
      ],
      transfers: [],
    };
    const html = renderOrbitalDiagram(diagram);
    // Should render without errors (sqrt is default)
    assert.ok(html.includes("<svg"));
  });

  it("gracefully handles missing orbit references in transfers", () => {
    const diagram: OrbitalDiagram = {
      id: "test-missing-ref",
      title: "テスト",
      centerLabel: "太陽",
      orbits: [{ id: "mars", label: "火星", radius: 1.5, color: "#f00" }],
      transfers: [{
        label: "遷移",
        fromOrbitId: "mars",
        toOrbitId: "nonexistent",
        color: "#fff",
        style: "hohmann",
      }],
    };
    // Should not throw
    const html = renderOrbitalDiagram(diagram);
    assert.ok(html.includes("<svg"));
  });

  it("wraps transfers in <g class='transfer-leg'> groups with data attributes", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    assert.ok(html.includes('class="transfer-leg"'));
    assert.ok(html.includes('data-leg-idx="0"'));
    assert.ok(html.includes('data-leg-label="ブラキストクローネ遷移"'));
  });

  it("includes burn markers within transfer-leg group", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    // Burn marker text should appear inside the transfer-leg group
    const legMatch = html.match(/<g class="transfer-leg"[^>]*>[\s\S]*?<\/g>/);
    assert.ok(legMatch, "should have a transfer-leg group");
    assert.ok(legMatch[0].includes("加速反転"), "burn marker should be inside the group");
  });

  it("renders multiple transfer-leg groups for multi-arc diagrams", () => {
    const diagram: OrbitalDiagram = {
      ...sampleDiagram,
      id: "test-multi-leg",
      orbits: [
        { id: "a", label: "A", radius: 1, color: "#fff", angle: 0 },
        { id: "b", label: "B", radius: 3, color: "#fff", angle: 1 },
        { id: "c", label: "C", radius: 5, color: "#fff", angle: 2 },
      ],
      transfers: [
        { label: "A→B", fromOrbitId: "a", toOrbitId: "b", color: "#f00", style: "hohmann" },
        { label: "B→C", fromOrbitId: "b", toOrbitId: "c", color: "#0f0", style: "brachistochrone" },
      ],
    };
    const html = renderOrbitalDiagram(diagram);
    const legGroups = html.match(/<g class="transfer-leg"/g);
    assert.ok(legGroups);
    assert.equal(legGroups.length, 2);
    assert.ok(html.includes('data-leg-idx="0"'));
    assert.ok(html.includes('data-leg-idx="1"'));
    assert.ok(html.includes('data-leg-label="A→B"'));
    assert.ok(html.includes('data-leg-label="B→C"'));
  });
});

describe("renderOrbitalDiagrams", () => {
  it("renders section heading and diagrams", () => {
    const html = renderOrbitalDiagrams([sampleDiagram]);
    assert.ok(html.includes("軌道遷移図"));
    assert.ok(html.includes("ep01-diagram-01"));
  });

  it("returns empty string for empty array", () => {
    assert.equal(renderOrbitalDiagrams([]), "");
  });
});

describe("renderEpisode with diagrams", () => {
  it("includes orbital diagrams when provided", () => {
    const report: EpisodeReport = {
      ...sampleEpisodeReport,
      diagrams: [sampleDiagram],
    };
    const html = renderEpisode(report);
    assert.ok(html.includes("軌道遷移図"));
    assert.ok(html.includes("ep01-diagram-01"));
  });

  it("omits diagram section when no diagrams", () => {
    const html = renderEpisode(sampleEpisodeReport);
    assert.ok(!html.includes("軌道遷移図"));
  });
});

// --- Transfer leg episode navigation ---

describe("transfer-leg data-leg-episode attribute", () => {
  it("auto-detects episode number from label like 'EP1: ...'", () => {
    const diagram: OrbitalDiagram = {
      ...sampleDiagram,
      id: "test-ep-detect",
      transfers: [
        { label: "EP1: 火星→木星", fromOrbitId: "mars", toOrbitId: "jupiter", color: "#f00", style: "brachistochrone" },
      ],
    };
    const html = renderOrbitalDiagram(diagram);
    assert.ok(html.includes('data-leg-episode="1"'));
  });

  it("auto-detects from 'EP05' format", () => {
    const diagram: OrbitalDiagram = {
      ...sampleDiagram,
      id: "test-ep05-detect",
      transfers: [
        { label: "EP05: 天王星→地球", fromOrbitId: "mars", toOrbitId: "jupiter", color: "#f00", style: "brachistochrone" },
      ],
    };
    const html = renderOrbitalDiagram(diagram);
    assert.ok(html.includes('data-leg-episode="5"'));
  });

  it("uses explicit episodeNumber when set", () => {
    const diagram: OrbitalDiagram = {
      ...sampleDiagram,
      id: "test-ep-explicit",
      transfers: [
        { label: "some transfer", fromOrbitId: "mars", toOrbitId: "jupiter", color: "#f00", style: "brachistochrone", episodeNumber: 3 },
      ],
    };
    const html = renderOrbitalDiagram(diagram);
    assert.ok(html.includes('data-leg-episode="3"'));
  });

  it("omits data-leg-episode when no episode info is available", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    // sampleDiagram has label "ブラキストクローネ遷移" — no EP pattern
    assert.ok(!html.includes('data-leg-episode'));
  });

  it("explicit episodeNumber overrides label-detected value", () => {
    const diagram: OrbitalDiagram = {
      ...sampleDiagram,
      id: "test-ep-override",
      transfers: [
        { label: "EP1: 火星→木星", fromOrbitId: "mars", toOrbitId: "jupiter", color: "#f00", style: "brachistochrone", episodeNumber: 2 },
      ],
    };
    const html = renderOrbitalDiagram(diagram);
    assert.ok(html.includes('data-leg-episode="2"'));
    assert.ok(!html.includes('data-leg-episode="1"'));
  });
});

// --- Leg highlighting CSS ---

describe("REPORT_CSS includes leg highlighting styles", () => {
  it("includes transfer-leg hover styles", () => {
    assert.ok(REPORT_CSS.includes(".transfer-leg"));
    assert.ok(REPORT_CSS.includes(".leg-active"));
    assert.ok(REPORT_CSS.includes(".leg-highlight"));
  });

  it("includes leg-tooltip styles", () => {
    assert.ok(REPORT_CSS.includes(".leg-tooltip"));
  });

  it("includes locked tooltip styles for episode links", () => {
    assert.ok(REPORT_CSS.includes(".leg-tooltip.locked"));
    assert.ok(REPORT_CSS.includes(".leg-tooltip a"));
  });
});

// --- Text overflow handling ---

describe("REPORT_CSS handles text overflow", () => {
  it("includes overflow-wrap for cards", () => {
    assert.ok(REPORT_CSS.includes("overflow-wrap"));
  });

  it("includes word-break for scenario table cells", () => {
    // Scenario table cells with long Japanese text need word-break
    assert.ok(/\.scenario-table\s+td[^}]*word-break/.test(REPORT_CSS) ||
              /\.scenario-table[^}]*td[^}]*word-break/.test(REPORT_CSS) ||
              REPORT_CSS.includes("word-break"));
  });

  it("includes overflow-x handling for cards", () => {
    // Cards should not allow horizontal overflow
    assert.ok(/\.card[^}]*overflow/.test(REPORT_CSS));
  });
});

describe("renderBarChart handles long labels", () => {
  it("renders SVG with viewBox for responsive scaling", () => {
    const html = renderBarChart("テスト", [
      { label: "ホーマン遷移基準値: 火星軌道→木星軌道（最小エネルギー）", value: 100 },
    ], "km/s");
    assert.ok(html.includes("<svg"));
    // SVG should use viewBox for responsive scaling
    assert.ok(html.includes("viewBox"));
  });

  it("truncates long labels to prevent SVG overflow", () => {
    const longLabel = "非常に長い軌道遷移の説明で、カードからはみ出してしまう可能性がある";
    const html = renderBarChart("テスト", [
      { label: longLabel, value: 100 },
    ], "km/s");
    // The label should be truncated in the SVG output
    assert.ok(html.includes("…"));
  });

  it("handles large numeric values without overflow", () => {
    const html = renderBarChart("テスト", [
      { label: "高速遷移", value: 11165.23 },
      { label: "低速遷移", value: 2.74 },
    ], "km/s");
    assert.ok(html.includes("<svg"));
    // Large values should use locale-formatted notation (comma separators)
    assert.ok(html.includes("11,165.23"), `Expected comma-formatted number in: ${html.slice(0, 500)}`);
  });
});

// --- renderTimeSeriesChart ---

const sampleTimeSeriesChart: TimeSeriesChart = {
  id: "test-ts-chart-01",
  title: "テスト時系列グラフ",
  xLabel: "経過時間 (h)",
  yLabel: "推力 (MN)",
  series: [
    {
      label: "推力",
      color: "#ff6644",
      x: [0, 10, 20, 30],
      y: [0, 6.37, 6.37, 0],
      style: "solid",
    },
  ],
};

describe("renderTimeSeriesChart", () => {
  it("renders a card with uplot-chart class", () => {
    const html = renderTimeSeriesChart(sampleTimeSeriesChart);
    assert.ok(html.includes('class="card uplot-chart"'));
  });

  it("includes the chart id", () => {
    const html = renderTimeSeriesChart(sampleTimeSeriesChart);
    assert.ok(html.includes('id="test-ts-chart-01"'));
  });

  it("includes the chart title", () => {
    const html = renderTimeSeriesChart(sampleTimeSeriesChart);
    assert.ok(html.includes("テスト時系列グラフ"));
  });

  it("embeds JSON data in script tag", () => {
    const html = renderTimeSeriesChart(sampleTimeSeriesChart);
    assert.ok(html.includes('class="uplot-data"'));
    assert.ok(html.includes('"xLabel":"経過時間 (h)"'));
    assert.ok(html.includes('"yLabel":"推力 (MN)"'));
  });

  it("includes uplot-target container", () => {
    const html = renderTimeSeriesChart(sampleTimeSeriesChart);
    assert.ok(html.includes('class="uplot-target"'));
  });

  it("renders description when present", () => {
    const chart: TimeSeriesChart = {
      ...sampleTimeSeriesChart,
      description: "推力の時間変化を示すグラフ",
    };
    const html = renderTimeSeriesChart(chart);
    assert.ok(html.includes('class="diagram-description"'));
    assert.ok(html.includes("推力の時間変化を示すグラフ"));
  });

  it("omits description when not present", () => {
    const html = renderTimeSeriesChart(sampleTimeSeriesChart);
    assert.ok(!html.includes("diagram-description"));
  });

  it("includes thresholds in JSON data", () => {
    const chart: TimeSeriesChart = {
      ...sampleTimeSeriesChart,
      thresholds: [
        { value: 0, label: "ゼロライン", color: "#ff0000", style: "dashed" },
      ],
    };
    const html = renderTimeSeriesChart(chart);
    assert.ok(html.includes('"thresholds":[{"value":0'));
    assert.ok(html.includes("ゼロライン"));
  });

  it("uses default width/height when not specified", () => {
    const html = renderTimeSeriesChart(sampleTimeSeriesChart);
    assert.ok(html.includes('"width":600'));
    assert.ok(html.includes('"height":300'));
  });

  it("uses custom width/height when specified", () => {
    const chart: TimeSeriesChart = {
      ...sampleTimeSeriesChart,
      width: 800,
      height: 400,
    };
    const html = renderTimeSeriesChart(chart);
    assert.ok(html.includes('"width":800'));
    assert.ok(html.includes('"height":400'));
  });

  it("escapes HTML in title", () => {
    const chart: TimeSeriesChart = {
      ...sampleTimeSeriesChart,
      title: '<script>alert("xss")</script>',
    };
    const html = renderTimeSeriesChart(chart);
    assert.ok(!html.includes("<script>alert"));
    assert.ok(html.includes("&lt;script&gt;"));
  });
});

describe("renderTimeSeriesCharts", () => {
  it("renders multiple charts", () => {
    const charts = [
      sampleTimeSeriesChart,
      { ...sampleTimeSeriesChart, id: "test-ts-chart-02", title: "第2グラフ" },
    ];
    const html = renderTimeSeriesCharts(charts);
    assert.ok(html.includes("test-ts-chart-01"));
    assert.ok(html.includes("test-ts-chart-02"));
  });

  it("returns empty string for empty array", () => {
    assert.equal(renderTimeSeriesCharts([]), "");
  });
});

describe("renderTransferCard handles long text", () => {
  it("renders long descriptions without structural issues", () => {
    const longTransfer: TransferAnalysis = {
      ...sampleTransfer,
      description: "ブラキストクローネ遷移: 土星エンケラドゥス → 天王星ティタニア・ターミナル・コンプレックス 143時間12分",
    };
    const html = renderTransferCard(longTransfer);
    // Should still contain the description (possibly truncated)
    assert.ok(html.includes("ブラキストクローネ遷移"));
    // Should still have proper card structure
    assert.ok(html.includes('class="card"'));
    assert.ok(html.includes("</div>"));
  });

  it("renders long explanations within card structure", () => {
    const longExplanation = "古典的ホーマン遷移には合計約2.74 km/sのΔVが必要だが、約9,971日（約27.3年）を要する。" +
      "143時間の所要時間とは全く異なる次元の問題であり、作中の推進技術はホーマン級を大幅に超えている。" +
      "エンケラドゥスからの出発にはまず土星系からの脱出が必要であり、土星重力圏脱出速度を考慮する必要がある。";
    const longTransfer: TransferAnalysis = {
      ...sampleTransfer,
      explanation: longExplanation,
    };
    const html = renderTransferCard(longTransfer);
    assert.ok(html.includes("古典的ホーマン遷移"));
    assert.ok(html.includes("</div>"));
  });

  it("renders inline citations when quotes provided", () => {
    const quotes: DialogueQuote[] = [
      { id: "q1", speaker: "きりたん", text: "72時間以内に届けてほしい", timestamp: "01:14" },
    ];
    const html = renderTransferCard(sampleTransfer, quotes);
    assert.ok(html.includes("evidence-citations"));
    assert.ok(html.includes("きりたん"));
    assert.ok(html.includes("72時間以内に届けてほしい"));
    assert.ok(html.includes("01:14"));
  });

  it("omits citation section when no quotes provided", () => {
    const html = renderTransferCard(sampleTransfer);
    assert.ok(!html.includes("evidence-citations"));
  });
});

// --- Nested explorations in renderEpisode ---

describe("renderEpisode nests explorations under transfers", () => {
  it("renders explorations after their parent transfer", () => {
    const report: EpisodeReport = {
      episode: 1,
      title: "Test",
      summary: "Test",
      transfers: [sampleTransfer],
      explorations: [{
        id: "exp-01",
        transferId: "ep01-transfer-01",
        question: "質量境界は？",
        scenarios: [{
          label: "48,000t",
          variedParam: "mass",
          variedValue: 48000000,
          variedUnit: "kg",
          results: { accel: 0.204 },
          feasible: false,
          note: "不可能",
        }],
        summary: "テスト概要",
      }],
    };
    const html = renderEpisode(report);
    // The exploration should appear (nested, not in separate section)
    assert.ok(html.includes("質量境界は？"));
    // Should NOT have the old separate "パラメータ探索" heading
    assert.ok(!html.includes("<h2>パラメータ探索</h2>"));
  });

  it("renders unlinked explorations in fallback section", () => {
    const report: EpisodeReport = {
      episode: 1,
      title: "Test",
      summary: "Test",
      transfers: [sampleTransfer],
      explorations: [{
        id: "exp-unlinked",
        transferId: "nonexistent-transfer",
        question: "リンク切れ探索",
        scenarios: [],
        summary: "テスト",
      }],
    };
    const html = renderEpisode(report);
    assert.ok(html.includes("その他のパラメータ探索"));
    assert.ok(html.includes("リンク切れ探索"));
  });
});

// --- Collapsible scenarios ---

describe("renderExploration with collapsedByDefault", () => {
  it("puts collapsed scenarios in details element", () => {
    const exp: ParameterExploration = {
      id: "exp-collapse-test",
      transferId: "t1",
      question: "テスト",
      scenarios: [
        {
          label: "妥当",
          variedParam: "mass",
          variedValue: 300,
          variedUnit: "kg",
          results: { accel: 32.0 },
          feasible: true,
          note: "境界",
        },
        {
          label: "非現実的",
          variedParam: "mass",
          variedValue: 48,
          variedUnit: "kg",
          results: { accel: 204.0 },
          feasible: true,
          note: "過酷",
          collapsedByDefault: true,
        },
      ],
      summary: "テスト概要",
    };
    const html = renderExploration(exp);
    assert.ok(html.includes("<details"));
    assert.ok(html.includes("他のシナリオを表示"));
    assert.ok(html.includes("非現実的"));
    // The visible scenario should be in the main table, not in details
    assert.ok(html.includes("妥当"));
  });

  it("renders string values in scenario results", () => {
    const exp: ParameterExploration = {
      id: "exp-string-vals",
      transferId: "t1",
      question: "テスト",
      scenarios: [
        {
          label: "300t",
          variedParam: "mass",
          variedValue: 300,
          variedUnit: "t",
          results: { "遷移時間": "8.3日", "ΔV": "15,207 km/s" },
          feasible: true,
          note: "妥当",
        },
      ],
      summary: "テスト概要",
    };
    const html = renderExploration(exp);
    assert.ok(html.includes("8.3日"), "should render string result value directly");
    assert.ok(html.includes("15,207 km/s"), "should render string result value directly");
  });

  it("escapes HTML in string result values", () => {
    const exp: ParameterExploration = {
      id: "exp-escape",
      transferId: "t1",
      question: "テスト",
      scenarios: [
        {
          label: "XSSテスト",
          variedParam: "mass",
          variedValue: 100,
          variedUnit: "t",
          results: { "status": '<img src=x onerror=alert("xss")>' },
          feasible: true,
          note: "テスト",
        },
      ],
      summary: "テスト概要",
    };
    const html = renderExploration(exp);
    assert.ok(!html.includes('<img src=x'), "should not contain unescaped HTML tag");
    assert.ok(html.includes("&lt;img"), "should contain escaped HTML entity");
  });

  it("omits details element when no scenarios are collapsed", () => {
    const exp: ParameterExploration = {
      id: "exp-no-collapse",
      transferId: "t1",
      question: "テスト",
      scenarios: [
        {
          label: "シナリオA",
          variedParam: "mass",
          variedValue: 300,
          variedUnit: "kg",
          results: { accel: 32.0 },
          feasible: true,
          note: "OK",
        },
      ],
      summary: "テスト概要",
    };
    const html = renderExploration(exp);
    assert.ok(!html.includes("<details"));
    assert.ok(html.includes("シナリオA"));
  });
});

// --- Animated orbital diagrams ---

const animatedDiagram: OrbitalDiagram = {
  id: "ep01-diagram-anim",
  title: "火星→木星 アニメーション",
  centerLabel: "太陽",
  scaleMode: "sqrt",
  radiusUnit: "AU",
  orbits: [
    { id: "mars", label: "火星", radius: 1.524, color: "#f85149", angle: 0, meanMotion: 1.059e-7 },
    { id: "jupiter", label: "木星", radius: 5.203, color: "#d29922", angle: 2.094, meanMotion: 1.678e-8 },
  ],
  transfers: [
    {
      label: "Brachistochrone遷移",
      fromOrbitId: "mars",
      toOrbitId: "jupiter",
      color: "#3fb950",
      style: "brachistochrone",
      startTime: 0,
      endTime: 259200,
    },
  ],
  animation: {
    durationSeconds: 259200,
  },
};

describe("renderOrbitalDiagram with animation", () => {
  it("adds data-animated attribute when animation config present", () => {
    const html = renderOrbitalDiagram(animatedDiagram);
    assert.ok(html.includes('data-animated="true"'));
  });

  it("embeds animation JSON in script tag", () => {
    const html = renderOrbitalDiagram(animatedDiagram);
    assert.ok(html.includes('<script type="application/json" class="orbital-animation-data">'));
  });

  it("animation JSON includes durationSeconds", () => {
    const html = renderOrbitalDiagram(animatedDiagram);
    const jsonMatch = html.match(/<script type="application\/json" class="orbital-animation-data">([\s\S]*?)<\/script>/);
    assert.ok(jsonMatch);
    const data = JSON.parse(jsonMatch[1]);
    assert.equal(data.durationSeconds, 259200);
  });

  it("animation JSON includes orbit meanMotion values", () => {
    const html = renderOrbitalDiagram(animatedDiagram);
    const jsonMatch = html.match(/<script type="application\/json" class="orbital-animation-data">([\s\S]*?)<\/script>/);
    assert.ok(jsonMatch);
    const data = JSON.parse(jsonMatch[1]);
    assert.ok(data.orbits);
    const marsOrbit = data.orbits.find((o: { id: string }) => o.id === "mars");
    assert.ok(marsOrbit);
    assert.equal(marsOrbit.meanMotion, 1.059e-7);
    assert.equal(marsOrbit.initialAngle, 0);
  });

  it("animation JSON includes transfer timing", () => {
    const html = renderOrbitalDiagram(animatedDiagram);
    const jsonMatch = html.match(/<script type="application\/json" class="orbital-animation-data">([\s\S]*?)<\/script>/);
    assert.ok(jsonMatch);
    const data = JSON.parse(jsonMatch[1]);
    assert.ok(data.transfers);
    assert.equal(data.transfers[0].startTime, 0);
    assert.equal(data.transfers[0].endTime, 259200);
  });

  it("adds data-orbit-id to body dot circles for animation targeting", () => {
    const html = renderOrbitalDiagram(animatedDiagram);
    assert.ok(html.includes('data-orbit-id="mars"'));
    assert.ok(html.includes('data-orbit-id="jupiter"'));
  });

  it("adds data-transfer-path to transfer arc paths", () => {
    const html = renderOrbitalDiagram(animatedDiagram);
    assert.ok(html.includes('data-transfer-path="mars-jupiter-0"'));
  });

  it("does NOT add data-animated for static diagrams", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    assert.ok(!html.includes('data-animated'));
  });

  it("does NOT embed animation JSON for static diagrams", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    assert.ok(!html.includes('orbital-animation-data'));
  });

  it("renders slider container for animated diagrams", () => {
    const html = renderOrbitalDiagram(animatedDiagram);
    assert.ok(html.includes('class="orbital-animation-controls"'));
    assert.ok(html.includes('type="range"'));
  });

  it("does NOT render slider for static diagrams", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    assert.ok(!html.includes('orbital-animation-controls'));
  });

  it("animation JSON includes pixel radii for orbits", () => {
    const html = renderOrbitalDiagram(animatedDiagram);
    const jsonMatch = html.match(/<script type="application\/json" class="orbital-animation-data">([\s\S]*?)<\/script>/);
    assert.ok(jsonMatch);
    const data = JSON.parse(jsonMatch[1]);
    const marsOrbit = data.orbits.find((o: { id: string }) => o.id === "mars");
    assert.ok(marsOrbit);
    assert.ok(typeof marsOrbit.radiusPx === "number");
    assert.ok(marsOrbit.radiusPx > 0);
  });
});

describe("renderOrbitalDiagram burn visualization", () => {
  const diagramWithBurns: OrbitalDiagram = {
    ...animatedDiagram,
    transfers: [
      {
        label: "Brachistochrone遷移",
        fromOrbitId: "mars",
        toOrbitId: "jupiter",
        color: "#3fb950",
        style: "brachistochrone",
        startTime: 0,
        endTime: 259200,
        burnMarkers: [
          { angle: 0.5, label: "加速", startTime: 0, endTime: 129600, type: "acceleration" },
          { angle: 0.5, label: "減速", startTime: 129600, endTime: 259200, type: "deceleration" },
        ],
      },
    ],
  };

  it("animation JSON includes burns array in transfer data", () => {
    const html = renderOrbitalDiagram(diagramWithBurns);
    const jsonMatch = html.match(/<script type="application\/json" class="orbital-animation-data">([\s\S]*?)<\/script>/);
    assert.ok(jsonMatch);
    const data = JSON.parse(jsonMatch[1]);
    assert.ok(data.transfers[0].burns);
    assert.equal(data.transfers[0].burns.length, 2);
  });

  it("burn data includes startTime, endTime, type, and label", () => {
    const html = renderOrbitalDiagram(diagramWithBurns);
    const jsonMatch = html.match(/<script type="application\/json" class="orbital-animation-data">([\s\S]*?)<\/script>/);
    assert.ok(jsonMatch);
    const data = JSON.parse(jsonMatch[1]);
    const burn = data.transfers[0].burns[0];
    assert.equal(burn.startTime, 0);
    assert.equal(burn.endTime, 129600);
    assert.equal(burn.type, "acceleration");
    assert.equal(burn.label, "加速");
  });

  it("animation JSON includes transfer style", () => {
    const html = renderOrbitalDiagram(diagramWithBurns);
    const jsonMatch = html.match(/<script type="application\/json" class="orbital-animation-data">([\s\S]*?)<\/script>/);
    assert.ok(jsonMatch);
    const data = JSON.parse(jsonMatch[1]);
    assert.equal(data.transfers[0].style, "brachistochrone");
  });

  it("burns without startTime/endTime are excluded from animation JSON", () => {
    const diagram: OrbitalDiagram = {
      ...animatedDiagram,
      transfers: [
        {
          label: "test",
          fromOrbitId: "mars",
          toOrbitId: "jupiter",
          color: "#3fb950",
          style: "brachistochrone",
          startTime: 0,
          endTime: 259200,
          burnMarkers: [
            { angle: 0.5, label: "static only" }, // no timing → not included
          ],
        },
      ],
    };
    const html = renderOrbitalDiagram(diagram);
    const jsonMatch = html.match(/<script type="application\/json" class="orbital-animation-data">([\s\S]*?)<\/script>/);
    assert.ok(jsonMatch);
    const data = JSON.parse(jsonMatch[1]);
    assert.equal(data.transfers[0].burns.length, 0);
  });

  it("transfers without burnMarkers get empty burns array", () => {
    const html = renderOrbitalDiagram(animatedDiagram);
    const jsonMatch = html.match(/<script type="application\/json" class="orbital-animation-data">([\s\S]*?)<\/script>/);
    assert.ok(jsonMatch);
    const data = JSON.parse(jsonMatch[1]);
    assert.ok(Array.isArray(data.transfers[0].burns));
    assert.equal(data.transfers[0].burns.length, 0);
  });

  it("CSS includes burn-plume class", () => {
    assert.ok(REPORT_CSS.includes(".burn-plume"));
  });
});

// --- Scale Legend ---

describe("renderOrbitalDiagram with scaleLegend", () => {
  const diagramWithScale: OrbitalDiagram = {
    ...sampleDiagram,
    viewRadius: 21,
    scaleLegend: {
      label: "√スケール（模式図）",
      referenceDistances: [
        { value: 1, label: "1 AU" },
        { value: 5, label: "5 AU" },
        { value: 10, label: "10 AU" },
        { value: 20, label: "20 AU" },
      ],
    },
  };

  it("renders reference distance circles with dashed style", () => {
    const html = renderOrbitalDiagram(diagramWithScale);
    // Should have circles for each reference distance
    assert.ok(html.includes("1 AU"));
    assert.ok(html.includes("5 AU"));
    assert.ok(html.includes("10 AU"));
    assert.ok(html.includes("20 AU"));
  });

  it("renders scale mode label below legend", () => {
    const html = renderOrbitalDiagram(diagramWithScale);
    assert.ok(html.includes("√スケール（模式図）"));
  });

  it("reference circles have distinct style from orbit circles", () => {
    const html = renderOrbitalDiagram(diagramWithScale);
    // Reference circles should use a different dash pattern or opacity
    assert.ok(html.includes("scale-ref"));
  });

  it("does NOT render scale legend when scaleLegend is omitted", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    assert.ok(!html.includes("scale-ref"));
    // "模式図" appears in transfer style label, so check scale-specific label instead
    assert.ok(!html.includes("√スケール"));
  });
});

// --- Timeline Annotations ---

describe("renderOrbitalDiagram with timelineAnnotations", () => {
  const diagramWithTimeline: OrbitalDiagram = {
    ...sampleDiagram,
    timelineAnnotations: [
      { missionTime: 0, label: "T+0 火星出発", badge: "①", orbitId: "mars" },
      { missionTime: 259200, label: "T+72h 木星到着", badge: "②", orbitId: "jupiter" },
    ],
  };

  it("renders on-diagram badges near waypoint orbits", () => {
    const html = renderOrbitalDiagram(diagramWithTimeline);
    assert.ok(html.includes("①"));
    assert.ok(html.includes("②"));
  });

  it("renders timeline bar below the diagram", () => {
    const html = renderOrbitalDiagram(diagramWithTimeline);
    assert.ok(html.includes("timeline-bar"));
  });

  it("timeline bar contains waypoint labels", () => {
    const html = renderOrbitalDiagram(diagramWithTimeline);
    assert.ok(html.includes("T+0 火星出発"));
    assert.ok(html.includes("T+72h 木星到着"));
  });

  it("does NOT render timeline when annotations are omitted", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    assert.ok(!html.includes("timeline-bar"));
  });

  it("does NOT render timeline for empty annotations array", () => {
    const diagram: OrbitalDiagram = {
      ...sampleDiagram,
      timelineAnnotations: [],
    };
    const html = renderOrbitalDiagram(diagram);
    assert.ok(!html.includes("timeline-bar"));
  });
});

describe("renderOrbitalDiagram with uncertaintyEllipses", () => {
  const diagramWithUncertainty: OrbitalDiagram = {
    ...sampleDiagram,
    uncertaintyEllipses: [
      {
        orbitId: "jupiter",
        semiMajor: 0.5,
        semiMinor: 0.15,
        rotation: Math.PI * 0.6,
        color: "rgba(255, 68, 68, 0.15)",
        label: "1.23° 航法誤差",
      },
    ],
  };

  it("renders uncertainty ellipse SVG element", () => {
    const html = renderOrbitalDiagram(diagramWithUncertainty);
    assert.ok(html.includes("<ellipse"));
    assert.ok(html.includes("rgba(255, 68, 68, 0.15)"));
  });

  it("renders uncertainty label", () => {
    const html = renderOrbitalDiagram(diagramWithUncertainty);
    assert.ok(html.includes("1.23° 航法誤差"));
  });

  it("includes uncertainty ellipse in legend", () => {
    const html = renderOrbitalDiagram(diagramWithUncertainty);
    // Legend should contain the label
    const legendIdx = html.indexOf("Legend");
    assert.ok(html.includes("1.23° 航法誤差"));
  });

  it("does NOT render uncertainty when omitted", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    assert.ok(!html.includes("<ellipse"));
  });

  it("skips ellipse for orbit without angle", () => {
    const diagramNoAngle: OrbitalDiagram = {
      ...sampleDiagram,
      orbits: [
        { id: "mars", label: "火星", radius: 1.524, color: "#f85149" },
        { id: "jupiter", label: "木星", radius: 5.203, color: "#d29922", angle: Math.PI * 0.6 },
      ],
      uncertaintyEllipses: [
        {
          orbitId: "mars",
          semiMajor: 0.3,
          semiMinor: 0.1,
          color: "rgba(255, 0, 0, 0.2)",
          label: "test",
        },
      ],
    };
    const html = renderOrbitalDiagram(diagramNoAngle);
    // Mars has no angle, so the ellipse should be skipped
    assert.ok(!html.includes("<ellipse"));
  });
});

describe("renderOrbitalDiagram with trajectoryVariations", () => {
  const diagramWithVariation: OrbitalDiagram = {
    ...sampleDiagram,
    trajectoryVariations: [
      {
        baseTransferLabel: "ブラキストクローネ遷移",
        color: "rgba(88, 166, 255, 0.2)",
        label: "質量 ±10% による航路変動",
        spread: 0.3,
      },
    ],
  };

  it("renders trajectory variation overlay", () => {
    const html = renderOrbitalDiagram(diagramWithVariation);
    // Should contain a wider stroke path for the variation
    assert.ok(html.includes("rgba(88, 166, 255, 0.2)"));
    assert.ok(html.includes("stroke-linecap"));
  });

  it("renders variation label", () => {
    const html = renderOrbitalDiagram(diagramWithVariation);
    assert.ok(html.includes("質量 ±10% による航路変動"));
  });

  it("does NOT render variation when omitted", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    assert.ok(!html.includes("stroke-linecap"));
  });
});

describe("renderTimeSeriesChart with error bands", () => {
  const chartWithErrorBand: TimeSeriesChart = {
    id: "test-error-band",
    title: "誤差バンドテスト",
    xLabel: "時間",
    yLabel: "値",
    series: [
      {
        label: "推定値",
        color: "#ff6644",
        x: [0, 1, 2, 3, 4],
        y: [10, 20, 30, 40, 50],
        yLow: [8, 16, 24, 32, 40],
        yHigh: [12, 24, 36, 48, 60],
        errorSource: "parameter",
      },
    ],
  };

  it("includes yLow and yHigh in JSON data", () => {
    const html = renderTimeSeriesChart(chartWithErrorBand);
    assert.ok(html.includes('"yLow"'));
    assert.ok(html.includes('"yHigh"'));
  });

  it("includes errorSource in JSON data", () => {
    const html = renderTimeSeriesChart(chartWithErrorBand);
    assert.ok(html.includes('"errorSource":"parameter"'));
  });

  it("still renders basic chart structure", () => {
    const html = renderTimeSeriesChart(chartWithErrorBand);
    assert.ok(html.includes('class="card uplot-chart"'));
    assert.ok(html.includes('class="uplot-target"'));
  });
});

describe("REPORT_CSS includes scale and timeline styles", () => {
  it("includes scale-ref styles", () => {
    assert.ok(REPORT_CSS.includes(".scale-ref"));
  });

  it("includes timeline-bar styles", () => {
    assert.ok(REPORT_CSS.includes(".timeline-bar"));
  });
});

describe("REPORT_CSS includes animation styles", () => {
  it("includes animation controls styles", () => {
    assert.ok(REPORT_CSS.includes(".orbital-animation-controls"));
  });
});

describe("renderEpisode includes animation script", () => {
  it("includes orbital-animation.js when diagrams are animated", () => {
    const report: EpisodeReport = {
      ...sampleEpisodeReport,
      diagrams: [animatedDiagram],
    };
    const html = renderEpisode(report);
    assert.ok(html.includes('orbital-animation.js'));
  });

  it("does NOT include orbital-animation.js for static diagrams", () => {
    const report: EpisodeReport = {
      ...sampleEpisodeReport,
      diagrams: [sampleDiagram],
    };
    const html = renderEpisode(report);
    assert.ok(!html.includes('orbital-animation.js'));
  });
});

// --- renderComparisonTable ---

const sampleComparisonTable: ComparisonTable = {
  caption: "テスト比較表",
  episodes: [1, 2, 3],
  rows: [
    {
      metric: "推力 (MN)",
      values: { 1: "9.8", 2: "0", 3: "9.8" },
      status: "ok",
      note: "一貫性あり",
    },
    {
      metric: "質量 (t)",
      values: { 1: "48,000", 2: "48,000", 3: "48,000" },
      status: "warn",
      note: "物理的に非整合",
    },
    {
      metric: "ΔV矛盾",
      values: { 1: "8,497", 2: "—", 3: "11,165" },
      status: "conflict",
      note: "公称質量で不可能",
    },
  ],
};

describe("renderComparisonTable", () => {
  it("renders a table element", () => {
    const html = renderComparisonTable(sampleComparisonTable);
    assert.ok(html.includes("<table"));
    assert.ok(html.includes("</table>"));
  });

  it("includes the caption", () => {
    const html = renderComparisonTable(sampleComparisonTable);
    assert.ok(html.includes("テスト比較表"));
  });

  it("includes episode headers", () => {
    const html = renderComparisonTable(sampleComparisonTable);
    assert.ok(html.includes("第1話"));
    assert.ok(html.includes("第2話"));
    assert.ok(html.includes("第3話"));
  });

  it("includes metric labels", () => {
    const html = renderComparisonTable(sampleComparisonTable);
    assert.ok(html.includes("推力 (MN)"));
    assert.ok(html.includes("質量 (t)"));
  });

  it("includes cell values", () => {
    const html = renderComparisonTable(sampleComparisonTable);
    assert.ok(html.includes("9.8"));
    assert.ok(html.includes("48,000"));
    assert.ok(html.includes("11,165"));
  });

  it("includes status classes", () => {
    const html = renderComparisonTable(sampleComparisonTable);
    assert.ok(html.includes("status-ok"));
    assert.ok(html.includes("status-warn"));
    assert.ok(html.includes("status-conflict"));
  });

  it("includes consistency notes", () => {
    const html = renderComparisonTable(sampleComparisonTable);
    assert.ok(html.includes("一貫性あり"));
    assert.ok(html.includes("物理的に非整合"));
  });

  it("renders dash for missing episode values", () => {
    const table: ComparisonTable = {
      caption: "部分データ",
      episodes: [1, 2],
      rows: [{
        metric: "テスト",
        values: { 1: "あり" },
        status: "ok",
        note: "ep2欠損",
      }],
    };
    const html = renderComparisonTable(table);
    assert.ok(html.includes("—"), "should show dash for missing ep2 value");
  });

  it("escapes HTML in values", () => {
    const table: ComparisonTable = {
      caption: "XSSテスト",
      episodes: [1],
      rows: [{
        metric: '<script>alert("xss")</script>',
        values: { 1: '<img src=x onerror=alert(1)>' },
        status: "ok",
        note: "safe",
      }],
    };
    const html = renderComparisonTable(table);
    assert.ok(!html.includes("<script>"));
    assert.ok(!html.includes("<img"));
  });

  it("includes パラメータ and 整合性 headers", () => {
    const html = renderComparisonTable(sampleComparisonTable);
    assert.ok(html.includes("パラメータ"));
    assert.ok(html.includes("整合性"));
  });
});

// --- renderSummaryPage ---

const sampleSummaryReport: SummaryReport = {
  slug: "test-summary",
  title: "テストサマリー",
  summary: "テスト用のサマリーページです。",
  sections: [
    {
      heading: "セクション1",
      markdown: "これは**テスト**です。",
      table: sampleComparisonTable,
    },
    {
      heading: "セクション2",
      markdown: "テーブルなしのセクション。",
    },
  ],
};

describe("renderSummaryPage", () => {
  it("renders a complete HTML page", () => {
    const html = renderSummaryPage(sampleSummaryReport);
    assert.ok(html.includes("<!DOCTYPE html>"));
    assert.ok(html.includes("</html>"));
  });

  it("includes the title", () => {
    const html = renderSummaryPage(sampleSummaryReport);
    assert.ok(html.includes("テストサマリー"));
  });

  it("includes the summary", () => {
    const html = renderSummaryPage(sampleSummaryReport);
    assert.ok(html.includes("テスト用のサマリーページです。"));
  });

  it("renders all sections", () => {
    const html = renderSummaryPage(sampleSummaryReport);
    assert.ok(html.includes("セクション1"));
    assert.ok(html.includes("セクション2"));
  });

  it("renders markdown content as HTML", () => {
    const html = renderSummaryPage(sampleSummaryReport);
    assert.ok(html.includes("<strong>テスト</strong>"));
  });

  it("includes comparison table in sections that have one", () => {
    const html = renderSummaryPage(sampleSummaryReport);
    assert.ok(html.includes("comparison-table"));
    assert.ok(html.includes("テスト比較表"));
  });

  it("includes navigation links", () => {
    const html = renderSummaryPage(sampleSummaryReport);
    assert.ok(html.includes("トップ"));
    assert.ok(html.includes("ログ"));
  });

  it("includes summary page links in nav when provided", () => {
    const summaryPages = [{ title: "総合分析", slug: "cross-ep", path: "summary/cross-ep.html" }];
    const html = renderSummaryPage(sampleSummaryReport, summaryPages);
    assert.ok(html.includes("総合分析"));
    assert.ok(html.includes("summary/cross-ep.html"));
  });

  it("uses .. as basePath for navigation", () => {
    const html = renderSummaryPage(sampleSummaryReport);
    assert.ok(html.includes('../index.html'));
  });

  it("renders orbital diagrams in sections that have them", () => {
    const reportWithDiagram: SummaryReport = {
      slug: "test-diagrams",
      title: "ダイアグラムテスト",
      summary: "軌道図テスト",
      sections: [
        {
          heading: "航路テスト",
          markdown: "テスト",
          orbitalDiagrams: [
            {
              id: "test-diagram",
              title: "テスト軌道図",
              centerLabel: "太陽",
              scaleMode: "log",
              radiusUnit: "AU",
              orbits: [
                { id: "earth", label: "地球", radius: 1.0, color: "#58a6ff" },
                { id: "mars", label: "火星", radius: 1.524, color: "#f85149", angle: 0 },
              ],
              transfers: [
                {
                  label: "テスト遷移",
                  fromOrbitId: "earth",
                  toOrbitId: "mars",
                  color: "#3fb950",
                  style: "brachistochrone",
                },
              ],
            },
          ],
        },
      ],
    };
    const html = renderSummaryPage(reportWithDiagram);
    assert.ok(html.includes("test-diagram"));
    assert.ok(html.includes("テスト軌道図"));
    assert.ok(html.includes("orbital-diagram"));
  });

  it("includes animation script when section has animated diagrams", () => {
    const reportWithAnimated: SummaryReport = {
      slug: "test-animated",
      title: "アニメーションテスト",
      summary: "テスト",
      sections: [
        {
          heading: "テスト",
          markdown: "テスト",
          orbitalDiagrams: [
            {
              id: "animated-test",
              title: "アニメーション付き",
              centerLabel: "太陽",
              orbits: [
                { id: "a", label: "A", radius: 1.0, color: "#fff" },
                { id: "b", label: "B", radius: 2.0, color: "#fff" },
              ],
              transfers: [
                { label: "T", fromOrbitId: "a", toOrbitId: "b", color: "#fff", style: "hohmann", startTime: 0, endTime: 100 },
              ],
              animation: { durationSeconds: 100 },
            },
          ],
        },
      ],
    };
    const html = renderSummaryPage(reportWithAnimated);
    assert.ok(html.includes("orbital-animation.js"));
  });

  it("does not include animation script when no animated diagrams", () => {
    const html = renderSummaryPage(sampleSummaryReport);
    assert.ok(!html.includes("orbital-animation.js"));
  });
});

// --- layoutHtml with summaryPages ---

describe("layoutHtml with summaryPages", () => {
  it("includes summary page links when provided", () => {
    const summaryPages = [
      { title: "クロスエピソード", slug: "cross-episode", path: "summary/cross-episode.html" },
    ];
    const html = layoutHtml("テスト", "<p>content</p>", ".", summaryPages);
    assert.ok(html.includes("クロスエピソード"));
    assert.ok(html.includes("summary/cross-episode.html"));
  });

  it("does not include summary nav when not provided", () => {
    const html = layoutHtml("テスト", "<p>content</p>", ".");
    // Only standard nav links
    assert.ok(html.includes("トップ"));
    assert.ok(html.includes("ログ"));
  });
});

// --- OGP meta tags ---

describe("layoutHtml OGP meta tags", () => {
  it("includes OGP meta tags with default description", () => {
    const html = layoutHtml("テスト", "<p>x</p>");
    assert.ok(html.includes('<meta property="og:title"'));
    assert.ok(html.includes('<meta property="og:description"'));
    assert.ok(html.includes('<meta property="og:type" content="article">'));
    assert.ok(html.includes('<meta property="og:site_name" content="SOLAR LINE 考察">'));
    assert.ok(html.includes('<meta name="description"'));
  });

  it("uses default description when none provided", () => {
    const html = layoutHtml("テスト", "<p>x</p>");
    assert.ok(html.includes("SFアニメ「SOLAR LINE」の軌道遷移をΔV計算で検証する考察プロジェクト"));
  });

  it("uses custom description when provided", () => {
    const html = layoutHtml("テスト", "<p>x</p>", ".", undefined, "カスタム説明文");
    assert.ok(html.includes('content="カスタム説明文"'));
  });

  it("escapes description HTML", () => {
    const html = layoutHtml("テスト", "<p>x</p>", ".", undefined, 'A "quoted" <desc>');
    assert.ok(html.includes("A &quot;quoted&quot; &lt;desc&gt;"));
  });
});

// --- renderIndex with summaryPages ---

describe("renderIndex with summaryPages", () => {
  it("includes 総合分析 section when summaryPages present", () => {
    const manifest: SiteManifest = {
      title: "SOLAR LINE 考察",
      generatedAt: "2026-02-23T00:00:00Z",
      episodes: [],
      logs: [],
      summaryPages: [
        { title: "クロスエピソード整合性分析", slug: "cross-episode", path: "summary/cross-episode.html" },
      ],
    };
    const html = renderIndex(manifest);
    assert.ok(html.includes("総合分析"));
    assert.ok(html.includes("クロスエピソード整合性分析"));
    assert.ok(html.includes("summary/cross-episode.html"));
  });

  it("does not include 総合分析 section when no summaryPages", () => {
    const manifest: SiteManifest = {
      title: "SOLAR LINE 考察",
      generatedAt: "2026-02-23T00:00:00Z",
      episodes: [],
      logs: [],
    };
    const html = renderIndex(manifest);
    assert.ok(!html.includes("総合分析"));
  });
});

// --- renderIndex enhanced content ---

describe("renderIndex enhanced content", () => {
  const enrichedManifest: SiteManifest = {
    title: "SOLAR LINE 考察",
    generatedAt: "2026-02-23T00:00:00Z",
    episodes: [
      {
        episode: 1,
        title: "火星からガニメデへ",
        transferCount: 4,
        summary: "きりたんが72時間でガニメデへ。",
        verdicts: { plausible: 1, conditional: 2, indeterminate: 0, implausible: 0, reference: 1 },
        path: "episodes/ep-001.html",
      },
      {
        episode: 2,
        title: "木星圏脱出",
        transferCount: 5,
        summary: "木星圏から土星へ。",
        verdicts: { plausible: 3, conditional: 1, indeterminate: 0, implausible: 0, reference: 1 },
        path: "episodes/ep-002.html",
      },
    ],
    totalVerdicts: { plausible: 4, conditional: 3, indeterminate: 0, implausible: 0, reference: 2 },
    logs: [],
  };

  it("includes project overview with creator name", () => {
    const html = renderIndex(enrichedManifest);
    assert.ok(html.includes("ゆえぴこ"), "should mention the creator");
  });

  it("includes project overview with ship name", () => {
    const html = renderIndex(enrichedManifest);
    assert.ok(html.includes("ケストレル"), "should mention the ship Kestrel");
  });

  it("includes route summary", () => {
    const html = renderIndex(enrichedManifest);
    assert.ok(html.includes("火星"), "should mention Mars");
    assert.ok(html.includes("ガニメデ"), "should mention Ganymede");
    assert.ok(html.includes("エンケラドス"), "should mention Enceladus");
    assert.ok(html.includes("タイタニア"), "should mention Titania");
    assert.ok(html.includes("地球"), "should mention Earth");
    assert.ok(html.includes("35.9 AU"), "should mention total distance");
  });

  it("renders stats section with total counts", () => {
    const html = renderIndex(enrichedManifest);
    assert.ok(html.includes("分析概要"), "should have stats heading");
    assert.ok(html.includes("2"), "should show episode count");
    assert.ok(html.includes("9"), "should show total transfer count");
  });

  it("renders verdict badges in stats section", () => {
    const html = renderIndex(enrichedManifest);
    assert.ok(html.includes("verdict-plausible"), "should have plausible badge");
    assert.ok(html.includes("verdict-conditional"), "should have conditional badge");
    assert.ok(html.includes("verdict-indeterminate"), "should have indeterminate badge");
  });

  it("renders episode cards with summaries", () => {
    const html = renderIndex(enrichedManifest);
    assert.ok(html.includes("きりたんが72時間でガニメデへ。"), "should show ep1 summary");
    assert.ok(html.includes("木星圏から土星へ。"), "should show ep2 summary");
  });

  it("renders episode cards with per-episode verdict badges", () => {
    const html = renderIndex(enrichedManifest);
    assert.ok(html.includes("episode-card"), "should use episode-card class");
    assert.ok(html.includes("episode-meta"), "should use episode-meta class");
  });

  it("hides stats section when no totalVerdicts", () => {
    const minimal: SiteManifest = {
      title: "SOLAR LINE 考察",
      generatedAt: "2026-02-23T00:00:00Z",
      episodes: [{ episode: 1, title: "T", transferCount: 1, path: "episodes/ep-001.html" }],
      logs: [],
    };
    const html = renderIndex(minimal);
    assert.ok(!html.includes("分析概要"), "should not have stats without totalVerdicts");
  });

  it("hides zero-count verdict badges in episode cards", () => {
    const html = renderIndex(enrichedManifest);
    // EP1 has 0 implausible, so verdict-implausible should not appear near EP1's section
    // But EP2 also has 0 implausible. Check that implausible badge doesn't appear in any episode card
    // (it should only appear in the total stats if count > 0)
    const episodeCardSection = html.split("エピソードレポート")[1];
    // implausible count is 0 for both episodes, so no implausible badge in episode cards
    assert.ok(!episodeCardSection?.includes("verdict-implausible") || !episodeCardSection?.includes("非現実的"), "should not show implausible badge when count is 0");
  });

  it("includes CSS for stats grid", () => {
    const html = renderIndex(enrichedManifest);
    assert.ok(html.includes("stats-grid"), "should include stats-grid class");
    assert.ok(html.includes("stat-number"), "should include stat-number class");
  });
});

// --- renderIndex verdict legend and series links ---

describe("renderIndex verdict legend and series links", () => {
  const manifest: SiteManifest = {
    title: "SOLAR LINE 考察",
    generatedAt: "2026-02-23T00:00:00Z",
    episodes: [
      { episode: 1, title: "火星からガニメデへ", transferCount: 4, path: "episodes/ep-001.html" },
    ],
    totalVerdicts: { plausible: 2, conditional: 1, indeterminate: 0, implausible: 0, reference: 1 },
    logs: [],
  };

  it("includes verdict legend section", () => {
    const html = renderIndex(manifest);
    assert.ok(html.includes("判定バッジの見かた"), "should have verdict legend heading");
    assert.ok(html.includes("計算結果が作中描写と整合"), "should explain plausible");
    assert.ok(html.includes("特定の条件"), "should explain conditional");
    assert.ok(html.includes("参考計算値"), "should explain reference");
    assert.ok(html.includes("物理法則との明確な矛盾"), "should explain implausible");
  });

  it("includes series watching links", () => {
    const html = renderIndex(manifest);
    assert.ok(html.includes("視聴リンク"), "should have watching links section");
    assert.ok(html.includes("nicovideo.jp"), "should link to Niconico");
    assert.ok(html.includes("youtube.com"), "should link to YouTube");
    assert.ok(html.includes("CQ_OkDjEwRk"), "should have Part 1 YouTube ID");
  });

  it("includes project intro with brachistochrone mention", () => {
    const html = renderIndex(manifest);
    assert.ok(html.includes("brachistochrone"), "should mention brachistochrone");
    assert.ok(html.includes("ホーマン遷移"), "should mention Hohmann transfer");
    assert.ok(html.includes("重力アシスト"), "should mention gravity assist");
  });

  it("uses dynamic transfer count in overview", () => {
    const html = renderIndex(manifest);
    assert.ok(html.includes("全4件の軌道遷移"), "should use dynamic total transfer count");
  });
});

// --- Accessibility attributes ---

describe("SVG accessibility attributes", () => {
  it("orbital diagram SVG has role=img and aria-label", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    assert.ok(html.includes('role="img"'));
    assert.ok(html.includes('aria-label="'));
    assert.ok(html.includes("太陽中心の軌道図"));
  });

  it("orbital diagram aria-label includes title and center label", () => {
    const html = renderOrbitalDiagram(sampleDiagram);
    assert.ok(html.includes("火星→ガニメデ ブラキストクローネ遷移 — 太陽中心の軌道図"));
  });

  it("bar chart SVG has role=img and aria-label", () => {
    const html = renderBarChart("ΔV 比較", [
      { label: "A", value: 100 },
    ], "km/s");
    assert.ok(html.includes('role="img"'));
    assert.ok(html.includes('aria-label="ΔV 比較"'));
  });

  it("escapes HTML in orbital diagram aria-label", () => {
    const diagram: OrbitalDiagram = {
      id: "test-aria-escape",
      title: 'Test <script>"alert"</script>',
      centerLabel: "太陽",
      orbits: [],
      transfers: [],
    };
    const html = renderOrbitalDiagram(diagram);
    assert.ok(!html.includes('<script>"alert"</script>'));
    assert.ok(html.includes("&lt;script&gt;"));
  });
});

describe("calculator accessibility attributes", () => {
  it("range sliders have aria-label", () => {
    const html = renderCalculator();
    assert.ok(html.includes('aria-label="距離 (AU)"'));
    assert.ok(html.includes('aria-label="船質量 (t)"'));
    assert.ok(html.includes('aria-label="遷移時間 (h)"'));
  });

  it("range sliders have aria-describedby linking to assumptions", () => {
    const html = renderCalculator();
    assert.ok(html.includes('id="calc-assumptions"'));
    assert.ok(html.includes('aria-describedby="calc-assumptions"'));
  });

  it("results section has aria-live for dynamic updates", () => {
    const html = renderCalculator();
    assert.ok(html.includes('aria-live="polite"'));
  });
});

describe("animation controls accessibility attributes", () => {
  it("play button has aria-label", () => {
    const html = renderOrbitalDiagram(animatedDiagram);
    assert.ok(html.includes('aria-label="再生"'));
  });

  it("time slider has aria-label and aria-value attributes", () => {
    const html = renderOrbitalDiagram(animatedDiagram);
    assert.ok(html.includes('aria-label="アニメーション時間"'));
    assert.ok(html.includes('aria-valuemin="0"'));
    assert.ok(html.includes('aria-valuemax="1000"'));
    assert.ok(html.includes('aria-valuenow="0"'));
  });

  it("time display has aria-live for dynamic updates", () => {
    const html = renderOrbitalDiagram(animatedDiagram);
    // The time-display span should have aria-live
    assert.ok(/<span class="time-display" aria-live="polite">/.test(html));
  });

  it("animation controls group has role and aria-label", () => {
    const html = renderOrbitalDiagram(animatedDiagram);
    assert.ok(html.includes('role="group"'));
    assert.ok(html.includes('aria-label="アニメーション操作"'));
  });
});

// --- Task 027: Report quality improvements ---

describe("renderTransferCard renders markdown in explanation", () => {
  it("renders bold text in explanation", () => {
    const t = { ...sampleTransfer, explanation: "This is **important** and has a `code` snippet." };
    const html = renderTransferCard(t);
    assert.ok(html.includes("<strong>important</strong>"));
    assert.ok(html.includes("<code>code</code>"));
  });

  it("renders list items in explanation", () => {
    const t = { ...sampleTransfer, explanation: "Results:\n- Item A\n- Item B" };
    const html = renderTransferCard(t);
    assert.ok(html.includes("<li>Item A</li>"));
    assert.ok(html.includes("<li>Item B</li>"));
  });

  it("renders ordered list items in explanation", () => {
    const t = { ...sampleTransfer, explanation: "条件:\n1. 順行方向への離脱\n2. 木星重力圏外\n3. 追加噴射なし" };
    const html = renderTransferCard(t);
    assert.ok(html.includes("<ol>"));
    assert.ok(html.includes("<li>順行方向への離脱</li>"));
    assert.ok(html.includes("<li>木星重力圏外</li>"));
    assert.ok(html.includes("<li>追加噴射なし</li>"));
    assert.ok(html.includes("</ol>"));
  });
});

describe("renderEpisode prev/next navigation", () => {
  it("renders prev/next links when totalEpisodes provided", () => {
    const report: EpisodeReport = { ...sampleEpisodeReport, episode: 2 };
    const html = renderEpisode(report, undefined, 5);
    assert.ok(html.includes("← 第1話"));
    assert.ok(html.includes("第3話 →"));
    assert.ok(html.includes("ep-001.html"));
    assert.ok(html.includes("ep-003.html"));
  });

  it("omits prev link for episode 1", () => {
    const html = renderEpisode(sampleEpisodeReport, undefined, 5);
    assert.ok(!html.includes("← 第0話"));
    assert.ok(html.includes("第2話 →"));
  });

  it("omits next link for last episode", () => {
    const report: EpisodeReport = { ...sampleEpisodeReport, episode: 5 };
    const html = renderEpisode(report, undefined, 5);
    assert.ok(html.includes("← 第4話"));
    assert.ok(!html.includes("第6話 →"));
  });

  it("skips nav when totalEpisodes not provided", () => {
    const html = renderEpisode(sampleEpisodeReport);
    assert.ok(!html.includes("← 第"));
  });
});

describe("renderEpisode provisional badge", () => {
  it("shows provisional badge when summary contains 暫定", () => {
    const report: EpisodeReport = {
      ...sampleEpisodeReport,
      summary: "※暫定版: 字幕データ未取得のため予測分析。",
    };
    const html = renderEpisode(report);
    assert.ok(html.includes("暫定分析"));
    assert.ok(html.includes("verdict-indeterminate"));
  });

  it("does not show provisional badge for normal reports", () => {
    const html = renderEpisode(sampleEpisodeReport);
    assert.ok(!html.includes("暫定分析"));
  });
});

describe("renderComparisonTable smart numeric detection", () => {
  it("applies numeric class to number-like values", () => {
    const table: ComparisonTable = {
      caption: "Test",
      episodes: [1],
      rows: [{ metric: "Speed", values: { 1: "9.8" }, status: "ok", note: "ok" }],
    };
    const html = renderComparisonTable(table);
    assert.ok(html.includes('class="numeric"'));
  });

  it("does not apply numeric class to text values", () => {
    const table: ComparisonTable = {
      caption: "Test",
      episodes: [1],
      rows: [{ metric: "Status", values: { 1: "損傷（65%出力）" }, status: "ok", note: "ok" }],
    };
    const html = renderComparisonTable(table);
    // The cell for "損傷（65%出力）" should NOT have numeric class
    assert.ok(html.includes("<td>損傷（65%出力）</td>"));
  });

  it("applies numeric class to dash placeholder", () => {
    const table: ComparisonTable = {
      caption: "Test",
      episodes: [1],
      rows: [{ metric: "Speed", values: { 1: "—" }, status: "ok", note: "ok" }],
    };
    const html = renderComparisonTable(table);
    assert.ok(html.includes('class="numeric">—</td>'));
  });
});

describe("renderEpisode renders summary as markdown", () => {
  it("renders bold in episode summary", () => {
    const report: EpisodeReport = {
      ...sampleEpisodeReport,
      summary: "This is **important** context.",
    };
    const html = renderEpisode(report);
    assert.ok(html.includes("<strong>important</strong>"));
  });
});

describe("SVG marker IDs are unique per transfer index", () => {
  it("generates unique arrow IDs for same-orbit-pair transfers", () => {
    const diagram: OrbitalDiagram = {
      id: "test-dup",
      title: "Test",
      centerLabel: "Sun",
      scaleMode: "sqrt",
      radiusUnit: "AU",
      orbits: [
        { id: "a", label: "A", radius: 1.0, color: "#fff" },
        { id: "b", label: "B", radius: 5.0, color: "#aaa" },
      ],
      transfers: [
        { label: "T1", fromOrbitId: "a", toOrbitId: "b", color: "#f00", style: "hohmann" },
        { label: "T2", fromOrbitId: "a", toOrbitId: "b", color: "#0f0", style: "brachistochrone" },
      ],
    };
    const html = renderOrbitalDiagram(diagram);
    assert.ok(html.includes('id="arrow-a-b-0"'));
    assert.ok(html.includes('id="arrow-a-b-1"'));
  });
});

// --- Task 161: Multi-scenario orbital diagram UI ---

describe("renderOrbitalDiagram multi-scenario support", () => {
  const multiScenarioDiagram: OrbitalDiagram = {
    id: "test-multi-scenario",
    title: "Scenario comparison",
    centerLabel: "太陽",
    scaleMode: "sqrt",
    radiusUnit: "AU",
    orbits: [
      { id: "mars", label: "火星", radius: 1.5, color: "#f00", angle: 0.5, meanMotion: 1e-7 },
      { id: "jupiter", label: "木星", radius: 5.2, color: "#0f0", angle: 2.0, meanMotion: 1e-8 },
    ],
    scenarios: [
      { id: "fast", label: "72h (299t)" },
      { id: "slow", label: "150h (1,297t)" },
    ],
    transfers: [
      { label: "Fast", fromOrbitId: "mars", toOrbitId: "jupiter", color: "#ff0", style: "brachistochrone", scenarioId: "fast", startTime: 0, endTime: 259200 },
      { label: "Slow", fromOrbitId: "mars", toOrbitId: "jupiter", color: "#0ff", style: "brachistochrone", scenarioId: "slow", startTime: 0, endTime: 540000 },
    ],
    animation: { durationSeconds: 540000 },
  };

  it("adds data-scenario attribute to transfer paths", () => {
    const html = renderOrbitalDiagram(multiScenarioDiagram);
    assert.ok(html.includes('data-scenario="fast"'), "should have fast scenario attr");
    assert.ok(html.includes('data-scenario="slow"'), "should have slow scenario attr");
  });

  it("renders scenario-based legend instead of style-based", () => {
    const html = renderOrbitalDiagram(multiScenarioDiagram);
    assert.ok(html.includes("72h (299t)"), "should have fast scenario label in legend");
    assert.ok(html.includes("150h (1,297t)"), "should have slow scenario label in legend");
  });

  it("non-primary scenario arcs get reduced opacity", () => {
    const html = renderOrbitalDiagram(multiScenarioDiagram);
    assert.ok(html.includes('stroke-opacity="0.6"'), "alt scenario should have reduced opacity");
  });

  it("includes scenario data in animation JSON", () => {
    const html = renderOrbitalDiagram(multiScenarioDiagram);
    const jsonMatch = html.match(/<script type="application\/json" class="orbital-animation-data">([\s\S]*?)<\/script>/);
    assert.ok(jsonMatch, "should have animation data JSON");
    const data = JSON.parse(jsonMatch![1]);
    assert.ok(data.scenarios, "should have scenarios in animation data");
    assert.equal(data.scenarios.length, 2);
    assert.equal(data.scenarios[0].id, "fast");
    assert.equal(data.scenarios[1].id, "slow");
  });

  it("includes scenarioId on animated transfers", () => {
    const html = renderOrbitalDiagram(multiScenarioDiagram);
    const jsonMatch = html.match(/<script type="application\/json" class="orbital-animation-data">([\s\S]*?)<\/script>/);
    const data = JSON.parse(jsonMatch![1]);
    const fastTransfer = data.transfers.find((t: any) => t.scenarioId === "fast");
    const slowTransfer = data.transfers.find((t: any) => t.scenarioId === "slow");
    assert.ok(fastTransfer, "should have fast scenario transfer");
    assert.ok(slowTransfer, "should have slow scenario transfer");
  });
});

describe("REPORT_CSS includes scenario toggle styles", () => {
  it("has .scenario-toggles container styles", () => {
    assert.ok(REPORT_CSS.includes(".scenario-toggles"), "should have scenario-toggles CSS");
  });

  it("has .scenario-toggle button styles", () => {
    assert.ok(REPORT_CSS.includes(".scenario-toggle"), "should have scenario-toggle CSS");
  });

  it("has .scenario-toggle.active state", () => {
    assert.ok(REPORT_CSS.includes(".scenario-toggle.active"), "should have active toggle CSS");
  });
});

// --- Task 041: Report navigation and source link improvements ---

describe("source citations render as clickable links", () => {
  it("renders URL source citations as links", () => {
    const transfer: TransferAnalysis = {
      ...sampleTransfer,
      sources: [{
        claim: "船の質量: 約48000 t",
        sourceType: "worldbuilding-doc",
        sourceRef: "https://note.com/yuepicos/n/n4da939fc40ed",
        sourceLabel: "世界設定資料「ソーラーラインのよもやま話」",
      }],
    };
    const html = renderTransferCard(transfer);
    assert.ok(html.includes('href="https://note.com/yuepicos/n/n4da939fc40ed"'));
    assert.ok(html.includes('target="_blank"'));
    assert.ok(html.includes("世界設定資料「ソーラーラインのよもやま話」"));
  });

  it("renders Niconico source refs as links", () => {
    const transfer: TransferAnalysis = {
      ...sampleTransfer,
      sources: [{
        claim: "72時間の期限",
        sourceType: "episode-dialogue",
        sourceRef: "sm45280425 01:14",
        sourceLabel: "Part 1 01:14「72時間以内に届けてほしい」",
      }],
    };
    const html = renderTransferCard(transfer);
    assert.ok(html.includes('href="https://www.nicovideo.jp/watch/sm45280425"'));
    assert.ok(html.includes("Part 1 01:14"));
  });

  it("renders plain text for non-URL non-Niconico refs", () => {
    const transfer: TransferAnalysis = {
      ...sampleTransfer,
      sources: [{
        claim: "火星軌道半径",
        sourceType: "external-reference",
        sourceRef: "NASA JPL Solar System Dynamics",
        sourceLabel: "NASA/JPL 太陽系力学データ",
      }],
    };
    const html = renderTransferCard(transfer);
    assert.ok(html.includes("NASA/JPL 太陽系力学データ"));
    assert.ok(!html.includes('href="NASA'));
  });
});

describe("markdownToHtml supports links", () => {
  it("converts markdown links to HTML anchor tags", () => {
    const html = markdownToHtml("See [the docs](https://example.com) for details.");
    assert.ok(html.includes('<a href="https://example.com">the docs</a>'));
  });

  it("converts inline links in list items", () => {
    const html = markdownToHtml("- [Link A](https://a.com)\n- [Link B](https://b.com)");
    assert.ok(html.includes('<a href="https://a.com">Link A</a>'));
    assert.ok(html.includes('<a href="https://b.com">Link B</a>'));
  });
});

describe("renderEpisode table of contents", () => {
  it("renders TOC with transfer links", () => {
    const html = renderEpisode(sampleEpisodeReport, undefined, 5);
    assert.ok(html.includes("目次"));
    assert.ok(html.includes(`href="#${sampleTransfer.id}"`));
    assert.ok(html.includes("Earth to Mars Hohmann Transfer"));
  });

  it("renders TOC with section links", () => {
    const report: EpisodeReport = {
      ...sampleEpisodeReport,
      dialogueQuotes: [sampleQuote],
      diagrams: [sampleDiagram],
    };
    const html = renderEpisode(report, undefined, 5);
    assert.ok(html.includes('href="#section-dialogue"'));
    assert.ok(html.includes('href="#section-diagrams"'));
    assert.ok(html.includes('href="#section-transfers"'));
    assert.ok(html.includes('href="#calculator"'));
  });

  it("adds id attributes to section headings", () => {
    const report: EpisodeReport = {
      ...sampleEpisodeReport,
      dialogueQuotes: [sampleQuote],
      diagrams: [sampleDiagram],
    };
    const html = renderEpisode(report, undefined, 5);
    assert.ok(html.includes('id="section-dialogue"'));
    assert.ok(html.includes('id="section-diagrams"'));
    assert.ok(html.includes('id="section-transfers"'));
  });

  it("includes verdict badges in TOC", () => {
    const html = renderEpisode(sampleEpisodeReport, undefined, 5);
    assert.ok(html.includes("verdict-plausible"));
  });
});

describe("renderSummaryPage section anchors", () => {
  it("adds id attributes to summary sections", () => {
    const html = renderSummaryPage(sampleSummaryReport);
    assert.ok(html.includes('id="セクション1"'));
    assert.ok(html.includes('id="セクション2"'));
  });

  it("renders TOC for multi-section summary", () => {
    const html = renderSummaryPage(sampleSummaryReport);
    assert.ok(html.includes("目次"));
    assert.ok(html.includes('href="#セクション1"'));
    assert.ok(html.includes('href="#セクション2"'));
  });

  it("does not render TOC for single-section summary", () => {
    const report: SummaryReport = {
      slug: "single",
      title: "テスト",
      summary: "テスト",
      sections: [{ heading: "唯一", markdown: "テスト" }],
    };
    const html = renderSummaryPage(report);
    assert.ok(!html.includes("目次"));
  });
});

// --- renderEventTimeline ---

describe("renderEventTimeline", () => {
  const timeline: EventTimeline = {
    caption: "テスト タイムライン",
    events: [
      {
        episode: 1,
        timestamp: "01:00",
        label: "イベント1",
        description: "最初のイベント",
        stateChanges: ["変化A", "変化B"],
      },
      {
        episode: 2,
        label: "イベント2",
        description: "2番目のイベント",
      },
    ],
  };

  it("renders timeline container with caption", () => {
    const html = renderEventTimeline(timeline);
    assert.ok(html.includes("event-timeline"));
    assert.ok(html.includes("テスト タイムライン"));
  });

  it("renders all events", () => {
    const html = renderEventTimeline(timeline);
    assert.ok(html.includes("イベント1"));
    assert.ok(html.includes("イベント2"));
    assert.ok(html.includes("最初のイベント"));
    assert.ok(html.includes("2番目のイベント"));
  });

  it("renders episode numbers", () => {
    const html = renderEventTimeline(timeline);
    assert.ok(html.includes("第1話"));
    assert.ok(html.includes("第2話"));
  });

  it("renders timestamp when present", () => {
    const html = renderEventTimeline(timeline);
    assert.ok(html.includes("01:00"));
  });

  it("renders state changes when present", () => {
    const html = renderEventTimeline(timeline);
    assert.ok(html.includes("state-changes"));
    assert.ok(html.includes("変化A"));
    assert.ok(html.includes("変化B"));
  });

  it("does not render state changes when absent", () => {
    const html = renderEventTimeline(timeline);
    // Event 2 has no stateChanges — check it doesn't have an empty list
    const event2Section = html.split("イベント2")[1];
    assert.ok(event2Section);
    // The event2 section should not contain state-changes class before the next event
    const nextEventIdx = event2Section.indexOf("timeline-event");
    const relevantSection = nextEventIdx > 0 ? event2Section.substring(0, nextEventIdx) : event2Section;
    assert.ok(!relevantSection.includes("state-changes"));
  });

  it("includes data-episode attributes", () => {
    const html = renderEventTimeline(timeline);
    assert.ok(html.includes('data-episode="1"'));
    assert.ok(html.includes('data-episode="2"'));
  });

  it("escapes HTML in labels and descriptions", () => {
    const dangerousTimeline: EventTimeline = {
      caption: "<script>alert('xss')</script>",
      events: [{
        episode: 1,
        label: "<b>bold</b>",
        description: "safe & sound",
      }],
    };
    const html = renderEventTimeline(dangerousTimeline);
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(!html.includes("<b>bold</b>"));
    assert.ok(html.includes("safe &amp; sound"));
  });
});

// --- renderVerificationTable ---

describe("renderVerificationTable", () => {
  const table: VerificationTable = {
    caption: "テスト検証表",
    rows: [
      {
        claim: "天王星磁場傾斜角",
        episode: 4,
        depicted: "60°",
        reference: "59.7°",
        source: "Voyager 2",
        accuracyPercent: 99.5,
        status: "verified",
      },
      {
        claim: "巡航速度",
        episode: 3,
        depicted: "3,000 km/s",
        reference: "2,791 km/s",
        source: "計算値",
        accuracyPercent: 93.0,
        status: "approximate",
      },
      {
        claim: "地球捕捉ΔV",
        episode: 5,
        depicted: "※暫定",
        reference: "0.42 km/s",
        source: "vis-viva",
        accuracyPercent: null,
        status: "unverified",
      },
    ],
  };

  it("renders table with caption", () => {
    const html = renderVerificationTable(table);
    assert.ok(html.includes("verification-table"));
    assert.ok(html.includes("テスト検証表"));
  });

  it("renders column headers in Japanese", () => {
    const html = renderVerificationTable(table);
    assert.ok(html.includes("検証項目"));
    assert.ok(html.includes("話数"));
    assert.ok(html.includes("作中値"));
    assert.ok(html.includes("実測/文献値"));
    assert.ok(html.includes("精度"));
    assert.ok(html.includes("判定"));
    assert.ok(html.includes("出典"));
  });

  it("renders all rows", () => {
    const html = renderVerificationTable(table);
    assert.ok(html.includes("天王星磁場傾斜角"));
    assert.ok(html.includes("巡航速度"));
    assert.ok(html.includes("地球捕捉ΔV"));
  });

  it("renders accuracy percentages", () => {
    const html = renderVerificationTable(table);
    assert.ok(html.includes("99.5%"));
    assert.ok(html.includes("93.0%"));
  });

  it("renders dash for null accuracy", () => {
    const html = renderVerificationTable(table);
    // Unverified row with null accuracy should show "—"
    assert.ok(html.includes("—"));
  });

  it("renders verification badges with status", () => {
    const html = renderVerificationTable(table);
    assert.ok(html.includes("検証済"));
    assert.ok(html.includes("近似一致"));
    assert.ok(html.includes("未検証"));
  });

  it("applies status CSS classes", () => {
    const html = renderVerificationTable(table);
    assert.ok(html.includes("status-verified"));
    assert.ok(html.includes("status-approximate"));
    assert.ok(html.includes("status-unverified"));
  });

  it("renders episode numbers", () => {
    const html = renderVerificationTable(table);
    assert.ok(html.includes("第4話"));
    assert.ok(html.includes("第3話"));
    assert.ok(html.includes("第5話"));
  });

  it("escapes HTML in claim text", () => {
    const dangerousTable: VerificationTable = {
      caption: "test",
      rows: [{
        claim: "<script>xss</script>",
        episode: 1,
        depicted: "test",
        reference: "test",
        source: "test",
        accuracyPercent: null,
        status: "verified",
      }],
    };
    const html = renderVerificationTable(dangerousTable);
    assert.ok(!html.includes("<script>xss</script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  });
});

// --- renderSummaryPage with new section types ---

describe("renderSummaryPage with eventTimeline and verificationTable", () => {
  it("renders eventTimeline in summary section", () => {
    const report: SummaryReport = {
      slug: "test-timeline",
      title: "テスト",
      summary: "テスト",
      sections: [{
        heading: "タイムライン",
        markdown: "テスト",
        eventTimeline: {
          caption: "テスト",
          events: [{ episode: 1, label: "テスト", description: "テスト" }],
        },
      }],
    };
    const html = renderSummaryPage(report);
    assert.ok(html.includes("event-timeline"));
    assert.ok(html.includes("timeline-track"));
  });

  it("renders verificationTable in summary section", () => {
    const report: SummaryReport = {
      slug: "test-verification",
      title: "テスト",
      summary: "テスト",
      sections: [{
        heading: "検証",
        markdown: "テスト",
        verificationTable: {
          caption: "テスト",
          rows: [{
            claim: "テスト",
            episode: 1,
            depicted: "1",
            reference: "1",
            source: "テスト",
            accuracyPercent: 100,
            status: "verified",
          }],
        },
      }],
    };
    const html = renderSummaryPage(report);
    assert.ok(html.includes("verification-table"));
    assert.ok(html.includes("検証済"));
  });
});

// --- formatNumericValue ---

describe("formatNumericValue", () => {
  it("formats small numbers with fixed decimals", () => {
    assert.equal(formatNumericValue(42.5), "42.50");
    assert.equal(formatNumericValue(0.75), "0.75");
  });

  it("formats moderate numbers with locale separators", () => {
    const result = formatNumericValue(1202.5);
    // Should NOT use exponential for numbers just over 1000
    assert.ok(!result.includes("e+"), `Expected no exponential but got: ${result}`);
    assert.ok(result.includes("1,202") || result.includes("1202"), `Expected comma-formatted but got: ${result}`);
  });

  it("formats large numbers with locale separators up to 1e9", () => {
    const result = formatNumericValue(1500000);
    assert.ok(!result.includes("e+"), `Expected no exponential but got: ${result}`);
    assert.ok(result.includes("1,500,000") || result.includes("1500000"), `Expected readable but got: ${result}`);
  });

  it("uses exponential for very large numbers (>=1e9)", () => {
    const result = formatNumericValue(2.5e10);
    assert.ok(result.includes("e+"), `Expected exponential but got: ${result}`);
  });

  it("uses exponential for very small numbers (<1e-4)", () => {
    const result = formatNumericValue(0.0000123);
    assert.ok(result.includes("e-"), `Expected exponential but got: ${result}`);
  });

  it("formats zero correctly", () => {
    assert.equal(formatNumericValue(0), "0.00");
  });

  it("respects custom decimal places", () => {
    const result = formatNumericValue(42.567, 1);
    assert.ok(result.includes("42.6") || result.includes("42.5"), `Expected 1 decimal place but got: ${result}`);
  });

  it("handles negative numbers", () => {
    const result = formatNumericValue(-1500);
    assert.ok(!result.includes("e"), `Expected no exponential for -1500 but got: ${result}`);
  });
});

// --- autoLinkEpisodeRefs ---

describe("autoLinkEpisodeRefs", () => {
  it("links 第N話 to episode page", () => {
    const result = autoLinkEpisodeRefs("第1話のデータ", "../episodes");
    assert.ok(result.includes('<a href="../episodes/ep-001.html"'));
    assert.ok(result.includes("第1話</a>"));
  });

  it("links multiple episode references", () => {
    const result = autoLinkEpisodeRefs("第1話と第3話を比較", "../episodes");
    assert.ok(result.includes('ep-001.html'));
    assert.ok(result.includes('ep-003.html'));
  });

  it("handles episode 5", () => {
    const result = autoLinkEpisodeRefs("第5話の最終分析", "../episodes");
    assert.ok(result.includes('ep-005.html'));
  });

  it("does not link inside <a> tags", () => {
    const result = autoLinkEpisodeRefs('<a href="foo">第1話</a>', "../episodes");
    // Should not double-wrap with another <a>
    assert.ok(!result.includes('ep-autolink'));
  });

  it("does not link inside <code> tags", () => {
    const result = autoLinkEpisodeRefs('<code>第2話</code>', "../episodes");
    assert.ok(!result.includes('ep-autolink'));
  });

  it("links text outside <code> but not inside", () => {
    const result = autoLinkEpisodeRefs('第1話のコード<code>第2話</code>と第3話', "../episodes");
    assert.ok(result.includes('ep-001.html'));
    assert.ok(!result.includes('ep-002.html') || result.includes('<code>第2話</code>'));
    assert.ok(result.includes('ep-003.html'));
  });

  it("does not match 第0話 or 第10話", () => {
    const result = autoLinkEpisodeRefs("第0話と第10話", "../episodes");
    assert.ok(!result.includes('ep-autolink'));
  });

  it("uses custom basePath", () => {
    const result = autoLinkEpisodeRefs("第4話", "./eps");
    assert.ok(result.includes('./eps/ep-004.html'));
  });

  it("adds ep-autolink class", () => {
    const result = autoLinkEpisodeRefs("第1話", "../episodes");
    assert.ok(result.includes('class="ep-autolink"'));
  });
});

// --- markdownToHtml with autoLinkEpisodes ---

describe("markdownToHtml with autoLinkEpisodes", () => {
  it("auto-links episode references when enabled", () => {
    const html = markdownToHtml("第1話では火星→ガニメデ遷移を分析した。", { autoLinkEpisodes: true });
    assert.ok(html.includes('ep-001.html'));
    assert.ok(html.includes('ep-autolink'));
  });

  it("does not auto-link when disabled (default)", () => {
    const html = markdownToHtml("第1話では火星→ガニメデ遷移を分析した。");
    assert.ok(!html.includes('ep-autolink'));
  });

  it("does not auto-link inside code blocks", () => {
    const html = markdownToHtml("```\n第1話\n```", { autoLinkEpisodes: true });
    assert.ok(!html.includes('ep-autolink'));
  });

  it("uses custom episodeBasePath", () => {
    const html = markdownToHtml("第2話", { autoLinkEpisodes: true, episodeBasePath: "./ep" });
    assert.ok(html.includes('./ep/ep-002.html'));
  });

  it("auto-links in headings", () => {
    const html = markdownToHtml("## 第3話の分析", { autoLinkEpisodes: true });
    assert.ok(html.includes('ep-003.html'));
  });

  it("auto-links in list items", () => {
    const html = markdownToHtml("- 第1話: 火星\n- 第2話: 木星", { autoLinkEpisodes: true });
    assert.ok(html.includes('ep-001.html'));
    assert.ok(html.includes('ep-002.html'));
  });
});

// --- renderEpisodeNav ---

describe("renderEpisodeNav", () => {
  const sampleEpisodes: SiteManifest["episodes"] = [
    { episode: 1, title: "SOLAR LINE Part 1 — 火星→ガニメデ", transferCount: 4, path: "episodes/ep-001.html" },
    { episode: 2, title: "SOLAR LINE Part 2 — 木星脱出", transferCount: 5, path: "episodes/ep-002.html" },
    { episode: 3, title: "SOLAR LINE Part 3 — タイタニア", transferCount: 5, path: "episodes/ep-003.html" },
  ];

  it("renders episode navigation chips", () => {
    const html = renderEpisodeNav(sampleEpisodes);
    assert.ok(html.includes("ep-nav-strip"));
    assert.ok(html.includes("第1話"));
    assert.ok(html.includes("第2話"));
    assert.ok(html.includes("第3話"));
  });

  it("links to correct episode pages", () => {
    const html = renderEpisodeNav(sampleEpisodes);
    assert.ok(html.includes('../episodes/ep-001.html'));
    assert.ok(html.includes('../episodes/ep-002.html'));
    assert.ok(html.includes('../episodes/ep-003.html'));
  });

  it("includes episode label", () => {
    const html = renderEpisodeNav(sampleEpisodes);
    assert.ok(html.includes("エピソード:"));
  });

  it("returns empty string for empty episodes", () => {
    assert.equal(renderEpisodeNav([]), "");
  });

  it("uses custom basePath", () => {
    const html = renderEpisodeNav(sampleEpisodes, "./ep");
    assert.ok(html.includes('./ep/ep-001.html'));
  });

  it("strips SOLAR LINE Part prefix from titles", () => {
    const html = renderEpisodeNav(sampleEpisodes);
    // Should show the route part, not the full "SOLAR LINE Part N —" prefix
    assert.ok(html.includes("火星→ガニメデ"));
    assert.ok(!html.includes("SOLAR LINE Part 1"));
  });
});

// --- renderSummaryPage with episodes ---

describe("renderSummaryPage with episode cross-links", () => {
  const sampleReport: SummaryReport = {
    slug: "test-summary",
    title: "テスト総合分析",
    summary: "第1話から第5話を横断した分析。",
    sections: [
      {
        heading: "テストセクション",
        markdown: "第1話では72時間の遷移を行った。第3話ではタイタニアへ向かった。",
      },
    ],
  };

  const sampleEpisodes: SiteManifest["episodes"] = [
    { episode: 1, title: "火星→ガニメデ", transferCount: 4, path: "episodes/ep-001.html" },
    { episode: 2, title: "木星脱出", transferCount: 5, path: "episodes/ep-002.html" },
  ];

  it("includes episode nav strip when episodes provided", () => {
    const html = renderSummaryPage(sampleReport, undefined, sampleEpisodes);
    assert.ok(html.includes('class="ep-nav-strip'));
    assert.ok(html.includes("第1話"));
    assert.ok(html.includes("第2話"));
  });

  it("auto-links episode references in section markdown", () => {
    const html = renderSummaryPage(sampleReport, undefined, sampleEpisodes);
    assert.ok(html.includes('ep-001.html'));
    assert.ok(html.includes('ep-003.html'));
    assert.ok(html.includes('ep-autolink'));
  });

  it("auto-links episode references in summary", () => {
    const html = renderSummaryPage(sampleReport);
    // Even without episodes passed, auto-linking should still work
    assert.ok(html.includes('ep-001.html'));
    assert.ok(html.includes('ep-005.html'));
  });

  it("omits episode nav strip when no episodes provided", () => {
    const html = renderSummaryPage(sampleReport);
    // CSS will always contain "ep-nav-strip", so check for the actual nav element
    assert.ok(!html.includes('class="ep-nav-strip'));
  });
});

// --- formatTimestamp ---

describe("formatTimestamp", () => {
  it("formats seconds to MM:SS", () => {
    assert.equal(formatTimestamp(5000), "00:05");
    assert.equal(formatTimestamp(65000), "01:05");
    assert.equal(formatTimestamp(0), "00:00");
  });

  it("formats hours to HH:MM:SS", () => {
    assert.equal(formatTimestamp(3661000), "1:01:01");
    assert.equal(formatTimestamp(7200000), "2:00:00");
  });

  it("formats sub-hour correctly", () => {
    assert.equal(formatTimestamp(599000), "09:59");
  });
});

// --- renderTranscriptionPage ---

describe("renderTranscriptionPage", () => {
  const phase1Only: TranscriptionPageData = {
    episode: 1,
    videoId: "test123",
    sourceInfo: { source: "whisper", language: "ja" },
    lines: [
      { lineId: "ep01-line-001", startMs: 5000, endMs: 10000, text: "テスト台詞", mergeReasons: [] },
      { lineId: "ep01-line-002", startMs: 15000, endMs: 20000, text: "二番目の台詞", mergeReasons: ["small_gap"] },
    ],
    dialogue: null,
    speakers: null,
    scenes: null,
    title: null,
  };

  const phase2Done: TranscriptionPageData = {
    episode: 2,
    videoId: "test456",
    sourceInfo: { source: "youtube-auto", language: "ja" },
    lines: [
      { lineId: "ep02-line-001", startMs: 0, endMs: 5000, text: "Hello", mergeReasons: [] },
    ],
    dialogue: [
      { speakerId: "kiritan", speakerName: "きりたん", text: "こんにちは", startMs: 0, endMs: 3000, confidence: "verified", sceneId: "ep02-scene-01" },
      { speakerId: "kestrel-ai", speakerName: "ケストレルAI", text: "了解です", startMs: 3000, endMs: 5000, confidence: "inferred", sceneId: "ep02-scene-01" },
    ],
    speakers: [
      { id: "kiritan", nameJa: "きりたん", notes: "船長" },
      { id: "kestrel-ai", nameJa: "ケストレルAI", notes: "AI" },
    ],
    scenes: [
      { id: "ep02-scene-01", startMs: 0, endMs: 10000, description: "冒頭シーン" },
    ],
    title: "テストエピソード",
  };

  it("renders Phase 1 page with raw lines", () => {
    const html = renderTranscriptionPage(phase1Only);
    assert.ok(html.includes("文字起こし"));
    assert.ok(html.includes("第1話"));
    assert.ok(html.includes("テスト台詞"));
    assert.ok(html.includes("二番目の台詞"));
    assert.ok(html.includes("00:05"));
    assert.ok(html.includes("Whisper STT"));
    assert.ok(html.includes("2行"));
    assert.ok(html.includes("Phase 1 のみ"));
    assert.ok(html.includes("Whisper STT（前処理済み）"));
    assert.ok(html.includes("small_gap"));
  });

  it("renders Phase 2 page with attributed dialogue", () => {
    const html = renderTranscriptionPage(phase2Done);
    assert.ok(html.includes("テストエピソード"));
    assert.ok(html.includes("きりたん"));
    assert.ok(html.includes("ケストレルAI"));
    assert.ok(html.includes("こんにちは"));
    assert.ok(html.includes("了解です"));
    assert.ok(html.includes("Phase 2 完了"));
    assert.ok(html.includes("修正版（話者帰属済み）"));
    assert.ok(html.includes("台詞データ"));
    assert.ok(html.includes("話者一覧"));
    assert.ok(html.includes("船長"));
    assert.ok(html.includes("冒頭シーン"));
    assert.ok(html.includes("確認済み"));
    assert.ok(html.includes("推定"));
  });

  it("renders source info correctly", () => {
    const html = renderTranscriptionPage(phase2Done);
    assert.ok(html.includes("YouTube 自動字幕"));
    assert.ok(html.includes("test456"));
  });

  it("includes back link to episode analysis", () => {
    const html = renderTranscriptionPage(phase1Only);
    assert.ok(html.includes("ep-001.html"));
    assert.ok(html.includes("考察レポートに戻る"));
  });

  it("includes navigation", () => {
    const html = renderTranscriptionPage(phase1Only);
    assert.ok(html.includes("トップ"));
    assert.ok(html.includes("文字起こし"));
    assert.ok(html.includes("ログ"));
  });

  it("escapes HTML in dialogue text", () => {
    const data: TranscriptionPageData = {
      ...phase1Only,
      lines: [{ lineId: "l1", startMs: 0, endMs: 1000, text: '<script>alert("xss")</script>', mergeReasons: [] }],
    };
    const html = renderTranscriptionPage(data);
    assert.ok(!html.includes("<script>alert"));
    assert.ok(html.includes("&lt;script&gt;"));
  });

  it("renders tab UI when Phase 2 has multiple sources", () => {
    const data: TranscriptionPageData = {
      ...phase2Done,
      additionalSources: [{
        source: "whisper",
        language: "ja",
        lines: [
          { lineId: "w1", startMs: 0, endMs: 5000, text: "Whisperテスト", mergeReasons: [] },
        ],
      }],
    };
    const html = renderTranscriptionPage(data);
    // Should have tab container with 3 tabs
    assert.ok(html.includes("tab-container"));
    assert.ok(html.includes("Layer 3: 修正版（話者帰属済み）"));
    assert.ok(html.includes("Layer 2: YouTube 自動字幕（前処理済み）"));
    assert.ok(html.includes("Layer 2: Whisper STT（前処理済み）"));
    assert.ok(html.includes("Whisperテスト"));
    // Tab switching script
    assert.ok(html.includes("tab-btn"));
    assert.ok(html.includes("tab-panel"));
  });

  it("renders single tab without tab UI when Phase 1 only", () => {
    const html = renderTranscriptionPage(phase1Only);
    // No tab buttons for single source (CSS class exists in stylesheet but no tab markup)
    assert.ok(!html.includes('<button class="tab-btn'));
    assert.ok(!html.includes('<div class="tab-container'));
    assert.ok(html.includes("Whisper STT（前処理済み）"));
    assert.ok(html.includes("テスト台詞"));
  });

  it("renders two tabs for Phase 2 without additional sources", () => {
    const html = renderTranscriptionPage(phase2Done);
    // corrected tab + primary raw tab = 2 tabs → tab UI shown
    assert.ok(html.includes("tab-container"));
    assert.ok(html.includes("Layer 3: 修正版（話者帰属済み）"));
    assert.ok(html.includes("Layer 2: YouTube 自動字幕（前処理済み）"));
  });

  it("shows all sources in source info card", () => {
    const data: TranscriptionPageData = {
      ...phase1Only,
      additionalSources: [{
        source: "youtube-auto",
        language: "ja",
        lines: [
          { lineId: "v1", startMs: 0, endMs: 3000, text: "VTTテスト", mergeReasons: [] },
        ],
      }],
    };
    const html = renderTranscriptionPage(data);
    assert.ok(html.includes("Whisper STT（2行）"));
    assert.ok(html.includes("YouTube 自動字幕（1行）"));
  });

  it("displays Whisper model info when available", () => {
    const data: TranscriptionPageData = {
      ...phase1Only,
      sourceInfo: { source: "whisper", language: "ja", whisperModel: "medium" },
    };
    const html = renderTranscriptionPage(data);
    assert.ok(html.includes("モデル: medium"));
    assert.ok(html.includes("[medium]"));
  });

  it("displays layer legend with 3 tiers", () => {
    const html = renderTranscriptionPage(phase2Done);
    assert.ok(html.includes("データレイヤー"));
    assert.ok(html.includes("Layer 3"));
    assert.ok(html.includes("Layer 2"));
    assert.ok(html.includes("Layer 1"));
    assert.ok(html.includes("layer-badge"));
  });

  it("shows Whisper model in additional source tab label", () => {
    const data: TranscriptionPageData = {
      ...phase2Done,
      additionalSources: [{
        source: "whisper",
        language: "ja",
        whisperModel: "large-v3",
        lines: [
          { lineId: "w1", startMs: 0, endMs: 5000, text: "テスト", mergeReasons: [] },
        ],
      }],
    };
    const html = renderTranscriptionPage(data);
    assert.ok(html.includes("[large-v3]"));
  });
});

// --- renderTranscriptionIndex ---

describe("renderTranscriptionIndex", () => {
  it("renders index with episode list", () => {
    const transcriptions: TranscriptionPageData[] = [
      {
        episode: 1, videoId: "v1", sourceInfo: { source: "whisper", language: "ja" },
        lines: [{ lineId: "l1", startMs: 0, endMs: 1000, text: "test", mergeReasons: [] }],
        dialogue: null, speakers: null, scenes: null, title: null,
      },
      {
        episode: 2, videoId: "v2", sourceInfo: { source: "youtube-auto", language: "ja" },
        lines: [
          { lineId: "l1", startMs: 0, endMs: 1000, text: "a", mergeReasons: [] },
          { lineId: "l2", startMs: 1000, endMs: 2000, text: "b", mergeReasons: [] },
        ],
        dialogue: [
          { speakerId: "k", speakerName: "きりたん", text: "a", startMs: 0, endMs: 1000, confidence: "verified", sceneId: "s1" },
        ],
        speakers: [{ id: "k", nameJa: "きりたん" }],
        scenes: [{ id: "s1", startMs: 0, endMs: 5000, description: "scene" }],
        title: "Second",
      },
    ];
    const html = renderTranscriptionIndex(transcriptions);
    assert.ok(html.includes("文字起こしデータ"));
    assert.ok(html.includes("第1話"));
    assert.ok(html.includes("第2話"));
    assert.ok(html.includes("ep-001.html"));
    assert.ok(html.includes("ep-002.html"));
    assert.ok(html.includes("Phase 1 のみ"));
    assert.ok(html.includes("Phase 2 完了"));
    assert.ok(html.includes("2エピソード"));
    assert.ok(html.includes("3抽出行"));
    assert.ok(html.includes("1帰属台詞"));
  });

  it("renders empty transcription list gracefully", () => {
    const html = renderTranscriptionIndex([]);
    assert.ok(html.includes("文字起こしデータ"));
    assert.ok(html.includes("0エピソード"));
  });
});

// --- renderTaskDashboard ---

describe("renderTaskDashboard", () => {
  it("renders task dashboard with progress stats", () => {
    const tasks = [
      { number: 1, title: "First Task", status: "DONE" as const, summary: "Done." },
      { number: 2, title: "Second Task", status: "TODO" as const, summary: "Pending." },
      { number: 3, title: "Third Task", status: "IN_PROGRESS" as const, summary: "Working." },
    ];
    const html = renderTaskDashboard(tasks);
    assert.ok(html.includes("タスク状況ダッシュボード"), "should have title");
    assert.ok(html.includes("合計: 3タスク"), "should show total count");
    assert.ok(html.includes("完了: 1"), "should show done count");
    assert.ok(html.includes("進行中: 1"), "should show in-progress count");
    assert.ok(html.includes("未着手: 1"), "should show todo count");
    assert.ok(html.includes("33%"), "should show completion percentage");
    assert.ok(html.includes("First Task"), "should list task titles");
    assert.ok(html.includes("完了"), "should show done badge");
    assert.ok(html.includes("進行中"), "should show in-progress badge");
    assert.ok(html.includes("未着手"), "should show todo badge");
  });

  it("sorts in-progress first, then todo, then done", () => {
    const tasks = [
      { number: 1, title: "Done Task", status: "DONE" as const, summary: null },
      { number: 2, title: "IP Task", status: "IN_PROGRESS" as const, summary: null },
      { number: 3, title: "Todo Task", status: "TODO" as const, summary: null },
    ];
    const html = renderTaskDashboard(tasks);
    const ipPos = html.indexOf("IP Task");
    const todoPos = html.indexOf("Todo Task");
    const donePos = html.indexOf("Done Task");
    assert.ok(ipPos < todoPos, "in-progress should come before todo");
    assert.ok(todoPos < donePos, "todo should come before done");
  });

  it("handles empty task list", () => {
    const html = renderTaskDashboard([]);
    assert.ok(html.includes("タスク状況ダッシュボード"), "should have title");
    assert.ok(html.includes("合計: 0タスク"), "should show zero tasks");
  });

  it("includes nav link to task dashboard", () => {
    const html = layoutHtml("Test", "<p>content</p>");
    assert.ok(html.includes("タスク状況"), "nav should include task dashboard link");
    assert.ok(html.includes("meta/tasks.html"), "nav should link to tasks page");
  });
});

// --- renderTransferSummaryCard ---

describe("renderTransferSummaryCard", () => {
  const transfer: TransferAnalysis = {
    id: "ep05-transfer-02",
    episode: 5,
    description: "天王星→地球 brachistochrone",
    timestamp: "02:36",
    claimedDeltaV: null,
    computedDeltaV: 15207,
    assumptions: ["Isp = 10^6 s"],
    verdict: "conditional",
    explanation: "First paragraph of explanation.\n\nSecond paragraph with more details.",
    parameters: {},
  };

  it("renders compact card with detail link", () => {
    const html = renderTransferSummaryCard(transfer, "ep-005/transfer-02.html", 3);
    assert.ok(html.includes("transfer-summary"), "should have transfer-summary class");
    assert.ok(html.includes('href="ep-005/transfer-02.html"'), "should link to detail page");
    assert.ok(html.includes("詳細分析を見る"), "should have detail link text");
    assert.ok(html.includes("3件のパラメータ探索"), "should show exploration count");
  });

  it("renders verdict badge", () => {
    const html = renderTransferSummaryCard(transfer, "ep-005/transfer-02.html", 0);
    assert.ok(html.includes("verdict-conditional"), "should show conditional verdict");
  });

  it("renders ΔV when available", () => {
    const html = renderTransferSummaryCard(transfer, "ep-005/transfer-02.html", 0);
    assert.ok(html.includes("15207.00 km/s"), "should show computed ΔV");
  });

  it("omits exploration badge when count is 0", () => {
    const html = renderTransferSummaryCard(transfer, "ep-005/transfer-02.html", 0);
    assert.ok(!html.includes("パラメータ探索"), "should not show exploration badge");
  });
});

// --- renderTransferDetailPage ---

describe("renderTransferDetailPage", () => {
  const baseReport: EpisodeReport = {
    episode: 5,
    title: "SOLAR LINE Part 5 END",
    summary: "Summary text",
    transfers: [
      {
        id: "ep05-transfer-02",
        episode: 5,
        description: "天王星→地球 brachistochrone",
        timestamp: "02:36",
        claimedDeltaV: null,
        computedDeltaV: 15207,
        assumptions: [],
        verdict: "conditional",
        explanation: "Detailed explanation.",
        parameters: {},
        evidenceQuoteIds: ["ep05-quote-01"],
      },
    ],
    dialogueQuotes: [
      {
        id: "ep05-quote-01",
        speaker: "ケイ",
        text: "推定所要時間は507時間",
        timestamp: "02:36",
      },
    ],
    explorations: [
      {
        id: "ep05-exploration-01",
        transferId: "ep05-transfer-02",
        question: "質量シナリオ分析",
        scenarios: [
          {
            label: "48,000t",
            variedParam: "mass",
            variedValue: 48000,
            variedUnit: "t",
            results: { accel: 1.5 },
            feasible: true,
            note: "Feasible",
          },
        ],
        summary: "All scenarios feasible.",
      },
    ],
  };

  const detailPage: TransferDetailPage = {
    slug: "transfer-02",
    transferIds: ["ep05-transfer-02"],
  };

  it("renders breadcrumb navigation", () => {
    const html = renderTransferDetailPage(baseReport, detailPage, baseReport.transfers, baseReport.explorations!, [], []);
    assert.ok(html.includes('class="breadcrumb"'), "should have breadcrumb");
    assert.ok(html.includes("トップ"), "should link to top");
    assert.ok(html.includes("第5話"), "should link to parent episode");
    assert.ok(html.includes("ep-005.html"), "should link to correct episode file");
  });

  it("renders transfer card with explorations", () => {
    const html = renderTransferDetailPage(baseReport, detailPage, baseReport.transfers, baseReport.explorations!, [], []);
    assert.ok(html.includes("ep05-transfer-02"), "should render transfer ID");
    assert.ok(html.includes("質量シナリオ分析"), "should render explorations");
  });

  it("renders back link", () => {
    const html = renderTransferDetailPage(baseReport, detailPage, baseReport.transfers, baseReport.explorations!, [], []);
    assert.ok(html.includes("第5話に戻る"), "should have back link");
  });

  it("uses custom title when specified", () => {
    const dpWithTitle: TransferDetailPage = { ...detailPage, title: "Custom Title" };
    const html = renderTransferDetailPage(baseReport, dpWithTitle, baseReport.transfers, baseReport.explorations!, [], []);
    assert.ok(html.includes("Custom Title"), "should use custom title");
  });

  it("renders inline citations from dialogueQuotes", () => {
    const html = renderTransferDetailPage(baseReport, detailPage, baseReport.transfers, baseReport.explorations!, [], []);
    assert.ok(html.includes("推定所要時間は507時間"), "should include dialogue quotes as citations");
  });
});

// --- renderEpisode with detailPages ---

describe("renderEpisode with detailPages", () => {
  const reportWithDetails: EpisodeReport = {
    episode: 5,
    title: "Test Episode",
    summary: "Test summary",
    transfers: [
      {
        id: "ep05-transfer-01",
        episode: 5,
        description: "Reference transfer",
        timestamp: "01:00",
        claimedDeltaV: null,
        computedDeltaV: 15.94,
        assumptions: [],
        verdict: "reference",
        explanation: "Reference value.",
        parameters: {},
      },
      {
        id: "ep05-transfer-02",
        episode: 5,
        description: "Brachistochrone transit",
        timestamp: "02:36",
        claimedDeltaV: null,
        computedDeltaV: 15207,
        assumptions: [],
        verdict: "conditional",
        explanation: "Detailed analysis.",
        parameters: {},
      },
    ],
    explorations: [
      {
        id: "ep05-exploration-01",
        transferId: "ep05-transfer-02",
        question: "Mass scenarios",
        scenarios: [{ label: "S1", variedParam: "m", variedValue: 48000, variedUnit: "t", results: {}, feasible: true, note: "ok" }],
        summary: "Done.",
      },
    ],
    detailPages: [
      {
        slug: "transfer-02",
        transferIds: ["ep05-transfer-02"],
      },
    ],
  };

  it("renders summary card for transfers with detail pages", () => {
    const html = renderEpisode(reportWithDetails);
    assert.ok(html.includes("transfer-summary"), "should render summary card for transfer-02");
    assert.ok(html.includes("ep-005/transfer-02.html"), "should link to detail page");
    assert.ok(html.includes("詳細分析を見る"), "should include detail link");
  });

  it("still renders full card for transfers without detail pages", () => {
    const html = renderEpisode(reportWithDetails);
    assert.ok(html.includes('id="ep05-transfer-01"'), "should render transfer-01 with full card");
    assert.ok(html.includes("Reference value."), "should include full explanation");
  });

  it("shows detail badge in TOC for detail-page transfers", () => {
    const html = renderEpisode(reportWithDetails);
    assert.ok(html.includes("詳細ページ"), "should show detail badge in TOC");
  });

  it("renders normal episode when no detailPages", () => {
    const normalReport: EpisodeReport = {
      ...reportWithDetails,
      detailPages: undefined,
    };
    const html = renderEpisode(normalReport);
    assert.ok(!html.includes('class="card transfer-summary"'), "should not have summary card elements");
    assert.ok(!html.includes("詳細ページ"), "should not have detail badges in TOC");
  });
});

// --- renderExplorerPage ---

describe("renderExplorerPage", () => {
  it("renders page with all required elements", () => {
    const html = renderExplorerPage();
    assert.ok(html.includes("データエクスプローラー"), "should have title");
    assert.ok(html.includes("explorer-status"), "should have status element");
    assert.ok(html.includes("explorer-query"), "should have query textarea");
    assert.ok(html.includes("explorer-exec"), "should have execute button");
    assert.ok(html.includes("explorer-schema"), "should have schema button");
    assert.ok(html.includes("explorer-presets"), "should have presets container");
    assert.ok(html.includes("explorer-result"), "should have result container");
    assert.ok(html.includes("explorer-chart"), "should have chart container");
    assert.ok(html.includes("duckdb-explorer.js"), "should load explorer script");
  });

  it("documents all tables", () => {
    const html = renderExplorerPage();
    assert.ok(html.includes("transfers"), "should document transfers table");
    assert.ok(html.includes("dialogue"), "should document dialogue table");
    assert.ok(html.includes("dag_nodes"), "should document dag_nodes table");
    assert.ok(html.includes("dag_edges"), "should document dag_edges table");
  });

  it("includes base-path meta tag", () => {
    const html = renderExplorerPage();
    assert.ok(html.includes('name="base-path"'), "should have base-path meta tag");
  });

  it("nav link to explorer appears in layout", () => {
    const html = layoutHtml("Test", "<p>content</p>");
    assert.ok(html.includes("データ探索"), "nav should include explorer link");
    assert.ok(html.includes("explorer/index.html"), "nav should link to explorer page");
  });
});

// --- renderADRIndex ---

describe("renderADRIndex", () => {
  const sampleADRs: ADRRenderEntry[] = [
    { number: 1, title: "Test Accepted", status: "Accepted", content: "# ADR-001\n\n## Status\n\nAccepted", slug: "001-test-accepted" },
    { number: 2, title: "Test Proposed", status: "Proposed", content: "# ADR-002\n\n## Status\n\nProposed", slug: "002-test-proposed" },
  ];

  it("renders Proposed status with implausible badge", () => {
    const html = renderADRIndex(sampleADRs);
    assert.ok(html.includes("verdict-implausible"), "should use implausible badge for Proposed");
    assert.ok(html.includes("Proposed"), "should show Proposed text");
  });

  it("renders Accepted status with plausible badge", () => {
    const html = renderADRIndex(sampleADRs);
    assert.ok(html.includes("verdict-plausible"), "should use plausible badge for Accepted");
  });

  it("shows proposed section when proposed ADRs exist", () => {
    const html = renderADRIndex(sampleADRs);
    assert.ok(html.includes("承認待ちの提案"), "should show proposed section header");
    assert.ok(html.includes("1件"), "should show count of proposed ADRs");
    assert.ok(html.includes("Test Proposed"), "should list proposed ADR title");
  });

  it("hides proposed section when no proposed ADRs", () => {
    const acceptedOnly = [sampleADRs[0]];
    const html = renderADRIndex(acceptedOnly);
    assert.ok(!html.includes("承認待ちの提案"), "should not show proposed section");
  });
});

// --- Task 131: Orbital animation arrival alignment ---

/**
 * Helper: extract the last point of an SVG path from rendered HTML.
 * Matches data-transfer-path paths and parses the endpoint coordinates.
 */
function extractPathEndpoint(html: string, pathId: string): { x: number; y: number } | null {
  // Find the path element with matching data-transfer-path (d= may come before or after)
  const pathRegex = new RegExp(`<path[^>]*data-transfer-path="${pathId}"[^>]*>`);
  const pathRegex2 = new RegExp(`<path[^>]*data-transfer-path="${pathId}"[^/]*/>`);
  const elemMatch = html.match(pathRegex) ?? html.match(pathRegex2);
  if (!elemMatch) return null;

  const elem = elemMatch[0];
  const dMatch = elem.match(/d="([^"]+)"/);
  if (!dMatch) return null;

  const d = dMatch[1];

  // For quadratic Bezier: M x1 y1 Q cx cy x2 y2 — endpoint is the last two numbers
  const quadMatch = d.match(/Q\s+[\d.e+-]+\s+[\d.e+-]+\s+([\d.e+-]+)\s+([\d.e+-]+)/);
  if (quadMatch) {
    return { x: parseFloat(quadMatch[1]), y: parseFloat(quadMatch[2]) };
  }

  // For SVG arc: M x1 y1 A rx ry rot flag1 flag2 x2 y2 — endpoint is the last two numbers
  const arcMatch = d.match(/A\s+[\d.e+-]+\s+[\d.e+-]+\s+[\d.e+-]+\s+[\d.e+-]+\s+[\d.e+-]+\s+([\d.e+-]+)\s+([\d.e+-]+)/);
  if (arcMatch) {
    return { x: parseFloat(arcMatch[1]), y: parseFloat(arcMatch[2]) };
  }

  return null;
}

/**
 * Helper: extract body dot position from rendered HTML.
 * Matches the circle element with data-orbit-id.
 */
function extractBodyDotPosition(html: string, orbitId: string): { x: number; y: number } | null {
  // Find the circle with data-orbit-id and r="4" (body dot, not orbit circle)
  const regex = new RegExp(`<circle[^>]*data-orbit-id="${orbitId}"[^>]*>`);
  const elems = html.match(new RegExp(regex.source, "g"));
  if (!elems) return null;
  // Find the one with r="4" (body dot)
  for (const elem of elems) {
    if (!elem.includes('r="4"')) continue;
    const cxMatch = elem.match(/cx="([\d.e+-]+)"/);
    const cyMatch = elem.match(/cy="([\d.e+-]+)"/);
    if (cxMatch && cyMatch) {
      return { x: parseFloat(cxMatch[1]), y: parseFloat(cyMatch[1]) };
    }
  }
  return null;
}

describe("Task 131: transfer arc arrival alignment", () => {
  it("brachistochrone arc endpoint matches destination body position", () => {
    const diagram: OrbitalDiagram = {
      id: "test-arrival-brach",
      title: "Arrival alignment test",
      centerLabel: "太陽",
      scaleMode: "sqrt",
      radiusUnit: "AU",
      orbits: [
        { id: "from", label: "出発", radius: 1.5, color: "#f00", angle: 0.5, meanMotion: 1e-7 },
        { id: "to", label: "到着", radius: 5.0, color: "#0f0", angle: 2.3, meanMotion: 1e-8 },
      ],
      transfers: [{
        label: "Brachistochrone",
        fromOrbitId: "from",
        toOrbitId: "to",
        color: "#00f",
        style: "brachistochrone",
        startTime: 0,
        endTime: 259200,
      }],
      animation: { durationSeconds: 259200 },
    };
    const html = renderOrbitalDiagram(diagram);
    const endpoint = extractPathEndpoint(html, "from-to-0");
    const bodyPos = extractBodyDotPosition(html, "to");
    assert.ok(endpoint, "should find transfer path endpoint");
    assert.ok(bodyPos, "should find destination body dot");
    // The arc endpoint should be within a small tolerance of the body dot
    const dist = Math.sqrt((endpoint.x - bodyPos.x) ** 2 + (endpoint.y - bodyPos.y) ** 2);
    assert.ok(dist < 2, `arc endpoint (${endpoint.x}, ${endpoint.y}) should be near body dot (${bodyPos.x}, ${bodyPos.y}), distance=${dist.toFixed(1)}`);
  });

  it("hyperbolic arc endpoint matches destination body position", () => {
    const diagram: OrbitalDiagram = {
      id: "test-arrival-hyper",
      title: "Hyperbolic arrival test",
      centerLabel: "木星",
      scaleMode: "sqrt",
      radiusUnit: "RJ",
      orbits: [
        { id: "inner", label: "内側", radius: 10, color: "#f00", angle: 1.0, meanMotion: 4e-5 },
        { id: "outer", label: "外側", radius: 50, color: "#0f0", angle: 2.5, meanMotion: 4e-6 },
      ],
      transfers: [{
        label: "Hyperbolic",
        fromOrbitId: "inner",
        toOrbitId: "outer",
        color: "#ff0",
        style: "hyperbolic",
        startTime: 0,
        endTime: 100000,
      }],
      animation: { durationSeconds: 100000 },
    };
    const html = renderOrbitalDiagram(diagram);
    const endpoint = extractPathEndpoint(html, "inner-outer-0");
    const bodyPos = extractBodyDotPosition(html, "outer");
    assert.ok(endpoint, "should find transfer path endpoint");
    assert.ok(bodyPos, "should find destination body dot");
    const dist = Math.sqrt((endpoint.x - bodyPos.x) ** 2 + (endpoint.y - bodyPos.y) ** 2);
    assert.ok(dist < 2, `hyperbolic arc endpoint should be near body dot, distance=${dist.toFixed(1)}`);
  });

  it("hohmann arc endpoint matches destination body position", () => {
    const diagram: OrbitalDiagram = {
      id: "test-arrival-hohmann",
      title: "Hohmann arrival test",
      centerLabel: "太陽",
      scaleMode: "sqrt",
      radiusUnit: "AU",
      orbits: [
        { id: "inner", label: "内側", radius: 1.0, color: "#f00", angle: 0, meanMotion: 2e-7 },
        { id: "outer", label: "外側", radius: 5.2, color: "#0f0", angle: 3.5, meanMotion: 1.7e-8 },
      ],
      transfers: [{
        label: "Hohmann",
        fromOrbitId: "inner",
        toOrbitId: "outer",
        color: "#0ff",
        style: "hohmann",
        startTime: 0,
        endTime: 50000000,
      }],
      animation: { durationSeconds: 50000000 },
    };
    const html = renderOrbitalDiagram(diagram);
    const endpoint = extractPathEndpoint(html, "inner-outer-0");
    const bodyPos = extractBodyDotPosition(html, "outer");
    assert.ok(endpoint, "should find transfer path endpoint");
    assert.ok(bodyPos, "should find destination body dot");
    const dist = Math.sqrt((endpoint.x - bodyPos.x) ** 2 + (endpoint.y - bodyPos.y) ** 2);
    assert.ok(dist < 2, `hohmann arc endpoint should be near body dot, distance=${dist.toFixed(1)}`);
  });

  it("non-animated diagram still renders correctly (no toAngle constraint)", () => {
    // Non-animated diagrams use the original geometric arc style
    const diagram: OrbitalDiagram = {
      id: "test-static",
      title: "Static diagram",
      centerLabel: "太陽",
      scaleMode: "sqrt",
      radiusUnit: "AU",
      orbits: [
        { id: "mars", label: "火星", radius: 1.5, color: "#f00", angle: 0 },
        { id: "jupiter", label: "木星", radius: 5.2, color: "#0f0", angle: 2.0 },
      ],
      transfers: [{
        label: "Reference",
        fromOrbitId: "mars",
        toOrbitId: "jupiter",
        color: "#aaa",
        style: "hohmann",
        // No startTime/endTime — static reference arc
      }],
    };
    const html = renderOrbitalDiagram(diagram);
    // Should render without errors
    assert.ok(html.includes('<path d="M'));
  });

  it("animated diagram with multiple transfers aligns all endpoints", () => {
    const diagram: OrbitalDiagram = {
      id: "test-multi-transfer",
      title: "Multi-transfer alignment",
      centerLabel: "木星",
      scaleMode: "sqrt",
      radiusUnit: "RJ",
      orbits: [
        { id: "ganymede", label: "ガニメデ", radius: 15, color: "#f00", angle: 0.8, meanMotion: 1e-5 },
        { id: "escape", label: "脱出", radius: 50, color: "#0f0", angle: 1.5 },
      ],
      transfers: [{
        label: "Escape",
        fromOrbitId: "ganymede",
        toOrbitId: "escape",
        color: "#ff0",
        style: "hyperbolic",
        startTime: 0,
        endTime: 252000,
      }],
      animation: { durationSeconds: 252000 },
    };
    const html = renderOrbitalDiagram(diagram);
    const endpoint = extractPathEndpoint(html, "ganymede-escape-0");
    const bodyPos = extractBodyDotPosition(html, "escape");
    assert.ok(endpoint, "should find transfer path endpoint");
    assert.ok(bodyPos, "should find destination body dot");
    const dist = Math.sqrt((endpoint.x - bodyPos.x) ** 2 + (endpoint.y - bodyPos.y) ** 2);
    assert.ok(dist < 2, `escape arc endpoint should be near body dot, distance=${dist.toFixed(1)}`);
  });

  it("arc start point matches departure body position", () => {
    const diagram: OrbitalDiagram = {
      id: "test-departure-align",
      title: "Departure alignment test",
      centerLabel: "太陽",
      scaleMode: "sqrt",
      radiusUnit: "AU",
      orbits: [
        { id: "from", label: "出発", radius: 1.5, color: "#f00", angle: 0.5, meanMotion: 1e-7 },
        { id: "to", label: "到着", radius: 5.0, color: "#0f0", angle: 2.3, meanMotion: 1e-8 },
      ],
      transfers: [{
        label: "Brachistochrone",
        fromOrbitId: "from",
        toOrbitId: "to",
        color: "#00f",
        style: "brachistochrone",
        startTime: 0,
        endTime: 259200,
      }],
      animation: { durationSeconds: 259200 },
    };
    const html = renderOrbitalDiagram(diagram);
    // Extract the M (move-to) point from the path — this should match departure body
    const pathElem = html.match(/<path[^>]*data-transfer-path="from-to-0"[^>]*>/);
    assert.ok(pathElem, "should find transfer path element");
    const match = pathElem![0].match(/d="M\s+([\d.e+-]+)\s+([\d.e+-]+)/);
    assert.ok(match, "should find path start point");
    const startX = parseFloat(match![1]);
    const startY = parseFloat(match![2]);
    const bodyPos = extractBodyDotPosition(html, "from");
    assert.ok(bodyPos, "should find departure body dot");
    const dist = Math.sqrt((startX - bodyPos.x) ** 2 + (startY - bodyPos.y) ** 2);
    assert.ok(dist < 2, `arc start (${startX}, ${startY}) should be near departure body (${bodyPos.x}, ${bodyPos.y}), distance=${dist.toFixed(1)}`);
  });
});

// --- renderGlossary ---

describe("renderGlossary", () => {
  it("renders glossary terms in a table", () => {
    const terms: GlossaryTerm[] = [
      { term: "ΔV", reading: "デルタブイ", definition: "速度変化量。軌道変更に必要なエネルギーの指標。" },
      { term: "brachistochrone", definition: "最短時間軌道遷移。中間点で反転し常時加速する航法。" },
    ];
    const html = renderGlossary(terms);
    assert.ok(html.includes("<table>"));
    assert.ok(html.includes("ΔV"));
    assert.ok(html.includes("デルタブイ"));
    assert.ok(html.includes("brachistochrone"));
    assert.ok(html.includes("用語"));
    assert.ok(html.includes("説明"));
  });

  it("returns empty string for empty glossary", () => {
    assert.equal(renderGlossary([]), "");
  });

  it("omits reading when not provided", () => {
    const terms: GlossaryTerm[] = [
      { term: "SOI", definition: "重力圏。天体の重力が支配的な領域。" },
    ];
    const html = renderGlossary(terms);
    assert.ok(html.includes("SOI"));
    assert.ok(!html.includes("("));
  });

  it("escapes HTML in terms and definitions", () => {
    const terms: GlossaryTerm[] = [
      { term: "<script>", definition: "A <dangerous> term" },
    ];
    const html = renderGlossary(terms);
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(html.includes("&lt;dangerous&gt;"));
    assert.ok(!html.includes("<script>"));
  });
});

// --- wrapGlossaryTerms ---

describe("wrapGlossaryTerms", () => {
  const terms: GlossaryTerm[] = [
    { term: "ΔV", reading: "デルタブイ", definition: "速度変化量" },
    { term: "brachistochrone", definition: "最短時間軌道遷移" },
    { term: "ホーマン遷移", reading: "Hohmann transfer", definition: "最小ΔVの楕円軌道遷移" },
  ];

  it("wraps a glossary term in text with tooltip span", () => {
    const html = "<p>ΔVの計算結果</p>";
    const result = wrapGlossaryTerms(html, terms);
    assert.ok(result.includes('class="glossary-term"'));
    assert.ok(result.includes('class="glossary-tip"'));
    assert.ok(result.includes("速度変化量"));
    assert.ok(result.includes("tabindex"));
  });

  it("wraps only first occurrence of each term", () => {
    const html = "<p>ΔVは重要。ΔVの二回目。</p>";
    const result = wrapGlossaryTerms(html, terms);
    const matches = result.match(/glossary-term/g);
    // "glossary-term" appears once in the class, plus "glossary-tip" — count the wrapping spans
    assert.equal((result.match(/class="glossary-term"/g) || []).length, 1);
  });

  it("returns unchanged HTML when terms array is empty", () => {
    const html = "<p>ΔVの計算</p>";
    assert.equal(wrapGlossaryTerms(html, []), html);
  });

  it("does not wrap terms inside <code> tags", () => {
    const html = "<p>See <code>ΔV = 10</code> for details</p>";
    const result = wrapGlossaryTerms(html, terms);
    assert.ok(!result.includes('class="glossary-term"'));
  });

  it("does not wrap terms inside <pre> blocks", () => {
    const html = "<pre>ΔV formula here</pre>";
    const result = wrapGlossaryTerms(html, terms);
    assert.ok(!result.includes('class="glossary-term"'));
  });

  it("does not wrap terms inside <a> tags", () => {
    const html = '<p><a href="#">ΔV link</a> and ΔV text</p>';
    const result = wrapGlossaryTerms(html, terms);
    // The second ΔV (in text) should be wrapped, not the one in <a>
    assert.equal((result.match(/class="glossary-term"/g) || []).length, 1);
    assert.ok(!result.includes('<a href="#"><span class="glossary-term"'));
  });

  it("does not wrap terms inside headings", () => {
    const html = "<h2>ΔVの分析</h2><p>ΔVは重要です</p>";
    const result = wrapGlossaryTerms(html, terms);
    // Only the one in <p> should be wrapped
    assert.equal((result.match(/class="glossary-term"/g) || []).length, 1);
    assert.ok(result.includes("<h2>ΔVの分析</h2>"));
  });

  it("handles multiple different terms", () => {
    const html = "<p>ΔVとbrachistochroneとホーマン遷移</p>";
    const result = wrapGlossaryTerms(html, terms);
    assert.equal((result.match(/class="glossary-term"/g) || []).length, 3);
    assert.ok(result.includes("速度変化量"));
    assert.ok(result.includes("最短時間軌道遷移"));
    assert.ok(result.includes("最小ΔVの楕円軌道遷移"));
  });

  it("escapes HTML in definitions", () => {
    const dangerousTerms: GlossaryTerm[] = [
      { term: "test", definition: '<script>alert("xss")</script>' },
    ];
    const html = "<p>A test case</p>";
    const result = wrapGlossaryTerms(html, dangerousTerms);
    assert.ok(result.includes("&lt;script&gt;"));
    assert.ok(!result.includes('<script>alert'));
  });

  it("matches longer terms first to avoid partial matches", () => {
    const overlapping: GlossaryTerm[] = [
      { term: "ΔV", definition: "short" },
      { term: "ΔV計算", definition: "longer match" },
    ];
    const html = "<p>ΔV計算の結果</p>";
    const result = wrapGlossaryTerms(html, overlapping);
    assert.ok(result.includes("longer match"));
  });

  it("does not modify HTML attributes", () => {
    const attrTerms: GlossaryTerm[] = [
      { term: "section", definition: "A section" },
    ];
    const html = '<div id="section-transfers"><p>section content</p></div>';
    const result = wrapGlossaryTerms(html, attrTerms);
    assert.ok(result.includes('id="section-transfers"'));
    // The term in the text node should be wrapped
    assert.ok(result.includes('class="glossary-term"'));
  });

  it("does not wrap terms inside <th> header cells", () => {
    const html = "<table><tr><th>ΔV</th></tr><tr><td>ΔV value</td></tr></table>";
    const result = wrapGlossaryTerms(html, terms);
    // Should wrap in td but not in th
    assert.ok(result.includes("<th>ΔV</th>"));
    assert.ok(result.includes('class="glossary-term"'));
  });

  it("includes role=tooltip for accessibility", () => {
    const html = "<p>ΔVの値</p>";
    const result = wrapGlossaryTerms(html, terms);
    assert.ok(result.includes('role="tooltip"'));
  });

  it("does not wrap terms inside <svg> elements", () => {
    const html = '<svg><text>ΔV = 10 km/s</text></svg><p>ΔVの計算</p>';
    const result = wrapGlossaryTerms(html, terms);
    // SVG text must remain untouched
    assert.ok(result.includes("<text>ΔV = 10 km/s</text>"));
    // But the term in <p> should be wrapped
    assert.ok(result.includes('class="glossary-term"'));
  });

  it("does not wrap terms inside <style> blocks", () => {
    const html = "<style>.dv { color: red; }</style><p>ΔVの値</p>";
    const result = wrapGlossaryTerms(html, terms);
    assert.ok(result.includes("<style>.dv { color: red; }</style>"));
    assert.ok(result.includes('class="glossary-term"'));
  });
});
