# Task 032: Template and Type Quality Fixes

## Status: DONE

## Goal
Fix type inconsistencies and template rendering gaps identified by quality audit.

## Scope
1. **ExplorationScenario.results type**: `Record<string, number>` → `Record<string, string | number>` (EP04/EP05 data uses string values)
2. **TransferAnalysis.parameters.mu**: Make optional (13 of 24 transfers don't have `mu`)
3. **Markdown ordered list support**: `markdownToHtml` doesn't handle `1. ` ordered lists — EP02 numbered lists render as bare paragraphs
4. **Animation time display**: Long-duration diagrams (cross-episode full-route: ~472 days) display in hours, becoming unreadable. Show days when appropriate.

## Changes
1. `ts/src/report-types.ts`: `ExplorationScenario.results` now `Record<string, number | string>`, `TransferAnalysis.parameters.mu` now optional
2. `ts/src/templates.ts`: `markdownToHtml` supports ordered lists (`1. `, `2. `), CSS time-display min-width 5rem
3. `ts/src/orbital-animation.js`: `formatTime` shows days for >30d, years+days for >365d
4. `ts/src/templates.test.ts`: 10 new tests (ordered lists, string results, optional mu, ordered lists in explanations)

## Test Results
- 680 TS + 52 Rust = 732 total (0 failures)
- Site builds successfully (5 episodes, 24 transfers, 1 summary)

## Depends on
- Task 005 (report pipeline) — DONE
- Task 014 (orbital diagrams) — DONE
- Task 019 (animation) — DONE
