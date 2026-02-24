# Task 085: タスク・分析の DAG 管理構造

## Status: TODO

## Motivation

Human directive: 「タスクや分析の DAG を管理する構造を作っておくこと。そうすれば、前提部分を見直した時に再度やり直さないといけなくなる部分や、何かを疑った時にその前提も疑い直さないといけないのかなどが判断しやすくなる。」

## Requirements

### Phase 1: DAG Data Structure + CLI
- Define DAG schema: nodes (tasks, analyses, parameters) with dependency edges
- Store as JSON: `dag/state.json` (current state) + `dag/log/` (historical snapshots)
- CLI utility: `npm run dag -- [add|depend|status|invalidate|show]`
  - `add <id> <type> <description>`: Add a node
  - `depend <from> <to>`: Add a dependency edge
  - `status <id> [valid|invalid|pending]`: Set node validation status
  - `invalidate <id>`: Mark node and all dependents as needing re-evaluation
  - `show`: Print DAG summary

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
