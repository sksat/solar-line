import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  escapeHtml,
  markdownToHtml,
  layoutHtml,
  renderIndex,
  renderEpisode,
  renderTransferCard,
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
  REPORT_CSS,
} from "./templates.ts";
import type { EpisodeReport, SiteManifest, TransferAnalysis, VideoCard, DialogueQuote, ParameterExploration, OrbitalDiagram, AnimationConfig, ScaleLegend, TimelineAnnotation, ComparisonTable, SummaryReport, VerdictCounts, EventTimeline, VerificationTable } from "./report-types.ts";

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
  });

  it("includes preset buttons", () => {
    const html = renderCalculator();
    assert.ok(html.includes('id="preset-ep01_canonical"'));
    assert.ok(html.includes('id="preset-ep01_150h"'));
    assert.ok(html.includes('id="preset-mass_48t"'));
    assert.ok(html.includes('id="preset-mass_4800t"'));
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
    assert.ok(html.includes("セッションログ"));
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
    assert.ok(html.includes("セッションログ"));
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
        verdicts: { plausible: 1, conditional: 2, indeterminate: 1, implausible: 0 },
        path: "episodes/ep-001.html",
      },
      {
        episode: 2,
        title: "木星圏脱出",
        transferCount: 5,
        summary: "木星圏から土星へ。",
        verdicts: { plausible: 3, conditional: 1, indeterminate: 1, implausible: 0 },
        path: "episodes/ep-002.html",
      },
    ],
    totalVerdicts: { plausible: 4, conditional: 3, indeterminate: 2, implausible: 0 },
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
