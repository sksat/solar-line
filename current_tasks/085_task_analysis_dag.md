# Task 085: タスク・分析の DAG 管理構造

## Status: IN_PROGRESS (Phase 1 DONE, Phases 2-3 remain)

## Motivation

Human directive: 「タスクや分析の DAG を管理する構造を作っておくこと。そうすれば、前提部分を見直した時に再度やり直さないといけなくなる部分や、何かを疑った時にその前提も疑い直さないといけないのかなどが判断しやすくなる。」

## Phase 1: DONE — DAG Data Structure + CLI

### Implementation
- **Types**: `dag-types.ts` — DagNode, DagEvent, DagState (5 node types, 3 statuses)
- **Core logic**: `dag.ts` — 12 exported functions: createEmptyDag, addNode, addDependency, removeDependency, setStatus, invalidate, getDownstream, getUpstream, detectCycle, findOrphans, validate, getStaleNodes, summarize
- **CLI**: `dag-cli.ts` — 8 commands: add, depend, status, invalidate, impact, lineage, validate, show
- **Seed**: `dag-seed.ts` — Populates DAG with project's actual dependency structure
- **Tests**: `dag.test.ts` — 23 tests, all passing
- **State**: `dag/state.json` — 58 nodes, 267 edges

### CLI Usage
```
npm run dag -- add <id> <type> <title> [--depends dep1,dep2]
npm run dag -- depend <from> <to>
npm run dag -- status <id> <valid|stale|pending>
npm run dag -- invalidate <id>
npm run dag -- impact <id>
npm run dag -- lineage <id>
npm run dag -- validate
npm run dag -- show [--stale ""]
```

### Key Finding
Invalidating `param.ship_mass` cascades to 39/58 nodes (67% of DAG) — demonstrates the critical role of mass assumption in the analysis chain.

## Requirements (remaining)

### Phase 2: Reconstruct Historical DAG
- Parse session logs and commit messages to identify task dependencies
- Map existing `current_tasks/` files into DAG nodes
- Identify implicit dependencies (e.g., EP02 analysis depends on EP01 mass findings)
- Transfer analyses depend on shared parameters (ship mass, thrust, Isp)

### Phase 3: DAG Visualization + Animation
- Render DAG as interactive SVG on tech overview page
- Time slider to animate DAG state changes (task creation → completion)
- Color-code by status: done (green), in-progress (yellow), invalid (red)
- Highlight dependency chains on hover

## Design Notes

Key dependency patterns in this project:
- **Parameter dependencies**: Ship mass (300-500t) is a shared assumption across all 24 transfers
- **Sequential episodes**: EP01 mass finding → EP02 escape margin → EP03 nav → EP04 plasmoid → EP05 nozzle
- **Cross-cutting**: Propellant budget (cross-episode.json) depends on ALL episode transfer ΔVs
- **Re-analysis**: Task 074 re-analyzed based on Codex perspectives; this invalidated portions of EP02/04/05
