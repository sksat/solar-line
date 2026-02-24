import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  parseFrontmatter,
  parseSimpleYaml,
  splitSections,
  extractDirectives,
  parseBarChartDirective,
  parseJsonDirective,
  applyDirectives,
  parseSummaryMarkdown,
} from "./mdx-parser.ts";

// --- parseSimpleYaml ---

describe("parseSimpleYaml", () => {
  it("parses key-value pairs", () => {
    const result = parseSimpleYaml("slug: ai-costs\ntitle: AI コスト分析");
    assert.equal(result.slug, "ai-costs");
    assert.equal(result.title, "AI コスト分析");
  });

  it("strips surrounding quotes", () => {
    const result = parseSimpleYaml('key: "quoted value"\nkey2: \'single\'');
    assert.equal(result.key, "quoted value");
    assert.equal(result.key2, "single");
  });

  it("ignores comments and blank lines", () => {
    const result = parseSimpleYaml("# comment\n\nslug: test");
    assert.equal(result.slug, "test");
    assert.equal(Object.keys(result).length, 1);
  });

  it("handles colons in values", () => {
    const result = parseSimpleYaml("summary: This is: a test with: colons");
    assert.equal(result.summary, "This is: a test with: colons");
  });
});

// --- parseFrontmatter ---

describe("parseFrontmatter", () => {
  it("parses frontmatter and returns body", () => {
    const input = `---
slug: test
title: Test Title
summary: A test summary
---

## Content here`;

    const { frontmatter, body } = parseFrontmatter(input);
    assert.equal(frontmatter.slug, "test");
    assert.equal(frontmatter.title, "Test Title");
    assert.equal(frontmatter.summary, "A test summary");
    assert.equal(frontmatter.category, undefined);
    assert.ok(body.includes("## Content here"));
  });

  it("parses category field", () => {
    const input = `---
slug: test
title: Test
summary: Summary
category: meta
---

Body`;

    const { frontmatter } = parseFrontmatter(input);
    assert.equal(frontmatter.category, "meta");
  });

  it("throws on missing frontmatter", () => {
    assert.throws(() => parseFrontmatter("No frontmatter here"), /Missing YAML frontmatter/);
  });

  it("throws on unclosed frontmatter", () => {
    assert.throws(() => parseFrontmatter("---\nslug: test\ntitle: Test"), /Unclosed YAML frontmatter/);
  });

  it("throws on missing required fields", () => {
    assert.throws(() => parseFrontmatter("---\nslug: test\n---\n"), /missing required field: title/);
  });

  it("throws on invalid category", () => {
    const input = `---
slug: test
title: Test
summary: Summary
category: invalid
---

Body`;
    assert.throws(() => parseFrontmatter(input), /Invalid category/);
  });

  it("handles BOM", () => {
    const input = `\uFEFF---
slug: test
title: Test
summary: Summary
---

Body`;
    const { frontmatter } = parseFrontmatter(input);
    assert.equal(frontmatter.slug, "test");
  });
});

// --- splitSections ---

describe("splitSections", () => {
  it("splits on h2 headings", () => {
    const body = `
## Section One

Content of section one.

## Section Two

Content of section two.
`;
    const sections = splitSections(body);
    assert.equal(sections.length, 2);
    assert.equal(sections[0].heading, "Section One");
    assert.ok(sections[0].content.includes("Content of section one."));
    assert.equal(sections[1].heading, "Section Two");
    assert.ok(sections[1].content.includes("Content of section two."));
  });

  it("keeps h3+ inside sections", () => {
    const body = `
## Main Section

### Sub-heading

Content under sub-heading.

#### Deep heading

More content.
`;
    const sections = splitSections(body);
    assert.equal(sections.length, 1);
    assert.ok(sections[0].content.includes("### Sub-heading"));
    assert.ok(sections[0].content.includes("#### Deep heading"));
  });

  it("ignores preamble before first h2", () => {
    const body = `
Some preamble text.

## First Section

Content.
`;
    const sections = splitSections(body);
    assert.equal(sections.length, 1);
    assert.equal(sections[0].heading, "First Section");
  });

  it("handles empty body", () => {
    const sections = splitSections("");
    assert.equal(sections.length, 0);
  });
});

// --- extractDirectives ---

describe("extractDirectives", () => {
  it("extracts chart:bar directive", () => {
    const content = `Some text before.

\`\`\`chart:bar
caption: Test Chart
unit: km/s
bars:
  - label: A
    value: 1
\`\`\`

Some text after.`;

    const { markdown, directives } = extractDirectives(content);
    assert.equal(directives.length, 1);
    assert.equal(directives[0].type, "bar");
    assert.ok(directives[0].rawContent.includes("caption: Test Chart"));
    assert.ok(markdown.includes("Some text before."));
    assert.ok(markdown.includes("Some text after."));
    assert.ok(!markdown.includes("chart:bar"));
  });

  it("extracts component:orbital-diagram directive", () => {
    const content = `Text.

\`\`\`component:orbital-diagram
{ "id": "test-01", "title": "Test" }
\`\`\``;

    const { directives } = extractDirectives(content);
    assert.equal(directives.length, 1);
    assert.equal(directives[0].type, "orbital-diagram");
  });

  it("extracts multiple directives", () => {
    const content = `
\`\`\`chart:bar
caption: Chart 1
unit: x
bars:
  - label: A
    value: 1
\`\`\`

Middle text.

\`\`\`chart:bar
caption: Chart 2
unit: y
bars:
  - label: B
    value: 2
\`\`\``;

    const { directives } = extractDirectives(content);
    assert.equal(directives.length, 2);
  });

  it("preserves non-directive code blocks", () => {
    const content = `Some text.

\`\`\`bash
echo hello
\`\`\`

More text.`;

    const { markdown, directives } = extractDirectives(content);
    assert.equal(directives.length, 0);
    assert.ok(markdown.includes("```bash"));
  });

  it("extracts dag-viewer directive", () => {
    const content = `Text.

\`\`\`dag-viewer:
\`\`\``;

    const { directives } = extractDirectives(content);
    assert.equal(directives.length, 1);
    assert.equal(directives[0].type, "dag-viewer");
  });
});

// --- parseBarChartDirective ---

describe("parseBarChartDirective", () => {
  it("parses a bar chart YAML", () => {
    const raw = `caption: Transit Times
unit: hours
logScale: true
bars:
  - label: EP01
    value: 72
    color: "#ff0000"
  - label: EP02
    value: 455
    annotation: "longest"`;

    const chart = parseBarChartDirective(raw);
    assert.equal(chart.caption, "Transit Times");
    assert.equal(chart.unit, "hours");
    assert.equal(chart.logScale, true);
    assert.equal(chart.bars.length, 2);
    assert.equal(chart.bars[0].label, "EP01");
    assert.equal(chart.bars[0].value, 72);
    assert.equal(chart.bars[0].color, "#ff0000");
    assert.equal(chart.bars[1].annotation, "longest");
  });
});

// --- parseJsonDirective ---

describe("parseJsonDirective", () => {
  it("parses valid JSON", () => {
    const result = parseJsonDirective<{ id: string }>(
      '{ "id": "test-01" }'
    );
    assert.equal(result.id, "test-01");
  });

  it("throws on invalid JSON", () => {
    assert.throws(() => parseJsonDirective("not json"), /Invalid JSON/);
  });
});

// --- applyDirectives ---

describe("applyDirectives", () => {
  it("applies bar chart directive", () => {
    const result = applyDirectives([
      { type: "bar", rawContent: "caption: Test\nunit: x\nbars:\n  - label: A\n    value: 1" },
    ]);
    assert.ok(result.barChart);
    assert.equal(result.barChart!.caption, "Test");
  });

  it("applies dag-viewer directive", () => {
    const result = applyDirectives([{ type: "dag-viewer", rawContent: "" }]);
    assert.equal(result.dagViewer, true);
  });

  it("accumulates multiple timeseries charts", () => {
    const chart1 = JSON.stringify({ id: "c1", title: "Chart 1", xLabel: "x", yLabel: "y", series: [] });
    const chart2 = JSON.stringify({ id: "c2", title: "Chart 2", xLabel: "x", yLabel: "y", series: [] });
    const result = applyDirectives([
      { type: "timeseries", rawContent: chart1 },
      { type: "timeseries", rawContent: chart2 },
    ]);
    assert.equal(result.timeSeriesCharts!.length, 2);
  });

  it("throws on unknown directive type", () => {
    assert.throws(
      () => applyDirectives([{ type: "unknown", rawContent: "" }]),
      /Unknown component directive type/,
    );
  });
});

// --- parseSummaryMarkdown (integration) ---

describe("parseSummaryMarkdown", () => {
  it("parses a complete summary markdown file", () => {
    const input = `---
slug: test-report
title: テストレポート
summary: テスト用のサマリーレポート
category: analysis
---

## 概要

これはテストの概要セクションです。

### 詳細

概要の詳細情報。

## データ分析

分析テキスト。

\`\`\`chart:bar
caption: 比較チャート
unit: km/s
bars:
  - label: A
    value: 10
  - label: B
    value: 20
\`\`\`

分析の結論。
`;

    const report = parseSummaryMarkdown(input);
    assert.equal(report.slug, "test-report");
    assert.equal(report.title, "テストレポート");
    assert.equal(report.summary, "テスト用のサマリーレポート");
    assert.equal(report.category, "analysis");
    assert.equal(report.sections.length, 2);

    // First section: prose only
    assert.equal(report.sections[0].heading, "概要");
    assert.ok(report.sections[0].markdown.includes("テストの概要セクション"));
    assert.ok(report.sections[0].markdown.includes("### 詳細"));

    // Second section: prose + bar chart
    assert.equal(report.sections[1].heading, "データ分析");
    assert.ok(report.sections[1].markdown.includes("分析テキスト"));
    assert.ok(report.sections[1].markdown.includes("分析の結論"));
    assert.ok(report.sections[1].barChart);
    assert.equal(report.sections[1].barChart!.bars.length, 2);
  });

  it("throws on empty sections", () => {
    const input = `---
slug: test
title: Test
summary: Summary
---

No sections here, just text.
`;
    assert.throws(() => parseSummaryMarkdown(input), /No sections found/);
  });

  it("handles markdown tables within sections", () => {
    const input = `---
slug: test
title: Test
summary: Summary
---

## データ

| 指標 | 値 |
|------|------|
| A | 100 |
| B | 200 |

表の後のテキスト。
`;

    const report = parseSummaryMarkdown(input);
    assert.equal(report.sections.length, 1);
    assert.ok(report.sections[0].markdown.includes("| 指標 | 値 |"));
    assert.ok(report.sections[0].markdown.includes("表の後のテキスト。"));
  });

  it("handles KaTeX formulas", () => {
    const input = `---
slug: test
title: Test
summary: Summary
---

## 計算

質量 $m \\leq 452$ t のとき、加速度は $a = F/m$ となる。

$$\\Delta v = v_e \\ln \\frac{m_0}{m_f}$$
`;

    const report = parseSummaryMarkdown(input);
    assert.ok(report.sections[0].markdown.includes("$m \\leq 452$"));
    assert.ok(report.sections[0].markdown.includes("$$\\Delta v"));
  });
});
