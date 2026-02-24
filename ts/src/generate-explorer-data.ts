/**
 * Generate flat JSON tables from episode/summary data for the DuckDB-WASM data explorer.
 * Run at build time to produce pre-flattened data that DuckDB can load efficiently.
 *
 * Output: dist/explorer-data.json with three tables:
 *   - transfers: flat transfer records across all episodes
 *   - dialogueLines: speaker-attributed dialogue with timestamps
 *   - dagNodes: DAG node/edge data for graph queries
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { EpisodeReport } from "./report-types.ts";
import type { EpisodeDialogue } from "./subtitle-types.ts";

/** Flat transfer record for SQL querying */
interface FlatTransfer {
  id: string;
  episode: number;
  description: string;
  timestamp: string;
  claimedDeltaV: number | null;
  computedDeltaV: number | null;
  verdict: string;
  assumptionCount: number;
  sourceCount: number;
  hasReproductionCommand: boolean;
  /** Flattened parameters */
  [key: string]: string | number | boolean | null;
}

/** Flat dialogue record */
interface FlatDialogueLine {
  episode: number;
  lineId: string;
  speakerId: string;
  speakerName: string;
  text: string;
  startMs: number;
  endMs: number;
  confidence: string;
  sceneId: string;
}

/** Flat DAG node record */
interface FlatDagNode {
  id: string;
  label: string;
  type: string;
  status: string;
}

/** Flat DAG edge record */
interface FlatDagEdge {
  from: string;
  to: string;
}

export interface ExplorerData {
  generatedAt: string;
  transfers: FlatTransfer[];
  dialogue: FlatDialogueLine[];
  dagNodes: FlatDagNode[];
  dagEdges: FlatDagEdge[];
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

/** Flatten transfer parameters into top-level keys with param_ prefix */
function flattenTransfer(t: EpisodeReport["transfers"][0]): FlatTransfer {
  const flat: FlatTransfer = {
    id: t.id,
    episode: t.episode,
    description: t.description,
    timestamp: t.timestamp,
    claimedDeltaV: t.claimedDeltaV ?? null,
    computedDeltaV: t.computedDeltaV ?? null,
    verdict: t.verdict,
    assumptionCount: t.assumptions.length,
    sourceCount: t.sources?.length ?? 0,
    hasReproductionCommand: !!t.reproductionCommand,
  };

  // Flatten parameters with prefix
  if (t.parameters) {
    for (const [k, v] of Object.entries(t.parameters)) {
      if (typeof v === "number" || typeof v === "string" || typeof v === "boolean" || v === null) {
        flat[`param_${k}`] = v;
      }
    }
  }

  return flat;
}

export function generateExplorerData(dataDir: string, dagStatePath?: string): ExplorerData {
  const episodesDir = path.join(dataDir, "data", "episodes");
  const transfers: FlatTransfer[] = [];
  const dialogue: FlatDialogueLine[] = [];

  // Collect episode data
  if (fs.existsSync(episodesDir)) {
    const epFiles = fs.readdirSync(episodesDir)
      .filter(f => /^ep\d+\.json$/.test(f))
      .sort();

    for (const file of epFiles) {
      const ep = readJsonFile<EpisodeReport>(path.join(episodesDir, file));
      if (!ep) continue;

      for (const t of ep.transfers) {
        transfers.push(flattenTransfer(t));
      }

      // Load dialogue data
      const epNum = String(ep.episode).padStart(2, "0");
      const dlg = readJsonFile<EpisodeDialogue>(path.join(episodesDir, `ep${epNum}_dialogue.json`));
      if (dlg) {
        for (const line of dlg.dialogue) {
          dialogue.push({
            episode: ep.episode,
            lineId: line.lineId ?? `ep${epNum}-anon-${dialogue.length}`,
            speakerId: line.speakerId,
            speakerName: line.speakerName,
            text: line.text,
            startMs: line.startMs,
            endMs: line.endMs,
            confidence: line.confidence,
            sceneId: line.sceneId ?? "",
          });
        }
      }
    }
  }

  // Collect DAG data
  const dagNodes: FlatDagNode[] = [];
  const dagEdges: FlatDagEdge[] = [];
  const dagPath = dagStatePath ?? path.resolve(dataDir, "..", "dag", "state.json");
  if (fs.existsSync(dagPath)) {
    interface DagNodeEntry {
      id: string;
      title: string;
      type: string;
      status: string;
      dependsOn: string[];
    }
    const dagState = readJsonFile<{ nodes: Record<string, DagNodeEntry> }>(dagPath);
    if (dagState) {
      for (const [id, node] of Object.entries(dagState.nodes)) {
        dagNodes.push({ id, label: node.title ?? id, type: node.type, status: node.status });
        // Edges derived from dependsOn
        for (const dep of node.dependsOn ?? []) {
          dagEdges.push({ from: dep, to: id });
        }
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    transfers,
    dialogue,
    dagNodes,
    dagEdges,
  };
}

// CLI entry point
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename ?? "")) {
  const dataDir = process.argv[2] ?? path.resolve("..", "reports");
  const data = generateExplorerData(dataDir);
  console.log(`Generated explorer data: ${data.transfers.length} transfers, ${data.dialogue.length} dialogue lines, ${data.dagNodes.length} DAG nodes, ${data.dagEdges.length} DAG edges`);
  const outPath = process.argv[3] ?? path.resolve("..", "dist", "explorer-data.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data));
  console.log(`Written to ${outPath}`);
}
