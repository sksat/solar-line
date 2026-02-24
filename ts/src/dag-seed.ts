#!/usr/bin/env node
/**
 * Seed the DAG with the SOLAR LINE project's dependency structure.
 *
 * Node hierarchy:
 *   data_source  → Whisper STT, YouTube VTT, worldbuilding docs
 *   parameter    → Ship mass, thrust, Isp, propellant fractions
 *   analysis     → Per-transfer orbital analyses (24 total)
 *   report       → Episode reports, summary reports
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { DagState } from "./dag-types.ts";
import {
  createEmptyDag,
  addNode,
  addDependency,
  setStatus,
  summarize,
  validate,
} from "./dag.ts";

const STATE_FILE = path.resolve(import.meta.dirname ?? ".", "../../dag/state.json");
const SNAPSHOT_DIR = path.resolve(import.meta.dirname ?? ".", "../../dag/log/snapshots");

function seed(): DagState {
  const dag = createEmptyDag();

  // ── Data Sources ──
  addNode(dag, "src.worldbuilding", "data_source", "設定資料（ゆえぴこ提供）", [], { tags: ["source"] });
  for (let ep = 1; ep <= 5; ep++) {
    const epStr = String(ep).padStart(2, "0");
    addNode(dag, `src.whisper.ep${epStr}`, "data_source", `Whisper STT EP${epStr}`, [], { tags: ["source", `episode:${epStr}`] });
    addNode(dag, `src.vtt.ep${epStr}`, "data_source", `YouTube VTT EP${epStr}`, [], { tags: ["source", `episode:${epStr}`] });
    addNode(dag, `src.dialogue.ep${epStr}`, "data_source", `話者判定済み台詞 EP${epStr}`, [`src.whisper.ep${epStr}`, `src.vtt.ep${epStr}`], { tags: ["source", `episode:${epStr}`] });
  }

  // ── Shared Parameters ──
  addNode(dag, "param.ship_mass", "parameter", "船体質量（48,000t公称 / 300-500t推定）", ["src.worldbuilding"], {
    tags: ["parameter", "cross-episode"],
    notes: "All brachistochrone calcs converge on 300-500t for stated performance",
  });
  addNode(dag, "param.thrust", "parameter", "推力（800t-force）", ["src.worldbuilding"], {
    tags: ["parameter", "cross-episode"],
  });
  addNode(dag, "param.isp", "parameter", "比推力 Isp（≥5×10⁵ s）", ["src.worldbuilding"], {
    tags: ["parameter", "cross-episode"],
  });
  addNode(dag, "param.nozzle_life", "parameter", "ノズル寿命（55.5h）", ["src.worldbuilding"], {
    tags: ["parameter", "cross-episode"],
  });
  addNode(dag, "param.propellant_budget", "parameter", "推進剤バジェット", ["param.ship_mass", "param.isp"], {
    tags: ["parameter", "cross-episode"],
  });

  // ── EP01 Analyses (Mars→Ganymede) ──
  const ep01Deps = ["param.ship_mass", "param.thrust", "param.isp", "src.dialogue.ep01"];
  addNode(dag, "analysis.ep01.t01", "analysis", "EP01-T01: 火星低軌道→脱出 (ΔV 3.55)", ep01Deps, { tags: ["episode:01", "transfer:01"] });
  addNode(dag, "analysis.ep01.t02", "analysis", "EP01-T02: 火星→木星遷移 (ΔV 8.78)", ep01Deps, { tags: ["episode:01", "transfer:02"] });
  addNode(dag, "analysis.ep01.t03", "analysis", "EP01-T03: 木星系到着→減速 (ΔV 14.90)", ep01Deps, { tags: ["episode:01", "transfer:03"] });
  addNode(dag, "analysis.ep01.t04", "analysis", "EP01-T04: ガニメデ軌道投入 (ΔV 2.83)", ep01Deps, { tags: ["episode:01", "transfer:04"] });

  // ── EP02 Analyses (Jupiter→Saturn/Enceladus) ──
  const ep02Deps = ["param.ship_mass", "param.thrust", "param.isp", "src.dialogue.ep02"];
  addNode(dag, "analysis.ep02.t01", "analysis", "EP02-T01: ガニメデ脱出 (ΔV 2.83)", ep02Deps, { tags: ["episode:02", "transfer:01"] });
  addNode(dag, "analysis.ep02.t02", "analysis", "EP02-T02: 木星重力アシスト準備 (ΔV 1.20)", ep02Deps, { tags: ["episode:02", "transfer:02"] });
  addNode(dag, "analysis.ep02.t03", "analysis", "EP02-T03: 太陽系脱出速度到達 (ΔV 18.30)", ep02Deps, { tags: ["episode:02", "transfer:03"] });
  addNode(dag, "analysis.ep02.t04", "analysis", "EP02-T04: 土星系到着 (ΔV 7.50)", ep02Deps, { tags: ["episode:02", "transfer:04"] });
  addNode(dag, "analysis.ep02.t05", "analysis", "EP02-T05: エンケラドス軌道投入 (ΔV 3.20)", ep02Deps, { tags: ["episode:02", "transfer:05"] });

  // ── EP03 Analyses (Enceladus→Titania) ──
  const ep03Deps = ["param.ship_mass", "param.thrust", "param.isp", "src.dialogue.ep03"];
  addNode(dag, "analysis.ep03.t01", "analysis", "EP03-T01: エンケラドス脱出 (ΔV 2.80)", ep03Deps, { tags: ["episode:03", "transfer:01"] });
  addNode(dag, "analysis.ep03.t02", "analysis", "EP03-T02: 土星脱出 (ΔV 7.20)", ep03Deps, { tags: ["episode:03", "transfer:02"] });
  addNode(dag, "analysis.ep03.t03", "analysis", "EP03-T03: 土星→天王星遷移 (ΔV 5.50)", ep03Deps, { tags: ["episode:03", "transfer:03"] });
  addNode(dag, "analysis.ep03.t04", "analysis", "EP03-T04: 天王星系到着 (ΔV 4.80)", ep03Deps, { tags: ["episode:03", "transfer:04"] });
  addNode(dag, "analysis.ep03.t05", "analysis", "EP03-T05: チタニア軌道投入 (ΔV 1.50)", ep03Deps, { tags: ["episode:03", "transfer:05"] });

  // ── EP04 Analyses (Titania→Earth) ──
  const ep04Deps = ["param.ship_mass", "param.thrust", "param.isp", "src.dialogue.ep04"];
  addNode(dag, "analysis.ep04.t01", "analysis", "EP04-T01: チタニア脱出 (ΔV 1.50)", ep04Deps, { tags: ["episode:04", "transfer:01"] });
  addNode(dag, "analysis.ep04.t02", "analysis", "EP04-T02: 天王星脱出 (ΔV 5.10)", ep04Deps, { tags: ["episode:04", "transfer:02"] });
  addNode(dag, "analysis.ep04.t03", "analysis", "EP04-T03: 天王星→地球遷移 (ΔV 6.80)", ep04Deps, { tags: ["episode:04", "transfer:03"] });
  addNode(dag, "analysis.ep04.t04", "analysis", "EP04-T04: プラズモイド遭遇 (磁気圏通過)", ep04Deps, { tags: ["episode:04", "transfer:04"] });
  addNode(dag, "analysis.ep04.t05", "analysis", "EP04-T05: 地球接近 (ΔV 8.20)", ep04Deps, { tags: ["episode:04", "transfer:05"] });

  // ── EP05 Analyses (Uranus→Earth finale) ──
  const ep05Deps = ["param.ship_mass", "param.thrust", "param.isp", "param.nozzle_life", "src.dialogue.ep05"];
  addNode(dag, "analysis.ep05.t01", "analysis", "EP05-T01: 木星フライバイ (ΔV 0.50)", ep05Deps, { tags: ["episode:05", "transfer:01"] });
  addNode(dag, "analysis.ep05.t02", "analysis", "EP05-T02: 月スイングバイ (ΔV 0.80)", ep05Deps, { tags: ["episode:05", "transfer:02"] });
  addNode(dag, "analysis.ep05.t03", "analysis", "EP05-T03: 地球接近減速 (ΔV 12.00)", ep05Deps, { tags: ["episode:05", "transfer:03"] });
  addNode(dag, "analysis.ep05.t04", "analysis", "EP05-T04: LEO投入 400km (ΔV 3.20)", ep05Deps, { tags: ["episode:05", "transfer:04"] });
  addNode(dag, "analysis.ep05.t05", "analysis", "EP05-T05: ノズル限界（寿命26分残 → 崩壊）", [...ep05Deps, "param.nozzle_life"], { tags: ["episode:05", "transfer:05"] });

  // ── Cross-cutting Analyses ──
  const allTransferIds = Object.keys(dag.nodes).filter(id => id.startsWith("analysis."));
  addNode(dag, "analysis.mass_mystery", "analysis", "質量ミステリー（48kt vs 300-500t）", ["param.ship_mass", "param.thrust"], {
    tags: ["cross-episode"],
  });
  addNode(dag, "analysis.propellant_budget", "analysis", "推進剤バジェット検証", ["param.propellant_budget", ...allTransferIds], {
    tags: ["cross-episode"],
  });
  addNode(dag, "analysis.nozzle_cumulative", "analysis", "ノズル累積損耗（全行程）", ["param.nozzle_life", ...allTransferIds], {
    tags: ["cross-episode"],
  });
  addNode(dag, "analysis.margin_cascade", "analysis", "マージン連鎖分析", allTransferIds, {
    tags: ["cross-episode"],
    notes: "Chain success probability: ~30-46%",
  });
  addNode(dag, "analysis.communications", "analysis", "通信遅延・リンクバジェット分析", allTransferIds, {
    tags: ["cross-episode"],
  });
  addNode(dag, "analysis.attitude_control", "analysis", "姿勢制御精度・安定性分析", ["param.ship_mass", "param.thrust", "param.nozzle_life", ...allTransferIds], {
    tags: ["cross-episode"],
  });

  // ── Episode Reports ──
  for (let ep = 1; ep <= 5; ep++) {
    const epStr = String(ep).padStart(2, "0");
    const epTransfers = Object.keys(dag.nodes).filter(id => id.startsWith(`analysis.ep${epStr}.`));
    addNode(dag, `report.ep${epStr}`, "report", `第${ep}話レポート`, [...epTransfers, `src.dialogue.ep${epStr}`], {
      tags: [`episode:${epStr}`],
    });
  }

  // ── Summary Reports ──
  const allReportIds = Object.keys(dag.nodes).filter(id => id.startsWith("report.ep"));
  addNode(dag, "report.cross_episode", "report", "クロスエピソード総合分析", [...allReportIds, "analysis.propellant_budget", "analysis.margin_cascade"], {
    tags: ["summary"],
  });
  addNode(dag, "report.ship_kestrel", "report", "ケストレル号ドシエ", [...allReportIds, "analysis.mass_mystery", "analysis.nozzle_cumulative"], {
    tags: ["summary"],
  });
  addNode(dag, "report.science_accuracy", "report", "科学的正確性検証", [...allReportIds, "analysis.communications", "analysis.attitude_control"], {
    tags: ["summary"],
  });
  addNode(dag, "report.attitude_control", "report", "姿勢制御精度・安定性レポート", [...allReportIds, "analysis.attitude_control"], {
    tags: ["summary"],
  });
  addNode(dag, "report.communications", "report", "通信遅延と通信描写の考察", [...allReportIds, "analysis.communications"], {
    tags: ["summary"],
  });
  addNode(dag, "report.tech_overview", "report", "技術解説ページ", [...allReportIds], {
    tags: ["summary", "meta"],
    notes: "Contains DAG viewer, project metrics, architecture overview",
  });
  addNode(dag, "report.ai_costs", "report", "AI開発コスト分析", [], {
    tags: ["summary", "meta"],
    notes: "Token usage, cost distribution, efficiency metrics",
  });

  // Mark all existing analyses and reports as valid (they've been completed)
  for (const id of Object.keys(dag.nodes)) {
    setStatus(dag, id, "valid");
  }

  return dag;
}

const dag = seed();
fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
fs.writeFileSync(STATE_FILE, JSON.stringify(dag, null, 2) + "\n");

// Save timestamped snapshot
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
const now = new Date();
const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
const nodeCount = Object.keys(dag.nodes).length;
const edgeCount = Object.values(dag.nodes).reduce((s, n) => s + n.dependsOn.length, 0);
const snapshotFile = path.join(SNAPSHOT_DIR, `${ts}.json`);
fs.writeFileSync(snapshotFile, JSON.stringify(dag) + "\n");

// Update snapshot manifest
const manifestFile = path.join(SNAPSHOT_DIR, "manifest.json");
const manifest: Array<{ timestamp: string; file: string; nodes: number; edges: number }> = fs.existsSync(manifestFile)
  ? JSON.parse(fs.readFileSync(manifestFile, "utf-8"))
  : [];
manifest.push({ timestamp: now.toISOString(), file: `${ts}.json`, nodes: nodeCount, edges: edgeCount });
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");

console.log(summarize(dag));
const issues = validate(dag);
if (issues.length > 0) {
  console.log("\nValidation issues:");
  for (const i of issues) console.log(`  ${i}`);
}
console.log(`\nDAG seeded successfully → dag/state.json`);
console.log(`Snapshot saved → ${path.relative(process.cwd(), snapshotFile)}`);
