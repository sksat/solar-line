# Task 088: DAG Viewer & Management Improvements

## Status: TODO

## Motivation

Human directives:
- 分析のDAGとリポジトリそのものでのタスクや技術開発のDAGは系統を分けて表示すること
- 過去の時点のDAGを遡れるようなviewerにすること
- DAGの正しさを確認し必要があれば DAGそのものや中身のツールや意思決定・分析を見直すため、一度すべてをよく見直すこと
- DAGの依存関係を張り替えるような操作もやりやすくしておくこと

## Scope

### Phase 1: DAG Type Separation (viewer)
- Add visual grouping/filtering in dag-viewer.js to separate:
  - **Analysis DAG**: data_source → parameter → analysis → report nodes
  - **Development DAG**: task nodes, tool/infrastructure dependencies
- Toggle or tab UI to switch between views
- Both share the same underlying state but display differently

### Phase 2: Historical DAG Viewer
- Store DAG state snapshots in `dag/log/` (or use events.jsonl to reconstruct)
- Add time slider or commit-linked state selector to dag-viewer.js
- Allow viewing DAG state at any historical point

### Phase 3: Comprehensive DAG Review
- Audit all 60 nodes for correctness:
  - Are dependencies complete and accurate?
  - Are statuses correct?
  - Missing nodes?
- Review analysis nodes: do they accurately represent the analyses performed?
- Fix any issues found

### Phase 4: Dependency Re-wiring UX
- Add `dag rewire` CLI command for dependency changes
- Or interactive mode in dag-viewer.js for drag-to-connect
- CLI: `npm run dag -- rewire <node> --remove-dep <old> --add-dep <new>`

## Dependencies
- Task 085 (DAG foundation — DONE)
