/**
 * DAG management for task/analysis dependencies.
 *
 * Tracks dependencies between data sources, parameters, analyses, reports, and tasks.
 * Supports invalidation propagation and impact analysis.
 */

import type { DagState, DagNode, DagEvent, NodeType, NodeStatus } from "./dag-types.ts";

const SCHEMA_VERSION = 1;

/** Create an empty DAG state */
export function createEmptyDag(): DagState {
  return { nodes: {}, schemaVersion: SCHEMA_VERSION };
}

/** Add a node to the DAG. Returns the event. */
export function addNode(
  state: DagState,
  id: string,
  type: NodeType,
  title: string,
  dependsOn: string[] = [],
  options?: { tags?: string[]; notes?: string },
): DagEvent {
  if (state.nodes[id]) {
    throw new Error(`Node '${id}' already exists`);
  }
  for (const dep of dependsOn) {
    if (!state.nodes[dep]) {
      throw new Error(`Dependency '${dep}' not found`);
    }
  }
  state.nodes[id] = {
    id,
    type,
    title,
    dependsOn,
    status: "pending",
    version: 1,
    tags: options?.tags,
    notes: options?.notes,
  };
  return { timestamp: new Date().toISOString(), action: "node_added", nodeId: id, detail: title };
}

/** Add a dependency edge. Returns the event. */
export function addDependency(state: DagState, fromId: string, toId: string): DagEvent {
  const node = state.nodes[fromId];
  if (!node) throw new Error(`Node '${fromId}' not found`);
  if (!state.nodes[toId]) throw new Error(`Dependency target '${toId}' not found`);
  if (node.dependsOn.includes(toId)) throw new Error(`Dependency '${fromId}' → '${toId}' already exists`);

  // Check for cycles before adding
  node.dependsOn.push(toId);
  const cycle = detectCycle(state);
  if (cycle) {
    node.dependsOn.pop();
    throw new Error(`Adding dependency would create cycle: ${cycle.join(" → ")}`);
  }

  return { timestamp: new Date().toISOString(), action: "dependency_added", nodeId: fromId, detail: `→ ${toId}` };
}

/** Remove a dependency edge. Returns the event. */
export function removeDependency(state: DagState, fromId: string, toId: string): DagEvent {
  const node = state.nodes[fromId];
  if (!node) throw new Error(`Node '${fromId}' not found`);
  const idx = node.dependsOn.indexOf(toId);
  if (idx === -1) throw new Error(`Dependency '${fromId}' → '${toId}' not found`);
  node.dependsOn.splice(idx, 1);
  return { timestamp: new Date().toISOString(), action: "dependency_removed", nodeId: fromId, detail: `→ ${toId}` };
}

/** Set a node's status. Returns the event. */
export function setStatus(state: DagState, nodeId: string, status: NodeStatus): DagEvent {
  const node = state.nodes[nodeId];
  if (!node) throw new Error(`Node '${nodeId}' not found`);
  const oldStatus = node.status;
  node.status = status;
  if (status === "valid") {
    node.lastValidated = new Date().toISOString();
    node.version++;
  }
  return { timestamp: new Date().toISOString(), action: "status_changed", nodeId, detail: `${oldStatus} → ${status}` };
}

/** Mark a node and all downstream dependents as stale. Returns all events. */
export function invalidate(state: DagState, nodeId: string): DagEvent[] {
  if (!state.nodes[nodeId]) throw new Error(`Node '${nodeId}' not found`);
  const downstream = getDownstream(state, nodeId);
  const events: DagEvent[] = [];
  for (const id of [nodeId, ...downstream]) {
    if (state.nodes[id].status !== "stale") {
      state.nodes[id].status = "stale";
      events.push({
        timestamp: new Date().toISOString(),
        action: "status_changed",
        nodeId: id,
        detail: `→ stale (caused by ${nodeId})`,
      });
    }
  }
  return events;
}

/** Get all nodes downstream of a given node (transitive dependents). */
export function getDownstream(state: DagState, nodeId: string): string[] {
  const result = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const [id, node] of Object.entries(state.nodes)) {
      if (node.dependsOn.includes(current) && !result.has(id)) {
        result.add(id);
        queue.push(id);
      }
    }
  }
  return [...result];
}

/** Get all nodes upstream of a given node (transitive dependencies). */
export function getUpstream(state: DagState, nodeId: string): string[] {
  const node = state.nodes[nodeId];
  if (!node) return [];
  const result = new Set<string>();
  const queue = [...node.dependsOn];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (!result.has(current) && state.nodes[current]) {
      result.add(current);
      queue.push(...state.nodes[current].dependsOn);
    }
  }
  return [...result];
}

/** Detect cycles in the DAG. Returns the cycle path or null. */
export function detectCycle(state: DagState): string[] | null {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color: Record<string, number> = {};
  const parent: Record<string, string> = {};

  for (const id of Object.keys(state.nodes)) {
    color[id] = WHITE;
  }

  function dfs(nodeId: string): string[] | null {
    color[nodeId] = GRAY;
    for (const dep of state.nodes[nodeId].dependsOn) {
      if (!state.nodes[dep]) continue;
      if (color[dep] === GRAY) {
        // Found cycle — reconstruct path
        const cycle = [dep, nodeId];
        let cur = nodeId;
        while (parent[cur] && parent[cur] !== dep) {
          cur = parent[cur];
          cycle.push(cur);
        }
        return cycle.reverse();
      }
      if (color[dep] === WHITE) {
        parent[dep] = nodeId;
        const result = dfs(dep);
        if (result) return result;
      }
    }
    color[nodeId] = BLACK;
    return null;
  }

  for (const id of Object.keys(state.nodes)) {
    if (color[id] === WHITE) {
      const cycle = dfs(id);
      if (cycle) return cycle;
    }
  }
  return null;
}

/** Find orphan nodes (no incoming or outgoing edges). */
export function findOrphans(state: DagState): string[] {
  const hasIncoming = new Set<string>();
  const hasOutgoing = new Set<string>();
  for (const node of Object.values(state.nodes)) {
    if (node.dependsOn.length > 0) {
      hasOutgoing.add(node.id);
      for (const dep of node.dependsOn) hasIncoming.add(dep);
    }
  }
  return Object.keys(state.nodes).filter(id => !hasIncoming.has(id) && !hasOutgoing.has(id));
}

/** Validate the DAG state. Returns array of issues (empty = valid). */
export function validate(state: DagState): string[] {
  const issues: string[] = [];

  // Check for missing dependency targets
  for (const node of Object.values(state.nodes)) {
    for (const dep of node.dependsOn) {
      if (!state.nodes[dep]) {
        issues.push(`ERROR: Node '${node.id}' depends on unknown node '${dep}'`);
      }
    }
  }

  // Check for cycles
  const cycle = detectCycle(state);
  if (cycle) {
    issues.push(`ERROR: Cycle detected: ${cycle.join(" → ")}`);
  }

  // Warn about orphans
  const orphans = findOrphans(state);
  for (const id of orphans) {
    issues.push(`WARN: Orphan node '${id}' has no connections`);
  }

  // Type rules
  for (const node of Object.values(state.nodes)) {
    if (node.type === "data_source" && node.dependsOn.length > 0) {
      issues.push(`WARN: Data source '${node.id}' has dependencies (unusual)`);
    }
    for (const dep of node.dependsOn) {
      const depNode = state.nodes[dep];
      if (depNode && node.type === "parameter" && depNode.type === "report") {
        issues.push(`WARN: Parameter '${node.id}' depends on report '${dep}' (unusual direction)`);
      }
    }
  }

  return issues;
}

/** Get stale nodes sorted by dependency order (leaves first). */
export function getStaleNodes(state: DagState): string[] {
  return Object.values(state.nodes)
    .filter(n => n.status === "stale")
    .sort((a, b) => {
      // Sort by dependency depth (shallow first)
      const aDepth = getUpstream(state, a.id).length;
      const bDepth = getUpstream(state, b.id).length;
      return aDepth - bDepth;
    })
    .map(n => n.id);
}

/** Print a summary of the DAG state. */
export function summarize(state: DagState): string {
  const nodes = Object.values(state.nodes);
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const n of nodes) {
    byType[n.type] = (byType[n.type] || 0) + 1;
    byStatus[n.status] = (byStatus[n.status] || 0) + 1;
  }
  const edgeCount = nodes.reduce((sum, n) => sum + n.dependsOn.length, 0);

  const lines: string[] = [];
  lines.push(`DAG: ${nodes.length} nodes, ${edgeCount} edges`);
  lines.push(`Types: ${Object.entries(byType).map(([t, c]) => `${t}=${c}`).join(", ")}`);
  lines.push(`Status: ${Object.entries(byStatus).map(([s, c]) => `${s}=${c}`).join(", ")}`);

  const issues = validate(state);
  const errors = issues.filter(i => i.startsWith("ERROR"));
  const warns = issues.filter(i => i.startsWith("WARN"));
  if (errors.length > 0) lines.push(`Errors: ${errors.length}`);
  if (warns.length > 0) lines.push(`Warnings: ${warns.length}`);
  for (const issue of issues) lines.push(`  ${issue}`);

  return lines.join("\n");
}
