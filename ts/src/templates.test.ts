import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  escapeHtml,
  markdownToHtml,
  layoutHtml,
  renderIndex,
  renderEpisode,
  renderTransferCard,
  renderLogsIndex,
  renderLogPage,
} from "./templates.ts";
import type { EpisodeReport, SiteManifest, TransferAnalysis } from "./report-types.ts";

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
    assert.ok(html.includes("plausible"));
    assert.ok(html.includes("verdict-plausible"));
    assert.ok(html.includes("5.60"));
    assert.ok(html.includes("5.59"));
  });

  it("handles null claimed ΔV", () => {
    const t = { ...sampleTransfer, claimedDeltaV: null };
    const html = renderTransferCard(t);
    assert.ok(html.includes("no explicit claim"));
    assert.ok(!html.includes("Claimed ΔV"));
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
    assert.ok(html.includes("Episode 1: Departure"));
    assert.ok(html.includes("2 transfers"));
    assert.ok(html.includes("episodes/ep-001.html"));
  });

  it("renders empty state when no episodes", () => {
    const empty = { ...sampleManifest, episodes: [] };
    const html = renderIndex(empty);
    assert.ok(html.includes("No episode reports yet."));
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
    assert.ok(html.includes("Episode 1: Departure"));
    assert.ok(html.includes("The crew departs Earth orbit."));
  });

  it("includes transfer cards", () => {
    const html = renderEpisode(sampleEpisodeReport);
    assert.ok(html.includes("Earth to Mars Hohmann Transfer"));
  });

  it("shows empty state when no transfers", () => {
    const empty = { ...sampleEpisodeReport, transfers: [] };
    const html = renderEpisode(empty);
    assert.ok(html.includes("No transfers analyzed yet."));
  });

  it("uses parent basePath for navigation", () => {
    const html = renderEpisode(sampleEpisodeReport);
    assert.ok(html.includes("../index.html"));
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
    assert.ok(html.includes("No session logs yet."));
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
    assert.ok(html.includes("Session Log: 2026-02-23"));
  });
});
