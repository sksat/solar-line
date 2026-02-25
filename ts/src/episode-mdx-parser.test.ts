/**
 * Tests for the episode MDX parser.
 *
 * Episode MDX format: Markdown with YAML frontmatter + JSON directives.
 * Sections keyed by transfer ID contain explanation prose.
 */
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  parseEpisodeFrontmatter,
  extractEpisodeDirectives,
  parseEpisodeMarkdown,
} from "./episode-mdx-parser.ts";

// --- parseEpisodeFrontmatter ---

describe("parseEpisodeFrontmatter", () => {
  it("parses episode number, title, and summary", () => {
    const input = `---
episode: 1
title: "SOLAR LINE Part 1 — 火星からガニメデへ"
summary: "きりたんが小型貨物船ケストレルで..."
---

Body text`;
    const { frontmatter, body } = parseEpisodeFrontmatter(input);
    assert.equal(frontmatter.episode, 1);
    assert.equal(frontmatter.title, "SOLAR LINE Part 1 — 火星からガニメデへ");
    assert.equal(frontmatter.summary, "きりたんが小型貨物船ケストレルで...");
    assert.ok(body.includes("Body text"));
  });

  it("throws if episode number is missing", () => {
    const input = `---
title: "Test"
summary: "Test"
---`;
    assert.throws(() => parseEpisodeFrontmatter(input), /episode/);
  });

  it("throws if title is missing", () => {
    const input = `---
episode: 1
summary: "Test"
---`;
    assert.throws(() => parseEpisodeFrontmatter(input), /title/);
  });

  it("strips BOM from input", () => {
    const input = `\uFEFF---
episode: 2
title: "EP02"
summary: "Test"
---`;
    const { frontmatter } = parseEpisodeFrontmatter(input);
    assert.equal(frontmatter.episode, 2);
  });
});

// --- extractEpisodeDirectives ---

describe("extractEpisodeDirectives", () => {
  it("extracts video-cards directive", () => {
    const content = `Some text

\`\`\`video-cards:
[{ "provider": "youtube", "id": "abc123" }]
\`\`\`

More text`;
    const { markdown, directives } = extractEpisodeDirectives(content);
    assert.equal(directives.length, 1);
    assert.equal(directives[0].type, "video-cards");
    assert.ok(!markdown.includes("video-cards"));
    assert.ok(markdown.includes("Some text"));
    assert.ok(markdown.includes("More text"));
  });

  it("extracts dialogue-quotes directive", () => {
    const content = `\`\`\`dialogue-quotes:
[{ "id": "ep01-quote-01", "speaker": "ケイ", "text": "Test", "timestamp": "01:12" }]
\`\`\``;
    const { directives } = extractEpisodeDirectives(content);
    assert.equal(directives.length, 1);
    assert.equal(directives[0].type, "dialogue-quotes");
  });

  it("extracts transfer directive", () => {
    const content = `\`\`\`transfer:
{
  "id": "ep01-transfer-01",
  "timestamp": "該当なし",
  "claimedDeltaV": null,
  "computedDeltaV": 10.15,
  "assumptions": ["Test assumption"],
  "verdict": "reference",
  "parameters": {},
  "sources": []
}
\`\`\``;
    const { directives } = extractEpisodeDirectives(content);
    assert.equal(directives.length, 1);
    assert.equal(directives[0].type, "transfer");
  });

  it("extracts exploration directive", () => {
    const content = `\`\`\`exploration:
{
  "id": "ep01-exploration-01",
  "transferId": "ep01-transfer-02",
  "question": "Test question?",
  "scenarios": []
}
\`\`\``;
    const { directives } = extractEpisodeDirectives(content);
    assert.equal(directives.length, 1);
    assert.equal(directives[0].type, "exploration");
  });

  it("extracts diagrams directive", () => {
    const content = `\`\`\`diagrams:
[{ "id": "ep01-diagram-01", "title": "Test" }]
\`\`\``;
    const { directives } = extractEpisodeDirectives(content);
    assert.equal(directives.length, 1);
    assert.equal(directives[0].type, "diagrams");
  });

  it("extracts timeseries-charts directive", () => {
    const content = `\`\`\`timeseries-charts:
[{ "id": "ep01-chart-01", "title": "Test" }]
\`\`\``;
    const { directives } = extractEpisodeDirectives(content);
    assert.equal(directives.length, 1);
    assert.equal(directives[0].type, "timeseries-charts");
  });

  it("extracts glossary directive (same as summary MDX)", () => {
    const content = `\`\`\`glossary:
[{ "term": "ΔV", "definition": "Test" }]
\`\`\``;
    const { directives } = extractEpisodeDirectives(content);
    assert.equal(directives.length, 1);
    assert.equal(directives[0].type, "glossary");
  });

  it("extracts detail-pages directive", () => {
    const content = `\`\`\`detail-pages:
[{ "slug": "brachistochrone", "transferIds": ["ep05-transfer-01"] }]
\`\`\``;
    const { directives } = extractEpisodeDirectives(content);
    assert.equal(directives.length, 1);
    assert.equal(directives[0].type, "detail-pages");
  });

  it("extracts multiple directives from a single block", () => {
    const content = `\`\`\`video-cards:
[{ "provider": "youtube", "id": "abc" }]
\`\`\`

\`\`\`dialogue-quotes:
[{ "id": "q1", "speaker": "ケイ", "text": "Hello", "timestamp": "00:01" }]
\`\`\``;
    const { directives } = extractEpisodeDirectives(content);
    assert.equal(directives.length, 2);
  });
});

// --- parseEpisodeMarkdown (integration) ---

describe("parseEpisodeMarkdown", () => {
  it("parses a minimal episode with one transfer", () => {
    const input = `---
episode: 1
title: "Test Episode"
summary: "Test summary"
---

## ep01-transfer-01

ホーマン遷移基準値

\`\`\`transfer:
{
  "id": "ep01-transfer-01",
  "episode": 1,
  "description": "ホーマン遷移基準値",
  "timestamp": "該当なし",
  "claimedDeltaV": null,
  "computedDeltaV": 10.15,
  "assumptions": ["Test"],
  "verdict": "reference",
  "parameters": {},
  "sources": []
}
\`\`\`

古典的ホーマン遷移には合計約10.15 km/sのΔVが必要。
これは基準値である。
`;
    const report = parseEpisodeMarkdown(input);
    assert.equal(report.episode, 1);
    assert.equal(report.title, "Test Episode");
    assert.equal(report.transfers.length, 1);
    assert.equal(report.transfers[0].id, "ep01-transfer-01");
    assert.equal(report.transfers[0].computedDeltaV, 10.15);
    // Explanation is the section markdown (after removing the transfer directive)
    assert.ok(report.transfers[0].explanation.includes("古典的ホーマン遷移"));
    assert.ok(report.transfers[0].explanation.includes("基準値である"));
  });

  it("parses video cards from preamble", () => {
    const input = `---
episode: 1
title: "Test"
summary: "Test"
---

\`\`\`video-cards:
[
  { "provider": "niconico", "id": "sm45280425", "title": "Part 1" },
  { "provider": "youtube", "id": "CQ_OkDjEwRk", "title": "Part 1" }
]
\`\`\`

## ep01-transfer-01

\`\`\`transfer:
{
  "id": "ep01-transfer-01",
  "episode": 1,
  "description": "Test",
  "timestamp": "n/a",
  "claimedDeltaV": null,
  "computedDeltaV": 1,
  "assumptions": [],
  "verdict": "reference",
  "parameters": {},
  "sources": []
}
\`\`\`

Explanation text.
`;
    const report = parseEpisodeMarkdown(input);
    assert.equal(report.videoCards?.length, 2);
    assert.equal(report.videoCards![0].provider, "niconico");
    assert.equal(report.videoCards![1].id, "CQ_OkDjEwRk");
  });

  it("parses dialogue quotes from preamble", () => {
    const input = `---
episode: 1
title: "Test"
summary: "Test"
---

\`\`\`dialogue-quotes:
[
  { "id": "ep01-quote-01", "speaker": "ケイ", "text": "Test quote", "timestamp": "01:12", "dialogueLineId": "ep01-dl-010" }
]
\`\`\`

## ep01-transfer-01

\`\`\`transfer:
{
  "id": "ep01-transfer-01",
  "episode": 1,
  "description": "Test",
  "timestamp": "n/a",
  "claimedDeltaV": null,
  "computedDeltaV": 1,
  "assumptions": [],
  "verdict": "reference",
  "parameters": {},
  "sources": [],
  "evidenceQuoteIds": ["ep01-quote-01"]
}
\`\`\`

Test.
`;
    const report = parseEpisodeMarkdown(input);
    assert.equal(report.dialogueQuotes?.length, 1);
    assert.equal(report.dialogueQuotes![0].speaker, "ケイ");
  });

  it("parses explorations linked to transfers", () => {
    const input = `---
episode: 1
title: "Test"
summary: "Test"
---

## ep01-transfer-01

\`\`\`transfer:
{
  "id": "ep01-transfer-01",
  "episode": 1,
  "description": "Test",
  "timestamp": "n/a",
  "claimedDeltaV": null,
  "computedDeltaV": 1,
  "assumptions": [],
  "verdict": "reference",
  "parameters": {},
  "sources": []
}
\`\`\`

Transfer explanation.

\`\`\`exploration:
{
  "id": "ep01-exploration-01",
  "transferId": "ep01-transfer-01",
  "question": "What if mass changes?",
  "scenarios": [],
  "summary": "Test summary"
}
\`\`\`
`;
    const report = parseEpisodeMarkdown(input);
    assert.equal(report.explorations?.length, 1);
    assert.equal(report.explorations![0].transferId, "ep01-transfer-01");
  });

  it("parses diagrams from preamble", () => {
    const input = `---
episode: 1
title: "Test"
summary: "Test"
---

\`\`\`diagrams:
[{ "id": "ep01-diagram-01", "title": "Test Diagram", "centerLabel": "Sun", "orbits": [], "transfers": [] }]
\`\`\`

## ep01-transfer-01

\`\`\`transfer:
{
  "id": "ep01-transfer-01",
  "episode": 1,
  "description": "Test",
  "timestamp": "n/a",
  "claimedDeltaV": null,
  "computedDeltaV": 1,
  "assumptions": [],
  "verdict": "reference",
  "parameters": {},
  "sources": []
}
\`\`\`

Test.
`;
    const report = parseEpisodeMarkdown(input);
    assert.equal(report.diagrams?.length, 1);
    assert.equal(report.diagrams![0].id, "ep01-diagram-01");
  });

  it("parses glossary from any location", () => {
    const input = `---
episode: 1
title: "Test"
summary: "Test"
---

## ep01-transfer-01

\`\`\`transfer:
{
  "id": "ep01-transfer-01",
  "episode": 1,
  "description": "Test",
  "timestamp": "n/a",
  "claimedDeltaV": null,
  "computedDeltaV": 1,
  "assumptions": [],
  "verdict": "reference",
  "parameters": {},
  "sources": []
}
\`\`\`

Test.

\`\`\`glossary:
[{ "term": "ΔV", "reading": "デルタブイ", "definition": "速度変化量" }]
\`\`\`
`;
    const report = parseEpisodeMarkdown(input);
    assert.equal(report.glossary?.length, 1);
    assert.equal(report.glossary![0].term, "ΔV");
  });

  it("parses multiple transfers in section order", () => {
    const input = `---
episode: 1
title: "Test"
summary: "Test"
---

## ep01-transfer-01

\`\`\`transfer:
{
  "id": "ep01-transfer-01",
  "episode": 1,
  "description": "First transfer",
  "timestamp": "n/a",
  "claimedDeltaV": null,
  "computedDeltaV": 10,
  "assumptions": [],
  "verdict": "reference",
  "parameters": {},
  "sources": []
}
\`\`\`

First explanation.

## ep01-transfer-02

\`\`\`transfer:
{
  "id": "ep01-transfer-02",
  "episode": 1,
  "description": "Second transfer",
  "timestamp": "00:00",
  "claimedDeltaV": null,
  "computedDeltaV": 8497,
  "assumptions": [],
  "verdict": "conditional",
  "parameters": {},
  "sources": []
}
\`\`\`

Second explanation.
`;
    const report = parseEpisodeMarkdown(input);
    assert.equal(report.transfers.length, 2);
    assert.equal(report.transfers[0].id, "ep01-transfer-01");
    assert.equal(report.transfers[1].id, "ep01-transfer-02");
    assert.ok(report.transfers[0].explanation.includes("First explanation"));
    assert.ok(report.transfers[1].explanation.includes("Second explanation"));
  });

  it("sets transfer description from section heading text after ID", () => {
    const input = `---
episode: 1
title: "Test"
summary: "Test"
---

## ep01-transfer-01

ホーマン遷移基準値: 火星軌道 → 木星軌道

\`\`\`transfer:
{
  "id": "ep01-transfer-01",
  "episode": 1,
  "description": "ホーマン遷移基準値: 火星軌道 → 木星軌道（最小エネルギー）",
  "timestamp": "n/a",
  "claimedDeltaV": null,
  "computedDeltaV": 10,
  "assumptions": [],
  "verdict": "reference",
  "parameters": {},
  "sources": []
}
\`\`\`

Explanation.
`;
    const report = parseEpisodeMarkdown(input);
    // Description comes from the JSON directive, not the heading
    assert.equal(report.transfers[0].description, "ホーマン遷移基準値: 火星軌道 → 木星軌道（最小エネルギー）");
  });

  it("merges verdictSummary and reproductionCommand from transfer JSON", () => {
    const input = `---
episode: 1
title: "Test"
summary: "Test"
---

## ep01-transfer-01

\`\`\`transfer:
{
  "id": "ep01-transfer-01",
  "episode": 1,
  "description": "Test",
  "timestamp": "n/a",
  "claimedDeltaV": null,
  "computedDeltaV": 10,
  "assumptions": [],
  "verdict": "reference",
  "parameters": {},
  "sources": [],
  "reproductionCommand": "npm run recalculate",
  "verdictSummary": "Test verdict summary."
}
\`\`\`

Explanation text.
`;
    const report = parseEpisodeMarkdown(input);
    assert.equal(report.transfers[0].reproductionCommand, "npm run recalculate");
    assert.equal(report.transfers[0].verdictSummary, "Test verdict summary.");
  });

  it("parses detail-pages directive", () => {
    const input = `---
episode: 5
title: "Test"
summary: "Test"
---

\`\`\`detail-pages:
[{ "slug": "brachistochrone", "transferIds": ["ep05-transfer-01", "ep05-transfer-02"] }]
\`\`\`

## ep05-transfer-01

\`\`\`transfer:
{
  "id": "ep05-transfer-01",
  "episode": 5,
  "description": "Test",
  "timestamp": "n/a",
  "claimedDeltaV": null,
  "computedDeltaV": 1,
  "assumptions": [],
  "verdict": "reference",
  "parameters": {},
  "sources": []
}
\`\`\`

Test.
`;
    const report = parseEpisodeMarkdown(input);
    assert.equal(report.detailPages?.length, 1);
    assert.equal(report.detailPages![0].slug, "brachistochrone");
  });

  it("parses timeseries-charts directive", () => {
    const input = `---
episode: 1
title: "Test"
summary: "Test"
---

\`\`\`timeseries-charts:
[{ "id": "ep01-chart-01", "title": "Mass vs Time", "xLabel": "Mass", "yLabel": "Time", "series": [] }]
\`\`\`

## ep01-transfer-01

\`\`\`transfer:
{
  "id": "ep01-transfer-01",
  "episode": 1,
  "description": "Test",
  "timestamp": "n/a",
  "claimedDeltaV": null,
  "computedDeltaV": 1,
  "assumptions": [],
  "verdict": "reference",
  "parameters": {},
  "sources": []
}
\`\`\`

Test.
`;
    const report = parseEpisodeMarkdown(input);
    assert.equal(report.timeSeriesCharts?.length, 1);
    assert.equal(report.timeSeriesCharts![0].id, "ep01-chart-01");
  });

  it("throws if no transfers found", () => {
    const input = `---
episode: 1
title: "Test"
summary: "Test"
---

Just some text without any transfers.
`;
    assert.throws(() => parseEpisodeMarkdown(input), /No transfer/i);
  });
});
