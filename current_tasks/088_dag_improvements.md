# Task 088: DAG Viewer & Management Improvements

## Status: DONE

## Motivation

Human directives:
- 分析のDAGとリポジトリそのものでのタスクや技術開発のDAGは系統を分けて表示すること
- 過去の時点のDAGを遡れるようなviewerにすること
- DAGの正しさを確認し必要があれば DAGそのものや中身のツールや意思決定・分析を見直すため、一度すべてをよく見直すこと
- DAGの依存関係を張り替えるような操作もやりやすくしておくこと

## Completed

### Phase 1: DAG Type Separation (viewer) ✅
- Filter bar with tabs: 全体, EP01-05, 横断分析
- Per-episode filter shows episode nodes + their parameter/source dependencies
- 横断分析 (cross-cutting) shows shared params, cross-episode analyses, summary reports
- "開発タスク" tab auto-appears when task-type nodes exist in the DAG
- Episode background grouping in 全体 view: colored regions with EP labels
- Node/edge count shown in filter bar
- Legend adapts to visible node types and statuses

### Phase 2: Historical DAG Viewer ✅
- Timestamped snapshots saved on each `npm run dag:seed` invocation
- Snapshots stored in `dag/log/snapshots/` with `manifest.json` index
- Build copies snapshots to `dist/dag-snapshots/` for browser access
- Dropdown selector in viewer: "履歴" → date/time (Nodes/Edges) options
- Selecting a historical snapshot re-renders the graph with that state
- "最新" option returns to current state

### Phase 3: Comprehensive DAG Review ✅
Audit findings and fixes:
- **Missing report nodes**: Added `report.communications`, `report.tech_overview`, `report.ai_costs` (3 new)
- **Missing dependency**: Added `analysis.attitude_control` as dependency of `report.science_accuracy`
- **All 30 analysis nodes verified**: 24 per-transfer + 6 cross-cutting match actual analyses
- **All 12 report nodes verified**: 5 episode + 7 summary match actual report JSONs
- DAG now: 63 nodes, 312 edges (was 60/300)

### Phase 4: Dependency Re-wiring UX ✅
- Added `remove-dep` CLI command: `npm run dag -- remove-dep <from> <to>`
- Added `rewire` CLI command: `npm run dag -- rewire <node> --from <old-dep> --to <new-dep>`
- Both commands log events to `dag/log/events.jsonl`
- Error handling: throws if dependency doesn't exist

## Dependencies
- Task 085 (DAG foundation — DONE)
