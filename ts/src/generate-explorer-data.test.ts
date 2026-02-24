import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import * as path from "node:path";
import { generateExplorerData } from "./generate-explorer-data.ts";

const dataDir = path.resolve(import.meta.dirname ?? ".", "..", "..", "reports");

describe("generateExplorerData", () => {
  it("produces transfers from episode data", () => {
    const data = generateExplorerData(dataDir);
    assert.ok(data.transfers.length > 0, "should have transfers");
    assert.ok(data.transfers.length >= 20, `expected ≥20 transfers, got ${data.transfers.length}`);
  });

  it("each transfer has required fields", () => {
    const data = generateExplorerData(dataDir);
    for (const t of data.transfers) {
      assert.ok(t.id, "transfer should have id");
      assert.ok(typeof t.episode === "number", "transfer should have episode number");
      assert.ok(t.description, "transfer should have description");
      assert.ok(t.verdict, "transfer should have verdict");
    }
  });

  it("flattens transfer parameters with param_ prefix", () => {
    const data = generateExplorerData(dataDir);
    const withParams = data.transfers.filter(t =>
      Object.keys(t).some(k => k.startsWith("param_")),
    );
    assert.ok(withParams.length > 0, "some transfers should have flattened params");
  });

  it("produces dialogue lines", () => {
    const data = generateExplorerData(dataDir);
    assert.ok(data.dialogue.length > 0, "should have dialogue");
    assert.ok(data.dialogue.length >= 100, `expected ≥100 dialogue lines, got ${data.dialogue.length}`);
  });

  it("each dialogue line has speaker info", () => {
    const data = generateExplorerData(dataDir);
    for (const d of data.dialogue) {
      assert.ok(d.speakerName, `line ${d.lineId} should have speakerName`);
      assert.ok(typeof d.episode === "number", "line should have episode");
      assert.ok(typeof d.startMs === "number", "line should have startMs");
    }
  });

  it("produces DAG nodes and edges", () => {
    const data = generateExplorerData(dataDir);
    assert.ok(data.dagNodes.length > 0, "should have DAG nodes");
    assert.ok(data.dagEdges.length > 0, "should have DAG edges");
  });

  it("DAG nodes have required fields", () => {
    const data = generateExplorerData(dataDir);
    for (const n of data.dagNodes) {
      assert.ok(n.id, "node should have id");
      assert.ok(n.type, "node should have type");
      assert.ok(n.status, "node should have status");
    }
  });

  it("DAG edges reference existing nodes", () => {
    const data = generateExplorerData(dataDir);
    const nodeIds = new Set(data.dagNodes.map(n => n.id));
    for (const e of data.dagEdges) {
      assert.ok(nodeIds.has(e.from), `edge from ${e.from} not in nodes`);
      assert.ok(nodeIds.has(e.to), `edge to ${e.to} not in nodes`);
    }
  });

  it("includes generatedAt timestamp", () => {
    const data = generateExplorerData(dataDir);
    assert.ok(data.generatedAt, "should have generatedAt");
    assert.ok(!isNaN(Date.parse(data.generatedAt)), "generatedAt should be valid ISO date");
  });

  it("covers all 5 episodes in transfers", () => {
    const data = generateExplorerData(dataDir);
    const episodes = new Set(data.transfers.map(t => t.episode));
    for (let ep = 1; ep <= 5; ep++) {
      assert.ok(episodes.has(ep), `should have transfers for episode ${ep}`);
    }
  });

  it("covers all 5 episodes in dialogue", () => {
    const data = generateExplorerData(dataDir);
    const episodes = new Set(data.dialogue.map(d => d.episode));
    for (let ep = 1; ep <= 5; ep++) {
      assert.ok(episodes.has(ep), `should have dialogue for episode ${ep}`);
    }
  });
});
