# Task 088: DAG Viewer & Management Improvements

## Status: IN_PROGRESS (Phases 3-4 done)

## Motivation

Human directives:
- 分析のDAGとリポジトリそのものでのタスクや技術開発のDAGは系統を分けて表示すること
- 過去の時点のDAGを遡れるようなviewerにすること
- DAGの正しさを確認し必要があれば DAGそのものや中身のツールや意思決定・分析を見直すため、一度すべてをよく見直すこと
- DAGの依存関係を張り替えるような操作もやりやすくしておくこと

## Completed

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

## Remaining

### Phase 1: DAG Type Separation (viewer)
- Add visual grouping/filtering in dag-viewer.js to separate:
  - **Analysis DAG**: data_source → parameter → analysis → report nodes
  - **Development DAG**: task nodes, tool/infrastructure dependencies
- Toggle or tab UI to switch between views

### Phase 2: Historical DAG Viewer
- Store DAG state snapshots in `dag/log/` (or use events.jsonl to reconstruct)
- Add time slider or commit-linked state selector to dag-viewer.js

## Dependencies
- Task 085 (DAG foundation — DONE)
