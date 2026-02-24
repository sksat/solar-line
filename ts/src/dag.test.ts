import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  createEmptyDag,
  addNode,
  addDependency,
  removeDependency,
  setStatus,
  invalidate,
  getDownstream,
  getUpstream,
  detectCycle,
  findOrphans,
  validate,
  getStaleNodes,
  summarize,
} from "./dag.ts";
import type { DagState } from "./dag-types.ts";

describe("createEmptyDag", () => {
  it("creates an empty state", () => {
    const dag = createEmptyDag();
    assert.equal(Object.keys(dag.nodes).length, 0);
    assert.equal(dag.schemaVersion, 1);
  });
});

describe("addNode", () => {
  it("adds a node to the DAG", () => {
    const dag = createEmptyDag();
    const event = addNode(dag, "param.mass", "parameter", "Ship mass");
    assert.equal(dag.nodes["param.mass"].type, "parameter");
    assert.equal(dag.nodes["param.mass"].status, "pending");
    assert.equal(event.action, "node_added");
  });

  it("adds a node with dependencies", () => {
    const dag = createEmptyDag();
    addNode(dag, "param.mass", "parameter", "Ship mass");
    addNode(dag, "analysis.ep01", "analysis", "EP01 analysis", ["param.mass"]);
    assert.deepEqual(dag.nodes["analysis.ep01"].dependsOn, ["param.mass"]);
  });

  it("rejects duplicate node ID", () => {
    const dag = createEmptyDag();
    addNode(dag, "a", "parameter", "A");
    assert.throws(() => addNode(dag, "a", "parameter", "A duplicate"), /already exists/);
  });

  it("rejects missing dependency", () => {
    const dag = createEmptyDag();
    assert.throws(() => addNode(dag, "a", "analysis", "A", ["nonexistent"]), /not found/);
  });
});

describe("addDependency", () => {
  it("adds a dependency edge", () => {
    const dag = createEmptyDag();
    addNode(dag, "a", "parameter", "A");
    addNode(dag, "b", "analysis", "B");
    const event = addDependency(dag, "b", "a");
    assert.deepEqual(dag.nodes["b"].dependsOn, ["a"]);
    assert.equal(event.action, "dependency_added");
  });

  it("rejects cycle creation", () => {
    const dag = createEmptyDag();
    addNode(dag, "a", "parameter", "A");
    addNode(dag, "b", "analysis", "B", ["a"]);
    addNode(dag, "c", "report", "C", ["b"]);
    assert.throws(() => addDependency(dag, "a", "c"), /cycle/);
  });

  it("rejects duplicate dependency", () => {
    const dag = createEmptyDag();
    addNode(dag, "a", "parameter", "A");
    addNode(dag, "b", "analysis", "B", ["a"]);
    assert.throws(() => addDependency(dag, "b", "a"), /already exists/);
  });
});

describe("removeDependency", () => {
  it("removes a dependency edge", () => {
    const dag = createEmptyDag();
    addNode(dag, "a", "parameter", "A");
    addNode(dag, "b", "analysis", "B", ["a"]);
    removeDependency(dag, "b", "a");
    assert.deepEqual(dag.nodes["b"].dependsOn, []);
  });
});

describe("setStatus", () => {
  it("sets node status and bumps version on valid", () => {
    const dag = createEmptyDag();
    addNode(dag, "a", "parameter", "A");
    assert.equal(dag.nodes["a"].version, 1);
    setStatus(dag, "a", "valid");
    assert.equal(dag.nodes["a"].status, "valid");
    assert.equal(dag.nodes["a"].version, 2);
    assert.ok(dag.nodes["a"].lastValidated);
  });

  it("does not bump version on stale", () => {
    const dag = createEmptyDag();
    addNode(dag, "a", "parameter", "A");
    setStatus(dag, "a", "stale");
    assert.equal(dag.nodes["a"].version, 1);
  });
});

describe("invalidate", () => {
  it("marks node and downstream as stale", () => {
    const dag = createEmptyDag();
    addNode(dag, "mass", "parameter", "Ship mass");
    addNode(dag, "ep01", "analysis", "EP01", ["mass"]);
    addNode(dag, "ep02", "analysis", "EP02", ["mass"]);
    addNode(dag, "summary", "report", "Summary", ["ep01", "ep02"]);
    setStatus(dag, "mass", "valid");
    setStatus(dag, "ep01", "valid");
    setStatus(dag, "ep02", "valid");
    setStatus(dag, "summary", "valid");

    const events = invalidate(dag, "mass");
    assert.equal(dag.nodes["mass"].status, "stale");
    assert.equal(dag.nodes["ep01"].status, "stale");
    assert.equal(dag.nodes["ep02"].status, "stale");
    assert.equal(dag.nodes["summary"].status, "stale");
    assert.equal(events.length, 4);
  });

  it("does not double-mark already stale nodes", () => {
    const dag = createEmptyDag();
    addNode(dag, "a", "parameter", "A");
    addNode(dag, "b", "analysis", "B", ["a"]);
    invalidate(dag, "a");
    const events = invalidate(dag, "a");
    assert.equal(events.length, 0);
  });
});

describe("getDownstream", () => {
  it("finds all transitive dependents", () => {
    const dag = createEmptyDag();
    addNode(dag, "a", "parameter", "A");
    addNode(dag, "b", "analysis", "B", ["a"]);
    addNode(dag, "c", "report", "C", ["b"]);
    addNode(dag, "d", "report", "D", ["a"]);
    const down = getDownstream(dag, "a");
    assert.equal(down.length, 3);
    assert.ok(down.includes("b"));
    assert.ok(down.includes("c"));
    assert.ok(down.includes("d"));
  });
});

describe("getUpstream", () => {
  it("finds all transitive dependencies", () => {
    const dag = createEmptyDag();
    addNode(dag, "a", "data_source", "A");
    addNode(dag, "b", "parameter", "B");
    addNode(dag, "c", "analysis", "C", ["a", "b"]);
    addNode(dag, "d", "report", "D", ["c"]);
    const up = getUpstream(dag, "d");
    assert.equal(up.length, 3);
    assert.ok(up.includes("a"));
    assert.ok(up.includes("b"));
    assert.ok(up.includes("c"));
  });
});

describe("detectCycle", () => {
  it("returns null for acyclic graph", () => {
    const dag = createEmptyDag();
    addNode(dag, "a", "parameter", "A");
    addNode(dag, "b", "analysis", "B", ["a"]);
    assert.equal(detectCycle(dag), null);
  });

  it("detects self-loop", () => {
    const dag = createEmptyDag();
    addNode(dag, "a", "parameter", "A");
    dag.nodes["a"].dependsOn = ["a"];
    const cycle = detectCycle(dag);
    assert.ok(cycle);
  });
});

describe("findOrphans", () => {
  it("finds nodes with no connections", () => {
    const dag = createEmptyDag();
    addNode(dag, "a", "parameter", "A");
    addNode(dag, "b", "analysis", "B", ["a"]);
    addNode(dag, "orphan", "task", "Orphan");
    const orphans = findOrphans(dag);
    assert.deepEqual(orphans, ["orphan"]);
  });
});

describe("validate", () => {
  it("returns empty for valid DAG", () => {
    const dag = createEmptyDag();
    addNode(dag, "a", "parameter", "A");
    addNode(dag, "b", "analysis", "B", ["a"]);
    const issues = validate(dag);
    assert.equal(issues.filter(i => i.startsWith("ERROR")).length, 0);
  });

  it("detects missing references", () => {
    const dag = createEmptyDag();
    addNode(dag, "a", "analysis", "A");
    dag.nodes["a"].dependsOn = ["nonexistent"];
    const issues = validate(dag);
    assert.ok(issues.some(i => i.includes("unknown node")));
  });

  it("warns about data_source with dependencies", () => {
    const dag = createEmptyDag();
    addNode(dag, "x", "parameter", "X");
    addNode(dag, "a", "data_source", "A", ["x"]);
    const issues = validate(dag);
    assert.ok(issues.some(i => i.includes("Data source") && i.includes("dependencies")));
  });
});

describe("getStaleNodes", () => {
  it("returns stale nodes in dependency order", () => {
    const dag = createEmptyDag();
    addNode(dag, "a", "parameter", "A");
    addNode(dag, "b", "analysis", "B", ["a"]);
    addNode(dag, "c", "report", "C", ["b"]);
    invalidate(dag, "a");
    const stale = getStaleNodes(dag);
    assert.equal(stale.length, 3);
    // 'a' should come before 'b', 'b' before 'c'
    assert.ok(stale.indexOf("a") < stale.indexOf("b"));
    assert.ok(stale.indexOf("b") < stale.indexOf("c"));
  });
});

describe("summarize", () => {
  it("produces a summary string", () => {
    const dag = createEmptyDag();
    addNode(dag, "a", "parameter", "A");
    addNode(dag, "b", "analysis", "B", ["a"]);
    const summary = summarize(dag);
    assert.ok(summary.includes("2 nodes"));
    assert.ok(summary.includes("1 edges"));
    assert.ok(summary.includes("parameter=1"));
    assert.ok(summary.includes("analysis=1"));
  });
});
