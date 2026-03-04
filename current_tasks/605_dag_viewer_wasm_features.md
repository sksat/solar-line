# Task 605: DAG Viewer WASM Feature Integration

## Status: **DONE**

## Summary

Task 604 ported DAG analysis to Rust/WASM and exposed 11 functions. The browser DAG viewer currently uses 5 of them (layout, impact, analyze, upstream, downstream). This task integrates the remaining 6 functions into the viewer UI:

1. `dag_validate` — Show validation warnings/errors in a panel
2. `dag_stale_nodes` — Highlight stale nodes with visual indicator
3. `dag_find_paths` — Path-finding between two selected nodes
4. `dag_summarize` — Summary statistics panel (node counts by type/status)
5. `dag_subgraph` — Tag-based subgraph filtering with depth control
6. `dag_task_planning` — Task readiness info (plannable/blocked/parallel groups)

## Dependencies

- Task 604 (DONE) — DAG Rust/WASM port

## Key Files

- `ts/src/dag-viewer.js` — Browser DAG viewer (JS)
- `crates/solar-line-wasm/src/lib.rs` — WASM bindings
- `ts/examples/dag-viewer.html` — Standalone example
- `ts/e2e/examples.spec.ts` — E2E tests
- `ts/e2e/reports.spec.ts` — Report E2E tests (DAG section)
