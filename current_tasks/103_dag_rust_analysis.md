# Task 103: DAG 分析の Rust モデリング

## Status: DONE

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

## Completed

### Phase 1: Rust DAG Module (`dag.rs`) — 33 tests
- Types: DagNode, Dag, NodeType (5 variants), NodeStatus (3 variants)
- Topological sort (Kahn's algorithm)
- Depth computation (longest path from roots)
- Critical path detection (trace back from deepest node)
- Sugiyama-style layout with barycenter crossing minimization
- Impact analysis with type breakdown
- Subgraph extraction (tag-based with depth expansion)
- Path finding between nodes (DFS with max_paths limit)
- Edge crossing counter (segment intersection)
- Cycle detection (DFS 3-color)
- Orphan detection
- Zero external dependencies maintained

### Phase 2: WASM Bindings — 8 tests
- dag_layout: Sugiyama → {ids, x, y, layers, crossings}
- dag_impact: Cascade → {affected, cascade_count, by_type}
- dag_analyze: Full → {topo_order, critical_path, depths, orphans}
- dag_upstream / dag_downstream: Transitive chains
- dag_find_paths: All paths between two nodes
- dag_subgraph: Tag-based extraction

### Phase 3: DAG Viewer Enhancement
- WASM integration with JS fallback
- Depth-based Sugiyama layout replaces type-based layout
- Impact / upstream / downstream analysis buttons on node click
- Analysis panel with color-coded affected node badges
- Critical path marking in tooltip
- Edge crossing count display
- Engine badge (WASM/JS indicator)

## Notes
- Cluster detection (communities/SCC) deferred — current DAG is acyclic by design
- Keep zero-dependency policy in solar-line-core
