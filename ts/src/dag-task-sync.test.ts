/**
 * Tests for dag-task-sync.ts: parseTaskFile and syncTasksIntoDag.
 */

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { parseTaskFile, syncTasksIntoDag } from "./dag-task-sync.ts";
import { createEmptyDag, addNode } from "./dag.ts";

// ---------------------------------------------------------------------------
// parseTaskFile
// ---------------------------------------------------------------------------

describe("parseTaskFile", () => {
  it("parses a standard DONE task file", () => {
    const content = `# Task 118: Build DAG infrastructure
## Status: **DONE**
## Summary
Build the DAG.
`;
    const result = parseTaskFile(content, "118_dag_infrastructure.md");
    assert.ok(result);
    assert.equal(result.num, 118);
    assert.equal(result.dagId, "task.118");
    assert.equal(result.title, "Build DAG infrastructure");
    assert.equal(result.fileStatus, "DONE");
    assert.equal(result.nodeStatus, "valid");
  });

  it("parses an IN PROGRESS task file", () => {
    const content = `# Task 42: Do something
## Status: **IN PROGRESS**
`;
    const result = parseTaskFile(content, "042_do_something.md");
    assert.ok(result);
    assert.equal(result.fileStatus, "IN PROGRESS");
    assert.equal(result.nodeStatus, "active");
  });

  it("defaults to TODO when no status found", () => {
    const content = `# Task 5: Minimal task
No status section here.
`;
    const result = parseTaskFile(content, "005_minimal.md");
    assert.ok(result);
    assert.equal(result.fileStatus, "TODO");
    assert.equal(result.nodeStatus, "pending");
  });

  it("returns null for filenames without numeric prefix", () => {
    const result = parseTaskFile("# Some file", "README.md");
    assert.equal(result, null);
  });

  it("extracts task dependencies from Dependencies section", () => {
    const content = `# Task 200: Depends on others
## Status: **IN PROGRESS**
## Dependencies
- Task 118 (DAG infra)
- Task 150 (report system)
`;
    const result = parseTaskFile(content, "200_depends.md");
    assert.ok(result);
    assert.deepEqual(result.taskDeps, [118, 150]);
  });

  it("extracts episode tags from content", () => {
    const content = `# Task 300: EP01 analysis
## Status: **DONE**
## Summary
Analysis for EP01 and Episode 3.
`;
    const result = parseTaskFile(content, "300_analysis.md");
    assert.ok(result);
    assert.ok(result.tags.includes("episode:01"));
    assert.ok(result.tags.includes("episode:03"));
  });

  it("deduplicates episode tags", () => {
    const content = `# Task 301: EP02 work
## Status: **DONE**
EP02 analysis. Also ep02 data.
`;
    const result = parseTaskFile(content, "301_ep02.md");
    assert.ok(result);
    const ep02Tags = result.tags.filter(t => t === "episode:02");
    assert.equal(ep02Tags.length, 1);
  });

  it("falls back to filename-derived title when no heading match", () => {
    const content = `Some content without proper heading`;
    const result = parseTaskFile(content, "099_fallback_title.md");
    assert.ok(result);
    assert.equal(result.title, "fallback_title");
  });

  it("parses IN_PROGRESS status variant", () => {
    const content = `# Task 10: Variant
## Status: IN_PROGRESS
`;
    const result = parseTaskFile(content, "010_variant.md");
    assert.ok(result);
    assert.equal(result.fileStatus, "IN PROGRESS");
  });

  it("handles no dependencies section gracefully", () => {
    const content = `# Task 50: Simple
## Status: **DONE**
`;
    const result = parseTaskFile(content, "050_simple.md");
    assert.ok(result);
    assert.deepEqual(result.taskDeps, []);
  });
});

// ---------------------------------------------------------------------------
// syncTasksIntoDag
// ---------------------------------------------------------------------------

describe("syncTasksIntoDag", () => {
  it("adds new task nodes to empty DAG", () => {
    const state = createEmptyDag();
    const tasks = [
      parseTaskFile("# Task 1: First\n## Status: **DONE**\n", "001_first.md")!,
      parseTaskFile("# Task 2: Second\n## Status: **TODO**\n", "002_second.md")!,
    ];
    const events = syncTasksIntoDag(state, tasks);
    assert.ok(events.length > 0);
    assert.ok(state.nodes["task.001"]);
    assert.ok(state.nodes["task.002"]);
    assert.equal(state.nodes["task.001"].title, "First");
    assert.equal(state.nodes["task.001"].status, "valid"); // DONE → valid
  });

  it("updates status of existing nodes", () => {
    const state = createEmptyDag();
    // First sync: add a TODO task
    const task1 = parseTaskFile("# Task 1: First\n## Status: **TODO**\n", "001_first.md")!;
    syncTasksIntoDag(state, [task1]);
    assert.equal(state.nodes["task.001"].status, "pending");

    // Second sync: task is now DONE
    const task1Done = parseTaskFile("# Task 1: First\n## Status: **DONE**\n", "001_first.md")!;
    const events = syncTasksIntoDag(state, [task1Done]);
    assert.ok(events.some(e => e.action === "status_changed"));
    assert.equal(state.nodes["task.001"].status, "valid");
  });

  it("adds dependency edges between tasks", () => {
    const state = createEmptyDag();
    const tasks = [
      parseTaskFile("# Task 1: First\n## Status: **DONE**\n", "001_first.md")!,
      parseTaskFile("# Task 2: Second\n## Status: **DONE**\n## Dependencies\n- Task 1\n", "002_second.md")!,
    ];
    const events = syncTasksIntoDag(state, tasks);
    assert.ok(state.nodes["task.002"].dependsOn.includes("task.001"));
  });

  it("skips dependency edges to non-existent tasks", () => {
    const state = createEmptyDag();
    const tasks = [
      parseTaskFile("# Task 1: First\n## Status: **DONE**\n## Dependencies\n- Task 999\n", "001_first.md")!,
    ];
    syncTasksIntoDag(state, tasks);
    assert.equal(state.nodes["task.001"].dependsOn.length, 0);
  });

  it("returns empty events when nothing changed", () => {
    const state = createEmptyDag();
    const tasks = [
      parseTaskFile("# Task 1: First\n## Status: **DONE**\n", "001_first.md")!,
    ];
    syncTasksIntoDag(state, tasks);
    // Second sync with same data
    const events = syncTasksIntoDag(state, tasks);
    assert.equal(events.length, 0);
  });

  it("updates title of existing node", () => {
    const state = createEmptyDag();
    const task1 = parseTaskFile("# Task 1: Old title\n## Status: **DONE**\n", "001_first.md")!;
    syncTasksIntoDag(state, [task1]);
    assert.equal(state.nodes["task.001"].title, "Old title");

    const task1Updated = parseTaskFile("# Task 1: New title\n## Status: **DONE**\n", "001_first.md")!;
    syncTasksIntoDag(state, [task1Updated]);
    assert.equal(state.nodes["task.001"].title, "New title");
  });
});
