# Task 032: Template and Type Quality Fixes

## Status: IN PROGRESS

## Goal
Fix type inconsistencies and template rendering gaps identified by quality audit.

## Scope
1. **ExplorationScenario.results type**: `Record<string, number>` → `Record<string, string | number>` (EP04/EP05 data uses string values)
2. **TransferAnalysis.parameters.mu**: Make optional (13 of 24 transfers don't have `mu`)
3. **Markdown ordered list support**: `markdownToHtml` doesn't handle `1. ` ordered lists — EP02 numbered lists render as bare paragraphs
4. **Animation time display**: Long-duration diagrams (cross-episode full-route: ~472 days) display in hours, becoming unreadable. Show days when appropriate.

## Depends on
- Task 005 (report pipeline) — DONE
- Task 014 (orbital diagrams) — DONE
- Task 019 (animation) — DONE
