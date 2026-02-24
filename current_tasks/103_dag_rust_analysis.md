# Task 103: DAG 分析の Rust モデリング

## Status: IN PROGRESS

## Motivation

Human directive: DAG は単に並べて可視化するだけでは分かりにくい。解きほぐして表示しないと、どんな依存関係があって、何を変更したら何を直さないといけなくなるのかがわかりにくい。DAG の分析も Rust でモデリングすることで、可視化時に WASM 呼び出しで分析が可能になる。

## Scope

1. **Rust DAG module** (`crates/solar-line-core/dag.rs`):
   - DAG data structure (nodes, edges, types, statuses)
   - Topological sort / layered layout algorithm
   - Dependency chain extraction (upstream/downstream)
   - Impact analysis (invalidation cascade)
   - Critical path detection
   - Cluster detection (strongly connected components, communities)
   - Cycle detection

2. **WASM bindings** (`crates/solar-line-wasm/`):
   - Expose DAG analysis functions to browser via wasm-bindgen
   - Accept JSON DAG state, return analysis results (also JSON)

3. **Browser integration** (`dag-viewer.js`):
   - Replace current TS-only layout with WASM-powered analysis
   - "Untangle" view: show dependency chains clearly, not just flat node layout
   - Interactive dependency exploration: click a node → show full upstream/downstream chain highlighted
   - Impact visualization: select a node → show cascade of what needs rebuilding
   - Better layout that respects dependency flow (left-to-right or top-to-bottom DAG layout)

## Dependencies
- Task 085 (DAG foundation — DONE)
- Task 088 (DAG improvements — DONE)

## Notes
- Current DAG viewer (`dag-viewer.js`) does simple layered layout in JS
- Rust implementation enables more sophisticated graph algorithms
- Existing `dag.ts` has basic analysis (getDownstream, getUpstream, invalidate) — Rust version should be more capable
- Keep zero-dependency policy in solar-line-core
