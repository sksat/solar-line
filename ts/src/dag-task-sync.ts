#!/usr/bin/env node
/**
 * Sync current_tasks/ files into the DAG as task nodes.
 *
 * Reads task markdown files, extracts status and inter-task dependencies,
 * and upserts them into the DAG state.
 *
 * Usage:
 *   npm run dag:sync           # Sync tasks into DAG
 *   npm run dag:sync -- --dry  # Dry run (show what would change)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { DagState, DagEvent, NodeStatus, TaskFileStatus } from "./dag-types.ts";
import { createEmptyDag, addNode, setStatus, addDependency, taskFileStatusToNodeStatus } from "./dag.ts";

const STATE_FILE = path.resolve(import.meta.dirname ?? ".", "../../dag/state.json");
const LOG_DIR = path.resolve(import.meta.dirname ?? ".", "../../dag/log");
const TASKS_DIR = path.resolve(import.meta.dirname ?? ".", "../../current_tasks");

interface ParsedTask {
  /** Numeric task ID (e.g., 118) */
  num: number;
  /** DAG node ID (e.g., "task.118") */
  dagId: string;
  /** Task title from markdown heading */
  title: string;
  /** File status: DONE, IN PROGRESS, TODO */
  fileStatus: TaskFileStatus;
  /** DAG node status derived from file status */
  nodeStatus: NodeStatus;
  /** IDs of dependent task numbers parsed from Dependencies section */
  taskDeps: number[];
  /** Tags extracted from file */
  tags: string[];
}

/** Parse a task markdown file to extract metadata. */
export function parseTaskFile(content: string, filename: string): ParsedTask | null {
  // Extract task number from filename (e.g., "118_dag_task_planning.md" → 118)
  const numMatch = filename.match(/^(\d+)_/);
  if (!numMatch) return null;
  const num = parseInt(numMatch[1], 10);

  // Extract title from first heading
  const titleMatch = content.match(/^#\s+Task\s+\d+:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : filename.replace(/^\d+_/, "").replace(/\.md$/, "");

  // Extract status (strip markdown bold markers before comparison)
  const statusMatch = content.match(/^##\s+Status:\s*(.+)$/m);
  const rawStatus = statusMatch ? statusMatch[1].trim().replace(/\*\*/g, "") : "TODO";
  let fileStatus: TaskFileStatus = "TODO";
  if (rawStatus.startsWith("DONE")) fileStatus = "DONE";
  else if (rawStatus.startsWith("IN PROGRESS") || rawStatus === "IN_PROGRESS") fileStatus = "IN PROGRESS";

  // Extract task dependencies from Dependencies section
  const taskDeps: number[] = [];
  const sections = content.split(/^##\s+/m);
  const depsSection = sections.find(s => /^Depend/i.test(s));
  if (depsSection) {
    const depRefs = depsSection.matchAll(/Task\s+(\d+)/gi);
    for (const m of depRefs) {
      taskDeps.push(parseInt(m[1], 10));
    }
  }

  // Extract episode tags from title or content
  const tags: string[] = [];
  const epMatches = content.matchAll(/(?:EP|Episode|episode)\s*0?([1-5])/gi);
  for (const m of epMatches) {
    const tag = `episode:0${m[1]}`;
    if (!tags.includes(tag)) tags.push(tag);
  }

  return {
    num,
    dagId: `task.${String(num).padStart(3, "0")}`,
    title,
    fileStatus,
    nodeStatus: taskFileStatusToNodeStatus(fileStatus),
    taskDeps,
    tags: tags.length > 0 ? tags : [],
  };
}

/** Sync parsed tasks into the DAG state. Returns events. */
export function syncTasksIntoDag(state: DagState, tasks: ParsedTask[]): DagEvent[] {
  const events: DagEvent[] = [];
  const taskMap = new Map(tasks.map(t => [t.num, t]));

  for (const task of tasks) {
    const existing = state.nodes[task.dagId];

    if (!existing) {
      // Filter deps to only include tasks that exist
      const validDeps = task.taskDeps
        .filter(d => taskMap.has(d))
        .map(d => `task.${String(d).padStart(3, "0")}`)
        .filter(d => state.nodes[d]); // only depend on already-added nodes

      const event = addNode(state, task.dagId, "task", task.title, validDeps, {
        tags: task.tags.length > 0 ? task.tags : undefined,
      });
      events.push(event);

      // Set status to match file
      if (task.nodeStatus !== "pending") {
        const statusEvent = setStatus(state, task.dagId, task.nodeStatus);
        events.push(statusEvent);
      }
    } else {
      // Update existing node status if changed
      if (existing.status !== task.nodeStatus) {
        const statusEvent = setStatus(state, task.dagId, task.nodeStatus);
        events.push(statusEvent);
      }
      // Update title if changed
      if (existing.title !== task.title) {
        existing.title = task.title;
      }
    }
  }

  // Second pass: add cross-task dependency edges for tasks added in this run
  for (const task of tasks) {
    const node = state.nodes[task.dagId];
    if (!node) continue;

    for (const depNum of task.taskDeps) {
      const depId = `task.${String(depNum).padStart(3, "0")}`;
      if (!state.nodes[depId]) continue;
      if (node.dependsOn.includes(depId)) continue;

      // Add dependency edge (skip if it would create a cycle)
      try {
        const event = addDependency(state, task.dagId, depId);
        events.push(event);
      } catch {
        // Skip cycle-creating or duplicate edges
      }
    }
  }

  return events;
}

function loadState(): DagState {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) as DagState;
  }
  return createEmptyDag();
}

function saveState(state: DagState, events: DagEvent[]): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");

  if (events.length > 0) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const logFile = path.join(LOG_DIR, "events.jsonl");
    const lines = events.map(e => JSON.stringify(e)).join("\n") + "\n";
    fs.appendFileSync(logFile, lines);
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("dag-task-sync.ts")) {
  const dryRun = process.argv.includes("--dry");
  const state = loadState();

  // Read all task files
  const files = fs.readdirSync(TASKS_DIR).filter(f => f.endsWith(".md")).sort();
  const tasks: ParsedTask[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(TASKS_DIR, file), "utf-8");
    const parsed = parseTaskFile(content, file);
    if (parsed) tasks.push(parsed);
  }

  console.log(`Found ${tasks.length} task files`);

  const byStatus = { DONE: 0, "IN PROGRESS": 0, TODO: 0 };
  for (const t of tasks) byStatus[t.fileStatus]++;
  console.log(`  DONE: ${byStatus.DONE}, IN PROGRESS: ${byStatus["IN PROGRESS"]}, TODO: ${byStatus.TODO}`);

  const existingTaskNodes = Object.values(state.nodes).filter(n => n.type === "task").length;
  console.log(`\nExisting task nodes in DAG: ${existingTaskNodes}`);

  const events = syncTasksIntoDag(state, tasks);

  if (dryRun) {
    console.log(`\nDry run — would apply ${events.length} events:`);
    for (const e of events.slice(0, 20)) {
      console.log(`  ${e.action}: ${e.nodeId} — ${e.detail ?? ""}`);
    }
    if (events.length > 20) console.log(`  ... and ${events.length - 20} more`);
  } else {
    saveState(state, events);
    const newTaskNodes = Object.values(state.nodes).filter(n => n.type === "task").length;
    console.log(`\nSynced: ${events.length} events applied`);
    console.log(`Task nodes in DAG: ${existingTaskNodes} → ${newTaskNodes}`);
  }
}
