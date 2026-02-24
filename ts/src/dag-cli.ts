#!/usr/bin/env node
/**
 * CLI for DAG management.
 *
 * Usage:
 *   npm run dag -- add <id> <type> <title> [--depends <dep1,dep2>] [--tags <t1,t2>]
 *   npm run dag -- depend <from> <to>
 *   npm run dag -- status <id> <valid|stale|pending>
 *   npm run dag -- invalidate <id>
 *   npm run dag -- impact <id>          # Show downstream impact
 *   npm run dag -- lineage <id>         # Show upstream lineage
 *   npm run dag -- remove-dep <from> <to>  # Remove a dependency
 *   npm run dag -- rewire <node> --from <old-dep> --to <new-dep>
 *   npm run dag -- validate             # Check DAG integrity
 *   npm run dag -- show [--stale]       # Print DAG summary
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { DagState, NodeType, NodeStatus, DagEvent } from "./dag-types.ts";
import {
  createEmptyDag,
  addNode,
  addDependency,
  removeDependency,
  setStatus,
  invalidate,
  getDownstream,
  getUpstream,
  validate,
  getStaleNodes,
  summarize,
  getPlannable,
  getBlocked,
  getParallelGroups,
  getActiveTasks,
  claimTask,
} from "./dag.ts";

const STATE_FILE = path.resolve(import.meta.dirname ?? ".", "../../dag/state.json");
const LOG_DIR = path.resolve(import.meta.dirname ?? ".", "../../dag/log");

function loadState(): DagState {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) as DagState;
  }
  return createEmptyDag();
}

function saveState(state: DagState, events: DagEvent[]): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");

  // Append events to log
  if (events.length > 0) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const logFile = path.join(LOG_DIR, "events.jsonl");
    const lines = events.map(e => JSON.stringify(e)).join("\n") + "\n";
    fs.appendFileSync(logFile, lines);
  }
}

function parseArgs(args: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  let i = 0;
  while (i < args.length) {
    if (args[i].startsWith("--") && i + 1 < args.length) {
      flags[args[i].slice(2)] = args[i + 1];
      i += 2;
    } else {
      positional.push(args[i]);
      i++;
    }
  }
  return { positional, flags };
}

const args = process.argv.slice(2);
const { positional, flags } = parseArgs(args);
const command = positional[0];

if (!command) {
  console.log("Usage: npm run dag -- <command> [args]");
  console.log("Commands: add, depend, remove-dep, rewire, status, invalidate, impact, lineage, validate, show, plan, claim, parallel");
  process.exit(0);
}

const state = loadState();
const events: DagEvent[] = [];

switch (command) {
  case "add": {
    const [, id, type, ...titleParts] = positional;
    const title = titleParts.join(" ") || flags.title || id;
    if (!id || !type) {
      console.error("Usage: add <id> <type> <title> [--depends dep1,dep2] [--tags t1,t2]");
      process.exit(1);
    }
    const validTypes: NodeType[] = ["data_source", "parameter", "analysis", "report", "task"];
    if (!validTypes.includes(type as NodeType)) {
      console.error(`Invalid type '${type}'. Must be one of: ${validTypes.join(", ")}`);
      process.exit(1);
    }
    const depends = flags.depends ? flags.depends.split(",") : [];
    const tags = flags.tags ? flags.tags.split(",") : undefined;
    const notes = flags.notes;
    const event = addNode(state, id, type as NodeType, title, depends, { tags, notes });
    events.push(event);
    console.log(`Added node '${id}' (${type}): ${title}`);
    break;
  }

  case "depend": {
    const [, from, to] = positional;
    if (!from || !to) {
      console.error("Usage: depend <from> <to>");
      process.exit(1);
    }
    const event = addDependency(state, from, to);
    events.push(event);
    console.log(`Added dependency: ${from} → ${to}`);
    break;
  }

  case "status": {
    const [, id, newStatus] = positional;
    if (!id || !newStatus) {
      console.error("Usage: status <id> <valid|stale|pending>");
      process.exit(1);
    }
    const validStatuses: NodeStatus[] = ["valid", "stale", "pending", "active", "blocked"];
    if (!validStatuses.includes(newStatus as NodeStatus)) {
      console.error(`Invalid status '${newStatus}'. Must be one of: ${validStatuses.join(", ")}`);
      process.exit(1);
    }
    const event = setStatus(state, id, newStatus as NodeStatus);
    events.push(event);
    console.log(`Set status of '${id}' to ${newStatus}`);
    break;
  }

  case "invalidate": {
    const [, id] = positional;
    if (!id) {
      console.error("Usage: invalidate <id>");
      process.exit(1);
    }
    const evts = invalidate(state, id);
    events.push(...evts);
    if (evts.length === 0) {
      console.log(`No changes — '${id}' and all downstream are already stale`);
    } else {
      console.log(`Invalidated ${evts.length} node(s):`);
      for (const e of evts) console.log(`  ${e.nodeId}`);
    }
    break;
  }

  case "impact": {
    const [, id] = positional;
    if (!id) {
      console.error("Usage: impact <id>");
      process.exit(1);
    }
    const downstream = getDownstream(state, id);
    if (downstream.length === 0) {
      console.log(`No downstream dependents for '${id}'`);
    } else {
      console.log(`Downstream impact of '${id}' (${downstream.length} node(s)):`);
      for (const d of downstream) {
        const n = state.nodes[d];
        console.log(`  ${d} [${n.type}] (${n.status}) — ${n.title}`);
      }
    }
    break;
  }

  case "lineage": {
    const [, id] = positional;
    if (!id) {
      console.error("Usage: lineage <id>");
      process.exit(1);
    }
    const upstream = getUpstream(state, id);
    if (upstream.length === 0) {
      console.log(`No upstream dependencies for '${id}'`);
    } else {
      console.log(`Upstream lineage of '${id}' (${upstream.length} node(s)):`);
      for (const u of upstream) {
        const n = state.nodes[u];
        console.log(`  ${u} [${n.type}] (${n.status}) — ${n.title}`);
      }
    }
    break;
  }

  case "validate": {
    const issues = validate(state);
    if (issues.length === 0) {
      console.log("DAG is valid — no issues found.");
    } else {
      console.log(`Found ${issues.length} issue(s):`);
      for (const issue of issues) console.log(`  ${issue}`);
    }
    break;
  }

  case "show": {
    if (flags.stale !== undefined) {
      const stale = getStaleNodes(state);
      if (stale.length === 0) {
        console.log("No stale nodes.");
      } else {
        console.log(`Stale nodes (${stale.length}, in dependency order):`);
        for (const id of stale) {
          const n = state.nodes[id];
          console.log(`  ${id} [${n.type}] v${n.version} — ${n.title}`);
        }
      }
    } else {
      console.log(summarize(state));
    }
    break;
  }

  case "remove-dep": {
    const [, from, to] = positional;
    if (!from || !to) {
      console.error("Usage: remove-dep <from> <to>");
      process.exit(1);
    }
    const event = removeDependency(state, from, to);
    events.push(event);
    console.log(`Removed dependency: ${from} → ${to}`);
    break;
  }

  case "rewire": {
    const [, nodeId] = positional;
    if (!nodeId || !flags.from || !flags.to) {
      console.error("Usage: rewire <node> --from <old-dep> --to <new-dep>");
      process.exit(1);
    }
    const removeEvt = removeDependency(state, nodeId, flags.from);
    const addEvt = addDependency(state, nodeId, flags.to);
    events.push(removeEvt, addEvt);
    console.log(`Rewired '${nodeId}': ${flags.from} → ${flags.to}`);
    break;
  }

  case "plan": {
    const active = getActiveTasks(state);
    if (active.length > 0) {
      console.log(`Currently active (${active.length}):`);
      for (const t of active) {
        console.log(`  🔵 ${t.id} — ${t.title}`);
      }
      console.log();
    }
    const plannable = getPlannable(state);
    if (plannable.length === 0) {
      console.log("No plannable tasks — all pending tasks have unsatisfied dependencies.");
    } else {
      console.log(`Plannable tasks (${plannable.length}):`);
      for (const t of plannable) {
        const deps = t.dependsOn.length > 0 ? ` [deps: ${t.dependsOn.join(", ")}]` : "";
        console.log(`  ⚪ ${t.id} — ${t.title}${deps}`);
      }
    }
    const blocked = getBlocked(state);
    if (blocked.length > 0) {
      console.log(`\nBlocked tasks (${blocked.length}):`);
      for (const t of blocked) {
        const unsatisfied = t.dependsOn.filter(d => {
          const dep = state.nodes[d];
          return !dep || dep.status !== "valid";
        });
        console.log(`  🔴 ${t.id} — ${t.title} [blocked by: ${unsatisfied.join(", ")}]`);
      }
    }
    break;
  }

  case "claim": {
    const [, taskId] = positional;
    if (!taskId) {
      console.error("Usage: claim <task-id>");
      process.exit(1);
    }
    const event = claimTask(state, taskId);
    events.push(event);
    console.log(`Claimed task '${taskId}' — now active`);
    break;
  }

  case "parallel": {
    const groups = getParallelGroups(state);
    if (groups.length === 0) {
      console.log("No parallelizable task groups available.");
    } else {
      console.log(`Parallel execution groups (${groups.length}):`);
      for (let i = 0; i < groups.length; i++) {
        console.log(`\n  Group ${i + 1} (${groups[i].length} tasks):`);
        for (const t of groups[i]) {
          console.log(`    ${t.id} — ${t.title}`);
        }
      }
    }
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    console.error("Commands: add, depend, remove-dep, rewire, status, invalidate, impact, lineage, validate, show");
    process.exit(1);
}

saveState(state, events);
