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
  renderLogsIndex,
  renderLogPage,
} from "./templates.ts";
import type { EpisodeReport, SiteManifest, TransferAnalysis, VideoCard, DialogueQuote } from "./report-types.ts";

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

  it("renders evidence quotes linked to transfers", () => {
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
    assert.ok(html.includes("根拠となる台詞"));
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
