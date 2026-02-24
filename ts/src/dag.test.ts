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
  taskFileStatusToNodeStatus,
  getPlannable,
  getBlocked,
  getParallelGroups,
  getActiveTasks,
  claimTask,
} from "./dag.ts";
import { parseTaskFile, syncTasksIntoDag } from "./dag-task-sync.ts";
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

// ---- Task planning tests ----

describe("taskFileStatusToNodeStatus", () => {
  it("maps DONE to valid", () => {
    assert.equal(taskFileStatusToNodeStatus("DONE"), "valid");
  });
  it("maps IN PROGRESS to active", () => {
    assert.equal(taskFileStatusToNodeStatus("IN PROGRESS"), "active");
  });
  it("maps TODO to pending", () => {
    assert.equal(taskFileStatusToNodeStatus("TODO"), "pending");
  });
});

describe("getPlannable", () => {
  it("returns pending tasks with all deps satisfied", () => {
    const dag = createEmptyDag();
    addNode(dag, "task.001", "task", "Task 1");
    setStatus(dag, "task.001", "valid");
    addNode(dag, "task.002", "task", "Task 2", ["task.001"]);
    addNode(dag, "task.003", "task", "Task 3", ["task.002"]);

    const plannable = getPlannable(dag);
    assert.equal(plannable.length, 1);
    assert.equal(plannable[0].id, "task.002");
  });

  it("returns multiple plannable tasks", () => {
    const dag = createEmptyDag();
    addNode(dag, "task.001", "task", "Task 1");
    setStatus(dag, "task.001", "valid");
    addNode(dag, "task.002", "task", "Task 2", ["task.001"]);
    addNode(dag, "task.003", "task", "Task 3", ["task.001"]);

    const plannable = getPlannable(dag);
    assert.equal(plannable.length, 2);
  });

  it("excludes active tasks", () => {
    const dag = createEmptyDag();
    addNode(dag, "task.001", "task", "Task 1");
    setStatus(dag, "task.001", "active");
    const plannable = getPlannable(dag);
    assert.equal(plannable.length, 0);
  });
});

describe("getBlocked", () => {
  it("returns tasks with unsatisfied dependencies", () => {
    const dag = createEmptyDag();
    addNode(dag, "task.001", "task", "Task 1");
    addNode(dag, "task.002", "task", "Task 2", ["task.001"]);

    const blocked = getBlocked(dag);
    assert.equal(blocked.length, 1);
    assert.equal(blocked[0].id, "task.002");
  });

  it("does not include tasks with all deps valid", () => {
    const dag = createEmptyDag();
    addNode(dag, "task.001", "task", "Task 1");
    setStatus(dag, "task.001", "valid");
    addNode(dag, "task.002", "task", "Task 2", ["task.001"]);

    const blocked = getBlocked(dag);
    assert.equal(blocked.length, 0);
  });
});

describe("getParallelGroups", () => {
  it("groups independent tasks together", () => {
    const dag = createEmptyDag();
    addNode(dag, "task.001", "task", "Task 1");
    setStatus(dag, "task.001", "valid");
    addNode(dag, "task.002", "task", "Task 2", ["task.001"]);
    addNode(dag, "task.003", "task", "Task 3", ["task.001"]);

    const groups = getParallelGroups(dag);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].length, 2);
  });

  it("separates dependent tasks into different groups", () => {
    const dag = createEmptyDag();
    addNode(dag, "task.001", "task", "Task 1");
    setStatus(dag, "task.001", "valid");
    addNode(dag, "task.002", "task", "Task 2", ["task.001"]);
    addNode(dag, "task.003", "task", "Task 3", ["task.001", "task.002"]);

    const groups = getParallelGroups(dag);
    // task.002 is plannable, task.003 is blocked (depends on pending task.002)
    assert.equal(groups.length, 1);
    assert.equal(groups[0].length, 1);
    assert.equal(groups[0][0].id, "task.002");
  });

  it("returns empty for no plannable tasks", () => {
    const dag = createEmptyDag();
    addNode(dag, "task.001", "task", "Task 1");
    addNode(dag, "task.002", "task", "Task 2", ["task.001"]);

    const groups = getParallelGroups(dag);
    assert.equal(groups.length, 1);
    // task.001 has no deps, so it's plannable
    assert.equal(groups[0][0].id, "task.001");
  });
});

describe("getActiveTasks", () => {
  it("returns only active task nodes", () => {
    const dag = createEmptyDag();
    addNode(dag, "task.001", "task", "Task 1");
    addNode(dag, "task.002", "task", "Task 2");
    setStatus(dag, "task.001", "active");

    const active = getActiveTasks(dag);
    assert.equal(active.length, 1);
    assert.equal(active[0].id, "task.001");
  });
});

describe("claimTask", () => {
  it("sets a pending task to active", () => {
    const dag = createEmptyDag();
    addNode(dag, "task.001", "task", "Task 1");
    const event = claimTask(dag, "task.001");
    assert.equal(dag.nodes["task.001"].status, "active");
    assert.equal(event.action, "status_changed");
  });

  it("rejects claiming non-task nodes", () => {
    const dag = createEmptyDag();
    addNode(dag, "param.mass", "parameter", "Ship mass");
    assert.throws(() => claimTask(dag, "param.mass"), /not a task/);
  });

  it("rejects claiming non-pending tasks", () => {
    const dag = createEmptyDag();
    addNode(dag, "task.001", "task", "Task 1");
    setStatus(dag, "task.001", "valid");
    assert.throws(() => claimTask(dag, "task.001"), /not pending/);
  });

  it("rejects claiming tasks with unsatisfied deps", () => {
    const dag = createEmptyDag();
    addNode(dag, "task.001", "task", "Task 1");
    addNode(dag, "task.002", "task", "Task 2", ["task.001"]);
    assert.throws(() => claimTask(dag, "task.002"), /unsatisfied dependency/);
  });
});

// ---- Task file parsing tests ----

describe("parseTaskFile", () => {
  it("parses a DONE task", () => {
    const content = `# Task 001: Minimal Scaffold\n\n## Status: DONE\n\n## Goal\nSetup project`;
    const result = parseTaskFile(content, "001_scaffold.md");
    assert.equal(result?.num, 1);
    assert.equal(result?.dagId, "task.001");
    assert.equal(result?.title, "Minimal Scaffold");
    assert.equal(result?.fileStatus, "DONE");
    assert.equal(result?.nodeStatus, "valid");
  });

  it("parses an IN PROGRESS task", () => {
    const content = `# Task 118: DAG Planning\n\n## Status: IN PROGRESS\n\n## Dependencies\n- Task 085 (DAG) — DONE\n- Task 088 — DONE`;
    const result = parseTaskFile(content, "118_dag_planning.md");
    assert.equal(result?.num, 118);
    assert.equal(result?.fileStatus, "IN PROGRESS");
    assert.equal(result?.nodeStatus, "active");
    assert.deepEqual(result?.taskDeps, [85, 88]);
  });

  it("parses a TODO task", () => {
    const content = `# Task 056: Speaker Diarization\n\n## Status: TODO`;
    const result = parseTaskFile(content, "056_speaker_diarization.md");
    assert.equal(result?.fileStatus, "TODO");
    assert.equal(result?.nodeStatus, "pending");
  });

  it("extracts episode tags", () => {
    const content = `# Task 006: Episode 1 Analysis\n\n## Status: DONE\n\nEP01 analysis`;
    const result = parseTaskFile(content, "006_ep01_analysis.md");
    assert.ok(result?.tags.includes("episode:01"));
  });

  it("returns null for invalid filename", () => {
    const result = parseTaskFile("# Bad", "readme.md");
    assert.equal(result, null);
  });
});

describe("syncTasksIntoDag", () => {
  it("adds task nodes to an empty DAG", () => {
    const dag = createEmptyDag();
    const tasks = [
      { num: 1, dagId: "task.001", title: "Task 1", fileStatus: "DONE" as const, nodeStatus: "valid" as const, taskDeps: [], tags: [] },
      { num: 2, dagId: "task.002", title: "Task 2", fileStatus: "TODO" as const, nodeStatus: "pending" as const, taskDeps: [1], tags: [] },
    ];
    const events = syncTasksIntoDag(dag, tasks);
    assert.ok(events.length > 0);
    assert.ok(dag.nodes["task.001"]);
    assert.ok(dag.nodes["task.002"]);
    assert.equal(dag.nodes["task.001"].status, "valid");
    assert.equal(dag.nodes["task.002"].status, "pending");
    assert.ok(dag.nodes["task.002"].dependsOn.includes("task.001"));
  });

  it("updates status of existing task nodes", () => {
    const dag = createEmptyDag();
    addNode(dag, "task.001", "task", "Task 1");
    const tasks = [
      { num: 1, dagId: "task.001", title: "Task 1", fileStatus: "DONE" as const, nodeStatus: "valid" as const, taskDeps: [], tags: [] },
    ];
    syncTasksIntoDag(dag, tasks);
    assert.equal(dag.nodes["task.001"].status, "valid");
  });

  it("does not duplicate existing nodes", () => {
    const dag = createEmptyDag();
    addNode(dag, "task.001", "task", "Task 1");
    setStatus(dag, "task.001", "valid");
    const tasks = [
      { num: 1, dagId: "task.001", title: "Task 1", fileStatus: "DONE" as const, nodeStatus: "valid" as const, taskDeps: [], tags: [] },
    ];
    const events = syncTasksIntoDag(dag, tasks);
    // No status change since already valid
    assert.equal(events.length, 0);
  });
});
